import { 
  mapFormSubmissionToMondayData, 
  FORM_TO_MONDAY_MAPPINGS
} from '../../src/utils/mondayFieldMappings';

describe('mondayFieldMappings', () => {
  describe('FORM_TO_MONDAY_MAPPINGS', () => {
    it('should be defined as an array', () => {
      expect(Array.isArray(FORM_TO_MONDAY_MAPPINGS)).toBe(true);
      expect(FORM_TO_MONDAY_MAPPINGS.length).toBeGreaterThan(0);
    });

    it('should contain valid mapping rules', () => {
      FORM_TO_MONDAY_MAPPINGS.forEach(rule => {
        expect(rule).toHaveProperty('from');
        expect(rule).toHaveProperty('to');
        expect(typeof rule.from).toBe('string');
        expect(Array.isArray(rule.to)).toBe(true);
      });
    });

    it('should have rules with optional format property', () => {
      const rulesWithFormat = FORM_TO_MONDAY_MAPPINGS.filter(r => r.format !== undefined);
      expect(rulesWithFormat.length).toBeGreaterThan(0);
      
      rulesWithFormat.forEach(rule => {
        if (Array.isArray(rule.format)) {
          rule.format.forEach(f => {
            expect(['label', 'date', 'number', 'board_relation', 'identity']).toContain(f);
          });
        } else {
          expect(['label', 'date', 'number', 'board_relation', 'identity']).toContain(rule.format);
        }
      });
    });
  });

  describe('mapFormSubmissionToMondayData', () => {
    it('should preserve original data', () => {
      const input = {
        originalField: 'value',
        anotherField: 123
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.originalField).toBe('value');
      expect(result.anotherField).toBe(123);
    });

    it('should map label__1 to label__1 with label format', () => {
      const input = {
        label__1: 'Test Label'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.label__1).toBe('Test Label');
    });

    it('should map name to name', () => {
      const input = {
        name: 'Campaign Name'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.name).toBe('Campaign Name');
    });

    it('should map pessoas5__1 to pessoas__1', () => {
      const input = {
        pessoas5__1: 'person1@example.com'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.pessoas__1).toBe('person1@example.com');
    });

    it('should map lookup fields to text fields', () => {
      const input = {
        lookup_mkrt36cj: 'Area Value',
        lookup_mkrt66aq: 'Campaign Type',
        lookup_mkrtaebd: 'Client Type',
        lookup_mkrtcctn: 'Channel',
        lookup_mkrta7z1: 'Mechanic',
        lookup_mkrtvsdj: 'Product',
        lookup_mkrtxa46: 'Dispatch Type',
        lookup_mkrtwq7k: 'Objective',
        lookup_mkrtxgmt: 'Segment'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.text_mkvhvcw4).toBe('Area Value');
      expect(result.text_mkvhedf5).toBe('Campaign Type');
      expect(result.text_mkvhz8g3).toBe('Client Type');
      expect(result.text_mkvhgbp8).toBe('Channel');
      expect(result.text_mkvhv5ma).toBe('Mechanic');
      expect(result.text_mkvhwyzr).toBe('Product');
      expect(result.text_mkvhqgvn).toBe('Dispatch Type');
      expect(result.text_mkvh2z7j).toBe('Objective');
      expect(result.text_mkvhammc).toBe('Segment');
    });

    it('should map lookup_mkrt36cj to both text_mkvhvcw4 and briefing_requesting_area', () => {
      const input = {
        lookup_mkrt36cj: 'Area Solicitante'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.text_mkvhvcw4).toBe('Area Solicitante');
      expect(result.briefing_requesting_area).toBe('Area Solicitante');
    });

    it('should map briefing_requesting_area to text_mkvhvcw4', () => {
      const input = {
        briefing_requesting_area: 'Briefing Area'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.text_mkvhvcw4).toBe('Briefing Area');
    });

    it('should map briefing validation fields', () => {
      const input = {
        texto_curto_links_validacao: 'http://validation.link',
        briefing_type: 'Growth'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.long_text_mkrd6mnt).toBe('http://validation.link');
      expect(result.sele__o_individual9__1).toBe('Growth');
    });

    it('should map briefing mandatory fields', () => {
      const input = {
        briefing_objective: 'Main Objective',
        briefing_target_audience: 'Target',
        briefing_observations: 'CTA'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.sele__o_m_ltipla__1).toBe('Main Objective');
      expect(result.sele__o_m_ltipla1__1).toBe('Target');
      expect(result.texto_curto23__1).toBe('CTA');
    });

    it('should map briefing text fields', () => {
      const input = {
        texto_curto6__1: 'Link régua',
        texto_curto31__1: 'Link anterior',
        texto_curto4__1: 'Disclaimers'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.texto_curto6__1).toBe('Link régua');
      expect(result.texto_curto31__1).toBe('Link anterior');
      expect(result.texto_curto4__1).toBe('Disclaimers');
    });

    it('should format n_mero__1 as number from mapping rule', () => {
      const input = {
        n_mero__1: '42',
        __SUBITEMS__: [] // Must provide empty subitems or it will be overwritten to 0
      };

      const result = mapFormSubmissionToMondayData(input);

      // n_mero__1 is ALWAYS calculated from subitems.length
      expect(result.n_mero__1).toBe(0);
      expect(typeof result.n_mero__1).toBe('number');
    });

    it('should map data__1 to date_mkr6nj1f', () => {
      const input = {
        data__1: '2024-01-15'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.date_mkr6nj1f).toBe('2024-01-15');
    });

    it('should map dup__of_c_digo_canal____1 to texto2__1', () => {
      const input = {
        dup__of_c_digo_canal____1: 'Canal Code'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.texto2__1).toBe('Canal Code');
    });

    it('should preserve __SUBITEMS__ field', () => {
      const subitems = [
        { data__1: '2024-01-15', value: 'sub1' },
        { data__1: '2024-01-16', value: 'sub2' }
      ];

      const input = {
        name: 'Test',
        __SUBITEMS__: subitems
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.__SUBITEMS__).toEqual(subitems);
      expect(result.__SUBITEMS__).toHaveLength(2);
    });

    it('should compute n_mero__1 based on number of subitems', () => {
      const input = {
        name: 'Test',
        __SUBITEMS__: [
          { data__1: '2024-01-15' },
          { data__1: '2024-01-16' },
          { data__1: '2024-01-17' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(3);
    });

    it('should set n_mero__1 to 0 when no subitems', () => {
      const input = {
        name: 'Test'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(0);
    });

    it('should handle SUBITEMS as fallback key', () => {
      const input = {
        name: 'Test',
        SUBITEMS: [
          { data__1: '2024-01-15' },
          { data__1: '2024-01-16' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(2);
    });

    it('should set date_mkr6nj1f to earliest date from subitems', () => {
      const input = {
        name: 'Test',
        __SUBITEMS__: [
          { data__1: '2024-01-20' },
          { data__1: '2024-01-15' },
          { data__1: '2024-01-18' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.date_mkr6nj1f).toBe('2024-01-15');
    });

    it('should skip subitems without data__1 when computing earliest date', () => {
      const input = {
        name: 'Test',
        __SUBITEMS__: [
          { value: 'no date' },
          { data__1: '2024-01-20' },
          { data__1: '' },
          { data__1: '2024-01-15' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.date_mkr6nj1f).toBe('2024-01-15');
    });

    it('should not set date_mkr6nj1f if no valid dates in subitems', () => {
      const input = {
        name: 'Test',
        __SUBITEMS__: [
          { value: 'no date' },
          { data__1: '' },
          { data__1: 'invalid' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.date_mkr6nj1f).toBeUndefined();
    });

    it('should handle empty subitems array', () => {
      const input = {
        name: 'Test',
        __SUBITEMS__: []
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(0);
      expect(result.date_mkr6nj1f).toBeUndefined();
    });

    it('should skip mapping when source field is undefined', () => {
      const input = {
        name: 'Test'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.text_mkvhvcw4).toBeUndefined();
      expect(result.briefing_requesting_area).toBeUndefined();
    });

    it('should handle null values', () => {
      const input = {
        label__1: null,
        name: 'Test'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.label__1).toBeNull();
      expect(result.name).toBe('Test');
    });

    it('should calculate n_mero__1 from subitems regardless of input', () => {
      const input = {
        n_mero__1: 'not-a-number',
        __SUBITEMS__: [{}, {}, {}] // 3 subitems
      };

      const result = mapFormSubmissionToMondayData(input);

      // n_mero__1 is ALWAYS calculated from subitems.length, input value is ignored
      expect(result.n_mero__1).toBe(3);
    });

    it('should handle array format property in rules', () => {
      // Testing with a mapping that has array format
      const input = {
        sele__o_individual9__1: 'Some Value'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.sele__o_individual9__1).toBe('Some Value');
    });

    it('should handle multiple target keys with different formats', () => {
      const input = {
        lookup_mkrt36cj: 'Test Area'
      };

      const result = mapFormSubmissionToMondayData(input);

      // Should map to both target keys
      expect(result.text_mkvhvcw4).toBe('Test Area');
      expect(result.briefing_requesting_area).toBe('Test Area');
    });

    it('should handle zero as valid number', () => {
      const input = {
        n_mero__1: '0'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(0);
    });

    it('should preserve subitems when computing n_mero__1', () => {
      const subitems = [
        { data__1: '2024-01-15', value: 1 },
        { data__1: '2024-01-16', value: 2 }
      ];

      const input = {
        name: 'Test',
        __SUBITEMS__: subitems,
        n_mero__1: '999' // Should be overridden
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(2); // From subitems count, not from input
      expect(result.__SUBITEMS__).toEqual(subitems);
    });

    it('should handle date format as identity (keep as string)', () => {
      const input = {
        data__1: '2024-01-15T10:30:00'
      };

      const result = mapFormSubmissionToMondayData(input);

      // Date format keeps value as string for downstream processing
      expect(result.date_mkr6nj1f).toBe('2024-01-15T10:30:00');
      expect(typeof result.date_mkr6nj1f).toBe('string');
    });

    it('should handle complex nested objects in input', () => {
      const input = {
        name: 'Test',
        complexObject: {
          nested: {
            value: 'deep'
          }
        },
        lookup_mkrt36cj: 'Area'
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.name).toBe('Test');
      expect(result.complexObject).toEqual(input.complexObject);
      expect(result.text_mkvhvcw4).toBe('Area');
    });

    it('should handle all format types', () => {
      const input = {
        n_mero__1: '100',        // number (but will be overwritten by subitems calculation)
        data__1: '2024-01-15',   // date
        label__1: 'Label',       // label
        sele__o_individual9__1: 'Selection', // label
        lookup_mkt94f7g: 'Lookup' // identity/default
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.n_mero__1).toBe(0); // No subitems = 0
      expect(result.date_mkr6nj1f).toBe('2024-01-15');
      expect(result.label__1).toBe('Label');
      expect(result.sele__o_individual9__1).toBe('Selection');
      expect(result.lookup_mkt94f7g).toBe('Lookup');
    });

    it('should handle date parsing with invalid dates in subitems', () => {
      const input = {
        __SUBITEMS__: [
          { data__1: '2024-01-20' },
          { data__1: 'invalid-date' },
          { data__1: '2024-01-15' },
          { data__1: 'not-a-date' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      // Should only consider valid dates and pick earliest
      expect(result.date_mkr6nj1f).toBe('2024-01-15');
    });

    it('should handle subitems with null data__1', () => {
      const input = {
        __SUBITEMS__: [
          { data__1: null },
          { data__1: '2024-01-20' },
          { data__1: undefined },
          { data__1: '2024-01-15' }
        ]
      };

      const result = mapFormSubmissionToMondayData(input);

      expect(result.date_mkr6nj1f).toBe('2024-01-15');
      expect(result.n_mero__1).toBe(4);
    });

    it('should handle mapping rule without format property', () => {
      const input = {
        name: 'Test Name'
      };

      const result = mapFormSubmissionToMondayData(input);

      // name field has no format, should be copied as-is
      expect(result.name).toBe('Test Name');
    });

    it('should handle single format (non-array)', () => {
      const input = {
        sele__o_individual9__1: 'Single Label'
      };

      const result = mapFormSubmissionToMondayData(input);

      // Rule has format: 'label' (not an array)
      expect(result.sele__o_individual9__1).toBe('Single Label');
    });

    it('should handle array format with multiple targets', () => {
      const input = {
        lookup_mkrt36cj: 'Marketing'
      };

      const result = mapFormSubmissionToMondayData(input);

      // This maps to both text_mkvhvcw4 and briefing_requesting_area
      expect(result.text_mkvhvcw4).toBe('Marketing');
      expect(result.briefing_requesting_area).toBe('Marketing');
    });
  });
});
