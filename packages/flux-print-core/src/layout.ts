import type { PrintDiagnostic } from './validate.js';
import { bindPrintTemplate, formatPrintValue, resolveDataPath, type BoundPrintElement, type BoundPrintTemplate } from './bind.js';
import type { PrintTemplateSchema, PrintTableColumn, PrintTableElement } from './schemas.js';
import { getContentRect, getRegionRect, type PrintRect } from './unit.js';

export const ESTIMATE_ROW_HEIGHT_MM = 6;
export const MAX_LAYOUT_PAGES = 500;

/** 页内绝对定位（mm，纸面坐标系：区域原点已展开）。 */
export type PlacedElement = BoundPrintElement & {
  pageLeft: number;
  pageTop: number;
  pageWidth: number;
  pageHeight: number;
  /** 本片包含的数据行（表格切片渲染用）。 */
  sliceRows?: Array<Record<string, string>>;
  /** 本片行高（mm，render-html 闭合排版/渲染几何用）。 */
  rowHeightMm?: number;
  /** 本片是否含表头（repeatHeader 语义）。 */
  sliceHeader?: boolean;
  /** 本片行的列聚合（footerAggregate=everyPage 时每页呈现）。 */
  sliceAggregate?: Record<string, string>;
  /** 全表聚合（footerAggregate=lastPage 时末页呈现）。 */
  totalsAggregate?: Record<string, string>;
};

export interface PrintLayoutPage {
  pageIndex: number;
  pageSize: { width: number; height: number };
  header: PlacedElement[];
  footer: PlacedElement[];
  body: PlacedElement[];
  pageNumberToken: { page: number; pages: number };
}

export interface LayoutMeasure {
  /** 实测表格行高（mm）；返回 undefined 时回退估算。 */
  rowHeight?(element: PrintTableElement & { boundRows?: Array<Record<string, string>> }, rowCount: number): number | undefined;
  /** 实测文本高度（mm）；autoGrow 切分用。 */
  textHeight?(text: string, widthMm: number, style: BoundPrintElement['style']): number | undefined;
}

export interface LayoutPrintOptions {
  measure?: LayoutMeasure;
  maxPages?: number;
}

export interface LayoutPrintResult {
  pages: PrintLayoutPage[];
  diagnostics: PrintDiagnostic[];
}

interface TableSlice {
  element: BoundTableElement;
  rowHeightMm: number;
  headerHeightMm: number;
  aggregateHeightMm: number;
  footerAggregateEveryPage: boolean;
  rows: Array<Record<string, string>>;
  sourceRows: Array<Record<string, unknown>>;
}

interface FlowItem {
  element: BoundPrintElement;
  kind: 'plain' | 'table' | 'auto-grow-text';
  /** 区域坐标 top（mm，含膨胀位移前的语义位置）。 */
  baseTop: number;
  height: number;
  table?: TableSlice;
  text?: string;
}

const TABLE_HEADER_HEIGHT_MM = 6;
const TABLE_AGGREGATE_ROW_HEIGHT_MM = 6;

type BoundTableElement = BoundPrintElement & PrintTableElement;

function tableSlices(element: BoundTableElement, options: LayoutPrintOptions): TableSlice {
  const rows = element.boundRows ?? [];
  const measured = options.measure?.rowHeight?.(element, rows.length);
  const rowHeightMm = element.rowHeight ?? (measured ?? ESTIMATE_ROW_HEIGHT_MM);
  return {
    element,
    rowHeightMm,
    headerHeightMm: TABLE_HEADER_HEIGHT_MM,
    aggregateHeightMm: element.footerAggregate === 'none' ? 0 : TABLE_AGGREGATE_ROW_HEIGHT_MM,
    footerAggregateEveryPage: element.footerAggregate === 'everyPage',
    rows: element.boundRows ?? [],
    sourceRows: element.sourceRows ?? [],
  };
}

/**
 * 分页引擎（design.md §6）：bind 内置 → body 游标分发（表格逐行几何切割、autoGrow 二分切分、
 * 规则 3 膨胀下移、防孤行、页顶强保一行、MAX_PAGES 上限）→ header/footer 按页重插值 $page/$pages。
 * 所有坐标为纸面绝对 mm（区域原点已展开）。
 */
