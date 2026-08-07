import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TREE_EMPTY_SLOT_NODE_TYPE } from '@nop-chaos/flow-designer-core';
import { DesignerXyflowNode } from './designer-xyflow-canvas/index.js';

const onPlusButtonClick = vi.fn();

afterEach(() => {
  cleanup();
  onPlusButtonClick.mockClear();
});

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  NodeToolbar: ({ children, isVisible }: { children?: React.ReactNode; isVisible?: boolean }) =>
    isVisible ? children : null,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  ClassAliasesContext: {
    Provider: ({ children }: { children?: React.ReactNode }) => children,
  },
  RenderNodes: () => null,
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('./designer-context', () => ({
  DesignerContext: React.createContext(null),
  useDesignerContext: () => ({
    config: { classAliases: undefined },
    dispatch: vi.fn(),
    core: {
      getConfig: () => ({ treeConfig: { layout: { direction: 'TB' } } }),
    },
    onPlusButtonClick,
  }),
  useDesignerSnapshotSelector: (selector: () => unknown) => selector(),
  useNodeTypeConfig: () => undefined,
}));

function renderEmptySlot() {
  return render(
    <DesignerXyflowNode
      id="slot-1"
      selected={false}
      data={{
        typeId: TREE_EMPTY_SLOT_NODE_TYPE,
        label: 'Empty slot',
        typeLabel: 'Empty slot',
        __fdTreeMode: true,
        ownerId: 'node-1',
        branchId: 'branch-1',
      }}
      xPos={0}
      yPos={0}
      dragging={false}
      zIndex={1}
      isConnectable={false}
      type={TREE_EMPTY_SLOT_NODE_TYPE}
    />,
  );
}

function stubSlotRect(element: HTMLElement) {
  element.getBoundingClientRect = () =>
    ({
      left: 100,
      top: 50,
      right: 300,
      bottom: 130,
      width: 200,
      height: 80,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe('DesignerXyflowNode - empty slot keyboard activation (13-01)', () => {
  it('opens the slot add menu on Enter with finite element-center coordinates', () => {
    renderEmptySlot();
    const slot = screen.getByTestId('designer-tree-empty-slot');
    stubSlotRect(slot);

    fireEvent.keyDown(slot, { key: 'Enter' });

    expect(onPlusButtonClick).toHaveBeenCalledTimes(1);
    const [sourceId, clientX, clientY, sourceKind] = onPlusButtonClick.mock.calls[0] as [
      string,
      number,
      number,
      string,
    ];
    expect(sourceId).toBe('slot:node-1:branch-1');
    expect(Number.isFinite(clientX)).toBe(true);
    expect(Number.isFinite(clientY)).toBe(true);
    expect(clientX).toBe(200);
    expect(clientY).toBe(90);
    expect(sourceKind).toBe('slot');
  });

  it('opens the slot add menu on Space with finite element-center coordinates', () => {
    renderEmptySlot();
    const slot = screen.getByTestId('designer-tree-empty-slot');
    stubSlotRect(slot);

    fireEvent.keyDown(slot, { key: ' ' });

    expect(onPlusButtonClick).toHaveBeenCalledTimes(1);
    const [, clientX, clientY] = onPlusButtonClick.mock.calls[0] as [string, number, number];
    expect(Number.isFinite(clientX)).toBe(true);
    expect(Number.isFinite(clientY)).toBe(true);
  });

  it('keeps the pointer path using the mouse event coordinates (behavior unchanged)', () => {
    renderEmptySlot();
    const slot = screen.getByTestId('designer-tree-empty-slot');

    fireEvent.click(slot, { clientX: 55, clientY: 66 });

    expect(onPlusButtonClick).toHaveBeenCalledTimes(1);
    const [sourceId, clientX, clientY, sourceKind] = onPlusButtonClick.mock.calls[0] as [
      string,
      number,
      number,
      string,
    ];
    expect(sourceId).toBe('slot:node-1:branch-1');
    expect(clientX).toBe(55);
    expect(clientY).toBe(66);
    expect(sourceKind).toBe('slot');
  });
});
