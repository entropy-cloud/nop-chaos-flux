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

    expect(renderScopeUpdate).toHaveBeenCalledWith(
      'tableState.columnWidths',
      expect.objectContaining({ a: expect.any(Number) }),
    );
  });

  it('controlled ownership returns initial widths as read-only', () => {
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
