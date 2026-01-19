import { Repository } from 'typeorm';
import { NewBriefingMateriaisCriativosService } from '../../src/services/NewBriefingMateriaisCriativosService';
import { MondayService } from '../../src/services/MondayService';
import { MondayItem } from '../../src/entities/MondayItem';
import { Subscriber } from '../../src/entities/Subscriber';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayColumnType } from '../../src/dto/MondayFormMappingDto';

jest.mock('../../src/services/MondayService');
jest.mock('../../src/config/database');
jest.mock('fs');

describe('NewBriefingMateriaisCriativosService', () => {
  let service: NewBriefingMateriaisCriativosService;
  let mockMondayService: jest.Mocked<MondayService>;
  let mockMondayItemRepository: jest.Mocked<Repository<MondayItem>>;
  let mockSubscriberRepository: jest.Mocked<Repository<Subscriber>>;
  let mockMondayBoardRepository: jest.Mocked<Repository<MondayBoard>>;

  beforeEach(() => {
    // Limpar todos os mocks
    jest.clearAllMocks();

    // Configurar mocks dos repositórios
    mockMondayItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    mockSubscriberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockMondayBoardRepository = {
      findOne: jest.fn(),
    } as any;

    // Configurar AppDataSource.getRepository para retornar os mocks corretos
    const { AppDataSource } = require('../../src/config/database');
    AppDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity === MondayItem || entity.name === 'MondayItem') {
        return mockMondayItemRepository;
      }
      if (entity === Subscriber || entity.name === 'Subscriber') {
        return mockSubscriberRepository;
      }
      if (entity === MondayBoard || entity.name === 'MondayBoard') {
        return mockMondayBoardRepository;
      }
      return {};
    });

    // Configurar mock do MondayService
    mockMondayService = {
      makeGraphQLRequest: jest.fn(),
      changeMultipleColumnValues: jest.fn(),
      uploadFile: jest.fn(),
    } as any;

    // Instanciar o serviço
    service = new NewBriefingMateriaisCriativosService();
    (service as any).mondayService = mockMondayService;
  });

  describe('constructor', () => {
    it('should initialize with monday item repository', () => {
      expect(service).toBeDefined();
      expect((service as any).mondayItemRepository).toBeDefined();
    });
  });

  describe('validateSpecificFields', () => {
    describe('Growth/BU/Marca briefing type', () => {
      it('should not throw error when all required fields are present', () => {
        const data = {
          sele__o_individual9__1: 'Growth',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should throw error when required fields are missing', () => {
        const data = {
          sele__o_individual9__1: 'Growth',
          briefing_requesting_area: 'Marketing'
          // Missing other required fields
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/Validação de campos condicionais falhou/);
      });

      it('should validate with lowercase briefing type', () => {
        const data = {
          sele__o_individual9__1: 'growth',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should handle BU briefing type', () => {
        const data = {
          sele__o_individual9__1: 'BU',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should handle Marca briefing type', () => {
        const data = {
          sele__o_individual9__1: 'Marca',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });
    });

    describe('Conteúdo/Redes Sociais briefing type', () => {
      it('should not throw error when all required fields are present', () => {
        const data = {
          sele__o_individual9__1: 'Conteúdo',
          text_mksn5est: 'Hero',
          text_mksns2p1: 'Tensão',
          long_text_mksn15gd: 'Posicionamento',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Post estático',
          n_meros92__1: 3
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should throw error when content-specific fields are missing', () => {
        const data = {
          sele__o_individual9__1: 'Conteúdo/Redes Sociais',
          long_text_mksehp7a: 'Contexto'
          // Missing Hero, Tensão, Posicionamento, etc.
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/Hero/);
      });

      it('should handle "Redes Sociais" variant', () => {
        const data = {
          sele__o_individual9__1: 'Redes Sociais',
          text_mksn5est: 'Hero',
          text_mksns2p1: 'Tensão',
          long_text_mksn15gd: 'Posicionamento',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Post estático',
          n_meros92__1: 3
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });
    });

    describe('Validação briefing type', () => {
      it('should not throw error when all required fields are present', () => {
        const data = {
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla18__1: 'Banner | Home',
          long_text_mkrd6mnt: 'https://links.com',
          n_meros077__1: 2
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should throw error when validation links are missing', () => {
        const data = {
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla18__1: 'Banner | Home'
          // Missing long_text_mkrd6mnt
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/Links úteis para validação/);
      });

      it('should handle "validacao" variant', () => {
        const data = {
          sele__o_individual9__1: 'validacao',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla18__1: 'Banner | Home',
          long_text_mkrd6mnt: 'https://links.com',
          n_meros077__1: 2
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });
    });

    describe('Tipo de Entrega validation', () => {
      it('should validate numeric field when Tipo de Entrega is selected', () => {
        const data = {
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should throw error when numeric field is missing', () => {
        const data = {
          sele__o_m_ltipla18__1: 'Push'
          // Missing n_meros9__1
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/Número de peças Push/);
      });

      it('should throw error when numeric field is zero', () => {
        const data = {
          sele__o_m_ltipla18__1: 'SMS',
          n_meros43__1: 0
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/deve ser um número maior que zero/);
      });

      it('should throw error when numeric field is negative', () => {
        const data = {
          sele__o_m_ltipla18__1: 'E-mail MKT',
          n_meros1__1: -5
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/deve ser um número maior que zero/);
      });

      it('should validate multiple Tipo de Entrega selections', () => {
        const data = {
          sele__o_m_ltipla18__1: ['Push', 'SMS', 'E-mail MKT'],
          n_meros9__1: 5,
          n_meros43__1: 3,
          n_meros1__1: 2
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should throw error for Webview without Deep Link', () => {
        const data = {
          sele__o_m_ltipla18__1: 'Webview',
          n_meros37__1: 1
          // Missing text_mkrtbysb (Deep Link)
        };

        expect(() => (service as any).validateSpecificFields(data))
          .toThrow(/Deep Link/);
      });

      it('should pass when Webview has Deep Link', () => {
        const data = {
          sele__o_m_ltipla18__1: 'Webview',
          n_meros37__1: 1,
          text_mkrtbysb: 'https://deeplink.com'
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should validate all delivery types with their numeric fields', () => {
        const data = {
          sele__o_m_ltipla18__1: [
            'Banner | Home',
            'Banner | Store',
            'Banner DM',
            'Banner Notificação',
            'Banner Pix',
            'WhatsApp Carrossel',
            'Lojas de App',
            'Vídeo',
            'In-App',
            'RCS'
          ],
          n_meros077__1: 1,
          n_meros5__1: 2,
          n_meros_mkn5hh88: 3,
          n_meros_mkn5w9c: 4,
          n_meros_mkn5pst6: 5,
          numeric_mkqqwthm: 6,
          n_meros__1: 7,
          n_meros4__1: 8,
          n_meros47__1: 9,
          n_meros_mkn59dj1: 10
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should skip validation when no briefing type is specified', () => {
        const data = {
          some_field: 'value'
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should handle empty string briefing type', () => {
        const data = {
          sele__o_individual9__1: '',
          some_field: 'value'
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should handle whitespace in briefing type', () => {
        const data = {
          sele__o_individual9__1: '  Growth  ',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });

      it('should skip validation for unknown Tipo de Entrega', () => {
        const data = {
          sele__o_m_ltipla18__1: 'Unknown Type'
        };

        expect(() => (service as any).validateSpecificFields(data)).not.toThrow();
      });
    });
  });

  describe('processBriefingMateriaisCriativosSubmission', () => {
    it('should process submission successfully', async () => {
      const formData = {
        id: 'form123',
        timestamp: Date.now(),
        formTitle: 'Test Briefing',
        data: {
          formTitle: 'Test Briefing',
          sele__o_individual9__1: 'Growth',
          briefing_requesting_area: 'Marketing',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla__1: 'Objetivo',
          sele__o_m_ltipla1__1: 'Ação',
          texto_curto23__1: 'CTA',
          texto_curto8__1: 'Obrigatoriedades',
          data__1: '2024-01-15',
          lista_suspensa__1: 'Benefício',
          lista_suspensa9__1: 'Gatilho',
          sele__o_m_ltipla18__1: 'Push',
          n_meros9__1: 5
        }
      };

      mockMondayItemRepository.findOne.mockResolvedValue(null);
      mockMondayBoardRepository.findOne.mockResolvedValue({ id: '123', board_id: '123' } as any);

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '999',
            name: 'Test Briefing',
            column_values: []
          }
        }
      });

      mockMondayService.changeMultipleColumnValues.mockResolvedValue({} as any);

      const result = await service.processBriefingMateriaisCriativosSubmission(formData as any);

      expect(result).toBe('999');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const formData = {
        id: 'form123',
        data: {
          sele__o_individual9__1: 'Growth'
          // Missing required fields
        }
      };

      await expect(service.processBriefingMateriaisCriativosSubmission(formData as any))
        .rejects.toThrow(/Falha ao criar item na Monday.com/);
    });

    it('should handle Monday API errors', async () => {
      const formData = {
        id: 'form123',
        data: {
          formTitle: 'Test',
          sele__o_individual9__1: 'Validação',
          long_text_mksehp7a: 'Contexto',
          sele__o_m_ltipla18__1: 'Push',
          long_text_mkrd6mnt: 'https://links.com',
          n_meros9__1: 1
        }
      };

      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(service.processBriefingMateriaisCriativosSubmission(formData as any))
        .rejects.toThrow(/Falha ao criar item na Monday.com/);
    });

    it('should process with custom mapping', async () => {
      const formData = {
        id: 'form123',
        data: {
          formTitle: 'Custom Briefing',
          custom_field: 'value'
        }
      };

      const customMapping = {
        board_id: '456',
        group_id: 'custom_group',
        item_name_field: 'data.formTitle',
        default_item_name: 'Custom Default',
        column_mappings: []
      };

      mockMondayItemRepository.findOne.mockResolvedValue(null);
      mockMondayBoardRepository.findOne.mockResolvedValue({ id: '456', board_id: '456' } as any);

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '888',
            name: 'Custom Briefing',
            column_values: []
          }
        }
      });

      const result = await service.processBriefingMateriaisCriativosSubmission(formData as any, customMapping as any);

      expect(result).toBe('888');
    });
  });

  describe('buildColumnValues', () => {
    it('should build column values from form data', async () => {
      const formData = {
        id: 'form123',
        data: {
          field1: 'value1',
          field2: 'value2',
          data__1: '15/01/2024'
        }
      };

      const mapping = {
        form_id: 'form123',
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.formTitle',
        default_item_name: 'Default',
        column_mappings: [
          {
            form_field_path: 'field1',
            monday_column_id: 'text__1',
            column_type: MondayColumnType.TEXT
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.field1).toBe('value1');
      expect(result.field2).toBe('value2');
      expect(result).toHaveProperty('field1');
      expect(result).toHaveProperty('field2');
    });

    it('should exclude specified fields', async () => {
      const formData = {
        id: 'form123',
        data: {
          formTitle: 'Title',
          timestamp: '2024-01-15',
          __SUBITEMS__: [],
          regular_field: 'value'
        }
      };

      const mapping = {
        form_id: 'form123',
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.formTitle',
        default_item_name: 'Default',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result.formTitle).toBeUndefined();
      expect(result.timestamp).toBeUndefined();
      expect(result.__SUBITEMS__).toBeUndefined();
      expect(result.regular_field).toBe('value');
    });

    it('should handle pessoas5__1 with personsAndTeams format', async () => {
      const formData = {
        id: 'form123',
        data: {
          'pessoas5__1': {
            personsAndTeams: [{ id: 123, kind: 'person' }]
          }
        }
      };

      const mapping = {
        form_id: 'form123',
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.formTitle',
        default_item_name: 'Default',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result['pessoas__1']).toEqual({
        personsAndTeams: [{ id: 123, kind: 'person' }]
      });
    });

    it('should resolve pessoas5__1 via subscribers', async () => {
      const formData = {
        id: 'form123',
        data: {
          'pessoas5__1': 'user@example.com'
        }
      };

      const mapping = {
        form_id: 'form123',
        board_id: '123',
        group_id: 'topics',
        item_name_field: 'data.formTitle',
        default_item_name: 'Default',
        column_mappings: []
      };

      mockSubscriberRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        monday_id: '789'
      } as any);

      const result = await (service as any).buildColumnValues(formData, mapping);

      expect(result['pessoas__1']).toEqual({
        personsAndTeams: [{ id: '1', kind: 'person' }]
      });
    });
  });

  describe('buildCompositeTextField', () => {
    it('should build composite text field with all components', async () => {
      const formData = {
        id: 'form123',
        data: {
          text_mkr3n64h: '20240115',
          lookup_mkrtaebd: 'Lookup1',
          lookup_mkrt66aq: 'Lookup2',
          lookup_mkrtxa46: 'Lookup3',
          lookup_mkrta7z1: 'Lookup4',
          lookup_mkrt36cj: 'Lookup5',
          lookup_mkrtwq7k: 'Lookup6',
          lookup_mkrtvsdj: 'Lookup7',
          lookup_mkrtcctn: 'Lookup8',
          name: 'TestName'
        }
      };

      mockMondayItemRepository.findOne.mockResolvedValue({
        id: 1,
        item_id: '111',
        name: 'Lookup1',
        code: 'CODE1'
      } as any);

      const result = await (service as any).buildCompositeTextField(formData, '999');

      expect(result).toContain('20240115');
      expect(result).toContain('id-999');
      expect(result).toContain('TestName');
    });

    it('should use data__1 when text_mkr3n64h is missing', async () => {
      const formData = {
        id: 'form123',
        data: {
          data__1: '2024-01-15',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData, '999');

      expect(result).toContain('20240115');
    });

    it('should handle missing lookup values', async () => {
      const formData = {
        id: 'form123',
        data: {
          text_mkr3n64h: '20240115',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData, '999');

      expect(result).toContain('20240115');
      expect(result).toContain('id-999');
      expect(result).toContain('TestName');
    });

    it('should handle missing itemId', async () => {
      const formData = {
        id: 'form123',
        data: {
          text_mkr3n64h: '20240115',
          name: 'TestName'
        }
      };

      const result = await (service as any).buildCompositeTextField(formData);

      expect(result).toContain('20240115');
      expect(result).not.toContain('id-');
    });
  });

  describe('getCodeByItemName', () => {
    it('should return code when item is found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: 1,
        item_id: '111',
        name: 'Test Item',
        code: 'TEST123'
      } as any);

      const result = await (service as any).getCodeByItemName('Test Item');

      expect(result).toBe('TEST123');
    });

    it('should return undefined when item not found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).getCodeByItemName('Non-existent');

      expect(result).toBeUndefined();
    });

    it('should filter by board_id when provided', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: 1,
        item_id: '111',
        name: 'Test Item',
        board_id: '456',
        code: 'BOARD456'
      } as any);

      const result = await (service as any).getCodeByItemName('Test Item', '456');

      expect(result).toBe('BOARD456');
      expect(mockMondayItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Item', board_id: '456' }
      });
    });

    it('should handle database errors', async () => {
      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await (service as any).getCodeByItemName('Test Item');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty name', async () => {
      const result = await (service as any).getCodeByItemName('');

      expect(result).toBeUndefined();
    });
  });

  describe('toYYYYMMDD', () => {
    it('should convert YYYY-MM-DD to YYYYMMDD', () => {
      const result = (service as any).toYYYYMMDD('2024-01-15');
      expect(result).toBe('20240115');
    });

    it('should convert DD/MM/YYYY to YYYYMMDD', () => {
      const result = (service as any).toYYYYMMDD('15/01/2024');
      expect(result).toBe('20240115');
    });

    it('should keep YYYYMMDD as is', () => {
      const result = (service as any).toYYYYMMDD('20240115');
      expect(result).toBe('20240115');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = (service as any).toYYYYMMDD(date);
      expect(result).toBe('20240115');
    });

    it('should return empty string for invalid input', () => {
      const result = (service as any).toYYYYMMDD('invalid-date');
      expect(result).toBe('');
    });

    it('should return empty string for null', () => {
      const result = (service as any).toYYYYMMDD(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = (service as any).toYYYYMMDD(undefined);
      expect(result).toBe('');
    });
  });

  describe('processMarketingBoardSend', () => {
    it.skip('should process marketing board send successfully', async () => {
      // Complex test requiring extensive mocking - skipped for now
    });

    it.skip('should resolve area solicitante from ID to name', async () => {
      // Complex test - requires full integration mock
    });

    it.skip('should handle pessoas7 field correctly', async () => {
      // Complex test - requires full integration mock
    });
  });
});
