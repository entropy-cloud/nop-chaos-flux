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
  it('reports error via env.notify and env.monitor by default', () => {
    const monitor = { onError: vi.fn() };
    const env = createMockEnv({ monitor });

    reportRuntimeHostIssue({
      env,
      error: new Error('something broke'),
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'something broke');
    expect(monitor.onError).toHaveBeenCalledWith({
      phase: 'render',
      error: new Error('something broke'),
      details: undefined,
    });
  });

  it('uses custom level and message', () => {
    const env = createMockEnv({ monitor: { onError: vi.fn() } });

    reportRuntimeHostIssue({
      env,
      level: 'warning',
      message: 'custom warning',
      error: new Error('internal'),
    });

    expect(env.notify).toHaveBeenCalledWith('warning', 'custom warning');
  });

  it('derives message from error when not provided', () => {
    const env = createMockEnv({ monitor: { onError: vi.fn() } });

    reportRuntimeHostIssue({
      env,
      error: new Error('error derived message'),
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'error derived message');
  });

  it('handles string error', () => {
    const env = createMockEnv({ monitor: { onError: vi.fn() } });

    reportRuntimeHostIssue({
      env,
      error: 'string error',
    });

    expect(env.notify).toHaveBeenCalledWith('error', 'string error');
  });

  it('uses fallback message for null/undefined error', () => {
    const env = createMockEnv({ monitor: { onError: vi.fn() } });

    reportRuntimeHostIssue({ env });

    expect(env.notify).toHaveBeenCalledWith('error', 'Runtime host issue');
  });

  it('skips notification when notify: false', () => {
    const env = createMockEnv({ monitor: { onError: vi.fn() } });

    reportRuntimeHostIssue({
      env,
      error: new Error('silent'),
      notify: false,
    });

    expect(env.notify).not.toHaveBeenCalled();
    expect(env.monitor!.onError).toHaveBeenCalled();
  });

  it('skips monitor when monitor: false', () => {
    const monitor = { onError: vi.fn() };
    const env = createMockEnv({ monitor });

    reportRuntimeHostIssue({
      env,
      error: new Error('no monitor report'),
      monitor: false,
    });

    expect(env.notify).toHaveBeenCalled();
    expect(monitor.onError).not.toHaveBeenCalled();
  });

  it('skips monitor when no error provided', () => {
    const monitor = { onError: vi.fn() };
    const env = createMockEnv({ monitor });

    reportRuntimeHostIssue({
      env,
      level: 'info',
      message: 'info only',
    });

    expect(env.notify).toHaveBeenCalledWith('info', 'info only');
    expect(monitor.onError).not.toHaveBeenCalled();
  });

  it('passes details to monitor', () => {
    const monitor = { onError: vi.fn() };
    const env = createMockEnv({ monitor });

    reportRuntimeHostIssue({
      env,
      error: new Error('with details'),
      nodeId: 'node-1',
      path: '/path',
      phase: 'action',
      details: { extra: 'info' },
    });

    expect(monitor.onError).toHaveBeenCalledWith({
      phase: 'action',
      error: new Error('with details'),
      nodeId: 'node-1',
      path: '/path',
      details: { extra: 'info' },
    });
  });

  it('skips monitor when env has no monitor', () => {
    const env = createMockEnv();

    reportRuntimeHostIssue({
      env,
      error: new Error('no monitor attached'),
    });

    expect(env.notify).toHaveBeenCalled();
  });
});
