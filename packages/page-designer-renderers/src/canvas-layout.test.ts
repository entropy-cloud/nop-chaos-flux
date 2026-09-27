/**
 * 画布几何模型测试（S1 §5.1/§5.3）：命中检测、DropHint 计算（inside/before/after/
 * invalid/根回退）、opaque-leaf inside 拒绝。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import { createSeededRandom, injectSessionIds, locateNode } from '@nop-chaos/page-designer-core';
import { describe, expect, it } from 'vitest';
import {
  buildCanvasLayoutModel,
  buildRootDropHint,
  computeDropHintAt,
  hitTestLayout,
  type CanvasLayoutModel,
  type PixelRect,
} from './canvas-layout.js';

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function buildRegistry(): RendererRegistry {
  const registry = createRendererRegistry();
  for (const definition of [
    def({
      type: 'page',
      defaultSchema: { type: 'page', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
    def({
      type: 'container',
      defaultSchema: { type: 'container', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
    def({ type: 'text', defaultSchema: { type: 'text' } }),
    def({
      type: 'opaque-widget',
      rendererClass: 'domain-host-renderer',
      defaultSchema: { type: 'opaque-widget', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
  ]) {
    registry.register(definition);
  }
  return registry;
}

function rect(left: number, top: number, width: number, height: number): PixelRect {
  return { left, top, width, height };
}

const DOC: SchemaInput = injectSessionIds(
  {
    type: 'page',
    body: [
      { type: 'container', body: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] },
      { type: 'text', text: 'c' },
    ],
  },
  createSeededRandom(7),
);

/** 测试装配：sid 未知，用 text 值锚定矩形；返回模型 + sid 反查表。 */
function assemble(doc: SchemaInput, registry: RendererRegistry) {
  const textToSid = new Map<string, string>();
  const typeToSid = new Map<string, string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.type === 'string' && typeof record['xui:sid'] === 'string') {
      const sid = record['xui:sid'] as string;
      if (!typeToSid.has(record.type)) typeToSid.set(record.type, sid);
      if (typeof record.text === 'string') textToSid.set(record.text, sid);
    }
    for (const key of Object.keys(record)) {
      if (key === 'xui:sid') continue;
      visit(record[key]);
    }
  };
  visit(doc);

  const rects = new Map<string, PixelRect>([
    [typeToSid.get('page')!, rect(0, 0, 800, 600)],
    [typeToSid.get('container')!, rect(0, 0, 800, 200)],
    [textToSid.get('a')!, rect(0, 0, 100, 40)],
    [textToSid.get('b')!, rect(120, 0, 100, 40)],
    [textToSid.get('c')!, rect(0, 240, 100, 40)],
  ]);
  const model: CanvasLayoutModel = buildCanvasLayoutModel(doc, registry, {
    anchorOf: (sid) => (rects.has(sid) ? ({ sid } as unknown as Element) : null),
    resolveRect: (element) => rects.get((element as unknown as { sid: string }).sid) ?? null,
  });
  const findNode = (sid: string): unknown => locateNode(doc, sid, registry)?.node ?? null;
  return { model, textToSid, typeToSid, findNode };
}

describe('canvas-layout', () => {
  it('builds preorder model with parent/container/index and rects', () => {
    const registry = buildRegistry();
    const { model } = assemble(DOC, registry);
    expect(model.rootSid).toBe(model.nodes[0].sid);
    const [page, container, textA, textB, textC] = model.nodes;
    expect(page.type).toBe('page');
    expect(page.parentSid).toBeNull();
    expect(container.type).toBe('container');
    expect(container.containerKey).toBe('body');
    expect(textA.type).toBe('text');
    expect(textA.parentSid).toBe(container.sid);
    expect(textA.index).toBe(0);
    expect(textB.index).toBe(1);
    expect(textC.parentSid).toBe(page.sid);
    expect(textC.index).toBe(1);
  });

  it('hit-tests the deepest rect containing the point', () => {
    const registry = buildRegistry();
    const { model, textToSid } = assemble(DOC, registry);
    expect(hitTestLayout(model, 50, 20)?.sid).toBe(textToSid.get('a'));
    expect(hitTestLayout(model, 700, 500)?.type).toBe('page');
    expect(hitTestLayout(model, 5000, 5000)).toBeNull();
  });

  it('computes inside hint for container hits (append at end)', () => {
    const registry = buildRegistry();
    const { model, typeToSid, findNode } = assemble(DOC, registry);
    const containerSid = typeToSid.get('container')!;
    const hint = computeDropHintAt({ model, registry, findNode }, 400, 100);
    expect(hint).toEqual({ kind: 'inside', parentId: containerSid, regionKey: 'body', index: 2 });
  });

  it('computes before/after hints for atomic hits within parent region', () => {
    const registry = buildRegistry();
    const { model, typeToSid, findNode } = assemble(DOC, registry);
    const containerSid = typeToSid.get('container')!;
    const before = computeDropHintAt({ model, registry, findNode }, 160, 10);
    expect(before).toEqual({ kind: 'before', parentId: containerSid, regionKey: 'body', index: 1 });
    const after = computeDropHintAt({ model, registry, findNode }, 160, 39);
    expect(after).toEqual({ kind: 'after', parentId: containerSid, regionKey: 'body', index: 2 });
  });

  it('marks root-level atomic hits as invalid', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds({ type: 'text', text: 'root' }, createSeededRandom(9));
    const sid = (doc as Record<string, unknown>)['xui:sid'] as string;
    const model = buildCanvasLayoutModel(doc, registry, {
      anchorOf: () => ({ sid } as unknown as Element),
      resolveRect: () => rect(0, 0, 100, 40),
    });
    const hint = computeDropHintAt({ model, registry, findNode: () => null }, 50, 20);
    expect(hint).toEqual({ kind: 'invalid' });
  });

  it('falls back to root container hint on empty canvas area', () => {
    const registry = buildRegistry();
    const { model, findNode } = assemble(DOC, registry);
    expect(computeDropHintAt({ model, registry, findNode }, 5000, 5000)).toBeNull();
    const hint = buildRootDropHint(DOC, registry);
    expect(hint?.kind).toBe('inside');
    expect(hint && hint.kind === 'inside' ? hint.index : null).toBe(2);
  });

  it('rejects inside-drop on opaque-leaf containers (sibling hint instead)', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds({ type: 'page', body: [{ type: 'opaque-widget' }] }, createSeededRandom(11));
    const findNode = (sid: string): unknown => locateNode(doc, sid, registry)?.node ?? null;
    const model = buildCanvasLayoutModel(doc, registry, {
      anchorOf: () => ({ sid: 'x' } as unknown as Element),
      resolveRect: () => rect(0, 0, 10, 10),
    });
    const hint = computeDropHintAt({ model, registry, findNode }, 5, 5);
    expect(hint && (hint.kind === 'after' || hint.kind === 'before')).toBe(true);
    expect((hint as { index: number }).index).toBe(1);
  });
});
