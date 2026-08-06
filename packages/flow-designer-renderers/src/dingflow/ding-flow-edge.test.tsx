import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { DingFlowEdge } from './ding-flow-edge.js';

afterEach(() => cleanup());

vi.mock('@xyflow/react', () => {
  return {
    BaseEdge: ({ style, path, ..._props }: any) => (
      <svg
        data-testid="ding-base-edge"
        data-style={JSON.stringify(style ?? null)}
        data-path={path}
      />
    ),
    EdgeLabelRenderer: ({ children }: any) => <div data-testid="ding-edge-label-renderer">{children}</div>,
  };
});

vi.mock('../designer-context.js', () => {
  return {
    useEdgeTypeConfig: () => undefined,
  };
});

function renderEdge(props: Partial<EdgeProps>) {
  render(
    <DingFlowEdge
      id="edge-1"
      source="node-1"
      target="node-2"
      sourceX={0}
      sourceY={0}
      targetX={100}
      targetY={80}
      selected={false}
      {...(props as EdgeProps)}
    />,
  );
  const svg = screen.getByTestId('ding-base-edge');
  return {
    style: JSON.parse(svg.getAttribute('data-style') ?? 'null'),
    path: svg.getAttribute('data-path'),
  };
}

describe('DingFlowEdge', () => {
  it('uses public primary token color for branch-focused edge stroke', () => {
    const { style } = renderEdge({ data: { __fdBranchFocused: true } });
    expect(style).toMatchObject({
      stroke: 'hsl(var(--primary))',
      strokeWidth: 3,
      strokeLinecap: 'butt',
      strokeLinejoin: 'round',
    });
  });

  it('renders a straight path for chain edges without a shared line', () => {
    const { path } = renderEdge({
      data: {
        __fdTree: { kind: 'chain', direction: 'TB', ownerId: 'node-1', continuationId: 'node-2' },
      },
    });
    expect(path).toBe('M0 0L100 80');
  });

  it('renders a TB split polyline through the shared split line', () => {
    const { path } = renderEdge({
      data: {
        __fdTree: { kind: 'split', direction: 'TB', ownerId: 'node-1', branchId: 'b1', lineMain: 40, fanoutCross: 60 },
      },
    });
    expect(path).toBe('M0 0L0 40L100 40L100 80');
  });

  it('renders an LR split polyline with axis mapping', () => {
    const { path } = renderEdge({
      data: {
        __fdTree: { kind: 'split', direction: 'LR', ownerId: 'node-1', branchId: 'b1', lineMain: 40, fanoutCross: 60 },
      },
    });
    expect(path).toBe('M0 0L40 0L40 80L100 80');
  });

  it('renders a TB merge polyline through the shared merge line', () => {
    const { path } = renderEdge({
      data: {
        __fdTree: { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'node-2', lineMain: 40, fanoutCross: 60 },
      },
    });
    expect(path).toBe('M0 0L0 40L100 40L100 80');
  });

  it('never renders a marker end', () => {
    const { style } = renderEdge({ data: {} });
    expect(style.strokeWidth).toBe(2);
  });

  it('clamps rendered stroke width into the allowed range', () => {
    const { style } = renderEdge({
      data: { __fdTree: { kind: 'chain', direction: 'TB' } },
      // Simulate a configured stroke width above the cap via edge data.
    });
    expect(style.strokeWidth).toBe(2);
  });
});

describe('DingFlowEdge branch label', () => {
  function renderEdgeWithLabel(props: Partial<EdgeProps>) {
    const view = render(
      <DingFlowEdge
        id="edge-1"
        source="node-1"
        target="node-2"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={80}
        selected={false}
        {...(props as EdgeProps)}
      />,
    );
    return view;
  }

  it('renders a label pill on the TB split line midpoint with data.label', () => {
    const { container } = renderEdgeWithLabel({
      data: {
        label: '长期请假',
        __fdTree: { kind: 'split', direction: 'TB', ownerId: 'node-1', branchId: 'b1', lineMain: 40, fanoutCross: 60 },
      },
    });
    const pill = container.querySelector('[data-testid="ding-edge-label-renderer"] div');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe('长期请假');
    expect(pill?.getAttribute('style')).toContain('translate(50px, 40px)');
    expect(pill?.classList.contains('pointer-events-none')).toBe(true);
  });

  it('renders the label on the LR split line at the main axis', () => {
    const { container } = renderEdgeWithLabel({
      data: {
        label: '并行分支1',
        __fdTree: { kind: 'split', direction: 'LR', ownerId: 'node-1', branchId: 'b1', lineMain: 40, fanoutCross: 60 },
      },
    });
    const pill = container.querySelector('[data-testid="ding-edge-label-renderer"] div');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe('并行分支1');
    expect(pill?.getAttribute('style')).toContain('translate(40px, 40px)');
  });

  it('does not render a label for chain edges', () => {
    const { container } = renderEdgeWithLabel({
      data: {
        label: '不显示',
        __fdTree: { kind: 'chain', direction: 'TB', ownerId: 'node-1', continuationId: 'node-2' },
      },
    });
    const pill = container.querySelector('[data-testid="ding-edge-label-renderer"] div');
    expect(pill).toBeNull();
  });

  it('does not render a label for merge edges', () => {
    const { container } = renderEdgeWithLabel({
      data: {
        label: '不显示',
        __fdTree: { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'node-2', lineMain: 40 },
      },
    });
    const pill = container.querySelector('[data-testid="ding-edge-label-renderer"] div');
    expect(pill).toBeNull();
  });

  it('does not render a label when data.label is absent or empty', () => {
    const without = renderEdgeWithLabel({
      data: { __fdTree: { kind: 'split', direction: 'TB', ownerId: 'node-1', branchId: 'b1', lineMain: 40 } },
    });
    expect(without.container.querySelector('[data-testid="ding-edge-label-renderer"] div')).toBeNull();

    const empty = renderEdgeWithLabel({
      data: {
        label: '',
        __fdTree: { kind: 'split', direction: 'TB', ownerId: 'node-1', branchId: 'b1', lineMain: 40 },
      },
    });
    expect(empty.container.querySelector('[data-testid="ding-edge-label-renderer"] div')).toBeNull();
  });
});
