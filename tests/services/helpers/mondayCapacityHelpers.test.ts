import {
  calculateAvailableCapacity,
  findNextTimeSlot,
  splitDemandBetweenSlots,
  validateSubitemData,
  createStagingKey,
  formatDateToYYYYMMDD,
  extractSimpleColumnValue,
  isSharedCapacityHour,
  getEffectiveMaxValue,
  SubitemData,
  TimeSlot
} from '../../../src/services/helpers/mondayCapacityHelpers';

describe('MondayCapacityHelpers', () => {
  describe('calculateAvailableCapacity', () => {
    it('should calculate available capacity correctly for normal hours', () => {
      const result = calculateAvailableCapacity(100, 30, 20, '10:00');
      expect(result).toBe(50); // 100 - 30 - 20 = 50
    });

    it('should calculate half capacity for shared hours (08:00)', () => {
      const result = calculateAvailableCapacity(100, 20, 10, '08:00');
      expect(result).toBe(20); // (100/2) - 20 - 10 = 20
    });

    it('should calculate half capacity for shared hours (08:30)', () => {
      const result = calculateAvailableCapacity(100, 20, 10, '08:30');
      expect(result).toBe(20);
    });

    it('should return 0 when capacity is exceeded', () => {
      const result = calculateAvailableCapacity(100, 60, 50, '10:00');
      expect(result).toBe(0); // Max(0, 100 - 60 - 50) = 0
    });

    it('should handle zero max value', () => {
      const result = calculateAvailableCapacity(0, 0, 0, '10:00');
      expect(result).toBe(0);
    });
  });

  describe('findNextTimeSlot', () => {
    const timeSlots: TimeSlot[] = [
      { name: '08:00' },
      { name: '10:00' },
      { name: '12:00' },
      { name: '14:00' }
    ];

    it('should find next time slot correctly', () => {
      const result = findNextTimeSlot(timeSlots, '10:00');
      expect(result).toBe('12:00');
    });

    it('should return first slot when current not found', () => {
      const result = findNextTimeSlot(timeSlots, '99:00');
      expect(result).toBe('08:00'); // Returns first slot at idx=0
    });

    it('should return null when at last slot', () => {
      const result = findNextTimeSlot(timeSlots, '14:00');
      expect(result).toBeNull();
    });

    it('should handle empty time slots array', () => {
      const result = findNextTimeSlot([], '10:00');
      expect(result).toBeNull();
    });

    it('should handle time slots with whitespace', () => {
      const slotsWithSpace: TimeSlot[] = [
        { name: ' 08:00 ' },
        { name: ' 10:00 ' }
      ];
      const result = findNextTimeSlot(slotsWithSpace, '08:00');
      expect(result).toBe('10:00');
    });
  });

  describe('splitDemandBetweenSlots', () => {
    it('should split demand correctly between current and next slot', () => {
      const item: SubitemData = {
        id: 'test1',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 100
      };

      const result = splitDemandBetweenSlots(item, 60, 100, '12:00');

      expect(result.current.n_meros_mkkchcmk).toBe(60);
      expect(result.current.conectar_quadros_mkkcnyr3).toBe('10:00');
      expect(result.next.n_meros_mkkchcmk).toBe(40);
      expect(result.next.conectar_quadros_mkkcnyr3).toBe('12:00');
    });

    it('should preserve all original item properties', () => {
      const item: SubitemData = {
        id: 'test1',
        name: 'Test Item',
        conectar_quadros87__1: 'Email',
        data__1: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 100
      };

      const result = splitDemandBetweenSlots(item, 60, 100, '12:00');

      expect(result.current.id).toBe('test1');
      expect(result.current.name).toBe('Test Item');
      expect(result.next.conectar_quadros87__1).toBe('Email');
      expect(result.next.data__1).toBe('2024-12-15');
    });

    it('should handle zero available capacity', () => {
      const item: SubitemData = {
        n_meros_mkkchcmk: 100,
        conectar_quadros_mkkcnyr3: '10:00'
      };

      const result = splitDemandBetweenSlots(item, 0, 100, '12:00');

      expect(result.current.n_meros_mkkchcmk).toBe(0);
      expect(result.next.n_meros_mkkchcmk).toBe(100);
    });
  });

  describe('validateSubitemData', () => {
    it('should return true for valid subitem with conectar_quadros87__1', () => {
      const item: SubitemData = {
        conectar_quadros87__1: 'Email',
        data__1: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(true);
    });

    it('should return true for valid subitem with conectar_quadros_mkkcjhuc', () => {
      const item: SubitemData = {
        conectar_quadros_mkkcjhuc: 'Email',
        conectar_quadros_mkkbt3fq: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(true);
    });

    it('should return false when canal is missing', () => {
      const item: SubitemData = {
        data__1: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(false);
    });

    it('should return false when date is missing', () => {
      const item: SubitemData = {
        conectar_quadros87__1: 'Email',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(false);
    });

    it('should return false when hour is missing', () => {
      const item: SubitemData = {
        conectar_quadros87__1: 'Email',
        data__1: '2024-12-15',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(false);
    });

    it('should return false when demand is zero', () => {
      const item: SubitemData = {
        conectar_quadros87__1: 'Email',
        data__1: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 0
      };

      expect(validateSubitemData(item)).toBe(false);
    });

    it('should return false when demand is negative', () => {
      const item: SubitemData = {
        conectar_quadros87__1: 'Email',
        data__1: '2024-12-15',
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: -5
      };

      expect(validateSubitemData(item)).toBe(false);
    });

    it('should trim whitespace from fields', () => {
      const item: SubitemData = {
        conectar_quadros87__1: ' Email ',
        data__1: ' 2024-12-15 ',
        conectar_quadros_mkkcnyr3: ' 10:00 ',
        n_meros_mkkchcmk: 50
      };

      expect(validateSubitemData(item)).toBe(true);
    });
  });

  describe('createStagingKey', () => {
    it('should create correct staging key', () => {
      const result = createStagingKey('channel1', '2024-12-15', '10:00');
      expect(result).toBe('channel1|2024-12-15|10:00');
    });

    it('should handle empty strings', () => {
      const result = createStagingKey('', '', '');
      expect(result).toBe('||');
    });

    it('should handle special characters', () => {
      const result = createStagingKey('canal@123', '2024/12/15', '10:00');
      expect(result).toBe('canal@123|2024/12/15|10:00');
    });
  });

  describe('formatDateToYYYYMMDD', () => {
    it('should return date already in YYYYMMDD format', () => {
      expect(formatDateToYYYYMMDD('20241215')).toBe('20241215');
    });

    it('should convert DD/MM/YYYY to YYYYMMDD', () => {
      expect(formatDateToYYYYMMDD('15/12/2024')).toBe('20241215');
    });

    it('should convert DD-MM-YYYY to YYYYMMDD', () => {
      expect(formatDateToYYYYMMDD('15-12-2024')).toBe('20241215');
    });

    it('should convert YYYY-MM-DD to YYYYMMDD', () => {
      expect(formatDateToYYYYMMDD('2024-12-15')).toBe('20241215');
    });

    it('should return empty string for empty input', () => {
      expect(formatDateToYYYYMMDD('')).toBe('');
    });

    it('should return original string for invalid format', () => {
      expect(formatDateToYYYYMMDD('invalid-date')).toBe('invalid-date');
    });

    it('should handle single digit day and month', () => {
      expect(formatDateToYYYYMMDD('05/01/2024')).toBe('20240105');
    });
  });

  describe('extractSimpleColumnValue', () => {
    it('should return null for null column', () => {
      expect(extractSimpleColumnValue(null)).toBeNull();
    });

    it('should return parsed object when JSON is valid', () => {
      const column = { text: 'Sample Text', value: '{"key": "value"}' };
      const result = extractSimpleColumnValue(column);
      expect(result).toEqual({ key: 'value' }); // Returns parsed JSON
    });

    it('should parse people type columns', () => {
      const column = {
        value: JSON.stringify({
          personsAndTeams: [
            { id: 1, kind: 'person' },
            { id: 2, kind: 'team' }
          ]
        })
      };

      const result = extractSimpleColumnValue(column, 'people');
      expect(result).toEqual([
        { id: 1, kind: 'person' },
        { id: 2, kind: 'team' }
      ]);
    });

    it('should parse board-relation type columns', () => {
      const column = {
        value: JSON.stringify({
          linkedPulseIds: [
            { linkedPulseId: 123 },
            { linkedPulseId: 456 }
          ]
        })
      };

      const result = extractSimpleColumnValue(column, 'board-relation');
      expect(result).toEqual([123, 456]);
    });

    it('should return text for unparseable JSON', () => {
      const column = {
        text: 'Fallback Text',
        value: 'invalid json {'
      };

      expect(extractSimpleColumnValue(column)).toBe('Fallback Text');
    });

    it('should return value when no text available', () => {
      const column = {
        value: 'Direct Value'
      };

      expect(extractSimpleColumnValue(column)).toBe('Direct Value');
    });

    it('should handle non-string values', () => {
      const column = {
        text: 'Text Value',
        value: { complex: 'object' }
      };

      expect(extractSimpleColumnValue(column)).toBe('Text Value');
    });
  });

  describe('isSharedCapacityHour', () => {
    it('should return true for 08:00', () => {
      expect(isSharedCapacityHour('08:00')).toBe(true);
    });

    it('should return true for 08:30', () => {
      expect(isSharedCapacityHour('08:30')).toBe(true);
    });

    it('should return false for other hours', () => {
      expect(isSharedCapacityHour('10:00')).toBe(false);
      expect(isSharedCapacityHour('12:00')).toBe(false);
      expect(isSharedCapacityHour('14:00')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isSharedCapacityHour('08:00')).toBe(true);
      expect(isSharedCapacityHour('08:00 ')).toBe(false); // with space
    });
  });

  describe('getEffectiveMaxValue', () => {
    it('should return half for shared hours (08:00)', () => {
      expect(getEffectiveMaxValue(100, '08:00')).toBe(50);
    });

    it('should return half for shared hours (08:30)', () => {
      expect(getEffectiveMaxValue(100, '08:30')).toBe(50);
    });

    it('should return full value for normal hours', () => {
      expect(getEffectiveMaxValue(100, '10:00')).toBe(100);
      expect(getEffectiveMaxValue(100, '12:00')).toBe(100);
    });

    it('should handle zero max value', () => {
      expect(getEffectiveMaxValue(0, '08:00')).toBe(0);
      expect(getEffectiveMaxValue(0, '10:00')).toBe(0);
    });

    it('should handle odd numbers for shared hours', () => {
      expect(getEffectiveMaxValue(101, '08:00')).toBe(50.5);
    });
  });
});
