import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ActionSchema,
  RendererComponentProps,
  RenderRegionHandle,
  SchemaValue,
} from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import type { InputSchema } from '../schemas.js';

const DEFAULT_SUGGEST_DEBOUNCE = 300;
const DEFAULT_SUGGEST_MIN_INPUT_LENGTH = 1;
const BLUR_CLOSE_DELAY = 150;

export interface SuggestionItem {
  [key: string]: SchemaValue;
  label: string;
  value: string | number | boolean;
}

function normalizeSuggestions(raw: unknown): SuggestionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry) => {
    if (typeof entry === 'string') {
      return { label: entry, value: entry };
    }
    if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const label = typeof obj.label === 'string' ? obj.label : String(obj.value ?? '');
      const value =
        typeof obj.value === 'string' || typeof obj.value === 'number' || typeof obj.value === 'boolean'
          ? obj.value
          : String(obj.value ?? obj.label ?? '');
      return { label, value } as SuggestionItem;
    }
    return { label: String(entry), value: String(entry) };
  });
}

export interface InputSuggestConfig {
  suggestSource?: string;
  suggestDebounce?: number;
  suggestTrigger?: 'input' | 'focus' | 'manual';
  suggestMinInputLength?: number;
  suggestEmpty?: string;
}

export interface InputSuggestApi {
  handleFocus(): void;
  handleBlur(): void;
  handleKeyDown(event: { key: string; preventDefault(): void }): void;
  wrap(element: ReactNode): ReactNode;
}

