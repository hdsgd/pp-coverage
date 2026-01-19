import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { User } from '../entities/User';

export class AuthController {
    private readonly userRepository;

    constructor(dataSource: DataSource) {
        this.userRepository = dataSource.getRepository(User);
    }

    /**
     * Login de usuário
     * POST /api/v1/auth/login
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body;
            console.log('🔐 Tentativa de login:', { username });

            // Validação básica
            if (!username || !password) {
                console.log('❌ Login falhou: campos obrigatórios faltando');
                res.status(400).json({
                    error: 'Username e password são obrigatórios'
                });
                return;
            }

            // Buscar usuário
            const user = await this.userRepository.findOne({
                where: { username }
            });

            if (!user) {
                console.log('❌ Login falhou: usuário não encontrado');
                res.status(401).json({
                    error: 'Credenciais inválidas'
                });
                return;
            }

            // Verificar se usuário está ativo
            if (!user.is_active) {
                console.log('❌ Login falhou: usuário inativo');
                res.status(401).json({
                    error: 'Usuário inativo'
                });
                return;
            }

            // Verificar senha
            const isPasswordValid = await user.comparePassword(password);

            if (!isPasswordValid) {
                console.log('❌ Login falhou: senha incorreta');
                res.status(401).json({
                    error: 'Credenciais inválidas'
                });
                return;
            }

            // Gerar token JWT
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
            const expiresIn: StringValue | number = (process.env.JWT_EXPIRES_IN || '8h') as StringValue;

            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    role: user.role
                },
                jwtSecret,
                { expiresIn }
            );

            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Verificar token (opcional - para debug)
     * GET /api/v1/auth/me
     */
    async me(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }

            const user = await this.userRepository.findOne({
                where: { id: req.user.userId }
            });

            if (!user) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    is_active: user.is_active
                }
            });
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
}
