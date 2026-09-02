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
  useCurrentValidationScope,
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
import {
  PickerContextProvider,
  type PickerContextValue,
} from './picker-context.js';
import {
  normalizeFieldValues,
  type PickerValue,
  extractRowsFromActionResult,
  mapSelectionRows,
  buildDefaultPickerSchema,
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
  const valueField = typeof schemaProps.valueField === 'string' ? schemaProps.valueField : undefined;
  const labelField = typeof schemaProps.labelField === 'string' ? schemaProps.labelField : undefined;
  const pickerPopupConfig = schemaProps.pickerPopup;
  const hasPickerPopup = pickerPopupConfig !== undefined && pickerPopupConfig !== false;
  const popupConfig = (hasPickerPopup && typeof pickerPopupConfig === 'object' ? pickerPopupConfig : {}) as {
    type?: 'dialog' | 'drawer' | 'popover';
    title?: string;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'full';
    placement?: 'left' | 'right' | 'top' | 'bottom';
    width?: string | number;
    height?: string | number;
    showMask?: boolean;
    confirmText?: string;
    cancelText?: string;
  };
  const surfaceType = popupConfig.type ?? 'dialog';
  const surfaceSize = popupConfig.size ?? 'default';
  const placement: 'left' | 'right' | 'top' | 'bottom' =
    popupConfig.placement ?? (surfaceType === 'drawer' ? 'right' : surfaceType === 'popover' ? 'bottom' : 'right');
  const popupTitle = popupConfig.title ?? t('flux.picker.select', { defaultValue: 'Select' });

  const loadAction = schemaProps.loadAction;
  const hasCustomSchema = schemaProps.pickerSchema !== undefined;

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
  // Instance-unique key for picker state. Repeated instances of the same
  // template node (combo item / input-table row / CRUD row) share props.id;
  // keying by mounted cid keeps each instance's picker context isolated
  // (bug 73 pattern: row-scope pollution — two rows must not clobber each
  // other).
  const pickerStateKey = props.meta.cid != null ? String(props.meta.cid) : props.id;

  const labelResolveAction = schemaProps.labelResolveAction;
  const autoFillProgram = props.templateNode.structuralFields?.autoFill as
    | CompiledRuntimeValue<Record<string, unknown>>
    | undefined;

  // Static options: synthesize from pickerSchema if it has a `source` array
  // (legacy v1 behaviour). v3 prefers user-supplied pickerSchema; this is a
  // fallback when pickerSchema is omitted and only a flat options list exists.
  const staticOptions = React.useMemo<NormalizedOption[]>(() => {
    const sourceSchema = schemaProps.pickerSchema as { source?: unknown } | undefined;
    if (Array.isArray(sourceSchema?.source)) {
      return normalizeOptions(sourceSchema?.source, valueField, labelField);
    }
    return [];
  }, [schemaProps.pickerSchema, valueField, labelField]);

  const selectedValues = React.useMemo(
    () => normalizeFieldValues(rawFieldValue, valueField),
    [rawFieldValue, valueField],
  );

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selection, setSelection] = React.useState<PickerValue[]>([]);
  const [selectionRows, setSelectionRows] = React.useState<
    Map<PickerValue, { label: string; row: Record<string, unknown> }>
  >(() => new Map());
  const [resolvedLabelCache, setResolvedLabelCache] = React.useState<Record<string, string>>({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelResolveRequestedRef = React.useRef<string | null>(null);

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;

  const applyAutoFill = React.useCallback(
    (row: Record<string, unknown> | undefined) => {
      if (!currentForm || !autoFillProgram || !row) {
        return;
      }
      const rowScope = props.helpers.createScope({ row });
      let resolved: Record<string, unknown>;
      try {
        resolved = props.helpers.evaluateCompiled(
          autoFillProgram,
          rowScope,
        ) as Record<string, unknown>;
      } finally {
        props.helpers.disposeScope(rowScope.id);
      }
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
      (value) => !resolvedLabelCache[String(value)] && !staticOptions.some((o) => o.value === value),
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
          const rowMap = mapSelectionRows({ rows, valueKey: valueField, labelKey: labelField });
          cacheLabelsForValues(rowMap);
        } else {
          labelResolveRequestedRef.current = null;
        }
      })
      .catch(() => {
        labelResolveRequestedRef.current = null;
      });
  }, [
    cacheLabelsForValues,
    labelField,
    labelResolveAction,
    loadAction,
    multiple,
    props.helpers,
    resolvedLabelCache,
    scope,
    selectedValues,
    staticOptions,
    valueField,
  ]);

  const filteredOptions = React.useMemo(() => {
    if (query.trim() === '') {
      return staticOptions;
    }
    const q = query.trim().toLowerCase();
    return staticOptions.filter((option) => option.label.toLowerCase().includes(q));
  }, [staticOptions, query]);

  const pickIntoContext = React.useCallback(
    (value: PickerValue, row?: Record<string, unknown>, label?: string) => {
      const v = String(value);
      setSelection((current) => {
        if (current.some((existing) => String(existing) === v)) {
          return multiple ? current : current.filter((x) => String(x) !== v);
        }
        return multiple ? [...current, value] : [value];
      });
      if (row) {
        const labelText = label ?? (labelField ? String(row[labelField] ?? '') : '');
        setSelectionRows((current) => {
          const next = new Map(current);
          next.set(value, { label: labelText, row });
          return next;
        });
        setResolvedLabelCache((current) => ({ ...current, [v]: labelText }));
      }
    },
    [labelField, multiple],
  );

  const unpickFromContext = React.useCallback(
    (value: PickerValue) => {
      const v = String(value);
      setSelection((current) => current.filter((existing) => String(existing) !== v));
      setSelectionRows((current) => {
        const next = new Map(current);
        next.delete(value);
        return next;
      });
    },
    [],
  );

  const clearPickerSelection = React.useCallback(() => {
    setSelection([]);
    setSelectionRows(new Map());
  }, []);

  const pickerContextValue = React.useMemo<PickerContextValue>(
    () => ({
      pickerId: pickerStateKey,
      multiple,
      selection,
      rows: selectionRows,
      pick: pickIntoContext,
      unpick: unpickFromContext,
      clear: clearPickerSelection,
    }),
    [clearPickerSelection, multiple, pickerStateKey, pickIntoContext, selection, selectionRows, unpickFromContext],
  );

  const defaultSchema = React.useMemo(
    () =>
      buildDefaultPickerSchema({
        pickerId: pickerStateKey,
        loadAction,
        multiple,
        valueField,
      }),
    [loadAction, multiple, pickerStateKey, valueField],
  );
  const schemaToRender = schemaProps.pickerSchema ?? defaultSchema;

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

  const selectedLabel = React.useMemo(() => {
    if (!multiple && isRecord(rawFieldValue) && labelField) {
      const rawLabel = rawFieldValue[labelField];
      if (typeof rawLabel === 'string' || typeof rawLabel === 'number') {
        return String(rawLabel);
      }
    }
    if (multiple && Array.isArray(rawFieldValue)) {
      const rawLabels = rawFieldValue
        .filter(isRecord)
        .map((item) => item[labelField ?? 'name'])
        .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number')
        .map(String);
      if (rawLabels.length > 0) return rawLabels.join(', ');
    }
    const cachedValues = selectedValues.map(
      (value) => resolvedLabelCache[String(value)] ?? staticOptions.find((o) => o.value === value)?.label,
    );
    if (cachedValues.some((value) => value)) {
      const labels = cachedValues.filter((value): value is string => Boolean(value));
      return labels.length > 0
        ? labels.join(', ')
        : resolveSelectedLabel(
            multiple ? selectedValues : selectedValues[0],
            staticOptions,
            t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
          );
    }
    return resolveSelectedLabel(
      multiple ? selectedValues : selectedValues[0],
      staticOptions,
      t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
    );
  }, [labelField, multiple, rawFieldValue, resolvedLabelCache, selectedValues, staticOptions]);

  const openDialog = React.useCallback(() => {
    if (!hasPickerPopup && !hasCustomSchema && staticOptions.length === 0) {
      env?.notify?.('warning', t('flux.picker.configMissing', { defaultValue: 'Picker dialog is not configured' }));
      return;
    }
    setSelection(selectedValues);
    setQuery('');
    setOpen(true);
  }, [env, hasCustomSchema, hasPickerPopup, selectedValues, staticOptions.length]);

  const clearValue = React.useCallback(() => {
    if (interactionDisabled) {
      return;
    }
    writeValue(schemaProps.resetValue ?? (multiple ? [] : undefined));
    clearPickerSelection();
    void props.events.onPick?.();
  }, [clearPickerSelection, interactionDisabled, multiple, props.events, schemaProps.resetValue, writeValue]);

  const confirmSelection = React.useCallback(() => {
    const rows = new Map(selectionRows);
    const finalValues = multiple ? selection : selection.slice(0, 1);
    cacheLabelsForValues(rows);
    const firstSelected = finalValues.length > 0
      ? rows.get(finalValues[0])?.row
      : undefined;
    applyAutoFill(firstSelected);
    writeValue(multiple ? finalValues : finalValues[0]);
    setOpen(false);
    void props.events.onPick?.();
  }, [applyAutoFill, cacheLabelsForValues, multiple, props.events, selection, selectionRows, writeValue]);

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

  const pickerContent = open
    ? (props.helpers.render(schemaToRender, { pathSuffix: 'pickerContent' }) as React.ReactNode)
    : null;
  const confirmDisabled = !multiple && selection.length === 0;

  const wrappedContent = open ? (
    <PickerContextProvider value={pickerContextValue}>{pickerContent}</PickerContextProvider>
  ) : null;

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
        surfaceType={surfaceType}
        surfaceSize={surfaceSize}
        placement={placement}
        width={popupConfig.width}
        height={popupConfig.height}
        showMask={popupConfig.showMask}
        title={popupTitle}
        crudMode={hasCustomSchema}
        crudContent={wrappedContent}
        query={query}
        onQueryChange={setQuery}
        filteredOptions={filteredOptions}
        pending={new Set(selection)}
        multiple={multiple}
        onTogglePending={pickIntoContext}
        onSetPending={(values) => {
          clearPickerSelection();
          for (const v of values) {
            pickIntoContext(v);
          }
        }}
        confirmDisabled={confirmDisabled}
        onConfirm={confirmSelection}
        onCancel={() => setOpen(false)}
        confirmText={popupConfig.confirmText}
        cancelText={popupConfig.cancelText}
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
    autoFill: {
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      displayName: 'Auto Fill',
      description: 'Auto-fill sibling form fields from selected row.',
    },
  },
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'pickerSchema', kind: 'prop' },
    { key: 'pickerPopup', kind: 'prop' },
    { key: 'valueField', kind: 'prop' },
    { key: 'labelField', kind: 'prop' },
    { key: 'labelTpl', kind: 'prop' },
    { key: 'delimiter', kind: 'prop' },
    { key: 'overflowConfig', kind: 'prop' },
    { key: 'itemClearable', kind: 'prop', valueType: 'boolean' },
    { key: 'onItemClick', kind: 'event' },
    { key: 'resetValue', kind: 'prop' },
    { key: 'multiple', kind: 'prop', valueType: 'boolean' },
    { key: 'clearable', kind: 'prop', valueType: 'boolean' },
    { key: 'joinValues', kind: 'prop', valueType: 'boolean' },
    { key: 'extractValue', kind: 'prop', valueType: 'boolean' },
    { key: 'embed', kind: 'prop', valueType: 'boolean' },
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