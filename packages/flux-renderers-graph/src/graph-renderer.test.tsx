import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandle, ComponentHandleRegistry, RendererEventHandler } from '@nop-chaos/flux-core';
import { createMockRendererProps } from './test-support.js';
import type { GraphSchema, GraphNode } from './schemas.js';

const registerMock = vi.fn();
const mockRegistry = {
  register: registerMock,
} as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockRegistry,
  };
});

interface ReactFlowPropsCapture {
  nodes: Array<{
    id: string;
    data: { selected?: boolean; semanticLevel?: string; matching?: boolean };
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
  onNodeClick: (event: unknown, node: { id: string }) => void;
  onNodeDoubleClick: (event: unknown, node: { id: string }) => void;
  onSelectionChange: (change: { nodes: Array<{ id: string }> }) => void;
  onPaneClick: () => void;
  onInit: (instance: unknown) => void;
}

let flowCapture: ReactFlowPropsCapture | null = null;

function simulateNodeClick(nodeId: string) {
  act(() => {
    flowCapture!.onNodeClick(null, { id: nodeId });
  });
}

const fakeInstance = {
  fitView: vi.fn(),
  setCenter: vi.fn(),
  getZoom: () => 1,
};

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  const ReactFlowMock = vi.fn((props: Record<string, unknown>) => {
    const typed = props as unknown as ReactFlowPropsCapture & Record<string, unknown>;
    flowCapture = {
      nodes: (props.nodes as ReactFlowPropsCapture['nodes']) ?? [],
      edges: (props.edges as ReactFlowPropsCapture['edges']) ?? [],
      onNodeClick: typed.onNodeClick,
      onNodeDoubleClick: typed.onNodeDoubleClick,
      onSelectionChange: typed.onSelectionChange,
      onPaneClick: typed.onPaneClick,
      onInit: typed.onInit,
    };
    return (
      <div data-mock-flow>
        {flowCapture.nodes.map((node) => (
          <div
            key={node.id}
            data-mock-node-id={node.id}
            data-mock-selected={node.data?.selected ? 'true' : undefined}
            data-mock-level={node.data?.semanticLevel}
            data-mock-matching={node.data?.matching ? 'true' : undefined}
          />
        ))}
      </div>
    );
  });
  return {
    ...actual,
    ReactFlow: ReactFlowMock,
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Background: () => null,
  };
});

const { GraphRenderer } = await import('./graph-renderer.js');

afterEach(() => {
  cleanup();
  registerMock.mockReset();
  fakeInstance.fitView.mockReset();
  fakeInstance.setCenter.mockReset();
  flowCapture = null;
});

function lastHandle(): ComponentHandle {
  const last = registerMock.mock.calls.at(-1)?.[0] as ComponentHandle | undefined;
  if (!last) {
    throw new Error('no handle registered');
  }
  return last;
}

const NODES: GraphNode[] = [
  { id: 'a', label: 'Root', type: 'model_call', level: 'error' },
  { id: 'b', label: 'Child', type: 'tool_call', level: 'warning' },
  { id: 'c', label: 'Leaf', type: 'output', level: 'info' },
];

function renderGraph(props: Record<string, unknown> = {}, events: Record<string, RendererEventHandler | undefined> = {}) {
  const rendererProps = createMockRendererProps<GraphSchema>({
    schema: { type: 'graph' },
    props: { nodes: NODES, edges: [{ source: 'a', target: 'b' }], searchable: true, ...props },
    events,
    meta: { cid: 42 },
  });
  const utils = render(<GraphRenderer {...rendererProps} />);
  return { utils, rendererProps };
}

function invoke(method: string, payload?: Record<string, unknown>) {
  let result: unknown;
  act(() => {
    result = lastHandle().capabilities.invoke(method, payload, {} as never);
  });
  return result;
}

