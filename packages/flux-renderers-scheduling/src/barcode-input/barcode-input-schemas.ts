import type { SchemaFieldRule, ValidationRule } from '@nop-chaos/flux-core';
import type { BarcodeInputSchema } from './barcode-input.types.js';

/**
 * Form-model validation contributor: required/minLength/maxLength/pattern/
 * validate rules participate in the host form's validation (submit + field
 * events). Previously these props only ran renderer-local validation on scan.
 */
export function createBarcodeInputFieldValidation(): {
  kind: 'field';
  valueKind: 'scalar';
  getFieldPath(schema: BarcodeInputSchema): string | undefined;
  collectRules(schema: BarcodeInputSchema): ValidationRule[];
} {
  return {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema) {
      return schema.name;
    },
    collectRules(schema) {
      const rules: ValidationRule[] = [];
      if (schema.required) rules.push({ kind: 'required' });
      if (typeof schema.minLength === 'number') rules.push({ kind: 'minLength', value: schema.minLength });
      if (typeof schema.maxLength === 'number') rules.push({ kind: 'maxLength', value: schema.maxLength });
      if (schema.pattern) rules.push({ kind: 'pattern', value: schema.pattern });
      if (schema.validate?.action) {
        rules.push({
          kind: 'async',
          action: schema.validate.action,
          debounce: schema.validate.debounce,
          message: schema.validate.message,
        });
      }
      return rules;
    },
  };
}

const formFieldRules: SchemaFieldRule[] = [
  { key: 'name', kind: 'prop' },
  { key: 'label', kind: 'prop' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'required', kind: 'prop', valueType: 'boolean' },
  { key: 'disabled', kind: 'prop', valueType: 'boolean' },
  { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'trimContents', kind: 'prop', valueType: 'boolean' },
  { key: 'minLength', kind: 'prop' },
  { key: 'maxLength', kind: 'prop' },
  { key: 'pattern', kind: 'prop' },
  { key: 'validate', kind: 'prop' },
];

export const barcodeInputFieldRules: SchemaFieldRule[] = [
  ...formFieldRules,
  { key: 'formats', kind: 'prop' },
  { key: 'continuousScan', kind: 'prop', valueType: 'boolean' },
  { key: 'scanButton', kind: 'prop', valueType: 'boolean' },
  { key: 'scanInterval', kind: 'prop' },
  { key: 'batchMode', kind: 'prop', valueType: 'boolean' },
  { key: 'torchButton', kind: 'prop', valueType: 'boolean' },
  { key: 'wasmUrl', kind: 'prop' },
  { key: 'scanButtonClassName', kind: 'prop' },
  { key: 'autoSubmit', kind: 'prop', valueType: 'boolean' },
  { key: 'scanOnFocus', kind: 'prop', valueType: 'boolean' },
  { key: 'onMount', kind: 'event' },
  { key: 'onUnmount', kind: 'event' },
  { key: 'onScan', kind: 'event' },
  { key: 'onScanError', kind: 'event' },
];
