import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';
import React from 'react';
import { createPrintEditorController } from './editor/use-print-editor.js';
import { PRINT_ELEMENT_MIME, PrintPalette } from './print-palette.js';
import { PrintInspector } from './print-inspector.js';

function text(id: string, overrides: Partial<PrintElementSchema> = {}): PrintElementSchema {
  return {
    type: 'text',
    id,
    region: 'body',
    left: 0,
    top: 0,
    width: 40,
    height: 8,
    style: {},
    text: 'hello',
    ...overrides,
  } as PrintElementSchema;
}

function makeController(elements: PrintElementSchema[] = [], selection?: string[]) {
  const template: PrintTemplateSchema = { ...createEmptyPrintTemplate(), elements };
  return createPrintEditorController({ template, selection });
}

afterEach(() => cleanup());

describe('PrintPalette', () => {
  it('renders all nine element types', () => {
    const controller = makeController();
    render(<PrintPalette controller={controller} />);
    for (const type of ['text', 'image', 'table', 'barcode', 'qrcode', 'line', 'rect', 'pageNumber', 'printDate']) {
      expect(screen.getByText(TEXT_LABELS[type]!)).toBeTruthy();
    }
  });

  it('adds an element on click', () => {
    const controller = makeController();
    render(<PrintPalette controller={controller} />);
    fireEvent.click(screen.getByText(TEXT_LABELS.barcode!));
    expect(controller.getTemplate().elements).toHaveLength(1);
    expect(controller.getTemplate().elements[0]).toMatchObject({ type: 'barcode' });
  });

  it('writes the palette mime payload on dragstart', () => {
    const controller = makeController();
    const { container } = render(<PrintPalette controller={controller} />);
    const item = container.querySelector('[data-palette-type="qrcode"]')!;
    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      effectAllowed: '',
    };
    fireEvent.dragStart(item, { dataTransfer });
    expect(dataTransfer.data.get(PRINT_ELEMENT_MIME)).toBe('qrcode');
  });
});

describe('PrintInspector - template section', () => {
  it('edits page paper width and margins via the template section', () => {
    const controller = makeController();
    render(<PrintInspector controller={controller} />);
    const widthInput = screen.getByLabelText('纸宽 (mm)') as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: '180' } });
    expect(controller.getTemplate().page.paper.width).toBe(180);
  });

  it('renames the template', () => {
    const controller = makeController();
    render(<PrintInspector controller={controller} />);
    const nameInput = screen.getByLabelText('模板名称') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '出库单' } });
    expect(controller.getTemplate().name).toBe('出库单');
  });
});

describe('PrintInspector - element sections', () => {
  it('shows none-selected hint when nothing selected', () => {
    const controller = makeController([text('a')]);
    render(<PrintInspector controller={controller} />);
    expect(screen.getByText('未选中元素，点击画布中的元素进行编辑')).toBeTruthy();
  });

  it('edits text content and bound field of the selected element', () => {
    const controller = makeController([text('a')], ['a']);
    render(<PrintInspector controller={controller} />);
    fireEvent.change(screen.getByLabelText('文本内容'), { target: { value: '客户名称' } });
    expect(controller.getTemplate().elements[0]).toMatchObject({ text: '客户名称' });
    fireEvent.change(screen.getByLabelText('绑定字段'), { target: { value: 'customerName' } });
    expect(controller.getTemplate().elements[0]).toMatchObject({ field: 'customerName' });
  });

  it('changes region via select', () => {
    const controller = makeController([text('a')], ['a']);
    render(<PrintInspector controller={controller} />);
    fireEvent.change(screen.getByLabelText('区域'), { target: { value: 'footer' } });
    expect(controller.getTemplate().elements[0]).toMatchObject({ region: 'footer' });
  });

  it('edits style font size and text align', () => {
    const controller = makeController([text('a')], ['a']);
    render(<PrintInspector controller={controller} />);
    fireEvent.change(screen.getByLabelText('字号'), { target: { value: '14' } });
    expect(controller.getTemplate().elements[0].style.fontSize).toBe(14);
    fireEvent.change(screen.getByLabelText('对齐'), { target: { value: 'center' } });
    expect(controller.getTemplate().elements[0].style.textAlign).toBe('center');
  });

  it('adds and removes table columns', () => {
    const controller = makeController([{
      type: 'table', id: 'tb', region: 'body', left: 0, top: 0, width: 100, height: 50, style: {},
      source: '${orders}', columns: [{ label: '品名', field: 'name' }],
    } as PrintElementSchema], ['tb']);
    render(<PrintInspector controller={controller} />);
    fireEvent.click(screen.getByText('添加列'));
    expect((controller.getTemplate().elements[0] as { columns: unknown[] }).columns).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText('移除列')[0]!);
    expect((controller.getTemplate().elements[0] as { columns: unknown[] }).columns).toHaveLength(1);
  });

  it('undoes inspector edits through the session stack', () => {
    const controller = makeController([text('a', { left: 0 })], ['a']);
    render(<PrintInspector controller={controller} />);
    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '9' } });
    expect(controller.getTemplate().elements[0].left).toBe(9);
    controller.undo();
    expect(controller.getTemplate().elements[0].left).toBe(0);
  });
});

const TEXT_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  table: '表格',
  barcode: '条形码',
  qrcode: '二维码',
  line: '线条',
  rect: '矩形',
  pageNumber: '页码',
  printDate: '打印时间',
};

describe('16b-1 (P2): paper name preset select exists in the template section', () => {
  it('red: inspector exposes a paperName preset select', () => {
    const controller = makeController();
    render(<PrintInspector controller={controller} />);
    // 当前实现：无纸张预设下拉，仅数值宽高 → 必红
    expect(screen.getByLabelText('纸张')).toBeTruthy();
  });
});
