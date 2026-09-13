import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { IndustrialAdapter, type IndustrialTagConfig } from './industrial-adapter.js';

function makeScope() {
  const updates: Array<{ path: string; value: unknown }> = [];
  const scope = {
    update: vi.fn((path: string, value: unknown) => {
      updates.push({ path, value });
    }),
  } as unknown as ScopeRef;
  return { scope, updates };
}

interface FakeSocket {
  readyState: string;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { type: 'message'; data: string | ArrayBufferLike }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

function makeEnv() {
  const sockets: FakeSocket[] = [];
  const env = {
    openSocket: vi.fn(() => {
      const socket: FakeSocket = {
        readyState: 'connecting',
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };
      sockets.push(socket);
      return socket;
    }),
  } as unknown as RendererEnv;
  return { env, sockets };
}

function cfg(overrides: Partial<IndustrialTagConfig> = {}): IndustrialTagConfig {
  return {
    id: 'conn-1',
    url: 'ws://gateway',
    tags: [
      { name: 'valve', address: 'VALVE_001.state', type: 'bool' },
      { name: 'level', address: 'TANK.level', type: 'int16' },
      { name: 'temp', address: 'TANK.temp', type: 'float32' },
    ],
    polling: 1000,
    ...overrides,
  };
}

describe('IndustrialAdapter (plan 467 Phase 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('capability check: missing openSocket reports socket-unavailable once and never retries', () => {
    const { scope } = makeScope();
    const onError = vi.fn();
    const adapter = new IndustrialAdapter({ env: {} as RendererEnv, scope, onError });
    adapter.connect(cfg());
    adapter.connect(cfg({ id: 'conn-2' }));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'socket-unavailable',
      expect.any(String),
      expect.anything(),
    );
  });

  it('onopen resets reconnection and sends the subscribe frame', () => {
    const { scope } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    expect(sockets).toHaveLength(1);
    sockets[0].onopen?.({ type: 'open' });
    expect(sockets[0].send).toHaveBeenCalledTimes(1);
    const frame = JSON.parse(sockets[0].send.mock.calls[0][0] as string);
    expect(frame).toEqual({
      type: 'subscribe',
      tags: ['VALVE_001.state', 'TANK.level', 'TANK.temp'],
      polling: 1000,
    });
  });

  it('data frames map address→tag, convert types, drop NaN and write scope', () => {
    const { scope, updates } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    sockets[0].onopen?.({ type: 'open' });
    sockets[0].onmessage?.({
      type: 'message',
      data: JSON.stringify({
        type: 'data',
        payload: {
          'VALVE_001.state': 1,
          'TANK.level': '42.7',
          'TANK.temp': '36.5',
          'TANK.gone': 'not-a-tag',
        },
      }),
    });
    expect(scope.update).toHaveBeenCalledTimes(3);
    expect(updates).toEqual([
      { path: 'dataSources.valve', value: true },
      { path: 'dataSources.level', value: 42 },
      { path: 'dataSources.temp', value: 36.5 },
    ]);
    // NaN（int16 解析失败）被静默丢弃
    sockets[0].onmessage?.({
      type: 'message',
      data: JSON.stringify({ type: 'data', payload: { 'TANK.level': 'abc' } }),
    });
    expect(updates).toHaveLength(3);
  });

  it('reports socket-message-parse failures with dedup', () => {
    const { scope } = makeScope();
    const onError = vi.fn();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope, onError });
    adapter.connect(cfg());
    sockets[0].onopen?.({ type: 'open' });
    sockets[0].onmessage?.({ type: 'message', data: 'not-json' });
    sockets[0].onmessage?.({ type: 'message', data: 'still-not-json' });
    expect(onError.mock.calls.filter(([code]) => code === 'socket-message-parse')).toHaveLength(1);
  });

  it('onclose schedules reconnect; onerror+onclose double-fire schedules only once', () => {
    const { scope } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    sockets[0].onopen?.({ type: 'open' });
    sockets[0].onerror?.({ type: 'error', error: new Error('boom') });
    sockets[0].onclose?.({ type: 'close', code: 1006, reason: '' });
    vi.advanceTimersByTime(700);
    // 双触发只产生一次重连（第二个连接实例）
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(100000);
    expect(sockets).toHaveLength(2);
  });

  it('active disconnect does not schedule a reconnect', () => {
    const { scope } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    sockets[0].onopen?.({ type: 'open' });
    adapter.disconnect('conn-1');
    expect(sockets[0].close).toHaveBeenCalled();
    sockets[0].onclose?.({ type: 'close', code: 1000, reason: '' });
    vi.advanceTimersByTime(100000);
    expect(sockets).toHaveLength(1); // 无重连
  });

  it('reconnect with the same id disconnects the previous socket first', () => {
    const { scope } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    adapter.connect(cfg());
    expect(sockets).toHaveLength(2);
    expect(sockets[0].close).toHaveBeenCalled();
  });

  it('disconnectAll closes every connection and suppresses reconnects', () => {
    const { scope } = makeScope();
    const { env, sockets } = makeEnv();
    const adapter = new IndustrialAdapter({ env, scope });
    adapter.connect(cfg());
    adapter.connect(cfg({ id: 'conn-2' }));
    adapter.disconnectAll();
    expect(sockets[0].close).toHaveBeenCalled();
    expect(sockets[1].close).toHaveBeenCalled();
    for (const socket of sockets) socket.onclose?.({ type: 'close', code: 1000, reason: '' });
    vi.advanceTimersByTime(100000);
    expect(sockets).toHaveLength(2);
  });
});
