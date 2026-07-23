import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { AiSuggestionItem, AiSuggestionsSchema } from '../schemas.js';

function normalizeItems(items: unknown): AiSuggestionItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is AiSuggestionItem => typeof x === 'object' && x !== null && 'text' in x)
    .map((x) => ({ ...x }));
}

function SuggestionPill({
  item,
  index,
  onSelect,
}: {
  item: AiSuggestionItem;
  index: number;
  onSelect?: (item: AiSuggestionItem, index: number) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      data-slot="ai-suggestions-item"
      data-index={index}
      className="nop-ai-suggestions-item inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs text-card-foreground transition-colors hover:bg-accent whitespace-nowrap"
      onClick={() => onSelect?.(item, index)}
    >
      {typeof item.icon === 'string' && item.icon.length > 0 ? (
        <span aria-hidden="true">{item.icon}</span>
      ) : null}
      <span data-slot="ai-suggestions-item-text">{item.text}</span>
    </button>
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
  onSelect?: (item: AiSuggestionItem, index: number) => void;
}): React.ReactElement {
  const items = props.items ?? [];
  const overflowMode = props.overflowMode ?? 'scroll';
  const maxVisible = typeof props.maxVisible === 'number' && props.maxVisible > 0 ? props.maxVisible : 3;

  if (items.length === 0) {
    return (
      <div
        className={cn('nop-ai-suggestions', props.className)}
        data-slot="ai-suggestions"
        data-overflow={overflowMode}
        data-empty=""
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
      data-testid={props.testid || undefined}
      role="list"
      aria-label={t('flux.ai.suggestionsTitle')}
    >
      {renderPills.map((item, index) => (
        <SuggestionPill key={item.text} item={item} index={index} onSelect={props.onSelect} />
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
              >
                +{overflow.length}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-fit p-1">
            <div data-slot="ai-suggestions-overflow-list" className="flex flex-col gap-1">
              {overflow.map((item, i) => (
                <button
                  key={item.text}
                  type="button"
                  data-slot="ai-suggestions-item"
                  data-index={maxVisible + i}
                  className="rounded-md px-3 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => props.onSelect?.(item, maxVisible + i)}
                >
                  {typeof item.icon === 'string' && item.icon.length > 0 ? (
                    <span aria-hidden="true" className="mr-1">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.text}
                </button>
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
      onSelect={
        props.events.onSelect
          ? (item, index) => props.events.onSelect?.({ item, index })
          : undefined
      }
    />
  );
}
