import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AdminScheduleController } from '../controllers/AdminScheduleController';
import { authMiddleware, checkRole } from '../middleware/authMiddleware';

/**
 * @swagger
 * tags:
 *   name: Admin Schedules
 *   description: API de administração para reserva de disponibilidade (sem integração Monday)
 */

/**
 * @swagger
 * /api/v1/admin/schedules:
 *   post:
 *     summary: Criar nova reserva de disponibilidade (Admin)
 *     tags: [Admin Schedules]
 *     description: Endpoint para administradores reservarem disponibilidade de canais (SMS, EMAIL, etc.) sem integração com Monday
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_canal
 *               - data
 *               - hora
 *               - qtd
 *             properties:
 *               id_canal:
 *                 type: string
 *                 description: Tipo de canal (SMS, EMAIL, PUSH, etc.)
 *                 example: "SMS"
 *               data:
 *                 type: string
 *                 pattern: '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
 *                 description: Data da reserva (DD/MM/YYYY)
 *                 example: "21/10/2025"
 *               hora:
 *                 type: string
 *                 pattern: '^[0-9]{2}:[0-9]{2}$'
 *                 description: Hora da reserva (HH:MM)
 *                 example: "10:00"
 *               qtd:
 *                 type: number
 *                 description: Quantidade de mensagens reservadas
 *                 example: 100000
 *     responses:
 *       201:
 *         description: Reserva criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva criada com sucesso"
 *                 data:
 *                   type: object
 *       400:
 *         description: Dados inválidos
 *   get:
 *     summary: Listar todas as reservas (Admin)
 *     tags: [Admin Schedules]
 *     responses:
 *       200:
 *         description: Lista de reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/v1/admin/schedules/{id}:
 *   get:
 *     summary: Buscar reserva por ID (Admin)
 *     tags: [Admin Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reserva encontrada
 *       404:
 *         description: Reserva não encontrada
 *   put:
 *     summary: Atualizar reserva (Admin)
 *     tags: [Admin Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_canal:
 *                 type: string
 *               data:
 *                 type: string
 *               hora:
 *                 type: string
 *               qtd:
 *                 type: number
 *     responses:
 *       200:
 *         description: Reserva atualizada
 *       404:
 *         description: Reserva não encontrada
 *   delete:
 *     summary: Deletar reserva (Admin)
 *     tags: [Admin Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reserva deletada
 *       404:
 *         description: Reserva não encontrada
 */

/**
 * @swagger
 * /api/v1/admin/schedules/channel/{channel_type}:
 *   get:
 *     summary: Buscar reservas por tipo de canal (Admin)
 *     tags: [Admin Schedules]
 *     parameters:
 *       - in: path
 *         name: channel_type
 *         required: true
 *         schema:
 *           type: string
 *         example: "SMS"
 *     responses:
 *       200:
 *         description: Lista de reservas do canal
 */

/**
 * @swagger
 * /api/v1/admin/schedules/date/{date}:
 *   get:
 *     summary: Buscar reservas por data (Admin)
 *     tags: [Admin Schedules]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         example: "21/10/2025"
 *     responses:
 *       200:
 *         description: Lista de reservas da data
 */

export function createAdminScheduleRoutes(dataSource: DataSource): Router {
    const router = Router();
    const controller = new AdminScheduleController(dataSource);

    // Aplica autenticação e verificação de role admin em todas as rotas
    router.use(authMiddleware);
    router.use(checkRole(['admin']));

    // POST /api/v1/admin/schedules - Criar nova reserva
    router.post('/', async (req, res) => {
        await controller.createReservation(req, res);
    });

    // GET /api/v1/admin/schedules - Listar todas as reservas
    router.get('/', async (req, res) => {
        await controller.listReservations(req, res);
    });

    // GET /api/v1/admin/schedules/:id - Buscar por ID
    router.get('/:id', async (req, res) => {
        await controller.getReservationById(req, res);
    });

    // GET /api/v1/admin/schedules/channel/:channel_type - Buscar por canal
    router.get('/channel/:channel_type', async (req, res) => {
        await controller.getReservationsByChannel(req, res);
    });

    // GET /api/v1/admin/schedules/date/:date - Buscar por data
    router.get('/date/:date', async (req, res) => {
        await controller.getReservationsByDate(req, res);
    });

    // PUT /api/v1/admin/schedules/:id - Atualizar reserva
    router.put('/:id', async (req, res) => {
        await controller.updateReservation(req, res);
    });

    // DELETE /api/v1/admin/schedules/:id - Deletar reserva
    router.delete('/:id', async (req, res) => {
        await controller.deleteReservation(req, res);
    });

    return router;
}
