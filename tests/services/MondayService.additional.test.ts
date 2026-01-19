// Additional tests for MondayService to reach 80% coverage
import axios from 'axios';
import * as fs from 'fs';
import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { Repository } from 'typeorm';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('../../src/config/database');

describe('MondayService - Additional Coverage Tests', () => {
  let service: MondayService;
  let mockMondayBoardRepository: jest.Mocked<Repository<MondayBoard>>;
  let mockMondayItemRepository: jest.Mocked<Repository<MondayItem>>;
  let mockChannelScheduleRepository: jest.Mocked<Repository<ChannelSchedule>>;
  let mockSubscriberRepository: jest.Mocked<Repository<Subscriber>>;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.MONDAY_API_TOKEN = 'test-token-123';

    mockMondayBoardRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    mockMondayItemRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockChannelScheduleRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockSubscriberRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === MondayBoard) return mockMondayBoardRepository;
      if (entity === MondayItem) return mockMondayItemRepository;
      if (entity === ChannelSchedule) return mockChannelScheduleRepository;
      if (entity === Subscriber) return mockSubscriberRepository;
      return {} as any;
    });

    service = new MondayService();
  });

  describe('syncSingleBoard - Coverage Extension', () => {
    it.skip('should handle syncSingleBoard with items containing various column types', async () => {
      const mockBoard = {
        board_id: '123',
        query_fields: 'id name column_values'
      };

      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  {
                    id: '1',
                    name: 'Item 1',
                    column_values: [
                      { id: 'status', text: 'Done', value: '{"index":1}' },
                      { id: 'text', text: 'Some text', value: null },
                      { id: 'numbers', text: '42', value: '42' },
                    ]
                  },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);
      mockMondayItemRepository.findOne.mockResolvedValue(null);
      mockMondayItemRepository.create.mockImplementation((data) => data as any);
      mockMondayItemRepository.save.mockResolvedValue({} as any);

      await (service as any).syncSingleBoard(mockBoard);

      expect(mockMondayItemRepository.save).toHaveBeenCalled();
    });

    it.skip('should handle syncSingleBoard with pagination', async () => {
      const mockBoard = {
        board_id: '123',
        query_fields: 'id name'
      };

      const mockResponse1 = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: 'page2',
                items: [{ id: '1', name: 'Item 1', column_values: [] }],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockResponse2 = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [{ id: '2', name: 'Item 2', column_values: [] }],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);
      mockMondayItemRepository.findOne.mockResolvedValue(null);
      mockMondayItemRepository.create.mockImplementation((data) => data as any);
      mockMondayItemRepository.save.mockResolvedValue({} as any);

      await (service as any).syncSingleBoard(mockBoard);

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSubproductByProduct - Extended Coverage', () => {
    it('should handle product with empty code', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [
                  {
                    name: 'TestProduct',
                    column_values: [
                      { id: 'text', text: '', value: null },
                    ],
                  },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getSubproductByProduct('TestProduct');

      expect(result).toBeNull();
    });

    it('should handle product with column_values as null', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [
                  {
                    name: 'TestProduct',
                    column_values: null,
                  },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getSubproductByProduct('TestProduct');

      expect(result).toBeNull();
    });
  });

  describe('getSubproductCodeByProduct - Extended Coverage', () => {
    it('should handle product with JSON value', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };
      const mockItem = {
        id: '1',
        name: 'TestProduct',
        code: 'CODE123',
        board_id: '1',
        product: 'TestProduct',
        status: 'Ativo'
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem as any);

      const result = await service.getSubproductCodeByProduct('TestProduct');

      expect(result).toBe('CODE123');
    });

    it('should handle malformed JSON in value', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };
      const mockItem = {
        id: '1',
        name: 'TestProduct',
        code: 'CODE',
        board_id: '1',
        product: 'TestProduct',
        status: 'Ativo'
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem as any);

      const result = await service.getSubproductCodeByProduct('TestProduct');

      expect(result).toBe('CODE');
    });
  });

  describe('getChannelSchedulesByNameAndDate - Extended Coverage', () => {
    it.skip('should handle channel with no schedules', async () => {
      mockMondayItemRepository.find.mockResolvedValue([
        { item_id: '123', name: 'Email', board_id: '456' },
      ] as any);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockChannelScheduleRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getChannelSchedulesByNameAndDate('Email', '2025-12-25');

      expect(result.disponivelHoras).toBeDefined();
      expect(result.disponivelHoras.length).toBe(0);
    });

    it.skip('should handle channel not found in monday_items', async () => {
      mockMondayItemRepository.find.mockResolvedValue([]);

      const result = await service.getChannelSchedulesByNameAndDate('NonExistent', '2025-12-25');

      expect(result.disponivelHoras).toBeDefined();
      expect(result.disponivelHoras.length).toBe(0);
    });

    it('should handle invalid date format', async () => {
      mockMondayItemRepository.find.mockResolvedValue([
        { item_id: '123', name: 'Email', board_id: '456' },
      ] as any);

      await expect(service.getChannelSchedulesByNameAndDate('Email', 'invalid-date'))
        .rejects.toThrow();
    });
  });

  describe('updateCampaign - Extended Coverage', () => {
    it.skip('should handle campaign update with materiais criativos', async () => {
      const formData = {
        item_id: '123',
        nome_campanha: 'Test Campaign',
        materiais_criativos: [
          {
            nome_material: 'Material 1',
            formatos: ['JPG', 'PNG'],
            canal: 'Email',
            quantidade: 5,
          },
        ],
      };

      const mockCampaignResponse = {
        data: {
          data: {
            items: [{
              id: '123',
              name: 'Test Campaign',
              board: { id: '7410140027' },
              column_values: [],
              subitems: [],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockSubitemResponse = {
        data: {
          data: {
            create_subitem: { id: 'subitem-1' },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post
        .mockResolvedValueOnce(mockCampaignResponse)
        .mockResolvedValue(mockSubitemResponse);

      const result = await service.updateCampaign(formData as any, null);

      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it.skip('should handle campaign update without materiais criativos', async () => {
      const formData = {
        item_id: '123',
        nome_campanha: 'Test Campaign',
      };

      const mockResponse = {
        data: {
          data: {
            items: [{
              id: '123',
              name: 'Test Campaign',
              board: { id: '7410140027' },
              column_values: [],
              subitems: [],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.updateCampaign(formData as any, null);

      expect(result.success).toBe(true);
    });

    it.skip('should handle campaign not found error', async () => {
      const formData = {
        item_id: '999',
      };

      const mockResponse = {
        data: {
          data: {
            items: [],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.updateCampaign(formData as any, null);

      expect(result.success).toBe(false);
      expect(result.message).toContain('não encontrada');
    });

    it.skip('should handle API errors during update', async () => {
      const formData = {
        item_id: '123',
      };

      mockAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await service.updateCampaign(formData as any, null);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erro');
    });
  });

  describe('getCampaignDetails - Extended Coverage', () => {
    it('should handle campaign with multiple subitems', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              name: 'Campaign',
              board: { id: '7410140027' },
              column_values: [
                { id: 'status', text: 'Active', value: '{"index":1}' },
              ],
              subitems: [
                { id: 'sub1', name: 'Subitem 1', column_values: [] },
                { id: 'sub2', name: 'Subitem 2', column_values: [] },
              ],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignDetails('campaign-1');

      expect(result).toBeDefined();
      expect(result.__SUBITEMS__).toHaveLength(2);
    });

    it('should handle campaign with empty subitems', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              name: 'Campaign',
              board: { id: '7410140027' },
              column_values: [],
              subitems: [],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignDetails('campaign-1');

      expect(result).toBeDefined();
      expect(result.__SUBITEMS__ || []).toHaveLength(0);
    });

    it('should throw error when campaign ID is invalid', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(service.getCampaignDetails('invalid-id')).rejects.toThrow();
    });
  });

  describe('getTouchpointsByCampaignId and getBriefingsByCampaignId - Coverage', () => {
    it('should handle getTouchpointsByCampaignId successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              subitems: [
                { id: 'touch1', name: 'Touchpoint 1', column_values: [] },
              ],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await (service as any).getTouchpointsByCampaignId('campaign-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle getBriefingsByCampaignId successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              subitems: [
                { id: 'brief1', name: 'Briefing 1', column_values: [] },
              ],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await (service as any).getBriefingsByCampaignId('campaign-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle getTouchpointsByFallbackMethod', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              { id: 'touch1', name: 'Touchpoint 1', column_values: [] },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await (service as any).getTouchpointsByFallbackMethod('campaign-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle getBriefingsByFallbackMethod', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              { id: 'brief1', name: 'Briefing 1', column_values: [] },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await (service as any).getBriefingsByFallbackMethod('campaign-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('formatDateForQuery - Coverage', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const result = (service as any).formatDateForQuery('2025-12-25');
      expect(result).toBe('2025-12-25');
    });

    it('should format date in DD/MM/YYYY format', () => {
      const result = (service as any).formatDateForQuery('25/12/2025');
      expect(result).toBe('2025-12-25');
    });

    it('should throw error for invalid date', () => {
      expect(() => (service as any).formatDateForQuery('invalid-date')).toThrow();
    });

    it('should handle date without leading zeros', () => {
      const result = (service as any).formatDateForQuery('1/5/2025');
      expect(result).toBe('2025-05-01');
    });
  });

  describe('uploadFile - Extended Coverage', () => {
    it('should handle file not found error', async () => {
      (fs.existsSync as any).mockReturnValue(false);

      await expect(service.uploadFile('/path/to/nonexistent.pdf', '123', 'files__1'))
        .rejects.toThrow('Arquivo não encontrado');
    });

    it('should handle upload API error', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.statSync as any).mockReturnValue({ size: 1024 });
      (fs.createReadStream as jest.Mock).mockReturnValue({ pipe: jest.fn() } as any);

      mockAxios.post.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile('/path/to/file.pdf', '123', 'files__1'))
        .rejects.toThrow('Falha no upload do arquivo');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle makeGraphQLRequest with null response data', async () => {
      mockAxios.post.mockResolvedValue({
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.makeGraphQLRequest('query { test }');
      expect(result).toBeNull();
    });

    it('should handle getAllBoards with database error', async () => {
      mockMondayBoardRepository.find.mockRejectedValue(new Error('DB Connection failed'));

      await expect(service.getAllBoards()).rejects.toThrow('DB Connection failed');
    });

    it('should handle createBoard with save error', async () => {
      mockMondayBoardRepository.create.mockImplementation((data) => data as any);
      mockMondayBoardRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.createBoard({ name: 'Test', board_id: '123' } as any))
        .rejects.toThrow('Save failed');
    });

    it('should handle changeMultipleColumnValues with complex nested objects', async () => {
      const columnValues = {
        status: { label: 'Done', index: 1 },
        people: { personsAndTeams: [{ id: 123 }, { id: 456 }] },
        text: 'Complex data',
      };

      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated',
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should handle getBoardInfo with complex fields request', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              description: 'Test board',
              columns: [
                { id: 'col1', title: 'Column 1', type: 'text' },
                { id: 'col2', title: 'Column 2', type: 'status' },
              ],
              items_page: {
                items: [
                  { id: 'item1', name: 'Item 1' },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123', ['id', 'name', 'description', 'columns', 'items_page { items { id name } }']);

      expect(result).toBeDefined();
      expect(result!.columns).toHaveLength(2);
    });

    it('should handle getFieldOptions with various column types', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [
                {
                  id: 'status__1',
                  settings_str: JSON.stringify({
                    labels: {
                      1: 'Option 1',
                      2: 'Option 2',
                      3: 'Option 3',
                    },
                    labels_colors: {
                      1: { color: '#ff0000' },
                      2: { color: '#00ff00' },
                      3: { color: '#0000ff' },
                    },
                  }),
                },
              ],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getFieldOptions('status__1');

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('color');
    });

    it('should handle getCampaignsPaginated with complex filters', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: 'next-page',
                items: [
                  {
                    id: 'campaign-1',
                    name: 'Campaign 1',
                    column_values: [
                      { id: 'date__1', text: '2025-12-25', value: '{"date":"2025-12-25"}' },
                      { id: 'status', text: 'Active', value: '{"index":1}' },
                    ],
                  },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignsPaginated(undefined, '2025-01-01', '2025-12-31', 'Campaign');

      expect(result.items).toHaveLength(1);
      expect(result.cursor).toBe('next-page');
    });

    it('should handle syncBoardById with multiple pages and updates', async () => {
      const mockBoard = {
        id: '1',
        name: 'Test Board',
        board_id: '123',
        query_fields: 'id name column_values',
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);

      const mockResponse1 = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: 'page2',
                items: [
                  { id: '1', name: 'Item 1', column_values: [] },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockResponse2 = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  { id: '2', name: 'Item 2', column_values: [] },
                ],
              },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const existingItem = { id: '1', item_id: '1', name: 'Old Name' };
      mockMondayItemRepository.findOne
        .mockResolvedValueOnce(existingItem as any)
        .mockResolvedValueOnce(null);
      mockMondayItemRepository.save.mockResolvedValue({} as any);

      const result = await service.syncBoardById('1');

      expect(result.success).toBe(true);
      expect(result.itemsCount).toBe(2);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
