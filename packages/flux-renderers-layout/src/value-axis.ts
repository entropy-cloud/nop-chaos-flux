import { useState } from 'react';
import type { OwnershipMode } from '@nop-chaos/flux-core';
import {
  resolveOwnershipMode,
  useOwnershipScopeValue,
  useScopeWrite,
  useWarnScopeDegraded,
} from '@nop-chaos/flux-react';

/**
 * `valueOwnership` axis value hook for steps/timeline (scalar chain). Thin
 * composition over the flux-react ownership primitive (RM-11 plan 613) that
 * preserves this family's legacy behavior: local initial `value ?? defaultValue`,
 * scope chain ends in the mirrored `localValue`, and scope writes normalize to
 * `null` and mirror into local state.
 */
interface ValueOwnershipSchemaProps {
  valueOwnership?: unknown;
  valueStatePath?: unknown;
  value?: unknown;
  defaultValue?: unknown;
}

export function useValueOwnershipValue(
  schemaProps: ValueOwnershipSchemaProps,
  warnPrefix: string,
): {
  ownership: OwnershipMode;
  currentValue: string | number | undefined;
  setValue: (next: string | number | undefined) => void;
} {
  const { ownership, statePath, scopeDegraded } = resolveOwnershipMode({
    ownership: schemaProps.valueOwnership,
    statePath: schemaProps.valueStatePath,
  });

  useWarnScopeDegraded(
    scopeDegraded,
    `[${warnPrefix}] valueOwnership=scope requires valueStatePath; falling back to local controlled.`,
  );

  const effectiveScopeValue = useOwnershipScopeValue<string | number>(ownership, statePath);

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
