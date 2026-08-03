import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * C4.2 crud audit — dimension 1/3/10 phantom 声明簇契约测试（test-first）。
 *
 * 冻结以下契约到 live 行为：
 *  - P1-3a: totalField —— loadAction 响应中自定义总数字段名被消费（footer 统计回显）。
 *  - P1-3b: autoJumpToTopOnPagerChange —— 翻页后表格容器 scrollIntoView（非首屏）。
 *  - P1-3c: *Ownership 三态 —— CRUD 复合体为 scope-owned 组合语义：
 *           selectionOwnership: 'local' 下选择集仍发布到 selectionStatePath/$crud（文档契约）。
 *  - P2-1:  loadAction 模式下 loading 透传内部 table（加载 overlay 展示，四态-加载态）。
 */
describe('CRUD schema contract (c4-2)', () => {
  it('consumes totalField from the loadAction response for the total count', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    let resolveLoad: ((value: unknown) => void) | undefined;

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-total-field"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'total-crud',
              totalField: 'rowCount',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
              footerToolbar: [{ type: 'text', text: 'Total: ${$crud.total}' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'load') {
                return new Promise((resolve) => {
                  resolveLoad = resolve;
                });
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    // The probe's load invoke runs asynchronously; wait until it has been
    // invoked before resolving its pending promise.
    await waitFor(() => {
      expect(resolveLoad).toBeDefined();
    });
    resolveLoad?.({
      ok: true,
      data: { items: [{ id: '1', name: 'TotalItem' }], rowCount: 42 },
    });

    await waitFor(() => {
      expect(screen.getByText('Total: 42')).toBeTruthy();
    });
  });

  it('scrolls the table container to top on page change (autoJumpToTopOnPagerChange)', async () => {
    cleanup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const SchemaRenderer = createDataSchemaRenderer();
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `Row ${i + 1}`,
    }));

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-auto-jump-top"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'jump-crud',
              autoJumpToTopOnPagerChange: true,
              source: rows,
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Row 1')).toBeTruthy();
    });
    // Initial mount must NOT scroll.
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });
  });

  it('publishes selection to scope even with selectionOwnership: "local" (scope-owned composition)', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-ownership-local"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'own-crud',
              selectionOwnership: 'local',
              selectionStatePath: 'crudSel',
              selection: { type: 'checkbox' },
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              columns: [{ name: 'name', label: 'Name' }],
              footerToolbar: [
                { type: 'text', text: 'Sel: ${$crud.selectionCount}' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sel: 0')).toBeTruthy();
    });

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[1] as Element);

    await waitFor(() => {
      expect(screen.getByText('Sel: 1')).toBeTruthy();
    });
  });

  it('shows the table loading overlay while a loadAction fetch is in flight', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    let resolveLoad: ((value: unknown) => void) | undefined;

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-loading-overlay"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'loading-crud',
              loadAction: { action: 'probe:load' },
              columns: [{ name: 'name', label: 'Name' }],
              rowKey: 'id',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          if (!actionScope) return;
          (actionScope as {
            registerNamespace(ns: string, config: unknown): void;
          }).registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'load') {
                return new Promise((resolve) => {
                  resolveLoad = resolve;
                });
              }
              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    // While the first fetch is pending, the loading overlay must be visible.
    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeTruthy();
    });

    await waitFor(() => {
      expect(resolveLoad).toBeDefined();
    });
    resolveLoad?.({
      ok: true,
      data: { items: [{ id: '1', name: 'LoadedRow' }], total: 1 },
    });

    await waitFor(() => {
      expect(screen.getByText('LoadedRow')).toBeTruthy();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeNull();
    });
  });
});
