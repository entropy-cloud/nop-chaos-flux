import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../../../adapters/ai-chat-context.js';
import type { ChatMessage, ChatMessageContentPart } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * A-5 error-state renderer. Shown when the engine `requestState === 'error'`
 * for the message associated with the failed turn (design.md §5.1). The
 * `ai-bubble` index sets `data-error` when `isError` is true; this renderer
 * additionally matches via `errorMatcher` so the error affordance appears
 * inside the content stream. Surfaces a retry entry that re-sends the last
 * user message text via the ai-chat context's `sendMessage`.
 */
export function ErrorContentRenderer({ message }: BubbleContentRendererProps) {
  const ctx = useAiChatContext();
  const lastUserText = extractLastUserText(message, ctx?.messages ?? []);
  return (
    <div
      data-slot="ai-bubble-error"
      className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive"
      role="alert"
    >
      <span className="flex-1">{t('flux.ai.requestFailed')}</span>
      {lastUserText ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="ai-bubble-error-retry"
          aria-label={t('flux.ai.retry')}
          onClick={() => {
            void ctx?.sendMessage(lastUserText);
          }}
        >
          {t('flux.ai.retry')}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Extract the text of the last user message preceding the error message so
 * the retry button can re-send it. Returns `''` when there is no preceding
 * user message with extractable text (retry button stays hidden).
 */
function extractLastUserText(message: ChatMessage, messages: ChatMessage[]): string {
  const idx = messages.findIndex((m) => m.id === message.id);
  if (idx === -1) return '';
  return lastUserTextBefore(messages, idx);
}

/**
 * Match an assistant message flagged as the error carrier. The bubble view
 * flips `message.metadata.isError` to `true` (see `AiBubbleView`) when the
 * engine `requestState` is `error` for the in-flight assistant placeholder.
 */
export function errorMatcher(message: ChatMessage): boolean {
  return message.metadata?.isError === true;
}

export interface ListErrorBannerProps {
  messages: ChatMessage[];
  sendMessage?: (content: string | ChatMessageContentPart[]) => Promise<void>;
}

/**
 * FIND-03 (2026-08-11, A-5 error carrier): list-level error banner for failed
 * turns whose assistant residue was dropped by invariant ⑩
 * (`commitOrDropResidue` — zero-chunk / auth 401/429 / pre-first-byte /
 * `onBeforeRequest` rejection). The bubble-level error renderer binds to a
 * trailing assistant message (`requestState==='error'` + last message
 * assistant); when the residue is dropped only the user message remains and
 * that binding can never fire — this banner is the A-5 carrier for that
 * surface. Rendered by `ai-message-list`; reuses the bubble error affordance
 * (message + retry entry re-sending the last user text).
 */
export function ListErrorBanner({ messages, sendMessage }: ListErrorBannerProps): React.ReactElement | null {
  const lastUserText = lastUserTextBefore(messages, messages.length);
  return (
    <div
      data-slot="ai-message-list-error"
      className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive"
      role="alert"
    >
      <span className="flex-1">{t('flux.ai.requestFailed')}</span>
      {lastUserText && sendMessage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="ai-message-list-error-retry"
          aria-label={t('flux.ai.retry')}
          onClick={() => {
            void sendMessage(lastUserText);
          }}
        >
          {t('flux.ai.retry')}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Extract the text of the last user message in `messages[0, endExclusive)`
 * (shared by the bubble error renderer and the list-level error banner).
 * Returns `''` when there is no user message with extractable text (retry
 * button stays hidden).
 */
function lastUserTextBefore(messages: ChatMessage[], endExclusive: number): string {
  for (let i = endExclusive - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const content = m.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      const text = content
        .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : ''))
        .join('')
        .trim();
      if (text) return text;
    }
  }
  return '';
}
