import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrudLoadAction } from '../crud-renderer-load.js';
import type { ReactionHandle } from '@nop-chaos/flux-core';

// FM-028 F2: loadMore() arms a single-slot resolver. A second arm used to
// overwrite the slot, orphaning the first promise forever (infinite-scroll
// hang on sentinel+retry concurrency); an armed promise also outlived
// unmount. Both must settle.

type LoadCallbacks = { onSettle?: (result: { ok: boolean; cancelled?: boolean; data?: unknown }) => void };

function makeReactionHandle() {
  const callbacksBox: { onSettle?: LoadCallbacks['onSettle'] } = {};
  const handle = {
    configure: vi.fn((patch: { loadCallbacks?: LoadCallbacks }) => {
      if (patch.loadCallbacks) {
        callbacksBox.onSettle = patch.loadCallbacks.onSettle;
      }
    }),
    ready: vi.fn(),
    dispatch: vi.fn(async () => ({ ok: true, data: { rows: [], total: 0 } })),
  } as unknown as ReactionHandle;
  return { handle, callbacksBox };
}

function makeArgs(handle: ReactionHandle) {
  return {
    enabled: true,
    loadReaction: handle,
    loadAllData: false,
    accumulateRows: true,
    onError: undefined,
    helpers: {
      createScope: vi.fn(() => ({ id: 'crud-load-scope' })),
      disposeScope: vi.fn(),
    },
    env: undefined,
    scope: undefined,
    nodeScope: undefined,
    pagination: { currentPage: 1, pageSize: 20 },
    query: {},
    sort: {},
    filters: {},
    selection: [],
    paginationStatePath: '__crudPagination',
    queryStatePath: '__crudQuery',
    sortStatePath: '__crudSort',
    filterStatePath: '__crudFilters',
    selectionStatePath: '__crudSelection',
    ownerStatePath: '__crud',
  } as unknown as Parameters<typeof useCrudLoadAction>[0];
}

function Probe({ args, onReady }: { args: Parameters<typeof useCrudLoadAction>[0]; onReady: (api: ReturnType<typeof useCrudLoadAction>) => void }) {
  const api = useCrudLoadAction(args);
  onReady(api);
  return null;
}

describe('crud loadMore resolver slot (FM-028 F2 regression)', () => {
  afterEach(() => {
    cleanup();
  });

  it('settles every armed loadMore promise, not only the last one', async () => {
    const { handle, callbacksBox } = makeReactionHandle();
    let api!: ReturnType<typeof useCrudLoadAction>;
    render(<Probe args={makeArgs(handle)} onReady={(value) => { api = value; }} />);

    const first = api.loadMore();
    const second = api.loadMore();

    await act(async () => {
      callbacksBox.onSettle?.({ ok: true, data: { rows: ['r1'], total: 1 } });
    });

    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).resolves.toMatchObject({ ok: true });
  });

  it('settles an armed loadMore promise on unmount', async () => {
    const { handle } = makeReactionHandle();
    let api!: ReturnType<typeof useCrudLoadAction>;
    const { unmount } = render(<Probe args={makeArgs(handle)} onReady={(value) => { api = value; }} />);

    const pending = api.loadMore();
    unmount();

    await expect(pending).resolves.toBeDefined();
  });
});
