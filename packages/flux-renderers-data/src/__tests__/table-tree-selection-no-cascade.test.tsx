import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

// B7 / T13 (02-table-and-crud.md): tree-table selection does NOT cascade to
// children (deliberate, amis #5865 lost it across versions). Flux table
// selection is a flat Set<rowKey> toggled one key at a time — there is no
// parent→descendant cascade path. This anchor locks the absence so a future
// change that adds cascade breaks here.

describe('table tree selection does NOT cascade to children (B7 / T13)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('selecting a parent row adds only the parent key — children are NOT auto-selected', () => {
    const helpers = createHelpers();
    // Flattened tree rows as the table actually renders after flattenTreeRows:
    // parent p1 with two children c1/c2, each its own row.
    const source = [
      { id: 'p1', name: 'parent', children: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'c1', name: 'child-1' },
      { id: 'c2', name: 'child-2' },
    ];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowKey: 'id', rowSelection: { selectedRowKeys: [] } }}
        source={source}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('p1', true);
    });

    // Only the parent key is selected — child keys c1/c2 must NOT appear.
    expect(Array.from(api.selectedRowKeys)).toEqual(['p1']);
    expect(Array.from(api.selectedRowKeys)).not.toContain('c1');
    expect(Array.from(api.selectedRowKeys)).not.toContain('c2');
  });

  it('selecting a child does NOT pull in its parent or sibling (no upward/sideways cascade)', () => {
    const helpers = createHelpers();
    const source = [
      { id: 'p1', name: 'parent', children: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'c1', name: 'child-1' },
      { id: 'c2', name: 'child-2' },
    ];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowKey: 'id', rowSelection: { selectedRowKeys: [] } }}
        source={source}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('c1', true);
    });

    expect(Array.from(api.selectedRowKeys)).toEqual(['c1']);
    expect(Array.from(api.selectedRowKeys)).not.toContain('p1');
    expect(Array.from(api.selectedRowKeys)).not.toContain('c2');
  });
});
