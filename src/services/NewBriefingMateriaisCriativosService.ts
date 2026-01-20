import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { 
  BRIEFING_MATERIAIS_CRIATIVOS_FORM_MAPPING, 
  MARKETING_BOARD_FORM_MAPPING,
  FormSubmissionData, 
  MondayFormMapping 
} from '../dto/MondayFormMappingDto';
import { MondayItem } from '../entities/MondayItem';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { BaseFormSubmissionService } from './BaseFormSubmissionService';
import { getValueByPath } from '../utils/objectHelpers';

export class NewBriefingMateriaisCriativosService extends BaseFormSubmissionService {
  protected readonly mondayItemRepository: Repository<MondayItem>;

  constructor() {
    super();
    this.mondayItemRepository = AppDataSource.getRepository(MondayItem);
  }

  /**
   * Processa uma submissão de formulário de briefing de materiais criativos
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processBriefingMateriaisCriativosSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = BRIEFING_MATERIAIS_CRIATIVOS_FORM_MAPPING
  ): Promise<string> {
    try {
      console.log('Processando submissão de briefing de materiais criativos:', formData.id);

      // Salvar payload localmente
      await this.savePayloadLocally(formData);

      // Determinar o nome do item
      const itemName = this.extractItemName(formData, mapping);

      // Aplicar mapeamentos adicionais (FORM_TO_MONDAY_MAPPINGS) ao payload antes de montar as colunas
      const augmentedData = mapFormSubmissionToMondayData(formData.data);
      const enrichedFormData: FormSubmissionData = { ...formData, data: augmentedData };

      // Validar campos condicionais APÓS os mapeamentos
      this.validateSpecificFields(enrichedFormData.data);

      // Construir os valores das colunas com dados enriquecidos
      const allColumnValues = await this.buildColumnValues(enrichedFormData, mapping);

      // Sincronizar campos calculados de volta para enrichedFormData.data para uso posterior
      if (allColumnValues['text_mkr3n64h']) {
        enrichedFormData.data['text_mkr3n64h'] = allColumnValues['text_mkr3n64h'];
      }

      // Separar valores de colunas: base (sem "conectar_quadros*") e conectores (apenas "conectar_quadros*")
      const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(allColumnValues);

      // Salvar o JSON de pré-submissão
      try {
        const firstPreData = {
          board_id: mapping.board_id,
          group_id: mapping.group_id,
          item_name: itemName,
          column_values: baseColumns,
        };
        await this.savePreObjectLocally(firstPreData, `${formData.id || 'submission'}_briefing_first_board_predata`);
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do primeiro board briefing:', e);
      }

      // Criar o item na Monday.com APENAS com colunas base (sem conectar_quadros)
      const mondayItemId = await this.createMondayItem(
        mapping.board_id,
        mapping.group_id,
        itemName,
        baseColumns
      );

      // Após criar, resolver e enviar os valores das colunas "conectar_quadros*" usando change_multiple_column_values
      try {
        const resolvedConnectColumns = await this.resolveConnectBoardColumns(connectColumnsRaw);
        
        // Adicionar o campo composto (text_mkr3znn0) apenas no segundo envio do primeiro board
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
            `${formData.id || 'submission'}_briefing_first_board_connect_columns`
          );

          // Também salvar como PRE-DATA do segundo envio do primeiro board
          await this.savePreObjectLocally(
            {
              board_id: mapping.board_id,
              item_id: mondayItemId,
              column_values: resolvedConnectColumns,
            },
            `${formData.id || 'submission'}_briefing_first_board_second_send_predata`
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
      
      // Enviar para o board de marketing (seguindo padrão do CRM)
      try {
        await this.processMarketingBoardSend(enrichedFormData, itemName, mondayItemId);
      } catch (error) {
        console.error('Erro ao processar envio para board de marketing:', error);
        // Não falhar o processo principal se o envio para marketing falhar
      }
      
      return mondayItemId;

    } catch (error) {
      console.error('Erro ao processar submissão do briefing de materiais criativos:', error);
      throw new Error(`Falha ao criar item na Monday.com para Briefing: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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
    
    // Corrigir campo pessoas7 para usar o valor já resolvido do board principal
    // O mapeamento aponta para pessoas5__1 (email), mas precisamos do valor resolvido
    if (enrichedFormData.data?.["pessoas5__1"] !== undefined) {
      const resolved = await this.resolvePeopleFromSubscribers(enrichedFormData.data["pessoas5__1"]);
      if (resolved) {
        marketingColumnValues["pessoas7"] = resolved;
      }
    }
    
    // Separar colunas base e conectores (seguindo padrão do CRM)
    const { baseColumns: marketingBaseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(marketingColumnValues);
    
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
   * Constrói o objeto column_values para a mutation da Monday.com
   */
  protected async buildColumnValues(formData: FormSubmissionData, mapping: MondayFormMapping): Promise<Record<string, any>> {
    const columnValues: Record<string, any> = {};

    // Campos excluídos da submissão para Monday.com
    const excludedFields = [
      'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas__1', 'pessoas5__1', 'enviar_arquivo__1', 'arquivos'
    ];

    // Primeiro adicionar todas as chaves do data (exceto campos excluídos)
    for (const [key, value] of Object.entries(formData.data)) {
      if (!excludedFields.includes(key) && value !== undefined && value !== null) {
        const formattedValue = this.formatValueForMondayColumn(value, this.getColumnType(key));
        if (formattedValue !== undefined) {
          columnValues[key] = formattedValue;
        }
      }
    }

    // Depois processar mapeamentos específicos se existirem (somente se não estão nos excludedFields)
    for (const columnMapping of mapping.column_mappings) {
      try {
        if (excludedFields.includes(columnMapping.monday_column_id)) {
          continue; // Pular campos excluídos
        }

        let value = getValueByPath(formData, columnMapping.form_field_path);

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

    // Requisito: popular corretamente o campo 'pessoas__1' (People) a partir de 'pessoas5__1'
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

    return columnValues;
  }

  /**
   * Constrói o valor do campo text_mkr3znn0 conforme regra:
   * {Data do Disparo Texto} - id-<itemId> - lookup_mkrtaebd - lookup_mkrt66aq - lookup_mkrtxa46 -
   * lookup_mkrta7z1 - lookup_mkrt36cj - lookup_mkrtwq7k - lookup_mkrtvsdj - lookup_mkrtcctn - name
   */
  private async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
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

  /** Busca o "code" do monday_items a partir do valor do campo name, com filtro por board_id para evitar colisão */
  protected async getCodeByItemName(name: string, boardId?: string): Promise<string | undefined> {
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

  /**
   * Converte uma data em string para formato YYYYMMDD.
   * Aceita entradas: YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD. Retorna vazio se não conseguir parsear.
   */
  private toYYYYMMDD(input: any): string {
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

}
