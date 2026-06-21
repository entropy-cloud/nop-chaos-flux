import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { allFormDefs } from './form-tree-checkbox-fields.shared.js';
import { env } from '../test-support.js';

interface MockVirtualItem {
  key: string;
  index: number;
  start: number;
}

const virtualMockConfig = vi.hoisted(() => ({
  items: [] as MockVirtualItem[],
  scrollToIndex: vi.fn(),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () =>
      virtualMockConfig.items.length > 0
        ? virtualMockConfig.items[virtualMockConfig.items.length - 1].start + 32
        : 0,
    getVirtualItems: () => virtualMockConfig.items,
    scrollToIndex: virtualMockConfig.scrollToIndex,
  }),
}));

afterEach(() => {
  cleanup();
  virtualMockConfig.items = [];
  virtualMockConfig.scrollToIndex.mockClear();
});

function buildFlatOptions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    label: `Option ${index + 1}`,
    value: `opt-${index + 1}`,
  }));
}

function renderTree(schemaBody: Record<string, unknown>[]) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-virtualization.test.tsx"
      schema={
        {
          type: 'form',
          body: schemaBody,
        } as any
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('tree controls - virtual scrolling (E2d virtualThreshold)', () => {
  it('enables virtualisation when visible flattened option count reaches virtualThreshold', async () => {
    virtualMockConfig.items = [
      { key: 'opt-1', index: 0, start: 0 },
      { key: 'opt-2', index: 1, start: 32 },
      { key: 'opt-3', index: 2, start: 64 },
    ];

    renderTree([
      {
        type: 'input-tree',
        name: 'items',
        label: 'Items',
        treeMode: 'checkbox',
        virtualThreshold: 5,
        options: buildFlatOptions(50),
      },
    ]);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="tree-option-virtual-spacer"]')).toBeTruthy();
    });

    const virtualItems = document.querySelectorAll('[data-slot="tree-option-virtual-item"]');
    expect(virtualItems.length).toBe(3);
    expect(virtualItems[0].textContent).toContain('Option 1');

    expect(document.querySelectorAll('[data-slot="tree-option-node"]').length).toBe(0);
  });

  it('keeps full recursive rendering below virtualThreshold', async () => {
    renderTree([
      {
        type: 'input-tree',
        name: 'items',
        label: 'Items',
        treeMode: 'checkbox',
        virtualThreshold: 100,
        options: buildFlatOptions(5),
      },
    ]);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Option 1' })).toBeTruthy();
    });

    expect(document.querySelector('[data-slot="tree-option-virtual-spacer"]')).toBeNull();
    expect(document.querySelectorAll('[data-slot="tree-option-node"]').length).toBe(5);
    expect(document.querySelectorAll('[role="treeitem"]').length).toBe(5);
  });

  it('virtualises tree-select popover list when threshold is exceeded', async () => {
    virtualMockConfig.items = [
      { key: 'opt-1', index: 0, start: 0 },
      { key: 'opt-2', index: 1, start: 32 },
    ];

    renderTree([
      {
        type: 'tree-select',
        name: 'items',
        label: 'Items',
        virtualThreshold: 5,
        options: buildFlatOptions(40),
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Items/ }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="tree-option-virtual-spacer"]')).toBeTruthy();
    });
    const virtualItems = document.querySelectorAll('[data-slot="tree-option-virtual-item"]');
    expect(virtualItems.length).toBe(2);
  });

  it('keeps roving focus + aria-activedescendant synced while virtualised (keyboard reachability)', async () => {
    virtualMockConfig.items = [
      { key: 'opt-1', index: 0, start: 0 },
      { key: 'opt-2', index: 1, start: 32 },
    ];

    renderTree([
      {
        type: 'input-tree',
        name: 'items',
        label: 'Items',
        treeMode: 'checkbox',
        virtualThreshold: 5,
        options: buildFlatOptions(30),
      },
    ]);

    const first = await screen.findByRole('treeitem', { name: 'Option 1' });
    expect(first.tabIndex).toBe(0);

    const tree = screen.getByRole('tree', { name: 'Items' });
    const initialActivedescendant = tree.getAttribute('aria-activedescendant');
    expect(initialActivedescendant).toBeTruthy();

    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(virtualMockConfig.scrollToIndex).toHaveBeenCalled();
    });

    const updatedActivedescendant = tree.getAttribute('aria-activedescendant');
    expect(updatedActivedescendant).toBeTruthy();
  });

  it('virtualThreshold=0 disables virtualisation regardless of option count', async () => {
    renderTree([
      {
        type: 'input-tree',
        name: 'items',
        label: 'Items',
        treeMode: 'checkbox',
        virtualThreshold: 0,
        options: buildFlatOptions(200),
      },
    ]);

    await waitFor(() => {
      expect(screen.getByRole('treeitem', { name: 'Option 1' })).toBeTruthy();
    });

    expect(document.querySelector('[data-slot="tree-option-virtual-spacer"]')).toBeNull();
    expect(document.querySelectorAll('[data-slot="tree-option-node"]').length).toBe(200);
  });

  it('keeps cascade indeterminate derivation working under virtualisation', async () => {
    virtualMockConfig.items = [
      { key: 'parent', index: 0, start: 0 },
      { key: 'child-a', index: 1, start: 32 },
      { key: 'child-b', index: 2, start: 64 },
    ];

    renderTree([
      {
        type: 'form',
        data: { selections: [] },
        body: [
          {
            type: 'input-tree',
            name: 'selections',
            label: 'Selections',
            treeMode: 'checkbox',
            cascade: true,
            virtualThreshold: 2,
            options: [
              {
                label: 'Parent',
                value: 'parent',
                children: [
                  { label: 'Child A', value: 'child-a' },
                  { label: 'Child B', value: 'child-b' },
                ],
              },
            ],
          },
        ],
      } as any,
    ]);

    const parent = await screen.findByRole('treeitem', { name: 'Parent' });
    fireEvent.click(parent);

    await waitFor(() => {
      const cb = parent.querySelector('[role="checkbox"]') as HTMLElement;
      expect(cb?.getAttribute('aria-checked')).toBe('true');
    });
  });
});
