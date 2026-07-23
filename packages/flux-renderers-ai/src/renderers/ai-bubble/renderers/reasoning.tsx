import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';
import { safeMarkdownSlice } from '../markdown-buffer.js';
import { MarkdownContentRenderer } from './markdown.js';

/**
 * `reasoning` bubble content renderer (design.md §3.3). Matches assistant
 * messages carrying a non-empty `reasoning_content` (DeepSeek / Anthropic
 * style) and renders a collapsible "thinking" panel. Collapse state mirrors
 * `message.state.thinking.open` when present (written by `thinkingPlugin`),
 * otherwise it is local component state.
 *
 * Registered at `CONTENT` priority.
 */
export function ReasoningContentRenderer({ message }: BubbleContentRendererProps): React.ReactElement | null {
  const reasoning = message.reasoning_content;
  const [internalOpen, setInternalOpen] = useState(false);
  if (typeof reasoning !== 'string' || reasoning.length === 0) return null;

  const controlled = message.state?.thinking;
  const open = controlled ? controlled.open : internalOpen;
  const streaming = message.loading === true;

  // A-10: reasoning duration from thinking-plugin timing (ms → s).
  const timing = controlled;
  const seconds =
    timing?.startedAt != null && timing?.endedAt != null
      ? Math.max(0, Math.round((timing.endedAt - timing.startedAt) / 1000))
      : 0;

  function toggle() {
    if (!controlled) setInternalOpen((v) => !v);
  }

  const label = streaming ? t('flux.ai.thinking') : t('flux.ai.thoughtFor', { seconds });

  return (
    <div
      data-slot="ai-bubble-reasoning"
      data-open={open ? '' : undefined}
      className="rounded-md border border-border bg-muted/30 text-xs text-muted-foreground"
    >
      <button
        type="button"
        className="flex w-full items-center gap-1 px-2 py-1 text-left"
        aria-expanded={open}
        onClick={toggle}
        disabled={controlled !== undefined}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{label}</span>
      </button>
      {open ? (
        <div className={cn('border-t border-border px-2 py-1')}>
          <MarkdownContentRenderer message={message} content={reasoning} contentIndex={-1} />
        </div>
      ) : null}
    </div>
  );
}

export function reasoningMatcher(message: ChatMessage): boolean {
  return typeof message.reasoning_content === 'string' && message.reasoning_content.length > 0;
}

/** Re-export so callers can import the buffer slice helper from one place. */
export { safeMarkdownSlice };
