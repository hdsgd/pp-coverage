import { 
  FormSubmissionData, 
  MondayFormMapping, 
  DISPARO_CRM_BRIEFING_FORM_MAPPING
} from '../dto/MondayFormMappingDto';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
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


  // Novo: fluxo para enviar ao segundo board para cada subitem (usa implementação genérica da base)
  private async processSecondBoardSendsForSubitems(
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    fallbackItemName: string,
    firstBoardItemId: string
  ): Promise<string[]> {
    return this.processSecondBoardForSubitems(
      enrichedFormData,
      firstBoardAllColumnValues,
      fallbackItemName,
      firstBoardItemId,
      DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_ID,
      DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_GROUP_ID,
      DisparoCRMBriefingMateriaisCriativosService.SECOND_BOARD_CONNECT_COLUMNS,
      '',
      'crm'
    );
  }  

  /**
   * Retorna campos excluídos específicos para CRM
   */
  protected getExcludedFields(): string[] {
    return [
      'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas__1', 'pessoas5__1', 
      'lookup_mkrt36cj', 'lookup_mkrt66aq', 'lookup_mkrtaebd', 'lookup_mkrtcctn', 
      'lookup_mkrta7z1', 'lookup_mkrtvsdj', 'lookup_mkrtxa46', 'lookup_mkrtwq7k', 
      'lookup_mkrtxgmt', 'enviar_arquivo__1', 'arquivos'
    ];
  }

  /**
   * Constrói o objeto column_values para a mutation da Monday.com
   */
  protected async buildColumnValues(formData: FormSubmissionData, mapping: MondayFormMapping): Promise<Record<string, any>> {
    const columnValues: Record<string, any> = {};

    // Campos excluídos da submissão para Monday.com
    const excludedFields = this.getExcludedFields();

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



  // Métodos de formatação e criação herdados da classe base (removidos para eliminar duplicação)
}
