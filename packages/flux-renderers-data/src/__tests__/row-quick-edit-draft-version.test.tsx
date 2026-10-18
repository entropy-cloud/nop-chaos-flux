import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  useRowQuickEditDraft,
  type RowQuickEditDraftApi,
} from '../table-renderer/use-row-quick-edit-draft.js';
import type { TableSchema } from '../schemas.js';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';

const rowScopeStub = {
  id: 'row',
  path: 'rows.0',
  get: (path: string) => (path === '$slot' ? { record: undefined, index: 0 } : undefined),
  has: () => true,
  readOwn: () => ({ $slot: {} }),
  readVisible: () => ({ $slot: {} }),
  materializeVisible: () => ({ $slot: {} }),
  update: () => {},
} as unknown as ScopeRef;

function Probe({
  record,
  onReady,
}: {
  record: Record<string, unknown>;
  onReady: (api: RowQuickEditDraftApi) => void;
}) {
  const api = useRowQuickEditDraft({
    record,
    rowScope: rowScopeStub,
    helpers: {} as RendererComponentProps<TableSchema>['helpers'],
    saveAction: {} as ActionSchema,
  });
  React.useEffect(() => {
    onReady(api);
  });
  return <div data-testid="dirty">{String(api.isRowDirty)}</div>;
}

describe('row quick-edit draft version (FM-020 regression)', () => {
  afterEach(() => {
    cleanup();
  });

  it('recomputes isRowDirty after an external record refresh resets the draft refs', () => {
    let api: RowQuickEditDraftApi | undefined;
    const onReady = (value: RowQuickEditDraftApi) => {
      api = value;
    };
    const { getByTestId, rerender } = render(<Probe record={{ name: 'a' }} onReady={onReady} />);
    expect(getByTestId('dirty').textContent).toBe('false');

    act(() => {
      api!.setFieldValue('name', 'b');
    });
    expect(getByTestId('dirty').textContent).toBe('true');

    // External refresh (e.g. save round-trip replaces the row record): the
    // reset effect syncs draft/saved refs to the new record — isRowDirty must
    // drop back to false, not stay memoized at its pre-refresh value.
    act(() => {
      rerender(<Probe record={{ name: 'b' }} onReady={onReady} />);
    });
    expect(getByTestId('dirty').textContent).toBe('false');

    act(() => {
      api!.cancelEditing();
    });
    expect(getByTestId('dirty').textContent).toBe('false');
  });
});
