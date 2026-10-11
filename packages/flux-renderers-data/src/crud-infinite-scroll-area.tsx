import { type RefObject } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Spinner } from '@nop-chaos/ui';
import { consumeLoadResult } from './infinite-load.js';

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
                ? (
                  <span
                    data-slot="crud-infinite-loading"
                    className="inline-flex items-center gap-2"
                  >
                    <Spinner className="size-4" aria-hidden="true" />
                    <span>{t('flux.crud.loadingMore')}</span>
                  </span>
                )
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
            consumeLoadResult(onRetry(), infiniteState);
          }}
        >
          {t('flux.common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
