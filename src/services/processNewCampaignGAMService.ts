import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import type { SubitemData } from '../dto/MondayFormMappingDto';
import {
  FormSubmissionData,
  GAM_CAMPAIGN_FORM_MAPPING,
  MondayColumnType,
  MondayFormMapping
} from '../dto/MondayFormMappingDto';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { ChannelScheduleService } from './ChannelScheduleService';
import { getValueByPath } from '../utils/objectHelpers';
import { BaseFormSubmissionService } from './BaseFormSubmissionService';
import { convertDateFormat, convertToISODate, toYYYYMMDD } from '../utils/dateFormatters';

export class NewCampaignGAMService extends BaseFormSubmissionService {
  private readonly channelScheduleService?: ChannelScheduleService;
  private readonly channelScheduleRepository: Repository<ChannelSchedule>;

  // Novo: Correlações para preencher o segundo board
  // 1) Correlação entre chaves do formulário (após tratamento) e chaves do objeto do segundo envio
  // Preenchidas com strings vazias para edição manual conforme solicitado
  public readonly secondBoardCorrelationFromSubmission: Array<{
    id_submission: string;
    id_second_board: string;
  }> = [
    { id_submission: '', id_second_board: '' },
  ];

  // 2) Correlação entre chaves do primeiro envio e chaves do objeto do segundo envio
  public readonly secondBoardCorrelationFromFirst: Array<{
    id_first_board: string;
    id_second_board: string;
  }> = [
    { id_first_board: '', id_second_board: '' },
  ];

  // Board IDs específicos para GAM
  // private static readonly GAM_MAIN_BOARD_ID = '7410140027'; // Board principal (mesmo do CRM) - DEPRECATED: não mais usado
  private static readonly GAM_SECOND_BOARD_ID = '7463706726'; // Board secundário (mesmo usado pelos outros serviços)
  private static readonly GAM_SECOND_BOARD_GROUP_ID = 'topics'; // Grupo padrão do board secundário
  private static readonly TIME_SLOTS_BOARD_ID = 'f0dec33d-a127-4923-8110-ebe741ce946b'; // Board de horários disponíveis

  // Colunas de conexão para o segundo board GAM
  private static readonly GAM_SECOND_BOARD_CONNECT_COLUMNS = [
    'text_mkvgjh0w', // Hora Nova
    'conectar_quadros8__1', // Campanhas & Briefings
  ];

  constructor(dataSource?: DataSource) {
    super();
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
    if (dataSource) {
      this.channelScheduleService = new ChannelScheduleService(dataSource);
    }
  }

  // Removido: toda a lógica de envio para o segundo board (7463706726)

