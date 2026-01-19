import {
  MondayFormMapping,
  ColumnMapping,
  MondayColumnType,
  FormSubmissionData,
  SubitemData,
  CAMPAIGN_FORM_MAPPING,
  GAM_CAMPAIGN_FORM_MAPPING,
  MARKETING_BOARD_FORM_MAPPING
} from '../../src/dto/MondayFormMappingDto';

describe('MondayFormMappingDto', () => {
  describe('MondayColumnType enum', () => {
    it('should have TEXT type', () => {
      expect(MondayColumnType.TEXT).toBe('text');
    });

    it('should have DATE type', () => {
      expect(MondayColumnType.DATE).toBe('date');
    });

    it('should have NUMBER type', () => {
      expect(MondayColumnType.NUMBER).toBe('number');
    });

    it('should have STATUS type', () => {
      expect(MondayColumnType.STATUS).toBe('status');
    });

    it('should have CHECKBOX type', () => {
      expect(MondayColumnType.CHECKBOX).toBe('checkbox');
    });

    it('should have DROPDOWN type', () => {
      expect(MondayColumnType.DROPDOWN).toBe('dropdown');
    });

    it('should have PEOPLE type', () => {
      expect(MondayColumnType.PEOPLE).toBe('people');
    });

    it('should have EMAIL type', () => {
      expect(MondayColumnType.EMAIL).toBe('email');
    });

    it('should have PHONE type', () => {
      expect(MondayColumnType.PHONE).toBe('phone');
    });

    it('should have LINK type', () => {
      expect(MondayColumnType.LINK).toBe('link');
    });

    it('should have RATING type', () => {
      expect(MondayColumnType.RATING).toBe('rating');
    });

    it('should have TIMELINE type', () => {
      expect(MondayColumnType.TIMELINE).toBe('timeline');
    });

    it('should have TAGS type', () => {
      expect(MondayColumnType.TAGS).toBe('tags');
    });

    it('should have FILE type', () => {
      expect(MondayColumnType.FILE).toBe('file');
    });

    it('should have BOARD_RELATION type', () => {
      expect(MondayColumnType.BOARD_RELATION).toBe('board_relation');
    });

    it('should have exactly 15 column types', () => {
      const types = Object.values(MondayColumnType);
      expect(types).toHaveLength(15);
    });
  });

  describe('ColumnMapping interface', () => {
    it('should create column mapping with required fields', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'col_123',
        form_field_path: 'data.field1',
        column_type: MondayColumnType.TEXT
      };

      expect(mapping.monday_column_id).toBe('col_123');
      expect(mapping.form_field_path).toBe('data.field1');
      expect(mapping.column_type).toBe(MondayColumnType.TEXT);
      expect(mapping.default_value).toBeUndefined();
      expect(mapping.transform).toBeUndefined();
    });

    it('should support nested field paths with dot notation', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'nested_col',
        form_field_path: 'data.person.email',
        column_type: MondayColumnType.EMAIL
      };

      expect(mapping.form_field_path).toContain('.');
      expect(mapping.form_field_path.split('.')).toHaveLength(3);
    });

    it('should support optional default_value', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'default_col',
        form_field_path: 'data.optional_field',
        column_type: MondayColumnType.TEXT,
        default_value: 'Default Value'
      };

      expect(mapping.default_value).toBe('Default Value');
    });

    it('should support transform function', () => {
      const transformFn = (value: any) => value.toUpperCase();
      const mapping: ColumnMapping = {
        monday_column_id: 'transform_col',
        form_field_path: 'data.name',
        column_type: MondayColumnType.TEXT,
        transform: transformFn
      };

      expect(mapping.transform).toBeDefined();
      expect(mapping.transform!('test')).toBe('TEST');
    });

    it('should support transform with formData parameter', () => {
      const transformFn = (value: any, formData?: FormSubmissionData) => {
        return formData ? `${value}-${formData.formTitle}` : value;
      };
      const mapping: ColumnMapping = {
        monday_column_id: 'complex_transform',
        form_field_path: 'data.field',
        column_type: MondayColumnType.TEXT,
        transform: transformFn
      };

      const mockFormData: FormSubmissionData = {
        id: 'form_1',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Test Form',
        data: {}
      };

      expect(mapping.transform!('value', mockFormData)).toBe('value-Test Form');
    });

    it('should support all column types', () => {
      const types = [
        MondayColumnType.TEXT,
        MondayColumnType.DATE,
        MondayColumnType.NUMBER,
        MondayColumnType.STATUS,
        MondayColumnType.CHECKBOX,
        MondayColumnType.DROPDOWN,
        MondayColumnType.PEOPLE,
        MondayColumnType.EMAIL,
        MondayColumnType.PHONE,
        MondayColumnType.LINK,
        MondayColumnType.RATING,
        MondayColumnType.TIMELINE,
        MondayColumnType.TAGS,
        MondayColumnType.FILE,
        MondayColumnType.BOARD_RELATION
      ];

      types.forEach(type => {
        const mapping: ColumnMapping = {
          monday_column_id: `col_${type}`,
          form_field_path: `data.${type}_field`,
          column_type: type
        };
        expect(mapping.column_type).toBe(type);
      });
    });

    it('should support numeric default values', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'number_col',
        form_field_path: 'data.count',
        column_type: MondayColumnType.NUMBER,
        default_value: 0
      };

      expect(mapping.default_value).toBe(0);
    });

    it('should support boolean default values', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'checkbox_col',
        form_field_path: 'data.active',
        column_type: MondayColumnType.CHECKBOX,
        default_value: false
      };

      expect(mapping.default_value).toBe(false);
    });

    it('should support array default values', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'tags_col',
        form_field_path: 'data.tags',
        column_type: MondayColumnType.TAGS,
        default_value: []
      };

      expect(mapping.default_value).toEqual([]);
    });

    it('should support object default values', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'complex_col',
        form_field_path: 'data.metadata',
        column_type: MondayColumnType.TEXT,
        default_value: { key: 'value' }
      };

      expect(mapping.default_value).toEqual({ key: 'value' });
    });
  });

  describe('MondayFormMapping interface', () => {
    it('should create form mapping with required fields', () => {
      const mapping: MondayFormMapping = {
        board_id: 'board_123',
        group_id: 'group_456',
        column_mappings: []
      };

      expect(mapping.board_id).toBe('board_123');
      expect(mapping.group_id).toBe('group_456');
      expect(mapping.column_mappings).toEqual([]);
      expect(mapping.item_name_field).toBeUndefined();
      expect(mapping.default_item_name).toBeUndefined();
    });

    it('should support optional item_name_field', () => {
      const mapping: MondayFormMapping = {
        board_id: 'board_123',
        group_id: 'group_456',
        item_name_field: 'data.name',
        column_mappings: []
      };

      expect(mapping.item_name_field).toBe('data.name');
    });

    it('should support optional default_item_name', () => {
      const mapping: MondayFormMapping = {
        board_id: 'board_123',
        group_id: 'group_456',
        default_item_name: 'New Item',
        column_mappings: []
      };

      expect(mapping.default_item_name).toBe('New Item');
    });

    it('should support multiple column mappings', () => {
      const mapping: MondayFormMapping = {
        board_id: 'board_123',
        group_id: 'group_456',
        column_mappings: [
          {
            monday_column_id: 'col1',
            form_field_path: 'data.field1',
            column_type: MondayColumnType.TEXT
          },
          {
            monday_column_id: 'col2',
            form_field_path: 'data.field2',
            column_type: MondayColumnType.NUMBER
          }
        ]
      };

      expect(mapping.column_mappings).toHaveLength(2);
      expect(mapping.column_mappings[0].column_type).toBe(MondayColumnType.TEXT);
      expect(mapping.column_mappings[1].column_type).toBe(MondayColumnType.NUMBER);
    });

    it('should support numeric board_id', () => {
      const mapping: MondayFormMapping = {
        board_id: '123456',
        group_id: 'group_789',
        column_mappings: []
      };

      expect(mapping.board_id).toBe('123456');
    });

    it('should support special characters in group_id', () => {
      const mapping: MondayFormMapping = {
        board_id: 'board_123',
        group_id: 'group_name_with_underscores',
        column_mappings: []
      };

      expect(mapping.group_id).toContain('_');
    });
  });

  describe('FormSubmissionData interface', () => {
    it('should create form submission with required fields', () => {
      const submission: FormSubmissionData = {
        id: 'submission_123',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Test Form',
        data: {}
      };

      expect(submission.id).toBe('submission_123');
      expect(submission.timestamp).toBe('2025-12-01T00:00:00.000Z');
      expect(submission.formTitle).toBe('Test Form');
      expect(submission.data).toEqual({});
    });

    it('should support nested data fields', () => {
      const submission: FormSubmissionData = {
        id: 'sub_nested',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Nested Form',
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          address: {
            street: 'Main St',
            city: 'NYC'
          }
        }
      };

      expect(submission.data.name).toBe('John Doe');
      expect(submission.data.address.city).toBe('NYC');
    });

    it('should support optional __SUBITEMS__ array', () => {
      const submission: FormSubmissionData = {
        id: 'sub_with_items',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Form with Subitems',
        data: {
          __SUBITEMS__: [
            { id: 'subitem_1' },
            { id: 'subitem_2' }
          ]
        }
      };

      expect(submission.data.__SUBITEMS__).toHaveLength(2);
      expect(submission.data.__SUBITEMS__![0].id).toBe('subitem_1');
    });

    it('should support empty data object', () => {
      const submission: FormSubmissionData = {
        id: 'empty_sub',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Empty Form',
        data: {}
      };

      expect(Object.keys(submission.data)).toHaveLength(0);
    });

    it('should support ISO timestamp format', () => {
      const submission: FormSubmissionData = {
        id: 'iso_sub',
        timestamp: '2025-12-01T14:30:00.000Z',
        formTitle: 'ISO Form',
        data: {}
      };

      expect(submission.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should support special characters in formTitle', () => {
      const submission: FormSubmissionData = {
        id: 'special_sub',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Form Title: Special & Characters!',
        data: {}
      };

      expect(submission.formTitle).toContain('&');
      expect(submission.formTitle).toContain('!');
    });

    it('should support long formTitle', () => {
      const submission: FormSubmissionData = {
        id: 'long_sub',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'A'.repeat(300),
        data: {}
      };

      expect(submission.formTitle).toHaveLength(300);
    });

    it('should support any data types in data field', () => {
      const submission: FormSubmissionData = {
        id: 'mixed_sub',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Mixed Types',
        data: {
          string: 'text',
          number: 123,
          boolean: true,
          array: [1, 2, 3],
          object: { key: 'value' },
          null: null
        }
      };

      expect(typeof submission.data.string).toBe('string');
      expect(typeof submission.data.number).toBe('number');
      expect(typeof submission.data.boolean).toBe('boolean');
      expect(Array.isArray(submission.data.array)).toBe(true);
      expect(typeof submission.data.object).toBe('object');
      expect(submission.data.null).toBeNull();
    });
  });

  describe('SubitemData interface', () => {
    it('should create subitem with optional id', () => {
      const subitem: SubitemData = {
        id: 'subitem_123'
      };

      expect(subitem.id).toBe('subitem_123');
    });

    it('should support conectar_quadros87__1 field', () => {
      const subitem: SubitemData = {
        conectar_quadros87__1: 'Email'
      };

      expect(subitem.conectar_quadros87__1).toBe('Email');
    });

    it('should support data__1 field with date format', () => {
      const subitem: SubitemData = {
        data__1: '2025-12-01'
      };

      expect(subitem.data__1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should support n_meros__1 field with number', () => {
      const subitem: SubitemData = {
        n_meros__1: 5
      };

      expect(subitem.n_meros__1).toBe(5);
    });

    it('should support texto__1 field', () => {
      const subitem: SubitemData = {
        texto__1: 'Subitem description'
      };

      expect(subitem.texto__1).toBe('Subitem description');
    });

    it('should support lista_suspensa5__1 field with array', () => {
      const subitem: SubitemData = {
        lista_suspensa5__1: ['Emocional', 'Racional']
      };

      expect(subitem.lista_suspensa5__1).toHaveLength(2);
      expect(subitem.lista_suspensa5__1![0]).toBe('Emocional');
    });

    it('should support lista_suspensa53__1 field with array', () => {
      const subitem: SubitemData = {
        lista_suspensa53__1: ['Exclusividade', 'Urgência']
      };

      expect(subitem.lista_suspensa53__1).toHaveLength(2);
    });

    it('should support conectar_quadros_mkkcnyr3 field', () => {
      const subitem: SubitemData = {
        conectar_quadros_mkkcnyr3: '14:30'
      };

      expect(subitem.conectar_quadros_mkkcnyr3).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should support n_meros_mkkchcmk field', () => {
      const subitem: SubitemData = {
        n_meros_mkkchcmk: 100
      };

      expect(subitem.n_meros_mkkchcmk).toBe(100);
    });

    it('should support all fields together', () => {
      const subitem: SubitemData = {
        id: 'full_subitem',
        conectar_quadros87__1: 'Push',
        data__1: '2025-12-15',
        n_meros__1: 3,
        texto__1: 'Full subitem',
        lista_suspensa5__1: ['Emocional'],
        lista_suspensa53__1: ['Exclusividade'],
        conectar_quadros_mkkcnyr3: '10:00',
        n_meros_mkkchcmk: 50
      };

      expect(subitem.id).toBe('full_subitem');
      expect(subitem.conectar_quadros87__1).toBe('Push');
      expect(subitem.n_meros__1).toBe(3);
    });

    it('should support dynamic additional fields', () => {
      const subitem: SubitemData = {
        custom_field_1: 'custom value',
        custom_field_2: 123,
        custom_field_3: true
      };

      expect(subitem.custom_field_1).toBe('custom value');
      expect(subitem.custom_field_2).toBe(123);
      expect(subitem.custom_field_3).toBe(true);
    });

    it('should support empty subitem', () => {
      const subitem: SubitemData = {};

      expect(Object.keys(subitem)).toHaveLength(0);
    });
  });

  describe('CAMPAIGN_FORM_MAPPING constant', () => {
    it('should have valid board_id', () => {
      expect(CAMPAIGN_FORM_MAPPING.board_id).toBeDefined();
      expect(typeof CAMPAIGN_FORM_MAPPING.board_id).toBe('string');
      expect(CAMPAIGN_FORM_MAPPING.board_id.length).toBeGreaterThan(0);
    });

    it('should have valid group_id', () => {
      expect(CAMPAIGN_FORM_MAPPING.group_id).toBeDefined();
      expect(typeof CAMPAIGN_FORM_MAPPING.group_id).toBe('string');
      expect(CAMPAIGN_FORM_MAPPING.group_id.length).toBeGreaterThan(0);
    });

    it('should have column_mappings array', () => {
      expect(CAMPAIGN_FORM_MAPPING.column_mappings).toBeDefined();
      expect(Array.isArray(CAMPAIGN_FORM_MAPPING.column_mappings)).toBe(true);
      expect(CAMPAIGN_FORM_MAPPING.column_mappings.length).toBeGreaterThan(0);
    });

    it('should have valid column mappings structure', () => {
      CAMPAIGN_FORM_MAPPING.column_mappings.forEach(mapping => {
        expect(mapping.monday_column_id).toBeDefined();
        expect(mapping.form_field_path).toBeDefined();
        expect(mapping.column_type).toBeDefined();
        expect(Object.values(MondayColumnType)).toContain(mapping.column_type);
      });
    });

    it('should have item_name_field or default_item_name', () => {
      expect(
        CAMPAIGN_FORM_MAPPING.item_name_field || CAMPAIGN_FORM_MAPPING.default_item_name
      ).toBeDefined();
    });
  });

  describe('GAM_CAMPAIGN_FORM_MAPPING constant', () => {
    it('should have valid board_id', () => {
      expect(GAM_CAMPAIGN_FORM_MAPPING.board_id).toBeDefined();
      expect(typeof GAM_CAMPAIGN_FORM_MAPPING.board_id).toBe('string');
      expect(GAM_CAMPAIGN_FORM_MAPPING.board_id.length).toBeGreaterThan(0);
    });

    it('should have valid group_id', () => {
      expect(GAM_CAMPAIGN_FORM_MAPPING.group_id).toBeDefined();
      expect(typeof GAM_CAMPAIGN_FORM_MAPPING.group_id).toBe('string');
      expect(GAM_CAMPAIGN_FORM_MAPPING.group_id.length).toBeGreaterThan(0);
    });

    it('should have column_mappings array', () => {
      expect(GAM_CAMPAIGN_FORM_MAPPING.column_mappings).toBeDefined();
      expect(Array.isArray(GAM_CAMPAIGN_FORM_MAPPING.column_mappings)).toBe(true);
      expect(GAM_CAMPAIGN_FORM_MAPPING.column_mappings.length).toBeGreaterThan(0);
    });

    it('should have valid column mappings structure', () => {
      GAM_CAMPAIGN_FORM_MAPPING.column_mappings.forEach(mapping => {
        expect(mapping.monday_column_id).toBeDefined();
        expect(mapping.form_field_path).toBeDefined();
        expect(mapping.column_type).toBeDefined();
        expect(Object.values(MondayColumnType)).toContain(mapping.column_type);
      });
    });

    it('should have item_name_field or default_item_name', () => {
      expect(
        GAM_CAMPAIGN_FORM_MAPPING.item_name_field || GAM_CAMPAIGN_FORM_MAPPING.default_item_name
      ).toBeDefined();
    });
  });

  describe('MARKETING_BOARD_FORM_MAPPING constant', () => {
    it('should have valid board_id', () => {
      expect(MARKETING_BOARD_FORM_MAPPING.board_id).toBeDefined();
      expect(typeof MARKETING_BOARD_FORM_MAPPING.board_id).toBe('string');
      expect(MARKETING_BOARD_FORM_MAPPING.board_id.length).toBeGreaterThan(0);
    });

    it('should have valid group_id', () => {
      expect(MARKETING_BOARD_FORM_MAPPING.group_id).toBeDefined();
      expect(typeof MARKETING_BOARD_FORM_MAPPING.group_id).toBe('string');
      expect(MARKETING_BOARD_FORM_MAPPING.group_id.length).toBeGreaterThan(0);
    });

    it('should have column_mappings array', () => {
      expect(MARKETING_BOARD_FORM_MAPPING.column_mappings).toBeDefined();
      expect(Array.isArray(MARKETING_BOARD_FORM_MAPPING.column_mappings)).toBe(true);
      expect(MARKETING_BOARD_FORM_MAPPING.column_mappings.length).toBeGreaterThan(0);
    });

    it('should have valid column mappings structure', () => {
      MARKETING_BOARD_FORM_MAPPING.column_mappings.forEach((mapping: ColumnMapping) => {
        expect(mapping.monday_column_id).toBeDefined();
        expect(mapping.form_field_path).toBeDefined();
        expect(mapping.column_type).toBeDefined();
        expect(Object.values(MondayColumnType)).toContain(mapping.column_type);
      });
    });

    it('should have item_name_field or default_item_name', () => {
      expect(
        MARKETING_BOARD_FORM_MAPPING.item_name_field || MARKETING_BOARD_FORM_MAPPING.default_item_name
      ).toBeDefined();
    });

    it('should be different from other mappings', () => {
      expect(MARKETING_BOARD_FORM_MAPPING.board_id).not.toBe(CAMPAIGN_FORM_MAPPING.board_id);
      expect(MARKETING_BOARD_FORM_MAPPING.board_id).not.toBe(GAM_CAMPAIGN_FORM_MAPPING.board_id);
    });
  });

  describe('Transform functions', () => {
    describe('GAM_CAMPAIGN timeline transform', () => {
      let timelineMapping: ColumnMapping;

      beforeEach(() => {
        timelineMapping = GAM_CAMPAIGN_FORM_MAPPING.column_mappings.find(
          m => m.monday_column_id === 'timerange_mkrmvz3'
        )!;
      });

      it('should find timeline mapping with transform', () => {
        expect(timelineMapping).toBeDefined();
        expect(timelineMapping.transform).toBeDefined();
      });

      it('should use gam_timeline if provided with from and to', () => {
        const timelineValue = { from: '2025-01-01', to: '2025-01-31' };
        const result = timelineMapping.transform!(timelineValue);

        expect(result).toEqual({ from: '2025-01-01', to: '2025-01-31' });
      });

      it('should construct timeline from gam_start_date and gam_end_date', () => {
        const formData: FormSubmissionData = {
          id: 'test_1',
          timestamp: '2025-12-01T00:00:00.000Z',
          formTitle: 'Test',
          data: {
            gam_start_date: '2025-02-01',
            gam_end_date: '2025-02-28'
          }
        };

        const result = timelineMapping.transform!(null, formData);

        expect(result).toEqual({ from: '2025-02-01', to: '2025-02-28' });
      });

      it('should return undefined if gam_timeline is invalid and no fallback dates', () => {
        const formData: FormSubmissionData = {
          id: 'test_2',
          timestamp: '2025-12-01T00:00:00.000Z',
          formTitle: 'Test',
          data: {}
        };

        const result = timelineMapping.transform!('invalid', formData);

        expect(result).toBeUndefined();
      });

      it('should prioritize gam_timeline over fallback dates', () => {
        const timelineValue = { from: '2025-03-01', to: '2025-03-31' };
        const formData: FormSubmissionData = {
          id: 'test_3',
          timestamp: '2025-12-01T00:00:00.000Z',
          formTitle: 'Test',
          data: {
            gam_start_date: '2025-02-01',
            gam_end_date: '2025-02-28'
          }
        };

        const result = timelineMapping.transform!(timelineValue, formData);

        expect(result).toEqual({ from: '2025-03-01', to: '2025-03-31' });
      });

      it('should return undefined if only start date is provided', () => {
        const formData: FormSubmissionData = {
          id: 'test_4',
          timestamp: '2025-12-01T00:00:00.000Z',
          formTitle: 'Test',
          data: {
            gam_start_date: '2025-02-01'
          }
        };

        const result = timelineMapping.transform!(null, formData);

        expect(result).toBeUndefined();
      });

      it('should return undefined if only end date is provided', () => {
        const formData: FormSubmissionData = {
          id: 'test_5',
          timestamp: '2025-12-01T00:00:00.000Z',
          formTitle: 'Test',
          data: {
            gam_end_date: '2025-02-28'
          }
        };

        const result = timelineMapping.transform!(null, formData);

        expect(result).toBeUndefined();
      });

      it('should handle gam_timeline with missing to field', () => {
        const timelineValue = { from: '2025-03-01' };
        const result = timelineMapping.transform!(timelineValue);

        expect(result).not.toEqual(timelineValue);
      });

      it('should handle gam_timeline with missing from field', () => {
        const timelineValue = { to: '2025-03-31' };
        const result = timelineMapping.transform!(timelineValue);

        expect(result).not.toEqual(timelineValue);
      });

      it('should handle gam_timeline as non-object', () => {
        const result = timelineMapping.transform!('not-an-object');

        expect(result).toBeUndefined();
      });
    });

    it('should support multiple column types in mappings', () => {
      const textMappings = CAMPAIGN_FORM_MAPPING.column_mappings.filter(
        m => m.column_type === MondayColumnType.TEXT
      );
      const peopleMappings = CAMPAIGN_FORM_MAPPING.column_mappings.filter(
        m => m.column_type === MondayColumnType.PEOPLE
      );

      expect(textMappings.length).toBeGreaterThan(0);
      expect(peopleMappings.length).toBeGreaterThan(0);
    });

    it('should have unique monday_column_ids within each mapping', () => {
      [CAMPAIGN_FORM_MAPPING, GAM_CAMPAIGN_FORM_MAPPING, MARKETING_BOARD_FORM_MAPPING].forEach(mapping => {
        const columnIds = mapping.column_mappings.map(m => m.monday_column_id);
        const uniqueIds = new Set(columnIds);
        expect(uniqueIds.size).toBe(columnIds.length);
      });
    });

    it('should have valid form_field_paths starting with data.', () => {
      [CAMPAIGN_FORM_MAPPING, GAM_CAMPAIGN_FORM_MAPPING, MARKETING_BOARD_FORM_MAPPING].forEach(mapping => {
        mapping.column_mappings.forEach(colMapping => {
          expect(colMapping.form_field_path).toMatch(/^data\./);
        });
      });
    });
  });

  describe('Column type coverage', () => {
    it('should use TEXT type in at least one mapping', () => {
      const hasText = CAMPAIGN_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.TEXT
      );
      expect(hasText).toBe(true);
    });

    it('should use NUMBER type in at least one mapping', () => {
      const hasNumber = MARKETING_BOARD_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.NUMBER
      );
      expect(hasNumber).toBe(true);
    });

    it('should use DATE type in at least one mapping', () => {
      const hasDate = MARKETING_BOARD_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.DATE
      );
      expect(hasDate).toBe(true);
    });

    it('should use DROPDOWN type in at least one mapping', () => {
      const hasDropdown = MARKETING_BOARD_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.DROPDOWN
      );
      expect(hasDropdown).toBe(true);
    });

    it('should use PEOPLE type in at least one mapping', () => {
      const hasPeople = CAMPAIGN_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.PEOPLE
      );
      expect(hasPeople).toBe(true);
    });

    it('should use TIMELINE type in GAM mapping', () => {
      const hasTimeline = GAM_CAMPAIGN_FORM_MAPPING.column_mappings.some(
        m => m.column_type === MondayColumnType.TIMELINE
      );
      expect(hasTimeline).toBe(true);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle FormSubmissionData with missing data fields', () => {
      const submission: FormSubmissionData = {
        id: 'edge_1',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Edge Case Form',
        data: {
          name: undefined,
          email: null
        }
      };

      expect(submission.data.name).toBeUndefined();
      expect(submission.data.email).toBeNull();
    });

    it('should handle SubitemData with all optional fields missing', () => {
      const subitem: SubitemData = {};

      expect(subitem.id).toBeUndefined();
      expect(subitem.conectar_quadros87__1).toBeUndefined();
      expect(subitem.data__1).toBeUndefined();
    });

    it('should handle deeply nested data in FormSubmissionData', () => {
      const submission: FormSubmissionData = {
        id: 'nested_deep',
        timestamp: '2025-12-01T00:00:00.000Z',
        formTitle: 'Deep Nested',
        data: {
          level1: {
            level2: {
              level3: {
                value: 'deep value'
              }
            }
          }
        }
      };

      expect(submission.data.level1.level2.level3.value).toBe('deep value');
    });

    it('should handle SubitemData with numeric string values', () => {
      const subitem: SubitemData = {
        n_meros__1: 123,
        n_meros_mkkchcmk: 456
      };

      expect(typeof subitem.n_meros__1).toBe('number');
      expect(typeof subitem.n_meros_mkkchcmk).toBe('number');
    });

    it('should handle SubitemData with array fields', () => {
      const subitem: SubitemData = {
        lista_suspensa5__1: ['Value1', 'Value2', 'Value3'],
        lista_suspensa53__1: []
      };

      expect(subitem.lista_suspensa5__1).toHaveLength(3);
      expect(subitem.lista_suspensa53__1).toHaveLength(0);
    });

    it('should validate board_id format', () => {
      expect(CAMPAIGN_FORM_MAPPING.board_id).toMatch(/^\d+$/);
      expect(GAM_CAMPAIGN_FORM_MAPPING.board_id).toMatch(/^\d+$/);
      expect(MARKETING_BOARD_FORM_MAPPING.board_id).toMatch(/^\d+$/);
    });

    it('should have consistent naming patterns for column IDs', () => {
      CAMPAIGN_FORM_MAPPING.column_mappings.forEach(mapping => {
        expect(mapping.monday_column_id).toBeTruthy();
        expect(typeof mapping.monday_column_id).toBe('string');
      });
    });

    it('should handle transform returning null', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'test_col',
        form_field_path: 'data.field',
        column_type: MondayColumnType.TEXT,
        transform: () => null
      };

      expect(mapping.transform!('any value')).toBeNull();
    });

    it('should handle transform returning undefined', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'test_col',
        form_field_path: 'data.field',
        column_type: MondayColumnType.TEXT,
        transform: () => undefined
      };

      expect(mapping.transform!('any value')).toBeUndefined();
    });

    it('should handle transform with complex return types', () => {
      const mapping: ColumnMapping = {
        monday_column_id: 'test_col',
        form_field_path: 'data.field',
        column_type: MondayColumnType.TEXT,
        transform: (value) => ({ processed: value, timestamp: Date.now() })
      };

      const result = mapping.transform!('test');
      expect(result).toHaveProperty('processed', 'test');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
