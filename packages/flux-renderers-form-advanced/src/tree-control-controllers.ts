import React from 'react';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import {
  cascadeDeselectParent,
  cascadeSelectParent,
  deriveCheckedState,
  flattenTreeOptions,
  isTreeSelectionChecked,
  toggleTreeSelection,
  type TreeCheckedState,
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

function flattenVisibleTreeOptions(entries: TreeOptionMeta[], expandedKeys: ReadonlySet<string>) {
  const flattened: TreeOptionMeta[] = [];

  function walk(nodes: TreeOptionMeta[]) {
    for (const node of nodes) {
      flattened.push(node);
      if (node.children.length > 0 && expandedKeys.has(node.valueKey)) {
        walk(node.children);
      }
    }
  }

  walk(entries);
  return flattened;
}

export function useTreeOptionNodeController(input: {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  cascade?: boolean;
  onlyLeaf?: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  expanded: boolean;
  focused: boolean;
  itemId: string;
  onToggleExpanded: (option: TreeOptionMeta, expanded: boolean) => void;
  onMoveFocus: (direction: 'prev' | 'next' | 'first' | 'last') => void;
  onFocusItem: (option: TreeOptionMeta) => void;
}) {
  const {
    option,
    value,
    multiple,
    cascade,
    onlyLeaf,
    disabled,
    onChange,
    expanded,
    focused,
    itemId,
    onToggleExpanded,
    onMoveFocus,
    onFocusItem,
  } = input;
  const cascadeEnabled = Boolean(cascade && multiple);
  const checkedState: TreeCheckedState = cascadeEnabled
    ? deriveCheckedState(option, Array.isArray(value) ? value : [], Boolean(onlyLeaf))
    : {
        checked: isTreeSelectionChecked(value, option.value, multiple),
        indeterminate: false,
      };
  const checked = checkedState.checked;
  const indeterminate = checkedState.indeterminate;
  const hasChildren = option.children.length > 0;

  const handleSelect = React.useCallback(() => {
    if (disabled) {
      return;
    }

    if (cascadeEnabled) {
      const current = Array.isArray(value) ? value : [];
      const nextChecked = deriveCheckedState(option, current, Boolean(onlyLeaf)).checked;
      onChange(
        nextChecked
          ? cascadeDeselectParent(current, option, Boolean(onlyLeaf))
          : cascadeSelectParent(current, option, Boolean(onlyLeaf)),
      );
      return;
    }

    onChange(toggleTreeSelection(value, option.value, multiple));
  }, [
    cascadeEnabled,
    disabled,
    multiple,
    onChange,
    onlyLeaf,
    option,
    value,
  ]);

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
        onToggleExpanded(option, true);
      }

      if (event.key === 'ArrowLeft' && hasChildren) {
        event.preventDefault();
        onToggleExpanded(option, false);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onMoveFocus('next');
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onMoveFocus('prev');
      }

      if (event.key === 'Home') {
        event.preventDefault();
        onMoveFocus('first');
      }

      if (event.key === 'End') {
        event.preventDefault();
        onMoveFocus('last');
      }
    },
    [disabled, handleSelect, hasChildren, onMoveFocus, onToggleExpanded, option],
  );

  const handleChevronClick = React.useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleExpanded(option, !expanded);
  }, [expanded, onToggleExpanded, option]);

  const handleChevronKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!hasChildren) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, !expanded);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, true);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        onToggleExpanded(option, false);
      }
    },
    [expanded, hasChildren, onToggleExpanded, option],
  );

  const handleFocus = React.useCallback(() => {
    onFocusItem(option);
  }, [onFocusItem, option]);

  return {
    expanded,
    checked,
    indeterminate,
    hasChildren,
    focused,
    itemId,
    handleSelect,
    handleKeyDown,
    handleChevronClick,
    handleChevronKeyDown,
    handleFocus,
  };
}

