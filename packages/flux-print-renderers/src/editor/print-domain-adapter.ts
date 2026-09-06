import type { EditorDomainAdapter } from '@nop-chaos/editor-core';
import {
  createEmptyPrintTemplate,
  validatePrintTemplate,
  type PrintElementSchema,
  type PrintPageSchema,
  type PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';

export type PrintDocument = PrintTemplateSchema;

/**
 * 打印模板 diff（forward/inverse 对称契约，对齐 dashboard-domain-adapter 模式）。
 *
 * - `patches`：id → 元素整体替换（before/after，仅变化的元素）。
 * - `added`：新增元素（index = 在 after 中的位置，apply 按 index 插入）。
 * - `removed`：移除元素（含原 index + 原元素，逆 diff 可原位恢复）。
 * - `page`/`name`/`testData`：文档级字段变更（有差异才携带）。
 *
 * apply 顺序：按 index 降序移除 → 补丁 → 按 index 升序插入 → 文档级字段。
 * 由构造保证 `apply(apply(doc, diff(a,b)), diff(b,a))` 深等于 `a`。
 */
export interface PrintTemplateDiff {
  patches: Record<string, { before: PrintElementSchema; after: PrintElementSchema }>;
  added: Array<{ index: number; element: PrintElementSchema }>;
  removed: Array<{ id: string; index: number; element: PrintElementSchema }>;
  page: { before: PrintPageSchema; after: PrintPageSchema } | null;
  name: { before: string; after: string } | null;
  testData: { before: Record<string, unknown> | undefined; after: Record<string, unknown> | undefined } | null;
}

export function diffPrintDocuments(prev: PrintDocument, next: PrintDocument): PrintTemplateDiff | null {
  const patches: PrintTemplateDiff['patches'] = {};
  const added: PrintTemplateDiff['added'] = [];
  const removed: PrintTemplateDiff['removed'] = [];

  const prevById = new Map(prev.elements.map((element, index) => [element.id, { element, index }]));
  const nextById = new Map(next.elements.map((element, index) => [element.id, { element, index }]));

  for (const [id, { element, index }] of nextById) {
    const before = prevById.get(id);
    if (!before) {
      added.push({ index, element });
    } else if (JSON.stringify(before.element) !== JSON.stringify(element)) {
      patches[id] = { before: before.element, after: element };
    }
  }
  for (const [id, { element, index }] of prevById) {
    if (!nextById.has(id)) {
      removed.push({ id, index, element });
    }
  }

  const page = JSON.stringify(prev.page) !== JSON.stringify(next.page)
    ? { before: prev.page, after: next.page }
    : null;
  const name = prev.name !== next.name ? { before: prev.name, after: next.name } : null;
  const testData = JSON.stringify(prev.testData ?? null) !== JSON.stringify(next.testData ?? null)
    ? { before: prev.testData, after: next.testData }
    : null;

  const empty =
    Object.keys(patches).length === 0 &&
    added.length === 0 &&
    removed.length === 0 &&
    page === null &&
    name === null &&
    testData === null;
  if (empty) return null;

  return { patches, added, removed, page, name, testData };
}

export function applyPrintDocumentDiff(doc: PrintDocument, diff: PrintTemplateDiff): PrintDocument {
  const elements = [...doc.elements];

  const removals = [...diff.removed].sort((a, b) => b.index - a.index);
  for (const removal of removals) {
    elements.splice(Math.min(removal.index, elements.length), 1);
  }
  for (const [id, patch] of Object.entries(diff.patches)) {
    const index = elements.findIndex((element) => element.id === id);
    if (index >= 0) {
      elements[index] = patch.after;
    }
  }
  const additions = [...diff.added].sort((a, b) => a.index - b.index);
  for (const addition of additions) {
    elements.splice(Math.min(addition.index, elements.length), 0, addition.element);
  }

  return {
    ...doc,
    name: diff.name ? diff.name.after : doc.name,
    page: diff.page ? diff.page.after : doc.page,
    testData: diff.testData ? diff.testData.after : doc.testData,
    elements,
  };
}

export function createPrintDomainAdapter(): EditorDomainAdapter<PrintDocument, PrintTemplateDiff> {
  return {
    kind: 'print-template',
    load: () => createEmptyPrintTemplate(),
    serialize: (doc) => JSON.stringify(doc),
    validate: (doc) => {
      const errors = validatePrintTemplate(doc).filter((diagnostic) => diagnostic.level === 'error');
      return {
        ok: errors.length === 0,
        errors: errors.map((error) => `[${error.code}] ${error.message}`),
      };
    },
    diff: diffPrintDocuments,
    applyDiff: applyPrintDocumentDiff,
    getDocumentIds: (doc) => doc.elements.map((element) => element.id),
  };
}
