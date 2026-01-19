import { DataSource, Repository } from 'typeorm';
import { AuthController } from '../../src/controllers/AuthController';
import { User } from '../../src/entities/User';
import jwt from 'jsonwebtoken';

// Mock do jsonwebtoken
jest.mock('jsonwebtoken');

describe('AuthController', () => {
    let controller: AuthController;
    let mockUserRepository: jest.Mocked<Repository<User>>;
    let mockRequest: any;
    let mockResponse: any;
    let mockDataSource: jest.Mocked<DataSource>;
    let mockUser: any;

    beforeEach(() => {
        // Mock do User Repository
        mockUserRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as any;

        // Mock do DataSource
        mockDataSource = {
            getRepository: jest.fn().mockReturnValue(mockUserRepository),
        } as any;

        controller = new AuthController(mockDataSource);

        // Mock da Response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock do User
        mockUser = {
            id: 'user-123',
            username: 'testuser',
            password: 'hashed_password',
            role: 'user',
            is_active: true,
            comparePassword: jest.fn(),
        };

        // Mock das variáveis de ambiente
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_EXPIRES_IN = '8h';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTES PARA login
    // ============================================
    describe('login', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    username: 'testuser',
                    password: 'password123'
                }
            };
        });

        it('deve fazer login com sucesso e retornar token', async () => {
            const mockToken = 'mock.jwt.token';
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            await controller.login(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { username: 'testuser' }
            });
            expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
            expect(jwt.sign).toHaveBeenCalledWith(
                {
                    userId: 'user-123',
                    username: 'testuser',
                    role: 'user'
                },
                'test-secret',
                { expiresIn: '8h' }
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Login realizado com sucesso',
                token: mockToken,
                user: {
                    id: 'user-123',
                    username: 'testuser',
                    role: 'user'
                }
            });
        });

        it('deve retornar erro 400 se username estiver faltando', async () => {
            mockRequest.body.username = undefined;

            await controller.login(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Username e password são obrigatórios'
            });
            expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se password estiver faltando', async () => {
            mockRequest.body.password = undefined;

            await controller.login(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Username e password são obrigatórios'
            });
            expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        });

        it('deve retornar erro 400 se ambos username e password estiverem faltando', async () => {
            mockRequest.body = {};

            await controller.login(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Username e password são obrigatórios'
            });
        });

        it('deve retornar erro 401 se usuário não for encontrado', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await controller.login(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { username: 'testuser' }
            });
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Credenciais inválidas'
            });
        });

        it('deve retornar erro 401 se usuário estiver inativo', async () => {
            mockUser.is_active = false;
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await controller.login(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuário inativo'
            });
            expect(mockUser.comparePassword).not.toHaveBeenCalled();
        });

        it('deve retornar erro 401 se senha estiver incorreta', async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(false);

            await controller.login(mockRequest, mockResponse);

            expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Credenciais inválidas'
            });
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('deve retornar erro 500 se ocorrer exceção no banco de dados', async () => {
            mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

            await controller.login(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve usar JWT_SECRET padrão se não estiver definido no .env', async () => {
            delete process.env.JWT_SECRET;
            const mockToken = 'mock.jwt.token';
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            await controller.login(mockRequest, mockResponse);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                'your-secret-key-change-in-production',
                expect.any(Object)
            );
        });

        it('deve usar expiresIn padrão se não estiver definido no .env', async () => {
            delete process.env.JWT_EXPIRES_IN;
            const mockToken = 'mock.jwt.token';
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            await controller.login(mockRequest, mockResponse);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                { expiresIn: '8h' }
            );
        });

        it('deve incluir role de admin no token se usuário for admin', async () => {
            mockUser.role = 'admin';
            const mockToken = 'mock.jwt.token';
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            await controller.login(mockRequest, mockResponse);

            expect(jwt.sign).toHaveBeenCalledWith(
                {
                    userId: 'user-123',
                    username: 'testuser',
                    role: 'admin'
                },
                expect.any(String),
                expect.any(Object)
            );
        });

        it('deve fazer login com username contendo caracteres especiais', async () => {
            mockRequest.body.username = 'test.user@domain.com';
            mockUser.username = 'test.user@domain.com';
            const mockToken = 'mock.jwt.token';
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUser.comparePassword.mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue(mockToken);

            await controller.login(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { username: 'test.user@domain.com' }
            });
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Login realizado com sucesso'
                })
            );
        });
    });

    // ============================================
    // TESTES PARA me
    // ============================================
    describe('me', () => {
        beforeEach(() => {
            mockRequest = {
                user: {
                    userId: 'user-123',
                    username: 'testuser',
                    role: 'user'
                }
            };
        });

        it('deve retornar informações do usuário autenticado', async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await controller.me(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' }
            });
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: {
                    id: 'user-123',
                    username: 'testuser',
                    role: 'user',
                    is_active: true
                }
            });
        });

        it('deve retornar erro 401 se não houver usuário autenticado', async () => {
            mockRequest.user = undefined;

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Não autenticado'
            });
            expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        });

        it('deve retornar erro 401 se req.user for null', async () => {
            mockRequest.user = null;

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Não autenticado'
            });
        });

        it('deve retornar erro 404 se usuário não for encontrado no banco', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await controller.me(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' }
            });
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuário não encontrado'
            });
        });

        it('deve retornar erro 500 se ocorrer exceção no banco de dados', async () => {
            mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Erro interno do servidor'
            });
        });

        it('deve retornar informações de usuário admin', async () => {
            mockUser.role = 'admin';
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                user: expect.objectContaining({
                    role: 'admin'
                })
            });
        });

        it('deve retornar is_active false para usuário inativo', async () => {
            mockUser.is_active = false;
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                user: expect.objectContaining({
                    is_active: false
                })
            });
        });

        it('deve buscar usuário pelo userId correto do token', async () => {
            mockRequest.user.userId = 'different-user-id';
            mockUserRepository.findOne.mockResolvedValue({
                ...mockUser,
                id: 'different-user-id'
            });

            await controller.me(mockRequest, mockResponse);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'different-user-id' }
            });
        });

        it('deve retornar todos os campos esperados do usuário', async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await controller.me(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                user: {
                    id: expect.any(String),
                    username: expect.any(String),
                    role: expect.any(String),
                    is_active: expect.any(Boolean)
                }
            });
        });
    });
});
