import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { CountdownSchema, PullRefreshSchema, SwipeCellSchema } from '../schemas.js';
import { CountdownRenderer } from '../countdown.js';
import { PullRefreshRenderer } from '../pull-refresh.js';
import { SwipeCellRenderer } from '../swipe-cell.js';
import { NoticeBarRenderer } from '../notice-bar.js';
import { createMockRendererProps } from '../test-support.js';
import { renderInfiniteScroll } from '../infinite-scroll-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

beforeAll(() => {
  // initFluxI18n is a module singleton that ignores options once initialized
  // (flux-i18n/src/i18n.ts:58-61), so force a clean en-US instance.
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US' });
});

afterAll(() => {
  resetFluxI18n();
});

function touch(x: number, y: number) {
  return {
    touches: [{ clientX: x, clientY: y } as Touch],
  } as unknown as React.TouchEvent;
}

type EventWithCtx = (
  event?: unknown,
  ctx?: { event?: unknown; evaluationBindings?: unknown },
) => Promise<void> | void;

function eventCtx(call: unknown): { event?: unknown; evaluationBindings?: unknown } {
  const args = call as [unknown, { event?: unknown; evaluationBindings?: unknown }?];
  return args[1] ?? {};
}

describe('mobile renderer i18n keys resolve against the flux.mobile locale bundle', () => {
  // C7 coverage hardening: locks the locale-resolution contract of the mobile
  // renderer texts. The renderers must read their display strings from the
  // flux.mobile.* locale bundle (zh-CN/en-US), not from a hardcoded default —
  // these assertions run the renderers under an en-US instance and assert the
  // en-US locale values are emitted.
  it('pull-refresh indicator texts resolve to en-US locale values', () => {
    const props = createMockRendererProps<PullRefreshSchema>({
      schema: { type: 'pull-refresh' },
      props: { threshold: 80 },
      regions: { body: <div>body</div> },
      events: {},
    });
    const { container } = render(<PullRefreshRenderer {...props} />);
    const root = container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 30));
    // pulling state under en-US: 'Pull to refresh' (pre-fix: '下拉刷新' default)
    expect(
      container
        .querySelector('[data-indicator-text]')
        ?.getAttribute('data-indicator-text'),
    ).toBe('Pull to refresh');
    fireEvent.touchMove(root, touch(0, 120));
    expect(
      container
        .querySelector('[data-indicator-text]')
        ?.getAttribute('data-indicator-text'),
    ).toBe('Release to refresh');
  });

  it('infinite-scroll loading/finished/error texts resolve to en-US locale values', () => {
    const { view } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      loading: true,
    });
    expect(
      view.container.querySelector('[data-status-text]')?.getAttribute('data-status-text'),
    ).toBe('Loading...');

    cleanup();
    const { view: finishedView } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: false,
    });
    expect(
      finishedView.container
        .querySelector('[data-status-text]')
        ?.getAttribute('data-status-text'),
    ).toBe('No more');

    cleanup();
    const { view: errorView } = renderInfiniteScroll({
      immediateCheck: false,
      hasMore: true,
      error: true,
    });
    expect(
      errorView.container.querySelector('[data-status-text]')?.getAttribute('data-status-text'),
    ).toBe('Load failed, tap to retry');
  });

  it('notice-bar close button aria-label resolves to the en-US locale value', () => {
    const props = createMockRendererProps({
      schema: { type: 'notice-bar' },
      props: { text: 'hello', closable: true },
      events: {},
    });
    const { container } = render(<NoticeBarRenderer {...props} />);
    const closeBtn = container.querySelector(
      '[data-slot="notice-bar-close"]',
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    // Pre-fix: hardcoded '关闭' default even under en-US.
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');
  });
});

