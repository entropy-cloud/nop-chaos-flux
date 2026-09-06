import { describe, expect, it } from 'vitest';
import {
  PRINT_ELEMENT_TYPES,
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from './schemas.js';

describe('PRINT_ELEMENT_TYPES', () => {
  it('declares the v1 nine element types', () => {
    expect(PRINT_ELEMENT_TYPES).toEqual([
      'text',
      'image',
      'table',
      'barcode',
      'qrcode',
      'line',
      'rect',
      'pageNumber',
      'printDate',
    ]);
  });
});

describe('createEmptyPrintTemplate', () => {
  it('creates an A4 vertical template with the print-template kind', () => {
    const template = createEmptyPrintTemplate();
    expect(template.kind).toBe('print-template');
    expect(template.schemaVersion).toBe(1);
    expect(template.page.paperName).toBe('a4');
    expect(template.page.paper).toEqual({ width: 210, height: 297, direction: 'vertical', margins: [15, 15, 15, 15] });
    expect(template.elements).toEqual([]);
  });

  it('deep-clones the default page so templates do not share mutable state', () => {
    const a = createEmptyPrintTemplate();
    const b = createEmptyPrintTemplate();
    a.page.paper.margins[0] = 99;
    expect(b.page.paper.margins[0]).toBe(15);
  });
});

describe('element discriminated union', () => {
  it('narrows by type without runtime casting', () => {
    const elements: PrintElementSchema[] = [
      { id: 't1', type: 'text', region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, text: 'hello' },
      { id: 'tb1', type: 'table', region: 'body', left: 0, top: 20, width: 160, height: 80, style: {}, source: '${orders}', columns: [] },
      { id: 'pn1', type: 'pageNumber', region: 'footer', left: 70, top: 0, width: 30, height: 6, style: {} },
    ];
    const template: PrintTemplateSchema = { ...createEmptyPrintTemplate(), elements };
    const tables = template.elements.filter((el) => el.type === 'table');
    expect(tables).toHaveLength(1);
    if (tables[0]?.type === 'table') {
      expect(tables[0].source).toBe('${orders}');
      expect(tables[0].repeatHeader).toBeUndefined();
    }
  });
});
