import type { ViewportState } from './viewport.js';

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
}

export function mountScadaTestHandle(cid: number, handle: ScadaTestHandle): void {
  (window as unknown as Record<string, unknown>)[scadaTestHandleKey(cid)] = handle;
}

export function removeScadaTestHandle(cid: number): void {
  delete (window as unknown as Record<string, unknown>)[scadaTestHandleKey(cid)];
}
