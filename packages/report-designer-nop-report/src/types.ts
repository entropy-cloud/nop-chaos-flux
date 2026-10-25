/**
 * 中间对象类型：前端通用模型与 nop-report 外部模型（ExcelWorkbook + Xpt*Model
 * 的 XDSL 序列化形态）之间的 codec 层交换形状。
 *
 * `raw` 是刻意保留的无损扩展点：导入时 UI 未建模的字段挂入 `raw`，
 * 导出时原样带回（docs/architecture/report-designer/codec-design.md §3.3/§6）。
 */

export interface ExcelWorkbookLike {
  props?: Record<string, unknown>;
  styles?: unknown[];
  sheets: ExcelSheetLike[];
  raw?: Record<string, unknown>;
}

export interface ExcelSheetLike {
  id?: string;
  name: string;
  props?: Record<string, unknown>;
  rows?: Record<string, unknown>;
  columns?: Record<string, unknown>;
  cells?: Record<string, ExcelCellLike>;
  merges?: unknown[];
  raw?: Record<string, unknown>;
}

export interface ExcelCellLike {
  id?: string;
  name?: string;
  value?: unknown;
  formula?: string;
  type?: string;
  styleId?: string;
  comment?: string;
  linkUrl?: string;
  protected?: boolean;
  richText?: unknown;
  mergeAcross?: number;
  mergeDown?: number;
  raw?: Record<string, unknown>;
}

export interface XptWorkbookLike {
  model?: Record<string, unknown>;
  sheets?: Record<string, XptSheetLike>;
}

export interface XptSheetLike {
  model?: Record<string, unknown>;
  cells?: Record<string, XptCellLike>;
}

export interface XptCellLike {
  model?: Record<string, unknown>;
}
