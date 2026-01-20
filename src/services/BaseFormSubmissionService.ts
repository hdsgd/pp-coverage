import fs from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormSubmissionData, MondayColumnType, MondayFormMapping } from '../dto/MondayFormMappingDto';
import { MondayItem } from '../entities/MondayItem';
import { MondayBoard } from '../entities/MondayBoard';
import { Subscriber } from '../entities/Subscriber';
import { MondayService } from './MondayService';
import { buildSafePath, sanitizeFilename } from '../utils/pathSecurity';

export abstract class BaseFormSubmissionService {
  protected readonly mondayService: MondayService;
  protected readonly subscriberRepository: Repository<Subscriber>;
  protected readonly mondayItemRepository: Repository<MondayItem>;
  protected readonly mondayBoardRepository: Repository<MondayBoard>;

  constructor() {
    this.mondayService = new MondayService();
    this.subscriberRepository = AppDataSource.getRepository(Subscriber);
    this.mondayItemRepository = AppDataSource.getRepository(MondayItem);
    this.mondayBoardRepository = AppDataSource.getRepository(MondayBoard);
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
      const name = this.getValueByPath(formData, mapping.item_name_field);
      if (name && typeof name === 'string') {
        return name;
      }
    }

    // Fallback para nome padrão
    return mapping.default_item_name || `Formulário ${formData.id}`;
  }

  /**
   * Obtém valor do objeto usando dot notation (ex: "data.name")
   */
  protected getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current: any, key: string) => {
      return current?.[key];
    }, obj);
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
   * Separa colunas que iniciam com "conectar_quadros" das demais
   */
  protected splitConnectBoardColumns(all: Record<string, any>): { baseColumns: Record<string, any>; connectColumnsRaw: Record<string, any> } {
    const baseColumns: Record<string, any> = {};
    const connectColumnsRaw: Record<string, any> = {};
    for (const [key, val] of Object.entries(all)) {
      if (key.startsWith('conectar_quadros')) {
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
        const ids = (rawVal as any).item_ids.map(String).filter((s: string) => s.trim().length > 0);
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
      const fileName = this.getValueByPath(formData, 'data.enviar_arquivo__1');

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
   * Método abstrato para validações específicas de cada serviço
   */
  protected abstract validateSpecificFields(data: Record<string, any>): void;

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
