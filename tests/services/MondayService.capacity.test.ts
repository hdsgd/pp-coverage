import { MondayService } from '../../src/services/MondayService';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { AppDataSource } from '../../src/config/database';
import { FormSubmissionData, SubitemData } from '../../src/dto/MondayFormMappingDto';

jest.mock('../../src/config/database');

type MockRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
  [key: string]: jest.Mock;
};

describe('MondayService capacity and taxonomy edge cases', () => {
  let service: MondayService;
  let mockBoardRepository: MockRepository;
  let mockItemRepository: MockRepository;
  let mockChannelScheduleRepository: MockRepository;
  let mockSubscriberRepository: MockRepository;

  beforeEach(() => {
    const createMockRepo = (): MockRepository => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    });

    mockBoardRepository = createMockRepo();
    mockItemRepository = createMockRepo();
    mockChannelScheduleRepository = createMockRepo();
    mockSubscriberRepository = createMockRepo();

    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity: any) => {
      if (entity === MondayBoard || entity === 'MondayBoard') return mockBoardRepository;
      if (entity === MondayItem || entity === 'MondayItem') return mockItemRepository;
      if (entity === ChannelSchedule || entity === 'ChannelSchedule') return mockChannelScheduleRepository;
      if (entity === Subscriber || entity === 'Subscriber') return mockSubscriberRepository;
      return {};
    });

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    service = new MondayService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reallocates overflow capacity to the next available slot when the current one is full', async () => {
    mockItemRepository.find.mockResolvedValue([
      { item_id: 'time-0900', name: '09:00', status: 'Ativo', board_id: '7696913518' },
      { item_id: 'time-0930', name: '09:30', status: 'Ativo', board_id: '7696913518' },
    ]);

    mockItemRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.name === 'Email') {
        return { item_id: 'canal-email', max_value: 100 };
      }
      return null;
    });

    const sumReservedSpy = jest.spyOn(service as any, 'sumReservedQtyForTouchpoint') as jest.SpyInstance<
      Promise<number>,
      [string, string, string, string?]
    >;
    sumReservedSpy.mockImplementation(async (_id: string, _data: string, hora: string) => (hora === '09:00' ? 100 : 0));

    const subitems: SubitemData[] = [
      {
        conectar_quadros87__1: 'Email',
        data__1: '2025-01-10',
        conectar_quadros_mkkcnyr3: '09:00',
        n_meros_mkkchcmk: 200,
      },
    ];

    const adjusted = await service.adjustTouchpointCapacity(subitems, 'Marketing');

    expect(sumReservedSpy).toHaveBeenCalledWith('canal-email', '2025-01-10', '09:00', 'Marketing');
    expect(adjusted).toHaveLength(1);
    expect(adjusted[0].conectar_quadros_mkkcnyr3).toBe('09:30');
    expect(adjusted[0].id_original).toBe('canal-email');
  });

  it('drops touchpoints when there is no later slot to absorb the overflow', async () => {
    mockItemRepository.find.mockResolvedValue([
      { item_id: 'time-2200', name: '22:00', status: 'Ativo', board_id: '7696913518' },
    ]);

    mockItemRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.name === 'Email') {
        return { item_id: 'canal-email', max_value: 50 };
      }
      return null;
    });

    jest
      .spyOn<any, any>(service as any, 'sumReservedQtyForTouchpoint')
      .mockResolvedValue(60);

    const subitems: SubitemData[] = [
      {
        conectar_quadros87__1: 'Email',
        data__1: '2025-01-10',
        conectar_quadros_mkkcnyr3: '22:00',
        n_meros_mkkchcmk: 100,
      },
    ];

    const adjusted = await service.adjustTouchpointCapacity(subitems);

    expect(adjusted).toHaveLength(0);
  });

  it('uses fallback mapping for form fields and skips unknown keys when updating touchpoints', async () => {
    const updateColumnMock = jest
      .spyOn<any, any>(service as any, 'updateColumn')
      .mockResolvedValue(undefined);

    const result = await (service as any).updateTouchpointFields(
      'tp-42',
      {
        demandante: { personsAndTeams: [{ id: '321', kind: 'person' }] },
        unknownCustomField: 'value',
      },
      {
        demandante: { personsAndTeams: [] },
        unknownCustomField: '',
      },
      'camp-42',
      {},
      {}
    );

    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-42',
      'pessoas7',
      { personsAndTeams: [{ id: '321', kind: 'person' }] },
      '7463706726'
    );
    expect(updateColumnMock).not.toHaveBeenCalledWith(
      'tp-42',
      'unknownCustomField',
      expect.anything(),
      expect.anything()
    );
    expect(result.fieldsUpdated).toBe(1);
    expect(result.taxonomyUpdated).toBeGreaterThanOrEqual(3);
  });

  it('logs scheduling errors when Monday API calls fail', async () => {
    const queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockItemRepository.find.mockResolvedValue([
      { id: 'board-1', name: 'Email' },
    ]);

    mockChannelScheduleRepository.create.mockImplementation((data: any) => data);
    mockChannelScheduleRepository.save.mockResolvedValue(undefined);
    mockChannelScheduleRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);

    jest
      .spyOn<any, any>(service as any, 'makeGraphQLRequest')
      .mockRejectedValue(new Error('Graph failure'));

    await (service as any).updateTouchpointScheduling({
      touchpointId: 'tp-1',
      oldCanal: 'Email',
      oldData: '2024-01-01',
      oldHora: '09:00',
      newCanal: 'Email',
      newData: '2024-01-02',
      newHora: '10:00',
      volumeDisparo: 100,
      areaSolicitante: 'Marketing',
      isPrimeiroPreenchimento: false,
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[SCHEDULE]'),
      expect.any(Error)
    );
  });

  it('removes subitems missing mandatory scheduling data during capacity adjustment', async () => {
    mockItemRepository.find.mockResolvedValue([
      { item_id: 'time-0900', name: '09:00', status: 'Ativo', board_id: '7696913518' },
    ]);

    const subitems: SubitemData[] = [
      {
        conectar_quadros87__1: '',
        data__1: '2025-01-10',
        conectar_quadros_mkkcnyr3: '09:00',
        n_meros_mkkchcmk: 10,
      },
    ];

    const adjusted = await service.adjustTouchpointCapacity(subitems);

    expect(adjusted).toHaveLength(0);
  });

  it('recalculates taxonomy using numeric area identifiers and applies fallbacks', async () => {
    mockBoardRepository.findOne.mockResolvedValue({ id: 'produto-board-id' });
    mockItemRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.item_id === '12345') {
        return { name: 'Marketing', code: 'AR-001' };
      }
      if (where?.name === 'Marketing') {
        return { name: 'Marketing', team: ['team-42'] };
      }
      return null;
    });

    const updateColumnMock = jest
      .spyOn<any, any>(service as any, 'updateColumn')
      .mockResolvedValue(undefined);

    const getCodeSpy = jest.spyOn(service as any, 'getCodeByItemName') as jest.SpyInstance<
      Promise<string | undefined>,
      [string, string?]
    >;
    getCodeSpy.mockImplementation(async (name: string) => {
      if (name === 'Email') {
        return undefined;
      }
      return `${name}-CODE`;
    });

    jest.spyOn(service, 'getSubproductByProduct').mockResolvedValue(null);

    const updatedCount = await (service as any).recalculateTouchpointTaxonomy(
      'tp-001',
      'camp-9',
      { canal: 'Email', dataDisparo: '2025-03-10', ordemCanal: 2 },
      {
        tipoCliente: 'Cliente VIP',
        tipoCampanha: 'Campanha XPTO',
        areaSolicitante: '12345',
      }
    );

    expect(updatedCount).toBeGreaterThan(0);
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-001',
      'text_mkrrmmvv',
      'AR-001',
      '7463706726'
    );
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-001',
      'text_mkrrxqng',
      'Marketing',
      '7463706726'
    );
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-001',
      'text_mkrr8dta',
      'Email',
      '7463706726'
    );
  });

  it('falls back to NaN when numeric area solicitante id is unresolved', async () => {
    mockBoardRepository.findOne.mockResolvedValue({ id: 'produto-board-id' });
    mockItemRepository.findOne.mockResolvedValue(null);

    const updateColumnMock = jest
      .spyOn<any, any>(service as any, 'updateColumn')
      .mockResolvedValue(undefined);

    jest
      .spyOn(service as any, 'getCodeByItemName')
      .mockImplementation(async (...args: any[]) => {
        const [name] = args;
        if (name === 'Email') {
          return 'EMAIL';
        }
        return undefined;
      });

    jest.spyOn(service, 'getSubproductByProduct').mockResolvedValue(null);

    const updated = await (service as any).recalculateTouchpointTaxonomy(
      'tp-nan',
      'camp-nan',
      { canal: 'Email', dataDisparo: '2025-06-01', ordemCanal: 2 },
      { areaSolicitante: '99999' }
    );

    expect(updated).toBeGreaterThan(0);
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-nan',
      'text_mkrrmmvv',
      'NaN',
      '7463706726'
    );
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-nan',
      'text_mkrrxqng',
      '99999',
      '7463706726'
    );
  });

  it('logs and returns zero when taxonomy recalculation throws', async () => {
    jest
      .spyOn(service as any, 'getCodeByItemName')
      .mockRejectedValue(new Error('Lookup failure'));

    const result = await (service as any).recalculateTouchpointTaxonomy(
      'tp-error',
      'camp-error',
      { canal: 'Email', dataDisparo: '2025-06-01', ordemCanal: 1 },
      { tipoCliente: 'Cliente VIP' }
    );

    expect(result).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[TAXONOMY] Erro ao recalcular taxonomia:'),
      expect.any(Error)
    );
  });

  it('creates touchpoints wiring demandante and team connections when available', async () => {
    mockBoardRepository.findOne.mockResolvedValue({ id: 'produto-board-id', name: 'Produto' });
    mockItemRepository.find.mockResolvedValue([]);
    mockItemRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.item_id === '999999') {
        return { name: 'Email', max_value: 100 };
      }
      if (where?.name === 'Email') {
        return { item_id: 'canal-email', max_value: 100 };
      }
      if (where?.name === 'Marketing') {
        return { name: 'Marketing', team: ['team-77'] };
      }
      if (where?.name === '09:00') {
        return { item_id: 'hora-0900' };
      }
      return null;
    });

    jest
      .spyOn<any, any>(service as any, 'makeGraphQLRequest')
      .mockResolvedValue({ data: { create_item: { id: 'touchpoint-xyz', name: 'Touchpoint XYZ' } } });

    jest.spyOn(service, 'changeMultipleColumnValues').mockResolvedValue(undefined);

    const updateColumnMock = jest
      .spyOn<any, any>(service as any, 'updateColumn')
      .mockResolvedValue(undefined);

    const getCodeSpy = jest.spyOn(service as any, 'getCodeByItemName') as jest.SpyInstance<
      Promise<string | undefined>,
      [string, string?]
    >;
    getCodeSpy.mockImplementation(async (name: string) => `${name}-CODE`);

    jest.spyOn(service, 'getSubproductByProduct').mockResolvedValue({ name: 'SubProd', code: 'SP-001' });
    jest.spyOn<any, any>(service as any, 'getDemandanteFromCampaign').mockResolvedValue('user-123');

    const formData: FormSubmissionData = {
      id: 'form-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      formTitle: 'Touchpoint Form',
      data: {
        name: 'Campanha Teste',
        lookup_mkrtaebd: 'Cliente VIP',
        lookup_mkrt66aq: 'Campanha XPTO',
        lookup_mkrtxa46: 'Disparo A',
        lookup_mkrta7z1: 'Mecanica B',
        lookup_mkrt36cj: 'Marketing',
        lookup_mkrtwq7k: 'Objetivo C',
        lookup_mkrtvsdj: 'Produto D',
        lookup_mkrtxgmt: 'Segmento E',
      },
    };

    const subitem: SubitemData = {
      descricao: 'Disparo 1',
      conectar_quadros87__1: '999999',
      data__1: '2025-03-10',
      conectar_quadros_mkkcnyr3: '09:00',
      n_meros__1: 1,
      n_meros_mkkchcmk: 5000,
      lista_suspensa53__1: ['Tag A', 'Tag B'],
    };

    const result = await (service as any).createTouchpointForCampaign('123', formData, subitem);

    expect(result).toBe('touchpoint-xyz');
    expect(updateColumnMock).toHaveBeenCalledWith(
      'touchpoint-xyz',
      'pessoas5__1',
      { personsAndTeams: [{ id: 'user-123', kind: 'person' }] },
      '7463706726'
    );
    expect(updateColumnMock).toHaveBeenCalledWith(
      'touchpoint-xyz',
      'pessoas3__1',
      {
        personsAndTeams: [
          { id: 'team-77', kind: 'team' },
        ],
      },
      '7463706726'
    );
  });

  it('updates touchpoints when payload already uses Monday column ids', async () => {
    const updateColumnMock = jest
      .spyOn<any, any>(service as any, 'updateColumn')
      .mockResolvedValue(undefined);

    jest.spyOn(service as any, 'recalculateTouchpointTaxonomy').mockResolvedValue(0);

    const result = await (service as any).updateTouchpointFields(
      'tp-direct',
      {
        text_mkrrqsk6: 'New Channel Reference',
      },
      {
        canalRelation: 'Old Channel Reference',
      },
      'camp-123',
      {},
      {}
    );

    expect(result.fieldsUpdated).toBeGreaterThan(0);
    expect(updateColumnMock).toHaveBeenCalledWith(
      'tp-direct',
      'text_mkrrqsk6',
      'New Channel Reference',
      '7463706726'
    );
  });

  describe('getChannelSchedulesByNameAndDate', () => {
    it('returns empty availability when the requested channel is inactive', async () => {
      mockBoardRepository.findOne.mockResolvedValue({ id: 'hora-board' });
      mockItemRepository.find.mockResolvedValue([
        { id: 'slot-08', name: '08:00', status: 'Ativo', board_id: 'hora-board' },
        { id: 'slot-09', name: '09:00', status: 'Ativo', board_id: 'hora-board' },
      ]);
      mockItemRepository.findOne.mockResolvedValue(null);

      const result = await service.getChannelSchedulesByNameAndDate('Email', '2025-01-01');

      expect(result.disponivelHoras).toHaveLength(0);
      expect(mockChannelScheduleRepository.find).not.toHaveBeenCalled();
    });

    it('aggregates hour availability respecting context-specific reservation rules', async () => {
      mockBoardRepository.findOne.mockResolvedValue({ id: 'hora-board' });
      mockItemRepository.find.mockResolvedValue([
        { id: 'slot-08', name: '08:00', status: 'Ativo', board_id: 'hora-board' },
        { id: 'slot-09', name: '09:00', status: 'Ativo', board_id: 'hora-board' },
      ]);
      mockItemRepository.findOne.mockImplementation(async ({ where }: any) => {
        if (where?.name === 'Email') {
          return { item_id: 'canal-email', max_value: 100, status: 'Ativo' };
        }
        return null;
      });

      const schedules = [
        { hora: '08:00:00', qtd: 30, tipo: 'agendamento' },
        { hora: '08:00:00', qtd: 20, tipo: 'reserva', area_solicitante: 'Marketing' },
        { hora: '08:00:00', qtd: 10, tipo: 'reserva', area_solicitante: 'Comercial' },
        { hora: '09:00:00', qtd: 15, tipo: 'agendamento' },
        { hora: '09:00:00', qtd: 25, tipo: 'reserva', area_solicitante: 'Marketing' },
        { hora: '09:00:00', qtd: 20, tipo: 'reserva', area_solicitante: 'Financeiro' },
      ];
      mockChannelScheduleRepository.find.mockImplementation(async () => schedules);

      const formContext = await service.getChannelSchedulesByNameAndDate('Email', '2025-01-01', 'Marketing', 'form');
      const adminContext = await service.getChannelSchedulesByNameAndDate('Email', '2025-01-01', 'Marketing', 'admin');

      expect(formContext.disponivelHoras).toHaveLength(2);
      const eightAmForm = formContext.disponivelHoras.find((slot) => slot.hora === '08:00');
      const nineAmForm = formContext.disponivelHoras.find((slot) => slot.hora === '09:00');
      expect(eightAmForm).toMatchObject({
        available: '10.00',
        totalUsado: '40.00',
        maxValue: '50.00',
        totalReservadoMesmaArea: '20.00',
      });
      expect(nineAmForm).toMatchObject({
        available: '65.00',
        totalUsado: '35.00',
        maxValue: '100.00',
        totalReservadoMesmaArea: '25.00',
      });

      expect(adminContext.disponivelHoras).toHaveLength(2);
      const eightAmAdmin = adminContext.disponivelHoras.find((slot) => slot.hora === '08:00');
      const nineAmAdmin = adminContext.disponivelHoras.find((slot) => slot.hora === '09:00');
      expect(eightAmAdmin).toMatchObject({
        available: '0.00',
        totalUsado: '60.00',
        maxValue: '50.00',
      });
      expect(eightAmAdmin).not.toHaveProperty('totalReservadoMesmaArea');
      expect(nineAmAdmin).toMatchObject({
        available: '40.00',
        totalUsado: '60.00',
        maxValue: '100.00',
      });
      expect(nineAmAdmin).not.toHaveProperty('totalReservadoMesmaArea');
    });
  });

  it('normalizes array-based query field inputs trimming blanks', () => {
    const normalizeQueryFields = (service as any).normalizeQueryFields.bind(service);

    const result = normalizeQueryFields([' id ', 123, '   ', 'status']);

    expect(result).toEqual(['id', '123', 'status']);
  });
});
