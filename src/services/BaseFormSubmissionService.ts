import fs from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormSubmissionData, MondayColumnType, MondayFormMapping, MARKETING_BOARD_FORM_MAPPING, SubitemData } from '../dto/MondayFormMappingDto';
import { MondayItem } from '../entities/MondayItem';
import { MondayBoard } from '../entities/MondayBoard';
import { Subscriber } from '../entities/Subscriber';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import { MondayService } from './MondayService';
import { ChannelScheduleService } from './ChannelScheduleService';
import { buildSafePath, sanitizeFilename } from '../utils/pathSecurity';
import { getValueByPath } from '../utils/objectHelpers';
import { BriefingValidator } from '../utils/briefingValidator';
import { convertDateFormat, toYYYYMMDD } from '../utils/dateFormatters';

/**
 * Interface para mapeamento de campos entre formulário e segundo board
 */
export interface SecondBoardFieldMapping {
  canal: string;
  cliente: string;
  campanha: string;
  disparo: string;
  mecanica: string;
  solicitante: string;
  objetivo: string;
  produto: string;
  segmento: string;
  useCanalFromSubitem?: boolean;
}

/**
 * Interface para informações de capacidade de canal
 */
export interface CapacityInfo {
  maxValue: number;
  effectiveMaxValue: number;
  availableAtCurrent: number;
  splitHours: Set<string>;
}

/**
 * Interface simplificada de capacidade para operações de split
 */
export interface SimplifiedCapacityInfo {
  maxValue: number;
  splitHours: Set<string>;
}

/**
 * DTO para contexto de alocação de capacidade
 */
export interface CapacityAllocationContext {
  items: SubitemData[];
  index: number;
  item: SubitemData;
  demanda: number;
  capacityInfo: CapacityInfo;
  activeTimeSlots: MondayItem[];
  staged: Record<string, number>;
  keyFn: (id: string, d: Date, h: string) => string;
  areaSolicitante: string | undefined;
}

/**
 * DTO para contexto de divisão de demanda entre horários
 */
export interface SplitDemandContext {
  items: SubitemData[];
  index: number;
  item: SubitemData;
  demanda: number;
  availableAtCurrent: number;
  capacityInfo: SimplifiedCapacityInfo;
  activeTimeSlots: MondayItem[];
  staged: Record<string, number>;
  keyFn: (id: string, d: Date, h: string) => string;
  idCanal: string;
  dataDate: Date;
  horaAtual: string;
  areaSolicitante: string | undefined;
}

/**
 * DTO para busca de horário disponível
 */
export interface FindAvailableSlotContext {
  items: SubitemData[];
  index: number;
  item: SubitemData;
  restante: number;
  activeTimeSlots: MondayItem[];
  capacityInfo: SimplifiedCapacityInfo;
  staged: Record<string, number>;
  keyFn: (id: string, d: Date, h: string) => string;
  idCanal: string;
  dataDate: Date;
  areaSolicitante: string | undefined;
}

/**
 * DTO para processamento de subitem para segundo board
 */
export interface ProcessSubitemContext {
  sub: SubitemData;
  enrichedFormData: FormSubmissionData;
  firstBoardAllColumnValues: Record<string, any>;
  firstBoardItemId: string;
  secondBoardId: string;
  secondBoardGroupId: string;
  connectColumns: string[];
  fallbackItemName: string;
  itemNameSuffix: string;
  serviceLabel: string;
  idx: number;
}

export abstract class BaseFormSubmissionService {
  protected readonly mondayService: MondayService;
  protected readonly subscriberRepository: Repository<Subscriber>;
  protected readonly mondayItemRepository: Repository<MondayItem>;
  protected readonly mondayBoardRepository: Repository<MondayBoard>;
  protected readonly channelScheduleRepository: Repository<ChannelSchedule>;
  protected channelScheduleService?: ChannelScheduleService;

  constructor() {
    this.mondayService = new MondayService();
    this.subscriberRepository = AppDataSource.getRepository(Subscriber);
    this.mondayItemRepository = AppDataSource.getRepository(MondayItem);
    this.mondayBoardRepository = AppDataSource.getRepository(MondayBoard);
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
  }

  protected isDev(): boolean {
    return String(process.env.NODE_ENV || '').toLowerCase() === 'development';
  }

