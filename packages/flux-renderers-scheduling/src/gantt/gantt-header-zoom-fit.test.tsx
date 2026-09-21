import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GanttHeader } from './gantt-header.js';

/**
 * V12f Phase 3 — [G4-R3-视角11-01] gantt 工具栏「适应」按钮契约：
 * 点击必须路由给真实的适配计算（父层 onZoomToFit → store.zoomToFit），
 * 不得再退化为「跳到中间缩放档位」。22-01 单驱动约定：header 不直接
 * setZoom，避免双派发。
 */
describe('GanttHeader — Fit button routes to real zoomToFit (G4-R3-视角11-01)', () => {
  const zooms = [
    { key: 'day', label: 'Day', minCellWidth: 40, scales: [] },
    { key: 'week', label: 'Week', minCellWidth: 8, scales: [] },
    { key: 'month', label: 'Month', minCellWidth: 2, scales: [] },
  ];

  function makeStore() {
    return {
      getAvailableZooms: () => zooms,
      currentZoom: 'week',
      setZoom: vi.fn(),
    } as unknown as import('./gantt.types.js').GanttStoreApi;
  }

  function findFitButton(container: HTMLElement): HTMLButtonElement {
    const fitButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '适应',
    );
    expect(fitButton).toBeTruthy();
    return fitButton as HTMLButtonElement;
  }

  it('clicking Fit routes to onZoomToFit and does NOT jump to the middle zoom slot', () => {
    const store = makeStore();
    const onZoomToFit = vi.fn();
    const { container } = render(<GanttHeader store={store} onZoomToFit={onZoomToFit} />);

    fireEvent.click(findFitButton(container));

    expect(onZoomToFit).toHaveBeenCalledTimes(1);
    expect(store.setZoom).not.toHaveBeenCalled();
  });

  it('without an onZoomToFit handler Fit performs no fake middle-slot jump', () => {
    const store = makeStore();
    const { container } = render(<GanttHeader store={store} />);

    fireEvent.click(findFitButton(container));

    expect(store.setZoom).not.toHaveBeenCalled();
  });
});
