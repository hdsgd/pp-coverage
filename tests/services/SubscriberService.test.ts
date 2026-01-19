import { Repository } from 'typeorm';
import { SubscriberService } from '../../src/services/SubscriberService';
import { Subscriber } from '../../src/entities/Subscriber';
import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/MondayService');

describe('SubscriberService', () => {
  let subscriberService: SubscriberService;
  let mockSubscriberRepository: jest.Mocked<Repository<Subscriber>>;
  let mockMondayService: jest.Mocked<MondayService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    mockSubscriberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      clear: jest.fn(),
      count: jest.fn(),
    } as any;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockSubscriberRepository);

    // Mock MondayService
    mockMondayService = {
      makeGraphQLRequest: jest.fn(),
    } as any;

    // Mock MondayService constructor
    (MondayService as jest.Mock).mockImplementation(() => mockMondayService);

    // Create service instance
    subscriberService = new SubscriberService();
  });

  describe('syncSubscribersFromMonday', () => {
    it('should sync subscribers from Monday.com successfully', async () => {
      const mockMondayResponse = {
        data: {
          boards: [
            {
              subscribers: [
                { id: '1', name: 'John Doe', email: 'john@example.com' },
                { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
              ]
            }
          ]
        }
      };

      const mockSavedSubscriber1 = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockSavedSubscriber2 = {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        board_id: '7463706726',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce(null) // First subscriber doesn't exist
        .mockResolvedValueOnce(null); // Second subscriber doesn't exist
      mockSubscriberRepository.create
        .mockReturnValueOnce(mockSavedSubscriber1 as any)
        .mockReturnValueOnce(mockSavedSubscriber2 as any);
      mockSubscriberRepository.save
        .mockResolvedValueOnce(mockSavedSubscriber1 as any)
        .mockResolvedValueOnce(mockSavedSubscriber2 as any);

      const result = await subscriberService.syncSubscribersFromMonday();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalledTimes(1);
      expect(mockSubscriberRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should update existing subscribers when syncing', async () => {
      const mockMondayResponse = {
        data: {
          boards: [
            {
              subscribers: [
                { id: '1', name: 'John Doe Updated', email: 'john.new@example.com' }
              ]
            }
          ]
        }
      };

      const existingSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: new Date(),
        updated_at: new Date()
      };

      const updatedSubscriber = {
        ...existingSubscriber,
        name: 'John Doe Updated',
        email: 'john.new@example.com'
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);
      mockSubscriberRepository.findOne.mockResolvedValue(existingSubscriber as any);
      mockSubscriberRepository.save.mockResolvedValue(updatedSubscriber as any);

      const result = await subscriberService.syncSubscribersFromMonday();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe Updated');
      expect(result[0].email).toBe('john.new@example.com');
      expect(mockSubscriberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe Updated',
          email: 'john.new@example.com'
        })
      );
    });

    it('should throw error when no subscribers found in Monday response', async () => {
      const mockMondayResponse = {
        data: {
          boards: [
            {
              subscribers: null
            }
          ]
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);

      await expect(subscriberService.syncSubscribersFromMonday()).rejects.toThrow(
        'Falha ao sincronizar subscribers do Monday.com'
      );
    });

    it('should throw error when boards array is empty', async () => {
      const mockMondayResponse = {
        data: {
          boards: []
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);

      await expect(subscriberService.syncSubscribersFromMonday()).rejects.toThrow(
        'Falha ao sincronizar subscribers do Monday.com'
      );
    });

    it('should throw error when Monday API request fails', async () => {
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(subscriberService.syncSubscribersFromMonday()).rejects.toThrow(
        'Falha ao sincronizar subscribers do Monday.com'
      );
    });

    it('should log error when sync fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(subscriberService.syncSubscribersFromMonday()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty subscribers array', async () => {
      const mockMondayResponse = {
        data: {
          boards: [
            {
              subscribers: []
            }
          ]
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);

      const result = await subscriberService.syncSubscribersFromMonday();

      expect(result).toHaveLength(0);
      expect(mockSubscriberRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getAllSubscribers', () => {
    it('should return all subscribers ordered by name', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Alice',
          email: 'alice@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Bob',
          email: 'bob@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      const result = await subscriberService.getAllSubscribers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(mockSubscriberRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' }
      });
    });

    it('should return empty array when no subscribers exist', async () => {
      mockSubscriberRepository.find.mockResolvedValue([]);

      const result = await subscriberService.getAllSubscribers();

      expect(result).toHaveLength(0);
    });

    it('should convert all subscribers to response DTO format', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          board_id: '7463706726',
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-02')
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      const result = await subscriberService.getAllSubscribers();

      expect(result[0]).toEqual({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        board_id: '7463706726',
        created_at: mockSubscribers[0].created_at,
        updated_at: mockSubscribers[0].updated_at
      });
    });
  });

  describe('getSubscribersForDropdown', () => {
    it('should return subscribers formatted for dropdown', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Alice',
          email: 'alice@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Bob',
          email: 'bob@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      const result = await subscriberService.getSubscribersForDropdown();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', item_id: '1' });
      expect(result[1]).toEqual({ name: 'Bob', item_id: '2' });
      expect(mockSubscriberRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' }
      });
    });

    it('should return empty array for dropdown when no subscribers exist', async () => {
      mockSubscriberRepository.find.mockResolvedValue([]);

      const result = await subscriberService.getSubscribersForDropdown();

      expect(result).toHaveLength(0);
    });

    it('should only include name and item_id in dropdown format', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      const result = await subscriberService.getSubscribersForDropdown();

      expect(Object.keys(result[0])).toEqual(['name', 'item_id']);
      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('board_id');
    });
  });

  describe('getSubscriberById', () => {
    it('should return subscriber by ID', async () => {
      const mockSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSubscriberRepository.findOne.mockResolvedValue(mockSubscriber as any);

      const result = await subscriberService.getSubscriberById('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('John Doe');
      expect(mockSubscriberRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should return null when subscriber not found', async () => {
      mockSubscriberRepository.findOne.mockResolvedValue(null);

      const result = await subscriberService.getSubscriberById('999');

      expect(result).toBeNull();
    });

    it('should convert subscriber to response DTO format', async () => {
      const mockSubscriber = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        board_id: '7463706726',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-02')
      };

      mockSubscriberRepository.findOne.mockResolvedValue(mockSubscriber as any);

      const result = await subscriberService.getSubscriberById('1');

      expect(result).toEqual({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        board_id: '7463706726',
        created_at: mockSubscriber.created_at,
        updated_at: mockSubscriber.updated_at
      });
    });
  });

  describe('getSubscribersByBoardId', () => {
    it('should return subscribers by board ID', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Alice',
          email: 'alice@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Bob',
          email: 'bob@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      const result = await subscriberService.getSubscribersByBoardId('7463706726');

      expect(result).toHaveLength(2);
      expect(mockSubscriberRepository.find).toHaveBeenCalledWith({
        where: { board_id: '7463706726' },
        order: { name: 'ASC' }
      });
    });

    it('should return empty array when no subscribers for board', async () => {
      mockSubscriberRepository.find.mockResolvedValue([]);

      const result = await subscriberService.getSubscribersByBoardId('999');

      expect(result).toHaveLength(0);
    });

    it('should order subscribers by name', async () => {
      const mockSubscribers = [
        {
          id: '1',
          name: 'Zack',
          email: 'zack@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Alice',
          email: 'alice@example.com',
          board_id: '7463706726',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSubscriberRepository.find.mockResolvedValue(mockSubscribers as any);

      await subscriberService.getSubscribersByBoardId('7463706726');

      expect(mockSubscriberRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: 'ASC' }
        })
      );
    });
  });

  describe('refreshSubscribers', () => {
    it('should clear cache and sync from Monday', async () => {
      const mockMondayResponse = {
        data: {
          boards: [
            {
              subscribers: [
                { id: '1', name: 'John Doe', email: 'john@example.com' }
              ]
            }
          ]
        }
      };

      const mockSavedSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue(mockMondayResponse);
      mockSubscriberRepository.findOne.mockResolvedValue(null);
      mockSubscriberRepository.create.mockReturnValue(mockSavedSubscriber as any);
      mockSubscriberRepository.save.mockResolvedValue(mockSavedSubscriber as any);
      mockSubscriberRepository.clear.mockResolvedValue(undefined as any);

      const result = await subscriberService.refreshSubscribers();

      expect(mockSubscriberRepository.clear).toHaveBeenCalledTimes(1);
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should throw error when refresh fails', async () => {
      mockSubscriberRepository.clear.mockResolvedValue(undefined as any);
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(subscriberService.refreshSubscribers()).rejects.toThrow(
        'Falha ao sincronizar subscribers do Monday.com'
      );
      expect(mockSubscriberRepository.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('needsSync', () => {
    it('should return true when no subscribers in cache', async () => {
      mockSubscriberRepository.count.mockResolvedValue(0);

      const result = await subscriberService.needsSync();

      expect(result).toBe(true);
      expect(mockSubscriberRepository.count).toHaveBeenCalledTimes(1);
    });

    it('should return true when latest subscriber is older than 1 hour', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const mockSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: twoHoursAgo,
        updated_at: twoHoursAgo
      };

      mockSubscriberRepository.count.mockResolvedValue(1);
      mockSubscriberRepository.find.mockResolvedValue([mockSubscriber as any]);

      const result = await subscriberService.needsSync();

      expect(result).toBe(true);
      expect(mockSubscriberRepository.find).toHaveBeenCalledWith({
        order: { updated_at: 'DESC' },
        take: 1
      });
    });

    it('should return false when latest subscriber is less than 1 hour old', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const mockSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: thirtyMinutesAgo,
        updated_at: thirtyMinutesAgo
      };

      mockSubscriberRepository.count.mockResolvedValue(1);
      mockSubscriberRepository.find.mockResolvedValue([mockSubscriber as any]);

      const result = await subscriberService.needsSync();

      expect(result).toBe(false);
    });

    it('should return true when find returns empty array', async () => {
      mockSubscriberRepository.count.mockResolvedValue(1);
      mockSubscriberRepository.find.mockResolvedValue([]);

      const result = await subscriberService.needsSync();

      expect(result).toBe(true);
    });

    it('should return false when updated exactly 1 hour ago (boundary)', async () => {
      // Use slightly less than 1 hour to ensure updated_at >= oneHourAgo (returns false)
      const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000 + 100);
      const mockSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: exactlyOneHourAgo,
        updated_at: exactlyOneHourAgo
      };

      mockSubscriberRepository.count.mockResolvedValue(1);
      mockSubscriberRepository.find.mockResolvedValue([mockSubscriber as any]);

      const result = await subscriberService.needsSync();

      expect(result).toBe(false);
    });

    it('should return true when updated just over 1 hour ago', async () => {
      const justOverOneHourAgo = new Date(Date.now() - 60 * 60 * 1000 - 1000);
      const mockSubscriber = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        board_id: '7463706726',
        created_at: justOverOneHourAgo,
        updated_at: justOverOneHourAgo
      };

      mockSubscriberRepository.count.mockResolvedValue(1);
      mockSubscriberRepository.find.mockResolvedValue([mockSubscriber as any]);

      const result = await subscriberService.needsSync();

      expect(result).toBe(true);
    });
  });
});
