import { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import { clipboardAdapter } from './renderers/markdown.js';
import type { ChatMessage, MessageEngine } from '../../engine/types.js';

/**
 * Assistant-side per-bubble action bar (plan 472 V2 / survey §1.4): copy the
 * message text and retry the turn. The copy channel reuses the markdown code
 * block's `clipboardAdapter` (INV-1 adjudicated: user-gesture browser API,
 * explicit-failure semantics — a rejected write keeps the button pre-copy).
 *
 * Retry wires the engine's `regenerate()`, which truncates back to the last
 * user message — so the retry button is mounted on the LAST assistant bubble
 * only (an older bubble retrying would silently regenerate the final turn).
 * Standalone bubbles without an engine hide retry and keep copy.
 */
export function AssistantActions(props: {
  message: ChatMessage;
  /** Present only on the last assistant bubble (retry eligibility). */
  engine?: MessageEngine;
  /** Streaming window: retry is unavailable while a request is in flight. */
  busy?: boolean;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  function extractText(content: ChatMessage['content']): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((part) => (part.type === 'text' ? String(part.text ?? '') : '')).join('');
    }
    return '';
  }

  async function handleCopy(): Promise<void> {
    try {
      await clipboardAdapter.writeText(extractText(props.message.content));
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Rejected/absent clipboard: stay in pre-copy state (no false "copied").
    }
  }

  const canRetry = props.engine != null && props.busy !== true;

  return (
    <div data-slot="ai-assistant-actions">
      <button
        type="button"
        data-slot="ai-action-copy"
        aria-label={copied ? t('flux.ai.copied') : t('flux.ai.copyMessage')}
        onClick={() => void handleCopy()}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite" className="sr-only">{copied ? t('flux.ai.copied') : ''}</span>
      </button>
      {props.engine ? (
        <button
          type="button"
          data-slot="ai-action-retry"
          aria-label={t('flux.ai.retryMessage')}
          disabled={!canRetry}
          onClick={() => {
            if (canRetry) void props.engine?.regenerate();
          }}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
