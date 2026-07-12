import React from 'react';
import type {
  ActionSchema,
  BaseSchema,
  CompiledRuntimeValue,
  ReactiveActionSchema,
  RendererComponentProps,
  RendererDefinition,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn, isRecord, toRecord } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormState,
  useInputComponentHandle,
  useRenderScope,
  useRendererEnv,
  useSchemaProps,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Checkbox, cn, Empty, Input, Label, RadioGroup, RadioGroupItem } from '@nop-chaos/ui';
import { SearchIcon, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nop-chaos/ui';
import type { CrudColumnSchema, CrudSchema } from '@nop-chaos/flux-renderers-data';
import type { PickerSchema } from './composite-field/composite-schemas.js';
import {
  normalizeOptions,
  resolveSelectedLabel,
  type NormalizedOption,
} from './option-normalize.js';
import {
  formFieldRules,
  shouldValidateOn,
  useFieldPresentation,
} from '@nop-chaos/flux-renderers-form';
import { useCurrentValidationScope } from '@nop-chaos/flux-react';

type PickerValue = string | number | boolean;

function normalizeFieldValues(rawFieldValue: unknown, valueKey?: string): PickerValue[] {
  if (isRecord(rawFieldValue) && valueKey) {
    const v = rawFieldValue[valueKey];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return [v];
    }
  }
  if (Array.isArray(rawFieldValue)) {
    const result: PickerValue[] = [];
    for (const item of rawFieldValue) {
      if (isRecord(item) && valueKey) {
        const v = item[valueKey];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          result.push(v);
          continue;
        }
      }
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        result.push(item);
      }
    }
    return result;
  }
  if (rawFieldValue === undefined || rawFieldValue === null || rawFieldValue === '') {
    return [];
  }
  if (
    typeof rawFieldValue === 'string' ||
    typeof rawFieldValue === 'number' ||
    typeof rawFieldValue === 'boolean'
  ) {
    return [rawFieldValue];
  }
  return [];
}

function getOptionLabelMap(options: NormalizedOption[]): Map<PickerValue, string> {
  return new Map(options.map((o) => [o.value, o.label]));
}

function extractRowsFromActionResult(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((item) => toRecord(item));
  }
  const record = toRecord(value);
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.rows)
      ? record.rows
      : Array.isArray(record.records)
        ? record.records
        : Array.isArray(record.list)
          ? record.list
          : [];
  return items.filter(isRecord).map((item) => toRecord(item));
}

function extractDisplayValue(row: Record<string, unknown>, key: string | undefined, fallback: unknown): string {
  const raw = key ? row[key] : fallback;
  if (raw === undefined || raw === null) {
    return '';
  }
  return String(raw);
}

function mapSelectionRows(args: {
  rows: Record<string, unknown>[];
  valueKey: string | undefined;
  labelKey: string | undefined;
}): Map<PickerValue, { label: string; row: Record<string, unknown> }> {
  const result = new Map<PickerValue, { label: string; row: Record<string, unknown> }>();
  for (const row of args.rows) {
    const candidate = args.valueKey ? row[args.valueKey] : row.value;
    if (
      typeof candidate !== 'string' &&
      typeof candidate !== 'number' &&
      typeof candidate !== 'boolean'
    ) {
      continue;
    }
    result.set(candidate, {
      label: extractDisplayValue(row, args.labelKey, candidate),
      row,
    });
  }
  return result;
}

function selectionToRowKeys(values: PickerValue[]): string[] {
  return values.map((value) => String(value));
}

function rowToRecord(option: NormalizedOption): Record<string, unknown> {
  if (isRecord(option.raw)) {
    return toRecord(option.raw);
  }
  return { value: option.value, label: option.label };
}

function inferColumns(options: NormalizedOption[]): CrudColumnSchema[] {
  if (options.length === 0) {
    return [{ name: 'label', label: 'Label' }];
  }

  const firstRecord = isRecord(options[0].raw) ? toRecord(options[0].raw) : undefined;
  if (!firstRecord) {
    return [{ name: 'label', label: 'Label' }];
  }

  return Object.keys(firstRecord)
    .filter((key) => typeof firstRecord[key] !== 'object')
    .map((key) => ({ name: key, label: key }));
}

