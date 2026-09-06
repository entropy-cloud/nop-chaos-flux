/**
 * Print template schema types (design contract: docs/components/print/design.md §4).
 *
 * 协议单位固定 mm；坐标相对内容区原点（header/body/footer 各自区域原点见 region 语义）。
 * PaperSettings 形状复制自 word-editor-core/paper-settings.ts（避免跨包依赖），数值保持一致。
 */

export type PrintDirection = 'vertical' | 'horizontal';

export interface PrintPaperSettings {
  width: number;
  height: number;
  direction: PrintDirection;
  /** [top, right, bottom, left]，单位 mm。 */
  margins: [number, number, number, number];
}

export const PAPER_SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  a2: { width: 420, height: 594 },
  a3: { width: 297, height: 420 },
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  b4: { width: 257, height: 364 },
  b5: { width: 182, height: 257 },
};

export const DEFAULT_PRINT_PAGE: PrintPageSchema = {
  paper: {
    width: PAPER_SIZE_PRESETS.a4.width,
    height: PAPER_SIZE_PRESETS.a4.height,
    direction: 'vertical',
    margins: [15, 15, 15, 15],
  },
  paperName: 'a4',
  unit: 'mm',
};

export type PrintUnit = 'mm';

export type PrintRegion = 'header' | 'body' | 'footer';

export type PrintElementType =
  | 'text'
  | 'image'
  | 'table'
  | 'barcode'
  | 'qrcode'
  | 'line'
  | 'rect'
  | 'pageNumber'
  | 'printDate';

export const PRINT_ELEMENT_TYPES: readonly PrintElementType[] = [
  'text',
  'image',
  'table',
  'barcode',
  'qrcode',
  'line',
  'rect',
  'pageNumber',
  'printDate',
];

/** 结构化样式白名单（design.md §4.1）：禁止任意 CSS 字符串。 */
export interface PrintElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed';
  borderRadius?: number;
  opacity?: number;
}

export interface PrintElementBase {
  id: string;
  type: PrintElementType;
  region: PrintRegion;
  /** mm，相对所属区域原点。 */
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  style: PrintElementStyle;
}

export interface PrintTextElement extends PrintElementBase {
  type: 'text';
  /** SchemaTpl：支持 `${var | FILTER}` 插值；纯静态文本直接写内容。 */
  text: string;
  /** 快捷绑定：等价于 text 为 `${field}`；与 text 同时出现时 field 优先。 */
  field?: string;
  autoGrow?: boolean;
}

export interface PrintImageElement extends PrintElementBase {
  type: 'image';
  src?: string;
  field?: string;
  fit: 'contain' | 'cover' | 'fill';
}

export interface PrintTableColumn {
  label: string;
  /** 行对象取值路径；缺失时用 text 行级模板。 */
  field?: string;
  /** SchemaTpl 行级模板（$row/$rowIndex 上下文）。 */
  text?: string;
  width?: number | 'auto';
  align?: 'left' | 'center' | 'right';
  format?: PrintValueFormat;
  aggregate?: 'sum' | 'count' | 'avg' | 'min' | 'max';
}

export interface PrintTableElement extends PrintElementBase {
  type: 'table';
  /** SchemaTpl：求值结果必须是数组。 */
  source: string;
  columns: PrintTableColumn[];
  repeatHeader?: boolean;
  footerAggregate?: 'none' | 'lastPage' | 'everyPage';
  rowHeight?: number;
  zebra?: boolean;
}

export type BarcodeType =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'ITF'
  | 'CODABAR';

export interface PrintBarcodeElement extends PrintElementBase {
  type: 'barcode';
  value?: string;
  field?: string;
  barcodeType: BarcodeType;
  textVisible?: boolean;
}

export type QrcodeLevel = 'L' | 'M' | 'Q' | 'H';

export interface PrintQrcodeElement extends PrintElementBase {
  type: 'qrcode';
  value?: string;
  field?: string;
  level: QrcodeLevel;
  foreground?: string;
}

export interface PrintLineElement extends PrintElementBase {
  type: 'line';
  direction: 'horizontal' | 'vertical';
}

export interface PrintRectElement extends PrintElementBase {
  type: 'rect';
}

export interface PrintPageNumberElement extends PrintElementBase {
  type: 'pageNumber';
  /** SchemaTpl；可用 ${$page}/${$pages}。默认 '${$page}/${$pages}'。 */
  format?: string;
}

export interface PrintPrintDateElement extends PrintElementBase {
  type: 'printDate';
  /** dayjs 格式，默认 'YYYY-MM-DD HH:mm:ss'。 */
  format?: string;
}

export type PrintElementSchema =
  | PrintTextElement
  | PrintImageElement
  | PrintTableElement
  | PrintBarcodeElement
  | PrintQrcodeElement
  | PrintLineElement
  | PrintRectElement
  | PrintPageNumberElement
  | PrintPrintDateElement;

/** 声明式格式化（design.md §4.3，参考 open-press 结构，独立实现）。 */
export interface PrintValueFormat {
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean';
  digits?: number;
  prefix?: string;
  suffix?: string;
  dateFormat?: string;
  trueText?: string;
  falseText?: string;
}

/** 设计器字段目录（design.md §5）：只服务绑定面板，运行期不依赖。 */
export interface PrintFieldMeta {
  path: string;
  label: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  children?: PrintFieldMeta[];
}

export interface PrintPageSchema {
  paper: PrintPaperSettings;
  /** PAPER_SIZE_PRESETS 键；'custom' 表示仅按 paper.width/height。 */
  paperName?: string;
  unit: PrintUnit;
  /** mm，页眉区高度（内容区上界）。 */
  headerHeight?: number;
  /** mm，页脚区高度（内容区下界）。 */
  footerHeight?: number;
  background?: string;
  watermark?: { text: string; opacity?: number; rotate?: number };
}

export interface PrintTemplateSchema {
  kind: 'print-template';
  schemaVersion: 1;
  name: string;
  page: PrintPageSchema;
  elements: PrintElementSchema[];
  dataSchema?: PrintFieldMeta[];
  testData?: Record<string, unknown>;
}

export function createEmptyPrintTemplate(name = '未命名模板'): PrintTemplateSchema {
  return {
    kind: 'print-template',
    schemaVersion: 1,
    name,
    page: structuredClone(DEFAULT_PRINT_PAGE),
    elements: [],
  };
}
