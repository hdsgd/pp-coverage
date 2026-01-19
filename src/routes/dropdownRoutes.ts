import { Router } from "express";
import { DropdownController } from "../controllers/DropdownController";

/**
 * @swagger
 * tags:
 *   - name: Dropdown
 *     description: Endpoints para buscar opções de dropdowns do Monday.com
 */

const router = Router();
const dropdownController = new DropdownController();

/**
 * @swagger
 * /api/v1/dropdown-options:
 *   get:
 *     summary: Buscar opções de dropdown para um campo específico
 *     tags: [Dropdown]
 *     parameters:
 *       - in: query
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do campo no Monday.com
 *         example: "7400351371"
 *     responses:
 *       200:
 *         description: Opções do dropdown recuperadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 options:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID da opção
 *                         example: "option_1"
 *                       name:
 *                         type: string
 *                         description: Nome da opção
 *                         example: "Opção 1"
 *                       color:
 *                         type: string
 *                         description: Cor da opção (hex)
 *                         example: "#ff0000"
 *                 total:
 *                   type: integer
 *                   description: Total de opções
 *                   example: 5
 *                 fieldId:
 *                   type: string
 *                   description: ID do campo consultado
 *                   example: "7400351371"
 *       400:
 *         description: Field ID não fornecido
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
 *                   example: "fieldId é obrigatório"
 *       404:
 *         description: Campo não encontrado
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
 *                   example: "Campo não encontrado"
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
 *                   example: "Erro ao buscar opções do dropdown"
 *                 error:
 *                   type: string
 *                   example: "Detalhes do erro"
 */
router.get("/dropdown-options", (req, res) => {
    const { fieldId } = req.query;
    if (!fieldId) {
        res.status(400).json({
            success: false,
            message: "fieldId é obrigatório"
        });
        return;
    }
    (req.params as any).fieldId = fieldId as string;
    dropdownController.getDropdownOptions.bind(dropdownController)(req, res);
});

export { router as dropdownRoutes };
