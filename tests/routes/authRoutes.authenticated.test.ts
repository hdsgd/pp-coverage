import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

describe('Auth Routes authenticated flow', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should forward /me requests to AuthController when middleware authenticates the user', async () => {
    const mockMe = jest.fn((_req: any, res: any) => {
      res.status(200).json({ ok: true });
    });

    jest.resetModules();

    jest.doMock('../../src/middleware/authMiddleware', () => ({
      __esModule: true,
      authMiddleware: (req: any, _res: any, next: any) => {
        req.user = { userId: 'user-123' };
        next();
      }
    }));

    jest.doMock('../../src/controllers/AuthController', () => ({
      __esModule: true,
      AuthController: jest.fn().mockImplementation(() => ({
        login: jest.fn(),
        me: mockMe
      }))
    }));

    const { createAuthRoutes } = require('../../src/routes/authRoutes');
    const mockDataSource = { getRepository: jest.fn() } as unknown as DataSource;

    const app = express();
    app.use(express.json());
    app.use(createAuthRoutes(mockDataSource));

    const response = await request(app).get('/me');

    expect(response.status).toBe(200);
    expect(mockMe).toHaveBeenCalledTimes(1);
  });
});
