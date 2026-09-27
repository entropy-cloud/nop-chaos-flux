/**
 * tree-navigation 单元测试矩阵：定位帧、region 投影、结构共享重建。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, SchemaInput } from '@nop-chaos/flux-core';
import { describe, expect, it } from 'vitest';
import { injectSessionIds, createSeededRandom } from './round-trip.js';
import {
  findNodeById,
  getChildContainerKeys,
  getContainerKeys,
  getDropRegionKeys,
  getRegionChildren,
  getRegionForm,
  isContainerDefinition,
  locateNode,
  rebuildAtLocation,
  removeAtLocation,
} from './tree-navigation.js';

function def(partial: Partial<RendererDefinition>): RendererDefinition {
  return { component: () => null, type: 'demo', ...partial } as unknown as RendererDefinition;
}

function buildRegistry(): ReturnType<typeof createRendererRegistry> {
  const registry = createRendererRegistry();
  registry.register(
    def({
      type: 'page',
      fields: [
        { key: 'body', kind: 'region', regionKey: 'body' },
        { key: 'header', kind: 'region', regionKey: 'header' },
        { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      ],
    }),
  );
  registry.register(def({ type: 'container', fields: [{ key: 'body', kind: 'region', regionKey: 'body' }] }));
  return registry;
}

function seeded(doc: SchemaInput): SchemaInput {
  return injectSessionIds(doc, createSeededRandom(11));
}

describe('region 键投影', () => {
  it('getDropRegionKeys 只取 kind region；regionKey 缺省回退 key', () => {
    const registry = buildRegistry();
    expect(getDropRegionKeys(registry.get('page'))).toEqual(['body', 'header']);
    expect(getDropRegionKeys(registry.get('container'))).toEqual(['body']);
    expect(getDropRegionKeys(registry.get('missing'))).toEqual([]);
    expect(getDropRegionKeys(undefined)).toEqual([]);
  });

  it('getContainerKeys 含 value-or-region；isContainerDefinition 判定容器', () => {
    const registry = buildRegistry();
    expect(getContainerKeys(registry.get('page'))).toEqual(['body', 'header', 'title']);
    expect(isContainerDefinition(registry.get('page'))).toBe(true);
    expect(isContainerDefinition(undefined)).toBe(false);
  });

  it('getRegionChildren/getRegionForm：array/single/absent，非 schema 项过滤', () => {
    const node = {
      type: 'page',
      body: [{ type: 'input-text', name: 'a' }, { broken: true }, 'junk'],
      header: { type: 'input-text', name: 'h' },
    } as never;
    expect(getRegionChildren(node, 'body').length).toBe(1);
    expect(getRegionChildren(node, 'header').length).toBe(1);
    expect(getRegionChildren(node, 'footer')).toEqual([]);
    expect(getRegionForm(node, 'body')).toBe('array');
    expect(getRegionForm(node, 'header')).toBe('single');
    expect(getRegionForm(node, 'footer')).toBe('absent');
  });
});

describe('getChildContainerKeys', () => {
  it('unregistered type falls back to schema-valued own keys', () => {
    const registry = buildRegistry();
    const node = { type: 'mystery', payload: [{ type: 'input-text', name: 'x' }], label: 'text' } as never;
    const { keys, fromDefinition } = getChildContainerKeys(node, registry);
    expect(fromDefinition).toBe(false);
    expect(keys).toEqual(['payload']);
  });

  it('registered type uses declared container keys only', () => {
    const registry = buildRegistry();
    const node = { type: 'page', body: [], extra: [{ type: 'input-text', name: 'x' }] } as never;
    const { keys, fromDefinition } = getChildContainerKeys(node, registry);
    expect(fromDefinition).toBe(true);
    expect(keys).toEqual(['body', 'header', 'title']);
  });
});

describe('locateNode 定位', () => {
  it('locates nodes in root-array documents with owner-free parent', () => {
    const registry = buildRegistry();
    const doc = seeded([{ type: 'page', body: [{ type: 'container', body: [] }] }] as unknown as SchemaInput);
    const items = doc as unknown as Record<string, unknown>[];
    const pageSid = items[0]['xui:sid'] as string;
    const hit = locateNode(doc, pageSid, registry);
    expect(hit).toBeDefined();
    expect(hit?.parent).toBeNull();
    // 根数组项：数组容器无挂载键。
    expect(hit?.containerKey).toBeNull();
    expect(hit?.frames.length).toBe(1);
    expect(hit?.frames[0].kind).toBe('array');
  });

  it('miss returns undefined; root single node with empty frames', () => {
    const registry = buildRegistry();
    expect(locateNode({ type: 'page' }, 'psid-nope', registry)).toBeUndefined();
    const root = seeded({ type: 'page', body: [] });
    const rootSid = (root as Record<string, unknown>)['xui:sid'] as string;
    const hit = locateNode(root, rootSid, registry);
    expect(hit?.frames).toEqual([]);
    expect(hit?.parent).toBeNull();
    expect(hit?.containerKey).toBeNull();
  });

  it('single-node region child carries containerKey of the region', () => {
    const registry = buildRegistry();
    const doc = seeded({ type: 'page', header: { type: 'container', body: [] } });
    const header = (doc as Record<string, unknown>).header as Record<string, unknown>;
    const hit = locateNode(doc, header['xui:sid'] as string, registry);
    expect(hit?.containerKey).toBe('header');
    expect(hit?.parent).toBe(doc);
    expect(hit?.index).toBe(0);
  });

  it('findNodeById resolves deeply nested nodes', () => {
    const registry = buildRegistry();
    const doc = seeded({
      type: 'page',
      body: [{ type: 'container', body: [{ type: 'container', body: [{ type: 'input-text', name: 'deep' }] }] }],
    });
    const container1 = ((doc as Record<string, unknown>).body as Record<string, unknown>[])[0];
    const container2 = (container1.body as Record<string, unknown>[])[0];
    const deep = (container2.body as Record<string, unknown>[])[0];
    expect(findNodeById(doc, deep['xui:sid'] as string, registry)).toBe(deep);
  });
});

describe('rebuild/remove at location', () => {
  it('removeAtLocation splices array region and reattaches to owner', () => {
    const registry = buildRegistry();
    const doc = seeded({ type: 'page', body: [{ type: 'input-text', name: 'a' }, { type: 'input-text', name: 'b' }] });
    const body = (doc as Record<string, unknown>).body as Record<string, unknown>[];
    const hit = locateNode(doc, body[0]['xui:sid'] as string, registry) as NonNullable<ReturnType<typeof locateNode>>;
    const { doc: next, removed } = removeAtLocation(doc, hit);
    expect(removed).toBe(body[0]);
    expect(((next as Record<string, unknown>).body as unknown[]).length).toBe(1);
    expect((next as Record<string, unknown>).type).toBe('page');
    expect(registry).toBeDefined();
  });

  it('removeAtLocation deletes key for single-node region frames', () => {
    const registry = buildRegistry();
    const doc = seeded({ type: 'page', header: { type: 'container', body: [] } });
    const header = (doc as Record<string, unknown>).header as Record<string, unknown>;
    const hit = locateNode(doc, header['xui:sid'] as string, registry) as NonNullable<ReturnType<typeof locateNode>>;
    const { doc: next } = removeAtLocation(doc, hit);
    expect((next as Record<string, unknown>).header).toBeUndefined();
  });

  it('removeAtLocation rebuilds key-frame ancestors mid-chain', () => {
    const registry = buildRegistry();
    // value-or-region 单节点（title）内部还有数组 region：删除其子节点时
    // key 帧位于链中段而非末尾。
    const doc = seeded({
      type: 'page',
      title: { type: 'container', body: [{ type: 'input-text', name: 'a' }, { type: 'input-text', name: 'b' }] },
    });
    const title = (doc as Record<string, unknown>).title as Record<string, unknown>;
    const item = (title.body as Record<string, unknown>[])[0];
    const hit = locateNode(doc, item['xui:sid'] as string, registry) as NonNullable<ReturnType<typeof locateNode>>;
    const { doc: next } = removeAtLocation(doc, hit);
    const nextTitle = (next as Record<string, unknown>).title as Record<string, unknown>;
    expect((nextTitle.body as unknown[]).length).toBe(1);
    expect(nextTitle.type).toBe('container');
  });

  it('rebuildAtLocation replaces root-array items without an owner', () => {
    const registry = buildRegistry();
    const doc = seeded([{ type: 'page', body: [] }] as unknown as SchemaInput);
    const items = doc as unknown as Record<string, unknown>[];
    const hit = locateNode(doc, items[0]['xui:sid'] as string, registry) as NonNullable<ReturnType<typeof locateNode>>;
    const next = rebuildAtLocation(doc, hit, () => ({ type: 'page', body: [{ type: 'input-text', name: 'n' }] }));
    expect(Array.isArray(next)).toBe(true);
    expect((((next as unknown as Record<string, unknown>[])[0]).body as unknown[]).length).toBe(1);
  });
});
