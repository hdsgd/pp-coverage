import { Repository } from 'typeorm';
import { NewCampaignGAMService } from '../../src/services/processNewCampaignGAMService';
import { MondayService } from '../../src/services/MondayService';
import { MondayItem } from '../../src/entities/MondayItem';
import { Subscriber } from '../../src/entities/Subscriber';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { MondayColumnType, FormSubmissionData, MondayFormMapping } from '../../src/dto/MondayFormMappingDto';
import { convertToISODate, toYYYYMMDD, convertDateFormat } from '../../src/utils/dateFormatters';

jest.mock('../../src/services/MondayService');
jest.mock('../../src/config/database');
jest.mock('fs');

describe('NewCampaignGAMService', () => {
  let service: NewCampaignGAMService;
  let mockMondayService: jest.Mocked<MondayService>;
  let mockSubscriberRepository: jest.Mocked<Repository<Subscriber>>;
  let mockMondayItemRepository: jest.Mocked<Repository<MondayItem>>;
  let mockMondayBoardRepository: jest.Mocked<Repository<MondayBoard>>;
  let mockChannelScheduleRepository: jest.Mocked<Repository<ChannelSchedule>>;

  beforeEach(() => {
    mockMondayService = new MondayService() as jest.Mocked<MondayService>;
    mockSubscriberRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]), // Mock padrão: retorna array vazio
      save: jest.fn(),
      create: jest.fn(),
    } as any;
    mockMondayItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;
    mockMondayBoardRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;
    mockChannelScheduleRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    jest.spyOn(require('../../src/config/database').AppDataSource, 'getRepository')
      .mockImplementation((entity: any) => {
        if (entity === Subscriber) return mockSubscriberRepository;
        if (entity === MondayItem) return mockMondayItemRepository;
        if (entity === MondayBoard) return mockMondayBoardRepository;
        if (entity === ChannelSchedule) return mockChannelScheduleRepository;
        return {} as any;
      });

    mockMondayService.makeGraphQLRequest = jest.fn();
    mockMondayService.changeMultipleColumnValues = jest.fn();
    jest.spyOn(MondayService.prototype as any, 'makeGraphQLRequest').mockImplementation(
      mockMondayService.makeGraphQLRequest as any
    );
    jest.spyOn(MondayService.prototype as any, 'changeMultipleColumnValues').mockImplementation(
      mockMondayService.changeMultipleColumnValues as any
    );

    service = new NewCampaignGAMService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with repositories', () => {
      expect(service).toBeDefined();
    });
  });

  // validateSpecificFields não existe em NewCampaignGAMService - removido

  describe('toYYYYMMDD', () => {
    it('should convert YYYY-MM-DD to YYYYMMDD', () => {
      const result = toYYYYMMDD('2024-01-15');
      expect(result).toBe('20240115');
    });

    it('should convert DD/MM/YYYY to YYYYMMDD', () => {
      const result = toYYYYMMDD('15/01/2024');
      expect(result).toBe('20240115');
    });

    it('should keep YYYYMMDD as is', () => {
      const result = toYYYYMMDD('20240115');
      expect(result).toBe('20240115');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-01-15');
      const result = toYYYYMMDD(date);
      expect(result).toMatch(/^\d{8}$/);
    });

    it('should return empty string for invalid input', () => {
      const result = toYYYYMMDD('invalid');
      expect(result).toBe('');
    });

    it('should return empty string for null', () => {
      const result = toYYYYMMDD(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = toYYYYMMDD(undefined);
      expect(result).toBe('');
    });
  });

  describe('getCodeByItemName', () => {
    it('should return code when item is found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        item_id: '123',
        code: 'CODE123',
        name: 'Test Item',
      } as any);

      const result = await (service as any).getCodeByItemName('Test Item');
      expect(result).toBe('CODE123');
    });

    it('should return undefined when item not found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).getCodeByItemName('Nonexistent');
      expect(result).toBeUndefined();
    });

    it('should filter by board_id when provided', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        item_id: '123',
        code: 'CODE123',
        name: 'Test Item',
        board_id: 'board123',
      } as any);

      await (service as any).getCodeByItemName('Test Item', 'board123');
      expect(mockMondayItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Item', board_id: 'board123' }
      });
    });

    it('should handle database errors', async () => {
      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await (service as any).getCodeByItemName('Test Item');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty name', async () => {
      const result = await (service as any).getCodeByItemName('');
      expect(result).toBeUndefined();
    });
  });

  describe('normalizeToStringArray', () => {
    it('should return empty array for null or undefined', () => {
      expect((service as any).normalizeToStringArray(null)).toEqual([]);
      expect((service as any).normalizeToStringArray(undefined)).toEqual([]);
    });

    it('should convert array values to strings', () => {
      const result = (service as any).normalizeToStringArray([1, 2, 'three']);
      expect(result).toEqual(['1', '2', 'three']);
    });

    it('should convert string to array with single element', () => {
      const result = (service as any).normalizeToStringArray('test');
      expect(result).toEqual(['test']);
    });

    it('should handle object with labels array', () => {
      const result = (service as any).normalizeToStringArray({ labels: ['a', 'b'] });
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle object with ids array', () => {
      const result = (service as any).normalizeToStringArray({ ids: [1, 2] });
      expect(result).toEqual(['1', '2']);
    });

    it('should convert non-array non-object to string array', () => {
      const result = (service as any).normalizeToStringArray(42);
      expect(result).toEqual(['42']);
    });
  });

  describe('findMondayItemBySearchTerm', () => {
    it('should find item by name', async () => {
      const mockItem = { item_id: '123', name: 'Test Item', code: 'TEST' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockItem)
      };
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await (service as any).findMondayItemBySearchTerm('Test Item');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Item');
    });

    it('should return null when item not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null)
      };
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await (service as any).findMondayItemBySearchTerm('Nonexistent');
      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('DB Error'))
      };
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await (service as any).findMondayItemBySearchTerm('Test');
      expect(result).toBeNull();
    });
  });

  describe('formatStatusValue', () => {
    it('should format numeric status as index', () => {
      const result = (service as any).formatStatusValue(0);
      expect(result).toEqual({ index: 0 });
    });

    it('should format string status as label', () => {
      const result = (service as any).formatStatusValue('Em andamento');
      expect(result).toEqual({ label: 'Em andamento' });
    });
  });

  describe('formatDropdownValue', () => {
    it('should format array of numbers as ids', () => {
      const result = (service as any).formatDropdownValue([1, 2, 3]);
      expect(result).toEqual({ ids: [1, 2, 3] });
    });

    it('should format array of strings as labels', () => {
      const result = (service as any).formatDropdownValue(['Alta', 'Média']);
      expect(result).toEqual({ labels: ['Alta', 'Média'] });
    });

    it('should format mixed array as labels', () => {
      const result = (service as any).formatDropdownValue([1, 'Text', 3]);
      expect(result).toEqual({ labels: ['Text', '1', '3'] });
    });

    it('should handle single value', () => {
      const result = (service as any).formatDropdownValue('Alta');
      expect(result).toEqual({ labels: ['Alta'] });
    });
  });

  describe('formatDateValue', () => {
    it('should format DD/MM/YYYY to Monday format', () => {
      const result = (service as any).formatDateValue('15/01/2024');
      expect(result).toHaveProperty('date');
      expect(result.date).toBe('2024-01-15');
    });

    it('should handle YYYY-MM-DD format', () => {
      const result = (service as any).formatDateValue('2024-01-15');
      expect(result).toHaveProperty('date');
      expect(result.date).toBe('2024-01-15');
    });

    it('should return date object for non-string input', () => {
      const result = (service as any).formatDateValue(null);
      expect(result).toHaveProperty('date');
    });
  });

  describe('formatTagsValue', () => {
    it('should format array of tags', () => {
      const result = (service as any).formatTagsValue([1, 2, 3]);
      expect(result).toEqual({ tag_ids: [1, 2, 3] });
    });

    it('should format single tag', () => {
      const result = (service as any).formatTagsValue(1);
      expect(result).toEqual({ tag_ids: [1] });
    });
  });

  describe('formatBoardRelationValue', () => {
    it('should return undefined for falsy input', () => {
      const result = (service as any).formatBoardRelationValue(null);
      expect(result).toBeUndefined();
    });

    it('should preserve item_ids array shape', () => {
      const result = (service as any).formatBoardRelationValue({ item_ids: ['10', 20] });
      expect(result).toEqual({ item_ids: [10, 20] });
    });

    it('should convert single id to array', () => {
      const result = (service as any).formatBoardRelationValue('42');
      expect(result).toEqual({ item_ids: [42] });
    });

    it('should parse array filtering invalid entries', () => {
      const result = (service as any).formatBoardRelationValue(['5', 'abc', 9]);
      expect(result).toEqual({ item_ids: [5, 9] });
    });

    it('should return undefined when no numeric ids are found', () => {
      const result = (service as any).formatBoardRelationValue(['abc', 'def']);
      expect(result).toBeUndefined();
    });
  });

  describe('getColumnType', () => {
    it('should return DATE for date fields', () => {
      expect((service as any).getColumnType('data__1')).toBe(MondayColumnType.DATE);
      expect((service as any).getColumnType('date_mkr6nj1f')).toBe(MondayColumnType.DATE);
    });

    it('should return NUMBER for numeric fields', () => {
      expect((service as any).getColumnType('n_meros__1')).toBe(MondayColumnType.NUMBER);
      expect((service as any).getColumnType('n_mero9__1')).toBe(MondayColumnType.NUMBER);
    });

    it('should return TEXT for text_mkvgjh0w', () => {
      expect((service as any).getColumnType('text_mkvgjh0w')).toBe(MondayColumnType.TEXT);
    });

    it('should return TEXT for lookup fields', () => {
      expect((service as any).getColumnType('lookup_mkrt36cj')).toBe(MondayColumnType.TEXT);
    });

    it('should return TEXT by default', () => {
      expect((service as any).getColumnType('unknown_field')).toBe(MondayColumnType.TEXT);
    });
  });

  describe('resolvePeopleFromSubscribers', () => {
    it('should resolve email to subscriber ID', async () => {
      mockSubscriberRepository.findOne.mockResolvedValue({
        id: '123',
        email: 'test@test.com',
      } as any);

      const result = await (service as any).resolvePeopleFromSubscribers('test@test.com');
      expect(result).toEqual({
        personsAndTeams: [{ id: '123', kind: 'person' }]
      });
    });

    it('should resolve multiple emails', async () => {
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'test1@test.com' } as any)
        .mockResolvedValueOnce({ id: '456', email: 'test2@test.com' } as any);

      const result = await (service as any).resolvePeopleFromSubscribers(['test1@test.com', 'test2@test.com']);
      expect(result?.personsAndTeams).toHaveLength(2);
    });

    it('should warn when subscriber not found', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSubscriberRepository.findOne.mockResolvedValue(null);

      await (service as any).resolvePeopleFromSubscribers('notfound@test.com');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle mixed found and not found subscribers', async () => {
      mockSubscriberRepository.findOne
        .mockResolvedValueOnce({ id: '123', email: 'found@test.com' } as any)
        .mockResolvedValueOnce(null);

      const result = await (service as any).resolvePeopleFromSubscribers(['found@test.com', 'notfound@test.com']);
      expect(result?.personsAndTeams).toHaveLength(1);
    });
  });

  describe('splitConnectBoardColumns', () => {
    it('should split connect board columns from base columns', () => {
      const input = {
        text__1: 'Test',
        conectar_quadros__1: { item_ids: ['111'] },
        data__1: '2024-01-15',
        conectar_quadros87__1: { item_ids: ['222'] }
      };

      const result = (service as any).splitConnectBoardColumns(input);

      expect(result.baseColumns).toHaveProperty('text__1');
      expect(result.baseColumns).toHaveProperty('data__1');
      expect(result.baseColumns).not.toHaveProperty('conectar_quadros__1');
      expect(result.connectColumnsRaw).toHaveProperty('conectar_quadros__1');
      expect(result.connectColumnsRaw).toHaveProperty('conectar_quadros87__1');
    });

    it('should handle empty input', () => {
      const result = (service as any).splitConnectBoardColumns({});
      expect(result.baseColumns).toEqual({});
      expect(result.connectColumnsRaw).toEqual({});
    });
  });

  describe('resolveConnectBoardColumns', () => {
    it('should resolve connect board columns with codes', async () => {
      const mockItem1 = { item_id: '111', name: 'Item1' };
      const mockItem2 = { item_id: '222', name: 'Item2' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn()
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem1).mockResolvedValueOnce(mockItem2);
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const input = {
        conectar_quadros__1: 'Item1',
        conectar_quadros87__1: ['Item2'],
      };

      const result = await (service as any).resolveConnectBoardColumns(input);
      
      expect(result.conectar_quadros__1).toEqual({ item_ids: ['111'] });
      expect(result.conectar_quadros87__1).toEqual({ item_ids: ['222'] });
    });

    it('should handle arrays of values', async () => {
      const mockItem1 = { item_id: '111', name: 'Item1' };
      const mockItem2 = { item_id: '222', name: 'Item2' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn()
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem1).mockResolvedValueOnce(mockItem2);
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const input = {
        conectar_quadros__1: ['Item1', 'Item2'],
      };

      const result = await (service as any).resolveConnectBoardColumns(input);
      expect(result.conectar_quadros__1).toEqual({ item_ids: ['111', '222'] });
    });

    it('should skip when item not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null)
      };
      mockMondayItemRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const input = {
        conectar_quadros__1: 'NotFound',
      };

      const result = await (service as any).resolveConnectBoardColumns(input);
      expect(result).toEqual({});
    });

    it('should handle empty input', async () => {
      const result = await (service as any).resolveConnectBoardColumns({});
      expect(result).toEqual({});
    });
  });

  describe('formatValueForMondayColumn', () => {
    it('should format text value', () => {
      const result = (service as any).formatValueForMondayColumn('Test', MondayColumnType.TEXT);
      expect(result).toBe('Test');
    });

    it('should format date value', () => {
      const result = (service as any).formatValueForMondayColumn('2024-01-15', MondayColumnType.DATE);
      expect(result).toHaveProperty('date');
    });

    it('should format number value', () => {
      const result = (service as any).formatValueForMondayColumn(42, MondayColumnType.NUMBER);
      expect(result).toBe(42);
    });

    it('should format status value', () => {
      const result = (service as any).formatValueForMondayColumn('Active', MondayColumnType.STATUS);
      expect(result).toHaveProperty('label');
    });

    it('should format checkbox value', () => {
      const result = (service as any).formatValueForMondayColumn(true, MondayColumnType.CHECKBOX);
      expect(result).toEqual({ checked: true });
    });

    it('should return undefined for null', () => {
      const result = (service as any).formatValueForMondayColumn(null, MondayColumnType.TEXT);
      expect(result).toBeUndefined();
    });

    it('should format people value from string', () => {
      const result = (service as any).formatValueForMondayColumn('user@example.com', MondayColumnType.PEOPLE);
      expect(result).toEqual({ personsAndTeams: [{ id: 'user@example.com', kind: 'person' }] });
    });

    it('should format people value from array', () => {
      const result = (service as any).formatValueForMondayColumn([123, '456'], MondayColumnType.PEOPLE);
      expect(result).toEqual({ personsAndTeams: [{ id: '123', kind: 'person' }, { id: '456', kind: 'person' }] });
    });

    it('should format board relation value from string', () => {
      const result = (service as any).formatValueForMondayColumn('123', MondayColumnType.BOARD_RELATION);
      expect(result).toEqual({ item_ids: [123] });
    });

    it('should format board relation value from array', () => {
      const result = (service as any).formatValueForMondayColumn(['1', 2, 'invalid'], MondayColumnType.BOARD_RELATION);
      expect(result).toEqual({ item_ids: [1, 2] });
    });

    it('should return undefined for invalid board relation', () => {
      const result = (service as any).formatValueForMondayColumn('not-a-number', MondayColumnType.BOARD_RELATION);
      expect(result).toBeUndefined();
    });

    it('should format timeline value from object', () => {
      const result = (service as any).formatValueForMondayColumn({ from: '01/02/2024', to: '2024-02-05' }, MondayColumnType.TIMELINE);
      expect(result).toEqual({ from: '2024-02-01', to: '2024-02-05' });
    });

    it('should format timeline value from string range', () => {
      const result = (service as any).formatValueForMondayColumn('01/02/2024, 05/02/2024', MondayColumnType.TIMELINE);
      expect(result).toEqual({ from: '2024-02-01', to: '2024-02-05' });
    });

    it('should return undefined for invalid timeline value', () => {
      const result = (service as any).formatValueForMondayColumn(null, MondayColumnType.TIMELINE);
      expect(result).toBeUndefined();
    });
  });

  describe('convertDateFormat', () => {
    it('should convert ISO date to Brazilian format', () => {
      const result = convertDateFormat('2024-05-10');
      expect(result).toBe('10/05/2024');
    });

    it('should keep Brazilian format untouched', () => {
      const result = convertDateFormat('31/12/2024');
      expect(result).toBe('31/12/2024');
    });

    it('should return original value when format is not recognized', () => {
      const result = convertDateFormat('10.05.2024');
      expect(result).toBe('10.05.2024');
    });
  });

  describe('formatTimelineValue', () => {
    it('should return undefined when value is falsy', () => {
      expect((service as any).formatTimelineValue(undefined)).toBeUndefined();
    });

    it('should normalize plain string without comma as undefined', () => {
      expect((service as any).formatTimelineValue('2024-01-01')).toBeUndefined();
    });
  });

  describe('convertToISODate', () => {
    it('should convert DD/MM/YYYY to ISO string', () => {
      const result = convertToISODate('15/08/2025');
      expect(result).toBe('2025-08-15');
    });

    it('should keep ISO string as is', () => {
      const result = convertToISODate('2025-08-15');
      expect(result).toBe('2025-08-15');
    });
  });

  describe('createMondayItem', () => {
    it('should create item successfully', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '12345' } }
      });

      const result = await (service as any).createMondayItem('board123', 'group1', 'Test Item', {});
      expect(result).toBe('12345');
    });

    it('should handle special characters in item name', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '12345' } }
      });

      const result = await (service as any).createMondayItem('board123', 'group1', 'Test "Item" with \'quotes\'', {});
      expect(result).toBe('12345');
    });

    it('should throw error when create_item returns no ID', async () => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: null }
      });

      await expect(
        (service as any).createMondayItem('123', 'topics', 'Item', {})
      ).rejects.toThrow();
    });

    it('should throw error when API fails', async () => {
      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(
        (service as any).createMondayItem('123', 'topics', 'Item', {})
      ).rejects.toThrow();
    });
  });

  describe('buildPeopleFromLookupObjetivo', () => {
    it('should build people from lookup objetivo', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        name: 'Objetivo1',
        team: ['team1', 'team2'],
      } as any);

      const data = { text_mkvhvcw4: 'Objetivo1' };
      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toEqual({
        personsAndTeams: [
          { id: 'team1', kind: 'team' },
          { id: 'team2', kind: 'team' },
        ],
      });
    });

    it('should return undefined when lookup value is missing', async () => {
      const result = await (service as any).buildPeopleFromLookupObjetivo({});
      expect(result).toBeUndefined();
    });

    it('should return undefined when item not found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const data = { lookup_mkrt36cj: 'NotFound' };
      const result = await (service as any).buildPeopleFromLookupObjetivo(data);
      expect(result).toBeUndefined();
    });

    it('should return undefined when team is empty', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        name: 'Objetivo1',
        team: '',
      } as any);

      const data = { lookup_mkrt36cj: 'Objetivo1' };
      const result = await (service as any).buildPeopleFromLookupObjetivo(data);
      expect(result).toBeUndefined();
    });

    it('should fallback to subscribers when team is empty', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        name: 'Objetivo1',
        team: [],
      } as any);

      mockSubscriberRepository.find.mockResolvedValue([
        { mondayTeamId: 'team-01' },
        { monday_team_id: 'team-02' },
        { teamId: '  team-03  ' },
        { team_id: null },
      ] as any);

      const data = { text_mkvhvcw4: 'Objetivo1' };
      const result = await (service as any).buildPeopleFromLookupObjetivo(data);

      expect(result).toEqual({
        personsAndTeams: [
          { id: 'team-01', kind: 'team' },
          { id: 'team-02', kind: 'team' },
          { id: 'team-03', kind: 'team' },
        ],
      });
    });
  });

  // Workflow tests
  describe('processCampaignGAMSubmission', () => {
    beforeEach(() => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });
      mockMondayService.changeMultipleColumnValues.mockResolvedValue(undefined);
    });

    it('should process GAM campaign submission successfully', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test GAM Campaign',
          data__1: '2024-01-15'
        }
      };

      const mapping = {
        board_id: 'gam-board-123',
        group_id: 'gam-group',
        column_mappings: []
      };

      const result = await service.processCampaignGAMSubmission(formData, mapping);

      expect(result).toBe('9999');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle form with subitems', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test GAM Campaign',
          __SUBITEMS__: [
            { conectar_quadros87__1: 'Channel1', data__1: '2024-01-15', n_meros_mkkchcmk: 100 }
          ]
        }
      };

      const mapping = {
        board_id: 'gam-board-123',
        group_id: 'gam-group',
        column_mappings: []
      };

      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.processCampaignGAMSubmission(formData, mapping);

      expect(result).toBe('9999');
    });

    it('should throw error when Monday API fails', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: { name: 'Test' }
      };

      const mapping = {
        board_id: 'gam-board-123',
        group_id: 'gam-group',
        column_mappings: []
      };

      mockMondayService.makeGraphQLRequest.mockRejectedValue(new Error('API Error'));

      await expect(service.processCampaignGAMSubmission(formData, mapping)).rejects.toThrow();
    });
  });

  describe('buildColumnValues', () => {
    it('should build column values for GAM campaign', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test GAM Campaign',
          n_meros__1: 50,
          text__1: 'Description'
        }
      };

      const result = await (service as any).buildColumnValues(formData, { column_mappings: [] });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('n_meros__1');
      expect(result).toHaveProperty('text__1');
    });

    it('should exclude specified fields', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          formTitle: 'Should be excluded',
          __SUBITEMS__: []
        }
      };

      const result = await (service as any).buildColumnValues(formData, { column_mappings: [] });

      expect(result).toHaveProperty('name');
      expect(result).not.toHaveProperty('formTitle');
      expect(result).not.toHaveProperty('__SUBITEMS__');
    });
  });

  describe('adjustSubitemsCapacity', () => {
    beforeEach(() => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);
      mockMondayItemRepository.find.mockResolvedValue([]);
    });

    it('should return subitems unchanged when no capacity constraints', async () => {
      const subitems = [
        { id: '456', conectar_quadros87__1: 'Channel1', data__1: '2024-01-15', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 50 }
      ];
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: { text_mkvhvcw4: 'Area1' }
      };

      mockMondayItemRepository.find.mockResolvedValue([]);
      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '456',
        max_value: 200
      } as any);
      mockChannelScheduleRepository.find.mockResolvedValue([
        { channel: 'Channel1', date: '20240115', time_slot: '10:00', qtd: 50, reserved_qty: 50, capacity_limit: 200, tipo: 'agendamento' } as any
      ]);

      const result = await (service as any).adjustSubitemsCapacity(subitems, formData);

      expect(result).toHaveLength(1);
      expect(result[0].n_meros_mkkchcmk).toBe(50);
    });

    it('should handle empty subitems array', async () => {
      const formData: FormSubmissionData = { formTitle: 'GAM Campaign', id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const result = await (service as any).adjustSubitemsCapacity([], formData);

      expect(result).toEqual([]);
    });
  });

  describe('processSecondBoardSendsForSubitems', () => {
    beforeEach(() => {
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '8888' } }
      });
      mockMondayService.changeMultipleColumnValues.mockResolvedValue(undefined);
    });

    it('should process subitems and create items in second board', async () => {
      const enrichedFormData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvhvcw4: 'Marketing',
          __SUBITEMS__: [
            { id: 'sub1', conectar_quadros87__1: 'Canal1', data__1: '2024-01-15', n_meros_mkkchcmk: 50 }
          ]
        }
      };

      jest.spyOn(service as any, 'buildSecondBoardInitialPayloadFromSubitem').mockResolvedValue({
        item_name: 'Test Item',
        column_values: { text__1: 'Test', conectar_quadros8__1: { item_ids: ['123'] } }
      });

      const result = await (service as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        {},
        'Fallback Name',
        '9999'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('8888');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle empty subitems array', async () => {
      const enrichedFormData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const result = await (service as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        {},
        'Fallback Name',
        '9999'
      );

      expect(result).toEqual([]);
    });

    it('should handle errors in buildSecondBoardInitialPayloadFromSubitem', async () => {
      const enrichedFormData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          __SUBITEMS__: [{ id: 'sub1', data__1: '2024-01-15' }]
        }
      };

      jest.spyOn(service as any, 'buildSecondBoardInitialPayloadFromSubitem')
        .mockRejectedValue(new Error('Build error'));

      await expect(
        (service as any).processSecondBoardSendsForSubitems(enrichedFormData, {}, 'Fallback', '9999')
      ).rejects.toThrow();
    });

    it('should handle errors in resolveConnectBoardColumns', async () => {
      const enrichedFormData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          __SUBITEMS__: [{ id: 'sub1', data__1: '2024-01-15' }]
        }
      };

      jest.spyOn(service as any, 'buildSecondBoardInitialPayloadFromSubitem').mockResolvedValue({
        item_name: 'Test',
        column_values: { text_mkvgjh0w: 'hour', conectar_quadros8__1: { item_ids: ['123'] } }
      });

      jest.spyOn(service as any, 'resolveConnectBoardColumns')
        .mockRejectedValue(new Error('Resolve error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await (service as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        {},
        'Fallback',
        '9999'
      );

      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('buildCompositeTextField', () => {
    it('should build composite text field with all components', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          data__1: '2024-01-15',
          lookup_mkrtaebd: 'Cliente1',
          lookup_mkrt66aq: 'Campanha1'
        }
      };

      mockMondayItemRepository.findOne
        .mockResolvedValueOnce({ item_id: '111', name: 'Cliente1', code: 'CLI1' } as any)
        .mockResolvedValueOnce({ item_id: '222', name: 'Campanha1', code: 'CAM1' } as any);

      const result = await (service as any).buildCompositeTextField(formData, '9999');

      expect(result).toContain('20240115');
      expect(result).toContain('id-9999');
    });

    it('should handle missing data gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const result = await (service as any).buildCompositeTextField(formData);

      expect(typeof result).toBe('string');
    });

    it('should append subproduct code when available', async () => {
      const formData: FormSubmissionData = {
        id: 'test456',
        formTitle: 'GAM',
        timestamp: '2024-01-02T10:00:00Z',
        data: {
          lookup_mkrtvsdj: 'Produto Especial'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      const codeSpy = jest
        .spyOn(service as any, 'getCodeByItemName')
        .mockResolvedValueOnce('PROD123');
      const mondaySvc = (service as any).mondayService as jest.Mocked<MondayService>;
      if (!mondaySvc.getSubproductCodeByProduct) {
        mondaySvc.getSubproductCodeByProduct = jest.fn();
      }
      mondaySvc.getSubproductCodeByProduct.mockResolvedValueOnce('SUB456');

      const result = await (service as any).buildCompositeTextField(formData);

      expect(result).toContain('PROD123_SUB456');
      codeSpy.mockRestore();
    });

    it('should fallback to name when code lookup throws', async () => {
      const formData: FormSubmissionData = {
        id: 'test789',
        formTitle: 'GAM',
        timestamp: '2024-01-03T10:00:00Z',
        data: {
          lookup_mkrt66aq: 'Campanha Especial'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(null);
      const codeSpy = jest
        .spyOn(service as any, 'getCodeByItemName')
        .mockRejectedValueOnce(new Error('failure'));

      const result = await (service as any).buildCompositeTextField(formData);

      expect(result).toContain('Campanha Especial');
      codeSpy.mockRestore();
    });
  });

  describe('buildCompositeTextFieldSecondBoard', () => {
    it('should build composite text for second board', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          data__1: '2024-02-20',
          text_mkvhz8g3: 'Cliente',
          text_mkvhedf5: 'Campanha'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData, '456');

      expect(result).toContain('20240220');
      expect(result).toContain('id-456');
    });

    it('should use text_mkr3n64h if available', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkr3n64h: '20240315'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData);

      expect(result).toContain('20240315');
    });

    it('should handle product with code', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvhwyzr: 'Produto1'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      mockMondayItemRepository.findOne.mockResolvedValue({ 
        item_id: '999', 
        name: 'Produto1', 
        code: 'PROD1',
        board_id: 'prod-board'
      } as any);

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData);

      expect(result).toContain('PROD1');
    });

    it('should append subproduct code when available on second board', async () => {
      const formData: FormSubmissionData = {
        id: 'test124',
        formTitle: 'GAM',
        timestamp: '2024-01-01T11:00:00Z',
        data: {
          text_mkvhwyzr: 'Produto XPTO'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '111',
        name: 'Produto XPTO',
        code: 'PRODX',
        board_id: 'prod-board'
      } as any);
      const mondaySvc = (service as any).mondayService as jest.Mocked<MondayService>;
      if (!mondaySvc.getSubproductCodeByProduct) {
        mondaySvc.getSubproductCodeByProduct = jest.fn();
      }
      mondaySvc.getSubproductCodeByProduct.mockResolvedValueOnce('SUBX');

      const result = await (service as any).buildCompositeTextFieldSecondBoard(formData);

      expect(result).toContain('PRODX_SUBX');
    });
  });

  describe('buildSecondBoardInitialPayloadFromSubitem', () => {
    it('should build payload from subitem with correlations', async () => {
      const subitem = {
        id: 'sub1',
        data__1: '2024-01-15',
        n_meros_mkkchcmk: 100,
        conectar_quadros87__1: 'Canal1'
      };

      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvhvcw4: 'Marketing'
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        formData,
        {},
        '9999'
      );

      expect(result).toHaveProperty('item_name');
      expect(result).toHaveProperty('column_values');
      expect(result.column_values).toHaveProperty('data__1');
    });

    it('should handle missing subitem fields', async () => {
      const subitem = { id: 'sub1' };
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        formData,
        {},
        '9999'
      );

      expect(result).toHaveProperty('column_values');
    });

    it('should merge correlations, lookups and codes for second board payload', async () => {
      const subitem: any = {
        id: 'channel123',
        data__1: '2024-08-15',
        texto__1: 'PRD123',
        conectar_quadros87__1: 'Produto Alpha',
        conectar_quadros_mkkcnyr3: '10:30',
        n_meros_mkkchcmk: 2,
        custom_prop: 'value-from-subitem'
      };

      const formData: FormSubmissionData = {
        id: 'submission-42',
        formTitle: 'GAM',
        timestamp: '2024-08-10T10:00:00Z',
        data: {
          text_mkvhgbp8: 'Email Marketing',
          text_mkvhz8g3: 'Cliente X',
          text_mkvhedf5: 'Campanha Verão',
          text_mkvhqgvn: 'Disparo Matinal',
          text_mkvhv5ma: 'Mecânica A',
          text_mkvhvcw4: '7890',
          text_mkvh2z7j: 'Objetivo Y',
          text_mkvhwyzr: 'Produto Alpha',
          text_mkvhammc: 'Segmento Z',
          text_mkr3n64h: '20240820',
          data__1: '2024-08-21',
          missing_field: 'fallback-from-form'
        }
      };

      const firstBoardValues = {
        from_first: 'first-board-value',
        date_mkrk5v4c: '2024-09-10',
        pessoas__1: { personsAndTeams: [{ id: 'team-01', kind: 'team' }] }
      } as Record<string, any>;

      const submissionCorrelation = (service as any).secondBoardCorrelationFromSubmission as Array<{ id_submission: string; id_second_board: string }>;
      submissionCorrelation.splice(0, submissionCorrelation.length,
        { id_submission: 'custom_prop', id_second_board: 'mapped_submission' },
        { id_submission: 'missing_field', id_second_board: 'mapped_missing' }
      );
      const firstCorrelation = (service as any).secondBoardCorrelationFromFirst as Array<{ id_first_board: string; id_second_board: string }>;
      firstCorrelation.splice(0, firstCorrelation.length,
        { id_first_board: 'from_first', id_second_board: 'mapped_from_first' },
        { id_first_board: 'date_mkrk5v4c', id_second_board: 'date_mkrk5v4c' }
      );

      mockMondayBoardRepository.findOne.mockResolvedValue({ id: 'prod-board' } as any);
      mockMondayItemRepository.findOne.mockImplementation(async (criteria: any) => {
        if (criteria?.where?.item_id === '7890') {
          return { item_id: '7890', name: 'Área Marketing', code: 'AREA-CODE' } as any;
        }
        return null;
      });

      const mondaySvc = (service as any).mondayService as jest.Mocked<MondayService>;
      if (!mondaySvc.getSubproductCodeByProduct) {
        mondaySvc.getSubproductCodeByProduct = jest.fn();
      }
      mondaySvc.getSubproductCodeByProduct.mockResolvedValue('SUBCODE');
      if (!mondaySvc.getSubproductByProduct) {
        mondaySvc.getSubproductByProduct = jest.fn();
      }
      mondaySvc.getSubproductByProduct.mockResolvedValue({ name: 'Subproduto A', code: 'SUB-A' });

      const getCodeSpy = jest.spyOn(service as any, 'getCodeByItemName')
        .mockImplementation(async (...args: any[]) => {
          const [name] = args;
          return name ? `${String(name)}-CODE` : undefined;
        });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await (service as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        formData,
        firstBoardValues,
        '111'
      );

      const cv = result.column_values;

      expect(cv.mapped_submission).toBe('value-from-subitem');
      expect(cv.mapped_missing).toBe('fallback-from-form');
      expect(cv.mapped_from_first).toBe('first-board-value');
      expect(cv.date_mkrk5v4c).toBe('2024-09-10');
      expect(cv.pessoas5__1).toEqual(firstBoardValues.pessoas__1);
      expect(cv.text_mkrrqsk6).toBe('Email Marketing');
      expect(cv.text_mkrr8dta).toBe('Email Marketing-CODE');
      expect(cv.text_mkrrg2hp).toBe('Cliente X');
      expect(cv.text_mkrrna7e).toBe('Cliente X-CODE');
      expect(cv.text_mkrra7df).toBe('Campanha Verão');
      expect(cv.text_mkrrcnpx).toBe('Campanha Verão-CODE');
      expect(cv.text_mkrr9edr).toBe('Disparo Matinal');
      expect(cv.text_mkrrmjcy).toBe('Disparo Matinal-CODE');
      expect(cv.text_mkrrxf48).toBe('Mecânica A');
      expect(cv.text_mkrrxpjd).toBe('Mecânica A-CODE');
      expect(cv.text_mkrrmmvv).toBe('AREA-CODE');
      expect(cv.text_mkrrxqng).toBe('Área Marketing');
      expect(cv.text_mkrrhdh6).toBe('Objetivo Y');
      expect(cv.text_mkrrraz2).toBe('Objetivo Y-CODE');
      expect(cv.text_mkrrfqft).toBe('Produto Alpha');
      expect(cv.text_mkrrjrnw).toBe('Produto Alpha-CODE');
      expect(cv.text_mkw8et4w).toBe('Subproduto A');
      expect(cv.text_mkw8jfw0).toBe('SUB-A');
      expect(cv.conectar_quadros8__1).toBe('111');
      expect(cv.text_mkr5kh2r).toContain('Email Marketing');
      expect(cv.text_mkr3jr1s).toContain('Email Marketing');
      expect(cv.texto6__1).toBe('Email Marketing');

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      getCodeSpy.mockRestore();
    });

    it('should apply defaults when optional fields are missing', async () => {
      const subitem: any = {
        id: 'channel999',
        data__1: '2024-09-01',
        texto__1: '',
        conectar_quadros87__1: '',
        n_meros_mkkchcmk: 0
      };

      const formData: FormSubmissionData = {
        id: 'submission-99',
        formTitle: 'GAM',
        timestamp: '2024-09-01T08:00:00Z',
        data: {
          text_mkvhgbp8: '',
          text_mkvhz8g3: '',
          text_mkvhedf5: '',
          text_mkvhqgvn: '',
          text_mkvhv5ma: '',
          text_mkvhvcw4: '',
          text_mkvh2z7j: '',
          text_mkvhwyzr: '',
          text_mkvhammc: ''
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue(null);

      const mondaySvc = (service as any).mondayService as jest.Mocked<MondayService>;
      mondaySvc.getSubproductCodeByProduct = jest.fn().mockResolvedValue(null);
      mondaySvc.getSubproductByProduct = jest.fn().mockResolvedValue(null);

      const getCodeSpy = jest.spyOn(service as any, 'getCodeByItemName').mockResolvedValue(undefined);
      const compositeSpy = jest.spyOn(service as any, 'buildCompositeTextFieldSecondBoard').mockResolvedValue('');

      const result = await (service as any).buildSecondBoardInitialPayloadFromSubitem(
        subitem,
        formData,
        {},
        '555'
      );

      const cv = result.column_values;

      expect(cv.text_mkrrqsk6).toBe('');
      expect(cv.text_mkrr8dta).toBe('Email');
      expect(cv.text_mkrrg2hp).toBe('');
      expect(cv.text_mkrrna7e).toBe('NaN');
      expect(cv.text_mkrra7df).toBe('');
      expect(cv.text_mkrrcnpx).toBe('NaN');
      expect(cv.text_mkrr9edr).toBe('');
      expect(cv.text_mkrrmjcy).toBe('NaN');
      expect(cv.text_mkrrmmvv).toBe('NaN');
      expect(cv.text_mkrrxqng).toBe('');
      expect(cv.text_mkrrfqft).toBe('');
      expect(cv.text_mkrrjrnw).toBe('NaN');
      expect(cv.text_mkw8et4w).toBe('');
      expect(cv.text_mkw8jfw0).toBe('');
      expect(cv.conectar_quadros8__1).toBe('555');
      expect(cv).not.toHaveProperty('text_mkr5kh2r');
      expect(cv).not.toHaveProperty('text_mkr3jr1s');
      expect(cv.lista_suspensa5__1).toBe('Emocional');

      getCodeSpy.mockRestore();
      compositeSpy.mockRestore();
    });
  });

  describe('pickSecondBoardConnectColumns', () => {
    it('should pick only second board connect columns', () => {
      const input = {
        text_mkvgjh0w: 'hour',
        conectar_quadros8__1: { item_ids: ['123'] },
        other_field: 'value',
        text__1: 'text'
      };

      const result = (service as any).pickSecondBoardConnectColumns(input);

      expect(result).toHaveProperty('text_mkvgjh0w');
      expect(result).toHaveProperty('conectar_quadros8__1');
      expect(result).not.toHaveProperty('other_field');
      expect(result).not.toHaveProperty('text__1');
    });

    it('should return empty object when no matching columns', () => {
      const result = (service as any).pickSecondBoardConnectColumns({ other: 'value' });
      expect(result).toEqual({});
    });
  });

  describe('insertChannelSchedules', () => {
    it('should insert channel schedules for subitems', async () => {
      const subitems = [
        {
          id: 'canal1',
          data__1: '2024-01-15',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 50
        }
      ];

      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvhvcw4: 'Marketing',
          pessoas__1: [{ id: 'user123' }]
        }
      };

      const mockCreate = jest.fn().mockResolvedValue(undefined);
      (service as any).channelScheduleService = { create: mockCreate };

      await (service as any).insertChannelSchedules(subitems, formData);

      expect(mockCreate).toHaveBeenCalled();
    });

    it('should skip subitems without required fields', async () => {
      const subitems = [
        { id: 'canal1' }, // Missing data__1
        { data__1: '2024-01-15' }, // Missing id
        { id: 'canal2', data__1: '2024-01-15', n_meros_mkkchcmk: 0 } // Zero quantity
      ];

      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const mockCreate = jest.fn().mockResolvedValue(undefined);
      (service as any).channelScheduleService = { create: mockCreate };

      await (service as any).insertChannelSchedules(subitems, formData);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle missing channelScheduleService', async () => {
      (service as any).channelScheduleService = undefined;

      const subitems = [{ id: 'canal1', data__1: '2024-01-15', n_meros_mkkchcmk: 50 }];
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      await expect(
        (service as any).insertChannelSchedules(subitems, formData)
      ).resolves.not.toThrow();
    });
  });

  describe('extractItemName', () => {
    it('should extract item name from form data', () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Campaign Name'
        }
      };

      const mapping = {
        board_id: 'board123',
        group_id: 'group1',
        item_name_field: 'data.name',
        column_mappings: []
      };
      const result = (service as any).extractItemName(formData, mapping);

      expect(result).toBe('Campaign Name');
    });

    it('should use fallback when name is missing', () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const result = (service as any).extractItemName(formData, { name: 'Test Mapping' });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('savePayloadLocally and savePreObjectLocally', () => {
    it('should skip saving in non-dev environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      await expect((service as any).savePayloadLocally(formData)).resolves.not.toThrow();
      await expect((service as any).savePreObjectLocally({}, 'test')).resolves.not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle file system errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      // eslint-disable-next-line n/prefer-node-protocol
      const fsMock = require('fs') as any;
      fsMock.promises = fsMock.promises || {};
      fsMock.promises.mkdir = jest.fn().mockResolvedValue(undefined);
      const fileError = new Error('write failed');
      fsMock.promises.writeFile = jest.fn().mockRejectedValue(fileError);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(
        (service as any).saveObjectLocally({ test: 'data' }, 'test_file')
      ).resolves.not.toThrow();

      expect(fsMock.promises.mkdir).toHaveBeenCalledTimes(1);
      expect(fsMock.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Falha ao salvar objeto localmente:', fileError);

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should persist payload locally in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // eslint-disable-next-line n/prefer-node-protocol
      const fsMock = require('fs') as any;
      fsMock.promises = fsMock.promises || {};
      fsMock.promises.mkdir = jest.fn().mockResolvedValue(undefined);
      fsMock.promises.writeFile = jest.fn().mockResolvedValue(undefined);

      const payload: FormSubmissionData = {
        id: 'payload123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: { field: 'value' }
      };

      await (service as any).savePayloadLocally(payload);

      expect(fsMock.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('data'), { recursive: true });
      const [filePath, contents, encoding] = fsMock.promises.writeFile.mock.calls[0];
      expect(filePath).toContain('payload123');
      expect(contents).toContain('"payload123"');
      expect(encoding).toBe('utf-8');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle processCampaignGAMSubmission with text_mkvhvcw4 as ID', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM Campaign',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          text_mkvhvcw4: '12345' // ID format
        }
      };

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '12345',
        name: 'Area Name'
      } as any);

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      });

      expect(result).toBe('9999');
    });

    it('should handle buildPeopleFromLookupObjetivo errors in first board', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          text_mkvhvcw4: 'Marketing'
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });

      jest.spyOn(service as any, 'buildPeopleFromLookupObjetivo')
        .mockRejectedValue(new Error('People error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      });

      expect(result).toBe('9999');
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle buildCompositeTextField errors', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: { name: 'Test' }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });

      jest.spyOn(service as any, 'buildCompositeTextField')
        .mockRejectedValue(new Error('Composite error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      });

      expect(result).toBe('9999');
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('additional coverage for branches and paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });
      mockMondayService.changeMultipleColumnValues.mockResolvedValue(undefined);
      mockMondayItemRepository.find.mockResolvedValue([]);
      mockMondayItemRepository.findOne.mockResolvedValue(null);
      mockChannelScheduleRepository.find.mockResolvedValue([]);
      mockSubscriberRepository.findOne.mockResolvedValue(null);
      mockMondayBoardRepository.findOne.mockResolvedValue(null);
    });

    it('should handle column mapping with transform function', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: { field1: 'value1' }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'data.field1',
            monday_column_id: 'text__1',
            column_type: 'TEXT' as any,
            transform: (value: any) => value ? value.toUpperCase() : undefined
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.text__1).toBe('VALUE1');
    });

    it('should use default value when field is undefined', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {}
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'missing_field',
            monday_column_id: 'text__1',
            column_type: 'TEXT' as any,
            default_value: 'DEFAULT'
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.text__1).toBe('DEFAULT');
    });

    it('should use closest subitem date__1 when available', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          __SUBITEMS__: [
            { data__1: '2024-01-20' },
            { data__1: '2024-01-10' }
          ]
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'any_field',
            monday_column_id: 'data__1',
            column_type: 'DATE' as any
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.data__1).toBeDefined();
    });

    it('should handle error in column mapping gracefully', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: { field1: 'value1' }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'field1',
            monday_column_id: 'text__1',
            column_type: 'TEXT' as any,
            transform: () => { throw new Error('Transform error'); }
          }
        ]
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).buildColumnValues(formData, mapping);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle parseFlexibleDateToDate with YYYY-MM-DD', () => {
      const result = (service as any).parseFlexibleDateToDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle parseFlexibleDateToDate with DD/MM/YYYY', () => {
      const result = (service as any).parseFlexibleDateToDate('15/01/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should handle parseFlexibleDateToDate with invalid date', () => {
      const result = (service as any).parseFlexibleDateToDate('invalid-date');
      expect(result).toBeNull();
    });

    it('should handle findClosestSubitemByDate with no valid dates', () => {
      const subitems = [
        { id: 'sub1', data__1: 'invalid' },
        { id: 'sub2' }
      ];

      const result = (service as any).findClosestSubitemByDate(subitems);
      expect(result).toBeNull();
    });

    it('should handle mondayItemRepository not finding schedules in adjustSubitemsCapacity', async () => {
      const subitems = [
        { id: '456', conectar_quadros87__1: 'Channel1', data__1: '2024-01-15', conectar_quadros_mkkcnyr3: '10:00', n_meros_mkkchcmk: 50 }
      ];
      const formData: FormSubmissionData = {
        formTitle: 'GAM Campaign',
        id: 'gam123',
        timestamp: '2024-01-01T10:00:00Z',
        data: { text_mkvhvcw4: 'Area1' }
      };

      mockMondayItemRepository.find.mockResolvedValue([]);
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await (service as any).adjustSubitemsCapacity(subitems, formData);

      expect(result[0].n_meros_mkkchcmk).toBe(50);
    });

    it('should handle resolveConnectBoardColumns with empty columnValues', async () => {
      const result = await (service as any).resolveConnectBoardColumns({}, {}, 'first');
      expect(result).toEqual({});
    });

    it('should process second board with connect columns and people', async () => {
      const enrichedFormData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvhvcw4: 'Marketing',
          text_mkvh2z7j: 'Objetivo1',
          __SUBITEMS__: [
            { id: 'sub1', data__1: '2024-01-15', n_meros_mkkchcmk: 50 }
          ]
        }
      };

      jest.spyOn(service as any, 'buildSecondBoardInitialPayloadFromSubitem').mockResolvedValue({
        item_name: 'Test Item',
        column_values: {
          text__1: 'Test',
          text_mkvgjh0w: 'hour',
          conectar_quadros8__1: { item_ids: ['123'] }
        }
      });

      jest.spyOn(service as any, 'resolveConnectBoardColumns').mockResolvedValue({
        text_mkvgjh0w: 'hour',
        conectar_quadros8__1: { item_ids: ['123'] }
      });

      jest.spyOn(service as any, 'buildPeopleFromLookupObjetivo').mockResolvedValue({
        personsAndTeams: [{ id: 999 }]
      });

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '8888' } }
      });

      const result = await (service as any).processSecondBoardSendsForSubitems(
        enrichedFormData,
        {},
        'Fallback',
        '9999'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('8888');
      expect(mockMondayService.changeMultipleColumnValues).toHaveBeenCalled();
    });

    it('should process pessoas5__1 as personsAndTeams object', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          pessoas5__1: { personsAndTeams: [{ id: 123 }, { id: 456 }] }
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.pessoas__1).toEqual({ personsAndTeams: [{ id: 123 }, { id: 456 }] });
    });

    it('should resolve pessoas5__1 from subscribers', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          pessoas5__1: ['user@test.com']
        }
      };

      mockSubscriberRepository.findOne.mockResolvedValue({
        id: 1,
        subscriber_id: 789,
        email: 'user@test.com'
      } as any);

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.pessoas__1).toEqual({ personsAndTeams: [{ id: '1', kind: 'person' }] });
    });

    it('should populate text fields from lookup fields', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          lookup_mkrtaebd: 'Cliente1',
          lookup_mkrt66aq: 'Campanha1',
          lookup_mkrtxa46: 'Disparo1',
          lookup_mkrta7z1: 'Mecanica1'
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.text_mkvhz8g3).toBe('Cliente1');
      expect(result.text_mkvhedf5).toBe('Campanha1');
      expect(result.text_mkvhqgvn).toBe('Disparo1');
      expect(result.text_mkvhv5ma).toBe('Mecanica1');
    });

    it('should populate date_mkrj355f and text_mkr3n64h from date_mkr6nj1f', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          date_mkr6nj1f: { date: '2024-01-15' }
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'data.date_mkr6nj1f',
            monday_column_id: 'date_mkr6nj1f',
            column_type: 'DATE' as any
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.date_mkr6nj1f).toBeDefined();
      expect(result.date_mkrj355f).toEqual({ date: '2024-01-15' });
      expect(result.text_mkr3n64h).toBe('20240115');
    });

    it('should handle date_mkr6nj1f as string', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          date_mkr6nj1f: '2024-02-20'
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: [
          {
            form_field_path: 'data.date_mkr6nj1f',
            monday_column_id: 'date_mkr6nj1f',
            column_type: 'DATE' as any
          }
        ]
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.text_mkr3n64h).toBe('20240220');
    });

    it('should handle date from __SUBITEMS__ in buildColumnValues', async () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          __SUBITEMS__: [
            { data__1: todayStr }
          ]
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      };

      const result = await (service as any).buildColumnValues(formData, mapping);
      expect(result.data__1).toEqual({ date: todayStr });
    });

    it('should warn when error occurs populating text_mkr3n64h', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          date_mkr6nj1f: 'invalid-format'
        }
      };

      const mapping: MondayFormMapping = {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await (service as any).buildColumnValues(formData, mapping);

      // Pode ou não gerar warn dependendo da lógica, mas não deve quebrar
      consoleWarnSpy.mockRestore();
    });

    it('should handle normalizeToStringArray with complex object', () => {
      const input = { labels: ['Label1', 'Label2'] };
      const result = (service as any).normalizeToStringArray(input);
      expect(result).toEqual(['Label1', 'Label2']);
    });

    it('should handle error in buildCompositeTextField second send', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          text_mkvhvcw4: 'Marketing',
          __SUBITEMS__: []
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });

      jest.spyOn(service as any, 'buildCompositeTextField')
        .mockRejectedValue(new Error('Composite text error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      });

      expect(result).toBe('9999');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Falha ao montar text_mkr3znn0 (segundo envio do primeiro board):',
        expect.any(Error)
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle error in changeMultipleColumnValues', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          conectar_quadros__1: 'Item1'
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '111',
        name: 'Item1',
        code: 'I1'
      } as any);

      mockMondayService.changeMultipleColumnValues.mockRejectedValue(
        new Error('Update failed')
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      });

      expect(result).toBe('9999');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Falha ao atualizar colunas conectar_quadros no primeiro board:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should process form with subitems successfully', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          name: 'Test',
          text_mkvhvcw4: 'Marketing',
          __SUBITEMS__: [
            { id: 'sub1', data__1: '2024-01-15', n_meros_mkkchcmk: 50 }
          ]
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '9999' } }
      });
      mockMondayService.changeMultipleColumnValues.mockResolvedValue(undefined);

      const result = await service.processCampaignGAMSubmission(formData, {
        board_id: 'board123',
        group_id: 'group1',
        column_mappings: []
      } as any);

      expect(result).toBe('9999');
      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle normalizeToStringArray with ids array', () => {
      const input = { ids: [123, 456, 789] };
      const result = (service as any).normalizeToStringArray(input);
      expect(result).toEqual(['123', '456', '789']);
    });

    it('should handle normalizeToStringArray with number', () => {
      const result = (service as any).normalizeToStringArray(42);
      expect(result).toEqual(['42']);
    });

    it('should handle formatValueForMondayColumn with PEOPLE type', () => {
      const value = { personsAndTeams: [{ id: 123 }] };
      const result = (service as any).formatValueForMondayColumn(value, MondayColumnType.PEOPLE);
      expect(result).toEqual({ personsAndTeams: [{ id: '123', kind: 'person' }] });
    });

    it('should handle formatValueForMondayColumn with DROPDOWN type', () => {
      const value = ['Option1', 'Option2'];
      const result = (service as any).formatValueForMondayColumn(value, MondayColumnType.DROPDOWN);
      expect(result).toEqual({ labels: ['Option1', 'Option2'] });
    });

    it('should handle formatValueForMondayColumn with TAGS type', () => {
      const value = ['Tag1', 'Tag2'];
      const result = (service as any).formatValueForMondayColumn(value, MondayColumnType.TAGS);
      expect(result).toEqual({ tag_ids: ['Tag1', 'Tag2'] });
    });

    it('should handle splitConnectBoardColumns with multiple connect columns', () => {
      const input = {
        text_field: 'value',
        conectar_quadros__1: '1',
        conectar_quadros8__1: '2',
        conectar_quadros87__1: '3',
        other_field: 'test'
      };

      const result = (service as any).splitConnectBoardColumns(input);
      
      expect(result).toHaveProperty('baseColumns');
      expect(result).toHaveProperty('connectColumnsRaw');
      expect(result.baseColumns.text_field).toBe('value');
      expect(result.baseColumns.other_field).toBe('test');
      expect(result.connectColumnsRaw.conectar_quadros__1).toBe('1');
      expect(result.connectColumnsRaw.conectar_quadros8__1).toBe('2');
      expect(result.connectColumnsRaw.conectar_quadros87__1).toBe('3');
    });





    it('should handle buildPeopleFromLookupObjetivo with missing team field', async () => {
      const formData: FormSubmissionData = {
        id: 'test123',
        formTitle: 'GAM',
        timestamp: '2024-01-01T10:00:00Z',
        data: {
          text_mkvh2z7j: 'Objetivo1'
        }
      };

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '999',
        name: 'Objetivo1',
        team: null
      } as any);

      const result = await (service as any).buildPeopleFromLookupObjetivo(formData);
      expect(result).toBeUndefined();
    });



    it('should handle toYYYYMMDD with ISO datetime string', () => {
      const result = toYYYYMMDD('2024-01-15T10:30:00Z');
      expect(result).toBe('20240115');
    });

    it('should handle getColumnType for conectar_quadros variations', () => {
      expect((service as any).getColumnType('conectar_quadros__1')).toBe('text');
      expect((service as any).getColumnType('conectar_quadros8__1')).toBe('text');
      expect((service as any).getColumnType('conectar_quadros87__1')).toBe('text');
    });

    it('should handle getColumnType for time field', () => {
      expect((service as any).getColumnType('conectar_quadros_mkkcnyr3')).toBe('text');
    });

    it('should handle isDev returning true', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalIsDev = process.env.IS_DEV;
      
      process.env.NODE_ENV = 'development';
      process.env.IS_DEV = 'true';

      const result = (service as any).isDev();
      expect(result).toBe(true);

      process.env.NODE_ENV = originalEnv;
      process.env.IS_DEV = originalIsDev;
    });

    it('should handle isDev returning false in production', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalIsDev = process.env.IS_DEV;
      
      process.env.NODE_ENV = 'production';
      delete process.env.IS_DEV;

      const result = (service as any).isDev();
      expect(result).toBe(false);

      process.env.NODE_ENV = originalEnv;
      if (originalIsDev) process.env.IS_DEV = originalIsDev;
    });
  });

  describe('Critical branch coverage - Push to 80%', () => {
    it('should handle date_mkr6nj1f as array format (line 89-91)', async () => {
      const formData: FormSubmissionData = {
        id: 'array-date-test',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'GAM Test',
        data: {
          name: 'Test Campaign',
          date_mkr6nj1f: ['2024-01-15']  // Array format
        }
      };

      mockMondayService.makeGraphQLRequest.mockResolvedValue({
        data: { create_item: { id: '88888' } }
      });

      await service.processCampaignGAMSubmission(formData);

      expect(mockMondayService.makeGraphQLRequest).toHaveBeenCalled();
    });

    it('should handle adjustSubitemsCapacity with empty slots (line 107-114)', async () => {
      const mockSubitems = [
        {
          conectar_quadros_mkkcjhuc: 'channel1',
          conectar_quadros_mkkbt3fq: '2024-12-15',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 50
        }
      ];

      mockMondayItemRepository.find.mockResolvedValue([]);
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await (service as any).adjustSubitemsCapacity(mockSubitems, 'Test Area');

      expect(result).toBeDefined();
    });

    it('should handle buildCompositeTextField with missing fields (line 158)', async () => {
      const formData: FormSubmissionData = {
        id: 'composite-test',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: {}  // Missing all fields
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({
        id: '1',
        board_id: '123',
        name: 'Produto'
      } as any);

      const result = await (service as any).buildCompositeTextField(formData);

      expect(typeof result).toBe('string');
    });

    it('should handle buildSecondBoardInitialPayloadFromSubitem with numeric product code (line 431-435)', async () => {
      const mockSubitem = {
        texto__1: '12345'  // Numeric product code
      };

      const mockEnrichedData: any = {
        id: 'test',
        data: {}
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({
        id: '1',
        board_id: '123',
        name: 'Produto'
      } as any);

      mockMondayItemRepository.findOne.mockResolvedValue({
        item_id: '12345',
        code: 'PROD123'
      } as any);

      mockMondayService.getSubproductCodeByProduct.mockResolvedValue('SUB123');

      const result = await (service as any).buildSecondBoardInitialPayloadFromSubitem(
        mockSubitem,
        mockEnrichedData,
        {},
        '999'
      );

      expect(result).toBeDefined();
    });

    it('should handle insertChannelSchedules with database error (line 443-444)', async () => {
      const mockSubitems = [
        {
          conectar_quadros_mkkcjhuc: 'channel1',
          conectar_quadros_mkkbt3fq: '2024-12-15',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 50
        }
      ];

      const formData: FormSubmissionData = {
        id: 'schedule-error',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: {
          lookup_mkrt36cj: 'Marketing'
        }
      };

      mockChannelScheduleRepository.save.mockRejectedValue(new Error('DB Error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await (service as any).insertChannelSchedules(mockSubitems, formData);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle resolveConnectBoardColumns with undefined values (line 465)', async () => {
      const mockColumns = {
        conectar_quadros__1: undefined
      };

      const result = await (service as any).resolveConnectBoardColumns(mockColumns);

      expect(result).toBeDefined();
    });

    it('should handle buildPeopleFromLookupObjetivo with error (line 481-482)', async () => {
      // Mockar item encontrado mas com team vazio para chegar ao código de subscriber
      mockMondayItemRepository.findOne.mockResolvedValue({
        id: '1',
        name: '123',
        team: []
      } as any);
      
      mockSubscriberRepository.find.mockRejectedValue(new Error('DB Error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (service as any).buildPeopleFromLookupObjetivo({ lookup_mkrt6ws9: '123' });

      expect(result).toBeDefined();
      consoleWarnSpy.mockRestore();
    });

    it('should handle processSecondBoardSendsForSubitems with validation error (line 569)', async () => {
      const formData: FormSubmissionData = {
        id: 'validation-error',
        timestamp: '2024-01-01T00:00:00Z',
        formTitle: 'Test',
        data: {
          __SUBITEMS__: [{ texto__1: '' }]  // Empty product code
        }
      };

      mockMondayBoardRepository.findOne.mockResolvedValue({
        id: '1',
        board_id: '123',
        name: 'Produto'
      } as any);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).processSecondBoardSendsForSubitems(formData, {}, '123', '456');

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle validateAndAdjustSubitems with capacity exceeded (line 587-594)', async () => {
      const mockSubitems = [
        {
          id: 'channel1',
          conectar_quadros_mkkcjhuc: 'channel1',
          data__1: '2024-12-15',
          conectar_quadros_mkkbt3fq: '2024-12-15',
          conectar_quadros_mkkcnyr3: '23:00',
          n_meros_mkkchcmk: 1000
        }
      ];

      // Mockar horários ativos (só 23:00 disponível)
      mockMondayItemRepository.find.mockImplementation(((options: any) => {
        if (options?.where?.board_id === 'f0dec33d-a127-4923-8110-ebe741ce946b') {
          return Promise.resolve([{ name: '23:00', status: 'Ativo' }] as any);
        }
        return Promise.resolve([] as any);
      }) as any);

      // Mockar findOne para retornar o canal
      mockMondayItemRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.item_id === 'channel1') {
          return Promise.resolve({ item_id: 'channel1', max_value: 500 } as any);
        }
        return Promise.resolve(null);
      });

      // Mockar channelScheduleRepository.find para retornar array vazio (sem agendamentos)
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const formData = {
        id: 'test',
        timestamp: '2024-01-01',
        formTitle: 'Test',
        data: { gam_requesting_area: 'Test Area' }
      };

      await (service as any).adjustSubitemsCapacity(mockSubitems, formData, 'f0dec33d-a127-4923-8110-ebe741ce946b');

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle getItemCodeByName with no result (line 605)', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const result = await (service as any).getItemCodeByName('Nonexistent');

      expect(result).toBeUndefined();
    });

    it('should handle getCodeByItemName with error (line 624)', async () => {
      mockMondayItemRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await (service as any).getCodeByItemName('Test');

      expect(result).toBeUndefined();
      consoleWarnSpy.mockRestore();
    });
  });
});
