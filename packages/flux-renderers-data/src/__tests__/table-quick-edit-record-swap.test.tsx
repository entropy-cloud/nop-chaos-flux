import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useTableQuickEditController } from '../table-renderer/table-quick-edit-controller.js';

function createRowScope(record: Record<string, unknown>) {
  const state = { record: { ...record } };
  return {
    id: 'row-scope',
    get(path: string) {
      if (path === 'record') return state.record;
      if (path.startsWith('record.')) return state.record[path.slice('record.'.length)];
      return undefined;
    },
    has: () => true,
    readOwn: () => ({ record: state.record }),
    readVisible: () => ({ record: state.record }),
    materializeVisible: () => ({ record: state.record }),
    update: vi.fn((path: string, value: unknown) => {
      if (path === 'record' && value && typeof value === 'object') {
        state.record = { ...(value as Record<string, unknown>) };
      }
    }),
    merge() {},
  } as any;
}

afterEach(cleanup);

function Probe(props: {
  field: string;
  record: Record<string, unknown>;
  rowScope: any;
  helpers: any;
  saveAction: any;
  onReady: (api: ReturnType<typeof useTableQuickEditController>) => void;
}) {
  const api = useTableQuickEditController({
    field: props.field,
    record: props.record,
    rowScope: props.rowScope,
    helpers: props.helpers,
    saveAction: props.saveAction,
    hasCustomBody: false,
  });
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

describe('useTableQuickEditController — record swap during save (H20)', () => {
  it('commits the record snapshot taken at save start, not a record mutated mid-await', async () => {
    const rowScope = createRowScope({ name: 'Alice' });

    // Controllable dispatch so we can swap `record` while the save is pending.
    let resolveDispatch!: (value: unknown) => void;
    const dispatch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        }),
    );
    const helpers = { dispatch } as any;

    let api: any;
    const initial = { record: { name: 'Alice' }, field: 'name', rowScope, helpers, saveAction: { action: 'save' }, onReady: (v: any) => (api = v) };

    const { rerender } = render(<Probe {...initial} />);

    // Edit the draft to "Alicia" and start the save (dispatch now pending).
    act(() => {
      api.handleInlineValueChange('Alicia');
    });
    expect(api.dirty).toBe(true);

    let savePromise: Promise<void>;
    act(() => {
      savePromise = api.runSave();
    });

    // While the save is in flight, the upstream record mutates (e.g. refresh).
    // The controller's reset effect reassigns draftRecordRef to the new record.
    rerender(<Probe {...initial} record={{ name: 'Bob' }} />);

    // Resolve the pending dispatch.
    await act(async () => {
      resolveDispatch({ ok: true });
      await savePromise!;
    });

    // The committed record must be the snapshot at save start ("Alicia"), not the
    // mutated "Bob" — no cross-record saving.
    expect(rowScope.update).toHaveBeenCalledWith('record', expect.objectContaining({ name: 'Alicia' }));
    const committed = rowScope.update.mock.calls.find(
      (call: unknown[]) => call[0] === 'record',
    )?.[1] as Record<string, unknown>;
    expect(committed.name).toBe('Alicia');
  });
});
