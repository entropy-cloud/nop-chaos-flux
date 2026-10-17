import { describe, expect, it } from 'vitest';
import {
  createEmptyPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';
import {
  applyPrintDocumentDiff,
  createPrintDomainAdapter,
  diffPrintDocuments,
} from './print-domain-adapter.js';

function element(id: string, overrides: Partial<PrintElementSchema> = {}): PrintElementSchema {
  return {
    type: 'rect',
    region: 'body',
    left: 0,
    top: 0,
    width: 20,
    height: 10,
    style: {},
    ...overrides,
    id,
  } as PrintElementSchema;
}

function template(elements: PrintElementSchema[]): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), elements };
}

describe('diffPrintDocuments', () => {
  it('returns null for structurally identical documents', () => {
    const doc = template([element('a')]);
    expect(diffPrintDocuments(doc, structuredClone(doc))).toBeNull();
  });

  it('produces patches for changed elements', () => {
    const before = template([element('a', { left: 0 })]);
    const after = template([element('a', { left: 5 })]);
    const diff = diffPrintDocuments(before, after);
    expect(diff?.patches.a).toBeDefined();
    expect(diff?.patches.a?.before.left).toBe(0);
    expect(diff?.patches.a?.after.left).toBe(5);
  });

  it('produces added with after-index and removed with before-index', () => {
    const before = template([element('a')]);
    const after = template([element('a'), element('b'), element('c')]);
    const diff = diffPrintDocuments(before, after);
    expect(diff?.added.map((entry) => entry.element.id)).toEqual(['b', 'c']);
    expect(diff?.added.map((entry) => entry.index)).toEqual([1, 2]);

    const reverse = diffPrintDocuments(after, before);
    expect(reverse?.removed.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(reverse?.removed.map((entry) => entry.index)).toEqual([1, 2]);
  });

  it('detects page/name/testData changes', () => {
    const before = createEmptyPrintTemplate();
    const after = {
      ...before,
      name: '发票',
      testData: { a: 1 },
      page: { ...before.page, headerHeight: 10 },
    };
    const diff = diffPrintDocuments(before, after);
    expect(diff?.name).toEqual({ before: before.name, after: '发票' });
    expect(diff?.page?.after.headerHeight).toBe(10);
    expect(diff?.testData?.after).toEqual({ a: 1 });
  });
});

describe('applyPrintDocumentDiff symmetry', () => {
  it('round-trips: apply(apply(doc, fwd), inv) deep-equals doc', () => {
    const before = template([element('a', { left: 1 }), element('b', { top: 2 })]);
    const after = template([
      element('a', { left: 9 }),
      element('c', { width: 7 }),
      element('b', { top: 2 }),
      element('d'),
    ]);
    after.name = 'next';
    const forward = diffPrintDocuments(before, after);
    const inverse = diffPrintDocuments(after, before);
    expect(forward).not.toBeNull();
    expect(inverse).not.toBeNull();

    const applied = applyPrintDocumentDiff(applyPrintDocumentDiff(before, forward!), inverse!);
    expect(applied).toEqual(before);
  });

  it('applies page/name/testData fields', () => {
    const before = createEmptyPrintTemplate();
    const after = { ...before, name: 'x', testData: { k: 'v' } };
    const diff = diffPrintDocuments(before, after)!;
    const applied = applyPrintDocumentDiff(before, diff);
    expect(applied.name).toBe('x');
    expect(applied.testData).toEqual({ k: 'v' });
  });
});

describe('createPrintDomainAdapter', () => {
  it('validates via validatePrintTemplate and rejects error-level diagnostics', () => {
    const adapter = createPrintDomainAdapter();
    const bad = template([element('', {} as PrintElementSchema)]);
    const result = adapter.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(adapter.validate(template([element('ok')])).ok).toBe(true);
  });

  it('exposes document ids for selection pruning', () => {
    const adapter = createPrintDomainAdapter();
    expect(adapter.getDocumentIds?.(template([element('a'), element('b')]))).toEqual(['a', 'b']);
  });

  it('uses print-template kind and serializes to JSON', () => {
    const adapter = createPrintDomainAdapter();
    expect(adapter.kind).toBe('print-template');
    expect(adapter.serialize(template([element('a')]))).toContain('"a"');
  });
});

// plan 626 B3：jsonOrderSensitiveEquals 判别锚（语义契约 = 旧 stringify 比较，
// JSON-safe 值域内逐例一致；偏差登记册见 print-domain-adapter.ts 头注）
describe('printValuesEquivalent semantics via diffPrintDocuments (plan 626 B3)', () => {
  const adapter = createPrintDomainAdapter();

  function docWithTestData(testData: unknown): ReturnType<typeof createEmptyPrintTemplate> {
    const doc = createEmptyPrintTemplate();
    (doc as unknown as { testData: unknown }).testData = testData;
    return doc;
  }

  it('deep-equal clone (fresh references, same key order) → null diff', () => {
    const doc = docWithTestData({ a: 1, nested: { b: [1, 2, { c: 'x' }] } });
    const clone = JSON.parse(JSON.stringify(doc));
    expect(adapter.diff(doc, clone)).toBeNull();
  });

  it('key-order divergence is UNEQUAL (order-sensitive — same verdict as stringify)', () => {
    const doc = docWithTestData({ a: 1, b: 2 });
    const diverged = docWithTestData({ b: 2, a: 1 });
    expect(adapter.diff(doc, diverged)).not.toBeNull();
  });

  it('nested value change → non-null diff', () => {
    const doc = docWithTestData({ a: 1, nested: { b: 1 } });
    const changed = docWithTestData({ a: 1, nested: { b: 2 } });
    expect(adapter.diff(doc, changed)).not.toBeNull();
  });

  it('array length change → non-null diff', () => {
    const doc = docWithTestData({ list: [1, 2] });
    const changed = docWithTestData({ list: [1, 2, 3] });
    expect(adapter.diff(doc, changed)).not.toBeNull();
  });

  it('undefined-valued object field compares as absent (stringify skip semantics)', () => {
    const doc = docWithTestData({ a: 1, ghost: undefined });
    // JSON round-trip preserves element ids while dropping the undefined key
    const absent = JSON.parse(JSON.stringify(doc));
    expect(absent.testData).toEqual({ a: 1 });
    expect(adapter.diff(doc, absent)).toBeNull();
  });

  it('NaN/Infinity divergence registered: helper judges unequal where stringify was equal', () => {
    // stringify(NaN) === "null" === stringify(null) → 旧实现判等；helper 按值判不等（登记偏差）
    const doc = docWithTestData({ v: Number.NaN });
    const other = docWithTestData({ v: null });
    expect(adapter.diff(doc, other)).not.toBeNull();
  });

  it('circular reference: returns non-null diff instead of throwing (registered deviation)', () => {
    const doc = docWithTestData({});
    const other = JSON.parse(JSON.stringify(doc));
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    (doc as unknown as { testData: unknown }).testData = circular;
    const clone: Record<string, unknown> = { a: 1 };
    clone.self = clone;
    (other as unknown as { testData: unknown }).testData = clone;
    expect(() => adapter.diff(doc, other)).not.toThrow();
    expect(adapter.diff(doc, other)).not.toBeNull();
  });
});
