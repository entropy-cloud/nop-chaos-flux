import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ComboboxGroup, ComboboxItem, ComboboxLabel, ComboboxList } from '@nop-chaos/ui';
import type { SelectOptionGroup } from '../schemas.js';
import {
  type ChoiceOption,
  type OptionTemplateRenderer,
  getChoiceOptionKey,
} from './input-choice-renderers.js';

const VIRTUAL_ITEM_ESTIMATE = 32;
const VIRTUAL_OVERSCAN = 6;

function renderComboboxItem(
  option: ChoiceOption,
  index: number,
  renderOptionTemplate?: OptionTemplateRenderer,
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
  }
  return (
    <ComboboxItem
      key={getChoiceOptionKey(option.value)}
      value={option}
      disabled={option.disabled}
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
}) {
  if (props.renderGroups) {
    return (
      <ComboboxList>
        {props.groups.map((group) => (
          <ComboboxGroup key={group.label}>
            <ComboboxLabel>{group.label}</ComboboxLabel>
            {group.options.map((option, index) =>
              renderComboboxItem(option, index, props.renderOptionTemplate),
            )}
          </ComboboxGroup>
        ))}
      </ComboboxList>
    );
  }

  return (
    <ComboboxList>
      {props.flatOptions.map((option, index) =>
        renderComboboxItem(option, index, props.renderOptionTemplate),
      )}
    </ComboboxList>
  );
}

export function VirtualizedComboboxList(props: {
  renderGroups: boolean;
  groups: SelectOptionGroup[];
  flatOptions: ChoiceOption[];
  renderOptionTemplate?: OptionTemplateRenderer;
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
              {renderComboboxItem(option, virtualItem.index, props.renderOptionTemplate)}
            </div>
          );
        })}
      </div>
    </ComboboxList>
  );
}
