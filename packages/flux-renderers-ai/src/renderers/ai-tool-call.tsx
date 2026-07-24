import { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Badge, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Check, Loader2, TriangleAlert, Ban, ChevronDown, ChevronRight } from 'lucide-react';
import { jsonrepair } from 'jsonrepair';
import type { ChatToolCall, ChatToolCallUIState } from '../engine/types.js';
import type { BubbleToolRendererProps } from './ai-bubble/types.js';
import type { AiToolCallSchema } from '../schemas.js';

export type ToolCallStatus = NonNullable<ChatToolCallUIState['status']>;
export type ToolCallApproval = NonNullable<ChatToolCallUIState['approval']>;

/**
 * ai-tool-call (Widget, P2): renders a single LLM tool invocation card.
 *
 * - Status icon + A-12 status color (running=muted, success=green, failed=red,
 *   cancelled=amber), Tailwind only — zero CSS asset.
 * - Expand / collapse the `function.arguments` JSON.
 * - `jsonrepair` fixes truncated streamed JSON (Failure Path
 *   `tool-args-truncated`); a regex highlighter colours keys / strings /
 *   numbers / booleans / null.
 * - P3 HITL (A-14): when `state.approval === 'pending'` the card footer shows
 *   approve/reject buttons + a focus trap (Tab cycles within the actions, Esc
 *   restores prior focus). Clicking dispatches `onApproval`; the engine does
 *   NOT mutate `approval` (host action handler owns the workflow). A decided
 *   state (`approved`/`rejected`) renders a status badge instead.
 * - Root `aria-label` (roadmap P1 a11y, deferred from A2).
 *
 * Marker `nop-ai-tool-call`; `data-tool-status` exposes the status to host CSS;
 * `data-requires-approval` is presence-only when approval is pending.
 */
export function AiToolCallView(props: {
  toolCall: ChatToolCall;
  state?: ChatToolCallUIState;
  defaultOpen?: boolean;
  className?: string;
  onToggle?: (open: boolean) => void;
  /** P3 HITL: invoked with 'approve' | 'reject'. No-op when undefined. */
  onApproval?: (action: 'approve' | 'reject') => void;
}): React.ReactElement | null {
  const { toolCall, state } = props;
  const status: ToolCallStatus = state?.status ?? 'running';
  const approval = state?.approval;
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const open = state?.open ?? internalOpen;

  // Focus trap for the pending-approval footer (a11y §7 P3).
  const approvalFooterRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    const pending = approval === 'pending';
    if (pending && !wasPendingRef.current) {
      // Entering pending: record prior focus and move focus to the approve action.
      wasPendingRef.current = true;
      const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      if (active && approvalFooterRef.current && !approvalFooterRef.current.contains(active)) {
        prevFocusRef.current = active;
      }
      const approveBtn = approvalFooterRef.current?.querySelector(
        '[data-slot="ai-tool-call-approve"]',
      );
      if (approveBtn instanceof HTMLElement) approveBtn.focus();
    } else if (!pending && wasPendingRef.current) {
      // AI-11: leaving the pending state (resolved) — restore focus to the
      // element that held it before the trap engaged, and clear the ref.
      wasPendingRef.current = false;
      prevFocusRef.current?.focus();
      prevFocusRef.current = null;
    }
  }, [approval]);

  // AI-11: if the component unmounts while still pending, restore focus so
  // keyboard / screen-reader users do not lose their place (Failure Path
  // `focus-restored-after-approval`).
  useEffect(() => {
    return () => {
      if (wasPendingRef.current) {
        prevFocusRef.current?.focus();
        prevFocusRef.current = null;
        wasPendingRef.current = false;
      }
    };
  }, []);

  function handleToggle() {
    const next = !open;
    setInternalOpen(next);
    props.onToggle?.(next);
  }

  function handleApprovalKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (approval !== 'pending') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      prevFocusRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      const footer = approvalFooterRef.current;
      if (!footer) return;
      const actions = Array.from(
        footer.querySelectorAll('button[data-slot="ai-tool-call-approve"], button[data-slot="ai-tool-call-reject"]'),
      ) as HTMLElement[];
      if (actions.length === 0) return;
      const current = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      const idx = current ? actions.indexOf(current) : -1;
      event.preventDefault();
      if (event.shiftKey) {
        const target = idx <= 0 ? actions[actions.length - 1] : actions[idx - 1];
        target.focus();
      } else {
        const target = idx === -1 || idx >= actions.length - 1 ? actions[0] : actions[idx + 1];
        target.focus();
      }
    }
  }

  return (
    <div
      className={cn('nop-ai-tool-call', statusColorClass(status), props.className)}
      data-slot="ai-tool-call"
      data-tool-status={status}
      data-open={open ? '' : undefined}
      data-requires-approval={approval === 'pending' ? '' : undefined}
      data-approval={approval ?? undefined}
      aria-label={t('flux.ai.toolCall', { name: toolCall.function.name })}
      role="group"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          data-slot="ai-tool-call-toggle"
          aria-label={open ? t('flux.ai.collapse') : t('flux.ai.expand')}
          aria-expanded={open}
          onClick={handleToggle}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
        <StatusIcon status={status} />
        <span className="font-mono text-xs font-medium">{toolCall.function.name}</span>
      </div>
      {open ? (
        <pre
          data-slot="ai-tool-call-args"
          className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-xs"
        >
          <code dangerouslySetInnerHTML={{ __html: highlightJson(toolCall.function.arguments) }} />
        </pre>
      ) : null}
      {approval ? (
        <ApprovalFooter
          approval={approval}
          footerRef={approvalFooterRef}
          onKeyDown={handleApprovalKeyDown}
          onApproval={props.onApproval}
          toolCallId={toolCall.id}
        />
      ) : null}
    </div>
  );
}

