import { convertDateFormat, convertToISODate, toYYYYMMDD } from '../../src/utils/dateFormatters';

describe('Date Formatters', () => {
  describe('convertDateFormat', () => {
    it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(convertDateFormat('2024-01-15')).toBe('15/01/2024');
      expect(convertDateFormat('2023-12-31')).toBe('31/12/2023');
    });

    it('should keep DD/MM/YYYY as is', () => {
      expect(convertDateFormat('15/01/2024')).toBe('15/01/2024');
      expect(convertDateFormat('31/12/2023')).toBe('31/12/2023');
    });

    it('should handle invalid formats by returning as is', () => {
      expect(convertDateFormat('invalid')).toBe('invalid');
      expect(convertDateFormat('2024/01/15')).toBe('2024/01/15');
    });
  });

  describe('convertToISODate', () => {
    it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
      expect(convertToISODate('15/01/2024')).toBe('2024-01-15');
      expect(convertToISODate('31/12/2023')).toBe('2023-12-31');
    });

    it('should keep YYYY-MM-DD as is', () => {
      expect(convertToISODate('2024-01-15')).toBe('2024-01-15');
      expect(convertToISODate('2023-12-31')).toBe('2023-12-31');
    });

    it('should handle other formats by returning as is', () => {
      expect(convertToISODate('invalid')).toBe('invalid');
    });
  });

  describe('toYYYYMMDD', () => {
    it('should keep YYYYMMDD as is', () => {
      expect(toYYYYMMDD('20240115')).toBe('20240115');
      expect(toYYYYMMDD('20231231')).toBe('20231231');
    });

    it('should convert YYYY-MM-DD to YYYYMMDD', () => {
      expect(toYYYYMMDD('2024-01-15')).toBe('20240115');
      expect(toYYYYMMDD('2023-12-31')).toBe('20231231');
    });

    it('should convert DD/MM/YYYY to YYYYMMDD', () => {
      expect(toYYYYMMDD('15/01/2024')).toBe('20240115');
      expect(toYYYYMMDD('31/12/2023')).toBe('20231231');
    });

    it('should handle null/undefined by returning empty string', () => {
      expect(toYYYYMMDD(null)).toBe('');
      expect(toYYYYMMDD(undefined)).toBe('');
      expect(toYYYYMMDD('')).toBe('');
    });

    it('should parse valid Date strings', () => {
      const result = toYYYYMMDD('2024-01-15T10:00:00Z');
      expect(result).toMatch(/^\d{8}$/);
    });

    it('should return empty string for invalid dates', () => {
      expect(toYYYYMMDD('invalid')).toBe('');
      expect(toYYYYMMDD('not-a-date')).toBe('');
    });
  });
});
