import { createBarcodeSvg, createQrcodeSvg } from './barcode.js';
import { layoutPrintTemplate, type LayoutMeasure, type PrintLayoutPage, type PlacedElement } from './layout.js';
import type { BoundPrintElement } from './bind.js';
import type { PrintTemplateSchema } from './schemas.js';

export interface RenderHtmlOptions {
  measure?: LayoutMeasure;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function px(mm: number): string {
  return `${Number(mm.toFixed(4))}mm`;
}

/** CSS 值消毒：阻断经 style 属性值注入的 CSS 逃逸（review D15-01）。 */
function cssSafe(value: string): string {
  return value.replace(/[;{}\\]/g, '').trim();
}

function safeColor(value: string | undefined, fallback?: string): string | undefined {
  if (value === undefined) return fallback;
  const safe = cssSafe(value);
  return safe.length > 0 ? safe : fallback;
}

function elementFrameStyle(placed: PlacedElement, rotate: number | undefined): string {
  const parts = [
    'position:absolute',
    `left:${px(placed.pageLeft)}`,
    `top:${px(placed.pageTop)}`,
    `width:${px(placed.pageWidth)}`,
    `height:${px(placed.pageHeight)}`,
    'overflow:hidden',
  ];
  if (rotate) parts.push(`transform:rotate(${rotate}deg)`);
  if (placed.zIndex !== undefined) parts.push(`z-index:${placed.zIndex}`);
  return parts.join(';');
}

function textStyle(placed: PlacedElement): string {
  const style = placed.style;
  const parts = [
    `font-size:${style.fontSize ?? 12}px`,
    `text-align:${style.textAlign ?? 'left'}`,
    `line-height:${style.lineHeight ?? 1.4}`,
    'width:100%;height:100%',
  ];
  if (style.fontFamily) parts.push(`font-family:${cssSafe(style.fontFamily)}`);
  const color = safeColor(style.color);
  if (color) parts.push(`color:${color}`);
  const background = safeColor(style.backgroundColor);
  if (background) parts.push(`background:${background}`);
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) parts.push(`font-style:${style.fontStyle}`);
  if (style.opacity !== undefined) parts.push(`opacity:${style.opacity}`);
  return parts.join(';');
}

function renderBoundElement(placed: PlacedElement): string {
  const element = placed as BoundPrintElement & { zebra?: boolean };
  const frame = `class="fmt-el" style="${elementFrameStyle(placed, element.rotate)}"`;

  if (element.type === 'table') {
    const columns = element.columns;
    const rows = placed.sliceRows ?? [];
    // D21-04 闭环：tr 高度取排版行高；td 字号/行高按片推导，保证渲染几何 ≤ 排版几何
    const rowHeightMm = placed.rowHeightMm ?? 6;
    const zebra = (element as { zebra?: boolean }).zebra;
    const rowPx = rowHeightMm * 3.7795;
    const paddingPx = 2 * 1.51; // 0.4mm × 2
    const borderPx = 1;
    const fontSizePx = Math.max(8, Math.min((placed.style.fontSize ?? 12), (rowPx - paddingPx - borderPx) / 1.1));
    const fontFamily = placed.style.fontFamily ? `font-family:${cssSafe(placed.style.fontFamily)};` : '';
    const header = placed.sliceHeader
      ? `<thead><tr style="height:${px(rowHeightMm)}">${columns
          .map((column) => `<th class="fmt-th" style="font-size:${fontSizePx.toFixed(2)}px;line-height:1.1;padding:0.4mm 2mm;${column.width && column.width !== 'auto' ? `width:${px(column.width)};` : ''}text-align:${column.align ?? 'left'}">${escapeHtml(column.label)}</th>`)
          .join('')}</tr></thead>`
      : '';
    const body = `<tbody>${rows
      .map((row, rowIndex) => `<tr style="height:${px(rowHeightMm)};${zebra && rowIndex % 2 === 1 ? 'background:rgba(0,0,0,0.04);' : ''}">${columns
        .map((column) => `<td class="fmt-td" style="font-size:${fontSizePx.toFixed(2)}px;line-height:1.1;padding:0.4mm 2mm;text-align:${column.align ?? 'left'};${column.width && column.width !== 'auto' ? `width:${px(column.width)};` : ''}">${escapeHtml(row[column.label] ?? '')}</td>`)
        .join('')}</tr>`)
      .join('')}</tbody>`;
    const aggregate = placed.totalsAggregate ?? placed.sliceAggregate;
    const aggregateRow = aggregate
      ? `<tfoot><tr style="height:${px(placed.rowHeightMm ?? 6)}">${columns
          .map((column) => `<td class="fmt-td fmt-aggregate" style="font-size:${fontSizePx.toFixed(2)}px;line-height:1.1;padding:0.4mm 2mm;text-align:${column.align ?? 'left'}">${escapeHtml(aggregate[column.label] ?? '')}</td>`)
          .join('')}</tr></tfoot>`
      : '';
    return `<div ${frame}><table class="fmt-table" style="width:100%;border-collapse:collapse;${fontFamily}table-layout:fixed">${header}${body}${aggregateRow}</table></div>`;
  }
  if (element.type === 'image') {
    if (!element.src) return `<div ${frame}></div>`;
    return `<div ${frame}><img class="fmt-img" src="${escapeHtml(element.src)}" style="width:100%;height:100%;object-fit:${element.fit ?? 'contain'}"/></div>`;
  }
  if (element.type === 'barcode') {
    const svg = createBarcodeSvg(element.value ?? '', { format: element.barcodeType, textVisible: element.textVisible });
    return `<div ${frame}><div class="fmt-barcode" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden">${svg}</div></div>`;
  }
  if (element.type === 'qrcode') {
    const svg = createQrcodeSvg(element.value ?? '', { level: element.level, foreground: element.foreground });
    return `<div ${frame}><div class="fmt-qrcode" style="width:100%;height:100%">${svg}</div></div>`;
  }
  if (element.type === 'line') {
    const width = placed.style.borderWidth ?? 1;
    const color = safeColor(placed.style.borderColor, '#000');
    const border = element.direction === 'vertical'
      ? `border-left:${width}px solid ${color};height:100%`
      : `border-top:${width}px solid ${color};width:100%`;
    return `<div class="fmt-line" style="${elementFrameStyle(placed, element.rotate)};${border}"></div>`;
  }
  if (element.type === 'rect') {
    const width = placed.style.borderWidth ?? 1;
    const color = safeColor(placed.style.borderColor, '#000');
    return `<div class="fmt-rect" style="${elementFrameStyle(placed, element.rotate)};border:${width}px solid ${color}"></div>`;
  }

  return `<div ${frame}><div style="${textStyle(placed)}">${escapeHtml(element.text ?? '')}</div></div>`;
}

