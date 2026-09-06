import type {
  PrintElementSchema,
  PrintElementType,
  PrintRegion,
  PrintElementStyle,
  PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';

let elementSeq = 0;

export function nextPrintElementId(type: PrintElementType): string {
  elementSeq += 1;
  return `${type}_${elementSeq}`;
}

/** 从已载入模板的存量 id 播种计数器，避免新元素 id 撞号（review D07-02）。 */
export function seedPrintElementIdSeq(template: PrintTemplateSchema): void {
  for (const element of template.elements) {
    const match = /^([a-z]+)_(\d+)$/.exec(element.id);
    if (match && Number(match[2]) > elementSeq) {
      elementSeq = Number(match[2]);
    }
  }
}

export function resetPrintElementIdSeq(): void {
  elementSeq = 0;
}

export interface CreateDefaultElementOverrides {
  id?: string;
  region?: PrintRegion;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  style?: PrintElementStyle;
}

type PrintElementOfType<T extends PrintElementType> = Extract<PrintElementSchema, { type: T }>;

const BASE_FRAME = { left: 10, top: 10, width: 60, height: 12 };

/** 设计器拖入元素的默认值工厂：每种 type 的默认 frame/style 单点集中（design.md §8）。 */
export function createDefaultElement<T extends PrintElementType>(
  type: T,
  overrides: CreateDefaultElementOverrides = {},
): PrintElementOfType<T> {
  return buildDefaultElement(type, overrides) as PrintElementOfType<T>;
}

function buildDefaultElement(type: PrintElementType, overrides: CreateDefaultElementOverrides): PrintElementSchema {
  const base = {
    id: overrides.id ?? nextPrintElementId(type),
    region: overrides.region ?? ('body' as PrintRegion),
    left: overrides.left ?? BASE_FRAME.left,
    top: overrides.top ?? BASE_FRAME.top,
    width: overrides.width ?? BASE_FRAME.width,
    height: overrides.height ?? BASE_FRAME.height,
    style: overrides.style ?? {},
  };

  switch (type) {
    case 'text':
      return { ...base, type: 'text', text: '文本', autoGrow: false };
    case 'image':
      return { ...base, type: 'image', fit: 'contain' };
    case 'table':
      return {
        ...base,
        type: 'table',
        source: '',
        columns: [],
        repeatHeader: true,
        footerAggregate: 'lastPage',
      };
    case 'barcode':
      return {
        ...base,
        type: 'barcode',
        barcodeType: 'CODE128',
        textVisible: true,
      };
    case 'qrcode':
      return { ...base, type: 'qrcode', level: 'M' };
    case 'line':
      return { ...base, type: 'line', direction: 'horizontal' };
    case 'rect':
      return { ...base, type: 'rect' };
    case 'pageNumber':
      return {
        ...base,
        type: 'pageNumber',
        region: overrides.region ?? 'footer',
        format: '${$page}/${$pages}',
      };
    case 'printDate':
      return {
        ...base,
        type: 'printDate',
        format: 'YYYY-MM-DD HH:mm:ss',
      };
  }
}
