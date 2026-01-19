import { Request, Response } from 'express';
import { MondayFormSubmissionController } from '../../src/controllers/MondayFormSubmissionController';
import { NewCRMService } from '../../src/services/processNewCRM';
import { NewCampaignGAMService } from '../../src/services/processNewCampaignGAMService';
import { NewBriefingMateriaisCriativosService } from '../../src/services/NewBriefingMateriaisCriativosService';
import { DisparoCRMBriefingMateriaisCriativosService } from '../../src/services/DisparoCRMBriefingMateriaisCriativos';
import { BriefingMateriaisCriativosGamService } from '../../src/services/BriefingMateriaisCriativosGam';
import { DisparoCRMBriefingMateriaisCriativosGamService } from '../../src/services/DisparoCRMBriefingMateriaisCriativosGam';

// Mock all services
jest.mock('../../src/services/processNewCRM');
jest.mock('../../src/services/processNewCampaignGAMService');
jest.mock('../../src/services/NewBriefingMateriaisCriativosService');
jest.mock('../../src/services/DisparoCRMBriefingMateriaisCriativos');
jest.mock('../../src/services/BriefingMateriaisCriativosGam');
jest.mock('../../src/services/DisparoCRMBriefingMateriaisCriativosGam');

// Mock AppDataSource
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    manager: jest.fn()
  }
}));

