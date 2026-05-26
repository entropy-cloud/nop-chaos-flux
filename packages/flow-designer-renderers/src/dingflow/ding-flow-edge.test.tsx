// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { DingFlowEdge } from './ding-flow-edge.js';

afterEach(() => cleanup());

vi.mock('@xyflow/react', () => {
  return {
    BaseEdge: ({ style, ..._props }: any) => <svg data-testid="ding-base-edge" data-style={JSON.stringify(style ?? null)} />,
    EdgeLabelRenderer: ({ children }: any) => <div data-testid="ding-edge-label-renderer">{children}</div>,
  };
});

vi.mock('../designer-context.js', () => {
  return {
    useEdgeTypeConfig: () => undefined,
  };
});

describe('DingFlowEdge', () => {
  it('uses public primary token color for branch-focused edge stroke', () => {
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
        data={{ __fdBranchFocused: true } as EdgeProps['data']}
      />,
    );

    const style = JSON.parse(screen.getByTestId('ding-base-edge').getAttribute('data-style') ?? 'null');
    expect(style).toMatchObject({
      stroke: 'hsl(var(--primary))',
      strokeWidth: 3,
    });
  });
});
