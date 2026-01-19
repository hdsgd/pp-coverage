import {
  CreateMondayBoardDto,
  UpdateMondayBoardDto,
  MondayBoardResponseDto
} from '../../src/dto/MondayBoardDto';

// Mock class-validator decorators
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    IsString: jest.fn(() => jest.fn()),
    IsOptional: jest.fn(() => jest.fn()),
    IsBoolean: jest.fn(() => jest.fn()),
    IsNotEmpty: jest.fn(() => jest.fn()),
    IsArray: jest.fn(() => jest.fn())
  };
});

describe('MondayBoardDto', () => {
  describe('CreateMondayBoardDto class', () => {
    it('should create instance with all required fields', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Test Board';
      dto.board_id = 'board_123';

      expect(dto.name).toBe('Test Board');
      expect(dto.board_id).toBe('board_123');
    });

    it('should create instance with default values', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Default Board';
      dto.board_id = 'board_default';

      expect(dto.is_active).toBe(true);
      expect(dto.query_fields).toEqual(['id', 'name', 'status']);
    });

    it('should create instance with custom description', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Described Board';
      dto.board_id = 'board_desc';
      dto.description = 'This is a test board description';

      expect(dto.description).toBe('This is a test board description');
    });

    it('should create instance with is_active false', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Inactive Board';
      dto.board_id = 'board_inactive';
      dto.is_active = false;

      expect(dto.is_active).toBe(false);
    });

    it('should create instance with custom query_fields', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Custom Fields Board';
      dto.board_id = 'board_custom';
      dto.query_fields = ['id', 'name', 'created_at', 'updated_at'];

      expect(dto.query_fields).toEqual(['id', 'name', 'created_at', 'updated_at']);
    });

    it('should create instance with empty query_fields', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Empty Fields';
      dto.board_id = 'board_empty';
      dto.query_fields = [];

      expect(dto.query_fields).toEqual([]);
    });

    it('should support numeric board_id as string', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Numeric ID Board';
      dto.board_id = '123456789';

      expect(dto.board_id).toBe('123456789');
    });

    it('should support special characters in name', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Board @ 2025 - Test #1';
      dto.board_id = 'board_special';

      expect(dto.name).toBe('Board @ 2025 - Test #1');
    });

    it('should support long description', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Long Description Board';
      dto.board_id = 'board_long';
      dto.description = 'A'.repeat(1000);

      expect(dto.description).toHaveLength(1000);
    });

    it('should support many query_fields', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Many Fields Board';
      dto.board_id = 'board_many';
      dto.query_fields = Array.from({ length: 50 }, (_, i) => `field${i}`);

      expect(dto.query_fields).toHaveLength(50);
    });

    it('should support UUID format board_id', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'UUID Board';
      dto.board_id = 'uuid-123-abc-456-def';

      expect(dto.board_id).toMatch(/uuid-123/);
    });

    it('should support query_fields with special characters', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Special Query Fields';
      dto.board_id = 'board_special_query';
      dto.query_fields = ['field_1', 'field-2', 'field.3'];

      expect(dto.query_fields).toContain('field_1');
      expect(dto.query_fields).toContain('field-2');
      expect(dto.query_fields).toContain('field.3');
    });

    it('should create instance with all optional fields', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Complete Board';
      dto.board_id = 'board_complete';
      dto.description = 'Complete description';
      dto.is_active = true;
      dto.query_fields = ['id', 'name', 'status', 'custom'];

      expect(dto.description).toBe('Complete description');
      expect(dto.is_active).toBe(true);
      expect(dto.query_fields).toHaveLength(4);
    });

    it('should support empty string description', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Empty Desc Board';
      dto.board_id = 'board_empty_desc';
      dto.description = '';

      expect(dto.description).toBe('');
    });

    it('should support multiline description', () => {
      const dto = new CreateMondayBoardDto();
      dto.name = 'Multiline Board';
      dto.board_id = 'board_multiline';
      dto.description = 'Line 1\nLine 2\nLine 3';

      expect(dto.description).toContain('\n');
    });
  });

  describe('UpdateMondayBoardDto class', () => {
    it('should allow updating name only', () => {
      const dto = new UpdateMondayBoardDto();
      dto.name = 'Updated Name';

      expect(dto.name).toBe('Updated Name');
      expect(dto.board_id).toBeUndefined();
    });

    it('should allow updating board_id only', () => {
      const dto = new UpdateMondayBoardDto();
      dto.board_id = 'updated_board_123';

      expect(dto.board_id).toBe('updated_board_123');
      expect(dto.name).toBeUndefined();
    });

    it('should allow updating description only', () => {
      const dto = new UpdateMondayBoardDto();
      dto.description = 'Updated description';

      expect(dto.description).toBe('Updated description');
    });

    it('should allow updating is_active only', () => {
      const dto = new UpdateMondayBoardDto();
      dto.is_active = false;

      expect(dto.is_active).toBe(false);
    });

    it('should allow updating query_fields only', () => {
      const dto = new UpdateMondayBoardDto();
      dto.query_fields = ['updated', 'fields'];

      expect(dto.query_fields).toEqual(['updated', 'fields']);
    });

    it('should allow updating all fields', () => {
      const dto = new UpdateMondayBoardDto();
      dto.name = 'Fully Updated';
      dto.board_id = 'board_fully_updated';
      dto.description = 'New description';
      dto.is_active = true;
      dto.query_fields = ['all', 'updated'];

      expect(dto.name).toBe('Fully Updated');
      expect(dto.is_active).toBe(true);
    });

    it('should allow empty update object', () => {
      const dto = new UpdateMondayBoardDto();

      expect(Object.keys(dto)).toHaveLength(0);
    });

    it('should allow partial update with two fields', () => {
      const dto = new UpdateMondayBoardDto();
      dto.name = 'Partial Update';
      dto.is_active = false;

      expect(dto.name).toBe('Partial Update');
      expect(dto.is_active).toBe(false);
      expect(dto.description).toBeUndefined();
    });

    it('should allow clearing description', () => {
      const dto = new UpdateMondayBoardDto();
      dto.description = '';

      expect(dto.description).toBe('');
    });

    it('should allow toggling is_active', () => {
      const dto1 = new UpdateMondayBoardDto();
      dto1.is_active = true;
      const dto2 = new UpdateMondayBoardDto();
      dto2.is_active = false;

      expect(dto1.is_active).toBe(true);
      expect(dto2.is_active).toBe(false);
    });

    it('should allow updating query_fields to empty array', () => {
      const dto = new UpdateMondayBoardDto();
      dto.query_fields = [];

      expect(dto.query_fields).toEqual([]);
    });

    it('should allow updating query_fields to single item', () => {
      const dto = new UpdateMondayBoardDto();
      dto.query_fields = ['id'];

      expect(dto.query_fields).toEqual(['id']);
    });

    it('should support updating with numeric board_id', () => {
      const dto = new UpdateMondayBoardDto();
      dto.board_id = '987654321';

      expect(dto.board_id).toBe('987654321');
    });

    it('should support updating with UUID board_id', () => {
      const dto = new UpdateMondayBoardDto();
      dto.board_id = 'uuid-update-123';

      expect(dto.board_id).toMatch(/uuid-update/);
    });

    it('should support updating description with special characters', () => {
      const dto = new UpdateMondayBoardDto();
      dto.description = 'Description with @#$%^&*() chars';

      expect(dto.description).toContain('@#$%');
    });
  });

  describe('MondayBoardResponseDto class', () => {
    it('should create response with all fields', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'response_id_123';
      dto.name = 'Response Board';
      dto.board_id = 'board_response_123';
      dto.description = 'Response description';
      dto.is_active = true;
      dto.query_fields = ['id', 'name'];
      dto.created_at = new Date('2025-12-01T00:00:00.000Z');
      dto.updated_at = new Date('2025-12-01T12:00:00.000Z');

      expect(dto.id).toBe('response_id_123');
      expect(dto.created_at).toBeInstanceOf(Date);
      expect(dto.updated_at).toBeInstanceOf(Date);
    });

    it('should support response without description', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'no_desc_id';
      dto.name = 'No Description';
      dto.board_id = 'board_no_desc';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.description).toBeUndefined();
    });

    it('should support inactive boards in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'inactive_id';
      dto.name = 'Inactive Response';
      dto.board_id = 'board_inactive_resp';
      dto.is_active = false;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.is_active).toBe(false);
    });

    it('should support empty query_fields in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'empty_fields_id';
      dto.name = 'Empty Fields';
      dto.board_id = 'board_empty';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.query_fields).toEqual([]);
    });

    it('should handle Date objects for timestamps', () => {
      const created = new Date('2025-12-01T00:00:00.000Z');
      const updated = new Date('2025-12-01T12:00:00.000Z');

      const dto = new MondayBoardResponseDto();
      dto.id = 'timestamp_id';
      dto.name = 'Timestamp Board';
      dto.board_id = 'board_timestamp';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = created;
      dto.updated_at = updated;

      expect(dto.created_at.getTime()).toBeLessThan(dto.updated_at.getTime());
    });

    it('should allow same timestamp for created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T10:00:00.000Z');

      const dto = new MondayBoardResponseDto();
      dto.id = 'same_time_id';
      dto.name = 'Same Time';
      dto.board_id = 'board_same_time';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = timestamp;
      dto.updated_at = timestamp;

      expect(dto.created_at).toEqual(dto.updated_at);
    });

    it('should support complex query_fields in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'complex_id';
      dto.name = 'Complex Fields';
      dto.board_id = 'board_complex';
      dto.is_active = true;
      dto.query_fields = ['id', 'name', 'status', 'created_at', 'updated_at', 'custom_field'];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.query_fields).toHaveLength(6);
    });

    it('should support UUID format in response IDs', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'uuid-resp-123-abc';
      dto.name = 'UUID Response';
      dto.board_id = 'board-uuid-456-def';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toMatch(/uuid-resp/);
      expect(dto.board_id).toMatch(/board-uuid/);
    });

    it('should support numeric IDs as strings in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = '123456';
      dto.name = 'Numeric ID';
      dto.board_id = '789012';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toBe('123456');
      expect(dto.board_id).toBe('789012');
    });

    it('should support long description in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'long_desc_id';
      dto.name = 'Long Description';
      dto.board_id = 'board_long';
      dto.description = 'A'.repeat(2000);
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.description).toHaveLength(2000);
    });

    it('should support multiline description in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'multiline_id';
      dto.name = 'Multiline';
      dto.board_id = 'board_multiline';
      dto.description = 'Line 1\nLine 2\nLine 3';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.description?.split('\n')).toHaveLength(3);
    });

    it('should support special characters in response name', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'special_char_id';
      dto.name = 'Board @ 2025 - Response #1';
      dto.board_id = 'board_special';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name).toContain('@');
      expect(dto.name).toContain('#');
    });

    it('should support empty description in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'empty_desc_id';
      dto.name = 'Empty Desc';
      dto.board_id = 'board_empty_desc';
      dto.description = '';
      dto.is_active = true;
      dto.query_fields = [];
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.description).toBe('');
    });

    it('should support many query_fields in response', () => {
      const dto = new MondayBoardResponseDto();
      dto.id = 'many_fields_id';
      dto.name = 'Many Fields';
      dto.board_id = 'board_many';
      dto.is_active = true;
      dto.query_fields = Array.from({ length: 100 }, (_, i) => `field${i}`);
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.query_fields).toHaveLength(100);
    });
  });
});