export function useInputSuggest(params: {
  config: InputSuggestConfig;
  regions: RendererComponentProps<InputSchema>['regions'];
  helpers: RendererComponentProps<InputSchema>['helpers'];
  interactive: boolean;
  inputValue: string;
  onChange: (value: string) => void;
}): InputSuggestApi {
  const { config, regions, helpers, interactive, inputValue, onChange } = params;
  const suggestSource = typeof config.suggestSource === 'string' ? config.suggestSource : undefined;
  const suggestDebounce =
    typeof config.suggestDebounce === 'number' ? config.suggestDebounce : DEFAULT_SUGGEST_DEBOUNCE;
  const suggestTrigger = config.suggestTrigger ?? 'input';
  const suggestMinInputLength =
    typeof config.suggestMinInputLength === 'number'
      ? config.suggestMinInputLength
      : DEFAULT_SUGGEST_MIN_INPUT_LENGTH;
  const suggestEmpty = typeof config.suggestEmpty === 'string' ? config.suggestEmpty : undefined;

  const enabled = Boolean(suggestSource);

  const rawSuggestions = useScopeSelector<unknown>((scopeData) => {
    if (!suggestSource) {
      return undefined;
    }
    if (!scopeData || typeof scopeData !== 'object') {
      return undefined;
    }
    return (scopeData as Record<string, unknown>)[suggestSource];
  });
  const suggestions = enabled ? normalizeSuggestions(rawSuggestions) : [];

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [attemptedFetch, setAttemptedFetch] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusCounterRef = useRef(0);

  useEffect(() => {
    const hasSuggestConfigButNoSource =
      !suggestSource && (config.suggestDebounce !== undefined || config.suggestTrigger !== undefined);
    if (hasSuggestConfigButNoSource) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          '[flux-input-suggest] suggestDebounce/suggestTrigger declared without suggestSource; suggestions disabled.',
        );
      }
    }
  }, [suggestSource, config.suggestDebounce, config.suggestTrigger]);

  useEffect(() => {
    if (!enabled || !interactive || suggestTrigger !== 'input') {
      return;
    }
    if (typeof inputValue !== 'string' || inputValue.length < suggestMinInputLength) {
      return;
    }
    const generation = focusCounterRef.current;
    const timer = setTimeout(() => {
      if (generation !== focusCounterRef.current) {
        return;
      }
      helpers
        .dispatch({ action: 'refreshSource', targetId: suggestSource } as ActionSchema)
        .then(() => setAttemptedFetch(true))
        .catch(() => undefined);
    }, suggestDebounce);
    return () => clearTimeout(timer);
  }, [
    inputValue,
    enabled,
    interactive,
    suggestTrigger,
    suggestMinInputLength,
    suggestDebounce,
    suggestSource,
    helpers,
  ]);

  useEffect(() => {
    if (!enabled || !interactive || suggestTrigger !== 'focus') {
      return;
    }
    if (typeof inputValue !== 'string' || inputValue.length < suggestMinInputLength) {
      return;
    }
    helpers
      .dispatch({ action: 'refreshSource', targetId: suggestSource } as ActionSchema)
      .then(() => setAttemptedFetch(true))
      .catch(() => undefined);
  }, [
    enabled,
    interactive,
    suggestTrigger,
    suggestSource,
    suggestMinInputLength,
    inputValue,
    helpers,
  ]);

  const effectiveHighlightIndex =
    !enabled || !open || suggestions.length === 0
      ? -1
      : highlightIndex >= suggestions.length
        ? 0
        : highlightIndex;

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const templateRegion = regions.suggestTemplate as
    | RenderRegionHandle<ReactNode>
    | undefined;
  const hasTemplate = Boolean(templateRegion?.templateNode);

  function renderSuggestionContent(suggestion: SuggestionItem, index: number): ReactNode {
    if (!hasTemplate || !templateRegion) {
      return suggestion.label;
    }
    try {
      const custom = templateRegion.render({
        bindings: { suggestion, index },
      }) as ReactNode;
      if (custom !== undefined && custom !== null && custom !== false) {
        return custom;
      }
      return suggestion.label;
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          '[flux-input-suggest] suggestTemplate region render failed; falling back to suggestion.label',
          error,
        );
      }
      return suggestion.label;
    }
  }

  function clearBlurTimer() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }

  function handleFocus() {
    if (!enabled) {
      return;
    }
    focusCounterRef.current += 1;
    clearBlurTimer();
    setOpen(true);
  }

  function handleBlur() {
    if (!enabled) {
      return;
    }
    clearBlurTimer();
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, BLUR_CLOSE_DELAY);
  }

  function close() {
    setOpen(false);
  }

  function selectSuggestion(suggestion: SuggestionItem) {
    onChange(String(suggestion.value));
    setHighlightIndex(-1);
    close();
  }

  function handleKeyDown(event: { key: string; preventDefault(): void }) {
    if (!enabled || !open) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      setHighlightIndex(
        ((effectiveHighlightIndex + 1) % suggestions.length),
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      setHighlightIndex(
        ((effectiveHighlightIndex - 1 + suggestions.length) % suggestions.length),
      );
      return;
    }
    if (event.key === 'Enter') {
      if (suggestions.length > 0 && effectiveHighlightIndex >= 0 && effectiveHighlightIndex < suggestions.length) {
        event.preventDefault();
        selectSuggestion(suggestions[effectiveHighlightIndex]);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function wrap(element: ReactNode): ReactNode {
    if (!enabled) {
      return element;
    }
    const showEmpty = attemptedFetch && suggestions.length === 0;
    const emptyText = suggestEmpty ?? 'No suggestions';
    const popoverOpen = open && (suggestions.length > 0 || attemptedFetch);

    return (
      <Popover open={popoverOpen} onOpenChange={setOpen}>
        <PopoverTrigger render={<span className="block" />} nativeButton={false}>
          {element}
        </PopoverTrigger>
        <PopoverContent
          data-slot="input-suggest-list"
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-(--anchor-width) max-h-60 overflow-y-auto p-1"
        >
          {showEmpty ? (
            <div data-slot="input-suggest-empty" className="px-3 py-2 text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={String(suggestion.value)}
                data-slot="input-suggest-item"
                data-index={index}
                data-value={String(suggestion.value)}
                aria-selected={effectiveHighlightIndex === index}
                role="option"
                tabIndex={-1}
                className={cn(
                  'flex cursor-pointer items-center rounded px-3 py-1.5 text-sm outline-none hover:bg-accent',
                  effectiveHighlightIndex === index && 'bg-accent',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                  }
                }}
              >
                {renderSuggestionContent(suggestion, index)}
              </div>
            ))
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return { handleFocus, handleBlur, handleKeyDown, wrap };
}
