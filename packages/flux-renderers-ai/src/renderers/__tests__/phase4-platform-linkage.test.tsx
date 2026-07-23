import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createAiComponentHandle } from '../../adapters/ai-component-handle.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
} from '../../engine/types.js';
import type { ComponentCapabilityActionContext } from '@nop-chaos/flux-core';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

function mockConnector(chunks: AiConnectorChunk[]): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) yield c;
      }
      void _req;
      return gen();
    },
  };
}

const CTX = {} as ComponentCapabilityActionContext;

/**
 * Decision-A proof (messages → form field): the host can pull a serialized
 * messages snapshot out via the Layer C `component:getMessages` handle and
 * write it into a scope/form field — WITHOUT the engine ever writing scope
 * itself. INV-17 (`engine.messages` is the domain-internal source of truth) is
 * preserved: the exported copy is a separate reference the host owns.
 */
describe('Decision-A — messages serialization into a form field (host paradigm)', () => {
  it('component:getMessages returns a serialized snapshot the host can setValue into a form field', async () => {
    const engine = createMessageEngine({
      connector: mockConnector([
        { delta: { content: 'Hello ' } },
        { delta: { content: 'world' }, finishReason: 'stop', metadata: { model: 'flux-mock' } },
      ]),
    });
    const handle = createAiComponentHandle({ engine, id: 'chat-1', name: 'ai-chat' });

    await engine.sendMessage('hi');

    // Host: invoke component:getMessages to obtain the snapshot, then SERIALIZE
    // (deep copy) it before writing into a form field. The serialization step is
    // what preserves INV-17: engine.messages stays the domain-internal source of
    // truth; the host owns an independent copy.
    const result = await handle.capabilities.invoke('getMessages', undefined, CTX);
    expect(result.ok).toBe(true);
    const snapshot = (result as { data: ChatMessage[] }).data;
    const exported = JSON.parse(JSON.stringify(snapshot)) as ChatMessage[];

    // Host writes the serialized snapshot into a (simulated) form field.
    const formField: { value: unknown } = { value: undefined };
    formField.value = exported;

    // The form field now holds a readable, serializable copy.
    expect(Array.isArray(formField.value)).toBe(true);
    expect((formField.value as ChatMessage[]).length).toBe(2);
    expect((formField.value as ChatMessage[])[1].content).toBe('Hello world');

    // INV-17: the form copy is a distinct reference — mutating it never corrupts
    // the engine's internal messages.
    expect(formField.value).not.toBe(engine.getMessages());
    (formField.value as ChatMessage[]).push({
      id: 'tampered',
      role: 'user',
      content: 'host-side edit',
    });
    expect(engine.getMessages().length).toBe(2);
  });

  it('onResponseComplete is the host hook to trigger serialization (event already carries the last message)', async () => {
    // The ai-chat renderer fires onResponseComplete on the processing→completed
    // transition with the last message. The host attaches a handler that calls
    // getMessages then setValue — no engine extension required.
    const engine = createMessageEngine({
      connector: mockConnector([{ delta: { content: 'ok' }, finishReason: 'stop' }]),
    });
    const handle = createAiComponentHandle({ engine, id: 'chat-2' });

    let completedMessage: ChatMessage | undefined;
    engine.subscribe('requestState', async (state) => {
      if (state.requestState === 'completed') {
        const res = await handle.capabilities.invoke('getMessages', undefined, CTX);
        completedMessage = (res as { data: ChatMessage[] }).data.at(-1);
      }
    });

    await engine.sendMessage('ping');
    expect(completedMessage?.content).toBe('ok');
  });
});

/**
 * Decision-B proof (data-source linkage): `onResponseComplete` already fires
 * with `{ message: last }`. The host wires `data-source:reload/insert` directly
 * off that event — no engine/handle convenience method is required.
 */
describe('Decision-B — onResponseComplete drives a data-source reload (host paradigm)', () => {
  it('host handler can react to the completed message and reload/insert a data-source', async () => {
    const engine = createMessageEngine({
      connector: mockConnector([{ delta: { content: 'answer' }, finishReason: 'stop' }]),
    });
    const handle = createAiComponentHandle({ engine, id: 'chat-3' });

    const reload = vi.fn();
    // Host wires the linkage off the existing event + handle.
    engine.subscribe('requestState', async (state) => {
      if (state.requestState !== 'completed') return;
      const res = await handle.capabilities.invoke('getMessages', undefined, CTX);
      const last = (res as { data: ChatMessage[] }).data.at(-1);
      // data-source:reload / insert — host decides the semantic.
      reload(last?.content);
    });

    await engine.sendMessage('q');
    expect(reload).toHaveBeenCalledWith('answer');
  });
});
