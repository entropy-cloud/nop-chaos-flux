import { describe, expect, it } from 'vitest';
import {
  resolveVariablePath,
  lastSegment,
  flattenVariables,
  flattenFunctions,
} from './completion';
import type { VariableItem, FuncGroup } from '../../types';

describe('lastSegment', () => {
  it('returns last dot-separated segment', () => {
    expect(lastSegment('data.order.items')).toBe('items');
    expect(lastSegment('data.name')).toBe('name');
    expect(lastSegment('role')).toBe('role');
  });
});

describe('resolveVariablePath', () => {
  const variables: VariableItem[] = [
    { label: 'Username', value: 'data.username', type: 'string' },
    {
      label: 'Order',
      value: 'data.order',
      type: 'object',
      children: [
        { label: 'Order ID', value: 'data.order.id', type: 'string' },
        { label: 'Amount', value: 'data.order.amount', type: 'number' },
        {
          label: 'Items',
          value: 'data.order.items',
          type: 'array',
          children: [
            { label: 'Item Name', value: 'data.order.items.name', type: 'string' },
            { label: 'Price', value: 'data.order.items.price', type: 'number' },
          ],
        },
      ],
    },
    { label: 'Role', value: 'role', type: 'string' },
  ];

  it('resolves top-level variable by value match', () => {
    const result = resolveVariablePath(variables, 'role');
    expect(result).toBeTruthy();
    expect(result!.label).toBe('Role');
  });

  it('resolves nested variable by dot path', () => {
    const result = resolveVariablePath(variables, 'data.order');
    expect(result).toBeTruthy();
    expect(result!.label).toBe('Order');
    expect(result!.children).toHaveLength(3);
  });

  it('resolves deeply nested variable', () => {
    const result = resolveVariablePath(variables, 'data.order.items');
    expect(result).toBeTruthy();
    expect(result!.label).toBe('Items');
    expect(result!.children).toHaveLength(2);
  });

  it('returns null for unknown path', () => {
    expect(resolveVariablePath(variables, 'unknown.path')).toBeNull();
  });

  it('returns null for partial unknown path', () => {
    expect(resolveVariablePath(variables, 'data.unknown')).toBeNull();
  });
});

describe('flattenVariables', () => {
  it('flattens nested variable tree', () => {
    const variables: VariableItem[] = [
      {
        label: 'Order',
        value: 'data.order',
        children: [
          { label: 'ID', value: 'data.order.id' },
          {
            label: 'Items',
            value: 'data.order.items',
            children: [
              { label: 'Name', value: 'data.order.items.name' },
            ],
          },
        ],
      },
    ];

    const flat = flattenVariables(variables);
    expect(flat).toHaveLength(4);
    expect(flat.map((v) => v.value)).toEqual([
      'data.order',
      'data.order.id',
      'data.order.items',
      'data.order.items.name',
    ]);
  });
});

describe('flattenFunctions', () => {
  it('flattens function groups', () => {
    const groups: FuncGroup[] = [
      {
        groupName: 'Logic',
        items: [
          { name: 'IF', description: 'Conditional' },
          { name: 'AND', description: 'Logical AND' },
        ],
      },
      {
        groupName: 'Text',
        items: [
          { name: 'CONCAT', description: 'Concatenate' },
        ],
      },
    ];

    const flat = flattenFunctions(groups);
    expect(flat).toHaveLength(3);
    expect(flat[0].name).toBe('IF');
    expect(flat[2].name).toBe('CONCAT');
  });
});
