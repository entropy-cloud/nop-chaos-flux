import { useSyncExternalStore } from 'react';
import type {
  ChatMessage,
  ChatMessageContentPart,
  MessageEngine,
  MessageEngineState,
  RequestProcessingState,
  RequestState,
} from '../engine/types.js';

export interface UseEngineViewReturn {
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
 * Bind an existing `MessageEngine` to React via `useSyncExternalStore`, producing
 * the reactive view the message-list / sender / context consume.
 *
 * This is the shared "external engine binding" lifted out of the former private
 * helper in `ai-persistence-demo.tsx`. It is also reused internally by
 * `useMessage` (self-built engine) so there is a single subscribe/snapshot path.
 *
 * Per AGENTS.md React 19 guidance: the stable bound `subscribe`/`getSnapshot`
 * come from the engine closure itself (`engine.subscribe` / `engine.getState`
 * are stable references created once per engine), so no `useCallback` wrapper
 * is required. The engine MUST be backed by a snapshot-caching adapter
 * (`createReactMessageAdapter`) so `getSnapshot` returns a stable reference
 * between notifications (avoids render loops).
 *
 * Requires a non-null `MessageEngine`. Callers that may hold `null` (e.g.
 * `useConversation.activeEngine` during a switch) should branch before calling,
 * or pass the engine through `useMessage({ engine })` which falls back to a
 * self-built engine.
 */
export function useEngineView(engine: MessageEngine): UseEngineViewReturn {
  const state = useSyncExternalStore(
    engine.subscribe,
    engine.getState,
    engine.getState,
  ) as MessageEngineState;
  return {
    engine,
    messages: state.messages,
    requestState: state.requestState,
    processingState: state.processingState,
    isProcessing: state.isProcessing,
    sendMessage: engine.sendMessage,
    send: engine.send,
    abortRequest: engine.abort,
  };
}
