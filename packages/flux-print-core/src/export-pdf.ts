import { renderPrintPages, type RenderHtmlOptions } from './render-html.js';
import { validatePrintTemplate } from './validate.js';
import type { PrintTemplateSchema } from './schemas.js';

export interface ExportPdfOptions extends RenderHtmlOptions {
  /** 下载文件名（不含 .pdf 后缀时自动补）。 */
  fileName?: string;
  /** 导出前校验（design.md §10 闸门）：error 级诊断抛 PRINT_VALIDATION_BLOCKED；默认 true。 */
  validate?: boolean;
}

function assertExportable(template: PrintTemplateSchema, validate: boolean): void {
  if (!validate) return;
  const errors = validatePrintTemplate(template).filter((diagnostic) => diagnostic.level === 'error');
  if (errors.length > 0) {
    throw new Error(
      `[flux-print-core] PRINT_VALIDATION_BLOCKED: 模板存在 ${errors.length} 个 error 级诊断（${errors.map((e) => e.code).join('、')}）`,
    );
  }
}

/** 逐页渲染为位图（html2canvas）；独立导出便于测试注入。 */
export async function renderPageToCanvas(pageHtml: string, widthMm: number, heightMm: number): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.setAttribute('style', `position:fixed;left:-10000px;top:0;width:${widthMm}mm;height:${heightMm}mm;`);
  container.innerHTML = pageHtml;
  document.body.appendChild(container);
  try {
    const { default: html2canvas } = await import('html2canvas');
    return await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
  } finally {
    container.remove();
  }
}

/**
 * PDF 导出（P3.3，design.md §7 v1 位图路线）：模板 + 数据 → 分页页容器 → html2canvas 逐页位图
 * → jspdf 自定义纸张尺寸合成下载。同源产物：内部消费 renderPrintPages。
 */
export async function exportPrintTemplateToPdf(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  options: ExportPdfOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('[flux-print-core] pdf export requires a DOM document (print-blocked)');
  }
  assertExportable(template, options.validate !== false);
  const pageItems = renderPrintPages(template, data, options);
  if (pageItems.length === 0) {
    throw new Error('[flux-print-core] nothing to export: template rendered 0 pages (EXPORT_EMPTY)');
  }

  const { default: JsPDF } = await import('jspdf');
  const first = pageItems[0]!;
  const pdf = new JsPDF({
    unit: 'mm',
    format: [first.widthMm, first.heightMm],
    orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait',
  });

  for (let index = 0; index < pageItems.length; index += 1) {
    const item = pageItems[index]!;
    if (index > 0) {
      pdf.addPage([item.widthMm, item.heightMm], item.widthMm > item.heightMm ? 'landscape' : 'portrait');
    }
    const canvas = await renderPageToCanvas(item.html, item.widthMm, item.heightMm);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, item.widthMm, item.heightMm);
  }

  const base = options.fileName ?? template.name ?? 'print-document';
  pdf.save(base.endsWith('.pdf') ? base : `${base}.pdf`);
}
