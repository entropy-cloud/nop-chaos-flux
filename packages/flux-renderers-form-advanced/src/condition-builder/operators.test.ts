import { describe, expect, it } from 'vitest';
import {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  NO_VALUE_OPS,
  resolveOperators,
  resolveDefaultOp,
  resolveOperatorLabel,
} from './operators';

describe('operators', () => {
  describe('OPERATOR_LABELS', () => {
    it('contains all standard operator labels', () => {
      expect(OPERATOR_LABELS.equal).toBe('等于');
      expect(OPERATOR_LABELS.not_equal).toBe('不等于');
      expect(OPERATOR_LABELS.less).toBe('小于');
      expect(OPERATOR_LABELS.greater).toBe('大于');
      expect(OPERATOR_LABELS.between).toBe('范围内');
      expect(OPERATOR_LABELS.is_empty).toBe('为空');
      expect(OPERATOR_LABELS.like).toBe('包含');
      expect(OPERATOR_LABELS.starts_with).toBe('开头是');
      expect(OPERATOR_LABELS.select_equals).toBe('等于');
      expect(OPERATOR_LABELS.select_any_in).toBe('包含任意');
    });
  });

  describe('OPERATORS_BY_TYPE', () => {
    it('provides text operators with equal as default', () => {
      const textOps = OPERATORS_BY_TYPE.text;
      expect(textOps.defaultOp).toBe('equal');
      expect(textOps.operators).toContain('equal');
      expect(textOps.operators).toContain('like');
      expect(textOps.operators).toContain('is_empty');
    });

    it('provides number operators including between', () => {
      const numOps = OPERATORS_BY_TYPE.number;
      expect(numOps.defaultOp).toBe('equal');
      expect(numOps.operators).toContain('between');
      expect(numOps.operators).toContain('not_between');
      expect(numOps.operators).toContain('greater_or_equal');
    });

    it('provides select operators with select_equals as default', () => {
      const selectOps = OPERATORS_BY_TYPE.select;
      expect(selectOps.defaultOp).toBe('select_equals');
      expect(selectOps.operators).toContain('select_any_in');
      expect(selectOps.operators).toContain('select_not_any_in');
    });

    it('provides boolean operators with equal as default', () => {
      const boolOps = OPERATORS_BY_TYPE.boolean;
      expect(boolOps.defaultOp).toBe('equal');
      expect(boolOps.operators).toEqual(['equal', 'not_equal']);
    });

    it('provides date/time/datetime operators', () => {
      for (const type of ['date', 'time', 'datetime']) {
        const ops = OPERATORS_BY_TYPE[type];
        expect(ops.defaultOp).toBe('equal');
        expect(ops.operators).toContain('between');
        expect(ops.operators).toContain('is_empty');
      }
    });

    it('provides custom type with empty operators', () => {
      expect(OPERATORS_BY_TYPE.custom.defaultOp).toBe('equal');
      expect(OPERATORS_BY_TYPE.custom.operators).toEqual([]);
    });
  });

  describe('NO_VALUE_OPS', () => {
    it('contains is_empty and is_not_empty', () => {
      expect(NO_VALUE_OPS.has('is_empty')).toBe(true);
      expect(NO_VALUE_OPS.has('is_not_empty')).toBe(true);
      expect(NO_VALUE_OPS.has('equal')).toBe(false);
    });
  });

  describe('resolveOperators', () => {
    it('returns built-in operators for known field type', () => {
      const ops = resolveOperators('text', undefined, undefined);
      expect(ops.length).toBeGreaterThan(0);
      expect(ops[0]).toEqual({ label: '等于', value: 'equal' });
    });

    it('returns empty array for unknown field type', () => {
      const ops = resolveOperators('unknown_type', undefined, undefined);
      expect(ops).toEqual([]);
    });

    it('uses field-level operator override', () => {
      const ops = resolveOperators('text', ['equal', 'like'], undefined);
      expect(ops).toHaveLength(2);
      expect(ops[0].value).toBe('equal');
      expect(ops[1].value).toBe('like');
    });

    it('uses schema-level operatorsByType override when no field override', () => {
      const schemaOverride = {
        operatorsByType: { text: ['equal', 'not_equal'] },
      };
      const ops = resolveOperators('text', undefined, schemaOverride);
      expect(ops).toHaveLength(2);
      expect(ops[0].value).toBe('equal');
      expect(ops[1].value).toBe('not_equal');
    });

    it('field override takes precedence over schema override', () => {
      const schemaOverride = {
        operatorsByType: { text: ['equal'] },
      };
      const ops = resolveOperators('text', ['like', 'not_like'], schemaOverride);
      expect(ops).toHaveLength(2);
      expect(ops[0].value).toBe('like');
    });

    it('falls back to built-in when neither override is set', () => {
      const ops = resolveOperators('number', undefined, undefined);
      const builtIn = OPERATORS_BY_TYPE.number.operators;
      expect(ops).toHaveLength(builtIn.length);
    });

    it('resolves custom operator objects', () => {
      const customOps = [
        { label: 'Custom Op', value: 'custom_op', values: [{ type: 'text', name: 'val' }] },
      ];
      const ops = resolveOperators('text', customOps, undefined);
      expect(ops).toHaveLength(1);
      expect(ops[0]).toEqual({
        label: 'Custom Op',
        value: 'custom_op',
        values: [{ type: 'text', name: 'val' }],
      });
    });

    it('uses schema-level label overrides', () => {
      const schemaOverride = {
        labels: { equal: '等于（自定义）' },
      };
      const ops = resolveOperators('text', undefined, schemaOverride);
      const equalOp = ops.find((o) => o.value === 'equal');
      expect(equalOp?.label).toBe('等于（自定义）');
    });

    it('falls back to operator value when label not found', () => {
      const ops = resolveOperators('text', ['unknown_op'], undefined);
      expect(ops[0].label).toBe('unknown_op');
    });
  });

  describe('resolveDefaultOp', () => {
    it('returns field-level defaultOp when set', () => {
      expect(resolveDefaultOp('text', 'like', undefined)).toBe('like');
    });

    it('returns schema-level defaultOpByType when no field default', () => {
      const schemaOverride = { defaultOpByType: { text: 'like' } };
      expect(resolveDefaultOp('text', undefined, schemaOverride)).toBe('like');
    });

    it('returns built-in default when no overrides', () => {
      expect(resolveDefaultOp('text', undefined, undefined)).toBe('equal');
      expect(resolveDefaultOp('select', undefined, undefined)).toBe('select_equals');
    });

    it('field default takes precedence over schema default', () => {
      const schemaOverride = { defaultOpByType: { text: 'like' } };
      expect(resolveDefaultOp('text', 'not_equal', schemaOverride)).toBe('not_equal');
    });

    it('returns equal for unknown type', () => {
      expect(resolveDefaultOp('unknown', undefined, undefined)).toBe('equal');
    });
  });

  describe('resolveOperatorLabel', () => {
    it('returns schema label override', () => {
      expect(resolveOperatorLabel('equal', { labels: { equal: '匹配' } })).toBe('匹配');
    });

    it('returns built-in label when no override', () => {
      expect(resolveOperatorLabel('equal', undefined)).toBe('等于');
    });

    it('returns operator value when no label found', () => {
      expect(resolveOperatorLabel('some_op', undefined)).toBe('some_op');
    });
  });
});
