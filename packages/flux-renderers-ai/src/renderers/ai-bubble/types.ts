import type { ComponentType } from 'react';
import type { ChatMessage, ChatToolCall, ChatToolCallUIState } from '../../engine/types.js';

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

// ============================================
// A-6: BubbleToolRendererMatch — per-tool card registry (design.md §3.3)
// ============================================

/**
 * Props handed to a per-tool card renderer (A-6). The host registers a
 * dedicated card via `xui:imports`; the package ships only a generic `*`
 * fallback that delegates to `AiToolCallRenderer`.
 */
export interface BubbleToolRendererProps {
  /** The assistant message that owns the tool_call. */
  message: ChatMessage;
  /** The specific tool_call being rendered. */
  toolCall: ChatToolCall;
  /** Resolved per-call UI state (status / open / result). */
  state: ChatToolCallUIState;
  /** Stable key derived from `toolCall.id ?? idx-${index}` (React key). */
  toolCallKey: string;
}

/**
 * A registration entry mapping a tool name to a dedicated card renderer.
 * `toolName` may be a literal string or a RegExp tested against
 * `tool_call.function.name`. `priority` is ascending (lower wins); the `*`
 * wildcard always has the lowest priority and acts as the fallback.
 */
export interface BubbleToolRendererMatch {
  toolName: string | RegExp;
  renderer: ComponentType<BubbleToolRendererProps>;
  /** Lower wins. Defaults to 0; the `*` fallback is forced to +Infinity. */
  priority?: number;
}

/**
 * Resolve which tool-card renderer applies to a given tool_call. Walks
 * registrations ordered by ascending priority; the first whose `toolName`
 * matches wins. Returns `undefined` when no registration matches — the caller
 * then falls back to the generic `AiToolCallRenderer` (kept out of this module
 * to avoid a circular import).
 */
export function resolveToolRenderer(
  registrations: BubbleToolRendererMatch[] | undefined,
  toolCall: ChatToolCall,
): BubbleToolRendererMatch | undefined {
  const name = toolCall.function.name;
  if (!registrations || registrations.length === 0) return undefined;
  const ordered = [...registrations].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );
  let wildcard: BubbleToolRendererMatch | undefined;
  for (const entry of ordered) {
    const pattern = entry.toolName;
    if (pattern === '*') {
      if (!wildcard) wildcard = entry;
      continue;
    }
    if (typeof pattern === 'string') {
      if (pattern === name) return entry;
    } else if (pattern.test(name)) {
      return entry;
    }
  }
  return wildcard;
}
