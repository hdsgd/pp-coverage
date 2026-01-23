import {
  FormSubmissionData,
  BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING,
  MondayColumnType,
  MondayFormMapping
} from '../dto/MondayFormMappingDto';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { BaseFormSubmissionService, SecondBoardFieldMapping } from './BaseFormSubmissionService';
import { getValueByPath } from '../utils/objectHelpers';
import { toYYYYMMDD } from '../utils/dateFormatters';

export class BriefingMateriaisCriativosGamService extends BaseFormSubmissionService {
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

  constructor() {
    super();
  }

  /**
   * Retorna o mapeamento de campos GAM para o segundo board
   */
  protected getSecondBoardFieldMapping(): SecondBoardFieldMapping {
    return {
      canal: 'text_mkvhgbp8',
      cliente: 'text_mkvhz8g3',
      campanha: 'text_mkvhedf5',
      disparo: 'text_mkvhqgvn',
      mecanica: 'text_mkvhv5ma',
      solicitante: 'text_mkvhvcw4',
      objetivo: 'text_mkvh2z7j',
      produto: 'text_mkvhwyzr',
      segmento: 'text_mkvhammc',
      useCanalFromSubitem: false
    };
  }

  /**
   * Processa uma submissão de formulário e cria um item na Monday.com
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processBriefingGamSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING
  ): Promise<string> {
    try {
      console.log('Processando submissão de formulário GAM:', formData.id);

      // 1. Ajustar subitems conforme capacidade por canal/horário e salvar payload localmente
      if (formData.data.__SUBITEMS__ && Array.isArray(formData.data.__SUBITEMS__)) {
        const adjusted = await this.adjustSubitemsCapacity(formData.data.__SUBITEMS__, formData, BriefingMateriaisCriativosGamService.TIME_SLOTS_BOARD_ID);
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

      // Processar upload de arquivo se necessário
      await this.processFileUpload(mondayItemId, mapping.board_id, enrichedFormData);

      // Envio para o segundo board: SOMENTE por subitem (não há outra lógica)
      if (Array.isArray(enrichedFormData?.data?.__SUBITEMS__) && enrichedFormData.data.__SUBITEMS__.length > 0) {
        await this.processSecondBoardSendsForSubitems(enrichedFormData, allColumnValues, itemName, mondayItemId);
      }

      // Enviar para o board de marketing (seguindo padrão do CRM)
      try {
        await super.processMarketingBoardSend(enrichedFormData, itemName, mondayItemId, 'GAM');
      } catch (error) {
        console.error('Erro ao processar envio para board de marketing:', error);
        // Não falhar o processo principal se o envio para marketing falhar
      }

      return mondayItemId;

    } catch (error) {
      console.error('Erro ao processar submissão do formulário GAM:', error);
      throw new Error(`Falha ao criar item na Monday.com para GAM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      BriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
      BriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_GROUP_ID,
      BriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_CONNECT_COLUMNS,
      ' GAM',
      'gam'
    );
  }  




  /**
   * Retorna campos excluídos específicos para GAM
   */
  protected getExcludedFields(): string[] {
    return [
      'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas5__1',
      // Excluir campos GAM originais que serão mapeados via column_mappings
      'gam_start_date', 'gam_end_date', 'gam_client_type', 'gam_campaign_type',
      'gam_mechanism', 'gam_requesting_area', 'gam_target_segment', 'gam_product_service',
      'gam_objective', 'gam_format_type', 'gam_campaign_type_specific', 'gam_banner_links',
      'gam_audience_format', 'gam_channels', 'gam_observations', 'gam_other_campaign_type',
      'gam_dispatch_type', 'enviar_arquivo__1', 'arquivos'
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
    if (fieldName.includes('data__') || fieldName.startsWith('date_')) {
      return MondayColumnType.DATE;
    }

    // Campos numéricos
    if (fieldName.includes('n_mero') || fieldName.includes('n_meros')) {
      return MondayColumnType.NUMBER;
    }

    // Campos de pessoas
    if (fieldName.includes('pessoas')) {
      return MondayColumnType.PEOPLE;
    }

    // Campos de lista suspensa (dropdown)
    if (fieldName.includes('lista_suspensa')) {
      return MondayColumnType.DROPDOWN;
    }

    // Campo text_mkvgjh0w (tipo hour, tratado como texto)
    if (fieldName === 'text_mkvgjh0w') {
      return MondayColumnType.TEXT;
    }

    // Campos de conexão entre quadros (pode ser tratado como texto)
    if (fieldName.includes('conectar_quadros')) {
      return MondayColumnType.TEXT;
    }

    // Campos de lookup (texto)
    if (fieldName.includes('lookup_')) {
      return MondayColumnType.TEXT;
    }

    // Campos de texto por padrão
    return MondayColumnType.TEXT;
  }

  /**
   * Converte data de YYYY-MM-DD para DD/MM/YYYY se necessário
   */


  // Métodos de formatação herdados da classe base (removidos para eliminar duplicação)

}
