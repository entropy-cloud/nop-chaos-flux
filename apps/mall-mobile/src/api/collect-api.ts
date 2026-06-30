import { postRpc } from './rpc';

export const COLLECT_TYPE_GOODS = 0;

const URL_COLLECT_ADD = '/r/LitemallCollect__addCollect';
const URL_COLLECT_REMOVE = '/r/LitemallCollect__removeCollect';
const URL_COLLECT_IS = '/r/LitemallCollect__isCollect';

export async function addCollect(valueId: string, type: number = COLLECT_TYPE_GOODS): Promise<void> {
  await postRpc(URL_COLLECT_ADD, { type, valueId });
}

export async function removeCollect(valueId: string, type: number = COLLECT_TYPE_GOODS): Promise<void> {
  await postRpc(URL_COLLECT_REMOVE, { type, valueId });
}

export async function isCollected(valueId: string, type: number = COLLECT_TYPE_GOODS): Promise<boolean> {
  const data = await postRpc<boolean>(URL_COLLECT_IS, { type, valueId });
  return data === true;
}
