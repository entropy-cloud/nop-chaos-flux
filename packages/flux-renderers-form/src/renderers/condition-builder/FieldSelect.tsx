import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@nop-chaos/ui';
import { Input } from '@nop-chaos/ui';
import { SearchIcon } from 'lucide-react';
import type { ConditionField, ConditionFieldGroup } from './types';
import { t } from './i18n';

interface FieldSelectProps {
  fields: ConditionField[];
  value: string | undefined;
  onChange: (fieldName: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  usedFields?: Set<string>;
  uniqueFields?: boolean;
}

function flattenFields(fields: ConditionField[]): Array<{ name: string; label: string; group?: string }> {
  const result: Array<{ name: string; label: string; group?: string }> = [];
  for (const f of fields) {
    if (f.type === 'group') {
      const g = f as ConditionFieldGroup;
      for (const child of g.children) {
        if (child.type !== 'group') {
          result.push({ name: child.name, label: child.label, group: g.label });
        }
      }
    } else {
      result.push({ name: f.name, label: f.label });
    }
  }
  return result;
}

export function FieldSelect({ fields, value, onChange, disabled, searchable, usedFields, uniqueFields }: FieldSelectProps) {
  const [search, setSearch] = useState('');
  const flat = useMemo(() => flattenFields(fields), [fields]);

  const filtered = useMemo(() => {
    if (!search.trim()) return flat;
    const q = search.toLowerCase();
    return flat.filter(
      (f) => f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    );
  }, [flat, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ name: string; label: string }>>();
    for (const f of filtered) {
      const key = f.group ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [filtered]);

  const isDisabled = (fieldName: string) => {
    if (disabled) return true;
    if (uniqueFields && usedFields?.has(fieldName) && fieldName !== value) return true;
    return false;
  };

  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 text-xs min-w-[100px] max-w-[160px]">
        <SelectValue placeholder={t('selectField')} />
      </SelectTrigger>
      <SelectContent>
        {searchable && (
          <div className="p-1.5 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                className="h-6 pl-6 text-xs"
                placeholder={t('searchField')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
        {Array.from(grouped.entries()).map(([group, items]) =>
          group ? (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {items.map((f) => (
                <SelectItem key={f.name} value={f.name} disabled={isDisabled(f.name)}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            items.map((f) => (
              <SelectItem key={f.name} value={f.name} disabled={isDisabled(f.name)}>
                {f.label}
              </SelectItem>
            ))
          )
        )}
      </SelectContent>
    </Select>
  );
}
