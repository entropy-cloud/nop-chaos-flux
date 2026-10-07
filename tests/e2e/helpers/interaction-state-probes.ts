import type { Page } from '@playwright/test';

// Interaction-state probe template library (plan 543 Phase 2, IS-0).
// Readings-based evidence for the six state invariants V1–V6 defined in
// docs/skills/interaction-state-audit-prompt.md §3/§5. Convictions must cite
// programmatic readings from these probes — screenshots are corroboration
// only. IS-9 will promote per-invariant assertion helpers on top of this
// capture layer; batches write sequence specs following
// tests/e2e/interaction-state-probe-template.spec.ts.

export interface RectJSON {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ScrollReading {
  /** Stable-ish descriptor used to pair before/after captures (data-slot + first class + box). */
  label: string;
  scrollLeft: number;
  scrollTop: number;
}

export interface InteractionReadings {
  url: string;
  /** V1: every live scrollable container with its scroll offsets. */
  scrollContainers: ScrollReading[];
  /** V2: canvas viewport transform style, if a flow canvas is present. */
  viewportTransform: string | null;
  /** V2: first canvas node rect (translate/scale drift detector). */
  firstNodeRect: RectJSON | null;
  nodeCount: number;
  /** V3: domain entity count for feedback-truthfulness cross-checks. */
  eventCount: number;
  /** V3/V5: live toast texts. */
  toasts: string[];
}

export interface CaptureOptions {
  /** Extra selectors treated as scroll containers even if not detected generically. */
  extraScrollSelectors?: string[];
  nodeSelector?: string;
  eventSelector?: string;
}

interface EvalResult {
  scrollContainers: { label: string; scrollLeft: number; scrollTop: number }[];
  viewportTransform: string | null;
  firstNodeRect: RectJSON | null;
  nodeCount: number;
  eventCount: number;
  toasts: string[];
  url: string;
}

/**
 * Capture the full pre/post interaction readings set (prompt §5 template).
 * Scroll containers are discovered generically (overflow auto/scroll with
 * overflowable content) so audit-time enumeration stays live — no hand lists.
 */
export async function captureInteractionReadings(page: Page, options: CaptureOptions = {}): Promise<InteractionReadings> {
  const result = await page.evaluate<EvalResult, CaptureOptions>((opts) => {
    const scrollables: { label: string; scrollLeft: number; scrollTop: number }[] = [];
    const seen = new Set<Element>();
    const collect = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      const style = getComputedStyle(el);
      const overflowableX = style.overflowX === 'auto' || style.overflowX === 'scroll';
      const overflowableY = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if ((overflowableX || overflowableY) && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
        const slot = el.getAttribute('data-slot') ?? '';
        const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)[0] ?? '';
        scrollables.push({ label: `${slot}|${cls}|${el.clientWidth}x${el.clientHeight}`, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop });
      }
    };
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(' *'))) {
      if (scrollables.length >= 24) break;
      collect(el);
    }
    for (const selector of opts.extraScrollSelectors ?? []) {
      for (const el of Array.from(document.querySelectorAll(selector))) collect(el);
    }
    const viewport = document.querySelector('.react-flow__viewport');
    const nodes = document.querySelectorAll('.react-flow__node');
    const firstNode = nodes[0] instanceof HTMLElement ? nodes[0] : null;
    const events = document.querySelectorAll(opts.eventSelector ?? '[data-slot^="calendar-event"]');
    return {
      scrollContainers: scrollables,
      viewportTransform: viewport?.getAttribute('style') ?? null,
      firstNodeRect: firstNode ? firstNode.getBoundingClientRect().toJSON() : null,
      nodeCount: nodes.length,
      eventCount: events.length,
      toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map((el) => el.textContent ?? ''),
      url: location.hash,
    };
  }, options);
  return result;
}

/**
 * V4 evidence: control vs logical-anchor geometry. `centerOffset` must fall
 * inside the anchor's tolerance band (e.g. ±2px for a gap-midpoint insert
 * button); `clipped` flags the control escaping the nearest scroll container.
 */
