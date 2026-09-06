import { describe, expect, it } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintPageSchema,
  type PrintTableElement,
  type PrintTemplateSchema,
} from './schemas.js';
import { MAX_LAYOUT_PAGES, layoutPrintTemplate, type LayoutPrintOptions } from './layout.js';

const PAGE: PrintPageSchema = {
  paper: { width: 210, height: 297, direction: 'vertical' as const, margins: [10, 10, 10, 10] },
  paperName: 'a4',
  unit: 'mm' as const,
  headerHeight: 10,
  footerHeight: 10,
};
// 内容区：top 20, height 297-20-20=237, left 10, width 190

function el(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function makeTemplate(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), page: { ...PAGE }, elements };
}

function makeRows(rows: number): Array<Record<string, string>> {
  return Array.from({ length: rows }, (_, index) => ({ name: `row-${index}`, qty: String(index + 1) }));
}

function tableElement(id: string, overrides: Partial<PrintTableElement> = {}): PrintTableElement {
  return {
    type: 'table',
    id,
    region: 'body',
    left: 0,
    top: 0,
    width: 120,
    height: 30,
    style: {},
    source: '${orders}',
    columns: [{ label: '名称', field: 'name' }, { label: '数量', field: 'qty', aggregate: 'sum' }],
    rowHeight: 10,
    ...overrides,
  } as PrintTableElement;
}

function layoutWithRows(template: PrintTemplateSchema, rows: number, options?: LayoutPrintOptions) {
  return layoutPrintTemplate(template, { orders: makeRows(rows) }, options);
}

