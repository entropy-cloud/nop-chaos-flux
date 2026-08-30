import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

afterEach(cleanup);

beforeEach(() => {
  resetTableControlTestState();
});

function renderSelectionProbe(schemaProps: any, source: Array<Record<string, any>>) {
  // The probe re-publishes its api object every render (fresh hook state), so
  // tests must read through this mutable ref, never destructure a snapshot.
  const state: { api: any } = { api: undefined };
  const onSelectionChange = vi.fn();
  render(
    <SelectionProbe
      schemaProps={{ selectionOwnership: 'local', rowSelection: { type: 'checkbox', ...schemaProps } }}
      source={source}
      onSelectionChange={onSelectionChange}
      helpers={createHelpers()}
      onReady={(value) => {
        state.api = value;
      }}
    />,
  );
  return { state, onSelectionChange };
}

describe('table modifierSelect — shift-click range (hook level)', () => {
  it('unions the view-order range [anchor..clicked] additively', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    const { state } = renderSelectionProbe({ modifierSelect: true }, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual(['1']);

    act(() => {
      state.api.handleSelectRow('3', true, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3']);
  });

  it('uses the clicked row itself as the range when no anchor exists and never deselects', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { state } = renderSelectionProbe(
      { modifierSelect: true, selectedRowKeys: ['1', '2', '3'] },
      source,
    );

    act(() => {
      state.api.handleSelectRow('3', true, { shiftKey: true });
    });
    // shift-click never deselects: fully-selected range stays intact
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3']);
  });

  it('moves the anchor on unmodified changes only (meta/ctrl toggle keeps the anchor)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    const { state } = renderSelectionProbe({ modifierSelect: true }, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    // meta toggle on 3 → anchor stays at 1
    act(() => {
      state.api.handleSelectRow('3', true, { metaKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '3']);

    act(() => {
      state.api.handleSelectRow('4', true, { shiftKey: true });
    });
    // range [1..4] unioned with {1,3}
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('setSelectionExternal never moves the anchor', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    const { state } = renderSelectionProbe({ modifierSelect: true }, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    act(() => {
      state.api.setSelectionExternal(new Set(['4']));
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual(['4']);

    act(() => {
      state.api.handleSelectRow('2', true, { shiftKey: true });
    });
    // anchor is still row 1 → range [1..2]
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '4']);
  });

  it('skips non-checkable rows inside the range (checkableWhen)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    // Row-scope-aware evaluator: resolves `${expr}` truthiness against the row
    // record (the default createHelpers mock echoes the raw string back).
    const checkableHelpers = {
      ...createHelpers(),
      evaluate: vi.fn((target: unknown, scope: { value?: Record<string, unknown> }) => {
        const expr = String(target).replace(/^\$\{/, '').replace(/\}$/, '');
        let value: unknown = scope?.value ?? {};
        for (const key of expr.split('.')) {
          value = (value as Record<string, unknown>)?.[key];
        }
        return value;
      }),
    };
    const state: { api: any } = { api: undefined };
    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', modifierSelect: true, checkableWhen: 'enabled' },
        }}
        source={source.map((row) => (row.id === '2' ? { ...row, enabled: false } : { ...row, enabled: true }))}
        onSelectionChange={vi.fn()}
        helpers={checkableHelpers as any}
        onReady={(value) => {
          state.api = value;
        }}
      />,
    );

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    act(() => {
      state.api.handleSelectRow('4', true, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '3', '4']);
  });

  it('truncates at maxSelectionLength along view order (select-all parity)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];
    const { state } = renderSelectionProbe({ modifierSelect: true, maxSelectionLength: 3 }, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    act(() => {
      state.api.handleSelectRow('5', true, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3']);
  });

  it('preserves keepOnPageChange retained cross-page keys in the range union', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { state } = renderSelectionProbe(
      { modifierSelect: true, keepOnPageChange: true, selectedRowKeys: ['X'] },
      [...source, { id: 'X' }],
    );

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', 'X']);

    act(() => {
      state.api.handleSelectRow('3', true, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3', 'X']);
  });

  it('fires the same table:selection-change payload for range operations', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { state, onSelectionChange } = renderSelectionProbe({ modifierSelect: true }, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    act(() => {
      state.api.handleSelectRow('3', true, { shiftKey: true });
    });

    const lastPayload = onSelectionChange.mock.calls.at(-1)?.[1]?.event;
    expect(lastPayload?.type).toBe('table:selection-change');
    expect(lastPayload?.selectedRowKeys.sort()).toEqual(['1', '2', '3']);
    expect(lastPayload?.selection?.selectedRowKeys.sort()).toEqual(['1', '2', '3']);
  });
});

describe('table modifierSelect — compat and inertia (hook level)', () => {
  it('keeps plain-toggle behavior for shift-clicks when modifierSelect is absent (byte parity)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { state } = renderSelectionProbe({}, source);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual(['1']);

    // shift-click toggles the row OFF (plain toggle) — no range union
    act(() => {
      state.api.handleSelectRow('1', false, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual([]);
  });

  it('moves the anchor via select-all to the first view row (checked)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    const { state } = renderSelectionProbe({ modifierSelect: true }, source);

    act(() => {
      state.api.handleSelectAll(true);
    });
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3', '4']);

    act(() => {
      state.api.setSelectionExternal(new Set([]));
    });
    act(() => {
      state.api.handleSelectRow('4', true, { shiftKey: true });
    });
    // anchor from select-all = first view row '1' → range [1..4]
    expect(Array.from(state.api.selectedRowKeys).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('is inert under radio (shift-click behaves as a plain radio select)', () => {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const state: { api: any } = { api: undefined };
    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'radio', modifierSelect: true },
        }}
        source={source}
        onSelectionChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          state.api = value;
        }}
      />,
    );

    act(() => {
      state.api.handleSelectRow('3', true, { shiftKey: true });
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual(['3']);

    act(() => {
      state.api.handleSelectRow('1', true);
    });
    expect(Array.from(state.api.selectedRowKeys)).toEqual(['1']);
  });
});
