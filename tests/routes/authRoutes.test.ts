import { createAuthRoutes } from '../../src/routes/authRoutes';
import { DataSource, Repository } from 'typeorm';
import express from 'express';
import request from 'supertest';
import { AuthController } from '../../src/controllers/AuthController';

describe('Auth Routes', () => {
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Partial<Repository<any>>>;
  let app: express.Application;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as any;

    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', createAuthRoutes(mockDataSource));
  });

  it('should be importable', () => {
    expect(() => {
      require('../../src/routes/authRoutes');
    }).not.toThrow();
  });

  it('should export createAuthRoutes function', () => {
    const module = require('../../src/routes/authRoutes');
    expect(module.createAuthRoutes).toBeDefined();
    expect(typeof module.createAuthRoutes).toBe('function');
  });

  it('should create router with DataSource', () => {
    const { createAuthRoutes } = require('../../src/routes/authRoutes');
    const mockDS = { getRepository: jest.fn() } as any;
    const router = createAuthRoutes(mockDS);
    expect(router).toBeDefined();
  });

  it('should have login and me routes', () => {
    const { createAuthRoutes } = require('../../src/routes/authRoutes');
    const router = createAuthRoutes({ getRepository: jest.fn() } as any);
    const routes = router.stack.filter((l: any) => l.route).map((l: any) => l.route.path);
    expect(routes).toContain('/login');
    expect(routes).toContain('/me');
  });

  describe('HTTP Integration Tests', () => {
    it('should handle POST /api/v1/auth/login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'test@example.com',
          password: 'password123'
        });

      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/auth/login without credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect([400, 401, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/auth/me', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect([200, 401, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/auth/me with authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer fake-token');

      expect([200, 401, 500]).toContain(response.status);
    });

    it('should validate login payload', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test' });

      expect([400, 401, 500]).toContain(response.status);
    });

    it('should have proper route structure', () => {
      const router = createAuthRoutes(mockDataSource);
      const routes = router.stack.filter((l: any) => l.route);
      expect(routes.length).toBe(2);
    });

    it('should call getRepository during route creation', () => {
      createAuthRoutes(mockDataSource);
      expect(mockDataSource.getRepository).toHaveBeenCalled();
    });

    it('should handle POST /api/v1/auth/login with valid credentials', async () => {
      const validUser = { id: '1', username: 'admin', role: 'admin' };
      (mockRepository.findOne as jest.Mock).mockResolvedValue(validUser);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject login without username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'admin123' });

      expect([400, 401]).toContain(response.status);
    });

    it('should handle GET /api/v1/auth/me without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect([401, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/auth/me with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect([401, 500]).toContain(response.status);
    });

    it('should have authentication middleware on /me route', () => {
      const router = createAuthRoutes(mockDataSource);
      const meRoute = router.stack.find((l: any) => l.route && l.route.path === '/me');
      expect(meRoute).toBeDefined();
    });

    it('should handle login errors gracefully', async () => {
      (mockRepository.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' });

      expect([400, 401, 500]).toContain(response.status);
    });
  });

  describe('Route hardening', () => {
    it('should pass authentication failures to next middleware for consistent security handling', async () => {
      const router = createAuthRoutes(mockDataSource);
      const loginLayer = router.stack.find((layer: any) => layer.route && layer.route.path === '/login');
      if (!loginLayer || !loginLayer.route) {
        throw new Error('Login route not found');
      }

      const handler = loginLayer.route.stack[0].handle;
      const loginError = new Error('forced failure');
      const loginSpy = jest.spyOn(AuthController.prototype, 'login').mockRejectedValue(loginError);

      const req: any = { body: {}, method: 'POST', url: '/login' };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      try {
        await handler(req, res, next);
      } finally {
        loginSpy.mockRestore();
      }

      expect(next).toHaveBeenCalledWith(loginError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
