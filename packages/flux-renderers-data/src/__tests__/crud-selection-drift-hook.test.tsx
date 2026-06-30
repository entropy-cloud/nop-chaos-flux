import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

afterEach(cleanup);

describe('CRUD selection drift — keepOnPageChange (hook-level)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('keepOnPageChange: true — handleSelectAll(true) merges current rows into existing selection, retaining real cross-page rows but pruning phantom keys (H21)', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            // The hook receives the full known dataset (treeFlattenedData). "X" is a
            // real row present in the dataset (a cross-page row); "gone" is a phantom
            // key whose row was deleted and is no longer in the dataset.
            selectedRowKeys: ['X', 'gone'],
            keepOnPageChange: true,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }, { id: 'X' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['X', 'gone']);

    act(() => {
      api.handleSelectAll(true);
    });

    // "X" (real row) is retained; "gone" (phantom) is pruned; current rows added.
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['X', 'a', 'b']);
  });

  it('keepOnPageChange: true — handleSelectAll(false) clears the dataset rows and drops phantom keys (H21)', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['X', 'a', 'b', 'gone'],
            keepOnPageChange: true,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }, { id: 'X' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['X', 'a', 'b', 'gone']);

    act(() => {
      api.handleSelectAll(false);
    });

    // All dataset rows deselected and the phantom "gone" dropped — no phantom key
    // survives into the selection state / payload.
    expect(Array.from(api.selectedRowKeys)).toEqual([]);
    expect(api.selectedRowKeys.has('gone')).toBe(false);
  });

  it('keepOnPageChange: false (default) — handleSelectAll(true) replaces selection (current behavior preserved)', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['X'],
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectAll(true);
    });

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['a', 'b']);
  });
});

describe('CRUD selection drift — maxSelectionLength (hook-level)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('maxSelectionLength: 2 — handleSelectRow rejects new selection when at limit', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['a', 'b'],
            maxSelectionLength: 2,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('c', true);
    });

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['a', 'b']);
  });

  it('maxSelectionLength: 2 — handleSelectAll truncates to limit', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: [],
            maxSelectionLength: 2,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectAll(true);
    });

    expect(api.selectedRowKeys.size).toBe(2);
    expect(api.selectedRowKeys.has('a')).toBe(true);
    expect(api.selectedRowKeys.has('b')).toBe(true);
    expect(api.selectedRowKeys.has('c')).toBe(false);
  });

  it('maxSelectionLength: 2 — handleSelectRow allows toggling off existing selection even at limit', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: ['a', 'b'],
            maxSelectionLength: 2,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }, { id: 'c' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('a', false);
    });

    expect(Array.from(api.selectedRowKeys)).toEqual(['b']);
  });
});

describe('CRUD selection drift — checkableWhen (hook-level)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('checkableWhen excludes falsy rows from select-all and exposes isRowCheckable', () => {
    const helpers = {
      ...createHelpers(),
      evaluate: vi.fn((target: unknown, scope: any) => {
        if (typeof target !== 'string') return target;
        const record = scope?.value?.record ?? scope?.record;
        if (!record) return true;
        return record.status === 'active';
      }),
    } as any;
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'checkbox',
            selectedRowKeys: [],
            checkableWhen: "record.status === 'active'",
          },
        }}
        source={[
          { id: 'a', status: 'active' },
          { id: 'b', status: 'draft' },
        ]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(typeof api.isRowCheckable).toBe('function');
    expect(api.isRowCheckable('a')).toBe(true);
    expect(api.isRowCheckable('b')).toBe(false);

    act(() => {
      api.handleSelectAll(true);
    });

    expect(Array.from(api.selectedRowKeys)).toEqual(['a']);
  });
});

describe('CRUD selection drift — radio mode unaffected (hook-level)', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('radio + maxSelectionLength — selection still replaces, maxSelectionLength ignored', () => {
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: {
            type: 'radio',
            selectedRowKeys: ['a'],
            maxSelectionLength: 1,
          },
        }}
        source={[{ id: 'a' }, { id: 'b' }]}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('b', true);
    });

    expect(Array.from(api.selectedRowKeys)).toEqual(['b']);
  });
});
