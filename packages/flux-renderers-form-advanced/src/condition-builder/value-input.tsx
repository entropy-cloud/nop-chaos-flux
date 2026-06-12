import React from 'react';
import type { BaseSchema, FormRuntime, ScopeRef, ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nop-chaos/ui';
import { NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import { Badge } from '@nop-chaos/ui';
import type { ConditionCustomField, ConditionField, ConditionSelectField } from './types.js';

interface ValueInputProps {
  inputIdPrefix?: string;
  field: ConditionField;
  op: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  renderCustomSchema?: (schema: BaseSchema, options: RenderCustomSchemaOptions) => React.ReactNode;
  projectedForm?: FormRuntime;
  projectedScope?: ScopeRef;
  projectedValidationOwner?: ValidationScopeRuntime;
}

interface RenderCustomSchemaOptions {
  field: ConditionCustomField;
  op: string;
  value: unknown;
  disabled?: boolean;
  scope: ScopeRef;
}

interface CustomValueEditorHostProps extends RenderCustomSchemaOptions {
  schema: BaseSchema;
  renderSchema: NonNullable<ValueInputProps['renderCustomSchema']>;
  form?: FormRuntime;
  scope: ScopeRef;
  validationOwner?: ValidationScopeRuntime;
}

function coerceScalar(v: unknown): unknown {
  if (Array.isArray(v)) return undefined;
  return v;
}

export function ValueInput({
  inputIdPrefix,
  field,
  op,
  value,
  onChange,
  disabled,
  renderCustomSchema,
  projectedForm,
  projectedScope,
  projectedValidationOwner,
}: ValueInputProps) {
  if (!op) return null;
  if (op === 'is_empty' || op === 'is_not_empty') return null;

  if (op === 'between' || op === 'not_between') {
    return <BetweenInput field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (field.type === 'custom' && field.value) {
    if (!projectedScope) {
      throw new Error(
        `Condition builder custom field "${field.name}" requires a projected scope, but none was provided.`,
      );
    }
    if (!renderCustomSchema) {
      throw new Error(
        `Condition builder custom field "${field.name}" requires schema rendering support, but none was provided.`,
      );
    }

    return (
      <CustomValueEditorHost
        schema={field.value}
        field={field}
        op={op}
        value={value}
        disabled={disabled}
        renderSchema={renderCustomSchema}
        form={projectedForm}
        scope={projectedScope}
        validationOwner={projectedValidationOwner}
      />
    );
  }

  const scalar = coerceScalar(value);

  switch (field.type) {
    case 'text':
      return (
        <TextInput
          inputId={inputIdPrefix}
          value={scalar}
          onChange={onChange}
          disabled={disabled}
          placeholder={field.placeholder}
        />
      );
    case 'number':
      return <NumberInput inputId={inputIdPrefix} value={scalar} onChange={onChange} disabled={disabled} />;
    case 'select':
      return (
        <SelectInput inputId={inputIdPrefix} field={field} op={op} value={value} onChange={onChange} disabled={disabled} />
      );
    case 'boolean':
      return <BooleanInput inputId={inputIdPrefix} field={field} value={scalar} onChange={onChange} disabled={disabled} />;
    default:
      return <TextInput inputId={inputIdPrefix} value={scalar} onChange={onChange} disabled={disabled} />;
  }
}

function CustomValueEditorHost({
  schema,
  field,
  op,
  value,
  disabled,
  renderSchema,
  form,
  scope,
  validationOwner,
}: CustomValueEditorHostProps) {
  return (
    <FormContext.Provider value={form}>
      <ScopeContext.Provider value={scope}>
        <ValidationContext.Provider value={validationOwner}>
          {renderSchema(schema, { field, op, value, disabled, scope })}
        </ValidationContext.Provider>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

function TextInput({
  inputId,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  inputId?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      id={inputId}
      type="text"
      value={value == null ? '' : String(value)}
      aria-label={t('conditionBuilder.valueLabel')}
      placeholder={placeholder}
      disabled={disabled}
      className="h-7 text-xs min-w-[100px]"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberInput({
  inputId,
  value,
  onChange,
  disabled,
}: {
  inputId?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      id={inputId}
      type="number"
      value={value == null ? '' : String(value)}
      aria-label={t('conditionBuilder.valueLabel')}
      placeholder={t('conditionBuilder.numberPlaceholder')}
      disabled={disabled}
      className="h-7 text-xs min-w-[80px]"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
    />
  );
}

function SelectInput({
  inputId,
  field,
  op,
  value,
  onChange,
  disabled,
}: {
  inputId?: string;
  field: ConditionSelectField;
  op: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const options = field.options ?? [];
  const isMulti = op === 'select_any_in' || op === 'select_not_any_in' || field.multiple;

  if (isMulti) {
    return (
        <MultiSelectInput
          inputIdPrefix={inputId}
          options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={field.placeholder}
      />
    );
  }

  const stringValue = value == null ? '' : String(value);
  return (
    <Select value={stringValue} onValueChange={(v) => onChange(v)} disabled={disabled}>
      <SelectTrigger
        id={inputId}
        size="sm"
        className="h-7 text-xs min-w-[100px]"
        aria-label={t('conditionBuilder.valueLabel')}
      >
        <SelectValue placeholder={field.placeholder ?? t('conditionBuilder.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiSelectInput({
  inputIdPrefix,
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  inputIdPrefix?: string;
  options: Array<{ label: string; value: unknown }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const selected = Array.isArray(value) ? value.map(String) : [];

  const toggle = (itemValue: string) => {
    const next = selected.includes(itemValue)
      ? selected.filter((v) => v !== itemValue)
      : [...selected, itemValue];
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <div className="flex flex-wrap gap-1 min-w-[100px]">
      {selected.length > 0 ? (
        selected.map((v) => {
          const opt = options.find((o) => String(o.value) === v);
          return (
            <Button
              key={v}
              type="button"
              variant="secondary"
              size="xs"
              className="h-auto px-1.5 py-0 text-[10px]"
              aria-label={`Remove value ${opt?.label ?? v}`}
              disabled={disabled}
              onClick={() => toggle(v)}
            >
              {opt?.label ?? v} <XIcon className="size-3" />
            </Button>
          );
        })
      ) : (
        <span className="text-xs text-muted-foreground">
          {placeholder ?? t('conditionBuilder.selectPlaceholder')}
        </span>
      )}
      <div className="relative">
        <NativeSelect
          id={inputIdPrefix ? `${inputIdPrefix}-select` : undefined}
          className="absolute inset-0 w-full opacity-0"
          aria-label={t('conditionBuilder.valueLabel')}
          disabled={disabled}
          value=""
          onChange={(e) => {
            if (e.target.value) toggle(e.target.value);
          }}
        >
          <NativeSelectOption value="">
            {placeholder ?? t('conditionBuilder.addOption')}
          </NativeSelectOption>
          {options
            .filter((o) => !selected.includes(String(o.value)))
            .map((opt) => (
              <NativeSelectOption key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </NativeSelectOption>
            ))}
        </NativeSelect>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer">
          + {t('conditionBuilder.addOption')}
        </Badge>
      </div>
    </div>
  );
}

function BooleanInput({
  inputId,
  field,
  value,
  onChange,
  disabled,
}: {
  inputId?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  field: { trueLabel?: string; falseLabel?: string };
}) {
  const stringValue = value == null ? '' : String(value);
  const trueLabel = field.trueLabel ?? t('conditionBuilder.boolTrue');
  const falseLabel = field.falseLabel ?? t('conditionBuilder.boolFalse');

  return (
    <Select value={stringValue} onValueChange={(v) => onChange(v === 'true')} disabled={disabled}>
      <SelectTrigger
        id={inputId}
        size="sm"
        className="h-7 text-xs min-w-[80px]"
        aria-label={t('conditionBuilder.valueLabel')}
      >
        <SelectValue placeholder={t('conditionBuilder.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">{trueLabel}</SelectItem>
        <SelectItem value="false">{falseLabel}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function BetweenInput({
  inputIdPrefix,
  field,
  value,
  onChange,
  disabled,
}: {
  inputIdPrefix?: string;
  field: ConditionField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const arr = Array.isArray(value) ? value : [undefined, undefined];
  const clean = (v: unknown) => (v === undefined || v === '' ? undefined : v);
  return (
    <div className="flex items-center gap-1">
      <BetweenFieldInput
        inputId={inputIdPrefix ? `${inputIdPrefix}-start` : undefined}
        ariaLabel={t('conditionBuilder.valueLabel')}
        field={field}
        value={arr[0]}
        disabled={disabled}
        onChange={(v) => {
          const left = clean(v);
          const right = clean(arr[1]);
          if (left !== undefined && right !== undefined) {
            onChange([left, right]);
          } else {
            onChange(undefined);
          }
        }}
      />
      <span className="text-muted-foreground text-xs select-none">~</span>
      <BetweenFieldInput
        inputId={inputIdPrefix ? `${inputIdPrefix}-end` : undefined}
        ariaLabel={t('conditionBuilder.valueLabel')}
        field={field}
        value={arr[1]}
        disabled={disabled}
        onChange={(v) => {
          const left = clean(arr[0]);
          const right = clean(v);
          if (left !== undefined && right !== undefined) {
            onChange([left, right]);
          } else {
            onChange(undefined);
          }
        }}
      />
    </div>
  );
}

function BetweenFieldInput({
  inputId,
  ariaLabel,
  field,
  value,
  onChange,
  disabled,
}: {
  inputId?: string;
  ariaLabel?: string;
  field: ConditionField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  if (field.type === 'number') {
    return (
      <Input
        id={inputId}
        type="number"
        aria-label={ariaLabel}
        value={value == null ? '' : String(value)}
        placeholder={t('conditionBuilder.numberPlaceholder')}
        disabled={disabled}
        className="h-7 text-xs min-w-[70px]"
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : Number(v));
        }}
      />
    );
  }
  return (
    <Input
      id={inputId}
      type="text"
      aria-label={ariaLabel}
      value={value == null ? '' : String(value)}
      placeholder={t('conditionBuilder.valuePlaceholder')}
      disabled={disabled}
      className="h-7 text-xs min-w-[70px]"
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}
