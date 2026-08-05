import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { GraphNodeView } from './graph-node.js';
import type { GraphNodeViewData } from './graph-node.js';
import type { GraphNode } from './schemas.js';

afterEach(() => {
  cleanup();
});

function nodeProps(data: GraphNodeViewData): NodeProps {
  return { id: data.nodeId, data } as unknown as NodeProps;
}

function renderNode(data: GraphNodeViewData) {
  return render(
    <ReactFlowProvider>
      <GraphNodeView {...nodeProps(data)} />
    </ReactFlowProvider>,
  );
}

function viewData(overrides: Partial<GraphNodeViewData> = {}): GraphNodeViewData {
  return {
    node: { id: 'a', label: 'Node A' } as GraphNode,
    nodeId: 'a',
    index: 0,
    selected: false,
    matching: false,
    ...overrides,
  };
}

describe('GraphNodeView', () => {
  it('falls back to label text when no region content is provided', () => {
    const { container } = renderNode(viewData());
    const label = container.querySelector('[data-slot="graph-node-label"]');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('Node A');
  });

  it('falls back to node id when label is missing', () => {
    const { container } = renderNode(viewData({ node: { id: 'b' } as GraphNode }));
    expect(container.querySelector('[data-slot="graph-node-label"]')?.textContent).toBe('b');
  });

  it('renders region-compiled content instead of the label fallback', () => {
    const { container } = renderNode(
      viewData({ content: <span data-testid="custom-node">Custom</span> }),
    );
    expect(container.querySelector('[data-testid="custom-node"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="graph-node-label"]')).toBeNull();
  });

  it('publishes data-level / data-selected / data-matching markers (design §10)', () => {
    const { container } = renderNode(
      viewData({ semanticLevel: 'danger', matching: true, selected: true }),
    );
    const node = container.querySelector('[data-slot="graph-node"]');
    expect(node?.getAttribute('data-level')).toBe('danger');
    expect(node?.getAttribute('data-selected')).toBe('true');
    expect(node?.getAttribute('data-matching')).toBe('true');
  });

  it('does not publish data-level when semantic level is undefined', () => {
    const { container } = renderNode(viewData({ semanticLevel: undefined }));
    expect(container.querySelector('[data-slot="graph-node"]')?.getAttribute('data-level')).toBeNull();
  });
});
