import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage } from '../engine/types.js';
import type { AiTokenUsage, AiTokenUsageSchema } from '../schemas.js';

/**
 * Resolve usage: explicit `usage` prop > `message.metadata.usage`.
 */
export function resolveUsage(
  message: ChatMessage | undefined,
  explicitUsage?: unknown,
): AiTokenUsage | null {
  const fromExplicit = normalizeUsage(explicitUsage);
  if (fromExplicit) return fromExplicit;
  if (message?.metadata?.usage) {
    const fromMeta = normalizeUsage(message.metadata.usage);
    if (fromMeta) return fromMeta;
  }
  return null;
}

function normalizeUsage(value: unknown): AiTokenUsage | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const hasNum = (k: string): number | undefined =>
    typeof obj[k] === 'number' && Number.isFinite(obj[k] as number)
      ? (obj[k] as number)
      : undefined;
  const usage: AiTokenUsage = {
    prompt_tokens: hasNum('prompt_tokens'),
    completion_tokens: hasNum('completion_tokens'),
    total_tokens: hasNum('total_tokens'),
    cost: typeof obj.cost === 'number' && Number.isFinite(obj.cost) ? obj.cost : undefined,
  };
  const any =
    usage.prompt_tokens !== undefined ||
    usage.completion_tokens !== undefined ||
    usage.total_tokens !== undefined;
  return any ? usage : null;
}

function fmt(n: number | undefined): string {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

/**
 * ai-token-usage (Widget, P4, A-17): renders token usage (prompt /
 * completion / total) plus an optional context-limit ring, read from
 * `message.metadata.usage` (connector-populated). Cost is shown when present.
 *
 * Marker `nop-ai-token-usage`; `data-slot="ai-token-usage"`. Failure Path
 * `token-no-usage`: when no usage is available the widget renders a muted
 * placeholder (or returns nothing when `hideWhenMissing` via className) — it
 * never crashes.
 */
export function AiTokenUsageView(props: {
  message?: ChatMessage;
  usage?: AiTokenUsage;
  contextLimit?: number;
  showCost?: boolean;
  className?: string;
  testid?: string;
  cid?: number;
  onClick?: () => void;
}): React.ReactElement | null {
  const { message, contextLimit, showCost = true, className, testid, cid, onClick } = props;
  const usage = resolveUsage(message, props.usage);
  if (!usage) {
    // token-no-usage: muted placeholder.
    return (
      <span
        className={cn('nop-ai-token-usage text-xs text-muted-foreground', className)}
        data-slot="ai-token-usage"
        data-empty=""
        data-cid={cid || undefined}
        data-testid={testid || undefined}
      >
        {t('flux.ai.tokenNoUsage')}
      </span>
    );
  }

  const total = usage.total_tokens ?? ((usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0));
  const limit = typeof contextLimit === 'number' && contextLimit > 0 ? contextLimit : undefined;
  const ratio = limit ? Math.min(1, Math.max(0, total / limit)) : undefined;

  const inner = (
    <>
      {ratio !== undefined ? <UsageRing ratio={ratio} /> : null}
      <span data-slot="ai-token-usage-text" className="inline-flex flex-col leading-tight">
        <span>
          <span data-slot="ai-token-usage-total">{fmt(total)}</span>
          {limit ? <span className="text-muted-foreground/70"> / {fmt(limit)}</span> : null}
        </span>
        <span className="text-[10px] text-muted-foreground/80">
          <span data-slot="ai-token-usage-prompt">↑{fmt(usage.prompt_tokens)}</span>
          {' · '}
          <span data-slot="ai-token-usage-completion">↓{fmt(usage.completion_tokens)}</span>
          {showCost && typeof usage.cost === 'number' ? (
            <>
              {' · '}
              <span data-slot="ai-token-usage-cost">${usage.cost.toFixed(4)}</span>
            </>
          ) : null}
        </span>
      </span>
    </>
  );

  const rootClass = cn(
    'nop-ai-token-usage inline-flex items-center gap-2 text-xs text-muted-foreground',
    className,
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        className={rootClass}
        data-slot="ai-token-usage"
        data-cid={cid || undefined}
        data-testid={testid || undefined}
        onClick={onClick}
      >
        {inner}
      </Button>
    );
  }

  return (
    <div
      className={rootClass}
      data-slot="ai-token-usage"
      data-cid={cid || undefined}
      data-testid={testid || undefined}
      aria-hidden
    >
      {inner}
    </div>
  );
}

/** SVG ring (zero deps). `ratio` is clamped 0..1 by the caller. */
function UsageRing({ ratio }: { ratio: number }): React.ReactElement {
  const size = 28;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * ratio;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      data-slot="ai-token-usage-ring"
      aria-hidden="true"
      className="text-primary"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted-foreground/30"
        strokeOpacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** Registered renderer: schema-driven entry. */
export function AiTokenUsageRenderer(props: RendererComponentProps<AiTokenUsageSchema>): RendererRenderOutput {
  const resolved = props.props;
  return (
    <AiTokenUsageView
      message={resolved.message as ChatMessage | undefined}
      usage={resolved.usage as AiTokenUsage | undefined}
      contextLimit={typeof resolved.contextLimit === 'number' ? resolved.contextLimit : undefined}
      showCost={resolved.showCost !== false}
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      onClick={props.events.onClick ? () => void props.events.onClick?.() : undefined}
    />
  );
}
