import { postRpc } from './rpc';

const URL_FOOTPRINT_RECORD = '/r/LitemallFootprint__recordFootprint';

export async function recordFootprint(goodsId: string): Promise<void> {
  await postRpc(URL_FOOTPRINT_RECORD, { goodsId });
}
