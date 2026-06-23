# Mobile Re-audit #2 Remediation Owner Plan

> Plan Status: completed
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-23-1824-multi-audit-mobile.md` (MM-07..MM-13, 7 retained), `docs/audits/2026-06-23-1824-open-audit-mobile.md` (OA-18..OA-20, 3 new)
> Related: `docs/plans/2026-06-23-1810-1-mobile-post-reaudit-remediation-owner-plan.md` (prior re-audit #1 — NEW-MM-01..06 + OA-14..17, landed in `3f2d6132`)
> Execution Order: {1}

## Purpose

Close every retained finding from the 2026-06-23 18:24 mobile post-remediation re-audit (#2). Both open audits (`1824-multi` + `1824-open`) target a single package (`packages/flux-renderers-mobile`) and share one owner, one component family, and one verification path. Per Plan Guide Rules 22-26 and the precedent set by `2026-06-23-1810-1` (one owner plan for 10 prior findings), all 9 deduped findings are bundled into this single owner plan with phases.

The flagship (OA-18) is a P2-class primary happy-path defect: after every successful pull-to-refresh the body never rebounds — it sticks at the stale damped pull distance on every device. It has escaped the 138-test suite for three audits running because no test asserts geometry (`style.transform`). Closing the data-\*-only test gap is a first-class deliverable, not a side effect.

## Current Baseline

All prior findings (MA-01..MA-25, OA-01..OA-13, NEW-MM-01..06, OA-14..17) are verified resolved in live code (commit `3f2d6132`; 138 tests green, 8 files). Repo tool baseline for the package is clean:

- `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile build` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile lint` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile test` PASS (138 tests, 8 files)
- `check:audit-suspects` / `check:audit-async-failure-paths` / `check:audit-runtime-raw-schema-reads` / `check:oversized-code-files` / `check:workspace-manifest-deps` / `check:audit-styling-suspects`: no actionable mobile hits
- BEM-class grep in `src`: zero hits

Remaining live gaps (the 9 deduped findings this plan owns):

- **OA-18** `pull-refresh.tsx:186-211` + `hooks/use-touch.ts:88-90`: `trackTranslate` is derived from un-gated `pullDistance`; after release/success the root `translateY` sticks at the stale damped pull distance; the `success → normal` transition even jumps further down. Empirically proven by inline-style measurement in the open audit.
- **OA-19 / MM-07** `notice-bar.tsx:61,90-101,131`: `currentIndex` is never reset/clamped when `textList` shrinks; collapsing a multi-text bar to one item while `currentIndex > 0` leaves the bar permanently blank. (Same root, reported by both audits — deduped to one item.)
- **OA-20** `notice-bar.tsx:17,90-101,134-136`: OA-15's independent `CAROUSEL_INTERVAL_MS=3000` timer now truncates each overflowing multi-text item's marquee at ≈25% of its scroll; a direct side-effect of the OA-15 remediation.
- **MM-08** `countdown.tsx:72-76`: `autoStart` sits in the reset effect's dependency array; a runtime toggle of `autoStart` resets `remaining` and clears `finishedRef`, despite `autoStart` being documented as mount-time (`schemas.ts:87`, `countdown/design.md:54`).
- **MM-09** `docs/components/notice-bar/design.md:88`: marquee `duration` formula `(contentWidth / speed) * 1000` ms drifts from the implementation `max(1, ceil((textWidth + 100) / speed))` seconds in three ways (100px buffer; ms vs seconds; clamping).
- **MM-10** `swipe-cell.tsx:199,262-287`: stale "plan 3 scope" comment (plan 3 is closed); no keyboard-open path; open/close state not announced to screen readers.
- **MM-11** `index.ts:13-25`: `useTouch` / `useCountdownTimer` / `formatCountdown` + 6 helper types are on the public `.` entry with zero external consumers (grep-confirmed).
- **MM-12** `infinite-scroll.tsx:71-84`: `onLoadMore` is the only semantic event emitting no `{ type, ... }` payload (the other 5 carry one).
- **MM-13** `hooks/use-touch.ts:58,70,88,92`; `pull-refresh.tsx:118,173`; `infinite-scroll.tsx:71`; `swipe-cell.tsx:91,117,128,152,189`; `countdown.tsx:51`; `notice-bar.tsx:103,110,114`: 14 hand-written `useMemo`/`useCallback` with no `react-compiler` exemption — redundant under the enabled React Compiler.

## Goals

- Make pull-refresh rebound geometry correct on every device (OA-18): the root `translateY` is `0px` at rest after a below-threshold release, after `success → normal`, and after the `onRefresh` reject path.
- Make notice-bar robust to host-driven `text` mutations (OA-19/MM-07) and to overflowing multi-text cadence (OA-20).
- Close the data-\*-only test gap that has produced five geometry/animation findings across three audits: add a durable set of geometry/behavior assertions (`style.transform`, `animationDuration`, advance-vs-scroll timeline, shrink-then-render).
- Resolve the four P3 contract-hygiene findings (MM-08 countdown lifecycle, MM-10 stale comment + a11y honesty, MM-11 public-export freeze, MM-12 event payload consistency).
- Adjudicate MM-13 honestly (profiling-gated memo removal is an optimization candidate, not a blocking defect).

## Non-Goals

- Do NOT redesign `useTouch`'s contract beyond what OA-18 requires (zeroing deltas on touchEnd is an option, not a mandate; the surgical gate is the recommended default).
- Do NOT add a desktop/keyboard-primary interaction model to swipe-cell — `swipe-cell/design.md §1` explicitly transfers the keyboard-equivalent responsibility to the consumer as a product decision. The MM-10 a11y polish is optional and scoped to the stale comment fix + an optional open-state announcement.
- Do NOT retroactively rewrite `docs/architecture/` or completed prior plans.
- Do NOT speculatively delete memoization without profiling evidence (MM-13 is profiling-gated).
- Do NOT expand the public API surface — the drift is toward a leaner `index.ts`, not new exports.

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/pull-refresh.tsx`, `hooks/use-touch.ts` (OA-18)
- `packages/flux-renderers-mobile/src/notice-bar.tsx` (OA-19/MM-07, OA-20)
- `packages/flux-renderers-mobile/src/countdown.tsx` (MM-08)
- `packages/flux-renderers-mobile/src/swipe-cell.tsx` (MM-10)
- `packages/flux-renderers-mobile/src/index.ts` (MM-11)
- `packages/flux-renderers-mobile/src/infinite-scroll.tsx` (MM-12)
- `docs/components/notice-bar/design.md` (MM-09 + OA-20 cadence reconciliation)
- Test files: `pull-refresh.test.tsx`, `notice-bar.test.tsx`, `countdown.test.tsx`, `infinite-scroll.test.tsx`, `__tests__/mobile-markers-contract.test.tsx` (regression proofs)

