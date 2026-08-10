import {
  isStreamingAssistantPlaceholder,
  isVacuousAssistantResidue,
  projectWireMessage,
  sanitizeDanglingToolCalls,
} from './utils.js';
import type {
  AiConnectorRequest,
  AiToolSchema,
  ChatMessage,
  MessageEngine,
  MessageEngineContext,
  MessageEngineState,
} from './types.js';

/**
 * Build the per-turn plugin/request context (extracted from `create-engine.ts`
 * for the oversized-code-files limit; `tool-execution.ts`/`branching.ts`
 * precedent).
 *
 * ⑪ (2026-08-10 multi-audit, open P1-1 + P1-5): the request payload is
 * ARRAY + ELEMENT isolated from the engine's live message list —
 * `sanitizeDanglingToolCalls(...).map(projectWireMessage)` always produces a
 * new array whose elements are new wire-projection objects. A plugin mutating
 * `ctx.request.messages` (the engine.md §8.3 injection pattern) can only
 * shape the outgoing request — never write through into engine history.
 *
 * P1-5: the wire projection strips renderer-private `state` and internal
 * tool-execution `metadata` (toolError/toolStatus) at the engine boundary.
 *
 * The trailing in-progress assistant placeholder (empty content, loading) and
 * a trailing vacuous residue are excluded from the request payload (works for
 * follow-up rounds too).
 */
export interface BuildEngineContextDeps {
  engine: MessageEngine;
  messages: ChatMessage[];
  state: MessageEngineState;
  systemPrompt?: string;
  tools?: AiToolSchema[];
  extraRequestParams: Record<string, unknown>;
  signal: AbortSignal;
}

export function buildEngineContext(deps: BuildEngineContextDeps): MessageEngineContext {
  const { engine, messages, state, systemPrompt, tools, extraRequestParams, signal } = deps;
  const isPlaceholder =
    messages.length > 0 &&
    (isStreamingAssistantPlaceholder(messages[messages.length - 1]) ||
      isVacuousAssistantResidue(messages[messages.length - 1]));
  const history = isPlaceholder ? messages.slice(0, -1) : messages;
  let requestMessages: ChatMessage[] = systemPrompt
    ? [{ id: 'system-prompt', role: 'system', content: systemPrompt }, ...history]
    : history;
  requestMessages = sanitizeDanglingToolCalls(requestMessages).map(projectWireMessage);
  const request: AiConnectorRequest = {
    messages: requestMessages,
    signal,
    ...(tools && tools.length > 0 ? { tools } : {}),
    ...extraRequestParams,
  };
  return {
    engine,
    state,
    request,
    signal,
  };
}
