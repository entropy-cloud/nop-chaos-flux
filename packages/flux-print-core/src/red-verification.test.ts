// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintPageSchema,
  type PrintElementSchema,
  type PrintTableElement,
  type PrintTemplateSchema,
} from './schemas.js';
import { layoutPrintTemplate, type LayoutPrintOptions } from './layout.js';
import { renderPrintTemplateToHtml } from './render-html.js';

const PAGE: PrintPageSchema = {
  paper: { width: 210, height: 297, direction: 'vertical' as const, margins: [10, 10, 10, 10] },
  paperName: 'a4',
  unit: 'mm' as const,
  headerHeight: 10,
  footerHeight: 10,
};
// 内容区：top 20、bottom 277、高 257、left 10、宽 190

function el(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function makeTemplate(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), page: { ...PAGE }, elements };
}

function tableEl(id: string, rows: number, overrides: Partial<PrintTableElement> = {}): PrintTableElement {
  return {
    type: 'table',
    id,
    region: 'body',
    left: 0,
    top: 0,
    width: 120,
    height: 30,
    style: {},
    source: '${rows}',
    rowHeight: 10,
    columns: [{ label: '名称', field: 'name' }],
    ...overrides,
  } as PrintTableElement;
}

function layoutWithRows(template: PrintTemplateSchema, rows: number, options?: LayoutPrintOptions) {
  return layoutPrintTemplate(template, { rows: Array.from({ length: rows }, (_, index) => ({ name: `row-${index}` })) }, options);
}

describe('D21-04 (P0): rendered table rows must close the loop with layout row heights', () => {
  it('red: full-page table slices emit tr height and td font-size styles matching layout rowHeight', () => {
    const html = renderPrintTemplateToHtml(makeTemplate([tableEl('tb', 20)]), { rows: Array.from({ length: 20 }, (_, index) => ({ name: `row-${index}` })) });
    // 当前实现：tr 无显式高度、td 无字号 → 两断言均红
    expect(html).toMatch(/<tr[^>]*style="[^"]*height:\s*10mm/);
    expect(html).toMatch(/<td[^>]*font-size:\s*[\d.]+px/);
  });
});

describe('D21-01 (P1): elements below a cross-page table must follow the flow cursor', () => {
  it('red: text below a 40-row table lands on the last table page right after the last slice (not pinned to page bottom)', () => {
    const template = makeTemplate([
      tableEl('tb', 40),
      el({ type: 'text', id: 'below', top: 100, text: '落款' }),
    ]);
    const result = layoutWithRows(template, 40);
    const lastPage = result.pages[result.pages.length - 1]!;
    const below = result.pages.flatMap((page) => page.body.filter((placed) => placed.id === 'below'));
    // 当前实现：restarted = max(baseTop+shift, cursorY) = 496 → clipped 到 267 钉底必红
    expect(below.length).toBe(1);
    expect(below[0]!.pageTop).toBeLessThanOrEqual(lastPage.body.find((placed) => placed.id === 'tb')!.pageTop + lastPage.body.find((placed) => placed.id === 'tb')!.pageHeight);
  });
});

describe('D21-02 (P1): every table slice must stay inside the content area', () => {
  it('red: universal invariant — all table slices fit within content bottom (two 15-row tables, tb2.baseTop=120)', () => {
    const template = makeTemplate([
      tableEl('tb1', 15, { top: 0 }),
      tableEl('tb2', 15, { top: 120 }),
    ]);
    const result = layoutWithRows(template, 15);
    for (const page of result.pages) {
      for (const placed of page.body) {
        if (placed.type === 'table') {
          expect(placed.pageTop + placed.pageHeight).toBeLessThanOrEqual(277);
        }
      }
    }
    // 修复语义锁定：tb2 续排首片从内容区顶开始
    const tb2Slices = result.pages.flatMap((page) => page.body.filter((placed) => placed.id === 'tb2'));
    if (tb2Slices.length > 1) {
      expect(tb2Slices[1]!.pageTop).toBe(20);
    }
  });
});