function renderPage(page: PrintLayoutPage, template: PrintTemplateSchema, index: number, total: number): string {
  const width = template.page.paper.width;
  const height = template.page.paper.height;
  const breakStyle = index < total - 1 ? 'page-break-after:always;' : '';
  const watermark = template.page.watermark
    ? `<div class="fmt-watermark" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:${template.page.watermark.opacity ?? 0.12};transform:rotate(${template.page.watermark.rotate ?? -30}deg);font-size:48px;color:#888;white-space:nowrap">${escapeHtml(template.page.watermark.text)}</div>`
    : '';
  const all = [...page.header, ...page.body, ...page.footer]
    .map((placed) => renderBoundElement(placed))
    .join('\n');
  return `<div class="fmt-page" data-page="${page.pageIndex + 1}" style="position:relative;width:${px(width)};height:${px(height)};${breakStyle}background:${template.page.background ?? '#fff'}">${watermark}${all}</div>`;
}

/** 模板 + 数据 → 分页 HTML（bind → layout → render，design.md §7 链路）。 */
export function renderPrintTemplateToHtml(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  options: RenderHtmlOptions = {},
): string {
  const { pages } = layoutPrintTemplate(template, data, options);
  const paper = template.page.paper;
  // paper.width/height 即字面页面尺寸（横向纸张由设计器交换宽高写入，direction 仅作元数据），
  // @page 与 .fmt-page 必须同源，否则打印几何与版面几何错位。
  const body = pages.map((page, index) => renderPage(page, template, index, pages.length)).join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(template.name)}</title>
<style>
@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }
html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.fmt-page { box-sizing: border-box; overflow: hidden; }
.fmt-el { box-sizing: border-box; overflow: hidden; }
.fmt-th, .fmt-td { border: 1px solid #999; padding: 1mm 2mm; text-align: left; word-break: break-all; }
.fmt-aggregate { font-weight: bold; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** 逐页输出（PDF 导出与同源预览消费）：每页独立内联标记 + 纸张尺寸。 */
export function renderPrintPages(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  options: RenderHtmlOptions = {},
): Array<{ html: string; widthMm: number; heightMm: number }> {
  const { pages } = layoutPrintTemplate(template, data, options);
  return pages.map((page, index) => ({
    html: renderPage(page, template, index, pages.length),
    widthMm: template.page.paper.width,
    heightMm: template.page.paper.height,
  }));
}
