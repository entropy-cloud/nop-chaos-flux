import { useState, useRef, useEffect } from 'react';
import type {
  FluxActionEvent,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage } from '../engine/types.js';
import type { AiFeedbackSchema } from '../schemas.js';

type FeedbackAction = 'copy' | 'refresh' | 'like' | 'dislike' | 'sources';

const DEFAULT_ACTIONS: FeedbackAction[] = ['copy', 'refresh'];

/**
 * C8.2 P1-1 (CX-10 / bug-83 family convention): the second dispatch arg
 * carries `{ event, evaluationBindings, scope }` so action-args templates can
 * read `${action}` / `${message.id}` (ai-conversations.tsx:29-33 precedent).
 */
function dispatchCtx(payload: Record<string, unknown>, nodeScope: ScopeRef | undefined) {
  return {
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: nodeScope,
  };
}

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
  // 2-20: the copied-reset timer must be cleared on unmount (no setState on
  // an unmounted component).
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) {
        clearTimeout(copiedResetTimerRef.current);
        copiedResetTimerRef.current = null;
      }
    };
  }, []);

  function fire(action: FeedbackAction) {
    if (action === 'copy' && message) {
      // clipboard-write-failed: only flip to "Copied" after the write resolves.
      // A rejected write (permission lost / no focus) leaves the button as-is
      // so the user does not see a false success.
      void copyMessageText(message)
        .then(() => {
          setCopied(true);
          if (copiedResetTimerRef.current) {
            clearTimeout(copiedResetTimerRef.current);
          }
          copiedResetTimerRef.current = setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          // swallow: keep the button in its pre-copy state
        });
    } else if (action === 'like' || action === 'dislike') {
      setVoted((prev) => (prev === action ? null : action));
    }
    const payload = { type: 'ai:feedback-action', action, message };
    void props.events.onAction?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
  }

  return (
    <div
      className={cn('nop-ai-feedback flex items-center gap-1 text-muted-foreground', props.meta.className)}
      data-slot="ai-feedback"
      data-cid={props.meta.cid || undefined}
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
      return t('flux.ai.like');
    case 'dislike':
      return t('flux.ai.dislike');
    case 'sources':
      return t('flux.ai.sources');
  }
}

function labelVisible(action: FeedbackAction, state: { copied: boolean }): string {
  if (action === 'copy') return state.copied ? t('flux.ai.copied') : t('flux.ai.copy');
  if (action === 'refresh') return t('flux.ai.retry');
  return labelFor(action);
}

function copyMessageText(message: ChatMessage): Promise<void> {
  const text = extractMessageText(message);
  if (text.length === 0) return Promise.resolve();
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      return Promise.resolve(navigator.clipboard.writeText(text));
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return Promise.resolve();
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