function createNormalizedPickerSource(options: NormalizedOption[]): CrudSchema['source'] {
  const items = options.map((option) => rowToRecord(option));
  return { items, total: items.length } as unknown as CrudSchema['source'];
}

function createPickerCrudSchema(args: {
  pickerId: string;
  loadAction: ActionSchema | ActionSchema[] | undefined;
  options: NormalizedOption[];
  columns: CrudColumnSchema[] | undefined;
  searchable: boolean;
  valueKey: string | undefined;
  labelKey: string | undefined;
  multiple: boolean;
}): CrudSchema {
  const normalizedSource = createNormalizedPickerSource(args.options);

  return {
    type: 'crud',
    id: `${args.pickerId}-picker-crud`,
    loadAction: args.loadAction as ReactiveActionSchema | undefined,
    source: args.loadAction ? undefined : normalizedSource,
    rowKey: args.valueKey ?? 'value',
    loadAllData: false,
    columns: args.columns && args.columns.length > 0 ? args.columns : inferColumns(args.options),
    queryForm: args.searchable
      ? {
          body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
        }
      : undefined,
    selection: {
      type: args.multiple ? 'checkbox' : 'radio',
      keepOnPageChange: true,
    },
    selectionOwnership: 'scope',
    selectionStatePath: `$_picker.${args.pickerId}.selection`,
    dataStatePath: `$_picker.${args.pickerId}.rows`,
    autoClearSelectionOnRefresh: false,
  };
}

