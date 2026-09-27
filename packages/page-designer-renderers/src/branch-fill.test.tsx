/**
 * 分支收口补充：桥的降级/守卫路径、几何模型数组根、页面 Ctrl+Y / 大纲树选择、
 * registry/icon 兜底、palette 未知分组、字段模型事件兜底。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, SchemaInput } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import { buildCanvasLayoutModel, buildRootDropHint } from './canvas-layout.js';
import { PageDesignerCanvas } from './canvas-bridge.js';
import { PageDesigner } from './page-designer-page.js';
import { PalettePanel } from './palette-panel.js';
import { buildMvpPaletteItems } from './designer-registry.js';
import { buildInspectorPanelModel } from './inspector-field-model.js';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { createPageDesignerRegistry } from './designer-registry.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

describe('canvas-bridge fallbacks', () => {
  it('falls back to rect hit-testing when elementsFromPoint is unavailable', async () => {
    const registry = createPageDesignerRegistry();
    const doc = injectSessionIds({ type: 'page', body: [] }, createSeededRandom(41));
    const onPaneClick = vi.fn();
    const view = render(
      <PageDesignerCanvas
        document={doc}
        registry={registry}
        env={{ fetch: async () => new Response() } as never}
        mode="edit"
        selection={[]}
        hoverNodeId={null}
        dropHint={null}
        onNodePointerDown={vi.fn()}
        onNodeHover={vi.fn()}
        onPaneClick={onPaneClick}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
        onDrop={vi.fn()}
        onRequestDelete={vi.fn()}
        onRequestDuplicate={vi.fn()}
      />,
    );
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
    const original = document.elementsFromPoint;
    delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
    try {
      fireEvent.pointerDown(view.getByTestId('page-designer-canvas'), { clientX: 10, clientY: 10 });
    } finally {
      document.elementsFromPoint = original;
    }
    // 矩形全零：命中失败 → pane click。
    expect(onPaneClick).toHaveBeenCalled();
  });

  it('pointer and drag handlers are inert in preview mode', async () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'page',
        defaultSchema: { type: 'page', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    const doc = injectSessionIds({ type: 'page', body: [] }, createSeededRandom(42));
    const onNodePointerDown = vi.fn();
    const onDragOver = vi.fn();
    const onDrop = vi.fn();
    const view = render(
      <PageDesignerCanvas
        document={doc}
        registry={registry}
        env={{ fetch: async () => new Response() } as never}
        mode="preview"
        selection={[]}
        hoverNodeId={null}
        dropHint={null}
        onNodePointerDown={onNodePointerDown}
        onNodeHover={vi.fn()}
        onPaneClick={vi.fn()}
        onDragOver={onDragOver}
        onDragLeave={vi.fn()}
        onDrop={onDrop}
        onRequestDelete={vi.fn()}
        onRequestDuplicate={vi.fn()}
      />,
    );
    const canvas = view.getByTestId('page-designer-canvas');
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1 });
    const dragOver = new Event('dragover', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dragOver, 'dataTransfer', { value: { dropEffect: 'none' } });
    fireEvent(canvas, dragOver);
    dropDrag(canvas);
    expect(onNodePointerDown).not.toHaveBeenCalled();
    expect(onDragOver).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });
});

function dropDrag(canvas: HTMLElement) {
  const drop = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(drop, 'dataTransfer', { value: { getData: () => '', dropEffect: 'copy' } });
  fireEvent(canvas, drop);
}

describe('canvas-layout array roots', () => {
  it('supports array documents and invalid root fallback', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'page',
        defaultSchema: { type: 'page', body: [] },
        fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      }),
    );
    registry.register(def({ type: 'atom', defaultSchema: { type: 'atom' } }));
    const doc = injectSessionIds(
      [{ type: 'page', body: [{ type: 'atom' }] }],
      createSeededRandom(43),
    );
    const model = buildCanvasLayoutModel(doc, registry);
    expect(model.nodes.map((node) => node.type)).toEqual(['page', 'atom']);
    expect(model.rootSid).toBe(model.nodes[0].sid);

    const atomDoc = injectSessionIds({ type: 'atom' }, createSeededRandom(44));
    expect(buildRootDropHint(atomDoc, registry)).toEqual({ kind: 'invalid' });
  });
});

describe('page designer misc branches', () => {
  it('Ctrl+Y redoes and structure tree selects nodes', async () => {
    const view = render(<PageDesigner />);
    await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-palette-item="text"]')!);
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));
    fireEvent.click(view.getByTestId('page-designer-undo'));
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(1));
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    await waitFor(() => expect(document.querySelectorAll('[data-psid]').length).toBe(2));

    // 大纲树 tab：展开并选中节点。
    fireEvent.click(screen.getByText('大纲树'));
    const tree = await waitFor(() => {
      const element = document.querySelector('[data-testid="page-designer-structure-tree"]');
      expect(element).toBeTruthy();
      return element!;
    });
    fireEvent.click(tree.querySelector('[data-testid^="page-designer-tree-node-"]')!);
    await waitFor(() => {
      expect(tree.querySelector('[data-testid^="page-designer-tree-node-"]')?.className).toContain('bg-');
    });
  });
});

describe('palette/registry branch fillers', () => {
  it('renders unknown groups after known ones', () => {
    render(
      <PalettePanel
        items={[
          { type: 'a', displayName: 'A', group: 'layout', isContainer: true, isOpaqueLeaf: false },
          { type: 'b', displayName: 'B', group: 'mystery', isContainer: false, isOpaqueLeaf: false },
        ]}
        onItemClick={vi.fn()}
      />,
    );
    const groups = [...document.querySelectorAll('[data-palette-group]')].map((el) =>
      el.getAttribute('data-palette-group'),
    );
    expect(groups).toEqual(['layout', 'mystery']);
  });

  it('supplement path passes icon through for scaffolded whitelist entries', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'text', displayName: 'Text', icon: 'Type', category: 'basic' }));
    const items = buildMvpPaletteItems(registry);
    const text = items.find((item) => item.type === 'text');
    expect(text?.icon).toBe('Type');
    expect(text?.group).toBe('basic');
  });
});

describe('inspector-field-model event fallback', () => {
  it('falls back to the raw name when an event lacks displayName', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'plain-events',
        defaultSchema: { type: 'plain-events' },
        propContracts: { size: { shape: { kind: 'number' }, displayName: 'Size' } },
        eventContracts: { fire: { displayName: 'Fire!' } },
      }),
    );
    const definition = registry.get('plain-events')!;
    const node = injectSessionIds({ type: 'plain-events' }, createSeededRandom(45)) as never;
    const schema = buildInspectorSchema(resolveRendererAuthoringContract(definition)) as SchemaInput;
    const model = buildInspectorPanelModel({ nodeId: 'psid-f', node, schema });
    expect(model.events.map((event) => event.displayName)).toEqual(['Fire!']);

    const schema2 = {
      type: 'form',
      body: [],
      'xui:events': [{ name: 'bare' }],
    } as unknown as SchemaInput;
    const model2 = buildInspectorPanelModel({ nodeId: 'psid-f', node, schema: schema2 });
    expect(model2.events.map((event) => event.displayName)).toEqual(['bare']);
  });
});
