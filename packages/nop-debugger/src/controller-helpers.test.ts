import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNetworkSummary,
  createRequestKey,
  createSessionId,
  formatActionResult,
  formatErrorDetail,
  normalizeCompiledRoot,
  readWindowConfig,
  summarizeApi,
  summarizeValueShape
} from './controller-helpers';

const windowStub = {} as Window & typeof globalThis;

Object.defineProperty(globalThis, 'window', {
  value: windowStub,
  configurable: true
});

describe('controller helpers', () => {
  beforeEach(() => {
    delete window.__NOP_DEBUGGER__;
  });

  it('reads debugger window config from defaults, boolean flags, and explicit config', () => {
    expect(readWindowConfig()).toMatchObject({
      enabled: false,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 24, y: 24 },
      dock: 'floating'
    });

    window.__NOP_DEBUGGER__ = true;
    expect(readWindowConfig()).toMatchObject({
      enabled: true,
      defaultOpen: true,
      defaultTab: 'timeline'
    });

    window.__NOP_DEBUGGER__ = {
      enabled: true,
      defaultOpen: false,
      defaultTab: 'network',
      position: { x: 99, y: 77 },
      dock: 'floating'
    };
    expect(readWindowConfig()).toMatchObject({
      enabled: true,
      defaultOpen: false,
      defaultTab: 'network',
      position: { x: 99, y: 77 }
    });
  });

  it('formats ids, errors, actions, api labels, and request keys', () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date('2026-03-21T01:02:03.000Z'));
      expect(createSessionId('demo')).toMatch(/^demo:[a-z0-9]+$/);
    } finally {
      vi.useRealTimers();
    }

    expect(formatErrorDetail('plain text')).toBe('plain text');
    expect(formatErrorDetail(new Error('boom'))).toContain('boom');
    expect(formatErrorDetail({ code: 500 })).toBe('{"code":500}');
    expect(formatActionResult(undefined)).toBe('completed');
    expect(formatActionResult({ ok: false, cancelled: true })).toBe('cancelled');
    expect(formatActionResult({ ok: true })).toBe('ok');
    expect(formatActionResult({ ok: false })).toBe('failed');
    expect(summarizeApi({ url: '/api/demo', method: 'post' })).toBe('POST /api/demo');
    expect(createRequestKey({ url: '/api/demo', method: 'post' }, 'node-1', 'body.0')).toBe('POST /api/demo | node-1 | body.0');
  });

  it('summarizes value shapes, network metadata, and compiled roots', () => {
    expect(summarizeValueShape(['a', 'b'])).toEqual({
      responseType: 'array',
      keys: []
    });
    expect(summarizeValueShape({ a: 1, b: 2 })).toEqual({
      responseType: 'object',
      keys: ['a', 'b']
    });
    expect(summarizeValueShape(null)).toEqual({
      responseType: 'nullish',
      keys: []
    });

    expect(buildNetworkSummary({
      api: {
        url: '/api/users',
        method: 'post',
        data: { username: 'alice', token: 'secret' }
      },
      response: {
        ok: true,
        status: 200,
        data: { items: [], total: 1 }
      }
    })).toMatchObject({
      method: 'POST',
      url: '/api/users',
      status: 200,
      ok: true,
      requestDataKeys: ['username', 'token'],
      responseDataKeys: ['items', 'total'],
      responseType: 'object'
    });

    expect(normalizeCompiledRoot({ type: 'page', path: 'root' } as never)).toEqual({
      rootCount: 1,
      firstType: 'page',
      firstPath: 'root'
    });
    expect(normalizeCompiledRoot([
      { type: 'page', path: 'root' },
      { type: 'form', path: 'body.0' }
    ] as never)).toEqual({
      rootCount: 2,
      firstType: 'page',
      firstPath: 'root'
    });
  });
});
