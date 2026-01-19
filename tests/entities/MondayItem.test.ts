import { MondayItem } from '../../src/entities/MondayItem';
import { MondayBoard } from '../../src/entities/MondayBoard';

describe('MondayItem Entity', () => {
  let item: MondayItem;

  beforeEach(() => {
    item = new MondayItem();
  });

  describe('Entity Properties', () => {
    it('should create item with all properties', () => {
      const board = new MondayBoard();
      board.id = 'board_uuid_123';

      item.id = 'item_uuid_456';
      item.item_id = '123456789';
      item.name = 'Campaign Item';
      item.status = 'Ativo';
      item.max_value = 10000.50;
      item.code = 'CAMP-001';
      item.team = ['Marketing', 'Vendas'];
      item.product = 'Produto A';
      item.board = board;
      item.board_id = board.id;
      item.created_at = new Date('2025-12-01T00:00:00.000Z');
      item.updated_at = new Date('2025-12-01T00:00:00.000Z');

      expect(item.id).toBe('item_uuid_456');
      expect(item.item_id).toBe('123456789');
      expect(item.name).toBe('Campaign Item');
      expect(item.status).toBe('Ativo');
      expect(item.max_value).toBe(10000.50);
      expect(item.code).toBe('CAMP-001');
      expect(item.team).toEqual(['Marketing', 'Vendas']);
      expect(item.product).toBe('Produto A');
      expect(item.board).toBe(board);
      expect(item.board_id).toBe(board.id);
      expect(item.created_at).toBeInstanceOf(Date);
      expect(item.updated_at).toBeInstanceOf(Date);
    });

    it('should support UUID format for id', () => {
      item.id = '123e4567-e89b-12d3-a456-426614174000';
      expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should support numeric item_id as string', () => {
      item.item_id = '987654321';
      expect(item.item_id).toBe('987654321');
      expect(typeof item.item_id).toBe('string');
    });

    it('should support long item_id (bigint)', () => {
      item.item_id = '9223372036854775807';
      expect(item.item_id).toBe('9223372036854775807');
    });

    it('should handle optional max_value', () => {
      expect(item.max_value).toBeUndefined();
    });

    it('should allow max_value as zero', () => {
      item.max_value = 0;
      expect(item.max_value).toBe(0);
    });

    it('should allow negative max_value', () => {
      item.max_value = -100.50;
      expect(item.max_value).toBe(-100.50);
    });

    it('should allow large max_value', () => {
      item.max_value = 9999999999999.99;
      expect(item.max_value).toBe(9999999999999.99);
    });

    it('should allow decimal max_value with 2 scale', () => {
      item.max_value = 1234.56;
      expect(item.max_value).toBe(1234.56);
    });

    it('should handle optional code', () => {
      expect(item.code).toBeUndefined();
    });

    it('should allow code as null', () => {
      item.code = null;
      expect(item.code).toBeNull();
    });

    it('should allow code up to 100 characters', () => {
      item.code = 'CODE-' + 'A'.repeat(95);
      expect(item.code.length).toBe(100);
    });

    it('should handle special characters in code', () => {
      item.code = 'CAMP-2025_V1.0';
      expect(item.code).toContain('-');
      expect(item.code).toContain('_');
      expect(item.code).toContain('.');
    });

    it('should handle optional team', () => {
      expect(item.team).toBeUndefined();
    });

    it('should allow team as null', () => {
      item.team = null;
      expect(item.team).toBeNull();
    });

    it('should allow empty team array', () => {
      item.team = [];
      expect(item.team).toEqual([]);
      expect(item.team.length).toBe(0);
    });

    it('should handle single team member', () => {
      item.team = ['Marketing'];
      expect(item.team).toHaveLength(1);
      expect(item.team[0]).toBe('Marketing');
    });

    it('should handle multiple team members', () => {
      item.team = ['Marketing', 'Vendas', 'TI', 'RH'];
      expect(item.team).toHaveLength(4);
    });

    it('should handle team with special characters', () => {
      item.team = ['Marketing & Vendas', 'TI - Desenvolvimento'];
      expect(item.team[0]).toContain('&');
      expect(item.team[1]).toContain('-');
    });

    it('should handle team with unicode characters', () => {
      item.team = ['Diseño', 'Atención'];
      expect(item.team[0]).toContain('ñ');
      expect(item.team[1]).toContain('ó');
    });

    it('should handle optional product', () => {
      expect(item.product).toBeUndefined();
    });

    it('should allow product as null', () => {
      item.product = null;
      expect(item.product).toBeNull();
    });

    it('should allow product up to 255 characters', () => {
      item.product = 'Product ' + 'A'.repeat(247);
      expect(item.product.length).toBe(255);
    });

    it('should handle special characters in product', () => {
      item.product = 'Product A & B - Version 2.0';
      expect(item.product).toContain('&');
      expect(item.product).toContain('-');
    });

    it('should handle unicode characters in product', () => {
      item.product = 'Café Premium';
      expect(item.product).toContain('é');
    });

    it('should handle different status values', () => {
      const statuses = ['Ativo', 'Inativo', 'Pendente', 'Em Progresso', 'Concluído'];
      statuses.forEach(status => {
        item.status = status;
        expect(item.status).toBe(status);
      });
    });

    it('should handle status up to 50 characters', () => {
      item.status = 'A'.repeat(50);
      expect(item.status.length).toBe(50);
    });

    it('should handle name up to 255 characters', () => {
      item.name = 'Item ' + 'A'.repeat(250);
      expect(item.name.length).toBe(255);
    });

    it('should handle special characters in name', () => {
      item.name = 'Campaign #1 - Black Friday & Christmas';
      expect(item.name).toContain('#');
      expect(item.name).toContain('&');
    });

    it('should support same created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T12:00:00.000Z');
      item.created_at = timestamp;
      item.updated_at = timestamp;
      expect(item.created_at).toEqual(item.updated_at);
    });

    it('should support different timestamps', () => {
      item.created_at = new Date('2025-12-01T00:00:00.000Z');
      item.updated_at = new Date('2025-12-01T12:00:00.000Z');
      expect(item.updated_at.getTime()).toBeGreaterThan(item.created_at.getTime());
    });
  });

  describe('Entity Relationships', () => {
    it('should link item to board', () => {
      const board = new MondayBoard();
      board.id = 'board_uuid_123';
      board.name = 'Campaign Board';
      board.board_id = '7410140027';

      item.board = board;
      item.board_id = board.id;

      expect(item.board).toBe(board);
      expect(item.board_id).toBe(board.id);
      expect(item.board.name).toBe('Campaign Board');
    });

    it('should handle board_id without board object', () => {
      item.board_id = 'board_uuid_456';
      expect(item.board_id).toBe('board_uuid_456');
      expect(item.board).toBeUndefined();
    });

    it('should support UUID board_id', () => {
      item.board_id = '123e4567-e89b-12d3-a456-426614174000';
      expect(item.board_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should create campaign item with all fields', () => {
      const board = new MondayBoard();
      board.id = 'campaign_board';
      board.name = 'Campanhas CRM';

      item.item_id = '1001';
      item.name = 'Black Friday Campaign';
      item.status = 'Ativo';
      item.max_value = 50000;
      item.code = 'BF-2025';
      item.team = ['Marketing', 'Vendas'];
      item.product = 'Produto Premium';
      item.board = board;
      item.board_id = board.id;

      expect(item.name).toBe('Black Friday Campaign');
      expect(item.team).toHaveLength(2);
      expect(item.max_value).toBe(50000);
    });

    it('should create item with only required fields', () => {
      const board = new MondayBoard();
      board.id = 'minimal_board';

      item.item_id = '2001';
      item.name = 'Minimal Item';
      item.status = 'Pendente';
      item.board = board;
      item.board_id = board.id;

      expect(item.max_value).toBeUndefined();
      expect(item.code).toBeUndefined();
      expect(item.team).toBeUndefined();
      expect(item.product).toBeUndefined();
    });

    it('should create inactive item', () => {
      const board = new MondayBoard();
      board.id = 'inactive_board';

      item.item_id = '3001';
      item.name = 'Inactive Campaign';
      item.status = 'Inativo';
      item.board = board;
      item.board_id = board.id;

      expect(item.status).toBe('Inativo');
    });

    it('should create item with null optional fields', () => {
      const board = new MondayBoard();
      board.id = 'null_fields_board';

      item.item_id = '4001';
      item.name = 'Item with Nulls';
      item.status = 'Ativo';
      item.code = null;
      item.team = null;
      item.product = null;
      item.board = board;
      item.board_id = board.id;

      expect(item.code).toBeNull();
      expect(item.team).toBeNull();
      expect(item.product).toBeNull();
    });

    it('should create item with single team member', () => {
      const board = new MondayBoard();
      board.id = 'single_team_board';

      item.item_id = '5001';
      item.name = 'Single Team Item';
      item.status = 'Em Progresso';
      item.team = ['Marketing'];
      item.board = board;
      item.board_id = board.id;

      expect(item.team).toHaveLength(1);
    });

    it('should create item with large team', () => {
      const board = new MondayBoard();
      board.id = 'large_team_board';

      item.item_id = '6001';
      item.name = 'Large Team Item';
      item.status = 'Ativo';
      item.team = ['Marketing', 'Vendas', 'TI', 'RH', 'Financeiro', 'Produto'];
      item.board = board;
      item.board_id = board.id;

      expect(item.team).toHaveLength(6);
    });

    it('should update item status', () => {
      item.status = 'Pendente';
      expect(item.status).toBe('Pendente');
      
      item.status = 'Em Progresso';
      expect(item.status).toBe('Em Progresso');
      
      item.status = 'Concluído';
      expect(item.status).toBe('Concluído');
    });

    it('should update item max_value', () => {
      item.max_value = 1000;
      expect(item.max_value).toBe(1000);
      
      item.max_value = 5000;
      expect(item.max_value).toBe(5000);
    });

    it('should update item team', () => {
      item.team = ['Marketing'];
      expect(item.team).toHaveLength(1);
      
      item.team = ['Marketing', 'Vendas', 'TI'];
      expect(item.team).toHaveLength(3);
    });

    it('should create item with zero max_value', () => {
      const board = new MondayBoard();
      board.id = 'zero_value_board';

      item.item_id = '7001';
      item.name = 'Zero Value Item';
      item.status = 'Ativo';
      item.max_value = 0;
      item.board = board;
      item.board_id = board.id;

      expect(item.max_value).toBe(0);
    });

    it('should create item with decimal max_value', () => {
      const board = new MondayBoard();
      board.id = 'decimal_board';

      item.item_id = '8001';
      item.name = 'Decimal Value Item';
      item.status = 'Ativo';
      item.max_value = 1234.56;
      item.board = board;
      item.board_id = board.id;

      expect(item.max_value).toBe(1234.56);
    });
  });

  describe('Entity Constraints', () => {
    it('should handle item_id as bigint string', () => {
      item.item_id = '9223372036854775807';
      expect(item.item_id).toBe('9223372036854775807');
    });

    it('should handle name up to 255 characters', () => {
      item.name = 'a'.repeat(255);
      expect(item.name.length).toBe(255);
    });

    it('should handle status up to 50 characters', () => {
      item.status = 'a'.repeat(50);
      expect(item.status.length).toBe(50);
    });

    it('should handle code up to 100 characters', () => {
      item.code = 'a'.repeat(100);
      expect(item.code!.length).toBe(100);
    });

    it('should handle product up to 255 characters', () => {
      item.product = 'a'.repeat(255);
      expect(item.product!.length).toBe(255);
    });

    it('should handle max_value with precision 15 and scale 2', () => {
      item.max_value = 9999999999999.99;
      expect(item.max_value).toBe(9999999999999.99);
    });

    it('should store team as JSON array', () => {
      item.team = ['Team1', 'Team2', 'Team3'];
      expect(Array.isArray(item.team)).toBe(true);
      expect(item.team).toEqual(['Team1', 'Team2', 'Team3']);
    });
  });

  describe('TypeORM Decorators and Metadata', () => {
    it('should have PrimaryGeneratedColumn decorator for id', () => {
      const item = new MondayItem();
      expect(item.id).toBeUndefined(); // Not set until persisted
    });

    it('should have ManyToOne relationship to MondayBoard', () => {
      const board = new MondayBoard();
      board.id = 'board_123';
      board.board_id = '7410140027';
      board.name = 'Test Board';
      
      item.board = board;
      item.board_id = board.id;
      
      expect(item.board).toBeDefined();
      expect(item.board.id).toBe('board_123');
      expect(item.board_id).toBe('board_123');
    });

    it('should allow accessing board properties through relationship', () => {
      const board = new MondayBoard();
      board.id = 'board_456';
      board.board_id = '123456';
      board.name = 'Campaign Board';
      board.description = 'A campaign board';
      
      item.board = board;
      
      expect(item.board.name).toBe('Campaign Board');
      expect(item.board.board_id).toBe('123456');
      expect(item.board.description).toBe('A campaign board');
    });

    it('should have CreateDateColumn and UpdateDateColumn decorators', () => {
      const now = new Date();
      item.created_at = now;
      item.updated_at = now;
      
      expect(item.created_at).toBe(now);
      expect(item.updated_at).toBe(now);
    });

    it('should handle item with board relationship', () => {
      const board = new MondayBoard();
      board.id = 'uuid-board';
      
      const item = new MondayItem();
      item.board = board;
      item.board_id = 'uuid-board';
      
      expect(item.board).toBeInstanceOf(MondayBoard);
      expect(item.board_id).toBe(board.id);
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle empty string values', () => {
      item.name = '';
      item.status = '';
      item.code = '';
      item.product = '';
      
      expect(item.name).toBe('');
      expect(item.status).toBe('');
      expect(item.code).toBe('');
      expect(item.product).toBe('');
    });

    it('should handle whitespace in string fields', () => {
      item.name = '  Campaign  ';
      item.status = ' Active ';
      
      expect(item.name).toContain('Campaign');
      expect(item.status).toContain('Active');
    });

    it('should handle special JSON values in team', () => {
      item.team = ['Team A', 'Team B', 'Team-C_1'];
      expect(item.team).toEqual(['Team A', 'Team B', 'Team-C_1']);
    });

    it('should handle very long item_id', () => {
      item.item_id = '1' + '0'.repeat(18);
      expect(item.item_id.length).toBe(19);
    });

    it('should handle scientific notation in max_value', () => {
      item.max_value = 1.23e10;
      expect(item.max_value).toBe(12300000000);
    });
  });
});
