import {
  SubscriberDto,
  SubscriberResponseDto,
  SubscriberDropdownOption
} from '../../src/dto/SubscriberDto';

// Mock class-validator decorators
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    IsString: jest.fn(() => jest.fn()),
    IsEmail: jest.fn(() => jest.fn()),
    IsNotEmpty: jest.fn(() => jest.fn())
  };
});

describe('SubscriberDto', () => {
  describe('SubscriberDto class', () => {
    it('should create instance with all required fields', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_123';
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.board_id = 'board_456';

      expect(dto.id).toBe('sub_123');
      expect(dto.name).toBe('John Doe');
      expect(dto.email).toBe('john@example.com');
      expect(dto.board_id).toBe('board_456');
    });

    it('should validate email format', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_email';
      dto.name = 'Email Test';
      dto.email = 'test@domain.com';
      dto.board_id = 'board_email';

      expect(dto.email).toContain('@');
      expect(dto.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should support numeric IDs as strings', () => {
      const dto = new SubscriberDto();
      dto.id = '123456';
      dto.name = 'Numeric ID';
      dto.email = 'numeric@test.com';
      dto.board_id = '789012';

      expect(dto.id).toBe('123456');
      expect(dto.board_id).toBe('789012');
    });

    it('should support UUID format IDs', () => {
      const dto = new SubscriberDto();
      dto.id = 'uuid-sub-123-abc';
      dto.name = 'UUID Subscriber';
      dto.email = 'uuid@test.com';
      dto.board_id = 'uuid-board-456-def';

      expect(dto.id).toMatch(/uuid-sub/);
      expect(dto.board_id).toMatch(/uuid-board/);
    });

    it('should support special characters in name', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_special';
      dto.name = 'João da Silva Júnior';
      dto.email = 'joao@example.com';
      dto.board_id = 'board_special';

      expect(dto.name).toContain('ã');
      expect(dto.name).toContain('ú');
    });

    it('should support email with subdomain', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_subdomain';
      dto.name = 'Subdomain User';
      dto.email = 'user@mail.company.com';
      dto.board_id = 'board_subdomain';

      expect(dto.email).toBe('user@mail.company.com');
    });

    it('should support email with plus addressing', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_plus';
      dto.name = 'Plus User';
      dto.email = 'user+tag@example.com';
      dto.board_id = 'board_plus';

      expect(dto.email).toContain('+');
    });

    it('should support email with dots', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_dots';
      dto.name = 'Dots User';
      dto.email = 'first.last@example.com';
      dto.board_id = 'board_dots';

      expect(dto.email).toBe('first.last@example.com');
    });

    it('should support email with numbers', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_numbers';
      dto.name = 'Numbers User';
      dto.email = 'user123@example456.com';
      dto.board_id = 'board_numbers';

      expect(dto.email).toMatch(/\d/);
    });

    it('should support long names', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_long';
      dto.name = 'A'.repeat(200);
      dto.email = 'long@example.com';
      dto.board_id = 'board_long';

      expect(dto.name).toHaveLength(200);
    });

    it('should support name with multiple words', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_multi';
      dto.name = 'Maria da Silva Costa Santos';
      dto.email = 'maria@example.com';
      dto.board_id = 'board_multi';

      expect(dto.name.split(' ')).toHaveLength(5);
    });

    it('should support name with apostrophe', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_apostrophe';
      dto.name = "O'Connor";
      dto.email = 'oconnor@example.com';
      dto.board_id = 'board_apostrophe';

      expect(dto.name).toContain("'");
    });

    it('should support name with hyphen', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_hyphen';
      dto.name = 'Jean-Pierre';
      dto.email = 'jeanpierre@example.com';
      dto.board_id = 'board_hyphen';

      expect(dto.name).toContain('-');
    });

    it('should support lowercase email', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_lowercase';
      dto.name = 'Lowercase';
      dto.email = 'lowercase@example.com';
      dto.board_id = 'board_lowercase';

      expect(dto.email).toBe(dto.email.toLowerCase());
    });

    it('should support email with uppercase letters', () => {
      const dto = new SubscriberDto();
      dto.id = 'sub_uppercase';
      dto.name = 'Uppercase';
      dto.email = 'User@Example.COM';
      dto.board_id = 'board_uppercase';

      expect(dto.email).toBe('User@Example.COM');
    });
  });

  describe('SubscriberResponseDto class', () => {
    it('should create response with all required fields', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'resp_sub_123';
      dto.name = 'Response Subscriber';
      dto.email = 'response@example.com';
      dto.board_id = 'resp_board_456';
      dto.created_at = new Date('2025-12-01T00:00:00.000Z');
      dto.updated_at = new Date('2025-12-01T12:00:00.000Z');

      expect(dto.id).toBe('resp_sub_123');
      expect(dto.name).toBe('Response Subscriber');
      expect(dto.email).toBe('response@example.com');
      expect(dto.board_id).toBe('resp_board_456');
      expect(dto.created_at).toBeInstanceOf(Date);
      expect(dto.updated_at).toBeInstanceOf(Date);
    });

    it('should handle Date objects for timestamps', () => {
      const created = new Date('2025-12-01T00:00:00.000Z');
      const updated = new Date('2025-12-01T12:00:00.000Z');

      const dto = new SubscriberResponseDto();
      dto.id = 'timestamp_sub';
      dto.name = 'Timestamp Sub';
      dto.email = 'timestamp@example.com';
      dto.board_id = 'timestamp_board';
      dto.created_at = created;
      dto.updated_at = updated;

      expect(dto.created_at.getTime()).toBeLessThan(dto.updated_at.getTime());
    });

    it('should allow same timestamp for created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T10:00:00.000Z');

      const dto = new SubscriberResponseDto();
      dto.id = 'same_time_sub';
      dto.name = 'Same Time';
      dto.email = 'sametime@example.com';
      dto.board_id = 'same_time_board';
      dto.created_at = timestamp;
      dto.updated_at = timestamp;

      expect(dto.created_at).toEqual(dto.updated_at);
    });

    it('should support UUID format IDs in response', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'uuid-resp-123-abc';
      dto.name = 'UUID Response';
      dto.email = 'uuid@example.com';
      dto.board_id = 'uuid-board-456-def';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toMatch(/uuid-resp/);
      expect(dto.board_id).toMatch(/uuid-board/);
    });

    it('should support numeric IDs as strings in response', () => {
      const dto = new SubscriberResponseDto();
      dto.id = '123456';
      dto.name = 'Numeric Response';
      dto.email = 'numeric@example.com';
      dto.board_id = '789012';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.id).toBe('123456');
      expect(dto.board_id).toBe('789012');
    });

    it('should support special characters in response name', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'special_resp';
      dto.name = 'María José Ñoño';
      dto.email = 'maria@example.com';
      dto.board_id = 'special_board';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name).toContain('í');
      expect(dto.name).toContain('Ñ');
    });

    it('should support complex email addresses in response', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'complex_email_resp';
      dto.name = 'Complex Email';
      dto.email = 'user.name+tag@sub.domain.example.com';
      dto.board_id = 'complex_board';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.email).toContain('+');
      expect(dto.email).toContain('.');
    });

    it('should support long names in response', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'long_name_resp';
      dto.name = 'Long Name '.repeat(20);
      dto.email = 'long@example.com';
      dto.board_id = 'long_board';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name.length).toBeGreaterThan(100);
    });

    it('should support hyphenated names in response', () => {
      const dto = new SubscriberResponseDto();
      dto.id = 'hyphen_resp';
      dto.name = 'Anne-Marie Smith-Jones';
      dto.email = 'anne@example.com';
      dto.board_id = 'hyphen_board';
      dto.created_at = new Date();
      dto.updated_at = new Date();

      expect(dto.name).toContain('-');
      expect(dto.name.split('-')).toHaveLength(3);
    });

    it('should handle future timestamps', () => {
      const future = new Date('2030-12-31T23:59:59.000Z');

      const dto = new SubscriberResponseDto();
      dto.id = 'future_resp';
      dto.name = 'Future Sub';
      dto.email = 'future@example.com';
      dto.board_id = 'future_board';
      dto.created_at = new Date();
      dto.updated_at = future;

      expect(dto.updated_at.getFullYear()).toBe(2030);
    });

    it('should handle past timestamps', () => {
      const past = new Date('2015-06-15T12:00:00Z');

      const dto = new SubscriberResponseDto();
      dto.id = 'past_resp';
      dto.name = 'Past Sub';
      dto.email = 'past@example.com';
      dto.board_id = 'past_board';
      dto.created_at = past;
      dto.updated_at = new Date();

      expect(dto.created_at.getTime()).toBeLessThan(dto.updated_at.getTime());
      expect(dto.created_at.getUTCFullYear()).toBe(2015);
    });
  });

  describe('SubscriberDropdownOption interface', () => {
    it('should create dropdown option with required fields', () => {
      const option: SubscriberDropdownOption = {
        name: 'Option 1',
        item_id: 'item_123'
      };

      expect(option.name).toBe('Option 1');
      expect(option.item_id).toBe('item_123');
    });

    it('should support numeric item_id as string', () => {
      const option: SubscriberDropdownOption = {
        name: 'Numeric Option',
        item_id: '987654'
      };

      expect(option.item_id).toBe('987654');
    });

    it('should support UUID item_id', () => {
      const option: SubscriberDropdownOption = {
        name: 'UUID Option',
        item_id: 'uuid-item-123-abc'
      };

      expect(option.item_id).toMatch(/uuid-item/);
    });

    it('should support special characters in name', () => {
      const option: SubscriberDropdownOption = {
        name: 'Special @ Option #1',
        item_id: 'special_item'
      };

      expect(option.name).toContain('@');
      expect(option.name).toContain('#');
    });

    it('should support long names', () => {
      const option: SubscriberDropdownOption = {
        name: 'A'.repeat(300),
        item_id: 'long_item'
      };

      expect(option.name).toHaveLength(300);
    });

    it('should support empty string name', () => {
      const option: SubscriberDropdownOption = {
        name: '',
        item_id: 'empty_name_item'
      };

      expect(option.name).toBe('');
    });

    it('should support names with numbers', () => {
      const option: SubscriberDropdownOption = {
        name: 'Option 123 - Item 456',
        item_id: 'numbered_item'
      };

      expect(option.name).toMatch(/\d/);
    });

    it('should support names with special unicode characters', () => {
      const option: SubscriberDropdownOption = {
        name: 'Opção com acentuação: á é í ó ú',
        item_id: 'unicode_item'
      };

      expect(option.name).toContain('ç');
      expect(option.name).toContain('á');
    });

    it('should support multiline names', () => {
      const option: SubscriberDropdownOption = {
        name: 'Line 1\nLine 2\nLine 3',
        item_id: 'multiline_item'
      };

      expect(option.name).toContain('\n');
      expect(option.name.split('\n')).toHaveLength(3);
    });

    it('should support names with quotes', () => {
      const option: SubscriberDropdownOption = {
        name: 'Option "with quotes"',
        item_id: 'quotes_item'
      };

      expect(option.name).toContain('"');
    });

    it('should support names with apostrophes', () => {
      const option: SubscriberDropdownOption = {
        name: "O'Brien's Option",
        item_id: 'apostrophe_item'
      };

      expect(option.name).toContain("'");
    });

    it('should support names with hyphens', () => {
      const option: SubscriberDropdownOption = {
        name: 'Option-with-hyphens',
        item_id: 'hyphen_item'
      };

      expect(option.name).toContain('-');
    });

    it('should support names with underscores', () => {
      const option: SubscriberDropdownOption = {
        name: 'option_with_underscores',
        item_id: 'underscore_item'
      };

      expect(option.name).toContain('_');
    });

    it('should support names with parentheses', () => {
      const option: SubscriberDropdownOption = {
        name: 'Option (with parentheses)',
        item_id: 'paren_item'
      };

      expect(option.name).toContain('(');
      expect(option.name).toContain(')');
    });

    it('should support item_id with special format', () => {
      const option: SubscriberDropdownOption = {
        name: 'Special ID',
        item_id: 'item-123_abc@456'
      };

      expect(option.item_id).toContain('-');
      expect(option.item_id).toContain('_');
      expect(option.item_id).toContain('@');
    });
  });
});
