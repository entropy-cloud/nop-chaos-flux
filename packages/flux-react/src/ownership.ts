import { useCallback, useEffect, useMemo, useRef, startTransition, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import type { OwnershipMode } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from './hooks.js';

// Shared ownership primitive (RM-11 / plan 613): the single site for tri-state
// (`local | controlled | scope`) value-ownership resolution — scope
// subscription, degraded-mode warning, and scope write-back. Renderer packages
// consume these building blocks instead of keeping per-axis copies
// (naming-conventions §4.8).

const UNUSED: unique symbol = Symbol('ownership-unused');

export interface OwnershipAxisInput {
  /** Declared `<axis>Ownership` schema value (unvalidated — cast semantics match the merged copies). */
  ownership?: unknown;
  /** Declared `<axis>StatePath` schema value. */
  statePath?: unknown;
}

export interface ResolvedOwnershipMode {
  ownership: OwnershipMode;
  statePath: string | undefined;
  scopeDegraded: boolean;
}

/** Effective ownership: scope without a statePath degrades to local (see `useWarnScopeDegraded`). */
export function resolveOwnershipMode(input: OwnershipAxisInput): ResolvedOwnershipMode {
  const declaredOwnership = (input.ownership as string) ?? 'local';
  const statePath =
    typeof input.statePath === 'string' && input.statePath.length > 0 ? input.statePath : undefined;
  const scopeDegraded = declaredOwnership === 'scope' && !statePath;
  const ownership = scopeDegraded ? 'local' : (declaredOwnership as OwnershipMode);
  return { ownership, statePath, scopeDegraded };
}

/** One-shot dev warning for scope-without-statePath degradation (message is caller-owned so legacy texts are preserved verbatim). */
export function useWarnScopeDegraded(scopeDegraded: boolean, message?: string): void {
  const warnedRef = useRef(false);
  useEffect(() => {
    if (scopeDegraded && !warnedRef.current) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          message ??
            '[ownership] scope ownership requires a statePath; falling back to local controlled.',
        );
      }
      warnedRef.current = true;
    }
  }, [scopeDegraded, message]);
}

export interface OwnershipScopeRead<T> {
  /** Custom projection of the scope data (default: `getIn(scopeData, statePath)`). */
  select?: (scopeData: unknown) => T;
  /** Custom equality for subscription updates (default: `Object.is`). */
  equality?: (a: T, b: T) => boolean;
  /**
   * Subscription path override (default: `[statePath]`). For consumers reading
   * more than one scope path in one projection (e.g. list pagination reads
   * `paginationStatePath` + `pageSizeStatePath`).
   */
  paths?: readonly string[];
}

/**
 * Reactive scope read for scope-owned values. Subscribes only when ownership
 * is `scope` and a statePath is present (UNUSED sentinel otherwise); returns
 * `undefined` when inactive.
 */
export function useOwnershipScopeValue<T = unknown>(
  ownership: OwnershipMode,
  statePath: string | undefined,
  read?: OwnershipScopeRead<T>,
): T | undefined {
  const active = ownership === 'scope' && Boolean(statePath);
  const select =
    read?.select ?? ((scopeData: unknown) => getIn(scopeData, statePath as string) as T);
  const equality = (read?.equality ?? Object.is) as (
    a: T | undefined,
    b: T | undefined,
  ) => boolean;
  const scopeValue = useScopeSelector<T | undefined, unknown>(
    active ? select : () => UNUSED as unknown as T | undefined,
    equality,
    {
      enabled: active,
      fallback: undefined,
      paths: read?.paths ?? (active && statePath ? [statePath] : undefined),
    },
  );
  return scopeValue === (UNUSED as unknown) ? undefined : scopeValue;
}

/** Scope write-back (startTransition-wrapped scope update). */
export function useScopeWrite(): (statePath: string, next: unknown) => void {
  const renderScope = useRenderScope();
  return (statePath: string, next: unknown) => {
    startTransition(() => {
      renderScope.update(statePath, next ?? null);
    });
  };
}

export interface OwnedAxisValueInput<TValue> {
  ownership?: unknown;
  statePath?: unknown;
  value?: TValue;
  defaultValue?: TValue;
  /** Terminal fallback for `local` initial state and `controlled` reads. */
  fallbackValue: TValue;
  warnPrefix?: string;
}

/**
 * Generic axis value read/write: `local` = useState, `controlled` = pure view
 * of the bound value, `scope` = scope read with value/defaultValue fallback and
 * scope write-back. Composition chains follow the interaction-owner copy
 * (RM-11 merged semantics); consumers needing divergent chains compose the
 * building blocks above locally instead.
 */
export function useOwnedAxisValue<TValue extends string | number>(input: OwnedAxisValueInput<TValue>): {
  ownership: OwnershipMode;
  value: TValue;
  setValue: (next: TValue) => void;
} {
  const renderScope = useRenderScope();
  const { ownership, statePath, scopeDegraded } = resolveOwnershipMode(input);

  useWarnScopeDegraded(
    scopeDegraded,
    input.warnPrefix ? `[${input.warnPrefix}] scope ownership requires a statePath; falling back to local controlled.` : undefined,
  );

  const effectiveScopeValue = useOwnershipScopeValue<TValue>(ownership, statePath);

  const [localValue, setLocalValue] = useState<TValue>(
    input.defaultValue ?? input.value ?? input.fallbackValue,
  );

  const value =
    ownership === 'controlled'
      ? (input.value ?? input.fallbackValue)
      : ownership === 'scope'
        ? (effectiveScopeValue ?? input.value ?? input.defaultValue ?? input.fallbackValue)
        : localValue;

  // Consumer effects key on this hook's return identity (e.g. tabs candidate-fix
  // deps `[items, ownedAxis]`) — keep the object/setValue referentially stable
  // like the merged interaction-owner copy did.
  const setValue = useCallback(
    (nextValue: TValue) => {
      startTransition(() => {
        if (ownership === 'local') {
          setLocalValue(nextValue);
        } else if (ownership === 'scope' && statePath) {
          renderScope.update(statePath, nextValue);
        }
      });
    },
    [ownership, statePath, renderScope],
  );

  return useMemo(() => ({ ownership, value, setValue }), [ownership, value, setValue]);
}
