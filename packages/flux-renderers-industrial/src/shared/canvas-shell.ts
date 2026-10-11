import type { ScadaConfig } from '../serialization/config-types.js';
import { parseScadaConfig } from '../serialization/parse.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { errorMessage } from '../renderer/scada-errors.js';

/**
 * WA-industrial-002 (plan 569): single renderer-layer assembly surface for
 * the runtime/editor twin canvases (design-architecture.md §4.3 option A
 * keeps two engines — this module covers only the pure React wiring that
 * used to be hand-copied per canvas and had already paid the same-defect
 * fix twice: P1-5 responsive viewport (a0de41405) and container-driven
 * sizing (08-09-0121-1 → 1300-1)).
 */

interface ScadaConfigShellError {
  code: 'config-invalid' | 'config-parse';
  message: string;
}

/** Shared parse+validate entry (was a near-verbatim twin in both canvases; the
 * catch route uses the shared `errorMessage()` cause-chain helper — the
 * editor copy had drifted to an inline `instanceof` string). */
export function parseAndValidateScadaConfig<T extends ScadaConfig>(
  raw: unknown,
  empty: T,
): { config?: T; error?: ScadaConfigShellError } {
  if (raw === undefined || raw === null || raw === '') {
    return { config: empty };
  }
  try {
    const config = parseScadaConfig(raw as string | object);
    const result = validateScadaConfig(config);
    if (!result.ok) {
      return { error: { code: 'config-invalid', message: result.errors.join('; ') } };
    }
    return { config: config as T };
  } catch (error) {
    return {
      error: {
        code: 'config-parse',
        message: errorMessage(error),
      },
    };
  }
}

/** Tag the first canvas under `container` with the slot/marker contract. */
function tagFirstCanvas(container: HTMLElement, slot: string, markerClass: string): void {
  const canvas = container.querySelector('canvas');
  if (canvas && !canvas.hasAttribute('data-slot')) {
    canvas.setAttribute('data-slot', slot);
    canvas.classList.add(markerClass);
  }
}

/**
 * Tag now AND re-tag when leafer creates/recreates the canvas after this
 * effect (W7 robustification `fe5636a09`, originally editor-side only — the
 * runtime twin kept the one-shot querySelector and stayed racy). Returns the
 * observer cleanup.
 */
export function observeFirstCanvasTagging(
  container: HTMLElement,
  slot: string,
  markerClass: string,
): () => void {
  tagFirstCanvas(container, slot, markerClass);
  if (typeof MutationObserver === 'undefined') return () => undefined;
  const observer = new MutationObserver(() => tagFirstCanvas(container, slot, markerClass));
  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/** Structural surface both engine runtimes expose for resize handling. */
export interface CanvasResizeRuntime {
  engine: { setSize(width: number, height: number): void };
  refitViewportOnResize?: () => void;
}

/**
 * ResizeObserver → rAF → setSize + refit assembly (P1-5, was a ~20-line twin
 * across both engine hooks). Writes into the host's observer/rafId refs so
 * the host's existing releaseRuntime path (disconnect + cancel pending)
 * keeps owning cleanup — exact pre-extraction semantics.
 */
export function attachResizeRefit(
  container: HTMLElement,
  refs: {
    observerRef: { current: ResizeObserver | undefined };
    rafIdRef: { current: number };
  },
  opts: {
    cancelPendingResize: () => void;
    readRuntime: () => CanvasResizeRuntime | undefined;
  },
): void {
  if (typeof ResizeObserver === 'undefined') return;
  refs.observerRef.current = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const width = Math.round(entry.contentRect.width);
    const height = Math.round(entry.contentRect.height);
    opts.cancelPendingResize();
    refs.rafIdRef.current = requestAnimationFrame(() => {
      refs.rafIdRef.current = 0;
      const current = opts.readRuntime();
      if (!current?.engine) return;
      // P1-5: refit after setSize so the declared viewport fit policy
      // survives container resizes (no policy → no-op).
      current.engine.setSize(width, height);
      current.refitViewportOnResize?.();
    });
  });
  refs.observerRef.current.observe(container);
}

/**
 * Container-driven DOM sizing (08-09-0121-1 / 1300-1 twin fix): schema
 * width/height is world design space, not canvas DOM size — container first,
 * schema only as the container-is-zero (jsdom) fallback. Size then refit
 * (symmetric with the ResizeObserver handler).
 */
export function syncContainerDrivenSize(
  container: HTMLElement | null,
  fallbackWidth: number,
  fallbackHeight: number,
  runtime: CanvasResizeRuntime | undefined,
): void {
  if (!runtime) return;
  const targetWidth = container?.clientWidth || fallbackWidth || 0;
  const targetHeight = container?.clientHeight || fallbackHeight || 0;
  if (targetWidth > 0 && targetHeight > 0) {
    runtime.engine.setSize(targetWidth, targetHeight);
    runtime.refitViewportOnResize?.();
  }
}
