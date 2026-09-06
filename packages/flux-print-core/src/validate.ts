import {
  PAPER_SIZE_PRESETS,
  PRINT_ELEMENT_TYPES,
  type PrintPageSchema,
  type PrintTemplateSchema,
} from './schemas.js';
import { getRegionRect } from './unit.js';

export type PrintDiagnosticLevel = 'error' | 'warning';

export interface PrintDiagnostic {
  level: PrintDiagnosticLevel;
  code: string;
  message: string;
  elementId?: string;
}

const EPSILON = 0.01;

const BARCODE_TYPES: ReadonlySet<string> = new Set([
  'CODE128',
  'CODE39',
  'EAN13',
  'EAN8',
  'UPC',
  'ITF',
  'CODABAR',
]);

const QRCODE_LEVELS: ReadonlySet<string> = new Set(['L', 'M', 'Q', 'H']);

export function validatePrintTemplate(template: PrintTemplateSchema): PrintDiagnostic[] {
  const diagnostics: PrintDiagnostic[] = [];
  const push = (
    level: PrintDiagnosticLevel,
    code: string,
    message: string,
    elementId?: string,
  ): void => {
    diagnostics.push(elementId ? { level, code, message, elementId } : { level, code, message });
  };

  if (template.kind !== 'print-template') {
    push('error', 'PRINT_KIND_INVALID', `模板 kind 必须为 'print-template'，实际为 ${String(template.kind)}`);
  }

  const page: PrintPageSchema | undefined = template.page;
  if (!page?.paper) {
    push('error', 'PRINT_PAGE_MISSING', '模板缺少 page 定义');
    return diagnostics;
  }

  if (page.paperName && page.paperName !== 'custom' && !PAPER_SIZE_PRESETS[page.paperName]) {
    push('warning', 'PRINT_PAPER_UNKNOWN', `未知纸张预设：${page.paperName}`);
  }

  if (!Array.isArray(template.elements)) {
    push('error', 'PRINT_ELEMENTS_INVALID', 'elements 必须是数组');
    return diagnostics;
  }

  const seenIds = new Set<string>();
  for (const element of template.elements) {
    if (!element.id) {
      push('error', 'PRINT_ID_REQUIRED', '元素缺少 id');
    } else if (seenIds.has(element.id)) {
      push('error', 'PRINT_ID_DUPLICATE', `元素 id 重复：${element.id}`, element.id);
    } else {
      seenIds.add(element.id);
    }

    if (!PRINT_ELEMENT_TYPES.includes(element.type)) {
      push('error', 'PRINT_TYPE_UNKNOWN', `未知元素类型：${String(element.type)}`, element.id || undefined);
      continue;
    }

    if (element.type === 'image' && !element.fit) {
      push('error', 'PRINT_FIELD_REQUIRED', 'image 元素缺少必填字段 fit', element.id);
    }
    if (element.type === 'barcode') {
      if (!element.barcodeType) {
        push('error', 'PRINT_FIELD_REQUIRED', 'barcode 元素缺少必填字段 barcodeType', element.id);
      } else if (!BARCODE_TYPES.has(element.barcodeType)) {
        push('error', 'PRINT_FIELD_INVALID', `不支持的条码格式：${element.barcodeType}`, element.id);
      }
    }
    if (element.type === 'qrcode') {
      if (!element.level) {
        push('error', 'PRINT_FIELD_REQUIRED', 'qrcode 元素缺少必填字段 level', element.id);
      } else if (!QRCODE_LEVELS.has(element.level)) {
        push('error', 'PRINT_FIELD_INVALID', `不支持的二维码纠错级：${element.level}`, element.id);
      }
    }
    if (element.type === 'table' && (!element.source || typeof element.source !== 'string')) {
      push('warning', 'PRINT_SOURCE_REQUIRED', 'table 元素缺少 source 数据源', element.id);
    }

    if (element.type === 'pageNumber' && element.region === 'body') {
      push('warning', 'PRINT_REGION_INVALID', 'pageNumber 元素仅允许位于 header/footer 区域', element.id);
    }

    const rect = getRegionRect(page, element.region);
    if (
      element.left < -EPSILON ||
      element.top < -EPSILON ||
      element.left + element.width > rect.width + EPSILON ||
      element.top + element.height > rect.height + EPSILON
    ) {
      push('warning', 'PRINT_REGION_OVERFLOW', `元素超出 ${element.region} 区域边界`, element.id);
    }
  }

  return diagnostics;
}
