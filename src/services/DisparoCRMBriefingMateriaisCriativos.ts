import { buildSafePath } from '../utils/pathSecurity';
import { 
  FormSubmissionData, 
  MondayFormMapping, 
  DISPARO_CRM_BRIEFING_FORM_MAPPING
} from '../dto/MondayFormMappingDto';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import type { SubitemData } from '../dto/MondayFormMappingDto';
import fs from 'node:fs';
import path from 'node:path';
import { BaseFormSubmissionService, SecondBoardFieldMapping } from './BaseFormSubmissionService';
import { getValueByPath } from '../utils/objectHelpers';
import { toYYYYMMDD } from '../utils/dateFormatters';

export class DisparoCRMBriefingMateriaisCriativosService extends BaseFormSubmissionService {

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
  }

  /**
   * Retorna o mapeamento de campos CRM para o segundo board
   */
  protected getSecondBoardFieldMapping(): SecondBoardFieldMapping {
    return {
      canal: 'lookup_mkrtcctn',
      cliente: 'lookup_mkrtaebd',
      campanha: 'lookup_mkrt66aq',
      disparo: 'lookup_mkrtxa46',
      mecanica: 'lookup_mkrta7z1',
      solicitante: 'lookup_mkrt36cj',
      objetivo: 'lookup_mkrtwq7k',
      produto: 'lookup_mkrtvsdj',
      segmento: 'lookup_mkrtxgmt',
      useCanalFromSubitem: true
    };
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
        const adjusted = await this.adjustSubitemsCapacity(formData.data.__SUBITEMS__, formData, DisparoCRMBriefingMateriaisCriativosService.TIME_SLOTS_BOARD_ID);
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
                resolvedConnectColumns["pessoas3__1"] = ppl;
              }
            } catch (e) {
              console.warn('Falha ao montar pessoas3__1 (primeiro board):', e);
            }
            // Adicionar o campo composto (text_mkr3znn0) apenas no segundo envio do primeiro board,
            // pois depende do ID do item criado
            try {
              const compositeFirstBoard = await this.buildCompositeTextField(enrichedFormData, mondayItemId);
              if (compositeFirstBoard) {
                resolvedConnectColumns["text_mkr3znn0"] = compositeFirstBoard;
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
        await super.processMarketingBoardSend(enrichedFormData, itemName, mondayItemId, 'CRM', ['arquivos', 'link_to_itens_filhos__1', 'conectar_quadros20__1']);
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

    let idx = 0;
    for (const sub of subitems) {
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
            resolved["pessoas3__1"] = ppl;
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
      idx++;
    }

    return results;
  }

  // Monta payload do segundo board usando método da classe base
  private async buildSecondBoardInitialPayloadFromSubitem(
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    firstBoardItemId: string
  ): Promise<{ item_name: string; column_values: Record<string, any> }> {
    return this.buildSecondBoardPayloadFromSubitem(
      subitem,
      enrichedFormData,
      firstBoardAllColumnValues,
      firstBoardItemId,
      this.secondBoardCorrelationFromSubmission,
      this.secondBoardCorrelationFromFirst,
      ''
    );
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
        const raw = formData.data?.['date_mkr6nj1f'];
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
   * Converte data de YYYY-MM-DD para DD/MM/YYYY se necessário
   */


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
