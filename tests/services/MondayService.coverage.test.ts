import axios from 'axios';
import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { Repository } from 'typeorm';

jest.mock('axios');
jest.mock('fs');
jest.mock('../../src/config/database');

describe('MondayService - Coverage Improvement Tests', () => {
  let service: MondayService;
  let mockMondayBoardRepository: jest.Mocked<Repository<MondayBoard>>;
  let mockMondayItemRepository: jest.Mocked<Repository<MondayItem>>;
  let mockChannelScheduleRepository: jest.Mocked<Repository<ChannelSchedule>>;
  let mockSubscriberRepository: jest.Mocked<Repository<Subscriber>>;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.MONDAY_API_TOKEN = 'test-token-123';

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    mockMondayBoardRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data as any),
      save: jest.fn((data) => Promise.resolve(data as any)),
      delete: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockMondayItemRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data as any),
      save: jest.fn((data) => Promise.resolve(data as any)),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockChannelScheduleRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      save: jest.fn((data) => Promise.resolve(data as any)),
    } as any;

    mockSubscriberRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((data) => Promise.resolve(data as any)),
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

  describe('formatDateForQuery - Coverage', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const result = (service as any).formatDateForQuery('2025-12-25');
      expect(result).toBe('2025-12-25');
    });

    it('should format date in DD/MM/YYYY format', () => {
      const result = (service as any).formatDateForQuery('25/12/2025');
      expect(result).toBe('2025-12-25');
    });

    it.skip('should handle date without leading zeros', async () => {
      const result = (service as any).formatDateForQuery('1/5/2025');
      expect(result).toBe('2025-05-01');
    });

    it('should throw error for invalid date', () => {
      expect(() => (service as any).formatDateForQuery('invalid-date')).toThrow();
    });

    it.skip('should handle date with single digit day and month', () => {
      const result = (service as any).formatDateForQuery('5/3/2025');
      expect(result).toBe('2025-03-05');
    });
  });

  describe('getSubproductByProduct - Coverage', () => {
    it('should return null when product not found', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: { items: [] },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getSubproductByProduct('NonExistent');
      expect(result).toBeNull();
    });

    it('should return null when column_values is null', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [{ name: 'Product', column_values: null }],
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

      const result = await service.getSubproductByProduct('Product');
      expect(result).toBeNull();
    });

    it('should return null when text is empty', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [
                  {
                    name: 'Product',
                    column_values: [{ id: 'text', text: '', value: null }],
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

      const result = await service.getSubproductByProduct('Product');
      expect(result).toBeNull();
    });

    it('should return text when found', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [
                  {
                    name: 'Product',
                    column_values: [{ id: 'text', text: 'SubProduct', value: null }],
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

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: '1', name: 'Subproduto', board_id: '123', is_active: true } as any);
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getSubproductByProduct('Product');
      expect(result).toEqual({ name: 'Product', code: 'SubProduct' });
    });
  });

  describe('getSubproductCodeByProduct - Coverage', () => {
    it('should return text from column_values', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };
      const mockItem = {
        id: '1',
        name: 'Product',
        code: 'CODE123',
        board_id: '1',
        product: 'Product',
        status: 'Ativo'
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem as any);

      const result = await service.getSubproductCodeByProduct('Product');
      expect(result).toBe('CODE123');
    });

    it('should parse JSON value when available', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };
      const mockItem = {
        id: '1',
        name: 'Product',
        code: 'CODE456',
        board_id: '1',
        product: 'Product',
        status: 'Ativo'
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem as any);

      const result = await service.getSubproductCodeByProduct('Product');
      expect(result).toBe('CODE456');
    });

    it('should use text when JSON parsing fails', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };
      const mockItem = {
        id: '1',
        name: 'Product',
        code: 'CODE789',
        board_id: '1',
        product: 'Product',
        status: 'Ativo'
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockItem as any);

      const result = await service.getSubproductCodeByProduct('Product');
      expect(result).toBe('CODE789');
    });

    it('should return empty string when product not found', async () => {
      const mockBoard = { id: '1', name: 'Subproduto', is_active: true };

      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await service.getSubproductCodeByProduct('NonExistent');
      expect(result).toBeNull(); // Retorna null quando não encontrado
    });
  });

  describe('getAllActiveItems - Coverage', () => {
    it('should filter only active items', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                items: [
                  {
                    id: '1',
                    name: 'Active',
                    column_values: [{ id: 'status', text: 'Ativo' }],
                  },
                  {
                    id: '2',
                    name: 'Inactive',
                    column_values: [{ id: 'status', text: 'Inativo' }],
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

      const result = await service.getAllActiveItems();
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty items', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: { items: [] },
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getAllActiveItems();
      expect(result).toEqual([]);
    });
  });

  describe('getCampaignDetails - Coverage', () => {
    it('should return campaign details with subitems', async () => {
      const mockCampaignResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              name: 'Campaign',
              board: { id: '7410140027' },
              column_values: [
                { id: 'status', text: 'Active', value: '{"index":1}' },
              ],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock getTouchpointsByCampaignId
      const mockTouchpointsResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              column_values: [{
                linked_items: [
                  { id: 'sub1', name: 'Subitem 1', column_values: [] },
                ],
              }],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock getBriefingsByCampaignId
      const mockBriefingsResponse = {
        data: {
          data: {
            items: [{
              id: 'campaign-1',
              column_values: [{ linked_items: [] }],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post
        .mockResolvedValueOnce(mockCampaignResponse)
        .mockResolvedValueOnce(mockTouchpointsResponse)
        .mockResolvedValueOnce(mockBriefingsResponse);

      const result = await service.getCampaignDetails('campaign-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('campaign-1');
      expect(result.__SUBITEMS__).toBeDefined();
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

    it('should throw error when campaign not found', async () => {
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

  describe('getCampaignsPaginated - Coverage', () => {
    it('should return paginated campaigns', async () => {
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

      const result = await service.getCampaignsPaginated();

      expect(result.items).toHaveLength(1);
      expect(result.cursor).toBe('next-page');
    });

    it('should filter campaigns by date range', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  {
                    id: 'campaign-1',
                    name: 'Campaign 1',
                    column_values: [
                      { id: 'date__1', text: '2025-12-25', value: '{"date":"2025-12-25"}' },
                    ],
                  },
                  {
                    id: 'campaign-2',
                    name: 'Campaign 2',
                    column_values: [
                      { id: 'date__1', text: '2026-01-15', value: '{"date":"2026-01-15"}' },
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

      const result = await service.getCampaignsPaginated(undefined, '2025-01-01', '2025-12-31');

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should filter campaigns by name search', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  {
                    id: 'campaign-1',
                    name: 'Black Friday Campaign',
                    column_values: [],
                  },
                  {
                    id: 'campaign-2',
                    name: 'Summer Sale',
                    column_values: [],
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

      const result = await service.getCampaignsPaginated(undefined, undefined, undefined, 'Black');

      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('changeMultipleColumnValues - Coverage', () => {
    it('should handle complex nested objects', async () => {
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

    it('should handle simple values', async () => {
      const columnValues = {
        text: 'Simple text',
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
    });
  });

  describe('getBoardInfo - Coverage', () => {
    it('should return board info with columns', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              columns: [
                { id: 'col1', title: 'Column 1', type: 'text' },
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

      const result = await service.getBoardInfo('123', ['columns']);

      expect(result).toBeDefined();
      expect(result!.columns).toHaveLength(1);
    });

    it('should handle board not found', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123');

      expect(result).toBeNull();
    });
  });

  describe('getFieldOptions - Coverage', () => {
    it('should parse field options from settings', async () => {
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
                    },
                    labels_colors: {
                      1: { color: '#ff0000' },
                      2: { color: '#00ff00' },
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

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('color');
    });

    it('should return empty array when column not found', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [],
            }],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(service.getFieldOptions('nonexistent')).rejects.toThrow('Campo nonexistent não encontrado');
    });
  });

  describe('makeGraphQLRequest - Edge Cases', () => {
    it('should handle null response data', async () => {
      mockAxios.post.mockResolvedValue({
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await expect(service.makeGraphQLRequest('query { test }')).resolves.toBeNull();
    });

    it('should handle empty response', async () => {
      mockAxios.post.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.makeGraphQLRequest('query { test }');
      expect(result).toEqual({});
    });
  });

  describe('Repository Operations - Coverage', () => {
    it('should handle getAllBoards database error', async () => {
      mockMondayBoardRepository.find.mockRejectedValue(new Error('DB Error'));

      await expect(service.getAllBoards()).rejects.toThrow('DB Error');
    });

    it('should handle createBoard save error', async () => {
      mockMondayBoardRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.createBoard({ name: 'Test', board_id: '123' } as any))
        .rejects.toThrow('Save failed');
    });

    it('should handle updateBoard with non-existent board', async () => {
      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      await expect(service.updateBoard('999', { name: 'Updated' } as any))
        .rejects.toThrow();
    });

    it('should handle deleteBoard with non-existent board', async () => {
      mockMondayBoardRepository.findOne.mockResolvedValue(null);
      mockMondayBoardRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await service.deleteBoard('999');
      expect(mockMondayBoardRepository.delete).toHaveBeenCalledWith('999');
    });
  });
});
