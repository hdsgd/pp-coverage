import { MondayService } from '../../src/services/MondayService';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { AppDataSource } from '../../src/config/database';

jest.mock('../../src/config/database');

type MockRepository = {
  find?: jest.Mock;
  findOne?: jest.Mock;
  save?: jest.Mock;
  create?: jest.Mock;
  delete?: jest.Mock;
  createQueryBuilder?: jest.Mock;
  [key: string]: any;
};

describe('MondayService.updateTouchpointScheduling integration coverage', () => {
  let service: MondayService;
  let mockBoardRepository: MockRepository;
  let mockItemRepository: MockRepository;
  let mockChannelScheduleRepository: MockRepository;
  let mockSubscriberRepository: MockRepository;
  let mockQueryBuilder: { where: jest.Mock; andWhere: jest.Mock; getMany: jest.Mock };

  beforeEach(() => {
    mockBoardRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    mockItemRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    mockSubscriberRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([])
    };
    mockChannelScheduleRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
    };

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity: any) => {
      if (entity === MondayBoard || entity === 'MondayBoard') return mockBoardRepository;
      if (entity === MondayItem || entity === 'MondayItem') return mockItemRepository;
      if (entity === ChannelSchedule || entity === 'ChannelSchedule') return mockChannelScheduleRepository;
      if (entity === Subscriber || entity === 'Subscriber') return mockSubscriberRepository;
      return {};
    });

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    service = new MondayService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should delete prior schedules and create a new entry when canal, date, and hour change', async () => {
    const mockGraphQLResponse = {
      data: {
        boards: [
          {
            items_page: {
              items: [
                { id: 'canal-email', name: 'Email' },
                { id: 'canal-sms', name: 'SMS' }
              ]
            }
          }
        ]
      }
    };

    jest.spyOn(service as any, 'makeGraphQLRequest').mockResolvedValue(mockGraphQLResponse);
    jest.spyOn(service as any, 'convertDateFormat').mockImplementation((value: any) => value);

    mockQueryBuilder.getMany.mockResolvedValue([
      { id: 'old-schedule-1', hora: '10:00:00', area_solicitante: 'Marketing' },
      { id: 'old-schedule-2', hora: '11:00:00', area_solicitante: 'Outra Área' }
    ]);

    const scheduleInfo = {
      touchpointId: 'tp-001',
      oldCanal: 'Email',
      oldData: '2025-01-10',
      oldHora: '10:00',
      newCanal: 'SMS',
      newData: '2025-01-15',
      newHora: '14:00',
      volumeDisparo: 5000,
      areaSolicitante: 'Marketing',
      isPrimeiroPreenchimento: false
    };

    await (service as any).updateTouchpointScheduling(scheduleInfo);

    expect(mockChannelScheduleRepository.delete).toHaveBeenCalledWith(['old-schedule-1']);
    expect(mockChannelScheduleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id_canal: 'canal-sms',
        data: '2025-01-15',
        hora: '14:00',
        qtd: 5000,
        area_solicitante: 'Marketing',
        tipo: 'agendamento'
      })
    );
    expect(mockChannelScheduleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id_canal: 'canal-sms',
        hora: '14:00',
        qtd: 5000,
        area_solicitante: 'Marketing'
      })
    );
  });
});
