import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { TableColumnSchema } from '../schemas.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// FM-0 plan 642 Proof-unit-2: deterministic resize layout contract.
// (1) During an active drag session the resize api exposes `resizingKey` and a
//     `sessionPinnedWidths` snapshot (fixed-key space `name:index`, measured
//     widths with a declared/committed fallback — jsdom has no layout so the
//     fallback branch is what runs here).
// (2) The renderer wires `data-col-resizing` on the table for the session and
//     pins every colgroup col; after the first committed resize the table keeps
//     `data-layout-fixed` permanently (AMIS is-layout-fixed parity), while a
//     table whose user never resized stays auto (guard assertion).
// The old implementation has none of these — every behavioural assertion below
// fails on it.

vi.mock('@nop-chaos/flux-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: () => undefined,
  useOwnershipScopeValue: () => undefined,
}));

afterEach(cleanup);

function Probe(props: { columns: TableColumnSchema[]; onReady: (api: ReturnType<typeof useColumnResize>) => void }) {
  const api = useColumnResize(props.columns, true);
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

describe('resize session contract (FM-0 plan 642)', () => {
  it('exposes resizingKey and a declared-width session snapshot, then commits', () => {
    const columns = [
      { type: 'column', name: 'a', label: 'A', width: 100 },
      { type: 'column', name: 'b', label: 'B', width: 80 },
    ] as TableColumnSchema[];
    let api: ReturnType<typeof useColumnResize> | undefined;
    render(<Probe columns={columns} onReady={(value) => (api = value)} />);
    expect(api).toBeTruthy();

    expect((api as any).hasCommittedResize).toBe(false);

    act(() => {
      (api as any).startResize(columns[0], 0, 200);
    });
    expect((api as any).resizingKey).toBe('a');
    expect((api as any).sessionPinnedWidths).toEqual({ 'a:0': 100, 'b:1': 80 });

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250 }));
    });
    expect((api as any).resizingKey).toBe('a');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
    expect((api as any).resizingKey).toBeNull();
    expect((api as any).sessionPinnedWidths).toBeNull();
    expect((api as any).hasCommittedResize).toBe(true);
  });

  it('wires data-col-resizing / data-layout-fixed and pins the colgroup on the rendered table', () => {
    const SchemaRenderer = createDataSchemaRenderer([]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data/fm0-resize-session"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'fm0-resize-session',
              rowSelection: { type: 'checkbox' },
              columns: [
                { name: 'a', label: 'A', width: 100, fixed: 'left' },
                { name: 'b', label: 'B', width: 120 },
              ],
              source: [
                { a: 'a1', b: 'b1' },
                { a: 'a2', b: 'b2' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const table = container.querySelector('table[data-slot="table"]') as HTMLElement;
    expect(table).toBeTruthy();
    expect(table.getAttribute('data-col-resizing')).toBeNull();
    expect(table.getAttribute('data-layout-fixed')).toBeNull();

    const handle = container.querySelector('[data-slot="table-column-resize-handle"]') as HTMLElement;
    expect(handle).toBeTruthy();

    act(() => {
      fireEvent.pointerDown(handle);
    });
    expect(table.getAttribute('data-col-resizing')).not.toBeNull();
    const colWidths = Array.from(table.querySelectorAll('colgroup col')).map(
      (col) => (col as HTMLElement).style.width,
    );
    expect(colWidths.length).toBeGreaterThanOrEqual(3);
    for (const width of colWidths) {
      expect(width, `empty col width among: ${JSON.stringify(colWidths)}`).not.toBe('');
    }

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
    expect(table.getAttribute('data-col-resizing')).toBeNull();
    expect(table.getAttribute('data-layout-fixed')).not.toBeNull();
  });
});
