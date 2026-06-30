import { postRpc, asPage, type PageBean } from './rpc';

export interface MallAd {
  id: string;
  name?: string;
  link?: string;
  url?: string;
  position?: number;
  content?: string;
}

export interface MallCategoryNode {
  id: string;
  name?: string;
  iconUrl?: string;
  picUrl?: string;
  children?: MallCategoryNode[];
}

export interface MallGoods {
  id: string;
  goodsSn?: string;
  name?: string;
  brief?: string;
  picUrl?: string;
  retailPrice?: number | string;
  counterPrice?: number | string;
  isNew?: boolean;
  isHot?: boolean;
  isRecommend?: boolean;
  brandId?: string;
  categoryId?: string;
  unit?: string;
}

export interface MallGoodsSpecificationEntry {
  id?: string;
  specification?: string;
  value?: string;
  picUrl?: string;
}

export interface MallGoodsDetail extends MallGoods {
  gallery?: string;
  keywords?: string;
  detail?: string;
  shareUrl?: string;
  videoUrl?: string;
  specifications?: MallGoodsSpecificationEntry[];
}

export type StockLevel = 'sufficient' | 'tight' | 'out';

export interface StockSemantic {
  stockNumber?: number;
  level?: StockLevel;
  label?: string;
  color?: string;
}

export interface MallTopic {
  id: string;
  title?: string;
  subtitle?: string;
  content?: string;
  picUrl?: string;
  price?: number | string;
  readCount?: number;
}

export interface MallKeyword {
  id: string;
  keyword?: string;
  url?: string;
  isHot?: boolean;
  isDefault?: boolean;
}

export const HOME_BANNER_POSITION = 1;

const URL_AD_LIST = '/r/LitemallAd__listActiveAds';
const URL_CATEGORY_TREE = '/r/LitemallCategory__getCategoryTree';
const URL_GOODS_FRONT_LIST = '/r/LitemallGoods__frontList';
const URL_GOODS_FRONT_LIST_BY_FLAGS = '/r/LitemallGoods__frontListByFlags';
const URL_GOODS_FRONT_DETAIL = '/r/LitemallGoods__frontDetail';
const URL_GOODS_STOCK_SEMANTIC = '/r/LitemallGoods__getStockSemantic';
const URL_GOODS_SEARCH = '/r/LitemallGoods__search';
const URL_TOPIC_FRONT_LIST = '/r/LitemallTopic__frontList';
const URL_TOPIC_FRONT_DETAIL = '/r/LitemallTopic__frontDetail';
const URL_KEYWORD_HOT = '/r/LitemallKeyword__getHotKeywords';
const URL_KEYWORD_DEFAULT = '/r/LitemallKeyword__getDefaultKeywords';

export async function fetchActiveAds(page = 1, pageSize = 20): Promise<MallAd[]> {
  const data = await postRpc<PageBean<MallAd>>(URL_AD_LIST, { page, pageSize });
  return asPage<MallAd>(data).items ?? [];
}

export async function fetchHomeBanners(page = 1, pageSize = 20): Promise<MallAd[]> {
  const ads = await fetchActiveAds(page, pageSize);
  return ads.filter((ad) => ad.position === HOME_BANNER_POSITION);
}

export async function fetchCategoryTree(): Promise<MallCategoryNode[]> {
  const data = await postRpc<MallCategoryNode[]>(URL_CATEGORY_TREE, {});
  return Array.isArray(data) ? data : [];
}

export async function fetchGoodsPage(args: {
  categoryId?: string;
  brandId?: string;
  page: number;
  pageSize: number;
}): Promise<PageBean<MallGoods>> {
  const data = await postRpc<PageBean<MallGoods>>(URL_GOODS_FRONT_LIST, {
    categoryId: args.categoryId ?? '',
    brandId: args.brandId ?? '',
    page: args.page,
    pageSize: args.pageSize,
  });
  return asPage<MallGoods>(data);
}

export async function fetchGoodsByFlags(args: {
  isHot?: boolean;
  isNew?: boolean;
  isRecommend?: boolean;
  categoryId?: string;
  brandId?: string;
  page: number;
  pageSize: number;
}): Promise<PageBean<MallGoods>> {
  const body: Record<string, unknown> = {
    page: args.page,
    pageSize: args.pageSize,
  };
  if (args.isHot !== undefined) body.isHot = args.isHot;
  if (args.isNew !== undefined) body.isNew = args.isNew;
  if (args.isRecommend !== undefined) body.isRecommend = args.isRecommend;
  if (args.categoryId) body.categoryId = args.categoryId;
  if (args.brandId) body.brandId = args.brandId;
  const data = await postRpc<PageBean<MallGoods>>(URL_GOODS_FRONT_LIST_BY_FLAGS, body);
  return asPage<MallGoods>(data);
}

export async function searchGoods(args: {
  keyword?: string;
  categoryId?: string;
  brandId?: string;
  sortBy?: string;
  page: number;
  pageSize: number;
}): Promise<PageBean<MallGoods>> {
  const data = await postRpc<PageBean<MallGoods>>(URL_GOODS_SEARCH, {
    keyword: args.keyword ?? '',
    categoryId: args.categoryId ?? '',
    brandId: args.brandId ?? '',
    sortBy: args.sortBy ?? '',
    page: args.page,
    pageSize: args.pageSize,
  });
  return asPage<MallGoods>(data);
}

export async function fetchTopicPage(page = 1, pageSize = 10): Promise<PageBean<MallTopic>> {
  const data = await postRpc<PageBean<MallTopic>>(URL_TOPIC_FRONT_LIST, {
    page,
    pageSize,
  });
  return asPage<MallTopic>(data);
}

export async function fetchTopicDetail(id: string): Promise<MallTopic> {
  const data = await postRpc<MallTopic>(URL_TOPIC_FRONT_DETAIL, { id });
  return data ?? ({} as MallTopic);
}

export async function fetchHotKeywords(): Promise<MallKeyword[]> {
  const data = await postRpc<MallKeyword[]>(URL_KEYWORD_HOT, {});
  return Array.isArray(data) ? data : [];
}

export async function fetchDefaultKeywords(): Promise<MallKeyword[]> {
  const data = await postRpc<MallKeyword[]>(URL_KEYWORD_DEFAULT, {});
  return Array.isArray(data) ? data : [];
}

export async function fetchGoodsDetail(id: string): Promise<MallGoodsDetail> {
  const data = await postRpc<MallGoodsDetail>(URL_GOODS_FRONT_DETAIL, { id });
  return data ?? ({} as MallGoodsDetail);
}

export async function fetchStockSemantic(goodsId: string): Promise<StockSemantic> {
  const data = await postRpc<StockSemantic>(URL_GOODS_STOCK_SEMANTIC, { goodsId });
  return data ?? {};
}

export function splitGallery(gallery: string | undefined): string[] {
  if (!gallery || typeof gallery !== 'string') return [];
  return gallery
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
