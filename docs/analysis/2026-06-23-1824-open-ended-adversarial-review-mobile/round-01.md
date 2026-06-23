# Round 01 — Open-ended adversarial review (mobile), 18:24 execution

- **Date**: 2026-06-23 (timestamp 18:24)
- **Execution dir**: `docs/analysis/2026-06-23-1824-open-ended-adversarial-review-mobile/`
- **Authoritative report** (user-requested path, full detail): `docs/audits/2026-06-23-1824-open-audit-mobile.md`
- **Baseline**: `typecheck`/`build`/`lint`/`test` (138 tests, 8 files) all PASS; clean tree.

## Dedup

All prior findings (MA-01..25, OA-01..17, NEW-MM-01..06) verified **remediated in live code** before searching. `reopened-design-decisions-and-audit-adjudications.md`: zero mobile/transform/carousel matches.

## Findings this round (3 new, all empirically confirmed via throwaway vitest probe; probe deleted)

### OA-18 (确定, headline) — `pull-refresh` body never rebounds

After release-without-commit AND after `success → normal`, `root.style.transform` sticks at the stale damped `pullDistance` instead of `translateY(0px)`. Measured: `translateY(15px)` after a 30px below-threshold pull; `translateY(100px)` (jumps _further down_ from the 60px loading/success offset) after a full successful refresh. Root: `useTouch.onTouchEnd` zeroes only `isTouching`, not `deltaY`; MA-10 gated the _status label_ on `isTouching` but left `trackTranslate` (pull-refresh.tsx:186-189) falling through to `pullDistance` for the resting `'normal'` state; `pull-refresh` (unlike `swipe-cell`) never calls `reset()`. Invisible to the 138-test suite + e2e because both assert `data-status` only, never `style.transform`. Fix: gate resting translate `state.isTouching ? pullDistance : 0`, and add a transform-sign regression test.

### OA-19 (确定) — `notice-bar` `currentIndex` not reset on `text` shrink

Collapsing `text` from `['A','B','C']` (currentIndex=2) to `['only-now']` blanks the bar permanently: `activeText = textList[2] ?? '' = ''`, and the carousel timer bails at `length<=1` so it never recovers. Measured: `text=""` even after +20s. Different root from OA-15 (index-lifecycle vs advancement-coupling). Fix: clamp `currentIndex` on `textList.length` change.

### OA-20 (很可能) — OA-15 carousel decoupling regressed overflowing multi-text

Fixed 3000ms carousel timer cuts each overflowing item's marquee off mid-scroll: measured `animationDuration=12s` vs 3s swap → each item discarded at 25% of its scroll; equal-width items swap text in-place mid-animation. Pre-OA-15 (advance on `onAnimationIteration`) scrolled each item fully. OA-15 traded dead-non-overflow-carousel for truncated-overflow-multi-text. Fix: advance on `max(CAROUSEL_INTERVAL_MS, one marquee cycle)` when `shouldScroll`.

## Overall

The `data-*`-only test contract is a structural defect factory (3rd audit running: OA-09/14/15/18/20 all geometry/animation). Highest-ROI fix = a one-time set of transform/animation assertions, not more per-bug patches.

## Next round切入点

Real-device geometry trace via CDP touch + `getComputedStyle().transform`; host-rerender test harness for dynamic-prop mutations; `useTouch`/`useCountdownTimer` public-export freeze review.
