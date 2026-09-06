import { describe, expect, it } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintPageSchema,
  type PrintTableElement,
  type PrintTemplateSchema,
  type PrintTextElement,
} from './schemas.js';
import type { BoundPrintElement } from './bind.js';
import { bindPrintTemplate } from './bind.js';

const env: RendererEnv = {
  fetcher: async () => ({ status: 0, data: null as never }),
  notify: () => {},
};

const page: PrintPageSchema = {
  paper: { width: 210, height: 297, direction: 'vertical', margins: [10, 10, 10, 10] },
  unit: 'mm',
};

function element(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 20, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function template(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), page, elements };
}

describe('bindPrintTemplate - text and fields', () => {
  it('keeps static text untouched', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', text: '纯静态文本' }) as PrintTextElement]),
      {},
      { env },
    );
    const bound = result.template.elements[0] as PrintTextElement;
    expect(bound.text).toBe('纯静态文本');
    expect(result.diagnostics).toEqual([]);
  });

  it('interpolates ${path} expressions from data', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', text: '客户：${customer.name}' }) as PrintTextElement]),
      { customer: { name: 'Acme' } },
      { env },
    );
    expect((result.template.elements[0] as PrintTextElement).text).toBe('客户：Acme');
  });

  it('binds field shorthand as ${field}', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', field: 'orderNo' }) as PrintTextElement]),
      { orderNo: 'A-001' },
      { env },
    );
    expect((result.template.elements[0] as PrintTextElement).text).toBe('A-001');
  });

  it('resolves unreachable paths to empty string with a bind warning', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', text: '${user.missing}' }) as PrintTextElement]),
      {},
      { env },
    );
    expect((result.template.elements[0] as PrintTextElement).text).toBe('');
    expect(result.diagnostics.map((d) => d.code)).toContain('PRINT_BIND_PATH_MISSING');
    expect(result.diagnostics[0]?.level).toBe('warning');
  });

  it('includes the compiler message in syntax diagnostics', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', text: '${a +}' }) as PrintTextElement]),
      { a: 1 },
      { env },
    );
    const diagnostic = result.diagnostics.find((d) => d.code === 'PRINT_BIND_SYNTAX');
    expect(diagnostic?.message.length).toBeGreaterThan('表达式语法错误：${a +}'.length);
  });

  it('catches syntax errors at compile stage with an error diagnostic', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'text', id: 't1', text: '${a +}' }) as PrintTextElement]),
      { a: 1 },
      { env },
    );
    expect((result.template.elements[0] as PrintTextElement).text).toBe('');
    expect(result.diagnostics.map((d) => d.code)).toContain('PRINT_BIND_SYNTAX');
    expect(result.diagnostics[0]?.level).toBe('error');
  });

  it('resolves image src and barcode/qrcode values through field', () => {
    const result = bindPrintTemplate(
      template([
        element({ type: 'image', id: 'i1', fit: 'contain', field: 'logoUrl' }),
        element({ type: 'barcode', id: 'b1', barcodeType: 'CODE128', field: 'sku' }),
        element({ type: 'qrcode', id: 'q1', level: 'M', field: 'trackUrl' }),
      ]),
      { logoUrl: 'https://x/logo.png', sku: 'SKU-1', trackUrl: 'https://x/t' },
      { env },
    );
    expect(result.template.elements[0]).toMatchObject({ src: 'https://x/logo.png' });
    expect(result.template.elements[1]).toMatchObject({ value: 'SKU-1' });
    expect(result.template.elements[2]).toMatchObject({ value: 'https://x/t' });
  });
});

describe('bindPrintTemplate - built-in variables', () => {
  it('injects $row/$rowIndex/$rows for table column templates', () => {
    const table = element({
      type: 'table',
      id: 'tb1',
      source: '${orders}',
      columns: [{ label: '行', text: '${$rowIndex + 1}/${$row.qty}' }],
    }) as PrintTableElement;
    const result = bindPrintTemplate(template([table]), { orders: [{ qty: 3 }, { qty: 5 }] }, { env });
    expect(result.template.elements[0]).toMatchObject({
      boundRows: [{ 行: '1/3' }, { 行: '2/5' }],
    });
  });

  it('passes $page/$pages through ctx stub values', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'pageNumber', id: 'pn1', region: 'footer', format: '${$page}/${$pages}' })]),
      {},
      { env, page: 2, pages: 5 },
    );
    expect(result.template.elements[0]).toMatchObject({ text: '2/5' });
  });

  it('binds table source to an array and warns on non-array results', () => {
    const table = element({ type: 'table', id: 'tb1', source: '${notAnArray}', columns: [] }) as PrintTableElement;
    const result = bindPrintTemplate(template([table]), { notAnArray: 'nope' }, { env });
    expect((result.template.elements[0] as BoundPrintElement).boundRows).toEqual([]);
    expect(result.diagnostics.map((d) => d.code)).toContain('PRINT_BIND_SOURCE_NOT_ARRAY');
  });
});

describe('bindPrintTemplate - printDate and value formats', () => {
  it('formats printDate with dayjs-style tokens', () => {
    const result = bindPrintTemplate(
      template([element({ type: 'printDate', id: 'd1', format: 'YYYY/MM/DD' })]),
      {},
      { env, now: new Date(2026, 8, 5, 14, 30, 5) },
    );
    expect(result.template.elements[0]).toMatchObject({ text: '2026/09/05' });
  });

  it('applies declarative column formats (number digits + prefix/suffix)', () => {
    const table = element({
      type: 'table',
      id: 'tb1',
      source: '${items}',
      columns: [{ label: '金额', field: 'amount', format: { type: 'number', digits: 2, prefix: '¥' } }],
    }) as PrintTableElement;
    const result = bindPrintTemplate(template([table]), { items: [{ amount: 3 }] }, { env });
    expect((result.template.elements[0] as BoundPrintElement).boundRows).toEqual([{ 金额: '¥3.00' }]);
  });
});
