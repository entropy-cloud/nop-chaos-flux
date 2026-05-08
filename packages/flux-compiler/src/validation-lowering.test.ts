import { describe, expect, it } from 'vitest';
import { compileValidationRules } from './validation-lowering.js';

describe('validation-lowering', () => {
  it('marks invalid and unsupported pattern rules as unsafe diagnostics', () => {
    const [invalid] = compileValidationRules('field', [{ kind: 'pattern', value: '[' }]);
    const [unsafe] = compileValidationRules('field', [{ kind: 'pattern', value: '(a+)+$' }]);
    const [safe] = compileValidationRules('field', [{ kind: 'pattern', value: '^\\d{3}$' }]);

    expect(invalid.precompiled).toMatchObject({ safe: false });
    expect(unsafe.precompiled).toMatchObject({
      safe: false,
      error: 'Pattern uses unsupported backtracking-prone constructs',
    });
    expect(safe.precompiled).toMatchObject({ safe: true });
  });
});
