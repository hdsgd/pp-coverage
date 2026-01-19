import {
  ChannelScheduleDto,
  CreateChannelScheduleDto,
  UpdateChannelScheduleDto,
  ChannelScheduleResponseDto
} from '../../src/dto/ChannelScheduleDto';

describe('ChannelScheduleDto', () => {
  describe('ChannelScheduleDto interface', () => {
    it('should allow creating object with all required fields', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_123',
        data: '01/12/2025',
        hora: '10:30',
        qtd: 100,
        area_solicitante: 'marketing_area_123'
      };

      expect(dto.id_canal).toBe('canal_123');
      expect(dto.data).toBe('01/12/2025');
      expect(dto.hora).toBe('10:30');
      expect(dto.qtd).toBe(100);
      expect(dto.area_solicitante).toBe('marketing_area_123');
    });

    it('should allow creating object with optional fields', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_456',
        data: '15/12/2025',
        hora: '14:00',
        qtd: 50,
        area_solicitante: 'sales_area_456',
        user_id: 'user_789',
        solicitante: 'João Silva',
        tipo: 'reserva'
      };

      expect(dto.user_id).toBe('user_789');
      expect(dto.solicitante).toBe('João Silva');
      expect(dto.tipo).toBe('reserva');
    });

    it('should allow tipo as "agendamento"', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_001',
        data: '20/12/2025',
        hora: '09:00',
        qtd: 200,
        area_solicitante: 'tech_area_001',
        tipo: 'agendamento'
      };

      expect(dto.tipo).toBe('agendamento');
    });

    it('should allow optional fields to be undefined', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_999',
        data: '31/12/2025',
        hora: '23:59',
        qtd: 10,
        area_solicitante: 'default_area'
      };

      expect(dto.user_id).toBeUndefined();
      expect(dto.solicitante).toBeUndefined();
      expect(dto.tipo).toBeUndefined();
    });

    it('should support different time formats', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_time',
        data: '05/12/2025',
        hora: '00:00',
        qtd: 1,
        area_solicitante: 'area_time'
      };

      expect(dto.hora).toBe('00:00');
    });

    it('should support different date formats', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_date',
        data: '31/01/2025',
        hora: '12:00',
        qtd: 75,
        area_solicitante: 'area_date'
      };

      expect(dto.data).toBe('31/01/2025');
    });

    it('should support zero quantity', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_zero',
        data: '10/12/2025',
        hora: '15:00',
        qtd: 0,
        area_solicitante: 'area_zero'
      };

      expect(dto.qtd).toBe(0);
    });

    it('should support large quantities', () => {
      const dto: ChannelScheduleDto = {
        id_canal: 'canal_large',
        data: '25/12/2025',
        hora: '18:00',
        qtd: 999999,
        area_solicitante: 'area_large'
      };

      expect(dto.qtd).toBe(999999);
    });
  });

  describe('CreateChannelScheduleDto interface', () => {
    it('should extend ChannelScheduleDto with all fields', () => {
      const dto: CreateChannelScheduleDto = {
        id_canal: 'create_canal_123',
        data: '02/12/2025',
        hora: '11:00',
        qtd: 150,
        area_solicitante: 'create_area_123',
        user_id: 'create_user_123',
        solicitante: 'Maria Santos',
        tipo: 'reserva'
      };

      expect(dto.id_canal).toBe('create_canal_123');
      expect(dto.user_id).toBe('create_user_123');
      expect(dto.solicitante).toBe('Maria Santos');
      expect(dto.tipo).toBe('reserva');
    });

    it('should work without optional fields', () => {
      const dto: CreateChannelScheduleDto = {
        id_canal: 'create_minimal',
        data: '03/12/2025',
        hora: '08:00',
        qtd: 25,
        area_solicitante: 'minimal_area'
      };

      expect(dto.id_canal).toBe('create_minimal');
      expect(dto.user_id).toBeUndefined();
    });

    it('should allow tipo as agendamento in create', () => {
      const dto: CreateChannelScheduleDto = {
        id_canal: 'create_agendamento',
        data: '04/12/2025',
        hora: '16:00',
        qtd: 80,
        area_solicitante: 'agendamento_area',
        tipo: 'agendamento'
      };

      expect(dto.tipo).toBe('agendamento');
    });

    it('should support creation with all string IDs', () => {
      const dto: CreateChannelScheduleDto = {
        id_canal: 'canal_abc123',
        data: '06/12/2025',
        hora: '13:30',
        qtd: 45,
        area_solicitante: 'area_xyz789',
        user_id: 'user_def456'
      };

      expect(dto.id_canal).toMatch(/^canal_/);
      expect(dto.area_solicitante).toMatch(/^area_/);
      expect(dto.user_id).toMatch(/^user_/);
    });
  });

  describe('UpdateChannelScheduleDto interface', () => {
    it('should allow updating all fields', () => {
      const dto: UpdateChannelScheduleDto = {
        id_canal: 'update_canal_123',
        data: '07/12/2025',
        hora: '10:00',
        qtd: 300,
        area_solicitante: 'update_area_123',
        user_id: 'update_user_123',
        solicitante: 'Pedro Oliveira',
        tipo: 'agendamento'
      };

      expect(dto.id_canal).toBe('update_canal_123');
      expect(dto.solicitante).toBe('Pedro Oliveira');
    });

    it('should allow partial update with only id_canal', () => {
      const dto: UpdateChannelScheduleDto = {
        id_canal: 'partial_canal'
      };

      expect(dto.id_canal).toBe('partial_canal');
      expect(dto.data).toBeUndefined();
      expect(dto.hora).toBeUndefined();
      expect(dto.qtd).toBeUndefined();
    });

    it('should allow partial update with only data', () => {
      const dto: UpdateChannelScheduleDto = {
        data: '08/12/2025'
      };

      expect(dto.data).toBe('08/12/2025');
      expect(dto.id_canal).toBeUndefined();
    });

    it('should allow partial update with only hora', () => {
      const dto: UpdateChannelScheduleDto = {
        hora: '17:45'
      };

      expect(dto.hora).toBe('17:45');
    });

    it('should allow partial update with only qtd', () => {
      const dto: UpdateChannelScheduleDto = {
        qtd: 500
      };

      expect(dto.qtd).toBe(500);
    });

    it('should allow partial update with only area_solicitante', () => {
      const dto: UpdateChannelScheduleDto = {
        area_solicitante: 'new_area_999'
      };

      expect(dto.area_solicitante).toBe('new_area_999');
    });

    it('should allow partial update with only user_id', () => {
      const dto: UpdateChannelScheduleDto = {
        user_id: 'new_user_888'
      };

      expect(dto.user_id).toBe('new_user_888');
    });

    it('should allow partial update with only solicitante', () => {
      const dto: UpdateChannelScheduleDto = {
        solicitante: 'Ana Costa'
      };

      expect(dto.solicitante).toBe('Ana Costa');
    });

    it('should allow partial update with only tipo', () => {
      const dto: UpdateChannelScheduleDto = {
        tipo: 'reserva'
      };

      expect(dto.tipo).toBe('reserva');
    });

    it('should allow partial update with multiple fields', () => {
      const dto: UpdateChannelScheduleDto = {
        data: '09/12/2025',
        hora: '20:00',
        qtd: 150
      };

      expect(dto.data).toBe('09/12/2025');
      expect(dto.hora).toBe('20:00');
      expect(dto.qtd).toBe(150);
      expect(dto.id_canal).toBeUndefined();
    });

    it('should allow empty update object', () => {
      const dto: UpdateChannelScheduleDto = {};

      expect(Object.keys(dto)).toHaveLength(0);
    });

    it('should allow updating tipo from reserva to agendamento', () => {
      const dto: UpdateChannelScheduleDto = {
        tipo: 'agendamento'
      };

      expect(dto.tipo).toBe('agendamento');
    });
  });

  describe('ChannelScheduleResponseDto interface', () => {
    it('should include all required response fields', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'response_id_123',
        id_canal: 'response_canal_456',
        data: '10/12/2025',
        hora: '11:30',
        qtd: 250,
        area_solicitante: 'response_area_789',
        tipo: 'reserva',
        created_at: new Date('2025-12-01T00:00:00.000Z'),
        updated_at: new Date('2025-12-01T12:00:00.000Z')
      };

      expect(dto.id).toBe('response_id_123');
      expect(dto.created_at).toBeInstanceOf(Date);
      expect(dto.updated_at).toBeInstanceOf(Date);
      expect(dto.tipo).toBe('reserva');
    });

    it('should include optional solicitante field', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'response_id_456',
        id_canal: 'canal_789',
        data: '11/12/2025',
        hora: '14:00',
        qtd: 100,
        area_solicitante: 'area_012',
        solicitante: 'Carlos Mendes',
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dto.solicitante).toBe('Carlos Mendes');
    });

    it('should support tipo as agendamento in response', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'response_agendamento_id',
        id_canal: 'canal_agendamento',
        data: '12/12/2025',
        hora: '09:00',
        qtd: 75,
        area_solicitante: 'area_agendamento',
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dto.tipo).toBe('agendamento');
    });

    it('should handle Date objects for timestamps', () => {
      const now = new Date('2025-12-01T15:30:00.000Z');
      const later = new Date('2025-12-01T16:00:00.000Z');

      const dto: ChannelScheduleResponseDto = {
        id: 'timestamp_id',
        id_canal: 'timestamp_canal',
        data: '13/12/2025',
        hora: '15:30',
        qtd: 50,
        area_solicitante: 'timestamp_area',
        tipo: 'reserva',
        created_at: now,
        updated_at: later
      };

      expect(dto.created_at.getTime()).toBeLessThan(dto.updated_at.getTime());
    });

    it('should allow same timestamp for created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T10:00:00.000Z');

      const dto: ChannelScheduleResponseDto = {
        id: 'same_time_id',
        id_canal: 'same_time_canal',
        data: '14/12/2025',
        hora: '10:00',
        qtd: 125,
        area_solicitante: 'same_time_area',
        tipo: 'agendamento',
        created_at: timestamp,
        updated_at: timestamp
      };

      expect(dto.created_at).toEqual(dto.updated_at);
    });

    it('should support response without optional solicitante', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'no_solicitante_id',
        id_canal: 'no_solicitante_canal',
        data: '15/12/2025',
        hora: '12:00',
        qtd: 200,
        area_solicitante: 'no_solicitante_area',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dto.solicitante).toBeUndefined();
    });

    it('should support complex ID formats in response', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'uuid-1234-5678-9abc-def0',
        id_canal: 'canal-uuid-abcd-efgh',
        data: '16/12/2025',
        hora: '18:00',
        qtd: 300,
        area_solicitante: 'area-uuid-ijkl-mnop',
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dto.id).toMatch(/uuid/);
      expect(dto.id_canal).toMatch(/canal-uuid/);
    });

    it('should handle zero quantity in response', () => {
      const dto: ChannelScheduleResponseDto = {
        id: 'zero_qty_response',
        id_canal: 'zero_canal_response',
        data: '17/12/2025',
        hora: '06:00',
        qtd: 0,
        area_solicitante: 'zero_area_response',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(dto.qtd).toBe(0);
    });
  });
});
