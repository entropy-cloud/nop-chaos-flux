import React from 'react';
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
  getTreeOptionConfig,
  type TreeOptionMeta
} from './tree-options';
import {
  getSourceErrorMessage,
  isMultipleMode,
  useTreeOptionListController,
  useTreeOptionNodeController,
  useTreeSelectController
} from './tree-control-controllers';

function TreeOptionNode(props: {
  option: TreeOptionMeta;
  value: unknown;
  multiple: boolean;
  showPathLabel: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const {
    expanded,
    checked,
    hasChildren,
    handleSelect,
    handleKeyDown,
    handleChevronClick
  } = useTreeOptionNodeController(props);

  return (
    <div data-slot="tree-option-node" data-depth={props.option.depth}>
      <div
        className={cn(
          'flex w-full items-center rounded-md py-1.5 pr-2 text-sm',
          props.disabled ? 'opacity-50' : 'cursor-pointer',
          checked ? 'bg-muted' : 'hover:bg-muted'
        )}
        style={{ paddingInlineStart: `${props.option.depth * 16 + 8}px` }}
        role="treeitem"
        aria-selected={checked}
        tabIndex={props.disabled ? -1 : 0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <span
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-sm',
            hasChildren ? 'cursor-pointer hover:bg-accent' : '',
            !hasChildren ? 'invisible' : ''
          )}
          aria-label={hasChildren ? (expanded ? 'Collapse node' : 'Expand node') : undefined}
          role={hasChildren ? 'button' : undefined}
          tabIndex={hasChildren ? 0 : undefined}
          onClick={handleChevronClick}
        >
          <ChevronRightIcon className={cn('size-3.5 transition-transform', expanded ? 'rotate-90' : '')} />
        </span>
        {props.multiple ? (
          <Checkbox
            checked={checked}
            aria-label={props.option.label}
            className="pointer-events-none ml-1.5 mr-1.5 shrink-0"
          />
        ) : null}
        <span className="min-w-0 truncate pl-1">{props.showPathLabel ? props.option.pathLabel : props.option.label}</span>
      </div>
      {hasChildren && expanded
        ? props.option.children.map((child) => (
            <TreeOptionNode
              key={`${child.valueKey}:${child.depth}`}
              option={child}
              value={props.value}
              multiple={props.multiple}
              showPathLabel={props.showPathLabel}
              disabled={props.disabled}
              onChange={props.onChange}
            />
          ))
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
}) {
  const { query, setQuery, filteredOptions } = useTreeOptionListController({
    options: props.options,
    searchable: props.searchable
  });

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
        {filteredOptions.map((option) => (
          <TreeOptionNode
            key={`${option.valueKey}:${option.depth}`}
            option={option}
            value={props.value}
            multiple={props.multiple}
            showPathLabel={props.showPathLabel}
            disabled={props.disabled}
            onChange={props.onChange}
          />
        ))}
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
  const { triggerText, triggerLabel, hasSelection } = useTreeSelectController({
    options,
    treeConfig,
    value,
    multiple,
    placeholder: props.props.placeholder
  });
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
          {props.props.clearable === true && hasSelection ? (
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
