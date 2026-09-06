// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from './schemas.js';
import { renderPrintPages } from './render-html.js';
import { exportPrintTemplateToPdf } from './export-pdf.js';

vi.mock('./render-html.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./render-html.js')>();
  return {
    ...actual,
    renderPrintPages: vi.fn((...args: [PrintTemplateSchema, Record<string, unknown>, Record<string, unknown>?]) =>
      actual.renderPrintPages(...args)),
  };
});

const mockedRenderPages = vi.mocked(renderPrintPages);

function el(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function makeTemplate(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), name: '测试模板', elements };
}

const fakePage = (dataUrl: string) => ({ toDataURL: () => dataUrl });

const html2canvasMock = vi.fn(async () => fakePage('data:image/jpeg;base64,page'));
const addImage = vi.fn();
const addPage = vi.fn();
const save = vi.fn();

vi.mock('html2canvas', () => ({ default: html2canvasMock }));
vi.mock('jspdf', () => ({
  default: class {
    addImage = addImage;
    addPage = addPage;
    save = save;
    constructor(public options: unknown) {}
  },
}));

beforeEach(() => {
  html2canvasMock.mockClear();
  addImage.mockClear();
  addPage.mockClear();
  save.mockClear();
  mockedRenderPages.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('exportPrintTemplateToPdf', () => {
  it('throws EXPORT_EMPTY when zero pages are rendered', async () => {
    mockedRenderPages.mockReturnValueOnce([]);
    await expect(exportPrintTemplateToPdf(makeTemplate([]), {})).rejects.toThrowError(/EXPORT_EMPTY/);
  });

  it('renders each page to canvas and assembles a pdf with page order and size', async () => {
    const element = el({
      type: 'table',
      id: 'tb',
      width: 160,
      height: 40,
      source: '${orders}',
      rowHeight: 10,
      columns: [{ label: '名称', field: 'name' }],
      footerAggregate: 'lastPage',
    } as never);
    const orders = Array.from({ length: 30 }, (_, index) => ({ name: `row-${index}` }));

    await exportPrintTemplateToPdf(makeTemplate([element]), { orders }, { fileName: '出库单' });

    expect(html2canvasMock).toHaveBeenCalledTimes(2); // 30 行 × 10mm → 2 页
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(addImage.mock.calls[0]?.[4]).toBe(210); // 宽 mm
    expect(addImage.mock.calls[0]?.[5]).toBe(297); // 高 mm
    expect(save).toHaveBeenCalledWith('出库单.pdf');
  });

  it('appends .pdf to the file name when missing', async () => {
    await exportPrintTemplateToPdf(makeTemplate([el({ type: 'text', id: 't1', text: 'x' })]), {}, { fileName: 'doc' });
    expect(save).toHaveBeenCalledWith('doc.pdf');
  });

  it('throws print-blocked outside a DOM document', async () => {
    const original = globalThis.document;
    // @ts-expect-error 模拟无 DOM 环境
    delete globalThis.document;
    try {
      await expect(exportPrintTemplateToPdf(makeTemplate([]), {})).rejects.toThrowError(/print-blocked/);
    } finally {
      globalThis.document = original;
    }
  });
});
