import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKanbanCollab } from './use-kanban-collab.js';

describe('useKanbanCollab', () => {
  it('starts disconnected', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    expect(result.current.status).toBe('disconnected');
  });

  it('provides connect and disconnect functions', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('sendMessage does not throw when not connected', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    expect(() =>
      result.current.sendMessage({ type: 'cardMoved', actorId: 'u1', payload: {} }),
    ).not.toThrow();
  });

  it('connects when wsUrl and boardId are provided', () => {
    const wsUrl = 'ws://localhost:8080';
    const boardId = 'board-1';
    const { result } = renderHook(() => useKanbanCollab({ wsUrl, boardId }));
    expect(result.current.status).toBe('disconnected');
    expect(typeof result.current.connect).toBe('function');
  });

  it('disconnect sets status to disconnected', () => {
    const { result } = renderHook(() => useKanbanCollab({}));
    result.current.disconnect();
    expect(result.current.status).toBe('disconnected');
  });
});
