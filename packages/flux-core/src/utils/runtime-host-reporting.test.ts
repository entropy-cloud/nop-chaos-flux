import { describe, expect, it, vi } from 'vitest';
import { reportRuntimeHostIssue } from './runtime-host-reporting.js';
import type { RendererEnv } from '../types/renderer-api.js';

function createMockEnv(overrides?: Partial<RendererEnv>): RendererEnv {
  return {
    fetcher: vi.fn() as any,
    notify: vi.fn(),
    ...overrides,
  };
}

describe('reportRuntimeHostIssue', () => {
  it('reports error via env.notify by default', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      error: new Error('something broke'),
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'something broke');
  });

  it('uses custom level and message', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      level: 'warning',
      message: 'custom warning',
      error: new Error('internal'),
    });

    expect(env.notify).toHaveBeenCalledWith('warning', 'custom warning');
  });

  it('derives message from error when not provided', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      error: new Error('error derived message'),
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'error derived message');
  });

  it('handles string error', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      error: 'string error',
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'string error');
  });

  it('uses fallback message for null/undefined error', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({ env });

    expect(env.notify).toHaveBeenCalledWith('error', 'Runtime host issue');
  });

  it('skips notification when notify: false', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      error: new Error('silent'),
      notify: false,
    });

    expect(env.notify).not.toHaveBeenCalled();
  });

  it('works without error object', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      level: 'info',
      message: 'info only',
    });

    expect(env.notify).toHaveBeenCalledWith('info', 'info only');
  });
});
