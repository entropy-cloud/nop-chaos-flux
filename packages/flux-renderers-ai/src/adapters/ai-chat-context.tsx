import { createContext, useContext } from 'react';
import type { ChatMessageContentPart } from '../engine/types.js';
import type { ChatMessage, MessageEngine, RequestProcessingState, RequestState } from '../engine/types.js';

export interface AiChatContextValue {
  engine: MessageEngine;
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  sendMessage: (content: string | ChatMessageContentPart[]) => Promise<void>;
  abortRequest: () => Promise<void>;
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
