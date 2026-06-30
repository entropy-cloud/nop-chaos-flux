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
  useInputComponentHandle,
  useRendererRuntime,
  useRenderScope,
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

export function PickerRenderer(props: RendererComponentProps<PickerSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const validationOwner = useCurrentValidationScope();
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const multiple = props.props.multiple === true;
  const valueKey = typeof props.props.valueKey === 'string' ? props.props.valueKey : undefined;
  const labelKey = typeof props.props.labelKey === 'string' ? props.props.labelKey : undefined;
  const pickerDialog = props.props.pickerDialog;
  const hasPickerDialog = pickerDialog !== undefined && pickerDialog !== false;
  const dialogConfig = (hasPickerDialog && typeof pickerDialog === 'object' ? pickerDialog : {}) as {
    title?: string;
    size?: string;
    placement?: string;
  };
  const dialogTitle = dialogConfig.title ?? t('flux.picker.select', { defaultValue: 'Select' });

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
  const rawFieldValue = currentForm ? formValue : scopeValue;

  const options = React.useMemo<NormalizedOption[]>(
    () => normalizeOptions(props.props.options, valueKey, labelKey),
    [props.props.options, valueKey, labelKey],
  );

  const selectedValues = React.useMemo<(string | number | boolean)[]>(() => {
    if (Array.isArray(rawFieldValue)) {
      return rawFieldValue.filter(
        (item): item is string | number | boolean =>
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
      );
    }
    if (
      rawFieldValue === undefined ||
      rawFieldValue === null ||
      rawFieldValue === ''
    ) {
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
  }, [rawFieldValue]);

  const selectedLabel = resolveSelectedLabel(
    multiple ? selectedValues : selectedValues[0],
    options,
    t('flux.picker.placeholder', { defaultValue: 'Not selected' }),
  );

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [pending, setPending] = React.useState<Set<string | number | boolean>>(new Set());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const runtime = useRendererRuntime();
  const notify = React.useCallback(
    (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
      runtime?.env?.notify?.(level, message);
    },
    [runtime],
  );

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

  const openDialog = React.useCallback(() => {
    if (!hasPickerDialog && options.length === 0) {
      // pickerDialog-missing failure path: surface config gap, do not open empty surface.
      notify('warning', t('flux.picker.configMissing', { defaultValue: 'Picker dialog is not configured' }));
      return;
    }
    // G1: seed pending with the current value so single-select opens with the
    // current selection pre-highlighted, and an empty Confirm never silently
    // clears the field.
    setPending(new Set(multiple ? selectedValues : selectedValues.slice(0, 1)));
    setQuery('');
    setOpen(true);
  }, [hasPickerDialog, multiple, notify, options.length, selectedValues]);

  const clearValue = React.useCallback(() => {
    if (interactionDisabled) {
      return;
    }
    writeValue(multiple ? [] : undefined);
    void props.events.onPick?.();
  }, [interactionDisabled, multiple, props.events, writeValue]);

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

  const filteredOptions = React.useMemo(() => {
    if (query.trim() === '') {
      return options;
    }
    const q = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const togglePending = React.useCallback((value: string | number | boolean) => {
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

  const confirmSelection = React.useCallback(() => {
    if (multiple) {
      writeValue(Array.from(pending));
    } else {
      // single-select: pick the toggled entry; if nothing is pending, keep the
      // existing value rather than writing `undefined` (G1: never silently clear).
      const nextSingle = Array.from(pending).pop() ?? selectedValues[0];
      writeValue(nextSingle);
    }
    setOpen(false);
    void props.events.onPick?.();
  }, [multiple, pending, props.events, selectedValues, writeValue]);

  if (!props.meta.visible) {
    return null;
  }

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
        <DialogContent data-slot="picker-dialog-content">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                placeholder={t('flux.picker.search', { defaultValue: 'Search' })}
                className="pl-8"
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
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('flux.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              size="sm"
              data-slot="picker-confirm"
              disabled={!multiple && pending.size === 0}
              onClick={confirmSelection}
            >
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
    { key: 'valueKey', kind: 'prop' },
    { key: 'labelKey', kind: 'prop' },
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
