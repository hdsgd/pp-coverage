import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ChannelScheduleService } from '../services/ChannelScheduleService';
import { CreateChannelScheduleDto, UpdateChannelScheduleDto } from '../dto/ChannelScheduleDto';

/**
 * Controller para administração de reservas de disponibilidade
 * Usa a mesma estrutura de ChannelSchedule mas sem integração com Monday
 */
export class AdminScheduleController {
    private readonly channelScheduleService: ChannelScheduleService;

    constructor(dataSource: DataSource) {
        this.channelScheduleService = new ChannelScheduleService(dataSource);
    }

    /**
     * Cria uma nova reserva de disponibilidade (admin)
     * POST /api/v1/admin/schedules
     */
    async createReservation(req: Request, res: Response): Promise<void> {
        try {
            const createDto: CreateChannelScheduleDto = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({
                    error: 'Usuário não autenticado'
                });
                return;
            }

            if (!createDto.id_canal || !createDto.data || !createDto.hora || createDto.qtd === undefined) {
                res.status(400).json({
                    error: 'Campos obrigatórios: id_canal (tipo de canal), data (DD/MM/YYYY), hora (HH:MM), qtd (quantidade). Opcional: area_solicitante'
                });
                return;
            }

            // Adiciona user_id do admin mas força tipo='reserva'
            const createDtoWithUser = {
                ...createDto,
                user_id: userId,
                tipo: 'reserva' as const  // Força tipo como reserva
            };
            const result = await this.channelScheduleService.create(createDtoWithUser);

            res.status(201).json({
                message: 'Reserva criada com sucesso',
                data: result
            });
        } catch (error) {
            console.error('Erro ao criar reserva:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista todas as reservas do usuário autenticado
     * GET /api/v1/admin/schedules
     * Query params: area_solicitante (opcional) - filtra por área
     */
    async listReservations(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const { area_solicitante } = req.query;

            if (!userId) {
                res.status(401).json({
                    error: 'Usuário não autenticado'
                });
                return;
            }

            // Se área foi especificada, filtra por área e usuário
            const result = area_solicitante
                ? await this.channelScheduleService.findByUserIdAndArea(userId, area_solicitante as string)
                : await this.channelScheduleService.findByUserId(userId);

            res.json({
                total: result.length,
                data: result,
                ...(area_solicitante && { filter: { area_solicitante } })
            });
        } catch (error) {
            console.error('Erro ao listar reservas:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca reserva por ID (admin)
     * GET /api/v1/admin/schedules/:id
     */
    async getReservationById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.channelScheduleService.findById(id);

            if (!result) {
                res.status(404).json({
                    error: 'Reserva não encontrada'
                });
                return;
            }

            res.json({ data: result });
        } catch (error) {
            console.error('Erro ao buscar reserva:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca reservas por tipo de canal (admin)
     * GET /api/v1/admin/schedules/channel/:channel_type
     */
    async getReservationsByChannel(req: Request, res: Response): Promise<void> {
        try {
            const { channel_type } = req.params;
            const result = await this.channelScheduleService.findByChannel(channel_type);

            res.json({
                channel_type,
                total: result.length,
                data: result
            });
        } catch (error) {
            console.error('Erro ao buscar reservas por canal:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca reservas por data (admin)
     * GET /api/v1/admin/schedules/date/:date
     */
    async getReservationsByDate(req: Request, res: Response): Promise<void> {
        try {
            const { date } = req.params;
            const result = await this.channelScheduleService.findByDate(date);

            res.json({
                date,
                total: result.length,
                data: result
            });
        } catch (error) {
            console.error('Erro ao buscar reservas por data:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza uma reserva (admin)
     * PUT /api/v1/admin/schedules/:id
     */
    async updateReservation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateDto: UpdateChannelScheduleDto = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({
                    error: 'Usuário não autenticado'
                });
                return;
            }

            // Garante que ao atualizar mantenha tipo='reserva' e user_id do admin
            const updateDtoWithMeta = {
                ...updateDto,
                user_id: userId,
                tipo: 'reserva' as const  // Força manter como reserva
            };

            const result = await this.channelScheduleService.update(id, updateDtoWithMeta);

            if (!result) {
                res.status(404).json({
                    error: 'Reserva não encontrada'
                });
                return;
            }

            res.json({
                message: 'Reserva atualizada com sucesso',
                data: result
            });
        } catch (error) {
            console.error('Erro ao atualizar reserva:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Deleta uma reserva (admin)
     * DELETE /api/v1/admin/schedules/:id
     */
    async deleteReservation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.channelScheduleService.delete(id);

            if (!result) {
                res.status(404).json({
                    error: 'Reserva não encontrada'
                });
                return;
            }

            res.status(200).json({
                message: 'Reserva deletada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar reserva:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
}
