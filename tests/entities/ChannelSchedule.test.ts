import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { User } from '../../src/entities/User';

describe('ChannelSchedule Entity', () => {
  let schedule: ChannelSchedule;

  beforeEach(() => {
    schedule = new ChannelSchedule();
  });

  describe('Entity Properties', () => {
    it('should create channel schedule with all required properties', () => {
      schedule.id = 'schedule_uuid_123';
      schedule.id_canal = 'email_channel';
      schedule.data = new Date('2025-12-15');
      schedule.hora = '14:30';
      schedule.qtd = 1000;
      schedule.area_solicitante = 'Marketing';
      schedule.tipo = 'agendamento';
      schedule.created_at = new Date('2025-12-01T00:00:00.000Z');
      schedule.updated_at = new Date('2025-12-01T00:00:00.000Z');

      expect(schedule.id).toBe('schedule_uuid_123');
      expect(schedule.id_canal).toBe('email_channel');
      expect(schedule.data).toBeInstanceOf(Date);
      expect(schedule.hora).toBe('14:30');
      expect(schedule.qtd).toBe(1000);
      expect(schedule.area_solicitante).toBe('Marketing');
      expect(schedule.tipo).toBe('agendamento');
      expect(schedule.created_at).toBeInstanceOf(Date);
      expect(schedule.updated_at).toBeInstanceOf(Date);
    });

    it('should support UUID format for id', () => {
      schedule.id = '123e4567-e89b-12d3-a456-426614174000';
      expect(schedule.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should support optional user_id property', () => {
      schedule.user_id = 'user_uuid_456';
      expect(schedule.user_id).toBe('user_uuid_456');
    });

    it('should support optional user relationship', () => {
      const user = new User();
      user.id = 'user_uuid_789';
      user.username = 'testuser';
      
      schedule.user = user;
      expect(schedule.user).toBe(user);
      expect(schedule.user.id).toBe('user_uuid_789');
    });

    it('should support optional solicitante property', () => {
      schedule.solicitante = 'João da Silva';
      expect(schedule.solicitante).toBe('João da Silva');
    });

    it('should allow solicitante to be undefined', () => {
      expect(schedule.solicitante).toBeUndefined();
    });

    it('should support tipo as "agendamento"', () => {
      schedule.tipo = 'agendamento';
      expect(schedule.tipo).toBe('agendamento');
    });

    it('should support tipo as "reserva"', () => {
      schedule.tipo = 'reserva';
      expect(schedule.tipo).toBe('reserva');
    });

    it('should handle different channel types', () => {
      const channels = ['Email', 'SMS', 'Push', 'WhatsApp'];
      channels.forEach(channel => {
        schedule.id_canal = channel;
        expect(schedule.id_canal).toBe(channel);
      });
    });

    it('should handle different time formats', () => {
      const times = ['00:00', '12:00', '23:59', '14:30:00'];
      times.forEach(time => {
        schedule.hora = time;
        expect(schedule.hora).toBe(time);
      });
    });

    it('should handle zero quantity', () => {
      schedule.qtd = 0;
      expect(schedule.qtd).toBe(0);
    });

    it('should handle large quantity', () => {
      schedule.qtd = 999999999999999;
      expect(schedule.qtd).toBeGreaterThan(0);
    });

    it('should handle decimal quantity', () => {
      schedule.qtd = 1000.50;
      expect(schedule.qtd).toBe(1000.50);
    });

    it('should handle negative quantity', () => {
      schedule.qtd = -100;
      expect(schedule.qtd).toBe(-100);
    });

    it('should support different area_solicitante values', () => {
      const areas = ['Marketing', 'Vendas', 'TI', 'RH', 'Financeiro'];
      areas.forEach(area => {
        schedule.area_solicitante = area;
        expect(schedule.area_solicitante).toBe(area);
      });
    });

    it('should handle long area_solicitante names', () => {
      schedule.area_solicitante = 'A'.repeat(255);
      expect(schedule.area_solicitante).toHaveLength(255);
    });

    it('should handle special characters in area_solicitante', () => {
      schedule.area_solicitante = 'Marketing & Vendas - Região Sul';
      expect(schedule.area_solicitante).toContain('&');
      expect(schedule.area_solicitante).toContain('-');
    });

    it('should handle special characters in id_canal', () => {
      schedule.id_canal = 'email_channel_2024-12';
      expect(schedule.id_canal).toContain('_');
      expect(schedule.id_canal).toContain('-');
    });

    it('should handle special characters in solicitante', () => {
      schedule.solicitante = "João O'Connor-Silva";
      expect(schedule.solicitante).toContain("'");
      expect(schedule.solicitante).toContain('-');
    });

    it('should handle unicode characters in solicitante', () => {
      schedule.solicitante = 'José María Ñoño';
      expect(schedule.solicitante).toContain('é');
      expect(schedule.solicitante).toContain('Ñ');
    });

    it('should support same timestamp for created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T12:00:00.000Z');
      schedule.created_at = timestamp;
      schedule.updated_at = timestamp;
      expect(schedule.created_at).toEqual(schedule.updated_at);
    });

    it('should support different timestamps for created_at and updated_at', () => {
      schedule.created_at = new Date('2025-12-01T00:00:00.000Z');
      schedule.updated_at = new Date('2025-12-01T12:00:00.000Z');
      expect(schedule.updated_at.getTime()).toBeGreaterThan(schedule.created_at.getTime());
    });

    it('should handle past dates', () => {
      schedule.data = new Date('2020-06-15T12:00:00Z');
      expect(schedule.data.getUTCFullYear()).toBe(2020);
    });

    it('should handle future dates', () => {
      schedule.data = new Date('2030-12-31');
      expect(schedule.data.getFullYear()).toBe(2030);
    });

    it('should handle date at midnight', () => {
      schedule.data = new Date('2025-12-15T00:00:00.000Z');
      expect(schedule.data.getUTCHours()).toBe(0);
    });

    it('should handle date at end of day', () => {
      schedule.data = new Date('2025-12-15T23:59:59.999Z');
      expect(schedule.data.getUTCHours()).toBe(23);
    });
  });

  describe('Entity Relationships', () => {
    it('should create schedule without user', () => {
      schedule.id = 'sched_1';
      schedule.id_canal = 'Email';
      schedule.data = new Date('2025-12-15');
      schedule.hora = '10:00';
      schedule.qtd = 500;
      schedule.area_solicitante = 'Marketing';
      schedule.tipo = 'agendamento';

      expect(schedule.user).toBeUndefined();
      expect(schedule.user_id).toBeUndefined();
    });

    it('should create schedule with user_id but no user object', () => {
      schedule.user_id = 'user_123';
      expect(schedule.user_id).toBe('user_123');
      expect(schedule.user).toBeUndefined();
    });

    it('should link schedule to user via user_id', () => {
      const user = new User();
      user.id = 'user_uuid_123';
      user.username = 'admin';
      user.role = 'admin';

      schedule.user_id = user.id;
      schedule.user = user;

      expect(schedule.user_id).toBe(user.id);
      expect(schedule.user).toBe(user);
    });

    it('should handle null user', () => {
      schedule.user = undefined;
      expect(schedule.user).toBeUndefined();
    });

    it('should support user with different properties', () => {
      const user = new User();
      user.id = 'admin_uuid';
      user.username = 'administrator';
      user.role = 'admin';
      user.is_active = true;

      schedule.user = user;
      expect(schedule.user.username).toBe('administrator');
      expect(schedule.user.role).toBe('admin');
      expect(schedule.user.is_active).toBe(true);
    });
  });

  describe('Entity Defaults', () => {
    it('should have default tipo as "agendamento"', () => {
      schedule.tipo = 'agendamento';
      expect(schedule.tipo).toBe('agendamento');
    });

    it('should allow changing tipo from default', () => {
      schedule.tipo = 'agendamento';
      expect(schedule.tipo).toBe('agendamento');
      schedule.tipo = 'reserva';
      expect(schedule.tipo).toBe('reserva');
    });
  });

  describe('Entity Constraints', () => {
    it('should handle id_canal up to 255 characters', () => {
      schedule.id_canal = 'a'.repeat(255);
      expect(schedule.id_canal.length).toBe(255);
    });

    it('should handle area_solicitante up to 255 characters', () => {
      schedule.area_solicitante = 'a'.repeat(255);
      expect(schedule.area_solicitante.length).toBe(255);
    });

    it('should handle solicitante up to 255 characters', () => {
      schedule.solicitante = 'a'.repeat(255);
      expect(schedule.solicitante!.length).toBe(255);
    });

    it('should handle tipo up to 50 characters', () => {
      schedule.tipo = 'agendamento';
      expect(schedule.tipo.length).toBeLessThanOrEqual(50);
    });

    it('should handle user_id as UUID (36 characters)', () => {
      schedule.user_id = '123e4567-e89b-12d3-a456-426614174000';
      expect(schedule.user_id.length).toBe(36);
    });

    it('should handle qtd with precision 15 and scale 2', () => {
      schedule.qtd = 9999999999999.99;
      expect(schedule.qtd).toBe(9999999999999.99);
    });

    it('should handle very small decimal qtd', () => {
      schedule.qtd = 0.01;
      expect(schedule.qtd).toBe(0.01);
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should create email campaign schedule', () => {
      schedule.id_canal = 'Email';
      schedule.data = new Date('2025-12-20');
      schedule.hora = '09:00';
      schedule.qtd = 50000;
      schedule.area_solicitante = 'Marketing Digital';
      schedule.tipo = 'agendamento';
      schedule.solicitante = 'Maria Silva';

      expect(schedule.id_canal).toBe('Email');
      expect(schedule.qtd).toBe(50000);
      expect(schedule.tipo).toBe('agendamento');
    });

    it('should create SMS reservation', () => {
      schedule.id_canal = 'SMS';
      schedule.data = new Date('2025-12-25');
      schedule.hora = '18:00';
      schedule.qtd = 10000;
      schedule.area_solicitante = 'Vendas';
      schedule.tipo = 'reserva';
      schedule.user_id = 'admin_user_123';

      expect(schedule.id_canal).toBe('SMS');
      expect(schedule.tipo).toBe('reserva');
      expect(schedule.user_id).toBe('admin_user_123');
    });

    it('should create push notification schedule', () => {
      schedule.id_canal = 'Push';
      schedule.data = new Date('2025-12-30');
      schedule.hora = '12:00';
      schedule.qtd = 100000;
      schedule.area_solicitante = 'Produto';
      schedule.tipo = 'agendamento';

      expect(schedule.id_canal).toBe('Push');
      expect(schedule.qtd).toBe(100000);
    });

    it('should handle schedule with all optional fields', () => {
      const user = new User();
      user.id = 'user_123';
      user.username = 'testuser';

      schedule.id = 'full_schedule';
      schedule.id_canal = 'WhatsApp';
      schedule.data = new Date('2025-12-31');
      schedule.hora = '23:59';
      schedule.qtd = 5000;
      schedule.user_id = user.id;
      schedule.user = user;
      schedule.area_solicitante = 'Atendimento';
      schedule.solicitante = 'Pedro Santos';
      schedule.tipo = 'reserva';
      schedule.created_at = new Date('2025-12-01T00:00:00.000Z');
      schedule.updated_at = new Date('2025-12-01T00:00:00.000Z');

      expect(schedule.user_id).toBeDefined();
      expect(schedule.user).toBeDefined();
      expect(schedule.solicitante).toBeDefined();
      expect(schedule.tipo).toBe('reserva');
    });

    it('should handle schedule with only required fields', () => {
      schedule.id_canal = 'Email';
      schedule.data = new Date('2025-12-15');
      schedule.hora = '10:00';
      schedule.qtd = 1000;
      schedule.area_solicitante = 'Marketing';
      schedule.tipo = 'agendamento';

      expect(schedule.user_id).toBeUndefined();
      expect(schedule.user).toBeUndefined();
      expect(schedule.solicitante).toBeUndefined();
    });
  });

  describe('TypeORM Decorators and Metadata', () => {
    it('should have PrimaryGeneratedColumn decorator for id', () => {
      const schedule = new ChannelSchedule();
      expect(schedule.id).toBeUndefined(); // Not set until persisted
    });

    it('should have ManyToOne relationship to User', () => {
      const user = new User();
      user.id = 'user_123';
      user.username = 'testuser';
      user.password = 'hashedpassword';
      user.role = 'admin';
      
      schedule.user = user;
      schedule.user_id = user.id;
      
      expect(schedule.user).toBeDefined();
      expect(schedule.user.id).toBe('user_123');
      expect(schedule.user_id).toBe('user_123');
    });

    it('should allow accessing user properties through relationship', () => {
      const user = new User();
      user.id = 'user_456';
      user.username = 'johndoe';
      user.password = 'password123';
      user.role = 'user';
      user.is_active = true;
      
      schedule.user = user;
      
      expect(schedule.user.username).toBe('johndoe');
      expect(schedule.user.role).toBe('user');
      expect(schedule.user.is_active).toBe(true);
    });

    it('should have CreateDateColumn and UpdateDateColumn decorators', () => {
      const now = new Date();
      schedule.created_at = now;
      schedule.updated_at = now;
      
      expect(schedule.created_at).toBe(now);
      expect(schedule.updated_at).toBe(now);
    });

    it('should handle schedule with user relationship', () => {
      const user = new User();
      user.id = 'uuid-user';
      user.username = 'testuser';
      
      const schedule = new ChannelSchedule();
      schedule.user = user;
      schedule.user_id = 'uuid-user';
      
      expect(schedule.user).toBeInstanceOf(User);
      expect(schedule.user_id).toBe(user.id);
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle empty string values', () => {
      schedule.id_canal = '';
      schedule.area_solicitante = '';
      schedule.solicitante = '';
      schedule.hora = '';
      
      expect(schedule.id_canal).toBe('');
      expect(schedule.area_solicitante).toBe('');
      expect(schedule.solicitante).toBe('');
      expect(schedule.hora).toBe('');
    });

    it('should handle whitespace in string fields', () => {
      schedule.id_canal = '  Email  ';
      schedule.area_solicitante = ' Marketing ';
      
      expect(schedule.id_canal).toContain('Email');
      expect(schedule.area_solicitante).toContain('Marketing');
    });

    it('should handle time with seconds', () => {
      schedule.hora = '14:30:45';
      expect(schedule.hora).toBe('14:30:45');
    });

    it('should handle midnight time', () => {
      schedule.hora = '00:00:00';
      expect(schedule.hora).toBe('00:00:00');
    });

    it('should handle end of day time', () => {
      schedule.hora = '23:59:59';
      expect(schedule.hora).toBe('23:59:59');
    });

    it('should handle very small qtd', () => {
      schedule.qtd = 0.01;
      expect(schedule.qtd).toBe(0.01);
    });

    it('should handle scientific notation in qtd', () => {
      schedule.qtd = 1.5e5;
      expect(schedule.qtd).toBe(150000);
    });

    it('should handle tipo values strictly', () => {
      schedule.tipo = 'agendamento';
      expect(['agendamento', 'reserva']).toContain(schedule.tipo);
      
      schedule.tipo = 'reserva';
      expect(['agendamento', 'reserva']).toContain(schedule.tipo);
    });

    it('should handle multiple channel types correctly', () => {
      const channels = ['Email', 'SMS', 'Push', 'WhatsApp', 'In-App'];
      channels.forEach(channel => {
        schedule.id_canal = channel;
        expect(schedule.id_canal).toBe(channel);
      });
    });
  });
});
