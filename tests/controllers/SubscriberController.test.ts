import { Request, Response } from 'express';
import { SubscriberController } from '../../src/controllers/SubscriberController';
import { SubscriberService } from '../../src/services/SubscriberService';

// Mock SubscriberService
jest.mock('../../src/services/SubscriberService');

describe('SubscriberController', () => {
  let controller: SubscriberController;
  let mockSubscriberService: jest.Mocked<SubscriberService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new SubscriberController();

    // Setup service mock
    mockSubscriberService = (controller as any).subscriberService;

    // Setup request and response mocks
    mockRequest = {
      params: {},
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

  describe('getAllSubscribers', () => {
    it('should return all subscribers without syncing when not needed', async () => {
      const mockSubscribers = [
        { id: '1', name: 'Subscriber 1', email: 'sub1@example.com' },
        { id: '2', name: 'Subscriber 2', email: 'sub2@example.com' }
      ];

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getAllSubscribers = jest.fn().mockResolvedValue(mockSubscribers);

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.needsSync).toHaveBeenCalled();
      expect(mockSubscriberService.syncSubscribersFromMonday).not.toHaveBeenCalled();
      expect(mockSubscriberService.getAllSubscribers).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscribers,
        message: 'Subscribers recuperados com sucesso'
      });
    });

    it('should sync subscribers before returning when sync is needed', async () => {
      const mockSubscribers = [
        { id: '1', name: 'Subscriber 1', email: 'sub1@example.com' }
      ];

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(true);
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue(mockSubscribers);
      mockSubscriberService.getAllSubscribers = jest.fn().mockResolvedValue(mockSubscribers);

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.needsSync).toHaveBeenCalled();
      expect(mockSubscriberService.syncSubscribersFromMonday).toHaveBeenCalled();
      expect(mockSubscriberService.getAllSubscribers).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscribers,
        message: 'Subscribers recuperados com sucesso'
      });
    });

    it('should return empty array when no subscribers exist', async () => {
      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getAllSubscribers = jest.fn().mockResolvedValue([]);

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Subscribers recuperados com sucesso'
      });
    });

    it('should return 500 when needsSync throws an error', async () => {
      mockSubscriberService.needsSync = jest.fn().mockRejectedValue(new Error('Sync check failed'));

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers',
        error: 'Sync check failed'
      });
    });

    it('should return 500 when syncSubscribersFromMonday throws an error', async () => {
      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(true);
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockRejectedValue(new Error('Sync failed'));

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers',
        error: 'Sync failed'
      });
    });

    it('should return 500 when getAllSubscribers throws an error', async () => {
      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getAllSubscribers = jest.fn().mockRejectedValue(new Error('Database error'));

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers',
        error: 'Database error'
      });
    });

    it('should handle unknown error type', async () => {
      mockSubscriberService.needsSync = jest.fn().mockRejectedValue('Unknown error');

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers',
        error: 'Erro desconhecido'
      });
    });

    it('should handle multiple subscribers with complex data', async () => {
      const mockSubscribers = [
        { id: '1', name: 'Sub 1', email: 'sub1@test.com', details: { active: true } },
        { id: '2', name: 'Sub 2', email: 'sub2@test.com', details: { active: false } },
        { id: '3', name: 'Sub 3', email: 'sub3@test.com', details: { active: true } }
      ];

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getAllSubscribers = jest.fn().mockResolvedValue(mockSubscribers);

      await controller.getAllSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscribers,
        message: 'Subscribers recuperados com sucesso'
      });
    });
  });

  describe('getSubscribersForDropdown', () => {
    it('should return subscribers formatted for dropdown without syncing when not needed', async () => {
      const mockDropdownData = [
        { value: '1', label: 'Subscriber 1' },
        { value: '2', label: 'Subscriber 2' }
      ];

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getSubscribersForDropdown = jest.fn().mockResolvedValue(mockDropdownData);

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.needsSync).toHaveBeenCalled();
      expect(mockSubscriberService.syncSubscribersFromMonday).not.toHaveBeenCalled();
      expect(mockSubscriberService.getSubscribersForDropdown).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDropdownData,
        message: 'Subscribers para dropdown recuperados com sucesso'
      });
    });

    it('should sync before returning dropdown data when sync is needed', async () => {
      const mockDropdownData = [
        { value: '1', label: 'Subscriber 1' }
      ];

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(true);
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue([]);
      mockSubscriberService.getSubscribersForDropdown = jest.fn().mockResolvedValue(mockDropdownData);

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.needsSync).toHaveBeenCalled();
      expect(mockSubscriberService.syncSubscribersFromMonday).toHaveBeenCalled();
      expect(mockSubscriberService.getSubscribersForDropdown).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDropdownData,
        message: 'Subscribers para dropdown recuperados com sucesso'
      });
    });

    it('should return empty array for dropdown when no subscribers exist', async () => {
      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getSubscribersForDropdown = jest.fn().mockResolvedValue([]);

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Subscribers para dropdown recuperados com sucesso'
      });
    });

    it('should return 500 when getSubscribersForDropdown throws an error', async () => {
      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getSubscribersForDropdown = jest.fn().mockRejectedValue(new Error('Dropdown error'));

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers para dropdown',
        error: 'Dropdown error'
      });
    });

    it('should return 500 when needsSync fails for dropdown', async () => {
      mockSubscriberService.needsSync = jest.fn().mockRejectedValue(new Error('Sync check error'));

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers para dropdown',
        error: 'Sync check error'
      });
    });

    it('should handle unknown error type for dropdown', async () => {
      mockSubscriberService.needsSync = jest.fn().mockRejectedValue(null);

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscribers para dropdown',
        error: 'Erro desconhecido'
      });
    });

    it('should handle large dropdown list', async () => {
      const mockDropdownData = Array.from({ length: 100 }, (_, i) => ({
        value: `${i + 1}`,
        label: `Subscriber ${i + 1}`
      }));

      mockSubscriberService.needsSync = jest.fn().mockResolvedValue(false);
      mockSubscriberService.getSubscribersForDropdown = jest.fn().mockResolvedValue(mockDropdownData);

      await controller.getSubscribersForDropdown(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDropdownData,
        message: 'Subscribers para dropdown recuperados com sucesso'
      });
    });
  });

  describe('getSubscriberById', () => {
    it('should return subscriber when found', async () => {
      const mockSubscriber = {
        id: '123',
        name: 'Test Subscriber',
        email: 'test@example.com'
      };

      mockRequest.params = { id: '123' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.getSubscriberById).toHaveBeenCalledWith('123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: 'Subscriber encontrado com sucesso'
      });
    });

    it('should return 404 when subscriber is not found', async () => {
      mockRequest.params = { id: '999' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(null);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.getSubscriberById).toHaveBeenCalledWith('999');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subscriber não encontrado'
      });
    });

    it('should return 404 when subscriber is undefined', async () => {
      mockRequest.params = { id: '888' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(undefined);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Subscriber não encontrado'
      });
    });

    it('should return 500 when service throws an error', async () => {
      mockRequest.params = { id: '123' };
      mockSubscriberService.getSubscriberById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscriber',
        error: 'Database connection failed'
      });
    });

    it('should handle unknown error type', async () => {
      mockRequest.params = { id: '123' };
      mockSubscriberService.getSubscriberById = jest.fn().mockRejectedValue({ code: 500 });

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar subscriber',
        error: 'Erro desconhecido'
      });
    });

    it('should handle numeric ID as string', async () => {
      const mockSubscriber = { id: '456', name: 'Numeric ID Subscriber' };
      mockRequest.params = { id: '456' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.getSubscriberById).toHaveBeenCalledWith('456');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: 'Subscriber encontrado com sucesso'
      });
    });

    it('should handle UUID format ID', async () => {
      const mockSubscriber = { id: 'abc-123-def-456', name: 'UUID Subscriber' };
      mockRequest.params = { id: 'abc-123-def-456' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.getSubscriberById).toHaveBeenCalledWith('abc-123-def-456');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: 'Subscriber encontrado com sucesso'
      });
    });

    it('should return subscriber with complex data structure', async () => {
      const mockSubscriber = {
        id: '789',
        name: 'Complex Subscriber',
        email: 'complex@test.com',
        metadata: {
          createdAt: '2025-12-01',
          tags: ['premium', 'active']
        }
      };

      mockRequest.params = { id: '789' };
      mockSubscriberService.getSubscriberById = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.getSubscriberById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: 'Subscriber encontrado com sucesso'
      });
    });
  });

  describe('syncSubscribers', () => {
    it('should sync subscribers and return synced data', async () => {
      const mockSyncedSubscribers = [
        { id: '1', name: 'Synced 1', email: 'sync1@example.com' },
        { id: '2', name: 'Synced 2', email: 'sync2@example.com' }
      ];

      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue(mockSyncedSubscribers);

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.syncSubscribersFromMonday).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSyncedSubscribers,
        message: '2 subscribers sincronizados com sucesso'
      });
    });

    it('should handle sync with empty result', async () => {
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue([]);

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: '0 subscribers sincronizados com sucesso'
      });
    });

    it('should handle sync with single subscriber', async () => {
      const mockSubscriber = [{ id: '1', name: 'Single Sub' }];
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: '1 subscribers sincronizados com sucesso'
      });
    });

    it('should return 500 when sync fails', async () => {
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockRejectedValue(new Error('Monday API error'));

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao sincronizar subscribers',
        error: 'Monday API error'
      });
    });

    it('should handle unknown error type during sync', async () => {
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockRejectedValue('Unknown sync error');

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao sincronizar subscribers',
        error: 'Erro desconhecido'
      });
    });

    it('should handle large batch sync', async () => {
      const mockLargeBatch = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Subscriber ${i + 1}`
      }));

      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue(mockLargeBatch);

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLargeBatch,
        message: '500 subscribers sincronizados com sucesso'
      });
    });

    it('should call syncSubscribersFromMonday without parameters', async () => {
      mockSubscriberService.syncSubscribersFromMonday = jest.fn().mockResolvedValue([]);

      await controller.syncSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.syncSubscribersFromMonday).toHaveBeenCalledWith();
    });
  });

  describe('refreshSubscribers', () => {
    it('should refresh subscribers and return updated data', async () => {
      const mockRefreshedSubscribers = [
        { id: '1', name: 'Refreshed 1', email: 'refresh1@example.com' },
        { id: '2', name: 'Refreshed 2', email: 'refresh2@example.com' },
        { id: '3', name: 'Refreshed 3', email: 'refresh3@example.com' }
      ];

      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue(mockRefreshedSubscribers);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.refreshSubscribers).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRefreshedSubscribers,
        message: 'Cache limpo e 3 subscribers atualizados'
      });
    });

    it('should handle refresh with empty result', async () => {
      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue([]);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Cache limpo e 0 subscribers atualizados'
      });
    });

    it('should handle refresh with single subscriber', async () => {
      const mockSubscriber = [{ id: '1', name: 'Single Refresh' }];
      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue(mockSubscriber);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubscriber,
        message: 'Cache limpo e 1 subscribers atualizados'
      });
    });

    it('should return 500 when refresh fails', async () => {
      mockSubscriberService.refreshSubscribers = jest.fn().mockRejectedValue(new Error('Cache clear failed'));

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao fazer refresh dos subscribers',
        error: 'Cache clear failed'
      });
    });

    it('should handle unknown error type during refresh', async () => {
      mockSubscriberService.refreshSubscribers = jest.fn().mockRejectedValue(undefined);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao fazer refresh dos subscribers',
        error: 'Erro desconhecido'
      });
    });

    it('should handle large batch refresh', async () => {
      const mockLargeBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Subscriber ${i + 1}`
      }));

      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue(mockLargeBatch);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLargeBatch,
        message: 'Cache limpo e 1000 subscribers atualizados'
      });
    });

    it('should call refreshSubscribers without parameters', async () => {
      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue([]);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockSubscriberService.refreshSubscribers).toHaveBeenCalledWith();
    });

    it('should handle refresh with detailed subscriber data', async () => {
      const mockDetailedSubscribers = [
        {
          id: '1',
          name: 'Detailed Sub 1',
          email: 'detail1@test.com',
          metadata: { lastSync: '2025-12-01T10:00:00Z' }
        },
        {
          id: '2',
          name: 'Detailed Sub 2',
          email: 'detail2@test.com',
          metadata: { lastSync: '2025-12-01T10:00:00Z' }
        }
      ];

      mockSubscriberService.refreshSubscribers = jest.fn().mockResolvedValue(mockDetailedSubscribers);

      await controller.refreshSubscribers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDetailedSubscribers,
        message: 'Cache limpo e 2 subscribers atualizados'
      });
    });
  });
});
