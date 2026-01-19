import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ChannelScheduleService } from '../services/ChannelScheduleService';
import { CreateChannelScheduleDto, UpdateChannelScheduleDto } from '../dto/ChannelScheduleDto';

export class ChannelScheduleController {
    private readonly channelScheduleService: ChannelScheduleService;

    constructor(dataSource: DataSource) {
        this.channelScheduleService = new ChannelScheduleService(dataSource);
    }

    /**
     * Cria um novo agendamento de canal
     * POST /api/v1/channel-schedules
     */
    async create(req: Request, res: Response): Promise<void> {
        try {
            const createDto: CreateChannelScheduleDto = req.body;

            // Validação básica dos campos obrigatórios
            if (!createDto.id_canal || !createDto.data || !createDto.hora || createDto.qtd === undefined) {
                res.status(400).json({
                    error: 'Campos obrigatórios: id_canal, data, hora, qtd'
                });
                return;
            }

            const result = await this.channelScheduleService.create(createDto);
            res.status(201).json(result);
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Lista todos os agendamentos
     * GET /api/v1/channel-schedules
     */
    async findAll(_req: Request, res: Response): Promise<void> {
        try {
            const result = await this.channelScheduleService.findAll();
            res.json(result);
        } catch (error) {
            console.error('Erro ao listar agendamentos:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca agendamento por ID
     * GET /api/v1/channel-schedules/:id
     */
    async findById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.channelScheduleService.findById(id);

            if (!result) {
                res.status(404).json({
                    error: 'Agendamento não encontrado'
                });
                return;
            }

            res.json(result);
        } catch (error) {
            console.error('Erro ao buscar agendamento:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca agendamentos por canal
     * GET /api/v1/channel-schedules/channel/:id_canal
     */
    async findByChannel(req: Request, res: Response): Promise<void> {
        try {
            const { id_canal } = req.params;
            const result = await this.channelScheduleService.findByChannel(id_canal);
            res.json(result);
        } catch (error) {
            console.error('Erro ao buscar agendamentos por canal:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca agendamentos por data
     * GET /api/v1/channel-schedules/date/:data
     */
    async findByDate(req: Request, res: Response): Promise<void> {
        try {
            const { data } = req.params;
            const result = await this.channelScheduleService.findByDate(data);
            res.json(result);
        } catch (error) {
            console.error('Erro ao buscar agendamentos por data:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza um agendamento
     * PUT /api/v1/channel-schedules/:id
     */
    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateDto: UpdateChannelScheduleDto = req.body;

            const result = await this.channelScheduleService.update(id, updateDto);

            if (!result) {
                res.status(404).json({
                    error: 'Agendamento não encontrado'
                });
                return;
            }

            res.json(result);
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Erro interno do servidor'
            });
        }
    }

    /**
     * Deleta um agendamento
     * DELETE /api/v1/channel-schedules/:id
     */
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await this.channelScheduleService.delete(id);

            if (!result) {
                res.status(404).json({
                    error: 'Agendamento não encontrado'
                });
                return;
            }

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar agendamento:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    // (removido) formatDateForDatabase: método não utilizado
}
