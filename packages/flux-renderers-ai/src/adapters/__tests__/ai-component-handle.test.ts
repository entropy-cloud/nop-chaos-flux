import { describe, it, expect, vi } from 'vitest';
import { createAiComponentHandle, AI_COMPONENT_METHODS } from '../ai-component-handle.js';
import { createAiSenderDraftStore } from '../ai-chat-context.js';
import type { ChatMessage, MessageEngine } from '../../engine/types.js';
import type { ComponentCapabilityActionContext } from '@nop-chaos/flux-core';

function mockEngine(overrides: Partial<MessageEngine> = {}): MessageEngine & {
  sendMessage: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  getMessages: ReturnType<typeof vi.fn>;
  setMessages: ReturnType<typeof vi.fn>;
} {
  return {
    getState: vi.fn(() => ({ messages: [], requestState: 'idle', isProcessing: false })),
    subscribe: vi.fn(() => () => undefined),
    sendMessage: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
    abort: vi.fn(async () => undefined),
    clear: vi.fn(() => undefined),
    setConnector: vi.fn(() => undefined),
    registerPlugin: vi.fn(() => () => undefined),
    getMessages: vi.fn(() => [] as ChatMessage[]),
    setMessages: vi.fn(() => undefined),
    ...overrides,
  } as unknown as ReturnType<typeof mockEngine>;
}

const ctx: ComponentCapabilityActionContext = {};

describe('createAiComponentHandle — invoke dispatch (6 methods)', () => {
  it('sendMessage dispatches with { text }', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('sendMessage', { text: 'hello' }, ctx);
    expect(result.ok).toBe(true);
    expect(engine.sendMessage).toHaveBeenCalledWith('hello');
  });

  it('sendMessage dispatches with { parts } (multimodal)', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const parts = [{ type: 'image_url' as const, image_url: { url: 'u' } }];
    const result = await handle.capabilities.invoke('sendMessage', { parts }, ctx);
    expect(result.ok).toBe(true);
    expect(engine.sendMessage).toHaveBeenCalledWith(parts);
  });

  it('sendMessage rejects empty payload', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('sendMessage', undefined, ctx);
    expect(result.ok).toBe(false);
    expect(engine.sendMessage).not.toHaveBeenCalled();
  });

  it('abort dispatches', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('abort', undefined, ctx);
    expect(result.ok).toBe(true);
    expect(engine.abort).toHaveBeenCalled();
  });

  it('clear dispatches', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('clear', undefined, ctx);
    expect(result.ok).toBe(true);
    expect(engine.clear).toHaveBeenCalled();
  });

  it('getMessages returns a read-only snapshot in data', async () => {
    const snapshot: ChatMessage[] = [{ id: 'm1', role: 'user', content: 'hi' }];
    const engine = mockEngine({ getMessages: vi.fn(() => snapshot) });
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('getMessages', undefined, ctx);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(snapshot);
  });

  it('setMessages replaces the list', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const replacement: ChatMessage[] = [{ id: 'x', role: 'user', content: 'r' }];
    const result = await handle.capabilities.invoke('setMessages', { messages: replacement }, ctx);
    expect(result.ok).toBe(true);
    expect(engine.setMessages).toHaveBeenCalledWith(replacement);
  });

  it('setMessages rejects non-array payload', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('setMessages', { messages: 'nope' }, ctx);
    expect(result.ok).toBe(false);
    expect(engine.setMessages).not.toHaveBeenCalled();
  });

  it('unknown method returns ok:false', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('bogus', {}, ctx);
    expect(result.ok).toBe(false);
  });

  it('executor throw is caught and reported as ok:false', async () => {
    const engine = mockEngine({
      sendMessage: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    const result = await handle.capabilities.invoke('sendMessage', { text: 'x' }, ctx);
    expect(result.ok).toBe(false);
  });
});

