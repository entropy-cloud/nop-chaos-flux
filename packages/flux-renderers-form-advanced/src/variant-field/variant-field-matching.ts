import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import type { VariantOption } from '../composite-field/composite-schemas.js';

function unwrapPreservedMatchWhen(input: unknown): string | undefined {
  if (typeof input === 'string') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const candidate = input as { __nopPreserveLiteral?: unknown; value?: unknown };
  if (candidate.__nopPreserveLiteral !== true || typeof candidate.value !== 'string') {
    return undefined;
  }

  return candidate.value;
}

export function matchesVariant(
  option: VariantOption,
  value: unknown,
  evaluate?: RendererComponentProps['helpers']['evaluate'],
  scope?: ScopeRef,
  createScope?: RendererComponentProps['helpers']['createScope'],
): boolean {
  void scope;
  const match = option.match;
  if (!match) return false;
  const kind = match.kind;
  if (kind === 'typeof') {
    return typeof value === match.value;
  }
  if (kind === 'array') {
    return Array.isArray(value);
  }
  if (kind === 'has-key') {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      match.key !== undefined &&
      match.key in (value as object)
    );
  }
  if (kind === 'shape') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Array.isArray(match.requiredKeys) ? (match.requiredKeys as string[]) : [];
    return keys.every((k) => k in (value as object));
  }
  if (kind === 'expression') {
    if (!evaluate || !createScope || value == null) {
      return false;
    }

    const whenSource = unwrapPreservedMatchWhen(match.when);
    if (!whenSource) {
      return false;
    }

    return Boolean(evaluate<boolean>(whenSource, createScope({ value })));
  }
  return false;
}

export function detectMatchedVariant(
  variants: VariantOption[],
  value: unknown,
  evaluate?: RendererComponentProps['helpers']['evaluate'],
  scope?: ScopeRef,
  createScope?: RendererComponentProps['helpers']['createScope'],
): string | undefined {
  for (const option of variants) {
    if (option.match && matchesVariant(option, value, evaluate, scope, createScope)) {
      return option.key;
    }
  }
  return undefined;
}

export function resolveInitialVariant(
  variants: VariantOption[],
  value: unknown,
  defaultVariant?: string,
  evaluate?: RendererComponentProps['helpers']['evaluate'],
  scope?: ScopeRef,
  createScope?: RendererComponentProps['helpers']['createScope'],
): string | undefined {
  const matchedKey = detectMatchedVariant(variants, value, evaluate, scope, createScope);
  if (matchedKey) {
    return matchedKey;
  }
  if (defaultVariant && variants.some((v) => v.key === defaultVariant)) {
    return defaultVariant;
  }
  return variants[0]?.key;
}

export function extractDetectedVariant(result: unknown): string | undefined {
  if (typeof result === 'string') {
    return result;
  }

  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const variant = (result as { variant?: unknown }).variant;
  return typeof variant === 'string' ? variant : undefined;
}
