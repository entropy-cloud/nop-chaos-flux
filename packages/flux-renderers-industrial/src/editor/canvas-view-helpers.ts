import type { ReactNode } from 'react';
import type { ScadaSymbolNode } from '../serialization/config-types.js';
import type { Bounds } from '../engine/viewport.js';
import { collectWorldBounds } from './editor-working-helpers.js';
import type { SnapRect } from './snap/transform-snap.js';
import type { EditorEngineRuntime } from './renderer/hooks/use-editor-engine.js';

/** region render 投影（E2.6）：unknown → ReactNode 安全收敛。 */
export function asReactNode(value: unknown): ReactNode {
  return (value ?? null) as ReactNode;
}

/**
 * 计算全部图元（含 group 嵌套）的聚合世界包围盒（plan 2026-08-08-0900-1 Phase 3 / P2 #9 viewport policy 消费用）。
 * 复用 collectWorldBounds（与 toolbox-runtime computeBounds 同语义）；跳过零尺寸节点。
 */
export function computeAggregateViewportBounds(symbols: ScadaSymbolNode[]): Bounds | undefined {
  const worldBounds = collectWorldBounds(symbols, 0, 0);
  let out: Bounds | undefined;
  for (const b of worldBounds) {
    if (b.width <= 0 || b.height <= 0) continue;
    if (out === undefined) {
      out = { x: b.x, y: b.y, width: b.width, height: b.height };
    } else {
      const minX = Math.min(out.x, b.x);
      const minY = Math.min(out.y, b.y);
      const maxX = Math.max(out.x + out.width, b.x + b.width);
      const maxY = Math.max(out.y + out.height, b.y + b.height);
      out = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  return out;
}

/** plan 531 S2：吸附兄弟矩形面（working copy 全图元 leaf rect；缺省宽高按 0 处理）。 */
export function collectSiblingRects(runtime: EditorEngineRuntime): SnapRect[] {
  return collectWorldBounds(runtime.session.workingConfig.symbols).map((b) => ({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
  }));
}
