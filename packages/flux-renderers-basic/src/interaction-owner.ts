import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';

const UNUSED: unique symbol = Symbol('unused');

export function useOwnedAxisValue<TValue extends string | number>(input: {
  ownership?: 'local' | 'controlled' | 'scope';
  value?: TValue;
  defaultValue?: TValue;
  statePath?: string;
  fallbackValue: TValue;
}) {
  const renderScope = useRenderScope();
  const ownership = input.ownership ?? 'local';
  const statePath = input.statePath;

  // Only subscribe to the specific path when ownership is 'scope' and statePath is defined.
  // Otherwise return UNUSED to skip subscription entirely.
  const scopeValue = useScopeSelector(
    ownership === 'scope' && statePath
      ? (scopeData) => getIn(scopeData, statePath) as TValue | undefined
      : () => UNUSED as unknown as TValue | undefined,
    Object.is,
  );

  const [localValue, setLocalValue] = useState<TValue>(
    input.defaultValue ?? input.value ?? input.fallbackValue,
  );

  const effectiveScopeValue = scopeValue === (UNUSED as unknown) ? undefined : scopeValue;

  const value =
    ownership === 'controlled'
      ? (input.value ?? input.fallbackValue)
      : ownership === 'scope'
        ? (effectiveScopeValue ?? input.value ?? input.defaultValue ?? input.fallbackValue)
        : localValue;

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
