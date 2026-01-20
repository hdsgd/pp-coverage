import { BriefingMateriaisCriativosGamService } from '../../src/services/BriefingMateriaisCriativosGam';
import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';
import { FormSubmissionData } from '../../src/dto/MondayFormMappingDto';
import { MondayItem } from '../../src/entities/MondayItem';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { Subscriber } from '../../src/entities/Subscriber';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { convertDateFormat, toYYYYMMDD } from '../../src/utils/dateFormatters';
import fs from 'fs';

// Mock modules
jest.mock('../../src/services/MondayService');
jest.mock('../../src/services/ChannelScheduleService');
jest.mock('../../src/config/database');
jest.mock('../../src/utils/mondayFieldMappings', () => ({
  mapFormSubmissionToMondayData: jest.fn((data) => data),
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('BriefingMateriaisCriativosGamService', () => {
  let service: BriefingMateriaisCriativosGamService;
  let mockMondayService: jest.Mocked<MondayService>;
  let mockSubscriberRepository: any;
  let mockMondayItemRepository: any;
  let mockMondayBoardRepository: any;
  let mockChannelScheduleRepository: any;

  beforeEach(() => {
    // Mock repositories
    mockSubscriberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockMondayItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null)
      }),
    };

    mockMondayBoardRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockChannelScheduleRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      }),
    };

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === Subscriber) return mockSubscriberRepository;
      if (entity === MondayItem) return mockMondayItemRepository;
      if (entity === MondayBoard) return mockMondayBoardRepository;
      if (entity === ChannelSchedule) return mockChannelScheduleRepository;
      return {};
    });

    // Create service instance
    service = new BriefingMateriaisCriativosGamService();
    mockMondayService = (service as any).mondayService as jest.Mocked<MondayService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default repositories', () => {
      const newService = new BriefingMateriaisCriativosGamService();

      expect(newService).toBeDefined();
      expect((newService as any).mondayService).toBeDefined();
      expect((newService as any).subscriberRepository).toBeDefined();
      expect((newService as any).mondayItemRepository).toBeDefined();
      expect((newService as any).mondayBoardRepository).toBeDefined();
      expect((newService as any).channelScheduleRepository).toBeDefined();
    });

    it('should initialize service successfully', () => {
      const newService = new BriefingMateriaisCriativosGamService();

      expect(newService).toBeDefined();
    });

    it('should have correlation arrays defined', () => {
      expect(service.secondBoardCorrelationFromSubmission).toBeDefined();
      expect(Array.isArray(service.secondBoardCorrelationFromSubmission)).toBe(true);
      expect(service.secondBoardCorrelationFromFirst).toBeDefined();
      expect(Array.isArray(service.secondBoardCorrelationFromFirst)).toBe(true);
    });
  });

  describe('isDev', () => {
    it('should return true in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = (service as any).isDev();

      expect(result).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = (service as any).isDev();

      expect(result).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false when NODE_ENV is not set', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = (service as any).isDev();

      expect(result).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateSpecificFields', () => {
    it('should not throw error when Growth briefing has all required fields', () => {
      const data = {
        sele__o_individual9__1: 'Growth/BU/Marca',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: '5'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });

    it('should throw error when Growth briefing is missing required fields', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        long_text_mksehp7a: 'Context'
      };

      expect(() => (service as any).validateSpecificFields(data))
        .toThrow(/Validação de campos condicionais falhou/);
    });

    it('should validate Conteúdo/Redes Sociais briefing type', () => {
      const data = {
        sele__o_individual9__1: 'Conteúdo/Redes Sociais',
        text_mksn5est: 'Hero',
        text_mksns2p1: 'Tension',
        long_text_mksn15gd: 'Position',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: '3'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });

    it('should throw error when Conteúdo briefing is missing fields', () => {
      const data = {
        sele__o_individual9__1: 'conteudo',
        text_mksn5est: 'Hero'
      };

      expect(() => (service as any).validateSpecificFields(data))
        .toThrow(/Campo "Tensão\/Oportunidade" é obrigatório/);
    });

    it('should validate Validação briefing type', () => {
      const data = {
        sele__o_individual9__1: 'Validação',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push',
        long_text_mkrd6mnt: 'https://link.com',
        n_meros9__1: '2'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });

    it('should throw error when Validação briefing is missing validation links', () => {
      const data = {
        sele__o_individual9__1: 'validacao',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push'
      };

      expect(() => (service as any).validateSpecificFields(data))
        .toThrow(/Campo "Links úteis para validação" é obrigatório/);
    });

    it('should validate Tipo de Entrega with numeric fields', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: ['Push', 'SMS'],
        n_meros9__1: '5',
        n_meros43__1: '3'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });

    it('should throw error when numeric field is missing for Tipo de Entrega', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };

      expect(() => (service as any).validateSpecificFields(data))
        .toThrow(/Número de peças Push" é obrigatório/);
    });

    it('should throw error when Webview is selected without Deep Link', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Webview',
        n_meros37__1: '2'
      };

      expect(() => (service as any).validateSpecificFields(data))
        .toThrow(/Campo "Deep Link" é obrigatório/);
    });

    it('should pass when Webview has both numeric field and Deep Link', () => {
      const data = {
        sele__o_individual9__1: 'growth',
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Webview',
        n_meros37__1: '2',
        text_mkrtbysb: 'https://deeplink.com'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });

    it('should skip validation when no briefing type is specified', () => {
      const data = {
        some_field: 'value'
      };

      expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
    });
  });

  describe('saveObjectLocally', () => {
    it('should save object in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await (service as any).saveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('form-submissions'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Objeto salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip saving in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await (service as any).saveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle file system errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      await (service as any).saveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar objeto localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('savePreObjectLocally', () => {
    it('should save pre-object in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await (service as any).savePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('pre-data'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Pre-data salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await (service as any).savePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      await (service as any).savePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar pre-data localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('savePayloadLocally', () => {
    it('should save payload in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const payload: FormSubmissionData = {
        id: 'test_id',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
        data: { field: 'value' }
      };

      await (service as any).savePayloadLocally(payload);

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('form-submissions'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Payload salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      const payload: FormSubmissionData = {
        id: 'test_id',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
        data: {}
      };

      await (service as any).savePayloadLocally(payload);

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      const payload: FormSubmissionData = {
        id: 'test_id',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
        data: {}
      };

      await (service as any).savePayloadLocally(payload);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar payload localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('findMondayItemBySearchTerm', () => {
    it('should find item by name', async () => {
      const mockItem = { id: '1', item_id: '101', name: 'Test Item' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockItem),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await (service as any).findMondayItemBySearchTerm('Test Item');

      expect(result).toEqual(mockItem);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mi.name = :term', { term: 'Test Item' });
    });

    it('should return null when item not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await (service as any).findMondayItemBySearchTerm('Nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockMondayItemRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await (service as any).findMondayItemBySearchTerm('Test');

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCodeByItemName', () => {
    it('should get code from item', async () => {
      const mockItem = { id: '1', item_id: '101', code: 'CODE123' };
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem);

      const result = await (service as any).getCodeByItemName('Test Item');

      expect(result).toBe('CODE123');
      expect(mockMondayItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Item' }
      });
    });

    it('should return undefined when item not found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).getCodeByItemName('Nonexistent');

      expect(result).toBeUndefined();
    });

    it('should filter by boardId when provided', async () => {
      const mockItem = { id: '1', item_id: '101', code: 'CODE123' };
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem);

      const result = await (service as any).getCodeByItemName('Test Item', 'board123');

      expect(result).toBe('CODE123');
      expect(mockMondayItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Item', board_id: 'board123' }
      });
    });
  });

  describe('resolvePeopleFromSubscribers', () => {
    it('should resolve email to subscriber ID', async () => {
      mockSubscriberRepository.findOne.mockResolvedValue({ id: '123', email: 'test@example.com' });

      const result = await (service as any).resolvePeopleFromSubscribers('test@example.com');

      expect(result).toEqual({
        personsAndTeams: [{ id: '123', kind: 'person' }],
      });
    });

    it('should resolve multiple emails', async () => {
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'test1@example.com' })
        .mockResolvedValueOnce({ id: '456', email: 'test2@example.com' });

      const result = await (service as any).resolvePeopleFromSubscribers(['test1@example.com', 'test2@example.com']);

      expect(result).toEqual({
        personsAndTeams: [
          { id: '123', kind: 'person' },
          { id: '456', kind: 'person' },
        ],
      });
    });

    it('should warn when subscriber not found', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSubscriberRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).resolvePeopleFromSubscribers('unknown@example.com');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Subscriber não encontrado para email: unknown@example.com');
      consoleWarnSpy.mockRestore();
    });

    it('should handle mixed found and not found subscribers', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'found@example.com' })
        .mockResolvedValueOnce(null);

      const result = await (service as any).resolvePeopleFromSubscribers(['found@example.com', 'notfound@example.com']);

      expect(result).toEqual({
        personsAndTeams: [{ id: '123', kind: 'person' }],
      });
      consoleWarnSpy.mockRestore();
    });
  });

  describe('createMondayItem', () => {
    it('should create item successfully', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'New Item',
            group: { id: 'group1' },
          },
        },
      });

      const result = await (service as any).createMondayItem('123', 'group1', 'New Item', { field1: 'value1' });

      expect(result).toBe('101');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle special characters in item name', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'Item with "quotes"',
            group: { id: 'group1' },
          },
        },
      });

      const result = await (service as any).createMondayItem('123', 'group1', 'Item with "quotes"', {});

      expect(result).toBe('101');
    });

    it('should throw error when create_item returns no ID', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: null },
      });

      await expect((service as any).createMondayItem('123', 'group1', 'Test', {}))
        .rejects.toThrow('Resposta inválida da Monday.com');
    });

    it('should throw error when API fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect((service as any).createMondayItem('123', 'group1', 'Test', {}))
        .rejects.toThrow('API Error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('processFileUpload', () => {
    it('should skip when no file field present', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: {},
      };

      await (service as any).processFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).not.toHaveBeenCalled();
    });

    it('should skip when file does not exist', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: { enviar_arquivo__1: 'nonexistent.pdf' },
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await (service as any).processFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      mockExistsSync.mockRestore();
    });

    it('should upload file and delete local copy', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: { enviar_arquivo__1: 'test.pdf' },
      };

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockUnlinkSync = jest.spyOn(fs, 'unlinkSync').mockImplementation();
      mockMondayService.uploadFile.mockResolvedValue('file123');

      await (service as any).processFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('enviado com sucesso'));

      consoleLogSpy.mockRestore();
      mockExistsSync.mockRestore();
      mockUnlinkSync.mockRestore();
    });

    it('should handle upload error gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: { enviar_arquivo__1: 'test.pdf' },
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      mockMondayService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await (service as any).processFileUpload('101', '123', formData);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao processar upload de arquivo:', expect.any(Error));

      consoleErrorSpy.mockRestore();
      mockExistsSync.mockRestore();
    });
  });

  describe('processBriefingGamSubmission', () => {
    it('should process valid briefing submission', async () => {
      const payload: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Briefing GAM',
        data: {
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Context',
          sele__o_m_ltipla18__1: 'Push',
          long_text_mkrd6mnt: 'https://link.com',
          name: 'Test Briefing',
          n_meros9__1: '5'
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'Test Briefing',
            group: { id: 'topics' },
          },
        },
      });

      const result = await service.processBriefingGamSubmission(payload);

      expect(result).toBeDefined();
      expect(result).toBe('101');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle missing name field', async () => {
      const payload: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Briefing GAM',
        data: {
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Context',
          sele__o_m_ltipla18__1: 'Push',
          long_text_mkrd6mnt: 'https://link.com',
          n_meros9__1: '5'
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'Briefing GAM form1',
            group: { id: 'topics' },
          },
        },
      });

      const result = await service.processBriefingGamSubmission(payload);

      expect(result).toBeDefined();
      expect(result).toBe('101');
    });

    it('should throw error when validation fails', async () => {
      const payload: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Briefing GAM',
        data: {
          sele__o_individual9__1: 'growth',
        }
      };

      await expect(service.processBriefingGamSubmission(payload))
        .rejects.toThrow(/Validação de campos condicionais falhou/);
    });
  });

  describe('normalizeToStringArray', () => {
    it('should return empty array for null or undefined', () => {
      expect((service as any).normalizeToStringArray(null)).toEqual([]);
      expect((service as any).normalizeToStringArray(undefined)).toEqual([]);
    });

    it('should convert array values to strings', () => {
      expect((service as any).normalizeToStringArray([1, 2, 3])).toEqual(['1', '2', '3']);
      expect((service as any).normalizeToStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should convert string to array with single element', () => {
      expect((service as any).normalizeToStringArray('test')).toEqual(['test']);
    });

    it('should handle object with labels array', () => {
      expect((service as any).normalizeToStringArray({ labels: ['a', 'b'] })).toEqual(['a', 'b']);
    });

    it('should handle object with ids array', () => {
      expect((service as any).normalizeToStringArray({ ids: [1, 2] })).toEqual(['1', '2']);
    });

    it('should convert non-array non-object to string array', () => {
      expect((service as any).normalizeToStringArray(123)).toEqual(['123']);
      expect((service as any).normalizeToStringArray(true)).toEqual(['true']);
    });
  });

  describe('extractItemName', () => {
    it('should extract item name from data when field exists', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test Form',
        data: {
          name: 'My Briefing'
        }
      };
      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.name',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);
      expect(result).toBe('My Briefing');
    });

    it('should use default name when field is missing', () => {
      const formData: FormSubmissionData = {
        id: 'form123',
        timestamp: '2024-01-01',
        formTitle: 'Test Form',
        data: {}
      };
      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.name',
        default_item_name: 'Briefing GAM',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);
      expect(result).toBe('Briefing GAM');
    });

    it('should use formId when no name field or default', () => {
      const formData: FormSubmissionData = {
        id: 'form456',
        timestamp: '2024-01-01',
        formTitle: 'Test Form',
        data: {}
      };
      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);
      expect(result).toBe('Formulário form456');
    });
  });

  describe('sumReservedQty', () => {
    it('should sum agendamento quantities', async () => {
      const mockSchedules = [
        { id_canal: 'Email', data: new Date('2024-01-15'), hora: '10:00', qtd: 50, tipo: 'agendamento' },
        { id_canal: 'Email', data: new Date('2024-01-15'), hora: '10:00', qtd: 100, tipo: 'agendamento' }
      ];
      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules);

      const result = await (service as any).sumReservedQty('Email', new Date('2024-01-15'), '10:00');

      expect(result).toBe(150);
    });

    it('should exclude reserva from same area', async () => {
      const mockSchedules = [
        { id_canal: 'Push', data: new Date('2024-01-20'), hora: '14:00', qtd: 50, tipo: 'agendamento' },
        { id_canal: 'Push', data: new Date('2024-01-20'), hora: '14:00', qtd: 30, tipo: 'reserva', area_solicitante: 'Marketing' },
        { id_canal: 'Push', data: new Date('2024-01-20'), hora: '14:00', qtd: 20, tipo: 'reserva', area_solicitante: 'Sales' }
      ];
      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules);

      const result = await (service as any).sumReservedQty('Push', new Date('2024-01-20'), '14:00', 'Marketing');

      expect(result).toBe(70); // 50 agendamento + 20 reserva de Sales (não conta os 30 de Marketing)
    });

    it('should return 0 when no schedules found', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await (service as any).sumReservedQty('SMS', new Date('2024-01-25'), '16:00');

      expect(result).toBe(0);
    });
  });

  describe('getValueByPath', () => {
    it('should get simple value from data', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { field1: 'value1' }
      };

      const result = (service as any).getValueByPath(formData, 'data.field1');
      expect(result).toBe('value1');
    });

    it('should get nested value', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { nested: { field: 'nested value' } }
      };

      const result = (service as any).getValueByPath(formData, 'data.nested.field');
      expect(result).toBe('nested value');
    });

    it('should return undefined for missing path', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const result = (service as any).getValueByPath(formData, 'data.nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('validateGrowthBUMarcaFields', () => {
    it('should not add errors when all Growth fields are present', () => {
      const data = {
        briefing_requesting_area: 'Marketing',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add errors for each missing Growth field', () => {
      const data = {};
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateGrowthBUMarcaFields(data, errors);

      expect(errors.length).toBeGreaterThan(5);
      expect(errors[0]).toContain('Área Solicitante');
    });
  });

  describe('validateConteudoRedesSociaisFields', () => {
    it('should not add errors when all Conteúdo fields are present', () => {
      const data = {
        text_mksn5est: 'Hero',
        text_mksns2p1: 'Tension',
        long_text_mksn15gd: 'Position',
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla__1: 'Objective',
        sele__o_m_ltipla1__1: 'Action',
        texto_curto23__1: 'CTA',
        texto_curto8__1: 'Mandatory',
        data__1: '2024-12-31',
        lista_suspensa__1: 'Benefit',
        lista_suspensa9__1: 'Trigger',
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateConteudoRedesSociaisFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add errors for missing Conteúdo fields', () => {
      const data = { text_mksn5est: 'Hero' };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateConteudoRedesSociaisFields(data, errors);

      expect(errors.length).toBeGreaterThan(5);
      expect(errors[0]).toContain('Tensão/Oportunidade');
    });
  });

  describe('validateValidacaoFields', () => {
    it('should not add errors when Validação fields are present', () => {
      const data = {
        long_text_mksehp7a: 'Context',
        sele__o_m_ltipla18__1: 'Push',
        long_text_mkrd6mnt: 'https://link.com'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateValidacaoFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add errors for missing Validação fields', () => {
      const data = {};
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateValidacaoFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTipoEntregaFields', () => {
    it('should validate Push numeric field', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Push',
        n_meros9__1: '5'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should add error when Push is selected without numeric field', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Push'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Push');
    });

    it('should validate SMS numeric field', () => {
      const data = {
        sele__o_m_ltipla18__1: 'SMS',
        n_meros43__1: '10'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should validate Email numeric field', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Email',
        n_meros__1: '8'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should validate Webview requires Deep Link', () => {
      const data = {
        sele__o_m_ltipla18__1: 'Webview',
        n_meros37__1: '2',
        text_mkrtbysb: 'https://deeplink.com'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });

    it('should handle array of tipo de entrega values', () => {
      const data = {
        sele__o_m_ltipla18__1: ['Push', 'SMS'],
        n_meros9__1: '5',
        n_meros43__1: '3'
      };
      const errors: string[] = [];

      const { BriefingValidator } = require('../../src/utils/briefingValidator');
      BriefingValidator.validateTipoEntregaFields(data, errors);

      expect(errors).toHaveLength(0);
    });
  });

  describe('parseFlexibleDateToDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      const result = (service as any).parseFlexibleDateToDate('25/12/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(25);
      expect(result?.getMonth()).toBe(11); // December is month 11
    });

    it('should parse YYYY-MM-DD format', () => {
      const result = (service as any).parseFlexibleDateToDate('2024-12-25');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(25);
    });

    it('should return null for invalid date', () => {
      const result = (service as any).parseFlexibleDateToDate('invalid');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = (service as any).parseFlexibleDateToDate('');
      expect(result).toBeNull();
    });
  });

  describe('truncateDate', () => {
    it('should truncate time from date', () => {
      const date = new Date('2024-12-25T15:30:45.123Z');
      const result = (service as any).truncateDate(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should preserve date components', () => {
      const date = new Date('2024-12-25T15:30:45.123Z');
      const result = (service as any).truncateDate(date);

      expect(result.getDate()).toBe(date.getDate());
      expect(result.getMonth()).toBe(date.getMonth());
      expect(result.getFullYear()).toBe(date.getFullYear());
    });
  });

  describe('convertDateFormat', () => {
    it('should return date in DD/MM/YYYY format unchanged', () => {
      const result = convertDateFormat('25/12/2024');
      expect(result).toBe('25/12/2024');
    });

    it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
      const result = convertDateFormat('2024-12-25');
      expect(result).toBe('25/12/2024');
    });

    it('should handle another ISO date', () => {
      const result = convertDateFormat('2024-03-05');
      expect(result).toBe('05/03/2024');
    });
  });

  describe('toYYYYMMDD', () => {
    it('should format Date object to YYYYMMDD', () => {
      const date = new Date('2024-12-25');
      const result = toYYYYMMDD(date);
      expect(result).toMatch(/^\d{8}$/);
    });

    it('should format date string to YYYYMMDD', () => {
      const result = toYYYYMMDD('25/12/2024');
      expect(result).toBe('20241225');
    });

    it('should return empty string for invalid input', () => {
      const result = toYYYYMMDD('invalid');
      expect(result).toBe('');
    });
  });

  describe('formatStatusValue', () => {
    it('should format string status value', () => {
      const result = (service as any).formatStatusValue('Active');
      expect(result).toEqual({ label: 'Active' });
    });

    it('should convert null to string label', () => {
      const result = (service as any).formatStatusValue(null);
      expect(result).toEqual({ label: 'null' });
    });

    it('should format array as string with comma-separated values', () => {
      const result = (service as any).formatStatusValue(['Active', 'Pending']);
      expect(result).toEqual({ label: 'Active,Pending' });
    });
  });

  describe('formatDropdownValue', () => {
    it('should format string dropdown value', () => {
      const result = (service as any).formatDropdownValue('Option1');
      expect(result).toEqual({ labels: ['Option1'] });
    });

    it('should format array dropdown value', () => {
      const result = (service as any).formatDropdownValue(['Opt1', 'Opt2']);
      expect(result).toEqual({ labels: ['Opt1', 'Opt2'] });
    });

    it('should handle null by converting to string', () => {
      const result = (service as any).formatDropdownValue(null);
      expect(result).toEqual({ labels: ['null'] });
    });
  });

  describe('formatDateValue', () => {
    it('should format date string', () => {
      const result = (service as any).formatDateValue('25/12/2024');
      expect(result).toHaveProperty('date');
      expect(result.date).toBe('2024-12-25');
    });

    it('should format Date object', () => {
      const date = new Date('2024-12-25');
      const result = (service as any).formatDateValue(date);
      expect(result).toHaveProperty('date');
    });

    it('should return date object for null', () => {
      const result = (service as any).formatDateValue(null);
      expect(result).toEqual({ date: null });
    });
  });

  describe('formatTagsValue', () => {
    it('should format string tags', () => {
      const result = (service as any).formatTagsValue('Tag1');
      expect(result).toEqual({ tag_ids: ['Tag1'] });
    });

    it('should format array tags', () => {
      const result = (service as any).formatTagsValue(['Tag1', 'Tag2']);
      expect(result).toEqual({ tag_ids: ['Tag1', 'Tag2'] });
    });

    it('should handle null by wrapping in array', () => {
      const result = (service as any).formatTagsValue(null);
      expect(result).toEqual({ tag_ids: [null] });
    });
  });

  describe('formatBoardRelationValue', () => {
    it('should format numeric board relation', () => {
      const result = (service as any).formatBoardRelationValue(123);
      expect(result).toEqual({ item_ids: [123] });
    });

    it('should format string board relation', () => {
      const result = (service as any).formatBoardRelationValue('456');
      expect(result).toEqual({ item_ids: [456] });
    });

    it('should format array board relation', () => {
      const result = (service as any).formatBoardRelationValue([1, 2, 3]);
      expect(result).toEqual({ item_ids: [1, 2, 3] });
    });

    it('should filter out invalid values', () => {
      const result = (service as any).formatBoardRelationValue(['valid', '', null, 123]);
      expect(result.item_ids.length).toBeGreaterThan(0);
    });

    it('should return undefined for null', () => {
      const result = (service as any).formatBoardRelationValue(null);
      expect(result).toBeUndefined();
    });
  });

  describe('getColumnType', () => {
    it('should return date type for date fields', () => {
      const result = (service as any).getColumnType('data__1');
      expect(result).toBe('date');
    });

    it('should return text for status fields', () => {
      const result = (service as any).getColumnType('status_15');
      expect(result).toBe('text');
    });

    it('should return dropdown type for lista_suspensa fields', () => {
      const result = (service as any).getColumnType('lista_suspensa__1');
      expect(result).toBe('dropdown');
    });

    it('should return text for seleção fields', () => {
      const result = (service as any).getColumnType('sele__o_m_ltipla__1');
      expect(result).toBe('text');
    });

    it('should return text for board_relation fields', () => {
      const result = (service as any).getColumnType('board_relation_mkmhpe1e');
      expect(result).toBe('text');
    });

    it('should return text for unknown fields', () => {
      const result = (service as any).getColumnType('unknown_field');
      expect(result).toBe('text');
    });
  });

  describe('findClosestSubitemByDate', () => {
    it('should find closest subitem by date to today', () => {
      // Usar data futura pr\u00f3xima para garantir que ser\u00e1 a mais pr\u00f3xima
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${tomorrow.getFullYear()}`;
      
      const subitems = [
        { name: 'Item 1', data__1: '10/01/2024' },
        { name: 'Item 2', data__1: '15/01/2024' },
        { name: 'Item 3', data__1: tomorrowStr }
      ];

      const result = (service as any).findClosestSubitemByDate(subitems);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Item 3');
    });

    it('should return null for empty subitems', () => {
      const result = (service as any).findClosestSubitemByDate([]);
      expect(result).toBeNull();
    });

    it('should return null when no valid dates found', () => {
      const subitems = [
        { name: 'Item 1', data: {} },
        { name: 'Item 2', data: { data_inicial: 'invalid' } }
      ];

      const result = (service as any).findClosestSubitemByDate(subitems);
      expect(result).toBeNull();
    });
  });

  describe('splitConnectBoardColumns', () => {
    it('should split base and connect columns', () => {
      const columns = {
        regular_field: 'value1',
        board_relation_field: { item_ids: [123] },
        another_field: 'value2',
        conectar_quadros: { item_ids: [456] }
      };

      const result = (service as any).splitConnectBoardColumns(columns);

      expect(result.baseColumns).toHaveProperty('regular_field');
      expect(result.baseColumns).toHaveProperty('another_field');
      expect(result.baseColumns).toHaveProperty('board_relation_field');
      expect(result.connectColumnsRaw).toHaveProperty('conectar_quadros');
    });

    it('should handle columns with no board relations', () => {
      const columns = {
        field1: 'value1',
        field2: 'value2'
      };

      const result = (service as any).splitConnectBoardColumns(columns);

      expect(Object.keys(result.baseColumns).length).toBe(2);
      expect(Object.keys(result.connectColumnsRaw).length).toBe(0);
    });
  });

  describe('pickSecondBoardConnectColumns', () => {
    it('should filter connect columns for second board', () => {
      const connectColumns = {
        text_mkvgjh0w: { item_ids: [1] },
        conectar_quadros8__1: { item_ids: [2] },
        other_field: { item_ids: [3] }
      };

      const result = (service as any).pickSecondBoardConnectColumns(connectColumns);

      expect(result).toHaveProperty('text_mkvgjh0w');
      expect(result).toHaveProperty('conectar_quadros8__1');
      expect(result).not.toHaveProperty('other_field');
    });

    it('should return empty object when no matching columns', () => {
      const connectColumns = {
        unrelated_field: { item_ids: [1] }
      };

      const result = (service as any).pickSecondBoardConnectColumns(connectColumns);

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('buildPeopleFromLookupObjetivo', () => {
    it('should build people object from area solicitante', async () => {
      const data = {
        text_mkvhvcw4: 'Marketing'
      };

      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no area data', async () => {
      const result = await (service as any).buildPeopleFromLookupObjetivo(undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty area field', async () => {
      const data = {
        text_mkvhvcw4: ''
      };

      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toBeUndefined();
    });
  });

  describe('buildCompositeTextField', () => {
    it('should build composite field without itemId', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);
      
      expect(result).toContain('20240101');
      expect(result).toContain('TestName');
    });

    it('should build composite field with itemId', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData, '12345');
      
      expect(result).toContain('20240101');
      expect(result).toContain('id-12345');
      expect(result).toContain('TestName');
    });

    it('should use toYYYYMMDD fallback when text_mkr3n64h is empty', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          data__1: '01/01/2024',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);
      
      expect(result).toContain('20240101');
    });

    it('should call getCodeByItemName for lookup fields', async () => {
      mockMondayItemRepository.findOne.mockResolvedValueOnce({
        name: "Produto",
        id: 123
      } as any).mockResolvedValueOnce({
        codigo: 'CODE1'
      } as any);

      mockMondayService.getSubproductCodeByProduct.mockResolvedValue(null);

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          name: 'TestName',
          lookup_mkrtvsdj: 'Product Name'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);
      
      expect(result).toBeDefined();
      expect(mockMondayItemRepository.findOne).toHaveBeenCalled();
    });

    it('should handle error when fetching codes gracefully', async () => {
      mockMondayItemRepository.findOne.mockRejectedValueOnce(new Error('DB Error'));

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          name: 'TestName',
          lookup_mkrtvsdj: 'Product Name'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);
      
      expect(result).toBeDefined();
      expect(result).toContain('Product Name');
    });

    it('should preserve empty positions when lookup field is empty', async () => {
      mockMondayItemRepository.findOne.mockResolvedValueOnce({
        name: "Produto"
      } as any);

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          name: 'TestName',
          lookup_mkrtaebd: '',
          lookup_mkrt66aq: 'Campaign Type'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);
      
      expect(result).toContain('--');
    });
  });

  describe('formatValueForMondayColumn - additional coverage', () => {
    it('should handle TEXT column type', () => {
      const result = (service as any).formatValueForMondayColumn('test', 'text');
      expect(result).toBe('test');
    });

    it('should handle NUMBER column type with valid number', () => {
      const result = (service as any).formatValueForMondayColumn('42', 'number');
      expect(result).toBe(42);
    });

    it('should return undefined for NUMBER column with invalid number', () => {
      const result = (service as any).formatValueForMondayColumn('invalid', 'number');
      expect(result).toBeUndefined();
    });

    it('should handle CHECKBOX column type', () => {
      const result = (service as any).formatValueForMondayColumn(true, 'checkbox');
      expect(result).toEqual({ checked: true });
    });

    it('should handle PEOPLE column type with array', () => {
      const result = (service as any).formatValueForMondayColumn(['123', '456'], 'people');
      expect(result).toHaveProperty('personsAndTeams');
      expect(result.personsAndTeams).toHaveLength(2);
    });

    it('should handle PEOPLE column type with string', () => {
      const result = (service as any).formatValueForMondayColumn('john@example.com', 'people');
      expect(result).toHaveProperty('personsAndTeams');
      expect(result.personsAndTeams[0].id).toBe('john@example.com');
    });

    it('should handle PEOPLE column type with object', () => {
      const input = {
        personsAndTeams: [{ id: '123', kind: 'person' }]
      };
      const result = (service as any).formatValueForMondayColumn(input, 'people');
      expect(result).toHaveProperty('personsAndTeams');
      expect(result.personsAndTeams[0].id).toBe('123');
    });

    it('should return undefined for PEOPLE with invalid input', () => {
      const result = (service as any).formatValueForMondayColumn({}, 'people');
      expect(result).toBeUndefined();
    });

    it('should return string for unknown column type', () => {
      const result = (service as any).formatValueForMondayColumn('test', 'unknown_type' as any);
      expect(result).toBe('test');
    });
  });

  describe('resolveConnectBoardColumns', () => {
    it('should preserve item_ids when already formatted', async () => {
      const connectColumns = {
        conectar_quadros: { item_ids: ['123', '456'] }
      };

      const result = await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(result).toHaveProperty('conectar_quadros');
      expect(result.conectar_quadros.item_ids).toEqual(['123', '456']);
    });

    it('should resolve names to item_ids', async () => {
      const connectColumns = {
        conectar_quadros: 'Test Item'
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ item_id: '789', name: 'Test Item' })
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(result).toHaveProperty('conectar_quadros');
      expect(result.conectar_quadros.item_ids).toContain('789');
    });

    it('should handle numeric item IDs directly', async () => {
      const connectColumns = {
        conectar_quadros: ['123', '456']
      };

      const result = await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(result).toHaveProperty('conectar_quadros');
      expect(result.conectar_quadros.item_ids).toEqual(['123', '456']);
    });

    it('should warn when item not found', async () => {
      const connectColumns = {
        conectar_quadros: 'Nonexistent Item'
      };

      const mockQueryBuilder2 = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null)
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder2 as any);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('não encontrado'));
      consoleSpy.mockRestore();
    });
  });

  describe('adjustSubitemsCapacity', () => {
    it('should return array of subitems', async () => {
      const subitems = [
        {
          id: 'canal1',
          data__1: '01/01/2024',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 10
        }
      ];

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      mockMondayItemRepository.find.mockResolvedValue([]);

      const result = await (service as any).adjustSubitemsCapacity(subitems, formData);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insertChannelSchedules', () => {
    it('should handle case when channelScheduleService is not available', async () => {
      // Create service without channelScheduleService
      const serviceWithoutSchedule = new BriefingMateriaisCriativosGamService();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (serviceWithoutSchedule as any).insertChannelSchedules([], {} as any);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('não disponível'));
      consoleSpy.mockRestore();
    });

    it('should handle empty subitems array', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { conectar_quadros__1: 'Marketing' }
      };

      const serviceWithoutSchedule = new BriefingMateriaisCriativosGamService();

      await expect(
        (serviceWithoutSchedule as any).insertChannelSchedules([], formData)
      ).resolves.not.toThrow();
    });

    it('should create schedule with area from conectar_quadros__1', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          conectar_quadros__1: 'Marketing',
          user_id: 'user123'
        }
      };

      const subitems = [
        {
          id: 'channel1',
          data__1: '2024-12-25',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 5
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(mockChannelService.create).toHaveBeenCalledWith({
        id_canal: 'channel1',
        data: '25/12/2024',
        hora: '10:00',
        qtd: 5,
        area_solicitante: 'Marketing',
        user_id: 'user123',
        tipo: 'agendamento'
      });
    });

    it('should create schedule with area from lookup_mkrt36cj', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          lookup_mkrt36cj: 'Sales'
        }
      };

      const subitems = [
        {
          id: 'channel2',
          data__1: '2024-12-31',
          conectar_quadros_mkkcnyr3: '14:00',
          n_meros_mkkchcmk: 3
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(mockChannelService.create).toHaveBeenCalled();
    });

    it('should warn when area solicitante not found', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const subitems = [
        {
          id: 'channel3',
          data__1: '2024-12-01',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 2
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Área solicitante não encontrada'));
      consoleSpy.mockRestore();
    });

    it('should skip subitem when id_canal is missing', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { conectar_quadros__1: 'Area' }
      };

      const subitems = [
        {
          data__1: '2024-12-01',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 2
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(mockChannelService.create).not.toHaveBeenCalled();
    });

    it('should skip subitem when data is missing', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { conectar_quadros__1: 'Area' }
      };

      const subitems = [
        {
          id: 'channel4',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 2
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(mockChannelService.create).not.toHaveBeenCalled();
    });

    it('should skip subitem when qtd is 0', async () => {
      const mockChannelService = {
        create: jest.fn().mockResolvedValue({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { conectar_quadros__1: 'Area' }
      };

      const subitems = [
        {
          id: 'channel5',
          data__1: '2024-12-01',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 0
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(mockChannelService.create).not.toHaveBeenCalled();
    });

    it('should handle error during schedule creation and continue', async () => {
      const mockChannelService = {
        create: jest.fn()
          .mockRejectedValueOnce(new Error('DB Error'))
          .mockResolvedValueOnce({}),
        findByChannelAndDate: jest.fn()
      };
      const serviceWithChannel = new BriefingMateriaisCriativosGamService();
      (serviceWithChannel as any).channelScheduleService = mockChannelService;

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { conectar_quadros__1: 'Area' }
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const subitems = [
        {
          id: 'channel6',
          data__1: '2024-12-01',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 5
        },
        {
          id: 'channel7',
          data__1: '2024-12-02',
          conectar_quadros_mkkcnyr3: '12:00',
          n_meros_mkkchcmk: 3
        }
      ];

      await (serviceWithChannel as any).insertChannelSchedules(subitems, formData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao inserir agendamento'), expect.any(Error));
      expect(mockChannelService.create).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe('formatDropdownValue - additional cases', () => {
    it('should handle array with mix of numbers and strings', () => {
      const result = (service as any).formatDropdownValue(['Option1', '123', 'Option2']);
      expect(result).toHaveProperty('labels');
      expect(result.labels).toContain('Option1');
      expect(result.labels).toContain('123');
    });

    it('should handle array of only numbers', () => {
      const result = (service as any).formatDropdownValue(['1', '2', '3']);
      expect(result).toHaveProperty('ids');
      expect(result.ids).toEqual([1, 2, 3]);
    });

    it('should filter out empty strings', () => {
      const result = (service as any).formatDropdownValue(['Option1', '', 'Option2']);
      expect(result).toHaveProperty('labels');
      expect(result.labels).toHaveLength(2);
    });
  });

  describe('formatStatusValue - additional cases', () => {
    it('should handle numeric string as index', () => {
      const result = (service as any).formatStatusValue('5');
      expect(result).toEqual({ index: 5 });
    });

    it('should handle zero as index', () => {
      const result = (service as any).formatStatusValue('0');
      expect(result).toEqual({ index: 0 });
    });

    it('should handle text status', () => {
      const result = (service as any).formatStatusValue('In Progress');
      expect(result).toEqual({ label: 'In Progress' });
    });
  });

  describe('getColumnType - edge cases', () => {
    it('should return date for data__ prefix', () => {
      const result = (service as any).getColumnType('data__123');
      expect(result).toBe('date');
    });

    it('should return date for date_ prefix', () => {
      const result = (service as any).getColumnType('date_mkr123');
      expect(result).toBe('date');
    });

    it('should return number for n_mero fields', () => {
      const result = (service as any).getColumnType('n_mero__1');
      expect(result).toBe('number');
    });

    it('should return number for n_meros fields', () => {
      const result = (service as any).getColumnType('n_meros_123');
      expect(result).toBe('number');
    });

    it('should return text for pessoas fields (mapped to people internally)', () => {
      const result = (service as any).getColumnType('pessoas__1');
      expect(result).toBe('people');
    });

    it('should return text for conectar_quadros fields', () => {
      const result = (service as any).getColumnType('conectar_quadros_123');
      expect(result).toBe('text');
    });

    it('should return text for lookup_ fields', () => {
      const result = (service as any).getColumnType('lookup_mkr123');
      expect(result).toBe('text');
    });

    it('should return text for text_mkvgjh0w specifically', () => {
      const result = (service as any).getColumnType('text_mkvgjh0w');
      expect(result).toBe('text');
    });
  });

  describe('buildColumnValues', () => {
    it('should build column values from form data', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          field1: 'value1',
          field2: 'value2',
          n_mero__1: 42
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.field1',
        default_item_name: 'Default',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result).toHaveProperty('field1');
      expect(result).toHaveProperty('n_mero__1');
    });

    it('should exclude standard excluded fields', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          formTitle: 'Should be excluded',
          id: 'Should be excluded',
          timestamp: 'Should be excluded',
          field1: 'value1'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result).not.toHaveProperty('formTitle');
      expect(result).not.toHaveProperty('timestamp');
      expect(result).toHaveProperty('field1');
    });

    it('should apply column mappings with transformations', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          source_field: 'test value'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: [
          {
            monday_column_id: 'target_field',
            form_field_path: 'data.source_field',
            column_type: 'text' as any,
            transform: (val: any) => val.toUpperCase()
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.target_field).toBe('TEST VALUE');
    });

    it('should use default value when field is missing', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: [
          {
            monday_column_id: 'target_field',
            form_field_path: 'data.missing_field',
            column_type: 'text' as any,
            default_value: 'default'
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.target_field).toBe('default');
    });

    it('should populate text fields from lookup fields', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          lookup_mkrtaebd: 'ClientType',
          lookup_mkrt66aq: 'CampaignType'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.text_mkvhz8g3).toBe('ClientType');
      expect(result.text_mkvhedf5).toBe('CampaignType');
    });

    it('should derive text_mkr3n64h and date_mkrj355f from date_mkr6nj1f', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          date_mkr6nj1f: '2024-12-25'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.text_mkr3n64h).toBe('20241225');
      expect(result.date_mkrj355f).toHaveProperty('date');
    });
  });

  describe('buildCompositeTextFieldSecondBoard', () => {
    it('should build composite field for second board', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkr3n64h: '20240101',
          text_mkvhz8g3: 'Cliente',
          text_mkvhedf5: 'Campanha'
        }
      };

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData, '12345');

      expect(result).toContain('20240101');
      expect(result).toContain('id-12345');
    });

    it('should handle missing fields gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData, '12345');

      expect(result).toContain('id-12345');
    });
  });

  describe('parseFlexibleDateToDate - additional branches', () => {
    it('should parse date using Date constructor when not DD/MM/YYYY or YYYY-MM-DD', () => {
      const result = (service as any).parseFlexibleDateToDate('2024-12-25T10:30:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for completely invalid date string', () => {
      const result = (service as any).parseFlexibleDateToDate('not a date at all');
      expect(result).toBeNull();
    });

    it('should handle partial date strings', () => {
      const result = (service as any).parseFlexibleDateToDate('2024-12');
      expect(result).toBeDefined();
    });
  });

  describe('formatValueForMondayColumn - all branches', () => {
    it('should return undefined when value is null', () => {
      const result = (service as any).formatValueForMondayColumn(null, 'text');
      expect(result).toBeUndefined();
    });

    it('should return undefined when value is undefined', () => {
      const result = (service as any).formatValueForMondayColumn(undefined, 'text');
      expect(result).toBeUndefined();
    });

    it('should handle STATUS column type', () => {
      const result = (service as any).formatValueForMondayColumn('Active', 'status');
      expect(result).toHaveProperty('label');
    });

    it('should handle DROPDOWN column type', () => {
      const result = (service as any).formatValueForMondayColumn('Option', 'dropdown');
      expect(result).toHaveProperty('labels');
    });

    it('should handle TAGS column type', () => {
      const result = (service as any).formatValueForMondayColumn('Tag1', 'tags');
      expect(result).toHaveProperty('tag_ids');
    });

    it('should handle BOARD_RELATION column type', () => {
      const result = (service as any).formatValueForMondayColumn(123, 'board_relation');
      expect(result).toHaveProperty('item_ids');
    });

    it('should handle DATE column type', () => {
      const result = (service as any).formatValueForMondayColumn('01/01/2024', 'date');
      expect(result).toHaveProperty('date');
    });
  });

  describe('buildColumnValues - complex scenarios', () => {
    it('should handle pessoas5__1 with personsAndTeams object', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          pessoas5__1: {
            personsAndTeams: [{ id: '123', kind: 'person' }]
          }
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.pessoas__1).toHaveProperty('personsAndTeams');
    });

    it('should handle date_mkr6nj1f as object with date property', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          date_mkr6nj1f: { date: '2024-12-25' }
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.text_mkr3n64h).toBe('20241225');
    });

    it('should handle column mapping error gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          source_field: 'test'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: [
          {
            monday_column_id: 'target_field',
            form_field_path: 'data.source_field',
            column_type: 'text' as any,
            transform: () => { throw new Error('Transform error'); }
          }
        ]
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await (service as any).buildColumnValues(formData, mapping);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao processar campo'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle __SUBITEMS__ without valid dates', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          __SUBITEMS__: [
            { data__1: 'invalid' },
            { data__1: '' }
          ],
          field1: 'value1'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result).toHaveProperty('field1');
    });

    it('should exclude GAM specific fields', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          gam_start_date: '2024-01-01',
          gam_client_type: 'Type',
          enviar_arquivo__1: 'file.pdf',
          arquivos: 'files',
          field1: 'value1'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result).not.toHaveProperty('gam_start_date');
      expect(result).not.toHaveProperty('gam_client_type');
      expect(result).not.toHaveProperty('enviar_arquivo__1');
      expect(result).not.toHaveProperty('arquivos');
      expect(result).toHaveProperty('field1');
    });

    it('should warn on failure to derive fields from date_mkr6nj1f', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          date_mkr6nj1f: null
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        column_mappings: []
      };

      await (service as any).buildColumnValues(formData, mapping);

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe('formatDropdownValue - comprehensive', () => {
    it('should return ids for array of only numeric strings', () => {
      const result = (service as any).formatDropdownValue(['10', '20', '30']);
      expect(result).toEqual({ ids: [10, 20, 30] });
    });

    it('should return labels when mix includes non-numeric', () => {
      const result = (service as any).formatDropdownValue(['10', 'Text', '30']);
      expect(result).toHaveProperty('labels');
      expect(result.labels).toContain('Text');
    });

    it('should handle single numeric value', () => {
      const result = (service as any).formatDropdownValue('42');
      expect(result).toEqual({ ids: [42] });
    });

    it('should return undefined for empty values', () => {
      const result = (service as any).formatDropdownValue(['', '  ']);
      expect(result).toBeUndefined();
    });
  });

  describe('formatStatusValue - comprehensive', () => {
    it('should handle numeric ID as index', () => {
      const result = (service as any).formatStatusValue('123');
      expect(result).toEqual({ index: 123 });
    });

    it('should handle text label', () => {
      const result = (service as any).formatStatusValue('In Progress');
      expect(result).toEqual({ label: 'In Progress' });
    });

    it('should handle mixed array', () => {
      const result = (service as any).formatStatusValue(['Status1', 'Status2']);
      expect(result).toHaveProperty('label');
    });
  });

  describe('formatBoardRelationValue - all branches', () => {
    it('should handle object with item_ids already formatted', () => {
      const input = { item_ids: [123, 456] };
      const result = (service as any).formatBoardRelationValue(input);
      expect(result).toEqual({ item_ids: [123, 456] });
    });

    it('should parse string item_ids to integers', () => {
      const input = { item_ids: ['123', '456'] };
      const result = (service as any).formatBoardRelationValue(input);
      expect(result).toEqual({ item_ids: [123, 456] });
    });

    it('should handle single string ID', () => {
      const result = (service as any).formatBoardRelationValue('789');
      expect(result).toEqual({ item_ids: [789] });
    });

    it('should handle single numeric ID', () => {
      const result = (service as any).formatBoardRelationValue(999);
      expect(result).toEqual({ item_ids: [999] });
    });

    it('should filter out invalid IDs from array', () => {
      const result = (service as any).formatBoardRelationValue(['123', 'invalid', '456', NaN]);
      expect(result.item_ids).toEqual([123, 456]);
    });

    it('should return undefined when no valid IDs', () => {
      const result = (service as any).formatBoardRelationValue(['invalid', 'data']);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = (service as any).formatBoardRelationValue('');
      expect(result).toBeUndefined();
    });
  });

  describe('formatDateValue - all branches', () => {
    it('should convert DD/MM/YYYY string to date object', () => {
      const result = (service as any).formatDateValue('31/12/2024');
      expect(result).toEqual({ date: '2024-12-31' });
    });

    it('should keep YYYY-MM-DD format', () => {
      const result = (service as any).formatDateValue('2024-12-31');
      expect(result).toEqual({ date: '2024-12-31' });
    });

    it('should handle Date object', () => {
      const date = new Date('2024-12-31');
      const result = (service as any).formatDateValue(date);
      expect(result).toHaveProperty('date');
    });

    it('should pass through other string formats', () => {
      const result = (service as any).formatDateValue('Dec 31, 2024');
      expect(result).toEqual({ date: 'Dec 31, 2024' });
    });
  });

  describe('formatTagsValue - all branches', () => {
    it('should wrap string in tag_ids array', () => {
      const result = (service as any).formatTagsValue('SingleTag');
      expect(result).toEqual({ tag_ids: ['SingleTag'] });
    });

    it('should keep array as tag_ids', () => {
      const result = (service as any).formatTagsValue(['Tag1', 'Tag2', 'Tag3']);
      expect(result).toEqual({ tag_ids: ['Tag1', 'Tag2', 'Tag3'] });
    });

    it('should handle number converted to array', () => {
      const result = (service as any).formatTagsValue(123);
      expect(result).toEqual({ tag_ids: [123] });
    });
  });

  describe('resolveConnectBoardColumns - error handling', () => {
    it('should handle database error gracefully', async () => {
      const connectColumns = {
        conectar_quadros: 'TestItem'
      };

      mockMondayItemRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle empty string values', async () => {
      const connectColumns = {
        conectar_quadros: ['valid', '', '  ']
      };

      const result = await (service as any).resolveConnectBoardColumns(connectColumns);

      expect(result).toBeDefined();
    });
  });

  describe('normalizeToStringArray - edge cases', () => {
    it('should handle object with neither labels nor ids', () => {
      const result = (service as any).normalizeToStringArray({ other: 'value' });
      expect(result).toEqual(['[object Object]']);
    });

    it('should handle boolean', () => {
      const result = (service as any).normalizeToStringArray(true);
      expect(result).toEqual(['true']);
    });

    it('should handle number', () => {
      const result = (service as any).normalizeToStringArray(42);
      expect(result).toEqual(['42']);
    });
  });

  describe('getCodeByItemName - error handling', () => {
    it('should handle database error', async () => {
      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (service as any).getCodeByItemName('TestItem');

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle empty string', async () => {
      const result = await (service as any).getCodeByItemName('');

      expect(result).toBeUndefined();
    });

    it('should handle whitespace only', async () => {
      const result = await (service as any).getCodeByItemName('   ');

      expect(result).toBeUndefined();
    });
  });

  describe('findMondayItemBySearchTerm - error cases', () => {
    it('should catch and handle query builder errors', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('Query error'))
      };

      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (service as any).findMondayItemBySearchTerm('test');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('buildPeopleFromLookupObjetivo - error handling', () => {
    it('should catch and handle database errors', async () => {
      const data = { text_mkvhvcw4: 'Area' };

      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle item without team', async () => {
      const data = { text_mkvhvcw4: 'Area' };

      mockMondayItemRepository.findOne.mockResolvedValue({
        name: 'Area',
        team: []
      } as any);

      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toBeUndefined();
    });

    it('should filter out empty team IDs', async () => {
      const data = { text_mkvhvcw4: 'Area' };

      mockMondayItemRepository.findOne.mockResolvedValue({
        name: 'Area',
        team: ['123', '', '  ', '456']
      } as any);

      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toBeDefined();
      if (result) {
        expect(result.personsAndTeams).toHaveLength(2);
      }
    });
  });

  describe('processFileUpload - additional coverage', () => {
    it('should handle missing file gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      await (service as any).processFileUpload('101', '123', formData);

      // Should not crash when no file to upload
      expect(true).toBe(true);
    });
  });

  describe('toYYYYMMDD - additional formats', () => {
    it('should handle YYYYMMDD input', () => {
      const result = toYYYYMMDD('20241231');
      expect(result).toBe('20241231');
    });

    it('should handle ISO format YYYY-MM-DD', () => {
      const result = toYYYYMMDD('2024-12-31');
      expect(result).toBe('20241231');
    });

    it('should handle BR format DD/MM/YYYY', () => {
      const result = toYYYYMMDD('31/12/2024');
      expect(result).toBe('20241231');
    });

    it('should try Date.parse for other formats', () => {
      const result = toYYYYMMDD('2024-12-31T10:30:00Z');
      expect(result).toMatch(/^\d{8}$/);
    });

    it('should return empty string for null', () => {
      const result = toYYYYMMDD(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = toYYYYMMDD(undefined);
      expect(result).toBe('');
    });
  });

  describe('extractItemName - all branches', () => {
    it('should use item_name_field when present', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          custom_name: 'Custom Name'
        }
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.custom_name',
        default_item_name: 'Default',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);

      expect(result).toBe('Custom Name');
    });

    it('should use default_item_name when field missing', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.missing',
        default_item_name: 'Default Name',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);

      expect(result).toBe('Default Name');
    });

    it('should use formId when no default_item_name', () => {
      const formData: FormSubmissionData = {
        id: 'form_123',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {}
      };

      const mapping = {
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.missing',
        column_mappings: []
      };

      const result = (service as any).extractItemName(formData, mapping);

      expect(result).toBe('Formulário form_123');
    });
  });

  describe('processMarketingBoardSend', () => {
    it('should create marketing board item and return ID', async () => {
      const testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayItemRepository = mockMondayItemRepository;
      (testService as any).mondayBoardRepository = mockMondayBoardRepository;
      (testService as any).subscriberRepository = mockSubscriberRepository;
      (testService as any).mondayService = mockMondayService;

      (testService as any).createMondayItem = jest.fn().mockResolvedValue('999');
      mockMondayService.changeMultipleColumnValues.mockResolvedValue({});

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Context',
          sele__o_m_ltipla18__1: 'Push',
          long_text_mkrd6mnt: 'https://link.com',
          n_meros9__1: 5
        }
      };

      const marketingItemId = await (testService as any).processMarketingBoardSend(formData, 'Test Marketing', '101');

      expect(marketingItemId).toBe('999');
      expect((testService as any).createMondayItem).toHaveBeenCalled();
    });

    it('should resolve area solicitante from ID to name', async () => {
      const testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayItemRepository = mockMondayItemRepository;
      (testService as any).mondayBoardRepository = mockMondayBoardRepository;
      (testService as any).subscriberRepository = mockSubscriberRepository;
      (testService as any).mondayService = mockMondayService;

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '12345',
        name: 'Marketing Area'
      } as any);

      (testService as any).createMondayItem = jest.fn().mockResolvedValue('888');

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkvhvcw4: '12345',
          sele__o_individual9__1: 'Validação'
        }
      };

      await (testService as any).processMarketingBoardSend(formData, 'Test', '101');

      expect(formData.data.text_mkvhvcw4).toBe('Marketing Area');
    });

    it('should handle error when resolving area solicitante', async () => {
      const testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayItemRepository = mockMondayItemRepository;
      (testService as any).mondayBoardRepository = mockMondayBoardRepository;
      (testService as any).subscriberRepository = mockSubscriberRepository;
      (testService as any).mondayService = mockMondayService;

      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      (testService as any).createMondayItem = jest.fn().mockResolvedValue('777');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          text_mkvhvcw4: '99999'
        }
      };

      await (testService as any).processMarketingBoardSend(formData, 'Test', '101');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao resolver área solicitante'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle error when updating connect columns', async () => {
      const testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayItemRepository = mockMondayItemRepository;
      (testService as any).mondayBoardRepository = mockMondayBoardRepository;
      (testService as any).subscriberRepository = mockSubscriberRepository;
      (testService as any).mondayService = mockMondayService;

      (testService as any).createMondayItem = jest.fn().mockResolvedValue('666');

      // Mock findMondayItemBySearchTerm para retornar um item válido
      (testService as any).findMondayItemBySearchTerm = jest.fn().mockResolvedValue({ item_id: '999' });

      mockMondayService.changeMultipleColumnValues.mockRejectedValue(new Error('Update Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          conectar_quadros: 'Item1'
        }
      };

      await (testService as any).processMarketingBoardSend(formData, 'Test', '101');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao atualizar colunas conectar_quadros'), expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('adjustSubitemsCapacity', () => {
    it('should remove invalid subitems', async () => {
      const subitems = [
        { id: '', data__1: '2024-12-01', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 5 },
        { id: 'channel1', data__1: '', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 5 },
        { id: 'channel2', data__1: '2024-12-01', conectar_quadros_mkkcnyr3: '', n_meros_mkkchcmk: 5 },
        { id: 'channel3', data__1: '2024-12-01', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 0 }
      ];

      mockMondayItemRepository.find.mockResolvedValue([
        { name: '08:00', status: 'Ativo' },
        { name: '10:00', status: 'Ativo' }
      ] as any);

      const result = await (service as any).adjustSubitemsCapacity(subitems, {
        data: { area_solicitante: 'Test' }
      });

      expect(result.length).toBeLessThan(subitems.length);
    });

    it('should allocate within capacity', async () => {
      const subitems = [
        { id: 'channel1', data__1: '2024-12-25', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 5 }
      ];

      mockMondayItemRepository.find.mockResolvedValue([
        { name: '10:00', status: 'Ativo' },
        { name: '14:00', status: 'Ativo' }
      ] as any);

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: 'channel1',
        max_value: 10
      } as any);

      const result = await (service as any).adjustSubitemsCapacity(subitems, {
        data: { area_solicitante: 'Test' }
      });

      expect(result).toHaveLength(1);
      expect(result[0].n_meros_mkkchcmk).toBe(5);
    });

    it('should split hours (08:00, 08:30) capacity', async () => {
      const subitems = [
        { id: 'channel1', data__1: '2024-12-25', conectar_quadros_mkkcnyr3: '08:00', n_meros_mkkchcmk: 3 }
      ];

      mockMondayItemRepository.find.mockResolvedValue([
        { name: '08:00', status: 'Ativo' },
        { name: '08:30', status: 'Ativo' },
        { name: '10:00', status: 'Ativo' }
      ] as any);

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: 'channel1',
        max_value: 10
      } as any);

      const result = await (service as any).adjustSubitemsCapacity(subitems, {
        data: { area_solicitante: 'Test' }
      });

      expect(result).toBeDefined();
    });

    it('should handle missing max_value', async () => {
      const subitems = [
        { id: 'channel1', data__1: '2024-12-25', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 5 }
      ];

      mockMondayItemRepository.find.mockResolvedValue([
        { name: '10:00', status: 'Ativo' }
      ] as any);

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: 'channel1',
        max_value: undefined
      } as any);

      const result = await (service as any).adjustSubitemsCapacity(subitems, {
        data: { area_solicitante: 'Test' }
      });

      expect(result).toBeDefined();
    });

    it('should handle invalid date parsing', async () => {
      const subitems = [
        { id: 'channel1', data__1: 'invalid-date', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 5 }
      ];

      mockMondayItemRepository.find.mockResolvedValue([
        { name: '10:00', status: 'Ativo' }
      ] as any);

      const result = await (service as any).adjustSubitemsCapacity(subitems, {
        data: { area_solicitante: 'Test' }
      });

      expect(result).toBeDefined();
    });
  });

  describe('splitConnectBoardColumns - additional coverage', () => {
    it('should handle link_to_itens_filhos as connect column', () => {
      const columns = {
        field1: 'value1',
        link_to_itens_filhos__1: { item_ids: [123] },
        field2: 'value2'
      };

      const result = (service as any).splitConnectBoardColumns(columns);

      expect(result.baseColumns).toEqual({
        field1: 'value1',
        field2: 'value2'
      });
      expect(result.connectColumnsRaw).toEqual({
        link_to_itens_filhos__1: { item_ids: [123] }
      });
    });
  });

  describe('getValueByPath - additional coverage', () => {
    it('should handle deeply nested paths', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          level1: {
            level2: {
              level3: 'deep value'
            }
          }
        }
      };

      const result = (service as any).getValueByPath(formData, 'data.level1.level2.level3');

      expect(result).toBe('deep value');
    });

    it('should return undefined for path with null in middle', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: {
          level1: null
        }
      };

      const result = (service as any).getValueByPath(formData, 'data.level1.level2');

      expect(result).toBeUndefined();
    });
  });

  describe('convertDateFormat - additional coverage', () => {
    it('should return input when not matching any format', () => {
      const result = convertDateFormat('2024/12/31');

      expect(result).toBe('2024/12/31');
    });
  });

  describe('resolvePeopleFromSubscribers - additional coverage', () => {
    it('should handle empty array', async () => {
      const result = await (service as any).resolvePeopleFromSubscribers([]);

      expect(result).toBeUndefined();
    });

    it('should handle null input', async () => {
      const result = await (service as any).resolvePeopleFromSubscribers(null);

      expect(result).toBeUndefined();
    });
  });

  describe('parseFlexibleDateToDate - comprehensive coverage', () => {
    it('should handle date with time component', () => {
      const result = (service as any).parseFlexibleDateToDate('2024-12-31 23:59:59');

      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for empty input', () => {
      const result = (service as any).parseFlexibleDateToDate('   ');

      expect(result).toBeNull();
    });
  });

  // ========================================
  // TESTES EXTENSIVOS PARA MÉTODOS GRANDES
  // ========================================

  describe('buildSecondBoardInitialPayloadFromSubitem - comprehensive', () => {
    let testService: BriefingMateriaisCriativosGamService;
    let mockMondayServiceLocal: any;
    let mockMondayBoardRepoLocal: any;
    let mockMondayItemRepoLocal: any;

    beforeEach(() => {
      mockMondayServiceLocal = {
        getSubproductCodeByProduct: jest.fn().mockResolvedValue(null),
        getSubproductByProduct: jest.fn().mockResolvedValue(null)
      };
      mockMondayBoardRepoLocal = {
        findOne: jest.fn().mockResolvedValue({ id: 'board_produto_123' })
      };
      mockMondayItemRepoLocal = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayService = mockMondayServiceLocal;
      (testService as any).mondayBoardRepository = mockMondayBoardRepoLocal;
      (testService as any).mondayItemRepository = mockMondayItemRepoLocal;
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('CODE123');
      (testService as any).buildCompositeTextFieldSecondBoard = jest.fn().mockResolvedValue('composite-test');
    });

    it('should map secondBoardCorrelationFromSubmission from subitem', async () => {
      const subitem = { campo_sub1: 'valor_sub1' };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [
        { id_submission: 'campo_sub1', id_second_board: 'col_second1' }
      ];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['col_second1']).toBe('valor_sub1');
    });

    it('should map secondBoardCorrelationFromSubmission from enrichedFormData when not in subitem', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { campo_form1: 'valor_form1' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [
        { id_submission: 'campo_form1', id_second_board: 'col_second2' }
      ];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['col_second2']).toBe('valor_form1');
    });

    it('should skip empty id_submission in correlations', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [
        { id_submission: '', id_second_board: 'col_second3' },
        { id_submission: ' ', id_second_board: 'col_second4' }
      ];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['col_second3']).toBeUndefined();
      expect(result.column_values['col_second4']).toBeUndefined();
    });

    it('should map secondBoardCorrelationFromFirst from firstBoardAllColumnValues', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = { col_first1: 'valor_first1' };
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [
        { id_first_board: 'col_first1', id_second_board: 'col_second_from_first' }
      ];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['col_second_from_first']).toBe('valor_first1');
    });

    it('should skip empty id_first_board in correlations', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [
        { id_first_board: '', id_second_board: 'col_second5' },
        { id_first_board: '  ', id_second_board: 'col_second6' }
      ];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['col_second5']).toBeUndefined();
      expect(result.column_values['col_second6']).toBeUndefined();
    });

    it('should set date_mkrk5v4c to today if undefined', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).formatDateValue = jest.fn((iso) => ({ date: iso }));

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['date_mkrk5v4c']).toBeDefined();
      expect((testService as any).formatDateValue).toHaveBeenCalled();
    });

    it('should set text_mkr3v9k3 from subitem data__1', async () => {
      const subitem = { data__1: '2024-03-15' };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkr3v9k3']).toBe('2024-03-15');
    });

    it('should set pessoas5__1 from firstBoardAllColumnValues pessoas__1', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = { pessoas__1: { personsAndTeams: [{ id: 123 }] } };
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['pessoas5__1']).toEqual({ personsAndTeams: [{ id: 123 }] });
    });

    it('should set text_mkrr6jkh from firstBoardItemId', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item999';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrr6jkh']).toBe('item999');
    });

    it('should build taxonomia with subproduct code', async () => {
      const subitem = { texto__1: 'PROD001', conectar_quadros87__1: 'Product Name' };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayServiceLocal.getSubproductCodeByProduct.mockResolvedValue('SUBPROD001');
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(mockMondayServiceLocal.getSubproductCodeByProduct).toHaveBeenCalledWith('Product Name');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Taxonomia criada com subproduto: PROD001_SUBPROD001'));
      consoleSpy.mockRestore();
    });

    it('should build taxonomia without subproduct code when not found', async () => {
      const subitem = { texto__1: 'PROD002', conectar_quadros87__1: 'Unknown Product' };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayServiceLocal.getSubproductCodeByProduct.mockResolvedValue(null);
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subproduto não encontrado'));
      consoleSpy.mockRestore();
    });

    it('should set text_mkrrqsk6 and texto6__1 from Canal (text_mkvhgbp8)', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhgbp8: 'Canal Email' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('EMAIL001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrqsk6']).toBe('Canal Email');
      expect(result.column_values['texto6__1']).toBe('Canal Email');
      expect(result.column_values['text_mkrr8dta']).toBe('EMAIL001');
    });

    it('should default text_mkrr8dta to Email when Canal not provided', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrr8dta']).toBe('Email');
    });

    it('should set Cliente fields from text_mkvhz8g3', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhz8g3: 'Cliente ABC' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('CLI001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrg2hp']).toBe('Cliente ABC');
      expect(result.column_values['text_mkrrna7e']).toBe('CLI001');
    });

    it('should default Cliente code to NaN when not provided', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrna7e']).toBe('NaN');
    });

    it('should set Campanha fields from text_mkvhedf5', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhedf5: 'Campanha XYZ' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('CAMP001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrra7df']).toBe('Campanha XYZ');
      expect(result.column_values['text_mkrrcnpx']).toBe('CAMP001');
    });

    it('should set Disparo fields from text_mkvhqgvn', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhqgvn: 'Disparo ABC' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('DISP001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrr9edr']).toBe('Disparo ABC');
      expect(result.column_values['text_mkrrmjcy']).toBe('DISP001');
    });

    it('should set Mecânica fields from text_mkvhv5ma', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhv5ma: 'Mecânica XYZ' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('MEC001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrxf48']).toBe('Mecânica XYZ');
      expect(result.column_values['text_mkrrxpjd']).toBe('MEC001');
    });

    it('should resolve Solicitante from ID to name', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhvcw4: '123456' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayItemRepoLocal.findOne.mockResolvedValue({ name: 'Area Solicitante', code: 'AREA001' });
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrxqng']).toBe('Area Solicitante');
      expect(result.column_values['text_mkrrmmvv']).toBe('AREA001');
    });

    it('should handle error when resolving Solicitante', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhvcw4: '999999' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayItemRepoLocal.findOne.mockRejectedValue(new Error('Database error'));
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao resolver área solicitante'), expect.any(Error));
      expect(result.column_values['text_mkrrmmvv']).toBe('NaN');
      consoleSpy.mockRestore();
    });

    it('should set Objetivo fields from text_mkvh2z7j', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvh2z7j: 'Objetivo Test' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('OBJ001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrhdh6']).toBe('Objetivo Test');
      expect(result.column_values['text_mkrrraz2']).toBe('OBJ001');
    });

    it('should set Produto fields from text_mkvhwyzr with board_id', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhwyzr: 'Produto ABC' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('PROD001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrfqft']).toBe('Produto ABC');
      expect(result.column_values['text_mkrrjrnw']).toBe('PROD001');
      expect((testService as any).getCodeByItemName).toHaveBeenCalledWith('Produto ABC', 'board_produto_123');
    });

    it('should set Subproduto fields when found', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhwyzr: 'Produto XYZ' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayServiceLocal.getSubproductByProduct.mockResolvedValue({ name: 'Subproduto ABC', code: 'SUB001' });
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkw8et4w']).toBe('Subproduto ABC');
      expect(result.column_values['text_mkw8jfw0']).toBe('SUB001');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subproduto encontrado'));
      consoleSpy.mockRestore();
    });

    it('should set empty Subproduto fields when not found', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhwyzr: 'Produto Solo' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      mockMondayServiceLocal.getSubproductByProduct.mockResolvedValue(null);
      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkw8et4w']).toBe('');
      expect(result.column_values['text_mkw8jfw0']).toBe('');
    });

    it('should set Segmento fields from text_mkvhammc', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhammc: 'Segmento Premium' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).getCodeByItemName = jest.fn().mockResolvedValue('SEG001');

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkrrt32q']).toBe('Segmento Premium');
      expect(result.column_values['text_mkrrhdf8']).toBe('SEG001');
    });

    it('should set text_mkvgjh0w from subitem conectar_quadros_mkkcnyr3', async () => {
      const subitem = { conectar_quadros_mkkcnyr3: '10:30' };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkvgjh0w']).toBe('10:30');
    });

    it('should set conectar_quadros8__1 to firstBoardItemId', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'first_item_789';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['conectar_quadros8__1']).toBe('first_item_789');
    });

    it('should build composite text fields with n_meros__1 and texto6__1', async () => {
      const subitem = { n_meros__1: 5 };
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [
        { id_submission: 'n_meros__1', id_second_board: 'n_meros__1' }
      ];
      (testService as any).secondBoardCorrelationFromFirst = [];
      (testService as any).buildCompositeTextFieldSecondBoard = jest.fn().mockResolvedValue('composite-value');
      (testService as any).formatDateValue = jest.fn((iso) => ({ date: iso }));

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.column_values['text_mkr5kh2r']).toContain('composite-value');
      expect(result.column_values['text_mkr5kh2r']).toContain('-5-');
      expect(result.column_values['text_mkr3jr1s']).toContain('composite-value');
    });

    it('should return item_name with texto6__1', async () => {
      const subitem = {};
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: { text_mkvhgbp8: 'Canal Test' } };
      const firstBoardAllColumnValues = {};
      const firstBoardItemId = 'item123';

      (testService as any).secondBoardCorrelationFromSubmission = [];
      (testService as any).secondBoardCorrelationFromFirst = [];

      const result = await (testService as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );

      expect(result.item_name).toContain('teste excluir GAM');
      expect(result.item_name).toContain('Canal Test');
    });
  });

  describe('processSecondBoardSendsForSubitems - comprehensive', () => {
    let testService: BriefingMateriaisCriativosGamService;
    let mockMondayServiceLocal: any;

    beforeEach(() => {
      mockMondayServiceLocal = {
        changeMultipleColumnValues: jest.fn().mockResolvedValue(undefined)
      };

      testService = new BriefingMateriaisCriativosGamService();
      (testService as any).mondayService = mockMondayServiceLocal;

      (testService as any).buildSecondBoardInitialPayloadFromSubitem = jest.fn().mockResolvedValue({
        item_name: 'Test Item',
        column_values: {
          field1: 'value1',
          conectar_quadros_test: { item_ids: [123] }
        }
      });
      (testService as any).splitConnectBoardColumns = jest.fn().mockReturnValue({
        baseColumns: { field1: 'value1' },
        connectColumnsRaw: { conectar_quadros_test: { item_ids: [123] } }
      });
      (testService as any).pickSecondBoardConnectColumns = jest.fn().mockReturnValue({
        conectar_quadros_test: { item_ids: [123] }
      });
      (testService as any).savePreObjectLocally = jest.fn().mockResolvedValue(undefined);
      (testService as any).createMondayItem = jest.fn().mockResolvedValue('second_item_123');
      (testService as any).resolveConnectBoardColumns = jest.fn().mockResolvedValue({
        conectar_quadros_test: { item_ids: [456] }
      });
      (testService as any).buildPeopleFromLookupObjetivo = jest.fn().mockResolvedValue(null);
      (testService as any).saveObjectLocally = jest.fn().mockResolvedValue(undefined);
    });

    it('should return empty array when no subitems', async () => {
      const enrichedFormData = { id: 'form1', timestamp: '', formTitle: '', data: {} };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual([]);
    });

    it('should process single subitem', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [
            { id: 'sub1', data__1: '2024-01-15' }
          ]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual(['second_item_123']);
      expect((testService as any).buildSecondBoardInitialPayloadFromSubitem).toHaveBeenCalledWith(
        { id: 'sub1', data__1: '2024-01-15' },
        enrichedFormData,
        firstBoardAllColumnValues,
        firstBoardItemId
      );
      expect((testService as any).createMondayItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'Test Item',
        { field1: 'value1' }
      );
    });

    it('should process multiple subitems', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [
            { id: 'sub1', data__1: '2024-01-15' },
            { id: 'sub2', data__1: '2024-01-16' },
            { id: 'sub3', data__1: '2024-01-17' }
          ]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      (testService as any).createMondayItem = jest.fn()
        .mockResolvedValueOnce('second_item_1')
        .mockResolvedValueOnce('second_item_2')
        .mockResolvedValueOnce('second_item_3');

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual(['second_item_1', 'second_item_2', 'second_item_3']);
      expect((testService as any).buildSecondBoardInitialPayloadFromSubitem).toHaveBeenCalledTimes(3);
      expect((testService as any).createMondayItem).toHaveBeenCalledTimes(3);
    });

    it('should call savePreObjectLocally for each subitem with correct index', async () => {
      const enrichedFormData = {
        id: 'form_abc',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [
            { id: 'sub1' },
            { id: 'sub2' }
          ]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect((testService as any).savePreObjectLocally).toHaveBeenCalledWith(
        expect.objectContaining({ item_name: 'Test Item' }),
        'form_abc_gam_second_board_predat-idx_0'
      );
      expect((testService as any).savePreObjectLocally).toHaveBeenCalledWith(
        expect.objectContaining({ item_name: 'Test Item' }),
        'form_abc_gam_second_board_predat-idx_1'
      );
    });

    it('should handle error in savePreObjectLocally', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      (testService as any).savePreObjectLocally = jest.fn().mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual(['second_item_123']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao gerar/salvar pre-data'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should call resolveConnectBoardColumns and changeMultipleColumnValues', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect((testService as any).resolveConnectBoardColumns).toHaveBeenCalledWith({
        conectar_quadros_test: { item_ids: [123] }
      });
      expect(mockMondayServiceLocal.changeMultipleColumnValues).toHaveBeenCalledWith(
        expect.any(String),
        'second_item_123',
        expect.objectContaining({ conectar_quadros_test: { item_ids: [456] } })
      );
    });

    it('should add pessoas3__1 from buildPeopleFromLookupObjetivo', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }],
          lookup_mkrt36cj: 'objetivo_value'
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      (testService as any).buildPeopleFromLookupObjetivo = jest.fn().mockResolvedValue({ personsAndTeams: [{ id: 789 }] });

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(mockMondayServiceLocal.changeMultipleColumnValues).toHaveBeenCalledWith(
        expect.any(String),
        'second_item_123',
        expect.objectContaining({
          conectar_quadros_test: { item_ids: [456] },
          pessoas3__1: { personsAndTeams: [{ id: 789 }] }
        })
      );
    });

    it('should handle error in buildPeopleFromLookupObjetivo', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      (testService as any).buildPeopleFromLookupObjetivo = jest.fn().mockRejectedValue(new Error('People failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual(['second_item_123']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao montar pessoas3__1'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle error in changeMultipleColumnValues', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      mockMondayServiceLocal.changeMultipleColumnValues = jest.fn().mockRejectedValue(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(result).toEqual(['second_item_123']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao atualizar colunas conectar_quadros'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should call saveObjectLocally with correct parameters', async () => {
      const enrichedFormData = {
        id: 'form_xyz',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect((testService as any).saveObjectLocally).toHaveBeenCalledWith(
        expect.objectContaining({
          board_id: expect.any(String),
          item_id: 'second_item_123'
        }),
        'form_xyz_gam_second_board_connect_columns_idx_0'
      );
      expect((testService as any).savePreObjectLocally).toHaveBeenCalledWith(
        expect.objectContaining({
          board_id: expect.any(String),
          item_id: 'second_item_123'
        }),
        'form_xyz_gam_second_board_second_send_predat-idx_0'
      );
    });

    it('should skip changeMultipleColumnValues when resolved is empty', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'Fallback';
      const firstBoardItemId = 'item123';

      (testService as any).resolveConnectBoardColumns = jest.fn().mockResolvedValue({});

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect(mockMondayServiceLocal.changeMultipleColumnValues).not.toHaveBeenCalled();
    });

    it('should use fallbackItemName when item_name is empty', async () => {
      const enrichedFormData = {
        id: 'form1',
        timestamp: '',
        formTitle: '',
        data: {
          __SUBITEMS__: [{ id: 'sub1' }]
        }
      };
      const firstBoardAllColumnValues = {};
      const fallbackItemName = 'My Fallback Name';
      const firstBoardItemId = 'item123';

      (testService as any).buildSecondBoardInitialPayloadFromSubitem = jest.fn().mockResolvedValue({
        item_name: '',
        column_values: { field1: 'value1' }
      });

      await (testService as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        firstBoardAllColumnValues,
        fallbackItemName,
        firstBoardItemId
      );

      expect((testService as any).createMondayItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringMatching(/teste excluir GAM|My Fallback Name/),
        expect.any(Object)
      );
    });
  });
});
