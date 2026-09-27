/**
 * 树命令 + 会话测试矩阵（S1 §7.2 粒度表 + §6 INV-D/INV-C + 失败路径）。
 *
 * 覆盖：六命令正反向 + undo/redo 往返、粒度合并语义（事务收口 = 1 undo 步）、
 * INV-D sid 稳定性（move 不变 / 复制新 sid / 删除失效 / undo 恢复原 sid）、
 * INV-C 结构共享、INV-E 导出剥离、rt-unknown-type / drop-invalid-target 失败路径、
 * 栈深 100、selection 修剪。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyDesignerCommand } from './commands.js';
import { createPageDesignerSession } from './session.js';
import { collectSessionIds, createSeededRandom, getSessionId } from './round-trip.js';
import { findNodeById } from './tree-navigation.js';
import type { PageDesignerSession } from './types.js';

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function buildRegistry(): RendererRegistry {
  const registry = createRendererRegistry();
  const definitions: RendererDefinition[] = [
    def({
      type: 'page',
      defaultSchema: { type: 'page', body: [] },
      fields: [
        { key: 'body', kind: 'region', regionKey: 'body' },
        { key: 'header', kind: 'region', regionKey: 'header' },
        { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      ],
    }),
    def({
      type: 'container',
      defaultSchema: { type: 'container', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
    def({
      type: 'input-text',
      defaultSchema: { type: 'input-text', name: 'field' },
      propContracts: { label: { shape: { kind: 'string' }, displayName: 'Label' } },
    }),
    def({ type: 'domain-widget', rendererClass: 'domain-host-renderer', defaultSchema: { type: 'domain-widget' } }),
  ];
  for (const definition of definitions) registry.register(definition);
  return registry;
}

const ENV = { fetch: async () => new Response() } as never;

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

function createSession(): PageDesignerSession {
  return createPageDesignerSession({
    registry: buildRegistry(),
    env: ENV,
    sidRandom: createSeededRandom(42),
  });
}

/** 组装基础文档：page > body > [container > body > [input], input]，返回 session 与 sid 表。 */
function seedDocument(): { session: PageDesignerSession; sids: Record<string, string> } {
  const session = createSession();
  const imported: SchemaInput = {
    type: 'page',
    body: [
      { type: 'container', body: [{ type: 'input-text', name: 'a' }, { type: 'input-text', name: 'b' }] },
      { type: 'input-text', name: 'c' },
    ],
    header: { type: 'input-text', name: 'header-atom' },
  };
  const result = session.dispatch({ kind: 'importDocument', doc: imported });
  expect(result.ok).toBe(true);
  const doc = session.getSnapshot().working as Record<string, unknown>;
  const pageSid = doc['xui:sid'] as string;
  const body = doc.body as Record<string, unknown>[];
  const container = body[0];
  const containerBody = container.body as Record<string, unknown>[];
  const sids = {
    page: pageSid,
    container: container['xui:sid'] as string,
    atomA: containerBody[0]['xui:sid'] as string,
    atomB: containerBody[1]['xui:sid'] as string,
    atomC: body[1]['xui:sid'] as string,
    headerAtom: (doc.header as Record<string, unknown>)['xui:sid'] as string,
  };
  return { session, sids };
}

function workingRecord(session: PageDesignerSession): Record<string, unknown> {
  return session.getSnapshot().working as Record<string, unknown>;
}

