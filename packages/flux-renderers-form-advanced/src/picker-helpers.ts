import { isRecord, toRecord } from '@nop-chaos/flux-core';
import type { ActionSchema, ReactiveActionSchema } from '@nop-chaos/flux-core';
import type { CrudColumnSchema, CrudSchema } from '@nop-chaos/flux-renderers-data';
/* Adjudication 01-04: cross-package coupling form-advanced→data for CRUD type references in picker integration. Minimal scope (2 types). Accept-and-annotate: architecturally expected for picker/composite integration with CRUD schemas. */
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

/**
 * Build a default CRUD schema for picker when user has not provided an explicit
 * `pickerSchema`. v3 semantics:
 *  - CRUD keeps its own `rowSelection` for visual feedback (checkbox / row
 *    highlight / keepOnPageChange) — picker does not re-implement these.
 *  - Row selection is visual only; the picker's Confirm reads the CRUD-managed
 *    `selectionStatePath` once and commits all selected rows to the form field
 *    (user adjudication 2026-09-02: "行选择并不提交，最后是有一个确定才将选择
 *    的所有内容提交到下方").
 *  - The per-instance `selectionStatePath` (`$_picker.${pickerId}.selection`)
 *    keeps repeated combo / input-table row instances isolated (bug 73 pattern).
 */
export function buildDefaultPickerSchema(args: {
  pickerId: string;
  loadAction: ActionSchema | ActionSchema[] | undefined;
  multiple: boolean;
  valueField: string | undefined;
}): CrudSchema {
  return {
    type: 'crud',
    id: `${args.pickerId}-picker-crud`,
    loadAction: args.loadAction as ReactiveActionSchema | undefined,
    rowKey: args.valueField ?? 'value',
    loadAllData: false,
    columns: [{ name: 'label', label: 'Label' }],
    queryForm: {
      body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
    },
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

/**
 * @deprecated v3: caller should pass `pickerSchema` directly. This thin wrapper
 * is kept for source-compatibility during the migration window. Behaviour
 * matches the v1 implementation: synthesize a source + columns from static
 * options, then forward to `buildDefaultPickerSchema`. v3.2: no picker-specific
 * state paths are injected; selection lives in the picker's React Context.
 */
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
  const base = buildDefaultPickerSchema({
    pickerId: args.pickerId,
    loadAction: args.loadAction,
    multiple: args.multiple,
    valueField: args.valueKey,
  });
  if (args.columns && args.columns.length > 0) {
    base.columns = args.columns;
  } else if (args.options.length > 0) {
    base.columns = inferColumns(args.options);
  }
  if (args.searchable === false) {
    base.queryForm = undefined;
  }
  if (!args.loadAction) {
    const items = args.options.map((option) => rowToRecord(option));
    base.source = { items, total: items.length } as unknown as CrudSchema['source'];
  }
  return base;
}
