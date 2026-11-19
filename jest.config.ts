import type { Config } from 'jest';

const config: Config = {
  // Usa ts-jest para transpilar TypeScript
  preset: 'ts-jest',
  testEnvironment: 'node',

  // No falla si todavía no hay archivos de prueba
  passWithNoTests: true,

  // Busca pruebas en src/
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],

  // Cobertura calculada sobre los archivos de src/,
  // excluyendo index.ts (punto de entrada) y los propios archivos de prueba
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