describe('importDocument', () => {
  it('injects sids and replaces the document in one undo step', () => {
    const { session, sids } = seedDocument();
    expect(session.getSnapshot().undoDepth).toBe(1);
    expect(sids.page).toBeDefined();
    expect(collectSessionIds(session.getSnapshot().working).length).toBe(6);
    session.core.undo();
    // undo 回到载入单点注入后的初始空页（INV-D：载入 sid 稳定保留）。
    expect(workingRecord(session).body).toEqual([]);
    expect(collectSessionIds(session.getSnapshot().working).length).toBe(1);
    session.core.redo();
    expect(getSessionId(workingRecord(session))).toBeDefined();
  });

  it('rejects documents with unregistered types and keeps working (rt-unknown-type)', () => {
    const session = createSession();
    const before = JSON.stringify(session.getSnapshot().working);
    const result = session.dispatch({
      kind: 'importDocument',
      doc: { type: 'page', body: [{ type: 'not-registered', name: 'x' }] },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('unknown-type');
    expect(JSON.stringify(session.getSnapshot().working)).toBe(before);
    expect(session.getSnapshot().undoDepth).toBe(0);
  });

  it('rejects non-schema documents', () => {
    const session = createSession();
    const result = session.dispatch({ kind: 'importDocument', doc: { noType: true } as unknown as SchemaInput });
    expect(result.ok).toBe(false);
  });

  it('validate reports root-level unknown type with "/" path', () => {
    const session = createSession();
    const result = session.dispatch({ kind: 'importDocument', doc: { type: 'nope', body: [] } });
    expect(result.ok).toBe(false);
    const validation = session.core.adapter.validate({ type: 'nope', body: [] });
    expect(validation.ok).toBe(false);
    expect(validation.errors?.[0]).toContain('at /');
  });
});

describe('insertNode', () => {
  it('inserts into region at index, assigns fresh sids, returns new node id', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({
      kind: 'insertNode',
      parentId: sids.container,
      regionKey: 'body',
      index: 1,
      node: { type: 'input-text', name: 'new' },
    });
    expect(result.ok).toBe(true);
    expect(result.nodeId).toMatch(/^psid-/);
    const container = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    const body = container.body as Record<string, unknown>[];
    expect(body.length).toBe(3);
    expect((body[1] as Record<string, unknown>).name).toBe('new');
    expect((body[1] as Record<string, unknown>)['xui:sid']).toBe(result.nodeId);
    expect(session.getSnapshot().undoDepth).toBe(2);
  });

  it('undo/redo round-trip restores exact doc with same sids', () => {
    const { session, sids } = seedDocument();
    const before = JSON.stringify(session.getSnapshot().working);
    session.dispatch({ kind: 'insertNode', parentId: sids.container, regionKey: 'body', node: { type: 'input-text', name: 'n' } });
    expect(session.core.undo()).toBe(true);
    expect(JSON.stringify(session.getSnapshot().working)).toBe(before);
    expect(session.core.redo()).toBe(true);
    const container = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    expect((container.body as unknown[]).length).toBe(3);
    expect(session.core.undo()).toBe(true);
    expect(JSON.stringify(session.getSnapshot().working)).toBe(before);
  });

  it('appends by default and clamps out-of-range indexes', () => {
    const { session, sids } = seedDocument();
    session.dispatch({ kind: 'insertNode', parentId: sids.page, regionKey: 'body', index: 99, node: { type: 'input-text', name: 'tail' } });
    const doc = workingRecord(session);
    expect(((doc.body as unknown[]).at(-1) as Record<string, unknown>).name).toBe('tail');
    session.dispatch({ kind: 'insertNode', parentId: sids.page, regionKey: 'body', index: -5, node: { type: 'input-text', name: 'head' } });
    expect(((workingRecord(session).body as unknown[])[0]) as Record<string, unknown>).toMatchObject({ name: 'head' });
  });

  it('drop-invalid-target: unknown parent / invalid region / single-object region', () => {
    const { session, sids } = seedDocument();
    expect(session.dispatch({ kind: 'insertNode', parentId: 'psid-nope', regionKey: 'body', node: { type: 'input-text', name: 'x' } }).error).toBe('unknown-parent');
    expect(session.dispatch({ kind: 'insertNode', parentId: sids.container, regionKey: 'footer', node: { type: 'input-text', name: 'x' } }).error).toBe('invalid-region');
    // value-or-region 非容器：insert 不允许（kind 'region' 之外不可作为落点）。
    expect(session.dispatch({ kind: 'insertNode', parentId: sids.page, regionKey: 'title', node: { type: 'input-text', name: 'x' } }).error).toBe('invalid-region');
    // 单节点 region（header）不可 insert。
    expect(session.dispatch({ kind: 'insertNode', parentId: sids.page, regionKey: 'header', node: { type: 'input-text', name: 'x' } }).error).toBe('invalid-target');
    expect(session.dispatch({ kind: 'insertNode', parentId: sids.page, regionKey: 'body', node: { broken: true } as unknown as SchemaInput }).error).toBe('invalid-node');
  });
});

describe('removeNode', () => {
  it('removes subtree; undo restores it with original sids (INV-D)', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({ kind: 'removeNode', nodeId: sids.container });
    expect(result.ok).toBe(true);
    expect(findNodeById(session.getSnapshot().working, sids.container, session.registry)).toBeUndefined();
    // selection 修剪（getDocumentIds 投影）。
    session.core.setSelection([sids.container, sids.atomC]);
    expect(session.getSnapshot().selection).toEqual([sids.atomC]);
    session.core.undo();
    const restored = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    expect(restored['xui:sid']).toBe(sids.container);
    expect(getSessionId(((restored.body as Record<string, unknown>[])[0]))).toBe(sids.atomA);
  });

  it('removes single-node region child by deleting the region key', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({ kind: 'removeNode', nodeId: sids.headerAtom });
    expect(result.ok).toBe(true);
    expect(workingRecord(session).header).toBeUndefined();
    session.core.undo();
    expect(getSessionId(workingRecord(session).header)).toBe(sids.headerAtom);
  });

  it('rejects unknown node and root removal', () => {
    const { session, sids } = seedDocument();
    expect(session.dispatch({ kind: 'removeNode', nodeId: 'psid-nope' }).error).toBe('unknown-node');
    expect(session.dispatch({ kind: 'removeNode', nodeId: sids.page }).error).toBe('invalid-target');
  });

  it('rejects key-frame removal when holder type is unregistered (defensive path)', () => {
    const { session, sids } = seedDocument();
    // insertNode 不校验子节点 type 注册态：残缺树进入后，未注册宿主的 key 删除被拒。
    session.dispatch({
      kind: 'insertNode',
      parentId: sids.page,
      regionKey: 'body',
      node: { type: 'mystery', header: { type: 'input-text', name: 'x' } } as unknown as SchemaInput,
    });
    const doc = workingRecord(session);
    const body = doc.body as Record<string, unknown>[];
    const mysteryNode = body.find((node) => (node as Record<string, unknown>).type === 'mystery') as Record<string, unknown>;
    const childSid = (mysteryNode.header as Record<string, unknown>)['xui:sid'] as string;
    expect(session.dispatch({ kind: 'removeNode', nodeId: childSid }).error).toBe('invalid-target');
  });
});

