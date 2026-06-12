import { describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { formAdvancedRendererDefinitions } from '../index.js';
import { sanitizeRight, sanitizeNode } from './utils.js';
import type { ConditionGroupValue, ConditionItemValue } from './types.js';

describe('sanitizeRight', () => {
  it('converts undefined to undefined', () => {
    expect(sanitizeRight(undefined)).toBeUndefined();
  });

  it('converts null to undefined', () => {
    expect(sanitizeRight(null)).toBeUndefined();
  });

  it('converts [undefined] to undefined', () => {
    expect(sanitizeRight([undefined])).toBeUndefined();
  });

  it('converts [undefined, undefined] to undefined', () => {
    expect(sanitizeRight([undefined, undefined])).toBeUndefined();
  });

  it('converts [null, null] to undefined', () => {
    expect(sanitizeRight([null, null])).toBeUndefined();
  });

  it('preserves string values', () => {
    expect(sanitizeRight('active')).toBe('active');
  });

  it('preserves number values', () => {
    expect(sanitizeRight(42)).toBe(42);
  });

  it('preserves boolean values', () => {
    expect(sanitizeRight(true)).toBe(true);
  });

  it('preserves string arrays', () => {
    expect(sanitizeRight(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('preserves partially-filled arrays with at least one defined element', () => {
    expect(sanitizeRight([1, undefined])).toEqual([1, undefined]);
    expect(sanitizeRight([undefined, 2])).toEqual([undefined, 2]);
  });
});

describe('sanitizeNode', () => {
  it('sanitizes right: [undefined] in a leaf item', () => {
    const item: ConditionItemValue = {
      id: 'item-1',
      left: { type: 'field', field: 'status' },
      op: 'equal',
      right: [undefined],
    };
    const result = sanitizeNode(item) as ConditionItemValue;
    expect(result.right).toBeUndefined();
  });

  it('sanitizes right: [undefined, undefined] in a leaf item', () => {
    const item: ConditionItemValue = {
      id: 'item-2',
      left: { type: 'field', field: 'score' },
      op: 'between',
      right: [undefined, undefined],
    };
    const result = sanitizeNode(item) as ConditionItemValue;
    expect(result.right).toBeUndefined();
  });

  it('preserves valid string right values', () => {
    const item: ConditionItemValue = {
      id: 'item-3',
      left: { type: 'field', field: 'status' },
      op: 'equal',
      right: 'active',
    };
    const result = sanitizeNode(item) as ConditionItemValue;
    expect(result.right).toBe('active');
  });

  it('preserves partially-filled between arrays', () => {
    const item: ConditionItemValue = {
      id: 'item-4',
      left: { type: 'field', field: 'score' },
      op: 'between',
      right: [1, undefined],
    };
    const result = sanitizeNode(item) as ConditionItemValue;
    expect(result.right).toEqual([1, undefined]);
  });

  it('recursively sanitizes children in group nodes', () => {
    const group: ConditionGroupValue = {
      id: 'group-1',
      conjunction: 'and',
      children: [
        {
          id: 'item-5',
          left: { type: 'field', field: 'status' },
          op: 'equal',
          right: [undefined],
        } as ConditionItemValue,
        {
          id: 'item-6',
          left: { type: 'field', field: 'name' },
          op: 'equal',
          right: 'hello',
        } as ConditionItemValue,
      ],
    };
    const result = sanitizeNode(group) as ConditionGroupValue;
    expect((result.children[0] as ConditionItemValue).right).toBeUndefined();
    expect((result.children[1] as ConditionItemValue).right).toBe('hello');
  });

  it('sanitizes right: null to undefined', () => {
    const item: ConditionItemValue = {
      id: 'item-7',
      left: { type: 'field', field: 'status' },
      op: 'equal',
      right: null,
    };
    const result = sanitizeNode(item) as ConditionItemValue;
    expect(result.right).toBeUndefined();
  });
});

describe('condition-builder renderer', () => {
  it('registers in formAdvancedRendererDefinitions', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def).toBeDefined();
    expect(def!.type).toBe('condition-builder');
    expect(def!.component).toBeDefined();
  });

  it('has wrap enabled', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def!.wrap).toBe(true);
  });

  it('has label field rule', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def!.fields).toBeDefined();
    expect(def!.fields!.some((field) => field.key === 'label')).toBe(true);
  });

  it('has field validation kind', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, unknown> | undefined;
    expect(v).toBeDefined();
    expect(v!.kind).toBe('field');
  });

  it('has valueKind scalar', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, unknown> | undefined;
    expect(v!.valueKind).toBe('scalar');
  });

  it('getFieldPath returns name from schema', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    expect(v!.getFieldPath({ name: 'myField' })).toBe('myField');
    expect(v!.getFieldPath({})).toBeUndefined();
  });

  it('collects required validation rule when required is true', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('zh-CN');

    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ required: true, name: 'test' });
    expect(rules).toHaveLength(1);
    expect(rules[0].kind).toBe('required');
    expect(rules[0].message).toContain('不能为空');
  });

  it('uses flux-i18n required message after language switch', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('en-US');

    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ required: true, label: 'Rule' });

    expect(rules[0].message).toBe('Rule cannot be empty');
  });

  it('collects no rules when required is not set', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ name: 'test' });
    expect(rules).toHaveLength(0);
  });
});