  /**
   * Processa uma submissão de formulário e cria um item na Monday.com
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processCampaignGAMSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = GAM_CAMPAIGN_FORM_MAPPING
  ): Promise<string> {
    try {

      // 1. Ajustar subitems conforme capacidade por canal/horário e salvar payload localmente
      if (formData.data.__SUBITEMS__ && Array.isArray(formData.data.__SUBITEMS__)) {
        const adjusted = await this.adjustSubitemsCapacity(formData.data.__SUBITEMS__, formData);
        formData.data.__SUBITEMS__ = adjusted;
        await this.savePayloadLocally(formData);
        await this.insertChannelSchedules(adjusted, formData);
      } else {
        // Mesmo sem subitems, ainda salva o payload bruto
        await this.savePayloadLocally(formData);
      }

      // 2. Determinar o nome do item
      const itemName = this.extractItemName(formData, mapping);

      // 3. Aplicar mapeamentos adicionais (FORM_TO_MONDAY_MAPPINGS) ao payload antes de montar as colunas
      const augmentedData = mapFormSubmissionToMondayData(formData.data);
      const enrichedFormData: FormSubmissionData = { ...formData, data: augmentedData };

      // 3.1 Converter text_mkvhvcw4 de ID para nome se necessário (ANTES de buildColumnValues)
      if (enrichedFormData.data?.text_mkvhvcw4 && /^\d+$/.test(String(enrichedFormData.data.text_mkvhvcw4))) {
        try {
          const item = await this.mondayItemRepository.findOne({
            where: { item_id: String(enrichedFormData.data.text_mkvhvcw4) }
          });
          if (item?.name) {
            enrichedFormData.data.text_mkvhvcw4 = item.name;
          }
        } catch (error) {
          console.warn(`Erro ao resolver área solicitante ${enrichedFormData.data.text_mkvhvcw4}:`, error);
        }
      }

      // 4. Construir os valores das colunas com dados enriquecidos (e corrigir pessoas__1)
      const allColumnValues = await this.buildColumnValues(enrichedFormData, mapping);

      // 4.1 Sincronizar campos calculados de volta para enrichedFormData.data para uso posterior
      if (allColumnValues['text_mkr3n64h']) {
        enrichedFormData.data['text_mkr3n64h'] = allColumnValues['text_mkr3n64h'];
      }

      // 4.2 Separar valores de colunas: base (sem "conectar_quadros*") e conectores (apenas "conectar_quadros*")
      const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(allColumnValues);

      // 5. Antes de enviar: salvar o JSON de pré-submissão (apenas primeiro board)
      try {
        const firstPreData = {
          board_id: mapping.board_id,
          group_id: mapping.group_id,
          item_name: itemName,
          column_values: baseColumns,
        };
        await this.savePreObjectLocally(firstPreData, `${formData.id || 'submission'}_gam_first_board_predata`);
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do primeiro board GAM:', e);
      }

      // 6. Criar o item na Monday.com APENAS com colunas base (sem conectar_quadros)
      const mondayItemId = await this.createMondayItem(
        mapping.board_id,
        mapping.group_id,
        itemName,
        baseColumns
      );

      // 6.1. Após criar, resolver e enviar os valores das colunas "conectar_quadros*" usando change_multiple_column_values
      try {
            const resolvedConnectColumns = await this.resolveConnectBoardColumns(connectColumnsRaw);
            // Adicionar pessoas3__1 (People) com base em lookup_mkrt36cj -> monday_items.team (segunda submissão do primeiro board)
            try {
              const ppl = await this.buildPeopleFromLookupObjetivo(enrichedFormData?.data);
              if (ppl) {
                (resolvedConnectColumns as any)["pessoas3__1"] = ppl;
              }
            } catch (e) {
              console.warn('Falha ao montar pessoas3__1 (primeiro board):', e);
            }
            // Adicionar o campo composto (text_mkr3znn0) apenas no segundo envio do primeiro board,
            // pois depende do ID do item criado
            try {
              const compositeFirstBoard = await this.buildCompositeTextField(enrichedFormData, mondayItemId);
              if (compositeFirstBoard) {
                (resolvedConnectColumns as any)["text_mkr3znn0"] = compositeFirstBoard;
              }
            } catch (e) {
              console.warn('Falha ao montar text_mkr3znn0 (segundo envio do primeiro board):', e);
            }
        if (Object.keys(resolvedConnectColumns).length > 0) {
          // Salvar objeto localmente para auditoria
          await this.saveObjectLocally(
            {
              board_id: mapping.board_id,
              item_id: mondayItemId,
              column_values: resolvedConnectColumns,
            },
            `${formData.id || 'submission'}_gam_first_board_connect_columns`
          );

          // Também salvar como PRE-DATA do segundo envio do primeiro board
          await this.savePreObjectLocally(
            {
              board_id: mapping.board_id,
              item_id: mondayItemId,
              column_values: resolvedConnectColumns,
            },
            `${formData.id || 'submission'}_gam_first_board_second_send_predata`
          );

          // Enviar atualização de múltiplas colunas
          await this.mondayService.changeMultipleColumnValues(
            mapping.board_id,
            mondayItemId,
            resolvedConnectColumns
          );
        }
      } catch (e) {
        console.error('Falha ao atualizar colunas conectar_quadros no primeiro board:', e);
      }

      console.log(`Item criado na Monday.com com ID: ${mondayItemId}`);

      // Envio para o segundo board: SOMENTE por subitem (não há outra lógica)
      if (Array.isArray(enrichedFormData?.data?.__SUBITEMS__) && enrichedFormData.data.__SUBITEMS__.length > 0) {
        await this.processSecondBoardSendsForSubitems(enrichedFormData, allColumnValues, itemName, mondayItemId);
      }
      return mondayItemId;

    } catch (error) {
      console.error('Erro ao processar submissão do formulário GAM:', error);
      throw new Error(`Falha ao criar item na Monday.com para GAM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }


  // Novo: fluxo para enviar ao segundo board para cada subitem
  private async processSecondBoardSendsForSubitems(
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    fallbackItemName: string,
    firstBoardItemId: string
  ): Promise<string[]> {
    const results: string[] = [];
    const subitems: SubitemData[] = enrichedFormData?.data?.__SUBITEMS__ ?? [];

    for (let idx = 0; idx < subitems.length; idx++) {
      const sub = subitems[idx];
      const initial = await this.buildSecondBoardInitialPayloadFromSubitem(sub, enrichedFormData, firstBoardAllColumnValues, firstBoardItemId);

      const itemNameSecond = initial.item_name || 'teste excluir GAM';
      const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(initial.column_values);
      const filteredConnect = this.pickSecondBoardConnectColumns(connectColumnsRaw);

      // Pre-data por subitem (primeiro envio)
      try {
        await this.savePreObjectLocally(
          {
            board_id: NewCampaignGAMService.GAM_SECOND_BOARD_ID,
            item_name: itemNameSecond,
            column_values: baseColumns,
          },
          `${enrichedFormData.id || 'submission'}_gam_second_board_predat-idx_${idx}`
        );
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do segundo board GAM (subitem):', e);
      }

      // Criação do item
      let secondItemId: string;
      try {
        secondItemId = await this.createMondayItem(
          NewCampaignGAMService.GAM_SECOND_BOARD_ID,
          NewCampaignGAMService.GAM_SECOND_BOARD_GROUP_ID,
          itemNameSecond || fallbackItemName,
          baseColumns
        );
        console.log(`Segundo board GAM: item criado para subitem ${idx} com ID ${secondItemId} (primeiro envio).`);
      } catch (error) {
        console.warn('Falha ao criar item no segundo board GAM. Subitem será ignorado.', error);
        continue;
      }

      // Atualização das colunas conectar_quadros*
      try {
        const resolved = await this.resolveConnectBoardColumns(filteredConnect);
        // Adicionar pessoas3__1 (People) com base em lookup_mkrt36cj -> monday_items.team (segunda submissão do segundo board)
        try {
          const ppl = await this.buildPeopleFromLookupObjetivo(enrichedFormData?.data);
          if (ppl) {
            (resolved as any)["pessoas3__1"] = ppl;
          }
        } catch (e) {
          console.warn('Falha ao montar pessoas3__1 (segundo board GAM):', e);
        }
        if (Object.keys(resolved).length > 0) {
          await this.saveObjectLocally(
            {
              board_id: NewCampaignGAMService.GAM_SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_gam_second_board_connect_columns_idx_${idx}`
          );

          await this.savePreObjectLocally(
            {
              board_id: NewCampaignGAMService.GAM_SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_gam_second_board_second_send_predat-idx_${idx}`
          );

          await this.mondayService.changeMultipleColumnValues(
            NewCampaignGAMService.GAM_SECOND_BOARD_ID,
            secondItemId,
            resolved
          );
        }
      } catch (e) {
        console.error('Falha ao atualizar colunas conectar_quadros no segundo board GAM (subitem):', e);
      }

      results.push(secondItemId);
    }

    return results;
  }

  // Novo: monta payload do segundo board a partir do subitem (sem conectar_quadros*)
  /**
   * Gera string composta para o segundo board usando os novos campos de texto
   */
  private async buildCompositeTextFieldSecondBoard(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    
    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    
    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || toYYYYMMDD(d["data__1"]);
    
    const idPart = itemId ? `id-${itemId}` : "";
    
    // Usar os novos campos de texto diretos ao invés de lookup
    const textFields = [
      "text_mkvhz8g3", // Tipo Cliente (era lookup_mkrtaebd)
      "text_mkvhedf5", // Tipo Campanha (era lookup_mkrt66aq)  
      "text_mkvhqgvn", // Tipo Disparo (era lookup_mkrtxa46)
      "text_mkvhv5ma", // Mecânica (era lookup_mkrta7z1)
      "text_mkvhvcw4", // Área Solicitante (era lookup_mkrt36cj)
      "text_mkvh2z7j", // Objetivo (era lookup_mkrtwq7k)
      "text_mkvhwyzr", // Produto (era lookup_mkrtvsdj)
      "text_mkvhgbp8", // Canal (era lookup_mkrtcctn)
      "text_mkvhammc"  // Segmento (era lookup_mkrtxgmt)
    ] as const;
    
    // Buscar board_id do board "Produto" uma vez para evitar colisão
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    const produtoBoardId = produtoBoard?.id;

    const values: string[] = [];
    for (const field of textFields) {
      let textVal = String(d[field] ?? "").trim();
      if (textVal) {
        // Lógica especial para produtos (text_mkvhwyzr): buscar no board correto e incluir subproduto se existir
        if (field === "text_mkvhwyzr") {
          // Buscar código do produto no board específico para evitar colisão com subprodutos
          const productCode = await this.getCodeByItemName(textVal, produtoBoardId);

          if (productCode) {
            const subproductCode = await this.mondayService.getSubproductCodeByProduct(textVal);
            if (subproductCode) {
              textVal = `${productCode}_${subproductCode}`;
            } else {
              textVal = productCode;
            }
          }
        }
      }
      // Manter posição vazia para preservar a estrutura da taxonomia
      values.push(textVal);
    }

    // Não remover campos vazios para manter as posições fixas na taxonomia
    const parts = [
      yyyymmdd,
      idPart,
      ...values
    ];
    return parts.join("-");
  }
  private async buildSecondBoardInitialPayloadFromSubitem(
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    firstBoardItemId: string
  ): Promise<{ item_name: string; column_values: Record<string, any> }> {
    const cv: Record<string, any> = {};

    // Buscar board_id do board "Produto" uma vez para evitar colisão
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    const produtoBoardId = produtoBoard?.id;

    // Correlações submissão=>segundo (prioriza subitem, depois dado do formulário)
    for (const m of this.secondBoardCorrelationFromSubmission) {
      const from = (m.id_submission || '').trim();
      const to = (m.id_second_board || '').trim();
      if (!from || !to) continue;
      let v: any = (subitem as any)[from];
      if (v === undefined) {
        v = (enrichedFormData?.data as any)?.[from];
      }
      if (v !== undefined) cv[to] = v;
    }

    // Correlações primeiro=>segundo
    for (const m of this.secondBoardCorrelationFromFirst) {
      const from = (m.id_first_board || '').trim();
      const to = (m.id_second_board || '').trim();
      if (!from || !to) continue;
      const v = firstBoardAllColumnValues[from];
      if (v !== undefined) cv[to] = v;
    }

    // text_mkr5kh2r e text_mkr3jr1s: ambos recebem o valor da fórmula de text_mkr3znn0
    
    // date_mkrk5v4c: data de hoje no formato date da Monday
    if (cv['date_mkrk5v4c'] === undefined) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      cv['date_mkrk5v4c'] = this.formatDateValue(iso);
    }
    // text_mkr3v9k3: valor de data__1 do subitem do formulário de submissão
    if (cv['text_mkr3v9k3'] === undefined && (subitem as any)['data__1'] !== undefined) {
      cv['text_mkr3v9k3'] = String((subitem as any)['data__1']);
    }