export function layoutPrintTemplate(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  options: LayoutPrintOptions = {},
): LayoutPrintResult {
  const maxPages = options.maxPages ?? MAX_LAYOUT_PAGES;
  const diagnostics: PrintDiagnostic[] = [];
  const bound = bindPrintTemplate(template, data, { page: 1, pages: 1 });
  diagnostics.push(...bound.diagnostics);

  const pageSize = { width: template.page.paper.width, height: template.page.paper.height };
  const contentRect: PrintRect = getContentRect(template.page);
  const bodyRect = getRegionRect(template.page, 'body');
  const headerRect = getRegionRect(template.page, 'header');
  const footerRect = getRegionRect(template.page, 'footer');
  const contentBottom = contentRect.top + contentRect.height;

  const flow: FlowItem[] = bound.template.elements
    .filter((element) => element.region === 'body')
    .map((element) => {
      if (element.type === 'table') {
        const table = tableSlices(element, options);
        const totalHeight = table.headerHeightMm + table.rows.length * table.rowHeightMm + table.aggregateHeightMm;
        return { element, kind: 'table' as const, baseTop: element.top, height: totalHeight, table };
      }
      return {
        element,
        kind: element.type === 'text' && element.autoGrow ? ('auto-grow-text' as const) : ('plain' as const),
        baseTop: element.top,
        height: element.height,
        text: element.type === 'text' ? element.text : undefined,
      };
    })
    .sort((a, b) => a.baseTop - b.baseTop);

  const pages: PrintLayoutPage[] = [];
  let page: PrintLayoutPage | null = null;
  let cursorY = contentRect.top;
  let shift = 0;
  let limitReached = false;
  let flowRestart = false; // 防孤行翻页后，整表从新页顶流排（review M-1）

  const ensurePage = (): PrintLayoutPage | null => {
    if (page) return page;
    if (pages.length >= maxPages) {
      if (!limitReached) {
        diagnostics.push({
          level: 'warning',
          code: 'PRINT_LAYOUT_PAGE_LIMIT',
          message: `分页达到上限 ${maxPages} 页，剩余内容未输出`,
        });
        limitReached = true;
      }
      return null;
    }
    page = {
      pageIndex: pages.length,
      pageSize,
      header: [],
      footer: [],
      body: [],
      pageNumberToken: { page: pages.length + 1, pages: 0 },
    };
    pages.push(page);
    cursorY = contentRect.top;
    return page;
  };

  const place = (element: BoundPrintElement, placed: { pageTop: number; pageHeight: number; pageLeft?: number }): void => {
    page!.body.push({
      ...element,
      pageLeft: placed.pageLeft ?? bodyRect.left + element.left,
      pageTop: placed.pageTop,
      pageWidth: element.width,
      pageHeight: placed.pageHeight,
    });
  };

  ensurePage();

  for (const item of flow) {
    if (limitReached) break;
    const targetTopAbs = contentRect.top + item.baseTop + shift;

    if (item.kind === 'table' && item.table) {
      const { rowHeightMm, headerHeightMm, aggregateHeightMm, rows } = item.table;
      const repeatHeader = item.table.element.repeatHeader !== false;
      let rowIndex = 0;
      let firstPageOfTable = true;
      while (rowIndex < rows.length) {
        const current = ensurePage();
        if (!current) break;
        const start = flowRestart
          ? contentRect.top
          : firstPageOfTable
            ? Math.max(cursorY, Math.min(targetTopAbs, contentBottom))
            : contentRect.top;
        flowRestart = false;
        // 表头：首片必有；续片仅在 repeatHeader（默认 true）时保留
        const reservedHeader = rowIndex === 0 || repeatHeader ? headerHeightMm : 0;
        const avail = contentBottom - start - reservedHeader;
        let rowsThisPage = Math.floor(Math.max(0, avail) / rowHeightMm);
        // 将尽判定以预扣聚合行高后的容量对比剩余行数（review minor-2）：
        // everyPage 恒扣；lastPage 在剩余行数 ≤ 未预扣容量（本片将尽）时预扣
        if (aggregateHeightMm > 0 && (item.table.footerAggregateEveryPage || rowsThisPage >= rows.length - rowIndex)) {
          rowsThisPage = Math.floor(Math.max(0, avail - aggregateHeightMm) / rowHeightMm);
        }
        if (rowsThisPage < 1) {
          const onFreshPage = !firstPageOfTable || page!.body.length === 0;
          if (onFreshPage) {
            rowsThisPage = 1; // 页顶强保一行（防死循环，infeasible 场景：行高超过本页可用）
          } else {
            page = null; // 防孤行：整表移新页（续排首片从页顶流排，review M-1）
            flowRestart = true;
            continue;
          }
        }
        const sliceCount = Math.min(rowsThisPage, rows.length - rowIndex);
        const sliceRows = rows.slice(rowIndex, rowIndex + sliceCount);
        const isLastSlice = rowIndex + sliceCount >= rows.length;
        const aggH = aggregateHeightMm > 0 && (item.table.footerAggregateEveryPage || isLastSlice) ? aggregateHeightMm : 0;
        const placedHeight = reservedHeader + sliceCount * rowHeightMm + aggH;
        const placed: PlacedElement = {
          ...item.element,
          pageLeft: bodyRect.left + item.element.left,
          pageTop: start,
          pageWidth: item.element.width,
          pageHeight: placedHeight,
          rowHeightMm,
          sliceRows,
          sliceHeader: reservedHeader > 0,
        };
        if (item.table.footerAggregateEveryPage && aggregateHeightMm > 0) {
          placed.sliceAggregate = computeAggregate(item.table, sliceRows);
        }
        if (isLastSlice && aggregateHeightMm > 0) {
          placed.totalsAggregate = computeAggregate(item.table, rows);
        }
        page!.body.push(placed);
        cursorY = start + placedHeight;
        rowIndex += sliceCount;
        firstPageOfTable = false;
        if (rowIndex < rows.length) {
          page = null; // 翻页续排
        }
      }
      const expansion = headerHeightMm + rows.length * rowHeightMm + aggregateHeightMm - item.element.height;
      if (expansion > 0) shift += expansion;
      continue;
    }

    const startY = Math.max(targetTopAbs, cursorY);

    if (item.kind === 'auto-grow-text') {
      // 先用当前页剩余空间放首片（可切），再续排新页；无可切（无 measure 或切点为 0）才走整体移页
      const available = contentBottom - startY;
      const split = binarySplitText(item.text ?? '', available, item.element.width, options, item.element.style);
      if (split && split.rest.length > 0) {
        place(item.element, { pageTop: startY, pageHeight: available });
        applySlice(page!, item.element.id, split.first);
        page = null;
        const tail = ensurePage();
        if (!tail) break;
        place(item.element, { pageTop: contentRect.top, pageHeight: item.height });
        applySlice(tail, item.element.id, split.rest);
        cursorY = contentRect.top + item.height;
        continue;
      }
    }

    if (startY + item.height > contentBottom) {
      // 翻页前先试流式锚点（review B-1）：当前页游标之后放得下就跟随表格末片
      if (cursorY + item.height <= contentBottom) {
        place(item.element, { pageTop: cursorY, pageHeight: item.height });
        cursorY += item.height;
        continue;
      }
      page = null; // 当前页放不下 → 整体移下页，从页顶流排
      const next = ensurePage();
      if (!next) break;
      const restarted = Math.max(contentRect.top + item.baseTop + shift, cursorY);
      const clipped = restarted + item.height > contentBottom ? contentBottom - item.height : restarted;
      place(item.element, { pageTop: Math.max(clipped, contentRect.top), pageHeight: item.height });
      cursorY = Math.max(clipped, contentRect.top) + item.height;
      continue;
    }

    place(item.element, { pageTop: startY, pageHeight: item.height });
    cursorY = startY + item.height;
  }

  // $page/$pages 真实注入：header/footer 按页重绑定（pageNumber 契约上仅位于 header/footer）
  const regionTemplate: PrintTemplateSchema = {
    ...template,
    elements: template.elements.filter((element) => element.region !== 'body'),
  };
  const total = pages.length;
  for (const layoutPage of pages) {
    const pageNo = layoutPage.pageIndex + 1;
    const pageBound = bindPrintTemplate(regionTemplate, data, { page: pageNo, pages: total });
    layoutPage.pageNumberToken = { page: pageNo, pages: total };
    layoutPage.header = placeRegion(pageBound.template, 'header', headerRect);
    layoutPage.footer = placeRegion(pageBound.template, 'footer', footerRect);
  }

  return { pages, diagnostics };
}

