import { afterEach, beforeEach, jest } from '@jest/globals';

let consoleErrorSpy: jest.SpiedFunction<typeof console.error> | undefined;
let consoleWarnSpy: jest.SpiedFunction<typeof console.warn> | undefined;
let consoleLogSpy: jest.SpiedFunction<typeof console.log> | undefined;

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
