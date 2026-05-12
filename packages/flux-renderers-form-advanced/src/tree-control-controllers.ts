import React from 'react';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import {
  flattenTreeOptions,
  isTreeSelectionChecked,
  toggleTreeSelection,
  type TreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';

export function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (
    sourceState.error &&
    typeof sourceState.error === 'object' &&
    'message' in sourceState.error
  ) {
    const message = (sourceState.error as { message?: unknown }).message;

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return 'Failed to load tree options.';
}

export function isMultipleMode(treeMode: unknown) {
  return treeMode === 'checkbox';
}

function filterTreeOptions(entries: TreeOptionMeta[], lowerQuery: string): TreeOptionMeta[] {
  return entries.flatMap((entry) => {
    const nextChildren = filterTreeOptions(entry.children, lowerQuery);
    const matches =
      entry.label.toLowerCase().includes(lowerQuery) ||
      entry.pathLabel.toLowerCase().includes(lowerQuery);

    if (!matches && nextChildren.length === 0) {
      return [];
    }

    return [{ ...entry, children: nextChildren }];
  });
}

export function useTreeOptionNodeController(input: {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const { option, value, multiple, disabled, onChange } = input;
  const [expanded, setExpanded] = React.useState(true);
  const checked = isTreeSelectionChecked(value, option.value, multiple);
  const hasChildren = option.children.length > 0;

  const handleSelect = React.useCallback(() => {
    if (disabled) {
      return;
    }

    onChange(toggleTreeSelection(value, option.value, multiple));
  }, [disabled, multiple, onChange, option.value, value]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect();
      }

      if (event.key === 'ArrowRight' && hasChildren) {
        event.preventDefault();
        setExpanded(true);
      }

      if (event.key === 'ArrowLeft' && hasChildren) {
        event.preventDefault();
        setExpanded(false);
      }
    },
    [disabled, handleSelect, hasChildren],
  );

  const handleChevronClick = React.useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((previous) => !previous);
  }, []);

  const handleChevronKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!hasChildren) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        setExpanded((previous) => !previous);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        setExpanded(true);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        setExpanded(false);
      }
    },
    [hasChildren],
  );

  return {
    expanded,
    checked,
    hasChildren,
    handleSelect,
    handleKeyDown,
    handleChevronClick,
    handleChevronKeyDown,
  };
}

export function useTreeOptionListController(input: {
  options: TreeOptionMeta[];
  searchable: boolean;
}) {
  const { options, searchable } = input;
  const [query, setQuery] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !query.trim()) {
      return options;
    }

    return filterTreeOptions(options, query.trim().toLowerCase());
  }, [options, query, searchable]);

  return {
    query,
    setQuery,
    filteredOptions,
  };
}

export function useTreeSelectController(input: {
  options: TreeOptionMeta[];
  treeConfig: TreeOptionConfig;
  value: unknown;
  multiple: boolean;
  placeholder: unknown;
}) {
  const { options, treeConfig, value, multiple, placeholder } = input;

  const triggerText = React.useMemo(() => {
    const flattenedOptions = flattenTreeOptions(options, treeConfig);
    const selectedLabels = multiple
      ? flattenedOptions
          .filter((entry) => isTreeSelectionChecked(value, entry.value, true))
          .map((entry) => entry.label)
      : flattenedOptions.find((entry) => Object.is(entry.value, value))?.label;

    return Array.isArray(selectedLabels) ? selectedLabels.join(', ') : selectedLabels;
  }, [multiple, options, treeConfig, value]);

  const triggerLabel =
    typeof placeholder === 'string' && placeholder ? placeholder : 'Select tree option';

  return {
    triggerText,
    triggerLabel,
    hasSelection: Boolean(triggerText),
  };
}
