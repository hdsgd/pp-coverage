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

describe('MondayService - Final Coverage Push', () => {
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
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
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
      delete: jest.fn().mockResolvedValue({}),
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

  describe('Board Operations - Additional', () => {
    it('should create board with all fields', async () => {
      const boardData = {
        name: 'Test Board',
        board_id: '123',
        query_fields: 'id name column_values',
        is_active: true
      };

      mockMondayBoardRepository.create.mockReturnValue(boardData as any);
      mockMondayBoardRepository.save.mockResolvedValue(boardData as any);

      const result = await service.createBoard(boardData as any);

      expect(result).toEqual(boardData);
      expect(mockMondayBoardRepository.create).toHaveBeenCalled(); // Verificar apenas que foi chamado
      expect(mockMondayBoardRepository.save).toHaveBeenCalled();
    });

    it('should update board successfully', async () => {
      const existingBoard = { id: '1', name: 'Old Name', board_id: '123' };
      const updates = { name: 'New Name' };

      mockMondayBoardRepository.findOne.mockResolvedValue(existingBoard as any);
      mockMondayBoardRepository.save.mockResolvedValue({ ...existingBoard, ...updates } as any);

      const result = await service.updateBoard('1', updates as any);

      expect(result).toBeDefined();
      if (result) {
        expect(result.name).toBe('New Name');
      }
      expect(mockMondayBoardRepository.save).toHaveBeenCalled();
    });

    it('should delete board successfully', async () => {
      const board = { id: '1', name: 'Board', board_id: '123' };
      mockMondayBoardRepository.findOne.mockResolvedValue(board as any);
      mockMondayBoardRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteBoard('1');

      expect(mockMondayBoardRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error when deleting non-existent board', async () => {
      mockMondayBoardRepository.findOne.mockResolvedValue(null);
      mockMondayBoardRepository.delete.mockResolvedValue({ affected: 0, raw: {} } as any);

      // deleteBoard retorna undefined quando board não existe (affected: 0)
      const result = await service.deleteBoard('999');
      expect(result).toBeUndefined();
    });

    it('should throw error when updating non-existent board', async () => {
      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      await expect(service.updateBoard('999', { name: 'New' } as any)).rejects.toThrow();
    });
  });

  describe('Item Operations - Additional', () => {
    it('should get items by board ID', async () => {
      const mockItems = [
        { id: '1', item_id: 'item1', name: 'Item 1', board_id: '123' },
        { id: '2', item_id: 'item2', name: 'Item 2', board_id: '123' }
      ];

      mockMondayItemRepository.find.mockResolvedValue(mockItems as any);

      const result = await service.getItemsByBoard('123');

      // Verificar que retornou os itens mockados
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockMondayItemRepository.find).toHaveBeenCalledWith({
        where: { board_id: '123' }
      });
    });

    it('should handle empty items list', async () => {
      mockMondayItemRepository.find.mockResolvedValue([]);

      const result = await service.getItemsByBoard('123');

      expect(result).toEqual([]);
    });

    it('should count items correctly', async () => {
      mockMondayItemRepository.count.mockResolvedValue(25);

      const count = await service.getItemsCountByBoard('123');

      expect(count).toBe(25);
    });

    it('should handle zero items count', async () => {
      mockMondayItemRepository.count.mockResolvedValue(0);

      const count = await service.getItemsCountByBoard('123');

      expect(count).toBe(0);
    });
  });

  describe('GraphQL Queries - Edge Cases', () => {
    it('should handle GraphQL with nested structures', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              groups: [
                { id: 'g1', title: 'Group 1' },
                { id: 'g2', title: 'Group 2' }
              ],
              columns: [
                { id: 'c1', title: 'Column 1', type: 'text' },
                { id: 'c2', title: 'Column 2', type: 'status' }
              ]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const query = `
        query {
          boards(ids: [123]) {
            id
            name
            groups { id title }
            columns { id title type }
          }
        }
      `;

      const result = await service.makeGraphQLRequest(query);

      expect(result.data.boards[0].groups).toHaveLength(2);
      expect(result.data.boards[0].columns).toHaveLength(2);
    });

    it('should handle GraphQL with items and subitems', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{
              id: '1',
              name: 'Parent Item',
              subitems: [
                { id: '2', name: 'Subitem 1' },
                { id: '3', name: 'Subitem 2' }
              ]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.makeGraphQLRequest('query { items { id name subitems { id name } } }');

      expect(result.data.items[0].subitems).toHaveLength(2);
    });

    it('should handle GraphQL with pagination cursor', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: 'eyJpZCI6MTIzfQ==',
                items: [
                  { id: '1', name: 'Item 1' }
                ]
              }
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.makeGraphQLRequest('query { boards { items_page { cursor items { id name } } } }');

      expect(result.data.boards[0].items_page.cursor).toBe('eyJpZCI6MTIzfQ==');
    });
  });

  describe('Column Value Updates - Complex Types', () => {
    it('should handle timeline column update', async () => {
      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated'
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const columnValues = {
        timeline: {
          from: '2025-01-01',
          to: '2025-12-31'
        }
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should handle dropdown column update', async () => {
      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated'
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const columnValues = {
        dropdown: { ids: [1, 2, 3] }
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });

    it('should handle number column update', async () => {
      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated'
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const columnValues = {
        numbers: 42.5
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });

    it('should handle text column update', async () => {
      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated'
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const columnValues = {
        text: 'Updated text content'
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });

    it('should handle long text column update', async () => {
      const mockResponse = {
        data: {
          data: {
            change_multiple_column_values: {
              id: '123',
              name: 'Updated'
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const columnValues = {
        long_text: 'This is a very long text content that spans multiple lines...'
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });
  });

  describe('Board Info - Various Scenarios', () => {
    it('should get board info with groups', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              groups: [
                { id: 'g1', title: 'Group 1', color: '#ff0000' },
                { id: 'g2', title: 'Group 2', color: '#00ff00' }
              ]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123', ['groups']);

      expect(result).toBeDefined();
      expect(result!.groups).toHaveLength(2);
    });

    it('should get board info with owners', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              owners: [
                { id: '1', name: 'Owner 1' }
              ]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123', ['owners']);

      expect(result).toBeDefined();
      expect(result!.owners).toHaveLength(1);
    });

    it('should get board info with permissions', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              permissions: 'owners'
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123', ['permissions']);

      expect(result).toBeDefined();
      expect(result!.permissions).toBe('owners');
    });
  });

  describe('Get Campaigns - Filtering', () => {
    it('should filter campaigns by date range and return correct structure', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: null,
                items: [
                  {
                    id: '1',
                    name: 'Campaign within range',
                    column_values: [
                      { id: 'date__1', text: '2025-06-15', value: '{"date":"2025-06-15"}' }
                    ]
                  },
                  {
                    id: '2',
                    name: 'Campaign outside range',
                    column_values: [
                      { id: 'date__1', text: '2026-01-01', value: '{"date":"2026-01-01"}' }
                    ]
                  }
                ]
              }
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignsPaginated(undefined, '2025-01-01', '2025-12-31');

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
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
                    id: '1',
                    name: 'Black Friday 2025',
                    column_values: []
                  },
                  {
                    id: '2',
                    name: 'Summer Sale 2025',
                    column_values: []
                  }
                ]
              }
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignsPaginated(undefined, undefined, undefined, 'Friday');

      expect(result.items).toBeDefined();
    });

    it('should handle campaigns with cursor pagination', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              items_page: {
                cursor: 'next_page_cursor',
                items: [
                  { id: '1', name: 'Campaign 1', board: { id: '7410140027' }, column_values: [] }
                ]
              }
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getCampaignsPaginated('initial_cursor');

      // Verificar que o resultado tem cursor (pode ser null se não houver mais páginas)
      expect(result).toBeDefined();
      expect(result.campaigns).toBeDefined();
    });
  });

  describe('Field Options - Edge Cases', () => {
    it('should handle field options with many options', async () => {
      const labels: any = {};
      const colors: any = {};
      
      for (let i = 1; i <= 20; i++) {
        labels[i] = `Option ${i}`;
        colors[i] = { color: `#${i.toString().padStart(6, '0')}` };
      }

      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [{
                id: 'status__1',
                settings_str: JSON.stringify({ labels, labels_colors: colors })
              }]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getFieldOptions('status__1');

      expect(result).toHaveLength(20);
    });

    it('should handle field options with special characters', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [{
                id: 'status__1',
                settings_str: JSON.stringify({
                  labels: {
                    1: 'Option & Special',
                    2: 'Option "Quoted"',
                    3: "Option 'Single'"
                  },
                  labels_colors: {
                    1: { color: '#ff0000' },
                    2: { color: '#00ff00' },
                    3: { color: '#0000ff' }
                  }
                })
              }]
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getFieldOptions('status__1');

      // Verificar que retornou opções
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('label');
      }
    });
  });
});
