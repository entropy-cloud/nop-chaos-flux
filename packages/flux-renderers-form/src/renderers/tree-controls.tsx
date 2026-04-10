import React, { useMemo, useState } from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { Button, Checkbox, Input, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { ChevronRightIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react';
import {
  formLabelFieldRule,
  useFieldPresentation,
  useFormFieldController,
  resolveFieldLabelContent
} from '../field-utils';
import { createFieldValidation } from './input';
import { FieldHint, FieldLabel } from './shared';
import type { InputTreeSchema, TreeSelectSchema } from '../schemas';
import {
  buildTreeOptionMetaList,
  flattenTreeOptions,
  getTreeOptionConfig,
  isTreeSelectionChecked,
  toggleTreeSelection,
  type TreeOptionMeta
} from '../tree-options';

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
  ariaLabel?: string;
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
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
            checked ? 'bg-muted' : ''
          )}
          aria-label={props.ariaLabel}
          disabled={props.disabled}
          onClick={() => props.onChange(toggleTreeSelection(props.value, option.value, props.multiple))}
        >
          <span style={{ paddingInlineStart: `${option.depth * 16}px` }} className="inline-flex items-center gap-2 flex-1 min-w-0">
            {option.children.length > 0 ? <ChevronRightIcon className="size-3.5 text-muted-foreground" /> : <span className="size-3.5" />}
            {props.multiple ? <Checkbox checked={checked} aria-label={option.label} /> : null}
            <span className="truncate">{props.showPathLabel ? option.pathLabel : option.label}</span>
          </span>
        </button>
        {option.children.length > 0 ? option.children.map(renderNode) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {props.searchable ? (
        <label className="flex items-center gap-2 rounded-md border border-input px-2 py-1.5">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tree options"
            disabled={props.disabled}
          />
        </label>
      ) : null}
      <div className="grid gap-1 max-h-72 overflow-auto">
        {filteredOptions.map(renderNode)}
      </div>
    </div>
  );
}

function InputTreeRenderer(props: RendererComponentProps<InputTreeSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const multiple = isMultipleMode(props.props.treeMode);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const labelContent = resolveFieldLabelContent(props);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const options = buildTreeOptionMetaList(props.props.options, getTreeOptionConfig(props.props as InputTreeSchema));
  const errorMessage = getSourceErrorMessage(optionsSourceState) ?? presentation.fieldState.error?.message;

  return (
    <label
      className={cn('nop-input-tree grid gap-2', presentation.className)}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="rounded-md border border-input p-2">
        <TreeOptionList
          options={options}
          value={value}
          multiple={multiple}
          showPathLabel={props.props.showPathLabel === true}
          searchable={props.props.searchable === true}
          disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
          onChange={(nextValue) => handlers.onChange(nextValue)}
          ariaLabel={String(props.meta.label ?? props.props.label ?? name)}
        />
      </div>
      <FieldHint
        errorMessage={errorMessage}
        validating={presentation.fieldState.validating || optionsSourceState?.loading === true}
        showError={presentation.showError || Boolean(getSourceErrorMessage(optionsSourceState))}
      />
    </label>
  );
}

function TreeSelectRenderer(props: RendererComponentProps<TreeSelectSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const multiple = isMultipleMode(props.props.treeMode);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const labelContent = resolveFieldLabelContent(props);
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
  const errorMessage = getSourceErrorMessage(optionsSourceState) ?? presentation.fieldState.error?.message;

  return (
    <label
      className={cn('nop-tree-select grid gap-2', presentation.className)}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
            >
              <span className={cn('truncate', triggerText ? '' : 'text-muted-foreground')}>
                {triggerText || triggerLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                {props.props.clearable === true && triggerText ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handlers.onChange(multiple ? [] : '');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handlers.onChange(multiple ? [] : '');
                      }
                    }}
                  >
                    <XIcon className="size-4" />
                  </span>
                ) : null}
                <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-[22rem] p-3" align="start">
          <TreeOptionList
            options={options}
            value={value}
            multiple={multiple}
            showPathLabel={props.props.showPathLabel === true}
            searchable={props.props.searchable === true}
            disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
            onChange={(nextValue) => handlers.onChange(nextValue)}
            ariaLabel={String(props.meta.label ?? props.props.label ?? name)}
          />
        </PopoverContent>
      </Popover>
      <FieldHint
        errorMessage={errorMessage}
        validating={presentation.fieldState.validating || optionsSourceState?.loading === true}
        showError={presentation.showError || Boolean(getSourceErrorMessage(optionsSourceState))}
      />
    </label>
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
