import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CategoryPage } from './index';
import { installFetchMock, envelope, readBody, type FetchResponder } from '../../test-support';

function goods(id: string) {
  return { id, name: `g-${id}`, picUrl: `http://x/${id}.png`, retailPrice: 1 };
}

describe('CategoryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mockTree(overrides: { goodsForCategory?: Record<string, number> } = {}) {
    const responder: FetchResponder = (url, init) => {
      if (url === '/r/LitemallCategory__getCategoryTree') {
        return {
          status: 200,
          body: envelope([
            { id: 'c1', name: '手机', children: [{ id: 'c1-1', name: '安卓' }, { id: 'c1-2', name: '苹果' }] },
            { id: 'c2', name: '电脑' },
          ]),
        };
      }
      if (url === '/r/LitemallGoods__frontList') {
        const body = readBody(init);
        const cat = String(body.categoryId ?? '');
        const count = overrides.goodsForCategory?.[cat] ?? 2;
        const total = count;
        const items = Array.from({ length: Math.min(count, 10) }).map((_, i) => goods(`${cat}-${i}`));
        return { status: 200, body: envelope({ items, total }) };
      }
      return { status: 200, body: envelope(null) };
    };
    return installFetchMock(responder);
  }

  it('renders the category rail and auto-loads first category goods', async () => {
    mockTree();
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('手机')).toBeTruthy();
      expect(screen.getByText('电脑')).toBeTruthy();
    });

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });
  });

  it('renders sub-category pills for the active top category', async () => {
    mockTree();
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('安卓')).toBeTruthy();
      expect(screen.getByText('苹果')).toBeTruthy();
      expect(screen.getByText('全部')).toBeTruthy();
    });
  });

  it('selecting a sub-category reloads goods for that category', async () => {
    const mock = mockTree({ goodsForCategory: { c1: 2, 'c1-2': 5 } });
    render(<CategoryPage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });

    fireEvent.click(screen.getByText('苹果'));

    await waitFor(() => {
      const calls = mock.mock.calls;
      const goodsCalls = calls.filter((c) => c[0] === '/r/LitemallGoods__frontList');
      expect(goodsCalls.length).toBeGreaterThan(0);
      const lastGoodsCall = goodsCalls.at(-1);
      expect(readBody(lastGoodsCall![1]).categoryId).toBe('c1-2');
    });
  });

  it('switching top category resets selection and loads its goods', async () => {
    const mock = mockTree({ goodsForCategory: { c1: 2, c2: 3 } });
    render(<CategoryPage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });

    fireEvent.click(screen.getByText('电脑'));

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(3);
    });
    expect(mock).toHaveBeenCalled();
  });

  it('shows empty state when a category has no goods', async () => {
    mockTree({ goodsForCategory: { c1: 0, c2: 0 } });
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('该分类暂无商品')).toBeTruthy();
    });
  });
});
