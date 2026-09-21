import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

/**
 * V12f Phase 1 — [G3-R2-视角3-01] 行点击勾选的键盘等价路径。
 *
 * `rowSelection.toggleOnRowClick` 让整行成为选择切换的点击目标，但行级
 * onKeyDown 只转发了 onRowClick 事件与 expandRowByClick，从未执行选择切换——
 * 键盘用户（行 tabIndex=0，Enter/Space 触发行激活）无法勾选/取消行。
 * 契约：Enter/Space 在可点击行上必须与点击同链路地切换选择，并同样受
 * maxSelectionLength 钳制。
 */
afterEach(() => cleanup());

function renderTable(schemaProps: Record<string, unknown>) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://table-v12f-row-keyboard-toggle"
      schema={
        {
          type: 'page',
          body: [
            {
              type: 'table',
              testid: 'keyboard-toggle-table',
              rowKey: 'id',
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

function bodyCheckboxes(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-slot="table-select-cell"] [role="checkbox"]',
    ),
  );
}

function checkedBodyCount(container: HTMLElement): number {
  return bodyCheckboxes(container).filter(
    (cb) => cb.getAttribute('aria-checked') === 'true' || cb.hasAttribute('data-checked'),
  ).length;
}

describe('V12f [G3-R2-视角3-01] row keyboard selection toggle (toggleOnRowClick)', () => {
  it('Enter on a focused body row toggles its selection', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(bodyRows[0].getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(bodyRows[0], { key: 'Enter' });
    expect(checkedBodyCount(container)).toBe(1);

    fireEvent.keyDown(bodyRows[0], { key: 'Enter' });
    expect(checkedBodyCount(container)).toBe(0);
  });

  it('Space on a focused body row toggles its selection', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');

    fireEvent.keyDown(bodyRows[1], { key: ' ' });
    expect(checkedBodyCount(container)).toBe(1);
    expect(
      bodyCheckboxes(container)[1].getAttribute('aria-checked') === 'true' ||
        bodyCheckboxes(container)[1].hasAttribute('data-checked'),
    ).toBe(true);
  });

  it('keyboard toggle respects maxSelectionLength like the click path', () => {
    const { container } = renderTable({
      rowSelection: {
        type: 'checkbox',
        toggleOnRowClick: true,
        maxSelectionLength: 1,
        selectedRowKeys: ['1'],
      },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    expect(checkedBodyCount(container)).toBe(1);

    // Row 2 unselected, max reached: keyboard must not exceed the cap.
    fireEvent.keyDown(bodyRows[1], { key: 'Enter' });
    expect(checkedBodyCount(container)).toBe(1);

    // The selected row can still be deselected by keyboard.
    fireEvent.keyDown(bodyRows[0], { key: 'Enter' });
    expect(checkedBodyCount(container)).toBe(0);
  });

  it('other keys do not toggle the selection', () => {
    const { container } = renderTable({
      rowSelection: { type: 'checkbox', toggleOnRowClick: true },
    });
    const bodyRows = container.querySelectorAll('tbody [data-slot="table-row"]');
    fireEvent.keyDown(bodyRows[0], { key: 'ArrowDown' });
    expect(checkedBodyCount(container)).toBe(0);
  });
});
