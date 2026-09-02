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
  PickerRuntimeContext,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';
import type { PickerSchema } from './composite-field/composite-schemas.js';
import { resolveSelectedLabel } from './option-normalize.js';
import {
  formFieldRules,
  shouldValidateOn,
  useFieldPresentation,
} from '@nop-chaos/flux-renderers-form';
import {
  PICKER_ROWS_STATE_PATH,
  PICKER_SELECTION_STATE_PATH,
} from './picker-state.js';
import {
  normalizeFieldValues,
  type PickerValue,
  extractRowsFromActionResult,
  mapSelectionRows,
  selectionToRowKeys,
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
    popupConfig.placement ?? (surfaceType === 'popover' ? 'bottom' : 'right');
  const popupTitle = popupConfig.title ?? t('flux.picker.select', { defaultValue: 'Select' });

  // `pickerSchema` is declared as a REGION (deferred template area, same as
  // combo items / detail-view content): its nested schemas are NOT value-
  // compiled in the picker's scope — `${item.*}` expressions evaluate inside
  // the content renderer's own item scope.
  const pickerSchemaRegion = props.regions.pickerSchema;
  const hasContentSchema = Boolean(pickerSchemaRegion?.templateNode);

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

  const [open, setOpen] = React.useState(false);
  const pickedRef = React.useRef<PickerValue[]>([]);
  const pendingRowsRef = React.useRef<
    Map<PickerValue, { label: string; row: Record<string, unknown> }>
  >(new Map());

  // Single binding channel: the popup surface's well-known scope variables.
  // Content publishes selection via its OWN config (selectionStatePath etc.),
  // pointed at these names by the schema author/converter.
  const publishedSelection = useScopeSelector(
    (scopeData) => {
      const raw = getIn(scopeData, PICKER_SELECTION_STATE_PATH);
      return Array.isArray(raw) ? raw : [];
    },
    (a, b) =>
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => v === b[i]),
    {
      enabled: open,
      fallback: [],
      paths: open ? [PICKER_SELECTION_STATE_PATH] : undefined,
    },
  );

  const selectedValues = React.useMemo(
    () => normalizeFieldValues(rawFieldValue, valueField),
    [rawFieldValue, valueField],
  );

  const [resolvedLabelCache, setResolvedLabelCache] = React.useState<Record<string, string>>({});
  const [selectionRows, setSelectionRows] = React.useState<
    Map<PickerValue, { label: string; row: Record<string, unknown> }>
  >(() => new Map());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelResolveRequestedRef = React.useRef<string | null>(null);

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;
  const labelResolveAction = schemaProps.labelResolveAction;
  const autoFillProgram = props.templateNode.structuralFields?.autoFill as
    | CompiledRuntimeValue<Record<string, unknown>>
    | undefined;

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
    const cachedLabels = selectedValues.map((value) => resolvedLabelCache[String(value)]);
    if (cachedLabels.some((value) => value)) {
      return cachedLabels.filter((value): value is string => Boolean(value)).join(', ');
    }
    return resolveSelectedLabel(
      multiple ? selectedValues : selectedValues[0],
      [],
      t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
    );
  }, [labelField, multiple, rawFieldValue, resolvedLabelCache, selectedValues]);

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

  // Label reactive resolution via the picker-level labelResolveAction.
  React.useEffect(() => {
    if (!labelResolveAction || selectedValues.length === 0) {
      return;
    }
    const uncached = selectedValues.filter((value) => !resolvedLabelCache[String(value)]);
    if (uncached.length === 0) {
      return;
    }
    const requestKey = JSON.stringify(uncached);
    if (labelResolveRequestedRef.current === requestKey) {
      return;
    }
    labelResolveRequestedRef.current = requestKey;
    void props.helpers
      .dispatch(labelResolveAction as ActionSchema, {
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
          setSelectionRows((current) => new Map([...current, ...rowMap]));
          setResolvedLabelCache((current) => {
            const next = { ...current };
            for (const [value, entry] of rowMap.entries()) {
              next[String(value)] = entry.label;
            }
            return next;
          });
        } else {
          labelResolveRequestedRef.current = null;
        }
      })
      .catch(() => {
        labelResolveRequestedRef.current = null;
      });
  }, [labelField, labelResolveAction, multiple, props.helpers, resolvedLabelCache, scope, selectedValues, valueField]);

  // Seed the well-known publish variable with the current value on open so
  // publishing content initializes with the field's current selection.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    scope?.update(PICKER_SELECTION_STATE_PATH, selectionToRowKeys(selectedValues));
  }, [open, scope, selectedValues]);

  const openDialog = React.useCallback(() => {
    if (!hasPickerPopup && !hasContentSchema) {
      env?.notify?.('warning', t('flux.picker.configMissing', { defaultValue: 'Picker dialog is not configured' }));
      return;
    }
    setOpen(true);
  }, [env, hasContentSchema, hasPickerPopup]);

  const clearValue = React.useCallback(() => {
    if (interactionDisabled) {
      return;
    }
    writeValue(schemaProps.resetValue !== undefined ? schemaProps.resetValue : multiple ? [] : undefined);
    void props.events.onPick?.();
  }, [interactionDisabled, multiple, props.events, schemaProps.resetValue, writeValue]);

  // Confirm reads ONLY the well-known publish variables. Content that
  // published nothing contributes nothing — the picker never inspects what
  // the content is.
  const confirmSelection = React.useCallback(() => {
    const publishedRaw = scope?.get?.(PICKER_SELECTION_STATE_PATH);
    const publishedKeys = Array.isArray(publishedRaw)
      ? publishedRaw.map((value) => String(value))
      : [];
    const publishedRows = extractRowsFromActionResult(scope?.get?.(PICKER_ROWS_STATE_PATH));
    const publishedRowMap = mapSelectionRows({
      rows: publishedRows,
      valueKey: valueField,
      labelKey: labelField,
    });

    if (pendingRowsRef.current.size > 0) {
      setSelectionRows((current) => new Map([...current, ...pendingRowsRef.current]));
      setResolvedLabelCache((current) => {
        const next = { ...current };
        for (const [v, entry] of pendingRowsRef.current.entries()) {
          next[String(v)] = entry.label;
        }
        return next;
      });
      pendingRowsRef.current = new Map();
    }
    const rows = new Map<PickerValue, { label: string; row: Record<string, unknown> }>(selectionRows);
    const nextValues: PickerValue[] = [];

    // Channel 1: pick-triggered accumulation (button-driven content).
    for (const value of pickedRef.current) {
      nextValues.push(value);
    }
    // Channel 2: scope-published selection (selectionStatePath content, e.g. CRUD).
    for (const key of publishedKeys) {
      if (nextValues.some((value) => String(value) === key)) {
        continue;
      }
      const optionMatch = rows.get(key as PickerValue);
      if (optionMatch) {
        nextValues.push(optionMatch.row[valueField ?? 'value'] as PickerValue);
        continue;
      }
      const published = Array.from(publishedRowMap.entries()).find(([value]) => String(value) === key);
      if (published) {
        nextValues.push(published[0]);
        rows.set(published[0], published[1]);
        continue;
      }
      nextValues.push(key as PickerValue);
    }

    const finalValues = multiple ? nextValues : nextValues.slice(0, 1);
    if (!multiple && finalValues.length === 0) {
      // G1: an empty Confirm never silently clears the field — just close.
      setOpen(false);
      return;
    }
    const firstSelected = finalValues.length > 0
      ? rows.get(finalValues[0])?.row
      : undefined;
    applyAutoFill(firstSelected);
    writeValue(multiple ? finalValues : finalValues[0]);
    setOpen(false);
    void props.events.onPick?.();
  }, [applyAutoFill, labelField, multiple, props.events, scope, selectionRows, valueField, writeValue]);

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

  const contentNode = React.useMemo(
    () =>
      open && pickerSchemaRegion
        ? (pickerSchemaRegion.render({ pathSuffix: 'pickerContent' }) as React.ReactNode)
        : null,
    [open, pickerSchemaRegion],
  );

  // `pick` action callback (ambient handle for the popup subtree). Pick is the
  // commit trigger: map the picked value via valueField/labelField, write it
  // into the outer scope (form field), close the popup. The action layer knows
  // nothing about the picker; the picker knows nothing about what fired it.
  const handlePick = React.useCallback(
    (args: { value?: unknown; rows?: unknown }) => {
      const value = args.value;
      const rawRows = args.rows;
      const rowList = Array.isArray(rawRows)
        ? rawRows.filter(isRecord)
        : isRecord(rawRows)
          ? [rawRows]
          : [];
      if (rowList.length > 0) {
        const rowMap = mapSelectionRows({ rows: rowList, valueKey: valueField, labelKey: labelField });
        // Ref, not state: any PickerRenderer state update during the popup
        // content's fragment-scope pending window re-renders the subtree and
        // breaks region row bindings. Landed into state at Confirm time.
        for (const [v, entry] of rowMap.entries()) {
          pendingRowsRef.current.set(v, entry);
        }
      }
      const firstRow = rowList[0];
      applyAutoFill(firstRow);
      if (multiple) {
        // Item selection does not commit; the popup Confirm commits the
        // accumulated set in one shot (adjudication 2026-09-02). Accumulated
        // in a ref: re-rendering during the popup content's fragment-scope
        // pending window breaks region bindings (row `${item.*}` evaluates
        // against an uncommitted scope version).
        const exists = pickedRef.current.some((existing) => String(existing) === String(value));
        pickedRef.current = exists
          ? pickedRef.current.filter((existing) => String(existing) !== String(value))
          : [...pickedRef.current, value as PickerValue];
        return { ok: true, data: value };
      }
      writeValue(value);
      setOpen(false);
      void props.events.onPick?.();
      return { ok: true, data: value };
    },
    [applyAutoFill, labelField, multiple, props.events, valueField, writeValue],
  );

  const pickerRuntimeValue = React.useMemo(() => ({ pick: handlePick }), [handlePick]);

  const wrappedContent = contentNode ? (
    <PickerRuntimeContext.Provider value={pickerRuntimeValue}>{contentNode}</PickerRuntimeContext.Provider>
  ) : null;

  if (!props.meta.visible) {
    return null;
  }

  const confirmDisabled =
    !multiple && publishedSelection.length === 0 && pickedRef.current.length === 0;

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
        content={wrappedContent}
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
    { key: 'pickerSchema', kind: 'region', regionKey: 'pickerSchema' },
    { key: 'pickerPopup', kind: 'prop' },
    { key: 'valueField', kind: 'prop' },
    { key: 'labelField', kind: 'prop' },
    { key: 'labelTpl', kind: 'prop' },
    { key: 'delimiter', kind: 'prop' },
    { key: 'overflowConfig', kind: 'prop' },
    { key: 'itemClearable', kind: 'prop', valueType: 'boolean' },
    { key: 'resetValue', kind: 'prop' },
    { key: 'multiple', kind: 'prop', valueType: 'boolean' },
    { key: 'clearable', kind: 'prop', valueType: 'boolean' },
    { key: 'joinValues', kind: 'prop', valueType: 'boolean' },
    { key: 'extractValue', kind: 'prop', valueType: 'boolean' },
    { key: 'embed', kind: 'prop', valueType: 'boolean' },
    { key: 'labelResolveAction', kind: 'prop' },
    { key: 'autoFill', kind: 'prop', lazyEval: true, params: ['row'] },
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