### Out Of Scope

- The 5 `docs/components/*/design.md` other than `notice-bar/design.md` (no finding touches their current-baseline content; owner-doc consistency is checked at closure, not pre-emptively rewritten).
- `pull-refresh/design.md` (already documents the rebound contract correctly — OA-18 makes code converge to the doc, not vice versa).
- React-Compiler build-output profiling infrastructure (MM-13 needs existing profiling, not new tooling).
- Real-device CDP touch-emulation harness (noted as a non-blocking follow-up by the open audit; happy-dom inline-style assertions are sufficient for closure).

## Failure Paths

| Scenario id                    | Trigger                                                                   | Behavior                                                                                                                  | Retryable                       | User-visible                                       |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `pull-release-no-commit`       | Pull below `threshold`, release                                           | Body rebounds to `translateY(0px)`; `data-status` returns to `normal`; no `onRefresh` dispatched                          | n/a                             | Content returns to rest position                   |
| `pull-refresh-success-rebound` | Pull past threshold, release, `onRefresh` resolves                        | `loading`→`success` (hold at `threshold`)→ after `successDuration`, `normal` + `translateY(0px)` rebound                  | n/a                             | Spinner shows, success text, then content rebounds |
| `pull-refresh-reject-rebound`  | `onRefresh` rejects                                                       | `status`→`normal`; `translateY(0px)`; no spinner lock                                                                     | Host may retry by pulling again | Spinner disappears, content rebounds               |
| `notice-shrink-to-one`         | Host rerenders `text` from `['a','b','c']` (advanced to idx 2) to `['x']` | `currentIndex` clamped to 0; bar renders `'x'` (never blank)                                                              | n/a                             | Single notice shows                                |
| `notice-overflow-multitext`    | Overflowing `text: string[]`, `speed=50`, `scrollWidth≈500`               | Each item dwells for `max(CAROUSEL_INTERVAL_MS, one full marquee cycle)` (item not advanced before its marquee completes) | n/a                             | Each long notice scrolls fully before next         |
| `countdown-autostart-toggle`   | Mount `autoStart:true, time:5000`, tick 2s, rerender `autoStart:false`    | `remaining` NOT reset to 5000; only `started` recomputed                                                                  | n/a                             | Countdown continues from elapsed value             |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**

