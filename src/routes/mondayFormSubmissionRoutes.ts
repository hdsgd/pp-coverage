import { Router } from "express";
import { MondayFormSubmissionController } from "../controllers/MondayFormSubmissionController";

/**
 * @swagger
 * tags:
 *   - name: Monday Form Submission
 *     description: Endpoints para processar formulários e enviar para Monday.com
 */

const router = Router();
const mondayFormSubmissionController = new MondayFormSubmissionController();

/**
 * @swagger
 * /api/v1/monday/form-submission:
 *   post:
 *     summary: Processar formulário e criar item na Monday.com
 *     tags: [Monday Form Submission]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - timestamp
 *               - formTitle
 *               - data
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID único da submissão
 *                 example: "1755036132962_gx79gt6nu"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp da submissão
 *                 example: "2025-08-13T22:02:12.962Z"
 *               formTitle:
 *                 type: string
 *                 description: Título do formulário
 *                 example: "Formulário de Campanha PicPay"
 *               data:
 *                 type: object
 *                 description: Dados do formulário
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Nome da campanha
 *                     example: "Campanha teste Excluir"
 *                   label__1:
 *                     type: string
 *                     description: Tipo de solicitação (obrigatório para roteamento)
 *                     enum:
 *                       - "Novo Disparo CRM"
 *                       - "Nova Campanha GAM"
 *                       - "Briefing de Materiais Criativos"
 *                       - "Disparo CRM com Briefing de Materiais Criativos"
 *                       - "Briefing de Materiais Criativos + Campanha GAM"
 *                       - "Briefing de Materiais Criativos + Disparo CRM + Campanha GAM"
 *                     example: "Novo Disparo CRM"
 *                   dup__of_c_digo_canal____1:
 *                     type: string
 *                     description: Código do canal
 *                     example: "abcsedf123"
 *                   n_mero__1:
 *                     type: string
 *                     description: Número
 *                     example: "500000"
 *                   data__1:
 *                     type: string
 *                     format: date
 *                     description: Data
 *                     example: "2025-08-21"
 *                   lookup_mkrt36cj:
 *                     type: string
 *                     example: "Ads"
 *                   lookup_mkrt66aq:
 *                     type: string
 *                     example: "Campanha Rocket"
 *                   lookup_mkrtaebd:
 *                     type: string
 *                     example: "PJ"
 *                   __SUBITEMS__:
 *                     type: array
 *                     description: Lista de subitems (touchpoints)
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "7698495864"
 *                         conectar_quadros87__1:
 *                           type: string
 *                           description: Canal
 *                           example: "Email"
 *                         data__1:
 *                           type: string
 *                           format: date
 *                           description: Data do disparo
 *                           example: "2025-08-14"
 *                         n_meros__1:
 *                           type: number
 *                           description: Número/ordem
 *                           example: 1
 *                         texto__1:
 *                           type: string
 *                           description: Texto/descrição
 *                           example: "TEste"
 *                         lista_suspensa5__1:
 *                           type: string
 *                           example: "Emocional"
 *                         lista_suspensa53__1:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Autoridade","Novidade"]
 *                         conectar_quadros_mkkcnyr3:
 *                           type: string
 *                           description: Hora do disparo
 *                           example: "08:30"
 *                         n_meros_mkkchcmk:
 *                           type: number
 *                           description: Volume/quantidade
 *                           example: 500000
 *     responses:
 *       202:
 *         description: Submissão recebida; processamento em segundo plano iniciado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Submissão recebida. Processamento iniciado em segundo plano."
 *                 form_id:
 *                   type: string
 *                   description: ID da submissão do formulário
 *                   example: "1755036132962_gx79gt6nu"
 *                 form_type:
 *                   type: string
 *                   description: Tipo de formulário processado
 *                   example: "Novo Disparo CRM"
 *       400:
 *         description: Dados inválidos ou tipo de formulário não reconhecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Tipo de formulário não reconhecido ou campo 'label__1' ausente/inválido."
 *                 supported_types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de tipos de formulário suportados
 *                   example: ["Novo Disparo CRM", "Nova Campanha GAM"]
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Erro interno do servidor"
 *                 details:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.post("/form-submission", mondayFormSubmissionController.createFromFormSubmission.bind(mondayFormSubmissionController));

/**
 * @swagger
 * /api/v1/monday/form-submission/test:
 *   post:
 *     summary: Testar integração com dados de exemplo
 *     tags: [Monday Form Submission]
 *     responses:
 *       201:
 *         description: Teste executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Teste executado com sucesso"
 *                 test_data:
 *                   type: object
 *                   description: Dados de teste utilizados
 *                 monday_item_id:
 *                   type: string
 *                   description: ID do item criado na Monday.com
 *                 subitem_ids:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs dos subitems criados
 *       500:
 *         description: Erro no teste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Erro no teste de integração"
 */
router.post("/form-submission/test", mondayFormSubmissionController.testFormSubmission.bind(mondayFormSubmissionController));

/**
 * @swagger
 * /api/v1/monday/form-submission/test-connection:
 *   post:
 *     summary: Testar conexão com Monday API
 *     tags: [Monday Form Submission]
 *     responses:
 *       200:
 *         description: Conexão funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Conexão com Monday API funcionando"
 *                 data:
 *                   type: object
 *       500:
 *         description: Erro na conexão
 */
router.post("/form-submission/test-connection", mondayFormSubmissionController.testMondayConnection.bind(mondayFormSubmissionController));

/**
 * @swagger
 * /api/v1/monday/form-submission/test-briefing:
 *   post:
 *     summary: Testar integração Briefing de Materiais Criativos com dados de exemplo
 *     tags: [Monday Form Submission]
 *     responses:
 *       201:
 *         description: Teste Briefing executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Teste Briefing de Materiais Criativos executado com sucesso"
 *                 test_data:
 *                   type: object
 *                 monday_item_id:
 *                   type: string
 *                   example: "1234567890"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Erro no teste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Erro no teste de integração Briefing de Materiais Criativos"
 *                 details:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post("/form-submission/test-briefing", mondayFormSubmissionController.testBriefingMateriaisCriativosSubmission.bind(mondayFormSubmissionController));


/**
 * @swagger
 * /api/v1/monday/form-submission/test-gam:
 *   post:
 *     summary: Testar integração GAM com dados de exemplo
 *     tags: [Monday Form Submission]
 *     responses:
 *       201:
 *         description: Teste GAM executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Teste GAM executado com sucesso"
 *                 test_data:
 *                   type: object
 *                   description: Dados de teste GAM utilizados
 *                 monday_item_id:
 *                   type: string
 *                   description: ID do item criado na Monday.com
 *       500:
 *         description: Erro no teste GAM
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Erro no teste de integração GAM"
 *                 details:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.post("/form-submission/test-gam", mondayFormSubmissionController.testGAMSubmission.bind(mondayFormSubmissionController));

export { router as mondayFormSubmissionRoutes };

