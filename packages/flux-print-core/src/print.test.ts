// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from './schemas.js';
import { mountPrintFrame, printFrame, printPrintTemplate } from './print.js';

function el(partial: Partial<PrintElementSchema> & { type: PrintElementSchema['type']; id: string }): PrintElementSchema {
  return { region: 'body', left: 0, top: 0, width: 40, height: 10, style: {}, ...partial } as PrintElementSchema;
}

function makeTemplate(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), name: '测试模板', elements };
}

function renderHtml(): string {
  return '<html><body>rendered</body></html>';
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('mountPrintFrame / printFrame', () => {
  it('mounts a hidden titled iframe with the rendered document', () => {
    const iframe = mountPrintFrame(renderHtml());
    expect(document.body.querySelector('iframe[data-print-frame]')).toBe(iframe);
    expect(iframe.getAttribute('title')).toBe('print-frame');
    expect(iframe.srcdoc).toBe(renderHtml());
    expect(iframe.getAttribute('style')).toContain('width:0');
  });

  it('calls window.print on the frame window and cleans up', () => {
    const iframe = mountPrintFrame(renderHtml());
    const printSpy = vi.fn();
    printFrame(iframe, { win: { print: printSpy }, cleanupDelayMs: 0 });
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('throws print-blocked when no frame window exists and removes the frame', () => {
    const iframe = mountPrintFrame(renderHtml());
    Object.defineProperty(iframe, 'contentWindow', { value: null });
    expect(() => printFrame(iframe, {})).toThrowError(/print-blocked/);
    expect(document.body.querySelector('iframe[data-print-frame]')).toBeNull();
  });
});

describe('printPrintTemplate', () => {
  it('renders into a hidden iframe and prints only after the load event (load contract)', () => {
    const printSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: keyof HTMLElementTagNameMap, ...rest: unknown[]) => {
      const element = (originalCreateElement as (t: string, ...r: unknown[]) => HTMLElement)(tag, ...rest) as HTMLIFrameElement;
      if (tag === 'iframe') {
        Object.defineProperty(element, 'contentWindow', {
          value: { print: printSpy },
          configurable: true,
        });
      }
      return element;
    }) as typeof document.createElement);

    printPrintTemplate(makeTemplate([el({ type: 'text', id: 't1', text: '打印内容' })]), {}, { cleanupDelayMs: 0 });

    // P5 D23-01 契约：srcdoc 未加载完成前不得同步 print（防 about:blank 竞态）
    const iframe = document.body.querySelector('iframe[data-print-frame]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe!.srcdoc).toContain('打印内容');
    expect(printSpy).not.toHaveBeenCalled();

    // load 事件触发后才打印
    iframe!.dispatchEvent(new Event('load'));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('throws print-blocked outside a DOM document', () => {
    const original = globalThis.document;
    // @ts-expect-error 模拟无 DOM 环境
    delete globalThis.document;
    try {
      expect(() => printPrintTemplate(makeTemplate([]), {})).toThrowError(/print-blocked/);
    } finally {
      globalThis.document = original;
    }
  });
});
