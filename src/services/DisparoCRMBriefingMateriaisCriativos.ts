import { ChannelScheduleService } from './ChannelScheduleService';
import { Repository } from 'typeorm';
import { buildSafePath } from '../utils/pathSecurity';
import { 
  FormSubmissionData, 
  MondayFormMapping, 
  MondayColumnType,
  DISPARO_CRM_BRIEFING_FORM_MAPPING,
  MARKETING_BOARD_FORM_MAPPING 
} from '../dto/MondayFormMappingDto';
import { AppDataSource } from '../config/database';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import type { SubitemData } from '../dto/MondayFormMappingDto';
import fs from 'node:fs';
import path from 'node:path';
import { BaseFormSubmissionService } from './BaseFormSubmissionService';
import { getValueByPath } from '../utils/objectHelpers';
import { convertDateFormat, toYYYYMMDD } from '../utils/dateFormatters';

export class DisparoCRMBriefingMateriaisCriativosService extends BaseFormSubmissionService {
  private readonly channelScheduleService?: ChannelScheduleService;
  private readonly channelScheduleRepository: Repository<ChannelSchedule>;

  // Board que contém os horários disponíveis (para calcular o "próximo horário")
  private static readonly TIME_SLOTS_BOARD_ID = '9965fb6d-34c3-4df6-b1fd-a67013fbe950';
  // Novo: Segundo board alvo do espelhamento
  private static readonly SECOND_BOARD_ID = '7463706726';
  // Assumindo grupo padrão "topics" para o segundo board (ajuste se necessário)
  private static readonly SECOND_BOARD_GROUP_ID = 'topics';
  private static readonly SECOND_BOARD_CONNECT_COLUMNS = [
    'text_mkvgjh0w',
    'conectar_quadros8__1',
  ];

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

  constructor() {
    super();
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
  }

