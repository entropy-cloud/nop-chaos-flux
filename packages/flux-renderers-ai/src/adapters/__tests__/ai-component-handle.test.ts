import { describe, it, expect, vi } from 'vitest';
import { createAiComponentHandle, AI_COMPONENT_METHODS } from '../ai-component-handle.js';
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
