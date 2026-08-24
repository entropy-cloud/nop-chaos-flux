import { createContext, useContext } from 'react';
import type { ChatMessageContentPart } from '../engine/types.js';
import type { ChatMessage, MessageEngine, RequestProcessingState, RequestState } from '../engine/types.js';
import type { AiBranch } from '../schemas.js';

/**
 * D4 (plan 2026-08-24-2317-1, Decision D-handle): the per-chat sender draft
 * external channel. Sender typing goes through `setLocal` (write-through —
 * updates the stored value WITHOUT notifying subscribers, preventing
 * feedback loops); external writes (`component:setSenderDraft`) go through
 * `apply(text, mode)` which computes on the CURRENT value (including
 * user-typed text) and then notifies:
 *
 * - `append` (default): empty base writes `text` directly (no newline);
 *   non-empty base appends `\n` + `text` (user text preserved). A repeat of
 *   the same write whose result is still the current draft is skipped
 *   (dedupe).
 * - `replace`: overwrites the whole draft.
 */
export interface AiSenderDraftStore {
  get(): string;
  setLocal(text: string): void;
  apply(text: string, mode?: 'append' | 'replace'): void;
  subscribe(listener: () => void): () => void;
}

export function createAiSenderDraftStore(): AiSenderDraftStore {
  let value = '';
  let lastApply: { text: string; result: string } | undefined;
  const listeners = new Set<() => void>();
  function notify() {
    for (const listener of listeners) listener();
  }
  return {
    get() {
      return value;
    },
    setLocal(text) {
      value = text;
    },
    apply(text, mode = 'append') {
      if (mode === 'replace') {
        value = text;
        lastApply = { text, result: text };
        notify();
        return;
      }
      // Dedupe: the same write landing on an unchanged draft is a repeat
      // click — skip it instead of appending a duplicate.
      if (lastApply && lastApply.text === text && value === lastApply.result) {
        return;
      }
      value = value === '' ? text : `${value}\n${text}`;
      lastApply = { text, result: value };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export interface AiChatContextValue {
  engine: MessageEngine;
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  sendMessage: (content: string | ChatMessageContentPart[]) => Promise<void>;
  abortRequest: () => Promise<void>;
  /**
   * D4: the per-chat sender draft channel (created by `ai-chat`). External
   * writes (e.g. `component:setSenderDraft`) go through `apply`; the sender
   * merges notifications into its local draft state. Optional so standalone
   * consumers (no `ai-chat` wrapper) stay backward compatible.
   */
  senderDraft?: AiSenderDraftStore;
  /**
   * A-16 message branches: host-managed branch set + active id, projected from
   * the `ai-chat` schema. Each `ai-bubble` whose message id is a branch point
   * renders a prev/next picker. `onBranchChange` is the host hook to load the
   * selected branch's messages.
   */
  branches?: AiBranch[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  /**
   * P2-4 (2026-08-10 multi-audit): HITL approval dispatch for the bubble path.
   * `ai-chat` threads its schema `onApproval` event through the context so a
   * pending tool-call card rendered inside a bubble (via the message-level
   * tools renderer) can approve/reject. Omitted → the `hitl-no-handler` guard
   * disables the buttons (unchanged standalone behavior).
   */
  onApproval?: (action: 'approve' | 'reject') => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function AiChatProvider(props: { value: AiChatContextValue; children: React.ReactNode }) {
  return <AiChatContext.Provider value={props.value}>{props.children}</AiChatContext.Provider>;
}

/**
 * Read the `ai-chat` engine context. Returns `null` outside an `ai-chat`
 * (so `ai-bubble` can render standalone in non-conversation scenarios,
 * design.md §10.2).
 */
export function useAiChatContext(): AiChatContextValue | null {
  return useContext(AiChatContext);
}
