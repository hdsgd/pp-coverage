module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
  collectCoverageFrom: [
    // Controllers (todos testados)
    'src/controllers/**/*.ts',
    
    // DTOs (todos testados)
    'src/dto/**/*.ts',
    
    // Entities (todos testados)
    'src/entities/**/*.ts',
    
    // Middleware (não testado ainda)
    'src/middleware/**/*.ts',
    
    // Routes (não testado ainda)
    'src/routes/**/*.ts',
    
    // Services (parcialmente testado)
    'src/services/**/*.ts',
    
    // Utils (não testado ainda)
    'src/utils/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  verbose: true,
};
