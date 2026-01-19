import { Router } from "express";
import { MondayController } from "../controllers/MondayController";

/**
 * @swagger
 * tags:
 *   - name: Boards
 *     description: Gerenciamento de boards do Monday.com
 *   - name: Items
 *     description: Gerenciamento de itens dos boards
 *   - name: Monday.com Info
 *     description: Informações e testes de conexão com Monday.com
 *   - name: Sincronização
 *     description: Sincronização de dados entre Monday.com e o sistema
 *   - name: Configuração
 *     description: Configurações e inicializações do sistema
 */

const router = Router();
const mondayController = new MondayController();

/**
 * @swagger
 * /api/v1/monday/boards:
 *   get:
 *     summary: Listar todos os boards configurados
 *     tags: [Boards]
 *     responses:
 *       200:
 *         description: Lista de boards configurados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MondayBoard'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/boards", mondayController.getAllBoards.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/boards:
 *   post:
 *     summary: Criar um novo board
 *     tags: [Boards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMondayBoardDto'
 *     responses:
 *       201:
 *         description: Board criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MondayBoard'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 */
router.post("/boards", mondayController.createBoard.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/boards/{id}:
 *   put:
 *     summary: Atualizar um board existente
 *     tags: [Boards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMondayBoardDto'
 *     responses:
 *       200:
 *         description: Board atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MondayBoard'
 *       404:
 *         description: Board não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put("/boards/:id", mondayController.updateBoard.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/boards/{id}:
 *   delete:
 *     summary: Deletar um board
 *     tags: [Boards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do board
 *     responses:
 *       204:
 *         description: Board deletado com sucesso
 *       404:
 *         description: Board não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete("/boards/:id", mondayController.deleteBoard.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/boards/items:
 *   get:
 *     summary: Listar itens de um board específico
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID interno do board (UUID) - usado quando você tem o ID do sistema
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: board_id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID do board no Monday.com - usado quando você tem o board_id original
 *         example: "7400348232"
 *     responses:
 *       200:
 *         description: Lista de itens do board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: Nome do item
 *                             example: "Nome do Item"
 *                     - type: object
 *                       description: Objeto onde as chaves são os nomes dos itens e os valores são os item_id
 *                       additionalProperties:
 *                         type: string
 *                       example: 
 *                         "Shop": "123456789"
 *                         "E-commerce": "987654321" 
 *                         "Marketplace": "456789123"
 *                 message:
 *                   type: string
 *                   example: "Itens recuperados com sucesso"
 *                 board_info:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: ID interno do board (UUID)
 *                     name:
 *                       type: string
 *                       description: Nome do board
 *                     board_id:
 *                       type: string
 *                       description: ID do board no Monday.com
 *       400:
 *         description: Parâmetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "ID ou board_id é obrigatório"
 *       404:
 *         description: Board não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Board não encontrado"
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/boards/items", (req, res) => {
    const { id, board_id } = req.query;
    
    if (id) {
        (req.params as any).id = id as string;
        mondayController.getBoardItems.bind(mondayController)(req, res);
    } else if (board_id) {
        (req.params as any).board_id = board_id as string;
        mondayController.getBoardItemsByMondayId.bind(mondayController)(req, res);
    } else {
        res.status(400).json({
            success: false,
            message: "ID ou board_id é obrigatório"
        });
    }
});

/**
 * @swagger
 * /api/v1/monday/boards/monday-id/{board_id}/items:
 *   get:
 *     summary: Listar itens de um board específico usando o board_id do Monday.com
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: board_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do board no Monday.com (board_id)
 *     responses:
 *       200:
 *         description: Lista de itens do board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board_info:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: ID interno do board (UUID)
 *                     name:
 *                       type: string
 *                       description: Nome do board
 *                     board_id:
 *                       type: string
 *                       description: ID do board no Monday.com
 *                 data:
 *                   type: object
 *                   description: Objeto onde as chaves são os nomes dos itens e os valores são os item_id
 *                   additionalProperties:
 *                     type: string
 *                   example: 
 *                     "Shop": "123456789"
 *                     "E-commerce": "987654321" 
 *                     "Marketplace": "456789123"
 *       404:
 *         description: Board não encontrado
 *       500:
 *         description: Erro interno do servidor
 */


/**
 * @swagger
 * /api/v1/monday/items:
 *   get:
 *     summary: Listar todos os itens ativos
 *     tags: [Items]
 *     responses:
 *       200:
 *         description: Lista de todos os itens ativos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MondayItem'
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/items", mondayController.getAllActiveItems.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/board-info:
 *   get:
 *     summary: Obter informações de um board do Monday.com
 *     tags: [Monday.com Info]
 *     parameters:
 *       - in: query
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do board no Monday.com
 *     responses:
 *       200:
 *         description: Informações do board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Board ID inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "boardId é obrigatório"
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/board-info", (req, res) => {
    const { boardId } = req.query;
    if (!boardId) {
        res.status(400).json({
            success: false,
            message: "boardId é obrigatório"
        });
        return;
    }
    (req.params as any).boardId = boardId as string;
    mondayController.getBoardInfo.bind(mondayController)(req, res);
});

/**
 * @swagger
 * /api/v1/monday/test-connection:
 *   get:
 *     summary: Testar conexão com Monday.com
 *     tags: [Monday.com Info]
 *     responses:
 *       200:
 *         description: Conexão testada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Conexão com Monday.com estabelecida"
 *       500:
 *         description: Erro de conexão
 */
router.get("/test-connection", mondayController.testConnection.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/sync:
 *   post:
 *     summary: Sincronizar dados de todos os boards
 *     tags: [Sincronização]
 *     responses:
 *       200:
 *         description: Sincronização realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sincronização realizada com sucesso"
 *                 totalItems:
 *                   type: number
 *                   example: 150
 *       500:
 *         description: Erro durante a sincronização
 */
router.post("/sync", mondayController.syncData.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/sync/{boardId}:
 *   post:
 *     summary: Sincronizar dados de um board específico por Monday ID
 *     tags: [Sincronização]
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do board no Monday.com
 *     responses:
 *       200:
 *         description: Sincronização do board realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Board sincronizado com sucesso"
 *                 items:
 *                   type: number
 *                   example: 25
 *       400:
 *         description: Board ID inválido
 *       500:
 *         description: Erro durante a sincronização
 */
router.post("/sync/:boardId", mondayController.syncBoardData.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/sync-board/{id}:
 *   post:
 *     summary: Sincronizar dados de um board específico por ID interno
 *     tags: [Sincronização]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID interno do board
 *     responses:
 *       200:
 *         description: Sincronização do board realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Board sincronizado com sucesso"
 *                 items:
 *                   type: number
 *                   example: 25
 *       404:
 *         description: Board não encontrado
 *       500:
 *         description: Erro durante a sincronização
 */
router.post("/sync-board/:id", mondayController.syncBoardById.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/sync-board-by-id/{id}:
 *   post:
 *     summary: Sincronizar board específico e salvar itens na tabela monday_items
 *     tags: [Sincronização]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do board cadastrado no banco de dados
 *     responses:
 *       200:
 *         description: Sincronização do board realizada com sucesso
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
 *                   example: "Board 'Canal' sincronizado com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     itemsCount:
 *                       type: number
 *                       example: 15
 *                     boardName:
 *                       type: string
 *                       example: "Canal"
 *       404:
 *         description: Board não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Board não encontrado ou inativo no banco de dados"
 *       500:
 *         description: Erro durante a sincronização
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erro ao sincronizar board"
 *                 error:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.post("/sync-board-by-id/:id", mondayController.syncBoardByDatabaseId.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/initialize:
 *   post:
 *     summary: Inicializar boards padrão do sistema
 *     tags: [Configuração]
 *     responses:
 *       200:
 *         description: Boards padrão inicializados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Boards padrão inicializados com sucesso"
 *                 boards:
 *                   type: number
 *                   example: 6
 *       500:
 *         description: Erro durante a inicialização
 */
router.post("/initialize", mondayController.initializeBoards.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/channel-schedules:
 *   get:
 *     summary: Buscar agendamentos de canal por nome e data
 *     tags: [Channel Schedules]
 *     parameters:
 *       - in: query
 *         name: channelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do canal para buscar nos monday_items
 *         example: "Email"
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Data para buscar os agendamentos (DD/MM/YYYY ou YYYY-MM-DD)
 *         example: "11/08/2025"
 *     responses:
 *       200:
 *         description: Disponibilidade por horas calculada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hora:
 *                         type: string
 *                         example: "14:00"
 *                       available:
 *                         type: string
 *                         example: "900.00"
 *                       totalUsado:
 *                         type: string
 *                         example: "100.00"
 *                       maxValue:
 *                         type: string
 *                         example: "1000.00"
 *                 message:
 *                   type: string
 *                   example: "Disponibilidade calculada para o canal 'Email' na data 11/08/2025"
 *       400:
 *         description: Parâmetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_params:
 *                       summary: Parâmetros não fornecidos
 *                       value: "channelName e date são obrigatórios"
 *                     invalid_date:
 *                       summary: Formato de data inválido
 *                       value: "Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD"
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
 *                 message:
 *                   type: string
 *                   example: "Erro ao buscar agendamentos de canal"
 *                 error:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.get("/channel-schedules", (req, res) => {
    const { channelName, date } = req.query;
    if (!channelName || !date) {
        res.status(400).json({
            success: false,
            message: "channelName e date são obrigatórios"
        });
        return;
    }
    (req.params as any).channelName = channelName as string;
    (req.params as any).date = date as string;
    mondayController.getChannelSchedulesByNameAndDate.bind(mondayController)(req, res);
});

/**
 * @swagger
 * /api/v1/monday/debug/board/items-count:
 *   get:
 *     summary: Debug - Verificar contagem de itens de um board
 *     tags: [Debug]
 *     parameters:
 *       - in: query
 *         name: board_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do board no Monday.com
 *     responses:
 *       200:
 *         description: Informações de debug sobre os itens do board
 *       400:
 *         description: Board ID não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "board_id é obrigatório"
 *       404:
 *         description: Board não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/debug/board/items-count", (req, res) => {
    const { board_id } = req.query;
    if (!board_id) {
        res.status(400).json({
            success: false,
            message: "board_id é obrigatório"
        });
        return;
    }
    (req.params as any).board_id = board_id as string;
    mondayController.debugBoardItemsCount.bind(mondayController)(req, res);
});

/**
 * @swagger
 * /api/v1/monday/campaigns:
 *   get:
 *     summary: Listar campanhas do board principal com paginação e filtros de data
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: Cursor para paginação (retornado na resposta anterior)
 *         example: "eyJpZCI6MTIzNDU2fQ=="
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *         description: Data inicial para filtro (formato YYYY-MM-DD ou DD/MM/YYYY)
 *         example: "2025-01-01"
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *         description: Data final para filtro (formato YYYY-MM-DD ou DD/MM/YYYY)
 *         example: "2025-12-31"
 *     responses:
 *       200:
 *         description: Lista de campanhas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID do item no Monday.com
 *                         example: "123456789"
 *                       name:
 *                         type: string
 *                         description: Nome da campanha
 *                         example: "Campanha Black Friday 2025"
 *                 cursor:
 *                   type: string
 *                   nullable: true
 *                   description: Cursor para próxima página (null se não houver mais páginas)
 *                   example: "eyJpZCI6MTIzNDU2fQ=="
 *                 hasMore:
 *                   type: boolean
 *                   description: Indica se há mais páginas disponíveis
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Quantidade de itens retornados nesta página
 *                   example: 500
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
 *                 message:
 *                   type: string
 *                   example: "Erro ao buscar campanhas"
 *                 error:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.get("/campaigns", mondayController.getCampaignsPaginated.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/campaigns/{id}:
 *   get:
 *     summary: Buscar detalhes completos de uma campanha específica
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item da campanha no Monday.com
 *         example: "123456789"
 *     responses:
 *       200:
 *         description: Detalhes da campanha retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     campaign:
 *                       type: object
 *                       description: Dados da campanha principal
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "123456789"
 *                         name:
 *                           type: string
 *                           example: "Campanha Black Friday 2025"
 *                         status:
 *                           type: object
 *                           description: Coluna de status
 *                         label__1:
 *                           type: object
 *                           description: Tipo de solicitação
 *                         subitems:
 *                           type: array
 *                           description: Subitems da campanha (se existirem)
 *                     touchpoints:
 *                       type: array
 *                       description: Touchpoints relacionados do board secundário
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "789456123"
 *                           name:
 *                             type: string
 *                             example: "Touchpoint Email"
 *                           columns:
 *                             type: object
 *                             description: Todas as colunas do touchpoint
 *                     briefings:
 *                       type: array
 *                       description: Briefings de materiais criativos relacionados
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "456789123"
 *                           name:
 *                             type: string
 *                             example: "Briefing Materiais Criativos"
 *                           columns:
 *                             type: object
 *                             description: Todas as colunas do briefing
 *       400:
 *         description: ID inválido ou não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "ID da campanha é obrigatório"
 *       404:
 *         description: Campanha não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Campanha não encontrada"
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
 *                 message:
 *                   type: string
 *                   example: "Erro ao buscar detalhes da campanha"
 *                 error:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.get("/campaigns/:id", mondayController.getCampaignDetails.bind(mondayController));

/**
 * @swagger
 * /api/v1/monday/campaigns/{id}:
 *   patch:
 *     summary: Atualizar uma campanha existente (modo edição)
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item da campanha no Monday.com
 *         example: "123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Dados do formulário para atualizar a campanha
 *     responses:
 *       200:
 *         description: Campanha atualizada com sucesso
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
 *                   example: "Campanha atualizada com sucesso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedFields:
 *                       type: number
 *                       description: Número de campos atualizados
 *                       example: 5
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Campanha não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.patch("/campaigns/:id", mondayController.updateCampaign.bind(mondayController));

export default router;