function binarySplitText(
  text: string,
  fitHeightMm: number,
  widthMm: number,
  options: LayoutPrintOptions,
  style: BoundPrintElement['style'],
): { first: string; rest: string } | null {
  if (!options.measure?.textHeight || fitHeightMm <= 0) return null;
  let low = 0;
  let high = text.length;
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const height = options.measure.textHeight(text.slice(0, mid), widthMm, style) ?? Number.POSITIVE_INFINITY;
    if (height <= fitHeightMm) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best <= 0 || best >= text.length) return null;
  return { first: text.slice(0, best), rest: text.slice(best) };
}

function applySlice(page: PrintLayoutPage, elementId: string, text: string): void {
  const target = page.body.find((element) => element.id === elementId);
  if (target) {
    (target as { text?: string }).text = text;
  }
}

function computeAggregate(
  table: TableSlice,
  sliceRows: Array<Record<string, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const column of table.element.columns as PrintTableColumn[]) {
    if (!column.aggregate || !column.field) continue;
    const values = table.sourceRows.length > 0
      ? table.sourceRows
          .map((row) => {
            try {
              return Number(resolveDataPath(row, column.field!));
            } catch {
              return Number.NaN;
            }
          })
          .filter((value) => Number.isFinite(value))
      : sliceRows.map((row) => Number(resolveDataPath(row, column.label!))).filter((value) => Number.isFinite(value));
    let value = 0;
    switch (column.aggregate) {
      case 'sum': value = values.reduce((acc, v) => acc + v, 0); break;
      case 'count': value = sliceRows.length; break;
      case 'avg': value = values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0; break;
      case 'min': value = values.length > 0 ? Math.min(...values) : 0; break;
      case 'max': value = values.length > 0 ? Math.max(...values) : 0; break;
    }
    result[column.label] = formatPrintValue(value, column.format);
  }
  return result;
}

function placeRegion(bound: BoundPrintTemplate, region: 'header' | 'footer', rect: PrintRect): PlacedElement[] {
  return bound.elements
    .filter((element) => element.region === region)
    .map((element) => ({
      ...element,
      pageLeft: rect.left + element.left,
      pageTop: rect.top + element.top,
      pageWidth: element.width,
      pageHeight: element.height,
    }));
}
