// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from './schemas.js';
import { createBarcodeSvg, createQrcodeSvg } from './barcode.js';
import { renderPrintPages, renderPrintTemplateToHtml } from './render-html.js';

function el(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function makeTemplate(elements: PrintElementSchema[], testData?: Record<string, unknown>): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), elements, testData };
}

const ORDERS = Array.from({ length: 30 }, (_, index) => ({ name: `商品-${index}`, qty: String(index + 1) }));

describe('createBarcodeSvg / createQrcodeSvg', () => {
  it('gracefully degrades when jsbarcode cannot render in the current DOM (happy-dom); real-browser svg asserted in P4 e2e', () => {
    // happy-dom 的 SVGElement.style 为 null，jsbarcode 内部失败 → 契约：空串不抛错
    expect(() => createBarcodeSvg('ABC-123', { format: 'CODE128', textVisible: true })).not.toThrow();
    void createBarcodeSvg;
  });

  it('returns empty string for empty or invalid values without throwing', () => {
    expect(createBarcodeSvg('', { format: 'CODE128' })).toBe('');
    expect(createBarcodeSvg('not-numeric', { format: 'EAN13' })).toBe('');
    expect(createQrcodeSvg('')).toBe('');
  });

  it('renders a qrcode svg with dark modules', () => {
    const svg = createQrcodeSvg('https://example.com', { level: 'M' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });
});

describe('renderPrintTemplateToHtml', () => {
  it('produces a self-contained document with @page size and pages', () => {
    const template = makeTemplate([el({ type: 'text', id: 't1', text: '出库单' })]);
    const html = renderPrintTemplateToHtml(template, {});
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page { size: 210mm 297mm; margin: 0; }');
    expect(html).toContain('data-page="1"');
    expect(html).toContain('出库单');
  });

  it('keeps @page, .fmt-page and pdf page geometry identical for landscape paper (width/height are literal)', () => {
    const template = makeTemplate([el({ type: 'text', id: 't1', text: '横向' })]);
    template.page.paper = { ...template.page.paper, width: 297, height: 210, direction: 'horizontal' };
    const html = renderPrintTemplateToHtml(template, {});
    expect(html).toContain('@page { size: 297mm 210mm; margin: 0; }');
    expect(html).toContain('width:297mm');
    expect(html).toContain('height:210mm');
    const pages = renderPrintPages(template, {});
    expect(pages[0]).toMatchObject({ widthMm: 297, heightMm: 210 });
  });

  it('positions elements in absolute page coordinates', () => {
    const html = renderPrintTemplateToHtml(makeTemplate([el({ type: 'rect', id: 'r', left: 5, top: 6 })]), {});
    // 默认模板边距 15mm：body 原点 (15,15) + 元素 (5,6)
    expect(html).toContain('left:20mm');
    expect(html).toContain('top:21mm');
  });

  it('renders table slices with repeated headers and rows across pages', () => {
    const html = renderPrintTemplateToHtml(makeTemplate([tableEl()]), { orders: ORDERS });
    const pageCount = (html.match(/data-page="/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect((html.match(/<thead>/g) ?? []).length).toBe(pageCount); // repeatHeader 默认 true
    expect(html).toContain('商品-0');
    expect(html).toContain('商品-29');
  });

  it('embeds barcode and qrcode svgs from bound values', () => {
    const html = renderPrintTemplateToHtml(
      makeTemplate([
        el({ type: 'barcode', id: 'b1', barcodeType: 'CODE128', value: 'SKU-1' }),
        el({ type: 'qrcode', id: 'q1', level: 'M', value: 'https://x.dev' }),
      ]),
      {},
    );
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('escapes html-special content to prevent injection', () => {
    const html = renderPrintTemplateToHtml(
      makeTemplate([el({ type: 'text', id: 't1', text: '<script>alert(1)</script>' })]),
      {},
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders bound expressions with chinese content', () => {
    const html = renderPrintTemplateToHtml(
      makeTemplate([el({ type: 'text', id: 't1', text: '客户：${customer}' })], ),
      { customer: '杭州贸易有限公司' },
      );
    expect(html).toContain('客户：杭州贸易有限公司');
  });

  it('exposes per-page fragments with paper dimensions', () => {
    const pages = renderPrintPages(makeTemplate([tableEl()]), { orders: ORDERS });
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]).toMatchObject({ widthMm: 210, heightMm: 297 });
    expect(pages[0]?.html).toContain('fmt-page');
  });
});

function tableEl(): PrintElementSchema {
  return el({
    type: 'table',
    id: 'tb',
    width: 160,
    height: 40,
    source: '${orders}',
    rowHeight: 10,
    columns: [{ label: '名称', field: 'name' }, { label: '数量', field: 'qty', aggregate: 'sum' }],
    footerAggregate: 'lastPage',
  } as never);
}
