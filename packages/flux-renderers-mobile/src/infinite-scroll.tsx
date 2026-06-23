import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Spinner, cn } from '@nop-chaos/ui';
import type { InfiniteScrollSchema } from './schemas.js';

type InfiniteScrollStatus = 'normal' | 'loading' | 'finished' | 'error';

function resolveStatus(runtime: {
  hasMore?: boolean;
  loading?: boolean;
  error?: boolean | string;
}): InfiniteScrollStatus {
  if (runtime.error === true || typeof runtime.error === 'string') return 'error';
  if (runtime.hasMore === false) return 'finished';
  if (runtime.loading === true) return 'loading';
  return 'normal';
}

export function InfiniteScrollRenderer(props: RendererComponentProps<InfiniteScrollSchema>) {
  const slotProps = props.props;
  const disabled = slotProps.disabled === true;
  const distance = typeof slotProps.distance === 'number' ? slotProps.distance : 200;
  const immediateCheck = slotProps.immediateCheck !== false;

  const hasMore = slotProps.hasMore;
  const loading = slotProps.loading;
  const error = slotProps.error;

  const loadingText =
    slotProps.loadingText ?? t('flux.mobile.infiniteScroll.loading', { defaultValue: '加载中...' });
  const finishedText =
    slotProps.finishedText ?? t('flux.mobile.infiniteScroll.finished', { defaultValue: '没有更多了' });
  const errorText =
    slotProps.errorText ?? t('flux.mobile.infiniteScroll.error', { defaultValue: '加载失败，点击重试' });

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = React.useRef(props.events.onLoadMore);
  React.useEffect(() => {
    onLoadMoreRef.current = props.events.onLoadMore;
  }, [props.events.onLoadMore]);

  // Semantic resolution (kept as explicit booleans so implicit-truthy values
  // do not accidentally engage the guards): `hasMore === false` means the host
  // explicitly declared "no more data"; any other value (true/undefined) keeps
  // loading eligible. `error === true | string` fully suspends auto-loading.
  const isFinished = hasMore === false;
  const hasError = error === true || typeof error === 'string';

  // MA-13: local in-flight guard. The host `loading` prop only flips AFTER the
  // host receives the onLoadMore event, so the IntersectionObserver callback
  // and the immediateCheck effect can both fire before `loading` turns true.
  // This ref synchronously dedupes those auto paths. It is released on any
  // `loading` transition (the host has acknowledged or concluded the request);
  // if the host never updates `loading`, the guard stays — over-locking is the
  // conservative, safe failure mode (better than duplicate requests).
  const isLoadingRef = React.useRef(false);
  React.useEffect(() => {
    isLoadingRef.current = false;
  }, [loading]);

  // MA-14: every onLoadMore dispatch is guarded against reject / sync-throw so
  // a failing action never crashes the renderer; the host surfaces failure via
  // the `error` prop (retry <Button>). The call itself stays synchronous to
  // preserve the original timing contract.
  const fireLoadMore = React.useCallback(() => {
    isLoadingRef.current = true;
    try {
      void Promise.resolve(onLoadMoreRef.current?.()).catch(() => {
        /* host owns error surfacing via the `error` prop */
      });
    } catch {
      /* sync throw swallowed; in-flight guard stays until host clears loading */
    }
  }, []);

  const status = resolveStatus({ hasMore, loading, error });

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (disabled) return;
        if (isFinished) return;
        if (loading === true) return;
        // OA-10: an error state fully suspends automatic loading — only the
        // explicit retry <Button> (triggerLoadMore) may resume, so the user
        // is always routed through the retry UX instead of silent re-fetches.
        if (hasError) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (isLoadingRef.current) continue;
            fireLoadMore();
          }
        }
      },
      { rootMargin: `0px 0px ${distance}px 0px` },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // `error` (via hasError) is included so the observer is rebuilt armed with
    // the correct guard when entering/leaving the error state (OA-10, MA-20).
  }, [distance, disabled, isFinished, loading, hasError, fireLoadMore]);

  React.useEffect(() => {
    if (!immediateCheck) return;
    if (disabled) return;
    if (isFinished) return;
    if (loading === true) return;
    if (hasError) return;
    if (isLoadingRef.current) return;
    fireLoadMore();
  }, [immediateCheck, disabled, isFinished, loading, hasError, fireLoadMore]);

  const triggerLoadMore = () => {
    if (disabled) return;
    if (isFinished) return;
    if (isLoadingRef.current) return;
    fireLoadMore();
  };

  const bodyContent = props.regions.body?.render() as React.ReactNode;

  return (
    <div
      className={cn('nop-infinite-scroll', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="infinite-scroll"
      data-status={status}
    >
      <div data-slot="infinite-scroll-body">
        {bodyContent}
      </div>
      <div
        data-slot="infinite-scroll-sentinel"
        ref={sentinelRef}
        aria-hidden="true"
        style={{ height: 1 }}
      />
      <div
        data-slot="infinite-scroll-status"
        role="status"
        aria-live="polite"
        onClick={status === 'error' ? triggerLoadMore : undefined}
        onKeyDown={
          status === 'error'
            ? (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                triggerLoadMore();
              }
            : undefined
        }
        tabIndex={status === 'error' ? 0 : undefined}
        data-status-text={
          status === 'loading'
            ? loadingText
            : status === 'finished'
              ? finishedText
              : status === 'error'
                ? errorText
                : undefined
        }
      >
        {status === 'loading' ? (
          <span>
            <Spinner className="size-4" />
            <span className="ml-2">{loadingText}</span>
          </span>
        ) : null}
        {status === 'finished' ? <span>{finishedText}</span> : null}
        {status === 'error' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              triggerLoadMore();
            }}
          >
            {errorText}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
