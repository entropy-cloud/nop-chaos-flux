import { describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import {
  OPERATOR_LABEL_KEYS,
  OPERATORS_BY_TYPE,
  NO_VALUE_OPS,
  getBuiltInOperatorLabel,
  resolveOperators,
  resolveDefaultOp,
  resolveOperatorLabel,
} from './operators.js';

describe('operators', () => {
  describe('OPERATOR_LABEL_KEYS', () => {
    it('contains all standard operator label keys', () => {
      expect(OPERATOR_LABEL_KEYS.equal).toBe('conditionBuilder.operators.equal');
      expect(OPERATOR_LABEL_KEYS.not_equal).toBe('conditionBuilder.operators.notEqual');
      expect(OPERATOR_LABEL_KEYS.less).toBe('conditionBuilder.operators.less');
      expect(OPERATOR_LABEL_KEYS.greater).toBe('conditionBuilder.operators.greater');
      expect(OPERATOR_LABEL_KEYS.between).toBe('conditionBuilder.operators.between');
      expect(OPERATOR_LABEL_KEYS.is_empty).toBe('conditionBuilder.operators.isEmpty');
      expect(OPERATOR_LABEL_KEYS.like).toBe('conditionBuilder.operators.like');
      expect(OPERATOR_LABEL_KEYS.starts_with).toBe('conditionBuilder.operators.startsWith');
      expect(OPERATOR_LABEL_KEYS.select_equals).toBe('conditionBuilder.operators.selectEquals');
      expect(OPERATOR_LABEL_KEYS.select_any_in).toBe('conditionBuilder.operators.selectAnyIn');
    });
  });

  describe('getBuiltInOperatorLabel', () => {
    it('resolves zh-CN labels from flux-i18n resources', async () => {
      resetFluxI18n();
      initFluxI18n();
      await changeLanguage('zh-CN');

      expect(getBuiltInOperatorLabel('equal')).toBe('等于');
      expect(getBuiltInOperatorLabel('between')).toBe('范围内');
      expect(getBuiltInOperatorLabel('select_any_in')).toBe('包含任意');
    });

    it('resolves en-US labels from flux-i18n resources', async () => {
      resetFluxI18n();
      initFluxI18n();
      await changeLanguage('en-US');

      expect(getBuiltInOperatorLabel('equal')).toBe('Equals');
      expect(getBuiltInOperatorLabel('between')).toBe('Between');
      expect(getBuiltInOperatorLabel('select_any_in')).toBe('Contains any');
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
      resetFluxI18n();
      initFluxI18n();
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
      resetFluxI18n();
      initFluxI18n();
      expect(resolveOperatorLabel('equal', undefined)).toBe('等于');
    });

    it('returns operator value when no label found', () => {
      expect(resolveOperatorLabel('some_op', undefined)).toBe('some_op');
    });
  });
});
