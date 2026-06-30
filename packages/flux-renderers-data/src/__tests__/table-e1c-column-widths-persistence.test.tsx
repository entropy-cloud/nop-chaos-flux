import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { TableColumnSchema } from '../schemas.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';

const mockScopeState: { data: Record<string, unknown> } = { data: {} };
const renderScopeUpdate = vi.fn();

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: renderScopeUpdate }),
  useScopeSelector: (selector: (value: Record<string, unknown>) => unknown) =>
    selector(mockScopeState.data),
}));

afterEach(cleanup);

function resetState() {
  mockScopeState.data = {};
  renderScopeUpdate.mockReset();
}

function Probe(props: {
  columns: TableColumnSchema[];
  columnResize?: boolean;
  options?: any;
  onReady: (api: any) => void;
}) {
  const { onReady } = props;
  const api = useColumnResize(props.columns, props.columnResize, props.options);
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe('useColumnResize scope-level persistence', () => {
  beforeEach(resetState);

  it('local ownership: widths do not call scope.update', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(<Probe columns={columns} onReady={(value) => (api = value)} />);

    expect(api.widths.a).toBe(100);

    act(() => {
      api.startResize(columns[0]!, 0, 200);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250 }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    expect(renderScopeUpdate).not.toHaveBeenCalled();
  });

  it('scope ownership reads from columnWidthsStatePath', () => {
    mockScopeState.data = { tableState: { columnWidths: { a: 200 } } };
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'scope',
          columnWidthsStatePath: 'tableState.columnWidths',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    expect(api.widths.a).toBe(200);
  });

  it('scope ownership persists resize result to scope on pointer up', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'scope',
          columnWidthsStatePath: 'tableState.columnWidths',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    act(() => {
      api.startResize(columns[0]!, 0, 200);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 280 }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    // H1 regression guard: the persisted width must be the dragged-TO width (180),
    // not the pre-drag width (100). Previously the weak `expect.any(Number)`
    // assertion passed for either value and could not catch this silent data loss.
    expect(renderScopeUpdate).toHaveBeenCalledWith(
      'tableState.columnWidths',
      expect.objectContaining({ a: 180 }),
    );
  });

  it('H1 Proof: scope ownership persists the dragged-TO width over a real pointer chain', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'scope',
          columnWidthsStatePath: 'tableState.columnWidths',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    act(() => {
      api.startResize(columns[0]!, 0, 200);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 280 }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    // startWidth 100 + delta 80 = 180 (dragged-to), NOT 100 (pre-drag).
    expect(renderScopeUpdate).toHaveBeenCalledWith(
      'tableState.columnWidths',
      expect.objectContaining({ a: 180 }),
    );
  });

  it('H1 Proof: scope ownership shows live feedback while dragging', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'scope',
          columnWidthsStatePath: 'tableState.columnWidths',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    act(() => {
      api.startResize(columns[0]!, 0, 200);
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 260 }));
    });

    // Live feedback during the drag (delta 60 → 160), not frozen at 100.
    expect(api.widths.a).toBe(160);

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
  });

  it('H4 Proof: unmount mid-drag removes residual window pointer listeners', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'local',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    act(() => {
      api.startResize(columns[0]!, 0, 200);
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250 }));
    });

    // Unmount while a drag is still in progress (before pointerup).
    unmount();

    const count = (spy: ReturnType<typeof vi.spyOn>, type: string) =>
      spy.mock.calls.filter((call: unknown[]) => call[0] === type).length;

    // Every registered pointermove/pointerup/pointercancel listener must have
    // been removed by the React-owned teardown (no leaked global listeners).
    for (const type of ['pointermove', 'pointerup', 'pointercancel']) {
      expect(count(addSpy, type)).toBe(count(removeSpy, type));
    }

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('H5 Proof: controlled ownership without onWidthsChange warns (G10 parity)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    render(
      <Probe
        columns={columns}
        options={{ columnWidthsOwnership: 'controlled' }}
        onReady={() => {}}
      />,
    );

    const warned = warnSpy.mock.calls.some((call) =>
      String(call[0]).includes('controlled'),
    );
    expect(warned).toBe(true);
    warnSpy.mockRestore();
  });

  it('H5 Proof: controlled ownership with onWidthsChange does not warn and notifies', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWidthsChange = vi.fn();
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{ columnWidthsOwnership: 'controlled', onWidthsChange }}
        onReady={(value) => (api = value)}
      />,
    );

    const warned = warnSpy.mock.calls.some((call) =>
      String(call[0]).includes('controlled'),
    );
    expect(warned).toBe(false);

    act(() => {
      api.startResize(columns[0]!, 0, 200);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 270 }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    // startWidth 100 + delta 70 = 170 reported via the controlled channel.
    expect(onWidthsChange).toHaveBeenCalledWith(expect.objectContaining({ a: 170 }));
    expect(renderScopeUpdate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('controlled ownership returns initial widths as read-only', () => {
    // controlled without onWidthsChange is now a G10-style warned config; suppress
    // the diagnostic here since this test only checks the read-only display value.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
      let api: any;
      render(
        <Probe
          columns={columns}
          options={{ columnWidthsOwnership: 'controlled' }}
          onReady={(value) => (api = value)}
        />,
      );

      expect(api.widths.a).toBe(100);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('warns when scope ownership declared without statePath (Failure Path e1c-widths-scope-no-path)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    render(
      <Probe
        columns={columns}
        options={{ columnWidthsOwnership: 'scope' }}
        onReady={() => {}}
      />,
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('columnWidthsStatePath'));
    warnSpy.mockRestore();
  });

  it('local baseline remains when no ownership declared (backwards compat)', () => {
    const columns = [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[];
    let api: any;
    render(<Probe columns={columns} onReady={(value) => (api = value)} />);

    expect(api.widths.a).toBe(100);

    act(() => {
      api.startResize(columns[0]!, 0, 200);
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250 }));
    });

    expect(api.widths.a).toBe(150);
  });

  it('merge initial + scope widths with scope taking precedence', () => {
    mockScopeState.data = { tableState: { columnWidths: { b: 250 } } };
    const columns = [
      { type: 'column', name: 'a', width: 100 },
      { type: 'column', name: 'b', width: 200 },
    ] as TableColumnSchema[];
    let api: any;
    render(
      <Probe
        columns={columns}
        options={{
          columnWidthsOwnership: 'scope',
          columnWidthsStatePath: 'tableState.columnWidths',
        }}
        onReady={(value) => (api = value)}
      />,
    );

    expect(api.widths.a).toBe(100);
    expect(api.widths.b).toBe(250);
  });
});
