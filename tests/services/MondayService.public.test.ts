/**
 * Testes para métodos públicos simples do MondayService (CRUD, queries básicas)
 * Foco em aumentar cobertura testando operações diretas
 */

import { MondayService } from '../../src/services/MondayService';
import axios from 'axios';
import { AppDataSource } from '../../src/config/database';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AppDataSource
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('MondayService - Public Methods', () => {
  let service: MondayService;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    service = new MondayService();
  });

  describe('Board Operations', () => {
    describe('getAllBoards', () => {
      it('should return all boards from database', async () => {
        // Arrange
        const mockBoards = [
          { id: '1', name: 'Board 1', board_id: '123' },
          { id: '2', name: 'Board 2', board_id: '456' },
        ];
        mockRepository.find.mockResolvedValue(mockBoards);

        // Act
        const result = await service.getAllBoards();

        // Assert
        expect(result).toEqual(mockBoards);
        expect(mockRepository.find).toHaveBeenCalled();
      });

      it('should return empty array when no boards exist', async () => {
        // Arrange
        mockRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.getAllBoards();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('getBoardById', () => {
      it('should return board by database id', async () => {
        // Arrange
        const mockBoard = { id: '1', name: 'Test Board', board_id: '123', is_active: true };
        mockRepository.findOne.mockResolvedValue(mockBoard);

        // Act
        const result = await service.getBoardById('1');

        // Assert
        expect(result).toEqual(mockBoard);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: '1', is_active: true },
        });
      });

      it('should return null when board not found', async () => {
        // Arrange
        mockRepository.findOne.mockResolvedValue(null);

        // Act
        const result = await service.getBoardById('999');

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('getBoardByMondayId', () => {
      it('should return board by Monday board_id', async () => {
        // Arrange
        const mockBoard = { id: '1', name: 'Test Board', board_id: '123', is_active: true };
        mockRepository.findOne.mockResolvedValue(mockBoard);

        // Act
        const result = await service.getBoardByMondayId('123');

        // Assert
        expect(result).toEqual(mockBoard);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { board_id: '123', is_active: true },
        });
      });

      it('should return null when board not found', async () => {
        // Arrange
        mockRepository.findOne.mockResolvedValue(null);

        // Act
        const result = await service.getBoardByMondayId('999');

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('createBoard', () => {
      it('should create and save a new board', async () => {
        // Arrange
        const boardData = {
          name: 'New Board',
          board_id: '789',
          entity: 'campaign',
        };
        const createdBoard = { id: '3', ...boardData, query_fields: ['id', 'name', 'status'] };
        mockRepository.create.mockReturnValue(createdBoard);
        mockRepository.save.mockResolvedValue(createdBoard);

        // Act
        const result = await service.createBoard(boardData);

        // Assert
        expect(result).toEqual(createdBoard);
        expect(mockRepository.create).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
      });
    });

    describe('updateBoard', () => {
      it('should update existing board', async () => {
        // Arrange
        const existingBoard = { id: '1', name: 'Old Name', board_id: '123' };
        const updateData = { name: 'New Name' };
        const updatedBoard = { ...existingBoard, ...updateData };

        mockRepository.findOne.mockResolvedValue(existingBoard);
        mockRepository.save.mockResolvedValue(updatedBoard);

        // Act
        const result = await service.updateBoard('1', updateData);

        // Assert
        expect(result).toEqual(updatedBoard);
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should throw error when board not found', async () => {
        // Arrange
        mockRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.updateBoard('999', { name: 'New Name' })
        ).rejects.toThrow('Board não encontrado');
        expect(mockRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Item Operations', () => {
    describe('getAllActiveItems', () => {
      it('should return all active items', async () => {
        // Arrange
        const mockItems = [
          { id: '1', name: 'Item 1', status: 'Ativo' },
          { id: '2', name: 'Item 2', status: 'Ativo' },
        ];
        mockRepository.find.mockResolvedValue(mockItems);

        // Act
        const result = await service.getAllActiveItems();

        // Assert
        expect(result).toEqual(mockItems);
        expect(mockRepository.find).toHaveBeenCalledWith({
          where: { status: 'Ativo' },
          relations: ['board'],
        });
      });

      it('should return empty array when no active items', async () => {
        // Arrange
        mockRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.getAllActiveItems();

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  describe('GraphQL Operations', () => {
    describe('makeGraphQLRequest', () => {
      it('should make successful GraphQL request', async () => {
        // Arrange
        const query = '{ boards { id name } }';
        const mockResponse = {
          data: {
            data: {
              boards: [{ id: '123', name: 'Test Board' }],
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await service.makeGraphQLRequest(query);

        // Assert
        expect(result).toEqual(mockResponse.data);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://api.monday.com/v2',
          { query },
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should handle GraphQL errors', async () => {
        // Arrange
        const query = '{ invalid }';
        const mockResponse = {
          data: {
            errors: [{ message: 'Field not found' }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(service.makeGraphQLRequest(query)).rejects.toThrow();
      });

      it('should handle network errors', async () => {
        // Arrange
        const query = '{ boards { id } }';
        mockedAxios.post.mockRejectedValue(new Error('Network error'));

        // Act & Assert
        await expect(service.makeGraphQLRequest(query)).rejects.toThrow(
          'Falha na comunica'
        );
      });
    });

    describe('testConnection', () => {
      it('should return true for successful connection', async () => {
        // Arrange
        const mockResponse = {
          data: {
            data: {
              me: { id: '123', name: 'Test User' },
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Act
        const result = await service.testConnection();

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for failed connection', async () => {
        // Arrange
        mockedAxios.post.mockRejectedValue(new Error('Connection failed'));

        // Act
        const result = await service.testConnection();

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('updateItemName', () => {
    it('should update item name successfully', async () => {
      // Arrange
      const itemId = '123';
      const newName = 'Updated Name';
      const mockResponse = {
        data: {
          data: {
            change_simple_column_value: { id: itemId, name: newName },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      // Act
      await (service as any).updateItemName(itemId, newName);

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          query: expect.stringContaining('change_simple_column_value'),
        }),
        expect.any(Object)
      );
    });

    it('should handle update errors', async () => {
      // Arrange
      const itemId = '123';
      const newName = 'Updated Name';
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(
        (service as any).updateItemName(itemId, newName)
      ).rejects.toThrow('Falha na comunica');
    });
  });
});
