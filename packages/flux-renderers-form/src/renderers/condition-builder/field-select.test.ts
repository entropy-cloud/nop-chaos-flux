import { describe, expect, it } from 'vitest';
import type { ConditionField } from './types';

function flattenFields(fields: ConditionField[]): Array<{ name: string; label: string; group?: string }> {
  const result: Array<{ name: string; label: string; group?: string }> = [];
  for (const f of fields) {
    if (f.type === 'group') {
      const g = f as { type: 'group'; label: string; children: ConditionField[] };
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

const fields: ConditionField[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'age', label: 'Age', type: 'number' },
  { name: 'status', label: 'Status', type: 'select' },
];

const groupedFields: ConditionField[] = [
  {
    type: 'group',
    label: 'Personal',
    children: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'age', label: 'Age', type: 'number' },
    ],
  } as any,
  { name: 'status', label: 'Status', type: 'select' },
];

describe('flattenFields', () => {
  it('flattens a simple field list', () => {
    const result = flattenFields(fields);
    expect(result).toEqual([
      { name: 'name', label: 'Name' },
      { name: 'age', label: 'Age' },
      { name: 'status', label: 'Status' },
    ]);
  });

  it('flattens grouped fields', () => {
    const result = flattenFields(groupedFields);
    expect(result).toEqual([
      { name: 'name', label: 'Name', group: 'Personal' },
      { name: 'age', label: 'Age', group: 'Personal' },
      { name: 'status', label: 'Status' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(flattenFields([])).toEqual([]);
  });

  it('skips nested groups inside groups', () => {
    const nested: ConditionField[] = [
      {
        type: 'group',
        label: 'Outer',
        children: [
          { type: 'group', label: 'Inner', children: [] } as any,
          { name: 'field', label: 'Field', type: 'text' },
        ],
      } as any,
    ];
    const result = flattenFields(nested);
    expect(result).toEqual([{ name: 'field', label: 'Field', group: 'Outer' }]);
  });
});
