import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@nop-chaos/ui';
import { ChevronRightIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react';
import {
  createFieldValidation,
  formLabelFieldRule,
  useFormFieldController,
  validateInputFieldSchema,
} from '@nop-chaos/flux-renderers-form';
import type { InputTreeSchema, TreeSelectSchema } from '@nop-chaos/flux-renderers-form';
import { buildTreeOptionMetaList, getTreeOptionConfig, type TreeOptionMeta } from './tree-options.js';
import {
  getSourceErrorMessage,
  isMultipleMode,
  useTreeOptionListController,
  useTreeOptionNodeController,
  useTreeSelectController,
} from './tree-control-controllers.js';

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
    handleChevronClick,
    handleChevronKeyDown,
  } = useTreeOptionNodeController(props);

  return (
    <div data-slot="tree-option-node" data-depth={props.option.depth}>
        <div
        className={cn(
          'flex w-full items-center rounded-md py-1.5 pr-2 text-sm',
          props.disabled ? 'opacity-50' : 'cursor-pointer',
          checked ? 'bg-muted' : 'hover:bg-muted',
        )}
        style={{ paddingInlineStart: `${props.option.depth * 16 + 8}px` }}
        role="treeitem"
        aria-level={props.option.depth + 1}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={checked}
        aria-disabled={props.disabled || undefined}
        tabIndex={props.disabled ? -1 : 0}
        onClick={props.disabled ? undefined : handleSelect}
        onKeyDown={props.disabled ? undefined : handleKeyDown}
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
  searchLabel: string;
  describedBy?: string;
  errorMessage?: string;
  invalid?: boolean;
}) {
  const { query, setQuery, filteredOptions } = useTreeOptionListController({
    options: props.options,
    searchable: props.searchable,
  });

  return (
    <div data-slot="tree-option-list">
      {props.searchable ? (
        <Label data-slot="tree-option-search">
          <SearchIcon className="size-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={props.searchLabel}
            placeholder={props.searchLabel}
            disabled={props.disabled}
          />
        </Label>
      ) : null}
      <div
        data-slot="tree-option-items"
        role="tree"
        aria-multiselectable={props.multiple || undefined}
        aria-describedby={props.describedBy}
        aria-errormessage={props.errorMessage}
        aria-invalid={props.invalid || undefined}
      >
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
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const options = buildTreeOptionMetaList(
    props.props.options,
    getTreeOptionConfig(props.props as InputTreeSchema),
  );
  const sourceError = getSourceErrorMessage(optionsSourceState);
  const searchLabel = `${t('flux.common.search')} ${String((props.props.label ?? name) || 'tree')}`;
  const sourceErrorId = name ? `${name}-source-error` : undefined;

  return (
    <div
      className={props.meta.className}
      data-slot="input-tree-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
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
          searchLabel={searchLabel}
          describedBy={sourceError ? sourceErrorId : undefined}
          errorMessage={sourceError ? sourceErrorId : undefined}
          invalid={Boolean(sourceError)}
        />
      </div>
      {sourceError ? (
        <span id={sourceErrorId} data-slot="input-tree-source-error" role="alert">
          {sourceError}
        </span>
      ) : optionsSourceState?.loading === true ? (
        <span data-slot="input-tree-source-loading" role="status" aria-live="polite">
          {t('flux.common.loading')}
        </span>
      ) : null}
    </div>
  );
}

function TreeSelectRenderer(props: RendererComponentProps<TreeSelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
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

  return (
    <div
      className={props.meta.className}
      data-slot="tree-select-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
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
            searchLabel={searchLabel}
            describedBy={sourceError ? sourceErrorId : undefined}
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
        <span data-slot="tree-select-source-loading" role="status" aria-live="polite">
          {t('flux.common.loading')}
        </span>
      ) : null}
    </div>
  );
}

export const treeControlRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-tree',
    fields: [
      formLabelFieldRule,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputTreeRenderer,
  },
  {
    type: 'tree-select',
    fields: [
      formLabelFieldRule,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: TreeSelectRenderer,
  },
];
