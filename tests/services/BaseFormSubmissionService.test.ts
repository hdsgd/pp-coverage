import { BaseFormSubmissionService } from '../../src/services/BaseFormSubmissionService';
import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';
import { FormSubmissionData, MondayFormMapping, MondayColumnType } from '../../src/dto/MondayFormMappingDto';
import { MondayItem } from '../../src/entities/MondayItem';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { Subscriber } from '../../src/entities/Subscriber';
import fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Criar uma classe concreta para testar a classe abstrata
class ConcreteFormSubmissionService extends BaseFormSubmissionService {
  async buildColumnValues(_formData: FormSubmissionData, _mapping: MondayFormMapping): Promise<Record<string, any>> {
    return { test: 'value' };
  }

  validateSpecificFields(_data: Record<string, any>): void {
    // Implementação vazia para testes
  }

  // Expor métodos protected para testes
  public testIsDev() { return this.isDev(); }
  public testExtractItemName(formData: FormSubmissionData, mapping: MondayFormMapping) {
    return this.extractItemName(formData, mapping);
  }
  public testGetValueByPath(obj: any, path: string) {
    return this.getValueByPath(obj, path);
  }
  public testGetColumnType(fieldName: string) {
    return this.getColumnType(fieldName);
  }
  public testSplitConnectBoardColumns(all: Record<string, any>) {
    return this.splitConnectBoardColumns(all);
  }
  public testNormalizeToStringArray(v: any) {
    return this.normalizeToStringArray(v);
  }
  public testFormatValueForMondayColumn(value: any, columnType: MondayColumnType) {
    return this.formatValueForMondayColumn(value, columnType);
  }
  public testFormatDateValue(value: any) {
    return this.formatDateValue(value);
  }
  public testFormatTagsValue(value: any) {
    return this.formatTagsValue(value);
  }
  public testFormatFileValue(value: any) {
    return this.formatFileValue(value);
  }
  public testFormatBoardRelationValue(value: any) {
    return this.formatBoardRelationValue(value);
  }
  public testFormatStatusValue(value: any) {
    return this.formatStatusValue(value);
  }
  public testFormatDropdownValue(value: any) {
    return this.formatDropdownValue(value);
  }
  public async testResolveConnectBoardColumns(connectColumnsRaw: Record<string, any>) {
    return this.resolveConnectBoardColumns(connectColumnsRaw);
  }
  public async testFindMondayItemBySearchTerm(term: string) {
    return this.findMondayItemBySearchTerm(term);
  }
  public async testResolvePeopleFromSubscribers(value: any) {
    return this.resolvePeopleFromSubscribers(value);
  }
  public async testCreateMondayItem(boardId: string, groupId: string, itemName: string, columnValues: Record<string, any>) {
    return this.createMondayItem(boardId, groupId, itemName, columnValues);
  }
  public async testSaveObjectLocally(obj: Record<string, any>, filenamePrefix: string) {
    return this.saveObjectLocally(obj, filenamePrefix);
  }
  public async testSavePreObjectLocally(obj: Record<string, any>, filenamePrefix: string) {
    return this.savePreObjectLocally(obj, filenamePrefix);
  }
  public async testSavePayloadLocally(payload: FormSubmissionData) {
    return this.savePayloadLocally(payload);
  }
  public async testProcessFileUpload(itemId: string, boardId: string, formData: FormSubmissionData) {
    return this.processFileUpload(itemId, boardId, formData);
  }
}

// Mocks
jest.mock('../../src/services/MondayService');
jest.mock('../../src/config/database');
jest.mock('fs');

