import fs from 'fs';
import path from 'path';
import { DataSource, Repository } from 'typeorm';
import { buildSafePath, sanitizeFilename } from '../utils/pathSecurity';
import { AppDataSource } from '../config/database';
import type { SubitemData } from '../dto/MondayFormMappingDto';
import {
  FormSubmissionData,
  DISPARO_CRM_BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING,
  MARKETING_BOARD_FORM_MAPPING,
  MondayColumnType,
  MondayFormMapping
} from '../dto/MondayFormMappingDto';
import { ChannelSchedule } from '../entities/ChannelSchedule';
import { MondayBoard } from '../entities/MondayBoard';
import { MondayItem } from '../entities/MondayItem';
import { Subscriber } from '../entities/Subscriber';
import { mapFormSubmissionToMondayData } from '../utils/mondayFieldMappings';
import { ChannelScheduleService } from './ChannelScheduleService';
import { MondayService } from './MondayService';
import { getValueByPath } from '../utils/objectHelpers';
import { convertDateFormat } from '../utils/dateFormatters';

export class DisparoCRMBriefingMateriaisCriativosGamService {
  private readonly mondayService: MondayService;
  private readonly channelScheduleService?: ChannelScheduleService;
  private readonly subscriberRepository: Repository<Subscriber>;
  private readonly mondayItemRepository: Repository<MondayItem>;
  private readonly mondayBoardRepository: Repository<MondayBoard>;
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
    this.mondayService = new MondayService();
    this.subscriberRepository = AppDataSource.getRepository(Subscriber);
    this.mondayItemRepository = AppDataSource.getRepository(MondayItem);
    this.mondayBoardRepository = AppDataSource.getRepository(MondayBoard);
    this.channelScheduleRepository = AppDataSource.getRepository(ChannelSchedule);
    if (dataSource) {
      this.channelScheduleService = new ChannelScheduleService(dataSource);
    }
  }

  /**
   * Valida campos condicionais baseados nas regras de negócio do Briefing de Materiais Criativos
   */
  private validateSpecificFields(data: Record<string, any>): void {
    const errors: string[] = [];

    // Validação baseada no Tipo de Briefing (após mapeamentos)
    const briefingType = String(data.sele__o_individual9__1 || data.briefing_type || '').trim().toLowerCase();

    if (briefingType === 'growth/bu/marca' || briefingType === 'growth' || briefingType === 'bu' || briefingType === 'marca') {
      // Growth/BU/Marca: Todos os campos são obrigatórios
      this.validateGrowthBUMarcaFields(data, errors);
    } else if (briefingType === 'conteúdo/redes sociais' || briefingType === 'conteudo' || briefingType === 'redes sociais') {
      // Conteúdo/Redes Sociais: Campos específicos de conteúdo
      this.validateConteudoRedesSociaisFields(data, errors);
    } else if (briefingType === 'validação' || briefingType === 'validacao') {
      // Validação: Apenas campos básicos + links de validação
      this.validateValidacaoFields(data, errors);
    }

    // Validação de Tipo de Entrega: Se selecionado, campos numéricos correspondentes são obrigatórios
    this.validateTipoEntregaFields(data, errors);

    // Se houver erros, lançar exceção
    if (errors.length > 0) {
      throw new Error(`Validação de campos condicionais falhou:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validações para Growth/BU/Marca: todos os campos são obrigatórios
   */
  private validateGrowthBUMarcaFields(data: Record<string, any>, errors: string[]): void {
    const requiredFields = [
      { key: 'briefing_requesting_area', name: 'Área Solicitante' },
      { key: 'long_text_mksehp7a', name: 'Contexto da Comunicação' },
      { key: 'sele__o_m_ltipla__1', name: 'Objetivo Principal da Comunicação' },
      { key: 'sele__o_m_ltipla1__1', name: 'Ação Esperada' },
      { key: 'texto_curto23__1', name: 'Chamada para ação (CTA)' },
      { key: 'texto_curto8__1', name: 'Obrigatoriedades' },
      { key: 'data__1', name: 'Data de entrega desejada' },
      { key: 'lista_suspensa__1', name: 'Benefício do Produto' },
      { key: 'lista_suspensa9__1', name: 'Gatilho mental' },
      { key: 'sele__o_m_ltipla18__1', name: 'Tipo de Entrega' }
    ];

    for (const field of requiredFields) {
      if (!data[field.key] || String(data[field.key]).trim() === '') {
        errors.push(`Campo "${field.name}" é obrigatório para briefings do tipo Growth/BU/Marca`);
      }
    }
  }

  /**
   * Validações para Conteúdo/Redes Sociais: campos específicos de conteúdo
   */
  private validateConteudoRedesSociaisFields(data: Record<string, any>, errors: string[]): void {
    const requiredFields = [
      { key: 'text_mksn5est', name: 'Hero' },
      { key: 'text_mksns2p1', name: 'Tensão/Oportunidade' },
      { key: 'long_text_mksn15gd', name: 'Posicionamento e mensagem Principal' },
      { key: 'long_text_mksehp7a', name: 'Contexto da Comunicação' },
      { key: 'sele__o_m_ltipla__1', name: 'Objetivo Principal da Comunicação' },
      { key: 'sele__o_m_ltipla1__1', name: 'Ação Esperada' },
      { key: 'texto_curto23__1', name: 'Chamada para ação (CTA)' },
      { key: 'texto_curto8__1', name: 'Obrigatoriedades' },
      { key: 'data__1', name: 'Data de entrega desejada' },
      { key: 'lista_suspensa__1', name: 'Benefício do Produto' },
      { key: 'lista_suspensa9__1', name: 'Gatilho mental' },
      { key: 'sele__o_m_ltipla18__1', name: 'Tipo de Entrega' }
    ];

    for (const field of requiredFields) {
      if (!data[field.key] || String(data[field.key]).trim() === '') {
        errors.push(`Campo "${field.name}" é obrigatório para briefings do tipo Conteúdo/Redes Sociais`);
      }
    }
  }

  /**
   * Validações para Validação: apenas campos básicos + links de validação
   */
  private validateValidacaoFields(data: Record<string, any>, errors: string[]): void {
    const requiredFields = [
      { key: 'long_text_mksehp7a', name: 'Contexto da Comunicação' },
      { key: 'sele__o_m_ltipla18__1', name: 'Tipo de Entrega' },
      { key: 'long_text_mkrd6mnt', name: 'Links úteis para validação' }
    ];

    for (const field of requiredFields) {
      if (!data[field.key] || String(data[field.key]).trim() === '') {
        errors.push(`Campo "${field.name}" é obrigatório para briefings do tipo Validação`);
      }
    }
  }

  /**
   * Validações para Tipo de Entrega: campos numéricos correspondentes devem ser preenchidos
   */
  private validateTipoEntregaFields(data: Record<string, any>, errors: string[]): void {
    const tipoEntrega = data['sele__o_m_ltipla18__1'];
    if (!tipoEntrega) return;

    const entregas = Array.isArray(tipoEntrega) ? tipoEntrega : [tipoEntrega];
    
    // Mapeamento entre tipos de entrega e campos numéricos obrigatórios
    const entregaMappings: Record<string, { field: string, name: string }> = {
      'Anúncio | Revista | Impresso': { field: 'n_meros8__1', name: 'Número de peças Anúncio | Revista | Impresso' },
      'Banner | Home': { field: 'n_meros077__1', name: 'Número de peças Banner | Home' },
      'Banner | Store': { field: 'n_meros5__1', name: 'Número de peças Banner | Store' },
      'Banner DM': { field: 'n_meros_mkn5hh88', name: 'Número de peças Banner DM' },
      'Banner Notificação': { field: 'n_meros_mkn5w9c', name: 'Número de peças Banner Notificação' },
      'Banner Pix': { field: 'n_meros_mkn5pst6', name: 'Número de peças Banner Pix' },
      'Webview': { field: 'n_meros37__1', name: 'Número de peças Webview' },
      'WhatsApp Carrossel': { field: 'numeric_mkqqwthm', name: 'Número de peças WhatsApp Carrossel' },
      'Lojas de App': { field: 'n_meros__1', name: 'Número de peças Lojas de App' },
      'Push': { field: 'n_meros9__1', name: 'Número de peças Push' },
      'SMS': { field: 'n_meros43__1', name: 'Número de peças SMS' },
      'E-mail MKT': { field: 'n_meros1__1', name: 'Número de peças E-mail MKT' },
      'Vídeo': { field: 'n_meros4__1', name: 'Número de peças Vídeo' },
      'In-App': { field: 'n_meros47__1', name: 'Número de peças In-App' },
      'RCS': { field: 'n_meros_mkn59dj1', name: 'Número de peças RCS' },
      'Conteúdo | Instagram | Feed Estático': { field: 'n_meros800__1', name: 'Número de peças Conteúdo | Instagram | Feed Estático' },
      'Conteúdo | Instagram | Vídeo Reels': { field: 'n_meros80__1', name: 'Número de peças Conteúdo | Instagram | Vídeo Reels' },
      'Conteúdo | Twitter | Vídeo Feed': { field: 'n_meros0__1', name: 'Número de peças Conteúdo | Twitter | Vídeo Feed' },
      'Post animado': { field: 'n_meros7__1', name: 'Número de peças Post animado' },
      'Post estático': { field: 'n_meros92__1', name: 'Número de peças Post estático' },
      'Slide-up': { field: 'n_meros32__1', name: 'Número de peças Slide-up' },
      'Subjects': { field: 'n_meros44__1', name: 'Número de peças Subjects' },
      'Validação de entrega para parceiro': { field: 'n_meros02__1', name: 'Número de peças Validação de entrega para parceiro' },
      'Lâminas de WhatsApp': { field: 'n_meros94__1', name: 'Número de peças Lâminas de WhatsApp' },
      'Mídia Kit': { field: 'n_meros6__1', name: 'Número de peças Mídia Kit' }
    };

    for (const entrega of entregas) {
      const entregaStr = String(entrega).trim();
      const mapping = entregaMappings[entregaStr];
      
      if (mapping) {
        const value = data[mapping.field];
        if (!value || Number.isNaN(Number(value)) || Number(value) <= 0) {
          errors.push(`Campo "${mapping.name}" é obrigatório e deve ser um número maior que zero quando "${entregaStr}" é selecionado`);
        }
      }

      // Validação especial para Webview (precisa também do Deep Link)
      if (entregaStr === 'Webview') {
        if (!data['text_mkrtbysb'] || String(data['text_mkrtbysb']).trim() === '') {
          errors.push('Campo "Deep Link" é obrigatório quando "Webview" é selecionado');
        }
      }
    }
  }

  private isDev(): boolean {
    return String(process.env.NODE_ENV || '').toLowerCase() === 'development';
  }

  // Removido: toda a lógica de envio para o segundo board (7463706726)

  /** Salva objeto genérico em arquivo JSON (antes do envio ao Monday) */
  private async saveObjectLocally(
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

  /** Salva arquivo na pasta data/pre-data com o JSON de submissão (pré-envio) */
  private async savePreObjectLocally(
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
   * Processa uma submissão de formulário e cria um item na Monday.com
   * @param formData Dados do formulário recebidos
   * @param mapping Configuração de mapeamento (opcional, usa padrão se não fornecido)
   * @returns ID do item criado na Monday.com
   */
  async processDisparoCRMBriefingGamSubmission(
    formData: FormSubmissionData, 
    mapping: MondayFormMapping = DISPARO_CRM_BRIEFING_MATERIAIS_CRIATIVOS_GAM_FORM_MAPPING
  ): Promise<string> {
    try {
      console.log('Processando submissão de formulário GAM:', formData.id);

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
      console.error('Erro ao processar submissão do formulário GAM:', error);
      throw new Error(`Falha ao criar item na Monday.com para GAM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    console.log('Enviando Disparo CRM + Briefing + GAM para o board de marketing (Fluxo de MKT)...');
    
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
      await this.savePreObjectLocally(marketingPreData, `${enrichedFormData.id || 'submission'}_crm_briefing_gam_marketing_board_predata`);
    } catch (e) {
      console.warn('Falha ao gerar/salvar pre-data do board de marketing CRM+Briefing+GAM:', e);
    }
    
    // Criar o item no board de marketing (primeira criação)
    const marketingItemId = await this.createMondayItem(
      MARKETING_BOARD_FORM_MAPPING.board_id,
      MARKETING_BOARD_FORM_MAPPING.group_id,
      itemName,
      marketingBaseColumns
    );
    
    console.log(`Board de marketing CRM+Briefing+GAM: item criado com ID ${marketingItemId} (primeiro envio).`);
    
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
          `${enrichedFormData.id || 'submission'}_crm_briefing_gam_marketing_board_connect_columns`
        );
        
        // Também salvar como PRE-DATA do segundo envio do board de marketing
        await this.savePreObjectLocally(
          {
            board_id: MARKETING_BOARD_FORM_MAPPING.board_id,
            item_id: marketingItemId,
            column_values: resolvedConnectColumns,
          },
          `${enrichedFormData.id || 'submission'}_crm_briefing_gam_marketing_board_second_send_predata`
        );
        
        // Enviar atualização de múltiplas colunas (segundo envio)
        await this.mondayService.changeMultipleColumnValues(
          MARKETING_BOARD_FORM_MAPPING.board_id,
          marketingItemId,
          resolvedConnectColumns
        );
        
        console.log(`Board de marketing CRM+Briefing+GAM: colunas conectar_quadros* atualizadas para item ${marketingItemId} (segundo envio).`);
      }
    } catch (e) {
      console.error('Falha ao atualizar colunas conectar_quadros no board de marketing CRM+Briefing+GAM:', e);
    }
    
    console.log(`Conexão estabelecida: Board Marketing CRM+Briefing+GAM (${marketingItemId}) → Board Principal (${mainBoardItemId})`);
    
    return marketingItemId;
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
            board_id: DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
            item_name: itemNameSecond,
            column_values: baseColumns,
          },
          `${enrichedFormData.id || 'submission'}_gam_second_board_predat-idx_${idx}`
        );
      } catch (e) {
        console.warn('Falha ao gerar/salvar pre-data do segundo board GAM (subitem):', e);
      }

      // Criação do item
      const secondItemId = await this.createMondayItem(
        DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
        DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_GROUP_ID,
        itemNameSecond || fallbackItemName,
        baseColumns
      );
  console.log(`Segundo board GAM: item criado para subitem ${idx} com ID ${secondItemId} (primeiro envio).`);

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
              board_id: DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_gam_second_board_connect_columns_idx_${idx}`
          );

          await this.savePreObjectLocally(
            {
              board_id: DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
              item_id: secondItemId,
              column_values: resolved,
            },
            `${enrichedFormData.id || 'submission'}_gam_second_board_second_send_predat-idx_${idx}`
          );

          await this.mondayService.changeMultipleColumnValues(
            DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_ID,
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
    const yyyymmdd = dataDisparoTexto || this.toYYYYMMDD(d["data__1"]);
    
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
    
    const values: string[] = [];
    for (const field of textFields) {
      const textVal = String(d[field] ?? "").trim();
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
    // Canal - PRIORIZA o canal do subitem (conectar_quadros87__1) ao invés do campo do formulário principal
    const canalDoSubitem = String(subitem.conectar_quadros87__1 ?? '').trim();
    const canalDoFormulario = String(enrichedFormData.data['text_mkvhgbp8'] ?? '').trim();
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
    for (const k of DisparoCRMBriefingMateriaisCriativosGamService.GAM_SECOND_BOARD_CONNECT_COLUMNS) {
      if (connectColumnsRaw[k] !== undefined) filtered[k] = connectColumnsRaw[k];
    }
    return filtered;
  }  

  /**
   * Separa colunas que iniciam com "conectar_quadros" das demais
   */
  private splitConnectBoardColumns(all: Record<string, any>): { baseColumns: Record<string, any>; connectColumnsRaw: Record<string, any> } {
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
  private async resolveConnectBoardColumns(connectColumnsRaw: Record<string, any>): Promise<Record<string, any>> {
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
  private async findMondayItemBySearchTerm(term: string): Promise<MondayItem | null> {
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


  private async getCodeByItemName(name: string, boardId?: string): Promise<string | undefined> {
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
  private normalizeToStringArray(v: any): string[] {
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
  private async adjustSubitemsCapacity(subitems: SubitemData[], formData?: FormSubmissionData): Promise<SubitemData[]> {
    // Extrair área solicitante do formData
    const areaSolicitante = formData?.data?.gam_requesting_area 
      || formData?.data?.requesting_area 
      || formData?.data?.area_solicitante;

    // Carrega slots de horários ativos, ordenados por nome ASC
    const activeTimeSlots = await this.mondayItemRepository.find({
      where: { board_id: DisparoCRMBriefingMateriaisCriativosGamService.TIME_SLOTS_BOARD_ID, status: 'Ativo' },
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

  /** Salva o payload modificado em arquivo JSON local antes de submeter à Monday */
  private async savePayloadLocally(payload: FormSubmissionData): Promise<void> {
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
   * Extrai o nome do item baseado na configuração de mapeamento
   */
  private extractItemName(formData: FormSubmissionData, mapping: MondayFormMapping): string {
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
   * Constrói o objeto column_values para a mutation da Monday.com
   */
  private async buildColumnValues(formData: FormSubmissionData, mapping: MondayFormMapping): Promise<Record<string, any>> {
    const columnValues: Record<string, any> = {};

    // Campos excluídos da submissão para Monday.com
    const excludedFields = [
      'formTitle', 'id', 'timestamp', '__SUBITEMS__', 'pessoas5__1',
      // Excluir campos GAM originais que serão mapeados via column_mappings
      'gam_start_date', 'gam_end_date', 'gam_client_type', 'gam_campaign_type',
      'gam_mechanism', 'gam_requesting_area', 'gam_target_segment', 'gam_product_service',
      'gam_objective', 'gam_format_type', 'gam_campaign_type_specific', 'gam_banner_links',
      'gam_audience_format', 'gam_channels', 'gam_observations', 'gam_other_campaign_type',
      'gam_dispatch_type', 'enviar_arquivo__1', 'arquivos'
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
   * Determina o tipo de coluna baseado no nome do campo
   */
  private getColumnType(fieldName: string): MondayColumnType {
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
  private formatValueForMondayColumn(value: any, columnType: MondayColumnType): any {
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
  private formatDateValue(value: any): any {
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
  private formatTagsValue(value: any): any {
    if (Array.isArray(value)) {
      return { tag_ids: value };
    }
    return { tag_ids: [value] };
  }

  /**
   * Formata valores de board relation para Monday.com
   */
  private formatBoardRelationValue(value: any): any {
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
   * Busca monday_items por name == text_mkvhvcw4 (Área Solicitante) e converte team (ids) para personsAndTeams com kind: 'team'
   */
  private async buildPeopleFromLookupObjetivo(data: Record<string, any> | undefined): Promise<{ personsAndTeams: { id: string; kind: 'team' }[] } | undefined> {
    try {
      const areaSolicitante = String(data?.["text_mkvhvcw4"] ?? '').trim();
      if (!areaSolicitante) return undefined;
      const item = await this.mondayItemRepository.findOne({ where: { name: areaSolicitante } });
      const ids = (item?.team ?? []).map((id) => String(id)).filter((s) => s.trim().length > 0);
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
  private async resolvePeopleFromSubscribers(value: any): Promise<{ personsAndTeams: { id: string; kind: 'person' }[] } | undefined> {
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
   * Constrói o valor do campo text_mkr3znn0 usando os novos campos de texto text_mkvh*
   * {Data do Disparo Texto} - id-<abc123qerty> - text_mkvhz8g3 - text_mkvhedf5 - text_mkvhqgvn -
   * text_mkvhv5ma - text_mkvhvcw4 - text_mkvh2z7j - text_mkvhwyzr - text_mkvhgbp8 - text_mkvhammc - name
   */
  private async buildCompositeTextField(formData: FormSubmissionData, itemId?: string): Promise<string> {
    const d = formData?.data ?? {};

    // Buscar a Data do Disparo Texto do campo text_mkr3n64h (que já contém o formato YYYYMMDD)
    const dataDisparoTexto = String(d["text_mkr3n64h"] ?? "").trim();

    // Se não encontrar em text_mkr3n64h, usar data__1 convertida
    const yyyymmdd = dataDisparoTexto || this.toYYYYMMDD(d["data__1"]);

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

  /**
   * Cria um item na Monday.com usando GraphQL mutation
   */
  private async createMondayItem(
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
  private formatStatusValue(value: any): any {
    const statusValue = String(value).trim();

    // Se é um número (ID/index), usar index
    if (/^\d+$/.test(statusValue)) {
      return { index: Number.parseInt(statusValue, 10) };
    }

    // Se é texto, usar label (Monday tentará resolver)
    return { label: statusValue };
  }

  /**
   * Formata valores de DROPDOWN com lógica inteligente:
   * - Se é um número (ID), converte para number
   * - Se é texto, mantém como string para Monday resolver
   */
  /**
   * Formata valores de DROPDOWN seguindo a API Monday.com:
   * - Se todos são números (IDs) → {"ids": [1, 2, 3]}
   * - Se algum é texto → {"labels": ["Alta", "Texto"]}
   */
  private formatDropdownValue(value: any): any {
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
  private async processFileUpload(itemId: string, _boardId: string, formData: FormSubmissionData): Promise<void> {
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
