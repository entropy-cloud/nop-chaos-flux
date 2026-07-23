import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanbanCollab } from './use-kanban-collab.js';

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }
  close() {
    this.readyState = MockWebSocket.CONNECTING;
    this.onclose?.({ code: 1000, reason: '', wasClean: true } as CloseEvent);
  }
  send(_data: string) {}
  addEventListener() {}
  removeEventListener() {}
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('useKanbanCollab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial status is disconnected', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    expect(result.current.status).toBe('disconnected');
  });

  it('connects when wsUrl and boardId are provided', async () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanCollab({ wsUrl: 'ws://localhost:8080', boardId: 'board-1', onStatusChange }),
    );

    expect(result.current.status).toBe('disconnected');

    await act(async () => {
      result.current.connect();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe('connected');
    expect(onStatusChange).toHaveBeenCalledWith('connected');
  });

  it('receives messages via WebSocket onmessage', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useKanbanCollab({ wsUrl: 'ws://localhost:8080', boardId: 'board-1', onMessage }),
    );

    await act(async () => {
      result.current.connect();
      await vi.advanceTimersByTimeAsync(0);
    });

    const ws = (globalThis as any).__lastMockWs;
    if (ws?.onmessage) {
      act(() => {
        ws.onmessage({ data: JSON.stringify({ type: 'cardMoved', actorId: 'user1', payload: {}, version: 1 }) });
      });
      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'cardMoved', actorId: 'user1' }));
    }
  });

  it('transitions to disconnected on WebSocket error', async () => {
    const { result } = renderHook(() =>
      useKanbanCollab({ wsUrl: 'ws://localhost:8080', boardId: 'board-1' }),
    );

    await act(async () => {
      result.current.connect();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe('connected');

    const ws = (globalThis as any).__lastMockWs;
    if (ws?.onerror) {
      act(() => {
        ws.onerror(new Event('error'));
      });
      expect(result.current.status).toBe('disconnected');
    }
  });

  it('reconnects after WebSocket close', async () => {
    const { result } = renderHook(() =>
      useKanbanCollab({ wsUrl: 'ws://localhost:8080', boardId: 'board-1' }),
    );

    await act(async () => {
      result.current.connect();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe('connected');

    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('sendMessage does nothing when WebSocket is not connected', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    expect(() => result.current.sendMessage({ type: 'cardMoved', actorId: 'u1', payload: {} })).not.toThrow();
  });
});