describe('BaseFormSubmissionService', () => {
  let service: ConcreteFormSubmissionService;
  let mockMondayService: jest.Mocked<MondayService>;
  let mockSubscriberRepository: any;
  let mockMondayItemRepository: any;
  let mockMondayBoardRepository: any;

  beforeEach(() => {
    // Mock repositories
    mockSubscriberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockMondayItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockMondayBoardRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === Subscriber) return mockSubscriberRepository;
      if (entity === MondayItem) return mockMondayItemRepository;
      if (entity === MondayBoard) return mockMondayBoardRepository;
      return {};
    });

    // Create service instance
    service = new ConcreteFormSubmissionService();
    mockMondayService = (service as any).mondayService as jest.Mocked<MondayService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isDev', () => {
    it('should return true when NODE_ENV is development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = service.testIsDev();

      expect(result).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = service.testIsDev();

      expect(result).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });

    it('should return false when NODE_ENV is not set', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = service.testIsDev();

      expect(result).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('extractItemName', () => {
    it('should extract item name from form data using mapping', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { name: 'Test Item' },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };
      const mapping: MondayFormMapping = {
        board_id: '123',
        group_id: 'group1',
        item_name_field: 'data.name',
        column_mappings: [],
      };

      const result = service.testExtractItemName(formData, mapping);

      expect(result).toBe('Test Item');
    });

    it('should use default item name when field not found', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: {},
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };
      const mapping: MondayFormMapping = {
        board_id: '123',
        group_id: 'group1',
        item_name_field: 'data.name',
        default_item_name: 'Default Name',
        column_mappings: [],
      };

      const result = service.testExtractItemName(formData, mapping);

      expect(result).toBe('Default Name');
    });

    it('should use fallback when no default name provided', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: {},
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };
      const mapping: MondayFormMapping = {
        board_id: '123',
        group_id: 'group1',
        column_mappings: [],
      };

      const result = service.testExtractItemName(formData, mapping);

      expect(result).toBe('Formulário form1');
    });

    it('should handle non-string extracted values', () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { name: 123 },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };
      const mapping: MondayFormMapping = {
        board_id: '123',
        group_id: 'group1',
        item_name_field: 'data.name',
        default_item_name: 'Default',
        column_mappings: [],
      };

      const result = service.testExtractItemName(formData, mapping);

      expect(result).toBe('Default');
    });
  });

  describe('getValueByPath', () => {
    it('should get nested value using dot notation', () => {
      const obj = {
        data: {
          user: {
            name: 'John',
          },
        },
      };

      const result = service.testGetValueByPath(obj, 'data.user.name');

      expect(result).toBe('John');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { data: {} };

      const result = service.testGetValueByPath(obj, 'data.user.name');

      expect(result).toBeUndefined();
    });

    it('should handle single level path', () => {
      const obj = { name: 'Test' };

      const result = service.testGetValueByPath(obj, 'name');

      expect(result).toBe('Test');
    });

    it('should return undefined when intermediate value is null', () => {
      const obj = { data: null };

      const result = service.testGetValueByPath(obj, 'data.user.name');

      expect(result).toBeUndefined();
    });
  });

  describe('getColumnType', () => {
    it('should detect FILE type for file fields', () => {
      expect(service.testGetColumnType('enviar_arquivo')).toBe(MondayColumnType.FILE);
      expect(service.testGetColumnType('file_upload')).toBe(MondayColumnType.FILE);
    });

    it('should detect DATE type for date fields', () => {
      expect(service.testGetColumnType('data__inicio')).toBe(MondayColumnType.DATE);
      expect(service.testGetColumnType('date_created')).toBe(MondayColumnType.DATE);
    });

    it('should detect NUMBER type for numeric fields', () => {
      expect(service.testGetColumnType('n_mero_vendas')).toBe(MondayColumnType.NUMBER);
      expect(service.testGetColumnType('n_meros_total')).toBe(MondayColumnType.NUMBER);
    });

    it('should detect PEOPLE type for people fields', () => {
      expect(service.testGetColumnType('pessoas')).toBe(MondayColumnType.PEOPLE);
      expect(service.testGetColumnType('pessoas5__1')).toBe(MondayColumnType.PEOPLE);
    });

    it('should detect DROPDOWN type for dropdown fields', () => {
      expect(service.testGetColumnType('lista_suspensa')).toBe(MondayColumnType.DROPDOWN);
      expect(service.testGetColumnType('sele__o_m_ltipla')).toBe(MondayColumnType.DROPDOWN);
      expect(service.testGetColumnType('sele__o_individual')).toBe(MondayColumnType.DROPDOWN);
    });

    it('should detect TEXT type for connect board fields', () => {
      expect(service.testGetColumnType('conectar_quadros')).toBe(MondayColumnType.TEXT);
    });

    it('should detect TEXT type for lookup fields', () => {
      expect(service.testGetColumnType('lookup_value')).toBe(MondayColumnType.TEXT);
    });

    it('should default to TEXT type for unknown fields', () => {
      expect(service.testGetColumnType('some_random_field')).toBe(MondayColumnType.TEXT);
    });
  });

  describe('splitConnectBoardColumns', () => {
    it('should split connect board columns from base columns', () => {
      const all = {
        text_field: 'value1',
        conectar_quadros_1: 'board1',
        number_field: 42,
        conectar_quadros_2: 'board2',
      };

      const result = service.testSplitConnectBoardColumns(all);

      expect(result.baseColumns).toEqual({
        text_field: 'value1',
        number_field: 42,
      });
      expect(result.connectColumnsRaw).toEqual({
        conectar_quadros_1: 'board1',
        conectar_quadros_2: 'board2',
      });
    });

    it('should handle no connect board columns', () => {
      const all = {
        text_field: 'value1',
        number_field: 42,
      };

      const result = service.testSplitConnectBoardColumns(all);

      expect(result.baseColumns).toEqual(all);
      expect(result.connectColumnsRaw).toEqual({});
    });

    it('should handle empty object', () => {
      const result = service.testSplitConnectBoardColumns({});

      expect(result.baseColumns).toEqual({});
      expect(result.connectColumnsRaw).toEqual({});
    });
  });

  describe('normalizeToStringArray', () => {
    it('should normalize array to string array', () => {
      const result = service.testNormalizeToStringArray([1, 2, 'three']);

      expect(result).toEqual(['1', '2', 'three']);
    });

    it('should normalize string to single element array', () => {
      const result = service.testNormalizeToStringArray('test');

      expect(result).toEqual(['test']);
    });

    it('should return empty array for null', () => {
      const result = service.testNormalizeToStringArray(null);

      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = service.testNormalizeToStringArray(undefined);

      expect(result).toEqual([]);
    });

    it('should extract labels from object', () => {
      const result = service.testNormalizeToStringArray({ labels: ['a', 'b', 'c'] });

      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should extract ids from object', () => {
      const result = service.testNormalizeToStringArray({ ids: [1, 2, 3] });

      expect(result).toEqual(['1', '2', '3']);
    });

    it('should convert number to string array', () => {
      const result = service.testNormalizeToStringArray(42);

      expect(result).toEqual(['42']);
    });
  });

  describe('formatValueForMondayColumn', () => {
    it('should format TEXT value', () => {
      const result = service.testFormatValueForMondayColumn(123, MondayColumnType.TEXT);

      expect(result).toBe('123');
    });

    it('should format NUMBER value', () => {
      const result = service.testFormatValueForMondayColumn('42', MondayColumnType.NUMBER);

      expect(result).toBe(42);
    });

    it('should return undefined for invalid NUMBER', () => {
      const result = service.testFormatValueForMondayColumn('abc', MondayColumnType.NUMBER);

      expect(result).toBeUndefined();
    });

    it('should format CHECKBOX value', () => {
      const result = service.testFormatValueForMondayColumn(true, MondayColumnType.CHECKBOX);

      expect(result).toEqual({ checked: true });
    });

    it('should format PEOPLE value from array', () => {
      const result = service.testFormatValueForMondayColumn(['123', '456'], MondayColumnType.PEOPLE);

      expect(result).toEqual({
        personsAndTeams: [
          { id: '123', kind: 'person' },
          { id: '456', kind: 'person' },
        ],
      });
    });

    it('should format PEOPLE value from string', () => {
      const result = service.testFormatValueForMondayColumn('john@example.com', MondayColumnType.PEOPLE);

      expect(result).toEqual({
        personsAndTeams: [{ id: 'john@example.com', kind: 'person' }],
      });
    });

    it('should format PEOPLE value from object with personsAndTeams', () => {
      const result = service.testFormatValueForMondayColumn(
        { personsAndTeams: [{ id: '123' }, { id: '456' }] },
        MondayColumnType.PEOPLE
      );

      expect(result).toEqual({
        personsAndTeams: [
          { id: '123', kind: 'person' },
          { id: '456', kind: 'person' },
        ],
      });
    });

    it('should return undefined for PEOPLE value without valid format', () => {
      const result = service.testFormatValueForMondayColumn({ invalid: 'object' }, MondayColumnType.PEOPLE);

      expect(result).toBeUndefined();
    });

    it('should return undefined for null value', () => {
      const result = service.testFormatValueForMondayColumn(null, MondayColumnType.TEXT);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined value', () => {
      const result = service.testFormatValueForMondayColumn(undefined, MondayColumnType.TEXT);

      expect(result).toBeUndefined();
    });

    it('should format DATE value', () => {
      const result = service.testFormatValueForMondayColumn('25/12/2024', MondayColumnType.DATE);

      expect(result).toEqual({ date: '2024-12-25' });
    });

    it('should format STATUS value', () => {
      const result = service.testFormatValueForMondayColumn('Done', MondayColumnType.STATUS);

      expect(result).toEqual({ label: 'Done' });
    });

    it('should format DROPDOWN value', () => {
      const result = service.testFormatValueForMondayColumn(['High', 'Medium'], MondayColumnType.DROPDOWN);

      expect(result).toEqual({ labels: ['High', 'Medium'] });
    });

    it('should format TAGS value', () => {
      const result = service.testFormatValueForMondayColumn(['tag1', 'tag2'], MondayColumnType.TAGS);

      expect(result).toEqual({ tag_ids: ['tag1', 'tag2'] });
    });

    it('should format FILE value', () => {
      const result = service.testFormatValueForMondayColumn('file1', MondayColumnType.FILE);

      expect(result).toEqual({ file_ids: ['file1'] });
    });

    it('should format BOARD_RELATION value', () => {
      const result = service.testFormatValueForMondayColumn(123, MondayColumnType.BOARD_RELATION);

      expect(result).toEqual({ item_ids: [123] });
    });

    it('should handle unknown column type as text', () => {
      const result = service.testFormatValueForMondayColumn(123, 'unknown' as MondayColumnType);

      expect(result).toBe('123');
    });
  });

  describe('formatDateValue', () => {
    it('should format DD/MM/YYYY to YYYY-MM-DD', () => {
      const result = service.testFormatDateValue('25/12/2024');

      expect(result).toEqual({ date: '2024-12-25' });
    });

    it('should keep YYYY-MM-DD format', () => {
      const result = service.testFormatDateValue('2024-12-25');

      expect(result).toEqual({ date: '2024-12-25' });
    });

    it('should return raw value for other formats', () => {
      const result = service.testFormatDateValue('invalid-date');

      expect(result).toEqual({ date: 'invalid-date' });
    });
  });

  describe('formatTagsValue', () => {
    it('should format array of tags', () => {
      const result = service.testFormatTagsValue(['tag1', 'tag2']);

      expect(result).toEqual({ tag_ids: ['tag1', 'tag2'] });
    });

    it('should format single tag value', () => {
      const result = service.testFormatTagsValue('tag1');

      expect(result).toEqual({ tag_ids: ['tag1'] });
    });
  });

  describe('formatFileValue', () => {
    it('should return undefined for falsy value', () => {
      expect(service.testFormatFileValue(null)).toBeUndefined();
      expect(service.testFormatFileValue(undefined)).toBeUndefined();
      expect(service.testFormatFileValue('')).toBeUndefined();
    });

    it('should keep object with file_ids', () => {
      const result = service.testFormatFileValue({ file_ids: ['file1', 'file2'] });

      expect(result).toEqual({ file_ids: ['file1', 'file2'] });
    });

    it('should format string as file_ids array', () => {
      const result = service.testFormatFileValue('file1');

      expect(result).toEqual({ file_ids: ['file1'] });
    });

    it('should format array as file_ids', () => {
      const result = service.testFormatFileValue(['file1', 'file2']);

      expect(result).toEqual({ file_ids: ['file1', 'file2'] });
    });

    it('should return undefined for object without file_ids or url', () => {
      const result = service.testFormatFileValue({ invalid: 'object' });

      expect(result).toBeUndefined();
    });
  });

  describe('formatBoardRelationValue', () => {
    it('should return undefined for falsy value', () => {
      expect(service.testFormatBoardRelationValue(null)).toBeUndefined();
      expect(service.testFormatBoardRelationValue(undefined)).toBeUndefined();
    });

    it('should keep object with item_ids', () => {
      const result = service.testFormatBoardRelationValue({ item_ids: [123, 456] });

      expect(result).toEqual({ item_ids: [123, 456] });
    });

    it('should format string number as item_ids', () => {
      const result = service.testFormatBoardRelationValue('123');

      expect(result).toEqual({ item_ids: [123] });
    });

    it('should format number as item_ids', () => {
      const result = service.testFormatBoardRelationValue(123);

      expect(result).toEqual({ item_ids: [123] });
    });

    it('should format array as item_ids', () => {
      const result = service.testFormatBoardRelationValue([123, '456', 789]);

      expect(result).toEqual({ item_ids: [123, 456, 789] });
    });

    it('should filter out invalid numbers', () => {
      const result = service.testFormatBoardRelationValue(['123', 'abc', '456']);

      expect(result).toEqual({ item_ids: [123, 456] });
    });

    it('should return undefined for invalid string', () => {
      const result = service.testFormatBoardRelationValue('abc');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = service.testFormatBoardRelationValue([]);

      expect(result).toBeUndefined();
    });
  });

  describe('formatStatusValue', () => {
    it('should format numeric string as index', () => {
      const result = service.testFormatStatusValue('2');

      expect(result).toEqual({ index: 2 });
    });

    it('should format text as label', () => {
      const result = service.testFormatStatusValue('Done');

      expect(result).toEqual({ label: 'Done' });
    });

    it('should trim whitespace', () => {
      const result = service.testFormatStatusValue('  3  ');

      expect(result).toEqual({ index: 3 });
    });
  });

  describe('formatDropdownValue', () => {
    it('should format array of numbers as ids', () => {
      const result = service.testFormatDropdownValue([1, 2, 3]);

      expect(result).toEqual({ ids: [1, 2, 3] });
    });

    it('should format array of strings as labels', () => {
      const result = service.testFormatDropdownValue(['High', 'Medium']);

      expect(result).toEqual({ labels: ['High', 'Medium'] });
    });

    it('should format mixed array as labels', () => {
      const result = service.testFormatDropdownValue(['High', '2']);

      expect(result).toEqual({ labels: ['High', '2'] });
    });

    it('should format single value', () => {
      const result = service.testFormatDropdownValue('High');

      expect(result).toEqual({ labels: ['High'] });
    });

    it('should return undefined for empty array', () => {
      const result = service.testFormatDropdownValue([]);

      expect(result).toBeUndefined();
    });

    it('should filter empty strings', () => {
      const result = service.testFormatDropdownValue(['High', '', 'Low']);

      expect(result).toEqual({ labels: ['High', 'Low'] });
    });
  });

  describe('findMondayItemBySearchTerm', () => {
    it('should find item by name', async () => {
      const mockItem = { id: '1', item_id: '101', name: 'Test Item' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockItem),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.testFindMondayItemBySearchTerm('Test Item');

      expect(result).toEqual(mockItem);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mi.name = :term', { term: 'Test Item' });
    });

    it('should return null when item not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.testFindMondayItemBySearchTerm('Nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockMondayItemRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await service.testFindMondayItemBySearchTerm('Test');

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('resolveConnectBoardColumns', () => {
    it('should keep item_ids when already provided', async () => {
      const connectColumns = {
        conectar_quadros_1: { item_ids: ['101', '102'] },
      };

      const result = await service.testResolveConnectBoardColumns(connectColumns);

      expect(result).toEqual({
        conectar_quadros_1: { item_ids: ['101', '102'] },
      });
    });

    it('should resolve item IDs from names', async () => {
      const connectColumns = {
        conectar_quadros_1: 'Item Name',
      };

      const mockItem = { id: '1', item_id: '101' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockItem),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.testResolveConnectBoardColumns(connectColumns);

      expect(result).toEqual({
        conectar_quadros_1: { item_ids: ['101'] },
      });
    });

    it('should handle numeric IDs directly', async () => {
      const connectColumns = {
        conectar_quadros_1: ['101', '102'],
      };

      const result = await service.testResolveConnectBoardColumns(connectColumns);

      expect(result).toEqual({
        conectar_quadros_1: { item_ids: ['101', '102'] },
      });
    });

    it('should filter empty strings from array', async () => {
      const connectColumns = {
        conectar_quadros_1: ['101', '', '  ', '102'],
      };

      const result = await service.testResolveConnectBoardColumns(connectColumns);

      expect(result).toEqual({
        conectar_quadros_1: { item_ids: ['101', '102'] },
      });
    });

    it('should warn when item not found', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const connectColumns = {
        conectar_quadros_1: 'Unknown Item',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockMondayItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.testResolveConnectBoardColumns(connectColumns);

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('resolvePeopleFromSubscribers', () => {
    it('should resolve email to subscriber ID', async () => {
      mockSubscriberRepository.findOne.mockResolvedValue({ id: '123', email: 'test@example.com' });

      const result = await service.testResolvePeopleFromSubscribers('test@example.com');

      expect(result).toEqual({
        personsAndTeams: [{ id: '123', kind: 'person' }],
      });
    });

    it('should resolve multiple emails', async () => {
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'test1@example.com' })
        .mockResolvedValueOnce({ id: '456', email: 'test2@example.com' });

      const result = await service.testResolvePeopleFromSubscribers(['test1@example.com', 'test2@example.com']);

      expect(result).toEqual({
        personsAndTeams: [
          { id: '123', kind: 'person' },
          { id: '456', kind: 'person' },
        ],
      });
    });

    it('should warn when subscriber not found', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSubscriberRepository.findOne.mockResolvedValue(null);

      const result = await service.testResolvePeopleFromSubscribers('unknown@example.com');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Subscriber não encontrado para email: unknown@example.com');
      consoleWarnSpy.mockRestore();
    });

    it('should handle mixed found and not found subscribers', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'found@example.com' })
        .mockResolvedValueOnce(null);

      const result = await service.testResolvePeopleFromSubscribers(['found@example.com', 'notfound@example.com']);

      expect(result).toEqual({
        personsAndTeams: [{ id: '123', kind: 'person' }],
      });
      consoleWarnSpy.mockRestore();
    });
  });

  describe('createMondayItem', () => {
    it('should create item successfully', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'New Item',
            group: { id: 'group1' },
          },
        },
      });

      const result = await service.testCreateMondayItem('123', 'group1', 'New Item', { field1: 'value1' });

      expect(result).toBe('101');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle special characters in item name', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: {
          create_item: {
            id: '101',
            name: 'Item with "quotes"',
            group: { id: 'group1' },
          },
        },
      });

      const result = await service.testCreateMondayItem('123', 'group1', 'Item with "quotes"', {});

      expect(result).toBe('101');
    });

    it('should throw error when create_item returns no ID', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: null },
      });

      await expect(service.testCreateMondayItem('123', 'group1', 'Test', {}))
        .rejects.toThrow('Resposta inválida da Monday.com');
    });

    it('should throw error when API fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(service.testCreateMondayItem('123', 'group1', 'Test', {}))
        .rejects.toThrow('API Error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveObjectLocally', () => {
    it('should save object in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.testSaveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('form-submissions'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Objeto salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip saving in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await service.testSaveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle file system errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      await service.testSaveObjectLocally({ test: 'data' }, 'test_prefix');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar objeto localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('savePreObjectLocally', () => {
    it('should save pre-data in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.testSavePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('pre-data'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Pre-data salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await service.testSavePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      await service.testSavePreObjectLocally({ test: 'data' }, 'pre_test');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar pre-data localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('savePayloadLocally', () => {
    it('should save payload in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.testSavePayloadLocally({ id: 'payload1', data: {}, timestamp: '2024-01-01T00:00:00Z', formTitle: 'Test' });

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('form-submissions'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Payload salvo'));

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await service.testSavePayloadLocally({ id: 'payload1', data: {}, timestamp: '2024-01-01T00:00:00Z', formTitle: 'Test' });

      expect(mockMkdir).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Ambiente não-dev'));

      consoleDebugSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('FS Error'));

      await service.testSavePayloadLocally({ id: 'payload1', data: {}, timestamp: '2024-01-01T00:00:00Z', formTitle: 'Test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar payload localmente:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      mockMkdir.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should use default filename when id is missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const mockMkdir = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
      const mockWriteFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.testSavePayloadLocally({ id: '', data: {}, timestamp: '2024-01-01T00:00:00Z', formTitle: 'Test' });

      expect(mockWriteFile).toHaveBeenCalled();

      mockMkdir.mockRestore();
      mockWriteFile.mockRestore();
      consoleLogSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('processFileUpload', () => {
    it('should skip when no file field present', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: {},
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };

      await service.testProcessFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).not.toHaveBeenCalled();
    });

    it('should skip when file does not exist', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { enviar_arquivo__1: 'nonexistent.pdf' },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await service.testProcessFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      mockExistsSync.mockRestore();
    });

    it('should upload file and delete local copy', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { enviar_arquivo__1: 'test.pdf' },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockUnlinkSync = jest.spyOn(fs, 'unlinkSync').mockImplementation();
      mockMondayService.uploadFile.mockResolvedValue('file123');

      await service.testProcessFileUpload('101', '123', formData);

      expect(mockMondayService.uploadFile).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('enviado com sucesso'));

      consoleLogSpy.mockRestore();
      mockExistsSync.mockRestore();
      mockUnlinkSync.mockRestore();
    });

    it('should handle upload error gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { enviar_arquivo__1: 'test.pdf' },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      mockMondayService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await service.testProcessFileUpload('101', '123', formData);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao processar upload de arquivo:', expect.any(Error));

      consoleErrorSpy.mockRestore();
      mockExistsSync.mockRestore();
    });

    it('should handle file deletion error gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'form1',
        data: { enviar_arquivo__1: 'test.pdf' },
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test Form',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockUnlinkSync = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('Delete failed');
      });
      mockMondayService.uploadFile.mockResolvedValue('file123');

      await service.testProcessFileUpload('101', '123', formData);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao remover arquivo local'), expect.any(Error));

      consoleErrorSpy.mockRestore();
      mockExistsSync.mockRestore();
      mockUnlinkSync.mockRestore();
    });
  });
});
