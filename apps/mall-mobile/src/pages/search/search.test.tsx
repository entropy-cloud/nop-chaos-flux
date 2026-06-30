import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SearchPage } from './index';
import {
  SEARCH_HISTORY_STORAGE_KEY,
} from './search-history';
import { installFetchMock, envelope, readBody, type FetchResponder } from '../../test-support';

function goods(id: string) {
  return { id, name: `g-${id}`, picUrl: `http://x/${id}.png`, retailPrice: 5 };
}

describe('SearchPage', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  });

  function mockSearch(hotKeywords = [{ id: 'k1', keyword: '手机', isHot: true }]) {
    const responder: FetchResponder = (url, init) => {
      if (url === '/r/LitemallKeyword__getHotKeywords') {
        return { status: 200, body: envelope(hotKeywords) };
      }
      if (url === '/r/LitemallGoods__search') {
        const body = readBody(init);
        const kw = String(body.keyword ?? '');
        if (!kw) return { status: 200, body: envelope({ items: [], total: 0 }) };
        const count = 2;
        return {
          status: 200,
          body: envelope({
            items: Array.from({ length: count }).map((_, i) => goods(`${kw}-${i}`)),
            total: count,
          }),
        };
      }
      return { status: 200, body: envelope(null) };
    };
    return installFetchMock(responder);
  }

  it('renders hot keywords before any search', async () => {
    mockSearch();
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('手机')).toBeTruthy();
      expect(screen.getByText('热门搜索')).toBeTruthy();
    });
  });

  it('debounced input triggers a search request and renders results', async () => {
    const mock = mockSearch();
    render(<SearchPage />);

    const input = screen.getByLabelText('搜索商品') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'apple' } });

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });

    const searchCalls = mock.mock.calls.filter((c) => c[0] === '/r/LitemallGoods__search');
    const last = searchCalls.at(-1);
    expect(readBody(last![1]).keyword).toBe('apple');
  });

  it('records the searched keyword into local history (dedup + cap)', async () => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(['apple', 'banana']),
    );
    mockSearch();
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('apple')).toBeTruthy();
      expect(screen.getByText('banana')).toBeTruthy();
    });

    const input = screen.getByLabelText('搜索商品');
    fireEvent.input(input, { target: { value: 'banana' } });

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) ?? '[]');
      expect(stored[0]).toBe('banana');
      expect(stored.filter((x: string) => x === 'banana')).toHaveLength(1);
    });
  });

  it('clicking a history tag submits it as a search', async () => {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(['apple']));
    mockSearch();
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('apple')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('apple'));

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });
  });

  it('clear-history button empties the history list', async () => {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(['apple', 'banana']));
    mockSearch();
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('清空')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('清空'));

    await waitFor(() => {
      expect(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)).toBe('[]');
    });
  });

  it('shows empty result message when search returns nothing', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallKeyword__getHotKeywords') return { status: 200, body: envelope([]) };
      if (url === '/r/LitemallGoods__search') return { status: 200, body: envelope({ items: [], total: 0 }) };
      return { status: 200, body: envelope(null) };
    });

    render(<SearchPage />);
    fireEvent.input(screen.getByLabelText('搜索商品'), { target: { value: 'zzz' } });

    await waitFor(() => {
      expect(screen.getByText(/没有找到/)).toBeTruthy();
    });
  });
});
