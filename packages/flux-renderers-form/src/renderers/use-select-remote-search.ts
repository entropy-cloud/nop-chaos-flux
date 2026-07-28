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
    const controller = new AbortController();
    const handle = setTimeout(() => {
      if (controller.signal.aborted) return;
      startTransition(() => {
        setLoading(true);
        setError(undefined);
      });
      const actionInput = searchSource as ActionSchema;
      helpers
        .dispatch(actionInput, { scope: helpers.createScope({ searchQuery: trimmed }), signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
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
          if (err instanceof DOMException && err.name === 'AbortError') return;
          startTransition(() => {
            setError(err instanceof Error ? err.message : 'Search failed.');
            setRemoteOptions([]);
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            startTransition(() => setLoading(false));
          }
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [active, helpers, query, searchSource]);

  return { remoteOptions, loading, error };
}
