import { renderPrintTemplateToHtml, type RenderHtmlOptions } from './render-html.js';
import { validatePrintTemplate } from './validate.js';
import type { PrintTemplateSchema } from './schemas.js';

export interface PrintPrintOptions extends RenderHtmlOptions {
  /** 打印完成（print 调用后）iframe 的保留毫秒数；默认 1000。 */
  cleanupDelayMs?: number;
  /** 打印前校验（design.md §10 闸门）：error 级诊断抛 PRINT_VALIDATION_BLOCKED；默认 true。 */
  validate?: boolean;
}

function assertPrintable(template: PrintTemplateSchema, validate: boolean): void {
  if (!validate) return;
  const errors = validatePrintTemplate(template).filter((diagnostic) => diagnostic.level === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[flux-print-core] PRINT_VALIDATION_BLOCKED: 模板存在 ${errors.length} 个 error 级诊断（${errors.map((e) => e.code).join('、')}）`,
    );
  }
}

/** 隐藏打印 iframe 挂载：写入 srcdoc 并返回元素（单独导出便于测试注入）。 */
export function mountPrintFrame(html: string, doc: Document = document): HTMLIFrameElement {
  const iframe = doc.createElement('iframe');
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;');
  iframe.title = 'print-frame';
  iframe.setAttribute('data-print-frame', '');
  doc.body.appendChild(iframe);
  iframe.srcdoc = html;
  return iframe;
}

/** 触发打印并按延迟清理 iframe。 */
export function printFrame(
  iframe: HTMLIFrameElement,
  options: { cleanupDelayMs?: number; win?: { print: () => void } } = {},
): void {
  const target = options.win ?? (iframe.contentWindow as { print: () => void } | null);
  if (!target || typeof target.print !== 'function') {
    iframe.remove();
    throw new Error('[flux-print-core] print failed: no printable frame window (print-blocked)');
  }
  try {
    target.print();
  } finally {
    const delay = options.cleanupDelayMs ?? 1000;
    setTimeout(() => iframe.remove(), delay);
  }
}

/**
 * 浏览器打印（P3.2，design.md §7）：模板 + 数据 → 自包含分页 HTML → 隐藏 iframe srcdoc → print。
 * 同源产物：内部消费 renderPrintTemplateToHtml。
 */
export function printPrintTemplate(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  options: PrintPrintOptions = {},
): void {
  if (typeof document === 'undefined') {
    throw new Error('[flux-print-core] print requires a DOM document (print-blocked)');
  }
  assertPrintable(template, options.validate !== false);
  const html = renderPrintTemplateToHtml(template, data, options);
  const iframe = mountPrintFrame(html, document);
  // review D23-01：无条件等 srcdoc 加载完成后再 print（同步调用会打出 about:blank）
  iframe.addEventListener('load', () => printFrame(iframe, { cleanupDelayMs: options.cleanupDelayMs }), { once: true });
}
