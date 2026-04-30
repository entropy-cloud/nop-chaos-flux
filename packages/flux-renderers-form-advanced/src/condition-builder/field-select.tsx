import { useMemo } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxEmpty,
  ComboboxInput,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ConditionField, ConditionFieldGroup } from './types';

interface FieldSelectProps {
  fields: ConditionField[];
  value: string | undefined;
  onChange: (fieldName: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  usedFields?: Set<string>;
  uniqueFields?: boolean;
}

interface FieldItem {
  name: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

function buildItems(
  fields: ConditionField[],
  usedFields?: Set<string>,
  uniqueFields?: boolean,
  currentValue?: string,
): FieldItem[] {
  const result: FieldItem[] = [];
  for (const f of fields) {
    if (f.type === 'group') {
      const g = f as ConditionFieldGroup;
      for (const child of g.children) {
        if (child.type !== 'group') {
          const isUsed = uniqueFields && usedFields?.has(child.name) && child.name !== currentValue;
          result.push({ name: child.name, label: child.label, group: g.label, disabled: isUsed });
        }
      }
    } else {
      result.push({ name: f.name, label: f.label });
    }
  }
  return result;
}

export function FieldSelect({
  fields,
  value,
  onChange,
  disabled,
  usedFields,
  uniqueFields,
}: FieldSelectProps) {
  const items = useMemo(
    () => buildItems(fields, usedFields, uniqueFields, value),
    [fields, usedFields, uniqueFields, value],
  );

  const selectedItem = items.find((f) => f.name === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item: FieldItem | null) => {
        if (item) onChange(item.name);
      }}
      itemToStringLabel={(item: FieldItem) => item.label}
      disabled={disabled}
    >
      <ComboboxInput
        className="h-7 text-xs min-w-[100px] max-w-[160px]"
        placeholder={selectedItem?.label ?? t('conditionBuilder.selectField')}
        showClear={false}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {t('conditionBuilder.noMatchField')}
          </div>
        </ComboboxEmpty>
        <ComboboxList>
          {(item: FieldItem) => (
            <ComboboxItem key={item.name} value={item} disabled={item.disabled}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