    // pessoas5__1 do pessoas__1
    if (firstBoardAllColumnValues['pessoas__1']) {
      cv['pessoas5__1'] = firstBoardAllColumnValues['pessoas__1'];
    }

    // Defaults conforme exemplo
    // text_mkrr6jkh deve vir do item_id do primeiro board
    cv['text_mkrr6jkh'] = String(firstBoardItemId);
    
    // Construir taxonomia: código do produto + código do subproduto (se encontrado)
    const productCode = String(subitem.texto__1);
    const productName = String(subitem.conectar_quadros87__1);
    
    // Buscar código do subproduto associado ao produto
    const subproductCode = await this.mondayService.getSubproductCodeByProduct(productName);
    
    // Construir taxonomia final: produto_subproduto (se encontrado) ou apenas código do produto
    if (subproductCode) {
      cv['texto6__1'] = `${productCode}_${subproductCode}`;
      console.log(`Taxonomia criada com subproduto: ${productCode}_${subproductCode} (produto: ${productName})`);
    } else {
      cv['texto6__1'] = productCode;
      console.log(`Subproduto não encontrado para produto "${productName}", usando apenas código do produto: ${productCode}`);
    }

    // Usar os novos campos de texto diretos (text_mkvh*) ao invés de lookup
    // Canal
    cv['text_mkrrqsk6'] = String(enrichedFormData.data['text_mkvhgbp8'] ?? '')
      .trim();

    // texto6__1 recebe o nome do canal (sobrescreve a taxonomia de produto)
    cv['texto6__1'] = cv['text_mkrrqsk6'];

    if (cv['text_mkrrqsk6']) {
      cv['text_mkrr8dta'] = (await this.getCodeByItemName(cv['text_mkrrqsk6']))
        ?? cv['text_mkrr8dta'] ?? 'Email';
    } else {
      cv['text_mkrr8dta'] = cv['text_mkrr8dta'] ?? 'Email';
    }

    // Cliente
    cv['text_mkrrg2hp'] = String(enrichedFormData.data['text_mkvhz8g3'] ?? '')
      .trim();
    if (cv['text_mkrrg2hp']) {
      cv['text_mkrrna7e'] = (await this.getCodeByItemName(cv['text_mkrrg2hp']))
        ?? cv['text_mkrrna7e'] ?? 'NaN';
    } else {
      cv['text_mkrrna7e'] = cv['text_mkrrna7e'] ?? 'NaN';
    }

    // Campanha
    cv['text_mkrra7df'] = String(enrichedFormData.data['text_mkvhedf5'] ?? '')
      .trim();
    if (cv['text_mkrra7df']) {
      cv['text_mkrrcnpx'] = (await this.getCodeByItemName(cv['text_mkrra7df']))
        ?? cv['text_mkrrcnpx'] ?? 'NaN';
    } else {
      cv['text_mkrrcnpx'] = cv['text_mkrrcnpx'] ?? 'NaN';
    }

    // Disparo
    cv['text_mkrr9edr'] = String(enrichedFormData.data['text_mkvhqgvn'] ?? '')
      .trim();
    if (cv['text_mkrr9edr']) {
      cv['text_mkrrmjcy'] = (await this.getCodeByItemName(cv['text_mkrr9edr']))
        ?? cv['text_mkrrmjcy'] ?? 'NaN';
    } else {
      cv['text_mkrrmjcy'] = cv['text_mkrrmjcy'] ?? 'NaN';
    }

    // Mecânica
    cv['text_mkrrxf48'] = String(enrichedFormData.data['text_mkvhv5ma'] ?? '')
      .trim();
    if (cv['text_mkrrxf48']) {
      cv['text_mkrrxpjd'] = (await this.getCodeByItemName(cv['text_mkrrxf48']))
        ?? cv['text_mkrrxpjd'] ?? 'NaN';
    } else {
      cv['text_mkrrxpjd'] = cv['text_mkrrxpjd'] ?? 'NaN';
    }

    // Solicitante
    let solicitanteValue = String(enrichedFormData.data['text_mkvhvcw4'] ?? '').trim();
    if (solicitanteValue && /^\d+$/.test(solicitanteValue)) {
      try {
        const item = await this.mondayItemRepository.findOne({ where: { item_id: solicitanteValue } });
        if (item) {
          solicitanteValue = item.name || solicitanteValue;
          cv['text_mkrrmmvv'] = item.code || 'NaN';
        } else {
          cv['text_mkrrmmvv'] = 'NaN';
        }
      } catch (error) {
        console.warn(`Erro ao resolver área solicitante ${solicitanteValue}:`, error);
        cv['text_mkrrmmvv'] = 'NaN';
      }
    } else if (solicitanteValue) {
      cv['text_mkrrmmvv'] = (await this.getCodeByItemName(solicitanteValue)) ?? 'NaN';
    } else {
      cv['text_mkrrmmvv'] = 'NaN';
    }
    cv['text_mkrrxqng'] = solicitanteValue;

    // Objetivo
    cv['text_mkrrhdh6'] = String(enrichedFormData.data['text_mkvh2z7j'] ?? '')
      .trim();
    if (cv['text_mkrrhdh6']) {
      cv['text_mkrrraz2'] = (await this.getCodeByItemName(cv['text_mkrrhdh6']))
        ?? cv['text_mkrrraz2'] ?? 'NaN';
    } else {
      cv['text_mkrrraz2'] = cv['text_mkrrraz2'] ?? 'NaN';
    }

