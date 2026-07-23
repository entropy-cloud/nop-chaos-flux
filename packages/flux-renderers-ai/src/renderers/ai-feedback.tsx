import { useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage } from '../engine/types.js';
import type { AiFeedbackSchema } from '../schemas.js';

type FeedbackAction = 'copy' | 'refresh' | 'like' | 'dislike' | 'sources';

const DEFAULT_ACTIONS: FeedbackAction[] = ['copy', 'refresh'];

/**
 * ai-feedback (Widget, P1): message footer action bar (copy / refresh / like /
 * dislike / sources). Marker `nop-ai-feedback`. Reads the message from
 * resolved props; all actions fire `onAction` with `{ action, message }`
 * (design.md §5.1, renderers.md §8).
 */
export function AiFeedbackRenderer(props: RendererComponentProps<AiFeedbackSchema>): RendererRenderOutput {
  const resolved = props.props;
  const message = resolved.message as ChatMessage | undefined;
  const actions = normalizeActions(resolved.actions);
  const [voted, setVoted] = useState<'like' | 'dislike' | null>(null);
  const [copied, setCopied] = useState(false);

  function fire(action: FeedbackAction) {
    if (action === 'copy' && message) {
      copyMessageText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else if (action === 'like' || action === 'dislike') {
      setVoted((prev) => (prev === action ? null : action));
    }
    void props.events.onAction?.({ action, message });
  }

  return (
    <div
      className={cn('nop-ai-feedback flex items-center gap-1 text-muted-foreground', props.meta.className)}
      data-slot="ai-feedback"
      data-testid={props.meta.testid || undefined}
    >
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          variant="ghost"
          size="sm"
          data-slot={`ai-feedback-${action}`}
          data-active={
            (action === 'like' && voted === 'like') ||
            (action === 'dislike' && voted === 'dislike')
              ? ''
              : undefined
          }
          aria-label={labelFor(action)}
          onClick={() => fire(action)}
        >
          {labelVisible(action, { copied })}
        </Button>
      ))}
    </div>
  );
}

function normalizeActions(value: unknown): FeedbackAction[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_ACTIONS;
  const known: FeedbackAction[] = ['copy', 'refresh', 'like', 'dislike', 'sources'];
  return value.filter((x): x is FeedbackAction => typeof x === 'string' && known.includes(x as FeedbackAction));
}

function labelFor(action: FeedbackAction): string {
  switch (action) {
    case 'copy':
      return t('flux.ai.copy');
    case 'refresh':
      return t('flux.ai.retry');
    case 'like':
      return '👍';
    case 'dislike':
      return '👎';
    case 'sources':
      return 'Sources';
  }
}

function labelVisible(action: FeedbackAction, state: { copied: boolean }): string {
  if (action === 'copy') return state.copied ? t('flux.ai.copied') : t('flux.ai.copy');
  if (action === 'refresh') return t('flux.ai.retry');
  return labelFor(action);
}

function copyMessageText(message: ChatMessage): void {
  const text = extractMessageText(message);
  if (text.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
}

function extractMessageText(message: ChatMessage): string {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((p: unknown) =>
        typeof p === 'object' && p !== null && 'text' in p
          ? String((p as { text: unknown }).text)
          : '',
      )
      .join('');
  }
  return '';
}