  /**
   * Processa envio para o board de marketing (seguindo padrão do CRM)
   */
  private async processMarketingBoardSend(
    enrichedFormData: FormSubmissionData,
    itemName: string,
    mainBoardItemId: string
  ): Promise<string> {
    console.log('Enviando briefing para o board de marketing (Fluxo de MKT)...');
    
    // Adicionar o ID do board principal aos dados para usar no mapeamento
    enrichedFormData.data.main_board_item_id = mainBoardItemId;

    // Converter text_mkvhvcw4 de ID para nome se necessário (ANTES de buildColumnValues)
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

    // Construir os valores das colunas para o board de marketing
    const marketingColumnValues = await this.buildColumnValues(enrichedFormData, MARKETING_BOARD_FORM_MAPPING);
    
    // Excluir campo arquivos da criação inicial (será tratado separadamente após upload)
    delete marketingColumnValues["arquivos"];
    
    // Corrigir campo pessoas7 para usar o valor já resolvido do board principal
    // O mapeamento aponta para pessoas5__1 (email), mas precisamos do valor resolvido
    if (enrichedFormData.data?.["pessoas5__1"] !== undefined) {
      const resolved = await this.resolvePeopleFromSubscribers(enrichedFormData.data["pessoas5__1"]);
      if (resolved) {
        marketingColumnValues["pessoas7"] = resolved;
      }
    }
    
    // Separar colunas base e conectores (seguindo padrão do CRM)
    // Marketing board NÃO tem algumas colunas do board principal, excluí-las
    const marketingExcludeColumns = ['link_to_itens_filhos__1', 'conectar_quadros20__1'];
    const { baseColumns: marketingBaseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(marketingColumnValues, marketingExcludeColumns);
    
    // Salvar o JSON de pré-submissão do board de marketing (primeiro envio)
    try {
      const marketingPreData = {
        board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
        group_id: MARKETING_BOARD_FORM_MAPPING.group_id,
        item_name: itemName,
        column_values: marketingBaseColumns,
      };
      await this.savePreObjectLocally(marketingPreData, `${enrichedFormData.id || 'submission'}_marketing_board_predata`);
    } catch (e) {
      console.warn('Falha ao gerar/salvar pre-data do board de marketing:', e);
    }
    
    // Criar o item no board de marketing (primeira criação)
    const marketingItemId = await this.createMondayItem(
      MARKETING_BOARD_FORM_MAPPING.board_id,
      MARKETING_BOARD_FORM_MAPPING.group_id,
      itemName,
      marketingBaseColumns
    );
    
    console.log(`Board de marketing: item criado com ID ${marketingItemId} (primeiro envio).`);
    
    // Processar colunas conectar_quadros* (seguindo padrão do CRM)
    try {
      const resolvedConnectColumns = await this.resolveConnectBoardColumns(connectColumnsRaw);
      
      if (Object.keys(resolvedConnectColumns).length > 0) {
        // Salvar objeto localmente para auditoria
        await this.saveObjectLocally(
          {
            board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
            item_id: marketingItemId,
            column_values: resolvedConnectColumns,
          },
          `${enrichedFormData.id || 'submission'}_marketing_board_connect_columns`
        );
        
        // Também salvar como PRE-DATA do segundo envio do board de marketing
        await this.savePreObjectLocally(
          {
            board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
            item_id: marketingItemId,
            column_values: resolvedConnectColumns,
          },
          `${enrichedFormData.id || 'submission'}_marketing_board_second_send_predata`
        );
        
        // Enviar atualização de múltiplas colunas (segundo envio)
        await this.mondayService.changeMultipleColumnValues(
          MARKETING_BOARD_FORM_MAPPING.board_id,
          marketingItemId,
          resolvedConnectColumns
        );
        
        console.log(`Board de marketing: colunas conectar_quadros* atualizadas para item ${marketingItemId} (segundo envio).`);
      }
    } catch (e) {
      console.error('Falha ao atualizar colunas conectar_quadros no board de marketing:', e);
    }
    
    console.log(`Conexão estabelecida: Board Marketing (${marketingItemId}) → Board Principal (${mainBoardItemId})`);
    
    return marketingItemId;
  }

  /**
   * Processa uma submissão de formulário e cria um item na Monday.com
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processFormSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = DISPARO_CRM_BRIEFING_FORM_MAPPING
  ): Promise<string> {
    try {
      console.log('Processando submissão de formulário:', formData.id);

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

  // 3.1. Validar campos condicionais de briefing APÓS os mapeamentos
  this.validateSpecificFields(enrichedFormData.data);

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
        await this.savePreObjectLocally(firstPreData, `${formData.id || 'submission'}_first_board_predata`);
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data:', e);
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
            `${formData.id || 'submission'}_first_board_connect_columns`
          );

          // Também salvar como PRE-DATA do segundo envio do primeiro board
          await this.savePreObjectLocally(
            {
              board_id: mapping.board_id,
              item_id: mondayItemId,
              column_values: resolvedConnectColumns,
            },
            `${formData.id || 'submission'}_first_board_second_send_predata`
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

      // Processar upload de arquivo se necessário
      await this.processFileUpload(mondayItemId, mapping.board_id, enrichedFormData);

      // Envio para o segundo board: SOMENTE por subitem (não há outra lógica)
      if (Array.isArray(enrichedFormData?.data?.__SUBITEMS__) && enrichedFormData.data.__SUBITEMS__.length > 0) {
        await this.processSecondBoardSendsForSubitems(enrichedFormData, allColumnValues, itemName, mondayItemId);
      }

      // Enviar para o board de marketing (seguindo padrão do CRM)
      try {
        await this.processMarketingBoardSend(enrichedFormData, itemName, mondayItemId);
      } catch (error) {
        console.error('Erro ao processar envio para board de marketing:', error);
        // Não falhar o processo principal se o envio para marketing falhar
      }

      return mondayItemId;

    } catch (error) {
      console.error('Erro ao processar submissão do formulário:', error);
      throw new Error(`Falha ao criar item na Monday.com: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

      const itemNameSecond = initial.item_name || 'teste excluir';
      const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(initial.column_values);
      const filteredConnect = this.pickSecondBoardConnectColumns(connectColumnsRaw);

      // Pre-data por subitem (primeiro envio)
      try {
        await this.savePreObjectLocally(
          {
            board_id: DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
            item_name: itemNameSecond,
            column_values: baseColumns,
          },
          `${enrichedFormData.id || 'submission'}_second_board_predata_idx_${idx}`
        );
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do segundo board (subitem):', e);
      }

      // Criação do item
      const secondItemId = await this.createMondayItem(
        DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
        DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_GROUP_ID,
        itemNameSecond || fallbackItemName,
        baseColumns
      );
  console.log(`Segundo board: item criado para subitem ${idx} com ID ${secondItemId} (primeiro envio).`);

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
          console.warn('Falha ao montar pessoas3__1 (segundo board):', e);
        }
        if (Object.keys(resolved).length > 0) {
          await this.saveObjectLocally(
            {
              board_id: DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_second_board_connect_columns_idx_${idx}`
          );

          await this.savePreObjectLocally(
            {
              board_id: DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_second_board_second_send_predata_idx_${idx}`
          );

          await this.mondayService.changeMultipleColumnValues(
            DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
            secondItemId,
            resolved
          );
        }
      } catch (e) {
        console.error('Falha ao atualizar colunas conectar_quadros no segundo board (subitem):', e);
      }

      results.push(secondItemId);
    }

    return results;
  }

  // Novo: monta payload do segundo board a partir do subitem (sem conectar_quadros*)
  /**
   * Gera string composta para o segundo board, incluindo n_meros__1 e texto6__1 ao final
   */
  private async buildCompositeTextFieldSecondBoard(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    const yyyymmdd = toYYYYMMDD(d["data__1"]);
    const idPart = itemId ? `id-${itemId}` : "";
    const lookupFields = [
      "lookup_mkrtaebd",
      "lookup_mkrt66aq",
      "lookup_mkrtxa46",
      "lookup_mkrta7z1",
      "lookup_mkrt36cj",
      "lookup_mkrtwq7k",
      "lookup_mkrtvsdj",
      "lookup_mkrtcctn",
    ] as const;
    const codes: string[] = [];
    for (const field of lookupFields) {
      const nameVal = String(d[field] ?? "").trim();
      if (!nameVal) {
        // Manter posição vazia para preservar a estrutura da taxonomia
        codes.push("");
        continue;
      }
      try {
        const code = await this.getCodeByItemName(nameVal);
        codes.push(code ?? nameVal);
      } catch {
        codes.push(nameVal);
      }
    }
    // Não remover campos vazios para manter as posições fixas na taxonomia
    const parts = [
      yyyymmdd,
      idPart,
      ...codes
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

    // Para cada par (nome acima => código atual), buscar em monday_items por name e atribuir code
    // Canal - PRIORIZA o canal do subitem (conectar_quadros87__1) ao invés do campo do formulário principal
    const canalDoSubitem = String(subitem.conectar_quadros87__1 ?? '').trim();
    const canalDoFormulario = String(enrichedFormData.data['lookup_mkrtcctn'] ?? '').trim();
    cv['text_mkrrqsk6'] = canalDoSubitem || canalDoFormulario;

    // texto6__1 recebe o nome do canal (sobrescreve a taxonomia de produto)
    cv['texto6__1'] = cv['text_mkrrqsk6'];

    if (cv['text_mkrrqsk6']) {
      cv['text_mkrr8dta'] = (await this.getCodeByItemName(cv['text_mkrrqsk6']))
        ?? cv['text_mkrr8dta'] ?? 'Email';
    } else {
      cv['text_mkrr8dta'] = cv['text_mkrr8dta'] ?? 'Email';
    }

    // Cliente
    cv['text_mkrrg2hp'] = String(enrichedFormData.data['lookup_mkrtaebd'] ?? '')
      .trim();
    if (cv['text_mkrrg2hp']) {
      cv['text_mkrrna7e'] = (await this.getCodeByItemName(cv['text_mkrrg2hp']))
        ?? cv['text_mkrrna7e'] ?? 'NaN';
    } else {
      cv['text_mkrrna7e'] = cv['text_mkrrna7e'] ?? 'NaN';
    }

    // Campanha
    cv['text_mkrra7df'] = String(enrichedFormData.data['lookup_mkrt66aq'] ?? '')
      .trim();
    if (cv['text_mkrra7df']) {
      cv['text_mkrrcnpx'] = (await this.getCodeByItemName(cv['text_mkrra7df']))
        ?? cv['text_mkrrcnpx'] ?? 'NaN';
    } else {
      cv['text_mkrrcnpx'] = cv['text_mkrrcnpx'] ?? 'NaN';
    }

    // Disparo
    cv['text_mkrr9edr'] = String(enrichedFormData.data['lookup_mkrtxa46'] ?? '')
      .trim();
    if (cv['text_mkrr9edr']) {
      cv['text_mkrrmjcy'] = (await this.getCodeByItemName(cv['text_mkrr9edr']))
        ?? cv['text_mkrrmjcy'] ?? 'NaN';
    } else {
      cv['text_mkrrmjcy'] = cv['text_mkrrmjcy'] ?? 'NaN';
    }

    // Mecânica
    cv['text_mkrrxf48'] = String(enrichedFormData.data['lookup_mkrta7z1'] ?? '')
      .trim();
    if (cv['text_mkrrxf48']) {
      cv['text_mkrrxpjd'] = (await this.getCodeByItemName(cv['text_mkrrxf48']))
        ?? cv['text_mkrrxpjd'] ?? 'NaN';
    } else {
      cv['text_mkrrxpjd'] = cv['text_mkrrxpjd'] ?? 'NaN';
    }

    // Solicitante
    let solicitanteValue = String(enrichedFormData.data['lookup_mkrt36cj'] ?? '').trim();
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
    cv['text_mkrrhdh6'] = String(enrichedFormData.data['lookup_mkrtwq7k'] ?? '')
      .trim();
    if (cv['text_mkrrhdh6']) {
      cv['text_mkrrraz2'] = (await this.getCodeByItemName(cv['text_mkrrhdh6']))
        ?? cv['text_mkrrraz2'] ?? 'NaN';
    } else {
      cv['text_mkrrraz2'] = cv['text_mkrrraz2'] ?? 'NaN';
    }

    // Produto
    cv['text_mkrrfqft'] = String(enrichedFormData.data['lookup_mkrtvsdj'] ?? '')
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
    cv['text_mkrrt32q'] = String(enrichedFormData.data['lookup_mkrtxgmt'] ?? '')
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
  const item_name = `teste excluir${texto6 ? ' - ' + texto6 : ''}`;
  return { item_name, column_values: cv };
  }

  // Novo: limita as colunas conectar_quadros ao conjunto exigido para o segundo board
  private pickSecondBoardConnectColumns(connectColumnsRaw: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const k of DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_CONNECT_COLUMNS) {
      if (connectColumnsRaw[k] !== undefined) filtered[k] = connectColumnsRaw[k];
    }
    return filtered;
  }  

  /**
   * Separa colunas que iniciam com "conectar_quadros" das demais
   */
  protected splitConnectBoardColumns(all: Record<string, any>, excludeColumns: string[] = []): { baseColumns: Record<string, any>; connectColumnsRaw: Record<string, any> } {
    const baseColumns: Record<string, any> = {};
    const connectColumnsRaw: Record<string, any> = {};
    for (const [key, val] of Object.entries(all)) {
      // Tratar tanto campos conectar_quadros* quanto link_to_itens_filhos__1 como board relations
      // Excluir colunas que não existem no board de destino (ex: marketing board)
      const isConnectColumn = key.startsWith('conectar_quadros') || key === 'link_to_itens_filhos__1';
      const shouldExclude = excludeColumns.includes(key);
      
      if (isConnectColumn && !shouldExclude) {
        connectColumnsRaw[key] = val;
      } else {
        baseColumns[key] = val;
      }
    }
    return { baseColumns, connectColumnsRaw };
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
    const areaSolicitante = formData?.data?.briefing_requesting_area 
      || formData?.data?.requesting_area 
      || formData?.data?.area_solicitante;

    // Carrega slots de horários ativos, ordenados por nome ASC
    const activeTimeSlots = await this.mondayItemRepository.find({
      where: { board_id: DisparoCRMBriefingMateriaisCriativosService.TIME_SLOTS_BOARD_ID, status: 'Ativo' },
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
        let nextIndex = idx >= 0 ? idx + 1 : 0;
        
        // Se não houver próximo horário sequencial, tentar buscar QUALQUER horário disponível no dia
        if (nextIndex >= activeTimeSlots.length) {
          let foundAvailableSlot = false;
          for (const slot of activeTimeSlots) {
            const testHora = (slot.name || '').trim();
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
  'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas__1', 'pessoas5__1', 'lookup_mkrt36cj', 'lookup_mkrt66aq', 'lookup_mkrtaebd', 'lookup_mkrtcctn', 'lookup_mkrta7z1', 'lookup_mkrtvsdj', 'lookup_mkrtxa46', 'lookup_mkrtwq7k', 'lookup_mkrtxgmt', 'enviar_arquivo__1', 'arquivos'
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

        // Se o mapeamento for para data__1 e temos uma data do subitem mais próximo, usar ela
        if (columnMapping.monday_column_id === 'data__1' && closestSubitemDate) {
          value = closestSubitemDate;
          console.log(`Usando data__1 do subitem mais próximo no mapeamento: ${closestSubitemDate}`);
        }

        // Aplicar transformação se definida
        if (columnMapping.transform && value !== undefined) {
          value = columnMapping.transform(value);
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
   * Determina o tipo de coluna baseado no nome do campo
   */
  protected getColumnType(fieldName: string): MondayColumnType {
    // Campos de data
    if (fieldName.includes('data__') || fieldName.startsWith('date_')) {
      return MondayColumnType.DATE;
    }

    // Campos numéricos
    if (fieldName.includes('n_mero') || fieldName.includes('n_meros')) {
      return MondayColumnType.NUMBER;
    }

    // Campos de data
    if (fieldName.includes('data__') || fieldName.startsWith('date_')) { /* ...existing code... */ }

    // Campos numéricos
    if (fieldName.includes('n_mero') || fieldName.includes('n_meros')) { /* ...existing code... */ }

    // Campos de pessoas
    if (fieldName.includes('pessoas')) { /* ...existing code... */ }

    // Campos de lista suspensa (dropdown)
    if (fieldName.includes('lista_suspensa')) { /* ...existing code... */ }

    // Campo text_mkvgjh0w (tipo hour, tratado como texto)
    if (fieldName === 'text_mkvgjh0w') {
      return MondayColumnType.TEXT;
    }

    // Campos de conexão entre quadros (pode ser tratado como texto)
    if (fieldName.includes('conectar_quadros')) { /* ...existing code... */ }

    // Campos de lookup (texto)
    if (fieldName.includes('lookup_')) { /* ...existing code... */ }

    // Campos de texto por padrão
    return MondayColumnType.TEXT;
  }

  /**
   * Insere dados dos subitems na tabela channel_schedules
   * @param subitems Array de subitems com dados de canal/data/hora
   * @param formData Dados completos do formulário para extrair area_solicitante e user_id
   */
  private async insertChannelSchedules(subitems: any[], formData: FormSubmissionData): Promise<void> {
    if (!this.channelScheduleService) {
      console.warn('ChannelScheduleService não disponível. Dados não serão inseridos em channel_schedules.');
      return;
    }

    // Extrair área solicitante do formulário
    // Pode vir como 'conectar_quadros__1' (antes da transformação) ou 'lookup_mkrt36cj' (depois da transformação)
    // ou ainda como 'area_solicitante', 'gam_requesting_area', 'briefing_requesting_area'
    const areaSolicitante = formData.data?.conectar_quadros__1
      || formData.data?.lookup_mkrt36cj
      || formData.data?.area_solicitante
      || formData.data?.gam_requesting_area
      || formData.data?.briefing_requesting_area;
    const userId = formData.data?.user_id || undefined;

    if (!areaSolicitante) {
      console.warn('⚠️ Área solicitante não encontrada no formulário. Agendamentos serão criados sem área.');
    }

    console.log(`📝 Criando agendamentos para área solicitante: ${areaSolicitante || 'Não especificada'}`);

    for (const subitem of subitems) {
      try {
        const scheduleData = {
          id_canal: subitem.id || '',
          data: subitem.data__1 || '', 
          hora: subitem.conectar_quadros_mkkcnyr3 || '00:00',
          qtd: subitem.n_meros_mkkchcmk || 0
        };

        if (scheduleData.id_canal && scheduleData.data && scheduleData.qtd > 0) {
          // Converter data de YYYY-MM-DD para DD/MM/YYYY se necessário
          const convertedData = convertDateFormat(scheduleData.data);
          
          await this.channelScheduleService.create({
            id_canal: scheduleData.id_canal,
            data: convertedData,
            hora: scheduleData.hora,
            qtd: scheduleData.qtd,
            area_solicitante: areaSolicitante,
            user_id: userId,
            tipo: 'agendamento' // Formulário sempre cria agendamento
          } as any);

          console.log(`✅ Agendamento criado - Canal: ${scheduleData.id_canal}, Área: ${areaSolicitante}, Qtd: ${scheduleData.qtd}`);
        }
      } catch (error) {
        console.error('❌ Erro ao inserir agendamento de canal:', error);
        // Continua processando outros subitems
      }
    }
  }

  /**
   * Converte data de YYYY-MM-DD para DD/MM/YYYY se necessário
   */


  /**
   * Formata valor baseado no tipo de coluna da Monday.com
   */
  protected formatValueForMondayColumn(value: any, columnType: MondayColumnType): any {
    if (value === null || value === undefined) {
      return undefined;
    }

    switch (columnType) {
      case MondayColumnType.TEXT:
        return String(value);

      case MondayColumnType.DATE:
        return this.formatDateValue(value);

      case MondayColumnType.NUMBER: {
        const num = Number(value);
        return Number.isNaN(num) ? undefined : num;
      }

      case MondayColumnType.STATUS:
        return this.formatStatusValue(value);

      case MondayColumnType.CHECKBOX:
        return { checked: Boolean(value) };

      case MondayColumnType.PEOPLE:
        // Para campos de pessoas, o valor deve ser um array de IDs ou nomes
        if (Array.isArray(value)) {
          return { personsAndTeams: value.map(person => ({ id: String(person), kind: 'person' as const })) };
        } else if (typeof value === 'string') {
          // Se for um nome, retorna como está (Monday tentará resolver)
          return { personsAndTeams: [{ id: value, kind: 'person' }] };
        } else if (value && typeof value === 'object') {
          const v: any = value;
          if (Array.isArray(v.personsAndTeams)) {
            const teams = v.personsAndTeams.map((p: any) => ({ id: String(p.id), kind: 'person' as const }));
            return { personsAndTeams: teams };
          }
        }
        return undefined;

      case MondayColumnType.DROPDOWN:
        return this.formatDropdownValue(value);

      case MondayColumnType.TAGS:
        return this.formatTagsValue(value);

      case MondayColumnType.BOARD_RELATION:
        return this.formatBoardRelationValue(value);

      default:
        return String(value);
    }
  }

  /**
   * Formata valores de data para Monday.com
   */
  protected formatDateValue(value: any): any {
    if (typeof value === 'string') {
      // Converter de DD/MM/YYYY para YYYY-MM-DD se necessário
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const dateMatch = dateRegex.exec(value);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        return { date: `${year}-${month}-${day}` };
      }
      // Se já está no formato YYYY-MM-DD
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDateRegex.test(value)) {
        return { date: value };
      }
    }
    return { date: value };
  }

  /**
   * Formata valores de tags para Monday.com
   */
  protected formatTagsValue(value: any): any {
    if (Array.isArray(value)) {
      return { tag_ids: value };
    }
    return { tag_ids: [value] };
  }

  /**
   * Formata valores de board relation para Monday.com
   */
  protected formatBoardRelationValue(value: any): any {
    if (!value) return undefined;
    
    // Se já é um objeto com item_ids, retorna como está
    if (typeof value === 'object' && Array.isArray(value.item_ids)) {
      return { item_ids: value.item_ids.map((id: any) => Number.parseInt(String(id), 10)) };
    }
    
    // Se é uma string ou número (ID do item), retorna como array
    if (typeof value === 'string' || typeof value === 'number') {
      const itemId = Number.parseInt(String(value), 10);
      if (!Number.isNaN(itemId)) {
        return { item_ids: [itemId] };
      }
    }
    
    // Se é um array, assume que são IDs de item
    if (Array.isArray(value)) {
      const itemIds = value.map(id => Number.parseInt(String(id), 10)).filter(id => !Number.isNaN(id));
      if (itemIds.length > 0) {
        return { item_ids: itemIds };
      }
    }
    
    return undefined;
  }

  /**
   * Monta valor para coluna People a partir de monday_items.team (Times)
   * Busca monday_items por name == lookup_mkrt36cj e converte team (ids) para personsAndTeams com kind: 'team'
   */
  private async buildPeopleFromLookupObjetivo(data: Record<string, any> | undefined): Promise<{ personsAndTeams: { id: string; kind: 'team' }[] } | undefined> {
    try {
      const objetivo = String(data?.["lookup_mkrt36cj"] ?? '').trim();
      if (!objetivo) return undefined;
      const item = await this.mondayItemRepository.findOne({ where: { name: objetivo } });
      const ids = (item?.team ?? []).map(String).filter((s) => s.trim().length > 0);
      if (!ids.length) return undefined;
      return {
        personsAndTeams: ids.map((id) => ({ id, kind: 'team' as const }))
      };
    } catch (e) {
      console.warn('Falha em buildPeopleFromLookupObjetivo:', e);
      return undefined;
    }
  }

  /**
   * Converte o(s) valor(es) em pessoas5__1 (normalmente e-mail) para o formato
   * { personsAndTeams: [{ id: "<subscriber_id>", kind: "person" }, ...] }
   * Usando a tabela subscribers como fonte do id
   */
  protected async resolvePeopleFromSubscribers(value: any): Promise<{ personsAndTeams: { id: string; kind: 'person' }[] } | undefined> {
    const emails: string[] = Array.isArray(value) ? value.map(String) : [String(value)];
    const entries: { id: string; kind: 'person' }[] = [];

    for (const email of emails) {
      const sub = await this.subscriberRepository.findOne({ where: { email } });
      if (sub?.id) {
        entries.push({ id: String(sub.id), kind: 'person' });
      } else {
        console.warn(`Subscriber não encontrado para email: ${email}`);
      }
    }

    if (entries.length > 0) {
      return { personsAndTeams: entries };
    }
    return undefined;
  }

  /**
   * Constrói o valor do campo text_mkr3znn0 conforme regra:
   * {Data do Disparo Texto} - id-<abc123qerty> - lookup_mkrtaebd - lookup_mkrt66aq - lookup_mkrtxa46 -
   * lookup_mkrta7z1 - lookup_mkrt36cj - lookup_mkrtwq7k - lookup_mkrtvsdj - lookup_mkrtcctn - name
   */
  private async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    
    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    
    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || toYYYYMMDD(d["data__1"]);
    
    // Ajuste: usar o ID real do item criado para compor o campo (id-<itemId>)
    const idPart = itemId ? `id-${itemId}` : "";

    // Campos lookup na ordem requerida. Para cada um, buscar em monday_items por name e usar o code
    const lookupFields = [
      "lookup_mkrtaebd",
      "lookup_mkrt66aq",
      "lookup_mkrtxa46",
      "lookup_mkrta7z1",
      "lookup_mkrt36cj",
      "lookup_mkrtwq7k",
      "lookup_mkrtvsdj",
      "lookup_mkrtcctn",
    ] as const;

    // Buscar board_id do board "Produto" uma vez para evitar colisão
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    const produtoBoardId = produtoBoard?.id;

    const codes: string[] = [];
    for (const field of lookupFields) {
      const nameVal = String(d[field] ?? "").trim();
      if (!nameVal) {
        // Manter posição vazia para preservar a estrutura da taxonomia
        codes.push("");
        continue;
      }
      try {
        let code: string | undefined;

        // Lógica especial para produtos (lookup_mkrtvsdj): buscar no board correto e incluir subproduto se existir
        if (field === "lookup_mkrtvsdj") {
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

  /**
   * Cria um item na Monday.com usando GraphQL mutation
   */
  protected async createMondayItem(
    boardId: string,
    groupId: string,
    itemName: string,
    columnValues: Record<string, any>
  ): Promise<string> {
    const columnValuesJson = JSON.stringify(columnValues).replaceAll("\"", '\\"');
    
    const mutation = `
      mutation {
        create_item(
          board_id: ${boardId},
          group_id: "${groupId}",
          item_name: "${itemName.replaceAll("\"", '\\"')}",
          create_labels_if_missing: true,
          column_values: "${columnValuesJson}"
        ) {
          id
          name
          group { id }
        }
      }
    `;

    console.log('Executando mutation:', mutation);

    try {
      const response = await this.mondayService.makeGraphQLRequest(mutation);
      
      if (!response.data?.create_item?.id) {
        throw new Error('Resposta inválida da Monday.com - ID do item não retornado');
      }

      return response.data.create_item.id;

    } catch (error) {
      console.error('Erro na mutation create_item:', error);
      throw error;
    }
  }

  /**
   * Formata valores de STATUS com lógica inteligente:
   * - Se é um número (ID/index), usa { index: number }
   * - Se é texto, usa { label: string }
   */
  protected formatStatusValue(value: any): any {
    const statusValue = String(value).trim();
    
    // Se é um número (ID/index), usar index
    if (/^\d+$/.test(statusValue)) {
      return { index: Number.parseInt(statusValue, 10) };
    }
    
    // Se é texto, usar label (Monday tentará resolver)
    return { label: statusValue };
  }

  /**
   * Formata valores de DROPDOWN seguindo a API Monday.com:
   * - Se todos são números (IDs) → {"ids": [1, 2, 3]}
   * - Se algum é texto → {"labels": ["Alta", "Texto"]}
   */
  protected formatDropdownValue(value: any): any {
    const values = Array.isArray(value) ? value : [value];
    const processedNumbers: number[] = [];
    const processedStrings: string[] = [];
    
    for (const val of values) {
      const strVal = String(val).trim();
      if (!strVal) continue;
      
      // Se é um número (ID), adicionar aos números
      if (/^\d+$/.test(strVal)) {
        processedNumbers.push(Number.parseInt(strVal, 10));
      } else {
        // Se é texto, adicionar às strings (labels)
        processedStrings.push(strVal);
      }
    }
    
    // Se temos strings, usar "labels" (inclui números convertidos para string)
    if (processedStrings.length > 0) {
      const allLabels = [...processedStrings, ...processedNumbers.map(String)];
      return { labels: allLabels };
    }
    
    // Se só temos números, usar "ids"
    if (processedNumbers.length > 0) {
      return { ids: processedNumbers };
    }
    
    return undefined;
  }

  /**
   * Processa upload de arquivo se o campo enviar_arquivo__1 contém um path do sistema
   */
  protected async processFileUpload(itemId: string, _boardId: string, formData: FormSubmissionData): Promise<void> {
    try {
      const fileName = getValueByPath(formData, 'data.enviar_arquivo__1');

      if (!fileName || typeof fileName !== 'string') {
        return;
      }

      // Construir o caminho completo do arquivo na pasta MondayFiles (com sanitização para prevenir Path Traversal)
      const uploadDir = path.join(__dirname, '../../MondayFiles');
      const filePath = buildSafePath(uploadDir, fileName);

      console.log(`Processando upload de arquivo: ${fileName} -> ${filePath} para item ${itemId}`);

      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        return;
      }

      // Upload do arquivo diretamente para a coluna do Monday.com
      const fileId = await this.mondayService.uploadFile(filePath, itemId, 'enviar_arquivo__1');

      console.log(`Arquivo ${fileName} enviado com sucesso. File ID: ${fileId}`);

      // Apagar o arquivo local após upload bem-sucedido
      try {
        fs.unlinkSync(filePath);
        console.log(`Arquivo local removido: ${filePath}`);
      } catch (unlinkError) {
        console.error(`Erro ao remover arquivo local: ${filePath}`, unlinkError);
      }

    } catch (error) {
      console.error('Erro ao processar upload de arquivo:', error);
      // Não propagar o erro para não quebrar o fluxo principal
    }
  }

}
