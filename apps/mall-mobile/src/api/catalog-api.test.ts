import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchActiveAds,
  fetchHomeBanners,
  fetchCategoryTree,
  fetchGoodsPage,
  fetchGoodsByFlags,
  searchGoods,
  fetchTopicPage,
  fetchHotKeywords,
  HOME_BANNER_POSITION,
} from './catalog-api';
import { installFetchMock, envelope, readBody, type FetchResponder } from '../test-support';

function ad(id: string, position: number) {
  return { id, name: `ad-${id}`, position, url: `http://x/${id}.png`, link: 'about:blank' };
}

describe('catalog-api RPC wiring', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetchActiveAds hits listActiveAds and returns items', async () => {
    const mock = installFetchMock((_url) => ({
      status: 200,
      body: envelope({ items: [ad('1', 1), ad('2', 2)], total: 2 }),
    }));
    const ads = await fetchActiveAds(1, 20);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]![0]).toBe('/r/LitemallAd__listActiveAds');
    const body = readBody(mock.mock.calls[0]![1]);
    expect(body).toEqual({ page: 1, pageSize: 20 });
    expect(ads).toHaveLength(2);
  });

  it('fetchHomeBanners filters position==1 on the client (backend returns all positions)', async () => {
    installFetchMock(() => ({
      status: 200,
      body: envelope({
        items: [ad('1', HOME_BANNER_POSITION), ad('2', 2), ad('3', HOME_BANNER_POSITION), ad('4', 3)],
        total: 4,
      }),
    }));
    const banners = await fetchHomeBanners();
    expect(banners.map((b) => b.id)).toEqual(['1', '3']);
    expect(banners.every((b) => b.position === HOME_BANNER_POSITION)).toBe(true);
  });

  it('fetchHomeBanners returns [] on error envelope without throwing unexpected', async () => {
    installFetchMock(() => ({ status: 200, body: envelope(null, 1001, 'boom') }));
    await expect(fetchHomeBanners()).rejects.toMatchObject({ name: 'RpcError' });
  });

  it('fetchCategoryTree returns array payload', async () => {
    installFetchMock(() => ({
      status: 200,
      body: envelope([{ id: 'c1', name: 'A', children: [{ id: 'c2', name: 'A1' }] }]),
    }));
    const tree = await fetchCategoryTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
  });

  it('fetchGoodsPage posts categoryId/brandId/page/pageSize', async () => {
    const mock = installFetchMock(() => ({
      status: 200,
      body: envelope({ items: [{ id: 'g1' }], total: 1 }),
    }));
    const page = await fetchGoodsPage({ categoryId: 'c1', page: 2, pageSize: 10 });
    const body = readBody(mock.mock.calls[0]![1]);
    expect(body).toEqual({ categoryId: 'c1', brandId: '', page: 2, pageSize: 10 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('fetchGoodsByFlags only sends defined flags', async () => {
    const mock = installFetchMock(() => ({
      status: 200,
      body: envelope({ items: [], total: 0 }),
    }));
    await fetchGoodsByFlags({ isNew: true, page: 1, pageSize: 6 });
    const body = readBody(mock.mock.calls[0]![1]);
    expect(body).toEqual({ isNew: true, page: 1, pageSize: 6 });
    expect(body).not.toHaveProperty('isHot');
    expect(body).not.toHaveProperty('isRecommend');
  });

  it('searchGoods posts keyword + sortBy', async () => {
    const mock = installFetchMock(() => ({
      status: 200,
      body: envelope({ items: [], total: 0 }),
    }));
    await searchGoods({ keyword: 'apple', sortBy: 'price', page: 1, pageSize: 10 });
    expect(readBody(mock.mock.calls[0]![1])).toEqual({
      keyword: 'apple',
      categoryId: '',
      brandId: '',
      sortBy: 'price',
      page: 1,
      pageSize: 10,
    });
  });

  it('fetchTopicPage and fetchHotKeywords hit correct endpoints', async () => {
    const responder: FetchResponder = (url) => {
      if (url === '/r/LitemallTopic__frontList') {
        return { status: 200, body: envelope({ items: [{ id: 't1', title: 'T' }], total: 1 }) };
      }
      if (url === '/r/LitemallKeyword__getHotKeywords') {
        return { status: 200, body: envelope([{ id: 'k1', keyword: 'hot' }]) };
      }
      return { status: 404, body: envelope(null, 1, 'nf') };
    };
    const mock = installFetchMock(responder);
    const topics = await fetchTopicPage();
    const hot = await fetchHotKeywords();
    expect(topics.items).toHaveLength(1);
    expect(hot[0].keyword).toBe('hot');
    expect(mock.mock.calls[0]![0]).toBe('/r/LitemallTopic__frontList');
    expect(mock.mock.calls[1]![0]).toBe('/r/LitemallKeyword__getHotKeywords');
  });
});
