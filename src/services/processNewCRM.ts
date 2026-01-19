import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import type { SubitemData } from '../dto/MondayFormMappingDto';
import {
  CAMPAIGN_FORM_MAPPING,
  FormSubmissionData,
  MondayColumnType,
  MondayFormMapping
} from '../dto/MondayFormMappingDto';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import { MondayItem } from '../entities/MondayItem';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { BaseFormSubmissionService } from './BaseFormSubmissionService';
import { ChannelScheduleService } from './ChannelScheduleService';

export class NewCRMService extends BaseFormSubmissionService {
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

  constructor(dataSource?: DataSource) {
    super();
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
    if (dataSource) {
      this.channelScheduleService = new ChannelScheduleService(dataSource);
    }
  }

  /**
   * Validação específica do CRM (não há validações condicionais específicas)
   */
  protected validateSpecificFields(_data: Record<string, any>): void {
    // CRM não tem validações condicionais específicas
  }


  /**
   * Processa uma submissão de formulário e cria um item na Monday.com
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processFormSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = CAMPAIGN_FORM_MAPPING
  ): Promise<string> {
    try {
      console.log('Processando submissão de formulário:', formData.id);

      // 1. Ajustar subitems conforme capacidade por canal/horário e salvar payload localmente
      if (formData.data.__SUBITEMS__ && Array.isArray(formData.data.__SUBITEMS__)) {
        // Passa formData para ter acesso à área solicitante
        const adjusted = await this.adjustSubitemsCapacity(formData.data.__SUBITEMS__, formData);
        formData.data.__SUBITEMS__ = adjusted;
        await this.savePayloadLocally(formData);
        
        // Verificar se os subitems têm IDs (modo duplicação/edição)
        // Nesses casos, pular inserção de agendamentos pois os canais ainda não foram criados
        const hasExistingIds = adjusted.some((sub: any) => sub.id && /^\d+$/.test(String(sub.id)));
        if (!hasExistingIds) {
          // Apenas em modo criação pura: Passa formData completo para ter acesso a area_solicitante e user_id
          await this.insertChannelSchedules(adjusted, formData);
        } else {
          console.log('⏭️ Pulando inserção de agendamentos (modo duplicação/edição - canais serão criados primeiro)');
        }
      } else {
        // Mesmo sem subitems, ainda salva o payload bruto
        await this.savePayloadLocally(formData);
      }

      // 2. Determinar o nome do item
      const itemName = this.extractItemName(formData, mapping);

  // 3. Aplicar mapeamentos adicionais (FORM_TO_MONDAY_MAPPINGS) ao payload antes de montar as colunas
  const augmentedData = mapFormSubmissionToMondayData(formData.data);
  const enrichedFormData: FormSubmissionData = { ...formData, data: augmentedData };

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
      let cachedPeopleFromLookup: { personsAndTeams: { id: string; kind: 'team' }[] } | undefined;
      let peopleFromLookupError: Error | undefined;
      let connectColumnsUpdateError: Error | undefined;

      try {
            const resolvedConnectColumns = await this.resolveConnectBoardColumns(connectColumnsRaw);
            // Adicionar pessoas3__1 (People) com base em lookup_mkrt36cj -> monday_items.team (segunda submissão do primeiro board)
            try {
              cachedPeopleFromLookup = await this.buildPeopleFromLookupObjetivo(enrichedFormData?.data);
              if (cachedPeopleFromLookup) {
                (resolvedConnectColumns as any)["pessoas3__1"] = cachedPeopleFromLookup;
              }
            } catch (e) {
              const errorInstance = e instanceof Error ? e : new Error(String(e));
              peopleFromLookupError = errorInstance;
              console.warn('Falha ao montar pessoas3__1 (primeiro board):', errorInstance);
              console.warn('Falha ao montar pessoas3__1 (segundo board):', errorInstance);
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
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        connectColumnsUpdateError = errorInstance;
        console.error('Falha ao atualizar colunas conectar_quadros no primeiro board:', errorInstance);
        console.error('Falha ao atualizar colunas conectar_quadros no segundo board (subitem):', errorInstance);
      }

      console.log(`Item criado na Monday.com com ID: ${mondayItemId}`);
      
      // Processar upload de arquivo se necessário
      await this.processFileUpload(mondayItemId, mapping.board_id, enrichedFormData);

  // Envio para o segundo board: SOMENTE por subitem (não há outra lógica)
  if (Array.isArray(enrichedFormData?.data?.__SUBITEMS__) && enrichedFormData.data.__SUBITEMS__.length > 0) {
    await this.processSecondBoardSendsForSubitems(
      enrichedFormData,
      allColumnValues,
      itemName,
      mondayItemId,
      cachedPeopleFromLookup,
      peopleFromLookupError,
      connectColumnsUpdateError
    );
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
    firstBoardItemId: string,
    cachedPeopleFromLookup?: { personsAndTeams: { id: string; kind: 'team' }[] },
    peopleFromLookupError?: Error,
    connectColumnsUpdateError?: Error
  ): Promise<string[]> {
    const results: string[] = [];
    let pendingConnectColumnsError = connectColumnsUpdateError;
    const subitems: SubitemData[] = enrichedFormData?.data?.__SUBITEMS__ ?? [];

    for (let idx = 0; idx < subitems.length; idx++) {
      try {
        const sub = subitems[idx];
        const initial = await this.buildSecondBoardInitialPayloadFromSubitem(sub, enrichedFormData, firstBoardAllColumnValues, firstBoardItemId);

        const itemNameSecond = initial.item_name || 'teste excluir';
        const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(initial.column_values);
        const filteredConnect = this.pickSecondBoardConnectColumns(connectColumnsRaw);

      // Pre-data por subitem (primeiro envio)
      try {
        await this.savePreObjectLocally(
          {
            board_id: NewCRMService.SECOND_BOARD_ID,
            item_name: itemNameSecond,
            column_values: baseColumns,
          },
          `${enrichedFormData.id || 'submission'}_second_board_predata_idx_${idx}`
        );
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do segundo board (subitem):', e);
      }

        // Criação do item
        let secondItemId: string;
        try {
          secondItemId = await this.createMondayItem(
            NewCRMService.SECOND_BOARD_ID,
            NewCRMService.SECOND_BOARD_GROUP_ID,
            itemNameSecond || fallbackItemName,
            baseColumns
          );
          console.log(`Segundo board: item criado para subitem ${idx} com ID ${secondItemId} (primeiro envio).`);
        } catch (error) {
          console.warn('Falha ao criar item no segundo board. Subitem será ignorado.', error);
          continue;
        }

      // Atualização das colunas conectar_quadros*
      try {
        const resolved = await this.resolveConnectBoardColumns(filteredConnect);
        // Adicionar pessoas3__1 (People) com base em lookup_mkrt36cj -> monday_items.team (segunda submissão do segundo board)
        if (cachedPeopleFromLookup) {
          (resolved as any)["pessoas3__1"] = cachedPeopleFromLookup;
        } else {
          if (peopleFromLookupError) {
            console.warn('Falha ao montar pessoas3__1 (segundo board):', peopleFromLookupError);
          }
          try {
            const ppl = await this.buildPeopleFromLookupObjetivo(enrichedFormData?.data);
            if (ppl) {
              (resolved as any)["pessoas3__1"] = ppl;
            }
          } catch (e) {
            const errorInstance = e instanceof Error ? e : new Error(String(e));
            console.warn('Falha ao montar pessoas3__1 (segundo board):', errorInstance);
          }
        }
        if (Object.keys(resolved).length > 0) {
          await this.saveObjectLocally(
            {
              board_id: NewCRMService.SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_second_board_connect_columns_idx_${idx}`
          );

          await this.savePreObjectLocally(
            {
              board_id: NewCRMService.SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_second_board_second_send_predata_idx_${idx}`
          );

          if (pendingConnectColumnsError) {
            console.error('Falha ao atualizar colunas conectar_quadros no segundo board (subitem):', pendingConnectColumnsError);
          }

          let secondBoardConnectError: Error | undefined;
          try {
            await this.mondayService.changeMultipleColumnValues(
              NewCRMService.SECOND_BOARD_ID,
              secondItemId,
              resolved
            );
          } catch (e) {
            secondBoardConnectError = e instanceof Error ? e : new Error(String(e));
            console.error('Falha ao atualizar colunas conectar_quadros no segundo board (subitem):', secondBoardConnectError);
          }

          if (!secondBoardConnectError) {
            pendingConnectColumnsError = undefined;
          }
        }
      } catch (e) {
        console.error('Falha ao atualizar colunas conectar_quadros no segundo board (subitem):', e);
      }

        results.push(secondItemId);
        
        // Atualizar o subitem com o novo ID mas preservar o id_original do canal
        subitems[idx] = { ...sub, id: secondItemId, id_original: sub.id_original || sub.id };
      } catch (error) {
        console.warn('Falha ao processar subitem para o segundo board:', error);
      }
    }

    // Após criar todos os itens do segundo board, inserir os agendamentos de canal
    // Isso só é necessário em modo duplicação/edição onde pulamos a inserção inicial
    const hasExistingIds = subitems.some((sub: any) => {
      const originalId = (enrichedFormData?.data?.__SUBITEMS__?.[subitems.indexOf(sub)] as any)?.id;
      return originalId && /^\d+$/.test(String(originalId));
    });
    
    if (hasExistingIds && this.channelScheduleService) {
      console.log('📝 Inserindo agendamentos de canal após criação dos itens (modo duplicação/edição)');
      try {
        await this.insertChannelSchedules(subitems, enrichedFormData);
      } catch (error) {
        console.error('❌ Erro ao inserir agendamentos após criação:', error);
        // Não interrompe o fluxo
      }
    }

    return results;
  }

  // Novo: monta payload do segundo board a partir do subitem (sem conectar_quadros*)
  /**
   * Gera string composta para o segundo board, incluindo n_meros__1 e texto6__1 ao final
   */
  public async buildCompositeTextFieldSecondBoard(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    
    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    
    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || this.toYYYYMMDD(d["data__1"]);
    
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
    // Não remover campos vazios para manter as posições fixas na taxonomia
    const parts = [
      yyyymmdd,
      idPart,
      ...codes
    ];
    return parts.join("-");
  }
  public async buildSecondBoardInitialPayloadFromSubitem(
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    firstBoardItemId: string
  ): Promise<{ item_name: string; column_values: Record<string, any> }> {
    console.log('🔍 [buildSecondBoardInitialPayloadFromSubitem] Subitem recebido:', JSON.stringify(subitem, null, 2));
    
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
    
    // NOTA: texto__1 é a DESCRIÇÃO do touchpoint, não o código do produto!
    // Não sobrescrever texto__1 aqui, ele já vem correto do subitem
    // A taxonomia será construída com o nome do canal apenas
    const productName = String(subitem.conectar_quadros87__1);
    
    // Buscar código do subproduto associado ao canal (produto)
    const subproductCode = await this.mondayService.getSubproductCodeByProduct(productName);
    
    // Construir taxonomia inicial (será sobrescrita pelo canal depois)
    if (subproductCode) {
      cv['texto6__1'] = `${productName}_${subproductCode}`;
      console.log(`Taxonomia criada com subproduto: ${productName}_${subproductCode} (produto: ${productName})`);
    } else {
      cv['texto6__1'] = productName;
      console.log(`Subproduto não encontrado para produto "${productName}", usando apenas nome do canal: ${productName}`);
    }

    // Para cada par (nome acima => código atual), buscar em monday_items por name e atribuir code
    // Canal - PRIORIZA o canal do subitem (conectar_quadros87__1) ao invés do campo do formulário principal
    const canalDoSubitem = String(subitem.conectar_quadros87__1 ?? '').trim();
    const canalDoFormulario = String(enrichedFormData.data['lookup_mkrtcctn'] ?? '').trim();
    cv['text_mkrrqsk6'] = canalDoSubitem || canalDoFormulario;

    // Buscar o código do canal para construir a taxonomia
    let codigoCanal = 'email'; // fallback padrão em minúsculo
    if (cv['text_mkrrqsk6']) {
      const canalNome = String(cv['text_mkrrqsk6']).trim();
      const codigoBuscado = await this.getCodeByItemName(canalNome);
      console.log(`🔍 Buscando código para canal "${canalNome}": ${codigoBuscado || 'NÃO ENCONTRADO'}`);
      codigoCanal = codigoBuscado || canalNome.toLowerCase(); // usa minúsculo como fallback
      cv['text_mkrr8dta'] = codigoCanal;
    } else {
      cv['text_mkrr8dta'] = codigoCanal;
    }

    // texto6__1 (taxonomia) recebe o CÓDIGO do canal (não o nome)
    cv['texto6__1'] = codigoCanal;
    console.log(`✅ Taxonomia (texto6__1) definida como: "${cv['texto6__1']}"`);

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

    // Se o valor é um ID numérico, resolver para nome
    if (solicitanteValue && /^\d+$/.test(solicitanteValue)) {
      try {
        const item = await this.mondayItemRepository.findOne({ where: { item_id: solicitanteValue } });
        if (item) {
          solicitanteValue = item.name || solicitanteValue;
          // Já aproveita e pega o code também
          cv['text_mkrrmmvv'] = item.code || 'NaN';
        } else {
          cv['text_mkrrmmvv'] = 'NaN';
        }
      } catch (error) {
        console.warn(`Erro ao resolver área solicitante ${solicitanteValue}:`, error);
        cv['text_mkrrmmvv'] = 'NaN';
      }
    } else if (solicitanteValue) {
      // Se já é um nome, buscar o código normalmente
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
    // IMPORTANTE: texto__1 é a DESCRIÇÃO do touchpoint e vem do subitem
    // Não sobrescrever aqui! Apenas garantir que tenha um valor mínimo se vier vazio
    // O valor já foi preenchido pelas correlações anteriores (linha ~410)
    if (!cv['texto__1'] || String(cv['texto__1']).trim() === '') {
      cv['texto__1'] = (subitem as any)['texto__1'] || 'Touchpoint sem descrição';
    }
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
  console.log('🔍 Composite field:', composite || 'VAZIO');
  console.log('🔍 n_meros__1:', cv["n_meros__1"]);
  console.log('🔍 texto6__1 (taxonomia):', cv["texto6__1"]);
  
    if (composite) {
      cv['text_mkr5kh2r'] = composite+'-'+String(cv["n_meros__1"])+'-'+String(cv["texto6__1"]); 
      cv['text_mkr3jr1s'] = composite+'-'+String(cv["n_meros__1"])+'-'+String(cv["texto6__1"]);
      console.log('✅ text_mkr5kh2r criado:', cv['text_mkr5kh2r']);
    } else {
      console.log('⚠️ Composite vazio - text_mkr5kh2r NÃO será criado!');
    }

  const texto6 = cv['texto6__1'] ? String(cv['texto6__1']) : '';
  
  // Usar texto__1 que já vem mapeado do frontend como nome do item
  // O frontend mapeia descricao → texto__1 antes de enviar
  const descricao = cv['texto__1'] ? String(cv['texto__1']).trim() : '';
  const item_name = descricao || `teste excluir${texto6 ? ' - ' + texto6 : ''}`;
  
  console.log('🔍 [buildSecondBoardInitialPayloadFromSubitem] Criando touchpoint:');
  console.log('  - subitem.texto__1:', (subitem as any).texto__1);
  console.log('  - cv[texto__1] (após correlações):', cv['texto__1']);
  console.log('  - descricao (para item_name):', descricao);
  console.log('  - item_name final:', item_name);
  console.log('  - texto6 (taxonomia):', texto6);
  
  return { item_name, column_values: cv };
  }

  // Novo: limita as colunas conectar_quadros ao conjunto exigido para o segundo board
  public pickSecondBoardConnectColumns(connectColumnsRaw: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const k of NewCRMService.SECOND_BOARD_CONNECT_COLUMNS) {
      if (connectColumnsRaw[k] !== undefined) filtered[k] = connectColumnsRaw[k];
    }
    return filtered;
  }  

