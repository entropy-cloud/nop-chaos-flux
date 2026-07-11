import { useEffect, useRef, useState } from 'react';

export type AutoFillHeightConfig = boolean | { height?: number; maxHeight?: number };

const VISIBILITY_RETRY_MAX = 10;

/**
 * Computes the table container height that fills the remaining parent viewport.
 *
 * Algorithm (mirrors amis Table2 `updateAutoFillHeight`, improved):
 *  - Observe the parent element via ResizeObserver.
 *  - Available height = parent.clientHeight - table.offsetTop (relative to parent)
 *    - sum of following sibling heights (skipping position:absolute/fixed).
 *  - `{ height: N }` → fixed N px; `{ maxHeight: N }` → maxHeight N px;
 *    `true` → computed value.
 *  - When the parent is invisible (clientHeight === 0), retry via requestAnimationFrame
 *    up to VISIBILITY_RETRY_MAX times (covers Dialog open animations).
 *
 * Fixed-height / maxHeight / disabled cases are derived at render time (no setState).
 * Only the ResizeObserver-measured height is kept in state and updated from the
 * observer callback (async) to avoid synchronous setState-in-effect cascades.
 *
 * Returns a ref to attach to the table container and the resolved height style.
 */
export function useAutoFillHeight(
  config: AutoFillHeightConfig | undefined,
  loading: boolean,
): { containerRef: React.RefObject<HTMLDivElement | null>; heightStyle: React.CSSProperties | undefined } {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined);

  const enabled = config !== undefined && config !== false;
  const fixedHeight = typeof config === 'object' && config !== null ? config.height : undefined;
  const maxHeight = typeof config === 'object' && config !== null ? config.maxHeight : undefined;

  const computeAvailable = (container: HTMLElement, parent: HTMLElement): number => {
    const tableTop = container.offsetTop - parent.offsetTop;
    let siblingsHeight = 0;
    let node: Element | null = container.nextElementSibling;
    while (node) {
      const position = getComputedStyle(node).position;
      if (position !== 'absolute' && position !== 'fixed') {
        siblingsHeight += node.clientHeight;
      }
      node = node.nextElementSibling;
    }
    return parent.clientHeight - tableTop - siblingsHeight;
  };

  // Observe the parent and update the measured height from the (async) callback.
  useEffect(() => {
    if (!enabled || fixedHeight !== undefined) {
      return;
    }

    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) {
      return;
    }

    let retryCount = 0;
    let frame = 0;
    let observer: ResizeObserver | undefined;

    const apply = (value: number) => {
      setMeasuredHeight(value > 0 ? value : 0);
    };

    const measure = () => {
      const parentHeight = parent.clientHeight;
      if (parentHeight === 0) {
        // Parent not visible yet (e.g. inside an animating Dialog). Retry on the
        // next animation frame instead of blocking.
        if (retryCount < VISIBILITY_RETRY_MAX) {
          retryCount += 1;
          frame = requestAnimationFrame(measure);
        }
        return;
      }
      apply(computeAvailable(container, parent));
    };

    // Defer the initial measure to an animation frame so it is NOT a synchronous
    // setState inside the effect body (avoids react-hooks/set-state-in-effect).
    frame = requestAnimationFrame(measure);

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        retryCount = 0;
        measure();
      });
      observer.observe(parent);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [enabled, fixedHeight, maxHeight]);

  // Re-measure when loading transitions back to false (spinner unmount changes layout).
  useEffect(() => {
    if (!enabled || fixedHeight !== undefined || loading) {
      return;
    }
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;
    const frame = requestAnimationFrame(() => {
      if (parent.clientHeight === 0) return;
      setMeasuredHeight((prev) => {
        const next = computeAvailable(container, parent);
        return next > 0 ? next : prev;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, fixedHeight, maxHeight, loading]);

  // Render-time derivation for fixed / maxHeight / measured cases (no setState).
  let heightStyle: React.CSSProperties | undefined;
  if (!enabled) {
    heightStyle = undefined;
  } else if (fixedHeight !== undefined) {
    heightStyle = { height: `${fixedHeight}px`, overflow: 'auto' };
  } else if (maxHeight !== undefined) {
    heightStyle = { maxHeight: `${maxHeight}px`, overflow: 'auto' };
  } else if (measuredHeight !== undefined) {
    heightStyle = { height: `${measuredHeight}px`, overflow: 'auto' };
  } else {
    // No parent measured yet → degrade to a sensible fixed height until measured.
    heightStyle = { height: '600px', overflow: 'auto' };
  }

  return { containerRef, heightStyle };
}
