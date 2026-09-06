import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PRINT_ELEMENT_TYPES } from '@nop-chaos/flux-print-core';
import React from 'react';
import { createDefaultElement, nextPrintElementId, resetPrintElementIdSeq } from './schemas.js';
import { PRINT_ELEMENT_RENDERERS, getPrintElementRenderer } from './renderer-definitions.js';
import type { ReactElement } from 'react';

afterEach(() => {
  cleanup();
  resetPrintElementIdSeq();
});

describe('PRINT_ELEMENT_RENDERERS', () => {
  it('registers every v1 element type', () => {
    expect(Object.keys(PRINT_ELEMENT_RENDERERS).sort()).toEqual([...PRINT_ELEMENT_TYPES].sort());
  });

  it('falls back to the unknown renderer for unrecognized types', () => {
    const Component = getPrintElementRenderer('hologram');
    render(React.createElement(Component, { element: { type: 'hologram' } as never }));
    expect(screen.getByText('hologram')).toBeTruthy();
  });

  it('renders text content through the registered renderer', () => {
    const element = createDefaultElement('text');
    element.text = '发票抬头';
    const Component = getPrintElementRenderer('text');
    render(React.createElement(Component, { element }));
    expect(screen.getByText('发票抬头')).toBeTruthy();
  });

  it('renders field reference instead of static text when field is set', () => {
    const element = { ...createDefaultElement('text'), field: 'customerName' };
    const Component = getPrintElementRenderer('text');
    render(React.createElement(Component, { element }));
    expect(screen.getByText('${customerName}')).toBeTruthy();
  });

  it('renders table skeleton headers from columns', () => {
    const element = createDefaultElement('table');
    element.columns = [
      { label: '品名', width: 'auto' },
      { label: '数量', width: 'auto', aggregate: 'sum' },
    ];
    const Component = getPrintElementRenderer('table');
    render(React.createElement(Component, { element }));
    expect(screen.getByText('品名')).toBeTruthy();
    expect(screen.getByText('数量')).toBeTruthy();
  });

  it('renders barcode type and qrcode level placeholders', () => {
    const barcode = createDefaultElement('barcode');
    const Barcode = getPrintElementRenderer('barcode');
    render(React.createElement(Barcode, { element: barcode }));
    expect(screen.getByText('CODE128')).toBeTruthy();

    cleanup();
    const qrcode = createDefaultElement('qrcode');
    const Qrcode = getPrintElementRenderer('qrcode');
    render(React.createElement(Qrcode, { element: qrcode }));
    expect(screen.getByText('QR·M')).toBeTruthy();
  });

  it('exposes data-print-role markers for canvas selection', () => {
    const line = createDefaultElement('line');
    line.direction = 'vertical';
    const Line = getPrintElementRenderer('line') as (props: { element: typeof line }) => ReactElement;
    const { container } = render(React.createElement(Line, { element: line }));
    const marker = container.querySelector('[data-print-role="line"]');
    expect(marker?.getAttribute('data-line-direction')).toBe('vertical');
  });
});

describe('createDefaultElement', () => {
  it('applies per-type defaults', () => {
    expect(createDefaultElement('text')).toMatchObject({ type: 'text', text: '文本', region: 'body' });
    expect(createDefaultElement('image')).toMatchObject({ type: 'image', fit: 'contain' });
    expect(createDefaultElement('barcode')).toMatchObject({ type: 'barcode', barcodeType: 'CODE128', textVisible: true });
    expect(createDefaultElement('qrcode')).toMatchObject({ type: 'qrcode', level: 'M' });
    expect(createDefaultElement('pageNumber')).toMatchObject({
      type: 'pageNumber',
      region: 'footer',
      format: '${$page}/${$pages}',
    });
    expect(createDefaultElement('table')).toMatchObject({
      type: 'table',
      repeatHeader: true,
      footerAggregate: 'lastPage',
    });
  });

  it('honors explicit id and frame overrides', () => {
    const element = createDefaultElement('rect', { id: 'rect_custom', left: 30, top: 40, width: 20, height: 10 });
    expect(element).toMatchObject({ id: 'rect_custom', left: 30, top: 40, width: 20, height: 10 });
  });

  it('generates unique sequential ids per type', () => {
    const a = nextPrintElementId('text');
    const b = nextPrintElementId('text');
    expect(a).not.toBe(b);
    expect(a.startsWith('text_')).toBe(true);
  });
});
