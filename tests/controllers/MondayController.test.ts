import { MondayController } from '../../src/controllers/MondayController';
import { MondayService } from '../../src/services/MondayService';
import { validate } from 'class-validator';

// Mock do MondayService e class-validator
jest.mock('../../src/services/MondayService');
jest.mock('class-validator', () => ({
    validate: jest.fn(),
    IsString: jest.fn(() => jest.fn()),
    IsNotEmpty: jest.fn(() => jest.fn()),
    IsOptional: jest.fn(() => jest.fn()),
    IsBoolean: jest.fn(() => jest.fn()),
    IsArray: jest.fn(() => jest.fn()),
}));

describe('MondayController', () => {
    let controller: MondayController;
    let mockMondayService: jest.Mocked<MondayService>;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Mock do MondayService
        mockMondayService = {
            getAllBoards: jest.fn(),
            createBoard: jest.fn(),
            updateBoard: jest.fn(),
            deleteBoard: jest.fn(),
            getBoardById: jest.fn(),
            getItemsByBoard: jest.fn(),
            getBoardByMondayId: jest.fn(),
            syncBoardData: jest.fn(),
            syncBoardById: jest.fn(),
            initializeDefaultBoards: jest.fn(),
            getAllActiveItems: jest.fn(),
            getBoardInfo: jest.fn(),
            testConnection: jest.fn(),
            syncBoardByDatabaseId: jest.fn(),
            getChannelSchedulesByNameAndDate: jest.fn(),
            getItemsCountByBoard: jest.fn(),
            getCampaignsPaginated: jest.fn(),
            getCampaignDetails: jest.fn(),
            updateCampaign: jest.fn(),
        } as any;

        (MondayService as jest.MockedClass<typeof MondayService>).mockImplementation(() => mockMondayService);

        controller = new MondayController();

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock padrão para validate
        (validate as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTES PARA getAllBoards
    // ============================================
    describe('getAllBoards', () => {
        beforeEach(() => {
            mockRequest = {};
        });

        it('deve retornar todos os boards com sucesso', async () => {
            const mockBoards = [
                { id: '1', name: 'Board 1', board_id: '123' },
                { id: '2', name: 'Board 2', board_id: '456' }
            ];

            mockMondayService.getAllBoards.mockResolvedValue(mockBoards as any);

            await controller.getAllBoards(mockRequest, mockResponse);

            expect(mockMondayService.getAllBoards).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockBoards,
                message: 'Boards recuperados com sucesso'
            });
        });

        it('deve retornar erro 500 se o serviço falhar', async () => {
            mockMondayService.getAllBoards.mockRejectedValue(new Error('Database error'));

            await controller.getAllBoards(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao recuperar boards',
                error: 'Database error'
            });
        });

        it('deve retornar erro com mensagem padrão se erro não for instância de Error', async () => {
            mockMondayService.getAllBoards.mockRejectedValue('string error');

            await controller.getAllBoards(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Erro desconhecido' })
            );
        });
    });

    // ============================================
    // TESTES PARA createBoard
    // ============================================
    describe('createBoard', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    name: 'New Board',
                    board_id: '789'
                }
            };
        });

        it('deve criar um board com sucesso', async () => {
            const mockBoard = { id: '1', name: 'New Board', board_id: '789' };
            mockMondayService.createBoard.mockResolvedValue(mockBoard as any);

            await controller.createBoard(mockRequest, mockResponse);

            expect(mockMondayService.createBoard).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockBoard,
                message: 'Board criado com sucesso'
            });
        });

        it('deve retornar erro 400 se validação falhar', async () => {
            (validate as jest.Mock).mockResolvedValue([
                { constraints: { isNotEmpty: 'Name não pode estar vazio' } }
            ]);

            await controller.createBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dados inválidos',
                errors: ['Name não pode estar vazio']
            });
            expect(mockMondayService.createBoard).not.toHaveBeenCalled();
        });

        it('deve retornar erro 500 se o serviço falhar', async () => {
            mockMondayService.createBoard.mockRejectedValue(new Error('Creation failed'));

            await controller.createBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao criar board',
                error: 'Creation failed'
            });
        });
    });

    // ============================================
    // TESTES PARA updateBoard
    // ============================================
    describe('updateBoard', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'board-123' },
                body: { name: 'Updated Board' }
            };
        });

        it('deve atualizar um board com sucesso', async () => {
            const mockBoard = { id: 'board-123', name: 'Updated Board' };
            mockMondayService.updateBoard.mockResolvedValue(mockBoard as any);

            await controller.updateBoard(mockRequest, mockResponse);

            expect(mockMondayService.updateBoard).toHaveBeenCalledWith('board-123', expect.any(Object));
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockBoard,
                message: 'Board atualizado com sucesso'
            });
        });

        it('deve retornar erro 400 se validação falhar', async () => {
            (validate as jest.Mock).mockResolvedValue([
                { constraints: { isString: 'Name deve ser string' } }
            ]);

            await controller.updateBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockMondayService.updateBoard).not.toHaveBeenCalled();
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.updateBoard.mockRejectedValue(new Error('Board não encontrado'));

            await controller.updateBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Board não encontrado'
            });
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.updateBoard.mockRejectedValue(new Error('Database error'));

            await controller.updateBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao atualizar board',
                error: 'Database error'
            });
        });
    });

    // ============================================
    // TESTES PARA deleteBoard
    // ============================================
    describe('deleteBoard', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'board-123' }
            };
        });

        it('deve deletar um board com sucesso', async () => {
            mockMondayService.deleteBoard.mockResolvedValue(undefined);

            await controller.deleteBoard(mockRequest, mockResponse);

            expect(mockMondayService.deleteBoard).toHaveBeenCalledWith('board-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Board deletado com sucesso'
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.deleteBoard.mockRejectedValue(new Error('Board não encontrado'));

            await controller.deleteBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Board não encontrado'
            });
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.deleteBoard.mockRejectedValue(new Error('Deletion failed'));

            await controller.deleteBoard(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getBoardItems
    // ============================================
    describe('getBoardItems', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'board-123' }
            };
        });

        it('deve retornar itens do board com sucesso', async () => {
            const mockBoard = { id: 'board-123', name: 'Test Board', board_id: '789' };
            const mockItems = [
                { id: '1', item_id: 'item1', name: 'Item 1', status: 'active', max_value: 10 },
                { id: '2', item_id: 'item2', name: 'Item 2', status: 'active', max_value: 20 }
            ];

            mockMondayService.getBoardById.mockResolvedValue(mockBoard as any);
            mockMondayService.getItemsByBoard.mockResolvedValue(mockItems as any);

            await controller.getBoardItems(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Array),
                total_items: 2,
                message: 'Itens recuperados com sucesso',
                board_info: expect.objectContaining({ id: 'board-123' })
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.getBoardById.mockResolvedValue(null);

            await controller.getBoardItems(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Board não encontrado'
            });
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getBoardById.mockRejectedValue(new Error('Database error'));

            await controller.getBoardItems(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getBoardItemsByMondayId
    // ============================================
    describe('getBoardItemsByMondayId', () => {
        beforeEach(() => {
            mockRequest = {
                params: { board_id: '789' }
            };
        });

        it('deve retornar itens do board pelo Monday ID', async () => {
            const mockBoard = { id: 'board-123', name: 'Test Board', board_id: '789' };
            const mockItems = [
                { id: '1', item_id: 'item1', name: 'Item A' },
                { id: '2', item_id: 'item2', name: 'Item B' }
            ];

            mockMondayService.getBoardByMondayId.mockResolvedValue(mockBoard as any);
            mockMondayService.getItemsByBoard.mockResolvedValue(mockItems as any);

            await controller.getBoardItemsByMondayId(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                board_info: expect.objectContaining({ board_id: '789' }),
                data: { 'Item A': 'item1', 'Item B': 'item2' }
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.getBoardByMondayId.mockResolvedValue(null);

            await controller.getBoardItemsByMondayId(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getBoardByMondayId.mockRejectedValue(new Error('API error'));

            await controller.getBoardItemsByMondayId(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA syncData
    // ============================================
    describe('syncData', () => {
        beforeEach(() => {
            mockRequest = {
                body: {}
            };
        });

        it('deve sincronizar dados com sucesso', async () => {
            mockMondayService.syncBoardData.mockResolvedValue(undefined);

            await controller.syncData(mockRequest, mockResponse);

            expect(mockMondayService.syncBoardData).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sincronização realizada com sucesso'
            });
        });

        it('deve retornar erro 400 se validação falhar', async () => {
            (validate as jest.Mock).mockResolvedValue([
                { constraints: { isValid: 'Dados inválidos' } }
            ]);

            await controller.syncData(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockMondayService.syncBoardData).not.toHaveBeenCalled();
        });

        it('deve retornar erro 500 se sincronização falhar', async () => {
            mockMondayService.syncBoardData.mockRejectedValue(new Error('Sync failed'));

            await controller.syncData(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA syncBoardData
    // ============================================
    describe('syncBoardData', () => {
        beforeEach(() => {
            mockRequest = {
                params: { boardId: 'board-123' }
            };
        });

        it('deve sincronizar board específico com sucesso', async () => {
            mockMondayService.syncBoardData.mockResolvedValue(undefined);

            await controller.syncBoardData(mockRequest, mockResponse);

            expect(mockMondayService.syncBoardData).toHaveBeenCalledWith('board-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sincronização do board realizada com sucesso'
            });
        });

        it('deve retornar erro 500 se sincronização falhar', async () => {
            mockMondayService.syncBoardData.mockRejectedValue(new Error('Sync error'));

            await controller.syncBoardData(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA syncBoardById
    // ============================================
    describe('syncBoardById', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'board-123' }
            };
        });

        it('deve sincronizar board por ID com sucesso', async () => {
            mockMondayService.syncBoardById.mockResolvedValue({
                success: true,
                message: 'Sincronizado',
                itemsCount: 5
            } as any);

            await controller.syncBoardById(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sincronizado',
                data: { itemsCount: 5 }
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.syncBoardById.mockRejectedValue(new Error('Board não encontrado'));

            await controller.syncBoardById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.syncBoardById.mockRejectedValue(new Error('Sync failed'));

            await controller.syncBoardById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA initializeBoards
    // ============================================
    describe('initializeBoards', () => {
        beforeEach(() => {
            mockRequest = {};
        });

        it('deve inicializar boards padrão com sucesso', async () => {
            mockMondayService.initializeDefaultBoards.mockResolvedValue(undefined);

            await controller.initializeBoards(mockRequest, mockResponse);

            expect(mockMondayService.initializeDefaultBoards).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Boards padrão inicializados com sucesso'
            });
        });

        it('deve retornar erro 500 se inicialização falhar', async () => {
            mockMondayService.initializeDefaultBoards.mockRejectedValue(new Error('Init failed'));

            await controller.initializeBoards(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getAllActiveItems
    // ============================================
    describe('getAllActiveItems', () => {
        beforeEach(() => {
            mockRequest = {};
        });

        it('deve retornar todos os itens ativos', async () => {
            const mockItems = [
                { id: '1', status: 'active' },
                { id: '2', status: 'active' }
            ];

            mockMondayService.getAllActiveItems.mockResolvedValue(mockItems as any);

            await controller.getAllActiveItems(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockItems,
                message: 'Itens ativos recuperados com sucesso'
            });
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getAllActiveItems.mockRejectedValue(new Error('Query failed'));

            await controller.getAllActiveItems(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getBoardInfo
    // ============================================
    describe('getBoardInfo', () => {
        beforeEach(() => {
            mockRequest = {
                params: { boardId: '789' }
            };
        });

        it('deve retornar informações do board', async () => {
            const mockBoardInfo = { id: '789', name: 'Test Board', columns: [] };

            mockMondayService.getBoardInfo.mockResolvedValue(mockBoardInfo as any);

            await controller.getBoardInfo(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockBoardInfo,
                message: 'Informações do board recuperadas com sucesso'
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.getBoardInfo.mockResolvedValue(null);

            await controller.getBoardInfo(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getBoardInfo.mockRejectedValue(new Error('API error'));

            await controller.getBoardInfo(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA testConnection
    // ============================================
    describe('testConnection', () => {
        beforeEach(() => {
            mockRequest = {};
        });

        it('deve retornar sucesso se conexão for estabelecida', async () => {
            mockMondayService.testConnection.mockResolvedValue(true);

            await controller.testConnection(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Conexão com Monday.com estabelecida com sucesso'
            });
        });

        it('deve retornar erro 500 se conexão falhar', async () => {
            mockMondayService.testConnection.mockResolvedValue(false);

            await controller.testConnection(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Falha na conexão com Monday.com'
            });
        });

        it('deve retornar erro 500 se houver exceção', async () => {
            mockMondayService.testConnection.mockRejectedValue(new Error('Connection error'));

            await controller.testConnection(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA syncBoardByDatabaseId
    // ============================================
    describe('syncBoardByDatabaseId', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'board-123' }
            };
        });

        it('deve sincronizar board por database ID', async () => {
            mockMondayService.syncBoardByDatabaseId.mockResolvedValue({
                message: 'Sincronizado',
                itemsCount: 10,
                boardName: 'Test Board'
            } as any);

            await controller.syncBoardByDatabaseId(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sincronizado',
                data: {
                    itemsCount: 10,
                    boardName: 'Test Board'
                }
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.syncBoardByDatabaseId.mockRejectedValue(new Error('Board não encontrado'));

            await controller.syncBoardByDatabaseId(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.syncBoardByDatabaseId.mockRejectedValue(new Error('Sync error'));

            await controller.syncBoardByDatabaseId(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getChannelSchedulesByNameAndDate
    // ============================================
    describe('getChannelSchedulesByNameAndDate', () => {
        beforeEach(() => {
            mockRequest = {
                query: {
                    channelName: 'EMAIL',
                    date: '15/12/2025'
                }
            };
        });

        it('deve retornar schedules por canal e data', async () => {
            const mockResult = { success: true, data: [] };
            mockMondayService.getChannelSchedulesByNameAndDate.mockResolvedValue(mockResult as any);

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockMondayService.getChannelSchedulesByNameAndDate).toHaveBeenCalledWith(
                'EMAIL',
                '15/12/2025',
                undefined,
                'admin'
            );
            expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
        });

        it('deve retornar erro 400 se channelName não for fornecido', async () => {
            mockRequest.query.channelName = undefined;

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Nome do canal e data são obrigatórios'
            });
        });

        it('deve retornar erro 400 se data não for fornecida', async () => {
            mockRequest.query.date = undefined;

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('deve retornar erro 400 se formato de data for inválido', async () => {
            mockRequest.query.date = 'invalid-date';

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD'
            });
        });

        it('deve aceitar formato YYYY-MM-DD', async () => {
            mockRequest.query.date = '2025-12-15';
            mockMondayService.getChannelSchedulesByNameAndDate.mockResolvedValue({ success: true } as any);

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockMondayService.getChannelSchedulesByNameAndDate).toHaveBeenCalled();
        });

        it('deve retornar erro 400 se contexto for inválido', async () => {
            mockRequest.query.contexto = 'invalid';

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: "Contexto inválido. Use 'form' ou 'admin'"
            });
        });

        it('deve aceitar contexto form', async () => {
            mockRequest.query.contexto = 'form';
            mockMondayService.getChannelSchedulesByNameAndDate.mockResolvedValue({ success: true } as any);

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockMondayService.getChannelSchedulesByNameAndDate).toHaveBeenCalledWith(
                'EMAIL',
                '15/12/2025',
                undefined,
                'form'
            );
        });

        it('deve passar areaSolicitante se fornecido', async () => {
            mockRequest.query.areaSolicitante = 'Marketing';
            mockMondayService.getChannelSchedulesByNameAndDate.mockResolvedValue({ success: true } as any);

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockMondayService.getChannelSchedulesByNameAndDate).toHaveBeenCalledWith(
                'EMAIL',
                '15/12/2025',
                'Marketing',
                'admin'
            );
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getChannelSchedulesByNameAndDate.mockRejectedValue(new Error('Query error'));

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA debugBoardItemsCount
    // ============================================
    describe('debugBoardItemsCount', () => {
        beforeEach(() => {
            mockRequest = {
                params: { board_id: '789' }
            };
        });

        it('deve retornar informações de debug do board', async () => {
            const mockBoard = { id: 'board-123', name: 'Test Board', board_id: '789' };
            const mockItems = [
                { id: '1', name: 'Item 1', status: 'active' },
                { id: '2', name: 'Item 2', status: 'active' }
            ];

            mockMondayService.getBoardByMondayId.mockResolvedValue(mockBoard as any);
            mockMondayService.getItemsCountByBoard.mockResolvedValue(2);
            mockMondayService.getItemsByBoard.mockResolvedValue(mockItems as any);

            await controller.debugBoardItemsCount(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    count_method: 2,
                    find_method_length: 2
                })
            });
        });

        it('deve retornar erro 404 se board não for encontrado', async () => {
            mockMondayService.getBoardByMondayId.mockResolvedValue(null);

            await controller.debugBoardItemsCount(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getBoardByMondayId.mockRejectedValue(new Error('Debug error'));

            await controller.debugBoardItemsCount(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getCampaignsPaginated
    // ============================================
    describe('getCampaignsPaginated', () => {
        beforeEach(() => {
            mockRequest = {
                query: {}
            };
        });

        it('deve retornar campanhas paginadas', async () => {
            const mockResult = {
                items: [{ id: '1', name: 'Campaign 1' }],
                cursor: 'next-cursor',
                hasMore: true
            };

            mockMondayService.getCampaignsPaginated.mockResolvedValue(mockResult as any);

            await controller.getCampaignsPaginated(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockResult.items,
                cursor: 'next-cursor',
                hasMore: true,
                count: 1
            });
        });

        it('deve passar filtros para o serviço', async () => {
            mockRequest.query = {
                cursor: 'cursor-123',
                dateFrom: '2025-01-01',
                dateTo: '2025-12-31',
                searchTerm: 'test'
            };

            mockMondayService.getCampaignsPaginated.mockResolvedValue({
                items: [],
                cursor: null,
                hasMore: false
            } as any);

            await controller.getCampaignsPaginated(mockRequest, mockResponse);

            expect(mockMondayService.getCampaignsPaginated).toHaveBeenCalledWith(
                'cursor-123',
                '2025-01-01',
                '2025-12-31',
                'test'
            );
        });

        it('deve retornar erro 500 se houver falha', async () => {
            mockMondayService.getCampaignsPaginated.mockRejectedValue(new Error('Query error'));

            await controller.getCampaignsPaginated(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA getCampaignDetails
    // ============================================
    describe('getCampaignDetails', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'campaign-123' }
            };
        });

        it('deve retornar detalhes da campanha', async () => {
            const mockDetails = { id: 'campaign-123', name: 'Test Campaign' };

            mockMondayService.getCampaignDetails.mockResolvedValue(mockDetails as any);

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockDetails
            });
        });

        it('deve retornar erro 400 se ID não for fornecido', async () => {
            mockRequest.params.id = '';

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'ID da campanha é obrigatório'
            });
        });

        it('deve retornar erro 404 se campanha não for encontrada', async () => {
            mockMondayService.getCampaignDetails.mockRejectedValue(new Error('Campanha não encontrada'));

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 404 se campanha não pertencer ao board', async () => {
            mockMondayService.getCampaignDetails.mockRejectedValue(new Error('Campanha não pertence ao board'));

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.getCampaignDetails.mockRejectedValue(new Error('Query error'));

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    // ============================================
    // TESTES PARA updateCampaign
    // ============================================
    describe('updateCampaign', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'campaign-123' },
                body: { name: 'Updated Campaign' }
            };
        });

        it('deve atualizar campanha com sucesso', async () => {
            const mockResult = { id: 'campaign-123', name: 'Updated Campaign' };

            mockMondayService.updateCampaign.mockResolvedValue(mockResult as any);

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockMondayService.updateCampaign).toHaveBeenCalledWith('campaign-123', { name: 'Updated Campaign' });
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Campanha atualizada com sucesso',
                data: mockResult
            });
        });

        it('deve retornar erro 400 se ID não for fornecido', async () => {
            mockRequest.params.id = '';

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('deve retornar erro 404 se campanha não for encontrada', async () => {
            mockMondayService.updateCampaign.mockRejectedValue(new Error('Campanha não encontrada'));

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 404 se campanha não pertencer ao board', async () => {
            mockMondayService.updateCampaign.mockRejectedValue(new Error('não pertence ao board'));

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
        });

        it('deve retornar erro 500 para outros erros', async () => {
            mockMondayService.updateCampaign.mockRejectedValue(new Error('Update error'));

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });

        it('deve retornar erro genérico se exceção não for Error', async () => {
            mockMondayService.updateCampaign.mockRejectedValue({ error: 'object error' });

            await controller.updateCampaign(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });
    });

    // Testes adicionais para cobrir todos os branches não-Error
    describe('Additional error handling coverage', () => {
        it('createBoard: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                body: {
                    name: 'New Board',
                    board_id: '789'
                }
            };

            mockMondayService.createBoard.mockRejectedValue('string error');

            await controller.createBoard(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('updateBoard: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'board-123' },
                body: { name: 'Updated Board' }
            };

            mockMondayService.updateBoard.mockRejectedValue({ code: 'DB_ERROR' });

            await controller.updateBoard(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('deleteBoard: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'board-123' }
            };

            mockMondayService.deleteBoard.mockRejectedValue(123);

            await controller.deleteBoard(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getBoardItems: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'board-123' }
            };

            mockMondayService.getBoardById.mockRejectedValue(['array', 'error']);

            await controller.getBoardItems(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getBoardItemsByMondayId: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { board_id: '123456' }
            };

            mockMondayService.getBoardByMondayId.mockRejectedValue(null);

            await controller.getBoardItemsByMondayId(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('syncData: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                body: {}
            };

            mockMondayService.syncBoardData.mockRejectedValue(undefined);

            await controller.syncData(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('syncBoardData: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { boardId: '123' }
            };

            mockMondayService.syncBoardData.mockRejectedValue(false);

            await controller.syncBoardData(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('syncBoardById: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'board-123' }
            };

            mockMondayService.syncBoardById.mockRejectedValue({ status: 'failed' });

            await controller.syncBoardById(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('initializeBoards: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {};

            mockMondayService.initializeDefaultBoards.mockRejectedValue(123);

            await controller.initializeBoards(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getAllActiveItems: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {};

            mockMondayService.getAllActiveItems.mockRejectedValue('error string');

            await controller.getAllActiveItems(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getBoardInfo: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                query: { board_id: '123' }
            };

            mockMondayService.getBoardInfo.mockRejectedValue([]);

            await controller.getBoardInfo(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('testConnection: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {};

            mockMondayService.testConnection.mockRejectedValue({ code: 500 });

            await controller.testConnection(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('syncBoardByDatabaseId: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'board-123' }
            };

            mockMondayService.syncBoardByDatabaseId.mockRejectedValue(null);

            await controller.syncBoardByDatabaseId(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getChannelSchedulesByNameAndDate: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                query: { channelName: 'test', date: '2025-01-01' }
            };

            mockMondayService.getChannelSchedulesByNameAndDate.mockRejectedValue(false);

            await controller.getChannelSchedulesByNameAndDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: "Erro ao buscar schedules"
            }));
        });

        it('getCampaignsPaginated: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                query: {}
            };

            mockMondayService.getCampaignsPaginated.mockRejectedValue(['error']);

            await controller.getCampaignsPaginated(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });

        it('getCampaignDetails: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'campaign-123' }
            };

            mockMondayService.getCampaignDetails.mockRejectedValue(undefined);

            await controller.getCampaignDetails(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erro desconhecido'
            }));
        });
    });
});
