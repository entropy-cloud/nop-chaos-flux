import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, Spinner, cn } from '@nop-chaos/ui';
import type { InfiniteScrollSchema } from './schemas.js';

interface InfiniteScrollRuntimeProps {
  hasMore?: boolean;
  loading?: boolean;
  error?: boolean | string;
}

type InfiniteScrollStatus = 'normal' | 'loading' | 'finished' | 'error';

function resolveStatus(runtime: InfiniteScrollRuntimeProps): InfiniteScrollStatus {
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

  const hasMore = (slotProps as InfiniteScrollRuntimeProps).hasMore;
  const loading = (slotProps as InfiniteScrollRuntimeProps).loading;
  const error = (slotProps as InfiniteScrollRuntimeProps).error;

  const loadingText = slotProps.loadingText ?? '加载中...';
  const finishedText = slotProps.finishedText ?? '没有更多了';
  const errorText = slotProps.errorText ?? '加载失败，点击重试';

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = React.useRef(props.events.onLoadMore);
  React.useEffect(() => {
    onLoadMoreRef.current = props.events.onLoadMore;
  }, [props.events.onLoadMore]);

  const status = resolveStatus({ hasMore, loading, error });

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (disabled) return;
        if (hasMore === false) return;
        if (loading === true) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void onLoadMoreRef.current?.();
          }
        }
      },
      { rootMargin: `0px 0px ${distance}px 0px` },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [distance, disabled, hasMore, loading]);

  React.useEffect(() => {
    if (!immediateCheck) return;
    if (disabled) return;
    if (hasMore === false) return;
    if (loading === true) return;
    void onLoadMoreRef.current?.();
  }, [immediateCheck, disabled, hasMore, loading]);

  const triggerLoadMore = () => {
    if (disabled) return;
    if (hasMore === false) return;
    void onLoadMoreRef.current?.();
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
      <div data-slot="infinite-scroll-body" className="nop-infinite-scroll__body">
        {bodyContent}
      </div>
      <div
        data-slot="infinite-scroll-sentinel"
        ref={sentinelRef}
        className="nop-infinite-scroll__sentinel"
        aria-hidden="true"
        style={{ height: 1 }}
      />
      <div
        data-slot="infinite-scroll-status"
        className="nop-infinite-scroll__status"
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
          <span className="nop-infinite-scroll__loading">
            <Spinner className="size-4" />
            <span className="ml-2">{loadingText}</span>
          </span>
        ) : null}
        {status === 'finished' ? <span className="nop-infinite-scroll__finished">{finishedText}</span> : null}
        {status === 'error' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="nop-infinite-scroll__error"
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
