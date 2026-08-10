/**
 * Framework-agnostic engine utilities. MUST NOT import 'react' or DOM globals.
 *
 * `combineDeltaData` is the core streaming-accumulation algorithm ported from
 * tiny-robot (`message/utils.ts`). It merges an incremental chunk (`source`)
 * into the accumulated target, with these rules (`engine.md` §8.4):
 *
 * - string + string → concatenation
 * - array + array → if every source element carries an `index` field, merge by
 *   index (OpenAI tool_calls streaming shape); otherwise concatenate
 * - object + object → recursive merge
 * - the `type` field is identity: once set on target it is never overwritten
 * - a source key absent from target is assigned directly (cloned)
 */

import type { AiConnectorChunk, ChatMessage, ChatMessageContentPart } from './types.js';

export type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  const out: AnyRecord = {};
  for (const key of Object.keys(value as AnyRecord)) {
    out[key] = deepClone((value as AnyRecord)[key]);
  }
  return out as unknown as T;
}

function arrayItemsAreIndexed(arr: unknown[]): boolean {
  return (
    arr.length > 0 &&
    arr.every((item) => isPlainObject(item) && typeof item.index === 'number')
  );
}

function mergeArrayInPlace(target: unknown[], source: unknown[]): void {
  // OpenAI tool_calls streaming: source items carry an `index` field that
  // identifies which call they belong to → merge by index.
  if (arrayItemsAreIndexed(source)) {
    for (const srcItem of source) {
      const idx = (srcItem as AnyRecord).index as number;
      if (target[idx] === undefined) {
        target[idx] = deepClone(srcItem);
      } else {
        target[idx] = combineDeltaData(target[idx], srcItem);
      }
    }
    return;
  }
  // Otherwise: plain concatenation (clone objects to avoid shared references).
  for (const item of source) {
    target.push(item !== null && typeof item === 'object' ? deepClone(item) : item);
  }
}

/**
 * Merge `source` into `target`, mutating `target` in place where possible.
 * Returns the merged value (for the string-concat / undefined-target cases the
 * returned reference replaces the old one — callers should always reassign the
 * result).
 */
export function combineDeltaData<T>(target: T, source: unknown): T {
  if (source === null || source === undefined) {
    return target;
  }

  // Both strings → concatenate.
  if (typeof target === 'string' && typeof source === 'string') {
    return (target + source) as unknown as T;
  }

  // Both arrays → merge / concatenate in place.
  if (Array.isArray(target) && Array.isArray(source)) {
    mergeArrayInPlace(target, source);
    return target;
  }

  // Both plain objects → recursive merge.
  if (isPlainObject(target) && isPlainObject(source)) {
    const obj = target as AnyRecord;
    for (const key of Object.keys(source)) {
      // The `type` field identifies a content part; never overwrite once set.
      if (key === 'type' && obj[key] !== undefined) {
        continue;
      }
      obj[key] = combineDeltaData(obj[key], source[key]);
    }
    return target;
  }

  // target is empty but source has a value → adopt source (cloned if complex).
  if (target === undefined || target === null) {
    if (source !== null && typeof source === 'object') {
      return deepClone(source) as unknown as T;
    }
    return source as unknown as T;
  }

  // Primitive source (number/boolean/other) overwrites.
  return source as unknown as T;
}

let messageSeq = 0;

/**
 * Generate a stable message id (engine-internal; React key + scope binding).
 * Deterministic prefix keeps ids readable in tests.
 */
