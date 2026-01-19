import {
  MondayItemResponseDto,
  SyncMondayDataDto,
  SyncBoardResponseDto
} from '../../src/dto/MondayItemDto';

// Mock class-validator decorators
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    IsString: jest.fn(() => jest.fn()),
    IsOptional: jest.fn(() => jest.fn())
  };
});

describe('MondayItemDto', () => {
  describe('MondayItemResponseDto class', () => {
    it('should create response with all fields', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'response_id_123';
      dto.item_id = 'item_456';
      dto.name = 'Test Item';
      dto.status = 'active';
      dto.max_value = 100;
      dto.board_id = 'board_789';
      dto.created_at = new Date('2025-12-01T00:00:00.000Z');
      dto.updated_at = new Date('2025-12-01T12:00:00.000Z');

      expect(dto.id).toBe('response_id_123');
      expect(dto.item_id).toBe('item_456');
      expect(dto.name).toBe('Test Item');
      expect(dto.status).toBe('active');
      expect(dto.max_value).toBe(100);
      expect(dto.board_id).toBe('board_789');
      expect(dto.created_at).toBeInstanceOf(Date);
      expect(dto.updated_at).toBeInstanceOf(Date);
    });

    it('should support response without max_value', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'no_max_id';
      dto.item_id = 'item_no_max';
      dto.name = 'No Max Value';
      dto.status = 'pending';
      dto.board_id = 'board_no_max';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.max_value).toBeUndefined();
    });

    it('should support different status values', () => {
      const statuses = ['active', 'inactive', 'pending', 'done', 'archived'];

      statuses.forEach(status => {
        const dto = new MondayItemResponseDto();
        dto.id = `id_${status}`;
        dto.item_id = `item_${status}`;
        dto.name = `Item ${status}`;
        dto.status = status;
        dto.board_id = 'board_status';
        dto.created_at = new Date();
        dto.updated_at = new Date();

        expect(dto.status).toBe(status);
      });
    });

    it('should support zero max_value', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'zero_max_id';
      dto.item_id = 'item_zero';
      dto.name = 'Zero Max';
      dto.status = 'active';
      dto.max_value = 0;
      dto.board_id = 'board_zero';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.max_value).toBe(0);
    });

    it('should support large max_value', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'large_max_id';
      dto.item_id = 'item_large';
      dto.name = 'Large Max';
      dto.status = 'active';
      dto.max_value = 999999;
      dto.board_id = 'board_large';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.max_value).toBe(999999);
    });

    it('should support negative max_value', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'neg_max_id';
      dto.item_id = 'item_neg';
      dto.name = 'Negative Max';
      dto.status = 'active';
      dto.max_value = -50;
      dto.board_id = 'board_neg';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.max_value).toBe(-50);
    });

    it('should handle Date objects for timestamps', () => {
      const created = new Date('2025-12-01T00:00:00.000Z');
      const updated = new Date('2025-12-01T12:00:00.000Z');

      const dto = new MondayItemResponseDto();
      dto.id = 'timestamp_id';
      dto.item_id = 'item_timestamp';
      dto.name = 'Timestamp Item';
      dto.status = 'done';
      dto.board_id = 'board_timestamp';
      dto.created_at = created;
      dto.updated_at = updated;

      expect(dto.created_at.getTime()).toBeLessThan(dto.updated_at.getTime());
    });

    it('should allow same timestamp for created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T10:00:00.000Z');

      const dto = new MondayItemResponseDto();
      dto.id = 'same_time_id';
      dto.item_id = 'item_same_time';
      dto.name = 'Same Time';
      dto.status = 'active';
      dto.board_id = 'board_same_time';
      dto.created_at = timestamp;
      dto.updated_at = timestamp;

      expect(dto.created_at).toEqual(dto.updated_at);
    });

    it('should support UUID format IDs', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'uuid-resp-123-abc';
      dto.item_id = 'uuid-item-456-def';
      dto.name = 'UUID Item';
      dto.status = 'active';
      dto.board_id = 'uuid-board-789-ghi';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toMatch(/uuid-resp/);
      expect(dto.item_id).toMatch(/uuid-item/);
      expect(dto.board_id).toMatch(/uuid-board/);
    });

    it('should support numeric IDs as strings', () => {
      const dto = new MondayItemResponseDto();
      dto.id = '123456';
      dto.item_id = '789012';
      dto.name = 'Numeric IDs';
      dto.status = 'active';
      dto.board_id = '345678';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toBe('123456');
      expect(dto.item_id).toBe('789012');
      expect(dto.board_id).toBe('345678');
    });

    it('should support special characters in name', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'special_id';
      dto.item_id = 'item_special';
      dto.name = 'Item @ 2025 - Test #1';
      dto.status = 'active';
      dto.board_id = 'board_special';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name).toContain('@');
      expect(dto.name).toContain('#');
    });

    it('should support long names', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'long_name_id';
      dto.item_id = 'item_long';
      dto.name = 'A'.repeat(500);
      dto.status = 'active';
      dto.board_id = 'board_long';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name).toHaveLength(500);
    });

    it('should support empty string status', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'empty_status_id';
      dto.item_id = 'item_empty_status';
      dto.name = 'Empty Status';
      dto.status = '';
      dto.board_id = 'board_empty_status';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.status).toBe('');
    });

    it('should support decimal max_value', () => {
      const dto = new MondayItemResponseDto();
      dto.id = 'decimal_id';
      dto.item_id = 'item_decimal';
      dto.name = 'Decimal Max';
      dto.status = 'active';
      dto.max_value = 99.99;
      dto.board_id = 'board_decimal';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.max_value).toBe(99.99);
    });
  });

  describe('SyncMondayDataDto class', () => {
    it('should create instance with board_name only', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'Test Board';

      expect(dto.board_name).toBe('Test Board');
      // status_filter has default value "Ativo"
      expect(dto.status_filter).toBe('Ativo');
    });

    it('should create instance with status_filter only', () => {
      const dto = new SyncMondayDataDto();
      dto.status_filter = 'Done';

      expect(dto.status_filter).toBe('Done');
      expect(dto.board_name).toBeUndefined();
    });

    it('should create instance with both fields', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'Project Board';
      dto.status_filter = 'Active';

      expect(dto.board_name).toBe('Project Board');
      expect(dto.status_filter).toBe('Active');
    });

    it('should support default status_filter value', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'Board';
      // Default value is "Ativo" according to the DTO

      expect(dto.board_name).toBe('Board');
    });

    it('should support empty board_name', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = '';
      dto.status_filter = 'Active';

      expect(dto.board_name).toBe('');
    });

    it('should support empty status_filter', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'Board';
      dto.status_filter = '';

      expect(dto.status_filter).toBe('');
    });

    it('should support special characters in board_name', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'Board @ 2025 - Project #1';
      dto.status_filter = 'Active';

      expect(dto.board_name).toContain('@');
      expect(dto.board_name).toContain('#');
    });

    it('should support different status_filter values', () => {
      const statuses = ['Ativo', 'Done', 'Pending', 'Archived', 'Active'];

      statuses.forEach(status => {
        const dto = new SyncMondayDataDto();
        dto.board_name = 'Test Board';
        dto.status_filter = status;

        expect(dto.status_filter).toBe(status);
      });
    });

    it('should allow empty instance with default status_filter', () => {
      const dto = new SyncMondayDataDto();

      expect(dto.board_name).toBeUndefined();
      // status_filter has default value "Ativo"
      expect(dto.status_filter).toBe('Ativo');
    });

    it('should support long board_name', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = 'A'.repeat(200);

      expect(dto.board_name).toHaveLength(200);
    });

    it('should support numeric board_name', () => {
      const dto = new SyncMondayDataDto();
      dto.board_name = '123456789';

      expect(dto.board_name).toBe('123456789');
    });

    it('should support case-sensitive status_filter', () => {
      const dto1 = new SyncMondayDataDto();
      dto1.status_filter = 'ACTIVE';
      const dto2 = new SyncMondayDataDto();
      dto2.status_filter = 'active';

      expect(dto1.status_filter).toBe('ACTIVE');
      expect(dto2.status_filter).toBe('active');
    });
  });

  describe('SyncBoardResponseDto class', () => {
    it('should create response with all required fields', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync completed successfully';
      dto.itemsCount = 50;

      expect(dto.success).toBe(true);
      expect(dto.message).toBe('Sync completed successfully');
      expect(dto.itemsCount).toBe(50);
    });

    it('should create response with optional board fields', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Board synced';
      dto.itemsCount = 25;
      dto.boardName = 'Test Board';
      dto.boardId = 'board_123';

      expect(dto.boardName).toBe('Test Board');
      expect(dto.boardId).toBe('board_123');
    });

    it('should support failed sync response', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = false;
      dto.message = 'Sync failed';
      dto.itemsCount = 0;

      expect(dto.success).toBe(false);
      expect(dto.itemsCount).toBe(0);
    });

    it('should support zero items count', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'No items to sync';
      dto.itemsCount = 0;

      expect(dto.itemsCount).toBe(0);
    });

    it('should support large items count', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Large sync completed';
      dto.itemsCount = 10000;

      expect(dto.itemsCount).toBe(10000);
    });

    it('should support response without boardName', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync completed';
      dto.itemsCount = 30;
      dto.boardId = 'board_456';

      expect(dto.boardName).toBeUndefined();
      expect(dto.boardId).toBe('board_456');
    });

    it('should support response without boardId', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync completed';
      dto.itemsCount = 30;
      dto.boardName = 'Some Board';

      expect(dto.boardId).toBeUndefined();
      expect(dto.boardName).toBe('Some Board');
    });

    it('should support response without optional fields', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync completed';
      dto.itemsCount = 15;

      expect(dto.boardName).toBeUndefined();
      expect(dto.boardId).toBeUndefined();
    });

    it('should support long error messages', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = false;
      dto.message = 'Error: ' + 'A'.repeat(500);
      dto.itemsCount = 0;

      expect(dto.message).toHaveLength(507);
    });

    it('should support special characters in message', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync @ 2025 completed with #50 items';
      dto.itemsCount = 50;

      expect(dto.message).toContain('@');
      expect(dto.message).toContain('#');
    });

    it('should support multiline messages', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Sync completed\nProcessed 50 items\nNo errors';
      dto.itemsCount = 50;

      expect(dto.message).toContain('\n');
    });

    it('should support empty message', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = '';
      dto.itemsCount = 20;

      expect(dto.message).toBe('');
    });

    it('should support numeric boardId as string', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Synced';
      dto.itemsCount = 10;
      dto.boardId = '123456789';

      expect(dto.boardId).toBe('123456789');
    });

    it('should support UUID boardId', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Synced';
      dto.itemsCount = 10;
      dto.boardId = 'uuid-board-123-abc';

      expect(dto.boardId).toMatch(/uuid-board/);
    });

    it('should support special characters in boardName', () => {
      const dto = new SyncBoardResponseDto();
      dto.success = true;
      dto.message = 'Synced';
      dto.itemsCount = 10;
      dto.boardName = 'Board @ 2025 - Project #1';

      expect(dto.boardName).toContain('@');
      expect(dto.boardName).toContain('#');
    });
  });
});
