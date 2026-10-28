import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrandListPage } from './list';
import { BrandDetailPage } from './detail';
import { installFetchMock, envelope, readBody, type FetchResponder } from '../../test-support';

describe('Brand pages', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  function mockBrands() {
    const responder: FetchResponder = (url, init) => {
      if (url === '/r/LitemallBrand__frontList') {
        return {
          status: 200,
          body: envelope({
            items: [
              { id: 'br1', name: 'Acme', desc: 'Official', picUrl: 'http://br1.png' },
              { id: 'br2', name: 'Beta', desc: 'Beta brand', picUrl: 'http://br2.png' },
            ],
            total: 2,
          }),
        };
      }
      if (url === '/r/LitemallBrand__frontDetail') {
        const body = readBody(init);
        return {
          status: 200,
          body: envelope({ id: String(body.id), name: 'Acme', desc: 'Official brand', picUrl: 'http://br1.png' }),
        };
      }
      if (url === '/r/LitemallGoods__frontList') {
        return {
          status: 200,
          body: envelope({
            items: [
              { id: 'g1', name: 'Acme Phone', picUrl: 'http://g1.png', retailPrice: 99 },
              { id: 'g2', name: 'Acme Pad', picUrl: 'http://g2.png', retailPrice: 199 },
            ],
            total: 2,
          }),
        };
      }
      return { status: 200, body: envelope(null) };
    };
    return installFetchMock(responder);
  }

  it('BrandListPage renders brand cards from frontList', async () => {
    mockBrands();
    render(<BrandListPage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-brand-card"]').length).toBe(2);
    });
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('clicking a brand card navigates to brand-detail route', async () => {
    mockBrands();
    render(<BrandListPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeTruthy();
    });
    (screen.getByText('Acme').closest('button') as HTMLButtonElement).click();

    await waitFor(() => {
      expect(window.location.hash).toContain('/page/brand-detail');
      expect(window.location.hash).toContain('br1');
    });
  });

  it('BrandDetailPage renders brand info + brand goods', async () => {
    mockBrands();
    render(<BrandDetailPage brandId="br1" />);

    await waitFor(() => {
      expect(screen.getByText('Official brand')).toBeTruthy();
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-goods-card"]').length).toBe(2);
    });
    expect(screen.getByText('品牌商品')).toBeTruthy();
  });

  it('BrandDetailPage shows error retry when detail fails', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallBrand__frontDetail') {
        return { status: 200, body: envelope(null, 1001, '品牌不存在') };
      }
      return { status: 200, body: envelope({ items: [], total: 0 }) };
    });

    render(<BrandDetailPage brandId="missing" />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-error"]').length).toBeGreaterThan(0);
    });
  });

  it('BrandListPage shows empty state when no brands', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallBrand__frontList') return { status: 200, body: envelope({ items: [], total: 0 }) };
      return { status: 200, body: envelope(null) };
    });

    render(<BrandListPage />);

    await waitFor(() => {
      expect(screen.getByText('暂无品牌')).toBeTruthy();
    });
  });
});
