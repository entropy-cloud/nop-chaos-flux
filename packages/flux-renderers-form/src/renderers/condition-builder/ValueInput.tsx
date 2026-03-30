import React from 'react';
import { Input } from '@nop-chaos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nop-chaos/ui';
import { Badge } from '@nop-chaos/ui';
import type { ConditionField, ConditionSelectField } from './types';
import { t } from './i18n';

interface ValueInputProps {
  field: ConditionField;
  op: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function ValueInput({ field, op, value, onChange, disabled }: ValueInputProps) {
  if (!op) return null;
  if (op === 'is_empty' || op === 'is_not_empty') return null;

  if (op === 'between' || op === 'not_between') {
    return <BetweenInput field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  switch (field.type) {
    case 'text':
      return <TextInput value={value} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
    case 'number':
      return <NumberInput value={value} onChange={onChange} disabled={disabled} />;
    case 'select':
      return <SelectInput field={field} op={op} value={value} onChange={onChange} disabled={disabled} />;
    case 'boolean':
      return <BooleanInput field={field} value={value} onChange={onChange} disabled={disabled} />;
    default:
      return <TextInput value={value} onChange={onChange} disabled={disabled} />;
  }
}

function TextInput({ value, onChange, disabled, placeholder }: {
  value: unknown; onChange: (v: unknown) => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <Input
      type="text"
      value={value == null ? '' : String(value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-7 text-xs min-w-[100px]"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberInput({ value, onChange, disabled }: {
  value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
}) {
  return (
    <Input
      type="number"
      value={value == null ? '' : String(value)}
      placeholder={t('numberPlaceholder')}
      disabled={disabled}
      className="h-7 text-xs min-w-[80px]"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
    />
  );
}

function SelectInput({ field, op, value, onChange, disabled }: {
  field: ConditionSelectField; op: string; value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
}) {
  const options = field.options ?? [];
  const isMulti = op === 'select_any_in' || op === 'select_not_any_in' || field.multiple;

  if (isMulti) {
    return <MultiSelectInput options={options} value={value} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
  }

  const stringValue = value == null ? '' : String(value);
  return (
    <Select value={stringValue} onValueChange={(v) => onChange(v)} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 text-xs min-w-[100px]">
        <SelectValue placeholder={field.placeholder ?? t('selectPlaceholder')} />
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

function MultiSelectInput({ options, value, onChange, disabled, placeholder }: {
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
            <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0 cursor-pointer" onClick={() => !disabled && toggle(v)}>
              {opt?.label ?? v} ×
            </Badge>
          );
        })
      ) : (
        <span className="text-xs text-muted-foreground">{placeholder ?? t('selectPlaceholder')}</span>
      )}
      <div className="relative">
        <select
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={disabled}
          value=""
          onChange={(e) => {
            if (e.target.value) toggle(e.target.value);
          }}
        >
          <option value="">{placeholder ?? t('addOption')}</option>
          {options
            .filter((o) => !selected.includes(String(o.value)))
            .map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
        </select>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-pointer">
          + {t('addOption')}
        </Badge>
      </div>
    </div>
  );
}

function BooleanInput({ field, value, onChange, disabled }: {
  value: unknown; onChange: (v: unknown) => void; disabled?: boolean; field: { trueLabel?: string; falseLabel?: string };
}) {
  const stringValue = value == null ? '' : String(value);
  const trueLabel = field.trueLabel ?? t('boolTrue');
  const falseLabel = field.falseLabel ?? t('boolFalse');

  return (
    <Select value={stringValue} onValueChange={(v) => onChange(v === 'true')} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 text-xs min-w-[80px]">
        <SelectValue placeholder={t('selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">{trueLabel}</SelectItem>
        <SelectItem value="false">{falseLabel}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function BetweenInput({ field, value, onChange, disabled }: {
  field: ConditionField; value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
}) {
  const arr = Array.isArray(value) ? value : [undefined, undefined];
  const clean = (v: unknown) => (v === undefined || v === '') ? undefined : v;
  return (
    <div className="flex items-center gap-1">
      <BetweenFieldInput field={field} value={arr[0]} disabled={disabled} onChange={(v) => {
        const left = clean(v);
        const right = clean(arr[1]);
        if (left !== undefined && right !== undefined) {
          onChange([left, right]);
        } else {
          onChange(undefined);
        }
      }} />
      <span className="text-muted-foreground text-xs select-none">~</span>
      <BetweenFieldInput field={field} value={arr[1]} disabled={disabled} onChange={(v) => {
        const left = clean(arr[0]);
        const right = clean(v);
        if (left !== undefined && right !== undefined) {
          onChange([left, right]);
        } else {
          onChange(undefined);
        }
      }} />
    </div>
  );
}

function BetweenFieldInput({ field, value, onChange, disabled }: {
  field: ConditionField; value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
}) {
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={value == null ? '' : String(value)}
        placeholder={t('numberPlaceholder')}
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
      type="text"
      value={value == null ? '' : String(value)}
      placeholder={t('valuePlaceholder')}
      disabled={disabled}
      className="h-7 text-xs min-w-[70px]"
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}
