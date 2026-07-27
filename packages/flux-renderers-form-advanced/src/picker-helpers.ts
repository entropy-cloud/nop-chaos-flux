import { isRecord, toRecord } from '@nop-chaos/flux-core';
import type { ActionSchema, ReactiveActionSchema } from '@nop-chaos/flux-core';
import type { CrudColumnSchema, CrudSchema } from '@nop-chaos/flux-renderers-data';
import { type NormalizedOption } from './option-normalize.js';

export type PickerValue = string | number | boolean;

export function normalizeFieldValues(rawFieldValue: unknown, valueKey?: string): PickerValue[] {
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

export function getOptionLabelMap(options: NormalizedOption[]): Map<PickerValue, string> {
  return new Map(options.map((o) => [o.value, o.label]));
}

export function extractRowsFromActionResult(value: unknown): Record<string, unknown>[] {
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

export function extractDisplayValue(row: Record<string, unknown>, key: string | undefined, fallback: unknown): string {
  const raw = key ? row[key] : fallback;
  if (raw === undefined || raw === null) {
    return '';
  }
  return String(raw);
}

export function mapSelectionRows(args: {
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

export function selectionToRowKeys(values: PickerValue[]): string[] {
  return values.map((value) => String(value));
}

export function rowToRecord(option: NormalizedOption): Record<string, unknown> {
  if (isRecord(option.raw)) {
    return toRecord(option.raw);
  }
  return { value: option.value, label: option.label };
}

export function inferColumns(options: NormalizedOption[]): CrudColumnSchema[] {
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

export function createNormalizedPickerSource(options: NormalizedOption[]): CrudSchema['source'] {
  const items = options.map((option) => rowToRecord(option));
  return { items, total: items.length } as unknown as CrudSchema['source'];
}

export function createPickerCrudSchema(args: {
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
