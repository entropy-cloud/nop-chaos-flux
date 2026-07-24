import { describe, it, expect } from 'vitest';
import { BaseMessageStateAdapter } from '../state-adapter.js';
import { createNativeMessageAdapter } from '../native-adapter.js';
import type {
  ChatMessage,
  InternalMessageState,
  MessageStateListener,
} from '../types.js';

/**
 * Direct unit coverage for `BaseMessageStateAdapter` — the shared
 * subscribe/notify implementation that both the native and React adapters
 * inherit. These behaviours were previously only exercised indirectly via
 * engine-level tests (AI-18 engine-half).
 */
describe('BaseMessageStateAdapter — subscribe / mutate / createMessage', () => {
  function makeAdapter(initial?: Partial<InternalMessageState>): BaseMessageStateAdapter {
    const adapter = new (class extends BaseMessageStateAdapter {})();
    adapter.initialize({
      messages: [],
      requestState: 'idle',
      isProcessing: false,
      abortController: null,
      connector: null,
      ...initial,
    });
    return adapter;
  }

  it('getState returns only the public slice (no connector/abortController leak)', () => {
    const adapter = makeAdapter({
      connector: { async stream() { return (async function* () {})(); } },
      abortController: new AbortController(),
    });
    const snapshot = adapter.getState();
    expect(snapshot).not.toHaveProperty('connector');
    expect(snapshot).not.toHaveProperty('abortController');
    expect(Object.keys(snapshot).sort()).toEqual(
      ['isProcessing', 'lastError', 'messages', 'processingState', 'requestState'].sort(),
    );
  });

  it('mutate runs the recipe against internal state then notifies', () => {
    const adapter = makeAdapter();
    const calls: number[] = [];
    adapter.subscribe((s) => calls.push(s.messages.length));

    adapter.mutate('messages', (draft) => {
      draft.messages.push({ id: 'm1', role: 'user', content: 'hi' });
    });

    expect(adapter.getState().messages).toHaveLength(1);
    expect(calls).toEqual([1]);
  });

  it('createMessage returns the message unchanged (default identity)', () => {
    const adapter = makeAdapter();
    const m: ChatMessage = { id: 'x', role: 'assistant', content: '' };
    expect(adapter.createMessage(m)).toBe(m);
  });

  describe('subscribe kind routing', () => {
    it('kind listeners fire only for their channel', () => {
      const adapter = makeAdapter();
      const msgCalls: number[] = [];
      const reqCalls: string[] = [];
      adapter.subscribe('messages', (s) => msgCalls.push(s.messages.length));
      adapter.subscribe('requestState', (s) => reqCalls.push(s.requestState));

      adapter.mutate('messages', (d) => d.messages.push({ id: 'a', role: 'user', content: 'x' }));
      adapter.mutate('requestState', (d) => {
        d.requestState = 'completed';
      });

      expect(msgCalls).toEqual([1]);
      expect(reqCalls).toEqual(['completed']);
    });

    it('full-channel listeners fire for every kind', () => {
      const adapter = makeAdapter();
      const full: number[] = [];
      adapter.subscribe(() => full.push(0));

      adapter.mutate('messages', () => undefined);
      adapter.mutate('requestState', () => undefined);
      adapter.mutate('processingState', () => undefined);
      adapter.mutate('full', () => undefined);

      expect(full).toHaveLength(4);
    });

    it('listeners fan out to multiple subscribers on the same channel', () => {
      const adapter = makeAdapter();
      const a: number[] = [];
      const b: number[] = [];
      const listenerA: MessageStateListener = (s) => a.push(s.messages.length);
      const listenerB: MessageStateListener = (s) => b.push(s.messages.length);
      adapter.subscribe('messages', listenerA);
      adapter.subscribe('messages', listenerB);

      adapter.mutate('messages', (d) => d.messages.push({ id: '1', role: 'user', content: 'a' }));

      expect(a).toEqual([1]);
      expect(b).toEqual([1]);
    });

    it('unsubscribe stops further notifications for that listener', () => {
      const adapter = makeAdapter();
      const calls: number[] = [];
      const unsub = adapter.subscribe('messages', (s) => calls.push(s.messages.length));

      adapter.mutate('messages', (d) => d.messages.push({ id: '1', role: 'user', content: 'a' }));
      unsub();
      adapter.mutate('messages', (d) => d.messages.push({ id: '2', role: 'user', content: 'b' }));

      expect(calls).toEqual([1]);
    });

    it('unsubscribe is idempotent (double-unsub does not throw)', () => {
      const adapter = makeAdapter();
      const unsub = adapter.subscribe(() => undefined);
      unsub();
      expect(() => unsub()).not.toThrow();
    });
  });
});

describe('createNativeMessageAdapter — replaceState', () => {
  it('replaceState swaps the whole internal state and notifies the full channel', () => {
    const adapter = createNativeMessageAdapter();
    const full: string[] = [];
    adapter.subscribe((s) => full.push(s.requestState));

    const next: InternalMessageState = {
      messages: [{ id: 'm', role: 'user', content: 'x' }],
      requestState: 'completed',
      isProcessing: false,
      abortController: null,
      connector: null,
    };
    adapter.replaceState(next);

    expect(adapter.getState().requestState).toBe('completed');
    expect(adapter.getState().messages).toHaveLength(1);
    expect(full).toEqual(['completed']);
  });
});
