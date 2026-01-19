/**
 * Testes unitários para os métodos auxiliares refatorados do MondayService
 * Estes métodos foram extraídos do updateCampaign para facilitar testes
 */

import { MondayService } from '../../src/services/MondayService';
import { AppDataSource } from '../../src/config/database';
import { MondayBoard } from '../../src/entities/MondayBoard';
import { MondayItem } from '../../src/entities/MondayItem';
import { ChannelSchedule } from '../../src/entities/ChannelSchedule';
import { Subscriber } from '../../src/entities/Subscriber';
import { SubitemData } from '../../src/dto/MondayFormMappingDto';
import axios from 'axios';

jest.mock('../../src/config/database');
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

type MockRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
  [key: string]: jest.Mock;
};

describe('MondayService - Helper Methods', () => {
  let service: MondayService;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as unknown as jest.Mock) = jest.fn(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    }));
    service = new MondayService();
  });

  describe('updateCampaignNameIfChanged', () => {
    it('should update name when it changes', async () => {
      // Arrange
      const campaignId = '123456';
      const newName = 'Nova Campanha';
      const currentName = 'Campanha Antiga';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: {
            change_simple_column_value: {
              id: campaignId,
              name: newName,
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // Act
      const result = await (service as any).updateCampaignNameIfChanged(
        campaignId,
        newName,
        currentName
      );

      // Assert
      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          query: expect.stringContaining('change_simple_column_value'),
        }),
        expect.any(Object)
      );
    });

    it('should not update name when it is the same', async () => {
      // Arrange
      const campaignId = '123456';
      const name = 'Mesma Campanha';

      // Act
      const result = await (service as any).updateCampaignNameIfChanged(
        campaignId,
        name,
        name
      );

      // Assert
      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const campaignId = '123456';
      const newName = 'Nova Campanha';
      const currentName = 'Campanha Antiga';

      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      // Act
      const result = await (service as any).updateCampaignNameIfChanged(
        campaignId,
        newName,
        currentName
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when newName is empty', async () => {
      // Arrange
      const campaignId = '123456';
      const newName = '';
      const currentName = 'Campanha Antiga';

      // Act
      const result = await (service as any).updateCampaignNameIfChanged(
        campaignId,
        newName,
        currentName
      );

      // Assert
      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('collectCampaignFieldUpdates', () => {
    beforeEach(() => {
      // Setup COLUMN_ID_TO_BACKEND_NAME mock (necessário para o método funcionar)
      (service as any).COLUMN_ID_TO_BACKEND_NAME = {
        'label__1': 'tipoSolicitacao',
        'pessoas__1': 'demandante',
        'data__1': 'dataDisparo',
        'texto__1': 'descricao',
        'lookup_mkrtaebd': 'tipoCliente',
        'lista_suspensa5__1': 'beneficio',
      };

      (service as any).COLUMN_TO_BOARD = {
        'label__1': '7410140027', // Board principal
        'pessoas__1': '7410140027',
        'data__1': '7410140027',
        'texto__1': '7410140027',
        'lookup_mkrtaebd': '7410140027',
        'lista_suspensa5__1': '7463706726', // Board secundário
      };
    });

    it('should collect only changed fields', () => {
      // Arrange
      const formData = {
        tipoSolicitacao: 'Novo Tipo',
        demandante: 'João Silva',
        descricao: 'Nova descrição',
        name: 'Campanha Teste', // Ignorar
        __SUBITEMS__: [], // Ignorar
        briefing: {}, // Ignorar
        action: 'update', // Ignorar
      };

      const currentData = {
        tipoSolicitacao: 'Tipo Antigo',
        demandante: 'João Silva', // Mesmo valor
        descricao: 'Descrição antiga',
      };

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const updates = (service as any).collectCampaignFieldUpdates(
        formData,
        currentData
      );

      // Assert
      expect(updates).toHaveLength(2); // Apenas tipoSolicitacao e descricao mudaram
      expect(updates).toContainEqual({
        columnId: 'label__1',
        value: 'Novo Tipo',
      });
      expect(updates).toContainEqual({
        columnId: 'texto__1',
        value: 'Nova descrição',
      });
    });

    it('should ignore special fields', () => {
      // Arrange
      const formData = {
        name: 'Nome Campanha',
        __SUBITEMS__: [{ id: '1' }],
        briefing: { id: '2' },
        action: 'update',
        tipoSolicitacao: 'Novo Tipo',
      };

      const currentData = {
        tipoSolicitacao: 'Tipo Antigo',
      };

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const updates = (service as any).collectCampaignFieldUpdates(
        formData,
        currentData
      );

      // Assert
      expect(updates).toHaveLength(1); // Apenas tipoSolicitacao
      expect(updates[0].columnId).toBe('label__1');
    });

    it('should skip lookup/mirror columns (read-only)', () => {
      // Arrange
      const formData = {
        lookup_mkrtaebd: 'Valor Lookup', // Lookup column
        demandante: 'João Silva',
      };

      const currentData = {
        lookup_mkrtaebd: 'Valor Antigo',
        demandante: 'Maria Silva',
      };

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const updates = (service as any).collectCampaignFieldUpdates(
        formData,
        currentData
      );

      // Assert
      // lookup_mkrtaebd deve ser ignorado (read-only)
      expect(updates).toHaveLength(1);
      expect(updates[0].columnId).toBe('pessoas__1');
    });

    it('should filter by board ID (only main board)', () => {
      // Arrange
      const formData = {
        demandante: 'João Silva', // Board principal
        beneficio: 'Cashback', // Board secundário (7463706726)
      };

      const currentData = {
        demandante: 'Maria Silva',
        beneficio: 'Desconto',
      };

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const updates = (service as any).collectCampaignFieldUpdates(
        formData,
        currentData
      );

      // Assert
      // beneficio deve ser ignorado (board diferente do principal)
      expect(updates).toHaveLength(1);
      expect(updates[0].columnId).toBe('pessoas__1');
    });

    it('should handle custom field mappings', () => {
      // Arrange
      const formData = {
        text_outro_tipo_gam: 'Valor customizado',
      };

      const currentData = {
        text_outro_tipo_gam: 'Valor antigo',
      };

      (service as any).COLUMN_ID_TO_BACKEND_NAME['text_mkrmjbhf'] =
        'text_outro_tipo_gam';
      (service as any).COLUMN_TO_BOARD['text_mkrmjbhf'] = '7410140027';
      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const updates = (service as any).collectCampaignFieldUpdates(
        formData,
        currentData
      );

      // Assert
      expect(updates).toHaveLength(1);
      expect(updates[0].columnId).toBe('text_mkrmjbhf');
    });
  });

  describe('applyCampaignFieldUpdates', () => {
    it('should apply all updates successfully', async () => {
      // Arrange
      const campaignId = '123456';
      const updates = [
        { columnId: 'label__1', value: 'Novo Tipo' },
        { columnId: 'texto__1', value: 'Nova descrição' },
        { columnId: 'pessoas__1', value: '789' },
      ];

      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            change_multiple_column_values: {
              id: campaignId,
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // Act
      const count = await (service as any).applyCampaignFieldUpdates(
        campaignId,
        updates
      );

      // Assert
      expect(count).toBe(3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should continue on errors and return successful count', async () => {
      // Arrange
      const campaignId = '123456';
      const updates = [
        { columnId: 'label__1', value: 'Novo Tipo' },
        { columnId: 'texto__1', value: 'Nova descrição' },
        { columnId: 'pessoas__1', value: '789' },
      ];

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            data: {
              change_multiple_column_values: { id: campaignId },
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: {
            data: {
              change_multiple_column_values: { id: campaignId },
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

      // Act
      const count = await (service as any).applyCampaignFieldUpdates(
        campaignId,
        updates
      );

      // Assert
      expect(count).toBe(2); // 2 sucessos, 1 erro
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should handle empty updates array', async () => {
      // Arrange
      const campaignId = '123456';
      const updates: any[] = [];

      // Act
      const count = await (service as any).applyCampaignFieldUpdates(
        campaignId,
        updates
      );

      // Assert
      expect(count).toBe(0);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('updateCampaignBriefing', () => {
    beforeEach(() => {
      (service as any).COLUMN_ID_TO_BACKEND_NAME = {
        'long_text__1': 'contextoComunicacao',
        'texto_longo__1': 'objetivoPrincipal',
        'data64': 'dataEntrega',
        'long_text_mkrdqn35': 'linksValidacao',
      };
    });

    it('should update briefing fields when they change', async () => {
      // Arrange
      const briefingData = {
        id: '999888',
        contextoComunicacao: 'Novo contexto',
        objetivoPrincipal: 'Novo objetivo',
      };

      const currentBriefing = {
        contextoComunicacao: 'Contexto antigo',
        objetivoPrincipal: 'Objetivo antigo',
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            change_multiple_column_values: { id: '999888' },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when briefingData is null', async () => {
      // Arrange
      const briefingData = null;
      const currentBriefing = { id: '123' };

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(0);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return 0 when briefingData has no id', async () => {
      // Arrange
      const briefingData = {
        contextoComunicacao: 'Contexto',
      };
      const currentBriefing = { id: '123' };

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(0);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return 0 when currentBriefing is null', async () => {
      // Arrange
      const briefingData = {
        id: '999888',
        contextoComunicacao: 'Contexto',
      };
      const currentBriefing = null;

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(0);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle custom field mappings for briefing', async () => {
      // Arrange
      const briefingData = {
        id: '999888',
        texto_curto_links_validacao: 'http://link.com', // Campo customizado
        data__1: '2024-12-25', // data__1 vira data64 no briefing
      };

      const currentBriefing = {
        linksValidacao: 'http://old.com',
        dataEntrega: '2024-12-20',
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            change_multiple_column_values: { id: '999888' },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should continue on errors and return successful count', async () => {
      // Arrange
      const briefingData = {
        id: '999888',
        contextoComunicacao: 'Novo contexto',
        objetivoPrincipal: 'Novo objetivo',
        dataEntrega: '2024-12-31',
      };

      const currentBriefing = {
        contextoComunicacao: 'Contexto antigo',
        objetivoPrincipal: 'Objetivo antigo',
        dataEntrega: '2024-01-01',
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            data: {
              change_multiple_column_values: { id: '999888' },
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: {
            data: {
              change_multiple_column_values: { id: '999888' },
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(2); // 2 sucessos, 1 erro
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should not update fields with same values', async () => {
      // Arrange
      const briefingData = {
        id: '999888',
        contextoComunicacao: 'Mesmo contexto',
        objetivoPrincipal: 'Mesmo objetivo',
      };

      const currentBriefing = {
        contextoComunicacao: 'Mesmo contexto',
        objetivoPrincipal: 'Mesmo objetivo',
      };

      (service as any).normalizeValueForComparison = (value: any) =>
        JSON.stringify(value);

      // Act
      const count = await (service as any).updateCampaignBriefing(
        briefingData,
        currentBriefing
      );

      // Assert
      expect(count).toBe(0);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('convertDateFormat', () => {
    it('should return date already in YYYY-MM-DD format', () => {
      // Arrange
      const date = '2024-12-25';

      // Act
      const result = (service as any).convertDateFormat(date);

      // Assert
      expect(result).toBe('2024-12-25');
    });

    it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
      // Arrange
      const date = '25/12/2024';

      // Act
      const result = (service as any).convertDateFormat(date);

      // Assert
      expect(result).toBe('2024-12-25');
    });

    it('should handle 01/01/2024 correctly', () => {
      // Arrange
      const date = '01/01/2024';

      // Act
      const result = (service as any).convertDateFormat(date);

      // Assert
      expect(result).toBe('2024-01-01');
    });

    it('should return original string for invalid formats', () => {
      // Arrange
      const date = '2024/12/25';

      // Act
      const result = (service as any).convertDateFormat(date);

      // Assert
      expect(result).toBe('2024/12/25');
    });

    it('should return original string for empty string', () => {
      // Arrange
      const date = '';

      // Act
      const result = (service as any).convertDateFormat(date);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('normalizeValueForComparison', () => {
    it('should normalize string values', () => {
      // Arrange
      const value = 'Test String';

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should normalize array values', () => {
      // Arrange
      const value = ['item1', 'item2'];

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should normalize object values', () => {
      // Arrange
      const value = { key: 'value' };

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should handle null values', () => {
      // Arrange
      const value = null;

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(result).toBe('');
    });

    it('should handle undefined values', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(result).toBe('');
    });

    it('should normalize numbers', () => {
      // Arrange
      const value = 123;

      // Act
      const result = (service as any).normalizeValueForComparison(value);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should extract ids from personsAndTeams arrays', () => {
      const value = { personsAndTeams: [{ id: 10 }, { id: 11 }] };

      const result = (service as any).normalizeValueForComparison(value);

      expect(result).toBe('10,11');
    });

    it('should normalize timeline objects into comma separated values', () => {
      const value = { from: '2024-01-01', to: '2024-01-31' };

      const result = (service as any).normalizeValueForComparison(value);

      expect(result).toBe('2024-01-01,2024-01-31');
    });

    it('should normalize nested text/value/url/date properties', () => {
      expect((service as any).normalizeValueForComparison({ text: 'abc' })).toBe('abc');
      expect((service as any).normalizeValueForComparison({ value: 5 })).toBe('5');
      expect((service as any).normalizeValueForComparison({ url: 'http://url' })).toBe('http://url');
      expect((service as any).normalizeValueForComparison({ date: '2024-02-02' })).toBe('2024-02-02');
    });

    it('should replace dash timeline strings with commas', () => {
      const result = (service as any).normalizeValueForComparison('2024-01-01 - 2024-01-31');

      expect(result).toBe('2024-01-01,2024-01-31');
    });
  });

  describe('formatValueForMondayUpdate and related utilities', () => {
    let helperService: MondayService;
    let mockBoardRepository: MockRepository;
    let mockItemRepository: MockRepository;
    let mockChannelScheduleRepository: MockRepository;
    let mockSubscriberRepository: MockRepository;

    const createMockRepo = (): MockRepository => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    });

    beforeEach(() => {
      mockBoardRepository = createMockRepo();
      mockItemRepository = createMockRepo();
      mockChannelScheduleRepository = createMockRepo();
      mockSubscriberRepository = createMockRepo();

      (AppDataSource.getRepository as unknown as jest.Mock) = jest.fn((entity: any) => {
        if (entity === MondayBoard || entity === 'MondayBoard') return mockBoardRepository;
        if (entity === MondayItem || entity === 'MondayItem') return mockItemRepository;
        if (entity === ChannelSchedule || entity === 'ChannelSchedule') return mockChannelScheduleRepository;
        if (entity === Subscriber || entity === 'Subscriber') return mockSubscriberRepository;
        return {};
      });

      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();

      helperService = new MondayService();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('resolves subscriber names for people fields', async () => {
      mockSubscriberRepository.findOne.mockResolvedValue({ id: '555' });

      const result = await (helperService as any).formatValueForMondayUpdate('pessoas5__1', 'john@doe.com');

      expect(mockSubscriberRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: [{ email: 'john@doe.com' }, { name: 'john@doe.com' }],
      }));
      expect(result).toEqual({ personsAndTeams: [{ id: '555', kind: 'person' }] });
    });

    it('resolves board relation names into item ids', async () => {
      mockItemRepository.findOne.mockResolvedValue({ item_id: '789' });

      const result = await (helperService as any).formatValueForMondayUpdate('conectar_quadros7__1', 'Cliente XPTO');

      expect(mockItemRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Cliente XPTO', board_id: '7400357748' },
      });
      expect(result).toEqual({ item_ids: [789] });
    });

    it('formats timeline, dates, numbers and multi-selects correctly', async () => {
      const timeline = await (helperService as any).formatValueForMondayUpdate('timerange_mkrmvz3', '2025-01-01 - 2025-01-31');
      const dateValue = await (helperService as any).formatValueForMondayUpdate('date_mkr6nj1f', '2025-02-10');
      const numberValue = await (helperService as any).formatValueForMondayUpdate('n_mero__1', 1200);
      const multiSelect = await (helperService as any).formatValueForMondayUpdate('lista_suspensa53__1', 'Tag A,Tag B');
      const dropdown = await (helperService as any).formatValueForMondayUpdate('lista_suspensa__1', ['Option 1']);
      const color = await (helperService as any).formatValueForMondayUpdate('color_mkrm8t9t', 'red');
      const lookup = await (helperService as any).formatValueForMondayUpdate('lookup_mkrt36cj', 'Financeiro');
      const text = await (helperService as any).formatValueForMondayUpdate('texto_curto0', 'Sample text');

      expect(timeline).toEqual({ from: '2025-01-01', to: '2025-01-31' });
      expect(dateValue).toEqual({ date: '2025-02-10' });
      expect(numberValue).toBe('1200');
      expect(multiSelect).toEqual({ labels: ['Tag A', 'Tag B'] });
      expect(dropdown).toBe('Option 1');
      expect(color).toBe('red');
      expect(lookup).toBe('Financeiro');
      expect(text).toBe('Sample text');
    });

    it('updateColumn uses change_multiple_column_values for complex fields', async () => {
      const makeGraphQLRequestMock = jest
        .spyOn<any, any>(helperService as any, 'makeGraphQLRequest')
        .mockResolvedValue({});

      await (helperService as any).updateColumn('100', 'pessoas5__1', {
        personsAndTeams: [{ id: '1', kind: 'person' }],
      }, '7463706726');

      expect(makeGraphQLRequestMock).toHaveBeenCalled();
      const query = makeGraphQLRequestMock.mock.calls[0][0];
      expect(query).toContain('change_multiple_column_values');
    });

    it('updateColumn uses change_simple_column_value for plain fields', async () => {
      const makeGraphQLRequestMock = jest
        .spyOn<any, any>(helperService as any, 'makeGraphQLRequest')
        .mockResolvedValue({});

      await (helperService as any).updateColumn('100', 'texto6__1', 'Canal', '7463706726');

      expect(makeGraphQLRequestMock).toHaveBeenCalled();
      const query = makeGraphQLRequestMock.mock.calls[0][0];
      expect(query).toContain('change_simple_column_value');
      expect(query).toContain('"Canal"');
    });

    it('updateColumn skips lookup columns gracefully', async () => {
      const makeGraphQLRequestMock = jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest');

      await (helperService as any).updateColumn('100', 'lookup_field', 'value');

      expect(makeGraphQLRequestMock).not.toHaveBeenCalled();
    });

    it('fetchTimeSlotsFromAPI returns API items when the board exists', async () => {
      mockBoardRepository.findOne.mockResolvedValue({ id: 'board-uuid', name: 'Hora', board_id: '7696913518' });

      jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          boards: [
            {
              items_page: {
                items: [
                  { id: 'item-1', name: '07:00' },
                  { id: 'item-2', name: '06:00' },
                ],
              },
            },
          ],
        },
      });

      const slots = await (helperService as any).fetchTimeSlotsFromAPI('7696913518');

      expect(slots).toEqual([
        { item_id: 'item-2', name: '06:00', status: 'Ativo', board_id: '7696913518' },
        { item_id: 'item-1', name: '07:00', status: 'Ativo', board_id: '7696913518' },
      ]);
    });

    it('fetchTimeSlotsFromAPI falls back to defaults when API returns nothing', async () => {
      mockBoardRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'board-uuid', name: 'Hora', board_id: '7696913518' });

      jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          boards: [
            {
              items_page: {
                items: [],
              },
            },
          ],
        },
      });

      const slots = await (helperService as any).fetchTimeSlotsFromAPI('7696913518');

      expect(slots).toHaveLength(19);
      expect(slots[0]).toMatchObject({ name: '06:00', status: 'Ativo' });
      expect(slots[slots.length - 1]).toMatchObject({ name: '22:00', status: 'Ativo' });
    });

    it('fetchTimeSlotsFromAPI returns empty array on request failure', async () => {
      mockBoardRepository.findOne.mockResolvedValue({ id: 'board-uuid', name: 'Hora', board_id: '7696913518' });

      jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest').mockRejectedValue(new Error('Graph error'));

      const slots = await (helperService as any).fetchTimeSlotsFromAPI('7696913518');

      expect(slots).toEqual([]);
    });

    it('sumReservedQtyForTouchpoint aggregates agendamentos and qualifying reservas', async () => {
      mockChannelScheduleRepository.find.mockResolvedValue([
        { qtd: 30, tipo: 'agendamento' },
        { qtd: 20, tipo: 'reserva', area_solicitante: 'Marketing' },
        { qtd: 15, tipo: 'reserva', area_solicitante: 'Parcerias' },
      ]);

      const total = await (helperService as any).sumReservedQtyForTouchpoint('canal-1', '2025-04-01', '09:00', 'Marketing');

      expect(mockChannelScheduleRepository.find).toHaveBeenCalledWith({
        where: { id_canal: 'canal-1', data: '2025-04-01', hora: '09:00' },
      });
      expect(total).toBe(45);
    });

    it('insertChannelSchedulesForTouchpoints persists valid subitems and skips incomplete data', async () => {
      mockChannelScheduleRepository.create.mockImplementation((data: any) => data);
      mockChannelScheduleRepository.save.mockResolvedValue(undefined);

      const subitems: SubitemData[] = [
        {
          id_original: 'canal-1',
          data__1: '2025-05-10',
          conectar_quadros_mkkcnyr3: '10:00',
          n_meros_mkkchcmk: 50,
        },
        {
          id_original: undefined,
          data__1: '',
          conectar_quadros_mkkcnyr3: '11:00',
          n_meros_mkkchcmk: 30,
        },
      ];

      await (helperService as any).insertChannelSchedulesForTouchpoints(subitems, 'Marketing');

      expect(mockChannelScheduleRepository.create).toHaveBeenCalledTimes(1);
      expect(mockChannelScheduleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockChannelScheduleRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        id_canal: 'canal-1',
        data: '2025-05-10',
        hora: '10:00',
        qtd: 50,
        area_solicitante: 'Marketing',
        tipo: 'agendamento',
      }));
    });

    it('getDemandanteFromCampaign returns null when column is empty', async () => {
      jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          items: [
            {
              column_values: [
                { id: 'pessoas__1', value: null },
              ],
            },
          ],
        },
      });

      const result = await (helperService as any).getDemandanteFromCampaign('123');

      expect(result).toBeNull();
    });

    it('getDemandanteFromCampaign extracts person id from personsAndTeams payload', async () => {
      jest.spyOn<any, any>(helperService as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          items: [
            {
              column_values: [
                {
                  id: 'pessoas__1',
                  value: JSON.stringify({ personsAndTeams: [{ id: '987', kind: 'person' }] }),
                },
              ],
            },
          ],
        },
      });

      const result = await (helperService as any).getDemandanteFromCampaign('456');

      expect(result).toBe('987');
    });
  });
});
