import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function indexCells(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="table-index-cell"]')) as HTMLElement[];
}

/**
 * index 列（序号列）回归测试：
 * - type:'index' 列渲染跨页累计行号（viewIndex + offset + 1）
 * - 无分页时从 1 开始
 * - 分页时从 (currentPage-1)*pageSize + 1 开始
 */
describe('table index column', () => {
  it('renders sequential row numbers starting at 1 when pagination is disabled', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-index-column"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'index-table',
              source: [
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Cathy' },
              ],
              columns: [
                { type: 'index', name: 'index', label: '序号', width: 50 },
                { name: 'name', label: '姓名' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cells = indexCells();
    expect(cells.length).toBe(3);
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('2');
    expect(cells[2].textContent).toBe('3');
  });

  it('renders cumulative row numbers across pages with pagination', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-index-column-paged"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'index-table-paged',
              source: Array.from({ length: 25 }, (_, i) => ({ name: `User${i + 1}` })),
              pagination: { enabled: true, pageSize: 10, currentPage: 2 },
              paginationOwnership: 'controlled',
              columns: [
                { type: 'index', name: 'index', label: '序号', width: 50 },
                { name: 'name', label: '姓名' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const cells = indexCells();
    expect(cells.length).toBe(10);
    // 第 2 页：序号从 11 开始（offset = (2-1)*10 = 10）
    expect(cells[0].textContent).toBe('11');
    expect(cells[9].textContent).toBe('20');
  });
});
