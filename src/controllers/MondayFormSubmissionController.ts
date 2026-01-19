import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { DisparoCRMBriefingMateriaisCriativosService } from '../services/DisparoCRMBriefingMateriaisCriativos';
import { FormSubmissionData } from '../dto/MondayFormMappingDto';
import { NewBriefingMateriaisCriativosService } from '../services/NewBriefingMateriaisCriativosService';
import { NewCampaignGAMService } from '../services/processNewCampaignGAMService';
import { NewCRMService } from '../services/processNewCRM';
import { BriefingMateriaisCriativosGamService } from '../services/BriefingMateriaisCriativosGam';
import { DisparoCRMBriefingMateriaisCriativosGamService } from '../services/DisparoCRMBriefingMateriaisCriativosGam';

// Tipos de formulário suportados
enum FormType {
  NOVO_DISPARO_CRM = 'Novo Disparo CRM',
  NOVA_CAMPANHA_GAM = 'Nova Campanha GAM',
  BRIEFING_MATERIAIS_CRIATIVOS = 'Briefing de Materiais Criativos',
  DISPARO_CRM_COM_BRIEFING = 'Disparo CRM com Briefing de Materiais Criativos',
  BRIEFING_COM_CAMPANHA_GAM = 'Briefing de Materiais Criativos + Campanha GAM',
  BRIEFING_DISPARO_CAMPANHA = 'Briefing de Materiais Criativos + Disparo CRM + Campanha GAM'
}

export class MondayFormSubmissionController {
  private readonly newCRMService: NewCRMService;
  private readonly newCampaignGAMService: NewCampaignGAMService;
  private readonly newBriefingMateriaisCriativosService: NewBriefingMateriaisCriativosService;
  private readonly disparoCRMBriefingService: DisparoCRMBriefingMateriaisCriativosService;
  private readonly briefingGAMService: BriefingMateriaisCriativosGamService;
  private readonly disparoCRMBriefingGAMService: DisparoCRMBriefingMateriaisCriativosGamService;

  constructor() {
    this.newCRMService = new NewCRMService(AppDataSource);
    this.newCampaignGAMService = new NewCampaignGAMService(AppDataSource);
    this.newBriefingMateriaisCriativosService = new NewBriefingMateriaisCriativosService();
    this.disparoCRMBriefingService = new DisparoCRMBriefingMateriaisCriativosService(AppDataSource);
    this.briefingGAMService = new BriefingMateriaisCriativosGamService(AppDataSource);
    this.disparoCRMBriefingGAMService = new DisparoCRMBriefingMateriaisCriativosGamService(AppDataSource);
  }

  /**
   * Identifica o tipo de formulário baseado no campo label__1
   */
  private getFormType(data: any): FormType | null {
    const label = data?.label__1;
    if (!label || typeof label !== 'string') {
      return null;
    }

    // Verificar se o valor corresponde a um dos tipos suportados
    const formTypeValues = Object.values(FormType) as string[];
    if (formTypeValues.includes(label)) {
      return label as FormType;
    }

    return null;
  }

  /**
   * Processa o formulário baseado no seu tipo
   */
  private async processFormByType(formData: FormSubmissionData, formType: FormType): Promise<string> {
    switch (formType) {
      case FormType.NOVO_DISPARO_CRM:
        return await this.newCRMService.processFormSubmission(formData);
      
      case FormType.DISPARO_CRM_COM_BRIEFING:
        return await this.disparoCRMBriefingService.processFormSubmission(formData);
      
      case FormType.NOVA_CAMPANHA_GAM:
        return await this.newCampaignGAMService.processCampaignGAMSubmission(formData);
      
      case FormType.BRIEFING_MATERIAIS_CRIATIVOS:
        return await this.newBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission(formData);
      
      case FormType.BRIEFING_COM_CAMPANHA_GAM:
        return await this.briefingGAMService.processBriefingGamSubmission(formData);
      
      case FormType.BRIEFING_DISPARO_CAMPANHA:
        return await this.disparoCRMBriefingGAMService.processDisparoCRMBriefingGamSubmission(formData);
      
      default:
        throw new Error(`Tipo de formulário '${formType}' não reconhecido`);
    }
  }

  /**
   * Recebe dados do formulário e cria item na Monday.com
   * POST /api/v1/monday/form-submission
   */
  async createFromFormSubmission(req: Request, res: Response): Promise<void> {
    try {
      const incoming: any = req.body;

      // Normaliza o payload para aceitar tanto { data: {...} } quanto { id, timestamp, formTitle, data }
      const formData: FormSubmissionData = {
        id: incoming?.id || `form_${Date.now()}`,
        timestamp: incoming?.timestamp || new Date().toISOString(),
        formTitle: incoming?.formTitle || 'Form Submission',
        data: incoming?.data && typeof incoming.data === 'object' ? incoming.data : incoming
      };

      // Validação mínima: precisa ter objeto data
      if (!formData?.data || typeof formData.data !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Dados do formulário inválidos: campo "data" ausente ou inválido.'
        });
        return;
      }

