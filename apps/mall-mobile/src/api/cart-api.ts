import { postRpc } from './rpc';

export interface MallCart {
  id: string;
  userId?: string;
  goodsId?: string;
  goodsSn?: string;
  goodsName?: string;
  productId?: string;
  price?: number | string;
  number?: number;
  specifications?: string;
  checked?: boolean;
  picUrl?: string;
}

const URL_CART_ADD = '/r/LitemallCart__addGoods';
const URL_CART_UPDATE = '/r/LitemallCart__updateQuantity';
const URL_CART_CHECK = '/r/LitemallCart__check';
const URL_CART_UNCHECK = '/r/LitemallCart__uncheck';
const URL_CART_CHECK_ALL = '/r/LitemallCart__checkAll';
const URL_CART_UNCHECK_ALL = '/r/LitemallCart__uncheckAll';
const URL_CART_DELETE = '/r/LitemallCart__deleteCart';
const URL_CART_CLEAR = '/r/LitemallCart__clear';
const URL_CART_CHECKED_LIST = '/r/LitemallCart__checkedList';
const URL_CART_FIND_PAGE = '/r/LitemallCart__findPage';

export async function addGoodsToCart(args: {
  goodsId: string;
  productId: string;
  number: number;
}): Promise<MallCart> {
  return postRpc<MallCart>(URL_CART_ADD, args);
}

export async function updateCartQuantity(id: string, number: number): Promise<MallCart> {
  return postRpc<MallCart>(URL_CART_UPDATE, { id, number });
}

export async function checkCart(id: string): Promise<MallCart> {
  return postRpc<MallCart>(URL_CART_CHECK, { id });
}

export async function uncheckCart(id: string): Promise<MallCart> {
  return postRpc<MallCart>(URL_CART_UNCHECK, { id });
}

export async function checkAllCart(): Promise<void> {
  await postRpc(URL_CART_CHECK_ALL, {});
}

export async function uncheckAllCart(): Promise<void> {
  await postRpc(URL_CART_UNCHECK_ALL, {});
}

export async function deleteCart(id: string): Promise<void> {
  await postRpc(URL_CART_DELETE, { id });
}

export async function clearCart(): Promise<void> {
  await postRpc(URL_CART_CLEAR, {});
}

export async function fetchCheckedCart(): Promise<MallCart[]> {
  const data = await postRpc<MallCart[]>(URL_CART_CHECKED_LIST, {});
  return Array.isArray(data) ? data : [];
}

export async function fetchCartList(userId: string): Promise<MallCart[]> {
  const data = await postRpc<{ items?: MallCart[]; total?: number }>(URL_CART_FIND_PAGE, {
    query: {
      filter: { eq: ['userId', userId] },
    },
    offset: 0,
    limit: 200,
  });
  return data?.items ?? [];
}
