import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ChannelScheduleController } from '../controllers/ChannelScheduleController';

/**
 * @swagger
 * tags:
 *   name: Channel Schedules
 *   description: API para gerenciamento de agendamentos de canais
 */

/**
 * @swagger
 * /api/v1/channel-schedules:
 *   post:
 *     summary: Criar novo agendamento de canal
 *     tags: [Channel Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChannelScheduleDto'
 *           example:
 *             id_canal: "email"
 *             data: "25/12/2025"
 *             hora: "14:30"
 *             qtd: 1000
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChannelSchedule'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_date:
 *                 summary: Data inválida
 *                 value:
 *                   error: "Formato de data inválido. Use DD/MM/YYYY"
 *               invalid_time:
 *                 summary: Hora inválida
 *                 value:
 *                   error: "Formato de hora inválido. Use HH:MM"
 *               invalid_quantity:
 *                 summary: Quantidade inválida
 *                 value:
 *                   error: "Quantidade deve ser maior que zero"
 *   get:
 *     summary: Buscar agendamentos (todos, por ID, canal ou data)
 *     tags: [Channel Schedules]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do agendamento (retorna um único agendamento)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: id_canal
 *         required: false
 *         schema:
 *           type: string
 *         description: Identificador do canal (retorna lista de agendamentos do canal)
 *         example: "email"
 *       - in: query
 *         name: data
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
 *         description: Data no formato DD/MM/YYYY (retorna lista de agendamentos da data)
 *         example: "25/12/2025"
 *     responses:
 *       200:
 *         description: Agendamento(s) encontrado(s)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ChannelSchedule'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChannelSchedule'
 *             examples:
 *               single_item:
 *                 summary: Busca por ID (retorna um item)
 *                 value:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   id_canal: "email"
 *                   data: "25/12/2025"
 *                   hora: "14:30"
 *                   qtd: 1000
 *               multiple_items:
 *                 summary: Busca por canal/data ou listagem geral (retorna array)
 *                 value:
 *                   - id: "123e4567-e89b-12d3-a456-426614174000"
 *                     id_canal: "email"
 *                     data: "25/12/2025"
 *                     hora: "14:30"
 *                     qtd: 1000
 *                   - id: "987f6543-e21c-34d5-b678-536625285111"
 *                     id_canal: "email"
 *                     data: "25/12/2025"
 *                     hora: "15:00"
 *                     qtd: 500
 *       404:
 *         description: Agendamento não encontrado (quando buscar por ID específico)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Agendamento não encontrado"
 *       400:
 *         description: Parâmetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Formato de data inválido. Use DD/MM/YYYY"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Atualizar agendamento
 *     tags: [Channel Schedules]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do agendamento a ser atualizado
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateChannelScheduleDto'
 *           example:
 *             qtd: 1500
 *             hora: "15:00"
 *     responses:
 *       200:
 *         description: Agendamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChannelSchedule'
 *       404:
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Dados inválidos ou ID não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_id:
 *                 summary: ID não fornecido
 *                 value:
 *                   error: "ID é obrigatório para atualização"
 *               invalid_data:
 *                 summary: Dados inválidos
 *                 value:
 *                   error: "Formato de data inválido. Use DD/MM/YYYY"
 *   delete:
 *     summary: Deletar agendamento
 *     tags: [Channel Schedules]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do agendamento a ser deletado
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Agendamento deletado com sucesso
 *       404:
 *         description: Agendamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: ID não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "ID é obrigatório para exclusão"
 */

export function createChannelScheduleRoutes(dataSource: DataSource): Router {
    const router = Router();
    const controller = new ChannelScheduleController(dataSource);

    // POST /api/v1/channel-schedules - Criar novo agendamento
    router.post('/', async (req, res) => {
        await controller.create(req, res);
    });

    // GET /api/v1/channel-schedules - Listar todos os agendamentos ou buscar por filtros
    router.get('/', async (req, res) => {
        const { id, id_canal, data } = req.query;
        
        if (id) {
            // Buscar por ID específico
            (req.params as any).id = id as string;
            await controller.findById(req, res);
        } else if (id_canal) {
            // Buscar por canal
            (req.params as any).id_canal = id_canal as string;
            await controller.findByChannel(req, res);
        } else if (data) {
            // Buscar por data
            (req.params as any).data = data as string;
            await controller.findByDate(req, res);
        } else {
            // Listar todos
            await controller.findAll(req, res);
        }
    });

    // PUT /api/v1/channel-schedules - Atualizar agendamento
    router.put('/', async (req, res) => {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório para atualização' });
            return;
        }
        (req.params as any).id = id as string;
        await controller.update(req, res);
    });

    // DELETE /api/v1/channel-schedules - Deletar agendamento
    router.delete('/', async (req, res) => {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'ID é obrigatório para exclusão' });
            return;
        }
        (req.params as any).id = id as string;
        await controller.delete(req, res);
    });

    return router;
}