describe('GraphRenderer', () => {
  it('renders the nop-graph marker with one canvas node per node and mapped data-level (design §4.2 levelMap)', () => {
    const { utils } = renderGraph({}, {});
    expect(utils.container.querySelector('[data-slot="graph"]')).toBeTruthy();
    const ids = Array.from(utils.container.querySelectorAll('[data-mock-node-id]')).map(
      (el) => el.getAttribute('data-mock-node-id'),
    );
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(utils.container.querySelector('[data-mock-node-id="a"]')?.getAttribute('data-mock-level')).toBe(
      'danger',
    );
    expect(utils.container.querySelector('[data-mock-node-id="b"]')?.getAttribute('data-mock-level')).toBe(
      'warning',
    );
  });

  it('renders empty slot when nodes and edges are both empty (design §6 graph-empty)', () => {
    const { utils } = renderGraph({ nodes: [], edges: [] }, {});
    expect(utils.container.querySelector('[data-slot="graph-empty"]')).toBeTruthy();
  });

  it('does not throw with dangling edges and passes only sanitized edges to the canvas', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { utils } = renderGraph({ edges: [{ source: 'a', target: 'ghost' }] }, {});
    expect(utils.container.querySelector('[data-slot="graph"]')).toBeTruthy();
    expect(flowCapture?.edges).toHaveLength(0);
    expect(flowCapture?.nodes).toHaveLength(3);
    // 畸形数据硬契约（design §6）：边引用缺失节点 → 跳过 + dev 告警
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('skipped 1 dangling edge(s)'),
      expect.any(Array),
    );
    warnSpy.mockRestore();
  });

  it('single-select model: onNodeClick selects one node and deselect via pane (payload null)', () => {
    const onSelectionChange = vi.fn();
    const onNodeClick = vi.fn();
    renderGraph(
      {},
      {
        onSelectionChange: onSelectionChange as RendererEventHandler,
        onNodeClick: onNodeClick as RendererEventHandler,
      },
    );

    simulateNodeClick('b');
    expect(flowCapture?.nodes.find((n) => n.id === 'b')?.data.selected).toBe(true);
    const clickPayload = onNodeClick.mock.calls.at(-1)?.[0] as { nodeId: string; node: GraphNode };
    expect(clickPayload.nodeId).toBe('b');
    expect(clickPayload.node.label).toBe('Child');

    act(() => {
      flowCapture!.onPaneClick();
    });
    const payload = onSelectionChange.mock.calls.at(-1)?.[0] as { nodeId: string | null; node: GraphNode | null };
    expect(payload.nodeId).toBeNull();
    expect(payload.node).toBeNull();
    expect(flowCapture?.nodes.some((n) => n.data.selected)).toBe(false);
  });

  it('onSelectionChange carries the full node payload on selection', () => {
    const onSelectionChange = vi.fn();
    renderGraph({}, { onSelectionChange: onSelectionChange as RendererEventHandler });
    act(() => {
      flowCapture!.onSelectionChange({ nodes: [{ id: 'a' }] });
    });
    const payload = onSelectionChange.mock.calls.at(-1)?.[0] as { nodeId: string; node: GraphNode };
    expect(payload.nodeId).toBe('a');
    expect(payload.node?.id).toBe('a');
  });

  it('focusNode handle: unknown nodeId falls back to fitView and never throws (design §8.2)', () => {
    renderGraph();
    act(() => {
      flowCapture!.onInit(fakeInstance);
    });
    const result = invoke('focusNode', { nodeId: 'does-not-exist' });
    expect(result).toEqual({ ok: true, data: { located: false } });
    expect(fakeInstance.fitView).toHaveBeenCalled();
    expect(flowCapture?.nodes.some((n) => n.data.selected)).toBe(false);
  });

  it('focusNode handle: known nodeId locates and selects the node', () => {
    renderGraph();
    act(() => {
      flowCapture!.onInit(fakeInstance);
    });
    const result = invoke('focusNode', { nodeId: 'c' });
    expect(result).toEqual({ ok: true, data: { located: true } });
    expect(fakeInstance.setCenter).toHaveBeenCalled();
    expect(flowCapture?.nodes.find((n) => n.id === 'c')?.data.selected).toBe(true);
  });

  it('setLayout handle: invalid layout is ignored and current layout kept (design §8.2)', () => {
    const { utils } = renderGraph();
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-layout')).toBe('flow');
    const result = invoke('setLayout', { layout: 'radial' });
    expect(result).toEqual({ ok: true, data: { layout: 'flow', skipped: true } });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-layout')).toBe('flow');
  });

  it('setLayout handle: valid layout switches at runtime', () => {
    const { utils } = renderGraph();
    const result = invoke('setLayout', { layout: 'hierarchy' });
    expect(result).toEqual({ ok: true, data: { layout: 'hierarchy' } });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-layout')).toBe(
      'hierarchy',
    );
  });

  it('syncs the layout schema prop into the store at runtime (22-06)', () => {
    const { utils, rendererProps } = renderGraph({ layout: 'flow' }, {});
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-layout')).toBe(
      'flow',
    );
    act(() => {
      utils.rerender(
        <GraphRenderer
          {...rendererProps}
          props={{ ...rendererProps.props, layout: 'hierarchy' }}
        />,
      );
    });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-layout')).toBe(
      'hierarchy',
    );
  });

  it('search handle: empty keyword clears the search state', () => {
    const { utils } = renderGraph();
    invoke('search', { keyword: 'root' });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-state')).toBe(
      'searching',
    );
    invoke('search', { keyword: '' });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-state')).toBeNull();
    expect(flowCapture?.nodes.every((n) => !n.data.matching)).toBe(true);
  });

  it('search handle: no match keeps searching active with no highlight (design §8.2)', () => {
    const { utils } = renderGraph();
    const result = invoke('search', { keyword: 'nonexistent' });
    expect(result).toEqual({ ok: true, data: { count: 0 } });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-state')).toBe(
      'searching',
    );
    expect(flowCapture?.nodes.every((n) => !n.data.matching)).toBe(true);
  });

  it('search handle stays available when searchable:false (design §8.2)', () => {
    const { utils } = renderGraph({ searchable: false });
    expect(utils.container.querySelector('[data-slot="graph-search-input"]')).toBeNull();
    const result = invoke('search', { keyword: 'root' });
    expect(result).toEqual({ ok: true, data: { count: 1 } });
    expect(utils.container.querySelector('[data-slot="graph"]')?.getAttribute('data-state')).toBe(
      'searching',
    );
    expect(flowCapture?.nodes.find((n) => n.id === 'a')?.data.matching).toBe(true);
  });

  it('search handle: matches highlight nodes and select the first match', () => {
    renderGraph();
    act(() => {
      flowCapture!.onInit(fakeInstance);
    });
    const result = invoke('search', { keyword: 'call' });
    expect(result).toEqual({ ok: true, data: { count: 2 } });
    const matching = flowCapture?.nodes.filter((n) => n.data.matching).map((n) => n.id);
    expect(matching).toEqual(['a', 'b']);
    expect(flowCapture?.nodes.find((n) => n.id === 'a')?.data.selected).toBe(true);
    expect(fakeInstance.setCenter).toHaveBeenCalled();
  });

  it('zoomIn/zoomOut/fitView/resetView handles exist and never throw when instance is not mounted', () => {
    renderGraph();
    const handle = lastHandle();
    expect(handle.capabilities.listMethods!()).toEqual([
      'zoomIn',
      'zoomOut',
      'fitView',
      'resetView',
      'setLayout',
      'focusNode',
      'search',
    ]);
    for (const method of ['zoomIn', 'zoomOut', 'fitView', 'resetView']) {
      expect(() => handle.capabilities.invoke(method, undefined, {} as never)).not.toThrow();
    }
  });

  it('event dispatch ctx: onNodeClick carries { event, evaluationBindings, scope } so ${nodeId} resolves', () => {
    const onNodeClick = vi.fn();
    const { rendererProps } = renderGraph({}, { onNodeClick: onNodeClick as RendererEventHandler });
    // The mock props start with an empty node; inject a scope stub to verify
    // the ctx injection (mirrors the carousel ctx contract test).
    (rendererProps.node as { scope?: unknown }).scope = { stub: true };

    simulateNodeClick('b');

    const clickCall = onNodeClick.mock.calls.at(-1) as unknown as [unknown, unknown] | undefined;
    const ctx = clickCall?.[1] as
      | {
          event?: unknown;
          evaluationBindings?: Record<string, unknown>;
          scope?: unknown;
        }
      | undefined;
    expect(ctx?.event).toMatchObject({ type: 'graph:node-click', nodeId: 'b' });
    expect(ctx?.evaluationBindings?.nodeId).toBe('b');
    expect(ctx?.evaluationBindings?.node).toMatchObject({ id: 'b' });
    expect(ctx?.scope).toBeTruthy();
  });

  it('event dispatch ctx: onSelectionChange carries { event, evaluationBindings, scope } so ${nodeId} resolves', () => {
    const onSelectionChange = vi.fn();
    const { rendererProps } = renderGraph(
      {},
      { onSelectionChange: onSelectionChange as RendererEventHandler },
    );
    (rendererProps.node as { scope?: unknown }).scope = { stub: true };

    act(() => {
      flowCapture!.onSelectionChange({ nodes: [{ id: 'a' }] });
    });

    const changeCall = onSelectionChange.mock.calls.at(-1) as unknown as [unknown, unknown] | undefined;
    const ctx = changeCall?.[1] as
      | {
          event?: unknown;
          evaluationBindings?: Record<string, unknown>;
          scope?: unknown;
        }
      | undefined;
    expect(ctx?.event).toMatchObject({ type: 'graph:selection-change', nodeId: 'a' });
    expect(ctx?.evaluationBindings?.nodeId).toBe('a');
    expect(ctx?.scope).toBeTruthy();
  });

  it('event payload type is namespaced (17-2): onNodeClick dispatches graph:node-click', () => {
    const onNodeClick = vi.fn();
    renderGraph({}, { onNodeClick: onNodeClick as RendererEventHandler });

    simulateNodeClick('b');

    const payload = onNodeClick.mock.calls.at(-1)?.[0] as { type: string; nodeId: string };
    expect(payload.type).toBe('graph:node-click');
    expect(payload.nodeId).toBe('b');
  });

  it('event payload type is namespaced (17-2): onNodeDoubleClick dispatches graph:node-double-click', () => {
    const onNodeDoubleClick = vi.fn();
    renderGraph({}, { onNodeDoubleClick: onNodeDoubleClick as RendererEventHandler });

    act(() => {
      flowCapture!.onNodeDoubleClick(null, { id: 'a' });
    });

    const payload = onNodeDoubleClick.mock.calls.at(-1)?.[0] as {
      type: string;
      nodeId: string;
    };
    expect(payload.type).toBe('graph:node-double-click');
    expect(payload.nodeId).toBe('a');
  });

  it('event payload type is namespaced (17-2): onSelectionChange dispatches graph:selection-change', () => {
    const onSelectionChange = vi.fn();
    renderGraph({}, { onSelectionChange: onSelectionChange as RendererEventHandler });

    act(() => {
      flowCapture!.onSelectionChange({ nodes: [{ id: 'c' }] });
    });

    const payload = onSelectionChange.mock.calls.at(-1)?.[0] as {
      type: string;
      nodeId: string | null;
    };
    expect(payload.type).toBe('graph:selection-change');
    expect(payload.nodeId).toBe('c');
  });
});
