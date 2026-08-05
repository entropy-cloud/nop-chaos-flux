import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  const MockReactFlow = vi.fn((props: Record<string, unknown>) => {
    // 透传子元素，便于节点/背景断言
    return (
      <div data-mock-xyflow={JSON.stringify({
        nodesDraggable: props.nodesDraggable,
        nodesConnectable: props.nodesConnectable,
        selectionOnDrag: props.selectionOnDrag,
        selectNodesOnDrag: props.selectNodesOnDrag,
        multiSelectionKeyCode: props.multiSelectionKeyCode,
        deleteKeyCode: props.deleteKeyCode,
        elementsSelectable: props.elementsSelectable,
        panOnDrag: props.panOnDrag,
        zoomOnScroll: props.zoomOnScroll,
        onlyRenderVisibleElements: props.onlyRenderVisibleElements,
      })}>
        {props.children as React.ReactNode}
      </div>
    );
  });
  return {
    ...actual,
    ReactFlow: MockReactFlow,
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Background: () => null,
  };
});

const { XyflowCanvas } = await import('./xyflow-canvas.js');
import type { GraphCanvasNode, GraphCanvasEdge } from './xyflow-canvas.js';
import type { GraphViewport } from './graph-store.js';

afterEach(() => {
  cleanup();
});

const VIEWPORT: GraphViewport = { x: 0, y: 0, zoom: 1 };

function noop() {
  // no-op
}

describe('XyflowCanvas (只读配置硬契约)', () => {
  it('disables drag, connect, multi-select and box-select (design §2.1-1)', () => {
    const { container } = render(
      <XyflowCanvas
        nodes={[]}
        edges={[]}
        viewport={VIEWPORT}
        onViewportChange={noop}
        fitView
        zoomable
        pannable
        minZoom={0.2}
        maxZoom={2}
        onNodeClick={noop}
        onNodeDoubleClick={noop}
        onSelectionChange={noop}
        onPaneClick={noop}
        onInstanceReady={noop}
      />,
    );
    const flowProps = JSON.parse(
      container.querySelector('[data-mock-xyflow]')?.getAttribute('data-mock-xyflow') ?? '{}',
    );
    expect(flowProps.nodesDraggable).toBe(false);
    expect(flowProps.nodesConnectable).toBe(false);
    expect(flowProps.selectionOnDrag).toBe(false);
    expect(flowProps.selectNodesOnDrag).toBe(false);
    expect(flowProps.multiSelectionKeyCode).toBeNull();
    expect(flowProps.deleteKeyCode).toBeNull();
    expect(flowProps.elementsSelectable).toBe(false);
  });

  it('routes pannable/zoomable and viewport into ReactFlow', () => {
    const { container } = render(
      <XyflowCanvas
        nodes={[] as GraphCanvasNode[]}
        edges={[] as GraphCanvasEdge[]}
        viewport={VIEWPORT}
        onViewportChange={noop}
        fitView
        zoomable={false}
        pannable={false}
        minZoom={0.2}
        maxZoom={2}
        onNodeClick={noop}
        onNodeDoubleClick={noop}
        onSelectionChange={noop}
        onPaneClick={noop}
        onInstanceReady={noop}
      />,
    );
    const flowProps = JSON.parse(
      container.querySelector('[data-mock-xyflow]')?.getAttribute('data-mock-xyflow') ?? '{}',
    );
    expect(flowProps.panOnDrag).toBe(false);
    expect(flowProps.zoomOnScroll).toBe(false);
  });

  it('emits graph-viewport slot marker', () => {
    const { container } = render(
      <XyflowCanvas
        nodes={[]}
        edges={[]}
        viewport={VIEWPORT}
        onViewportChange={noop}
        fitView
        zoomable
        pannable
        minZoom={0.2}
        maxZoom={2}
        onNodeClick={noop}
        onNodeDoubleClick={noop}
        onSelectionChange={noop}
        onPaneClick={noop}
        onInstanceReady={noop}
      />,
    );
    expect(container.querySelector('[data-slot="graph-viewport"]')).toBeTruthy();
  });
});
