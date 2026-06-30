import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

afterEach(cleanup);

describe('useTableSelection — keepOnPageChange prunes phantom keys from selectAll (H21)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('handleSelectAll(true) does not carry deleted-page phantom keys in the payload', () => {
    const onSelectionChange = vi.fn();
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            keepOnPageChange: true,
            // "gone" is a phantom key: no matching row exists in the source.
            selectedRowKeys: ['1', 'gone'],
          },
        }}
        source={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    // Under keepOnPageChange the unpruned local set still holds the phantom "gone".
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['1', 'gone']);

    act(() => {
      api.handleSelectAll(true);
    });

    // The payload must contain only existing rows — no phantom "gone".
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const payload = onSelectionChange.mock.calls[0]![1];
    const emitted = payload.event.selectedRowKeys as string[];
    expect(emitted.sort()).toEqual(['1', '2', '3']);
    expect(emitted).not.toContain('gone');
  });

  it('handleSelectAll(false) drops both current rows and phantom keys', () => {
    const onSelectionChange = vi.fn();
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            keepOnPageChange: true,
            selectedRowKeys: ['1', 'gone'],
          },
        }}
        source={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectAll(false);
    });

    const payload = onSelectionChange.mock.calls[0]![1];
    const emitted = payload.event.selectedRowKeys as string[];
    expect(emitted).toEqual([]);
    expect(emitted).not.toContain('gone');
  });
});
