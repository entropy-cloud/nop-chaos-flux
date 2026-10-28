import { postRpc } from './rpc';

export interface MallGoodsProduct {
  id: string;
  goodsId?: string;
  specifications?: string;
  price?: number | string;
  number?: number;
  url?: string;
  vipPrice?: number | string;
  safeStock?: number;
}

const URL_PRODUCT_FIND_LIST = '/r/LitemallGoodsProduct__findList';

export async function fetchProductsByGoods(goodsId: string): Promise<MallGoodsProduct[]> {
  const data = await postRpc<MallGoodsProduct[]>(URL_PRODUCT_FIND_LIST, {
    query: {
      filter: { eq: ['goodsId', goodsId] },
    },
  });
  return Array.isArray(data) ? data : [];
}

export function parseProductSpecifications(raw: string | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => (v == null ? '' : String(v))).filter((v) => v.length > 0);
      }
    } catch {
      // fall through to comma split
    }
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