Rationale: OA-18 is the flagship primary happy-path gesture (the package's whole reason for existing is native-feel rebound geometry). OA-19/MM-07 is a persistent-blank runtime bug. OA-20 is a regression of a previously-remediated behavior. These are core regression paths — the AGENTS.md Test Strategy Tier table mandates must-automate. Per the guide, when the tier is must-automate, the corresponding Proof items precede the Fix items for those core regression findings (Phases 1-3). The lighter P3 contract-verification items in Phase 4 (MM-11/MM-12) add their proofs in-Phase alongside the Fix (the contract surface itself is the thing being verified), and MM-13 is a Decision-only adjudication.

The structural deliverable — a geometry/behavior assertion class (`style.transform`, `animationDuration`, advance-vs-scroll timeline) — is what the open audit's "Overall assessment direction #1" identifies as the durable fix for the defect factory. It is a first-class Exit Criterion of Phase 1.

## Execution Plan

### Phase 1 - Pull-refresh rebound geometry + transform assertion test class (OA-18)

Status: completed
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`, `packages/flux-renderers-mobile/src/hooks/use-touch.ts`, `packages/flux-renderers-mobile/src/__tests__/pull-refresh-geometry.test.tsx` (new) or `pull-refresh.test.tsx`

- Item Types: `Proof` (before Fix, per must-automate), `Fix`, `Decision`

- [x] **Proof**: Add a transform-geometry regression suite that asserts `root.style.transform === 'translateY(0px)'` after: (a) a below-threshold release; (b) a full `loading → success → normal` cycle (using the `successDuration` setTimeout schedule); (c) an `onRefresh` reject. These tests MUST FAIL against current `main` (they encode the OA-18 defect). Reuse the `setTimeout`-spy harness already established by NEW-MM-04 (`pull-refresh.test.tsx:233-290`).
- [x] **Decision**: Choose the fix surface. Recommended (most surgical, mirrors the existing `resolvedStatus` `isTouching` gate at `pull-refresh.tsx:110-116`): gate the resting translate — `const trackTranslate = isBusy ? threshold : (state.isTouching ? pullDistance : 0);`. Alternative (converge with `swipe-cell`): call `touchHandlers.reset()` / `useTouch.reset()` in `handleTouchEnd` + `handleTouchCancel` so `deltaY` is zeroed on lift. Record the chosen option and rationale in the commit/phase evidence.
- [x] **Fix**: Apply the chosen OA-18 fix in `pull-refresh.tsx:186-211` so the resting `'normal'` state yields `trackTranslate === 0`. Verify the indicator-height derivation at `pull-refresh.tsx:231` (`resolvedStatus === 'normal' && pullDistance === 0 ? 0 : trackTranslate`) no longer pops an empty gap at rest.
- [x] **Fix**: If option 2 (reset-on-lift) is chosen, update `hooks/use-touch.ts` only if the `reset()` path is the selected mechanism; do NOT change `onTouchEnd`'s shared contract without confirming `swipe-cell` is unaffected (it already calls `reset()` itself, `swipe-cell.tsx:171`). — N/A: Option 1 (surgical `isTouching` gate) was chosen, so `use-touch.ts` is untouched and `swipe-cell` is unaffected.
- [x] **Proof**: The Phase-1 regression suite now passes (the three `translateY(0px)` assertions hold). Confirm the existing `data-status`/event-count assertions still pass unchanged.

Exit Criteria:

> Phase 1 is the flagship. The Exit Criteria are repo-observable: a reader can open the test file and see the geometry assertions, and can run the package tests to see them pass.

- [x] A regression suite exists that asserts `root.style.transform === 'translateY(0px)'` at rest across the three scenarios (below-threshold release, `success → normal`, reject), and these assertions demonstrably fail without the OA-18 fix.
- [x] `pull-refresh.tsx` resting `'normal'` state computes `trackTranslate === 0` (no stale `pullDistance` fall-through), and the indicator `<div>` height is `0` at rest.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the pull-refresh suite (focused check; full-repo verification is a Closure Gate).

### Phase 2 - Notice-bar carousel/marquee correctness + doc sync (OA-19/MM-07, OA-20, MM-09)

Status: completed
Targets: `packages/flux-renderers-mobile/src/notice-bar.tsx`, `docs/components/notice-bar/design.md`, `packages/flux-renderers-mobile/src/notice-bar.test.tsx`

- Item Types: `Proof` (before Fix), `Fix`, `Decision`

- [x] **Proof (OA-19/MM-07)**: Add a regression test using `view.rerender(...)` that mounts `text:['a','b','c']`, advances the carousel to `currentIndex === 2` (via fake timers), then rerenders `text:['x']`, and asserts the rendered bar text is `'x'` (not `''`). Must fail against current `main`.
- [x] **Fix (OA-19/MM-07)**: Clamp `currentIndex` when `textList` changes — add `React.useEffect(() => { setCurrentIndex((idx) => (idx < textList.length ? idx : 0)); }, [textList.length]);` in `notice-bar.tsx` (anchored near the existing carousel effect `:90-101`). Alternatively derive defensively at read time. Choose one and record rationale. — Chose the effect-based clamp (keeps the read site clean and the `currentIndex` state always valid).
- [x] **Proof (OA-20)**: Add a regression test for an overflowing multi-text bar (`scrollWidth > clientWidth`, two overflowing items, `speed=50`) asserting an item is NOT advanced before one full marquee cycle completes (i.e. before `animationDuration` seconds). Use the existing fake-timer + measured `animationDuration` pattern. Must fail against current `main`.
- [x] **Decision (OA-20)**: Choose the cadence fix. Options (from the open audit): (a) advance on `Math.max(CAROUSEL_INTERVAL_MS, one full marquee cycle)` when `shouldScroll`; (b) keep the independent timer only for the non-overflow case and fall back to `onAnimationIteration` when `shouldScroll === true`; (c) make the timer `animationDuration + CAROUSEL_INTERVAL_MS` when overflowing. Pick the option that preserves OA-15's non-overflow advancement AND fixes overflow truncation. Record rationale. — Chose option (a): matches the `notice-overflow-multitext` Failure Path verbatim, preserves OA-15 non-overflow advancement, and avoids re-coupling to `onAnimationIteration` (b) or over-conservative dwell (c).
- [x] **Fix (OA-20)**: Apply the chosen cadence fix in `notice-bar.tsx:17,90-101` so a non-overflowing multi-text bar still advances (OA-15 preserved) AND an overflowing item is not advanced before its marquee completes.
- [x] **Fix (MM-09)**: Update `docs/components/notice-bar/design.md:88` to match the implementation: `duration = max(1, ceil((textWidth + 100) / speed))` seconds (the `+100px` buffer ensures seamless loop handoff; seconds, not ms; with `Math.max/Math.ceil` clamping). Do NOT "fix" the code toward the old doc formula — the buffer is needed for seamless marquee looping.
- [x] **Fix (doc sync for OA-20)**: Reconcile `notice-bar/design.md` §5/§9 so the dwell-vs-scroll cadence is unambiguous after the OA-20 fix (document whichever cadence rule the chosen option implements). Per Plan Guide Rule 14, write only the final design state, no "Proposed vs Current".

Exit Criteria:

> Owner-doc (`notice-bar/design.md`) genuinely changes here — the MM-09 formula drift and the OA-20 cadence reconciliation are both doc obligations. Per Rule 17 they belong in this Phase's Exit Criteria.

- [x] A rerender test proves `text:['a','b','c'] → ['x']` renders `'x'` (never blank), failing without the OA-19/MM-07 clamp.
- [x] An overflow-multi-text test proves an item is not advanced before one full marquee cycle, failing without the OA-20 cadence fix; the non-overflow advancement (OA-15) is preserved.
- [x] `notice-bar/design.md §5` marquee duration formula matches the implementation (buffer / seconds / clamping); §5/§9 dwell-vs-scroll cadence is unambiguous.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the notice-bar suite (focused check).

### Phase 3 - Countdown autoStart lifecycle split (MM-08)

Status: completed
Targets: `packages/flux-renderers-mobile/src/countdown.tsx`, `packages/flux-renderers-mobile/src/countdown.test.tsx`

- Item Types: `Proof` (before Fix), `Fix`

- [x] **Proof**: Add a test: mount `autoStart:true, time:5000`, tick 2s, then `view.rerender({ autoStart:false })` and back to `autoStart:true`; assert `remaining` is NOT reset to 5000 by the toggle (only `started` should change). Must fail against current `main`.
- [x] **Fix**: Split the effect at `countdown.tsx:72-76` so `time`/`targetTime` changes (via `computeInitialRemaining`) reset `remaining`/`finishedRef`, but `autoStart` changes only `setStarted(autoStart !== false)`. Two narrow effects (or a single effect whose body branches on which dep changed) — the key invariant is "an `autoStart`-only change must not call `setRemaining(computeInitialRemaining())` nor clear `finishedRef`". — Split into two narrow effects: one keyed on `computeInitialRemaining` (resets remaining + finishedRef), one keyed on `autoStart` (setStarted only).
- [x] **Proof**: The new toggle test passes; existing mount-time `autoStart:false` test (`countdown.test.tsx:141-148`) and `reset()/start()` tests (`:311-350`) still pass unchanged.

Exit Criteria:

- [x] A runtime-`autoStart`-toggle test proves `remaining` is preserved across toggles (only `started` recomputes), failing without the effect split.
- [x] `countdown.tsx:72-76` no longer couples an `autoStart`-only change to `setRemaining`/`finishedRef` reset; the `time`/`targetTime` reset path is preserved.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the countdown suite (focused check).

### Phase 4 - Package API-surface, event-payload & a11y-comment hygiene (MM-10, MM-11, MM-12, MM-13)

Status: completed
Targets: `packages/flux-renderers-mobile/src/swipe-cell.tsx`, `index.ts`, `infinite-scroll.tsx`; `__tests__/mobile-markers-contract.test.tsx`; `infinite-scroll.test.tsx`

- Item Types: `Fix`, `Decision`, `Proof`

- [x] **Fix (MM-10 comment)**: Remove/rewrite the stale "Full a11y polish (focus management, announcements) is plan 3 scope." comment at `swipe-cell.tsx:199` (plan 3 is closed). Replace with an accurate note describing the current a11y state (OA-08 `inert` gating is in place; keyboard-open + open-state announcement are consumer-supplied per `swipe-cell/design.md §1`).
- [x] **Decision (MM-10 a11y polish)**: Decide whether to add the optional open-state announcement (`aria-expanded` on the swipe handle / `aria-live` region announcing open-close transitions) and an optional keyboard-open affordance. This is optional under the v1 baseline (mobile-only product; `design.md §1` transfers the keyboard-equivalent responsibility to the consumer). If added, it MUST NOT attach a fake interactive role to the region container (the capture-phase ref handler comment at `swipe-cell.tsx:195-199` documents why). Record the decision; if skipped, leave an honest residual note rather than a stale "future scope" placeholder. — Deferred honestly: no keyboard-open affordance / open-state announcement added (swipe-cell is mobile-only; `design.md §1` transfers keyboard-equivalent responsibility to the consumer; OA-08 `inert` gating is the in-place a11y correctness). The residual note replaces the stale "plan 3 scope" line.
- [x] **Fix (MM-11)**: Drop `useTouch`, `useCountdownTimer`, `formatCountdown` and their helper-type exports (`TouchState`, `TouchDirection`, `UseTouchOptions`, `UseTouchReturn`, `CountdownTimerOptions`, `CountdownTimerResult`) from `index.ts:13-25`. Keep only the five renderer components, `mobileRendererDefinitions`/`MobileRendererSchema`, `registerMobileRenderers`, and the schema types. `useCountdownTimer` is also re-exported at `countdown.tsx:195` — remove that re-export too (it remains an in-package function). Grep-confirm zero external consumers remain affected. — `useCountdownTimer` kept in-package via `export function` at its declaration (matches the `formatCountdown` pattern); the standalone `export { useCountdownTimer }` re-export removed. Workspace-wide grep confirmed zero external consumers (the package is not yet wired into any app).
- [x] **Proof (MM-11)**: `__tests__/mobile-markers-contract.test.tsx` (or a new surface test) asserts the public `.` entry exports exactly the expected set (5 renderers + definitions + registerer + schema types) and NOT the dropped helpers. `pnpm typecheck` confirms no external package references the dropped symbols (workspace-wide).
- [x] **Fix (MM-12)**: In `infinite-scroll.tsx:71-84` (`fireLoadMore`), emit `{ type: 'loadmore' }` to align with the package's other 5 semantic events (`onRefresh {type:'refresh'}`, `onOpen/onClose/onAction`, `onFinish {type:'finish'}`). Optionally include `source: 'intersection' | 'immediate' | 'retry'` if source discrimination has product value (Decision). Update the `onLoadMoreRef.current?.()` call accordingly. — Included `source` (low-cost threading from all 3 call sites; distinguishes auto-paginate from user retry).
- [x] **Proof (MM-12)**: Add an `infinite-scroll.test.tsx` assertion that the `onLoadMore` handler receives a payload with `type === 'loadmore'` (and `source`, if added).
- [x] **Decision (MM-13)**: Adjudicate the 14 hand-written `useMemo`/`useCallback`. Per the audit and `docs/skills/react19-best-practices-review.md`, removal is profiling-gated ("do not remove without profiling evidence the compiler has taken over that boundary"). Record the adjudication in `Deferred But Adjudicated` (optimization candidate) — see that section. Do NOT speculatively delete in this plan. — Adjudicated into `Deferred But Adjudicated` (profiling-gated optimization candidate); no speculative deletion.

Exit Criteria:

> No `docs/architecture/` or `docs/components/` owner-doc is changed by MM-11/MM-12/MM-13 (they are source/API-surface). MM-10 only changes a code comment (and optionally adds a11y attributes). Per Rule 17, no boilerplate "No owner-doc update required" items are added.

- [x] `swipe-cell.tsx:199` stale "plan 3 scope" comment is gone, replaced by an accurate a11y-state note; the MM-10 a11y Decision is recorded (added or honestly deferred).
- [x] `index.ts` no longer exports `useTouch`/`useCountdownTimer`/`formatCountdown` and their helper types; a surface test asserts the exact public export set; `pnpm typecheck` passes workspace-wide.
- [x] `infinite-scroll.tsx` `onLoadMore` emits `{ type: 'loadmore', ... }`; the payload test passes.
- [x] MM-13 is adjudicated into `Deferred But Adjudicated` with a profiling-gated justification (no speculative deletion).

## Draft Review Record

> Reviewed by an independent sub-agent (fresh session, not the authoring session) per the Plan Review Rule.

- Reviewer / Agent: independent general sub-agent, fresh session (task `ses_10b84571cffe4MdLoQeIZN1qQi`)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor (addressed): Test Strategy sentence claimed "Proof precedes Fix in each Phase" but Phase 4 listed MM-11/MM-12 Fix before Proof — amended the scoping sentence so Proof-before-Fix applies to the core regression findings (Phases 1-3), while the Phase-4 P3 contract items add proofs in-Phase.
  - Reviewer re-verified all 30+ cited file:line references against the live repo (all accurate); confirmed OA-18 fix formula closes all three scenarios; confirmed MM-11 zero-consumer claim via workspace-wide grep; confirmed no finding dropped and no in-scope defect hidden in Deferred; confirmed single-owner-plan bundling is justified per Rules 22-26 and the `2026-06-23-1810-1` precedent.

## Closure Gates

> Full-repo verification runs once here (Plan Guide Rule 18). The Phase Exit Criteria above carry only focused per-package checks. Owner-doc consistency is checked here per Rule 17 / When-Closing step 4.

- [x] OA-18: pull-refresh `translateY(0px)` at rest across the three scenarios, with regression suite that fails without the fix.
- [x] OA-19/MM-07: notice-bar `currentIndex` clamps on `textList` shrink; rerender test passes.
- [x] OA-20: overflowing multi-text item not advanced before its marquee completes; non-overflow advancement (OA-15) preserved.
- [x] MM-08: `autoStart` runtime toggle does not reset `remaining`/`finishedRef`; toggle test passes.
- [x] MM-09: `notice-bar/design.md §5` marquee duration formula matches the implementation.
- [x] MM-10: stale "plan 3 scope" comment removed; MM-10 a11y Decision recorded honestly.
- [x] MM-11: `index.ts` no longer exports zero-consumer helpers; surface test + workspace typecheck confirm.
- [x] MM-12: `onLoadMore` emits `{ type: 'loadmore', ... }`; payload test passes.
- [x] MM-13: adjudicated into `Deferred But Adjudicated` (profiling-gated; not silently dropped).
- [x] No in-scope confirmed live defect or contract drift is silently degraded to deferred/follow-up (OA-18/OA-19/OA-20 are runtime/geometry defects — they are Fixed, not deferred).
- [x] Owner-doc consistency: `notice-bar/design.md` reflects the OA-20 cadence + MM-09 formula; other design docs unchanged (no drift introduced).
- [x] Closure-audit completed by an independent sub-agent (fresh session) with evidence recorded; the execution session did not self-audit this gate.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### MM-13 — redundant hand-written `useMemo`/`useCallback` under React Compiler

- Classification: `optimization candidate`
- Why Not Blocking Closure: The 14 sites are correctness-neutral and have no proven perf regression (the touch re-render cadence is driven by `state.deltaY/deltaX`, not callback identity). `docs/skills/react19-best-practices-review.md` explicitly states "do not treat removing redundant memo as a high-priority refactor task" and "do not remove existing useMemo/useCallback without profiling evidence the compiler has taken over that boundary". No profiling evidence exists yet. This is a style/readability convergence, not a live defect or contract drift — it does not affect the v1 supported baseline.
- Successor Required: `yes`
- Successor Path: a future React-Compiler-profiling-driven cleanup plan (after build-output profiling confirms the compiler has taken over each of the 14 boundaries). The successor should also consider whether `use-touch.ts:96-100`'s per-render `touchHandlers` wrapper is stabilized by the compiler (the audit notes this is largely moot under the enabled compiler).

## Non-Blocking Follow-ups

- Real-device CDP touch-emulation + `getComputedStyle(root).transform` pass on the playground mobile page (the open audit's "best next切入点") — would promote OA-18/OA-20 to device-confirmed and could surface transition-timing interactions invisible to happy-dom. Not blocking: the happy-dom inline-style math is deterministic and sufficient for closure.
- Optional: document all 5 mobile semantic event payload shapes (`refresh`/`loadmore`/`open`/`close`/`action`/`finish`) in each renderer's `design.md` Events section so action authors have a contract reference. Not blocking: the payloads are now consistent after MM-12.
- Optional: a "host rerender with mutated props" test harness for the package (the open audit's blind-spot direction #3) to catch the OA-16/OA-19 class in one shot. Not blocking: per-finding regression tests cover the known instances.

## Closure

Status Note: All 9 retained 18:24 re-audit findings are resolved. OA-18 (pull-refresh rebound geometry) is fixed by gating the resting translate on `isTouching`, and the data-\*-only test gap that hid it across three audits is closed by a first-class geometry/behavior assertion class (`__tests__/pull-refresh-geometry.test.tsx`, asserting inline `style.transform`/`animationDuration`). OA-19/MM-07 (notice-bar shrink-to-blank) is fixed by a `currentIndex` clamp effect. OA-20 (overflow marquee truncation, an OA-15 side-effect) is fixed by overflow-aware dwell (`max(CAROUSEL_INTERVAL_MS, one full marquee cycle)`) with OA-15 non-overflow advancement preserved. MM-08 (countdown `autoStart` lifecycle) is fixed by splitting the effect. MM-09/OA-20 doc drift in `notice-bar/design.md` is reconciled. The four P3 contract-hygiene items (MM-10 comment+decision, MM-11 public-export freeze, MM-12 event-payload consistency) are resolved, and MM-13 is honestly adjudicated as a profiling-gated optimization candidate (no speculative memo deletion).

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent, fresh session (task `ses_10af06127ffeH6ktJfkxMm8xOk` — not the execution session)
- Verdict: `PASS`
- Evidence: All 9 findings independently re-verified RESOLVED against live code; full mobile suite = 147 tests / 9 files green (138 baseline + 9 new proofs); workspace `pnpm typecheck` 51/51, `pnpm build` 27/27, `pnpm lint` 27/27, `pnpm test` 51/51; no stray build artifacts in `src/`; only `notice-bar/design.md` changed among owner-docs (no drift). No gaps found.

Follow-up:

- MM-13 successor (profiling-gated memo cleanup) — see `Deferred But Adjudicated`.
- Real-device CDP geometry pass + optional payload-doc/harness items — see `Non-Blocking Follow-ups`.
