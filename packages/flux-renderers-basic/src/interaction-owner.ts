import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';

export function useOwnedAxisValue<TValue extends string | number>(input: {
  ownership?: 'local' | 'controlled' | 'scope';
  value?: TValue;
  defaultValue?: TValue;
  statePath?: string;
  fallbackValue: TValue;
}) {
  const renderScope = useRenderScope();
  const scopeData = useScopeSelector((scope) => scope);
  const ownership = input.ownership ?? 'local';
  const [localValue, setLocalValue] = useState<TValue>(input.defaultValue ?? input.value ?? input.fallbackValue);
  const scopeValue = ownership === 'scope' && input.statePath
    ? getIn(scopeData, input.statePath) as TValue | undefined
    : undefined;

  const value = ownership === 'controlled'
    ? (input.value ?? input.fallbackValue)
    : ownership === 'scope'
      ? (scopeValue ?? input.value ?? input.defaultValue ?? input.fallbackValue)
      : localValue;

  const setValue = useCallback((nextValue: TValue) => {
    startTransition(() => {
      if (ownership === 'local') {
        setLocalValue(nextValue);
      } else if (ownership === 'scope' && input.statePath) {
        renderScope.update(input.statePath, nextValue);
      }
    });
  }, [ownership, input.statePath, renderScope]);

  return useMemo(() => ({ ownership, value, setValue }), [ownership, value, setValue]);
}
