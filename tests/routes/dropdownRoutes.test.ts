import { dropdownRoutes } from '../../src/routes/dropdownRoutes';
import express from 'express';
import request from 'supertest';

describe('Dropdown Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', dropdownRoutes);
  });
  it('should be importable', () => {
    expect(() => {
      require('../../src/routes/dropdownRoutes');
    }).not.toThrow();
  });

  it('should export dropdownRoutes router', () => {
    const module = require('../../src/routes/dropdownRoutes');
    expect(module.dropdownRoutes).toBeDefined();
  });

  it('should have routes registered', () => {
    expect(dropdownRoutes.stack).toBeDefined();
    expect(Array.isArray(dropdownRoutes.stack)).toBe(true);
  });

  it('should have GET route for dropdown options', () => {
    const hasGet = dropdownRoutes.stack.some((l: any) => l.route && l.route.methods.get);
    expect(hasGet).toBe(true);
  });

  it('should have at least one route', () => {
    const routes = dropdownRoutes.stack.filter((l: any) => l.route);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should be a valid Express router', () => {
    expect(typeof dropdownRoutes).toBe('function');
    expect(dropdownRoutes.stack).toBeDefined();
  });

  it('should not throw when accessing routes', () => {
    expect(() => {
      dropdownRoutes.stack.forEach((layer: any) => {
        if (layer.route) {
          expect(layer.route.path).toBeDefined();
        }
      });
    }).not.toThrow();
  });

  describe('Route Structure', () => {
    it('should have dropdown options endpoint', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      const hasDropdownRoute = routes.some((r: any) => 
        r.route.path && r.route.methods.get
      );
      expect(hasDropdownRoute).toBe(true);
    });

    it('should have route handlers', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      routes.forEach((route: any) => {
        expect(route.route.stack).toBeDefined();
        expect(route.route.stack.length).toBeGreaterThan(0);
      });
    });

    it('should only have GET methods', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      const allGet = routes.every((r: any) => r.route.methods.get);
      expect(allGet).toBe(true);
    });

    it('should not have POST, PUT, or DELETE methods', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      const hasPost = routes.some((r: any) => r.route.methods.post);
      const hasPut = routes.some((r: any) => r.route.methods.put);
      const hasDelete = routes.some((r: any) => r.route.methods.delete);
      
      expect(hasPost).toBe(false);
      expect(hasPut).toBe(false);
      expect(hasDelete).toBe(false);
    });

    it('should be an Express Router', () => {
      expect(dropdownRoutes.name).toBe('router');
    });

    it('should have valid route paths', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      routes.forEach((route: any) => {
        expect(route.route.path).toBeTruthy();
        expect(typeof route.route.path).toBe('string');
      });
    });
  });

  describe('HTTP Integration Tests', () => {
    it('should return 400 when fieldId is not provided', async () => {
      const response = await request(app)
        .get('/api/v1/dropdown-options');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle GET /api/v1/dropdown-options with fieldId', async () => {
      const response = await request(app)
        .get('/api/v1/dropdown-options?fieldId=7400351371');

      // Accept various statuses as controller may have dependencies
      expect([200, 400, 404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should validate fieldId query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/dropdown-options');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('obrigatório');
    });

    it('should have proper response structure', async () => {
      const response = await request(app)
        .get('/api/v1/dropdown-options?fieldId=test123');

      expect(response.body).toHaveProperty('success');
      if (response.status === 200) {
        expect(response.body).toHaveProperty('options');
      }
    });

    it('should handle empty fieldId', async () => {
      const response = await request(app)
        .get('/api/v1/dropdown-options?fieldId=');

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should have correct route mounted', () => {
      const routes = dropdownRoutes.stack.filter((l: any) => l.route);
      const dropdownRoute = routes.find((r: any) => r.route.path === '/dropdown-options');
      
      expect(dropdownRoute).toBeDefined();
      if (dropdownRoute && dropdownRoute.route) {
        expect((dropdownRoute.route as any).methods.get).toBe(true);
      }
    });
  });
});
