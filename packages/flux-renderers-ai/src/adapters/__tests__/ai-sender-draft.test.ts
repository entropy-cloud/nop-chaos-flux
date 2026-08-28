import { describe, it, expect, vi } from 'vitest';
import { createAiSenderDraftStore } from '../ai-chat-context.js';

// ============================================================================
// D4 (plan 2026-08-24-2317-1, Decision D-handle): the per-chat sender draft
// external store. Sender typing goes through `setLocal` (write-through, NO
// subscription notification — prevents feedback loops); external writes go
// through `apply(text, mode)` which computes append/dedupe/replace on the
// CURRENT value (including user-typed text) and then notifies subscribers.
// ============================================================================

describe('createAiSenderDraftStore — D-handle draft channel semantics', () => {
  it('setLocal updates get() WITHOUT notifying subscribers (typing write-through)', () => {
    const store = createAiSenderDraftStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setLocal('typed');
    expect(store.get()).toBe('typed');
    expect(listener).not.toHaveBeenCalled();
  });

  it('apply computes on the CURRENT value — typed text preserved with \\n join', () => {
    const store = createAiSenderDraftStore();
    store.setLocal('user text');
    const listener = vi.fn();
    store.subscribe(listener);
    store.apply('transcript');
    expect(store.get()).toBe('user text\ntranscript');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('apply on an empty base writes the text directly (no leading newline)', () => {
    const store = createAiSenderDraftStore();
    store.apply('A');
    expect(store.get()).toBe('A');
  });

  it('apply skips a repeat write whose result is still the current draft (dedupe)', () => {
    const store = createAiSenderDraftStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.apply('A');
    store.apply('A');
    expect(store.get()).toBe('A');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('apply appends a DIFFERENT text even while the draft still equals the last write', () => {
    const store = createAiSenderDraftStore();
    store.apply('A');
    store.apply('B');
    expect(store.get()).toBe('A\nB');
  });

  it('apply replace overwrites the whole draft and notifies once', () => {
    const store = createAiSenderDraftStore();
    store.setLocal('keep me');
    const listener = vi.fn();
    store.subscribe(listener);
    store.apply('B', 'replace');
    expect(store.get()).toBe('B');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe returns an unsubscribe function', () => {
    const store = createAiSenderDraftStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.apply('A');
    expect(listener).not.toHaveBeenCalled();
  });
});
