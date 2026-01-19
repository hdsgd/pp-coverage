import { Repository, DataSource, SelectQueryBuilder, DeleteResult } from 'typeorm';
import { ChannelScheduleService } from '../../src/services/ChannelScheduleService';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { MondayItem } from '../../src/entities/MondayItem';

describe('ChannelScheduleService', () => {
  let service: ChannelScheduleService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockChannelScheduleRepository: jest.Mocked<Repository<ChannelSchedule>>;
  let mockMondayItemRepository: jest.Mocked<Repository<MondayItem>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<ChannelSchedule>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock QueryBuilder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as any;

    // Mock repositories
    mockChannelScheduleRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockMondayItemRepository = {
      findOne: jest.fn(),
    } as any;

    // Mock DataSource
    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === ChannelSchedule) return mockChannelScheduleRepository;
        if (entity === MondayItem) return mockMondayItemRepository;
        return {} as any;
      }),
    } as any;

    service = new ChannelScheduleService(mockDataSource);
  });

  describe('create', () => {
    const mockMondayItem = {
      item_id: '123',
      name: 'Email',
      status: 'Ativo',
      max_value: 1000,
    };

    beforeEach(() => {
      mockMondayItemRepository.findOne.mockResolvedValue(mockMondayItem as any);
      mockQueryBuilder.getMany.mockResolvedValue([]);
    });

    it('should create a new channel schedule successfully', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
        user_id: 'user-1',
        area_solicitante: 'Marketing',
        solicitante: 'John Doe',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id_canal).toBe('123');
      expect(result.data).toBe('25/12/2025');
      expect(result.hora).toBe('14:30');
      expect(result.qtd).toBe(100);
      expect(result.tipo).toBe('agendamento');
    });

    it('should throw error for invalid date format', async () => {
      const createDto = {
        id_canal: '123',
        data: '2025-12-25', // Invalid format
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Formato de data inválido');
    });

    it('should throw error for invalid time format', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '25:61', // Invalid time
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Formato de hora inválido');
    });

    it('should throw error when quantity is zero', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 0,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Quantidade deve ser maior que zero');
    });

    it('should throw error when quantity is negative', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: -10,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Quantidade deve ser maior que zero');
    });

    it('should throw error when area_solicitante is missing', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
      } as any;

      await expect(service.create(createDto)).rejects.toThrow('Área solicitante é obrigatória');
    });

    it('should throw error when canal not found', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue(null);

      const createDto = {
        id_canal: '999',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Canal com ID 999 não encontrado ou inativo');
    });

    it('should throw error when capacity is insufficient', async () => {
      const existingSchedule = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 800,
        tipo: 'agendamento',
        area_solicitante: 'TI',
      };

      mockQueryBuilder.getMany.mockResolvedValue([existingSchedule] as any);

      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 300, // 800 + 300 = 1100 > 1000
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Capacidade insuficiente');
    });

    it('should create with tipo=reserva when explicitly set', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
      } as any;

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result.tipo).toBe('reserva');
    });

    it('should create with tipo=agendamento when user_id is present', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
        user_id: 'user-1',
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result.tipo).toBe('agendamento');
    });

    it('should create with tipo=reserva when no user_id', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result.tipo).toBe('reserva');
    });

    it('should allow reuse of same area reservations', async () => {
      const existingReservation = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 600,
        tipo: 'reserva',
        area_solicitante: 'Marketing',
      };

      mockQueryBuilder.getMany.mockResolvedValue([existingReservation] as any);

      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '14:30',
        qtd: 500, // Can reuse the 600 from same area
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '2',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.qtd).toBe(500);
    });

    it('should handle split hours (08:00)', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({ ...mockMondayItem, max_value: 2000 } as any);

      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '08:00',
        qtd: 900, // Should use 1000 (2000/2) as limit
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });

    it('should handle split hours (08:30)', async () => {
      mockMondayItemRepository.findOne.mockResolvedValue({ ...mockMondayItem, max_value: 2000 } as any);

      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '08:30',
        qtd: 900,
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });

    it('should reject invalid date (32/12/2025)', async () => {
      const createDto = {
        id_canal: '123',
        data: '32/12/2025',
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Formato de data inválido');
    });

    it('should reject invalid time (24:00)', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '24:00',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      await expect(service.create(createDto)).rejects.toThrow('Formato de hora inválido');
    });

    it('should accept valid time formats (00:00 to 23:59)', async () => {
      const createDto = {
        id_canal: '123',
        data: '25/12/2025',
        hora: '23:59',
        qtd: 100,
        area_solicitante: 'Marketing',
      };

      const mockSavedEntity = {
        id: '1',
        ...createDto,
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all schedules ordered by date and hour', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          tipo: 'agendamento',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          id_canal: '124',
          data: new Date(Date.UTC(2025, 11, 26, 12, 0, 0)),
          hora: '15:00',
          qtd: 200,
          tipo: 'reserva',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules as any);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockChannelScheduleRepository.find).toHaveBeenCalledWith({
        order: { data: 'ASC', hora: 'ASC' },
      });
    });

    it('should return empty array when no schedules exist', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findByUserId', () => {
    it('should return schedules for specific user', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          user_id: 'user-1',
          tipo: 'agendamento',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules as any);

      const result = await service.findByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(mockChannelScheduleRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: { data: 'ASC', hora: 'ASC' },
      });
    });

    it('should return empty array for user with no schedules', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId('user-999');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByUserIdAndArea', () => {
    it('should return schedules for user and area', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          user_id: 'user-1',
          area_solicitante: 'Marketing',
          tipo: 'agendamento',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules as any);

      const result = await service.findByUserIdAndArea('user-1', 'Marketing');

      expect(result).toHaveLength(1);
      expect(mockChannelScheduleRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          area_solicitante: 'Marketing',
        },
        order: { data: 'ASC', hora: 'ASC' },
      });
    });

    it('should return empty array when no matches', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.findByUserIdAndArea('user-1', 'TI');

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return schedule by ID', async () => {
      const mockSchedule = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 100,
        tipo: 'agendamento',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.findOne.mockResolvedValue(mockSchedule as any);

      const result = await service.findById('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
    });

    it('should return null when schedule not found', async () => {
      mockChannelScheduleRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByChannel', () => {
    it('should return schedules for specific channel', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          tipo: 'agendamento',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules as any);

      const result = await service.findByChannel('123');

      expect(result).toHaveLength(1);
      expect(mockChannelScheduleRepository.find).toHaveBeenCalledWith({
        where: { id_canal: '123' },
        order: { data: 'ASC', hora: 'ASC' },
      });
    });

    it('should return empty array for channel with no schedules', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.findByChannel('999');

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    const mockMondayItem = {
      item_id: '123',
      name: 'Email',
      status: 'Ativo',
      max_value: 1000,
    };

    const existingSchedule = {
      id: '1',
      id_canal: '123',
      data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
      hora: '14:30',
      qtd: 100,
      area_solicitante: 'Marketing',
      tipo: 'agendamento',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockChannelScheduleRepository.findOne.mockResolvedValue(existingSchedule as any);
      mockMondayItemRepository.findOne.mockResolvedValue(mockMondayItem as any);
      mockQueryBuilder.getMany.mockResolvedValue([existingSchedule] as any);
    });

    it('should update schedule successfully', async () => {
      const updateDto = {
        qtd: 150,
      };

      const updatedSchedule = {
        ...existingSchedule,
        qtd: 150,
      };

      mockChannelScheduleRepository.save.mockResolvedValue(updatedSchedule as any);

      const result = await service.update('1', updateDto);

      expect(result).not.toBeNull();
      expect(result?.qtd).toBe(150);
    });

    it('should return null when schedule not found', async () => {
      mockChannelScheduleRepository.findOne.mockResolvedValue(null);

      const result = await service.update('999', { qtd: 150 });

      expect(result).toBeNull();
    });

    it('should throw error for invalid date format on update', async () => {
      const updateDto = {
        data: '2025-12-25',
      };

      await expect(service.update('1', updateDto)).rejects.toThrow('Formato de data inválido');
    });

    it('should throw error for invalid time format on update', async () => {
      const updateDto = {
        hora: '25:61',
      };

      await expect(service.update('1', updateDto)).rejects.toThrow('Formato de hora inválido');
    });

    it('should throw error when quantity is zero on update', async () => {
      const updateDto = {
        qtd: 0,
      };

      await expect(service.update('1', updateDto)).rejects.toThrow('Quantidade deve ser maior que zero');
    });

    it('should throw error when quantity is negative on update', async () => {
      const updateDto = {
        qtd: -10,
      };

      await expect(service.update('1', updateDto)).rejects.toThrow('Quantidade deve ser maior que zero');
    });

    it('should update multiple fields', async () => {
      const updateDto = {
        qtd: 150,
        hora: '15:00',
        area_solicitante: 'TI',
      };

      const updatedSchedule = {
        ...existingSchedule,
        ...updateDto,
      };

      mockChannelScheduleRepository.save.mockResolvedValue(updatedSchedule as any);

      const result = await service.update('1', updateDto);

      expect(result?.qtd).toBe(150);
      expect(result?.hora).toBe('15:00');
      expect(result?.area_solicitante).toBe('TI');
    });

    it('should validate capacity passes when updating within limits', async () => {
      // Caso simples: update que passa na validação de capacidade
      const existingForUpdate = {
        ...existingSchedule,
      };
      
      mockChannelScheduleRepository.findOne.mockResolvedValue(existingForUpdate as any);
      
      // Mock para buscar o mondayItem durante validateCapacity
      mockMondayItemRepository.findOne.mockResolvedValue(mockMondayItem as any);
      
      // Mock para validação de capacidade - retornar apenas o schedule atual
      mockQueryBuilder.getMany.mockResolvedValue([existingSchedule] as any);

      const updateDto = {
        qtd: 200, // Dentro do limite
      };

      const updatedSchedule = {
        ...existingSchedule,
        qtd: 200,
      };

      mockChannelScheduleRepository.save.mockResolvedValue(updatedSchedule as any);

      const result = await service.update('1', updateDto);

      expect(result).not.toBeNull();
      expect(result?.qtd).toBe(200);
    });
  });

  describe('delete', () => {
    it('should delete schedule successfully', async () => {
      const mockDeleteResult: DeleteResult = { affected: 1, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.delete('1');

      expect(result).toBe(true);
      expect(mockChannelScheduleRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should return false when schedule not found', async () => {
      const mockDeleteResult: DeleteResult = { affected: 0, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.delete('999');

      expect(result).toBe(false);
    });

    it('should handle undefined affected gracefully', async () => {
      const mockDeleteResult: DeleteResult = { affected: undefined, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.delete('999');

      // A implementação retorna `result.affected !== 0`
      // undefined !== 0 é true, então retorna true
      expect(result).toBe(true);
    });
  });

  describe('deleteByChannelDateHour', () => {
    beforeEach(() => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          area_solicitante: 'Marketing',
          tipo: 'reserva',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSchedules as any);
    });

    it('should delete schedules by channel, date and hour', async () => {
      const mockDeleteResult: DeleteResult = { affected: 1, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.deleteByChannelDateHour('123', '25/12/2025', '14:30');

      expect(result).toBe(1);
      expect(mockChannelScheduleRepository.delete).toHaveBeenCalled();
    });

    it('should throw error for invalid date format', async () => {
      await expect(
        service.deleteByChannelDateHour('123', '2025-12-25', '14:30')
      ).rejects.toThrow('Formato de data inválido');
    });

    it('should filter by area when provided', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          area_solicitante: 'Marketing',
          tipo: 'reserva',
        },
        {
          id: '2',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 200,
          area_solicitante: 'TI',
          tipo: 'reserva',
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSchedules as any);
      const mockDeleteResult: DeleteResult = { affected: 1, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.deleteByChannelDateHour('123', '25/12/2025', '14:30', 'Marketing');

      expect(result).toBe(1);
    });

    it('should return 0 when no schedules found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.deleteByChannelDateHour('123', '25/12/2025', '14:30');

      expect(result).toBe(0);
    });

    it('should handle undefined affected', async () => {
      const mockDeleteResult: DeleteResult = { affected: undefined, raw: {} };
      mockChannelScheduleRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await service.deleteByChannelDateHour('123', '25/12/2025', '14:30');

      expect(result).toBe(0);
    });
  });

  describe('findByDate', () => {
    it('should return schedules for specific date', async () => {
      const mockSchedules = [
        {
          id: '1',
          id_canal: '123',
          data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
          hora: '14:30',
          qtd: 100,
          tipo: 'agendamento',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockChannelScheduleRepository.find.mockResolvedValue(mockSchedules as any);

      const result = await service.findByDate('25/12/2025');

      expect(result).toHaveLength(1);
    });

    it('should throw error for invalid date format', async () => {
      await expect(service.findByDate('2025-12-25')).rejects.toThrow('Formato de data inválido');
    });

    it('should return empty array when no schedules for date', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([]);

      const result = await service.findByDate('25/12/2025');

      expect(result).toHaveLength(0);
    });
  });

  describe('createFromFormSubmission', () => {
    const mockMondayItem = {
      item_id: '123',
      name: 'Email',
      status: 'Ativo',
      max_value: 1000,
    };

    beforeEach(() => {
      mockMondayItemRepository.findOne.mockResolvedValue(mockMondayItem as any);
      mockQueryBuilder.getMany.mockResolvedValue([]);
    });

    it('should create schedules from form submission with touchpoints', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: [
          {
            data: '25/12/2025',
            channels: [
              {
                id_canal: '123',
                hora: '14:30',
                volumeDisparo: '100',
              },
            ],
          },
        ],
      };

      const mockSavedEntity = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(1);
      expect(result[0].id_canal).toBe('123');
    });

    it('should return empty array when no touchpoints', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
      };

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when touchpoints is not an array', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: 'invalid',
      };

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(0);
    });

    it('should skip touchpoint without channels', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: [
          {
            data: '25/12/2025',
          },
        ],
      };

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(0);
    });

    it('should continue processing on channel error', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: [
          {
            data: '25/12/2025',
            channels: [
              {
                id_canal: '123',
                hora: '14:30',
                volumeDisparo: '100',
              },
              {
                id_canal: '999', // Will fail
                hora: '15:00',
                volumeDisparo: '200',
              },
            ],
          },
        ],
      };

      const mockSavedEntity = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save
        .mockResolvedValueOnce(mockSavedEntity as any)
        .mockRejectedValueOnce(new Error('Canal not found'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use default hora when not provided', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: [
          {
            data: '25/12/2025',
            channels: [
              {
                id_canal: '123',
                volumeDisparo: '100',
              },
            ],
          },
        ],
      };

      const mockSavedEntity = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '09:00',
        qtd: 100,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save.mockResolvedValue(mockSavedEntity as any);

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(1);
      expect(result[0].hora).toBe('09:00');
    });

    it('should handle multiple touchpoints', async () => {
      const formData = {
        conectar_quadros__1: 'Marketing',
        __TOUCHPOINTS__: [
          {
            data: '25/12/2025',
            channels: [
              {
                id_canal: '123',
                hora: '14:30',
                volumeDisparo: '100',
              },
            ],
          },
          {
            data: '26/12/2025',
            channels: [
              {
                id_canal: '124',
                hora: '15:00',
                volumeDisparo: '200',
              },
            ],
          },
        ],
      };

      const mockSavedEntity1 = {
        id: '1',
        id_canal: '123',
        data: new Date(Date.UTC(2025, 11, 25, 12, 0, 0)),
        hora: '14:30',
        qtd: 100,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockSavedEntity2 = {
        id: '2',
        id_canal: '124',
        data: new Date(Date.UTC(2025, 11, 26, 12, 0, 0)),
        hora: '15:00',
        qtd: 200,
        area_solicitante: 'Marketing',
        tipo: 'reserva',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockChannelScheduleRepository.save
        .mockResolvedValueOnce(mockSavedEntity1 as any)
        .mockResolvedValueOnce(mockSavedEntity2 as any);

      const result = await service.createFromFormSubmission(formData);

      expect(result).toHaveLength(2);
    });

    it('should handle error in touchpoints processing gracefully', async () => {
      const formData = {
        __TOUCHPOINTS__: [
          {
            channels: null, // Will cause continue, not throw
          },
        ],
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.createFromFormSubmission(formData);

      // O service não joga erro quando channels é null/não array, apenas continua
      expect(result).toHaveLength(0);

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when outer try-catch is triggered', async () => {
      // Forçar erro no próprio formData sendo null/undefined
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.createFromFormSubmission(null as any)).rejects.toThrow('Failed to process form submission');

      consoleErrorSpy.mockRestore();
    });
  });
});
