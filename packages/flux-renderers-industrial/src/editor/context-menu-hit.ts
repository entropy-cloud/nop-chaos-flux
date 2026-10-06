import { collectWorldBounds } from './editor-working-helpers.js';
import type { ScadaSymbolNode } from '../serialization/config-types.js';

/**
 * 右键命中检测（plan 532 S3 Phase 1）：working copy 全图元世界 rect 含点判定。
 *
 * 原语 = `collectWorldBounds`（累计父链偏移的世界系 rect；group 子节点 (x,y) 为 parent-relative，
 * 不可用裸节点 rect——editor-working-helpers.ts:32-36 警告）。取序 = 返回序（前序 DFS = 绘制序，
 * 末尾最顶层，与 z-order 数组序语义一致 z-order.ts:6-7）；无命中返回 null（空白态）。
 */
export function pickSymbolAtPoint(symbols: ScadaSymbolNode[], world: { x: number; y: number }): string | null {
  let hit: string | null = null;
  for (const bounds of collectWorldBounds(symbols)) {
    if (bounds.width <= 0 || bounds.height <= 0) continue;
    if (
      world.x >= bounds.x &&
      world.x <= bounds.x + bounds.width &&
      world.y >= bounds.y &&
      world.y <= bounds.y + bounds.height
    ) {
      hit = bounds.id;
    }
  }
  return hit;
}
