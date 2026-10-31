import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ComboboxGroup, ComboboxItem, ComboboxLabel, ComboboxList } from '@nop-chaos/ui';
import type { SelectOptionGroup } from '../schemas.js';
import {
  type ChoiceOption,
  type OptionTemplateRenderer,
  getChoiceOptionKey,
} from './input-choice-renderers.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight regex cache keyed by the active query: the static (non-virtual)
// list used to compile a fresh RegExp per option per keystroke.
const highlightRegexCache = new Map<string, RegExp>();

function getHighlightRegex(query: string): RegExp {
  let regex = highlightRegexCache.get(query);
  if (!regex) {
    regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    if (highlightRegexCache.size > 64) {
      highlightRegexCache.clear();
    }
    highlightRegexCache.set(query, regex);
  }
  return regex;
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) {
    return text;
  }

  const parts = text.split(getHighlightRegex(query));
  let offset = 0;
  const segments = parts.map((part) => {
    const start = offset;
    offset += part.length;
    return { part, start };
  });

  return segments.map(({ part, start }) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={start} className="rounded bg-warning/30 px-0.5 dark:bg-warning/50">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const VIRTUAL_ITEM_ESTIMATE = 32;
const VIRTUAL_OVERSCAN = 6;

function renderComboboxItem(
  option: ChoiceOption,
  index: number,
  renderOptionTemplate?: OptionTemplateRenderer,
  query?: string,
  listIndex?: number,
) {
  let content: ReactNode = option.label;
  if (renderOptionTemplate) {
    try {
      const custom = renderOptionTemplate(option, index);
      if (custom !== undefined && custom !== null && custom !== false) {
        content = custom;
      }
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          '[flux-select] optionTemplate region render failed; falling back to option.label',
          error,
        );
      }
    }
  } else if (query) {
    content = highlightText(option.label, query);
  }
  return (
    <ComboboxItem
      key={getChoiceOptionKey(option.value)}
      value={option}
      index={listIndex}
      disabled={option.disabled}
      data-value={String(option.value)}
    >
      {content}
    </ComboboxItem>
  );
}

export function StaticComboboxList(props: {
  renderGroups: boolean;
  groups: SelectOptionGroup[];
  flatOptions: ChoiceOption[];
  renderOptionTemplate?: OptionTemplateRenderer;
  query?: string;
}) {
  if (props.renderGroups) {
    return (
      <ComboboxList>
        {props.groups.map((group) => (
          <ComboboxGroup key={group.label}>
            <ComboboxLabel>{group.label}</ComboboxLabel>
            {group.options.map((option, index) =>
              renderComboboxItem(option, index, props.renderOptionTemplate, props.query),
            )}
          </ComboboxGroup>
        ))}
      </ComboboxList>
    );
  }

  return (
    <ComboboxList>
      {props.flatOptions.map((option, index) =>
        renderComboboxItem(option, index, props.renderOptionTemplate, props.query),
      )}
    </ComboboxList>
  );
}

export function VirtualizedComboboxList(props: {
  renderGroups: boolean;
  groups: SelectOptionGroup[];
  flatOptions: ChoiceOption[];
  renderOptionTemplate?: OptionTemplateRenderer;
  query?: string;
  highlightedOption?: ChoiceOption;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const flatItems: ChoiceOption[] = props.renderGroups
    ? props.groups.flatMap((group) => group.options)
    : props.flatOptions;
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions; React Compiler auto-skips this component
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => VIRTUAL_ITEM_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => getChoiceOptionKey(flatItems[index]?.value ?? index),
  });
  const highlightedOption = props.highlightedOption;
  const highlightedIndex = highlightedOption
    ? flatItems.findIndex((option) => Object.is(option.value, highlightedOption.value))
    : -1;

  // The root runs in `virtualized` mode: keyboard navigation moves over the
  // full option list by index, so the highlighted row must be scrolled into
  // the rendered window here (unmounted rows cannot scroll themselves).
  useEffect(() => {
    if (highlightedIndex >= 0) {
      virtualizer.scrollToIndex(highlightedIndex, { align: 'auto' });
    }
  }, [highlightedIndex, virtualizer]);

  return (
    <ComboboxList ref={scrollRef} data-slot="combobox-list">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const option = flatItems[virtualItem.index];
          if (!option) {
            return null;
          }
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderComboboxItem(option, virtualItem.index, props.renderOptionTemplate, props.query, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </ComboboxList>
  );
}
