import { startTransition, useEffect, useState } from 'react';
import type { ActionSchema, RendererHelpers } from '@nop-chaos/flux-core';
import type { ChoiceOption } from './input-choice-renderers.js';

export interface SelectRemoteSearchResult {
  remoteOptions: ChoiceOption[] | null;
  loading: boolean;
  error: string | undefined;
}

export function useSelectRemoteSearch(input: {
  query: string;
  searchSource: ActionSchema | undefined;
  searchable: boolean;
  helpers: RendererHelpers;
  disabled: boolean;
}): SelectRemoteSearchResult {
  const { query, searchSource, searchable, helpers, disabled } = input;
  const active = searchable && Boolean(searchSource) && !disabled;
  const [remoteOptions, setRemoteOptions] = useState<ChoiceOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!active || !query.trim()) {
      startTransition(() => {
        setRemoteOptions(null);
        setLoading(false);
        setError(undefined);
      });
      return;
    }
    const trimmed = query.trim();
    let cancelled = false;
    const controller = new AbortController();
    const handle = setTimeout(() => {
      if (cancelled) return;
      startTransition(() => {
        setLoading(true);
        setError(undefined);
      });
      const actionInput = searchSource as ActionSchema;
      helpers
        .dispatch(actionInput, { scope: helpers.createScope({ searchQuery: trimmed }), signal: controller.signal })
        .then((result) => {
          if (cancelled) return;
          if (result.ok) {
            const data = Array.isArray(result.data) ? result.data : [];
            const options = data.map((item: Record<string, unknown>) => ({
              label: String(item.label ?? item.value ?? ''),
              value: item.value as string | number | boolean,
              disabled: item.disabled === true ? true : undefined,
              disabledTip: typeof item.disabledTip === 'string' ? item.disabledTip : undefined,
              ...item,
            } satisfies ChoiceOption)) as ChoiceOption[];
            startTransition(() => setRemoteOptions(options));
          } else {
            startTransition(() => {
              setError(
                typeof result.error === 'string' && result.error
                  ? result.error
                  : result.error instanceof Error
                    ? result.error.message
                    : 'Search failed.',
              );
              setRemoteOptions([]);
            });
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          startTransition(() => {
            setError(err instanceof Error ? err.message : 'Search failed.');
            setRemoteOptions([]);
          });
        })
        .finally(() => {
          if (!cancelled) {
            startTransition(() => setLoading(false));
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(handle);
    };
  }, [active, helpers, query, searchSource]);

  return { remoteOptions, loading, error };
}