describe('createAiComponentHandle — capability metadata', () => {
  it('hasMethod / listMethods cover all 6 logical methods', () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat1' });
    for (const method of AI_COMPONENT_METHODS) {
      expect(handle.capabilities.hasMethod?.(method)).toBe(true);
    }
    expect(handle.capabilities.hasMethod?.('unknown')).toBe(false);
    expect(handle.capabilities.listMethods?.()).toEqual([...AI_COMPONENT_METHODS]);
  });

  it('handle carries id / name / type', () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({ engine, id: 'chat-7', name: 'myChat' });
    expect(handle.id).toBe('chat-7');
    expect(handle.name).toBe('myChat');
    expect(handle.type).toBe('ai-chat');
  });
});

// ============================================================================
// D4 (plan 2026-08-24-2317-1): component:setSenderDraft — write the sender
// draft through the per-chat draft channel. Append joins on the CURRENT
// value (user-typed text preserved), a repeat of the same write is skipped
// (dedupe), replace overwrites the whole draft.
// ============================================================================

describe('createAiComponentHandle — D4 setSenderDraft', () => {
  it('AI_COMPONENT_METHODS is exactly the 7 literal methods incl. setSenderDraft (drift-guard)', () => {
    expect([...AI_COMPONENT_METHODS]).toEqual([
      'sendMessage',
      'abort',
      'clear',
      'getMessages',
      'setMessages',
      'regenerate',
      'setSenderDraft',
    ]);
    const engine = mockEngine();
    const handle = createAiComponentHandle({
      engine,
      id: 'chat1',
      senderDraft: createAiSenderDraftStore(),
    });
    expect(handle.capabilities.hasMethod?.('setSenderDraft')).toBe(true);
  });

  it('append writes the text directly on an empty base (no leading newline)', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: 'What is the weather?' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('What is the weather?');
  });

  it('append joins with \\n on a non-empty base and preserves typed text', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('user typed');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: 'voice transcript', mode: 'append' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('user typed\nvoice transcript');
  });

  it('append skips a repeat of the same write while the draft still equals it (dedupe)', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    await handle.capabilities.invoke('setSenderDraft', { text: 'A' }, ctx);
    const second = await handle.capabilities.invoke('setSenderDraft', { text: 'A' }, ctx);
    expect(second.ok).toBe(true);
    expect(senderDraft.get()).toBe('A');
  });

  it('replace overwrites the whole draft', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('stale draft');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: 'B', mode: 'replace' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('B');
  });

  it('missing/empty text → ok:false (payload validation)', async () => {
    const engine = mockEngine();
    const handle = createAiComponentHandle({
      engine,
      id: 'chat1',
      senderDraft: createAiSenderDraftStore(),
    });
    const missing = await handle.capabilities.invoke('setSenderDraft', undefined, ctx);
    expect(missing.ok).toBe(false);
    const empty = await handle.capabilities.invoke('setSenderDraft', { text: '' }, ctx);
    expect(empty.ok).toBe(false);
  });

  // ==========================================================================
  // P2-4 (2026-08-24 open-audit, plan 2026-08-25-0440-1): `mode:'replace'` +
  // empty `text` is a legal "clear the draft" intent — the host previously had
  // no handle path to empty the sender input.
  // ==========================================================================

  it('P2-4: replace + empty string clears the draft (ok:true, channel receives "")', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('stale draft');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: '', mode: 'replace' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('');
  });

  it('P2-4: append + empty string stays rejected (no semantics)', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('keep me');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: '', mode: 'append' },
      ctx,
    );
    expect(result.ok).toBe(false);
    expect(senderDraft.get()).toBe('keep me');
  });

  it('P2-4 regression: replace with non-empty text still overwrites', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('old');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: 'new', mode: 'replace' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('new');
  });

  it('P2-4 regression: append with non-empty text still appends', async () => {
    const engine = mockEngine();
    const senderDraft = createAiSenderDraftStore();
    senderDraft.setLocal('base');
    const handle = createAiComponentHandle({ engine, id: 'chat1', senderDraft });
    const result = await handle.capabilities.invoke(
      'setSenderDraft',
      { text: 'more', mode: 'append' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(senderDraft.get()).toBe('base\nmore');
  });
});