export async function measureControlAnchor(
  page: Page,
  controlSelector: string,
  anchorSelector: string,
): Promise<{
  controlRect: RectJSON | null;
  anchorRect: RectJSON | null;
  centerOffsetX: number | null;
  centerOffsetY: number | null;
  clipped: boolean | null;
}> {
  return page.evaluate(
    ([controlSelector, anchorSelector]) => {
      const control = document.querySelector(controlSelector);
      const anchor = document.querySelector(anchorSelector);
      if (!(control instanceof HTMLElement) || !(anchor instanceof HTMLElement)) {
        return { controlRect: null, anchorRect: null, centerOffsetX: null, centerOffsetY: null, clipped: null };
      }
      const c = control.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      let clipped = false;
      let parent = control.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (/(auto|scroll|hidden|clip)/.test(style.overflow + style.overflowX + style.overflowY)) {
          const p = parent.getBoundingClientRect();
          if (c.left < p.left - 1 || c.right > p.right + 1 || c.top < p.top - 1 || c.bottom > p.bottom + 1) {
            clipped = true;
            break;
          }
        }
        parent = parent.parentElement;
      }
      return {
        controlRect: c.toJSON(),
        anchorRect: a.toJSON(),
        centerOffsetX: c.left + c.width / 2 - (a.left + a.width / 2),
        centerOffsetY: c.top + c.height / 2 - (a.top + a.height / 2),
        clipped,
      };
    },
    [controlSelector, anchorSelector] as const,
  );
}

export interface EntityStyleReading {
  borderWidth: string;
  borderColor: string;
  backgroundColor: string;
  color: string;
  opacity: string;
}

/**
 * V6 evidence: computed styles of an interactive entity in a given state.
 * Call once per state (resting / hover / selected) after driving the state;
 * the state-distinguishability verdict compares the readings.
 */
export async function readEntityStyles(page: Page, selector: string): Promise<EntityStyleReading | null> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) return null;
    const style = getComputedStyle(el);
    return {
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
      color: style.color,
      opacity: style.opacity,
    };
  }, selector);
}

/** Field-level diff of two captures; empty array = no drift (V1/V2/V5 pass evidence). */
export function diffReadings(before: InteractionReadings, after: InteractionReadings): string[] {
  const diffs: string[] = [];
  if (before.url !== after.url) diffs.push(`url: ${before.url} → ${after.url}`);
  if (before.scrollContainers.length !== after.scrollContainers.length) {
    diffs.push(`scrollContainer count: ${before.scrollContainers.length} → ${after.scrollContainers.length}`);
  }
  const paired = Math.min(before.scrollContainers.length, after.scrollContainers.length);
  for (let i = 0; i < paired; i += 1) {
    const b = before.scrollContainers[i];
    const a = after.scrollContainers[i];
    if (b.label !== a.label) continue; // container set changed shape; count diff already reported
    if (b.scrollLeft !== a.scrollLeft) diffs.push(`scrollLeft[${b.label}]: ${b.scrollLeft} → ${a.scrollLeft}`);
    if (b.scrollTop !== a.scrollTop) diffs.push(`scrollTop[${b.label}]: ${b.scrollTop} → ${a.scrollTop}`);
  }
  if (before.viewportTransform !== after.viewportTransform) {
    diffs.push(`viewportTransform: ${before.viewportTransform} → ${after.viewportTransform}`);
  }
  const bRect = before.firstNodeRect;
  const aRect = after.firstNodeRect;
  if ((bRect === null) !== (aRect === null)) {
    diffs.push(`firstNodeRect presence: ${bRect ? 'rect' : 'null'} → ${aRect ? 'rect' : 'null'}`);
  } else if (bRect && aRect) {
    for (const field of ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'] as const) {
      if (bRect[field] !== aRect[field]) {
        diffs.push(`firstNodeRect.${field}: ${bRect[field]} → ${aRect[field]}`);
      }
    }
  }
  if (before.nodeCount !== after.nodeCount) diffs.push(`nodeCount: ${before.nodeCount} → ${after.nodeCount}`);
  if (before.eventCount !== after.eventCount) diffs.push(`eventCount: ${before.eventCount} → ${after.eventCount}`);
  if (before.toasts.length !== after.toasts.length || before.toasts.some((t, i) => t !== after.toasts[i])) {
    diffs.push(`toasts: ${before.toasts.join(' | ')} → ${after.toasts.join(' | ')}`);
  }
  return diffs;
}
