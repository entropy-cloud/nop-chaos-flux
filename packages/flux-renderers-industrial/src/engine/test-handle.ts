import type { ViewportState } from './viewport.js';
import type { ScadaPrimitive } from '../serialization/config-types.js';
import type { AddStrategyTiming } from './batch-add-probe.js';

export function scadaTestHandleKey(cid: number): string {
  return `__flux_scada_${cid}`;
}

export interface ScadaTestHandle {
  engine: unknown;
  tree: unknown;
  app: unknown;
  getSymbol(id: string): unknown;
  getPointValue(pointId: string): unknown;
  getViewport(): ViewportState;
  forceRender(): void;
  /** dev/test 专用批量注入通道（I14.1 `perf-injection-channel` 裁定）：非 scada-canvas 公共契约变更，仅 exposeTestHandle 时挂载。 */
  setPointValues?: (values: Record<string, ScadaPrimitive>) => void;
  /** dev/test 专用 batch.add 对照探针（gate-3-review §10 m-8，I14.1 兑现）：非公共契约。 */
  measureAddStrategies?: (count: number) => AddStrategyTiming;
}

export function mountScadaTestHandle(cid: number, handle: ScadaTestHandle): void {
  (window as unknown as Record<string, unknown>)[scadaTestHandleKey(cid)] = handle;
}

export function removeScadaTestHandle(cid: number): void {
  delete (window as unknown as Record<string, unknown>)[scadaTestHandleKey(cid)];
}
