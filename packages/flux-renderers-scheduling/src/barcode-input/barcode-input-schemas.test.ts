import { describe, it, expect } from 'vitest';
import { createBarcodeInputFieldValidation } from './barcode-input-schemas.js';

describe('createBarcodeInputFieldValidation (C9 P1-1: form-model validation participation)', () => {
  it('contributes a scalar field contributor for the schema name', () => {
    const contributor = createBarcodeInputFieldValidation();
    expect(contributor.kind).toBe('field');
    expect(contributor.valueKind).toBe('scalar');
    expect(contributor.getFieldPath({ type: 'barcode-input', name: 'sku' })).toBe('sku');
  });

  it('collects required/minLength/maxLength/pattern rules from the schema', () => {
    const contributor = createBarcodeInputFieldValidation();
    const rules = contributor.collectRules({
      type: 'barcode-input',
      name: 'sku',
      required: true,
      minLength: 4,
      maxLength: 20,
      pattern: '^[A-Z0-9]+$',
    });
    expect(rules).toContainEqual({ kind: 'required' });
    expect(rules).toContainEqual({ kind: 'minLength', value: 4 });
    expect(rules).toContainEqual({ kind: 'maxLength', value: 20 });
    expect(rules).toContainEqual({ kind: 'pattern', value: '^[A-Z0-9]+$' });
  });

  it('collects the async validate rule when validate.action is present', () => {
    const contributor = createBarcodeInputFieldValidation();
    const rules = contributor.collectRules({
      type: 'barcode-input',
      name: 'sku',
      validate: { action: { action: 'ajax' }, debounce: 300, message: 'bad code' },
    });
    expect(rules).toContainEqual({
      kind: 'async',
      action: { action: 'ajax' },
      debounce: 300,
      message: 'bad code',
    });
  });

  it('returns no rules when no validation props are declared', () => {
    const contributor = createBarcodeInputFieldValidation();
    expect(contributor.collectRules({ type: 'barcode-input', name: 'sku' })).toEqual([]);
  });
});
