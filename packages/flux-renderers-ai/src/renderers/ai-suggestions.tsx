import type {
  FluxActionEvent,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { Languages, Lightbulb, Pencil, Plus, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { AiSuggestionItem, AiSuggestionsSchema } from '../schemas.js';

/**
 * C8.3 P1-1 (CX-10 / bug-83 family convention): the second dispatch arg
 * carries `{ event, evaluationBindings, scope }` so action-args templates can
 * read `${item}` / `${index}` (ai-feedback.tsx:22-28 precedent).
 */
function dispatchCtx(payload: Record<string, unknown>, nodeScope: ScopeRef | undefined) {
  return {
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: nodeScope,
  };
}

/**
 * D4 / G9 (plan 2026-08-24-2317-1, product-spec.md §3.3): preset string →
 * lucide component map (same dispatch pattern as the D3 welcome icon). An
 * `icon` value that hits this table renders the lucide icon; any other
 * non-empty string falls back to the literal character rendering (backward
 * compatible — emoji / custom glyphs keep working).
 */
const SUGGESTION_ICON_PRESETS: Record<string, ComponentType> = {
  pencil: Pencil,
  languages: Languages,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  plus: Plus,
};

function SuggestionIcon({ icon }: { icon?: string }): React.ReactElement | null {
  if (typeof icon !== 'string' || icon.length === 0) return null;
  const Preset = SUGGESTION_ICON_PRESETS[icon];
  if (Preset) {
    return (
      <span data-slot="ai-suggestions-item-icon" aria-hidden="true" className="inline-flex">
        <Preset aria-hidden="true" />
      </span>
    );
  }
  return (
    <span data-slot="ai-suggestions-item-icon" aria-hidden="true">
      {icon}
    </span>
  );
}

function normalizeItems(items: unknown): AiSuggestionItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is AiSuggestionItem => typeof x === 'object' && x !== null && 'text' in x)
    .map((x) => ({ ...x }));
}

function SuggestionPill({
  item,
  index,
  disabled,
  onSelect,
}: {
  item: AiSuggestionItem;
  index: number;
  disabled?: boolean;
  onSelect?: (item: AiSuggestionItem, index: number) => void;
}): React.ReactElement {
  return (
    <Button
      variant="outline"
      size="xs"
      data-slot="ai-suggestions-item"
      data-index={index}
      className="rounded-full whitespace-nowrap"
      disabled={disabled}
      onClick={() => onSelect?.(item, index)}
    >
      <SuggestionIcon icon={item.icon} />
      <span data-slot="ai-suggestions-item-text">{item.text}</span>
    </Button>
  );
}

/**
 * ai-suggestions (Widget, P4): in-conversation suggestion pills. Distinct from
 * P1 `ai-prompts` (static recommendation cards) — this widget targets compact
 * inline suggestions with overflow handling.
 *
 * Marker `nop-ai-suggestions`; `data-slot="ai-suggestions"`. Overflow modes:
 * `expand` (show all), `scroll` (horizontal scroll, default), `popover`
 * (render `maxVisible` pills + a "+N" Popover). `onSelect` → `{ item, index }`.
 */
export function AiSuggestionsView(props: {
  items?: AiSuggestionItem[];
  overflowMode?: 'expand' | 'scroll' | 'popover';
  maxVisible?: number;
  className?: string;
  testid?: string;
  cid?: number;
  /** P2-5 (2026-08-10 multi-audit): node-level `meta.disabled` control. */
  disabled?: boolean;
  onSelect?: (item: AiSuggestionItem, index: number) => void;
}): React.ReactElement {
  const items = props.items ?? [];
  const overflowMode = props.overflowMode ?? 'scroll';
  const maxVisible = typeof props.maxVisible === 'number' && props.maxVisible > 0 ? props.maxVisible : 3;
  const cid = props.cid;
  const disabled = props.disabled === true;

  if (items.length === 0) {
    return (
      <div
        className={cn('nop-ai-suggestions', props.className)}
        data-slot="ai-suggestions"
        data-overflow={overflowMode}
        data-empty=""
        data-cid={cid || undefined}
        data-testid={props.testid || undefined}
      />
    );
  }

  const containerClass =
    overflowMode === 'scroll'
      ? 'flex flex-row gap-2 overflow-x-auto'
      : overflowMode === 'expand'
        ? 'flex flex-row flex-wrap gap-2'
        : 'flex flex-row flex-wrap gap-2';

  const renderPills =
    overflowMode === 'popover' && items.length > maxVisible ? items.slice(0, maxVisible) : items;
  const overflow = overflowMode === 'popover' && items.length > maxVisible ? items.slice(maxVisible) : [];

  return (
    <div
      className={cn('nop-ai-suggestions', containerClass, props.className)}
      data-slot="ai-suggestions"
      data-overflow={overflowMode}
      data-cid={cid || undefined}
      data-testid={props.testid || undefined}
      role="list"
      aria-label={t('flux.ai.suggestionsTitle')}
    >
      {renderPills.map((item, index) => (
        // P2 (N-6): AiSuggestionItem has no stable id; pure `text` collides
        // for duplicate copy. Append the index so each pill stays unique.
        // eslint-disable-next-line react/no-array-index-key
        <SuggestionPill key={`${item.text}#${index}`} item={item} index={index} disabled={disabled} onSelect={props.onSelect} />
      ))}
      {overflow.length > 0 ? (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-slot="ai-suggestions-overflow"
                className="h-6 rounded-full px-2 text-xs"
                disabled={disabled}
              >
                +{overflow.length}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-fit p-1">
            <div data-slot="ai-suggestions-overflow-list" className="flex flex-col gap-1">
              {overflow.map((item, i) => (
                <Button
                  key={`${item.text}#${maxVisible + i}`}
                  variant="ghost"
                  size="xs"
                  data-slot="ai-suggestions-item"
                  data-index={maxVisible + i}
                  className="justify-start text-left"
                  disabled={disabled}
                  onClick={() => props.onSelect?.(item, maxVisible + i)}
                >
                  <SuggestionIcon icon={item.icon} />
                  {item.text}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

/** Registered renderer: schema-driven entry. */
export function AiSuggestionsRenderer(props: RendererComponentProps<AiSuggestionsSchema>): RendererRenderOutput {
  const resolved = props.props;
  return (
    <AiSuggestionsView
      items={normalizeItems(resolved.items)}
      overflowMode={resolved.overflowMode}
      maxVisible={resolved.maxVisible}
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      disabled={props.meta.disabled === true}
      onSelect={
        props.events.onSelect
          ? (item, index) => {
              const payload = { type: 'ai:suggestion-select', item, index };
              void props.events.onSelect?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
            }
          : undefined
      }
    />
  );
}
