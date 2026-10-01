import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpreadsheetCellEditor } from './inline-controls.js';

function renderEditor(value: string) {
  return render(
    <SpreadsheetCellEditor
      value={value}
      onChange={() => undefined}
      onSave={() => undefined}
      onCancel={() => undefined}
    />,
  );
}

function editorInput(container: HTMLElement) {
  return container.querySelector('[data-slot="spreadsheet-cell-editor-input"]') as HTMLInputElement;
}

describe('SpreadsheetCellEditor 光标契约（ux-r4 type-to-edit）', () => {
  it('挂载后光标置尾且无选区——后续键入追加而非替换种子', () => {
    const { container } = renderEditor('h');
    const input = editorInput(container);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });

  it('回显既有内容时光标在末尾（不整段选中）', () => {
    const { container } = renderEditor('hello');
    const input = editorInput(container);
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
  });
});
