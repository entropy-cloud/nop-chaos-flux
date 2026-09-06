import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyPrintTemplate, type PrintElementSchema, type PrintTemplateSchema } from '@nop-chaos/flux-print-core';
import React from 'react';
import { createPrintEditorController, type PrintEditorController } from './editor/use-print-editor.js';
import { PrintDesignerCanvas } from './print-designer-canvas.js';

function rect(id: string, overrides: Partial<PrintElementSchema> = {}): PrintElementSchema {
  return {
    type: 'rect',
    region: 'body',
    left: 10,
    top: 10,
    width: 30,
    height: 20,
    style: {},
    ...overrides,
    id,
  } as PrintElementSchema;
}

function template(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), elements };
}

function setup(elements: PrintElementSchema[]) {
  let latest: PrintTemplateSchema | null = null;
  const controller: PrintEditorController = createPrintEditorController({
    template: template(elements),
    onTemplateChange: (next) => {
      latest = next;
    },
  });
  const view = render(<PrintDesignerCanvas controller={controller} />);
  return { controller, view, latest: () => latest };
}

afterEach(() => {
  cleanup();
});

describe('PrintDesignerCanvas - render', () => {
  it('renders paper, region and element markers per design.md §9', () => {
    const { view } = setup([rect('a'), rect('b', { type: 'text', text: '票号' } as Partial<PrintElementSchema>)]);
    const canvas = view.container.querySelector('.nop-print-canvas');
    const paperEl = view.container.querySelector('.nop-print-paper');
    const bodyRegion = view.container.querySelector('.nop-print-region-body');
    const elements = view.container.querySelectorAll('.nop-print-element');
    expect(canvas).toBeTruthy();
    expect(paperEl?.getAttribute('data-paper-name')).toBe('a4');
    expect(bodyRegion).toBeTruthy();
    expect(elements).toHaveLength(2);
    expect(elements[0]?.getAttribute('data-print-type')).toBe('rect');
    expect(elements[1]?.getAttribute('data-print-type')).toBe('text');
    expect(screen.getByText('票号')).toBeTruthy();
  });

  it('shows header/footer region guides only when heights are set', () => {
    const base = template([rect('a')]);
    base.page.headerHeight = 10;
    base.page.footerHeight = 8;
    const controller = createPrintEditorController({ template: base });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    expect(container.querySelector('.nop-print-region-header')).toBeTruthy();
    expect(container.querySelector('.nop-print-region-footer')).toBeTruthy();
  });

  it('marks the selected element and shows handles', () => {
    const controller = createPrintEditorController({ template: template([rect('a'), rect('b')]), selection: ['a'] });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    const wrapper = container.querySelector('[data-element-id="a"]');
    expect(wrapper?.classList.contains('nop-print-element-selected')).toBe(true);
    expect(container.querySelectorAll('[data-resize-handle]')).toHaveLength(8);
    expect(container.querySelector('[data-rotate-handle]')).toBeTruthy();
    const unselected = container.querySelector('[data-element-id="b"]');
    expect(unselected?.classList.contains('nop-print-element-selected')).toBe(false);
  });
});

describe('PrintDesignerCanvas - region-relative layout (design.md §4)', () => {
  it('renders body elements offset by the region origin', () => {
    const base = template([rect('a', { left: 10, top: 5 })]);
    base.page.paper.margins = [10, 12, 14, 16];
    base.page.headerHeight = 8;
    const controller = createPrintEditorController({ template: base });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    const wrapper = container.querySelector('[data-element-id="a"]') as HTMLElement;
    const px = 96 / 25.4;
    // body 区域原点 = (marginLeft 16, marginTop 10 + headerHeight 8) = (16, 18)
    expect(Number(wrapper.style.left.replace('px', ''))).toBeCloseTo((16 + 10) * px, 4);
    expect(Number(wrapper.style.top.replace('px', ''))).toBeCloseTo((18 + 5) * px, 4);
  });

  it('clamps drags inside the region rect instead of the paper', () => {
    const base = template([rect('a', { left: 5, top: 5, width: 30, height: 10 })]);
    base.page.paper.margins = [10, 10, 14, 16];
    base.page.headerHeight = 8;
    const controller = createPrintEditorController({ template: base });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    const paperEl = container.querySelector('.nop-print-paper')!;
    const wrapper = container.querySelector('[data-element-id="a"]')!;
    const px = 96 / 25.4;
    // body 区域：origin (16, 18)，高 297-10-14-8 = 265
    const originX = 16 * px;
    const originY = 18 * px;
    fireEvent.pointerDown(wrapper, { clientX: originX + 5 * px, clientY: originY + 5 * px });
    // 拖到区域外很远（400mm），必须 clamp 到区域底边
    fireEvent.pointerMove(paperEl, { clientX: originX + 400 * px, clientY: originY + 400 * px });
    fireEvent.pointerUp(paperEl);
    const moved = controller.getTemplate().elements[0]!;
    expect(moved.top).toBe(265 - 10);
    expect(moved.left).toBeLessThanOrEqual(265);
  });
});

