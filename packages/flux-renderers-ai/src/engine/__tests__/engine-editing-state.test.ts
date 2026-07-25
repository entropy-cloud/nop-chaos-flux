import { describe, it, expect } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import type { ChatMessage } from '../types.js';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'u-1',
    role: 'user',
    content: 'hello',
    metadata: {},
    ...overrides,
  } as ChatMessage;
}

describe('createMessageEngine — setMessageEditing (editing-state setter)', () => {
  it('FP-A: writes editing state onto the matched message and reflects in getState', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1' })],
    });

    engine.setMessageEditing('u-1', { active: true, draft: 'revised' });

    const state = engine.getState();
    const editing = state.messages[0].state?.editing;
    expect(editing).toEqual({ active: true, draft: 'revised' });
  });

  it('FP-A: writes produce fresh state objects — a prior snapshot is unaffected by a later write', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1' })],
    });

    engine.setMessageEditing('u-1', { active: true, draft: 'first' });

    const snapshot1 = engine.getMessages();
    expect(snapshot1[0].state?.editing).toEqual({ active: true, draft: 'first' });

    // A subsequent write must create a fresh state object rather than mutating
    // the old one in place, so the prior snapshot is left untouched (mirrors the
    // `getMessages()` shallow-isolation contract — callers must not mutate nested
    // state, and the engine itself never does either).
    engine.setMessageEditing('u-1', { active: false });
    expect(snapshot1[0].state?.editing).toEqual({ active: true, draft: 'first' });
    expect(engine.getMessages()[0].state?.editing).toEqual({ active: false });
  });

  it('FP-B: unknown messageId is a no-op (no throw, no state change)', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1' })],
    });

    const before = engine.getState();
    const lengthBefore = before.messages.length;
    const stateBefore = before.messages[0].state;

    expect(() => engine.setMessageEditing('nonexistent', { active: true })).not.toThrow();

    const after = engine.getState();
    expect(after.messages).toHaveLength(lengthBefore);
    expect(after.messages[0].state).toBe(stateBefore);
    expect(after.messages[0].state?.editing).toBeUndefined();
  });

  it('FP-C: resubmit clear path — setMessages(slice) drops the message so editing disappears', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1', content: 'old' })],
    });

    engine.setMessageEditing('u-1', { active: true, draft: 'edited' });
    expect(engine.getState().messages[0].state?.editing).toBeDefined();

    // Defensive explicit clear before truncation (Failure Path edit-resubmit-clear).
    engine.setMessageEditing('u-1', null);
    expect(engine.getState().messages[0].state?.editing).toBeUndefined();

    // Simulate resubmit truncation: the edited message is removed entirely.
    engine.setMessages([]);
    expect(engine.getState().messages).toHaveLength(0);
    // After truncation the editing state is gone with the message.
    expect(engine.getState().messages.find((m) => m.state?.editing)).toBeUndefined();
  });

  it('null editing clears an existing editing field', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1' })],
    });

    engine.setMessageEditing('u-1', { active: true, draft: 'x' });
    expect(engine.getState().messages[0].state?.editing).toEqual({ active: true, draft: 'x' });

    engine.setMessageEditing('u-1', null);
    expect(engine.getState().messages[0].state?.editing).toBeUndefined();
  });

  it('notify fires messages-kind subscribers on a write', () => {
    const engine = createMessageEngine({
      connector: null,
      initialMessages: [makeMessage({ id: 'u-1' })],
    });
    const seen: number[] = [];
    engine.subscribe('messages', (s) => seen.push(s.messages.length));

    engine.setMessageEditing('u-1', { active: true });

    expect(seen).toEqual([1]);
  });
});
