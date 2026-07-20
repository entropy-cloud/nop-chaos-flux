import React, { useRef } from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useInputComponentHandle, type SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  cn,
  useIsMobile,
} from '@nop-chaos/ui';
import { ChevronsUpDownIcon, XIcon } from 'lucide-react';
import {
  createFieldValidation,
  formFieldRules,
  useFormFieldController,
  validateInputFieldSchema,
} from '@nop-chaos/flux-renderers-form';
import type { InputTreeSchema, TreeSelectSchema } from '@nop-chaos/flux-renderers-form';
import {
  buildTreeOptionMetaList,
  getTreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';
import {
  getSourceErrorMessage,
  isMultipleMode,
  useTreeLazyChildren,
  useTreeRemoteSearch,
  useTreeSelectController,
} from './tree-control-controllers.js';
import { TreeOptionList } from './tree-option-list.js';

const TREE_METHODS = ['clear', 'focus'] as const;

function InputTreeRenderer(props: RendererComponentProps<InputTreeSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const enableNodePath = props.props.enableNodePath === true;
  const {
    childrenKey,
    labelField,
    valueField,
    onlyLeaf,
    showPathLabel,
    options: treeOptions,
  } = props.props as InputTreeSchema;
  // H8: getTreeOptionConfig returns a new object each call; without memoizing,
  // the new `config` identity is a dep of useTreeRemoteSearch's 300ms debounce
  // effect, so every re-render reset the timer and remote search never fired.
  const treeConfig = React.useMemo(
    () => getTreeOptionConfig({ childrenKey, labelField, valueField, onlyLeaf, showPathLabel }),
    [childrenKey, labelField, valueField, onlyLeaf, showPathLabel],
  );
  const baseOptions = React.useMemo(
    () => buildTreeOptionMetaList(treeOptions, treeConfig),
    [treeOptions, treeConfig],
  );
  const valuePathMap = React.useMemo(() => {
    const map = new Map<unknown, string>();
    function walk(options: TreeOptionMeta[]) {
      for (const opt of options) {
        map.set(opt.value, opt.valuePath);
        if (opt.children.length > 0) {
          walk(opt.children);
        }
      }
    }
    walk(baseOptions);
    return map;
  }, [baseOptions]);
  const [query, setQuery] = React.useState('');
  const remoteSearchActive =
    props.props.searchable === true && Boolean(props.props.searchSource);
  const lazyEnabled = Boolean(props.props.childrenSource);
  if (
    !lazyEnabled &&
    baseOptions.some((opt) => opt.deferChildren === true)
  ) {
    console.warn(
      '[input-tree] Node has deferChildren=true but no childrenSource declared. ' +
        'Lazy children will not load; node degrades to no children.',
    );
  }
  const { remoteOptions, loading: searchLoading, error: searchError } = useTreeRemoteSearch({
    query,
    searchSource: props.props.searchSource,
    searchable: props.props.searchable === true,
    disabled:
      presentation.effectiveDisabled ||
      presentation.readOnly ||
      optionsSourceState?.loading === true,
    helpers: props.helpers,
    config: treeConfig,
  });
  const {
    options: lazyOptions,
    nodeStates: lazyNodeStates,
    loadChildren: lazyLoadChildren,
    retryLoadChildren: lazyRetryChildren,
  } = useTreeLazyChildren({
    baseOptions,
    childrenSource: props.props.childrenSource,
    helpers: props.helpers,
    config: treeConfig,
    enabled: lazyEnabled && !remoteSearchActive,
  });
  const options = remoteSearchActive
    ? remoteOptions ?? baseOptions
    : lazyEnabled
      ? lazyOptions
      : baseOptions;
  const sourceError = getSourceErrorMessage(optionsSourceState) ?? searchError;
  const fieldLabel = String((props.props.label ?? name) || 'tree');
  const searchLabel = `${t('flux.common.search')} ${fieldLabel}`;
  const sourceErrorId = name ? `${name}-source-error` : undefined;
  const loadingId = name ? `${name}-source-loading` : undefined;

  const rootRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-tree',
    cid: props.meta.cid,
    methods: TREE_METHODS,
    getFocusTarget: () => rootRef.current?.querySelector<HTMLElement>('input, button, [tabindex]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(multiple ? [] : undefined),
  });

  return (
    <div
      ref={rootRef}
      className={cn('nop-input-tree', props.meta.className)}
      data-slot="input-tree-control"
    >
      <div data-slot="input-tree-options">
        <TreeOptionList
          options={options}
          value={value}
          multiple={multiple}
          cascade={props.props.cascade === true}
          onlyLeaf={props.props.onlyLeaf === true}
          showPathLabel={props.props.showPathLabel === true}
          searchable={props.props.searchable === true}
          disabled={
            presentation.effectiveDisabled ||
            presentation.readOnly ||
            optionsSourceState?.loading === true
          }
          onChange={(nextValue) => {
            if (enableNodePath) {
              if (multiple && Array.isArray(nextValue)) {
                handlers.onChange(nextValue.map((v: unknown) => valuePathMap.get(v) ?? String(v)));
              } else {
                handlers.onChange(valuePathMap.get(nextValue) ?? String(nextValue));
              }
            } else {
              handlers.onChange(nextValue);
            }
          }}
          ariaLabel={fieldLabel}
          searchLabel={searchLabel}
          describedBy={sourceError ? sourceErrorId : undefined}
          loadingDescriptionId={loadingId}
          loading={optionsSourceState?.loading === true || searchLoading}
          errorMessage={sourceError ? sourceErrorId : undefined}
          invalid={Boolean(sourceError)}
          virtualThreshold={props.props.virtualThreshold}
          remoteSearch={remoteSearchActive}
          onQueryChange={setQuery}
          lazyNodeStates={lazyNodeStates}
          onLazyExpand={lazyLoadChildren}
          onLazyRetry={lazyRetryChildren}
        />
      </div>
      {sourceError ? (
        <span id={sourceErrorId} data-slot="input-tree-source-error" role="alert">
          {sourceError}
        </span>
      ) : optionsSourceState?.loading === true || searchLoading ? (
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
  const enableNodePath = props.props.enableNodePath === true;
  const {
    childrenKey: selectChildrenKey,
    labelField: selectLabelField,
    valueField: selectValueField,
    onlyLeaf: selectOnlyLeaf,
    showPathLabel: selectShowPathLabel,
    options: selectTreeOptions,
  } = props.props as TreeSelectSchema;
  const treeConfig = React.useMemo(
    () =>
      getTreeOptionConfig({
        childrenKey: selectChildrenKey,
        labelField: selectLabelField,
        valueField: selectValueField,
        onlyLeaf: selectOnlyLeaf,
        showPathLabel: selectShowPathLabel,
      }),
    [selectChildrenKey, selectLabelField, selectValueField, selectOnlyLeaf, selectShowPathLabel],
  );
  const baseOptions = React.useMemo(
    () => buildTreeOptionMetaList(selectTreeOptions, treeConfig),
    [selectTreeOptions, treeConfig],
  );
  const valuePathMap = React.useMemo(() => {
    const map = new Map<unknown, string>();
    function walk(options: TreeOptionMeta[]) {
      for (const opt of options) {
        map.set(opt.value, opt.valuePath);
        if (opt.children.length > 0) {
          walk(opt.children);
        }
      }
    }
    walk(baseOptions);
    return map;
  }, [baseOptions]);
  const [query, setQuery] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const remoteSearchActive =
    props.props.searchable === true && Boolean(props.props.searchSource);
  const lazyEnabled = Boolean(props.props.childrenSource);
  const { remoteOptions, loading: searchLoading, error: searchError } = useTreeRemoteSearch({
    query,
    searchSource: props.props.searchSource,
    searchable: props.props.searchable === true,
    disabled:
      presentation.effectiveDisabled ||
      presentation.readOnly ||
      optionsSourceState?.loading === true,
    helpers: props.helpers,
    config: treeConfig,
  });
  const {
    options: lazyOptions,
    nodeStates: lazyNodeStates,
    loadChildren: lazyLoadChildren,
    retryLoadChildren: lazyRetryChildren,
  } = useTreeLazyChildren({
    baseOptions,
    childrenSource: props.props.childrenSource,
    helpers: props.helpers,
    config: treeConfig,
    enabled: lazyEnabled && !remoteSearchActive,
  });
  const options = remoteSearchActive
    ? remoteOptions ?? baseOptions
    : lazyEnabled
      ? lazyOptions
      : baseOptions;
  const { triggerText, triggerLabel, hasSelection } = useTreeSelectController({
    options,
    treeConfig,
    value,
    multiple,
    placeholder: props.props.placeholder,
  });
  const sourceError = getSourceErrorMessage(optionsSourceState) ?? searchError;
  const fieldLabel = String(props.props.label ?? name);
  const searchLabel = `${t('flux.common.search')} ${fieldLabel || 'tree'}`;
  const sourceErrorId = name ? `${name}-source-error` : undefined;
  const loadingId = name ? `${name}-source-loading` : undefined;

  const rootRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'tree-select',
    cid: props.meta.cid,
    methods: TREE_METHODS,
    getFocusTarget: () => rootRef.current?.querySelector<HTMLElement>('button, [tabindex]') ?? null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(multiple ? [] : undefined),
  });

  const triggerDisabled =
    presentation.effectiveDisabled ||
    presentation.readOnly ||
    optionsSourceState?.loading === true;

  const treeOptionListElement = (
    <TreeOptionList
      options={options}
      value={value}
      multiple={multiple}
      cascade={props.props.cascade === true}
      onlyLeaf={props.props.onlyLeaf === true}
      showPathLabel={props.props.showPathLabel === true}
      searchable={props.props.searchable === true}
      disabled={triggerDisabled}
      onChange={(nextValue) => {
        if (enableNodePath) {
          if (multiple && Array.isArray(nextValue)) {
            handlers.onChange(nextValue.map((v: unknown) => valuePathMap.get(v) ?? String(v)));
          } else {
            handlers.onChange(valuePathMap.get(nextValue) ?? String(nextValue));
          }
        } else {
          handlers.onChange(nextValue);
        }
      }}
      ariaLabel={fieldLabel}
      searchLabel={searchLabel}
      describedBy={sourceError ? sourceErrorId : undefined}
      loadingDescriptionId={loadingId}
      loading={optionsSourceState?.loading === true || searchLoading}
      errorMessage={sourceError ? sourceErrorId : undefined}
      invalid={Boolean(sourceError)}
      virtualThreshold={props.props.virtualThreshold}
      remoteSearch={remoteSearchActive}
      onQueryChange={setQuery}
      lazyNodeStates={lazyNodeStates}
      onLazyExpand={lazyLoadChildren}
      onLazyRetry={lazyRetryChildren}
    />
  );

  const triggerValueSpan = (
    <span
      data-slot="tree-select-value"
      className={cn(triggerText ? undefined : 'text-muted-foreground')}
    >
      {triggerText || triggerLabel}
    </span>
  );
  const triggerIconsSpan = (
    <span data-slot="tree-select-icons">
      <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
    </span>
  );

  return (
    <div
      ref={rootRef}
      className={cn('nop-tree-select', props.meta.className)}
      data-slot="tree-select-control"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <div className="flex items-center gap-2" data-slot="tree-select-trigger-row">
        {isMobile ? (
          <Button
            type="button"
            variant="outline"
            aria-label={fieldLabel}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-describedby={sourceError ? sourceErrorId : undefined}
            aria-errormessage={sourceError ? sourceErrorId : undefined}
            aria-invalid={sourceError ? true : undefined}
            disabled={triggerDisabled}
            data-slot="tree-select-mobile-trigger"
            onClick={() => setSheetOpen(true)}
          >
            {triggerValueSpan}
            {triggerIconsSpan}
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  aria-label={fieldLabel}
                  aria-describedby={sourceError ? sourceErrorId : undefined}
                  aria-errormessage={sourceError ? sourceErrorId : undefined}
                  aria-invalid={sourceError ? true : undefined}
                  disabled={triggerDisabled}
                >
                  {triggerValueSpan}
                  {triggerIconsSpan}
                </Button>
              }
            />
            <PopoverContent align="start">{treeOptionListElement}</PopoverContent>
          </Popover>
        )}
        {props.props.clearable === true && hasSelection ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('flux.common.clear')}
            disabled={triggerDisabled}
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
      {isMobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="nop-safe-bottom max-h-[80vh] gap-0"
            data-testid="tree-select-mobile-sheet"
          >
            <SheetHeader className="nop-hairline nop-hairline--bottom">
              <SheetTitle className="truncate">{fieldLabel}</SheetTitle>
            </SheetHeader>
            <div
              className="flex max-h-[65vh] flex-col overflow-y-auto p-2"
              data-slot="tree-select-mobile-options"
            >
              {treeOptionListElement}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
      {sourceError ? (
        <span id={sourceErrorId} data-slot="tree-select-source-error" role="alert">
          {sourceError}
        </span>
      ) : optionsSourceState?.loading === true || searchLoading ? (
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
      { key: 'virtualThreshold', kind: 'prop' },
      { key: 'childrenSource', kind: 'prop' },
      { key: 'searchSource', kind: 'prop' },
      { key: 'enableNodePath', kind: 'prop', valueType: 'boolean' },
      { key: 'pathSeparator', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: [
      {
        handle: 'clear',
        displayName: 'Clear',
        description: 'Clear the tree selection (multi-select to [], single-select to undefined).',
      },
      {
        handle: 'focus',
        displayName: 'Focus',
        description: 'Focus the tree control.',
      },
    ],
    wrap: true,
    frameRootTag: 'div',
    component: InputTreeRenderer,
  },
  {
    type: 'tree-select',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'virtualThreshold', kind: 'prop' },
      { key: 'childrenSource', kind: 'prop' },
      { key: 'searchSource', kind: 'prop' },
      { key: 'enableNodePath', kind: 'prop', valueType: 'boolean' },
      { key: 'pathSeparator', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: [
      {
        handle: 'clear',
        displayName: 'Clear',
        description: 'Clear the tree-select selection.',
      },
      {
        handle: 'focus',
        displayName: 'Focus',
        description: 'Focus the tree-select trigger.',
      },
    ],
    wrap: true,
    component: TreeSelectRenderer,
  },
];
