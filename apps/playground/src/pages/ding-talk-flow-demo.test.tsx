import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const fitView = vi.fn();

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Background: () => null,
  BaseEdge: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Bottom: 'bottom' },
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ViewportPortal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dingtalk-viewport-portal">{children}</div>
  ),
  useReactFlow: () => ({ fitView }),
}));

import { DingTalkFlowDemo } from './ding-talk-flow-demo';

describe('DingTalkFlowDemo', () => {
  afterEach(() => {
    cleanup();
    fitView.mockReset();
  });

  it('renders the initial branch and merge overlays from the flow graph', () => {
    render(<DingTalkFlowDemo onBack={() => undefined} />);

    expect(screen.getByText('Add Condition')).toBeTruthy();

    const portal = screen.getByTestId('dingtalk-viewport-portal');
    expect(portal.children).toHaveLength(2);
    expect(portal.querySelectorAll('svg')).toHaveLength(1);
  });
});
