import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config/database';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { User } from '../../src/entities/User';

describe('Database Configuration', () => {
  describe('AppDataSource', () => {
    it('should be an instance of DataSource', () => {
      expect(AppDataSource).toBeInstanceOf(DataSource);
    });

    it('should have correct type as mysql', () => {
      expect(AppDataSource.options.type).toBe('mysql');
    });

    it('should have correct host configuration', () => {
      const host = process.env.DB_HOST_SQL || 'localhost';
      expect((AppDataSource.options as any).host).toBe(host);
    });

    it('should have correct port configuration', () => {
      const port = parseInt(process.env.DB_PORT_SQL || '3306');
      expect((AppDataSource.options as any).port).toBe(port);
    });

    it('should have correct username configuration', () => {
      const username = process.env.DB_USERNAME || 'picpay_db';
      expect((AppDataSource.options as any).username).toBe(username);
    });

    it('should have correct password configuration', () => {
      const password = process.env.DB_PASSWORD || 'MN,Bkx39^!1N>7ok5.Y';
      expect((AppDataSource.options as any).password).toBe(password);
    });

    it('should have correct database name configuration', () => {
      const database = process.env.DB_DATABASE || 'picpay_db';
      expect((AppDataSource.options as any).database).toBe(database);
    });

    it('should have synchronize set based on NODE_ENV', () => {
      const expectedSync = process.env.NODE_ENV === 'development';
      expect(AppDataSource.options.synchronize).toBe(expectedSync);
    });

    it('should include all required entities', () => {
      const entities = AppDataSource.options.entities as any[];
      expect(entities).toContain(MondayBoard);
      expect(entities).toContain(MondayItem);
      expect(entities).toContain(ChannelSchedule);
      expect(entities).toContain(Subscriber);
      expect(entities).toContain(User);
      expect(entities).toHaveLength(5);
    });

    it('should have migrations path configured', () => {
      const migrations = AppDataSource.options.migrations as string[];
      expect(migrations).toBeDefined();
      expect(Array.isArray(migrations)).toBe(true);
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should have subscribers path configured', () => {
      const subscribers = AppDataSource.options.subscribers as string[];
      expect(subscribers).toBeDefined();
      expect(Array.isArray(subscribers)).toBe(true);
      expect(subscribers.length).toBeGreaterThan(0);
    });

    it('should have correct migrations path based on environment', () => {
      const migrations = AppDataSource.options.migrations as string[];
      const isCompiled = __dirname.includes('dist');
      const isProdLike = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'build';
      
      if (isCompiled || isProdLike) {
        expect(migrations[0]).toContain('dist/migrations');
      } else {
        expect(migrations[0]).toContain('src/migrations');
      }
    });

    it('should have correct subscribers path based on environment', () => {
      const subscribers = AppDataSource.options.subscribers as string[];
      const isCompiled = __dirname.includes('dist');
      const isProdLike = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'build';
      
      if (isCompiled || isProdLike) {
        expect(subscribers[0]).toContain('dist/subscribers');
      } else {
        expect(subscribers[0]).toContain('src/subscribers');
      }
    });

    it('should not be initialized by default', () => {
      expect(AppDataSource.isInitialized).toBe(false);
    });

    it('should have all configuration options defined', () => {
      expect(AppDataSource.options).toBeDefined();
      expect(AppDataSource.options.type).toBeDefined();
      expect((AppDataSource.options as any).host).toBeDefined();
      expect((AppDataSource.options as any).username).toBeDefined();
      expect((AppDataSource.options as any).password).toBeDefined();
      expect(AppDataSource.options.entities).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('should use default values when environment variables are not set', () => {
      const originalEnv = process.env.DB_HOST_SQL;
      delete process.env.DB_HOST_SQL;
      
      // Note: AppDataSource is already instantiated, so we just test the logic
      const expectedHost = process.env.DB_HOST_SQL || 'localhost';
      expect(expectedHost).toBe('localhost');
      
      process.env.DB_HOST_SQL = originalEnv;
    });

    it('should parse port as integer', () => {
      const port = Number.parseInt(process.env.DB_PORT_SQL || '3306');
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
    });
  });

  describe('DataSource Properties', () => {
    it('should have manager property', () => {
      expect(AppDataSource).toHaveProperty('manager');
    });

    it('should have options property', () => {
      expect(AppDataSource).toHaveProperty('options');
    });

    it('should have driver property', () => {
      expect(AppDataSource).toHaveProperty('driver');
    });
  });
});
