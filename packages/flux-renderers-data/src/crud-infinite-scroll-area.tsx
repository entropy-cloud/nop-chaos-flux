import { type RefObject } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';

export function CrudInfiniteScrollArea({
  loadDataOnce,
  filteredRowCount,
  atLastPage,
  infiniteState,
  infiniteSentinelRef,
  onRetry,
}: {
  loadDataOnce: boolean;
  filteredRowCount: number;
  atLastPage: boolean;
  infiniteState: {
    loading: boolean;
    error: unknown;
    setError: (err: unknown) => void;
    setLoading: (next: boolean) => void;
  };
  infiniteSentinelRef: RefObject<HTMLDivElement | null> | null;
  onRetry: () => Promise<unknown> | void;
}) {
  return (
    <div className="nop-crud-infinite" data-slot="crud-infinite">
      <div
        data-slot="crud-infinite-status"
        role="status"
        aria-live="polite"
      >
        {loadDataOnce
          ? t('flux.crud.loadedAll', { count: filteredRowCount })
          : atLastPage
            ? t('flux.crud.noMoreData')
            : infiniteState.error
              ? t('flux.crud.loadFailed')
              : infiniteState.loading
                ? t('flux.crud.loadingMore')
                : ''}
      </div>
      {infiniteSentinelRef != null ? (
        <div
          ref={infiniteSentinelRef}
          data-slot="crud-infinite-sentinel"
          style={{ height: 1 }}
          aria-hidden
        />
      ) : null}
      {infiniteState.error ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            infiniteState.setError(undefined);
            const result = onRetry();
            if (result && typeof (result as Promise<unknown>).then === 'function') {
              infiniteState.setLoading(true);
              void Promise.resolve(result)
                .then((value) => {
                  const ok =
                    value && typeof value === 'object'
                      ? (value as { ok?: boolean }).ok
                      : undefined;
                  if (ok === false) {
                    infiniteState.setError(
                      (value as { error?: unknown }).error ?? new Error('Load failed'),
                    );
                  }
                })
                .catch((err: unknown) => {
                  infiniteState.setError(err);
                })
                .finally(() => {
                  infiniteState.setLoading(false);
                });
            }
          }}
        >
          {t('flux.common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
