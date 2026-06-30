import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useRowDragSort } from '../table-renderer/use-row-drag-sort.js';
import type { TableRowEntry } from '../table-renderer/types.js';

const scopeUpdate = vi.fn();
vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: scopeUpdate }),
}));

afterEach(() => {
  cleanup();
  scopeUpdate.mockClear();
});

function makeRowEntry(record: Record<string, unknown>, sourceIndex: number, rowKey?: string): TableRowEntry {
  return {
    rowKey: rowKey ?? String(record.id ?? sourceIndex),
    cacheKey: rowKey ?? String(record.id ?? sourceIndex),
    sourceIndex,
    record,
  };
}

function Probe(props: {
  options: Parameters<typeof useRowDragSort>[0];
  onReady: (api: ReturnType<typeof useRowDragSort>) => void;
}) {
  const api = useRowDragSort(props.options);
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

function fireDrop(api: any, fromKey: string, fromIndex: number, toKey: string, toIndex: number) {
  const sourceHandle = api.dragHandleProps(fromKey, fromIndex);
  const targetHandle = api.dragHandleProps(toKey, toIndex);
  act(() => {
    sourceHandle.onDragStart({ dataTransfer: { effectAllowed: 'move', setData: () => {} } } as any);
  });
  act(() => {
    targetHandle.onDragOver({ preventDefault: () => {}, dataTransfer: { dropEffect: 'move' } } as any);
  });
  act(() => {
    targetHandle.onDrop({ preventDefault: () => {} } as any);
  });
}

describe('useRowDragSort — local ownership persists reorder across re-renders (P0-1)', () => {
  it('local ownership (no statePath): reordered order survives a re-render', () => {
    const rows = [
      makeRowEntry({ id: 'a' }, 0, 'a'),
      makeRowEntry({ id: 'b' }, 1, 'b'),
      makeRowEntry({ id: 'c' }, 2, 'c'),
    ];
    let api: any;

    const { rerender } = render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows }} onReady={(value) => (api = value)} />);

    expect(api.orderedKeys).toEqual(['a', 'b', 'c']);

    // Drag row 'a' (index 0) to position 2 → [b, c, a].
    fireDrop(api, 'a', 0, 'c', 2);

    expect(api.orderedKeys).toEqual(['b', 'c', 'a']);
    expect(api.orderedRows.map((r: TableRowEntry) => r.rowKey)).toEqual(['b', 'c', 'a']);

    // Re-render with the same rows: the local reorder MUST be retained.
    rerender(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows }} onReady={(value) => (api = value)} />);

    expect(api.orderedKeys).toEqual(['b', 'c', 'a']);
  });

  it('local ownership never writes to scope without a statePath', () => {
    const rows = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    let api: any;

    render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows }} onReady={(value) => (api = value)} />);

    fireDrop(api, 'a', 0, 'b', 1);

    expect(scopeUpdate).not.toHaveBeenCalled();
    expect(api.orderedKeys).toEqual(['b', 'a']);
  });

  it('local ownership with statePath writes the order payload to scope and persists locally', () => {
    const rows = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    let api: any;

    render(
      <Probe
        options={{ enabled: true, orderField: 'order', ownership: 'local', statePath: 'tbl', rows }}
        onReady={(value) => (api = value)}
      />,
    );

    fireDrop(api, 'a', 0, 'b', 1);

    expect(scopeUpdate).toHaveBeenCalledWith('tbl.order', { b: 0, a: 1 });
    expect(api.orderedKeys).toEqual(['b', 'a']);
  });

  it('controlled ownership: does not persist locally and only notifies the parent via onReorder', () => {
    const onReorder = vi.fn();
    const rows = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    let api: any;

    const { rerender } = render(
      <Probe
        options={{ enabled: true, orderField: 'order', ownership: 'controlled', rows, onReorder }}
        onReady={(value) => (api = value)}
      />,
    );

    fireDrop(api, 'a', 0, 'b', 1);

    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
    expect(scopeUpdate).not.toHaveBeenCalled();
    // Controlled ownership keeps the natural order until the parent re-feeds rows.
    expect(api.orderedKeys).toEqual(['a', 'b']);

    // When the parent supplies the reordered rows, the hook reflects them.
    const reorderedRows = [makeRowEntry({ id: 'b' }, 0, 'b'), makeRowEntry({ id: 'a' }, 1, 'a')];
    rerender(
      <Probe
        options={{ enabled: true, orderField: 'order', ownership: 'controlled', rows: reorderedRows, onReorder }}
        onReady={(value) => (api = value)}
      />,
    );
    expect(api.orderedKeys).toEqual(['b', 'a']);
  });

  it('local ownership reconciles the order when rows are added or removed', () => {
    const rows = [
      makeRowEntry({ id: 'a' }, 0, 'a'),
      makeRowEntry({ id: 'b' }, 1, 'b'),
      makeRowEntry({ id: 'c' }, 2, 'c'),
    ];
    let api: any;

    const { rerender } = render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows }} onReady={(value) => (api = value)} />);

    fireDrop(api, 'a', 0, 'c', 2);
    expect(api.orderedKeys).toEqual(['b', 'c', 'a']);

    // Row 'c' is removed upstream; the dead key must be dropped, the rest kept in order.
    const afterRemoval = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    rerender(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows: afterRemoval }} onReady={(value) => (api = value)} />);
    expect(api.orderedKeys).toEqual(['b', 'a']);

    // A brand-new row is appended at the tail.
    const withNew = [
      makeRowEntry({ id: 'a' }, 0, 'a'),
      makeRowEntry({ id: 'b' }, 1, 'b'),
      makeRowEntry({ id: 'd' }, 2, 'd'),
    ];
    rerender(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows: withNew }} onReady={(value) => (api = value)} />);
    expect(api.orderedKeys).toEqual(['b', 'a', 'd']);
  });
});

// G10: controlled drag-sort without an onReorder handler used to be a fully
// silent no-op — the row snapped back to its original position and nothing
// (no warning, no callback) told the developer why. The order itself stays
// parent-owned (true controlled semantics), but the misconfiguration must now
// be observable via a dev warning so it is diagnosable.
describe('useRowDragSort — controlled ownership without onReorder is observable (G10)', () => {
  it('warns when enabled + controlled ownership has no onReorder handler', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    let api: any;

    try {
      render(
        <Probe
          options={{ enabled: true, orderField: 'order', ownership: 'controlled', rows }}
          onReady={(value) => (api = value)}
        />,
      );

      expect(api.orderedKeys).toEqual(['a', 'b']);
      const warned = warnSpy.mock.calls.some((call) =>
        String(call[0]).includes('controlled'),
      );
      expect(warned).toBe(true);

      // Performing a drop is no longer SILENT: the warning has already made the
      // no-op diagnosable, and the order remains parent-owned (no local persist).
      fireDrop(api, 'a', 0, 'b', 1);
      expect(api.orderedKeys).toEqual(['a', 'b']);
      expect(scopeUpdate).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('does NOT warn when controlled ownership supplies onReorder (legitimate config)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onReorder = vi.fn();
    const rows = [makeRowEntry({ id: 'a' }, 0, 'a'), makeRowEntry({ id: 'b' }, 1, 'b')];
    let api: any;

    try {
      render(
        <Probe
          options={{ enabled: true, orderField: 'order', ownership: 'controlled', rows, onReorder }}
          onReady={(value) => (api = value)}
        />,
      );

      fireDrop(api, 'a', 0, 'b', 1);
      expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
      const warned = warnSpy.mock.calls.some((call) =>
        String(call[0]).includes('controlled'),
      );
      expect(warned).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
