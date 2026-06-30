import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HomePage } from './index';
import { installFetchMock, envelope, type FetchResponder } from '../../test-support';

function goods(id: string, over: Record<string, unknown> = {}) {
  return { id, name: `goods-${id}`, picUrl: `http://x/${id}.png`, retailPrice: 9.9, ...over };
}

describe('HomePage', () => {
  beforeEach(() => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mockAll(overrides: Partial<Record<string, unknown>> = {}) {
    const responder: FetchResponder = (url) => {
      if (url === '/r/LitemallAd__listActiveAds') {
        return {
          status: 200,
          body: envelope({
            items: [
              { id: 'b1', name: 'Banner1', url: 'http://b1.png', position: 1 },
              { id: 'b2', name: 'NotHome', url: 'http://b2.png', position: 2 },
              { id: 'b3', name: 'Banner3', url: 'http://b3.png', position: 1 },
            ],
            total: 3,
          }),
        };
      }
      if (url === '/r/LitemallGoods__frontListByFlags') {
        return { status: 200, body: envelope({ items: [goods('g1'), goods('g2')], total: 2 }) };
      }
      if (url === '/r/LitemallTopic__frontList') {
        return {
          status: 200,
          body: envelope({ items: [{ id: 't1', title: 'Topic1', picUrl: 'http://t1.png' }], total: 1 }),
        };
      }
      return { status: 200, body: envelope(overrides[url] ?? null) };
    };
    return installFetchMock(responder);
  }

  it('renders banner floor with only position==1 ads (client-side filter)', async () => {
    mockAll();
    render(<HomePage />);

    await waitFor(() => {
      const banner = document.querySelector('[data-testid="mall-banner"]') as HTMLElement | null;
      expect(banner).toBeTruthy();
      expect(banner!.getAttribute('data-count')).toBe('2');
    });
    const banner = document.querySelector('[data-testid="mall-banner"]') as HTMLElement;
    const dots = banner.querySelectorAll('.mall-banner-dot');
    expect(dots).toHaveLength(2);
    const slideImg = banner.querySelector('.mall-banner-slide img') as HTMLImageElement | null;
    expect(slideImg).toBeTruthy();
    expect(['http://b1.png/', 'http://b3.png/']).toContain(slideImg!.src);
    expect(slideImg!.alt).not.toBe('NotHome');
  });

  it('renders new/hot goods and topic floors from their data sources', async () => {
    mockAll();
    render(<HomePage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBeGreaterThanOrEqual(4);
    });
    const topicCards = document.querySelectorAll('[data-testid="mall-topic-card"]');
    expect(topicCards).toHaveLength(1);
    expect(screen.getByText('新品推荐')).toBeTruthy();
    expect(screen.getByText('热销好物')).toBeTruthy();
    expect(screen.getByText('专题精选')).toBeTruthy();
  });

  it('shows empty states when floors return no data', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallAd__listActiveAds') return { status: 200, body: envelope({ items: [], total: 0 }) };
      if (url === '/r/LitemallGoods__frontListByFlags') return { status: 200, body: envelope({ items: [], total: 0 }) };
      if (url === '/r/LitemallTopic__frontList') return { status: 200, body: envelope({ items: [], total: 0 }) };
      return { status: 200, body: envelope(null) };
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getAllByText(/暂无/).length).toBeGreaterThan(0);
    });
  });

  it('renders error retry when a floor request fails', async () => {
    installFetchMock(() => ({ status: 200, body: envelope(null, 1001, '服务器错误') }));

    render(<HomePage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-error"]').length).toBeGreaterThan(0);
    });
  });

  it('mounts a pull-to-refresh container wrapping the floors', async () => {
    mockAll();
    render(<HomePage />);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="pull-to-refresh"]')).toBeTruthy();
    });
  });
});
