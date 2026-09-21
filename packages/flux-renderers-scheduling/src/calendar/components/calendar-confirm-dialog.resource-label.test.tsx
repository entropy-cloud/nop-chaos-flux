import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarConfirmDialog } from './calendar-confirm-dialog.js';

vi.mock('../../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

/**
 * V12f Phase 3 — [G4-R4-视角11-01] 拖拽确认对话框资源名契约：正文展示资源的
 * 显示名（resourceLabel，由宿主侧从 resources 解析），不得显示内部 ID
 * （res-\*）或空资源占位符（_default）。未提供 label 时回退原始 ID。
 */
describe('CalendarConfirmDialog — resource display label (G4-R4-视角11-01)', () => {
  const baseConfirmDialog = {
    event: { id: 'e1', title: '早班', start: '2026-07-21', end: '2026-07-21', type: 'shift' },
    targetDate: '2026-07-22',
    targetResource: 'res-123',
  };

  it('renders the resolved resource label instead of the raw resource id', () => {
    render(
      <CalendarConfirmDialog
        confirmDialog={baseConfirmDialog}
        resourceLabel="张三组"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/张三组/)).toBeTruthy();
    expect(screen.queryByText(/res-123/)).toBeNull();
  });

  it('falls back to the raw id when no label is provided (back-compat)', () => {
    render(
      <CalendarConfirmDialog
        confirmDialog={baseConfirmDialog}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/res-123/)).toBeTruthy();
  });
});
