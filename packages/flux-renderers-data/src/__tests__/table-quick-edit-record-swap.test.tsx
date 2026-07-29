import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useTableQuickEditController } from '../table-renderer/table-quick-edit-controller.js';

function createRowScope(record: Record<string, unknown>) {
  let data: Record<string, unknown> = {
    ...record,
    $slot: { record: { ...record }, index: 0 },
  };
  return {
    id: 'row-scope',
    get(path: string) {
      if (path === '$slot.record') return (data.$slot as Record<string, unknown>)?.record;
      if (path === '$slot') return data.$slot;
      if (path in data) return data[path];
      return undefined;
    },
    has: () => true,
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: vi.fn(),
    merge: vi.fn((patch: Record<string, unknown>) => {
      data = { ...data, ...patch };
      if (patch.$slot) {
        data.$slot = { ...(data.$slot as Record<string, unknown>), ...(patch.$slot as Record<string, unknown>) };
      }
    }),
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
    expect(rowScope.merge).toHaveBeenCalled();
    const mergeCall = rowScope.merge.mock.calls.find(() => true);
    const merged = mergeCall?.[0] as Record<string, unknown> | undefined;
    expect(merged?.name).toBe('Alicia');
  });
});
