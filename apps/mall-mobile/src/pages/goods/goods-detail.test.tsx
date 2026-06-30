import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GoodsDetailPage } from './detail';
import { installFetchMock, envelope, type FetchResponder } from '../../test-support';
import { useMallStore } from '../../store';

const GOODS_ID = 'g1';

function goodsResponder(opts?: { collected?: boolean }): FetchResponder {
  return (url) => {
    if (url === '/r/LitemallGoods__frontDetail') {
      return {
        status: 200,
        body: envelope({
          id: GOODS_ID,
          name: '测试商品',
          brief: '简介',
          retailPrice: 99,
          counterPrice: 199,
          gallery: 'http://a.png,http://b.png',
          detail: '<p>详情</p>',
          specifications: [],
        }),
      };
    }
    if (url === '/r/LitemallGoodsProduct__findList') {
      return {
        status: 200,
        body: envelope([
          { id: 'p1', goodsId: GOODS_ID, specifications: '["全网通","8+128G"]', price: 99, number: 5 },
          { id: 'p2', goodsId: GOODS_ID, specifications: '["全网通","8+256G"]', price: 109, number: 0 },
        ]),
      };
    }
    if (url === '/r/LitemallGoods__getStockSemantic') {
      return {
        status: 200,
        body: envelope({ stockNumber: 5, level: 'sufficient', label: '库存充足', color: '#17a2b8' }),
      };
    }
    if (url === '/r/LitemallComment__getCommentSummary') {
      return {
        status: 200,
        body: envelope({
          totalCount: 12,
          goodRate: 90,
          starDistribution: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 8 },
          prosTags: [],
          consTags: [],
        }),
      };
    }
    if (url === '/r/LitemallCollect__isCollect') {
      return { status: 200, body: envelope(opts?.collected ?? false) };
    }
    if (url === '/r/LitemallFootprint__recordFootprint') {
      return { status: 200, body: envelope(null) };
    }
    return { status: 200, body: envelope(null) };
  };
}

describe('GoodsDetailPage', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders gallery, price, comment summary, detail html', async () => {
    installFetchMock(goodsResponder());
    render(<GoodsDetailPage goodsId={GOODS_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId('goods-name').textContent).toBe('测试商品');
    });
    expect(screen.getByTestId('goods-comment-summary')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
    expect(screen.getByTestId('goods-detail-content').innerHTML).toContain('详情');
    expect(screen.getByTestId('goods-stock').textContent).toBe('库存充足');
  });

  it('opens SKU drawer and disables confirm until all axes selected', async () => {
    useMallStore.getState().setAuth({ accessToken: 'tok', userInfo: { userId: 'u1', userName: 'u' } });
    installFetchMock(goodsResponder({ collected: false }));
    render(<GoodsDetailPage goodsId={GOODS_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId('goods-name').textContent).toBe('测试商品');
    });

    fireEvent.click(screen.getByTestId('goods-sku-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('sku-drawer').getAttribute('aria-hidden')).toBe('false');
    });

    const confirm = screen.getByTestId('sku-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    const pills = screen.getAllByText('全网通');
    fireEvent.click(pills[pills.length - 1]);
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByText('8+128G'));
    await waitFor(() => {
      expect(confirm.disabled).toBe(false);
    });

    useMallStore.getState().clearAuth();
  });

  it('marks out-of-stock option as disabled (缺货)', async () => {
    installFetchMock(goodsResponder());
    render(<GoodsDetailPage goodsId={GOODS_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId('goods-name').textContent).toBe('测试商品');
    });

    fireEvent.click(screen.getByTestId('goods-sku-trigger'));
    await waitFor(() => {
      expect(screen.getByText('8+256G')).toBeTruthy();
    });

    const oosPill = screen.getByText('8+256G').closest('button') as HTMLButtonElement;
    expect(oosPill.disabled).toBe(true);
    expect(oosPill.textContent).toContain('缺货');
  });

  it('shows error retry when detail fails', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallGoods__frontDetail') {
        return { status: 200, body: envelope(null, 1001, '商品不存在') };
      }
      return { status: 200, body: envelope({ items: [] }) };
    });

    render(<GoodsDetailPage goodsId="missing" />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-error"]').length).toBeGreaterThan(0);
    });
  });

  it('records footprint on mount when logged in', async () => {
    const fn = installFetchMock(goodsResponder());
    // simulate logged in by setting store token
    useMallStore.getState().setAuth({ accessToken: 'tok', userInfo: { userId: 'u1', userName: 'u' } });

    render(<GoodsDetailPage goodsId={GOODS_ID} />);

    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallFootprint__recordFootprint')).toBe(true);
    });

    useMallStore.getState().clearAuth();
  });
});