describe('moveNode', () => {
  it('moves across regions keeping sid stable (INV-D), one undo step', () => {
    const { session, sids } = seedDocument();
    const depthBefore = session.getSnapshot().undoDepth;
    const result = session.dispatch({
      kind: 'moveNode',
      nodeId: sids.atomA,
      targetParentId: sids.page,
      targetRegionKey: 'body',
      index: 1,
    });
    expect(result.ok).toBe(true);
    expect(session.getSnapshot().undoDepth).toBe(depthBefore + 1);
    const doc = workingRecord(session);
    const body = doc.body as Record<string, unknown>[];
    expect((body[1] as Record<string, unknown>)['xui:sid']).toBe(sids.atomA);
    const container = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    expect((container.body as unknown[]).length).toBe(1);
  });

  it('normalizes index for moves within the same region array', () => {
    const { session, sids } = seedDocument();
    // container.body 内 atomA(0) → index 2（右移，归一化后为 remove 后的 1）。
    const result = session.dispatch({
      kind: 'moveNode',
      nodeId: sids.atomA,
      targetParentId: sids.container,
      targetRegionKey: 'body',
      index: 2,
    });
    expect(result.ok).toBe(true);
    const container = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    const body = container.body as Record<string, unknown>[];
    expect(body.map((node) => node['xui:sid'])).toEqual([sids.atomB, sids.atomA]);
    session.core.undo();
    const restored = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    expect((restored.body as Record<string, unknown>[]).map((node) => node['xui:sid'])).toEqual([sids.atomA, sids.atomB]);
  });

  it('rejects moving a node into its own subtree', () => {
    const { session, sids } = seedDocument();
    session.dispatch({
      kind: 'insertNode',
      parentId: sids.container,
      regionKey: 'body',
      node: { type: 'container', body: [] },
    });
    const outerContainer = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    const nested = ((outerContainer.body as Record<string, unknown>[])[2])['xui:sid'] as string;
    const result = session.dispatch({
      kind: 'moveNode',
      nodeId: sids.container,
      targetParentId: nested,
      targetRegionKey: 'body',
      index: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-target');
  });

  it('canvas drag gesture: transaction folds multiple dispatches into one undo step', () => {
    const { session, sids } = seedDocument();
    const beforeDrag = JSON.stringify(session.getSnapshot().working);
    const depthBefore = session.getSnapshot().undoDepth;
    session.core.beginTransaction();
    session.dispatch({ kind: 'moveNode', nodeId: sids.atomA, targetParentId: sids.page, targetRegionKey: 'body', index: 1 });
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { label: 'dragged' } });
    expect(session.getSnapshot().undoDepth).toBe(depthBefore);
    session.core.endTransaction();
    expect(session.getSnapshot().undoDepth).toBe(depthBefore + 1);
    const doc = workingRecord(session);
    expect(((doc.body as Record<string, unknown>[])[1]) as Record<string, unknown>).toMatchObject({ name: 'a', label: 'dragged' });
    session.core.undo();
    expect(JSON.stringify(session.getSnapshot().working)).toBe(beforeDrag);
  });
});

