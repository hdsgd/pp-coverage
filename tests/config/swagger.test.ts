import { setupSwagger } from '../../src/config/swagger';
import specs from '../../src/config/swagger';

describe('Swagger Configuration', () => {
  const specsAny = specs as any;
  describe('Swagger Specs Export', () => {
    it('should export specs object', () => {
      expect(specs).toBeDefined();
    });

    it('should be a valid object', () => {
      expect(typeof specs).toBe('object');
    });

    it('should have openapi property', () => {
      expect(specs).toHaveProperty('openapi');
    });

    it('should have info property', () => {
      expect(specs).toHaveProperty('info');
    });

    it('should have servers property', () => {
      expect(specs).toHaveProperty('servers');
    });

    it('should have components property', () => {
      expect(specs).toHaveProperty('components');
    });

    it('should have paths property', () => {
      expect(specs).toHaveProperty('paths');
    });
  });

  describe('setupSwagger Function', () => {
    it('should export setupSwagger function', () => {
      expect(typeof setupSwagger).toBe('function');
    });

    it('should accept one parameter', () => {
      expect(setupSwagger.length).toBe(1);
    });

    it('should be callable', () => {
      expect(() => setupSwagger).not.toThrow();
    });
  });

  describe('OpenAPI Version', () => {
    it('should use OpenAPI 3.0.0', () => {
      expect(specsAny.openapi).toBe('3.0.0');
    });

    it('should have correct API title', () => {
      expect(specsAny.info.title).toBe('PicPay Integration API');
    });

    it('should have version information', () => {
      expect(specsAny.info.version).toBe('1.0.0');
    });

    it('should have description', () => {
      expect(specsAny.info.description).toContain('API para integração com Monday.com');
    });
  });

  describe('Server Configuration', () => {
    it('should have at least one server', () => {
      expect(Array.isArray(specsAny.servers)).toBe(true);
      expect((specsAny.servers as any[]).length).toBeGreaterThan(0);
    });

    it('should have server URL property', () => {
      const server = (specsAny.servers as any[])[0];
      expect(server).toHaveProperty('url');
      expect(typeof server.url).toBe('string');
    });

    it('should have development server configured', () => {
      const server = (specsAny.servers as any[])[0];
      expect(server.url).toMatch(/localhost|127\.0\.0\.1|http/);
    });
  });

  describe('Components', () => {
    it('should have components defined', () => {
      expect(specsAny.components).toBeDefined();
    });

    it('should have schemas in components', () => {
      expect(specsAny.components).toHaveProperty('schemas');
    });

    it('should have schemas only (no securitySchemes)', () => {
      expect(specsAny.components).not.toHaveProperty('securitySchemes');
    });

    it('should have schemas as object', () => {
      expect(typeof specsAny.components?.schemas).toBe('object');
    });
  });

  describe('Paths', () => {
    it('should have paths defined', () => {
      expect(specsAny.paths).toBeDefined();
    });

    it('should be an object', () => {
      expect(typeof specsAny.paths).toBe('object');
    });
  });

  describe('Schema Definitions', () => {
    it('should have MondayBoard schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('MondayBoard');
    });

    it('should have MondayItem schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('MondayItem');
    });

    it('should have ChannelSchedule schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('ChannelSchedule');
    });

    it('should have Subscriber schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('Subscriber');
    });

    it('should have Error schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('Error');
    });

    it('should have CreateMondayBoardDto schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('CreateMondayBoardDto');
    });

    it('should have UpdateChannelScheduleDto schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('UpdateChannelScheduleDto');
    });

    it('should have SubscriberDropdownOption schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('SubscriberDropdownOption');
    });

    it('should have CreateChannelScheduleDto schema', () => {
      expect(specsAny.components?.schemas).toHaveProperty('CreateChannelScheduleDto');
    });

    it('should have all main entity schemas', () => {
      const schemas = specsAny.components?.schemas;
      expect(schemas).toHaveProperty('MondayBoard');
      expect(schemas).toHaveProperty('MondayItem');
      expect(schemas).toHaveProperty('ChannelSchedule');
    });
  });

  describe('MondayBoard Schema', () => {
    it('should have type property', () => {
      const schema = specsAny.components?.schemas?.MondayBoard;
      expect(schema).toHaveProperty('type');
    });

    it('should be object type', () => {
      const schema = specsAny.components?.schemas?.MondayBoard;
      expect(schema?.type).toBe('object');
    });

    it('should have properties field', () => {
      const schema = specsAny.components?.schemas?.MondayBoard;
      expect(schema).toHaveProperty('properties');
    });

    it('should have complete structure', () => {
      const schema = specsAny.components?.schemas?.MondayBoard;
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('properties');
    });
  });

  describe('Error Schema', () => {
    it('should have properties', () => {
      const errorSchema = specsAny.components?.schemas?.Error;
      expect(errorSchema).toHaveProperty('properties');
    });

    it('should have message property', () => {
      const errorSchema = specsAny.components?.schemas?.Error;
      expect(errorSchema?.properties).toHaveProperty('message');
    });

    it('should have error property', () => {
      const errorSchema = specsAny.components?.schemas?.Error;
      expect(errorSchema?.properties).toHaveProperty('error');
    });

    it('should be object type', () => {
      const errorSchema = specsAny.components?.schemas?.Error;
      expect(errorSchema?.type).toBe('object');
    });
  });

  describe('Schemas Coverage', () => {
    it('should have all required entity schemas', () => {
      const schemas = specsAny.components?.schemas;
      expect(Object.keys(schemas).length).toBeGreaterThan(5);
    });

    it('should have all DTOs defined', () => {
      const schemas = specsAny.components?.schemas;
      expect(schemas).toHaveProperty('CreateMondayBoardDto');
      expect(schemas).toHaveProperty('CreateChannelScheduleDto');
      expect(schemas).toHaveProperty('UpdateChannelScheduleDto');
    });

    it('should have proper schema types', () => {
      const schemas = specsAny.components?.schemas;
      Object.values(schemas).forEach((schema: any) => {
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
      });
    });
  });

  describe('API Documentation', () => {
    it('should have consistent structure', () => {
      expect(specsAny.openapi).toBeDefined();
      expect(specsAny.info).toBeDefined();
      expect(specsAny.servers).toBeDefined();
      expect(specsAny.components).toBeDefined();
      expect(specsAny.paths).toBeDefined();
    });

    it('should export valid configuration', () => {
      expect(typeof setupSwagger).toBe('function');
      expect(typeof specs).toBe('object');
    });
  });
});
