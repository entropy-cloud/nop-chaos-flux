import { describe, expect, it, vi } from 'vitest';
import {
  detectMatchedVariant,
  extractDetectedVariant,
  matchesVariant,
  resolveInitialVariant,
} from './variant-field-matching';

describe('variant-field matching utilities', () => {
  it('matches built-in kinds and rejects unsupported values', () => {
    expect(matchesVariant({ key: 'missing' } as any, 'value')).toBe(false);
    expect(matchesVariant({ key: 'string', match: { kind: 'typeof', value: 'string' } } as any, 'value')).toBe(true);
    expect(matchesVariant({ key: 'array', match: { kind: 'array' } } as any, ['a'])).toBe(true);
    expect(matchesVariant({ key: 'has-key', match: { kind: 'has-key', key: 'name' } } as any, { name: 'Alice' })).toBe(true);
    expect(matchesVariant({ key: 'has-key', match: { kind: 'has-key', key: 'name' } } as any, ['name'])).toBe(false);
    expect(
      matchesVariant(
        { key: 'shape', match: { kind: 'shape', requiredKeys: ['name', 'role'] } } as any,
        { name: 'Alice', role: 'admin' }
      )
    ).toBe(true);
    expect(
      matchesVariant(
        { key: 'shape', match: { kind: 'shape', requiredKeys: ['name'] } } as any,
        null
      )
    ).toBe(false);
  });

  it('requires evaluator and scope creation for expression matches', () => {
    const evaluate = vi.fn((expression: string, scope: { value: { enabled?: boolean } }) => {
      expect(expression).toBe('${value.enabled === true}');
      return scope.value.enabled === true;
    });
    const createScope = vi.fn((scopeData: { value: { enabled?: boolean } }) => scopeData);

    expect(
      matchesVariant(
        { key: 'expression', match: { kind: 'expression', when: '${value.enabled === true}' } } as any,
        { enabled: true },
        evaluate as any,
        undefined,
        createScope as any
      )
    ).toBe(true);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(createScope).toHaveBeenCalledWith({ value: { enabled: true } });

    expect(
      matchesVariant(
        { key: 'missing-evaluate', match: { kind: 'expression', when: '${value.enabled === true}' } } as any,
        { enabled: true },
        undefined,
        undefined,
        createScope as any
      )
    ).toBe(false);
    expect(
      matchesVariant(
        { key: 'missing-scope', match: { kind: 'expression', when: '${value.enabled === true}' } } as any,
        { enabled: true },
        evaluate as any,
        undefined,
        undefined
      )
    ).toBe(false);
    expect(
      matchesVariant(
        { key: 'null-value', match: { kind: 'expression', when: '${value.enabled === true}' } } as any,
        null,
        evaluate as any,
        undefined,
        createScope as any
      )
    ).toBe(false);
  });

  it('detects variants and applies fallback resolution rules', () => {
    const variants = [
      { key: 'string', match: { kind: 'typeof', value: 'string' } },
      { key: 'array', match: { kind: 'array' } },
    ] as any[];

    expect(detectMatchedVariant(variants as any, ['x'])).toBe('array');
    expect(detectMatchedVariant(variants as any, 42)).toBeUndefined();
    expect(resolveInitialVariant(variants as any, 'hello', 'array')).toBe('string');
    expect(resolveInitialVariant(variants as any, 42, 'array')).toBe('array');
    expect(resolveInitialVariant(variants as any, 42, 'missing')).toBe('string');
    expect(resolveInitialVariant([], 42, 'missing')).toBeUndefined();
  });

  it('extracts detected variants from string and object results only', () => {
    expect(extractDetectedVariant('advanced')).toBe('advanced');
    expect(extractDetectedVariant({ variant: 'basic' })).toBe('basic');
    expect(extractDetectedVariant({ variant: 123 })).toBeUndefined();
    expect(extractDetectedVariant(false)).toBeUndefined();
    expect(extractDetectedVariant(undefined)).toBeUndefined();
  });
});
