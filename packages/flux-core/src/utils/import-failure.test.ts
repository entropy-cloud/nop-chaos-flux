import { describe, expect, it, vi } from 'vitest';
import {
  markImportErrorReported,
  isReportedImportError,
  reportImportFailure,
} from './import-failure.js';
import type { RendererEnv } from '../types/renderer-api.js';

function createMockEnv(overrides?: Partial<RendererEnv>): RendererEnv {
  return {
    fetcher: vi.fn() as any,
    notify: vi.fn(),
    ...overrides,
  };
}

describe('markImportErrorReported', () => {
  it('marks an error as reported', () => {
    const error = new Error('test');
    const marked = markImportErrorReported(error);
    expect(marked).toBe(error);
    expect(isReportedImportError(marked)).toBe(true);
  });

  it('returns the same error instance', () => {
    const error = new Error('test');
    const result = markImportErrorReported(error);
    expect(result).toBe(error);
  });
});

describe('isReportedImportError', () => {
  it('returns true for marked errors', () => {
    const error = markImportErrorReported(new Error('test'));
    expect(isReportedImportError(error)).toBe(true);
  });

  it('returns false for normal errors', () => {
    expect(isReportedImportError(new Error('test'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isReportedImportError(null)).toBe(false);
    expect(isReportedImportError(undefined)).toBe(false);
    expect(isReportedImportError('string')).toBe(false);
    expect(isReportedImportError(42)).toBe(false);
    expect(isReportedImportError({})).toBe(false);
  });
});

describe('reportImportFailure', () => {
  it('reports error via env.notify', () => {
    const env = createMockEnv();
    const error = new Error('import failed');

    const result = reportImportFailure({ env, error });

    expect(result).toBe(error);
    expect(isReportedImportError(result)).toBe(true);
    expect(env.notify).toHaveBeenCalledWith('error', 'import failed');
  });

  it('uses custom phase, message, and reason', () => {
    const env = createMockEnv();
    const error = new Error('original message');

    reportImportFailure({
      env,
      error,
      message: 'friendly message',
      phase: 'compile',
      reason: 'custom-reason',
      nodeId: 'node-1',
      path: '/path/to/node',
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'friendly message');
  });

  it('uses error.message when no custom message provided', () => {
    const env = createMockEnv();

    reportImportFailure({ env, error: new Error('direct message') });

    expect(env.notify).toHaveBeenCalledWith('error', 'direct message');
  });
});
