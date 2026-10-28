import { postRpc, asPage, type PageBean } from './rpc';

export interface MallBrand {
  id: string;
  name?: string;
  picUrl?: string;
  desc?: string;
  sortOrder?: number;
  floorPrice?: number | string;
}

const URL_BRAND_FRONT_LIST = '/r/LitemallBrand__frontList';
const URL_BRAND_FRONT_DETAIL = '/r/LitemallBrand__frontDetail';

export async function fetchBrandPage(page: number, pageSize: number): Promise<PageBean<MallBrand>> {
  const data = await postRpc<PageBean<MallBrand>>(URL_BRAND_FRONT_LIST, { page, pageSize });
  return asPage<MallBrand>(data);
}

export async function fetchBrandDetail(id: string): Promise<MallBrand> {
  const data = await postRpc<MallBrand>(URL_BRAND_FRONT_DETAIL, { id });
  return data ?? ({} as MallBrand);
}
