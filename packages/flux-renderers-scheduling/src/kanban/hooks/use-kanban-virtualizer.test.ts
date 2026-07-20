import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useKanbanVirtualizer } from './use-kanban-virtualizer.js';

describe('useKanbanVirtualizer', () => {
  it('returns virtualizer instance', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useKanbanVirtualizer({ cardCount: 10, overscan: 5, estimatedCardHeight: 80, gap: 8, scrollContainerRef: ref }),
    );
    expect(result.current.virtualizer).toBeDefined();
    expect(typeof result.current.scrollToIndex).toBe('function');
  });

  it('totalSize is 0 when cardCount is 0', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useKanbanVirtualizer({ cardCount: 0, overscan: 5, estimatedCardHeight: 80, gap: 8, scrollContainerRef: ref }),
    );
    expect(result.current.totalSize).toBe(0);
  });

  it('totalSize accounts for gap', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useKanbanVirtualizer({ cardCount: 5, overscan: 5, estimatedCardHeight: 100, gap: 16, scrollContainerRef: ref }),
    );
    expect(result.current.totalSize).toBe(5 * (100 + 16));
  });
});