describe('updateProps', () => {
  it('merges props shallowly without touching other keys', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { label: 'L', value: 'v' } });
    expect(result.ok).toBe(true);
    const atom = findNodeById(session.getSnapshot().working, sids.atomA, session.registry) as Record<string, unknown>;
    expect(atom).toMatchObject({ name: 'a', label: 'L', value: 'v' });
    expect(atom['xui:sid']).toBe(sids.atomA);
    session.core.undo();
    expect(findNodeById(session.getSnapshot().working, sids.atomA, session.registry)).toMatchObject({ name: 'a' });
  });

  it('inspector edit session: changes fold into one undo step on blur (S1 §8.3)', () => {
    const { session, sids } = seedDocument();
    const depthBefore = session.getSnapshot().undoDepth;
    session.core.beginTransaction();
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { label: 'first' } });
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { label: 'second' } });
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { value: '${x}' } });
    expect(session.getSnapshot().undoDepth).toBe(depthBefore);
    session.core.endTransaction();
    expect(session.getSnapshot().undoDepth).toBe(depthBefore + 1);
    expect(findNodeById(session.getSnapshot().working, sids.atomA, session.registry)).toMatchObject({ label: 'second', value: '${x}' });
    session.core.undo();
    expect(findNodeById(session.getSnapshot().working, sids.atomA, session.registry)).toMatchObject({ name: 'a' });
  });

  it('removes keys whose value is undefined (S3 panel clear semantics, no phantom key)', () => {
    const { session, sids } = seedDocument();
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { label: 'bound', value: '${u.f}' } });
    const result = session.dispatch({
      kind: 'updateProps',
      nodeId: sids.atomA,
      props: { label: undefined, value: '${u.g}', keep: 1 },
    });
    expect(result.ok).toBe(true);
    const atom = findNodeById(session.getSnapshot().working, sids.atomA, session.registry) as Record<string, unknown>;
    expect('label' in atom).toBe(false);
    expect(atom.value).toBe('${u.g}');
    expect(atom.keep).toBe(1);
    // undo 恢复到删除前的键（inverse patch 对称）。
    session.core.undo();
    const restored = findNodeById(session.getSnapshot().working, sids.atomA, session.registry) as Record<string, unknown>;
    expect(restored.label).toBe('bound');
  });

  it('rejects unknown node', () => {
    const { session } = seedDocument();
    expect(session.dispatch({ kind: 'updateProps', nodeId: 'psid-nope', props: {} }).error).toBe('unknown-node');
  });
});

