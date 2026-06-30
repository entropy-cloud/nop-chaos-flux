import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoodsActions } from './use-goods-actions';
import { useMallStore } from '../../store';
import { installFetchMock, envelope, type FetchResponder } from '../../test-support';

const GOODS_ID = 'g42';

function actionsResponder(opts: { isCollect?: boolean; failAdd?: boolean }): FetchResponder {
  return (url, init) => {
    if (url === '/r/LitemallCollect__isCollect') {
      return { status: 200, body: envelope(opts.isCollect ?? false) };
    }
    if (url === '/r/LitemallCollect__addCollect') {
      return { status: 200, body: envelope({ id: 'c1' }) };
    }
    if (url === '/r/LitemallCollect__removeCollect') {
      return { status: 200, body: envelope(null) };
    }
    if (url === '/r/LitemallFootprint__recordFootprint') {
      return { status: 200, body: envelope(null) };
    }
    if (url === '/r/LitemallCart__addGoods') {
      if (opts.failAdd) return { status: 200, body: envelope(null, 1001, '库存不足') };
      const body = JSON.parse((init?.body as string) ?? '{}');
      return { status: 200, body: envelope({ id: 'cart1', productId: body.productId, number: body.number }) };
    }
    return { status: 200, body: envelope(null) };
  };
}

function login() {
  useMallStore.getState().setAuth({
    accessToken: 'tok',
    userInfo: { userId: 'u1', userName: 'u' },
  });
}

describe('useGoodsActions', () => {
  beforeEach(() => {
    window.location.hash = '';
    useMallStore.getState().clearAuth();
    useMallStore.getState().setCartBadge(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useMallStore.getState().clearAuth();
    window.location.hash = '';
  });

  it('collect toggles collected state and calls add/remove', async () => {
    login();
    installFetchMock(actionsResponder({ isCollect: false }));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await vi.waitFor(() => expect(result.current.collected).toBe(false));

    await act(async () => {
      await result.current.toggleCollect();
    });
    await vi.waitFor(() => expect(result.current.collected).toBe(true));
  });

  it('remove collect flips back to uncollected', async () => {
    login();
    installFetchMock(actionsResponder({ isCollect: true }));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await vi.waitFor(() => expect(result.current.collected).toBe(true));

    await act(async () => {
      await result.current.toggleCollect();
    });
    await vi.waitFor(() => expect(result.current.collected).toBe(false));
  });

  it('add-to-cart increments cart badge on success', async () => {
    login();
    useMallStore.getState().setCartBadge(3);
    installFetchMock(actionsResponder({}));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    let ok = false;
    await act(async () => {
      result.current.addToCart({ id: 'p1' } as never, 2, () => {
        ok = true;
      });
    });
    await vi.waitFor(() => expect(useMallStore.getState().cartBadge).toBe(4));
    await vi.waitFor(() => expect(ok).toBe(true));
  });

  it('add-to-cart surfaces error message on backend failure', async () => {
    login();
    installFetchMock(actionsResponder({ failAdd: true }));
    const errors: string[] = [];
    const { result } = renderHook(() =>
      useGoodsActions(GOODS_ID, { notify: (kind, msg) => kind === 'error' && errors.push(msg) }),
    );

    await act(async () => {
      result.current.addToCart({ id: 'p1' } as never, 1);
    });
    await vi.waitFor(() => expect(errors.some((m) => m.includes('库存不足'))).toBe(true));
  });

  it('records footprint when logged in', async () => {
    login();
    const fn = installFetchMock(actionsResponder({}));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await act(async () => {
      result.current.recordFootprint();
    });
    await vi.waitFor(() =>
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallFootprint__recordFootprint')).toBe(true),
    );
  });

  it('silently skips footprint when not logged in (no request, no throw)', async () => {
    const fn = installFetchMock(actionsResponder({}));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await act(async () => {
      result.current.recordFootprint();
    });
    expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallFootprint__recordFootprint')).toBe(false);
  });

  it('collect when not logged in redirects to login (returnTo) and skips backend', async () => {
    const fn = installFetchMock(actionsResponder({}));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await act(async () => {
      result.current.toggleCollect();
    });

    expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCollect__addCollect')).toBe(false);
    expect(window.location.hash).toContain('/auth/login');
    expect(window.location.hash).toContain('returnTo');
  });

  it('add-to-cart when not logged in redirects to login (returnTo) and skips backend', async () => {
    const fn = installFetchMock(actionsResponder({}));
    const { result } = renderHook(() => useGoodsActions(GOODS_ID));

    await act(async () => {
      result.current.addToCart({ id: 'p1' } as never, 1);
    });

    expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__addGoods')).toBe(false);
    expect(window.location.hash).toContain('/auth/login');
  });
});
