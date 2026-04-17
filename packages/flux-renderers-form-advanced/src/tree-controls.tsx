import React, { useMemo, useState } from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Checkbox, Input, Label, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { ChevronRightIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react';
import {
  formLabelFieldRule,
  useFormFieldController
} from '@nop-chaos/flux-renderers-form';
import { createFieldValidation } from '@nop-chaos/flux-renderers-form';
import type { InputTreeSchema, TreeSelectSchema } from '@nop-chaos/flux-renderers-form';
import {
  buildTreeOptionMetaList,
  flattenTreeOptions,
  getTreeOptionConfig,
  isTreeSelectionChecked,
  toggleTreeSelection,
  type TreeOptionMeta
} from './tree-options';

function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (sourceState.error && typeof sourceState.error === 'object' && 'message' in sourceState.error) {
    const message = (sourceState.error as { message?: unknown }).message;

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return 'Failed to load tree options.';
}

function isMultipleMode(treeMode: unknown) {
  return treeMode === 'checkbox';
}

function TreeOptionList(props: {
  options: TreeOptionMeta[];
  value: unknown;
  multiple: boolean;
  showPathLabel: boolean;
  searchable: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    if (!props.searchable || !query.trim()) {
      return props.options;
    }

    const lowerQuery = query.trim().toLowerCase();

    function filterEntries(entries: TreeOptionMeta[]): TreeOptionMeta[] {
      return entries.flatMap((entry) => {
        const nextChildren = filterEntries(entry.children);
        const matches = entry.label.toLowerCase().includes(lowerQuery) || entry.pathLabel.toLowerCase().includes(lowerQuery);

        if (!matches && nextChildren.length === 0) {
          return [];
        }

        return [{ ...entry, children: nextChildren }];
      });
    }

    return filterEntries(props.options);
  }, [props.options, props.searchable, query]);

  function renderNode(option: TreeOptionMeta) {
    const checked = isTreeSelectionChecked(props.value, option.value, props.multiple);

    return (
      <div key={`${option.valueKey}:${option.depth}`} className="grid gap-1">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
            checked ? 'bg-muted' : ''
          )}
          disabled={props.disabled}
          onClick={() => props.onChange(toggleTreeSelection(props.value, option.value, props.multiple))}
        >
          <span style={{ paddingInlineStart: `${option.depth * 16}px` }} className="inline-flex items-center gap-2 flex-1 min-w-0">
            {option.children.length > 0 ? <ChevronRightIcon className="size-3.5 text-muted-foreground" /> : <span className="size-3.5" />}
            {props.multiple ? <Checkbox checked={checked} aria-label={option.label} /> : null}
            <span className="truncate">{props.showPathLabel ? option.pathLabel : option.label}</span>
          </span>
        </Button>
        {option.children.length > 0 ? option.children.map(renderNode) : null}
      </div>
    );
  }

  return (
    <div data-slot="tree-option-list">
      {props.searchable ? (
        <Label data-slot="tree-option-search">
          <SearchIcon className="size-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tree options"
            disabled={props.disabled}
          />
        </Label>
      ) : null}
      <div data-slot="tree-option-items">
        {filteredOptions.map(renderNode)}
      </div>
    </div>
  );
}

function InputTreeRenderer(props: RendererComponentProps<InputTreeSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const options = buildTreeOptionMetaList(props.props.options, getTreeOptionConfig(props.props as InputTreeSchema));
  const sourceError = getSourceErrorMessage(optionsSourceState);

  return (
    <div data-slot="input-tree-control">
      <div data-slot="input-tree-options">
        <TreeOptionList
          options={options}
          value={value}
          multiple={multiple}
          showPathLabel={props.props.showPathLabel === true}
          searchable={props.props.searchable === true}
          disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
          onChange={(nextValue) => handlers.onChange(nextValue)}
        />
      </div>
      {sourceError ? (
        <span data-slot="input-tree-source-error">{sourceError}</span>
      ) : optionsSourceState?.loading === true ? (
        <span data-slot="input-tree-source-loading">{t('flux.common.loading')}</span>
      ) : null}
    </div>
  );
}

function TreeSelectRenderer(props: RendererComponentProps<TreeSelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const treeConfig = getTreeOptionConfig(props.props as TreeSelectSchema);
  const options = buildTreeOptionMetaList(props.props.options, treeConfig);
  const flattenedOptions = flattenTreeOptions(options, treeConfig);
  const selectedLabels = multiple
    ? flattenedOptions.filter((entry) => isTreeSelectionChecked(value, entry.value, true)).map((entry) => entry.label)
    : flattenedOptions.find((entry) => Object.is(entry.value, value))?.label;
  const triggerText = Array.isArray(selectedLabels)
    ? selectedLabels.join(', ')
    : selectedLabels;
  const triggerLabel = typeof props.props.placeholder === 'string' && props.props.placeholder
    ? props.props.placeholder
    : 'Select tree option';
  const sourceError = getSourceErrorMessage(optionsSourceState);

  return (
    <div data-slot="tree-select-control">
      <Popover>
        <div className="flex items-center gap-2" data-slot="tree-select-trigger-row">
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                aria-label={String(props.props.label ?? name)}
                disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
              >
                <span data-slot="tree-select-value" className={cn(triggerText ? undefined : 'text-muted-foreground')}>
                  {triggerText || triggerLabel}
                </span>
                <span data-slot="tree-select-icons">
                  <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
                </span>
              </Button>
            }
          />
          {props.props.clearable === true && triggerText ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear tree selection"
              disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
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
            disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
            onChange={(nextValue) => handlers.onChange(nextValue)}
          />
        </PopoverContent>
      </Popover>
      {sourceError ? (
        <span data-slot="tree-select-source-error">{sourceError}</span>
      ) : optionsSourceState?.loading === true ? (
        <span data-slot="tree-select-source-loading">{t('flux.common.loading')}</span>
      ) : null}
    </div>
  );
}

export const treeControlRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-tree',
    fields: [formLabelFieldRule, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }],
    validation: createFieldValidation(),
    wrap: true,
    component: InputTreeRenderer
  },
  {
    type: 'tree-select',
    fields: [formLabelFieldRule, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }],
    validation: createFieldValidation(),
    wrap: true,
    component: TreeSelectRenderer
  }
];