describe('D21-03 (P1): aggregate rows must be inside the placed frame height', () => {
  it('red: lastPage aggregate height is included in the last slice placedHeight', () => {
    const result = layoutWithRows(makeTemplate([tableEl('tb', 5, { footerAggregate: 'lastPage', columns: [{ label: '名称', field: 'name' }, { label: '数量', field: 'qty', aggregate: 'sum' }] })]), 5);
    const slices = result.pages.flatMap((page) => page.body.filter((placed) => placed.id === 'tb'));
    const last = slices[slices.length - 1]!;
    // 当前实现：placedHeight = 6 + 5×10 = 56，不含聚合行 6mm（视觉需要 62）必红
    expect(last.pageHeight).toBeGreaterThanOrEqual(6 + 5 * 10 + 6);
  });
});

describe('文档 P1: print/export must refuse error-level diagnostics (design.md §10 gate)', () => {
  it('red: printPrintTemplate throws PRINT_VALIDATION_BLOCKED for an error template', async () => {
    const { printPrintTemplate } = await import('./print.js');
    const template = makeTemplate([el({ type: 'image', id: 'i1', fit: undefined } as never)]);
    expect(() => printPrintTemplate(template, {})).toThrowError(/PRINT_VALIDATION_BLOCKED/);
  });

  it('red: exportPrintTemplateToPdf throws PRINT_VALIDATION_BLOCKED for an error template', async () => {
    const { exportPrintTemplateToPdf } = await import('./export-pdf.js');
    const template = makeTemplate([el({ type: 'image', id: 'i1', fit: undefined } as never)]);
    await expect(exportPrintTemplateToPdf(template, {})).rejects.toThrowError(/PRINT_VALIDATION_BLOCKED/);
  });
});

describe('D23-01 (P2): print must wait for iframe load before calling print', () => {
  it('red: printPrintTemplate does not call print synchronously before load', async () => {
    const { printPrintTemplate } = await import('./print.js');
    const printSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = originalCreateElement(tag) as HTMLIFrameElement;
      if (tag === 'iframe') {
        Object.defineProperty(element, 'contentWindow', { value: { print: printSpy }, configurable: true });
      }
      return element;
    }) as typeof document.createElement);
    try {
      printPrintTemplate(makeTemplate([el({ type: 'text', id: 't1', text: 'x' })]), {});
      // 当前实现：同步路径立即 print（竞态）——修复后应等 load，同步阶段调用次数为 0
      expect(printSpy).not.toHaveBeenCalled();
    } finally {
      createElementSpy.mockRestore();
    }
  });
});

describe('D15-01 (P2): style and qrcode values must be sanitized', () => {
  it('red: style color with css injection payload is sanitized in output', () => {
    const html = renderPrintTemplateToHtml(
      makeTemplate([el({ type: 'text', id: 't1', text: 'x', style: { color: 'red;} body{background:url(https://evil)' } })]),
      {},
    );
    expect(html).not.toContain('body{background:url(https://evil)');
  });

  it('red: qrcode foreground attribute injection is escaped', async () => {
    const { createQrcodeSvg } = await import('./barcode.js');
    const svg = createQrcodeSvg('https://x.dev', { level: 'M', foreground: '"><script>alert(1)</script>' });
    expect(svg).not.toContain('<script>');
  });
});

describe('D19-02 (P2): table source exec failures report EVAL, not SYNTAX', () => {
  it('red: exec-stage error produces PRINT_BIND_EVAL', () => {
    const template = makeTemplate([
      { type: 'table', id: 'tb', region: 'body', left: 0, top: 0, width: 100, height: 40, style: {}, source: '${rows}', columns: [{ label: '名', field: 'boom' }] } as PrintElementSchema,
    ]);
    const data = { rows: [{ get boom(): string { throw new Error('getter exploded'); } }] };
    const result = layoutPrintTemplate(template, data);
    expect(result.diagnostics.map((d) => d.code)).toContain('PRINT_BIND_EVAL');
  });
});

describe('f-validate-skip: validate:false bypasses the gate', () => {
  it('red: printPrintTemplate with validate:false does not throw on error template', async () => {
    const { printPrintTemplate } = await import('./print.js');
    const printSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = originalCreateElement(tag) as HTMLIFrameElement;
      if (tag === 'iframe') {
        Object.defineProperty(element, 'contentWindow', { value: { print: printSpy }, configurable: true });
      }
      return element;
    }) as typeof document.createElement);
    try {
      const template = makeTemplate([el({ type: 'image', id: 'i1', fit: undefined } as never)]);
      // 当前未实现 validate 选项 → 类型上/行为上必红（validate 不被消费，行为上等价跳过…需实现消费）
      expect(() => printPrintTemplate(template, {}, { validate: false, cleanupDelayMs: 0 })).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});
