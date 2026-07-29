import { cleanup, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * 验证 flux CRUD 表格的列渲染顺序，包括：
 * 1. 表头文本（data-slot="table-head"）的内容和顺序
 * 2. 是否有 checkbox 选择列
 * 3. 数据列 vs 操作列的定位
 */
describe('CRUD table column order', () => {
  it('renders columns in schema order with correct headers', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://column-order"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'col-crud',
            loadAction: { action: 'probe:load', dependsOn: ['__test__'] },
            columns: [
              { name: 'userName', label: '用户名' },
              { name: 'nickName', label: '昵称' },
              { name: 'status', label: '状态' },
              { type: 'operation', label: '操作', buttons: [{ type: 'button', label: '查看' }] },
            ],
            source: [{ id: 1, userName: 'alice', nickName: 'Alice', status: 1 }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // 等待表格渲染
    await waitFor(() => {
      expect(document.querySelector('[data-slot="table"]')).toBeTruthy();
    });

    // 读取表头
    const headers = document.querySelectorAll('[data-slot="table-head"]');
    const headerTexts = Array.from(headers).map(h => h.textContent?.trim() || '');
    console.log('Table headers:', headerTexts);

    // 验证列顺序：不应有额外的 checkbox 列在开头
    expect(headerTexts[0]).toBe('用户名');
    expect(headerTexts[1]).toBe('昵称');
    expect(headerTexts[2]).toBe('状态');
    expect(headerTexts[3]).toBe('操作');
  });

  it('renders selection checkbox column when selection is enabled', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://column-order-selection"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'sel-crud',
            selection: { type: 'checkbox' },
            columns: [
              { name: 'userName', label: '用户名' },
              { name: 'nickName', label: '昵称' },
              { type: 'operation', label: '操作', buttons: [{ type: 'button', label: '查看' }] },
            ],
            source: [{ id: 1, userName: 'alice', nickName: 'Alice' }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="table"]')).toBeTruthy();
    });

    // 用 innerHTML 查看完整列头结构
    const headerRow = document.querySelector('thead tr, [data-slot="table-header"] tr');
    const allHeaderCells = headerRow ? Array.from(headerRow.children) : [];
    console.log('=== Header cells (innerHTML) ===');
    allHeaderCells.forEach((h, i) => {
      const slot = h.getAttribute('data-slot') || '(no slot)';
      const inner = (h as HTMLElement).innerHTML.slice(0, 200);
      const text = h.textContent?.trim() || '(empty)';
      console.log(`  [${i}] slot="${slot}" text="${text}" html=${inner}`);
    });
  });

  it('matches cell values to correct columns when selection is enabled', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://column-order-cell"
        schema={{
          type: 'page',
          body: [{
            type: 'crud',
            id: 'cell-crud',
            selection: { type: 'checkbox' },
            columns: [
              { name: 'userName', label: '用户名' },
              { name: 'nickName', label: '昵称' },
              { type: 'operation', label: '操作', buttons: [{ type: 'button', label: '查看' }] },
            ],
            source: [{ id: 1, userName: 'alice', nickName: 'Alice' }],
            rowKey: 'id',
          }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-body"]')).toBeTruthy();
    });

    // 用 innerHTML 查看完整行结构
    const bodyRow = document.querySelector('[data-slot="table-body"] tr');
    const allCells = bodyRow ? Array.from(bodyRow.children) : [];
    console.log('=== Data row cells (innerHTML) ===');
    allCells.forEach((c, i) => {
      const slot = c.getAttribute('data-slot') || '(no slot)';
      const inner = (c as HTMLElement).innerHTML.slice(0, 200);
      const text = c.textContent?.trim() || '(empty)';
      console.log(`  [${i}] slot="${slot}" text="${text}" html=${inner}`);
    });
  });
});