describe('MondayFormSubmissionController', () => {
  let controller: MondayFormSubmissionController;
  let mockNewCRMService: jest.Mocked<NewCRMService>;
  let mockNewCampaignGAMService: jest.Mocked<NewCampaignGAMService>;
  let mockNewBriefingMateriaisCriativosService: jest.Mocked<NewBriefingMateriaisCriativosService>;
  let mockDisparoCRMBriefingService: jest.Mocked<DisparoCRMBriefingMateriaisCriativosService>;
  let mockBriefingGAMService: jest.Mocked<BriefingMateriaisCriativosGamService>;
  let mockDisparoCRMBriefingGAMService: jest.Mocked<DisparoCRMBriefingMateriaisCriativosGamService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new MondayFormSubmissionController();

    // Setup service mocks
    mockNewCRMService = (controller as any).newCRMService;
    mockNewCampaignGAMService = (controller as any).newCampaignGAMService;
    mockNewBriefingMateriaisCriativosService = (controller as any).newBriefingMateriaisCriativosService;
    mockDisparoCRMBriefingService = (controller as any).disparoCRMBriefingService;
    mockBriefingGAMService = (controller as any).briefingGAMService;
    mockDisparoCRMBriefingGAMService = (controller as any).disparoCRMBriefingGAMService;

    // Setup request and response mocks
    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createFromFormSubmission', () => {
    it('should process Novo Disparo CRM form successfully', async () => {
      const formData = {
        id: 'form_123',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Test Form',
        data: {
          name: 'Campanha Teste',
          label__1: 'Novo Disparo CRM',
          conectar_quadros75__1: 'Email'
        }
      };

      mockRequest.body = formData;
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_item_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCRMService.processFormSubmission).toHaveBeenCalledWith(formData);
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Submissão concluída com sucesso. Processamento em andamento.',
        monday_item_id: 'monday_item_123',
        form_id: 'form_123',
        form_type: 'Novo Disparo CRM'
      });
    });

    it('should process Nova Campanha GAM form successfully', async () => {
      const formData = {
        id: 'form_456',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'GAM Form',
        data: {
          name: 'Campanha GAM',
          label__1: 'Nova Campanha GAM',
          gam_start_date: '2025-11-01'
        }
      };

      mockRequest.body = formData;
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_gam_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCampaignGAMService.processCampaignGAMSubmission).toHaveBeenCalledWith(formData);
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Submissão concluída com sucesso. Processamento em andamento.',
        monday_item_id: 'monday_gam_123',
        form_id: 'form_456',
        form_type: 'Nova Campanha GAM'
      });
    });

    it('should process Briefing de Materiais Criativos form successfully', async () => {
      const formData = {
        id: 'form_789',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Briefing Form',
        data: {
          name: 'Briefing Teste',
          label__1: 'Briefing de Materiais Criativos',
          briefing_requesting_area: 'Marketing'
        }
      };

      mockRequest.body = formData;
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_briefing_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission).toHaveBeenCalledWith(formData);
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Submissão concluída com sucesso. Processamento em andamento.',
        monday_item_id: 'monday_briefing_123',
        form_id: 'form_789',
        form_type: 'Briefing de Materiais Criativos'
      });
    });

    it('should process Disparo CRM com Briefing form successfully', async () => {
      const formData = {
        data: {
          name: 'Disparo com Briefing',
          label__1: 'Disparo CRM com Briefing de Materiais Criativos'
        }
      };

      mockRequest.body = formData;
      mockDisparoCRMBriefingService.processFormSubmission = jest.fn().mockResolvedValue('monday_disparo_briefing_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockDisparoCRMBriefingService.processFormSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          monday_item_id: 'monday_disparo_briefing_123',
          form_type: 'Disparo CRM com Briefing de Materiais Criativos'
        })
      );
    });

    it('should process Briefing com Campanha GAM form successfully', async () => {
      const formData = {
        data: {
          name: 'Briefing GAM',
          label__1: 'Briefing de Materiais Criativos + Campanha GAM'
        }
      };

      mockRequest.body = formData;
      mockBriefingGAMService.processBriefingGamSubmission = jest.fn().mockResolvedValue('monday_briefing_gam_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockBriefingGAMService.processBriefingGamSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          monday_item_id: 'monday_briefing_gam_123',
          form_type: 'Briefing de Materiais Criativos + Campanha GAM'
        })
      );
    });

    it('should process Briefing Disparo Campanha form successfully', async () => {
      const formData = {
        data: {
          name: 'Briefing Completo',
          label__1: 'Briefing de Materiais Criativos + Disparo CRM + Campanha GAM'
        }
      };

      mockRequest.body = formData;
      mockDisparoCRMBriefingGAMService.processDisparoCRMBriefingGamSubmission = jest.fn().mockResolvedValue('monday_complete_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockDisparoCRMBriefingGAMService.processDisparoCRMBriefingGamSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          monday_item_id: 'monday_complete_123',
          form_type: 'Briefing de Materiais Criativos + Disparo CRM + Campanha GAM'
        })
      );
    });

    it('should normalize payload when data is not wrapped', async () => {
      const formData = {
        name: 'Direct Data',
        label__1: 'Novo Disparo CRM'
      };

      mockRequest.body = formData;
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_normalized_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCRMService.processFormSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          data: formData,
          formTitle: 'Form Submission'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(202);
    });

    it('should generate default values when id and timestamp are missing', async () => {
      const formData = {
        data: {
          name: 'No Metadata',
          label__1: 'Novo Disparo CRM'
        }
      };

      mockRequest.body = formData;
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_default_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCRMService.processFormSubmission.mock.calls[0][0];
      expect(callArgs.id).toMatch(/^form_\d+$/);
      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.formTitle).toBe('Form Submission');
      expect(mockResponse.status).toHaveBeenCalledWith(202);
    });

    it('should return 400 when data field is missing', async () => {
      mockRequest.body = {
        id: 'invalid_form'
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: expect.any(Array)
      });
    });

    it('should return 400 when data field is not an object', async () => {
      mockRequest.body = {
        data: 'invalid_string'
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: expect.any(Array)
      });
    });

    it('should return 400 when data field is null', async () => {
      mockRequest.body = {
        data: null
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: expect.any(Array)
      });
    });

    it('should return 400 when label__1 is missing', async () => {
      mockRequest.body = {
        data: {
          name: 'Missing Label'
        }
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: [
          'Novo Disparo CRM',
          'Nova Campanha GAM',
          'Briefing de Materiais Criativos',
          'Disparo CRM com Briefing de Materiais Criativos',
          'Briefing de Materiais Criativos + Campanha GAM',
          'Briefing de Materiais Criativos + Disparo CRM + Campanha GAM'
        ]
      });
    });

    it('should return 400 when label__1 is not a string', async () => {
      mockRequest.body = {
        data: {
          name: 'Invalid Label Type',
          label__1: 123
        }
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: expect.any(Array)
      });
    });

    it('should return 400 when label__1 has unsupported value', async () => {
      mockRequest.body = {
        data: {
          name: 'Unsupported Type',
          label__1: 'Unknown Form Type'
        }
      };

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tipo de formulário não reconhecido ou campo "label__1" ausente/inválido.',
        supported_types: expect.arrayContaining([
          'Novo Disparo CRM',
          'Nova Campanha GAM'
        ])
      });
    });

    it('should return 500 when service throws an error', async () => {
      mockRequest.body = {
        data: {
          name: 'Error Test',
          label__1: 'Novo Disparo CRM'
        }
      };

      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue(new Error('Service error'));

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno do servidor ao processar formulário',
        details: 'Service error'
      });
    });

    it('should return 500 with unknown error message when error is not Error instance', async () => {
      mockRequest.body = {
        data: {
          name: 'Unknown Error',
          label__1: 'Novo Disparo CRM'
        }
      };

      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue('string error');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno do servidor ao processar formulário',
        details: 'Erro desconhecido'
      });
    });

    it('should handle empty body gracefully', async () => {
      mockRequest.body = undefined;

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Dados do formulário inválidos: campo "data" ausente ou inválido.'
      });
    });

    it('should handle nested data object correctly', async () => {
      const formData = {
        id: 'nested_123',
        timestamp: '2025-12-01T10:00:00.000Z',
        formTitle: 'Nested Form',
        data: {
          name: 'Nested Campaign',
          label__1: 'Novo Disparo CRM',
          nested: {
            value: 'test'
          }
        }
      };

      mockRequest.body = formData;
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_nested_123');

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCRMService.processFormSubmission).toHaveBeenCalledWith(formData);
      expect(mockResponse.status).toHaveBeenCalledWith(202);
    });
  });

  describe('testMondayConnection', () => {
    it('should test Monday API connection successfully', async () => {
      const mockMondayService = {
        makeGraphQLRequest: jest.fn().mockResolvedValue({
          data: {
            me: {
              id: '123',
              name: 'Test User',
              email: 'test@example.com'
            }
          }
        })
      };

      (mockNewCampaignGAMService as any).mondayService = mockMondayService;

      await controller.testMondayConnection(mockRequest as Request, mockResponse as Response);

      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalledWith(
        expect.stringContaining('query')
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Conexão com Monday API funcionando',
        data: {
          me: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com'
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should return 500 when Monday API connection fails', async () => {
      const mockMondayService = {
        makeGraphQLRequest: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      (mockNewCampaignGAMService as any).mondayService = mockMondayService;

      await controller.testMondayConnection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Falha na conexão com Monday API',
        details: 'Connection failed',
        timestamp: expect.any(String)
      });
    });

    it('should handle unknown error from Monday API', async () => {
      const mockMondayService = {
        makeGraphQLRequest: jest.fn().mockRejectedValue('Unknown error')
      };

      (mockNewCampaignGAMService as any).mondayService = mockMondayService;

      await controller.testMondayConnection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Falha na conexão com Monday API',
        details: 'Erro desconhecido',
        timestamp: expect.any(String)
      });
    });

    it('should include timestamp in successful response', async () => {
      const mockMondayService = {
        makeGraphQLRequest: jest.fn().mockResolvedValue({
          data: { me: { id: '1' } }
        })
      };

      (mockNewCampaignGAMService as any).mondayService = mockMondayService;

      await controller.testMondayConnection(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should query correct GraphQL fields', async () => {
      const mockMondayService = {
        makeGraphQLRequest: jest.fn().mockResolvedValue({
          data: { me: {} }
        })
      };

      (mockNewCampaignGAMService as any).mondayService = mockMondayService;

      await controller.testMondayConnection(mockRequest as Request, mockResponse as Response);

      const query = mockMondayService.makeGraphQLRequest.mock.calls[0][0];
      expect(query).toContain('me');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('email');
    });
  });

  describe('testBriefingMateriaisCriativosSubmission', () => {
    it('should test briefing submission successfully', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_test_briefing_123');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Teste Briefing de Materiais Criativos executado com sucesso',
        test_data: expect.objectContaining({
          id: expect.stringMatching(/^test_briefing_\d+$/),
          formTitle: 'Teste de Integração Briefing de Materiais Criativos Monday.com',
          data: expect.objectContaining({
            name: 'Briefing de Materiais Criativos - Campanha Black Friday 2025',
            label__1: 'Briefing de Materiais Criativos'
          })
        }),
        monday_item_id: 'monday_test_briefing_123',
        timestamp: expect.any(String)
      });
    });

    it('should include all required briefing fields in test data', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_123');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission.mock.calls[0][0];
      expect(callArgs.data).toMatchObject({
        name: expect.any(String),
        pessoas5__1: 'designer@example.com',
        label__1: 'Briefing de Materiais Criativos',
        briefing_requesting_area: 'Marketing Digital',
        briefing_type: 'Banner Display',
        briefing_description: expect.any(String),
        briefing_objective: expect.any(String),
        briefing_target_audience: expect.any(String)
      });
    });

    it('should include GAM specific fields in test data', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_123');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission.mock.calls[0][0];
      expect(callArgs.data.gam_campaign_type_specific).toEqual(['Display', 'Mobile', 'Outro']);
      expect(callArgs.data.gam_other_campaign_type).toBe('Campanha Programática Avançada');
      expect(callArgs.data.gam_audience_format).toBe('Houston (Validation)');
    });

    it('should include Houston Validation fields in test data', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_123');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission.mock.calls[0][0];
      expect(callArgs.data.gam_houston_validation_name).toBe('Validation Black Friday 2025');
      expect(callArgs.data.gam_houston_channels).toBe('Display, Mobile, Video');
      expect(callArgs.data.gam_houston_observations).toBe('Validação para campanha Black Friday');
    });

    it('should return 500 when briefing service fails', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockRejectedValue(new Error('Briefing processing failed'));

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração Briefing de Materiais Criativos',
        details: 'Briefing processing failed',
        timestamp: expect.any(String)
      });
    });

    it('should handle unknown error in briefing test', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockRejectedValue('Unknown');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração Briefing de Materiais Criativos',
        details: 'Erro desconhecido',
        timestamp: expect.any(String)
      });
    });

    it('should generate unique test ID with timestamp', async () => {
      mockNewBriefingMateriaisCriativosService.processBriefingMateriaisCriativosSubmission = jest.fn().mockResolvedValue('monday_123');

      await controller.testBriefingMateriaisCriativosSubmission(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.test_data.id).toMatch(/^test_briefing_\d+$/);
    });
  });

  describe('testGAMSubmission', () => {
    it('should test GAM submission successfully', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_test_gam_456');

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCampaignGAMService.processCampaignGAMSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Teste GAM executado com sucesso',
        test_data: expect.objectContaining({
          id: expect.stringMatching(/^test_gam_\d+$/),
          formTitle: 'Teste de Integração GAM Monday.com',
          data: expect.objectContaining({
            name: 'Campanha GAM de Teste - Black Friday 2025',
            label__1: 'Nova Campanha GAM'
          })
        }),
        monday_item_id: 'monday_test_gam_456',
        timestamp: expect.any(String)
      });
    });

    it('should include all required GAM fields in test data', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_456');

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCampaignGAMService.processCampaignGAMSubmission.mock.calls[0][0];
      expect(callArgs.data).toMatchObject({
        name: expect.any(String),
        pessoas5__1: 'test@example.com',
        label__1: 'Nova Campanha GAM',
        gam_start_date: '2025-11-01',
        gam_end_date: '2025-11-30',
        gam_client_type: 'Cliente Premium',
        gam_campaign_type: 'Campanha Promocional',
        gam_mechanism: 'Desconto Progressivo',
        gam_requesting_area: 'Marketing Digital',
        gam_target_segment: 'Jovens 18-35',
        gam_product_service: 'Cartão de Crédito',
        gam_objective: 'Aumentar conversões',
        gam_format_type: 'Banner Display',
        gam_campaign_type_specific: 'Campanha GAM Programática',
        gam_banner_links: expect.any(String),
        gam_audience_format: 'Lista segmentada por interesse',
        gam_channels: 'Display, Mobile, Video',
        gam_observations: expect.any(String)
      });
    });

    it('should include additional compatibility fields in GAM test data', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_456');

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCampaignGAMService.processCampaignGAMSubmission.mock.calls[0][0];
      expect(callArgs.data.data__1).toBe('2025-11-01');
      expect(callArgs.data.lookup_mkrtaebd).toBe('Cliente Premium');
      expect(callArgs.data.lookup_mkrt66aq).toBe('Campanha Promocional');
      expect(callArgs.data.lookup_mkrta7z1).toBe('Desconto Progressivo');
      expect(callArgs.data.lookup_mkrt36cj).toBe('Marketing Digital');
    });

    it('should return 500 when GAM service fails', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockRejectedValue(new Error('GAM processing failed'));

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração GAM',
        details: 'GAM processing failed'
      });
    });

    it('should handle unknown error in GAM test', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockRejectedValue(null);

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração GAM',
        details: 'Erro desconhecido'
      });
    });

    it('should generate unique test ID with timestamp for GAM', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_456');

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.test_data.id).toMatch(/^test_gam_\d+$/);
      expect(jsonCall.test_data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include banner links in GAM test data', async () => {
      mockNewCampaignGAMService.processCampaignGAMSubmission = jest.fn().mockResolvedValue('monday_456');

      await controller.testGAMSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCampaignGAMService.processCampaignGAMSubmission.mock.calls[0][0];
      expect(callArgs.data.gam_banner_links).toContain('https://example.com');
      expect(callArgs.data.gam_banner_links).toContain('banner1');
      expect(callArgs.data.gam_banner_links).toContain('banner2');
    });
  });

  describe('testFormSubmission', () => {
    it('should test form submission successfully', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_test_form_789');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockNewCRMService.processFormSubmission).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Teste executado com sucesso',
        test_data: expect.objectContaining({
          id: expect.stringMatching(/^test_\d+$/),
          formTitle: 'Teste de Integração Monday.com',
          data: expect.objectContaining({
            name: 'Campanha de Teste',
            label__1: 'Novo Disparo CRM'
          })
        }),
        monday_item_id: 'monday_test_form_789',
        subitem_ids: []
      });
    });

    it('should include CRM fields in test data', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_789');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCRMService.processFormSubmission.mock.calls[0][0];
      expect(callArgs.data).toMatchObject({
        name: 'Campanha de Teste',
        label__1: 'Novo Disparo CRM',
        conectar_quadros75__1: 'Email',
        date_mkr6nj1f: '2025-08-15',
        n_mero__1: 3
      });
    });

    it('should include subitems in test data', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_789');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      const callArgs = mockNewCRMService.processFormSubmission.mock.calls[0][0];
      expect(callArgs.data.__SUBITEMS__).toHaveLength(2);
      expect(callArgs.data.__SUBITEMS__![0]).toMatchObject({
        id: 'email_001',
        canal: 'Email',
        dataDisparo: '2025-08-15',
        ordemCanal: 1,
        descricao: 'Email de boas-vindas',
        beneficio: 'Desconto 10%',
        gatilho: ['Autoridade', 'Escassez'],
        horaDisparo: '09:00',
        volumeDisparo: 5000
      });
      expect(callArgs.data.__SUBITEMS__![1]).toMatchObject({
        id: 'push_002',
        canal: 'Push',
        dataDisparo: '2025-08-16',
        ordemCanal: 2,
        descricao: 'Lembrete de oferta',
        beneficio: 'Frete grátis',
        gatilho: ['Urgência'],
        horaDisparo: '14:00',
        volumeDisparo: 3000
      });
    });

    it('should return 500 when CRM service fails', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue(new Error('CRM processing failed'));

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração',
        details: 'CRM processing failed'
      });
    });

    it('should handle unknown error in form test', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue({ message: undefined });

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração',
        details: 'Erro desconhecido'
      });
    });

    it('should generate unique test ID with timestamp for form test', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_789');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.test_data.id).toMatch(/^test_\d+$/);
      expect(jsonCall.test_data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should always return empty subitem_ids array', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockResolvedValue('monday_789');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.subitem_ids).toEqual([]);
    });

    it('should handle non-Error exception in testFormSubmission', async () => {
      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue('string error');

      await controller.testFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no teste de integração',
        details: 'Erro desconhecido'
      });
    });
  });

  // Teste adicional para cobrir branch de erro não-Error no createFromFormSubmission
  describe('Additional error handling coverage', () => {
    it('createFromFormSubmission: deve retornar erro quando tipo de formulário não é reconhecido', async () => {
      const formData = {
        id: 'form_123',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Test Form',
        data: {
          label__1: 'Tipo Desconhecido'
        }
      };

      mockRequest.body = formData;

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });

    it('createFromFormSubmission: deve retornar erro genérico quando exceção não é Error', async () => {
      const formData = {
        id: 'form_123',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Test Form',
        data: {
          label__1: 'Novo Disparo CRM'
        }
      };

      mockRequest.body = formData;
      mockNewCRMService.processFormSubmission = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });

      await controller.createFromFormSubmission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });
});
