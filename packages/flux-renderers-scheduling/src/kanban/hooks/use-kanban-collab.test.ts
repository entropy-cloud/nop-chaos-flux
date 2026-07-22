import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKanbanCollab } from './use-kanban-collab.js';

class MockWebSocket {
  static OPEN = 1;
  readyState: number = 1;
  onopen: (() => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  url: string;
  constructor(url: string) { this.url = url; }
  close() { this.onclose?.({ code: 1000, reason: '', wasClean: true } as CloseEvent); }
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
});
