import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// [G3-R4-视角5-01] (R2 consistency audit, P0): `autoFillHeight` ×
// `virtualThreshold` shared one ref callback with an if/else route, so the
// virtual scroll container stayed null and the body rendered zero silent rows
// (virtual-scroll-interaction). Both consumers must bind the same element.

function makeRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: String(index + 1), name: `Row ${index + 1}` }));
}

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-virtual-autofill-scrollref"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'virtual-autofill-table',
              source: makeRows(60),
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
              virtualThreshold: 10,
              autoFillHeight: true,
              ...schemaProps,
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('[G3-R4-视角5-01] autoFillHeight × virtualization keeps the scroll ref alive', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('renders virtualized rows when autoFillHeight and virtualThreshold combine', () => {
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetHeight',
    );
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return 600;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 800;
      },
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const { container } = renderTable({});

    const dataRows = container.querySelectorAll('tbody tr:not([aria-hidden])');
    expect(dataRows.length).toBeGreaterThan(5);
    expect(screen.queryByText('Row 1')).toBeTruthy();

    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  });

  it('keeps the auto-fill marker and overflow contract on the shared container', () => {
    const { container } = renderTable({});
    const tableContainer = container.querySelector('[data-slot="table-container"]');
    expect(tableContainer).toBeTruthy();
    expect(tableContainer?.getAttribute('data-auto-fill-height')).toBe('true');
    expect(tableContainer?.className).toContain('overflow-auto');
  });
});
