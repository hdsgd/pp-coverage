import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };
    mockNext = jest.fn();
    
    // Spy on console.error to suppress output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('ValidationError Handling', () => {
    it('should return 400 for ValidationError with details', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        details: ['Field1 is required', 'Field2 must be a number']
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: ['Field1 is required', 'Field2 must be a number']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 for ValidationError without details', () => {
      const error = {
        name: 'ValidationError',
        message: 'Invalid data provided'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: 'Invalid data provided'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use message when details is undefined', () => {
      const error = {
        name: 'ValidationError',
        message: 'Email format is invalid',
        details: undefined
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: 'Email format is invalid'
      });
    });

    it('should handle ValidationError with empty details array', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        details: []
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: []
      });
    });

    it('should log ValidationError message', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Validation failed');
    });
  });

  describe('EntityNotFoundError Handling', () => {
    it('should return 404 for EntityNotFoundError', () => {
      const error = {
        name: 'EntityNotFoundError',
        message: 'User not found'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recurso não encontrado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 for EntityNotFoundError with different message', () => {
      const error = {
        name: 'EntityNotFoundError',
        message: 'Product with ID 123 not found'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recurso não encontrado'
      });
    });

    it('should log EntityNotFoundError message', () => {
      const error = {
        name: 'EntityNotFoundError',
        message: 'User not found'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'User not found');
    });
  });

  describe('Duplicate Key Error (23505) Handling', () => {
    it('should return 409 for duplicate key error', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email ou documento já cadastrado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle 23505 error with detailed message', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "users_email_key"'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email ou documento já cadastrado'
      });
    });

    it('should log duplicate key error message', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'duplicate key value');
    });
  });

  describe('JSON Parse Error Handling', () => {
    it('should return 400 for JSON parse error', () => {
      const error = {
        type: 'entity.parse.failed',
        message: 'Unexpected token in JSON'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'JSON inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JSON parse error with detailed message', () => {
      const error = {
        type: 'entity.parse.failed',
        message: 'Unexpected token } in JSON at position 42'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'JSON inválido'
      });
    });

    it('should log JSON parse error message', () => {
      const error = {
        type: 'entity.parse.failed',
        message: 'Invalid JSON'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Invalid JSON');
    });
  });

  describe('Internal Server Error Handling', () => {
    it('should return 500 for unknown error type', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 for database connection error', () => {
      const error = new Error('Database connection failed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should return 500 for error without message', () => {
      const error = new Error();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should handle null error by crashing (edge case)', () => {
      const error = null;

      // null/undefined errors will cause TypeError when accessing error.name
      expect(() => {
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(TypeError);
    });

    it('should handle undefined error by crashing (edge case)', () => {
      const error = undefined;

      // null/undefined errors will cause TypeError when accessing error.name
      expect(() => {
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(TypeError);
    });

    it('should return 500 for string error', () => {
      const error = 'String error message';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should return 500 for number error', () => {
      const error = 12345;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should log error message for standard Error', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Test error');
    });

    it('should log error itself when no message available', () => {
      const error = 'String error';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'String error');
    });
  });

  describe('Headers Already Sent Handling', () => {
    it('should delegate to default handler when headers are already sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should delegate ValidationError when headers are sent', () => {
      mockResponse.headersSent = true;
      const error = {
        name: 'ValidationError',
        message: 'Validation failed'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should delegate EntityNotFoundError when headers are sent', () => {
      mockResponse.headersSent = true;
      const error = {
        name: 'EntityNotFoundError',
        message: 'Not found'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should delegate duplicate key error when headers are sent', () => {
      mockResponse.headersSent = true;
      const error = {
        code: '23505',
        message: 'duplicate key'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should delegate JSON parse error when headers are sent', () => {
      mockResponse.headersSent = true;
      const error = {
        type: 'entity.parse.failed',
        message: 'Invalid JSON'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should still log error when headers are sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('Test error after headers sent');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Test error after headers sent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with both name and code', () => {
      const error = {
        name: 'ValidationError',
        code: '23505',
        message: 'Conflict error'
      };

      // Should match ValidationError first (order matters)
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: 'Conflict error'
      });
    });

    it('should handle error with both name and type', () => {
      const error = {
        name: 'ValidationError',
        type: 'entity.parse.failed',
        message: 'Multiple error types'
      };

      // Should match ValidationError first
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: 'Multiple error types'
      });
    });

    it('should handle error object with extra properties', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        details: ['Error 1'],
        stack: 'Error stack trace',
        extraProp: 'Extra value'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: ['Error 1']
      });
    });

    it('should handle error with long message', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', longMessage);
    });

    it('should handle error with special characters in message', () => {
      const error = new Error('Error with special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should handle error with unicode characters in message', () => {
      const error = new Error('Erro com caracteres unicode: 你好 مرحبا שלום');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Erro com caracteres unicode: 你好 مرحبا שלום');
    });

    it('should handle error with multiline message', () => {
      const error = new Error('Line 1\nLine 2\nLine 3');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Line 1\nLine 2\nLine 3');
    });

    it('should handle circular reference in error object', () => {
      const error: any = { name: 'CustomError', message: 'Circular ref' };
      error.self = error; // Create circular reference

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });
  });

  describe('Error Priority Order', () => {
    it('should prioritize ValidationError over other error types', () => {
      const error = {
        name: 'ValidationError',
        code: '23505',
        type: 'entity.parse.failed',
        message: 'All error types'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // ValidationError is checked first
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: 'All error types'
      });
    });

    it('should check EntityNotFoundError before duplicate key', () => {
      const error = {
        name: 'EntityNotFoundError',
        code: '23505',
        message: 'Not found but also duplicate'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // EntityNotFoundError is checked before code 23505
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Recurso não encontrado'
      });
    });

    it('should check duplicate key before JSON parse error', () => {
      const error = {
        code: '23505',
        type: 'entity.parse.failed',
        message: 'Both duplicate and parse error'
      };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Code 23505 is checked before type
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email ou documento já cadastrado'
      });
    });
  });

  describe('Response Chain', () => {
    it('should return status and json chain correctly', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro interno do servidor'
      });
    });

    it('should not call next for ValidationError', () => {
      const error = { name: 'ValidationError', message: 'Test' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not call next for EntityNotFoundError', () => {
      const error = { name: 'EntityNotFoundError', message: 'Test' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not call next for duplicate key error', () => {
      const error = { code: '23505', message: 'Test' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not call next for JSON parse error', () => {
      const error = { type: 'entity.parse.failed', message: 'Test' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not call next for internal server error', () => {
      const error = new Error('Test');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