describe('replaceRegion', () => {
  it('replaces region subtree with fresh sids (copy = new sid, INV-D)', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({
      kind: 'replaceRegion',
      nodeId: sids.container,
      regionKey: 'body',
      node: [{ type: 'input-text', name: 'r1' }, { type: 'input-text', name: 'r2' }],
    });
    expect(result.ok).toBe(true);
    const container = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    const body = container.body as Record<string, unknown>[];
    expect(body.length).toBe(2);
    expect(body.map((node) => node['xui:sid'])).not.toEqual([sids.atomA, sids.atomB]);
    session.core.undo();
    const restored = findNodeById(session.getSnapshot().working, sids.container, session.registry) as Record<string, unknown>;
    expect(((restored.body as Record<string, unknown>[])[0])['xui:sid']).toBe(sids.atomA);
  });

  it('replaceRegion(null) removes the region key and restores on undo', () => {
    const { session, sids } = seedDocument();
    const result = session.dispatch({ kind: 'replaceRegion', nodeId: sids.page, regionKey: 'header', node: null });
    expect(result.ok).toBe(true);
    expect(workingRecord(session).header).toBeUndefined();
    session.core.undo();
    expect(getSessionId(workingRecord(session).header)).toBe(sids.headerAtom);
  });

  it('rejects invalid region / node', () => {
    const { session, sids } = seedDocument();
    expect(session.dispatch({ kind: 'replaceRegion', nodeId: sids.atomA, regionKey: 'body', node: null }).error).toBe('invalid-region');
    expect(session.dispatch({ kind: 'replaceRegion', nodeId: sids.container, regionKey: 'body', node: 42 as unknown as SchemaInput }).error).toBe('invalid-node');
  });
});

describe('session plumbing', () => {
  it('INV-C structural sharing: untouched subtrees keep references and key order', () => {
    const { session, sids } = seedDocument();
    const before = workingRecord(session);
    const containerBefore = (before.body as Record<string, unknown>[])[0];
    session.dispatch({ kind: 'updateProps', nodeId: sids.atomC, props: { label: 'changed' } });
    const after = workingRecord(session);
    expect(after).not.toBe(before);
    // 兄弟子树（container）保持引用；被触碰节点所在链重建。
    expect((after.body as Record<string, unknown>[])[0]).toBe(containerBefore);
    expect(Object.keys(after)).toEqual(Object.keys(before));
  });

  it('serialize output contains no xui:sid (INV-E)', () => {
    const { session } = seedDocument();
    const committed = session.core.commit();
    expect(committed.ok).toBe(true);
    expect(committed.serialized).not.toContain('xui:sid');
    expect(JSON.parse(committed.serialized as string)).toMatchObject({ type: 'page' });
  });

  it('undo stack caps at depth 100 (editor-core default)', () => {
    const { session, sids } = seedDocument();
    for (let i = 0; i < 105; i += 1) {
      session.dispatch({ kind: 'updateProps', nodeId: sids.atomA, props: { [`k${i}`]: i } });
    }
    expect(session.getSnapshot().undoDepth).toBe(100);
    expect(session.getSnapshot().redoDepth).toBe(0);
  });

  it('load() seeds empty page and commit policy defaults to manual', () => {
    const session = createSession();
    expect(session.getSnapshot().working).toMatchObject({ type: 'page', body: [] });
    expect(session.core.policy).toBe('manual');
    expect(session.getSnapshot().mode).toBe('edit');
  });

  it('default sid PRNG (no sidRandom option) still yields unique sids', () => {
    const session = createPageDesignerSession({ registry: buildRegistry(), env: ENV });
    session.dispatch({ kind: 'importDocument', doc: { type: 'page', body: [{ type: 'input-text', name: 'a' }, { type: 'input-text', name: 'b' }] } });
    const sids = collectSessionIds(session.getSnapshot().working);
    expect(new Set(sids).size).toBe(sids.length);
  });

  it('dispatch via applyDesignerCommand context matches session.dispatch', () => {
    const session = createSession();
    const result = applyDesignerCommand(
      { core: session.core, registry: session.registry, rng: createSeededRandom(9) },
      { kind: 'importDocument', doc: { type: 'page', body: [] } },
    );
    expect(result.ok).toBe(true);
    expect(getSessionId(workingRecord(session))).toBeDefined();
  });

  it('subscribe projects session state changes', () => {
    const session = createSession();
    const seen: number[] = [];
    const unsubscribe = session.subscribe((state) => seen.push(state.undoDepth));
    session.dispatch({ kind: 'importDocument', doc: { type: 'page', body: [] } });
    unsubscribe();
    session.dispatch({ kind: 'importDocument', doc: { type: 'page', body: [{ type: 'input-text', name: 'x' }] } });
    expect(seen).toEqual([1]);
  });
});

it('load() injects session ids into the initial document (载入单点, S1 §6)', () => {
  const session = createSession();
  const sids = collectSessionIds(session.getSnapshot().working);
  expect(sids.length).toBeGreaterThan(0);
  // 初始注入不占 undo 步。
  expect(session.getSnapshot().undoDepth).toBe(0);
});
