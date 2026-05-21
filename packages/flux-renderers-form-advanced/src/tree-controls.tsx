import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@nop-chaos/ui';
import { ChevronRightIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { Spinner } from '@nop-chaos/ui';
import {
  createFieldValidation,
  formFieldRules,
  useFormFieldController,
  validateInputFieldSchema,
} from '@nop-chaos/flux-renderers-form';
import type { InputTreeSchema, TreeSelectSchema } from '@nop-chaos/flux-renderers-form';
import {
  buildTreeOptionMetaList,
  flattenTreeOptions,
  getTreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';
import {
  getSourceErrorMessage,
  isMultipleMode,
  useTreeOptionListController,
  useTreeOptionNodeController,
  useTreeSelectController,
} from './tree-control-controllers.js';

function createTreeItemId(treeId: string, option: TreeOptionMeta) {
  return `${treeId}-${option.valueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}-${option.depth}`;
}

function TreeOptionNode(props: {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  showPathLabel: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  activeItemKey?: string;
  treeId: string;
  expandedKeys: ReadonlySet<string>;
  onToggleExpanded: (option: TreeOptionMeta, expanded: boolean) => void;
  onMoveFocus: (direction: 'prev' | 'next' | 'first' | 'last') => void;
  onFocusItem: (option: TreeOptionMeta) => void;
}) {
  const expanded =
    props.option.children.length > 0 && props.expandedKeys.has(props.option.valueKey);
  const focused = props.activeItemKey === props.option.valueKey;
  const itemId = createTreeItemId(props.treeId, props.option);
  const {
    checked,
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
    <div data-slot="tree-option-node" data-depth={props.option.depth}>
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
          <ChevronRightIcon
            className={cn('size-3.5 transition-transform', expanded ? 'rotate-90' : '')}
          />
        </Button>
        {props.multiple ? (
          <Checkbox
            checked={checked}
            aria-label={props.option.label}
            aria-hidden="true"
            tabIndex={-1}
            className="pointer-events-none ml-1.5 mr-1.5 shrink-0"
          />
        ) : null}
        <span className="min-w-0 truncate pl-1">
          {props.showPathLabel ? props.option.pathLabel : props.option.label}
        </span>
      </div>
      {hasChildren && expanded
        ? (
            <div role="group" data-slot="tree-option-group">
              {props.option.children.map((child) => (
                <TreeOptionNode
                  key={`${child.valueKey}:${child.depth}`}
                  option={child}
                  value={props.value}
                  multiple={props.multiple}
                  showPathLabel={props.showPathLabel}
                  disabled={props.disabled}
                  onChange={props.onChange}
                  activeItemKey={props.activeItemKey}
                  treeId={props.treeId}
                  expandedKeys={props.expandedKeys}
                  onToggleExpanded={props.onToggleExpanded}
                  onMoveFocus={props.onMoveFocus}
                  onFocusItem={props.onFocusItem}
                />
              ))}
            </div>
          )
        : null}
    </div>
  );
}

function TreeOptionList(props: {
  options: TreeOptionMeta[];
  value: unknown;
  multiple: boolean;
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
}) {
  const treeId = React.useId();
  const treeRef = React.useRef<HTMLDivElement>(null);
  const {
    query,
    setQuery,
    filteredOptions,
    activeItemKey,
    expandedKeys,
    toggleExpanded,
    moveFocus,
    focusItem,
  } = useTreeOptionListController({
    options: props.options,
    searchable: props.searchable,
    disabled: props.disabled,
  });
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

  React.useEffect(() => {
    if (!activeDescendantId || props.disabled) {
      return;
    }

    const activeElement = treeRef.current?.querySelector<HTMLElement>(`#${CSS.escape(activeDescendantId)}`);
    activeElement?.focus();
  }, [activeDescendantId, props.disabled]);

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
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <TreeOptionNode
              key={`${option.valueKey}:${option.depth}`}
              option={option}
              value={props.value}
              multiple={props.multiple}
              showPathLabel={props.showPathLabel}
              disabled={props.disabled}
              onChange={props.onChange}
              activeItemKey={activeItemKey}
              treeId={treeId}
              expandedKeys={expandedKeys}
              onToggleExpanded={toggleExpanded}
              onMoveFocus={moveFocus}
              onFocusItem={focusItem}
            />
          ))
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

function InputTreeRenderer(props: RendererComponentProps<InputTreeSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const options = buildTreeOptionMetaList(
    props.props.options,
    getTreeOptionConfig(props.props as InputTreeSchema),
  );
  const sourceError = getSourceErrorMessage(optionsSourceState);
  const fieldLabel = String((props.props.label ?? name) || 'tree');
  const searchLabel = `${t('flux.common.search')} ${fieldLabel}`;
  const sourceErrorId = name ? `${name}-source-error` : undefined;
  const loadingId = name ? `${name}-source-loading` : undefined;

  return (
    <div
      className={cn('nop-input-tree', props.meta.className)}
      data-slot="input-tree-control"
    >
      <div data-slot="input-tree-options">
        <TreeOptionList
          options={options}
          value={value}
          multiple={multiple}
          showPathLabel={props.props.showPathLabel === true}
          searchable={props.props.searchable === true}
          disabled={
            presentation.effectiveDisabled ||
            presentation.readOnly ||
            optionsSourceState?.loading === true
          }
          onChange={(nextValue) => handlers.onChange(nextValue)}
          ariaLabel={fieldLabel}
          searchLabel={searchLabel}
          describedBy={sourceError ? sourceErrorId : undefined}
          loadingDescriptionId={loadingId}
          loading={optionsSourceState?.loading === true}
          errorMessage={sourceError ? sourceErrorId : undefined}
          invalid={Boolean(sourceError)}
        />
      </div>
      {sourceError ? (
        <span id={sourceErrorId} data-slot="input-tree-source-error" role="alert">
          {sourceError}
        </span>
      ) : optionsSourceState?.loading === true ? (
        <span
          id={loadingId}
          data-slot="input-tree-source-loading"
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5"
        >
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
    </div>
  );
}

function TreeSelectRenderer(props: RendererComponentProps<TreeSelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const treeConfig = getTreeOptionConfig(props.props as TreeSelectSchema);
  const options = buildTreeOptionMetaList(props.props.options, treeConfig);
  const { triggerText, triggerLabel, hasSelection } = useTreeSelectController({
    options,
    treeConfig,
    value,
    multiple,
    placeholder: props.props.placeholder,
  });
  const sourceError = getSourceErrorMessage(optionsSourceState);
  const fieldLabel = String(props.props.label ?? name);
  const searchLabel = `${t('flux.common.search')} ${fieldLabel || 'tree'}`;
  const sourceErrorId = name ? `${name}-source-error` : undefined;
  const loadingId = name ? `${name}-source-loading` : undefined;

  return (
    <div
      className={cn('nop-tree-select', props.meta.className)}
      data-slot="tree-select-control"
    >
      <Popover>
        <div className="flex items-center gap-2" data-slot="tree-select-trigger-row">
          <PopoverTrigger
            render={
                <Button
                  type="button"
                  variant="outline"
                  aria-label={fieldLabel}
                  aria-describedby={sourceError ? sourceErrorId : undefined}
                  aria-errormessage={sourceError ? sourceErrorId : undefined}
                  aria-invalid={sourceError ? true : undefined}
                  disabled={presentation.effectiveDisabled || presentation.readOnly || optionsSourceState?.loading === true}
                >
                <span
                  data-slot="tree-select-value"
                  className={cn(triggerText ? undefined : 'text-muted-foreground')}
                >
                  {triggerText || triggerLabel}
                </span>
                <span data-slot="tree-select-icons">
                  <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
                </span>
              </Button>
            }
          />
          {props.props.clearable === true && hasSelection ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('flux.common.clear')}
                disabled={presentation.effectiveDisabled || presentation.readOnly || optionsSourceState?.loading === true}
               onClick={(event) => {
                 event.preventDefault();
                 event.stopPropagation();
                handlers.onChange(multiple ? [] : '');
              }}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
        <PopoverContent align="start">
          <TreeOptionList
            options={options}
            value={value}
            multiple={multiple}
            showPathLabel={props.props.showPathLabel === true}
            searchable={props.props.searchable === true}
            disabled={
              presentation.effectiveDisabled ||
              presentation.readOnly ||
              optionsSourceState?.loading === true
            }
            onChange={(nextValue) => handlers.onChange(nextValue)}
            ariaLabel={fieldLabel}
            searchLabel={searchLabel}
            describedBy={sourceError ? sourceErrorId : undefined}
            loadingDescriptionId={loadingId}
            loading={optionsSourceState?.loading === true}
            errorMessage={sourceError ? sourceErrorId : undefined}
            invalid={Boolean(sourceError)}
          />
        </PopoverContent>
      </Popover>
      {sourceError ? (
        <span id={sourceErrorId} data-slot="tree-select-source-error" role="alert">
          {sourceError}
        </span>
      ) : optionsSourceState?.loading === true ? (
        <span
          id={loadingId}
          data-slot="tree-select-source-loading"
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5"
        >
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
    </div>
  );
}

export const treeControlRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-tree',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputTreeRenderer,
  },
  {
    type: 'tree-select',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: TreeSelectRenderer,
  },
];
