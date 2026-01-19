import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API de autenticação (login/logout)
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Fazer login e obter token JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login realizado com sucesso"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Campos obrigatórios não fornecidos
 *       401:
 *         description: Credenciais inválidas ou usuário inativo
 */

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Obter informações do usuário autenticado
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações do usuário
 *       401:
 *         description: Token inválido ou expirado
 */

export function createAuthRoutes(dataSource: DataSource): Router {
    const router = Router();
    const controller = new AuthController(dataSource);

    // POST /api/v1/auth/login - Login
    router.post('/login', async (req, res, next) => {
        try {
            await controller.login(req, res);
        } catch (error) {
            next(error);
        }
    });

    // GET /api/v1/auth/me - Obter usuário autenticado (requer token)
    router.get('/me', authMiddleware, async (req, res) => {
        await controller.me(req, res);
    });

    return router;
}