  /**
   * Separa colunas que iniciam com "conectar_quadros" das demais
   */
  protected splitConnectBoardColumns(all: Record<string, any>): { baseColumns: Record<string, any>; connectColumnsRaw: Record<string, any> } {
    const baseColumns: Record<string, any> = {};
    const connectColumnsRaw: Record<string, any> = {};
    for (const [key, val] of Object.entries(all)) {
      // Tratar tanto campos conectar_quadros* quanto link_to_itens_filhos__1 como board relations
      if (key.startsWith('conectar_quadros') || key === 'link_to_itens_filhos__1') {
        connectColumnsRaw[key] = val;
      } else {
        baseColumns[key] = val;
      }
    }
    return { baseColumns, connectColumnsRaw };
  }

  /**
   * Resolve valores das colunas conectar_quadros* convertendo nomes para item_ids via tabela monday_items
   */
  protected async resolveConnectBoardColumns(connectColumnsRaw: Record<string, any>): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const [key, rawVal] of Object.entries(connectColumnsRaw)) {
      // Caso já venha como { item_ids: [...] }, respeitar e seguir
      if (rawVal && typeof rawVal === 'object' && Array.isArray((rawVal as any).item_ids)) {
        const ids = (rawVal as any).item_ids.map((v: any) => String(v)).filter((s: string) => s.trim().length > 0);
        if (ids.length > 0) {
          out[key] = { item_ids: ids };
          continue;
        }
      }

      const values: string[] = this.normalizeToStringArray(rawVal);
      const itemIds: string[] = [];
      for (const val of values) {
        const trimmed = String(val).trim();
        if (!trimmed) continue;
        // Se já é um número (id do item), usar diretamente
        if (/^\d+$/.test(trimmed)) {
          itemIds.push(trimmed);
          continue;
        }
        // Caso contrário, tentar resolver por name/code/team
        const found = await this.findMondayItemBySearchTerm(trimmed);
        if (found?.item_id) {
          itemIds.push(String(found.item_id));
        } else {
          console.warn(`MondayItem não encontrado para termo='${trimmed}' ao resolver ${key}`);
        }
      }
      if (itemIds.length > 0) {
        out[key] = { item_ids: itemIds };
      }
    }
    return out;
  }

  /**
   * Busca um MondayItem por diferentes colunas: name, texto__1 ou ocorrência em multiple_person_mkqj7n5b
   */
  protected async findMondayItemBySearchTerm(term: string): Promise<MondayItem | null> {
    try {
      const qb = this.mondayItemRepository.createQueryBuilder('mi')
        .where('mi.name = :term', { term })
        .orWhere('mi.code = :term', { term })
        .orWhere(':term = ANY(mi.team)', { term })
        .limit(1);
      const item = await qb.getOne();
      return item ?? null;
    } catch (e) {
      console.warn('Falha em findMondayItemBySearchTerm:', e);
      return null;
    }
  }

  /** Busca o "code" do monday_items a partir do valor do campo name, com filtro por board_id para evitar colisão */
  public async getCodeByItemName(name: string, boardId?: string): Promise<string | undefined> {
    const s = String(name || '').trim();
    if (!s) return undefined;
    try {
      const whereCondition: any = { name: s };
      if (boardId) {
        whereCondition.board_id = boardId;
      }
      const item = await this.mondayItemRepository.findOne({ where: whereCondition });
      return item?.code ?? undefined;
    } catch (e) {
      console.warn('Falha ao obter code por name em monday_items:', e);
      return undefined;
    }
  }

  /** Normaliza valores em array de strings */
  protected normalizeToStringArray(v: any): string[] {
    if (v === null || v === undefined) return [];
    if (Array.isArray(v)) return v.map((x) => String(x));
    if (typeof v === 'string') return [v];
    if (typeof v === 'object') {
      const obj: any = v;
      // Caso tenha alguma estrutura inesperada, tentar extrair rótulos conhecidos
      if (Array.isArray(obj.labels)) return obj.labels.map((x: any) => String(x));
      if (Array.isArray(obj.ids)) return obj.ids.map((x: any) => String(x));
    }
    return [String(v)];
  }

  /**
   * Ajusta os objetos de __SUBITEMS__ respeitando a capacidade disponível por canal/data/hora.
   * - Para cada subitem, calcula available_time = max_value (monday_items) - soma(qtd) (channel_schedules)
   * - Se n_meros_mkkchcmk <= available_time, mantém
   * - Se > available_time, divide: mantém o atual com available_time e cria novos para próximos horários com o restante
   * - Considera área solicitante para permitir reuso de reservas da mesma área
   */
  public async adjustSubitemsCapacity(subitems: SubitemData[], formData?: FormSubmissionData): Promise<SubitemData[]> {
    // Extrair área solicitante do formData
    // Pode vir como 'conectar_quadros__1' (antes da transformação) ou 'lookup_mkrt36cj' (depois da transformação)
    const areaSolicitante = formData?.data?.conectar_quadros__1
      || formData?.data?.lookup_mkrt36cj
      || formData?.data?.area_solicitante 
      || formData?.data?.gam_requesting_area 
      || formData?.data?.briefing_requesting_area;

    // Carrega slots de horários ativos, ordenados por nome ASC
    const rawTimeSlots = await this.mondayItemRepository.find({
      where: { board_id: NewCRMService.TIME_SLOTS_BOARD_ID, status: 'Ativo' },
      order: { name: 'ASC' }
    });

    const activeTimeSlots = Array.isArray(rawTimeSlots) ? rawTimeSlots : [];

    console.log(`\n⏰ HORÁRIOS DISPONÍVEIS NO SISTEMA (${activeTimeSlots.length} slots):`);
    activeTimeSlots.forEach((slot, idx) => {
      console.log(`   ${idx + 1}. ${slot.name}`);
    });
    console.log(``);

    // Copiamos a lista pois vamos inserir itens dinamicamente
    // IMPORTANTE: Preservar o ID original do canal para uso posterior nos agendamentos
    const items: SubitemData[] = subitems.map(s => {
      const id_original = s.id || (s as any).id_original;
      console.log(`📋 Preservando ID original do canal: ${id_original} (${(s as any).conectar_quadros87__1 || 'canal'})`);
      return { ...s, id_original };
    });

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

        console.log(`⏰ Horário ${horaAtual} (${dataStr}):`);
        console.log(`   📊 Limite máximo: ${effectiveMaxValue.toLocaleString('pt-BR')}`);
        console.log(`   📦 Já ocupado no banco: ${dbReserved.toLocaleString('pt-BR')}`);
        console.log(`   🔄 Reservado nesta operação: ${stagedReserved.toLocaleString('pt-BR')}`);
        console.log(`   ✅ Disponível: ${availableAtCurrent.toLocaleString('pt-BR')}`);
        console.log(`   📝 Demanda atual: ${demanda.toLocaleString('pt-BR')}`);

        if (demanda <= availableAtCurrent) {
          // aloca tudo neste slot (somente em memória para cálculo da mesma passada)
          staged[key(idCanal, dataDate, horaAtual)] = (staged[key(idCanal, dataDate, horaAtual)] ?? 0) + demanda;
          console.log(`   ✔️ Demanda alocada totalmente neste horário`);
          continue;
        }

        // Se capacidade disponível for zero ou negativa, não manter item com 0
        if (availableAtCurrent <= 0) {
          console.log(`   ⛔ Horário ${horaAtual} totalmente ocupado (0 disponível)`);
          // Tentar mover toda a demanda para o próximo horário
          const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
          const nextIndex = idx >= 0 ? idx + 1 : 0;
          if (nextIndex >= activeTimeSlots.length) {
            console.warn(`❌ Sem próximo horário disponível após "${horaAtual}" para canal ${idCanal}. Restante: ${demanda.toLocaleString('pt-BR')}`);
            // Remove item com 0 (não cria objeto com 0)
            items.splice(i, 1);
            changed = true;
            break;
          }
          const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
          console.log(`   ⏩ Movendo toda a demanda (${demanda.toLocaleString('pt-BR')}) para ${nextHora}`);
          // Substitui o item atual por um novo no próximo horário com toda a demanda
          const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: demanda };
          items.splice(i, 1, novoSubitem);
          changed = true;
          break;
        }

        // Ajusta o item atual para a capacidade disponível (> 0)
        item.n_meros_mkkchcmk = availableAtCurrent;
        staged[key(idCanal, dataDate, horaAtual)] = (staged[key(idCanal, dataDate, horaAtual)] ?? 0) + availableAtCurrent;
        console.log(`   ⚠️ Capacidade insuficiente! Alocando ${availableAtCurrent.toLocaleString('pt-BR')} neste horário`);

        // Resto deve ir para o próximo horário
        const restante = Math.max(0, demanda - availableAtCurrent);
        console.log(`   🔄 Restante ${restante.toLocaleString('pt-BR')} será distribuído para próximo horário`);

        // Encontra próximo horário na lista de slots
        const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
        const nextIndex = idx >= 0 ? idx + 1 : 0;
        if (nextIndex >= activeTimeSlots.length) {
          console.warn(`❌ Sem próximo horário disponível após "${horaAtual}" para canal ${idCanal}. Restante: ${restante.toLocaleString('pt-BR')}`);
          // não conseguimos inserir novo objeto; seguimos com o ajustado e sem criar objetos 0
          continue;
        }

        const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
        console.log(`   ➡️ Próximo horário: ${nextHora}`);
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
  public async sumReservedQty(idCanal: string, dataDate: Date, hora: string, areaSolicitante?: string): Promise<number> {
    const schedules = await this.channelScheduleRepository.find({
      where: {
        id_canal: idCanal,
        data: this.truncateDate(dataDate),
        hora: hora
      }
    });

    let totalJaUsado = 0;
    let totalAgendamentos = 0;
    let totalReservasOutrasAreas = 0;
    let totalReservasMesmaArea = 0;

    console.log(`   📋 Agendamentos existentes para horário ${hora}:`);
    
    if (schedules.length === 0) {
      console.log(`      (nenhum agendamento encontrado)`);
    }

    schedules.forEach(schedule => {
      const qtd = Number.parseFloat(schedule.qtd.toString());
      const tipo = schedule.tipo || 'agendamento';
      const area = schedule.area_solicitante || 'Não especificada';

      if (tipo === 'agendamento') {
        // Agendamentos SEMPRE contam
        totalJaUsado += qtd;
        totalAgendamentos += qtd;
        console.log(`      🔹 Agendamento: ${qtd.toLocaleString('pt-BR')} - Área: ${area}`);
      } else if (tipo === 'reserva') {
        // Reservas: só contam se forem de OUTRA área (ou se área não foi informada)
        if (!areaSolicitante || schedule.area_solicitante !== areaSolicitante) {
          totalJaUsado += qtd;
          totalReservasOutrasAreas += qtd;
          console.log(`      🔸 Reserva (outra área): ${qtd.toLocaleString('pt-BR')} - Área: ${area}`);
        } else {
          totalReservasMesmaArea += qtd;
          console.log(`      ♻️ Reserva (mesma área, reutilizável): ${qtd.toLocaleString('pt-BR')} - Área: ${area}`);
        }
      }
    });

    if (schedules.length > 0) {
      console.log(`   📊 Resumo:`);
      console.log(`      Total de agendamentos: ${totalAgendamentos.toLocaleString('pt-BR')}`);
      console.log(`      Reservas de outras áreas: ${totalReservasOutrasAreas.toLocaleString('pt-BR')}`);
      console.log(`      Reservas reutilizáveis (mesma área): ${totalReservasMesmaArea.toLocaleString('pt-BR')}`);
      console.log(`      Total ocupado (conta no limite): ${totalJaUsado.toLocaleString('pt-BR')}`);
    }

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
  'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas__1', 'pessoas5__1', 'lookup_mkrt36cj', 'lookup_mkrt66aq', 'lookup_mkrtaebd', 'lookup_mkrtcctn', 'lookup_mkrta7z1', 'lookup_mkrtvsdj', 'lookup_mkrtxa46', 'lookup_mkrtwq7k', 'lookup_mkrtxgmt', 'enviar_arquivo__1'
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

        let value = this.getValueByPath(formData, columnMapping.form_field_path);

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
          columnValues['date_mkrj355f'] = this.formatDateValue(dateStr).date;
        }
        // Popular text_mkr3n64h (YYYYMMDD) somente se ainda não existir
        if (columnValues['text_mkr3n64h'] === undefined) {
          const yyyymmdd = this.toYYYYMMDD(dateStr);
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
   * Determina o tipo de coluna baseado no nome do campo (sobrescreve o método da base para incluir lógica específica do CRM)
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
  public async insertChannelSchedules(subitems: any[], formData: FormSubmissionData): Promise<void> {
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
    
    // Extrair user_id se disponível (pode vir do contexto de autenticação)
    // Por enquanto, vamos deixar como opcional
    const userId = formData.data?.user_id || undefined;

    if (!areaSolicitante) {
      console.warn('⚠️ Área solicitante não encontrada no formulário. Agendamentos serão criados sem área.');
    }

    console.log(`📝 Criando agendamentos para área solicitante: ${areaSolicitante || 'Não especificada'}`);

    for (const subitem of subitems) {
      try {
        // IMPORTANTE: usar o ID original do canal (preservado em id_original)
        // NÃO o ID do item criado no segundo board
        const idCanalOriginal = subitem.id_original || subitem.id;
        
        const scheduleData = {
          id_canal: idCanalOriginal || '',
          data: subitem.data__1 || '', 
          hora: subitem.conectar_quadros_mkkcnyr3 || '00:00',
          qtd: subitem.n_meros_mkkchcmk || 0
        };

        console.log(`🔍 DEBUG - Subitem:`, {
          id_atual: subitem.id,
          id_original: subitem.id_original,
          id_usando: idCanalOriginal,
          canal: subitem.conectar_quadros87__1,
          hora: scheduleData.hora,
          qtd: scheduleData.qtd
        });

        // Verificar se o canal existe na tabela monday_items
        const canalExiste = await this.mondayItemRepository.findOne({
          where: { item_id: idCanalOriginal }
        });
        
        if (!canalExiste) {
          console.warn(`⚠️ AVISO: Canal ${idCanalOriginal} não encontrado na tabela monday_items. Pode ser necessário sincronizar os dados.`);
        } else {
          console.log(`✅ Canal ${idCanalOriginal} encontrado: ${canalExiste.name} (Status: ${canalExiste.status}, Max: ${canalExiste.max_value})`);
        }

        if (scheduleData.id_canal && scheduleData.data && scheduleData.qtd > 0) {
          // Converter data de YYYY-MM-DD para DD/MM/YYYY se necessário
          const convertedData = this.convertDateFormat(scheduleData.data);
          
          console.log(`📅 Criando agendamento - Canal ID: ${scheduleData.id_canal}, Data: ${convertedData}, Hora: ${scheduleData.hora}, Qtd: ${scheduleData.qtd}`);
          
          await this.channelScheduleService.create({
            id_canal: scheduleData.id_canal,
            data: convertedData,
            hora: scheduleData.hora,
            qtd: scheduleData.qtd,
            area_solicitante: areaSolicitante,
            user_id: userId,
            tipo: 'agendamento' // Formulário sempre cria agendamento
          } as any);

          console.log(`✅ Agendamento criado com sucesso - Canal: ${scheduleData.id_canal}, Área: ${areaSolicitante}, Qtd: ${scheduleData.qtd}`);
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
  private convertDateFormat(dateString: string): string {
    // Se já está no formato DD/MM/YYYY, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Se está no formato YYYY-MM-DD, converte
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    return dateString;
  }

  /**
   * Formata valor baseado no tipo de coluna da Monday.com (sobrescreve o método da base para incluir lógica específica do CRM)
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

      default:
        return String(value);
    }
  }

  /**
   * Formata valores de data para Monday.com (sobrescreve o método da base para incluir lógica específica do CRM)
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
   * Formata valores de tags para Monday.com (sobrescreve o método da base para incluir lógica específica do CRM)
   */
  protected formatTagsValue(value: any): any {
    if (Array.isArray(value)) {
      return { tag_ids: value };
    }
    return { tag_ids: [value] };
  }

  /**
   * Monta valor para coluna People a partir de monday_items.team (Times)
   * Busca monday_items por name == lookup_mkrt36cj e converte team (ids) para personsAndTeams com kind: 'team'
   */
  public async buildPeopleFromLookupObjetivo(data: Record<string, any> | undefined): Promise<{ personsAndTeams: { id: string; kind: 'team' }[] } | undefined> {
    try {
      const objetivo = String(data?.["lookup_mkrt36cj"] ?? '').trim();
      if (!objetivo) return undefined;
      const item = await this.mondayItemRepository.findOne({ where: { name: objetivo } });
      const rawTeam = item?.team as unknown;
      let teamArray: unknown[] = [];
      if (Array.isArray(rawTeam)) {
        teamArray = rawTeam;
      } else if (typeof rawTeam === 'string' && rawTeam.trim().length > 0) {
        teamArray = [rawTeam];
      }

      const ids = teamArray
        .map((id) => {
          if (typeof id === 'string') {
            return id.trim();
          }

          if (typeof id === 'number' || typeof id === 'boolean') {
            return String(id).trim();
          }

          return '';
        })
        .filter((s) => s.length > 0);
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
   * Inclui lógica IF para subprodutos: se existir subproduto, usa {Código Produto}_{Código Subproduto}
   */
  public async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    
    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    
    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || this.toYYYYMMDD(d["data__1"]);
    
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
   * Converte uma data em string para formato YYYYMMDD.
   * Aceita entradas: YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD. Retorna vazio se não conseguir parsear.
   */
  public toYYYYMMDD(input: any): string {
    if (!input) return "";
    const s = String(input).trim();
    // YYYYMMDD
    if (/^\d{8}$/.test(s)) return s;
    // YYYY-MM-DD
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
    // DD/MM/YYYY
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (br) return `${br[3]}${br[2]}${br[1]}`;
    // Tentar Date.parse
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}${mm}${dd}`;
    }
    return "";
  }

  /**
   * Cria um item na Monday.com usando GraphQL mutation (sobrescreve o método da base para incluir lógica específica do CRM)
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

}