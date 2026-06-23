# {1} Mobile Interaction-Contract & Correctness Remediation

> Plan Status: superseded
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-01, MA-02, MA-03, MA-04, MA-07, MA-08, MA-09, MA-10, MA-12, MA-13, MA-14, MA-15, MA-16, MA-20, MA-25) and `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-01, OA-02, OA-05, OA-06, OA-07)
> Related: `docs/plans/2026-06-23-0624-2-mobile-static-surface-conformance.md` (also superseded)
> Execution Order: {1} — runs first; unblocks trust in the package's core mobile-interaction mission; the static plan depends on this settling the shared files (`notice-bar.tsx`, `swipe-cell.tsx`, `use-touch.ts`).

## Supersession Note

**Superseded on 2026-06-23 by the `2026-06-23-0655-*` owner-plan set** (`docs/plans/2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md`, `...-2-mobile-contract-honesty-and-markers-gating-plan.md`, `...-3-mobile-ux-a11y-and-styling-hygiene-plan.md`).

Reason: this plan and its companion `0624-2` were drafted at 06:24 from the open audits but were later found to **not cover OA-08..OA-13** — the six newer findings the `open` audit revision contributed, including the package's highest-urgency a11y defect OA-08 (`swipe-cell` off-screen action buttons stay focusable/operable while closed), the pull-refresh ~2× over-travel geometry OA-09, the `infinite-scroll` error-state observer OA-10, the countdown format three-way doc/code drift OA-11, the swipe-cell one-shot width re-measure OA-12, and the `countdown` `reset()` asymmetry OA-13. The `0655` set is a complete superset: it covers all 25 MA findings + all 13 OA findings, passed independent fresh-session draft review (2 rounds for plan 1, 1 round each for plans 2 & 3), and resolves to a single clean owner set instead of two overlapping ones. The finding-to-plan mapping in the `0655` set supersedes the `{1}/{2}` split here. No code was executed against this plan (all files were uncommitted), so there is no execution loss. Keep this file as a historical record; do not execute it.

## Purpose

Close every confirmed live **behavioral** defect and **interaction-contract breach** in `packages/flux-renderers-mobile/` so that the package's mobile-native interaction renderers (pull-refresh, swipe-cell, notice-bar, infinite-scroll, countdown) actually behave the way their `docs/components/*/design.md` contracts and the repo's renderer contracts say they behave — and so that the regression gates that should have caught them now exist.

This is the **behavioral correctness** owner plan. The companion static-surface plan (`{2}`) covers type/API honesty, theme-token styling, i18n, and a11y semantics; it executes after this one.

## Current Baseline

Verified against live repo on 2026-06-23:

- The package is functionally mountable and type-checks, but several **design-doc-promised interaction behaviors are dead or unwired**:
  - `notice-bar` multi-text rotation (`text: string[]`) never advances in any configuration — the `onAnimationIteration` guard is inverted vs intent and the wrong event is listened to for `loop:false` (`packages/flux-renderers-mobile/src/notice-bar.tsx:186-190`; contract at `docs/components/notice-bar/design.md:87,144`, with `:32,45` as supporting context — note `:32` marks multi-text as "不采纳" only as a _separate carousel feature_, achieved instead via "用 loop + 多条文本自动轮播", which the code fails to do). [OA-01]
  - `swipe-cell` "auto-close after action" + `onAction` event are declared in `design.md:8,26,67,130`, `schemas.ts:64`, and `mobile-renderer-definitions.ts:73`, but `swipe-cell.tsx` never dispatches `onAction` and has no path from an inner action button to `closeCell()`. [OA-02, MA-09]
  - `useTouch` scroll-locking (`preventDefault` + direction lock) is contractually required by `docs/components/swipe-cell/design.md:127,151` and is entirely absent; neither gesture renderer sets `touch-action`. [OA-06, MA-07]
- **Async/lifecycle defects** can deadlock or leak: `pull-refresh.tsx:86` `onRefresh` has no `.catch` (permanent spinner on rejection); `successTimerRef` cleanup misses timers scheduled post-unmount (`pull-refresh.tsx:54-62,86-92`); `infinite-scroll.tsx:43-77` has no in-flight guard and `hasMore === false` lets `undefined` auto-paginate; all three `onLoadMore` fire sites drop rejections. [MA-01, MA-12, MA-13, MA-14]
- **React purity violations**: action dispatches fire inside `setState` updaters in pull-refresh / swipe-cell / countdown (double-dispatch under StrictMode); pull-refresh mirrors `'pulling'`/`'loosing'` via `useEffect`+`setState` instead of render-time derivation; countdown's `targetTime` branch never clamps → re-renders forever after finish. [MA-02, MA-10, MA-16]
- **Contract drift**: 4 of 5 renderers emit `nop-X__region` / `nop-X--variant` BEM classes prohibited by `docs/architecture/renderer-markers-and-selectors.md:120-153`; no mobile markers-contract test exists (siblings have one). [MA-03, MA-25]
- **Event-passthrough drift**: `notice-bar` DOM-entry handlers drop the native event (`void props.events.onXxx?.(undefined)`) violating `docs/architecture/renderer-runtime.md:650` Event Passthrough Contract. [MA-04]
- **`InfiniteScrollSchema`** (`schemas.ts:29-46`) omits the runtime-consumed `hasMore`/`loading`/`error` props, forcing `as InfiniteScrollRuntimeProps` casts in the renderer. [MA-08]
- **touchcancel commits** instead of resetting in pull-refresh (`:132`) and swipe-cell (`:186`). [OA-05]
- **The shipped playground reference consumer** of `infinite-scroll` is a runaway loader (`loading:false`/`hasMore:true` as static literals); e2e assertions accept `'normal'` so they green-light it. [OA-07, MA-20]
- **Coverage gaps**: countdown `reset()`/`start()`/`millisecond`/targetTime-completion untested; `touchCancel`/observer-rebuild/marquee-true-branch untested. [MA-15, MA-20]

## Goals

- Every design-doc "采纳:实现" interaction row (multi-text rotation, auto-close-after-action, scroll-locking) has observable behavior in live code plus a focused regression test.
- No async rejection or unmount can deadlock a status machine, fire setState on an unmounted instance, or double-fire a network-triggering action.
- Action dispatches never execute inside `setState` updaters; touch-path status is derived at render time.
- The mobile package has a markers-contract test gate mirroring the sibling packages, and the BEM class strings are deleted.
- Native DOM events are forwarded through `props.events`; `InfiniteScrollSchema` types its real runtime props.
- The playground `infinite-scroll` consumer is no longer a runaway loader and the e2e suite actually asserts interaction state transitions.

## Non-Goals

- Type-signature honesty of non-interaction public APIs (`use-touch.ts` `onTouchEnd` unused param, `NoticeBarSchema.icon` `SchemaValue` vs `string`, `useCountdownTimer` half-exported interfaces) — owned by companion plan `{2}`.
- Theme-token migration, `@keyframes` injection cleanup, inline-style → Tailwind, `tabular-nums`, `user-select` — owned by companion plan `{2}`.
- i18n seam for default strings and `notice-bar` a11y role/focus semantics — owned by companion plan `{2}` (note: OA-04's role/focus changes touch the same `notice-bar.tsx` root element this plan edits; sequencing handles it).
- Removing unused `package.json` workspace deps — owned by companion plan `{2}`.
- Rewriting the touch state machine into a new architecture; this plan fixes the existing one in place.

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/{pull-refresh,swipe-cell,notice-bar,infinite-scroll,countdown}.tsx`
- `packages/flux-renderers-mobile/src/hooks/use-touch.ts`
- `packages/flux-renderers-mobile/src/schemas.ts` (interaction-runtime props only)
- `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` (new)
- `packages/flux-renderers-mobile/src/*.test.tsx` (new regression cases)
- `apps/playground/src/pages/mobile-components-demo.tsx` (infinite-scroll consumer fix)
- `tests/e2e/mobile-components.spec.ts` (assertion tightening)
- `docs/components/{notice-bar,swipe-cell}/design.md` (only if a contract row needs clarification after wiring — record final implemented behavior)

### Out Of Scope

- All Non-Goals items.
- New mobile renderers; other packages.
- Bundle/perf benchmarking at scale (flagged as a blind spot in the open-audit; deferred).

## Failure Paths

| Scenario id       | Trigger                                                        | Behavior                                                    | Retryable          | User-visible                                   |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| refresh-reject    | `onRefresh` action rejects (network/5xx/dispatch-cancel)       | status returns to `'normal'`; no permanent spinner          | yes (next pull)    | indicator retracts to rest; no stuck loading   |
| refresh-unmount   | component unmounts while `onRefresh` in flight                 | no `setState` after unmount; pending success timer cleared  | n/a                | none (gone)                                    |
| loadmore-reject   | `onLoadMore` rejects                                           | renderer surfaces via host `error` contract; no silent hang | yes (retry button) | error status + retry                           |
| loadmore-dedup    | sentinel intersects again before host publishes `loading:true` | local in-flight guard suppresses duplicate `onLoadMore`     | n/a                | no duplicate rows / requests                   |
| touchcancel       | system aborts the gesture mid-drag                             | gesture resets to pre-drag state; no commit                 | n/a                | content snaps back, no accidental refresh/open |
| swipe-action      | inner left/right action button tapped                          | `onAction` dispatched with side; cell auto-closes           | n/a                | cell rebounds; action runs once                |
| rotation-loop-off | `loop:false` + `text:string[]`                                 | each text scrolls once then advances to next                | n/a                | multi-text rotation visible                    |

## Test Strategy

本档选择：**必须自动化**

Rationale: this plan fixes correctness defects (P1 async deadlocks, contract breaches that silently never fire) on core regression paths of a package whose entire purpose is mobile interaction. Per the plan guide, correctness defects on core paths must automate, and Proof items precede Fix items where feasible.

Proof methods (note jsdom limitations honestly):

- Reject-path / unmount / double-fire / touchcancel: unit tests with `vi.useFakeTimers()`, rejected promises, and `fireEvent.touchCancel`. These are deterministic and jsdom-safe.
- Rotation / auto-close / onAction: unit tests asserting dispatched events + state transitions (jsdom-safe; do NOT depend on real animation frames — drive via the chosen event/timeout seam).
- Scroll-locking (`preventDefault` + direction lock + `touch-action`): assert the non-passive listener is registered and `preventDefault` is called on cross-axis `touchmove`; assert `touch-action` style/attribute. Real-device frame budget remains a documented blind spot (open-audit self-assessment) and is NOT claimed here.
- Markers contract: static DOM assertion test mirroring siblings.
- Playground runaway loader: fix the static literals; tighten e2e to reject `'normal'` where a transition is expected.

## Execution Plan

### Phase 1 - Async & lifecycle safety

Status: planned
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`, `packages/flux-renderers-mobile/src/infinite-scroll.tsx`, `packages/flux-renderers-mobile/src/swipe-cell.tsx`

- Item Types: `Fix | Proof`

- [ ] [Proof] `pull-refresh.test.tsx`: add reject-path test — `onRefresh` rejects → status returns to `'normal'` (no permanent `'loading'`). [MA-01]
- [ ] [Fix] MA-01: add `.catch` to the `onRefresh` promise at `pull-refresh.tsx:86`; on rejection reset to `'normal'` (optionally surface via runtime monitor). [MA-01]
- [ ] [Proof] `pull-refresh.test.tsx`: add unmount-during-flight test — unmount while `onRefresh` pending → no `setState` warning, pending success timer does not fire. [MA-12]
- [ ] [Fix] MA-12: introduce an `isMountedRef` (or per-render `AbortController` per `docs/architecture/performance-design-requirements.md` P5); guard both `setStatus` calls inside the `.then`; ensure cleanup clears any timer scheduled post-resolve. [MA-12]
- [ ] [Proof] `infinite-scroll.test.tsx`: add double-fire guard test — sentinel intersects twice before host publishes `loading:true` → `onLoadMore` fires exactly once. [MA-13]
- [ ] [Fix] MA-13: add a local `isLoadingRef` set synchronously when `onLoadMore` fires and cleared on host `loading` prop transition; tighten `hasMore` handling so `undefined` does not auto-paginate (require explicit boolean or document the truthy contract — prefer explicit). [MA-13]
- [ ] [Proof] `infinite-scroll.test.tsx`: add reject-path test — `onLoadMore` rejects → no unhandled rejection; the `error` status is reachable via the host `error` contract path. [MA-14]
- [ ] [Fix] MA-14: add `.catch` hygiene to all three `onLoadMore` fire sites (`infinite-scroll.tsx:55,71,77`); document/host the `error` surfacing contract. [MA-14]
- [ ] [Proof] `pull-refresh.test.tsx` + `swipe-cell.test.tsx`: add `fireEvent.touchCancel(root)` tests asserting reset to pre-gesture state (pull-refresh → `'normal'`; swipe-cell → previous `openState` + touch `reset()`). [OA-05]
- [ ] [Fix] OA-05: give `onTouchCancel` a dedicated reset handler distinct from `handleTouchEnd` in both `pull-refresh.tsx:132` and `swipe-cell.tsx:186` (do not commit on cancel). [OA-05]

Exit Criteria:

- [ ] Reject-path, unmount-during-flight, double-fire, and touchcancel-reset tests exist and pass for the affected renderers.
- [ ] No fire-and-forget action chain in pull-refresh/infinite-scroll lacks a `.catch`; no `setState` can occur post-unmount.

### Phase 2 - Updater purity & render-time derivation

Status: planned
Targets: `packages/flux-renderers-mobile/src/{pull-refresh,swipe-cell,countdown}.tsx`

- Item Types: `Fix | Proof`

- [ ] [Proof] `swipe-cell.test.tsx` + `pull-refresh.test.tsx` + `countdown.test.tsx`: add StrictMode double-invoke tests asserting each user gesture dispatches its action exactly once (use a counting mock on `props.events.onClose/onOpen/onRefresh/onFinish`). [MA-02]
- [ ] [Fix] MA-02: move all action dispatches out of `setState` updaters — compute next status synchronously, call `setState(next)`, then dispatch in the handler body; track current state via a ref where a post-`setState` guard is needed (`pull-refresh.tsx:83-96`, `swipe-cell.tsx:84-101`, `countdown.tsx:80-96`). [MA-02]
- [ ] [Fix] MA-10: delete the `'pulling'`/`'loosing'` mirror effect (`pull-refresh.tsx:70-78`); derive `resolvedStatus` at render time from `directionalDelta`/`reachedThreshold`, keeping `setStatus` only for genuine state-machine transitions in `handleTouchEnd`. [MA-10]
- [ ] [Proof] `pull-refresh.test.tsx`: assert render-time derivation reproduces the pulling/loosing transitions across the `directionalDelta`/`reachedThreshold` thresholds (existing pulling/loosing cases serve as the regression guard; extend if they do not cover the derived path). [MA-10]
- [ ] [Proof] `countdown.test.tsx`: add a no-re-render-after-finish test (fake timers + `targetTime` in the past) asserting the component stops scheduling after `finishedRef` is set. [MA-16]
- [ ] [Fix] MA-16: clamp the `targetTime` branch (`Math.max(0, targetTime - Date.now())`) and/or `clearInterval` once `finishedRef.current` is set (`countdown.tsx:80-96`). [MA-16]

Exit Criteria:

- [ ] No action dispatch executes inside a `setState` updater (grep-verifiable: no `props.events.` inside a `setX((...) => { ... })` body in the mobile src).
- [ ] StrictMode double-invoke tests pass with single dispatch; countdown no longer re-renders after finish.

### Phase 3 - Wire design-doc interaction contracts

Status: planned
Targets: `packages/flux-renderers-mobile/src/{notice-bar,swipe-cell}.tsx`, `hooks/use-touch.ts`, `schemas.ts`, `infinite-scroll.tsx`

- Item Types: `Fix | Proof`

- [ ] [Proof] `notice-bar.test.tsx`: add multi-text rotation test — `text: ['a','b','c']` advances through all entries under both `loop:true` and `loop:false`. Drive via the chosen seam (timeout or animation event), NOT real rAF. [OA-01]
- [ ] [Fix] OA-01: decouple rotation from `loop` in `notice-bar.tsx:186-190` — remove the inverted `if (!loop && …)` guard; listen to `onAnimationEnd` for the single-scroll switch case and `onAnimationIteration` for the infinite case (or drive switching with a timeout keyed to `animationDuration`). [OA-01]
- [ ] [Proof] `swipe-cell.test.tsx`: add action→feedback→close test — tap an inner action-region button → `onAction` dispatched (with side) AND cell auto-closes. [OA-02, MA-09]
- [ ] [Fix] OA-02 + MA-09: wire the swipe-cell action loop — dispatch `props.events.onAction?.({ type: 'action', side })` when an inner left/right action control is activated, then call `closeCell()`. **Chosen mechanism:** click-event delegation on the `left`/`right` region container `<div>`s (the regions are opaque rendered children with no current click-detection path), since an inner-button `onClick` bubbles to the container; on capture/detection, fire `onAction` with the side and invoke `closeCell()`. Provide an imperative `close()` seam for host-initiated close. [OA-02, MA-09]
- [ ] [Proof] `use-touch.test.ts` + a renderer-level test: assert cross-axis `touchmove` calls `preventDefault` once direction is locked, and that the `touchmove` listener is registered non-passive; assert `touch-action` is set on pull-refresh (pan-y) and swipe-cell (pan-x) roots. [OA-06, MA-07]
- [ ] [Fix] OA-06 + MA-07: implement direction locking + `preventDefault` in `use-touch.ts` (per `docs/components/swipe-cell/design.md:127,151`); **scope note** — `use-touch.ts` currently attaches handlers via JSX (`onTouchMove={...}`) and holds no DOM ref, but JSX `onTouchMove` cannot reliably be non-passive, so the hook must be refactored to register `touchmove` via `addEventListener(el, 'touchmove', fn, { passive: false })` on a DOM ref (affecting both pull-refresh and swipe-cell). Add `touch-action` (`pan-y` for pull-refresh, `pan-x` for swipe-cell) + `overscroll-behavior-y: contain` for pull-refresh (inline style or package CSS). [OA-06, MA-07]
- [ ] [Fix] MA-08: add `hasMore?: boolean; loading?: boolean; error?: boolean | string;` to `InfiniteScrollSchema` (`schemas.ts:29-46`); delete the local `InfiniteScrollRuntimeProps` interface and the `as` casts (`infinite-scroll.tsx:6-29`). [MA-08]
- [ ] [Proof] `notice-bar.test.tsx`: assert the dispatched `onClick`/`onClose` action receives the forwarded native event (not just a grep for absence of `undefined`). [MA-04]
- [ ] [Fix] MA-04: forward native events on `notice-bar` DOM-entry handlers — `(event) => void props.events.onClick?.(event)` (and the close button, after `stopPropagation`); pass structured `{ type, ... }` payloads on semantic events where meaningful. [MA-04]

Exit Criteria:

- [ ] Each design-doc interaction row (rotation, auto-close, scroll-lock) has an observable, tested behavior; `onAction` is dispatched; `InfiniteScrollSchema` types its real runtime props (no `as` cast).
- [ ] `notice-bar` DOM handlers forward the native event (grep: no `props.events.onClick?.(undefined)` / `onClose?.(undefined)` in notice-bar).

### Phase 4 - Contract gates & regression proof

Status: planned
Targets: `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` (new), `packages/flux-renderers-mobile/src/*.tsx` (BEM deletion), `*.test.tsx` (coverage), `apps/playground/src/pages/mobile-components-demo.tsx`, `tests/e2e/mobile-components.spec.ts`

- Item Types: `Fix | Proof`

- [ ] [Proof] Create `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` mirroring `packages/flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx` — assert no `nop-X__*` region classes and no `nop-X--*` modifiers across all 5 renderers; assert `data-slot`/`data-status`/`data-variant` are correctly emitted. [MA-25]
- [ ] [Fix] MA-03: delete the redundant BEM class strings from `notice-bar.tsx`, `pull-refresh.tsx`, `infinite-scroll.tsx`, `swipe-cell.tsx`; rely on `data-slot` exclusively (drop the `nop-notice-bar--${variant}` modifier — `data-variant` already carries it). [MA-03]
- [ ] [Proof] `countdown.test.tsx`: with `vi.useFakeTimers()` + `vi.setSystemTime()`, assert `targetTime` mode renders the exact remaining (e.g. `targetTime: now+90_000, format:'ss'` → `30`); add `millisecond:true` (30 ms) path coverage; add direct hook tests for `reset()` and `start()`. [MA-15]
- [ ] [Proof] `infinite-scroll.test.tsx`: cover observer rebuild on `distance`/`disabled`/`hasMore`/`loading` change (assert old observer `disconnect()` + new created) via `view.rerender(...)`. [MA-20]
- [ ] [Proof] `notice-bar.test.tsx`: cover the marquee true-branch (`scrollable:true` with overflow) by mocking `scrollWidth`/`clientWidth` via `vi.spyOn`. [MA-20]
- [ ] [Fix] OA-07: replace the static `loading:false`/`hasMore:true` literals in `apps/playground/src/pages/mobile-components-demo.tsx:56-65` with host-driven values that flip `loading:true` on `onLoadMore` and eventually set `hasMore:false`. [OA-07]
- [ ] [Fix] MA-20 (e2e): tighten `tests/e2e/mobile-components.spec.ts` status assertions to reject `'normal'` where a real transition is expected (e.g. `expect(['pulling','loosing','loading']).toContain(status)`), so the runaway loader can no longer pass. [MA-20]

Exit Criteria:

- [ ] `mobile-markers-contract.test.tsx` exists, passes, and would fail if any BEM class is reintroduced.
- [ ] Countdown `reset`/`start`/`millisecond`/`targetTime`-completion, observer rebuild, and marquee true-branch are covered.
- [ ] Playground `infinite-scroll` no longer fires unbounded `onLoadMore`; e2e assertions reject the no-op `'normal'` case where a transition is expected.

## Draft Review Record

- Reviewer / Agent: independent `general` sub-agent, fresh session (task `ses_10e8d78f7ffevw39ffkeI0Vlzr`)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - (Major/Blocker: none)
  - Minor: added preceding `[Proof]` for MA-14 reject path (Phase 1).
  - Minor: added `[Proof]` for MA-10 render-time derivation (Phase 2).
  - Minor: added `[Proof]` for MA-04 asserting the dispatched action receives the native event (Phase 3).
  - Minor: named the OA-02/MA-09 detection mechanism (click-event delegation on left/right region containers).
  - Minor: added scope note that OA-06/MA-07 requires refactoring `use-touch.ts` to register a non-passive `touchmove` via `addEventListener` on a DOM ref (JSX `onTouchMove` cannot reliably be non-passive).
  - Minor: added a coverage-gap Closure Gate clause (MA-15, MA-20).
  - Minor: re-anchored the notice-bar rotation contract citation to `design.md:87,144` with `:32` as supporting context (clarifies the "不采纳" nuance).
- Reference accuracy: all cited paths/lines/finding-IDs verified against the live repo by the reviewer with zero mismatches; full coverage of all 20 owned findings confirmed; companion-plan split confirmed clean and non-overlapping.

## Closure Gates

- [ ] All in-scope confirmed live defects (MA-01/02/03/04/08/09/10/12/13/14/16, OA-01/02/05/06/07) are fixed with observable behavior.
- [ ] All in-scope confirmed contract drifts (BEM markers, event passthrough, InfiniteScrollSchema props, scroll-locking/`touch-action` contract, auto-close/`onAction` contract, multi-text rotation contract) have converged to their design-doc/renderer-contract baselines.
- [ ] Every design-doc "采纳:实现" interaction row covered by this plan has a focused regression test.
- [ ] All in-scope coverage-gap findings (MA-15 countdown reset/start/ms/targetTime, MA-20 touchCancel/observer-rebuild/marquee-true/e2e) have their focused tests landed and passing.
- [ ] No action dispatch fires inside a `setState` updater; no async chain lacks `.catch`; no `setState` can occur post-unmount.
- [ ] No in-scope live defect or contract drift has been silently downgraded to deferred / follow-up.
- [ ] Affected owner docs (`docs/components/notice-bar/design.md`, `docs/components/swipe-cell/design.md`) reflect the final implemented behavior, or no update was required (record which).
- [ ] Closure audit performed by an independent sub-agent (fresh session); evidence recorded in `Closure Audit Evidence`.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Real-device / frame-budget touch-semantics verification

- Classification: `watch-only residual`
- Why Not Blocking Closure: jsdom cannot reproduce Chrome-on-Android gesture interception; the open-audit's own blind-spot self-assessment flags this. This plan verifies the _contractually required_ code paths (non-passive `preventDefault`, `touch-action`, touchcancel reset, direction lock) via deterministic unit assertions, which is the maximum verifiable on this stack. Real-device CDP-touch verification is a separate empirical activity.
- Successor Required: `no` (revisit if a real-device test harness is added)

## Non-Blocking Follow-ups

- Quantitative perf benchmark of N finished countdowns / N swipe-cells (open-audit blind spot) — optimization candidate, not a closure blocker.
- Re-evaluate whether `useCountdownTimer` / `useTouch` should remain publicly exported before v1 API freeze (open-audit blind spot) — decision can happen in companion plan `{2}` or a dedicated API-freeze review.

## Closure

Status Note: <<filled at closure>>

Closure Audit Evidence:

- Auditor / Agent: <<independent sub-agent>>
- Evidence: <<task id / daily log / findings>>

Follow-up:

- <<non-blocking follow-ups only; confirmed live defects must not appear here>>
