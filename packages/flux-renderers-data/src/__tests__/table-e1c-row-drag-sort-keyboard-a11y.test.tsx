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

function makeRowEntry(id: string, index: number): TableRowEntry {
  return { rowKey: id, cacheKey: id, sourceIndex: index, record: { id } };
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

describe('useRowDragSort — keyboard a11y (H6)', () => {
  it('ArrowDown moves the focused row down one position along the same commit path', () => {
    const onReorder = vi.fn();
    const rows = [makeRowEntry('a', 0), makeRowEntry('b', 1), makeRowEntry('c', 2)];
    let api: any;
    render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows, onReorder }} onReady={(v) => (api = v)} />);

    const handle = api.dragHandleProps('a', 0);
    act(() => {
      handle.onKeyDown({ key: 'ArrowDown', preventDefault: () => {} } as any);
    });

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(api.orderedKeys).toEqual(['b', 'a', 'c']);
  });

  it('ArrowUp moves the focused row up one position', () => {
    const onReorder = vi.fn();
    const rows = [makeRowEntry('a', 0), makeRowEntry('b', 1), makeRowEntry('c', 2)];
    let api: any;
    render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows, onReorder }} onReady={(v) => (api = v)} />);

    const handle = api.dragHandleProps('c', 2);
    act(() => {
      handle.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} } as any);
    });

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
    expect(api.orderedKeys).toEqual(['a', 'c', 'b']);
  });

  it('ignores other keys and does not move past the boundaries', () => {
    const onReorder = vi.fn();
    const rows = [makeRowEntry('a', 0), makeRowEntry('b', 1)];
    let api: any;
    render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows, onReorder }} onReady={(v) => (api = v)} />);

    const handle = api.dragHandleProps('a', 0);
    act(() => {
      handle.onKeyDown({ key: 'Enter', preventDefault: () => {} } as any);
    });
    expect(onReorder).not.toHaveBeenCalled();

    // ArrowUp on the first row is a no-op (boundary).
    act(() => {
      handle.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} } as any);
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('keyboard reorder writes the order payload to scope under scope ownership', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rows = [makeRowEntry('a', 0), makeRowEntry('b', 1)];
      let api: any;
      render(
        <Probe
          options={{ enabled: true, orderField: 'order', ownership: 'scope', statePath: 'tbl', rows }}
          onReady={(v) => (api = v)}
        />,
      );

      const handle = api.dragHandleProps('a', 0);
      act(() => {
        handle.onKeyDown({ key: 'ArrowDown', preventDefault: () => {} } as any);
      });

      expect(scopeUpdate).toHaveBeenCalledWith('tbl.order', { b: 0, a: 1 });
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('useRowDragSort — scope ownership diagnostics (H12)', () => {
  it('warns when scope ownership is declared without a statePath', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rows = [makeRowEntry('a', 0)];
      render(
        <Probe
          options={{ enabled: true, orderField: 'order', ownership: 'scope', rows }}
          onReady={() => {}}
        />,
      );
      const warned = warnSpy.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes('orderStatePath'),
      );
      expect(warned).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('useRowDragSort — handle click does not bubble (H19)', () => {
  it('dragHandleProps exposes onClick that stops propagation', () => {
    const rows = [makeRowEntry('a', 0)];
    let api: any;
    render(<Probe options={{ enabled: true, orderField: 'order', ownership: 'local', rows }} onReady={(v) => (api = v)} />);

    const handle = api.dragHandleProps('a', 0);
    expect(typeof handle.onClick).toBe('function');

    // stopPropagation must be invoked so the click never reaches onRowClick.
    const stop = vi.fn();
    handle.onClick({ stopPropagation: stop } as any);
    expect(stop).toHaveBeenCalled();
  });
});