export function useTreeOptionListController(input: {
  options: TreeOptionMeta[];
  searchable: boolean;
  disabled: boolean;
}) {
  const { options, searchable, disabled } = input;
  const [query, setQuery] = React.useState('');
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(() => {
    const keys = new Set<string>();
    for (const option of flattenTreeOptions(options)) {
      if (option.children.length > 0) {
        keys.add(option.valueKey);
      }
    }
    return keys;
  });

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !query.trim()) {
      return options;
    }

    return filterTreeOptions(options, query.trim().toLowerCase());
  }, [options, query, searchable]);

  const visibleOptions = React.useMemo(
    () => flattenVisibleTreeOptions(filteredOptions, expandedKeys),
    [expandedKeys, filteredOptions],
  );

  const [activeItemKey, setActiveItemKey] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const expandableKeys = new Set<string>();
    for (const option of flattenTreeOptions(options)) {
      if (option.children.length > 0) {
        expandableKeys.add(option.valueKey);
      }
    }
    setExpandedKeys(expandableKeys);
  }, [options]);

  React.useEffect(() => {
    if (disabled || visibleOptions.length === 0) {
      setActiveItemKey(undefined);
      return;
    }

    if (!activeItemKey || !visibleOptions.some((option) => option.valueKey === activeItemKey)) {
      setActiveItemKey(visibleOptions[0]?.valueKey);
    }
  }, [activeItemKey, disabled, visibleOptions]);

  const toggleExpanded = React.useCallback((option: TreeOptionMeta, nextExpanded: boolean) => {
    if (option.children.length === 0) {
      return;
    }

    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (nextExpanded) {
        next.add(option.valueKey);
      } else {
        next.delete(option.valueKey);
      }
      return next;
    });
  }, []);

  const moveFocus = React.useCallback(
    (direction: 'prev' | 'next' | 'first' | 'last') => {
      if (visibleOptions.length === 0) {
        return;
      }

      if (direction === 'first') {
        setActiveItemKey(visibleOptions[0]?.valueKey);
        return;
      }

      if (direction === 'last') {
        setActiveItemKey(visibleOptions[visibleOptions.length - 1]?.valueKey);
        return;
      }

      const currentIndex = activeItemKey
        ? visibleOptions.findIndex((option) => option.valueKey === activeItemKey)
        : -1;
      const fallbackIndex = direction === 'next' ? 0 : visibleOptions.length - 1;
      const nextIndex =
        currentIndex < 0
          ? fallbackIndex
          : Math.max(
              0,
              Math.min(
                visibleOptions.length - 1,
                currentIndex + (direction === 'next' ? 1 : -1),
              ),
            );
      setActiveItemKey(visibleOptions[nextIndex]?.valueKey);
    },
    [activeItemKey, visibleOptions],
  );

  const focusItem = React.useCallback((option: TreeOptionMeta) => {
    setActiveItemKey(option.valueKey);
  }, []);

  return {
    query,
    setQuery,
    filteredOptions,
    visibleOptions,
    activeItemKey,
    expandedKeys,
    toggleExpanded,
    moveFocus,
    focusItem,
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
  const selectedValueSet = React.useMemo(() => {
    if (!multiple || !Array.isArray(value)) {
      return undefined;
    }

    return new Set(value);
  }, [multiple, value]);

  const triggerText = React.useMemo(() => {
    const flattenedOptions = flattenTreeOptions(options, treeConfig);
    const selectedLabels = multiple
      ? flattenedOptions
          .filter((entry) => selectedValueSet?.has(entry.value))
          .map((entry) => entry.label)
      : flattenedOptions.find((entry) => Object.is(entry.value, value))?.label;

    return Array.isArray(selectedLabels) ? selectedLabels.join(', ') : selectedLabels;
  }, [multiple, options, selectedValueSet, treeConfig, value]);

  const triggerLabel =
    typeof placeholder === 'string' && placeholder ? placeholder : 'Select tree option';

  return {
    triggerText,
    triggerLabel,
    hasSelection: Boolean(triggerText),
  };
}
