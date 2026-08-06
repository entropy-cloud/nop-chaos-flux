import React from 'react';
import type {
  ActionSchema,
  BaseSchema,
  CompiledRuntimeValue,
  RendererComponentProps,
  RendererDefinition,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn, isRecord } from '@nop-chaos/flux-core';
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
import { Button, cn } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';
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
import {
  normalizeFieldValues,
  getOptionLabelMap,
  type PickerValue,
  extractRowsFromActionResult,
  mapSelectionRows,
  selectionToRowKeys,
  rowToRecord,
  createPickerCrudSchema,
} from './picker-helpers.js';
import { PickerDropdown } from './picker-dropdown.js';

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
  // Instance-unique key for the CRUD-mode `$_picker.*` selection/data state
  // paths. Repeated instances of the same template node (combo item / input
  // table row / CRUD row) share `props.id`; keying by the mounted cid keeps
  // each instance's dialog selection isolated (bug 73 pattern: row-scope
  // pollution — two rows opening their dialogs must not clobber each other).
  const pickerStateKey = props.meta.cid != null ? String(props.meta.cid) : props.id;
  const crudSelection = useScopeSelector(
    (scopeData) => {
      const raw = getIn(scopeData, `$_picker.${pickerStateKey}.selection`);
      return Array.isArray(raw) ? raw : [];
    },
    (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => v === b[i]),
    {
      enabled: crudMode,
      fallback: [],
      paths: crudMode ? [`$_picker.${pickerStateKey}.selection`] : undefined,
    },
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
        if (result.ok && !result.cancelled) {
          const rows = extractRowsFromActionResult(result.data);
          const rowMap = mapSelectionRows({ rows, valueKey, labelKey });
          cacheLabelsForValues(rowMap);
        } else {
          // Failed/cancelled dispatch: clear the request marker so the same
          // value can be retried on a later trigger (re-open / external value
          // change). A sticky marker would otherwise skip re-resolution forever.
          labelResolveRequestedRef.current = null;
        }
      })
      .catch(() => {
        labelResolveRequestedRef.current = null;
      });
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

  const handleSetPending = React.useCallback((values: PickerValue[]) => {
    setPending(new Set(values));
  }, []);

  const pickerCrudSchema = React.useMemo(
    () =>
      createPickerCrudSchema({
        pickerId: pickerStateKey,
        loadAction,
        options,
        columns: schemaProps.columns,
        searchable,
        valueKey,
        labelKey,
        multiple,
      }),
    [labelKey, loadAction, multiple, options, pickerStateKey, schemaProps.columns, searchable, valueKey],
  );

  React.useEffect(() => {
    if (!open || !crudMode) {
      return;
    }
    scope?.update(`$_picker.${pickerStateKey}.selection`, selectionToRowKeys(selectedValues));
  }, [crudMode, open, pickerStateKey, scope, selectedValues]);

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
    const rawSelection = scope?.get?.(`$_picker.${pickerStateKey}.selection`);
    const selectedKeys = Array.isArray(rawSelection)
      ? rawSelection.map((value) => String(value))
      : [];
    const loadedRows = extractRowsFromActionResult(scope?.get?.(`$_picker.${pickerStateKey}.rows`));
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
    pickerStateKey,
    props.events,
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

  const crudContent = crudMode && open
    ? (props.helpers.render(pickerCrudSchema, { pathSuffix: 'pickerCrud' }) as React.ReactNode)
    : null;
  const confirmDisabled = crudMode ? !multiple && crudSelection.length === 0 : !multiple && pending.size === 0;
  const confirmSelection = crudMode ? confirmCrudSelection : confirmListSelection;

  return (
    <div className={cn('nop-picker', 'flex items-center gap-2', props.meta.className)}>
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

      <PickerDropdown
        open={open}
        onOpenChange={setOpen}
        dialogSize={dialogSize}
        dialogTitle={dialogTitle}
        crudMode={crudMode}
        crudContent={crudContent}
        query={query}
        onQueryChange={setQuery}
        filteredOptions={filteredOptions}
        pending={pending}
        multiple={multiple}
        onTogglePending={togglePending}
        onSetPending={handleSetPending}
        confirmDisabled={confirmDisabled}
        onConfirm={confirmSelection}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

export const pickerRendererDefinition: RendererDefinition = {
  type: 'picker',
  displayName: 'Picker',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: PickerRenderer,
  wrap: true,
  propContracts: {
    loadAction: {
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      displayName: 'Load Action',
      description:
        'On-demand option load action (ActionSchema). Template-preserved; ${query} evaluated at dispatch.',
    },
    labelResolveAction: {
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      displayName: 'Label Resolve Action',
      description:
        'Action that resolves stored values into display labels (ActionSchema). Template-preserved.',
    },
  },
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'options', kind: 'prop' },
    { key: 'loadAction', kind: 'prop' },
    { key: 'labelResolveAction', kind: 'prop' },
    { key: 'valueKey', kind: 'prop' },
    { key: 'labelKey', kind: 'prop' },
    { key: 'columns', kind: 'prop' },
    { key: 'searchable', kind: 'prop', valueType: 'boolean' },
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
