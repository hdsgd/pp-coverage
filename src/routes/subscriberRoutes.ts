import { Router } from 'express';
import { SubscriberController } from '../controllers/SubscriberController';

const router = Router();
const subscriberController = new SubscriberController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscriber:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do subscriber no Monday.com
 *         name:
 *           type: string
 *           description: Nome completo do subscriber
 *         email:
 *           type: string
 *           format: email
 *           description: Email do subscriber
 *         board_id:
 *           type: string
 *           description: ID do board no Monday.com
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização
 *     SubscriberDropdownOption:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nome do subscriber
 *         item_id:
 *           type: string
 *           description: ID do subscriber para uso no formulário
 */

/**
 * @swagger
 * /api/v1/subscribers:
 *   get:
 *     summary: Lista todos os subscribers
 *     tags: [Subscribers]
 *     responses:
 *       200:
 *         description: Lista de subscribers recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno do servidor
 */
// Commented out: This route is duplicated below with conditional logic for id parameter
// router.get('/', subscriberController.getAllSubscribers.bind(subscriberController));

/**
 * @swagger
 * /api/v1/subscribers/dropdown:
 *   get:
 *     summary: Lista subscribers formatados para dropdown
 *     tags: [Subscribers]
 *     responses:
 *       200:
 *         description: Subscribers para dropdown recuperados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriberDropdownOption'
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dropdown', subscriberController.getSubscribersForDropdown.bind(subscriberController));

/**
 * @swagger
 * /api/v1/subscribers:
 *   get:
 *     summary: Listar todos os subscribers ou buscar por ID
 *     tags: [Subscribers]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do subscriber
 *     responses:
 *       200:
 *         description: Lista de subscribers ou subscriber específico
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Subscriber'
 *                     message:
 *                       type: string
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       $ref: '#/components/schemas/Subscriber'
 *                     message:
 *                       type: string
 *       404:
 *         description: Subscriber não encontrado (quando buscar por ID)
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', (req, res) => {
    const { id } = req.query;
    
    if (id) {
        (req.params as any).id = id as string;
        subscriberController.getSubscriberById.bind(subscriberController)(req, res);
    } else {
        subscriberController.getAllSubscribers.bind(subscriberController)(req, res);
    }
});

/**
 * @swagger
 * /api/v1/subscribers/sync:
 *   post:
 *     summary: Força sincronização com Monday.com
 *     tags: [Subscribers]
 *     responses:
 *       200:
 *         description: Sincronização realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/sync', subscriberController.syncSubscribers.bind(subscriberController));

/**
 * @swagger
 * /api/v1/subscribers/refresh:
 *   post:
 *     summary: Força refresh completo dos dados
 *     tags: [Subscribers]
 *     responses:
 *       200:
 *         description: Refresh realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscriber'
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/refresh', subscriberController.refreshSubscribers.bind(subscriberController));

export default router;
