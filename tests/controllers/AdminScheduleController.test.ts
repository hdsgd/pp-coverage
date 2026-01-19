import { DataSource } from 'typeorm';
import { AdminScheduleController } from '../../src/controllers/AdminScheduleController';
import { ChannelScheduleService } from '../../src/services/ChannelScheduleService';

// Mock do ChannelScheduleService
jest.mock('../../src/services/ChannelScheduleService');

describe('AdminScheduleController', () => {
    let controller: AdminScheduleController;
    let mockChannelScheduleService: jest.Mocked<ChannelScheduleService>;
    let mockRequest: any;
    let mockResponse: any;
    let mockDataSource: jest.Mocked<DataSource>;

    beforeEach(() => {
        // Mock do DataSource
        mockDataSource = {
            getRepository: jest.fn(),
        } as any;

        // Mock do Service
        mockChannelScheduleService = {
            create: jest.fn(),
            findByUserId: jest.fn(),
            findByUserIdAndArea: jest.fn(),
            findById: jest.fn(),
            findByChannel: jest.fn(),
            findByDate: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        // Configura o mock para retornar a instância mockada
        (ChannelScheduleService as jest.MockedClass<typeof ChannelScheduleService>).mockImplementation(() => mockChannelScheduleService);

        controller = new AdminScheduleController(mockDataSource);

        // Mock da Response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTES PARA createReservation
    // ============================================
    describe('createReservation', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    id_canal: 'EMAIL',
                    data: '15/12/2025',
                    hora: '14:00',
                    qtd: 5,
                    area_solicitante: 'Marketing'
                },
                user: { userId: 'user-123' }
            };
        });

        it('deve criar uma reserva com sucesso', async () => {
            const mockResult = {
                id: 'schedule-123',
                id_canal: 'EMAIL',
                data: '15/12/2025',
                hora: '14:00',
                qtd: 5,
                tipo: 'reserva',
                user_id: 'user-123',
                area_solicitante: 'Marketing'
            };

            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith({
                id_canal: 'EMAIL',
                data: '15/12/2025',
                hora: '14:00',
                qtd: 5,
                area_solicitante: 'Marketing',
                user_id: 'user-123',
                tipo: 'reserva'
            });
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Reserva criada com sucesso',
                data: mockResult
            });
        });

        it('deve retornar erro 401 se usuário não estiver autenticado', async () => {
            mockRequest.user = undefined;

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuário não autenticado'
            });
            expect(mockChannelScheduleService.create).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se id_canal estiver faltando', async () => {
            mockRequest.body.id_canal = undefined;

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal (tipo de canal), data (DD/MM/YYYY), hora (HH:MM), qtd (quantidade). Opcional: area_solicitante'
            });
            expect(mockChannelScheduleService.create).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se data estiver faltando', async () => {
            mockRequest.body.data = undefined;

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal (tipo de canal), data (DD/MM/YYYY), hora (HH:MM), qtd (quantidade). Opcional: area_solicitante'
            });
        });

        it('deve retornar erro 400 se hora estiver faltando', async () => {
            mockRequest.body.hora = undefined;

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal (tipo de canal), data (DD/MM/YYYY), hora (HH:MM), qtd (quantidade). Opcional: area_solicitante'
            });
        });

        it('deve retornar erro 400 se qtd estiver faltando', async () => {
            mockRequest.body.qtd = undefined;

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal (tipo de canal), data (DD/MM/YYYY), hora (HH:MM), qtd (quantidade). Opcional: area_solicitante'
            });
        });

        it('deve retornar erro 400 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.create.mockRejectedValue(new Error('Erro ao salvar no banco'));

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro ao salvar no banco'
            });
        });

        it('deve forçar tipo como reserva mesmo se outro tipo for enviado', async () => {
            mockRequest.body.tipo = 'solicitacao';
            const mockResult = { id: 'schedule-123', tipo: 'reserva' };
            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith(
                expect.objectContaining({ tipo: 'reserva' })
            );
        });
    });

    // ============================================
    // TESTES PARA listReservations
    // ============================================
    describe('listReservations', () => {
        beforeEach(() => {
            mockRequest = {
                user: { userId: 'user-123' },
                query: {}
            };
        });

        it('deve listar todas as reservas do usuário autenticado', async () => {
            const mockReservations = [
                { id: 'res-1', id_canal: 'EMAIL', user_id: 'user-123' },
                { id: 'res-2', id_canal: 'SMS', user_id: 'user-123' }
            ];

            mockChannelScheduleService.findByUserId.mockResolvedValue(mockReservations as any);

            await controller.listReservations(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByUserId).toHaveBeenCalledWith('user-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                total: 2,
                data: mockReservations
            });
        });

        it('deve retornar erro 401 se usuário não estiver autenticado', async () => {
            mockRequest.user = undefined;

            await controller.listReservations(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuário não autenticado'
            });
            expect(mockChannelScheduleService.findByUserId).not.toHaveBeenCalled();
        });

        it('deve filtrar reservas por área solicitante quando especificado', async () => {
            mockRequest.query = { area_solicitante: 'Marketing' };
            const mockReservations = [
                { id: 'res-1', area_solicitante: 'Marketing' }
            ];

            mockChannelScheduleService.findByUserIdAndArea.mockResolvedValue(mockReservations as any);

            await controller.listReservations(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByUserIdAndArea).toHaveBeenCalledWith('user-123', 'Marketing');
            expect(mockResponse.json).toHaveBeenCalledWith({
                total: 1,
                data: mockReservations,
                filter: { area_solicitante: 'Marketing' }
            });
        });

        it('deve retornar array vazio se usuário não tiver reservas', async () => {
            mockChannelScheduleService.findByUserId.mockResolvedValue([]);

            await controller.listReservations(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                total: 0,
                data: []
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findByUserId.mockRejectedValue(new Error('Erro no banco'));

            await controller.listReservations(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve retornar todas as reservas quando área for string vazia', async () => {
            mockRequest.query = { area_solicitante: '' };
            mockChannelScheduleService.findByUserId.mockResolvedValue([]);

            await controller.listReservations(mockRequest, mockResponse);

            // String vazia é falsy, então chama findByUserId
            expect(mockChannelScheduleService.findByUserId).toHaveBeenCalledWith('user-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                total: 0,
                data: []
            });
        });
    });

    // ============================================
    // TESTES PARA getReservationById
    // ============================================
    describe('getReservationById', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'reservation-123' }
            };
        });

        it('deve retornar uma reserva por ID com sucesso', async () => {
            const mockReservation = {
                id: 'reservation-123',
                id_canal: 'EMAIL',
                data: '15/12/2025'
            };

            mockChannelScheduleService.findById.mockResolvedValue(mockReservation as any);

            await controller.getReservationById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith('reservation-123');
            expect(mockResponse.json).toHaveBeenCalledWith({ data: mockReservation });
        });

        it('deve retornar erro 404 se reserva não for encontrada', async () => {
            mockChannelScheduleService.findById.mockResolvedValue(null);

            await controller.getReservationById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Reserva não encontrada'
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findById.mockRejectedValue(new Error('Erro no banco'));

            await controller.getReservationById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve buscar reserva com ID numérico', async () => {
            mockRequest.params = { id: '12345' };
            mockChannelScheduleService.findById.mockResolvedValue({ id: '12345' } as any);

            await controller.getReservationById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith('12345');
        });

        it('deve buscar reserva com ID UUID', async () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            mockRequest.params = { id: uuid };
            mockChannelScheduleService.findById.mockResolvedValue({ id: uuid } as any);

            await controller.getReservationById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith(uuid);
        });
    });

    // ============================================
    // TESTES PARA getReservationsByChannel
    // ============================================
    describe('getReservationsByChannel', () => {
        beforeEach(() => {
            mockRequest = {
                params: { channel_type: 'EMAIL' }
            };
        });

        it('deve retornar reservas por tipo de canal com sucesso', async () => {
            const mockReservations = [
                { id: 'res-1', id_canal: 'EMAIL' },
                { id: 'res-2', id_canal: 'EMAIL' }
            ];

            mockChannelScheduleService.findByChannel.mockResolvedValue(mockReservations as any);

            await controller.getReservationsByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('EMAIL');
            expect(mockResponse.json).toHaveBeenCalledWith({
                channel_type: 'EMAIL',
                total: 2,
                data: mockReservations
            });
        });

        it('deve retornar array vazio se não houver reservas para o canal', async () => {
            mockChannelScheduleService.findByChannel.mockResolvedValue([]);

            await controller.getReservationsByChannel(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                channel_type: 'EMAIL',
                total: 0,
                data: []
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findByChannel.mockRejectedValue(new Error('Erro no banco'));

            await controller.getReservationsByChannel(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve buscar reservas para canal SMS', async () => {
            mockRequest.params = { channel_type: 'SMS' };
            mockChannelScheduleService.findByChannel.mockResolvedValue([]);

            await controller.getReservationsByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('SMS');
        });

        it('deve buscar reservas para canal PUSH', async () => {
            mockRequest.params = { channel_type: 'PUSH' };
            const mockReservations = [{ id: 'res-1', id_canal: 'PUSH' }];
            mockChannelScheduleService.findByChannel.mockResolvedValue(mockReservations as any);

            await controller.getReservationsByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('PUSH');
            expect(mockResponse.json).toHaveBeenCalledWith({
                channel_type: 'PUSH',
                total: 1,
                data: mockReservations
            });
        });
    });

    // ============================================
    // TESTES PARA getReservationsByDate
    // ============================================
    describe('getReservationsByDate', () => {
        beforeEach(() => {
            mockRequest = {
                params: { date: '15/12/2025' }
            };
        });

        it('deve retornar reservas por data com sucesso', async () => {
            const mockReservations = [
                { id: 'res-1', data: '15/12/2025' },
                { id: 'res-2', data: '15/12/2025' }
            ];

            mockChannelScheduleService.findByDate.mockResolvedValue(mockReservations as any);

            await controller.getReservationsByDate(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByDate).toHaveBeenCalledWith('15/12/2025');
            expect(mockResponse.json).toHaveBeenCalledWith({
                date: '15/12/2025',
                total: 2,
                data: mockReservations
            });
        });

        it('deve retornar array vazio se não houver reservas na data', async () => {
            mockChannelScheduleService.findByDate.mockResolvedValue([]);

            await controller.getReservationsByDate(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                date: '15/12/2025',
                total: 0,
                data: []
            });
        });

        it('deve retornar erro 400 se a data for inválida', async () => {
            mockChannelScheduleService.findByDate.mockRejectedValue(new Error('Data inválida'));

            await controller.getReservationsByDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Data inválida'
            });
        });

        it('deve buscar reservas com formato de data DD/MM/YYYY', async () => {
            mockRequest.params = { date: '31/12/2025' };
            mockChannelScheduleService.findByDate.mockResolvedValue([]);

            await controller.getReservationsByDate(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByDate).toHaveBeenCalledWith('31/12/2025');
        });

        it('deve retornar erro 400 para formato de data incorreto', async () => {
            mockRequest.params = { date: '2025-12-15' };
            mockChannelScheduleService.findByDate.mockRejectedValue(new Error('Formato de data inválido'));

            await controller.getReservationsByDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Formato de data inválido'
            });
        });
    });

    // ============================================
    // TESTES PARA updateReservation
    // ============================================
    describe('updateReservation', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'reservation-123' },
                body: {
                    qtd: 10,
                    area_solicitante: 'Vendas'
                },
                user: { userId: 'user-123' }
            };
        });

        it('deve atualizar uma reserva com sucesso', async () => {
            const mockUpdated = {
                id: 'reservation-123',
                qtd: 10,
                area_solicitante: 'Vendas',
                tipo: 'reserva',
                user_id: 'user-123'
            };

            mockChannelScheduleService.update.mockResolvedValue(mockUpdated as any);

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('reservation-123', {
                qtd: 10,
                area_solicitante: 'Vendas',
                user_id: 'user-123',
                tipo: 'reserva'
            });
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Reserva atualizada com sucesso',
                data: mockUpdated
            });
        });

        it('deve retornar erro 401 se usuário não estiver autenticado', async () => {
            mockRequest.user = undefined;

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuário não autenticado'
            });
            expect(mockChannelScheduleService.update).not.toHaveBeenCalled();
        });

        it('deve retornar erro 404 se reserva não for encontrada', async () => {
            mockChannelScheduleService.update.mockResolvedValue(null);

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Reserva não encontrada'
            });
        });

        it('deve retornar erro 400 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.update.mockRejectedValue(new Error('Erro ao atualizar'));

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro ao atualizar'
            });
        });

        it('deve forçar tipo como reserva na atualização', async () => {
            mockRequest.body.tipo = 'solicitacao';
            mockChannelScheduleService.update.mockResolvedValue({ id: 'reservation-123' } as any);

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith(
                'reservation-123',
                expect.objectContaining({ tipo: 'reserva' })
            );
        });

        it('deve atualizar apenas os campos enviados', async () => {
            mockRequest.body = { data: '20/12/2025' };
            mockChannelScheduleService.update.mockResolvedValue({ id: 'reservation-123' } as any);

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('reservation-123', {
                data: '20/12/2025',
                user_id: 'user-123',
                tipo: 'reserva'
            });
        });
    });

    // ============================================
    // TESTES PARA deleteReservation
    // ============================================
    describe('deleteReservation', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'reservation-123' }
            };
        });

        it('deve deletar uma reserva com sucesso', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(true);

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.delete).toHaveBeenCalledWith('reservation-123');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Reserva deletada com sucesso'
            });
        });

        it('deve retornar erro 404 se reserva não for encontrada', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(false);

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Reserva não encontrada'
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.delete.mockRejectedValue(new Error('Erro ao deletar'));

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve deletar reserva com ID numérico', async () => {
            mockRequest.params = { id: '99999' };
            mockChannelScheduleService.delete.mockResolvedValue(true);

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockChannelScheduleService.delete).toHaveBeenCalledWith('99999');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('deve retornar null se serviço retornar null', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(null as any);

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Reserva não encontrada'
            });
        });

        it('deve retornar erro com mensagem genérica se exceção não for Error', async () => {
            mockChannelScheduleService.delete.mockRejectedValue('string error');

            await controller.deleteReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });
    });

    // Adicionar testes para cobrir branches de erro não-Error nos outros métodos
    describe('Additional error handling coverage', () => {
        it('createReservation: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                body: {
                    id_canal: 'EMAIL',
                    data: '15/12/2025',
                    hora: '14:00',
                    qtd: 5,
                    area_solicitante: 'Marketing'
                },
                user: { userId: 'user-123' }
            };

            mockChannelScheduleService.create.mockRejectedValue({ code: 'DB_ERROR' });

            await controller.createReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('updateReservation: deve retornar erro genérico para exceção não-Error', async () => {
            mockRequest = {
                params: { id: 'reservation-123' },
                body: { qtd: 10 },
                user: { userId: 'user-123' }
            };

            mockChannelScheduleService.update.mockRejectedValue(123);

            await controller.updateReservation(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });
    });
});