export function PickerRenderer(props: RendererComponentProps<PickerSchema>) {
  const schemaProps = useSchemaProps(props) as PickerSchema;
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const validationOwner = useCurrentValidationScope();
  const env = useRendererEnv();
  const name = String(schemaProps.name ?? '');
  const hasName = name.length > 0;
  const multiple = schemaProps.multiple === true;
  const valueKey = typeof schemaProps.valueKey === 'string' ? schemaProps.valueKey : undefined;
  const labelKey = typeof schemaProps.labelKey === 'string' ? schemaProps.labelKey : undefined;
  const pickerDialog = schemaProps.pickerDialog;
  const hasPickerDialog = pickerDialog !== undefined && pickerDialog !== false;
  const dialogConfig = (hasPickerDialog && typeof pickerDialog === 'object' ? pickerDialog : {}) as {
    title?: string;
    size?: 'sm' | 'default' | 'lg' | 'xl';
  };
  const dialogTitle = dialogConfig.title ?? t('flux.picker.select', { defaultValue: 'Select' });

  const loadAction = schemaProps.loadAction;
  const crudMode = Boolean(loadAction);
  const dialogSize = dialogConfig.size ?? (crudMode ? 'xl' : 'default');

  const presentation = useFieldPresentation(name, validationOwner, {
    disabled: schemaProps.disabled === true,
    required: schemaProps.required === true,
    readOnly: schemaProps.readOnly === true,
  });

  const formValue = useCurrentFormState(
    (state) => (currentForm && hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (currentForm || !hasName ? undefined : getIn(scopeData, name)),
    Object.is,
    { enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const rawFieldValue = currentForm ? formValue : scopeValue;
  const crudSelection = useScopeSelector(
    (scopeData) => {
      const raw = getIn(scopeData, `$_picker.${props.id}.selection`);
      return Array.isArray(raw) ? raw : [];
    },
    (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => v === b[i]),
    { enabled: crudMode, fallback: [], paths: crudMode ? [`$_picker.${props.id}.selection`] : undefined },
  );

  const options = React.useMemo<NormalizedOption[]>(
    () => normalizeOptions(schemaProps.options, valueKey, labelKey),
    [schemaProps.options, valueKey, labelKey],
  );
  const selectedValues = React.useMemo(
    () => normalizeFieldValues(rawFieldValue, valueKey),
    [rawFieldValue, valueKey],
  );
  const optionLabelMap = React.useMemo(() => getOptionLabelMap(options), [options]);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [pending, setPending] = React.useState<Set<PickerValue>>(() => new Set());
  const [resolvedLabelCache, setResolvedLabelCache] = React.useState<Record<string, string>>({});
  const [selectionRows, setSelectionRows] = React.useState<
    Map<PickerValue, { label: string; row: Record<string, unknown> }>
  >(() => new Map());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelResolveRequestedRef = React.useRef<string | null>(null);

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;
  const labelResolveAction = schemaProps.labelResolveAction;
  const searchable = schemaProps.searchable !== false;
  const autoFillProgram = props.templateNode.structuralFields?.autoFill as
    | CompiledRuntimeValue<Record<string, unknown>>
    | undefined;

  const selectedLabel = React.useMemo(() => {
    if (!multiple && isRecord(rawFieldValue) && labelKey) {
      const rawLabel = rawFieldValue[labelKey];
      if (typeof rawLabel === 'string' || typeof rawLabel === 'number') {
        return String(rawLabel);
      }
    }
    if (multiple && Array.isArray(rawFieldValue)) {
      const rawLabels = rawFieldValue
        .filter(isRecord)
        .map((item) => item[labelKey ?? 'name'])
        .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
        .map(String);
      if (rawLabels.length > 0) return rawLabels.join(', ');
    }
    const cachedValues = selectedValues.map(
      (value) => resolvedLabelCache[String(value)] ?? optionLabelMap.get(value),
    );
    if (cachedValues.some((value) => value)) {
      const labels = cachedValues.filter((value): value is string => Boolean(value));
      return labels.length > 0
        ? labels.join(', ')
        : resolveSelectedLabel(
            multiple ? selectedValues : selectedValues[0],
            options,
            t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
          );
    }
    return resolveSelectedLabel(
      multiple ? selectedValues : selectedValues[0],
      options,
      t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
    );
  }, [labelKey, multiple, optionLabelMap, options, rawFieldValue, resolvedLabelCache, selectedValues]);

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

  const applyAutoFill = React.useCallback(
    (row: Record<string, unknown> | undefined) => {
      if (!currentForm || !autoFillProgram || !row) {
        return;
      }
      const resolved = props.helpers.evaluateCompiled(
        autoFillProgram,
        props.helpers.createScope({ row }),
      ) as Record<string, unknown>;
      for (const [targetPath, value] of Object.entries(resolved)) {
        currentForm.setValue(targetPath, value);
      }
    },
    [autoFillProgram, currentForm, props.helpers],
  );

  const cacheLabelsForValues = React.useCallback(
    (entries: Map<PickerValue, { label: string; row: Record<string, unknown> }>) => {
      setSelectionRows((current) => new Map([...current, ...entries]));
      setResolvedLabelCache((current) => {
        const next = { ...current };
        for (const [value, entry] of entries.entries()) {
          next[String(value)] = entry.label;
        }
        return next;
      });
    },
    [],
  );

  React.useEffect(() => {
    const resolver = labelResolveAction ?? loadAction;
    if (!resolver || selectedValues.length === 0) {
      return;
    }
    const uncached = selectedValues.filter(
      (value) => !resolvedLabelCache[String(value)] && !optionLabelMap.get(value),
    );
    if (uncached.length === 0) {
      return;
    }
    const requestKey = JSON.stringify(uncached);
    if (labelResolveRequestedRef.current === requestKey) {
      return;
    }
    labelResolveRequestedRef.current = requestKey;
    void props.helpers
      .dispatch(resolver as ActionSchema, {
        scope,
        evaluationBindings: {
          value: multiple ? uncached : uncached[0],
          values: uncached,
        },
      })
      .then((result) => {
        if (!result.ok || result.cancelled) {
          return;
        }
        const rows = extractRowsFromActionResult(result.data);
        const rowMap = mapSelectionRows({ rows, valueKey, labelKey });
        cacheLabelsForValues(rowMap);
      })
      .catch(() => undefined);
  }, [
    cacheLabelsForValues,
    labelKey,
    labelResolveAction,
    loadAction,
    multiple,
    optionLabelMap,
    props.helpers,
    resolvedLabelCache,
    scope,
    selectedValues,
    valueKey,
  ]);

  const filteredOptions = React.useMemo(() => {
    if (query.trim() === '') {
      return options;
    }
    const q = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const togglePending = React.useCallback((value: PickerValue) => {
    setPending((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const pickerCrudSchema = React.useMemo(
    () =>
      createPickerCrudSchema({
        pickerId: props.id,
        loadAction,
        options,
        columns: schemaProps.columns,
        searchable,
        valueKey,
        labelKey,
        multiple,
      }),
    [labelKey, loadAction, multiple, options, props.id, schemaProps.columns, searchable, valueKey],
  );

  React.useEffect(() => {
    if (!open || !crudMode) {
      return;
    }
    scope?.update(`$_picker.${props.id}.selection`, selectionToRowKeys(selectedValues));
  }, [crudMode, open, props.id, scope, selectedValues]);

  const openDialog = React.useCallback(() => {
    if (!hasPickerDialog && options.length === 0 && !crudMode) {
      env?.notify?.('warning', t('flux.picker.configMissing', { defaultValue: 'Picker dialog is not configured' }));
      return;
    }
    if (!crudMode) {
      // G1: seed pending with the current value so single-select opens with the
      // current selection pre-highlighted, and an empty Confirm never silently
      // clears the field.
      setPending(new Set(multiple ? selectedValues : selectedValues.slice(0, 1)));
      setQuery('');
    }
    setOpen(true);
  }, [crudMode, env, hasPickerDialog, multiple, options.length, selectedValues]);

  const clearValue = React.useCallback(() => {
    if (interactionDisabled) {
      return;
    }
    writeValue(multiple ? [] : undefined);
    void props.events.onPick?.();
  }, [interactionDisabled, multiple, props.events, writeValue]);

  const confirmListSelection = React.useCallback(() => {
    const chosen = Array.from(pending);
    const rows = new Map<PickerValue, { label: string; row: Record<string, unknown> }>();
    for (const value of chosen) {
      const optionMatch = options.find((option) => option.value === value);
      if (optionMatch) {
        rows.set(value, { label: optionMatch.label, row: rowToRecord(optionMatch) });
      }
    }
    cacheLabelsForValues(rows);
    const first = rows.values().next().value as { row: Record<string, unknown> } | undefined;
    applyAutoFill(first?.row);
    writeValue(multiple ? chosen : chosen[chosen.length - 1]);
    setOpen(false);
    void props.events.onPick?.();
  }, [applyAutoFill, cacheLabelsForValues, multiple, options, pending, props.events, writeValue]);

  const confirmCrudSelection = React.useCallback(() => {
    const rawSelection = scope?.get?.(`$_picker.${props.id}.selection`);
    const selectedKeys = Array.isArray(rawSelection)
      ? rawSelection.map((value) => String(value))
      : [];
    const loadedRows = extractRowsFromActionResult(scope?.get?.(`$_picker.${props.id}.rows`));
    const loadedRowMap = mapSelectionRows({ rows: loadedRows, valueKey, labelKey });
    const rows = new Map<PickerValue, { label: string; row: Record<string, unknown> }>(selectionRows);
    const nextValues: PickerValue[] = [];

    for (const key of selectedKeys) {
      const optionMatch = options.find((option) => String(option.value) === key);
      if (optionMatch) {
        nextValues.push(optionMatch.value);
        rows.set(optionMatch.value, {
          label: optionMatch.label,
          row: rowToRecord(optionMatch),
        });
        continue;
      }
      const cached = Array.from(selectionRows.entries()).find(([value]) => String(value) === key);
      if (cached) {
        nextValues.push(cached[0]);
        rows.set(cached[0], cached[1]);
        continue;
      }
      const loaded = Array.from(loadedRowMap.entries()).find(
        ([value]) => String(value) === key,
      );
      if (loaded) {
        nextValues.push(loaded[0]);
        rows.set(loaded[0], loaded[1]);
        continue;
      }
      nextValues.push(key as PickerValue);
    }

    const finalValues = multiple ? nextValues : nextValues.slice(0, 1);
    cacheLabelsForValues(rows);
    const firstSelected = finalValues.length > 0
      ? rows.get(finalValues[0])?.row
      : undefined;
    applyAutoFill(firstSelected);
    writeValue(multiple ? finalValues : finalValues[0]);
    setOpen(false);
    void props.events.onPick?.();
  }, [
    applyAutoFill,
    cacheLabelsForValues,
    labelKey,
    multiple,
    options,
    props.events,
    props.id,
    scope,
    selectionRows,
    valueKey,
    writeValue,
  ]);

  useInputComponentHandle({
    id: props.id,
    name: name || undefined,
    type: 'picker',
    cid: props.meta.cid,
    methods: ['open', 'clear'],
    getFocusTarget: () => triggerRef.current,
    isInteractive: () => !interactionDisabled,
    isVisible: () => props.meta.visible,
    openMenu: openDialog,
    clearValue,
  });

  if (!props.meta.visible) {
    return null;
  }

  const confirmSelection = crudMode ? confirmCrudSelection : confirmListSelection;

  return (
    <div className={cn('nop-picker', 'flex items-center gap-2', props.meta.className)} data-slot="field-control">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        data-slot="picker-trigger"
        disabled={interactionDisabled}
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate" data-testid="picker-selected-label" data-slot="picker-selected-label">
          {selectedLabel}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="picker-clear"
        disabled={interactionDisabled || selectedValues.length === 0}
        aria-label={t('flux.picker.clear', { defaultValue: 'Clear selection' })}
        onClick={clearValue}
      >
        <XIcon className="size-4" />
      </Button>
      <input
        type="hidden"
        data-testid="picker-value"
        value={JSON.stringify(multiple ? selectedValues : selectedValues[0] ?? '')}
        readOnly
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-slot="picker-dialog-content" size={dialogSize}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2">
            {crudMode
              ? open
                ? (props.helpers.render(pickerCrudSchema, { pathSuffix: 'pickerCrud' }) as React.ReactNode)
                : null
              : (
                  <>
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        value={query}
                        placeholder={t('flux.picker.search', { defaultValue: 'Search' })}
                        style={{ paddingLeft: '2rem' }}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <div className="max-h-72 min-h-32 overflow-y-auto rounded border border-border">
                      {filteredOptions.length === 0 ? (
                        <Empty className="p-4 text-sm text-muted-foreground">
                          {t('flux.picker.noCandidates', { defaultValue: 'No candidates' })}
                        </Empty>
                      ) : multiple ? (
                        <ul role="listbox" aria-multiselectable="true">
                          {filteredOptions.map((option) => {
                            const checked = pending.has(option.value);
                            return (
                              <li key={String(option.value)}>
                                <Label
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-accent',
                                    option.disabled && 'cursor-not-allowed opacity-60',
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={option.disabled}
                                    onCheckedChange={() => togglePending(option.value)}
                                    data-slot="picker-option"
                                  />
                                  <span className="truncate">{option.label}</span>
                                </Label>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <RadioGroup
                          value={String(Array.from(pending).pop() ?? '')}
                          onValueChange={(v) => {
                            const match = filteredOptions.find((o) => String(o.value) === v);
                            setPending(new Set(match ? [match.value] : []));
                          }}
                          className="flex flex-col"
                        >
                          {filteredOptions.map((option) => (
                            <Label
                              key={String(option.value)}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-accent',
                                option.disabled && 'cursor-not-allowed opacity-60',
                              )}
                            >
                              <RadioGroupItem
                                value={String(option.value)}
                                disabled={option.disabled}
                                data-slot="picker-option"
                              />
                              <span className="truncate">{option.label}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  </>
                )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('flux.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" size="sm" data-slot="picker-confirm" disabled={crudMode ? !multiple && crudSelection.length === 0 : !multiple && pending.size === 0} onClick={confirmSelection}>
              {t('flux.common.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const pickerRendererDefinition: RendererDefinition = {
  type: 'picker',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: PickerRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'options', kind: 'prop' },
    { key: 'loadAction', kind: 'prop' },
    { key: 'labelResolveAction', kind: 'prop' },
    { key: 'valueKey', kind: 'prop' },
    { key: 'labelKey', kind: 'prop' },
    { key: 'columns', kind: 'prop' },
    { key: 'searchable', kind: 'prop' },
    { key: 'autoFill', kind: 'prop', lazyEval: true, params: ['row'] },
    { key: 'pickerDialog', kind: 'prop' },
    { key: 'multiple', kind: 'prop', valueType: 'boolean' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'onPick', kind: 'event' },
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
