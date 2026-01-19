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

describe('MondayService - Extended Coverage Tests', () => {
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

  describe('Helper Methods Coverage', () => {
    it('should normalize value for comparison - strings', () => {
      const result = (service as any).normalizeValueForComparison('test');
      expect(result).toBe('test');
    });

    it('should normalize value for comparison - numbers', () => {
      const result = (service as any).normalizeValueForComparison(123);
      expect(result).toBe('123');
    });

    it('should normalize value for comparison - arrays', () => {
      const result = (service as any).normalizeValueForComparison(['a', 'b']);
      expect(typeof result).toBe('string');
    });

    it('should normalize value for comparison - null', () => {
      const result = (service as any).normalizeValueForComparison(null);
      expect(result).toBe('');
    });

    it('should normalize value for comparison - undefined', () => {
      const result = (service as any).normalizeValueForComparison(undefined);
      expect(result).toBe('');
    });

    it('should normalize value for comparison - objects', () => {
      const result = (service as any).normalizeValueForComparison({ key: 'value' });
      expect(typeof result).toBe('string');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for PDF', () => {
      const result = (service as any).getMimeType('document.pdf');
      expect(result).toBe('application/pdf');
    });

    it('should return correct MIME type for JPEG', () => {
      const result = (service as any).getMimeType('image.jpg');
      expect(result).toBe('image/jpeg');
    });

    it('should return correct MIME type for PNG', () => {
      const result = (service as any).getMimeType('image.png');
      expect(result).toBe('image/png');
    });

    it('should return correct MIME type for DOCX', () => {
      const result = (service as any).getMimeType('document.docx');
      expect(result).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should return correct MIME type for XLSX', () => {
      const result = (service as any).getMimeType('spreadsheet.xlsx');
      expect(result).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should return default MIME type for unknown extension', () => {
      const result = (service as any).getMimeType('file.unknown');
      expect(result).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', () => {
      const result = (service as any).getMimeType('IMAGE.PNG');
      expect(result).toBe('image/png');
    });

    it('should handle files without extension', () => {
      const result = (service as any).getMimeType('noextension');
      expect(result).toBe('application/octet-stream');
    });
  });

  describe('Repository Operations - Additional Coverage', () => {
    it('should handle getBoardByMondayId', async () => {
      const mockBoard = { id: '1', board_id: '123', name: 'Test Board' };
      mockMondayBoardRepository.findOne.mockResolvedValue(mockBoard as any);

      const result = await service.getBoardByMondayId('123');

      expect(result).toEqual(mockBoard);
      expect(mockMondayBoardRepository.findOne).toHaveBeenCalledWith({
        where: { board_id: '123', is_active: true }
      });
    });

    it('should handle getBoardByMondayId not found', async () => {
      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      const result = await service.getBoardByMondayId('999');

      expect(result).toBeNull();
    });

    it('should handle getItemsCountByBoard', async () => {
      mockMondayItemRepository.count.mockResolvedValue(42);

      const result = await service.getItemsCountByBoard('123');

      expect(result).toBe(42);
      expect(mockMondayItemRepository.count).toHaveBeenCalledWith({
        where: { board_id: '123' }
      });
    });

    it('should handle getItemsCountByBoard with zero items', async () => {
      mockMondayItemRepository.count.mockResolvedValue(0);

      const result = await service.getItemsCountByBoard('123');

      expect(result).toBe(0);
    });
  });

  describe('GraphQL Query Building', () => {
    it('should handle makeGraphQLRequest with complex query', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{ id: '123', name: 'Test' }]
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
            columns {
              id
              title
            }
          }
        }
      `;

      const result = await service.makeGraphQLRequest(query);

      expect(result).toBeDefined();
      expect(result.data.boards).toHaveLength(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        { query },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123',
            'API-Version': '2023-10'
          })
        })
      );
    });

    it('should handle makeGraphQLRequest with variables', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{ id: '1', name: 'Item' }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const query = 'query GetItem($id: ID!) { items(ids: [$id]) { id name } }';

      const result = await service.makeGraphQLRequest(query);

      expect(result).toBeDefined();
    });
  });

  describe('changeMultipleColumnValues - Extended', () => {
    it('should handle date column updates', async () => {
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
        date: '2025-12-25'
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
    });

    it('should handle status column updates', async () => {
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
        status: { label: 'Done' }
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });

    it('should handle people column updates', async () => {
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
        people: { personsAndTeams: [{ id: 12345 }] }
      };

      const result = await service.changeMultipleColumnValues('789', '123', columnValues);

      expect(result).toBeDefined();
    });

    it('should handle empty column values', async () => {
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

      const result = await service.changeMultipleColumnValues('789', '123', {});

      expect(result).toBeDefined();
    });
  });

  describe('getBoardInfo - Extended', () => {
    it('should return board with all requested fields', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board',
              description: 'Test board',
              columns: [
                { id: 'col1', title: 'Column 1', type: 'text' },
                { id: 'col2', title: 'Column 2', type: 'status' }
              ],
              items_page: {
                items: [
                  { id: 'item1', name: 'Item 1' }
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

      const result = await service.getBoardInfo('123', [
        'id',
        'name',
        'description',
        'columns',
        'items_page { items { id name } }'
      ]);

      expect(result).toBeDefined();
      expect(result!.id).toBe('123');
      expect(result!.columns).toHaveLength(2);
      expect(result!.items_page.items).toHaveLength(1);
    });

    it('should return board with default fields', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              id: '123',
              name: 'Board'
            }]
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('123');
    });

    it('should return null for non-existent board', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: []
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service.getBoardInfo('999');

      expect(result).toBeNull();
    });
  });

  describe('getFieldOptions - Extended', () => {
    it('should return options with labels and colors', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [{
                id: 'status__1',
                settings_str: JSON.stringify({
                  labels: {
                    1: 'Option 1',
                    2: 'Option 2',
                    3: 'Option 3'
                  },
                  labels_colors: {
                    1: { color: '#ff0000', border: '#cc0000' },
                    2: { color: '#00ff00', border: '#00cc00' },
                    3: { color: '#0000ff', border: '#0000cc' }
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

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('name', 'Option 1');
      expect(result[0].color).toHaveProperty('color', '#ff0000');
    });

    it('should handle column without labels_colors', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [{
                id: 'status__1',
                settings_str: JSON.stringify({
                  labels: {
                    1: 'Option 1'
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

      expect(result).toHaveLength(1);
      expect(result[0].color).toBeDefined();
    });

    it('should handle column with invalid settings_str', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: [{
                id: 'status__1',
                settings_str: 'invalid json'
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

      expect(result).toEqual([]);
    });

    it('should return empty array for column not found', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [{
              columns: []
            }]
          }
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

  describe('Error Handling', () => {
    it('should handle network errors in makeGraphQLRequest', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network Error'));

      await expect(service.makeGraphQLRequest('query { test }'))
        .rejects.toThrow('Falha na comunicação com Monday API');
    });

    it('should handle 401 unauthorized in makeGraphQLRequest', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      });

      await expect(service.makeGraphQLRequest('query { test }'))
        .rejects.toThrow('Falha na comunicação com Monday API');
    });

    it('should handle 500 server error in makeGraphQLRequest', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      });

      await expect(service.makeGraphQLRequest('query { test }'))
        .rejects.toThrow('Falha na comunicação com Monday API');
    });
  });
});
