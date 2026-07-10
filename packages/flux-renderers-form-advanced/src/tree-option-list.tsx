import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Checkbox,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Label,
  Spinner,
  cn,
} from '@nop-chaos/ui';
import { ChevronRightIcon, RotateCwIcon, SearchIcon, XIcon } from 'lucide-react';
import { flattenTreeOptions, type TreeOptionMeta } from './tree-options.js';
import {
  useTreeOptionListController,
  useTreeOptionNodeController,
  type TreeLazyNodeState,
} from './tree-control-controllers.js';

export const DEFAULT_VIRTUAL_THRESHOLD = 100;
const VIRTUAL_ITEM_ESTIMATE = 32;
const VIRTUAL_OVERSCAN = 8;

export function createTreeItemId(treeId: string, option: TreeOptionMeta) {
  return `${treeId}-${option.valueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}-${option.depth}`;
}

export interface TreeOptionRowProps {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  cascade: boolean;
  onlyLeaf: boolean;
  showPathLabel: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  activeItemKey?: string;
  treeId: string;
  expandedKeys: ReadonlySet<string>;
  onToggleExpanded: (option: TreeOptionMeta, expanded: boolean) => void;
  onMoveFocus: (direction: 'prev' | 'next' | 'first' | 'last') => void;
  onFocusItem: (option: TreeOptionMeta) => void;
  lazyNodeStates?: ReadonlyMap<string, TreeLazyNodeState>;
  onLazyRetry?: (option: TreeOptionMeta) => void;
}

