import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

afterEach(cleanup);

describe('useTableSelection — select-all respects the filtered view (P1-6)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('handleSelectAll(true) only selects the rows currently visible to the hook (not the unfiltered source)', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: [] },
        }}
        // The hook now receives the FILTERED rows; rows filtered out by the table
        // renderer never reach it, so select-all cannot resurrect them.
        source={[{ id: 'visible-1' }, { id: 'visible-2' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectAll(true);
    });

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['visible-1', 'visible-2']);
    // allSelected reflects the filtered set, so the header checkbox can show "checked".
    expect(api.allSelected).toBe(true);
  });

  it('allSelected becomes true once every filtered (visible) row is selected even when other rows existed before', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['visible-1', 'visible-2'],
          },
        }}
        source={[{ id: 'visible-1' }, { id: 'visible-2' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.allSelected).toBe(true);
  });
});

describe('useTableSelection — stale keys are pruned when rows disappear (P1-7)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('removes a selected key whose row was deleted from the source (local ownership)', () => {
    const helpers = createHelpers();
    let api: any;

    const { rerender } = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', '2']);

    // Upstream row removal: row "2" is gone.
    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '1' }, { id: '3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    // The dead key "2" is pruned; "1" survives because its row still exists.
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1']);
  });

  it('does not prune when keepOnPageChange is true (selection persists across page boundaries)', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['from-other-page'],
            keepOnPageChange: true,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    // 'from-other-page' is intentionally absent from the current page; keepOnPageChange
    // guarantees it is retained rather than treated as a stale key.
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['from-other-page']);
  });

  it('prunes filtered-out keys when keepOnPageChange is false (selection tracks visible data)', () => {
    const helpers = createHelpers();
    let api: any;

    const { rerender } = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', '2']);

    // A filter narrows the visible set to row "3"; "1" and "2" are filtered out.
    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual([]);
  });
});

// M-01 / G7: the three observable channels of selection (display value,
// onSelectionChange payload, internal localSelectedRowKeys) must stay consistent
// after rows disappear. Previously the render-time prune cleaned the DISPLAYED
// set but never wrote it back, so localSelectedRowKeys kept "phantom" keys and
// handleSelectRow rebuilt the payload from that dirty base — re-emitting deleted
// row keys on the next interaction.
describe('useTableSelection — payload + identity consistency after row deletion (M-01 / G7)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('onSelectionChange payload excludes phantom keys after a selected row is deleted and a survivor is toggled (M-01)', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    let api: any;

    const { rerender } = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', '2']);

    // Row "2" is deleted upstream. The displayed set prunes the phantom key.
    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={[{ id: '1' }, { id: '3' }]}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1']);

    // Selecting a survivor must NOT reintroduce the deleted "2" into the payload.
    act(() => {
      api.handleSelectRow('3', true);
    });

    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
    const payload = (lastCall[1] as { event: { selectedRowKeys: string[] } }).event;
    expect(payload.selectedRowKeys.slice().sort()).toEqual(['1', '3']);
    expect(payload.selectedRowKeys).not.toContain('2');
    // And the displayed set matches the payload (display ≡ payload consistency).
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', '3']);
  });

  it('selectedRowKeys identity is stable across re-renders once phantom keys are cleaned (G7 — no per-render Set storm)', () => {
    const helpers = createHelpers();
    let api: any;

    const renderProbe = (source: Array<Record<string, any>>) => (
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: ['1', '2'] },
        }}
        source={source}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />
    );

    const { rerender } = render(renderProbe([{ id: '1' }, { id: '2' }, { id: '3' }]));

    // Delete row "2" (phantom introduced), then select survivor "3" which must
    // write a CLEAN set back into local state (this is the M-01 fix).
    rerender(renderProbe([{ id: '1' }, { id: '3' }]));
    act(() => {
      api.handleSelectRow('3', true);
    });

    // State is now clean. Re-render twice with a FRESH source array reference
    // (simulates upstream ref churn). The exposed selectedRowKeys MUST stay
    // identity-stable — no new Set allocated per render (the G7 storm).
    const stableRef = api.selectedRowKeys;
    rerender(renderProbe([{ id: '1' }, { id: '3' }]));
    expect(api.selectedRowKeys).toBe(stableRef);
    rerender(renderProbe([{ id: '1' }, { id: '3' }]));
    expect(api.selectedRowKeys).toBe(stableRef);
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', '3']);
  });
});
