import { createContext, useContext } from 'react';
import type { ChatMessageContentPart } from '../engine/types.js';
import type { ChatMessage, MessageEngine, RequestProcessingState, RequestState } from '../engine/types.js';
import type { AiBranch } from '../schemas.js';

export interface AiChatContextValue {
  engine: MessageEngine;
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  sendMessage: (content: string | ChatMessageContentPart[]) => Promise<void>;
  abortRequest: () => Promise<void>;
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