function ApprovalFooter({
  approval,
  footerRef,
  onKeyDown,
  onApproval,
  toolCallId,
}: {
  approval: ToolCallApproval;
  footerRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onApproval?: (action: 'approve' | 'reject') => void;
  toolCallId: string;
}): React.ReactElement {
  if (approval === 'pending') {
    return (
      <div
        ref={footerRef}
        data-slot="ai-tool-call-approval"
        role="group"
        aria-label={t('flux.ai.approvalActions')}
        className="mt-2 flex items-center justify-end gap-2 border-t pt-2"
      >
        <Button
          type="button"
          size="sm"
          variant="default"
          className="bg-success hover:bg-success/90 text-white"
          data-slot="ai-tool-call-approve"
          data-tool-call-id={toolCallId}
          aria-label={t('flux.ai.approve')}
          onClick={() => onApproval?.('approve')}
          onKeyDown={onKeyDown}
        >
          <Check className="h-3.5 w-3.5" />
          {t('flux.ai.approve')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="ai-tool-call-reject"
          data-tool-call-id={toolCallId}
          aria-label={t('flux.ai.reject')}
          onClick={() => onApproval?.('reject')}
          onKeyDown={onKeyDown}
        >
          <Ban className="h-3.5 w-3.5" />
          {t('flux.ai.reject')}
        </Button>
      </div>
    );
  }
  // decided state — show a badge (A-12 palette: approved=green, rejected=red).
  const approved = approval === 'approved';
  return (
    <div data-slot="ai-tool-call-approval" className="mt-2 flex items-center justify-end border-t pt-2">
      <Badge
        variant="outline"
        className={cn(
          'gap-1',
          approved ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive',
        )}
        data-approval-decision={approval}
      >
        {approved ? <Check className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
        {approved ? t('flux.ai.approved') : t('flux.ai.rejected')}
      </Badge>
    </div>
  );
}

/** Registered renderer: schema-driven entry. */
export function AiToolCallRenderer(props: RendererComponentProps<AiToolCallSchema>): RendererRenderOutput {
  const resolved = props.props;
  const toolCall = resolved.toolCall as ChatToolCall | undefined;
  if (!toolCall) {
    return (
      <div
        className={cn('nop-ai-tool-call', props.meta.className)}
        data-slot="ai-tool-call"
        data-testid={props.meta.testid || undefined}
      />
    );
  }
  return (
    <AiToolCallView
      toolCall={toolCall}
      state={resolved.state as ChatToolCallUIState | undefined}
      defaultOpen={resolved.defaultOpen}
      className={props.meta.className}
      onApproval={
        props.events?.onApproval
          ? (action) =>
              props.events.onApproval?.({
                type: 'ai:tool-call-approval',
                action,
                toolCall,
                toolCallId: toolCall.id,
              })
          : undefined
      }
    />
  );
}

/**
 * Generic fallback used by the bubble `tools` content renderer when no host
 * tool-card registration matches (A-6 `*` fallback). Implements the
 * `BubbleToolRendererProps` contract.
 */
export function FallbackToolCallCard(props: BubbleToolRendererProps): React.ReactElement {
  return (
    <AiToolCallView
      toolCall={props.toolCall}
      state={props.state}
      defaultOpen={props.state?.open}
    />
  );
}

function StatusIcon({ status }: { status: ToolCallStatus }): React.ReactElement {
  if (status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />;
  }
  if (status === 'success') {
    return <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <TriangleAlert className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />;
  }
  // cancelled
  return <Ban className="h-3.5 w-3.5 text-warning" aria-hidden="true" />;
}

/** A-12 status → Tailwind border/accent class (zero CSS asset). */
function statusColorClass(status: ToolCallStatus): string {
  switch (status) {
    case 'success':
      return 'border-success/30';
    case 'failed':
      return 'border-destructive/40';
    case 'cancelled':
      return 'border-warning/30';
    case 'running':
    default:
      return 'border-border';
  }
}

/**
 * Repair truncated streamed JSON (e.g. incomplete `function.arguments`) and
 * syntax-highlight it via a token regex. Falls back to the raw text when
 * `jsonrepair` cannot parse (Failure Path `tool-args-truncated`).
 */
export function highlightJson(raw: string): string {
  if (!raw) return '';
  let repaired: string;
  try {
    repaired = jsonrepair(raw);
  } catch {
    return escapeHtml(raw);
  }
  const pretty = tryPretty(repaired);
  return escapeHtml(pretty).replace(
    /(&quot;(?:\\.|[^&]|(?:&quot;))*?&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, _key, colon, word) => {
      if (word) {
        return `<span class="tok-bool">${match}</span>`;
      }
      if (colon) {
        return `<span class="tok-key">${match}</span>`;
      }
      return `<span class="tok-str">${match}</span>`;
    },
  );
}

function tryPretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
