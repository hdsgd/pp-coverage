import { afterEach, beforeEach, jest } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';

let consoleErrorSpy: SpyInstance | undefined;
let consoleWarnSpy: SpyInstance | undefined;
let consoleLogSpy: SpyInstance | undefined;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
  consoleLogSpy?.mockRestore();
});
