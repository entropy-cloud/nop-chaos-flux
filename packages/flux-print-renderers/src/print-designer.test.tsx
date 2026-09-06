import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyPrintTemplate, type PrintElementSchema, type PrintTemplateSchema } from '@nop-chaos/flux-print-core';
import React from 'react';
import { PrintDesigner } from './print-designer.js';

function textEl(id: string, overrides: Partial<PrintElementSchema> = {}): PrintElementSchema {
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

function templateWith(elements: PrintElementSchema[], testData?: Record<string, unknown>): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), elements, testData };
}

afterEach(() => cleanup());

describe('PrintPreview', () => {
  it('renders bound values in the paginated same-source view', () => {
    render(
      <PrintDesigner
        template={templateWith([textEl('a', { field: 'customer' })], { customer: 'Acme 贸易' })}
      />,
    );
    fireEvent.click(screen.getByLabelText('预览'));
    const frame = screen.getByTestId('print-preview-frame') as HTMLIFrameElement;
    expect(frame.srcdoc).toContain('Acme 贸易');
    expect(screen.getByTestId('print-preview-page-count').textContent).toBe('1');
  });

  it('shows diagnostics for missing bindings', () => {
    render(
      <PrintDesigner
        template={templateWith([textEl('a', { field: 'missingField' })])}
      />,
    );
    fireEvent.click(screen.getByLabelText('预览'));
    const diagnostics = screen.getByTestId('print-preview-diagnostics');
    expect(diagnostics.textContent).toContain('PRINT_BIND_PATH_MISSING');
  });

  it('renders table bound rows in the same-source html', () => {
    render(
      <PrintDesigner
        template={templateWith([{
          type: 'table', id: 'tb', region: 'body', left: 0, top: 0, width: 120, height: 60, style: {},
          source: '${orders}',
          columns: [{ label: '品名', field: 'name' }],
        } as PrintElementSchema], { orders: [{ name: 'A4 纸' }] })}
      />,
    );
    fireEvent.click(screen.getByLabelText('预览'));
    const frame = screen.getByTestId('print-preview-frame') as HTMLIFrameElement;
    expect(frame.srcdoc).toContain('品名');
    expect(frame.srcdoc).toContain('A4 纸');
  });
});

describe('PrintDesigner shell', () => {
  it('composes toolbar, palette, canvas and inspector', () => {
    render(<PrintDesigner template={templateWith([textEl('a')])} />);
    expect(screen.getByTestId('print-toolbar')).toBeTruthy();
    expect(screen.getByTestId('print-palette')).toBeTruthy();
    expect(screen.getByTestId('print-designer-canvas')).toBeTruthy();
    expect(screen.getByTestId('print-inspector')).toBeTruthy();
  });

  it('deletes the selected element with the Delete key and undoes with Ctrl+Z', () => {
    const changes: PrintTemplateSchema[] = [];
    render(
      <PrintDesigner
        template={templateWith([textEl('a')])}
        onTemplateChange={(next) => changes.push(next)}
      />,
    );
    const shell = screen.getByTestId('print-designer');
    const wrapper = screen.getByTestId('print-designer-canvas').querySelector('[data-element-id="a"]')!;
    fireEvent.pointerDown(wrapper);
    fireEvent.pointerUp(wrapper);
    fireEvent.keyDown(shell, { key: 'Delete' });
    expect(screen.getByTestId('print-designer-canvas').querySelectorAll('.nop-print-element')).toHaveLength(0);
    fireEvent.keyDown(shell, { key: 'z', ctrlKey: true });
    expect(screen.getByTestId('print-designer-canvas').querySelectorAll('.nop-print-element')).toHaveLength(1);
    expect(changes.length).toBeGreaterThanOrEqual(1); // Delete 走 auto-commit；undo 不触发 commit（editor-core 语义）
  });

  it('nudges the selected element with arrow keys', () => {
    render(<PrintDesigner template={templateWith([textEl('a', { left: 5 })])} />);
    const canvas = screen.getByTestId('print-designer-canvas');
    const wrapperEl = canvas.querySelector('[data-element-id="a"]')!;
    fireEvent.pointerDown(wrapperEl);
    fireEvent.pointerUp(wrapperEl);
    fireEvent.keyDown(screen.getByTestId('print-designer'), { key: 'ArrowRight' });
    const wrapper = canvas.querySelector('[data-element-id="a"]') as HTMLElement;
    // left 5mm + nudge 1mm + body 区域原点偏移（默认左边距 15mm）
    expect(Number(wrapper.style.left.replace('px', ''))).toBeCloseTo((5 + 1 + 15) * (96 / 25.4), 4);
  });

  it('skips shortcuts while typing in inspector inputs', () => {
    render(<PrintDesigner template={templateWith([textEl('a')], undefined)} />);
    fireEvent.click(screen.getByTestId('print-designer-canvas').querySelector('[data-element-id="a"]')!);
    const nameInput = screen.getByLabelText('模板名称') as HTMLInputElement;
    fireEvent.keyDown(nameInput, { key: 'Delete', target: nameInput });
    expect(screen.getByTestId('print-designer-canvas').querySelectorAll('.nop-print-element')).toHaveLength(1);
  });

  it('adds elements from the palette by click', () => {
    render(<PrintDesigner template={templateWith([])} />);
    fireEvent.click(screen.getByTestId('print-palette').querySelector('[data-palette-type="text"]')!);
    expect(screen.getByTestId('print-designer-canvas').querySelectorAll('.nop-print-element')).toHaveLength(1);
  });

  it('adds exactly one element per palette drop inside the shell (no double-add)', () => {
    render(<PrintDesigner template={templateWith([])} />);
    const paperEl = screen.getByTestId('print-designer-canvas').querySelector('.nop-print-paper')!;
    const px = 96 / 25.4;
    const dataTransfer = {
      data: new Map<string, string>([['application/x-print-element', 'text']]),
      getData: (type: string) => dataTransfer.data.get(type) ?? '',
    };
    const dropEvent = createEvent.drop(paperEl, { dataTransfer });
    Object.defineProperty(dropEvent, 'clientX', { value: 30 * px });
    Object.defineProperty(dropEvent, 'clientY', { value: 30 * px });
    fireEvent(paperEl, dropEvent);
    expect(screen.getByTestId('print-designer-canvas').querySelectorAll('.nop-print-element')).toHaveLength(1);
  });
});
