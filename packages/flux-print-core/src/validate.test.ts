import { describe, expect, it } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintBarcodeElement,
  type PrintPageSchema,
  type PrintElementSchema,
  type PrintImageElement,
  type PrintPageNumberElement,
  type PrintQrcodeElement,
  type PrintTableElement,
  type PrintTemplateSchema,
} from './schemas.js';
import { validatePrintTemplate } from './validate.js';

function makeElement(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return {
    region: 'body',
    left: 0,
    top: 0,
    width: 20,
    height: 10,
    style: {},
    ...partial,
  } as PrintElementSchema;
}

const validPage: PrintPageSchema = {
  paper: { width: 210, height: 297, direction: 'vertical', margins: [10, 10, 10, 10] },
  paperName: 'a4',
  unit: 'mm',
  headerHeight: 10,
  footerHeight: 10,
};

function makeTemplate(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), page: validPage, elements };
}

describe('validatePrintTemplate - structure', () => {
  it('returns zero diagnostics for a valid template', () => {
    const template = makeTemplate([
      makeElement({ type: 'text', id: 't1', text: 'hello' }),
    ]);
    expect(validatePrintTemplate(template)).toEqual([]);
  });

  it('errors when page is missing', () => {
    const template = { ...createEmptyPrintTemplate(), page: undefined as never };
    const codes = validatePrintTemplate(template).map((d) => d.code);
    expect(codes).toContain('PRINT_PAGE_MISSING');
  });

  it('errors when elements is not an array', () => {
    const template = { ...createEmptyPrintTemplate(), elements: undefined as never };
    const codes = validatePrintTemplate(template).map((d) => d.code);
    expect(codes).toContain('PRINT_ELEMENTS_INVALID');
  });

  it('errors on missing id and unknown type', () => {
    const template = makeTemplate([
      makeElement({ type: 'text', id: '' as string, text: 'x' }),
      makeElement({ type: 'hologram' as never, id: 'h1' }),
    ]);
    const diagnostics = validatePrintTemplate(template);
    expect(diagnostics.filter((d) => d.code === 'PRINT_ID_REQUIRED')).toHaveLength(1);
    expect(diagnostics.filter((d) => d.code === 'PRINT_TYPE_UNKNOWN')).toHaveLength(1);
    expect(diagnostics.every((d) => d.level === 'error')).toBe(true);
  });

  it('errors on duplicate ids', () => {
    const template = makeTemplate([
      makeElement({ type: 'rect', id: 'dup' }),
      makeElement({ type: 'rect', id: 'dup' }),
    ]);
    const codes = validatePrintTemplate(template).map((d) => d.code);
    expect(codes).toContain('PRINT_ID_DUPLICATE');
  });

  it('warns on unknown paperName preset', () => {
    const template = makeTemplate([]);
    template.page = { ...validPage, paperName: 'a99' };
    const codes = validatePrintTemplate(template).map((d) => d.code);
    expect(codes).toContain('PRINT_PAPER_UNKNOWN');
  });
});

describe('validatePrintTemplate - required specialized fields', () => {
  it('errors on image without fit', () => {
    const element = makeElement({ type: 'image', id: 'i1' }) as PrintImageElement;
    delete (element as Partial<PrintImageElement>).fit;
    const codes = validatePrintTemplate(makeTemplate([element])).map((d) => d.code);
    expect(codes).toContain('PRINT_FIELD_REQUIRED');
  });

  it('errors on barcode without barcodeType and qrcode without level', () => {
    const barcode = makeElement({ type: 'barcode', id: 'b1' }) as PrintBarcodeElement;
    delete (barcode as Partial<PrintBarcodeElement>).barcodeType;
    const qrcode = makeElement({ type: 'qrcode', id: 'q1' }) as PrintQrcodeElement;
    delete (qrcode as Partial<PrintQrcodeElement>).level;
    const codes = validatePrintTemplate(makeTemplate([barcode, qrcode])).map((d) => d.code);
    expect(codes.filter((code) => code === 'PRINT_FIELD_REQUIRED')).toHaveLength(2);
  });

  it('errors on table without source', () => {
    const table = makeElement({ type: 'table', id: 'tb1', columns: [] }) as PrintTableElement;
    table.source = '';
    const codes = validatePrintTemplate(makeTemplate([table])).map((d) => d.code);
    expect(codes).toContain('PRINT_SOURCE_REQUIRED');
  });
});

describe('validatePrintTemplate - regions', () => {
  it('warns when pageNumber lands in body region', () => {
    const element = makeElement({
      type: 'pageNumber',
      id: 'pn1',
      region: 'body',
    }) as PrintPageNumberElement;
    const diagnostics = validatePrintTemplate(makeTemplate([element]));
    expect(diagnostics.map((d) => d.code)).toContain('PRINT_REGION_INVALID');
    expect(diagnostics.find((d) => d.code === 'PRINT_REGION_INVALID')?.level).toBe('warning');
  });

  it('warns when body element overflows the content rect', () => {
    const element = makeElement({ type: 'rect', id: 'r1', left: 205, top: 5, width: 20, height: 10 });
    const diagnostics = validatePrintTemplate(makeTemplate([element]));
    expect(diagnostics.map((d) => d.code)).toContain('PRINT_REGION_OVERFLOW');
    expect(diagnostics.find((d) => d.code === 'PRINT_REGION_OVERFLOW')?.level).toBe('warning');
  });

  it('accepts header/footer elements positioned inside their own region rect', () => {
    const header = makeElement({ type: 'text', id: 'h1', region: 'header', top: 2, height: 8, text: 'head' });
    const footer = makeElement({ type: 'text', id: 'f1', region: 'footer', top: 4, height: 6, text: 'foot' });
    expect(validatePrintTemplate(makeTemplate([header, footer]))).toEqual([]);
  });
});
