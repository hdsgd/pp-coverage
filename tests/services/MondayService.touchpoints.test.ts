import { MondayService } from '../../src/services/MondayService';

// ========================================
// TESTES: Métodos de Touchpoints
// ========================================
// Testa os métodos extraídos do updateCampaign:
// - recalculateTouchpointTaxonomy()
// - updateTouchpointScheduling()  
// - updateTouchpointFields()
// - updateCampaignTouchpoints()
// ========================================

describe('MondayService - Touchpoint Methods', () => {
  let service: MondayService;
  let mockBoardRepository: any;
  let mockItemRepository: any;
  let mockChannelScheduleRepository: any;

  beforeEach(() => {
    // Mock repositories
    mockBoardRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockItemRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockChannelScheduleRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => data),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    // @ts-ignore - Aceitar tipagem parcial para testes
    service = new MondayService();
    
    // Sobrescrever repositories privados
    (service as any).mondayBoardRepository = mockBoardRepository;
    (service as any).mondayItemRepository = mockItemRepository;

    // Mock console para reduzir ruído nos testes
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ========================================
  // recalculateTouchpointTaxonomy()
  // ========================================

  describe('recalculateTouchpointTaxonomy', () => {
    it('deve recalcular todos os campos taxonômicos com sucesso', async () => {
      // Arrange
      mockBoardRepository.findOne.mockResolvedValue({ id: 'produto-board-uuid', name: 'Produto' });
      
      // Mock getCodeByItemName
      jest.spyOn(service as any, 'getCodeByItemName').mockImplementation(async (...args: any[]) => {
        const name = args[0] as string;
        const codes: Record<string, string> = {
          'Cliente A': 'CLI001',
          'Campanha B': 'CAMP002',
          'Disparo C': 'DISP003',
          'Mecânica D': 'MEC004',
          'Área E': 'AREA005',
          'Objetivo F': 'OBJ006',
          'Produto G': 'PROD007',
          'Segmento H': 'SEG008',
          'Canal Email': 'EMAIL',
        };
        return codes[name] || 'NaN';
      });

      // Mock getSubproductByProduct
      jest.spyOn(service as any, 'getSubproductByProduct').mockResolvedValue({
        name: 'Subproduto X',
        code: 'SUBPROD001',
      });

      // Mock updateColumn
      jest.spyOn(service as any, 'updateColumn').mockResolvedValue(undefined);

      const touchpointData = {
        canal: 'Canal Email',
        dataDisparo: '2025-01-15',
        ordemCanal: 1,
      };

      const campaignData = {
        tipoCliente: 'Cliente A',
        tipoCampanha: 'Campanha B',
        tipoDisparo: 'Disparo C',
        mecanica: 'Mecânica D',
        areaSolicitante: 'Área E',
        objetivo: 'Objetivo F',
        produto: 'Produto G',
        segmento: 'Segmento H',
      };

      // Act
      const result = await (service as any).recalculateTouchpointTaxonomy(
        '12345',
        'campaign-123',
        touchpointData,
        campaignData
      );

      // Assert
      expect(result).toBeGreaterThan(0); // Retorna número de campos atualizados
      expect(service['updateColumn']).toHaveBeenCalled();
      
      // Verificar que taxonomia composta foi criada
      const updateCalls = (service['updateColumn'] as jest.Mock).mock.calls;
      const compositeTaxonomyCall = updateCalls.find((call: any) => call[1] === 'text_mkr5kh2r');
      expect(compositeTaxonomyCall).toBeDefined();
      expect(compositeTaxonomyCall[2]).toContain('20250115'); // Data no formato YYYYMMDD
      expect(compositeTaxonomyCall[2]).toContain('id-campaign-123');
      expect(compositeTaxonomyCall[2]).toContain('CLI001');
    });

    it('deve lidar com dados taxonômicos parciais', async () => {
      // Arrange
      mockBoardRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service as any, 'getCodeByItemName').mockResolvedValue('NaN');
      jest.spyOn(service as any, 'getSubproductByProduct').mockResolvedValue(null);
      jest.spyOn(service as any, 'updateColumn').mockResolvedValue(undefined);

      const touchpointData = {
        canal: 'Email',
        dataDisparo: '2025-01-01',
        ordemCanal: 1,
      };

      const campaignData = {
        tipoCliente: 'Cliente A',
        // Outros campos ausentes
      };

      // Act
      const result = await (service as any).recalculateTouchpointTaxonomy(
        '12345',
        'campaign-123',
        touchpointData,
        campaignData
      );

      // Assert
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar 0 quando updateColumn falha', async () => {
      // Arrange
      mockBoardRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service as any, 'getCodeByItemName').mockResolvedValue('CODE');
      jest.spyOn(service as any, 'updateColumn').mockRejectedValue(new Error('Falha na atualização'));

      const touchpointData = { canal: 'Email', dataDisparo: '2025-01-01', ordemCanal: 1 };
      const campaignData = { tipoCliente: 'Cliente A' };

      // Act
      const result = await (service as any).recalculateTouchpointTaxonomy(
        '12345',
        'campaign-123',
        touchpointData,
        campaignData
      );

      // Assert
      expect(result).toBe(0); // Retorna 0 em caso de erro
    });

    it('deve converter área solicitante ID para nome', async () => {
      // Arrange
      mockBoardRepository.findOne.mockResolvedValue(null);
      mockItemRepository.findOne.mockResolvedValue({
        name: 'Marketing',
        code: 'MKT001',
      });
      jest.spyOn(service as any, 'getCodeByItemName').mockResolvedValue('CODE');
      jest.spyOn(service as any, 'updateColumn').mockResolvedValue(undefined);

      const touchpointData = { canal: 'Email', dataDisparo: '2025-01-01', ordemCanal: 1 };
      const campaignData = { areaSolicitante: '123456' }; // ID numérico

      // Act
      const result = await (service as any).recalculateTouchpointTaxonomy(
        '12345',
        'campaign-123',
        touchpointData,
        campaignData
      );

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({ where: { item_id: '123456' } });
    });
  });

  // ========================================
  // updateTouchpointScheduling()
  // ========================================

  describe('updateTouchpointScheduling', () => {
    beforeEach(() => {
      // Mock makeGraphQLRequest para retornar canal
      jest.spyOn(service as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          boards: [{
            items_page: {
              items: [
                { id: 'canal-123', name: 'Email' },
                { id: 'canal-456', name: 'SMS' },
              ]
            }
          }]
        }
      });

      // Mock convertDateFormat
      jest.spyOn(service as any, 'convertDateFormat').mockImplementation((...args: any[]) => args[0]);
    });

    it.skip('deve deletar agendamento antigo e criar novo (requer integração DB)', async () => {
      // Arrange
      const scheduleInfo = {
        touchpointId: 'tp-123',
        oldCanal: 'Email',
        oldData: '2025-01-10',
        oldHora: '10:00',
        newCanal: 'SMS',
        newData: '2025-01-15',
        newHora: '14:00',
        volumeDisparo: 5000,
        areaSolicitante: 'Marketing',
        isPrimeiroPreenchimento: false,
      };

      mockChannelScheduleRepository.createQueryBuilder().getMany.mockResolvedValue([
        { id: 'schedule-1', hora: '10:00:00', area_solicitante: 'Marketing' },
      ]);

      // Act
      await (service as any).updateTouchpointScheduling(scheduleInfo);

      // Assert
      expect(mockChannelScheduleRepository.delete).toHaveBeenCalledWith(['schedule-1']);
      expect(mockChannelScheduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_canal: 'canal-456', // SMS
          hora: '14:00',
          qtd: 5000,
          area_solicitante: 'Marketing',
          tipo: 'agendamento',
        })
      );
    });

    it.skip('deve criar agendamento sem deletar no primeiro preenchimento (requer integração DB)', async () => {
      // Arrange
      const scheduleInfo = {
        touchpointId: 'tp-123',
        oldCanal: '',
        oldData: '',
        oldHora: '',
        newCanal: 'Email',
        newData: '2025-01-15',
        newHora: '10:00',
        volumeDisparo: 3000,
        areaSolicitante: 'Vendas',
        isPrimeiroPreenchimento: true,
      };

      // Act
      await (service as any).updateTouchpointScheduling(scheduleInfo);

      // Assert
      expect(mockChannelScheduleRepository.delete).not.toHaveBeenCalled();
      expect(mockChannelScheduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_canal: 'canal-123', // Email
          hora: '10:00',
          qtd: 3000,
        })
      );
    });

    it('deve lidar com canal não encontrado', async () => {
      // Arrange
      jest.spyOn(service as any, 'makeGraphQLRequest').mockResolvedValue({
        data: { boards: [{ items_page: { items: [] } }] }
      });

      const scheduleInfo = {
        touchpointId: 'tp-123',
        oldCanal: 'CanalInexistente',
        oldData: '2025-01-10',
        oldHora: '10:00',
        newCanal: 'OutroCanalInexistente',
        newData: '2025-01-15',
        newHora: '14:00',
        volumeDisparo: 1000,
        areaSolicitante: 'TI',
        isPrimeiroPreenchimento: false,
      };

      // Act
      await (service as any).updateTouchpointScheduling(scheduleInfo);

      // Assert
      expect(mockChannelScheduleRepository.delete).not.toHaveBeenCalled();
      expect(mockChannelScheduleRepository.save).not.toHaveBeenCalled();
    });

    it.skip('deve continuar mesmo se deletar falhar (requer integração DB)', async () => {
      // Arrange
      const scheduleInfo = {
        touchpointId: 'tp-123',
        oldCanal: 'Email',
        oldData: '2025-01-10',
        oldHora: '10:00',
        newCanal: 'Email',
        newData: '2025-01-15',
        newHora: '11:00',
        volumeDisparo: 2000,
        areaSolicitante: 'Financeiro',
        isPrimeiroPreenchimento: false,
      };

      mockChannelScheduleRepository.delete.mockRejectedValue(new Error('Erro ao deletar'));

      // Act - não deve lançar erro
      await expect((service as any).updateTouchpointScheduling(scheduleInfo)).resolves.not.toThrow();

      // Assert - deve continuar e tentar criar novo
      expect(mockChannelScheduleRepository.save).toHaveBeenCalled();
    });
  });

  // ========================================
  // updateTouchpointFields()
  // ========================================

  describe('updateTouchpointFields', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'normalizeValueForComparison').mockImplementation((val: any) => String(val || ''));
      jest.spyOn(service as any, 'updateColumn').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'recalculateTouchpointTaxonomy').mockResolvedValue(5);
      jest.spyOn(service as any, 'updateTouchpointScheduling').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'makeGraphQLRequest').mockResolvedValue({
        data: { items: [{ column_values: [] }] }
      });
    });

    it('deve detectar e atualizar campos modificados', async () => {
      // Arrange
      const touchpointData = {
        id: 'tp-123',
        canal: 'Email',
        dataDisparo: '2025-01-15',
        descricao: 'Nova descrição',
        volumeDisparo: 5000,
      };

      const currentTouchpoint = {
        canal: 'SMS', // Diferente
        dataDisparo: '2025-01-10', // Diferente
        descricao: 'Descrição antiga', // Diferente
        volumeDisparo: 5000, // Igual
      };

      // Act
      const result = await (service as any).updateTouchpointFields(
        'tp-123',
        touchpointData,
        currentTouchpoint,
        'campaign-123',
        {},
        {}
      );

      // Assert
      expect(result.fieldsUpdated).toBeGreaterThan(0);
      expect(service['updateColumn']).toHaveBeenCalled();
    });

    it('deve recalcular taxonomia quando campos relevantes mudam', async () => {
      // Arrange
      const touchpointData = {
        id: 'tp-123',
        canal: 'Email',
        ordemCanal: 2,
        dataDisparo: '2025-01-20',
      };

      const currentTouchpoint = {
        canal: 'SMS',
        ordemCanal: 1,
        dataDisparo: '2025-01-10',
      };

      // Act
      const result = await (service as any).updateTouchpointFields(
        'tp-123',
        touchpointData,
        currentTouchpoint,
        'campaign-123',
        {},
        {}
      );

      // Assert
      expect(result.taxonomyUpdated).toBe(5);
      expect(service['recalculateTouchpointTaxonomy']).toHaveBeenCalled();
    });

    it('deve processar agendamento quando canal/data/hora mudam', async () => {
      // Arrange
      jest.spyOn(service as any, 'makeGraphQLRequest').mockResolvedValue({
        data: {
          items: [{
            column_values: [
              { id: 'text_mkvgjh0w', text: '10:00' },
              { id: 'data__1', value: JSON.stringify({ date: '2025-01-10' }) },
              { id: 'texto6__1', text: 'Email' },
            ]
          }]
        }
      });

      const touchpointData = {
        id: 'tp-123',
        horaDisparo: '14:00', // Mudou
        dataDisparo: '2025-01-15', // Mudou
        canal: 'SMS', // Mudou
      };

      const currentTouchpoint = {
        horaDisparo: '10:00',
        dataDisparo: '2025-01-10',
        canal: 'Email',
      };

      // Act
      await (service as any).updateTouchpointFields(
        'tp-123',
        touchpointData,
        currentTouchpoint,
        'campaign-123',
        {},
        {}
      );

      // Assert
      expect(service['updateTouchpointScheduling']).toHaveBeenCalledWith(
        expect.objectContaining({
          oldHora: '10:00',
          oldData: '2025-01-10',
          oldCanal: 'Email',
          newHora: '14:00',
          newData: '2025-01-15',
          newCanal: 'SMS',
        })
      );
    });

    it('deve ignorar erro de limite de conexões', async () => {
      // Arrange
      jest.spyOn(service as any, 'updateColumn').mockRejectedValue(
        new Error('limit has reached of connected items')
      );

      const touchpointData = { id: 'tp-123', canal: 'Email' };
      const currentTouchpoint = { canal: 'SMS' };

      // Act
      const result = await (service as any).updateTouchpointFields(
        'tp-123',
        touchpointData,
        currentTouchpoint,
        'campaign-123',
        {},
        {}
      );

      // Assert
      expect(result.fieldsUpdated).toBe(1); // Deve contar como atualizado mesmo com erro
    });

    it('não deve atualizar quando valores são iguais', async () => {
      // Arrange
      const touchpointData = {
        id: 'tp-123',
        canal: 'Email',
        descricao: 'Mesma descrição',
      };

      const currentTouchpoint = {
        canal: 'Email', // Igual
        descricao: 'Mesma descrição', // Igual
      };

      // Act
      const result = await (service as any).updateTouchpointFields(
        'tp-123',
        touchpointData,
        currentTouchpoint,
        'campaign-123',
        {},
        {}
      );

      // Assert
      expect(result.fieldsUpdated).toBe(0);
      expect(service['updateColumn']).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // updateCampaignTouchpoints()
  // ========================================

  describe('updateCampaignTouchpoints', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'updateTouchpointFields').mockResolvedValue({
        fieldsUpdated: 3,
        taxonomyUpdated: 5,
      });
      
      jest.spyOn(service as any, 'adjustTouchpointCapacity').mockImplementation(
        async (...args: any[]) => args[0]
      );
      
      jest.spyOn(service as any, 'insertChannelSchedulesForTouchpoints').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'createTouchpointForCampaign').mockResolvedValue('new-tp-123');
    });

    it('deve atualizar touchpoints existentes', async () => {
      // Arrange
      const formData = {
        __SUBITEMS__: [
          { id: 'tp-1', canal: 'Email', descricao: 'Nova descrição' },
          { id: 'tp-2', canal: 'SMS', volumeDisparo: 3000 },
        ]
      };

      const currentData = {
        __SUBITEMS__: [
          { id: 'tp-1', canal: 'SMS', descricao: 'Descrição antiga' },
          { id: 'tp-2', canal: 'SMS', volumeDisparo: 2000 },
        ]
      };

      // Act
      const result = await (service as any).updateCampaignTouchpoints(
        'campaign-123',
        formData,
        currentData
      );

      // Assert
      expect(result.touchpointsCreated).toBe(0);
      expect(result.touchpointsUpdated).toBe(16); // 2 touchpoints × (3 fields + 5 taxonomy) = 16
      expect(service['updateTouchpointFields']).toHaveBeenCalledTimes(2);
    });

    it('deve criar novos touchpoints', async () => {
      // Arrange
      const formData = {
        __SUBITEMS__: [
          { canal: 'Email', dataDisparo: '2025-01-15', ordemCanal: 1 }, // Sem ID
        ]
      };

      const currentData = {
        __SUBITEMS__: []
      };

      // Act
      const result = await (service as any).updateCampaignTouchpoints(
        'campaign-123',
        formData,
        currentData
      );

      // Assert
      expect(result.touchpointsCreated).toBe(1);
      expect(service['createTouchpointForCampaign']).toHaveBeenCalledWith(
        'campaign-123',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('deve lidar com lista vazia de touchpoints', async () => {
      // Arrange
      const formData = { __SUBITEMS__: [] };
      const currentData = { __SUBITEMS__: [] };

      // Act
      const result = await (service as any).updateCampaignTouchpoints(
        'campaign-123',
        formData,
        currentData
      );

      // Assert
      expect(result.touchpointsCreated).toBe(0);
      expect(result.touchpointsUpdated).toBe(0);
    });

    it('deve ajustar capacidade antes de criar touchpoints', async () => {
      // Arrange
      const adjustCapacitySpy = jest.spyOn(service as any, 'adjustTouchpointCapacity').mockResolvedValue([
        { id: undefined, canal: 'Email', volumeDisparo: 2500 },
        { id: undefined, canal: 'Email', volumeDisparo: 2500 }, // Dividido em 2
      ]);

      const formData = {
        __SUBITEMS__: [
          { canal: 'Email', volumeDisparo: 5000, ordemCanal: 1 },
        ]
      };

      const currentData = { __SUBITEMS__: [] };

      // Act
      await (service as any).updateCampaignTouchpoints(
        'campaign-123',
        formData,
        currentData
      );

      // Assert
      expect(adjustCapacitySpy).toHaveBeenCalled();
      expect(service['createTouchpointForCampaign']).toHaveBeenCalledTimes(2); // 2 touchpoints após ajuste
    });

    it('deve continuar processando mesmo se criação falhar', async () => {
      // Arrange
      jest.spyOn(service as any, 'createTouchpointForCampaign').mockRejectedValue(
        new Error('Erro ao criar')
      );

      const formData = {
        __SUBITEMS__: [
          { canal: 'Email' }, // Sem ID - vai tentar criar
          { id: 'tp-1', canal: 'SMS' }, // Com ID - vai atualizar
        ]
      };

      const currentData = {
        __SUBITEMS__: [
          { id: 'tp-1', canal: 'Email' },
        ]
      };

      // Act
      const result = await (service as any).updateCampaignTouchpoints(
        'campaign-123',
        formData,
        currentData
      );

      // Assert
      expect(result.touchpointsCreated).toBe(0); // Falhou ao criar
      expect(result.touchpointsUpdated).toBe(8); // Mas atualizou o existente
    });
  });
});
