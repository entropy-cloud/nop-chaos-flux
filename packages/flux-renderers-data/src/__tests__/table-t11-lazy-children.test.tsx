import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { dataRendererDefinitions } from '../index.js';

afterEach(() => {
  cleanup();
});

const testEnv = {
  fetcher: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: [],
  })),
  notify: vi.fn(),
} as any;

function renderTable(schema: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://table/lazy-children"
      schema={
        {
          type: 'table',
          ...schema,
        } as any
      }
      env={testEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('T11 tree-table lazy children', () => {
  it('renders tree table without childrenSource as before', () => {
    renderTable({
      rowChildrenField: 'items',
      source: [
        { id: '1', name: 'Parent', items: [{ id: '1-1', name: 'Child' }] },
      ],
      columns: [
        { name: 'name', label: 'Name' },
      ],
    });

    const toggles = document.querySelectorAll('[data-slot="table-tree-toggle"]');
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('renders tree table with childrenSource without crashing', () => {
    renderTable({
      rowChildrenField: 'items',
      childrenSource: { action: 'ajax', args: { url: '/api/children' } },
      source: [
        { id: '1', name: 'Parent' },
      ],
      columns: [
        { name: 'name', label: 'Name' },
      ],
    });

    const toggles = document.querySelectorAll('[data-slot="table-tree-toggle"]');
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('triggers lazy load when expanding a node with childrenSource', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: [{ id: '1-1', name: 'Lazy Child', __rowKey: '1-1' }],
    }));

    const env = { ...testEnv, fetcher };
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://table/lazy-children-trigger"
        schema={
          {
            type: 'table',
            rowChildrenField: 'items',
            childrenSource: { action: 'ajax', args: { url: '/api/children' } },
            source: [{ id: '1', name: 'Parent' }],
            columns: [{ name: 'name', label: 'Name' }],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const toggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(toggle).not.toBeNull();

    fireEvent.click(toggle!);

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });
  });

  it('shows spinner while lazy loading', async () => {
    let resolveFetch: (value: unknown) => void;
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => {
        resolveFetch = resolve;
      });
      return { ok: true, status: 200, data: [] };
    });

    const env = { ...testEnv, fetcher };
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://table/lazy-children-spinner"
        schema={
          {
            type: 'table',
            rowChildrenField: 'items',
            childrenSource: { action: 'ajax', args: { url: '/api/children' } },
            source: [{ id: '1', name: 'Parent' }],
            columns: [{ name: 'name', label: 'Name' }],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const toggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(toggle).not.toBeNull();

    fireEvent.click(toggle!);

    await vi.waitFor(() => {
      const spinning = toggle!.querySelector('.animate-spin');
      expect(spinning).not.toBeNull();
    });

    resolveFetch!({ ok: true, status: 200, data: [] });
  });

  it('backward compatible: tree without childrenSource uses preloaded data', async () => {
    renderTable({
      rowChildrenField: 'items',
      source: [
        {
          id: '1',
          name: 'Parent',
          items: [
            { id: '1-1', name: 'Child 1', __rowKey: '1-1' },
            { id: '1-2', name: 'Child 2', __rowKey: '1-2' },
          ],
        },
      ],
      columns: [{ name: 'name', label: 'Name' }],
    });

    const toggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(toggle).not.toBeNull();

    fireEvent.click(toggle!);

    await vi.waitFor(() => {
      const rows = document.querySelectorAll('[data-slot="table-row"]');
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  it('P1-3: failed lazy load renders error state and retry reloads children', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: [{ id: '1-1', name: 'Retried Child', __rowKey: '1-1' }],
      });

    const env = { ...testEnv, fetcher };
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://table/lazy-children-retry"
        schema={
          {
            type: 'table',
            rowChildrenField: 'items',
            childrenSource: { action: 'ajax', args: { url: '/api/children' } },
            source: [{ id: '1', name: 'Parent' }],
            columns: [{ name: 'name', label: 'Name' }],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const toggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(toggle).not.toBeNull();

    // First expand → failure. The toggle's aria-label flips to "Retry" and the
    // error icon (text-destructive) is shown.
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(toggle!.getAttribute('aria-label')).toBe('重试');
    });

    // P1-3: clicking the error-state toggle RETRIES the load instead of just
    // collapsing (refreshNode clears the cached error; loadChildren refetches).
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    await vi.waitFor(() => {
      const childRow = Array.from(document.querySelectorAll('[data-slot="table-row"]')).find(
        (row) => row.textContent?.includes('Retried Child'),
      );
      expect(childRow).toBeTruthy();
    });
  });

  it('P1-3: after a successful retry, collapse + re-expand reuses the cache (no refetch)', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, error: 'boom' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: [{ id: '1-1', name: 'Retried Child', __rowKey: '1-1' }],
      });

    const env = { ...testEnv, fetcher };
    const SchemaRenderer = createSchemaRenderer(dataRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://table/lazy-children-cache-reuse"
        schema={
          {
            type: 'table',
            rowChildrenField: 'items',
            childrenSource: { action: 'ajax', args: { url: '/api/children' } },
            source: [{ id: '1', name: 'Parent' }],
            columns: [{ name: 'name', label: 'Name' }],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const toggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(toggle).not.toBeNull();

    // Expand → fail → error toggle retries → success (fetch #2).
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      expect(toggle!.getAttribute('aria-label')).toBe('重试');
    });
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
      const childRow = Array.from(document.querySelectorAll('[data-slot="table-row"]')).find(
        (row) => row.textContent?.includes('Retried Child'),
      );
      expect(childRow).toBeTruthy();
    });

    // Collapse → re-expand: cached children reused, no third fetch (T11 cache reuse).
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      expect(toggle!.getAttribute('aria-label')).toBe('展开');
    });
    fireEvent.click(toggle!);
    await vi.waitFor(() => {
      const childRow = Array.from(document.querySelectorAll('[data-slot="table-row"]')).find(
        (row) => row.textContent?.includes('Retried Child'),
      );
      expect(childRow).toBeTruthy();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
