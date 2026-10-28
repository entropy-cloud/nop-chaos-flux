import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { PullToRefresh, type PullToRefreshHandle } from './pull-to-refresh';

describe('PullToRefresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when idle', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div>content</div>
      </PullToRefresh>,
    );
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('imperative refresh shows refreshing indicator then resolves', async () => {
    const ref = createRef<PullToRefreshHandle>();
    let resolveRefresh!: () => void;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    render(
      <PullToRefresh ref={ref} onRefresh={onRefresh}>
        <div>content</div>
      </PullToRefresh>,
    );

    expect(screen.queryByText('刷新中...')).toBeNull();

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = ref.current!.refresh();
    });
    expect(screen.getByText('刷新中...')).toBeTruthy();
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh();
      await refreshPromise;
    });

    expect(screen.queryByText('刷新中...')).toBeNull();
  });

  it('refresh() is a no-op while already refreshing', async () => {
    const ref = createRef<PullToRefreshHandle>();
    let resolveRefresh!: () => void;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    render(
      <PullToRefresh ref={ref} onRefresh={onRefresh}>
        <div>content</div>
      </PullToRefresh>,
    );

    act(() => {
      void ref.current!.refresh();
    });
    await act(async () => {
      await ref.current!.refresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh();
    });
  });
});