describe('mobile renderer event dispatch carries evaluationBindings ctx', () => {
  // C7 P1-2: structured event payloads were dispatched without the
  // { event, evaluationBindings, scope } context (bug 83 / diff-view P1-10
  // family convention), so action args templates (${direction}/${source}/${side})
  // could never resolve payload fields. These assertions FAIL against the
  // pre-fix code (second ctx argument is undefined).
  it('pull-refresh onRefresh dispatch carries event/evaluationBindings ctx', async () => {
    const onRefresh = vi.fn<EventWithCtx>(async () => undefined);
    const props = createMockRendererProps<PullRefreshSchema>({
      schema: { type: 'pull-refresh' },
      props: { threshold: 50 },
      regions: { body: <div>body</div> },
      events: { onRefresh: onRefresh as never },
    });
    const { container } = render(<PullRefreshRenderer {...props} />);
    const root = container.querySelector('[data-slot="pull-refresh"]') as HTMLElement;
    fireEvent.touchStart(root, touch(0, 0));
    fireEvent.touchMove(root, touch(0, 200));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    const payload = { type: 'refresh', direction: 'down', threshold: 50 };
    const ctx = eventCtx(onRefresh.mock.calls[0]);
    expect(ctx?.event).toEqual(payload);
    expect(ctx?.evaluationBindings).toEqual(payload);
  });

  it('infinite-scroll onLoadMore dispatch carries event/evaluationBindings ctx', async () => {
    const onLoadMore = vi.fn<EventWithCtx>(async () => undefined);
    const { view } = renderInfiniteScroll({
      immediateCheck: true,
      hasMore: true,
      onLoadMore,
    });
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    const payload = { type: 'loadmore', source: 'immediate' };
    const ctx = eventCtx(onLoadMore.mock.calls[0]);
    expect(ctx?.event).toEqual(payload);
    expect(ctx?.evaluationBindings).toEqual(payload);
    void view;
  });

  it('swipe-cell onOpen/onClose/onAction dispatch carry event/evaluationBindings ctx', async () => {
    const onOpen = vi.fn<EventWithCtx>(() => undefined);
    const onClose = vi.fn<EventWithCtx>(() => undefined);
    const onAction = vi.fn<EventWithCtx>(() => undefined);
    const props = createMockRendererProps<SwipeCellSchema>({
      schema: { type: 'swipe-cell' },
      props: { threshold: 30, closeOnOutside: true },
      regions: {
        body: <div>body</div>,
        left: <button type="button">archive</button>,
        right: <button type="button">delete</button>,
      },
      events: {
        onOpen: onOpen as never,
        onClose: onClose as never,
        onAction: onAction as never,
      },
    });
    const { container } = render(<SwipeCellRenderer {...props} />);
    const root = container.querySelector('[data-slot="swipe-cell"]') as HTMLElement;

    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const openPayload = { type: 'open', side: 'open-left' };
    const openCtx = eventCtx(onOpen.mock.calls[0]);
    expect(openCtx?.event).toEqual(openPayload);
    expect(openCtx?.evaluationBindings).toEqual(openPayload);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const closePayload = { type: 'close', side: 'open-left' };
    const closeCtx = eventCtx(onClose.mock.calls[0]);
    expect(closeCtx?.event).toEqual(closePayload);
    expect(closeCtx?.evaluationBindings).toEqual(closePayload);

    fireEvent.touchStart(root, touch(50, 50));
    fireEvent.touchMove(root, touch(120, 50));
    fireEvent.touchEnd(root);
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(2));
    const actionBtn = container.querySelector(
      '[data-slot="swipe-cell-left"] button',
    ) as HTMLButtonElement;
    fireEvent.click(actionBtn);
    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
    const actionPayload = { type: 'action', side: 'open-left' };
    const actionCtx = eventCtx(onAction.mock.calls[0]);
    expect(actionCtx?.event).toEqual(actionPayload);
    expect(actionCtx?.evaluationBindings).toEqual(actionPayload);
  });

  it('countdown onFinish dispatch carries event/evaluationBindings ctx', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn<EventWithCtx>(() => undefined);
    const props = createMockRendererProps<CountdownSchema>({
      schema: { type: 'countdown' },
      props: { time: 1000, format: 'ss' },
      events: { onFinish: onFinish as never },
    });
    render(<CountdownRenderer {...props} />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    const payload = { type: 'finish' };
    const ctx = eventCtx(onFinish.mock.calls[0]);
    expect(ctx?.event).toEqual(payload);
    expect(ctx?.evaluationBindings).toEqual(payload);
  });
});
