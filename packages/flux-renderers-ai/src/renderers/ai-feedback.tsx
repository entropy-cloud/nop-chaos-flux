import { useState, useRef, useEffect } from 'react';
import type {
  FluxActionEvent,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { getOptionRowStateTokens } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { ChatMessage } from '../engine/types.js';
import type { AiFeedbackSchema } from '../schemas.js';

type FeedbackAction = 'copy' | 'refresh' | 'like' | 'dislike' | 'sources';

const DEFAULT_ACTIONS: FeedbackAction[] = ['copy', 'refresh'];

interface FeedbackSourceEntry {
  label: string;
  url?: string;
}

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
 * D4 (plan 2026-08-24-2317-1): normalize `message.metadata.sources` entries
 * for the sources Popover — tolerant of strings and `{ label | title, url }`
 * objects. Unknown shapes are dropped (not rendered).
 */
function normalizeFeedbackSources(raw: unknown): FeedbackSourceEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: FeedbackSourceEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      if (item.length > 0) entries.push({ label: item });
      continue;
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const label =
        typeof obj.label === 'string' && obj.label.length > 0
          ? obj.label
          : typeof obj.title === 'string' && obj.title.length > 0
            ? obj.title
            : typeof obj.url === 'string'
              ? obj.url
              : undefined;
      const url = typeof obj.url === 'string' && obj.url.length > 0 ? obj.url : undefined;
      if (label !== undefined) entries.push({ label, url });
    }
  }
  return entries;
}

/**
 * D4: write the vote into `message.metadata.feedback` (un-vote clears the
 * key). Mutates the resolved message object in place — the host's data
 * source (page data / engine message) observes the write.
 */
function writeFeedbackMetadata(message: ChatMessage | undefined, value: 'like' | 'dislike' | null) {
  if (!message) return;
  if (!message.metadata) message.metadata = {};
  if (value === null) delete message.metadata.feedback;
  else message.metadata.feedback = value;
}

/**
 * ai-feedback (Widget, P1): message footer action bar (copy / refresh / like /
 * dislike / sources). Marker `nop-ai-feedback`. Reads the message from
 * resolved props; all actions fire `onAction` with `{ action, message }`
 * (design.md §5.1, renderers.md §8).
 *
 * D4 (plan 2026-08-24-2317-1) real side effects: like/dislike write
 * `message.metadata.feedback` (+ `aria-pressed` mirror alongside the
 * existing `data-active`); refresh regenerates the latest assistant message
 * via the ai-chat context engine (busy-safe — Decision D-refresh: a single
 * onAction ActionSchema cannot dispatch per-action, so the renderer owns the
 * default and the schema keeps the notification-only onAction); sources
 * opens a Popover listing `message.metadata.sources` (empty-state hint when
 * absent).
 */
export function AiFeedbackRenderer(props: RendererComponentProps<AiFeedbackSchema>): RendererRenderOutput {
  const resolved = props.props;
  const message = resolved.message as ChatMessage | undefined;
  const actions = normalizeActions(resolved.actions);
  // P2-5 (2026-08-10 multi-audit): node-level `meta.disabled` disables the
  // action bar (cross-package contract).
  const disabled = props.meta.disabled === true;
  const ctx = useAiChatContext();
  // P2-3 (2026-08-24 open-audit, plan 2026-08-25-0440-1): seed the local vote
  // mirror from the persisted `message.metadata.feedback` on mount (read
  // once) so virtual-list recycling / branch-switch remounts keep the visual
  // state in sync with the D4 metadata write. Same-mount message reference
  // switches do NOT re-seed (documented limitation, renderers.md §8).
  const [voted, setVoted] = useState<'like' | 'dislike' | null>(() =>
    (message?.metadata as { feedback?: 'like' | 'dislike' } | undefined)?.feedback ?? null,
  );
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
      const next = voted === action ? null : action;
      setVoted(next);
      writeFeedbackMetadata(message, next);
    } else if (action === 'refresh') {
      // D4 / Decision D-refresh: regenerate the latest assistant message
      // through the chat engine. Busy → silent no-op (Failure Path
      // `busy-regenerate`: the renderer path does not surface an error).
      // Standalone (no ai-chat context) → notification-only, unchanged.
      if (ctx && !ctx.isProcessing) {
        void ctx.engine.regenerate();
      }
    }
    const payload = { type: 'ai:feedback-action', action, message };
    void props.events.onAction?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
  }

  const sources = message?.metadata?.sources;

  function renderActionButton(action: FeedbackAction): React.ReactElement {
    const isVote = action === 'like' || action === 'dislike';
    const common = {
      type: 'button' as const,
      variant: 'ghost' as const,
      size: 'sm' as const,
      'data-slot': `ai-feedback-${action}`,
      'data-active':
        (action === 'like' && voted === 'like') || (action === 'dislike' && voted === 'dislike')
          ? ''
          : undefined,
      // D1 option-row standard state channel (族2 ai-feedback 投票态消解):
      // vote state is additionally exposed as `data-state="selected"` so hosts
      // consume one uniform selector; the legacy data-active marker is kept.
      'data-state': isVote
        ? getOptionRowStateTokens({ selected: voted === action })
        : undefined,
      'aria-pressed': isVote ? voted === action : undefined,
      'aria-label': labelFor(action),
      disabled,
      onClick: () => fire(action),
    };
    if (action === 'sources') {
      return (
        <Popover key={action}>
          <PopoverTrigger
            render={
              <Button {...common}>
                {labelVisible(action, { copied })}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-72">
            <div data-slot="ai-feedback-sources-list" className="flex flex-col gap-1">
              {normalizeFeedbackSources(sources).length > 0 ? (
                normalizeFeedbackSources(sources).map((source, index) => (
                  // P2 (N-6) sibling: source entries have no stable id; the
                  // appended index keeps duplicate labels unique as keys.
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={`${source.label}#${index}`} data-slot="ai-feedback-source-item" className="flex min-w-0 flex-col gap-0.5 rounded-sm px-1 py-0.5 text-xs">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate text-foreground underline-offset-2 hover:underline"
                      >
                        {source.label}
                      </a>
                    ) : (
                      <span className="truncate">{source.label}</span>
                    )}
                  </div>
                ))
              ) : (
                <div data-slot="ai-feedback-sources-empty" className="px-1 py-0.5 text-xs text-muted-foreground">
                  {t('flux.ai.citationNoSource')}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <Button key={action} {...common}>
        {labelVisible(action, { copied })}
      </Button>
    );
  }

  return (
    <div
      className={cn('nop-ai-feedback flex items-center gap-1 text-muted-foreground', props.meta.className)}
      data-slot="ai-feedback"
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
    >
      {actions.map((action) => renderActionButton(action))}
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
