import { useEffect, useState, useSyncExternalStore } from 'react';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import type {
  AiConnector,
  ChatMessage,
  MessageEngine,
  MessageEnginePlugin,
  MessageEngineState,
  RequestProcessingState,
  RequestState,
} from '../engine/types.js';
import type { ChatMessageContentPart } from '../engine/types.js';

export interface UseMessageOptions {
  connector: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  /** Extra OpenAI-compatible params forwarded on every request. */
  extraRequestParams?: Record<string, unknown>;
  systemPrompt?: string;
}

export interface UseMessageReturn {
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  sendMessage: (content: string | ChatMessageContentPart[]) => Promise<void>;
  send: (...messages: ChatMessage[]) => Promise<void>;
  abortRequest: () => Promise<void>;
  engine: MessageEngine;
}

/**
 * Bind a `MessageEngine` to React. The engine is created once via a lazy
 * `useState` initializer with a `createReactMessageAdapter`, so
 * `useSyncExternalStore` receives stable snapshot references. A connector
 * reference change hot-swaps via `engine.setConnector` without rebuilding the
 * engine (design.md §18.3 #18; setConnector is idempotent on mount).
 *
 * Per AGENTS.md React 19 guidance: no `useMemo`/`useCallback` by default; the
 * stable bound `subscribe`/`getSnapshot` come from the engine closure.
 */
export function useMessage(options: UseMessageOptions): UseMessageReturn {
  const [engine] = useState<MessageEngine>(() =>
    createMessageEngine({
      connector: options.connector,
      initialMessages: options.initialMessages,
      plugins: options.plugins,
      extraRequestParams: options.extraRequestParams,
      systemPrompt: options.systemPrompt,
      adapter: createReactMessageAdapter(),
    }),
  );

  // Hot-swap the connector when the host passes a new instance (model/provider
  // switch). In-flight requests keep the old connector; the next send uses the
  // new one (design.md §10.5). Idempotent on mount / when ref is unchanged.
  const { connector } = options;
  useEffect(() => {
    if (connector) {
      engine.setConnector(connector);
    }
  }, [engine, connector]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState) as MessageEngineState;

  return {
    messages: state.messages,
    requestState: state.requestState,
    processingState: state.processingState,
    isProcessing: state.isProcessing,
    sendMessage: engine.sendMessage,
    send: engine.send,
    abortRequest: engine.abort,
    engine,
  };
}
