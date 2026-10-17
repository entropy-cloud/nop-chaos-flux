import { describe, expect, it, vi } from 'vitest';
import type { TableColumnSchema } from '../schemas.js';
import { createColumnResizeHandleProps } from '../table-renderer/use-column-resize.js';

// FM-0 plan 642 Proof-unit-1: the resize handle must be a real hit target —
// 7px wide, overhanging the column edge (3px inside / 4px outside, AMIS
// colDragLine parity), stacked above sticky cells (z-index), with an active
// drag state (`data-resizing`). The old handle was `w-1 right-0` with no
// z-index and no drag feedback — every assertion below fails on it.

const column = { type: 'column', name: 'a', label: 'A', width: 100 } as TableColumnSchema;

function makeProps(extra: Record<string, unknown> = {}) {
  return createColumnResizeHandleProps({
    column,
    index: 0,
    resizable: true,
    resizeApi: {
      widths: { a: 100 },
      getColumnWidth: vi.fn(),
      startResize: vi.fn(),
      stepResize: vi.fn(),
    },
    ...extra,
  } as Parameters<typeof createColumnResizeHandleProps>[0]);
}

describe('column resize handle geometry contract (FM-0 plan 642)', () => {
  it('hit area is 7px wide and overhangs the column edge (right: -4px)', () => {
    const props = makeProps();
    expect(props.className).toContain('w-[7px]');
    expect(props.className).toContain('-right-1');
    expect(props.className).not.toMatch(/(^|\s)w-1(\s|$)/);
  });

  it('stacks above sticky fixed cells (z-index 15)', () => {
    const props = makeProps();
    expect(props.className).toContain('z-[15]');
  });

  it('exposes the active-drag state through data-resizing', () => {
    expect((makeProps({ resizing: true }) as unknown as Record<string, unknown>)['data-resizing']).toBe(true);
    expect((makeProps() as unknown as Record<string, unknown>)['data-resizing']).toBeUndefined();
  });
});
