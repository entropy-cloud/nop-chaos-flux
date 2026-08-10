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
  // P2-5 (2026-08-10 multi-audit): node-level `meta.disabled` disables the
  // action bar (cross-package contract).
  const disabled = props.meta.disabled === true;
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
          disabled={disabled}
          onClick={() => fire(action)}
        >
          {labelVisible(action, { copied })}
        </Button>
      ))}
    </div>
  );
}

/**
 * Resolve the action set. open-audit P2-7 (2026-08-10 multi-audit): an
 * EXPLICIT `actions: []` now renders an empty action area — the host can
 * express "no action bar" (e.g. read-only transcripts). Only an ABSENT value
 * (undefined/null) falls back to the default set; a non-array or an
 * explicitly-provided array is filtered to the known action names (an
 * all-unknown list filters to an empty bar — explicit host intent wins over
 * the silent default).
 */
function normalizeActions(value: unknown): FeedbackAction[] {
  if (value === undefined || value === null) return DEFAULT_ACTIONS;
  if (!Array.isArray(value)) return DEFAULT_ACTIONS;
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
  // R2-F2 family (2026-08-11, P3 same-root member): a MISSING clipboard API
  // (non-https / sandboxed) is an explicit failure — resolving here flipped
  // the button to a false "Copied" (`fire('copy')` flips on resolve).
  return Promise.reject(new Error('navigator.clipboard is not available'));
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