      // Identificar tipo de formulário baseado no campo label__1
      const formType = this.getFormType(formData.data);
      
      if (!formType) {
        res.status(400).json({
          success: false,
          error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
          supported_types: Object.values(FormType)
        });
        return;
      }

      const mondayItemId = await this.processFormByType(formData, formType);

      // Responder imediatamente
      res.status(202).json({
        success: true,
        message: 'Submissão concluída com sucesso. Processamento em andamento.',
        monday_item_id: mondayItemId,
        form_id: formData.id,
        form_type: formType
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao processar formulário',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Endpoint para testar a conexão com Monday API
   * POST /api/v1/monday/form-submission/test-connection
   */
  async testMondayConnection(_req: Request, res: Response): Promise<void> {
    try {
      // Teste simples de conexão
      const testQuery = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      console.log('Testando conexão com Monday API...');
      const response = await this.newCampaignGAMService['mondayService'].makeGraphQLRequest(testQuery);
      
      res.status(200).json({
        success: true,
        message: "Conexão com Monday API funcionando",
        data: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro na conexão com Monday API:', error);
      res.status(500).json({
        success: false,
        error: "Falha na conexão com Monday API",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Endpoint para testar briefing de materiais criativos com dados de exemplo
   * POST /api/v1/monday/form-submission/test-briefing
   * 
   * Cenários suportados:
   * - Houston (Validation): gam_audience_format = "Houston (Validation)"
   * - Houston (Query): gam_audience_format = "Houston (Query)"
   * - Outros formatos: outros valores em gam_audience_format
   */
  async testBriefingMateriaisCriativosSubmission(_req: Request, res: Response): Promise<void> {
    try {
      // Dados de exemplo para teste de briefing com Houston (Validation)
      // Para testar Houston (Query), altere gam_audience_format para "Houston (Query)"
      // e inclua os campos: gam_houston_audience_name, gam_houston_validation_print, etc.
      const testFormData: FormSubmissionData = {
        id: "test_briefing_" + Date.now(),
        timestamp: new Date().toISOString(),
        formTitle: "Teste de Integração Briefing de Materiais Criativos Monday.com",
        data: {
          // Campos obrigatórios
          name: "Briefing de Materiais Criativos - Campanha Black Friday 2025",
          pessoas5__1: "designer@example.com", // Demandante
          label__1: "Briefing de Materiais Criativos", // Tipo de solicitação
          briefing_requesting_area: "Marketing Digital", // Área solicitante
          briefing_type: "Banner Display", // Tipo de briefing
          
          // Campos adicionais para completar o briefing
          briefing_description: "Criação de materiais criativos para campanha Black Friday 2025",
          briefing_objective: "Aumentar conversões e engajamento",
          briefing_target_audience: "Jovens 18-35 anos, interessados em tecnologia",
          briefing_observations: "Briefing de teste para validação da integração",
          
          // Campos condicionais para GAM
          gam_campaign_type_specific: ["Display", "Mobile", "Outro"], // Tipo de campanha GAM (múltiplos)
          gam_other_campaign_type: "Campanha Programática Avançada", // Outro tipo (obrigatório se "Outro" selecionado)
          gam_audience_format: "Houston (Validation)", // Formato para receber audiência
          
          // Campos condicionais para Houston (Validation)
          gam_houston_validation_name: "Validation Black Friday 2025", // Nome da validation
          gam_houston_channels: "Display, Mobile, Video", // Canais GAM
          gam_houston_observations: "Validação para campanha Black Friday", // Observações
          
          // Campos condicionais para Houston (Query) - não preenchidos pois escolhemos Validation
          // gam_houston_audience_name: "Audience Black Friday 2025",
          // gam_houston_validation_print: "file_id_123456", // ID do arquivo
          // gam_houston_query_channels: "Display, Mobile",
          // gam_houston_query_observations: "Query para campanha Black Friday",
          
          // Campos adicionais para compatibilidade
          lookup_mkrt36cj: "Marketing Digital"
        }
      };

      console.log('Iniciando teste Briefing com dados:', JSON.stringify(testFormData, null, 2));

      const mondayItemId = await this.newBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission(testFormData);

      res.status(201).json({
        success: true,
        message: 'Teste Briefing de Materiais Criativos executado com sucesso',
        test_data: testFormData,
        monday_item_id: mondayItemId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro no teste Briefing:', error);
      res.status(500).json({
        success: false,
        error: "Erro no teste de integração Briefing de Materiais Criativos",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }


  /**
   * Endpoint para testar o GAM com dados de exemplo
   * POST /api/v1/monday/form-submission/test-gam
   */
  async testGAMSubmission(_req: Request, res: Response): Promise<void> {
    try {
      // Dados de exemplo para teste GAM com todos os campos obrigatórios
      const testFormData: FormSubmissionData = {
        id: "test_gam_" + Date.now(),
        timestamp: new Date().toISOString(),
        formTitle: "Teste de Integração GAM Monday.com",
        data: {
          // Campos obrigatórios
          name: "Campanha GAM de Teste - Black Friday 2025",
          pessoas5__1: "test@example.com", // Demandante
          label__1: "Nova Campanha GAM", // Tipo de solicitação
          gam_start_date: "2025-11-01", // Data início (cronograma)
          gam_end_date: "2025-11-30", // Data fim (cronograma)
          gam_client_type: "Cliente Premium", // Tipo cliente
          gam_campaign_type: "Campanha Promocional", // Tipo da campanha
          gam_mechanism: "Desconto Progressivo", // Mecânica da campanha
          gam_requesting_area: "Marketing Digital", // Área solicitante
          gam_target_segment: "Jovens 18-35", // Segmento de público
          gam_product_service: "Cartão de Crédito", // Produto ou serviço
          gam_objective: "Aumentar conversões", // Objetivo da campanha
          gam_format_type: "Banner Display", // Tipo de formato
          gam_campaign_type_specific: "Campanha GAM Programática", // Tipo de campanha GAM
          gam_banner_links: "https://example.com/banner1,https://example.com/banner2", // Links direcionamento
          gam_audience_format: "Lista segmentada por interesse", // Formato audiência
          gam_channels: "Display, Mobile, Video", // Canais GAM
          gam_observations: "Campanha de teste para validação da integração", // Observações
          
          // Campos adicionais para compatibilidade
          data__1: "2025-11-01", // Data padrão
          lookup_mkrtaebd: "Cliente Premium",
          lookup_mkrt66aq: "Campanha Promocional",
          lookup_mkrta7z1: "Desconto Progressivo",
          lookup_mkrt36cj: "Marketing Digital",
          lookup_mkrtwq7k: "Aumentar conversões",
          lookup_mkrtvsdj: "Cartão de Crédito",
          lookup_mkrtcctn: "Display, Mobile, Video",
          lookup_mkrtxgmt: "Jovens 18-35"
        }
      };

      console.log('Iniciando teste GAM com dados:', JSON.stringify(testFormData, null, 2));

      const mondayItemId = await this.newCampaignGAMService.processCampaignGAMSubmission(testFormData);

      res.status(201).json({
        success: true,
        message: 'Teste GAM executado com sucesso',
        test_data: testFormData,
        monday_item_id: mondayItemId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro no teste GAM:', error);
      res.status(500).json({
        success: false,
        error: 'Erro no teste de integração GAM',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Endpoint para testar o mapeamento com dados de exemplo
   * POST /api/v1/monday/form-submission/test
   */
  async testFormSubmission(_req: Request, res: Response): Promise<void> {
    try {
      // Dados de exemplo para teste
      const testFormData: FormSubmissionData = {
        id: "test_" + Date.now(),
        timestamp: new Date().toISOString(),
        formTitle: "Teste de Integração Monday.com",
        data: {
          name: "Campanha de Teste",
          label__1: "Novo Disparo CRM",
          conectar_quadros75__1: "Email",
          date_mkr6nj1f: "2025-08-15",
          n_mero__1: 3,
          __SUBITEMS__: [
            {
              id: "email_001",
              canal: "Email",
              dataDisparo: "2025-08-15",
              ordemCanal: 1,
              descricao: "Email de boas-vindas",
              beneficio: "Desconto 10%",
              gatilho: ["Autoridade", "Escassez"],
              horaDisparo: "09:00",
              volumeDisparo: 5000
            },
            {
              id: "push_002", 
              canal: "Push",
              dataDisparo: "2025-08-16",
              ordemCanal: 2,
              descricao: "Lembrete de oferta",
              beneficio: "Frete grátis",
              gatilho: ["Urgência"],
              horaDisparo: "14:00",
              volumeDisparo: 3000
            }
          ]
        }
      };

  const mondayItemId = await this.newCRMService.processFormSubmission(testFormData);

      res.status(201).json({
        success: true,
        message: 'Teste executado com sucesso',
        test_data: testFormData,
        monday_item_id: mondayItemId,
  subitem_ids: []
      });

    } catch (error) {
      console.error('Erro no teste de formulário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro no teste de integração',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
