import { describe, expect, it, vi } from 'vitest';
import {
  detectMatchedVariant,
  matchesVariant,
  resolveInitialVariant,
} from '../variant-field/variant-field-matching.js';

function createSpyScopeFactory() {
  const created: string[] = [];
  const disposed: string[] = [];
  const createScope: any = vi.fn((patch: Record<string, unknown>) => {
    const id = `variant-scope-${created.length}`;
    created.push(id);
    return {
      id,
      get(key: string) {
        return patch[key];
      },
      has(key: string) {
        return key in patch;
      },
    };
  });
  const disposeScope: any = vi.fn((id: string) => {
    disposed.push(id);
  });
  return { created, disposed, createScope, disposeScope };
}

describe('variant-field-matching — expression match scope pairing (09-01)', () => {
  it('creates and disposes a scope for every expression match evaluation', () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    const evaluate: any = vi.fn((target: unknown, scope?: { get: (key: string) => unknown }) => {
      const expr = String(target).replace(/^\$\{/, '').replace(/\}$/, '');
      return expr === 'value == 42' ? scope?.get('value') === 42 : false;
    });

    const option = {
      key: 'a',
      match: { kind: 'expression', when: '${value == 42}' },
    } as never;

    expect(matchesVariant(option, 42, evaluate, undefined, createScope, disposeScope)).toBe(true);
    expect(matchesVariant(option, 7, evaluate, undefined, createScope, disposeScope)).toBe(false);

    expect(created.length).toBe(2);
    expect(disposed).toEqual(created);
  });

  it('detectMatchedVariant and resolveInitialVariant pair scopes for expression matches', () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    const evaluate: any = vi.fn((target: unknown, scope?: { get: (key: string) => unknown }) => {
      const expr = String(target).replace(/^\$\{/, '').replace(/\}$/, '');
      return expr === 'value == 42' ? scope?.get('value') === 42 : false;
    });
    const variants = [
      {
        key: 'a',
        match: { kind: 'expression', when: '${value == 42}' },
      },
      { key: 'b' },
    ] as never;

    expect(detectMatchedVariant(variants, 42, evaluate, undefined, createScope, disposeScope)).toBe('a');
    expect(resolveInitialVariant(variants, 42, undefined, evaluate, undefined, createScope, disposeScope)).toBe('a');

    expect(created.length).toBe(2);
    expect(disposed).toEqual(created);
  });
});
