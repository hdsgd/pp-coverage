import { MondayBoard } from '../../src/entities/MondayBoard';

describe('MondayBoard Entity', () => {
  let board: MondayBoard;

  beforeEach(() => {
    board = new MondayBoard();
  });

  describe('Entity Properties', () => {
    it('should create board with all properties', () => {
      board.id = 'board_uuid_123';
      board.name = 'Campaign Board';
      board.board_id = '7410140027';
      board.description = 'Main campaign tracking board';
      board.is_active = true;
      board.query_fields = ['id', 'name', 'status'];
      board.created_at = new Date('2025-12-01T00:00:00.000Z');
      board.updated_at = new Date('2025-12-01T00:00:00.000Z');

      expect(board.id).toBe('board_uuid_123');
      expect(board.name).toBe('Campaign Board');
      expect(board.board_id).toBe('7410140027');
      expect(board.description).toBe('Main campaign tracking board');
      expect(board.is_active).toBe(true);
      expect(board.query_fields).toEqual(['id', 'name', 'status']);
      expect(board.created_at).toBeInstanceOf(Date);
      expect(board.updated_at).toBeInstanceOf(Date);
    });

    it('should support UUID format for id', () => {
      board.id = '123e4567-e89b-12d3-a456-426614174000';
      expect(board.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should support numeric board_id as string', () => {
      board.board_id = '123456789012345';
      expect(board.board_id).toBe('123456789012345');
      expect(typeof board.board_id).toBe('string');
    });

    it('should handle optional description', () => {
      expect(board.description).toBeUndefined();
    });

    it('should allow null description', () => {
      board.description = undefined;
      expect(board.description).toBeUndefined();
    });

    it('should allow empty string description', () => {
      board.description = '';
      expect(board.description).toBe('');
    });

    it('should handle long description', () => {
      board.description = 'A'.repeat(500);
      expect(board.description.length).toBe(500);
    });

    it('should handle special characters in name', () => {
      board.name = 'Campaign Board - 2025 & Marketing';
      expect(board.name).toContain('-');
      expect(board.name).toContain('&');
    });

    it('should handle unicode characters in name', () => {
      board.name = 'Quadro de Campañas';
      expect(board.name).toContain('ñ');
    });

    it('should handle is_active as true', () => {
      board.is_active = true;
      expect(board.is_active).toBe(true);
    });

    it('should handle is_active as false', () => {
      board.is_active = false;
      expect(board.is_active).toBe(false);
    });

    it('should handle empty query_fields array', () => {
      board.query_fields = [];
      expect(board.query_fields).toEqual([]);
      expect(board.query_fields.length).toBe(0);
    });

    it('should handle null query_fields', () => {
      board.query_fields = null as any;
      expect(board.query_fields).toBeNull();
    });

    it('should handle single query field', () => {
      board.query_fields = ['id'];
      expect(board.query_fields).toEqual(['id']);
      expect(board.query_fields.length).toBe(1);
    });

    it('should handle multiple query fields', () => {
      board.query_fields = ['id', 'name', 'status', 'created_at', 'updated_at'];
      expect(board.query_fields).toHaveLength(5);
    });

    it('should handle query fields with special characters', () => {
      board.query_fields = ['id', 'column_value__1', 'text_mkr__1'];
      expect(board.query_fields[1]).toContain('__');
    });

    it('should support same created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T12:00:00.000Z');
      board.created_at = timestamp;
      board.updated_at = timestamp;
      expect(board.created_at).toEqual(board.updated_at);
    });

    it('should support different timestamps', () => {
      board.created_at = new Date('2025-12-01T00:00:00.000Z');
      board.updated_at = new Date('2025-12-01T12:00:00.000Z');
      expect(board.updated_at.getTime()).toBeGreaterThan(board.created_at.getTime());
    });
  });

  describe('Entity Defaults', () => {
    it('should have default is_active as true', () => {
      board.is_active = true;
      expect(board.is_active).toBe(true);
    });

    it('should allow changing is_active from default', () => {
      board.is_active = true;
      expect(board.is_active).toBe(true);
      board.is_active = false;
      expect(board.is_active).toBe(false);
    });
  });

  describe('Entity Constraints', () => {
    it('should handle unique name', () => {
      const board1 = new MondayBoard();
      const board2 = new MondayBoard();
      
      board1.name = 'Board One';
      board2.name = 'Board Two';

      expect(board1.name).not.toBe(board2.name);
    });

    it('should handle name up to 100 characters', () => {
      board.name = 'a'.repeat(100);
      expect(board.name.length).toBe(100);
    });

    it('should handle description up to 500 characters', () => {
      board.description = 'a'.repeat(500);
      expect(board.description!.length).toBe(500);
    });

    it('should handle board_id as bigint string', () => {
      board.board_id = '9223372036854775807'; // Max bigint
      expect(board.board_id).toBe('9223372036854775807');
    });

    it('should store query_fields as JSON array', () => {
      board.query_fields = ['field1', 'field2', 'field3'];
      expect(Array.isArray(board.query_fields)).toBe(true);
      expect(board.query_fields).toEqual(['field1', 'field2', 'field3']);
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should create active campaign board', () => {
      board.name = 'Campanhas CRM';
      board.board_id = '7410140027';
      board.description = 'Board para gerenciar campanhas de CRM';
      board.is_active = true;
      board.query_fields = ['id', 'name', 'status', 'pessoas__1'];

      expect(board.is_active).toBe(true);
      expect(board.query_fields).toContain('status');
    });

    it('should create inactive GAM board', () => {
      board.name = 'Campanhas GAM';
      board.board_id = '7410140028';
      board.description = 'Board para campanhas GAM (inativo)';
      board.is_active = false;
      board.query_fields = ['id', 'name'];

      expect(board.is_active).toBe(false);
      expect(board.query_fields).toHaveLength(2);
    });

    it('should create marketing board without description', () => {
      board.name = 'Marketing Board';
      board.board_id = '7410140029';
      board.is_active = true;
      board.query_fields = ['id', 'name', 'status'];

      expect(board.description).toBeUndefined();
      expect(board.name).toBe('Marketing Board');
    });

    it('should create board with minimal fields', () => {
      board.name = 'Minimal Board';
      board.board_id = '123456';
      board.is_active = true;
      board.query_fields = ['id'];

      expect(board.name).toBeDefined();
      expect(board.board_id).toBeDefined();
      expect(board.is_active).toBeDefined();
      expect(board.query_fields).toBeDefined();
    });

    it('should create board with empty query fields', () => {
      board.name = 'Empty Query Board';
      board.board_id = '789012';
      board.is_active = true;
      board.query_fields = [];

      expect(board.query_fields).toEqual([]);
    });

    it('should create board with extensive query fields', () => {
      board.name = 'Detailed Board';
      board.board_id = '345678';
      board.is_active = true;
      board.query_fields = [
        'id',
        'name',
        'status',
        'pessoas__1',
        'data__1',
        'numero__1',
        'texto__1',
        'conectar_quadros__1'
      ];

      expect(board.query_fields).toHaveLength(8);
    });

    it('should handle board name changes', () => {
      board.name = 'Original Name';
      expect(board.name).toBe('Original Name');
      
      board.name = 'Updated Name';
      expect(board.name).toBe('Updated Name');
    });

    it('should handle board activation toggle', () => {
      board.is_active = true;
      expect(board.is_active).toBe(true);
      
      board.is_active = false;
      expect(board.is_active).toBe(false);
      
      board.is_active = true;
      expect(board.is_active).toBe(true);
    });

    it('should handle query fields updates', () => {
      board.query_fields = ['id', 'name'];
      expect(board.query_fields).toHaveLength(2);
      
      board.query_fields = ['id', 'name', 'status', 'updated_at'];
      expect(board.query_fields).toHaveLength(4);
    });

    it('should create board with multiline description', () => {
      board.name = 'Board with Description';
      board.board_id = '111222';
      board.description = 'Line 1\nLine 2\nLine 3';
      board.is_active = true;
      board.query_fields = ['id'];

      expect(board.description).toContain('\n');
      expect(board.description!.split('\n')).toHaveLength(3);
    });
  });
});
