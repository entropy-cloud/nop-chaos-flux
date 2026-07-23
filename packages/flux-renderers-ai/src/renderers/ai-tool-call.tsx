import { useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Check, Loader2, TriangleAlert, Ban, ChevronDown, ChevronRight } from 'lucide-react';
import { jsonrepair } from 'jsonrepair';
import type { ChatToolCall, ChatToolCallUIState } from '../engine/types.js';
import type { BubbleToolRendererProps } from './ai-bubble/types.js';
import type { AiToolCallSchema } from '../schemas.js';

export type ToolCallStatus = NonNullable<ChatToolCallUIState['status']>;

/**
 * ai-tool-call (Widget, P2): renders a single LLM tool invocation card.
 *
 * - Status icon + A-12 status color (running=muted, success=green, failed=red,
 *   cancelled=amber), Tailwind only — zero CSS asset.
 * - Expand / collapse the `function.arguments` JSON.
 * - `jsonrepair` fixes truncated streamed JSON (Failure Path
 *   `tool-args-truncated`); a regex highlighter colours keys / strings /
 *   numbers / booleans / null.
 * - Root `aria-label` (roadmap P1 a11y, deferred from A2).
 *
 * Marker `nop-ai-tool-call`; `data-tool-status` exposes the status to host CSS.
 */
export function AiToolCallView(props: {
  toolCall: ChatToolCall;
  state?: ChatToolCallUIState;
  defaultOpen?: boolean;
  className?: string;
  onToggle?: (open: boolean) => void;
}): React.ReactElement | null {
  const { toolCall, state } = props;
  const status: ToolCallStatus = state?.status ?? 'running';
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const open = state?.open ?? internalOpen;

  function handleToggle() {
    const next = !open;
    setInternalOpen(next);
    props.onToggle?.(next);
  }

  return (
    <div
      className={cn('nop-ai-tool-call', statusColorClass(status), props.className)}
      data-slot="ai-tool-call"
      data-tool-status={status}
      data-open={open ? '' : undefined}
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
    return <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <TriangleAlert className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />;
  }
  // cancelled
  return <Ban className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" aria-hidden="true" />;
}

/** A-12 status → Tailwind border/accent class (zero CSS asset). */
function statusColorClass(status: ToolCallStatus): string {
  switch (status) {
    case 'success':
      return 'border-green-500/30';
    case 'failed':
      return 'border-destructive/40';
    case 'cancelled':
      return 'border-amber-500/30';
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
        return `<span class="text-purple-600 dark:text-purple-400">${match}</span>`;
      }
      if (colon) {
        return `<span class="text-blue-600 dark:text-blue-400">${match}</span>`;
      }
      return `<span class="text-green-600 dark:text-green-400">${match}</span>`;
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