    // Produto
    cv['text_mkrrfqft'] = String(enrichedFormData.data['text_mkvhwyzr'] ?? '')
      .trim();
    if (cv['text_mkrrfqft']) {
      cv['text_mkrrjrnw'] = (await this.getCodeByItemName(cv['text_mkrrfqft'], produtoBoardId))
        ?? cv['text_mkrrjrnw'] ?? 'NaN';
    } else {
      cv['text_mkrrjrnw'] = cv['text_mkrrjrnw'] ?? 'NaN';
    }

    // Subproduto - Buscar se existe subproduto associado ao produto
    if (cv['text_mkrrfqft']) {
      const subproductData = await this.mondayService.getSubproductByProduct(cv['text_mkrrfqft']);
      if (subproductData) {
        cv['text_mkw8et4w'] = subproductData.name; // Referência Subproduto
        cv['text_mkw8jfw0'] = subproductData.code; // Código Subproduto
        console.log(`Subproduto encontrado para produto "${cv['text_mkrrfqft']}": ${subproductData.name} (${subproductData.code})`);
      } else {
        cv['text_mkw8et4w'] = cv['text_mkw8et4w'] ?? '';
        cv['text_mkw8jfw0'] = cv['text_mkw8jfw0'] ?? '';
      }
    } else {
      cv['text_mkw8et4w'] = cv['text_mkw8et4w'] ?? '';
      cv['text_mkw8jfw0'] = cv['text_mkw8jfw0'] ?? '';
    }

    // Segmento
    cv['text_mkrrt32q'] = String(enrichedFormData.data['text_mkvhammc'] ?? '')
      .trim();
    if (cv['text_mkrrt32q']) {
      cv['text_mkrrhdf8'] = (await this.getCodeByItemName(cv['text_mkrrt32q']))
        ?? cv['text_mkrrhdf8'] ?? 'NaN';
    } else {
      cv['text_mkrrhdf8'] = cv['text_mkrrhdf8'] ?? 'NaN';
    }

    // Campos do subitem
    cv['data__1'] = cv['data__1'] ?? (subitem as any)['data__1'] ?? '';
    cv['n_meros__1'] = cv['n_meros__1'] ?? 1;
    cv['texto__1'] = cv['texto__1'] ?? 'Teste';
    cv['lista_suspensa5__1'] = cv['lista_suspensa5__1'] ?? 'Emocional';
    cv['lista_suspensa53__1'] = cv['lista_suspensa53__1'] ?? { labels: ['Autoridade', 'Exclusividade'] };
    if ((subitem as any)['n_meros_mkkchcmk'] !== undefined) {
      cv['n_meros_mkkchcmk'] = (subitem as any)['n_meros_mkkchcmk'];
    }

    // Campo text_mkvgjh0w do subitem: sempre enviado no primeiro envio do segundo board, valor igual ao conectar_quadros_mkkcnyr3 do form-submission
    const horaValue = (subitem as any)['conectar_quadros_mkkcnyr3'];
    if (horaValue !== undefined) {
      cv['text_mkvgjh0w'] = typeof horaValue === 'string' ? horaValue : String(horaValue);
    }
  // Removido: não enviar conectar_quadros87__1 no segundo envio
  // conectar_quadros8__1 deve ser o item_id do primeiro board
  cv['conectar_quadros8__1'] = String(firstBoardItemId);

  const composite = await this.buildCompositeTextFieldSecondBoard(enrichedFormData, firstBoardItemId) || '';
    if (composite) {
      cv['text_mkr5kh2r'] = composite+'-'+String(cv["n_meros__1"])+'-'+String(cv["texto6__1"]); 
    
      cv['text_mkr3jr1s'] = composite+'-'+String(cv["n_meros__1"])+'-'+String(cv["texto6__1"]);
    }

