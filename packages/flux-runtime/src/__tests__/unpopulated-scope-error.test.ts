import { describe, expect, it } from 'vitest';
import { UnpopulatedScopeAccessError } from '@nop-chaos/flux-formula';
import { isUnpopulatedScopeError } from '../unpopulated-scope-error.js';

describe('isUnpopulatedScopeError — single-layer cause discrimination (582 CX-4)', () => {
  it('matches the formula-compiler expression wrap (compile/formula-compiler.ts :207 shape)', () => {
    const wrapped = new Error('Expression evaluation failed for: ${rawData.items.map(a => a)}', {
      cause: new UnpopulatedScopeAccessError(),
    });
    expect(isUnpopulatedScopeError(wrapped)).toBe(true);
  });

  it('matches the formula-compiler template wrap (compile/formula-compiler.ts :297 shape)', () => {
    const wrapped = new Error('Template evaluation failed for: `${rawData.total}`', {
      cause: new UnpopulatedScopeAccessError(),
    });
    expect(isUnpopulatedScopeError(wrapped)).toBe(true);
  });

  it('does not match the bare evaluator error (no compiler wrap is not the compiled-artifact surface)', () => {
    expect(isUnpopulatedScopeError(new UnpopulatedScopeAccessError())).toBe(false);
  });

  it('does not match a double-layer wrap (plan 582 M2: chain walking would silently widen the tolerated-error surface)', () => {
    const root = new UnpopulatedScopeAccessError();
    const templateWrap = new Error('Template evaluation failed for: `${rawData.total}`', {
      cause: root,
    });
    const doubleWrapped = new Error('Expression evaluation failed for: `${rawData.total}`', {
      cause: templateWrap,
    });
    expect(isUnpopulatedScopeError(doubleWrapped)).toBe(false);
  });

  it('does not match a plain Error carrying the sentinel message (class identity, not message sniffing)', () => {
    const wrapped = new Error('Expression evaluation failed for: ${rawData.total}', {
      cause: new Error('Cannot access member of null or undefined'),
    });
    expect(isUnpopulatedScopeError(wrapped)).toBe(false);
  });

  it('returns false for non-Error inputs', () => {
    expect(isUnpopulatedScopeError(undefined)).toBe(false);
    expect(isUnpopulatedScopeError('Cannot access member of null or undefined')).toBe(false);
  });
});
