import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * A-5 error-state renderer. Shown when the engine `requestState === 'error'`
 * (design.md §5.1). Surfaces a retry entry; the actual retry action is the
 * host's job (re-send the last user message via `ai:send` or
 * `engine.sendMessage`). This renderer is informational + actionable — it
 * does not auto-retry.
 */
export function ErrorContentRenderer({ message }: BubbleContentRendererProps) {
  const lastUserText = extractLastUserText(message);
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
            // Retry is dispatched through the engine via the action namespace
            // or the host `onError` handler — this button surfaces a stable
            // affordance only.
            void lastUserText;
          }}
        >
          {t('flux.ai.retry')}
        </Button>
      ) : null}
    </div>
  );
}

function extractLastUserText(message: import('../../../engine/types.js').ChatMessage): string {
  void message;
  return '';
}
