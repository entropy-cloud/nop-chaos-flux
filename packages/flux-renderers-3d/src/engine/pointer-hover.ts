import type * as THREE from 'three';
import type { ScheduleFrame } from './scene-manager.js';

/**
 * Pointer interaction controller (plan 473, visual-quality V3-F1) — extracted
 * from scene-manager to honour the oversized-file gate (M-2 strategy).
 *
 * Responsibilities: pointermove (rAF-throttled) drives continuous hover;
 * pointerdown forces a hover enter (touch taps emit no move events); a
 * pointerup without drag (> 2.5% viewport displacement) resolves a pick.
 * Enter/leave/highlight decisions are delegated via `resolveHit` +
 * `onHoverChange` so the manager owns raycasting and material state.
 */

export interface NdcPoint {
  x: number;
  y: number;
}

export interface ResolvedHit {
  modelId: string;
  point: THREE.Vector3;
}

export interface PointerHoverDeps {
  /** Raycast at NDC coordinates (interactive models only). */
  resolveHit(ndc: NdcPoint): ResolvedHit | undefined;
  /** Hover transition: `modelId` may be null (left every model). */
  onHoverChange(modelId: string | null, previous: string | null): void;
  onPick(hit: ResolvedHit): void;
}

const DRAG_THRESHOLD_SQUARED = 0.000625; // > 2.5% viewport displacement

export class PointerHoverController {
  private downPoint: NdcPoint | null = null;
  private lastHovered: string | null = null;
  private frameHandle: (() => void) | null = null;
  private pendingNdc: NdcPoint | null = null;
  private cleanup: (() => void) | null = null;

  constructor(
    private element: HTMLElement,
    private deps: PointerHoverDeps,
    private scheduleFrame: ScheduleFrame,
  ) {}

  bind(): void {
    const listeners = this.element as unknown as {
      addEventListener?: (type: string, cb: (e: unknown) => void) => void;
      removeEventListener?: (type: string, cb: (e: unknown) => void) => void;
    };
    if (typeof listeners.addEventListener !== 'function') return;

    const moveHandler = (rawEvent: unknown) => {
      const event = rawEvent as { clientX: number; clientY: number };
      this.pendingNdc = this.clientToNdc(event.clientX, event.clientY, this.element);
      if (this.frameHandle) return;
      this.frameHandle = this.scheduleFrame(() => {
        this.frameHandle = null;
        if (this.pendingNdc) this.updateHover(this.pendingNdc);
      });
    };
    const downHandler = (rawEvent: unknown) => {
      const event = rawEvent as { clientX: number; clientY: number };
      this.downPoint = this.clientToNdc(event.clientX, event.clientY, this.element);
      this.updateHover(this.downPoint);
    };
    const upHandler = (rawEvent: unknown) => {
      const event = rawEvent as { clientX: number; clientY: number };
      const ndc = this.clientToNdc(event.clientX, event.clientY, this.element);
      this.updateHover(ndc);
      const start = this.downPoint;
      this.downPoint = null;
      if (!start) return;
      const dx = ndc.x - start.x;
      const dy = ndc.y - start.y;
      if (dx * dx + dy * dy > DRAG_THRESHOLD_SQUARED) return;
      const hit = this.deps.resolveHit(ndc);
      if (hit) this.deps.onPick(hit);
    };

    listeners.addEventListener('pointermove', moveHandler);
    listeners.addEventListener('pointerdown', downHandler);
    listeners.addEventListener('pointerup', upHandler);
    this.cleanup = () => {
      listeners.removeEventListener?.('pointermove', moveHandler);
      listeners.removeEventListener?.('pointerdown', downHandler);
      listeners.removeEventListener?.('pointerup', upHandler);
    };
  }

  dispose(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.frameHandle?.();
    this.frameHandle = null;
  }

  private clientToNdc(clientX: number, clientY: number, element: HTMLElement): NdcPoint {
    const rect = (element as unknown as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect?.();
    const width = rect?.width ?? 1;
    const height = rect?.height ?? 1;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return { x: ((clientX - left) / width) * 2 - 1, y: -((clientY - top) / height) * 2 + 1 };
  }

  private updateHover(ndc: NdcPoint): void {
    const hit = this.deps.resolveHit(ndc);
    const modelId = hit?.modelId ?? null;
    if (modelId === this.lastHovered) return;
    this.deps.onHoverChange(modelId, this.lastHovered);
    this.lastHovered = modelId;
  }
}
