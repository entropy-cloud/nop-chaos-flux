import { describe, expect, it, vi } from 'vitest';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import {
  collectTemplateSource,
  createInMemoryTemplateStorage,
  createTemplate,
  instantiateTemplateNodes,
} from './template-model.js';

// register-builtin / symbol-registry 未被本测试消费——mock 掉 leafer-ui 链以防 jsdom 无 canvas 原生对象。
vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

function baseNode(id: string, over: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode {
  return { id, type: 'scada-rect', x: 0, y: 0, width: 10, height: 10, ...over };
}

describe('collectTemplateSource (design-template-station.md §3.1)', () => {
  it('collects top-most selected ancestors only (parent+child both selected → parent once)', () => {
    const symbols: ScadaSymbolNode[] = [
      baseNode('a'),
      {
        id: 'grp',
        type: 'scada-group',
        children: [baseNode('g-child'), baseNode('g-child2')],
      },
      baseNode('b'),
    ];
    const out = collectTemplateSource(symbols, ['grp', 'g-child', 'b']);
    expect(out.map((n) => n.id).sort()).toEqual(['b', 'grp']);
  });

  it('returns [] for empty selection or selection that matches nothing', () => {
    expect(collectTemplateSource([baseNode('a')], [])).toEqual([]);
    expect(collectTemplateSource([baseNode('a')], ['ghost'])).toEqual([]);
  });

  it('deep clones: mutating the source afterwards does not affect the template body', () => {
    const symbols: ScadaSymbolNode[] = [baseNode('a', { fill: '#000000' })];
    const out = collectTemplateSource(symbols, ['a']);
    symbols[0].fill = '#ffffff';
    symbols[0].x = 999;
    expect(out[0].fill).toBe('#000000');
    expect(out[0].x).toBe(0);
  });
});

describe('instantiateTemplateNodes (design-template-station.md §3.2, clipboard 管线复用)', () => {
  it('assigns fresh ids on collision and offsets position', () => {
    const template = collectTemplateSource([baseNode('a', { x: 100, y: 100 })], ['a']);
    const first = instantiateTemplateNodes(template, ['a']);
    expect(first.newIds[0]).not.toBe('a');
    expect(first.nodes[0].x).toBe(120);
    expect(first.nodes[0].y).toBe(120);
    // Second instantiation must not collide with the first instantiation's ids.
    const second = instantiateTemplateNodes(template, ['a', first.newIds[0]]);
    expect(second.newIds[0]).not.toBe('a');
    expect(second.newIds[0]).not.toBe(first.newIds[0]);
  });

  it('rewrites connection targets for junction templates (plan 2026-08-08-1910-2 A7 语义继承)', () => {
    const junction: ScadaSymbolNode = {
      id: 'j1',
      type: 'scada-pipe-junction',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      custom: { connections: [{ id: 'c1', target: 'dev1', direction: 'out' }] },
    };
    const device = baseNode('dev1', { type: 'scada-device-pump' });
    const template = collectTemplateSource([junction, device], ['j1', 'dev1']);
    const { nodes, newIds } = instantiateTemplateNodes(template, ['j1', 'dev1']);
    const newJunction = nodes.find((n) => n.id === newIds[0])!;
    const newConnections = (newJunction.custom as { connections: Array<{ id: string; target?: string }> }).connections;
    expect(newConnections[0].id).not.toBe('c1');
    expect(newConnections[0].target).toBe(newIds[1]);
  });

  it('returns empty result for empty template body', () => {
    const out = instantiateTemplateNodes([], []);
    expect(out.nodes).toEqual([]);
    expect(out.newIds).toEqual([]);
    expect(out.counterConsumed).toBe(0);
  });
});

describe('createInMemoryTemplateStorage (design-template-station.md §3.3)', () => {
  it('save → list → delete round-trip', async () => {
    const storage = createInMemoryTemplateStorage();
    expect(await storage.listTemplates()).toEqual([]);
    const tpl = { id: 't1', name: 'pump pair', createdAt: 1, symbols: [baseNode('a')] };
    await storage.saveTemplate(tpl);
    const list = await storage.listTemplates();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('pump pair');
    // Deep-copy semantics: mutating the returned array does not corrupt the store.
    list[0].symbols.push(baseNode('ghost'));
    expect((await storage.listTemplates())[0].symbols).toHaveLength(1);
    await storage.deleteTemplate('t1');
    expect(await storage.listTemplates()).toEqual([]);
  });
});

describe('collectTemplateSource — nested selection (child-only selection walks into the group)', () => {
  it('collects a selected child inside an unselected group and skips deeper unselected leaves', () => {
    const symbols: ScadaSymbolNode[] = [
      baseNode('solo'),
      {
        id: 'grp',
        type: 'scada-group',
        children: [baseNode('g-child'), { ...baseNode('g-sub'), children: [baseNode('deep')] }],
      },
    ];
    // 仅选组内子图元：walk 递归进入未选中 group（children 真值分支），子图元命中；
    // 未选中的深层叶子走 children 缺省分支被跳过。
    const out = collectTemplateSource(symbols, ['g-child']);
    expect(out.map((n) => n.id)).toEqual(['g-child']);
    // 祖先 + 选中后代并存：祖先已收集，后代不再重复（ancestorSelected 短路保持）。
    const both = collectTemplateSource(symbols, ['grp', 'g-child']);
    expect(both.map((n) => n.id)).toEqual(['grp']);
  });
});

describe('createTemplate (design-template-station.md §2.1 信封)', () => {
  it('creates an envelope with a unique id and creation timestamp, without cloning the body', () => {
    const body = [baseNode('a')];
    const tpl = createTemplate('my template', body);
    expect(tpl.name).toBe('my template');
    expect(tpl.symbols).toBe(body);
    expect(tpl.id).toMatch(/^tpl-\d+-\d+$/);
    expect(tpl.createdAt).toBeLessThanOrEqual(Date.now());
    const other = createTemplate('other', []);
    expect(other.id).not.toBe(tpl.id);
  });
});
