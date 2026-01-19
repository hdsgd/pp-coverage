import { DataSource } from 'typeorm';
import { ChannelScheduleController } from '../../src/controllers/ChannelScheduleController';
import { ChannelScheduleService } from '../../src/services/ChannelScheduleService';

// Mock do ChannelScheduleService
jest.mock('../../src/services/ChannelScheduleService');

describe('ChannelScheduleController', () => {
    let controller: ChannelScheduleController;
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
            findAll: jest.fn(),
            findById: jest.fn(),
            findByChannel: jest.fn(),
            findByDate: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        // Configura o mock para retornar a instância mockada
        (ChannelScheduleService as jest.MockedClass<typeof ChannelScheduleService>).mockImplementation(() => mockChannelScheduleService);

        controller = new ChannelScheduleController(mockDataSource);

        // Mock da Response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTES PARA create
    // ============================================
    describe('create', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    id_canal: 'EMAIL',
                    data: '15/12/2025',
                    hora: '14:00',
                    qtd: 10,
                    tipo: 'solicitacao'
                }
            };
        });

        it('deve criar um agendamento com sucesso', async () => {
            const mockResult = {
                id: 'schedule-123',
                id_canal: 'EMAIL',
                data: '15/12/2025',
                hora: '14:00',
                qtd: 10,
                tipo: 'solicitacao'
            };

            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.create(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith({
                id_canal: 'EMAIL',
                data: '15/12/2025',
                hora: '14:00',
                qtd: 10,
                tipo: 'solicitacao'
            });
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
        });

        it('deve retornar erro 400 se id_canal estiver faltando', async () => {
            mockRequest.body.id_canal = undefined;

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal, data, hora, qtd'
            });
            expect(mockChannelScheduleService.create).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se data estiver faltando', async () => {
            mockRequest.body.data = undefined;

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal, data, hora, qtd'
            });
        });

        it('deve retornar erro 400 se hora estiver faltando', async () => {
            mockRequest.body.hora = undefined;

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal, data, hora, qtd'
            });
        });

        it('deve retornar erro 400 se qtd estiver faltando', async () => {
            mockRequest.body.qtd = undefined;

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Campos obrigatórios: id_canal, data, hora, qtd'
            });
        });

        it('deve aceitar qtd com valor zero', async () => {
            mockRequest.body.qtd = 0;
            const mockResult = { id: 'schedule-123', qtd: 0 };
            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.create(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith(
                expect.objectContaining({ qtd: 0 })
            );
            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });

        it('deve retornar erro 400 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.create.mockRejectedValue(new Error('Erro ao salvar'));

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro ao salvar'
            });
        });

        it('deve retornar erro 400 com mensagem genérica se o serviço lançar exceção não-Error', async () => {
            mockChannelScheduleService.create.mockRejectedValue('string error');

            await controller.create(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve criar agendamento sem campo tipo (opcional)', async () => {
            delete mockRequest.body.tipo;
            const mockResult = { id: 'schedule-123' };
            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.create(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });

        it('deve criar agendamento para canal SMS', async () => {
            mockRequest.body.id_canal = 'SMS';
            const mockResult = { id: 'schedule-123', id_canal: 'SMS' };
            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.create(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith(
                expect.objectContaining({ id_canal: 'SMS' })
            );
        });

        it('deve criar agendamento com campos opcionais', async () => {
            mockRequest.body.area_solicitante = 'Marketing';
            mockRequest.body.user_id = 'user-123';
            const mockResult = { id: 'schedule-123' };
            mockChannelScheduleService.create.mockResolvedValue(mockResult as any);

            await controller.create(mockRequest, mockResponse);

            expect(mockChannelScheduleService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    area_solicitante: 'Marketing',
                    user_id: 'user-123'
                })
            );
        });
    });

    // ============================================
    // TESTES PARA findAll
    // ============================================
    describe('findAll', () => {
        beforeEach(() => {
            mockRequest = {};
        });

        it('deve listar todos os agendamentos com sucesso', async () => {
            const mockSchedules = [
                { id: 'schedule-1', id_canal: 'EMAIL' },
                { id: 'schedule-2', id_canal: 'SMS' },
                { id: 'schedule-3', id_canal: 'PUSH' }
            ];

            mockChannelScheduleService.findAll.mockResolvedValue(mockSchedules as any);

            await controller.findAll(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findAll).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedules);
        });

        it('deve retornar array vazio se não houver agendamentos', async () => {
            mockChannelScheduleService.findAll.mockResolvedValue([]);

            await controller.findAll(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith([]);
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findAll.mockRejectedValue(new Error('Database error'));

            await controller.findAll(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve listar múltiplos agendamentos de diferentes tipos', async () => {
            const mockSchedules = [
                { id: 'schedule-1', tipo: 'solicitacao' },
                { id: 'schedule-2', tipo: 'reserva' }
            ];

            mockChannelScheduleService.findAll.mockResolvedValue(mockSchedules as any);

            await controller.findAll(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedules);
        });

        it('deve chamar findAll sem parâmetros', async () => {
            mockChannelScheduleService.findAll.mockResolvedValue([]);

            await controller.findAll(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findAll).toHaveBeenCalledWith();
        });
    });

    // ============================================
    // TESTES PARA findById
    // ============================================
    describe('findById', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'schedule-123' }
            };
        });

        it('deve retornar um agendamento por ID com sucesso', async () => {
            const mockSchedule = {
                id: 'schedule-123',
                id_canal: 'EMAIL',
                data: '15/12/2025',
                hora: '14:00'
            };

            mockChannelScheduleService.findById.mockResolvedValue(mockSchedule as any);

            await controller.findById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith('schedule-123');
            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedule);
        });

        it('deve retornar erro 404 se agendamento não for encontrado', async () => {
            mockChannelScheduleService.findById.mockResolvedValue(null);

            await controller.findById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Agendamento não encontrado'
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findById.mockRejectedValue(new Error('Database error'));

            await controller.findById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve buscar agendamento com ID numérico', async () => {
            mockRequest.params.id = '12345';
            mockChannelScheduleService.findById.mockResolvedValue({ id: '12345' } as any);

            await controller.findById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith('12345');
        });

        it('deve buscar agendamento com ID UUID', async () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            mockRequest.params.id = uuid;
            mockChannelScheduleService.findById.mockResolvedValue({ id: uuid } as any);

            await controller.findById(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findById).toHaveBeenCalledWith(uuid);
        });
    });

    // ============================================
    // TESTES PARA findByChannel
    // ============================================
    describe('findByChannel', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id_canal: 'EMAIL' }
            };
        });

        it('deve retornar agendamentos por canal com sucesso', async () => {
            const mockSchedules = [
                { id: 'schedule-1', id_canal: 'EMAIL' },
                { id: 'schedule-2', id_canal: 'EMAIL' }
            ];

            mockChannelScheduleService.findByChannel.mockResolvedValue(mockSchedules as any);

            await controller.findByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('EMAIL');
            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedules);
        });

        it('deve retornar array vazio se não houver agendamentos para o canal', async () => {
            mockChannelScheduleService.findByChannel.mockResolvedValue([]);

            await controller.findByChannel(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith([]);
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.findByChannel.mockRejectedValue(new Error('Database error'));

            await controller.findByChannel(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve buscar agendamentos para canal SMS', async () => {
            mockRequest.params.id_canal = 'SMS';
            mockChannelScheduleService.findByChannel.mockResolvedValue([]);

            await controller.findByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('SMS');
        });

        it('deve buscar agendamentos para canal PUSH', async () => {
            mockRequest.params.id_canal = 'PUSH';
            const mockSchedules = [{ id: 'schedule-1', id_canal: 'PUSH' }];
            mockChannelScheduleService.findByChannel.mockResolvedValue(mockSchedules as any);

            await controller.findByChannel(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByChannel).toHaveBeenCalledWith('PUSH');
            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedules);
        });
    });

    // ============================================
    // TESTES PARA findByDate
    // ============================================
    describe('findByDate', () => {
        beforeEach(() => {
            mockRequest = {
                params: { data: '15/12/2025' }
            };
        });

        it('deve retornar agendamentos por data com sucesso', async () => {
            const mockSchedules = [
                { id: 'schedule-1', data: '15/12/2025' },
                { id: 'schedule-2', data: '15/12/2025' }
            ];

            mockChannelScheduleService.findByDate.mockResolvedValue(mockSchedules as any);

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByDate).toHaveBeenCalledWith('15/12/2025');
            expect(mockResponse.json).toHaveBeenCalledWith(mockSchedules);
        });

        it('deve retornar array vazio se não houver agendamentos na data', async () => {
            mockChannelScheduleService.findByDate.mockResolvedValue([]);

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith([]);
        });

        it('deve retornar erro 400 se a data for inválida', async () => {
            mockChannelScheduleService.findByDate.mockRejectedValue(new Error('Data inválida'));

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Data inválida'
            });
        });

        it('deve buscar agendamentos com formato DD/MM/YYYY', async () => {
            mockRequest.params.data = '31/12/2025';
            mockChannelScheduleService.findByDate.mockResolvedValue([]);

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockChannelScheduleService.findByDate).toHaveBeenCalledWith('31/12/2025');
        });

        it('deve retornar erro 400 para formato de data incorreto', async () => {
            mockRequest.params.data = '2025-12-15';
            mockChannelScheduleService.findByDate.mockRejectedValue(new Error('Formato inválido'));

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Formato inválido'
            });
        });

        it('deve retornar erro 400 com mensagem genérica para exceção não-Error', async () => {
            mockChannelScheduleService.findByDate.mockRejectedValue('Invalid date string');

            await controller.findByDate(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });
    });

    // ============================================
    // TESTES PARA update
    // ============================================
    describe('update', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'schedule-123' },
                body: {
                    qtd: 20,
                    hora: '15:00'
                }
            };
        });

        it('deve atualizar um agendamento com sucesso', async () => {
            const mockUpdated = {
                id: 'schedule-123',
                id_canal: 'EMAIL',
                qtd: 20,
                hora: '15:00'
            };

            mockChannelScheduleService.update.mockResolvedValue(mockUpdated as any);

            await controller.update(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('schedule-123', {
                qtd: 20,
                hora: '15:00'
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdated);
        });

        it('deve retornar erro 404 se agendamento não for encontrado', async () => {
            mockChannelScheduleService.update.mockResolvedValue(null);

            await controller.update(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Agendamento não encontrado'
            });
        });

        it('deve retornar erro 400 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.update.mockRejectedValue(new Error('Erro ao atualizar'));

            await controller.update(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro ao atualizar'
            });
        });

        it('deve retornar erro 400 com mensagem genérica para exceção não-Error', async () => {
            mockChannelScheduleService.update.mockRejectedValue({ code: 'DB_ERROR' });

            await controller.update(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve atualizar apenas campos fornecidos', async () => {
            mockRequest.body = { hora: '16:00' };
            const mockUpdated = { id: 'schedule-123', hora: '16:00' };
            mockChannelScheduleService.update.mockResolvedValue(mockUpdated as any);

            await controller.update(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('schedule-123', { hora: '16:00' });
        });

        it('deve atualizar múltiplos campos', async () => {
            mockRequest.body = {
                id_canal: 'SMS',
                data: '20/12/2025',
                hora: '16:00',
                qtd: 25
            };
            const mockUpdated = { id: 'schedule-123' };
            mockChannelScheduleService.update.mockResolvedValue(mockUpdated as any);

            await controller.update(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('schedule-123', {
                id_canal: 'SMS',
                data: '20/12/2025',
                hora: '16:00',
                qtd: 25
            });
        });

        it('deve permitir atualizar qtd para zero', async () => {
            mockRequest.body = { qtd: 0 };
            const mockUpdated = { id: 'schedule-123', qtd: 0 };
            mockChannelScheduleService.update.mockResolvedValue(mockUpdated as any);

            await controller.update(mockRequest, mockResponse);

            expect(mockChannelScheduleService.update).toHaveBeenCalledWith('schedule-123', { qtd: 0 });
        });
    });

    // ============================================
    // TESTES PARA delete
    // ============================================
    describe('delete', () => {
        beforeEach(() => {
            mockRequest = {
                params: { id: 'schedule-123' }
            };
        });

        it('deve deletar um agendamento com sucesso', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(true);

            await controller.delete(mockRequest, mockResponse);

            expect(mockChannelScheduleService.delete).toHaveBeenCalledWith('schedule-123');
            expect(mockResponse.status).toHaveBeenCalledWith(204);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('deve retornar erro 404 se agendamento não for encontrado', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(false);

            await controller.delete(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Agendamento não encontrado'
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockChannelScheduleService.delete.mockRejectedValue(new Error('Erro ao deletar'));

            await controller.delete(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve deletar agendamento com ID numérico', async () => {
            mockRequest.params.id = '99999';
            mockChannelScheduleService.delete.mockResolvedValue(true);

            await controller.delete(mockRequest, mockResponse);

            expect(mockChannelScheduleService.delete).toHaveBeenCalledWith('99999');
            expect(mockResponse.status).toHaveBeenCalledWith(204);
        });

        it('deve retornar 404 se serviço retornar null', async () => {
            mockChannelScheduleService.delete.mockResolvedValue(null as any);

            await controller.delete(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Agendamento não encontrado'
            });
        });
    });
});
