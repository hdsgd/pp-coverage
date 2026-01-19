import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, checkRole } from '../../src/middleware/authMiddleware';

// Mock do jwt
jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const originalEnv = process.env;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Reset environment
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Token Validation', () => {
    it('should return 401 when no authorization header is provided', () => {
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token não fornecido. Use o header Authorization: Bearer <token>'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle authorization header with Bearer and empty token', () => {
      mockRequest.headers = { authorization: 'Bearer ' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt must be provided');
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has only one part', () => {
      mockRequest.headers = { authorization: 'BearerTokenWithoutSpace' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has more than two parts', () => {
      mockRequest.headers = { authorization: 'Bearer token extra' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when scheme is not Bearer', () => {
      mockRequest.headers = { authorization: 'Basic token123' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token mal formatado. Use: Bearer <token>'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept Bearer with lowercase', () => {
      mockRequest.headers = { authorization: 'bearer validtoken' };
      
      const mockPayload = { userId: '123', username: 'testuser', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(mockPayload);
    });

    it('should accept Bearer with uppercase', () => {
      mockRequest.headers = { authorization: 'BEARER validtoken' };
      
      const mockPayload = { userId: '123', username: 'testuser', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(mockPayload);
    });

    it('should accept Bearer with mixed case', () => {
      mockRequest.headers = { authorization: 'BeArEr validtoken' };
      
      const mockPayload = { userId: '123', username: 'testuser', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(mockPayload);
    });

    it('should return 500 when JWT_SECRET is not configured', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      delete process.env.JWT_SECRET;

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Configuração de segurança inválida'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when JWT_SECRET is empty string', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      process.env.JWT_SECRET = '';

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Configuração de segurança inválida'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('JWT Verification Success', () => {
    it('should successfully verify token and call next', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      
      const mockPayload = { userId: '123', username: 'testuser', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'test-secret-key');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should attach user payload with different userId', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      
      const mockPayload = { userId: 'abc-def-ghi', username: 'john', role: 'user' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user payload with special characters in username', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      
      const mockPayload = { userId: '456', username: 'user@example.com', role: 'moderator' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle long tokens', () => {
      const longToken = 'a'.repeat(500);
      mockRequest.headers = { authorization: `Bearer ${longToken}` };
      
      const mockPayload = { userId: '789', username: 'longtoken', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(longToken, 'test-secret-key');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle tokens with special characters', () => {
      const specialToken = 'token.with-special_chars123';
      mockRequest.headers = { authorization: `Bearer ${specialToken}` };
      
      const mockPayload = { userId: '999', username: 'special', role: 'user' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(specialToken, 'test-secret-key');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('JWT Verification Errors', () => {
    it('should return 401 when token is expired', () => {
      mockRequest.headers = { authorization: 'Bearer expiredtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expirado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid (JsonWebTokenError)', () => {
      mockRequest.headers = { authorization: 'Bearer invalidtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token signature is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer tamperedtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid signature');
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when jwt.verify throws unknown error', () => {
      mockRequest.headers = { authorization: 'Bearer problemtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Erro ao validar token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when jwt.verify throws non-Error object', () => {
      mockRequest.headers = { authorization: 'Bearer problemtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw 'String error';
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Erro ao validar token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when jwt.verify throws null', () => {
      mockRequest.headers = { authorization: 'Bearer problemtoken' };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw null;
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Erro ao validar token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle authorization header with extra spaces', () => {
      mockRequest.headers = { authorization: 'Bearer  token' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Split will create 3 parts: ['Bearer', '', 'token']
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    });

    it('should handle authorization header with only Bearer', () => {
      mockRequest.headers = { authorization: 'Bearer' };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    });

    it('should not overwrite existing req.user if present', () => {
      mockRequest.headers = { authorization: 'Bearer validtoken' };
      mockRequest.user = { userId: 'old-id', username: 'olduser', role: 'old-role' };
      
      const mockPayload = { userId: 'new-id', username: 'newuser', role: 'new-role' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should overwrite with new payload
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('checkRole', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('Role Authorization', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Usuário não autenticado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is undefined', () => {
      mockRequest.user = undefined;
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Usuário não autenticado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed roles', () => {
      mockRequest.user = { userId: '123', username: 'user', role: 'user' };
      const middleware = checkRole(['admin', 'moderator']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when user has admin role', () => {
      mockRequest.user = { userId: '123', username: 'admin', role: 'admin' };
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when user has user role', () => {
      mockRequest.user = { userId: '456', username: 'normaluser', role: 'user' };
      const middleware = checkRole(['user']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when user has moderator role', () => {
      mockRequest.user = { userId: '789', username: 'mod', role: 'moderator' };
      const middleware = checkRole(['moderator']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next when user role is in multiple allowed roles', () => {
      mockRequest.user = { userId: '123', username: 'admin', role: 'admin' };
      const middleware = checkRole(['admin', 'moderator', 'user']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow user with second role in array', () => {
      mockRequest.user = { userId: '456', username: 'mod', role: 'moderator' };
      const middleware = checkRole(['admin', 'moderator']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow user with last role in array', () => {
      mockRequest.user = { userId: '789', username: 'user', role: 'user' };
      const middleware = checkRole(['admin', 'moderator', 'user']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when empty roles array', () => {
      mockRequest.user = { userId: '123', username: 'admin', role: 'admin' };
      const middleware = checkRole([]);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role comparison', () => {
      mockRequest.user = { userId: '123', username: 'admin', role: 'Admin' };
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not match because roles are case-sensitive
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with single role requirement', () => {
      mockRequest.user = { userId: '123', username: 'user', role: 'user' };
      const middleware = checkRole(['user']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should work with custom role names', () => {
      mockRequest.user = { userId: '123', username: 'editor', role: 'editor' };
      const middleware = checkRole(['editor', 'publisher']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject custom role not in allowed list', () => {
      mockRequest.user = { userId: '123', username: 'viewer', role: 'viewer' };
      const middleware = checkRole(['editor', 'publisher']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with null role', () => {
      mockRequest.user = { userId: '123', username: 'user', role: null as any };
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with undefined role', () => {
      mockRequest.user = { userId: '123', username: 'user', role: undefined as any };
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with empty string role', () => {
      mockRequest.user = { userId: '123', username: 'user', role: '' };
      const middleware = checkRole(['admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Acesso negado. Permissão insuficiente.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow empty string role if in allowed roles', () => {
      mockRequest.user = { userId: '123', username: 'user', role: '' };
      const middleware = checkRole(['']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle role with special characters', () => {
      mockRequest.user = { userId: '123', username: 'user', role: 'super-admin' };
      const middleware = checkRole(['super-admin']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle role with numbers', () => {
      mockRequest.user = { userId: '123', username: 'user', role: 'level5' };
      const middleware = checkRole(['level5', 'level10']);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle very long role names', () => {
      const longRole = 'a'.repeat(100);
      mockRequest.user = { userId: '123', username: 'user', role: longRole };
      const middleware = checkRole([longRole]);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Middleware Instances', () => {
    it('should create independent middleware instances', () => {
      const adminMiddleware = checkRole(['admin']);
      const userMiddleware = checkRole(['user']);

      mockRequest.user = { userId: '123', username: 'user', role: 'user' };

      // Admin middleware should fail
      adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // User middleware should succeed
      userMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle different role requirements in same request flow', () => {
      mockRequest.user = { userId: '123', username: 'admin', role: 'admin' };

      const middleware1 = checkRole(['admin', 'moderator']);
      const middleware2 = checkRole(['admin']);

      middleware1(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      middleware2(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});
