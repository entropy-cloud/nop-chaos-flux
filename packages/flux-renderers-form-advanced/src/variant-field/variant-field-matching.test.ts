import { describe, expect, it, vi } from 'vitest';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import type { VariantOption } from '../composite-field/composite-schemas';
import {
  detectMatchedVariant,
  extractDetectedVariant,
  matchesVariant,
  resolveInitialVariant,
} from './variant-field-matching';

describe('variant-field matching utilities', () => {
  it('matches built-in kinds and rejects unsupported values', () => {
    expect(matchesVariant({ key: 'missing' } as VariantOption, 'value')).toBe(false);
    expect(
      matchesVariant({ key: 'string', match: { kind: 'typeof', value: 'string' } } as VariantOption, 'value'),
    ).toBe(true);
    expect(matchesVariant({ key: 'array', match: { kind: 'array' } } as VariantOption, ['a'])).toBe(true);
    expect(
      matchesVariant({ key: 'has-key', match: { kind: 'has-key', key: 'name' } } as VariantOption, {
        name: 'Alice',
      }),
    ).toBe(true);
    expect(
      matchesVariant({ key: 'has-key', match: { kind: 'has-key', key: 'name' } } as VariantOption, ['name']),
    ).toBe(false);
    expect(
      matchesVariant(
        { key: 'shape', match: { kind: 'shape', requiredKeys: ['name', 'role'] } } as VariantOption,
        { name: 'Alice', role: 'admin' },
      ),
    ).toBe(true);
    expect(
      matchesVariant(
        { key: 'shape', match: { kind: 'shape', requiredKeys: ['name'] } } as VariantOption,
        null,
      ),
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
        {
          key: 'expression',
          match: { kind: 'expression', when: '${value.enabled === true}' },
        } as VariantOption,
        { enabled: true },
        evaluate as RendererHelpers['evaluate'],
        undefined,
        createScope as unknown as RendererHelpers['createScope'],
      ),
    ).toBe(true);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(createScope).toHaveBeenCalledWith({ value: { enabled: true } });

    expect(
      matchesVariant(
        {
          key: 'missing-evaluate',
          match: { kind: 'expression', when: '${value.enabled === true}' },
        } as VariantOption,
        { enabled: true },
        undefined,
        undefined,
        createScope as unknown as RendererHelpers['createScope'],
      ),
    ).toBe(false);
    expect(
      matchesVariant(
        {
          key: 'missing-scope',
          match: { kind: 'expression', when: '${value.enabled === true}' },
        } as VariantOption,
        { enabled: true },
        evaluate as RendererHelpers['evaluate'],
        undefined,
        undefined,
      ),
    ).toBe(false);
    expect(
      matchesVariant(
        {
          key: 'null-value',
          match: { kind: 'expression', when: '${value.enabled === true}' },
        } as VariantOption,
        null,
        evaluate as RendererHelpers['evaluate'],
        undefined,
        createScope as unknown as RendererHelpers['createScope'],
      ),
    ).toBe(false);
  });

  it('detects variants and applies fallback resolution rules', () => {
    const variants = [
      { key: 'string', match: { kind: 'typeof', value: 'string' } },
      { key: 'array', match: { kind: 'array' } },
    ] as VariantOption[];

    expect(detectMatchedVariant(variants, ['x'])).toBe('array');
    expect(detectMatchedVariant(variants, 42)).toBeUndefined();
    expect(resolveInitialVariant(variants, 'hello', 'array')).toBe('string');
    expect(resolveInitialVariant(variants, 42, 'array')).toBe('array');
    expect(resolveInitialVariant(variants, 42, 'missing')).toBe('string');
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