describe('PrintDesignerCanvas - palette drop positioning', () => {
  it('creates the element at the snapped drop point in body coordinates', () => {
    const controller = createPrintEditorController({ template: template([]) });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    const paperEl = container.querySelector('.nop-print-paper')!;
    const px = 96 / 25.4;
    const dataTransfer = {
      data: new Map<string, string>([['application/x-print-element', 'text']]),
      getData: (type: string) => dataTransfer.data.get(type) ?? '',
    };
    // 默认边距 15：drop 在纸面 (30, 30)mm → body 区域坐标 (15, 15)（网格吸附不变，阈值外）
    const dropEvent = createEvent.drop(paperEl, { dataTransfer });
    Object.defineProperty(dropEvent, 'clientX', { value: 30 * px });
    Object.defineProperty(dropEvent, 'clientY', { value: 30 * px });
    fireEvent(paperEl, dropEvent);
    const created = controller.getTemplate().elements[0];
    expect(created).toBeDefined();
    expect(created).toMatchObject({ type: 'text', left: 15, top: 15 });
  });
});

describe('PrintDesignerCanvas - interaction', () => {
  it('selects an element on pointerdown and clears selection on paper background', () => {
    const { controller, view } = setup([rect('a')]);
    const container = view.container;
    const wrapper = container.querySelector('[data-element-id="a"]')!;
    fireEvent.pointerDown(wrapper);
    expect(controller.getSelection()).toEqual(['a']);
    fireEvent.pointerDown(container.querySelector('.nop-print-paper')!);
    expect(controller.getSelection()).toEqual([]);
  });

  it('drags an element and commits one undoable diff', () => {
    const { controller, view } = setup([rect('a', { left: 10, top: 10 })]);
    const container = view.container;
    const wrapper = container.querySelector('[data-element-id="a"]')!;
    const paperEl = container.querySelector('.nop-print-paper')!;

    const zoom = controller.getZoom();
    const pxPerMm = 96 / 25.4;
    const origin = paperEl.getBoundingClientRect();

    fireEvent.pointerDown(wrapper, { clientX: origin.left + 10 * pxPerMm * zoom, clientY: origin.top + 10 * pxPerMm * zoom });
    fireEvent.pointerMove(paperEl, { clientX: origin.left + 18 * pxPerMm * zoom, clientY: origin.top + 18 * pxPerMm * zoom });
    fireEvent.pointerUp(paperEl);

    const moved = controller.getTemplate().elements[0]!;
    // 位移 8mm，吸附线（0/10/20…网格 + 元素锚点）可能修正到整数格
    expect(moved.left).toBeCloseTo(18, 0);
    expect(moved.top).toBeCloseTo(18, 0);
    expect(controller.getState().undoDepth).toBe(1);
    controller.undo();
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 10, top: 10 });
  });

  it('resizes from the se handle keeping the nw corner anchored', () => {
    const controller = createPrintEditorController({
      template: template([rect('a', { left: 10, top: 10, width: 30, height: 20 })]),
      selection: ['a'],
    });
    const { container } = render(<PrintDesignerCanvas controller={controller} />);
    const paperEl = container.querySelector('.nop-print-paper')!;
    const origin = paperEl.getBoundingClientRect();
    const pxPerMm = 96 / 25.4;
    const zoom = controller.getZoom();

    const seHandle = container.querySelector('[data-resize-handle="se"]')!;
    const handleClientX = origin.left + (10 + 30) * pxPerMm * zoom;
    const handleClientY = origin.top + (10 + 20) * pxPerMm * zoom;
    fireEvent.pointerDown(seHandle, { clientX: handleClientX, clientY: handleClientY });
    fireEvent.pointerMove(paperEl, { clientX: handleClientX + 10 * pxPerMm * zoom, clientY: handleClientY + 5 * pxPerMm * zoom });
    fireEvent.pointerUp(paperEl);

    const resized = controller.getTemplate().elements[0]!;
    expect(resized).toMatchObject({ left: 10, top: 10 });
    expect(resized.width).toBeCloseTo(40, 6);
    expect(resized.height).toBeCloseTo(25, 6);
  });
});
