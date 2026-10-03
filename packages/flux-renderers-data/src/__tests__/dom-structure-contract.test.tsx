import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { assertRendererRootAnchors } from '@nop-chaos/flux-react';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function renderPage(body: Record<string, unknown>[]) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract-data"
      schema={{ type: 'page', body } as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('data dom-structure contract (root anchors, plan 531)', () => {
  it('table root carries anchors; data cells expose td[data-field] (owner-doc contract)', () => {
    const { container } = renderPage([
      {
        type: 'table',
        columns: [
          { name: 'name', label: 'Name' },
          { name: 'age', label: 'Age' },
        ],
        source: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      },
    ]);
    const root = container.querySelector('.nop-table')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'table' });
    // owner-doc 契约（renderer-markers-and-selectors.md "Field selector contract attributes"）：
    // 数据单元格按列名定位 `<td data-field="...">`（W4 落地，替换脆弱的列序号算术）
    const nameCell = container.querySelector('td[data-field="name"]')!;
    expect(nameCell).toBeTruthy();
    expect(nameCell.textContent).toContain('Alice');
    const ageCell = container.querySelector('td[data-field="age"]')!;
    expect(ageCell.textContent).toContain('30');
    // 每行每列恰一个 data-field（非数据列/leading cells 不打标）
    expect(container.querySelectorAll('td[data-field]').length).toBe(4);
  });

  it('crud root carries anchors; toolbar row declares its layout slot', () => {
    const { container } = renderPage([
      {
        type: 'crud',
        columns: [{ name: 'name', label: 'Name' }],
        source: [{ name: 'Alice' }],
        toolbar: [{ type: 'button', label: 'Refresh' }],
      },
    ]);
    const root = container.querySelector('.nop-crud')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'crud' });
    expect(container.querySelector('[data-slot="crud-toolbar-row"]')).toBeTruthy();
  });

  it('statistics and sparkline roots carry anchors (single-element roots own their slot)', () => {
    const { container } = renderPage([
      { type: 'statistics', name: 'total' },
      { type: 'sparkline', name: 'trend' },
    ]);
    assertRendererRootAnchors(container.querySelector('.nop-statistics'), { type: 'statistics' });
    assertRendererRootAnchors(container.querySelector('.nop-sparkline'), { type: 'sparkline' });
    expect(container.querySelector('[data-slot="statistics-root"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="sparkline-root"]')).toBeTruthy();
  });

  it('data-source renders null (null-render exemption per audit card)', () => {
    const { container } = renderPage([{ type: 'data-source', name: 'ds' }]);
    expect(container.querySelector('[data-renderer="data-source"]')).toBeNull();
  });
});