export function generateMessageId(prefix = 'msg'): string {
  messageSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${messageSeq.toString(36)}`;
}

/** Reset the internal id counter (test-only). */
export function _resetMessageIdCounterForTests(): void {
  messageSeq = 0;
}

/**
 * True when `content` carries no sendable payload (whitespace-only string or
 * empty parts). Used to no-op an empty `sendMessage` (AI-24: moved out of
 * `create-engine.ts`).
 */
export function isEmptyContent(content: string | ChatMessageContentPart[]): boolean {
  if (typeof content === 'string') return content.trim().length === 0;
  if (Array.isArray(content)) return content.length === 0;
  return true;
}

/**
 * True for an assistant message that is the in-progress streaming placeholder
 * (empty content + `loading`). `buildContext` excludes the trailing
 * placeholder from the request payload.
 */
export function isStreamingAssistantPlaceholder(message: ChatMessage): boolean {
  return message.role === 'assistant' && message.content === '' && message.loading === true;
}

/**
 * True for a vacuous assistant product: empty content and no finish reason
 * (Cycle 2 / I4, invariant ⑩ K-⑩-1/3/4/5). Failed, aborted or zero-chunk
 * "completed" turns can leave such an empty message behind; it must not enter
 * the next request history nor an autoSave snapshot (strict backends reject
 * empty blocks). A partial stream (non-empty content) or a real completion
 * (finishReason present) is NOT vacuous and is kept.
 */
export function isVacuousAssistantResidue(message: ChatMessage): boolean {
  return (
    message.role === 'assistant' &&
    isEmptyContent(message.content) &&
    !message.metadata?.finishReason
  );
}

/**
 * P1-2 (2026-08-10 multi-audit, invariant ⑩ extension): true when an
 * assistant message carries `tool_calls` with NO paired `role:'tool'`
 * response anywhere in the same list. Content-agnostic by design — the
 * interleaved text+tool_calls shape (non-empty content) is covered exactly
 * like the empty-content shape. Distinct from `isVacuousAssistantResidue`
 * (which requires `!finishReason` — dangling rounds DO carry
 * `finishReason:'tool_calls'`), so it is a new member, not a merge.
 */
export function isDanglingToolCallsMessage(message: ChatMessage, messages: ChatMessage[]): boolean {
  if (message.role !== 'assistant' || !message.tool_calls || message.tool_calls.length === 0) {
    return false;
  }
  return !message.tool_calls.some((call) =>
    messages.some((m) => m.role === 'tool' && m.tool_call_id === call.id),
  );
}

/**
 * P1-2 (2026-08-10 multi-audit, invariant ⑩ extension): apply the
 * dangling-tool_calls policy to a single assistant message against the full
 * message list:
 *
 * - fully dangling (no paired `role:'tool'` at all): empty content → drop
 *   (returns `null`); non-empty content → strip `tool_calls`, keep the text
 * - partially paired (some calls committed before an abort): strip only the
 *   unpaired entries — never the whole array, or already-committed tool
 *   messages would become orphans
 * - not an assistant / no tool_calls / fully paired → returned unchanged
 */
export function cleanDanglingToolCalls(
  message: ChatMessage,
  messages: ChatMessage[],
): ChatMessage | null {
  if (message.role !== 'assistant' || !message.tool_calls || message.tool_calls.length === 0) {
    return message;
  }
  const paired = new Set<string>();
  for (const call of message.tool_calls) {
    if (messages.some((m) => m.role === 'tool' && m.tool_call_id === call.id)) {
      paired.add(call.id);
    }
  }
  if (paired.size === message.tool_calls.length) return message;
  if (paired.size === 0) {
    if (isEmptyContent(message.content)) return null;
    const rest = { ...message };
    delete rest.tool_calls;
    return rest as ChatMessage;
  }
  return { ...message, tool_calls: message.tool_calls.filter((call) => paired.has(call.id)) };
}

/**
 * P1-2 (2026-08-10 multi-audit, invariant ⑩ extension): apply the
 * dangling-tool_calls policy to a whole list. Returns a NEW array (dropped
 * messages removed; stripped messages replaced with copies) — also serves as
 * the request-payload projection's array isolation (open P1-1, invariant ⑪).
 */
export function sanitizeDanglingToolCalls(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const message of messages) {
    const cleaned = cleanDanglingToolCalls(message, messages);
    if (cleaned !== null) out.push(cleaned);
  }
  return out;
}

/**
 * P1-5 (2026-08-10 multi-audit): wire whitelist for `AiConnectorRequest`
 * payload messages. Renderer-private `state` (editing drafts / toolCall UI /
 * thinking) and internal tool-execution `metadata` (toolError — an Error with
 * stack — / toolStatus) are domain-internal ("不投影", design.md §11.5) and
 * must never reach the model provider: un-submitted edit drafts leak on every
 * request, an Error stack may hit the wire, and strict backends can 400
 * unknown fields. Kept: id/role/content/reasoning_content/tool_calls/
 * tool_call_id/name + benign metadata (createdAt/model/finishReason/host
 * fields). Returns a new message object so the payload projection never
 * aliases engine state.
 */
const WIRE_MESSAGE_KEYS = [
  'id',
  'role',
  'content',
  'reasoning_content',
  'tool_calls',
  'tool_call_id',
  'name',
] as const;

export function projectWireMessage(message: ChatMessage): ChatMessage {
  const out: ChatMessage = {} as ChatMessage;
  for (const key of WIRE_MESSAGE_KEYS) {
    const value = (message as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  }
  if (message.metadata) {
    const metadata = { ...message.metadata };
    delete metadata.toolError;
    delete metadata.toolStatus;
    out.metadata = metadata;
  }
  return out;
}

/**
 * Apply a streaming chunk's delta/snapshot to the accumulated assistant
 * message via `combineDeltaData`.
 */
export function applyChunk(message: ChatMessage, chunk: AiConnectorChunk): void {
  if (chunk.delta) {
    combineDeltaData(message, chunk.delta);
  }
  if (chunk.snapshot) {
    combineDeltaData(message, chunk.snapshot);
  }
}

/** Indirection so tests can inject a fake controller. */
export function createAbortController(): AbortController {
  return new AbortController();
}
