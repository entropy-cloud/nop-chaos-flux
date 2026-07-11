import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-auto-fill"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'auto-fill-table',
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
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

describe('Table autoFillHeight', () => {
  it('applies overflow-auto + data marker when autoFillHeight: true', () => {
    const { container } = renderTable({ autoFillHeight: true });
    const tableContainer = container.querySelector('[data-slot="table-container"]');
    expect(tableContainer).toBeTruthy();
    expect(tableContainer?.getAttribute('data-auto-fill-height')).toBe('true');
    expect(tableContainer?.className).toContain('overflow-auto');
  });

  it('uses fixed height for { height: N }', () => {
    const { container } = renderTable({ autoFillHeight: { height: 500 } });
    const tableContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
    expect(tableContainer).toBeTruthy();
    expect(tableContainer?.style.height).toBe('500px');
    expect(tableContainer?.style.overflow).toBe('auto');
  });

  it('uses maxHeight for { maxHeight: N }', () => {
    const { container } = renderTable({ autoFillHeight: { maxHeight: 400 } });
    const tableContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
    expect(tableContainer).toBeTruthy();
    expect(tableContainer?.style.maxHeight).toBe('400px');
  });

  it('does not activate auto-fill when autoFillHeight is absent', () => {
    const { container } = renderTable({});
    const tableContainer = container.querySelector('[data-slot="table-container"]');
    expect(tableContainer?.getAttribute('data-auto-fill-height')).toBeNull();
  });

  it('retries measurement when parent clientHeight is 0 (visibility retry)', async () => {
    // Spy on requestAnimationFrame to make the retry observable without real rAF timing.
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      // Fire immediately to simulate a synchronous layout resolution.
      cb(0);
      return 0;
    });

    // Stub offsetTop/clientHeight on the parent + container so the measurement
    // produces a deterministic value.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        // The table's parent gets a height; everything else 0.
        return this.getAttribute('data-slot') === 'table-container' ? 0 : 800;
      },
    });

    try {
      const { container } = renderTable({ autoFillHeight: true });
      const tableContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
      expect(tableContainer?.getAttribute('data-auto-fill-height')).toBe('true');
      // rAF retry was invoked (parent initially invisible path attempted).
      expect(rafSpy).toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientHeight', original);
      rafSpy.mockRestore();
    }
  });

  it('coexists with affixHeader (header stays sticky, not disabled)', () => {
    const { container } = renderTable({ autoFillHeight: true, affixHeader: true });
    const tableContainer = container.querySelector('[data-slot="table-container"]');
    expect(tableContainer?.getAttribute('data-auto-fill-height')).toBe('true');
    // The sticky header class should still be present (affixHeader not disabled).
    const stickyHeader = container.querySelector('.nop-table-header-sticky');
    expect(stickyHeader).toBeTruthy();
  });
});
