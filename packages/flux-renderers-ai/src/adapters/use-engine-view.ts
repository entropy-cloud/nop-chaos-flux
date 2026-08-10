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
 * FIND-05 (2026-08-11, plan 2026-08-11-0008-3): per-engine snapshot-stability
 * tracker for the guard below. Keyed by engine (WeakMap) so the warning fires
 * at most once per engine across all bindings, without any ref-during-render
 * surface (module-level, framework-agnostic).
 */
const snapshotStability = new WeakMap<
  MessageEngine,
  { lastSnapshot: unknown; consecutiveMismatches: number; warned: boolean }
>();

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
 * FIND-05: the DEFAULT native adapter rebuilds a fresh snapshot object on
 * EVERY `getState()` call — `useSyncExternalStore` then re-renders forever
 * ("Maximum update depth exceeded", a host page crash). The wrapped
 * `getSnapshot` below detects that (two CONSECUTIVE different return-value
 * references — the caching React adapter only ever produces isolated
 * mismatches across mutations, so there are no false positives) and warns ONCE
 * per engine, pointing at `createReactMessageAdapter`. Rendering behavior
 * itself is unchanged.
 *
 * Requires a non-null `MessageEngine`. Callers that may hold `null` (e.g.
 * `useConversation.activeEngine` during a switch) should branch before calling,
 * or pass the engine through `useMessage({ engine })` which falls back to a
 * self-built engine.
 */
export function useEngineView(engine: MessageEngine): UseEngineViewReturn {
  const getSnapshot = (): MessageEngineState => {
    const snapshot = engine.getState();
    let track = snapshotStability.get(engine);
    if (!track) {
      track = { lastSnapshot: undefined, consecutiveMismatches: 0, warned: false };
      snapshotStability.set(engine, track);
    }
    if (track.lastSnapshot !== snapshot) {
      track.consecutiveMismatches += 1;
      if (track.consecutiveMismatches >= 2 && !track.warned) {
        track.warned = true;
        if (typeof console !== 'undefined') {
          console.warn(
            '[ai-chat] MessageEngine.getState() returns a new snapshot reference on consecutive calls — ' +
              'the engine is NOT backed by a snapshot-caching adapter and binding it to React can cause an ' +
              'infinite render loop. Build the engine with ' +
              '`createMessageEngine({ adapter: createReactMessageAdapter(), ... })` ' +
              'when binding it to React (see engine.md §8.2/§8.5).',
          );
        }
      }
    } else {
      track.consecutiveMismatches = 0;
    }
    track.lastSnapshot = snapshot;
    return snapshot;
  };
  const state = useSyncExternalStore(engine.subscribe, getSnapshot, getSnapshot) as MessageEngineState;
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
