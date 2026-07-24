import { describe, it, expect } from 'vitest';
import { createReactMessageAdapter } from '../react-adapter.js';
import { BaseMessageStateAdapter } from '../../engine/state-adapter.js';
import type {
  ChatMessage,
  InternalMessageState,
} from '../../engine/types.js';

/**
 * Phase 5 — ReactMessageAdapter snapshot-identity invariants (P1#3).
 *
 * `useSyncExternalStore(subscribe, getSnapshot)` requires `getSnapshot` to
 * return a STABLE reference while nothing changes (else React render-loops)
 * and a NEW reference once state changes (else React skips the update). These
 * tests prove the cached-snapshot strategy honours that contract, and that the
 * `cached` field is load-bearing (not a tautology).
 */
function seedState(): InternalMessageState {
  return {
    messages: [{ id: 'm1', role: 'user', content: 'hi' }],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: null,
  };
}

function makeAdapter(): ReturnType<typeof createReactMessageAdapter> {
  const adapter = createReactMessageAdapter();
  adapter.initialize(seedState());
  return adapter;
}

describe('ReactMessageAdapter — snapshot-identity invariants (P1#3)', () => {
  it('getState() returns the same reference across repeated calls with no intervening mutation', () => {
    const adapter = makeAdapter();
    const a = adapter.getState();
    const b = adapter.getState();
    const c = adapter.getState();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('mutate produces a NEW snapshot reference (a fresh ref reaches subscribers)', () => {
    const adapter = makeAdapter();
    const before = adapter.getState();
    adapter.mutate('messages', (draft) => {
      draft.messages.push({ id: 'm2', role: 'assistant', content: 'yo' } as ChatMessage);
    });
    const after = adapter.getState();
    expect(after).not.toBe(before);
  });

  it('the messages array reference is stable across non-messages mutations', () => {
    const adapter = makeAdapter();
    const before = adapter.getState();
    const messagesRefBefore = before.messages;

    // A requestState-kind mutation rebuilds the snapshot wrapper but must NOT
    // perturb the messages array reference (state.messages is untouched), so a
    // selector keyed on `messages` sees no spurious identity change.
    adapter.mutate('requestState', (draft) => {
      draft.requestState = 'completed';
    });
    const afterRequestState = adapter.getState();
    expect(afterRequestState).not.toBe(before);
    expect(afterRequestState.messages).toBe(messagesRefBefore);

    // A messages-kind mutation that reassigns the array DOES flip the ref —
    // the messages field tracks state.messages faithfully.
    adapter.mutate('messages', (draft) => {
      draft.messages = [...draft.messages, { id: 'm3', role: 'assistant', content: 'new' } as ChatMessage];
    });
    const afterMessages = adapter.getState();
    expect(afterMessages.messages).not.toBe(messagesRefBefore);
  });

  it('reverse-proof: without the cached field (always-rebuild), the stability invariant does NOT hold', () => {
    // Simulates deleting the `cached` field — i.e. `getState()` rebuilding a
    // fresh object on every call (exactly what BaseMessageStateAdapter, the
    // native/non-caching base, does). The stability invariant from the first
    // test must FAIL here, proving the React adapter's `cached` field is what
    // guarantees reference stability (the test guards a real invariant, not a
    // tautology).
    class AlwaysRebuildAdapter extends BaseMessageStateAdapter {}
    const adapter = new AlwaysRebuildAdapter();
    adapter.initialize(seedState());
    const a = adapter.getState();
    const b = adapter.getState();
    expect(a).not.toBe(b);
  });
});
