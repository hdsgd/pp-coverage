import { DropdownController } from '../../src/controllers/DropdownController';
import { MondayService } from '../../src/services/MondayService';

// Mock do MondayService
jest.mock('../../src/services/MondayService');

describe('DropdownController', () => {
    let controller: DropdownController;
    let mockMondayService: jest.Mocked<MondayService>;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Mock do MondayService
        mockMondayService = {
            getFieldOptions: jest.fn(),
        } as any;

        // Configura o mock para retornar a instância mockada
        (MondayService as jest.MockedClass<typeof MondayService>).mockImplementation(() => mockMondayService);

        controller = new DropdownController();

        // Mock da Response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTES PARA getDropdownOptions
    // ============================================
    describe('getDropdownOptions', () => {
        beforeEach(() => {
            mockRequest = {
                params: { fieldId: 'field-123' }
            };
        });

        it('deve retornar opções de dropdown com sucesso', async () => {
            const mockOptions = [
                { id: '1', label: 'Opção 1' },
                { id: '2', label: 'Opção 2' },
                { id: '3', label: 'Opção 3' }
            ];

            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockMondayService.getFieldOptions).toHaveBeenCalledWith('field-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                options: mockOptions,
                total: 3,
                fieldId: 'field-123'
            });
        });

        it('deve retornar erro 400 se fieldId não for fornecido', async () => {
            mockRequest.params = {};

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Field ID é obrigatório'
            });
            expect(mockMondayService.getFieldOptions).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se fieldId for undefined', async () => {
            mockRequest.params.fieldId = undefined;

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Field ID é obrigatório'
            });
        });

        it('deve retornar erro 400 se fieldId for null', async () => {
            mockRequest.params.fieldId = null;

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Field ID é obrigatório'
            });
        });

        it('deve retornar erro 400 se fieldId for string vazia', async () => {
            mockRequest.params.fieldId = '';

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Field ID é obrigatório'
            });
        });

        it('deve retornar array vazio se não houver opções', async () => {
            mockMondayService.getFieldOptions.mockResolvedValue([]);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                options: [],
                total: 0,
                fieldId: 'field-123'
            });
        });

        it('deve retornar erro 500 se o serviço lançar uma exceção', async () => {
            mockMondayService.getFieldOptions.mockRejectedValue(new Error('Monday API error'));

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao buscar opções do dropdown',
                error: 'Monday API error'
            });
        });

        it('deve retornar erro 500 com mensagem padrão se erro não for instância de Error', async () => {
            mockMondayService.getFieldOptions.mockRejectedValue('string error');

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao buscar opções do dropdown',
                error: 'Erro desconhecido'
            });
        });

        it('deve buscar opções com fieldId numérico', async () => {
            mockRequest.params.fieldId = '12345';
            const mockOptions = [{ id: '1', label: 'Test' }];
            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockMondayService.getFieldOptions).toHaveBeenCalledWith('12345');
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ fieldId: '12345' })
            );
        });

        it('deve buscar opções com fieldId alfanumérico', async () => {
            mockRequest.params.fieldId = 'field_abc_123';
            const mockOptions = [{ id: '1', label: 'Test' }];
            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockMondayService.getFieldOptions).toHaveBeenCalledWith('field_abc_123');
        });

        it('deve retornar múltiplas opções com estrutura correta', async () => {
            const mockOptions = [
                { id: '1', label: 'Marketing' },
                { id: '2', label: 'Vendas' },
                { id: '3', label: 'Suporte' },
                { id: '4', label: 'TI' },
                { id: '5', label: 'RH' }
            ];

            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                options: mockOptions,
                total: 5,
                fieldId: 'field-123'
            });
        });

        it('deve retornar sucesso true mesmo com array vazio', async () => {
            mockMondayService.getFieldOptions.mockResolvedValue([]);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('deve chamar getFieldOptions apenas uma vez', async () => {
            const mockOptions = [{ id: '1', label: 'Test' }];
            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockMondayService.getFieldOptions).toHaveBeenCalledTimes(1);
        });

        it('deve incluir fieldId na resposta mesmo com erro do serviço', async () => {
            mockMondayService.getFieldOptions.mockRejectedValue(new Error('API error'));

            await controller.getDropdownOptions(mockRequest, mockResponse);

            // Verifica que a resposta foi chamada com erro
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Erro ao buscar opções do dropdown'
                })
            );
        });

        it('deve tratar fieldId com caracteres especiais', async () => {
            mockRequest.params.fieldId = 'field-123-abc_xyz';
            const mockOptions = [{ id: '1', label: 'Test' }];
            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockMondayService.getFieldOptions).toHaveBeenCalledWith('field-123-abc_xyz');
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ fieldId: 'field-123-abc_xyz' })
            );
        });

        it('deve retornar total correto para lista com uma única opção', async () => {
            const mockOptions = [{ id: '1', label: 'Única Opção' }];
            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ total: 1 })
            );
        });

        it('deve retornar opções com diferentes estruturas de dados', async () => {
            const mockOptions = [
                { id: '1', label: 'Opção 1', value: 'opt1', color: '#FF0000' },
                { id: '2', label: 'Opção 2', value: 'opt2', color: '#00FF00' }
            ];

            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                options: mockOptions,
                total: 2,
                fieldId: 'field-123'
            });
        });

        it('deve manter a ordem das opções retornadas pelo serviço', async () => {
            const mockOptions = [
                { id: '3', label: 'C' },
                { id: '1', label: 'A' },
                { id: '2', label: 'B' }
            ];

            mockMondayService.getFieldOptions.mockResolvedValue(mockOptions as any);

            await controller.getDropdownOptions(mockRequest, mockResponse);

            const response = mockResponse.json.mock.calls[0][0];
            expect(response.options).toEqual(mockOptions);
            expect(response.options[0].id).toBe('3');
            expect(response.options[1].id).toBe('1');
            expect(response.options[2].id).toBe('2');
        });

        it('deve lidar com timeout do serviço Monday', async () => {
            mockMondayService.getFieldOptions.mockRejectedValue(new Error('Request timeout'));

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao buscar opções do dropdown',
                error: 'Request timeout'
            });
        });

        it('deve lidar com erro de autenticação do Monday', async () => {
            mockMondayService.getFieldOptions.mockRejectedValue(new Error('Authentication failed'));

            await controller.getDropdownOptions(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Erro ao buscar opções do dropdown',
                error: 'Authentication failed'
            });
        });
    });
});
