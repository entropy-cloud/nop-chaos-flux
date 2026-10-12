import type { ChatMessage } from '../engine/types.js';

/**
 * Text extraction from a `ChatMessage`'s content — single home for the
 * previously hand-copied `extractText`/`extractMessageText`/length variants
 * (WA-ai-003, plan 571). The part predicate is the typed discriminant
 * (`type === 'text'`), folding the older structural duck (`'text' in p`)
 * copies so a future `data-*` part carrying a `text` field cannot fork the
 * two families.
 */
function textOfPart(part: unknown): string {
  if (part && typeof part === 'object' && (part as { type?: unknown }).type === 'text') {
    return String((part as { text?: unknown }).text ?? '');
  }
  return '';
}

/**
 * Extract display text from a single content value (string or one text part).
 * Arrays are NOT joined here — that is `extractMessageText`'s job; the bubble
 * markdown renderer consumes exactly one content value.
 */
export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  return textOfPart(content);
}

/** Extract plain text from a ChatMessage content (string or text parts). */
export function extractMessageText(message: ChatMessage | undefined): string {
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => textOfPart(part)).join('');
  }
  return '';
}

/**
 * Length-only variant used by the auto-scroll trigger (plan 2026-09-29-2
 * R2-P20): sums part lengths WITHOUT joining, so a streaming transcript never
 * allocates the full joined string per tick. Keep the loop — do not
 * reimplement as `extractMessageText(message).length`.
 */
export function measureMessageTextLength(message: ChatMessage): number {
  const content = message.content;
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    let total = 0;
    for (const part of content) {
      total += textOfPart(part).length;
    }
    return total;
  }
  return 0;
}
