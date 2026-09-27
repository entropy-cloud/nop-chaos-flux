/**
 * 分支收口第三组：纯函数/渲染分支的直接单元覆盖。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, SchemaInput } from '@nop-chaos/flux-core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildInspectorPanelModel } from './inspector-field-model.js';
import { buildCanvasLayoutModel, buildRootDropHint } from './canvas-layout.js';
import { buildMvpPaletteItems } from './designer-registry.js';
import { StructureTree } from './structure-tree.js';
import { PalettePanel } from './palette-panel.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

describe('inspector-field-model junk-field branches', () => {
  it('skips malformed generated fields and falls back labels/controls', () => {
    const schema = {
      type: 'form',
      body: [
        'not-a-schema',
        { type: 'input' },
        { type: 'input', name: '' },
        { type: 'select', name: 'opts', options: [{ label: 'A', value: 1 }, 'junk', { label: 'B' }] },
        { name: 'no-type' },
        { type: 'input', name: 'described', description: 'Has description' },
      ],
    } as unknown as SchemaInput;
    const node = { type: 'some-widget' } as never;
    const model = buildInspectorPanelModel({ nodeId: 'psid-k', node, schema });
    const names = model.fields.map((field) => field.name);
    // 非 schema 字段（无 type）被跳过（isSchema 分支）。
    expect(names).toEqual(['opts', 'described']);
    const opts = model.fields.find((field) => field.name === 'opts')!;
    expect(opts.options).toEqual([{ label: 'A', value: 1 }]);
    expect(model.fields.find((field) => field.name === 'described')?.description).toBe('Has description');
  });

  it('infers renderer type fallback for typeless nodes', () => {
    const schema = { type: 'form', body: [] } as unknown as SchemaInput;
    const model = buildInspectorPanelModel({ nodeId: 'psid-l', node: {} as never, schema });
    expect(model.rendererType).toBeNull();
  });
});

describe('canvas-layout malformed-doc branches', () => {
  it('skips non-schema and sid-less entries; root fallbacks', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'container',
        defaultSchema: { type: 'container', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    registry.register(def({ type: 'atom' }));
    const registryWithOpaque = createRendererRegistry();
    registryWithOpaque.register(
      def({
        type: 'opaque',
        rendererClass: 'domain-host-renderer',
        defaultSchema: { type: 'opaque', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );

    // 非 schema 数组项 / 无 sid 节点 → 全部跳过。
    const bare = { type: 'atom', body: [{ type: 'atom' }] } as unknown as SchemaInput;
    const model = buildCanvasLayoutModel(bare, registry);
    expect(model.nodes).toEqual([]);
    expect(model.rootSid).toBeNull();

    // 数组根 + 未注册 type 的容器命中（hitDefinition undefined → 非 opaque）。
    const mixed = [
      'junk',
      { type: 'container', body: [{ type: 'atom' }], 'xui:sid': 'psid-c1' },
    ] as unknown as SchemaInput;
    const model2 = buildCanvasLayoutModel(mixed, registry);
    // 无 sid 的子节点不进锚点模型。
    expect(model2.nodes.map((node) => node.type)).toEqual(['container']);

    // 根回退：数组空根 / 无 sid 根 / 无 region 根 → null 或 invalid。
    expect(buildRootDropHint([], registry)).toBeNull();
    expect(buildRootDropHint({ type: 'container', body: [] } as SchemaInput, registry)).toBeNull();
    expect(buildRootDropHint({ type: 'atom', 'xui:sid': 'psid-a' } as SchemaInput, registry)).toEqual({
      kind: 'invalid',
    });

    // opaque 命中且 definition 未注册（兜底非 opaque 路径由 canvas-layout.test 覆盖）。
    const opaqueDoc = { type: 'opaque', body: [], 'xui:sid': 'psid-o' } as unknown as SchemaInput;
    const model3 = buildCanvasLayoutModel(opaqueDoc, registryWithOpaque);
    expect(model3.nodes[0].type).toBe('opaque');
  });
});

describe('palette/registry/structure-tree branch fill', () => {
  it('sorts unknown first-rank groups after known ones', () => {
    render(
      <PalettePanel
        items={[
          { type: 'b', displayName: 'B', group: 'mystery', isContainer: false, isOpaqueLeaf: false },
          { type: 'a', displayName: 'A', group: 'layout', isContainer: true, isOpaqueLeaf: false },
        ]}
        onItemClick={vi.fn()}
      />,
    );
    const groups = [...document.querySelectorAll('[data-palette-group]')].map((el) =>
      el.getAttribute('data-palette-group'),
    );
    expect(groups).toEqual(['layout', 'mystery']);
  });

  it('skips opaque-leaf and unscaffoldable supplement entries', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'grid',
        rendererClass: 'domain-host-renderer',
        defaultSchema: { type: 'grid', items: [] },
      }),
    );
    registry.register(def({ type: 'container' }));
    const items = buildMvpPaletteItems(registry);
    expect(items).toEqual([]);
  });

  it('structure tree supports array documents and unregistered types', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'page',
        displayName: 'Page',
        defaultSchema: { type: 'page', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    const doc = [
      { type: 'page', name: 'root-page', body: [{ type: 'mystery-type', 'xui:sid': 'psid-m' }], 'xui:sid': 'psid-p' },
      'junk',
    ] as unknown as SchemaInput;
    render(<StructureTree document={doc} registry={registry} selection={[]} onSelect={vi.fn()} />);
    const types = [...document.querySelectorAll('[data-tree-node-type]')].map((el) =>
      el.getAttribute('data-tree-node-type'),
    );
    expect(types).toEqual(['page', 'mystery-type']);
  });
});