  const texto6 = cv['texto6__1'] ? String(cv['texto6__1']) : '';
  const item_name = `teste excluir GAM${texto6 ? ' - ' + texto6 : ''}`;
  return { item_name, column_values: cv };
  }

  // Novo: limita as colunas conectar_quadros ao conjunto exigido para o segundo board
  private pickSecondBoardConnectColumns(connectColumnsRaw: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const k of NewCampaignGAMService.GAM_SECOND_BOARD_CONNECT_COLUMNS) {
      if (connectColumnsRaw[k] !== undefined) filtered[k] = connectColumnsRaw[k];
    }
    return filtered;
  }  

  /** Compatibilidade: expõe alias explícito para testes legados */
  public async getItemCodeByName(name: string, boardId?: string): Promise<string | undefined> {
    return this.getCodeByItemName(name, boardId);
  }

  /**
   * Ajusta os objetos de __SUBITEMS__ respeitando a capacidade disponível por canal/data/hora.
   * - Para cada subitem, calcula available_time = max_value (monday_items) - soma(qtd) (channel_schedules)
   * - Se n_meros_mkkchcmk <= available_time, mantém
   * - Se > available_time, divide: mantém o atual com available_time e cria novos para próximos horários com o restante
   * - Considera área solicitante para permitir reuso de reservas da mesma área
   */
  private async adjustSubitemsCapacity(subitems: SubitemData[], formData?: FormSubmissionData): Promise<SubitemData[]> {
    // Extrair área solicitante do formData
    const areaSolicitante = formData?.data?.gam_requesting_area 
      || formData?.data?.requesting_area 
      || formData?.data?.area_solicitante;

    // Carrega slots de horários ativos, ordenados por nome ASC
    const activeTimeSlots = await this.mondayItemRepository.find({
      where: { board_id: NewCampaignGAMService.TIME_SLOTS_BOARD_ID, status: 'Ativo' },
      order: { name: 'ASC' }
    });

    // Copiamos a lista pois vamos inserir itens dinamicamente
  const items: SubitemData[] = subitems.map(s => ({ ...s }));

    // Função para chavear canal/data/hora
    const key = (id: string, d: Date, h: string) => `${id}|${d.toISOString().slice(0,10)}|${h}`;

    // Loop até não haver modificações; quando inserir um novo objeto, reinicia a validação
    let changed = true;
    while (changed) {
      changed = false;
      // mapa de reservas staged (somente desta passagem)
      const staged: Record<string, number> = {};

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const idCanal = String(item.id ?? '').trim();
        const dataStr = String(item.data__1 ?? '').trim();
        const horaAtual = String(item.conectar_quadros_mkkcnyr3 ?? '').trim();
        const demanda = Number(item.n_meros_mkkchcmk ?? 0);

        // Remover itens inválidos ou com zero
        if (!idCanal || !dataStr || !horaAtual || demanda <= 0) {
          items.splice(i, 1);
          changed = true;
          break;
        }

        const dataDate = this.parseFlexibleDateToDate(dataStr);
        if (!dataDate) continue;

        // capacidade do canal
        const canalItem = await this.mondayItemRepository.findOne({ where: { item_id: String(idCanal) } });
        const maxValue = canalItem?.max_value !== undefined && canalItem?.max_value !== null
          ? Number(canalItem.max_value)
          : undefined;
        if (maxValue === undefined || Number.isNaN(maxValue)) {
          continue;
        }

        // Horários especiais que compartilham limite (8:00 e 8:30)
        const splitHours = ["08:00", "08:30"];
        const effectiveMaxValue = splitHours.includes(horaAtual) ? maxValue / 2 : maxValue;

        // disponibilidade = max - (reservas em DB + reservas staged desta passada)
        // NOVA LÓGICA: Passa área solicitante para considerar reuso de reservas da mesma área
        const dbReserved = await this.sumReservedQty(idCanal, dataDate, horaAtual, areaSolicitante);
        const stagedReserved = staged[key(idCanal, dataDate, horaAtual)] ?? 0;
        const availableAtCurrent = Math.max(0, effectiveMaxValue - (dbReserved + stagedReserved));

        if (demanda <= availableAtCurrent) {
          // aloca tudo neste slot (somente em memória para cálculo da mesma passada)
          staged[key(idCanal, dataDate, horaAtual)] = (staged[key(idCanal, dataDate, horaAtual)] ?? 0) + demanda;
          continue;
        }

        // Se capacidade disponível for zero ou negativa, não manter item com 0
        if (availableAtCurrent <= 0) {
          // Tentar mover toda a demanda para o próximo horário
          const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
          const nextIndex = idx >= 0 ? idx + 1 : 0;
          if (nextIndex >= activeTimeSlots.length) {
            console.warn(`Sem próximo horário disponível após "${horaAtual}" para canal ${idCanal}. Restante: ${demanda}`);
            // Remove item com 0 (não cria objeto com 0)
            items.splice(i, 1);
            changed = true;
            break;
          }
          const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
          // Substitui o item atual por um novo no próximo horário com toda a demanda
          const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: demanda };
          items.splice(i, 1, novoSubitem);
          changed = true;
          break;
        }

        // Ajusta o item atual para a capacidade disponível (> 0)
        item.n_meros_mkkchcmk = availableAtCurrent;
        staged[key(idCanal, dataDate, horaAtual)] = (staged[key(idCanal, dataDate, horaAtual)] ?? 0) + availableAtCurrent;

        // Resto deve ir para o próximo horário
        const restante = Math.max(0, demanda - availableAtCurrent);

        // Encontra próximo horário na lista de slots
        const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
        const nextIndex = idx >= 0 ? idx + 1 : 0;
        
        // Se não houver próximo horário sequencial, tentar buscar QUALQUER horário disponível no dia
        if (nextIndex >= activeTimeSlots.length) {
          let foundAvailableSlot = false;
          for (let j = 0; j < activeTimeSlots.length; j++) {
            const testHora = (activeTimeSlots[j].name || '').trim();
            const testReserved = await this.sumReservedQty(idCanal, dataDate, testHora, areaSolicitante);
            const testStaged = staged[key(idCanal, dataDate, testHora)] ?? 0;
            const testEffectiveMax = splitHours.includes(testHora) ? maxValue / 2 : maxValue;
            const testAvailable = Math.max(0, testEffectiveMax - (testReserved + testStaged));
            
            if (testAvailable > 0) {
              const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: testHora, n_meros_mkkchcmk: restante };
              items.splice(i + 1, 0, novoSubitem);
              foundAvailableSlot = true;
              changed = true;
              break;
            }
          }
          
          if (!foundAvailableSlot) {
            console.warn(`Nenhum horário disponível para alocar restante de ${restante} unidades no canal ${idCanal}`);
          }
          
          break;
        }

        const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
        const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: restante };
        // Insere imediatamente após o atual
        items.splice(i + 1, 0, novoSubitem);

        // Sinaliza mudança e reinicia a validação desde o início
        changed = true;
        break;
      }
    }

    // Remove qualquer resquício de itens com qtd <= 0
    return items.filter(it => Number(it.n_meros_mkkchcmk ?? 0) > 0);
  }

  /**
   * Compatibilidade: rotina simplificada para validar subitens e ajustar quantidade conforme capacidade.
   * Mantém logs de advertência quando a demanda excede a disponibilidade.
   */
  public async validateAndAdjustSubitems(
    subitems: SubitemData[],
    timeSlots: Array<{ name?: string }>,
    maxValue: number,
    areaSolicitante?: string
  ): Promise<SubitemData[]> {
    if (!Array.isArray(subitems) || subitems.length === 0) {
      return [];
    }

    const adjusted = subitems.map((item) => ({ ...item }));
    const slotNames = new Set((timeSlots || []).map((slot) => String(slot?.name ?? '').trim()).filter(Boolean));

    for (const subitem of adjusted) {
      const canalId = String((subitem as any).conectar_quadros_mkkcjhuc ?? (subitem as any).id ?? '').trim();
      const dataStr = String((subitem as any).conectar_quadros_mkkbt3fq ?? (subitem as any).data__1 ?? '').trim();
      const hora = String((subitem as any).conectar_quadros_mkkcnyr3 ?? '').trim();

      if (!canalId || !dataStr || !hora) {
        console.warn('Subitem inválido encontrado durante validação de capacidade.', { canalId, dataStr, hora });
        continue;
      }

      if (slotNames.size && !slotNames.has(hora)) {
        console.warn(`Horário ${hora} não está presente na lista de slots ativos.`);
      }

      let reservedQty = 0;
      try {
        const qbFactory = (this.channelScheduleRepository as any)?.createQueryBuilder?.bind(this.channelScheduleRepository);
        if (qbFactory) {
          const qb = qbFactory('schedule');
          const convertedDate = convertDateFormat(dataStr);
          const result = await qb
            .where('schedule.id_canal = :canal', { canal: canalId })
            .andWhere('schedule.data = :data', { data: convertedDate })
            .andWhere('schedule.hora = :hora', { hora })
            .getMany();

          reservedQty = Array.isArray(result)
            ? result.reduce((acc: number, current: any) => {
                const quantity = Number(current?.quantity ?? current?.qtd ?? 0);
                if (!Number.isFinite(quantity)) {
                  return acc;
                }
                const tipo = String(current?.tipo ?? 'agendamento');
                if (tipo === 'agendamento') {
                  return acc + quantity;
                }
                if (!areaSolicitante || String(current?.area_solicitante ?? '').trim() !== String(areaSolicitante).trim()) {
                  return acc + quantity;
                }
                return acc;
              }, 0)
            : 0;
        }
      } catch (error) {
        console.warn('Falha ao consultar reservas durante validação de subitens:', error);
      }

      const demand = Number((subitem as any).n_meros_mkkchcmk ?? 0);
      const available = Math.max(0, maxValue - reservedQty);

      if (demand > available) {
        console.warn(`Capacidade excedida para canal ${canalId} no horário ${hora}. Disponível: ${available}, Solicitado: ${demand}`);
        (subitem as any).n_meros_mkkchcmk = available;
      }

      if (available <= 0) {
        (subitem as any).n_meros_mkkchcmk = 0;
      }
    }

    const filtered = adjusted.filter((item) => Number((item as any).n_meros_mkkchcmk ?? 0) > 0);
    if (filtered.length === 0) {
      console.warn('Nenhum subitem permaneceu após ajuste de capacidade.');
    }

    return filtered;
  }

  /** 
   * Soma total já reservada (qtd) em channel_schedules para um canal/data/hora
   * Considera área solicitante para excluir reservas da mesma área (permitindo reuso)
   */
  private async sumReservedQty(idCanal: string, dataDate: Date, hora: string, areaSolicitante?: string): Promise<number> {
    const schedules = await this.channelScheduleRepository.find({
      where: {
        id_canal: idCanal,
        data: this.truncateDate(dataDate),
        hora: hora
      }
    });

    let totalJaUsado = 0;
    schedules.forEach(schedule => {
      const qtd = Number.parseFloat(schedule.qtd.toString());
      const tipo = schedule.tipo || 'agendamento';

      if (tipo === 'agendamento') {
        // Agendamentos SEMPRE contam
        totalJaUsado += qtd;
      } else if (tipo === 'reserva') {
        // Reservas: só contam se forem de OUTRA área (ou se área não foi informada)
        if (!areaSolicitante || schedule.area_solicitante !== areaSolicitante) {
          totalJaUsado += qtd;
        }
        // Se for da mesma área, NÃO soma (permite reuso)
      }
    });

    return totalJaUsado;
  }

  /** Utilitário: tenta parsear "YYYY-MM-DD" ou "DD/MM/YYYY" para Date */
  private parseFlexibleDateToDate(value: string): Date | null {
    const s = String(value).trim();
    let d: Date | null = null;
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const br = /^\d{2}\/\d{2}\/\d{4}$/;
    if (iso.test(s)) {
      const [y, m, dd] = s.split('-').map(Number);
      d = new Date(y, m - 1, dd);
    } else if (br.test(s)) {
      const [dd, mm, y] = s.split('/').map(Number);
      d = new Date(y, mm - 1, dd);
    } else {
      const parsed = new Date(s);
      d = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }

  /** Zera hora/min/seg/ms da data para comparação igual ao tipo date */
  private truncateDate(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Encontra o subitem com data__1 mais próxima da data atual
   * @param subitems Array de subitems para analisar
   * @returns O subitem com data mais próxima, ou null se não encontrar nenhum com data válida
   */
  private findClosestSubitemByDate(subitems: SubitemData[]): SubitemData | null {
    if (!Array.isArray(subitems) || subitems.length === 0) {
      return null;
    }

    const today = new Date();
    let closestSubitem: SubitemData | null = null;
    let closestDiff = Infinity;

    for (const subitem of subitems) {
      const dateValue = (subitem as any)['data__1'];
      if (!dateValue) continue;

      const subitemDate = this.parseFlexibleDateToDate(String(dateValue));
      if (!subitemDate) continue;

      // Calcular a diferença absoluta em dias entre a data do subitem e hoje
      const diffMs = Math.abs(subitemDate.getTime() - today.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < closestDiff) {
        closestDiff = diffDays;
        closestSubitem = subitem;
      }
    }

    return closestSubitem;
  }



  /**
   * Constrói o objeto column_values para a mutation da Monday.com
   */
  protected async buildColumnValues(formData: FormSubmissionData, mapping: MondayFormMapping): Promise<Record<string, any>> {
    const columnValues: Record<string, any> = {};

    // Campos excluídos da submissão para Monday.com
    const excludedFields = [
      'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas5__1',
      // Excluir campos GAM originais que serão mapeados via column_mappings
      // NOTA: gam_start_date e gam_end_date serão combinados em timerange_mkrmvz3 via transform
      'gam_start_date', 'gam_end_date', 'gam_client_type', 'gam_campaign_type', 
      'gam_mechanism', 'gam_requesting_area', 'gam_target_segment', 'gam_product_service',
      'gam_objective', 'gam_format_type', 'gam_campaign_type_specific', 'gam_banner_links',
      'gam_audience_format', 'gam_channels', 'gam_observations', 'gam_other_campaign_type'
    ];

    // Verificar se há subitems e encontrar o com data mais próxima de hoje
    let closestSubitemDate: string | undefined;
    if (formData.data.__SUBITEMS__ && Array.isArray(formData.data.__SUBITEMS__)) {
      const closestSubitem = this.findClosestSubitemByDate(formData.data.__SUBITEMS__);
      if (closestSubitem && (closestSubitem as any)['data__1']) {
        closestSubitemDate = String((closestSubitem as any)['data__1']);
        console.log(`Usando data__1 do subitem mais próximo: ${closestSubitemDate}`);
      }
    }
    
    // Primeiro adicionar todas as chaves do data (exceto campos excluídos)
    for (const [key, value] of Object.entries(formData.data)) {
      if (!excludedFields.includes(key) && value !== undefined && value !== null) {
        let finalValue = value;
        
        // Se for o campo data__1 e temos uma data do subitem mais próximo, usar ela
        if (key === 'data__1' && closestSubitemDate) {
          finalValue = closestSubitemDate;
          console.log(`Substituindo data__1 original "${value}" pela data do subitem mais próximo: "${closestSubitemDate}"`);
        }
        
        // Formatar valor baseado no tipo
        const formattedValue = this.formatValueForMondayColumn(finalValue, this.getColumnType(key));
        if (formattedValue !== undefined) {
          columnValues[key] = formattedValue;
        }
      }
    }

    // Se não existe data__1 no formulário principal mas temos uma data do subitem mais próximo, adicionar
    if (!columnValues['data__1'] && closestSubitemDate) {
      console.log(`Adicionando data__1 do subitem mais próximo: ${closestSubitemDate}`);
      const formattedValue = this.formatValueForMondayColumn(closestSubitemDate, this.getColumnType('data__1'));
      if (formattedValue !== undefined) {
        columnValues['data__1'] = formattedValue;
      }
    }

    // Depois processar mapeamentos específicos se existirem (somente se não estão nos excludedFields)
  for (const columnMapping of mapping.column_mappings) {
      try {
        if (excludedFields.includes(columnMapping.monday_column_id)) {
          continue; // Pular campos excluídos
        }

        let value = getValueByPath(formData, columnMapping.form_field_path);
        
        // Debug: Log do mapeamento GAM
        if (columnMapping.form_field_path.startsWith('data.gam_')) {
          console.log(`GAM Mapeamento: ${columnMapping.form_field_path} → ${columnMapping.monday_column_id} = "${value}"`);
        }

        // Se o mapeamento for para data__1 e temos uma data do subitem mais próximo, usar ela
        if (columnMapping.monday_column_id === 'data__1' && closestSubitemDate) {
          value = closestSubitemDate;
          console.log(`Usando data__1 do subitem mais próximo no mapeamento: ${closestSubitemDate}`);
        }

        // Aplicar transformação se definida
        if (columnMapping.transform) {
          console.log(`Aplicando transform para ${columnMapping.monday_column_id}, value antes:`, value);
          value = columnMapping.transform(value, formData);
          console.log(`Transform aplicado para ${columnMapping.monday_column_id}, value depois:`, value);
        }

        // Usar valor padrão se não houver valor
        if (value === undefined && columnMapping.default_value !== undefined) {
          value = columnMapping.default_value;
        }

        // Formatar valor baseado no tipo de coluna
        if (value !== undefined) {
          const formattedValue = this.formatValueForMondayColumn(value, columnMapping.column_type);
          if (formattedValue !== undefined) {
            columnValues[columnMapping.monday_column_id] = formattedValue;
          }
        }

      } catch (error) {
        console.warn(`Erro ao processar campo ${columnMapping.monday_column_id}:`, error);
        // Continua processamento mesmo se um campo falhar
      }
    }

  // Ajuste: não enviar o campo composto (text_mkr3znn0) no primeiro envio.
  // Ele será calculado e enviado apenas no segundo envio (change_multiple_column_values).

    // Requisito: Popular os novos campos de texto conforme definições
    // Substituir lookup_* por campos text_mkvh* diretos
    const textMappings = [
      { lookup: 'lookup_mkrtaebd', textField: 'text_mkvhz8g3' }, // Tipo Cliente
      { lookup: 'lookup_mkrt66aq', textField: 'text_mkvhedf5' }, // Tipo Campanha  
      { lookup: 'lookup_mkrtxa46', textField: 'text_mkvhqgvn' }, // Tipo Disparo
      { lookup: 'lookup_mkrta7z1', textField: 'text_mkvhv5ma' }, // Mecânica
      { lookup: 'lookup_mkrt36cj', textField: 'text_mkvhvcw4' }, // Área Solicitante
      { lookup: 'lookup_mkrtwq7k', textField: 'text_mkvh2z7j' }, // Objetivo
      { lookup: 'lookup_mkrtvsdj', textField: 'text_mkvhwyzr' }, // Produto
      { lookup: 'lookup_mkrtcctn', textField: 'text_mkvhgbp8' }, // Canal
      { lookup: 'lookup_mkrtxgmt', textField: 'text_mkvhammc' }  // Segmento
    ];

    for (const mapping of textMappings) {
      const lookupValue = formData.data?.[mapping.lookup];
      if (lookupValue !== undefined && lookupValue !== null) {
        columnValues[mapping.textField] = String(lookupValue);
      }
    }

    // Requisito: popular corretamente o campo 'pessoas__1' (People) a partir de 'pessoas5__1'
    // - Se já veio no formato { personsAndTeams: [...] }, repassa direto
    // - Caso contrário, tenta resolver via subscribers (quando fornecido email/string)
    if (formData.data?.["pessoas5__1"] !== undefined) {
      const raw = formData.data["pessoas5__1"];
      if (raw && typeof raw === 'object' && Array.isArray(raw.personsAndTeams)) {
        columnValues["pessoas__1"] = { personsAndTeams: raw.personsAndTeams };
      } else {
        const resolved = await this.resolvePeopleFromSubscribers(raw);
        if (resolved) {
          columnValues["pessoas__1"] = resolved;
        }
      }
    }

    // Requisito: adicionar no primeiro envio (primeiro board) os campos derivados de date_mkr6nj1f
    // - text_mkr3n64h: igual a date_mkr6nj1f.date porém no formato YYYYMMDD (texto)
    // - date_mkrj355f: igual a date_mkr6nj1f (objeto com { date: 'YYYY-MM-DD' })
    try {
      // Tentar obter a data já normalizada que será enviada para a Monday
      const normalizedDateObj = columnValues['date_mkr6nj1f'];
      let dateStr: string | undefined;
      if (normalizedDateObj && typeof normalizedDateObj === 'object' && typeof normalizedDateObj.date === 'string') {
        dateStr = normalizedDateObj.date;
      } else {
        // Fallbacks: pegar direto do payload de entrada, como string ou objeto { date }
        const raw = (formData.data as any)?.['date_mkr6nj1f'];
        if (raw && typeof raw === 'object' && typeof raw.date === 'string') {
          dateStr = raw.date;
        } else if (typeof raw === 'string') {
          dateStr = raw;
        }
      }

      if (dateStr) {
        // Popular date_mkrj355f somente se ainda não existir
        if (columnValues['date_mkrj355f'] === undefined) {
          columnValues['date_mkrj355f'] = this.formatDateValue(dateStr);
        }
        // Popular text_mkr3n64h (YYYYMMDD) somente se ainda não existir
        if (columnValues['text_mkr3n64h'] === undefined) {
          const yyyymmdd = toYYYYMMDD(dateStr);
          if (yyyymmdd) {
            columnValues['text_mkr3n64h'] = yyyymmdd;
          }
        }
      }
    } catch (e) {
      console.warn('Falha ao derivar text_mkr3n64h/date_mkrj355f a partir de date_mkr6nj1f:', e);
    }

    return columnValues;
  }

  /**
   * Override: Adiciona suporte para TIMELINE column type
   */
  protected formatValueForMondayColumn(value: any, columnType: MondayColumnType): any {
    // Handle TIMELINE type specific to GAM campaigns
    if (columnType === MondayColumnType.TIMELINE) {
      return this.formatTimelineValue(value);
    }
    
    // Delegate to base class for all other types
    return super.formatValueForMondayColumn(value, columnType);
  }


  /**
   * Insere dados dos subitems na tabela channel_schedules
   * @param subitems Array de subitems com dados de canal/data/hora
   * @param formData Dados completos do formulário para extrair area_solicitante e user_id
   */
  private async insertChannelSchedules(subitems: any[], formData: FormSubmissionData): Promise<void> {
    // Extrair área solicitante do formulário
    // Pode vir como 'conectar_quadros__1' (antes da transformação) ou 'lookup_mkrt36cj' (depois da transformação)
    // ou ainda como 'area_solicitante', 'gam_requesting_area', 'briefing_requesting_area'
    const areaSolicitante = formData.data?.conectar_quadros__1
      || formData.data?.lookup_mkrt36cj
      || formData.data?.area_solicitante
      || formData.data?.gam_requesting_area
      || formData.data?.briefing_requesting_area;

    // Extrair user_id se disponível (pode vir do contexto de autenticação)
    const userId = formData.data?.user_id || undefined;

    if (!areaSolicitante) {
      console.warn('⚠️ Área solicitante não encontrada no formulário. Agendamentos serão criados sem área.');
    }

    console.log(`📝 Criando agendamentos para área solicitante: ${areaSolicitante || 'Não especificada'}`);

    for (const subitem of subitems) {
      try {
        const idCanal = String(
          subitem.id
          || subitem.conectar_quadros_mkkcjhuc
          || subitem.conectar_quadros__1
          || subitem.channel_id
          || ''
        ).trim();

        const rawDate = String(
          subitem.data__1
          || subitem.conectar_quadros_mkkbt3fq
          || subitem.date
          || ''
        ).trim();

        const hora = String(
          subitem.conectar_quadros_mkkcnyr3
          || subitem.hora
          || '00:00'
        ).trim();

        const rawQtd = subitem.n_meros_mkkchcmk
          ?? subitem.n_meros__1
          ?? subitem.qtd
          ?? subitem.quantity
          ?? 0;
        const qtd = Number(rawQtd);

        const scheduleData = {
          id_canal: idCanal,
          data: rawDate,
          hora,
          qtd: Number.isNaN(qtd) ? 0 : qtd
        };

        if (scheduleData.id_canal && scheduleData.data && scheduleData.qtd > 0) {
          // Converter data de YYYY-MM-DD para DD/MM/YYYY se necessário
          const convertedData = convertDateFormat(scheduleData.data);

          if (this.channelScheduleService) {
            await this.channelScheduleService.create({
              id_canal: scheduleData.id_canal,
              data: convertedData,
              hora: scheduleData.hora,
              qtd: scheduleData.qtd,
              area_solicitante: areaSolicitante,
              user_id: userId
            });
          } else {
            const entity = this.channelScheduleRepository.create({
              id_canal: scheduleData.id_canal,
              data: convertedData,
              hora: scheduleData.hora,
              qtd: scheduleData.qtd,
              area_solicitante: areaSolicitante,
              user_id: userId
            });
            await this.channelScheduleRepository.save(entity as any);
          }

          console.log(`✅ Agendamento criado - Canal: ${scheduleData.id_canal}, Área: ${areaSolicitante}, Qtd: ${scheduleData.qtd}`);
        }
      } catch (error) {
        console.error('❌ Erro ao inserir agendamento de canal:', error);
        // Continua processando outros subitems
      }
    }
  }





  /**
   * Formata valores de timeline para Monday.com
   * Timeline requer { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
   */
  protected formatTimelineValue(value: any): any {
    if (!value) return undefined;
    
    // Se já é um objeto com from e to
    if (typeof value === 'object' && value.from && value.to) {
      return {
        from: convertToISODate(value.from),
        to: convertToISODate(value.to)
      };
    }
    
    // Se é uma string no formato "YYYY-MM-DD,YYYY-MM-DD" ou similar
    if (typeof value === 'string' && value.includes(',')) {
      const [from, to] = value.split(',').map(s => s.trim());
      return {
        from: convertToISODate(from),
        to: convertToISODate(to)
      };
    }
    
    return undefined;
  }
  








  /**
   * Monta valor para coluna People a partir de monday_items.team (Times)
   * Busca monday_items por name == text_mkvhvcw4 (Área Solicitante) e converte team (ids) para personsAndTeams com kind: 'team'
   */
  private async buildPeopleFromLookupObjetivo(data: Record<string, any> | undefined): Promise<{ personsAndTeams: { id: string; kind: 'team' }[] } | undefined> {
    try {
      const areaSolicitante = String(
        data?.['text_mkvhvcw4']
        ?? data?.['lookup_mkrt6ws9']
        ?? data?.['area_solicitante']
        ?? data?.['gam_requesting_area']
        ?? ''
      ).trim();
      if (!areaSolicitante) return undefined;
      const item = await this.mondayItemRepository.findOne({ where: { name: areaSolicitante } });
      let ids = (item?.team ?? []).map(String).filter((s) => s.trim().length > 0);

      if (!ids.length) {
        const fallbackSubscribers = await this.subscriberRepository.find({ where: { area: areaSolicitante } } as any);
        ids = fallbackSubscribers
          .map((subscriber: any) => subscriber?.mondayTeamId ?? subscriber?.monday_team_id ?? subscriber?.teamId ?? subscriber?.team_id)
          .filter((teamId: unknown): teamId is string | number => teamId !== null && teamId !== undefined)
          .map((teamId: string | number) => String(teamId).trim())
          .filter((teamId: string) => teamId.length > 0);
      }

      if (!ids.length) return undefined;
      return {
        personsAndTeams: ids.map((id) => ({ id, kind: 'team' as const }))
      };
    } catch (e) {
      console.warn('Falha em buildPeopleFromLookupObjetivo:', e);
      return { personsAndTeams: [] };
    }
  }

  /**
   * Constrói o valor do campo text_mkr3znn0 usando os novos campos de texto text_mkvh*
   * {Data do Disparo Texto} - id-<abc123qerty> - text_mkvhz8g3 - text_mkvhedf5 - text_mkvhqgvn -
   * text_mkvhv5ma - text_mkvhvcw4 - text_mkvh2z7j - text_mkvhwyzr - text_mkvhgbp8 - text_mkvhammc - name
   * Inclui lógica IF para subprodutos: se existir subproduto, usa {Código Produto}_{Código Subproduto}
   */
  private async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};

    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();

    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || toYYYYMMDD(d["data__1"]);

    // Ajuste: usar o ID real do item criado para compor o campo (id-<itemId>)
    const idPart = itemId ? `id-${itemId}` : "";

    // Mapeamento híbrido: lookup_* (formulários CRM) → gam_* (formulários GAM puros)
    // Tentamos lookup primeiro, se não existir, tentamos gam
    const fieldPairs = [
      { lookup: "lookup_mkrtaebd", gam: "gam_client_type" },      // Tipo Cliente
      { lookup: "lookup_mkrt66aq", gam: "gam_campaign_type" },    // Tipo Campanha
      { lookup: "lookup_mkrtxa46", gam: "gam_mechanism" },        // Mecânica
      { lookup: "lookup_mkrta7z1", gam: "gam_requesting_area" },  // Área Solicitante
      { lookup: "lookup_mkrt36cj", gam: "gam_target_segment" },   // Segmento Alvo
      { lookup: "lookup_mkrtwq7k", gam: "gam_objective" },        // Objetivo
      { lookup: "lookup_mkrtvsdj", gam: "gam_product_service" },  // Produto / Serviço
      { lookup: "lookup_mkrtcctn", gam: "gam_format_type" },      // Formato
      { lookup: "lookup_mkrtxgmt", gam: "gam_campaign_type_specific" } // Tipo de Campanha Específica
    ];

    // Buscar board_id do board "Produto" uma vez para evitar colisão
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    const produtoBoardId = produtoBoard?.id;

    const codes: string[] = [];
    for (const pair of fieldPairs) {
      // Tentar lookup primeiro, depois gam
      const nameVal = String(d[pair.lookup] ?? d[pair.gam] ?? "").trim();
      if (!nameVal) {
        // Manter posição vazia para preservar a estrutura da taxonomia
        codes.push("");
        continue;
      }

      try {
        let code: string | undefined;

        // Lógica especial para produtos (lookup_mkrtvsdj / gam_product_service): buscar no board correto e incluir subproduto se existir
        if (pair.lookup === "lookup_mkrtvsdj") {
          // Buscar código do produto no board específico para evitar colisão com subprodutos
          code = await this.getCodeByItemName(nameVal, produtoBoardId);

          if (code) {
            const subproductCode = await this.mondayService.getSubproductCodeByProduct(nameVal);
            if (subproductCode) {
              code = `${code}_${subproductCode}`;
            }
          }
        } else {
          // Para outros campos, buscar normalmente
          code = await this.getCodeByItemName(nameVal);
        }

        codes.push(code ?? nameVal);
      } catch {
        codes.push(nameVal);
      }
    }

    const tailName = String(d["name"] ?? "").trim();

    // Não remover campos vazios para manter as posições fixas na taxonomia
    const parts = [
      yyyymmdd,
      idPart,
      ...codes,
      tailName,
    ];

    return parts.join("-");
  } 



}
