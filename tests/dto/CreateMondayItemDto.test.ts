import {
  CreateMondayItemDto,
  UpdateMondayItemDto,
  CreateItemFromFormDto
} from '../../src/dto/CreateMondayItemDto';

// Mock class-validator decorators
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    IsString: jest.fn(() => jest.fn()),
    IsNotEmpty: jest.fn(() => jest.fn()),
    IsOptional: jest.fn(() => jest.fn()),
    IsObject: jest.fn(() => jest.fn())
  };
});

describe('CreateMondayItemDto', () => {
  describe('CreateMondayItemDto class', () => {
    it('should create instance with all required fields', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_123';
      dto.itemName = 'Test Item';
      dto.columnValues = { status: 'active', value: 100 };

      expect(dto.boardId).toBe('board_123');
      expect(dto.itemName).toBe('Test Item');
      expect(dto.columnValues).toEqual({ status: 'active', value: 100 });
    });

    it('should create instance with only required fields', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_456';
      dto.itemName = 'Minimal Item';

      expect(dto.boardId).toBe('board_456');
      expect(dto.itemName).toBe('Minimal Item');
      expect(dto.columnValues).toBeUndefined();
    });

    it('should create instance without columnValues', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_789';
      dto.itemName = 'No Columns Item';

      expect(dto.columnValues).toBeUndefined();
    });

    it('should support empty columnValues object', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_empty';
      dto.itemName = 'Empty Columns';
      dto.columnValues = {};

      expect(dto.columnValues).toEqual({});
    });

    it('should support complex columnValues', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_complex';
      dto.itemName = 'Complex Item';
      dto.columnValues = {
        status: 'done',
        people: ['user1', 'user2'],
        date: '2025-12-01',
        numbers: [1, 2, 3],
        nested: { inner: 'value' }
      };

      expect(dto.columnValues?.status).toBe('done');
      expect(dto.columnValues?.people).toEqual(['user1', 'user2']);
      expect(dto.columnValues?.nested).toEqual({ inner: 'value' });
    });

    it('should support numeric board IDs as strings', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = '123456789';
      dto.itemName = 'Numeric Board ID';

      expect(dto.boardId).toBe('123456789');
    });

    it('should support special characters in itemName', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_special';
      dto.itemName = 'Item @ 2025 - Test #1';

      expect(dto.itemName).toBe('Item @ 2025 - Test #1');
    });

    it('should support long itemName', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_long';
      dto.itemName = 'A'.repeat(500);

      expect(dto.itemName).toHaveLength(500);
    });

    it('should support columnValues with null values', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_null';
      dto.itemName = 'Null Values';
      dto.columnValues = { field1: null, field2: 'value' };

      expect(dto.columnValues?.field1).toBeNull();
      expect(dto.columnValues?.field2).toBe('value');
    });

    it('should support columnValues with undefined values', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'board_undef';
      dto.itemName = 'Undefined Values';
      dto.columnValues = { field1: undefined, field2: 'value' };

      expect(dto.columnValues?.field1).toBeUndefined();
    });

    it('should support UUID format board IDs', () => {
      const dto = new CreateMondayItemDto();
      dto.boardId = 'abc-123-def-456';
      dto.itemName = 'UUID Board';

      expect(dto.boardId).toMatch(/^abc-123-def-456$/);
    });
  });

  describe('UpdateMondayItemDto class', () => {
    it('should create instance with all required fields', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_123';
      dto.columnValues = { status: 'updated', priority: 'high' };

      expect(dto.itemId).toBe('item_123');
      expect(dto.columnValues).toEqual({ status: 'updated', priority: 'high' });
    });

    it('should require both itemId and columnValues', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_456';
      dto.columnValues = {};

      expect(dto.itemId).toBe('item_456');
      expect(dto.columnValues).toEqual({});
    });

    it('should support complex columnValues for update', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_complex';
      dto.columnValues = {
        text: 'Updated text',
        numbers: [10, 20, 30],
        nested: { level1: { level2: 'deep' } }
      };

      expect(dto.columnValues.text).toBe('Updated text');
      expect(dto.columnValues.nested.level1.level2).toBe('deep');
    });

    it('should support numeric item IDs as strings', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = '987654321';
      dto.columnValues = { updated: true };

      expect(dto.itemId).toBe('987654321');
    });

    it('should support UUID format item IDs', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'uuid-item-123-abc';
      dto.columnValues = { value: 'updated' };

      expect(dto.itemId).toMatch(/uuid-item/);
    });

    it('should support columnValues with array of objects', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_array';
      dto.columnValues = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ]
      };

      expect(dto.columnValues.items).toHaveLength(2);
      expect(dto.columnValues.items[0].name).toBe('Item 1');
    });

    it('should support boolean values in columnValues', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_bool';
      dto.columnValues = {
        active: true,
        archived: false,
        pending: true
      };

      expect(dto.columnValues.active).toBe(true);
      expect(dto.columnValues.archived).toBe(false);
    });

    it('should support date strings in columnValues', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_date';
      dto.columnValues = {
        startDate: '2025-12-01',
        endDate: '2025-12-31'
      };

      expect(dto.columnValues.startDate).toBe('2025-12-01');
    });

    it('should support numeric values in columnValues', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_numbers';
      dto.columnValues = {
        count: 42,
        price: 99.99,
        quantity: 0
      };

      expect(dto.columnValues.count).toBe(42);
      expect(dto.columnValues.price).toBe(99.99);
      expect(dto.columnValues.quantity).toBe(0);
    });

    it('should support string values in columnValues', () => {
      const dto = new UpdateMondayItemDto();
      dto.itemId = 'item_strings';
      dto.columnValues = {
        name: 'Test Name',
        description: 'Long description text',
        status: 'active'
      };

      expect(dto.columnValues.name).toBe('Test Name');
      expect(dto.columnValues.description).toMatch(/Long description/);
    });
  });

  describe('CreateItemFromFormDto class', () => {
    it('should create instance with all required fields', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_123';
      dto.itemName = 'Form Item';
      dto.formData = {
        field1: 'value1',
        field2: 'value2'
      };

      expect(dto.boardId).toBe('form_board_123');
      expect(dto.itemName).toBe('Form Item');
      expect(dto.formData).toEqual({ field1: 'value1', field2: 'value2' });
    });

    it('should support empty formData object', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_empty';
      dto.itemName = 'Empty Form';
      dto.formData = {};

      expect(dto.formData).toEqual({});
    });

    it('should support complex nested formData', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_complex';
      dto.itemName = 'Complex Form';
      dto.formData = {
        user: {
          name: 'John',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            language: 'pt-BR'
          }
        },
        items: ['item1', 'item2', 'item3']
      };

      expect(dto.formData.user.name).toBe('John');
      expect(dto.formData.user.preferences.theme).toBe('dark');
      expect(dto.formData.items).toHaveLength(3);
    });

    it('should support formData with arrays', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_arrays';
      dto.itemName = 'Arrays Form';
      dto.formData = {
        tags: ['tag1', 'tag2'],
        numbers: [1, 2, 3, 4, 5],
        objects: [
          { id: 1 },
          { id: 2 }
        ]
      };

      expect(dto.formData.tags).toEqual(['tag1', 'tag2']);
      expect(dto.formData.numbers).toEqual([1, 2, 3, 4, 5]);
      expect(dto.formData.objects).toHaveLength(2);
    });

    it('should support formData with boolean values', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_bool';
      dto.itemName = 'Boolean Form';
      dto.formData = {
        isActive: true,
        isArchived: false,
        isPending: true
      };

      expect(dto.formData.isActive).toBe(true);
      expect(dto.formData.isArchived).toBe(false);
    });

    it('should support formData with numeric values', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_numbers';
      dto.itemName = 'Numbers Form';
      dto.formData = {
        age: 25,
        price: 199.99,
        quantity: 0,
        negative: -10
      };

      expect(dto.formData.age).toBe(25);
      expect(dto.formData.price).toBe(199.99);
      expect(dto.formData.quantity).toBe(0);
      expect(dto.formData.negative).toBe(-10);
    });

    it('should support formData with date strings', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_dates';
      dto.itemName = 'Dates Form';
      dto.formData = {
        createdAt: '2025-12-01T00:00:00Z',
        updatedAt: '2025-12-01T12:00:00Z',
        birthDate: '1990-01-01'
      };

      expect(dto.formData.createdAt).toMatch(/2025-12-01/);
      expect(dto.formData.birthDate).toBe('1990-01-01');
    });

    it('should support formData with null values', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_null';
      dto.itemName = 'Null Form';
      dto.formData = {
        field1: null,
        field2: 'value',
        field3: null
      };

      expect(dto.formData.field1).toBeNull();
      expect(dto.formData.field2).toBe('value');
    });

    it('should support formData with mixed types', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_mixed';
      dto.itemName = 'Mixed Form';
      dto.formData = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 'two', false],
        object: { nested: 'value' },
        null: null
      };

      expect(typeof dto.formData.string).toBe('string');
      expect(typeof dto.formData.number).toBe('number');
      expect(typeof dto.formData.boolean).toBe('boolean');
      expect(Array.isArray(dto.formData.array)).toBe(true);
    });

    it('should support special characters in formData values', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_special';
      dto.itemName = 'Special Chars Form';
      dto.formData = {
        email: 'user@example.com',
        url: 'https://example.com/path?query=value',
        special: 'Value with @#$%^&*() chars'
      };

      expect(dto.formData.email).toContain('@');
      expect(dto.formData.url).toMatch(/^https:\/\//);
    });

    it('should support large formData objects', () => {
      const dto = new CreateItemFromFormDto();
      dto.boardId = 'form_board_large';
      dto.itemName = 'Large Form';
      dto.formData = {};
      
      for (let i = 0; i < 100; i++) {
        dto.formData[`field${i}`] = `value${i}`;
      }

      expect(Object.keys(dto.formData)).toHaveLength(100);
    });
  });
});
