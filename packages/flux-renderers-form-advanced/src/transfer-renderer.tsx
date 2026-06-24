import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, Input, Empty } from '@nop-chaos/ui';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import type { TransferSchema } from './composite-field/composite-schemas.js';
import { normalizeOptions, type NormalizedOption } from './option-normalize.js';
import {
  formFieldRules,
  shouldValidateOn,
  useFieldPresentation,
} from '@nop-chaos/flux-renderers-form';
import { useCurrentValidationScope } from '@nop-chaos/flux-react';

interface SelectedEntry {
  value: string | number | boolean;
  label: string;
}

const EMPTY_VALUES: unknown[] = [];

function toArrayValue(value: unknown): (string | number | boolean)[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string | number | boolean =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    );
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [value];
  }
  return [];
}

function buildSelectedEntries(
  selectedValues: (string | number | boolean)[],
  options: NormalizedOption[],
): SelectedEntry[] {
  return selectedValues.map((value) => {
    const match = options.find((option) => option.value === value);
    return {
      value,
      label: match ? match.label : typeof value === 'string' ? value : String(value),
    };
  });
}

export function TransferRenderer(props: RendererComponentProps<TransferSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const validationOwner = useCurrentValidationScope();
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const multiple = props.props.multiple !== false;
  const searchable = props.props.searchOnly === true ? true : props.props.searchable === true;
  const valueKey = typeof props.props.valueKey === 'string' ? props.props.valueKey : undefined;
  const labelKey = typeof props.props.labelKey === 'string' ? props.props.labelKey : undefined;
  const searchPlaceholder = typeof props.props.searchPlaceholder === 'string' ? props.props.searchPlaceholder : '';

  const presentation = useFieldPresentation(name, validationOwner, {
    disabled: props.props.disabled === true,
    required: props.props.required === true,
    readOnly: props.props.readOnly === true,
  });

  const formValue = useCurrentFormState(
    (state) => (currentForm && hasName ? (name ? getIn(state.values, name) : state.values) : undefined),
    Object.is,
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) =>
      currentForm || !hasName ? undefined : name ? getIn(scopeData, name) : scopeData,
    Object.is,
    { enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const rawFieldValue = React.useMemo(
    () =>
      (currentForm ? formValue : scopeValue) ?? (multiple ? EMPTY_VALUES : undefined),
    [currentForm, formValue, scopeValue, multiple],
  );

  const options = React.useMemo(
    () => normalizeOptions(props.props.options, valueKey, labelKey),
    [props.props.options, valueKey, labelKey],
  );

  const selectedValues = React.useMemo(() => toArrayValue(rawFieldValue), [rawFieldValue]);
  const selectedSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedEntries = React.useMemo(
    () => buildSelectedEntries(selectedValues, options),
    [selectedValues, options],
  );

  const candidateOptions = React.useMemo(
    () => options.filter((option) => !selectedSet.has(option.value)),
    [options, selectedSet],
  );

  const [candidateQuery, setCandidateQuery] = React.useState('');
  const [selectedQuery, setSelectedQuery] = React.useState('');
  const [candidateChecked, setCandidateChecked] = React.useState<Set<string | number | boolean>>(new Set());
  const [selectedChecked, setSelectedChecked] = React.useState<Set<string | number | boolean>>(new Set());

  const filteredCandidates = React.useMemo(() => {
    if (!searchable || candidateQuery.trim() === '') {
      return candidateOptions;
    }
    const q = candidateQuery.trim().toLowerCase();
    return candidateOptions.filter((option) => option.label.toLowerCase().includes(q));
  }, [candidateOptions, candidateQuery, searchable]);

  const filteredSelected = React.useMemo(() => {
    if (!searchable || selectedQuery.trim() === '') {
      return selectedEntries;
    }
    const q = selectedQuery.trim().toLowerCase();
    return selectedEntries.filter((entry) => entry.label.toLowerCase().includes(q));
  }, [selectedEntries, selectedQuery, searchable]);

  const writeValue = React.useCallback(
    (next: unknown) => {
      if (currentForm && name) {
        if (!currentForm.isTouched(name)) {
          currentForm.touchField(name);
        }
        currentForm.setValue(name, next);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
        return;
      }
      scope.update(name, next);
    },
    [currentForm, name, scope],
  );

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;

  const toggleCandidate = React.useCallback(
    (value: string | number | boolean) => {
      setCandidateChecked((current) => {
        const next = new Set(current);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      });
    },
    [],
  );

  const toggleSelected = React.useCallback((value: string | number | boolean) => {
    setSelectedChecked((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const moveToSelected = React.useCallback(() => {
    if (interactionDisabled || candidateChecked.size === 0) {
      return;
    }
    const additions = options
      .filter((option) => candidateChecked.has(option.value))
      .map((option) => option.value);
    if (additions.length === 0) {
      return;
    }
    if (multiple) {
      const next = [...selectedValues];
      for (const value of additions) {
        if (!next.includes(value)) {
          next.push(value);
        }
      }
      writeValue(next);
    } else {
      writeValue(additions[0]);
    }
    setCandidateChecked(new Set());
    void props.events.onAdd?.();
    void props.events.onChange?.();
  }, [candidateChecked, interactionDisabled, multiple, options, props.events, selectedValues, writeValue]);

  const removeFromSelected = React.useCallback(() => {
    if (interactionDisabled || selectedChecked.size === 0) {
      return;
    }
    if (multiple) {
      const next = selectedValues.filter((value) => !selectedChecked.has(value));
      writeValue(next);
    } else {
      writeValue(undefined);
    }
    setSelectedChecked(new Set());
    void props.events.onRemove?.();
    void props.events.onChange?.();
  }, [interactionDisabled, multiple, props.events, selectedChecked, selectedValues, writeValue]);

  if (!props.meta.visible) {
    return null;
  }

  return (
    <div
      className={cn('nop-transfer', 'grid grid-cols-[1fr_auto_1fr] items-stretch gap-3', props.meta.className)}
      data-slot="field-control"
    >
      <TransferPane
        kind="candidate"
        title={t('flux.transfer.candidates', { defaultValue: 'Candidates' })}
        options={filteredCandidates}
        checked={candidateChecked}
        onToggle={toggleCandidate}
        searchable={searchable}
        query={candidateQuery}
        onQueryChange={setCandidateQuery}
        searchPlaceholder={searchPlaceholder || t('flux.transfer.search', { defaultValue: 'Search' })}
        interactionDisabled={interactionDisabled}
        emptyText={t('flux.transfer.noCandidates', { defaultValue: 'No candidates' })}
      />

      <div className="flex flex-col items-center justify-center gap-2" data-slot="transfer-actions">
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-slot="transfer-select"
          disabled={interactionDisabled || candidateChecked.size === 0}
          aria-label={t('flux.transfer.select', { defaultValue: 'Select' })}
          onClick={moveToSelected}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-slot="transfer-deselect"
          disabled={interactionDisabled || selectedChecked.size === 0}
          aria-label={t('flux.transfer.deselect', { defaultValue: 'Deselect' })}
          onClick={removeFromSelected}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>

      <TransferPane
        kind="selected"
        title={t('flux.transfer.selected', { defaultValue: 'Selected' })}
        options={filteredSelected.map((entry) => ({
          label: entry.label,
          value: entry.value,
          raw: entry.value,
        }))}
        checked={selectedChecked}
        onToggle={toggleSelected}
        searchable={searchable}
        query={selectedQuery}
        onQueryChange={setSelectedQuery}
        searchPlaceholder={searchPlaceholder || t('flux.transfer.search', { defaultValue: 'Search' })}
        interactionDisabled={interactionDisabled}
        emptyText={t('flux.transfer.noSelection', { defaultValue: 'No selection' })}
      />

      <input
        type="hidden"
        data-testid="transfer-value"
        value={JSON.stringify(multiple ? selectedValues : selectedValues[0] ?? '')}
        readOnly
      />
    </div>
  );
}

interface TransferPaneProps {
  kind: 'candidate' | 'selected';
  title: string;
  options: NormalizedOption[];
  checked: Set<string | number | boolean>;
  onToggle: (value: string | number | boolean) => void;
  searchable: boolean;
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder: string;
  interactionDisabled: boolean;
  emptyText: string;
}

function TransferPane(props: TransferPaneProps) {
  const paneMarker = props.kind === 'candidate' ? 'nop-transfer__candidate' : 'nop-transfer__selected';
  return (
    <div
      className={cn(paneMarker, 'flex flex-col rounded-lg border border-border bg-card')}
      data-slot={`transfer-pane-${props.kind}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium">{props.title}</span>
        <span className="text-xs text-muted-foreground">{props.options.length}</span>
      </div>
      {props.searchable && (
        <div className="border-b border-border px-2 py-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={props.query}
              placeholder={props.searchPlaceholder}
              className="pl-8"
              onChange={(event) => props.onQueryChange(event.target.value)}
            />
          </div>
        </div>
      )}
      <div className="max-h-64 min-h-24 overflow-y-auto p-1">
        {props.options.length === 0 ? (
          <Empty className="p-4 text-sm text-muted-foreground">{props.emptyText}</Empty>
        ) : (
          <ul className="flex flex-col" role="listbox" aria-multiselectable="true">
            {props.options.map((option) => {
              const isChecked = props.checked.has(option.value);
              return (
                <li key={String(option.value)}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent',
                      props.interactionDisabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={props.interactionDisabled || option.disabled}
                      onChange={() => props.onToggle(option.value)}
                      data-slot={`transfer-option-${props.kind}`}
                      aria-label={option.label}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export const transferRendererDefinition: RendererDefinition = {
  type: 'transfer',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: TransferRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'options', kind: 'prop' },
    { key: 'multiple', kind: 'prop', valueType: 'boolean' },
    { key: 'valueKey', kind: 'prop' },
    { key: 'labelKey', kind: 'prop' },
    { key: 'searchable', kind: 'prop', valueType: 'boolean' },
    { key: 'searchPlaceholder', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'onAdd', kind: 'event' },
    { key: 'onRemove', kind: 'event' },
    { key: 'onChange', kind: 'event' },
  ],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const rules: ValidationRule[] = [];
      if (schema.required === true || schema.required === 'true') {
        rules.push({
          kind: 'required',
          message: `${schema.label ?? schema.name ?? 'Field'} is required`,
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