  /**
   * Salva objeto genérico em arquivo JSON (antes do envio ao Monday)
   */
  protected async saveObjectLocally(
    obj: Record<string, any>,
    filenamePrefix: string
  ): Promise<void> {
    try {
      if (!this.isDev()) {
        console.debug('[saveObjectLocally] Ambiente não-dev. Pulo gravação em disco.');
        return;
      }
      const sanitizedPrefix = sanitizeFilename(filenamePrefix);
      const baseDir = path.join(process.cwd(), 'data', 'form-submissions');
      await fs.promises.mkdir(baseDir, { recursive: true });
      const filePath = path.join(baseDir, `${sanitizedPrefix}_${Date.now()}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf-8');
      console.log(`Objeto salvo em: ${filePath}`);
    } catch (e) {
      console.warn('Falha ao salvar objeto localmente:', e);
    }
  }

  /**
   * Salva arquivo na pasta data/pre-data com o JSON de submissão (pré-envio)
   */
  protected async savePreObjectLocally(
    obj: Record<string, any>,
    filenamePrefix: string
  ): Promise<void> {
    try {
      if (!this.isDev()) {
        console.debug('[savePreObjectLocally] Ambiente não-dev. Pulo gravação em disco.');
        return;
      }
      const sanitizedPrefix = sanitizeFilename(filenamePrefix);
      const baseDir = path.join(process.cwd(), 'data', 'pre-data');
      await fs.promises.mkdir(baseDir, { recursive: true });
      const filePath = path.join(baseDir, `${sanitizedPrefix}_${Date.now()}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf-8');
      console.log(`Pre-data salvo em: ${filePath}`);
    } catch (e) {
      console.warn('Falha ao salvar pre-data localmente:', e);
    }
  }

  /**
   * Salva o payload modificado em arquivo JSON local antes de submeter à Monday
   */
  protected async savePayloadLocally(payload: FormSubmissionData): Promise<void> {
    try {
      if (!this.isDev()) {
        console.debug('[savePayloadLocally] Ambiente não-dev. Pulo gravação em disco.');
        return;
      }
      const sanitizedId = sanitizeFilename(payload.id || 'submission');
      const baseDir = path.join(process.cwd(), 'data', 'form-submissions');
      await fs.promises.mkdir(baseDir, { recursive: true });
      const filePath = path.join(baseDir, `${sanitizedId}_${Date.now()}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`Payload salvo em: ${filePath}`);
    } catch (e) {
      console.warn('Falha ao salvar payload localmente:', e);
    }
  }

  /**
   * Extrai o nome do item baseado na configuração de mapeamento
   */
  protected extractItemName(formData: FormSubmissionData, mapping: MondayFormMapping): string {
    if (mapping.item_name_field) {
      const name = getValueByPath(formData, mapping.item_name_field);
      if (name && typeof name === 'string') {
        return name;
      }
    }

    // Fallback para nome padrão
    return mapping.default_item_name || `Formulário ${formData.id}`;
  }

  /**
   * Obtém valor do objeto usando dot notation (ex: "data.name")
   * @deprecated Use getValueByPath from utils/objectHelpers instead
   */
  protected getValueByPath(obj: any, path: string): any {
    return getValueByPath(obj, path);
  }

  /**
   * Determina o tipo de coluna baseado no nome do campo
   */
  protected getColumnType(fieldName: string): MondayColumnType {
    // Campos de arquivo
    if (fieldName.includes('enviar_arquivo') || fieldName.includes('file_')) {
      return MondayColumnType.FILE;
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
    if (fieldName.includes('lista_suspensa') || fieldName.includes('sele__o_m_ltipla') || fieldName.includes('sele__o_individual')) {
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
   * Separa colunas que iniciam com "conectar_quadros" ou link_to_itens_filhos__1 das demais
   * @param all Todas as colunas
   * @param excludeColumns Colunas que devem ser excluídas (não tratadas como connect columns)
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
   * Resolve valores das colunas conectar_quadros* convertendo nomes para item_ids via tabela monday_items
   */
  protected async resolveConnectBoardColumns(connectColumnsRaw: Record<string, any>): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    for (const [key, rawVal] of Object.entries(connectColumnsRaw)) {
      const processedValue = await this.processConnectBoardValue(key, rawVal);
      if (processedValue) {
        out[key] = processedValue;
      }
    }
    return out;
  }

  /**
   * Processa um valor individual de coluna connect_board
   */
  private async processConnectBoardValue(key: string, rawVal: any): Promise<{ item_ids: string[] } | null> {
    // Caso já venha como { item_ids: [...] }, respeitar e seguir
    const formattedValue = this.tryExtractFormattedItemIds(rawVal);
    if (formattedValue) {
      return formattedValue;
    }

    // Resolver valores que precisam de busca
    const itemIds = await this.resolveItemIdsFromValues(key, rawVal);
    return itemIds.length > 0 ? { item_ids: itemIds } : null;
  }

  /**
   * Tenta extrair item_ids já formatados
   */
  private tryExtractFormattedItemIds(rawVal: any): { item_ids: string[] } | null {
    if (rawVal && typeof rawVal === 'object' && Array.isArray(rawVal.item_ids)) {
      const ids = rawVal.item_ids.map(String).filter((s: string) => s.trim().length > 0);
      if (ids.length > 0) {
        return { item_ids: ids };
      }
    }
    return null;
  }

  /**
   * Resolve valores para item_ids fazendo busca quando necessário
   */
  private async resolveItemIdsFromValues(key: string, rawVal: any): Promise<string[]> {
    const values: string[] = this.normalizeToStringArray(rawVal);
    const itemIds: string[] = [];
    
    for (const val of values) {
      const trimmed = String(val).trim();
      if (!trimmed) continue;
      
      const itemId = await this.resolveValueToItemId(trimmed, key);
      if (itemId) {
        itemIds.push(itemId);
      }
    }
    
    return itemIds;
  }

  /**
   * Resolve um único valor para item_id
   */
  private async resolveValueToItemId(value: string, columnKey: string): Promise<string | null> {
    // Se já é um número (id do item), usar diretamente
    if (/^\d+$/.test(value)) {
      return value;
    }
    
    // Caso contrário, tentar resolver por name/code/team
    const found = await this.findMondayItemBySearchTerm(value);
    if (found?.item_id) {
      return String(found.item_id);
    }
    
    console.warn(`MondayItem não encontrado para termo='${value}' ao resolver ${columnKey}`);
    return null;
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

  /**
   * Busca o "code" do monday_items a partir do valor do campo name, com filtro por board_id para evitar colisão
   */
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
   * Normaliza valores em array de strings
   */
  protected normalizeToStringArray(v: any): string[] {
    if (v === null || v === undefined) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return [v];
    if (typeof v === 'object') {
      const obj: any = v;
      // Caso tenha alguma estrutura inesperada, tentar extrair rótulos conhecidos
      if (Array.isArray(obj.labels)) return obj.labels.map(String);
      if (Array.isArray(obj.ids)) return obj.ids.map(String);
    }
    return [String(v)];
  }

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

      case MondayColumnType.FILE:
        return this.formatFileValue(value);

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
   * Formata valores de arquivo para Monday.com
   */
  protected formatFileValue(value: any): any {
    if (!value) return undefined;
    
    // Se já é um objeto com file_ids, retorna como está
    if (typeof value === 'object' && Array.isArray(value.file_ids)) {
      return { file_ids: value.file_ids };
    }
    
    // Se é uma string (URL ou ID do arquivo), retorna como array
    if (typeof value === 'string') {
      return { file_ids: [value] };
    }
    
    // Se é um array, assume que são IDs de arquivo
    if (Array.isArray(value)) {
      return { file_ids: value };
    }
    
    return undefined;
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
      }
      else {
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
    // JSON.stringify já escapa \n como \\n corretamente
    // Depois escapamos as aspas duplas para poder inserir dentro da string GraphQL
    const columnValuesJson = JSON.stringify(columnValues)
      .replaceAll('\\', '\\\\')  // Escapar barras invertidas primeiro
      .replaceAll("\"", '\\"');   // Depois escapar aspas duplas
    
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
   * Processa upload de arquivo se o campo enviar_arquivo__1 contém um nome de arquivo
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

  /**
   * Constrói o objeto column_values para a mutation da Monday.com
   * Método abstrato que deve ser implementado por cada serviço específico
   */
  protected abstract buildColumnValues(formData: FormSubmissionData, mapping: MondayFormMapping): Promise<Record<string, any>>;

  /**
   * Valida campos específicos usando BriefingValidator
   * Pode ser sobrescrito para validações adicionais específicas do serviço
   */
  protected validateSpecificFields(data: Record<string, any>): void {
    BriefingValidator.validateSpecificFields(data);
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
   * Processa envio para o board de marketing (padrão comum entre serviços)
   * @param enrichedFormData Dados enriquecidos do formulário
   * @param itemName Nome do item para o board de marketing
   * @param mainBoardItemId ID do item criado no board principal
   * @param serviceLabel Label do serviço para logs (ex: "GAM", "CRM")
   * @param excludeColumns Colunas adicionais a excluir do marketing board
   * @returns ID do item criado no board de marketing
   */
  protected async processMarketingBoardSend(
    enrichedFormData: FormSubmissionData,
    itemName: string,
    mainBoardItemId: string,
    serviceLabel: string = '',
    excludeColumns: string[] = []
  ): Promise<string> {
    const logPrefix = serviceLabel ? `${serviceLabel} ` : '';
    console.log(`Enviando briefing ${logPrefix}para o board de marketing (Fluxo de MKT)...`);
    
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
    
    // Excluir campos especificados
    for (const col of excludeColumns) {
      delete marketingColumnValues[col];
    }
    
    // Corrigir campo pessoas7 para usar o valor já resolvido do board principal
    // O mapeamento aponta para pessoas5__1 (email), mas precisamos do valor resolvido
    if (enrichedFormData.data?.["pessoas5__1"] !== undefined) {
      const resolved = await this.resolvePeopleFromSubscribers(enrichedFormData.data["pessoas5__1"]);
      if (resolved) {
        marketingColumnValues["pessoas7"] = resolved;
      }
    }
    
    // Filtrar colunas excluídas antes de separar
    const filteredMarketingColumnValues = { ...marketingColumnValues };
    for (const col of excludeColumns) {
      delete filteredMarketingColumnValues[col];
    }
    
    // Separar colunas base e conectores
    const { baseColumns: marketingBaseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(filteredMarketingColumnValues);
    
    // Salvar o JSON de pré-submissão do board de marketing (primeiro envio)
    try {
      const marketingPreData = {
        board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
        group_id: MARKETING_BOARD_FORM_MAPPING.group_id,
        item_name: itemName,
        column_values: marketingBaseColumns,
      };
      await this.savePreObjectLocally(marketingPreData, `${enrichedFormData.id || 'submission'}_${serviceLabel.toLowerCase()}_marketing_board_predata`);
    } catch (e) {
      console.warn(`Falha ao gerar/salvar pre-data do board de marketing ${logPrefix}:`, e);
    }
    
    // Criar o item no board de marketing (primeira criação)
    const marketingItemId = await this.createMondayItem(
      MARKETING_BOARD_FORM_MAPPING.board_id,
      MARKETING_BOARD_FORM_MAPPING.group_id,
      itemName,
      marketingBaseColumns
    );
    
    console.log(`Board de marketing ${logPrefix}: item criado com ID ${marketingItemId} (primeiro envio).`);
    
    // Processar colunas conectar_quadros*
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
          `${enrichedFormData.id || 'submission'}_${serviceLabel.toLowerCase()}_marketing_board_connect_columns`
        );
        
        // Também salvar como PRE-DATA do segundo envio do board de marketing
        await this.savePreObjectLocally(
          {
            board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
            item_id: marketingItemId,
            column_values: resolvedConnectColumns,
          },
          `${enrichedFormData.id || 'submission'}_${serviceLabel.toLowerCase()}_marketing_board_second_send_predata`
        );
        
        // Enviar atualização de múltiplas colunas (segundo envio)
        await this.mondayService.changeMultipleColumnValues(
          MARKETING_BOARD_FORM_MAPPING.board_id,
          marketingItemId,
          resolvedConnectColumns
        );
        
        console.log(`Board de marketing ${logPrefix}: colunas conectar_quadros* atualizadas para item ${marketingItemId} (segundo envio).`);
      }
    } catch (e) {
      console.error(`Falha ao atualizar colunas conectar_quadros no board de marketing ${logPrefix}:`, e);
    }
    
    console.log(`Conexão estabelecida: Board Marketing ${logPrefix}(${marketingItemId}) → Board Principal (${mainBoardItemId})`);
    
    return marketingItemId;
  }

  /**
   * Utilitário: tenta parsear "YYYY-MM-DD" ou "DD/MM/YYYY" para Date
   */
  protected parseFlexibleDateToDate(value: string): Date | null {
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

  /**
   * Zera hora/min/seg/ms da data para comparação igual ao tipo date
   */
  protected truncateDate(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Encontra o subitem com data__1 mais próxima da data atual
   */
  protected findClosestSubitemByDate(subitems: unknown[]): unknown {
    if (!subitems || subitems.length === 0) return null;
    
    const today = this.truncateDate(new Date());
    let closest: unknown = null;
    let minDiff = Infinity;
    
    for (const sub of subitems) {
      const dataStr = (sub as any).data__1;
      if (!dataStr) continue;
      
      const subDate = this.parseFlexibleDateToDate(String(dataStr));
      if (!subDate) continue;
      
      const truncated = this.truncateDate(subDate);
      const diff = Math.abs(truncated.getTime() - today.getTime());
      
      if (diff < minDiff) {
        minDiff = diff;
        closest = sub;
      }
    }
    
    return closest;
  }

  /**
   * Constrói o valor do campo text_mkr3znn0 usando os novos campos de texto text_mkvh*
   */
  protected async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};

    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    const yyyymmdd = dataDisparoTexto || toYYYYMMDD(d["data__1"]);
    const idPart = itemId ? `id-${itemId}` : "";

    // Buscar board_id do board "Produto" uma vez para evitar colisão
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    const produtoBoardId = produtoBoard?.id;

    const codes = await this.resolveFieldCodes(d, produtoBoardId);
    const tailName = String(d["name"] ?? "").trim();

    const parts = [yyyymmdd, idPart, ...codes, tailName];
    return parts.join("-");
  }

  /**
   * Resolve códigos para os campos da taxonomia
   */
  private async resolveFieldCodes(data: Record<string, any>, produtoBoardId?: string): Promise<string[]> {
    const fieldPairs = [
      { lookup: "lookup_mkrtaebd", gam: "gam_client_type" },
      { lookup: "lookup_mkrt66aq", gam: "gam_campaign_type" },
      { lookup: "lookup_mkrtxa46", gam: "gam_mechanism" },
      { lookup: "lookup_mkrta7z1", gam: "gam_requesting_area" },
      { lookup: "lookup_mkrt36cj", gam: "gam_target_segment" },
      { lookup: "lookup_mkrtwq7k", gam: "gam_objective" },
      { lookup: "lookup_mkrtvsdj", gam: "gam_product_service" },
      { lookup: "lookup_mkrtcctn", gam: "gam_format_type" },
      { lookup: "lookup_mkrtxgmt", gam: "gam_campaign_type_specific" }
    ];

    const codes: string[] = [];
    for (const pair of fieldPairs) {
      const code = await this.resolveFieldCode(data, pair, produtoBoardId);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Resolve código individual de um campo
   */
  private async resolveFieldCode(
    data: Record<string, any>,
    pair: { lookup: string; gam: string },
    produtoBoardId?: string
  ): Promise<string> {
    const nameVal = String(data[pair.lookup] ?? data[pair.gam] ?? "").trim();
    if (!nameVal) {
      return ""; // Manter posição vazia para preservar estrutura
    }

    try {
      // Lógica especial para produtos
      if (pair.lookup === "lookup_mkrtvsdj") {
        return await this.resolveProductCode(nameVal, produtoBoardId);
      }
      
      const code = await this.getCodeByItemName(nameVal);
      return code ?? nameVal;
    } catch {
      return nameVal;
    }
  }

  /**
   * Resolve código de produto com subproduto se existir
   */
  private async resolveProductCode(productName: string, produtoBoardId?: string): Promise<string> {
    const code = await this.getCodeByItemName(productName, produtoBoardId);
    if (!code) {
      return productName;
    }

    const subproductCode = await this.mondayService.getSubproductCodeByProduct(productName);
    return subproductCode ? `${code}_${subproductCode}` : code;
  }

  /**
   * Gera string composta para o segundo board usando os novos campos text_mkvh*
   */
  protected async buildCompositeTextFieldSecondBoard(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};
    
    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();
    
    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || toYYYYMMDD(d["data__1"]);
    
    const idPart = itemId ? `id-${itemId}` : "";
    
    // Campos com fallback: novo formato (text_*) ou formato legado (lookup_*)
    const fieldMappings = [
      { text: "text_mkvhz8g3", lookup: "lookup_mkrtaebd" }, // Tipo Cliente
      { text: "text_mkvhedf5", lookup: "lookup_mkrt66aq" }, // Tipo Campanha
      { text: "text_mkvhqgvn", lookup: "lookup_mkrtxa46" }, // Tipo Disparo
      { text: "text_mkvhv5ma", lookup: "lookup_mkrta7z1" }, // Mecânica
      { text: "text_mkvhvcw4", lookup: "lookup_mkrt36cj" }, // Área Solicitante
      { text: "text_mkvh2z7j", lookup: "lookup_mkrtwq7k" }, // Objetivo
      { text: "text_mkvhwyzr", lookup: "lookup_mkrtvsdj" }, // Produto
      { text: "text_mkvhgbp8", lookup: "lookup_mkrtcctn" }, // Canal
      { text: "text_mkvhammc", lookup: "lookup_mkrtxgmt" }  // Segmento
    ];
    
    const values: string[] = [];
    for (const mapping of fieldMappings) {
      // Preferir novo formato text_*, com fallback para lookup_*
      let textVal = String(d[mapping.text] ?? d[mapping.lookup] ?? "").trim();
      
      // Se tem lookup, tentar buscar código
      if (textVal) {
        try {
          const code = await this.getCodeByItemName(textVal);
          if (code) {
            textVal = code;
          }
        } catch (e) {
          console.warn(`Erro ao obter código para ${textVal}:`, e instanceof Error ? e.message : String(e));
          // Manter valor original se falhar
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

  /**
   * Monta valor para coluna People a partir de monday_items.team (Times)
   */
  protected async buildPeopleFromLookupObjetivo(data: Record<string, any> | undefined): Promise<{ personsAndTeams: { id: string; kind: 'team' }[] } | undefined> {
    try {
      // Suporta ambos formatos: novo (text_mkvhvcw4) e legado (lookup_mkrt36cj)
      const areaSolicitante = String(data?.["text_mkvhvcw4"] ?? data?.["lookup_mkrt36cj"] ?? '').trim();
      if (!areaSolicitante) return undefined;
      const item = await this.mondayItemRepository.findOne({ where: { name: areaSolicitante } });
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
   * Insere dados dos subitems na tabela channel_schedules
   */
  protected async insertChannelSchedules(subitems: any[], formData: FormSubmissionData): Promise<void> {
    if (!this.channelScheduleService) {
      console.warn('ChannelScheduleService não disponível. Dados não serão inseridos em channel_schedules.');
      return;
    }

    // Extrair área solicitante do formulário
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
   * Soma total já reservada (qtd) em channel_schedules para um canal/data/hora
   */
  protected async sumReservedQty(idCanal: string, dataDate: Date, hora: string, areaSolicitante?: string): Promise<number> {
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
        totalJaUsado += qtd;
      } else if (tipo === 'reserva') {
        if (!areaSolicitante || schedule.area_solicitante !== areaSolicitante) {
          totalJaUsado += qtd;
        }
      }
    });

    return totalJaUsado;
  }

  /**
   * Ajusta os objetos de __SUBITEMS__ respeitando a capacidade disponível por canal/data/hora
   */
  protected async adjustSubitemsCapacity(
    subitems: SubitemData[], 
    formData: FormSubmissionData | undefined, 
    timeSlotsBoard: string
  ): Promise<SubitemData[]> {
    const areaSolicitante = this.extractAreaSolicitante(formData);
    const activeTimeSlots = await this.loadActiveTimeSlots(timeSlotsBoard);
    const items: SubitemData[] = subitems.map(s => ({ ...s }));

    await this.processCapacityAdjustments(items, activeTimeSlots, areaSolicitante);
    
    return items.filter(it => Number(it.n_meros_mkkchcmk ?? 0) > 0);
  }

  private extractAreaSolicitante(formData: FormSubmissionData | undefined): string | undefined {
    return formData?.data?.gam_requesting_area 
      || formData?.data?.requesting_area 
      || formData?.data?.area_solicitante;
  }

  private async loadActiveTimeSlots(timeSlotsBoard: string): Promise<MondayItem[]> {
    return await this.mondayItemRepository.find({
      where: { board_id: timeSlotsBoard, status: 'Ativo' },
      order: { name: 'ASC' }
    });
  }

  private async processCapacityAdjustments(
    items: SubitemData[], 
    activeTimeSlots: MondayItem[], 
    areaSolicitante: string | undefined
  ): Promise<void> {
    const key = (id: string, d: Date, h: string) => `${id}|${d.toISOString().slice(0,10)}|${h}`;
    
    let changed = true;
    while (changed) {
      changed = false;
      const staged: Record<string, number> = {};

      for (let i = 0; i < items.length; i++) {
        const result = await this.processSubitemCapacity(
          items, i, activeTimeSlots, staged, areaSolicitante, key
        );
        
        if (result.changed) {
          changed = true;
          break;
        }
      }
    }
  }

  private async processSubitemCapacity(
    items: SubitemData[],
    index: number,
    activeTimeSlots: MondayItem[],
    staged: Record<string, number>,
    areaSolicitante: string | undefined,
    keyFn: (id: string, d: Date, h: string) => string
  ): Promise<{ changed: boolean }> {
    const item = items[index];
    const { idCanal, dataStr, horaAtual, demanda } = this.extractSubitemData(item);

    if (!this.isValidSubitem(idCanal, dataStr, horaAtual, demanda)) {
      items.splice(index, 1);
      return { changed: true };
    }

    const dataDate = this.parseFlexibleDateToDate(dataStr);
    if (!dataDate) return { changed: false };

    const capacityInfo = await this.getChannelCapacityInfo(idCanal, dataDate, horaAtual, areaSolicitante, staged, keyFn);
    if (!capacityInfo) return { changed: false };

    const allocationContext: CapacityAllocationContext = {
      items,
      index,
      item,
      demanda,
      capacityInfo,
      activeTimeSlots,
      staged,
      keyFn,
      areaSolicitante
    };
    
    return await this.handleCapacityAllocation(allocationContext);
  }

  private extractSubitemData(item: SubitemData) {
    return {
      idCanal: String(item.id ?? '').trim(),
      dataStr: String(item.data__1 ?? '').trim(),
      horaAtual: String(item.conectar_quadros_mkkcnyr3 ?? '').trim(),
      demanda: Number(item.n_meros_mkkchcmk ?? 0)
    };
  }

  private isValidSubitem(idCanal: string, dataStr: string, horaAtual: string, demanda: number): boolean {
    return !!(idCanal && dataStr && horaAtual && demanda > 0);
  }

  private async getChannelCapacityInfo(
    idCanal: string,
    dataDate: Date,
    horaAtual: string,
    areaSolicitante: string | undefined,
    staged: Record<string, number>,
    keyFn: (id: string, d: Date, h: string) => string
  ): Promise<CapacityInfo | null> {
    const canalItem = await this.mondayItemRepository.findOne({ where: { item_id: idCanal } });
    const maxValue = canalItem?.max_value !== undefined && canalItem?.max_value !== null
      ? Number(canalItem.max_value)
      : undefined;
    
    if (maxValue === undefined || Number.isNaN(maxValue)) {
      return null;
    }

    const splitHours = new Set(["08:00", "08:30"]);
    const effectiveMaxValue = splitHours.has(horaAtual) ? maxValue / 2 : maxValue;
    const dbReserved = await this.sumReservedQty(idCanal, dataDate, horaAtual, areaSolicitante);
    const stagedReserved = staged[keyFn(idCanal, dataDate, horaAtual)] ?? 0;
    const availableAtCurrent = Math.max(0, effectiveMaxValue - (dbReserved + stagedReserved));

    return { maxValue, effectiveMaxValue, availableAtCurrent, splitHours };
  }

  private async handleCapacityAllocation(context: CapacityAllocationContext): Promise<{ changed: boolean }> {
    const { item, demanda, capacityInfo, activeTimeSlots, staged, keyFn, items, index } = context;
    const { idCanal, dataStr, horaAtual } = this.extractSubitemData(item);
    const dataDate = this.parseFlexibleDateToDate(dataStr)!;
    const { availableAtCurrent } = capacityInfo;

    if (demanda <= availableAtCurrent) {
      staged[keyFn(idCanal, dataDate, horaAtual)] = (staged[keyFn(idCanal, dataDate, horaAtual)] ?? 0) + demanda;
      return { changed: false };
    }

    if (availableAtCurrent <= 0) {
      return this.moveToNextTimeSlot(items, index, item, demanda, horaAtual, activeTimeSlots, idCanal);
    }

    const splitContext: SplitDemandContext = {
      items,
      index,
      item,
      demanda,
      availableAtCurrent,
      capacityInfo: { maxValue: capacityInfo.maxValue, splitHours: capacityInfo.splitHours },
      activeTimeSlots,
      staged,
      keyFn,
      idCanal,
      dataDate,
      horaAtual,
      areaSolicitante: context.areaSolicitante
    };
    
    return await this.splitDemandAcrossSlots(splitContext);
  }

  private moveToNextTimeSlot(
    items: SubitemData[],
    index: number,
    item: SubitemData,
    demanda: number,
    horaAtual: string,
    activeTimeSlots: MondayItem[],
    idCanal: string
  ): { changed: boolean } {
    const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === horaAtual);
    const nextIndex = idx >= 0 ? idx + 1 : 0;
    
    if (nextIndex >= activeTimeSlots.length) {
      console.warn(`Sem próximo horário disponível após "${horaAtual}" para canal ${idCanal}. Restante: ${demanda}`);
      items.splice(index, 1);
      return { changed: true };
    }
    
    const nextHora = (activeTimeSlots[nextIndex].name || '').trim();
    const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: demanda };
    items.splice(index, 1, novoSubitem);
    return { changed: true };
  }

  private async splitDemandAcrossSlots(context: SplitDemandContext): Promise<{ changed: boolean }> {
    const { item, availableAtCurrent, demanda, staged, keyFn, idCanal, dataDate, horaAtual, activeTimeSlots, items, index, capacityInfo, areaSolicitante } = context;
    
    item.n_meros_mkkchcmk = availableAtCurrent;
    staged[keyFn(idCanal, dataDate, horaAtual)] = (staged[keyFn(idCanal, dataDate, horaAtual)] ?? 0) + availableAtCurrent;

    const restante = Math.max(0, demanda - availableAtCurrent);
    const nextHora = this.findNextAvailableSlot(activeTimeSlots, horaAtual);

    if (!nextHora) {
      const findContext: FindAvailableSlotContext = {
        items,
        index,
        item,
        restante,
        activeTimeSlots,
        capacityInfo: { maxValue: capacityInfo.maxValue, splitHours: capacityInfo.splitHours },
        staged,
        keyFn,
        idCanal,
        dataDate,
        areaSolicitante
      };
      const foundSlot = await this.findAnyAvailableSlot(findContext);
      return { changed: foundSlot };
    }

    const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: nextHora, n_meros_mkkchcmk: restante };
    items.splice(index + 1, 0, novoSubitem);
    return { changed: true };
  }

  private findNextAvailableSlot(activeTimeSlots: MondayItem[], currentHour: string): string | null {
    const idx = activeTimeSlots.findIndex(s => (s.name || '').trim() === currentHour);
    const nextIndex = idx >= 0 ? idx + 1 : 0;
    return nextIndex < activeTimeSlots.length ? (activeTimeSlots[nextIndex].name || '').trim() : null;
  }

  private async findAnyAvailableSlot(context: FindAvailableSlotContext): Promise<boolean> {
    const { items, index, item, restante, activeTimeSlots, capacityInfo, staged, keyFn, idCanal, dataDate, areaSolicitante } = context;
    
    for (const testSlot of activeTimeSlots) {
      const testHora = (testSlot.name || '').trim();
      const testReserved = await this.sumReservedQty(idCanal, dataDate, testHora, areaSolicitante);
      const testStaged = staged[keyFn(idCanal, dataDate, testHora)] ?? 0;
      const testEffectiveMax = capacityInfo.splitHours.has(testHora) ? capacityInfo.maxValue / 2 : capacityInfo.maxValue;
      const testAvailable = Math.max(0, testEffectiveMax - (testReserved + testStaged));
      
      if (testAvailable > 0) {
        const novoSubitem: SubitemData = { ...item, conectar_quadros_mkkcnyr3: testHora, n_meros_mkkchcmk: restante };
        items.splice(index + 1, 0, novoSubitem);
        return true;
      }
    }
    
    console.warn(`Nenhum horário disponível para alocar restante de ${restante} unidades no canal ${idCanal}`);
    return false;
  }

  /**
   * Método que cada serviço filho pode sobrescrever para fornecer seu mapeamento de campos
   * Retorna null por padrão para serviços que não usam segundo board
   */
  protected getSecondBoardFieldMapping(): SecondBoardFieldMapping | null {
    return null;
  }

  /**
   * Método genérico para construir payload do segundo board a partir de um subitem
   * Extrai lógica comum entre GAM e CRM services
   */
  protected async buildSecondBoardPayloadFromSubitem(
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    firstBoardItemId: string,
    secondBoardCorrelationFromSubmission: Array<{ id_submission: string; id_second_board: string }>,
    secondBoardCorrelationFromFirst: Array<{ id_first_board: string; id_second_board: string }>,
    itemNameSuffix: string = ''
  ): Promise<{ item_name: string; column_values: Record<string, any> }> {
    const fieldMapping = this.getSecondBoardFieldMapping();
    if (!fieldMapping) {
      throw new Error('getSecondBoardFieldMapping() must be implemented by subclass');
    }

    const produtoBoardId = await this.getProdutoBoardId();
    const cv: Record<string, any> = {};

    // Processar correlações
    this.applyCorrelations(cv, subitem, enrichedFormData, firstBoardAllColumnValues, 
                          secondBoardCorrelationFromSubmission, secondBoardCorrelationFromFirst);

    // Campos base
    await this.applyBaseFields(cv, subitem, firstBoardAllColumnValues, firstBoardItemId);

    // Campos de taxonomia e mapeamento
    await this.applyTaxonomyFields(cv, subitem, enrichedFormData, fieldMapping, produtoBoardId);

    // Campos específicos do subitem
    this.applySubitemFields(cv, subitem, firstBoardItemId);

    // Campos compostos
    await this.applyCompositeFields(cv, enrichedFormData, firstBoardItemId);

    const item_name = this.buildSecondBoardItemName(cv, itemNameSuffix);
    return { item_name, column_values: cv };
  }

  private async getProdutoBoardId(): Promise<string | undefined> {
    const produtoBoard = await this.mondayBoardRepository.findOne({ where: { name: "Produto" } });
    return produtoBoard?.id;
  }

  private applyCorrelations(
    cv: Record<string, any>,
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    secondBoardCorrelationFromSubmission: Array<{ id_submission: string; id_second_board: string }>,
    secondBoardCorrelationFromFirst: Array<{ id_first_board: string; id_second_board: string }>
  ): void {
    // Correlações submissão=>segundo
    for (const m of secondBoardCorrelationFromSubmission) {
      const from = (m.id_submission || '').trim();
      const to = (m.id_second_board || '').trim();
      if (!from || !to) continue;
      
      const v = subitem[from] !== undefined ? subitem[from] : enrichedFormData?.data?.[from];
      if (v !== undefined) cv[to] = v;
    }

    // Correlações primeiro=>segundo
    for (const m of secondBoardCorrelationFromFirst) {
      const from = (m.id_first_board || '').trim();
      const to = (m.id_second_board || '').trim();
      if (!from || !to) continue;
      
      const v = firstBoardAllColumnValues[from];
      if (v !== undefined) cv[to] = v;
    }
  }

  private async applyBaseFields(
    cv: Record<string, any>,
    subitem: SubitemData,
    firstBoardAllColumnValues: Record<string, any>,
    firstBoardItemId: string
  ): Promise<void> {
    // Data de hoje
    if (cv['date_mkrk5v4c'] === undefined) {
      const now = new Date();
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      cv['date_mkrk5v4c'] = this.formatDateValue(iso);
    }

    // Data do subitem
    if (cv['text_mkr3v9k3'] === undefined && subitem['data__1'] !== undefined) {
      cv['text_mkr3v9k3'] = String(subitem['data__1']);
    }

    // Pessoas
    if (firstBoardAllColumnValues['pessoas__1']) {
      cv['pessoas5__1'] = firstBoardAllColumnValues['pessoas__1'];
    }

    // Link ao primeiro board
    cv['text_mkrr6jkh'] = String(firstBoardItemId);
  }

  private async applyTaxonomyFields(
    cv: Record<string, any>,
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    fieldMapping: SecondBoardFieldMapping,
    produtoBoardId?: string
  ): Promise<void> {
    // Taxonomia de produto
    await this.applyProductTaxonomy(cv, subitem);

    // Canal
    await this.applyChannelField(cv, subitem, enrichedFormData, fieldMapping);

    // Campos mapeados com código
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.cliente, 'text_mkrrg2hp', 'text_mkrrna7e');
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.campanha, 'text_mkrra7df', 'text_mkrrcnpx');
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.disparo, 'text_mkrr9edr', 'text_mkrrmjcy');
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.mecanica, 'text_mkrrxf48', 'text_mkrrxpjd');
    await this.applySolicitanteField(cv, enrichedFormData, fieldMapping.solicitante);
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.objetivo, 'text_mkrrhdh6', 'text_mkrrraz2');
    await this.applyProductField(cv, enrichedFormData, fieldMapping.produto, produtoBoardId);
    await this.applySubproductField(cv);
    await this.applyMappedFieldWithCode(cv, enrichedFormData, fieldMapping.segmento, 'text_mkrrt32q', 'text_mkrrhdf8');
  }

  private async applyProductTaxonomy(cv: Record<string, any>, subitem: SubitemData): Promise<void> {
    const productCode = String(subitem.texto__1);
    const productName = String(subitem.conectar_quadros87__1);
    
    const subproductCode = await this.mondayService.getSubproductCodeByProduct(productName);
    
    if (subproductCode) {
      cv['texto6__1'] = `${productCode}_${subproductCode}`;
      console.log(`Taxonomia criada com subproduto: ${productCode}_${subproductCode} (produto: ${productName})`);
    } else {
      cv['texto6__1'] = productCode;
      console.log(`Subproduto não encontrado para produto "${productName}", usando apenas código do produto: ${productCode}`);
    }
  }

  private async applyChannelField(
    cv: Record<string, any>,
    subitem: SubitemData,
    enrichedFormData: FormSubmissionData,
    fieldMapping: SecondBoardFieldMapping
  ): Promise<void> {
    if (fieldMapping.useCanalFromSubitem) {
      const canalDoSubitem = String(subitem.conectar_quadros87__1 ?? '').trim();
      const canalDoFormulario = String(enrichedFormData.data[fieldMapping.canal] ?? '').trim();
      cv['text_mkrrqsk6'] = canalDoSubitem || canalDoFormulario;
    } else {
      cv['text_mkrrqsk6'] = String(enrichedFormData.data[fieldMapping.canal] ?? '').trim();
    }

    cv['texto6__1'] = cv['text_mkrrqsk6'];

    if (cv['text_mkrrqsk6']) {
      cv['text_mkrr8dta'] = (await this.getCodeByItemName(cv['text_mkrrqsk6'])) ?? cv['text_mkrr8dta'] ?? 'Email';
    } else {
      cv['text_mkrr8dta'] = cv['text_mkrr8dta'] ?? 'Email';
    }
  }

  private async applyMappedFieldWithCode(
    cv: Record<string, any>,
    enrichedFormData: FormSubmissionData,
    sourceField: string,
    targetField: string,
    codeField: string
  ): Promise<void> {
    cv[targetField] = String(enrichedFormData.data[sourceField] ?? '').trim();
    
    if (cv[targetField]) {
      cv[codeField] = (await this.getCodeByItemName(cv[targetField])) ?? cv[codeField] ?? 'NaN';
    } else {
      cv[codeField] = cv[codeField] ?? 'NaN';
    }
  }

  private async applySolicitanteField(
    cv: Record<string, any>,
    enrichedFormData: FormSubmissionData,
    solicitanteField: string
  ): Promise<void> {
    let solicitanteValue = String(enrichedFormData.data[solicitanteField] ?? '').trim();
    
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
  }

  private async applyProductField(
    cv: Record<string, any>,
    enrichedFormData: FormSubmissionData,
    produtoField: string,
    produtoBoardId?: string
  ): Promise<void> {
    cv['text_mkrrfqft'] = String(enrichedFormData.data[produtoField] ?? '').trim();
    
    if (cv['text_mkrrfqft']) {
      cv['text_mkrrjrnw'] = (await this.getCodeByItemName(cv['text_mkrrfqft'], produtoBoardId)) ?? cv['text_mkrrjrnw'] ?? 'NaN';
    } else {
      cv['text_mkrrjrnw'] = cv['text_mkrrjrnw'] ?? 'NaN';
    }
  }

  private async applySubproductField(cv: Record<string, any>): Promise<void> {
    if (cv['text_mkrrfqft']) {
      const subproductData = await this.mondayService.getSubproductByProduct(cv['text_mkrrfqft']);
      if (subproductData) {
        cv['text_mkw8et4w'] = subproductData.name;
        cv['text_mkw8jfw0'] = subproductData.code;
        console.log(`Subproduto encontrado para produto "${cv['text_mkrrfqft']}": ${subproductData.name} (${subproductData.code})`);
      } else {
        cv['text_mkw8et4w'] = cv['text_mkw8et4w'] ?? '';
        cv['text_mkw8jfw0'] = cv['text_mkw8jfw0'] ?? '';
      }
    } else {
      cv['text_mkw8et4w'] = cv['text_mkw8et4w'] ?? '';
      cv['text_mkw8jfw0'] = cv['text_mkw8jfw0'] ?? '';
    }
  }

  private applySubitemFields(
    cv: Record<string, any>,
    subitem: SubitemData,
    firstBoardItemId: string
  ): void {
    cv['data__1'] = cv['data__1'] ?? subitem['data__1'] ?? '';
    cv['n_meros__1'] = cv['n_meros__1'] ?? 1;
    cv['texto__1'] = cv['texto__1'] ?? 'Teste';
    cv['lista_suspensa5__1'] = cv['lista_suspensa5__1'] ?? 'Emocional';
    cv['lista_suspensa53__1'] = cv['lista_suspensa53__1'] ?? { labels: ['Autoridade', 'Exclusividade'] };
    
    if (subitem['n_meros_mkkchcmk'] !== undefined) {
      cv['n_meros_mkkchcmk'] = subitem['n_meros_mkkchcmk'];
    }

    const horaValue = subitem['conectar_quadros_mkkcnyr3'];
    if (horaValue !== undefined) {
      cv['text_mkvgjh0w'] = typeof horaValue === 'string' ? horaValue : String(horaValue);
    }

    cv['conectar_quadros8__1'] = String(firstBoardItemId);
  }

  private async applyCompositeFields(
    cv: Record<string, any>,
    enrichedFormData: FormSubmissionData,
    firstBoardItemId: string
  ): Promise<void> {
    const composite = await this.buildCompositeTextFieldSecondBoard(enrichedFormData, firstBoardItemId) || '';
    if (composite) {
      const suffix = `-${cv["n_meros__1"]}-${cv["texto6__1"]}`;
      cv['text_mkr5kh2r'] = composite + suffix; 
      cv['text_mkr3jr1s'] = composite + suffix;
    }
  }

  private buildSecondBoardItemName(cv: Record<string, any>, itemNameSuffix: string): string {
    const texto6 = cv['texto6__1'] ? String(cv['texto6__1']) : '';
    return `teste excluir${itemNameSuffix}${texto6 ? ' - ' + texto6 : ''}`;
  }

  /**
   * Método genérico para processar envio ao segundo board para cada subitem.
   * Consolida lógica duplicada entre serviços GAM e CRM.
   */
  protected async processSecondBoardForSubitems(
    enrichedFormData: FormSubmissionData,
    firstBoardAllColumnValues: Record<string, any>,
    fallbackItemName: string,
    firstBoardItemId: string,
    secondBoardId: string,
    secondBoardGroupId: string,
    connectColumns: string[],
    itemNameSuffix: string = '',
    serviceLabel: string = ''
  ): Promise<string[]> {
    const results: string[] = [];
    const subitems: SubitemData[] = enrichedFormData?.data?.__SUBITEMS__ ?? [];

    let idx = 0;
    for (const sub of subitems) {
      const context: ProcessSubitemContext = {
        sub,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId,
        secondBoardId,
        secondBoardGroupId,
        connectColumns,
        fallbackItemName,
        itemNameSuffix,
        serviceLabel,
        idx
      };
      
      const secondItemId = await this.processSubitemToSecondBoard(context);
      results.push(secondItemId);
      idx++;
    }

    return results;
  }

  private async processSubitemToSecondBoard(context: ProcessSubitemContext): Promise<string> {
    const { sub, enrichedFormData, firstBoardAllColumnValues, firstBoardItemId, secondBoardId, secondBoardGroupId, connectColumns, fallbackItemName, itemNameSuffix, serviceLabel, idx } = context;
    
    const initial = await this.buildSecondBoardPayloadFromSubitem(
      sub,
      enrichedFormData,
      firstBoardAllColumnValues,
      firstBoardItemId,
      (this as any).secondBoardCorrelationFromSubmission || [],
      (this as any).secondBoardCorrelationFromFirst || [],
      itemNameSuffix
    );

    const itemNameSecond = initial.item_name || `teste excluir${itemNameSuffix}`;
    const { baseColumns, connectColumnsRaw } = this.splitConnectBoardColumns(initial.column_values);
    const filteredConnect = this.filterConnectColumns(connectColumnsRaw, connectColumns);

    await this.saveSubitemPreData(enrichedFormData, secondBoardId, itemNameSecond, baseColumns, serviceLabel, idx);

    const secondItemId = await this.createSecondBoardItem(
      secondBoardId,
      secondBoardGroupId,
      itemNameSecond,
      fallbackItemName,
      baseColumns,
      serviceLabel,
      idx
    );

    await this.updateSecondBoardConnectColumns(
      enrichedFormData,
      secondBoardId,
      secondItemId,
      filteredConnect,
      serviceLabel,
      idx
    );

    return secondItemId;
  }

  private filterConnectColumns(
    connectColumnsRaw: Record<string, any>,
    connectColumns: string[]
  ): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const k of connectColumns) {
      if (connectColumnsRaw[k] !== undefined) {
        filtered[k] = connectColumnsRaw[k];
      }
    }
    return filtered;
  }

  private async saveSubitemPreData(
    enrichedFormData: FormSubmissionData,
    secondBoardId: string,
    itemNameSecond: string,
    baseColumns: Record<string, any>,
    serviceLabel: string,
    idx: number
  ): Promise<void> {
    try {
      await this.savePreObjectLocally(
        {
          board_id: secondBoardId,
          item_name: itemNameSecond,
          column_values: baseColumns,
        },
        `${enrichedFormData.id || 'submission'}_${serviceLabel}_second_board_predat-idx_${idx}`
      );
    } catch (e) {
      console.warn(`Falha ao gerar/salvar pre-data do segundo board ${serviceLabel} (subitem):`, e);
    }
  }

  private async createSecondBoardItem(
    secondBoardId: string,
    secondBoardGroupId: string,
    itemNameSecond: string,
    fallbackItemName: string,
    baseColumns: Record<string, any>,
    serviceLabel: string,
    idx: number
  ): Promise<string> {
    const secondItemId = await this.createMondayItem(
      secondBoardId,
      secondBoardGroupId,
      itemNameSecond || fallbackItemName,
      baseColumns
    );
    console.log(`Segundo board ${serviceLabel}: item criado para subitem ${idx} com ID ${secondItemId} (primeiro envio).`);
    return secondItemId;
  }

  private async updateSecondBoardConnectColumns(
    enrichedFormData: FormSubmissionData,
    secondBoardId: string,
    secondItemId: string,
    filteredConnect: Record<string, any>,
    serviceLabel: string,
    idx: number
  ): Promise<void> {
    try {
      const resolved = await this.resolveConnectBoardColumns(filteredConnect);
      await this.addPeopleFieldToResolved(enrichedFormData, resolved, serviceLabel);
      
      if (Object.keys(resolved).length > 0) {
        await this.saveSecondBoardUpdates(enrichedFormData, secondBoardId, secondItemId, resolved, serviceLabel, idx);
        await this.mondayService.changeMultipleColumnValues(secondBoardId, secondItemId, resolved);
      }
    } catch (e) {
      console.error(`Falha ao atualizar colunas conectar_quadros no segundo board ${serviceLabel} (subitem):`, e);
    }
  }

  private async addPeopleFieldToResolved(
    enrichedFormData: FormSubmissionData,
    resolved: Record<string, any>,
    serviceLabel: string
  ): Promise<void> {
    try {
      const ppl = await this.buildPeopleFromLookupObjetivo(enrichedFormData?.data);
      if (ppl) {
        resolved["pessoas3__1"] = ppl;
      }
    } catch (e) {
      console.warn(`Falha ao montar pessoas3__1 (segundo board ${serviceLabel}):`, e);
    }
  }

  private async saveSecondBoardUpdates(
    enrichedFormData: FormSubmissionData,
    secondBoardId: string,
    secondItemId: string,
    resolved: Record<string, any>,
    serviceLabel: string,
    idx: number
  ): Promise<void> {
    await this.saveObjectLocally(
      {
        board_id: secondBoardId,
        item_id: secondItemId,
        column_values: resolved,
      },
      `${enrichedFormData.id || 'submission'}_${serviceLabel}_second_board_connect_columns_idx_${idx}`
    );

    await this.savePreObjectLocally(
      {
        board_id: secondBoardId,
        item_id: secondItemId,
        column_values: resolved,
      },
      `${enrichedFormData.id || 'submission'}_${serviceLabel}_second_board_second_send_predat-idx_${idx}`
    );
  }
}