function TreeOptionRow(props: TreeOptionRowProps) {
  const expanded =
    props.option.children.length > 0 && props.expandedKeys.has(props.option.valueKey);
  const focused = props.activeItemKey === props.option.valueKey;
  const itemId = createTreeItemId(props.treeId, props.option);
  const lazyState = props.lazyNodeStates?.get(props.option.valueKey);
  const {
    checked,
    indeterminate,
    hasChildren,
    handleSelect,
    handleKeyDown,
    handleChevronClick,
    handleChevronKeyDown,
    handleFocus,
  } = useTreeOptionNodeController({
    ...props,
    expanded,
    focused,
    itemId,
  });

  return (
    <div
      className={cn(
        'flex w-full items-center rounded-md py-1.5 pr-2 text-sm',
        props.disabled ? 'opacity-50' : 'cursor-pointer',
        checked ? 'bg-muted' : 'hover:bg-muted',
        'focus-visible:ring-2 focus-visible:ring-ring',
      )}
      style={{ paddingInlineStart: `${props.option.depth * 16 + 8}px` }}
      role="treeitem"
      id={itemId}
      aria-level={props.option.depth + 1}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={checked}
      aria-checked={indeterminate ? 'mixed' : undefined}
      aria-disabled={props.disabled || undefined}
      tabIndex={props.disabled ? -1 : focused ? 0 : -1}
      onClick={props.disabled ? undefined : handleSelect}
      onKeyDown={props.disabled ? undefined : handleKeyDown}
      onFocus={props.disabled ? undefined : handleFocus}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-sm',
          hasChildren ? 'hover:bg-accent' : '',
          !hasChildren ? 'invisible' : '',
        )}
        aria-label={
          hasChildren
            ? expanded
              ? t('flux.common.collapse')
              : t('flux.common.expand')
            : undefined
        }
        disabled={!hasChildren}
        onClick={handleChevronClick}
        onKeyDown={handleChevronKeyDown}
      >
        {lazyState?.loading ? (
          <Spinner className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronRightIcon
            className={cn('size-3.5 transition-transform', expanded ? 'rotate-90' : '')}
          />
        )}
      </Button>
      {props.multiple ? (
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          aria-label={props.option.label}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none ml-1.5 mr-1.5 shrink-0"
        />
      ) : null}
      <span className="min-w-0 truncate pl-1">
        {props.showPathLabel ? props.option.pathLabel : props.option.label}
      </span>
      {lazyState?.error ? (
        <span
          className="ml-auto flex items-center gap-1 pl-2 text-xs text-destructive"
          data-slot="tree-option-lazy-error"
        >
          <span className="truncate">{lazyState.error}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('flux.common.retry')}
            data-slot="tree-option-lazy-retry"
            disabled={props.disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onLazyRetry?.(props.option);
            }}
          >
            <RotateCwIcon className="size-3" />
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function TreeOptionNode(props: TreeOptionRowProps) {
  const expanded =
    props.option.children.length > 0 && props.expandedKeys.has(props.option.valueKey);

  return (
    <div data-slot="tree-option-node" data-depth={props.option.depth}>
      <TreeOptionRow {...props} />
      {expanded && props.option.children.length > 0 ? (
        <div role="group" data-slot="tree-option-group">
          {props.option.children.map((child) => (
            <TreeOptionNode
              key={`${child.valueKey}:${child.depth}`}
              option={child}
              value={props.value}
              multiple={props.multiple}
              cascade={props.cascade}
              onlyLeaf={props.onlyLeaf}
              showPathLabel={props.showPathLabel}
              disabled={props.disabled}
              onChange={props.onChange}
              activeItemKey={props.activeItemKey}
              treeId={props.treeId}
              expandedKeys={props.expandedKeys}
              onToggleExpanded={props.onToggleExpanded}
              onMoveFocus={props.onMoveFocus}
              onFocusItem={props.onFocusItem}
              lazyNodeStates={props.lazyNodeStates}
              onLazyRetry={props.onLazyRetry}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface TreeOptionListProps {
  options: TreeOptionMeta[];
  value: unknown;
  multiple: boolean;
  cascade: boolean;
  onlyLeaf: boolean;
  showPathLabel: boolean;
  searchable: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  ariaLabel: string;
  searchLabel: string;
  describedBy?: string;
  loadingDescriptionId?: string;
  loading?: boolean;
  errorMessage?: string;
  invalid?: boolean;
  virtualThreshold?: number;
  remoteSearch?: boolean;
  onQueryChange?: (query: string) => void;
  lazyNodeStates?: ReadonlyMap<string, TreeLazyNodeState>;
  onLazyExpand?: (option: TreeOptionMeta) => void;
  onLazyRetry?: (option: TreeOptionMeta) => void;
}

export function TreeOptionList(props: TreeOptionListProps) {
  const treeId = React.useId();
  const treeRef = React.useRef<HTMLDivElement>(null);
  const {
    query,
    setQuery,
    filteredOptions,
    visibleOptions,
    activeItemKey,
    expandedKeys,
    toggleExpanded,
    moveFocus,
    focusItem,
  } = useTreeOptionListController({
    options: props.options,
    searchable: props.searchable,
    disabled: props.disabled,
    remoteSearch: props.remoteSearch,
    onQueryChange: props.onQueryChange,
  });
  const lazyExpand = props.onLazyExpand;
  const handleToggleExpanded = React.useCallback(
    (option: TreeOptionMeta, nextExpanded: boolean) => {
      toggleExpanded(option, nextExpanded);
      if (nextExpanded && option.deferChildren === true) {
        lazyExpand?.(option);
      }
    },
    [lazyExpand, toggleExpanded],
  );
  const describedBy = [props.describedBy, props.loading ? props.loadingDescriptionId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
  const hasQuery = query.trim().length > 0;
  const activeDescendantId = React.useMemo(() => {
    const activeOption = activeItemKey
      ? flattenTreeOptions(filteredOptions).find((option) => option.valueKey === activeItemKey)
      : undefined;
    return activeOption ? createTreeItemId(treeId, activeOption) : undefined;
  }, [activeItemKey, filteredOptions, treeId]);

  const threshold = props.virtualThreshold ?? DEFAULT_VIRTUAL_THRESHOLD;
  const shouldVirtualize =
    threshold > 0 && visibleOptions.length >= threshold && !props.disabled;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions; React Compiler auto-skips this component
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? visibleOptions.length : 0,
    getScrollElement: () => treeRef.current,
    estimateSize: () => VIRTUAL_ITEM_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => visibleOptions[index]?.valueKey ?? String(index),
    enabled: shouldVirtualize,
  });

  React.useEffect(() => {
    if (!activeDescendantId || props.disabled) {
      return;
    }

    if (shouldVirtualize) {
      const activeIndex = activeItemKey
        ? visibleOptions.findIndex((option) => option.valueKey === activeItemKey)
        : -1;
      if (activeIndex >= 0) {
        virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
      }
    }

    const activeElement = treeRef.current?.querySelector<HTMLElement>(`#${CSS.escape(activeDescendantId)}`);
    activeElement?.focus();
  }, [activeDescendantId, activeItemKey, props.disabled, shouldVirtualize, virtualizer, visibleOptions]);

  const sharedRowProps = {
    value: props.value,
    multiple: props.multiple,
    cascade: props.cascade,
    onlyLeaf: props.onlyLeaf,
    showPathLabel: props.showPathLabel,
    disabled: props.disabled,
    onChange: props.onChange,
    activeItemKey,
    treeId,
    expandedKeys,
    onToggleExpanded: handleToggleExpanded,
    onMoveFocus: moveFocus,
    onFocusItem: focusItem,
    lazyNodeStates: props.lazyNodeStates,
    onLazyRetry: props.onLazyRetry,
  };

  return (
    <div data-slot="tree-option-list">
      {props.searchable ? (
        <div className="flex items-center gap-2" data-slot="tree-option-search-row">
          <Label data-slot="tree-option-search" className="flex-1">
            <SearchIcon className="size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={props.searchLabel}
              placeholder={props.searchLabel}
              disabled={props.disabled}
            />
          </Label>
          {hasQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('flux.common.clear')}
              disabled={props.disabled}
              onClick={() => setQuery('')}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
      <div
        ref={treeRef}
        data-slot="tree-option-items"
        role="tree"
        aria-label={props.ariaLabel}
        aria-multiselectable={props.multiple || undefined}
        aria-describedby={describedBy}
        aria-errormessage={props.errorMessage}
        aria-invalid={props.invalid || undefined}
        aria-busy={props.loading || undefined}
        aria-activedescendant={activeDescendantId}
        className={shouldVirtualize ? 'max-h-80 overflow-auto' : undefined}
      >
        {visibleOptions.length > 0 ? (
          shouldVirtualize ? (
            <div
              data-slot="tree-option-virtual-spacer"
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const option = visibleOptions[virtualItem.index];
                if (!option) {
                  return null;
                }
                return (
                  <div
                    key={virtualItem.key}
                    data-slot="tree-option-virtual-item"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TreeOptionRow option={option} {...sharedRowProps} />
                  </div>
                );
              })}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <TreeOptionNode
                key={`${option.valueKey}:${option.depth}`}
                option={option}
                {...sharedRowProps}
              />
            ))
          )
        ) : (
          <Empty data-slot="tree-option-empty" className="min-h-28 border-0 p-4 shadow-none">
            <EmptyHeader>
              <EmptyTitle>{t('flux.common.noResults')}</EmptyTitle>
              {hasQuery ? (
                <EmptyDescription>{props.searchLabel}</EmptyDescription>
              ) : null}
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
