import React, { useCallback, useMemo } from 'react';
import { GripVerticalIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import type {
  ConditionField,
  ConditionItemValue,
  ConditionOperatorOverrides,
  BaseConditionField,
} from './types.js';
import { FieldSelect } from './field-select.js';
import { OperatorSelect } from './operator-select.js';
import { ValueInput } from './value-input.js';
import { resolveOperators, resolveDefaultOp } from './operators.js';
import { WrappedFieldAction } from '../wrapped-field-action.js';
import { t } from '@nop-chaos/flux-i18n';

interface ConditionItemProps {
  value: ConditionItemValue;
  fields: ConditionField[];
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (value: ConditionItemValue) => void;
  onRemove: () => void;
  disabled?: boolean;
  searchable?: boolean;
  usedFields?: Set<string>;
  uniqueFields?: boolean;
  draggable?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

function findField(fields: ConditionField[], fieldName: string): ConditionField | undefined {
  for (const f of fields) {
    if (f.type === 'group') {
      const found = findField(f.children, fieldName);
      if (found) return found;
    } else if (f.name === fieldName) {
      return f;
    }
  }
  return undefined;
}

export function ConditionItem({
  value,
  fields,
  operatorsOverride,
  onChange,
  onRemove,
  disabled,
  searchable,
  usedFields,
  uniqueFields,
  draggable,
  dragHandleProps,
}: ConditionItemProps) {
  const itemId = value.id;
  const resolvedField = useMemo(
    () => findField(fields, value.left.field),
    [fields, value.left.field],
  );

  const fieldType = resolvedField?.type === 'group' ? 'text' : (resolvedField?.type ?? 'text');
  const fieldOperators =
    resolvedField?.type !== 'group' ? (resolvedField as BaseConditionField).operators : undefined;

  const operators = useMemo(
    () => resolveOperators(fieldType, fieldOperators, operatorsOverride),
    [fieldType, fieldOperators, operatorsOverride],
  );

  const handleFieldChange = useCallback(
    (fieldName: string) => {
      const newField = findField(fields, fieldName);
      const newFieldType = newField?.type === 'group' ? 'text' : (newField?.type ?? 'text');
      const newOp = resolveDefaultOp(
        newFieldType,
        (newField as BaseConditionField | undefined)?.defaultOp,
        operatorsOverride,
      );
      onChange({
        ...value,
        left: { type: 'field', field: fieldName },
        op: newOp,
        right: undefined,
      });
    },
    [fields, operatorsOverride, value, onChange],
  );

  const handleOpChange = useCallback(
    (op: string) => {
      onChange({ ...value, op, right: undefined });
    },
    [value, onChange],
  );

  const handleValueChange = useCallback(
    (right: unknown) => {
      onChange({ ...value, right });
    },
    [value, onChange],
  );

  return (
    <div
      data-slot="condition-item"
      className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 hover:shadow-sm transition-shadow group"
    >
      {draggable && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={t('conditionBuilder.reorderCondition')}
          {...dragHandleProps}
        >
          <GripVerticalIcon className="size-3.5" />
        </Button>
      )}

      <FieldSelect
        inputId={`${itemId}-field`}
        fields={fields}
        value={value.left.field}
        onChange={handleFieldChange}
        disabled={disabled}
        searchable={searchable}
        usedFields={usedFields}
        uniqueFields={uniqueFields}
      />

      <OperatorSelect
        triggerId={`${itemId}-operator`}
        operators={operators}
        value={value.op}
        onChange={handleOpChange}
        disabled={disabled}
      />

      <ValueInput
        inputIdPrefix={`${itemId}-value`}
        field={resolvedField ?? { name: '', label: '', type: 'text' }}
        op={value.op}
        value={value.right}
        onChange={handleValueChange}
        disabled={disabled}
      />

      {!disabled && (
        <WrappedFieldAction
          variant="ghost"
          size="icon-xs"
          className="ml-auto text-muted-foreground opacity-40 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity"
          onClick={onRemove}
          aria-label={t('conditionBuilder.removeCondition')}
        >
          <Trash2Icon className="size-3.5" />
        </WrappedFieldAction>
      )}
    </div>
  );
}
