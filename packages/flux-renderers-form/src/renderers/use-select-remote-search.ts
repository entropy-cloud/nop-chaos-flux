import { startTransition, useEffect, useState } from 'react';
import type { ActionSchema, RendererHelpers } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import type { ChoiceOption } from './input-choice-renderers.js';

function searchFailureMessage(error: unknown): string {
  if (typeof error === 'string' && error) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t('flux.form.searchFailed');
}

export interface SelectRemoteSearchResult {
  remoteOptions: ChoiceOption[] | null;
  /**
   * Every option that ever arrived from a remote search, deduped by value.
   * Unlike `remoteOptions` (reset to null when the query empties), this pool
   * persists so the selected-value echo can still resolve the label of a
   * remotely-searched-and-selected value after the search query clears
   * (1-12). It is an echo-only pool: consumers must not feed it back into the
   * visible-options path.
   */
  remoteEchoCache: ChoiceOption[];
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
  const [remoteEchoCache, setRemoteEchoCache] = useState<ChoiceOption[]>([]);
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
      const searchScope = helpers.createScope({ searchQuery: trimmed });
      helpers
        .dispatch(actionInput, { scope: searchScope, signal: controller.signal })
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
            startTransition(() => {
              setRemoteOptions(options);
              // Echo-only retention (1-12): the search results survive the
              // query reset so a selected remote value keeps its label.
              setRemoteEchoCache((previous) => {
                const seen = new Set(previous.map((option) => String(option.value)));
                const merged = [...previous];
                for (const option of options) {
                  const key = String(option.value);
                  if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(option);
                  }
                }
                return merged;
              });
            });
          } else {
            startTransition(() => {
              setError(searchFailureMessage(result.error));
              setRemoteOptions([]);
            });
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          startTransition(() => {
            setError(searchFailureMessage(err));
            setRemoteOptions([]);
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            startTransition(() => setLoading(false));
          }
          helpers.disposeScope(searchScope.id);
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [active, helpers, query, searchSource]);

  return { remoteOptions, remoteEchoCache, loading, error };
}
