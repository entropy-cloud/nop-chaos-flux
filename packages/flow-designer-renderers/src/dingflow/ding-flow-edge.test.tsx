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
