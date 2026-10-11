import { useEffect, useRef, startTransition, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';

// WA-layout-001 (plan 567): the valueOwnership scaffolding lived as three
// per-renderer copies (steps ↔ timeline verbatim, collapse as the array
// specialization). cq-3 (5ad81bbf2) extracted step-index.ts and left the hooks
// per-renderer; the hooks have since converged (the diverging fallback chains
// moved up into the renderer bodies' resolveFinalIndex layers), so the shared
// primitive below replaces the copies. The registration comment in
// step-index.ts documents the current split point.

const UNUSED: unique symbol = Symbol('unused');

/** Structural shape of the resolved props the ownership hooks read. */
interface ValueOwnershipSchemaProps {
  valueOwnership?: unknown;
  valueStatePath?: unknown;
  value?: unknown;
  defaultValue?: unknown;
}

interface ResolvedOwnershipMode {
  ownership: 'local' | 'controlled' | 'scope';
  statePath: string | undefined;
  scopeDegraded: boolean;
}

/** Effective ownership: scope without valueStatePath degrades to local controlled (+ dev warn). */
export function resolveOwnershipMode(schemaProps: ValueOwnershipSchemaProps): ResolvedOwnershipMode {
  const declaredOwnership = (schemaProps.valueOwnership as string) ?? 'local';
  const statePath =
    typeof schemaProps.valueStatePath === 'string' ? schemaProps.valueStatePath : undefined;
  const scopeDegraded = declaredOwnership === 'scope' && !statePath;
  const ownership = scopeDegraded ? 'local' : (declaredOwnership as 'local' | 'controlled' | 'scope');
  return { ownership, statePath, scopeDegraded };
}

function warnScopeDegraded(prefix: string): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      `[${prefix}] valueOwnership=scope requires valueStatePath; falling back to local controlled.`,
    );
  }
}

export function useWarnScopeDegraded(scopeDegraded: boolean, prefix: string): void {
  const warnedRef = useRef(false);
  useEffect(() => {
    if (scopeDegraded && !warnedRef.current) {
      warnScopeDegraded(prefix);
      warnedRef.current = true;
    }
  }, [scopeDegraded, prefix]);
}

/** Reactive scope read for scope-owned values (UNUSED sentinel when inactive). */
export function useOwnershipScopeValue(
  ownership: 'local' | 'controlled' | 'scope',
  statePath: string | undefined,
): unknown {
  const scopeValue = useScopeSelector(
    ownership === 'scope' && statePath
      ? (scopeData) => getIn(scopeData, statePath) as unknown
      : () => UNUSED as unknown,
    Object.is,
    {
      enabled: ownership === 'scope' && Boolean(statePath),
      fallback: undefined,
      paths: ownership === 'scope' && statePath ? [statePath] : undefined,
    },
  );
  return scopeValue === (UNUSED as unknown) ? undefined : scopeValue;
}

export function useScopeWrite(): (statePath: string, next: unknown) => void {
  const renderScope = useRenderScope();
  return (statePath: string, next: unknown) => {
    startTransition(() => {
      renderScope.update(statePath, next ?? null);
    });
  };
}

/**
 * Scalar value-ownership hook (steps/timeline): value is `string | number |
 * undefined`. The collapse renderer keeps its string[] specialization on top
 * of the same primitives.
 */
export function useValueOwnershipValue(
  schemaProps: ValueOwnershipSchemaProps,
  warnPrefix: string,
): { ownership: ResolvedOwnershipMode['ownership']; currentValue: string | number | undefined; setValue: (next: string | number | undefined) => void } {
  const { ownership, statePath, scopeDegraded } = resolveOwnershipMode(schemaProps);

  useWarnScopeDegraded(scopeDegraded, warnPrefix);

  const effectiveScopeValue = useOwnershipScopeValue(ownership, statePath);

  const computeInitial = (): string | number | undefined => {
    if (ownership === 'controlled') return schemaProps.value as string | number | undefined;
    if (ownership === 'scope') {
      return (
        (effectiveScopeValue as string | number | undefined) ??
        (schemaProps.value as string | number | undefined) ??
        (schemaProps.defaultValue as string | number | undefined)
      );
    }
    return (schemaProps.value as string | number | undefined) ?? (schemaProps.defaultValue as string | number | undefined);
  };

  const [localValue, setLocalValue] = useState<string | number | undefined>(computeInitial);

  const currentValue =
    ownership === 'controlled'
      ? (schemaProps.value as string | number | undefined)
      : ownership === 'scope'
        ? ((effectiveScopeValue as string | number | undefined) ??
        (schemaProps.value as string | number | undefined) ??
        localValue)
        : localValue;

  const writeScope = useScopeWrite();

  const setValue = (next: string | number | undefined) => {
    if (ownership === 'local') {
      setLocalValue(next);
    } else if (ownership === 'scope' && statePath) {
      writeScope(statePath, next);
      setLocalValue(next);
    }
    // controlled: clicks dispatch onChange but do NOT mutate (parent must update value).
  };

  return { ownership, currentValue, setValue };
}
