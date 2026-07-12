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
  };
  infiniteSentinelRef: RefObject<HTMLDivElement | null> | null;
  onRetry: () => void;
}) {
  return (
    <div className="nop-crud-infinite" data-slot="crud-infinite">
      <div data-slot="crud-infinite-status">
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
            onRetry();
          }}
        >
          {t('flux.common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
