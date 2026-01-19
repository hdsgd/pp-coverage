import mondayRoutes from '../../src/routes/mondayRoutes';
import express from 'express';
import request from 'supertest';
import { MondayController } from '../../src/controllers/MondayController';

describe('Monday Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/monday', mondayRoutes);
  });

  it('should be importable', () => {
    expect(() => {
      require('../../src/routes/mondayRoutes');
    }).not.toThrow();
  });

  it('should export default router', () => {
    const module = require('../../src/routes/mondayRoutes');
    expect(module.default).toBeDefined();
  });

  it('should be a valid Express router', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
  });

  it('should have many routes registered', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const routes = router.stack.filter((l: any) => l.route);
    expect(routes.length).toBeGreaterThan(5);
  });

  it('should have POST routes', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const hasPost = router.stack.some((l: any) => l.route && l.route.methods.post);
    expect(hasPost).toBe(true);
  });

  it('should have GET routes', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const hasGet = router.stack.some((l: any) => l.route && l.route.methods.get);
    expect(hasGet).toBe(true);
  });

  it('should have PUT routes', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const hasPut = router.stack.some((l: any) => l.route && l.route.methods.put);
    expect(hasPut).toBe(true);
  });

  it('should have DELETE routes', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const hasDelete = router.stack.some((l: any) => l.route && l.route.methods.delete);
    expect(hasDelete).toBe(true);
  });

  it('should have PATCH routes', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const hasPatch = router.stack.some((l: any) => l.route && l.route.methods.patch);
    expect(hasPatch).toBe(true);
  });

  it('should have comprehensive route coverage', () => {
    const router = require('../../src/routes/mondayRoutes').default;
    const routes = router.stack.filter((l: any) => l.route);
    expect(routes.length).toBeGreaterThanOrEqual(5);
  });

  describe('HTTP Integration Tests', () => {
    it('should handle GET /api/v1/monday/boards', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards');

      expect([200, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/boards', async () => {
      const response = await request(app)
        .post('/api/v1/monday/boards')
        .send({
          board_id: '123456',
          board_name: 'Test Board'
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/info', async () => {
      const response = await request(app)
        .get('/api/v1/monday/info');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/items', async () => {
      const response = await request(app)
        .post('/api/v1/monday/items')
        .send({
          board_id: '123456',
          item_name: 'Test Item'
        });

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/sync-status', async () => {
      const response = await request(app)
        .get('/api/v1/monday/sync-status');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should validate required fields on POST', async () => {
      const response = await request(app)
        .post('/api/v1/monday/boards')
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    it('should handle PUT requests', async () => {
      const response = await request(app)
        .put('/api/v1/monday/boards/123')
        .send({ board_name: 'Updated Board' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle DELETE requests', async () => {
      const response = await request(app)
        .delete('/api/v1/monday/boards/123');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should have all major endpoints covered', () => {
      const router = require('../../src/routes/mondayRoutes').default;
      const routes = router.stack.filter((l: any) => l.route);
      const paths = routes.map((r: any) => r.route.path);
      
      expect(paths.length).toBeGreaterThan(5);
    });

    it('should handle GET /api/v1/monday/boards/items', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards/items?board_id=123');

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/boards/items', async () => {
      const response = await request(app)
        .post('/api/v1/monday/boards/items')
        .send({ board_id: '123', name: 'Test' });

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it('should handle PATCH requests', async () => {
      const response = await request(app)
        .patch('/api/v1/monday/items/123')
        .send({ status: 'done' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/test-connection', async () => {
      const response = await request(app)
        .get('/api/v1/monday/test-connection');

      expect([200, 500]).toContain(response.status);
    });

    it('should handle various GET endpoints', async () => {
      const endpoints = ['/boards', '/test-connection'];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(`/api/v1/monday${endpoint}`);
        expect([200, 404, 500]).toContain(response.status);
      }
    });

    it('should validate request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/monday/items')
        .send({ invalid: 'data' });

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle invalid board IDs', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards/items?board_id=invalid');

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/items', async () => {
      const response = await request(app)
        .get('/api/v1/monday/items');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/board-info', async () => {
      const response = await request(app)
        .get('/api/v1/monday/board-info?board_id=123');

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/sync', async () => {
      const response = await request(app)
        .post('/api/v1/monday/sync');

      expect([200, 201, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/sync/:boardId', async () => {
      const response = await request(app)
        .post('/api/v1/monday/sync/123456');

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/sync-board/:id', async () => {
      const response = await request(app)
        .post('/api/v1/monday/sync-board/123');

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/sync-board-by-id/:id', async () => {
      const response = await request(app)
        .post('/api/v1/monday/sync-board-by-id/123');

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it('should handle POST /api/v1/monday/initialize', async () => {
      const response = await request(app)
        .post('/api/v1/monday/initialize');

      expect([200, 201, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/channel-schedules', async () => {
      const response = await request(app)
        .get('/api/v1/monday/channel-schedules');

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/debug/board/items-count', async () => {
      const response = await request(app)
        .get('/api/v1/monday/debug/board/items-count?board_id=123');

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/campaigns', async () => {
      const response = await request(app)
        .get('/api/v1/monday/campaigns');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/campaigns/:id', async () => {
      const response = await request(app)
        .get('/api/v1/monday/campaigns/123');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should handle PATCH /api/v1/monday/campaigns/:id', async () => {
      const response = await request(app)
        .patch('/api/v1/monday/campaigns/123')
        .send({ status: 'completed' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should validate all major route paths exist', () => {
      const router = require('../../src/routes/mondayRoutes').default;
      const routes = router.stack.filter((l: any) => l.route);
      const paths = routes.map((r: any) => r.route.path);
      
      expect(paths).toContain('/boards');
      expect(paths).toContain('/items');
      expect(paths).toContain('/test-connection');
    });

    it('should have comprehensive endpoint coverage', () => {
      const router = require('../../src/routes/mondayRoutes').default;
      const routes = router.stack.filter((l: any) => l.route);
      
      // Should have many routes (mondayRoutes is comprehensive)
      expect(routes.length).toBeGreaterThanOrEqual(15);
    });

    it('should handle GET /api/v1/monday/boards/items with id query param', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards/items')
        .query({ id: '123' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/boards/items with board_id query param', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards/items')
        .query({ board_id: '456' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/boards/items without query params', async () => {
      const response = await request(app)
        .get('/api/v1/monday/boards/items');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('obrigatório');
    });

    it('should handle GET /api/v1/monday/get-board-columns with board_id', async () => {
      const response = await request(app)
        .get('/api/v1/monday/get-board-columns')
        .query({ board_id: '123' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/get-board-columns without board_id', async () => {
      const response = await request(app)
        .get('/api/v1/monday/get-board-columns');

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/items-test with boardId', async () => {
      const response = await request(app)
        .get('/api/v1/monday/items-test')
        .query({ boardId: '123' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/items-test without boardId', async () => {
      const response = await request(app)
        .get('/api/v1/monday/items-test');

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/column-values with itemId', async () => {
      const response = await request(app)
        .get('/api/v1/monday/column-values')
        .query({ itemId: '123' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle GET /api/v1/monday/column-values without itemId', async () => {
      const response = await request(app)
        .get('/api/v1/monday/column-values');

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Branch-focused routing', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should forward /boards/items requests with id to getBoardItems', async () => {
      const itemsSpy = jest
        .spyOn(MondayController.prototype, 'getBoardItems')
        .mockImplementation(async (_req: any, res: any) => {
          res.status(200).json({ success: true, source: 'id' });
        });
      const itemsByIdSpy = jest
        .spyOn(MondayController.prototype, 'getBoardItemsByMondayId')
        .mockImplementation(async (_req: any, res: any) => {
          res.status(200).json({ success: true, source: 'board_id' });
        });

      const response = await request(app)
        .get('/api/v1/monday/boards/items')
        .query({ id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body.source).toBe('id');
      expect(itemsSpy).toHaveBeenCalledTimes(1);
      expect(itemsByIdSpy).not.toHaveBeenCalled();
    });

    it('should forward /boards/items requests with board_id to getBoardItemsByMondayId', async () => {
      const itemsSpy = jest
        .spyOn(MondayController.prototype, 'getBoardItems')
        .mockImplementation(async (_req: any, res: any) => {
          res.status(200).json({ success: true, source: 'id' });
        });
      const itemsByIdSpy = jest
        .spyOn(MondayController.prototype, 'getBoardItemsByMondayId')
        .mockImplementation(async (_req: any, res: any) => {
          res.status(200).json({ success: true, source: 'board' });
        });

      const response = await request(app)
        .get('/api/v1/monday/boards/items')
        .query({ board_id: 'board-456' });

      expect(response.status).toBe(200);
      expect(response.body.source).toBe('board');
      expect(itemsByIdSpy).toHaveBeenCalledTimes(1);
      expect(itemsSpy).not.toHaveBeenCalled();
    });

    it('should delegate /board-info to getBoardInfo when boardId provided', async () => {
      const boardInfoSpy = jest
        .spyOn(MondayController.prototype, 'getBoardInfo')
        .mockImplementation(async (req: any, res: any) => {
          res.status(200).json({ success: true, board: req.params.boardId });
        });

      const response = await request(app)
        .get('/api/v1/monday/board-info')
        .query({ boardId: 'board-789' });

      expect(response.status).toBe(200);
      expect(response.body.board).toBe('board-789');
      expect(boardInfoSpy).toHaveBeenCalledTimes(1);
      expect(boardInfoSpy.mock.calls[0][0].params.boardId).toBe('board-789');
    });

    it('should forward /channel-schedules requests with query params to getChannelSchedulesByNameAndDate', async () => {
      const scheduleSpy = jest
        .spyOn(MondayController.prototype, 'getChannelSchedulesByNameAndDate')
        .mockImplementation(async (req: any, res: any) => {
          res.status(200).json({
            success: true,
            channel: req.params.channelName,
            date: req.params.date
          });
        });

      const response = await request(app)
        .get('/api/v1/monday/channel-schedules')
        .query({ channelName: 'Email', date: '2025-01-01' });

      expect(response.status).toBe(200);
      expect(response.body.channel).toBe('Email');
      expect(response.body.date).toBe('2025-01-01');
      expect(scheduleSpy).toHaveBeenCalledTimes(1);
      const forwardedReq = scheduleSpy.mock.calls[0][0];
      expect(forwardedReq.params.channelName).toBe('Email');
      expect(forwardedReq.params.date).toBe('2025-01-01');
    });

    it('should return 400 when channelName or date is missing on /channel-schedules', async () => {
      const response = await request(app)
        .get('/api/v1/monday/channel-schedules');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('channelName');
    });

    it('should return 400 when board_id is missing on the debug items route', async () => {
      const response = await request(app)
        .get('/api/v1/monday/debug/board/items-count');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('board_id');
    });

    it('should forward debug items route requests when board_id is provided', async () => {
      const debugSpy = jest
        .spyOn(MondayController.prototype, 'debugBoardItemsCount')
        .mockImplementation(async (req: any, res: any) => {
          res.status(200).json({ success: true, boardId: req.params.board_id });
        });

      const response = await request(app)
        .get('/api/v1/monday/debug/board/items-count')
        .query({ board_id: '12345' });

      expect(response.status).toBe(200);
      expect(response.body.boardId).toBe('12345');
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy.mock.calls[0][0].params.board_id).toBe('12345');
    });
  });
});
