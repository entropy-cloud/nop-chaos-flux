import type { ComponentType } from 'react';
import type { ChatMessage } from '../../engine/types.js';

export interface BubbleContentRendererProps {
  message: ChatMessage;
  /** The content slice being rendered (string | part). */
  content: unknown;
  /** Index into the content array (0 for plain-string content). */
  contentIndex: number;
}

export interface BubbleContentRendererMatch {
  find(message: ChatMessage, content: unknown, contentIndex: number): boolean;
  renderer: ComponentType<BubbleContentRendererProps>;
  /** Lower = higher priority. */
  priority?: number;
}

export const BubbleRendererMatchPriority = {
  LOADING: -1,
  NORMAL: 0,
  CONTENT: 10,
  ROLE: 20,
} as const;

export interface ResolveContentResult {
  content: unknown;
  index: number;
}

/**
 * Normalize a message's content into an iterable of `{ content, index }`
 * slices so the registration system can match each slice independently.
 */
export function resolveContentSlices(message: ChatMessage): ResolveContentResult[] {
  const content = message.content;
  if (typeof content === 'string') {
    return [{ content, index: 0 }];
  }
  if (Array.isArray(content)) {
    return content.map((part, index) => ({ content: part, index }));
  }
  return [{ content: '', index: 0 }];
}
