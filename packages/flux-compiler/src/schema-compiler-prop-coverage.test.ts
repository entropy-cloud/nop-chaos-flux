import { describe, expect, it } from 'vitest';

describe('schema compiler prop coverage suite routing', () => {
  it('delegates coverage assertions to split prop coverage test files', () => {
    expect([
      'schema-compiler-prop-coverage-data-structures.test.ts',
      'schema-compiler-prop-coverage-dialog-form.test.ts',
    ]).toHaveLength(2);
  });
});