describe('layoutPrintTemplate', () => {
  it('① keeps a single-page template on one page', () => {
    const result = layoutPrintTemplate(makeTemplate([el({ type: 'text', id: 't1', text: 'hello' })]), {});
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.body).toHaveLength(1);
  });

  it('② paginates tables by rowHeight across pages', () => {
    // 30 行 × 10mm + 表头 6 = 306mm > 237mm 内容高 → 至少 2 页
    const result = layoutWithRows(makeTemplate([tableElement('tb')]), 30);
    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    const slices = result.pages.map((page) => page.body.find((placed) => placed.id === 'tb')).filter(Boolean);
    let covered = 0;
    for (const slice of slices) {
      covered += Math.floor(((slice!.pageHeight ?? 0) - 6) / 10);
    }
    expect(covered).toBe(30);
  });

  it('③ repeats the table header on continuation pages when repeatHeader', () => {
    // P5 起末片含聚合行高——本用例专注表头算术，表格显式 footerAggregate:'none'（聚合几何由 ④ 覆盖）
    const withHeader = layoutWithRows(makeTemplate([tableElement('tb', { footerAggregate: 'none' })]), 30);
    const slicesWith = withHeader.pages.map((page) => page.body.find((placed) => placed.id === 'tb')).filter(Boolean);
    expect(slicesWith.length).toBeGreaterThanOrEqual(2);
    // repeatHeader=true：首片与续片高度都含 6mm 表头（片高 % 10 === 6）
    for (const slice of slicesWith) {
      expect((slice!.pageHeight - 6) % 10).toBe(0);
    }

    const noRepeat = layoutWithRows(makeTemplate([tableElement('tb', { repeatHeader: false, footerAggregate: 'none' })]), 30);
    const slicesWithout = noRepeat.pages.map((page) => page.body.find((placed) => placed.id === 'tb')).filter(Boolean);
    // repeatHeader=false：续片无表头（片高 % 10 === 0），仅首片含 6mm
    expect((slicesWithout[0]!.pageHeight - 6) % 10).toBe(0);
    for (const slice of slicesWithout.slice(1)) {
      expect(slice!.pageHeight % 10).toBe(0);
    }
  });

  it('④ attaches aggregates: everyPage per-slice and totals on the last slice', () => {
    const everyPage = layoutWithRows(makeTemplate([tableElement('tb', { footerAggregate: 'everyPage' })]), 40);
    const everySlices = everyPage.pages
      .map((page) => page.body.find((placed) => placed.id === 'tb'))
      .filter((placed): placed is NonNullable<typeof placed> => Boolean(placed));
    for (const slice of everySlices) {
      expect(slice.sliceAggregate).toEqual({ 数量: expect.any(String) });
    }

    const lastPage = layoutWithRows(makeTemplate([tableElement('tb', { footerAggregate: 'lastPage' })]), 12);
    const lastSlices = lastPage.pages
      .map((page) => page.body.find((placed) => placed.id === 'tb'))
      .filter((placed): placed is NonNullable<typeof placed> => Boolean(placed));
    const withTotals = lastSlices.filter((slice) => slice.totalsAggregate);
    expect(withTotals).toHaveLength(1);
    // qty 1..12 → sum 78
    expect(withTotals[0]?.totalsAggregate).toEqual({ 数量: '78' });
  });

  it('⑤ repeats header/footer elements on every page', () => {
    const template = makeTemplate([
      el({ type: 'text', id: 'h', region: 'header', top: 0, text: '页眉' }),
      el({ type: 'text', id: 'f', region: 'footer', top: 0, text: '页脚' }),
      tableElement('tb'),
    ]);
    const result = layoutWithRows(template, 40);
    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    for (const page of result.pages) {
      expect(page.header.map((placed) => placed.text)).toContain('页眉');
      expect(page.footer.map((placed) => placed.text)).toContain('页脚');
    }
  });

  it('⑥ injects real $page/$pages into header/footer per page', () => {
    const template = makeTemplate([
      el({ type: 'text', id: 'h', region: 'header', top: 0, text: '${$page}/${$pages}' }),
      tableElement('tb'),
    ]);
    const result = layoutWithRows(template, 40);
    const total = result.pages.length;
    expect(total).toBeGreaterThanOrEqual(2);
    expect(result.pages[0]?.header[0]?.text).toBe(`1/${total}`);
    expect(result.pages[1]?.header[0]?.text).toBe(`2/${total}`);
  });

  it('⑦ moves a whole table to a new page when the first block cannot fit (orphan guard)', () => {
    const template = makeTemplate([
      el({ type: 'rect', id: 'filler', top: 230, height: 20 }),
      tableElement('tb', { top: 240 }),
    ]);
    const result = layoutWithRows(template, 5);
    const tablePages = result.pages.filter((page) => page.body.some((placed) => placed.id === 'tb'));
    // 表格不应跨页1尾（页1已有 filler 内容且剩余空间不足首块 16mm）
    const firstPage = result.pages[0]!;
    const firstPageHasTable = firstPage.body.some((placed) => placed.id === 'tb' && placed.pageTop > 240);
    expect(firstPageHasTable).toBe(false);
    expect(tablePages.length).toBeGreaterThanOrEqual(1);
  });

  it('⑧ stops at maxPages with a page-limit warning', () => {
    const result = layoutWithRows(makeTemplate([tableElement('tb')]), 5000, { maxPages: 5 });
    expect(result.pages).toHaveLength(5);
    expect(result.diagnostics.map((d) => d.code)).toContain('PRINT_LAYOUT_PAGE_LIMIT');
    expect(MAX_LAYOUT_PAGES).toBe(500);
  });

  it('⑨ expands region-relative coordinates to absolute page coordinates', () => {
    const result = layoutPrintTemplate(makeTemplate([el({ type: 'rect', id: 'r', left: 5, top: 5 })]), {});
    const placed = result.pages[0]!.body[0]!;
    // body 原点 (10, 20) + 元素 (5, 5)
    expect(placed.pageLeft).toBe(15);
    expect(placed.pageTop).toBe(25);
    expect(placed.pageWidth).toBe(40);
  });

  it('⑩ shifts elements below an expanding table onto the corresponding page (design.md §6 rule 3)', () => {
    const template = makeTemplate([
      tableElement('tb'),
      el({ type: 'text', id: 'below', top: 100, text: '落款' }),
    ]);
    const result = layoutWithRows(template, 40);
    const lastPage = result.pages[result.pages.length - 1]!;
    expect(lastPage.body.some((placed) => placed.id === 'below' && placed.text === '落款')).toBe(true);
    // 落款不应出现在第一页（表格膨胀把它推出了首页）
    expect(result.pages[0]?.body.some((placed) => placed.id === 'below')).toBe(false);
  });

  it('⑪ splits autoGrow text with an injected measure and keeps it whole without one', () => {
    const measure: LayoutPrintOptions['measure'] = {
      textHeight: (text) => text.length * 1, // 1mm/字符
    };
    const long = 'A'.repeat(100);
    const template = makeTemplate([
      el({ type: 'text', id: 'head', top: 0, height: 250 }),
      el({ type: 'text', id: 'grow', top: 255, height: 20, autoGrow: true, text: long }),
    ]);
    const result = layoutPrintTemplate(template, {}, { measure });
    const firstPage = result.pages[0]!;
    // 内容区 20~277；grow 语义 top 255+20=275 → 首页剩余 2mm → 切 2 字符
    const grownFirst = firstPage.body.find((placed) => placed.id === 'grow');
    expect(grownFirst?.text).toHaveLength(2);
    const tail = result.pages[1]?.body.find((placed) => placed.id === 'grow');
    expect(tail?.text).toHaveLength(98);

    // 无 measure：不切分，整体移下页
    const noMeasure = layoutPrintTemplate(makeTemplate([
      el({ type: 'text', id: 'head', top: 0, height: 250 }),
      el({ type: 'text', id: 'grow', top: 255, height: 20, autoGrow: true, text: long }),
    ]), {});
    expect(noMeasure.pages[0]?.body.some((placed) => placed.id === 'grow')).toBe(false);
    expect(noMeasure.pages[1]?.body.find((placed) => placed.id === 'grow')?.text).toBe(long);
  });

  it('p-table-oversize: a single row taller than the content area occupies its own page without looping', () => {
    // 行高 300mm 超过内容区高 237mm：30 行不触发死循环，行按页推进
    const result = layoutWithRows(makeTemplate([tableElement('tb', { rowHeight: 300 })]), 3);
    expect(result.pages.length).toBeGreaterThanOrEqual(3);
    expect(result.diagnostics.map((d) => d.code)).not.toContain('PRINT_LAYOUT_PAGE_LIMIT');
  });

  it('p-zero-loop: forces at least one row when the page top cannot fit a row (no infinite loop)', () => {
    // 行高 250mm：首页表头(6)+1 行(250)=256 ≤ 237？否——表头预留后放不下 → 页顶强保一行推进
    const result = layoutWithRows(makeTemplate([tableElement('tb', { rowHeight: 250 })]), 2);
    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    // 每页都有表格切片（强保一行），未卡死
    for (const page of result.pages) {
      expect(page.body.some((placed) => placed.id === 'tb')).toBe(true);
    }
  });

  it('uses ESTIMATE_ROW_HEIGHT_MM fallback when neither rowHeight nor measure is provided', () => {
    const element = tableElement('tb');
    delete (element as { rowHeight?: number }).rowHeight;
    const result = layoutWithRows(makeTemplate([element]), 10);
    // 估算行高 6mm：首片可容纳 floor((237-6)/6) 行 → 单页即可放下 10 行
    expect(result.pages).toHaveLength(1);
  });

  it('passes through LayoutPrintOptions typing', () => {
    const options: LayoutPrintOptions = { maxPages: 10 };
    const result = layoutPrintTemplate(makeTemplate([]), {}, options);
    expect(result.pages).toHaveLength(1);
  });
});
