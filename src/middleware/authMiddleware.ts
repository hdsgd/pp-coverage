import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    userId: string;
    username: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ error: 'Token não fornecido. Use o header Authorization: Bearer <token>' });
            return;
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2) {
            res.status(401).json({ error: 'Formato de token inválido. Use: Bearer <token>' });
            return;
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            res.status(401).json({ error: 'Token mal formatado. Use: Bearer <token>' });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            res.status(500).json({ error: 'Configuração de segurança inválida' });
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

        req.user = decoded;

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expirado' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Token inválido' });
            return;
        }
        res.status(500).json({ error: 'Erro ao validar token' });
    }
};

export const checkRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
            return;
        }

        next();
    };
};
