import { isRecord, toRecord } from '@nop-chaos/flux-core';
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
