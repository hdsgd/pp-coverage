import fs from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormSubmissionData, MondayColumnType, MondayFormMapping, MARKETING_BOARD_FORM_MAPPING } from '../dto/MondayFormMappingDto';
import { MondayItem } from '../entities/MondayItem';
import { MondayBoard } from '../entities/MondayBoard';
import { Subscriber } from '../entities/Subscriber';
import { MondayService } from './MondayService';
import { buildSafePath, sanitizeFilename } from '../utils/pathSecurity';
import { getValueByPath } from '../utils/objectHelpers';
import { BriefingValidator } from '../utils/briefingValidator';

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
  protected findClosestSubitemByDate(subitems: any[]): any | null {
    if (!subitems || subitems.length === 0) return null;
    
    const today = this.truncateDate(new Date());
    let closest: any | null = null;
    let minDiff = Infinity;
    
    for (const sub of subitems) {
      const dataStr = sub.data__1;
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
}
