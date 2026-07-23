import {
  combineDeltaData,
  generateMessageId,
} from './utils.js';
import { createNativeMessageAdapter } from './native-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  ChatMessageContentPart,
  ChatMessageMetadata,
  InternalMessageState,
  MessageEngine,
  MessageEngineContext,
  MessageEnginePlugin,
  MessageEngineState,
  MessageStateAdapter,
  MessageStateSubscribe,
} from './types.js';

export interface CreateMessageEngineOptions {
  connector?: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  adapter?: MessageStateAdapter;
  /** Extra OpenAI-compatible params forwarded on every request. */
  extraRequestParams?: Record<string, unknown>;
  /** Optional system prompt prepended to every request (not added to history). */
  systemPrompt?: string;
}

/**
 * Create a framework-agnostic message engine. Ported from tiny-robot
 * `kit/src/message/core/engine.ts`, rewritten without Vue/React coupling.
 *
 * State lives in the injected `MessageStateAdapter` (native by default). The
 * engine owns the turn lifecycle: idle → processing → completed/aborted/error,
 * streaming accumulation via `combineDeltaData`, and plugin fan-out.
 *
 * MUST NOT import 'react' or DOM globals (INV-1, `design.md` §18.1).
 */
export function createMessageEngine(options: CreateMessageEngineOptions = {}): MessageEngine {
  const adapter = options.adapter ?? createNativeMessageAdapter();
  const plugins: MessageEnginePlugin[] = [...(options.plugins ?? [])];
  const extraRequestParams = options.extraRequestParams ?? {};
  const systemPrompt = options.systemPrompt;

  adapter.initialize({
    messages: options.initialMessages ? options.initialMessages.map((m) => ({ ...m })) : [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: options.connector ?? null,
  });

  const engine: MessageEngine = {
    getState,
    // Bind so `engine.subscribe` is safe to pass directly to React's
    // `useSyncExternalStore` (stable identity, correct `this`).
    subscribe: ((...args: Parameters<MessageStateSubscribe>) =>
      adapter.subscribe(...args)) as MessageStateSubscribe,
    sendMessage,
    send,
    abort,
    setConnector,
    registerPlugin,
  };

  function getState(): MessageEngineState {
    return adapter.getState();
  }

  function setConnector(connector: AiConnector): void {
    // Idempotent: skip when the same connector reference is re-assigned (avoids
    // a spurious notify when the host effect re-runs on mount).
    if ((adapter as unknown as { state: InternalMessageState }).state.connector === connector) {
      return;
    }
    adapter.mutate('full', (draft) => {
      draft.connector = connector;
    });
  }

  function registerPlugin(plugin: MessageEnginePlugin): () => void {
    plugins.push(plugin);
    return () => {
      const idx = plugins.indexOf(plugin);
      if (idx >= 0) plugins.splice(idx, 1);
    };
  }

  function isEmptyContent(content: string | ChatMessageContentPart[]): boolean {
    if (typeof content === 'string') return content.trim().length === 0;
    if (Array.isArray(content)) return content.length === 0;
    return true;
  }

  async function sendMessage(content: string | ChatMessageContentPart[]): Promise<void> {
    if (isEmptyContent(content)) {
      return;
    }
    const userMessage = adapter.createMessage({
      id: generateMessageId('user'),
      role: 'user',
      content,
      metadata: { createdAt: Date.now() },
    });
    await runTurn([userMessage]);
  }

  async function send(...messages: ChatMessage[]): Promise<void> {
    const stamped = messages.map((m) =>
      adapter.createMessage({ ...m, id: m.id ?? generateMessageId(m.role), metadata: { createdAt: Date.now(), ...m.metadata } }),
    );
    if (stamped.length === 0) return;
    await runTurn(stamped);
  }

  async function runTurn(incomingMessages: ChatMessage[]): Promise<void> {
    const connector = adapterStateConnector();
    if (!connector) {
      adapter.mutate('requestState', (draft) => {
        draft.messages.push(...incomingMessages);
        draft.requestState = 'error';
        draft.isProcessing = false;
      });
      return;
    }

    const abortController = createAbortController();

    // 1. Push incoming messages + assistant placeholder; enter processing.
    adapter.mutate('requestState', (draft) => {
      draft.messages.push(...incomingMessages);
      draft.requestState = 'processing';
      draft.isProcessing = true;
      draft.processingState = 'requesting';
      draft.abortController = abortController;
    });

    let assistant: ChatMessage = adapter.createMessage({
      id: generateMessageId('ai'),
      role: 'assistant',
      content: '',
      loading: true,
      metadata: { createdAt: Date.now() },
    });
    adapter.mutate('messages', (draft) => {
      draft.messages.push(assistant);
      draft.processingState = 'completing';
    });

    const history = adapter.getState().messages.slice(0, -1);
    const requestMessages: ChatMessage[] = systemPrompt
      ? [{ id: 'system-prompt', role: 'system', content: systemPrompt }, ...history]
      : history;

    const request: AiConnectorRequest = {
      messages: requestMessages,
      signal: abortController.signal,
      ...extraRequestParams,
    };
    const ctx: MessageEngineContext = {
      engine,
      state: adapter.getState(),
      request,
      signal: abortController.signal,
    };

    for (const plugin of plugins) {
      await plugin.onTurnStart?.(ctx);
    }
    for (const plugin of plugins) {
      await plugin.onBeforeRequest?.(ctx);
    }

    /** Commit the working `assistant` draft into state with a fresh reference. */
    function commitAssistant(): void {
      adapter.mutate('messages', (draft) => {
        const idx = draft.messages.lastIndexOf(assistant);
        // Shallow-copy so subscribers get a new array + new message reference
        // (React useSyncExternalStore identity check).
        draft.messages = draft.messages.slice();
        if (idx >= 0) {
          draft.messages[idx] = { ...assistant };
          assistant = draft.messages[idx];
        }
      });
    }

    try {
      const generator = await connector.stream(request);
      let firstChunkReceived = false;
      let lastFinishReason: string | undefined;
      let lastMetadata: ChatMessageMetadata | undefined;

      for await (const chunk of generator) {
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          assistant.loading = false;
        }
        applyChunk(assistant, chunk);
        if (chunk.finishReason) lastFinishReason = chunk.finishReason;
        if (chunk.metadata) lastMetadata = chunk.metadata;
        for (const plugin of plugins) {
          plugin.onCompletionChunk?.(ctx, chunk, assistant);
        }
        commitAssistant();
      }

      if (!firstChunkReceived) {
        assistant.loading = false;
      }
      if (lastFinishReason) {
        assistant.metadata = { ...assistant.metadata, finishReason: lastFinishReason };
      }
      if (lastMetadata) {
        assistant.metadata = { ...assistant.metadata, ...lastMetadata };
      }

      for (const plugin of plugins) {
        await plugin.onAfterRequest?.(ctx, assistant);
      }
      commitAssistant();

      // Unless aborted mid-stream, mark the turn completed.
      adapter.mutate('requestState', (draft) => {
        if (draft.requestState === 'aborted') return;
        draft.requestState = 'completed';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
    } catch (error) {
      assistant.loading = false;
      commitAssistant();
      const aborted = abortController.signal.aborted;
      for (const plugin of plugins) {
        plugin.onError?.(ctx, error);
      }
      adapter.mutate('requestState', (draft) => {
        draft.requestState = aborted ? 'aborted' : 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
    } finally {
      adapter.mutate('full', (draft) => {
        draft.abortController = null;
      });
      for (const plugin of plugins) {
        await plugin.onTurnEnd?.(ctx);
      }
    }
  }

  function applyChunk(message: ChatMessage, chunk: AiConnectorChunk): void {
    if (chunk.delta) {
      combineDeltaData(message, chunk.delta);
    }
    if (chunk.snapshot) {
      combineDeltaData(message, chunk.snapshot);
    }
  }

  function adapterStateConnector(): AiConnector | null {
    return (adapter as unknown as { state: InternalMessageState }).state.connector;
  }

  async function abort(): Promise<void> {
    const controller = (adapter as unknown as { state: InternalMessageState }).state.abortController;
    if (!controller) return;
    controller.abort();
    adapter.mutate('requestState', () => {
      // requestState is updated by the stream's catch block (aborted branch);
      // set it here too so synchronous abort is observable immediately.
    });
    adapter.mutate('requestState', (draft) => {
      draft.requestState = 'aborted';
      draft.isProcessing = false;
    });
  }

  return engine;
}

/** Indirection so tests can inject a fake controller. */
function createAbortController(): AbortController {
  return new AbortController();
}
