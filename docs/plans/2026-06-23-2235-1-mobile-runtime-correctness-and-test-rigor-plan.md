# Mobile Runtime Correctness And Test Rigor Plan

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/audits/2026-06-23-1824-multi-audit-mobile.md` (MM-14..MM-16, MM-22..MM-25), `docs/audits/2026-06-23-1824-open-audit-mobile.md` (OA-21, OA-22)
> Related: `docs/plans/2026-06-23-2031-1-mobile-reaudit-2-remediation-owner-plan.md` (sibling — covers MM-07..MM-13 + OA-18..OA-20; same package, independent closure surface)
> Execution Order: {1}

## Purpose

Close every **runtime correctness + missing-test** finding from the 2026-06-23 18:24 mobile re-audit that is NOT already owned by sibling plan `2026-06-23-2031-1`. The flagship is **MM-14 / OA-21**: the documented primary countdown use case (秒杀/flash-sale, `targetTime` or `time` mode) silently breaks under `paused` toggle and under real-browser `setInterval` throttling — exactly the class of bug the package's value proposition (native-feel gesture + accurate time) cannot tolerate, and exactly the class the 138-test suite has missed for four audits running because no test asserts geometry (`style.transform`) or simulates an imprecise timer.

This plan also closes the structural test gap identified by the open audit's "Overall assessment direction #1": the data-\*-only / ideal-timer-only test contract is a defect factory. The durable fix is a one-time set of behavior assertions — throttled-tick countdown test, StrictMode dispatch tests, direction-branch coverage, and disabled-state retry-button coverage — so the next audit does not find a fifth instance of the same disease.

## Current Baseline

Sibling plan `2026-06-23-2031-1` is `active` but has **not yet landed** (no `feat` commit; latest commit is `6f51640b docs(mobile)`). Both 18:24 audits re-verified the package is otherwise clean:

- `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile build` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile lint` PASS
- `pnpm --filter @nop-chaos/flux-renderers-mobile test` PASS (138 tests, 8 files)
- `check:audit-suspects` / `check:audit-async-failure-paths` / `check:audit-runtime-raw-schema-reads` / `check:oversized-code-files` / `check:workspace-manifest-deps` / `check:audit-styling-suspects`: no actionable mobile hits
- BEM-class grep in `src`: zero hits

Remaining live gaps this plan owns (9 deduped findings — MM-22 and OA-21 share one countdown code path + one design.md section, so they collapse to one phase-level work item):

- **MM-14 (P2)** `countdown.tsx:91-116` tick body: in `targetTime` mode the effect clears the interval while `paused`, but `Date.now()` keeps advancing; on resume the first tick recomputes `targetTime - Date.now()` and swallows the entire pause window (e.g. `targetTime=now+60s`, pause 10s, resume → display jumps 60→50). `design.md:97` explicitly promises "paused → 暂停计时器, false → 恢复".
- **OA-21 (with MM-22)** `countdown.tsx:100-112` + `docs/components/countdown/design.md:94-100,147`: the `time`-branch tick is purely subtractive (`prev - interval`), which is correct **only if `setInterval` fires exactly every `interval` ms**. Real browsers throttle background `setInterval` to ≥1000ms then to once-per-minute; foreground 30ms ticks drift by event-loop jitter. The doc's `design.md:99` prescribes `time - elapsed` (wall-clock) and `design.md:96` promises "`setInterval` + `requestAnimationFrame` 补偿" — the code implements neither, and `design.md:147` honestly defers rAF as future, contradicting §6.
- **MM-15** `notice-bar.tsx:60,90-101,123-125`: `visible` is neither in the carousel effect's dep array nor checked in its body. After `handleClose` sets `visible=false` the component returns null but the pending 3s `setTimeout` still fires → `setCurrentIndex` → re-render → reschedule → indefinite 3s re-render loop while hidden.
- **MM-16** `infinite-scroll.tsx:59-62,118-126`: effects run in declaration order with no cleanup. Under React 19 StrictMode (setup→cleanup→setup) the `[loading,error]` reset effect re-runs on the second setup and clears `isLoadingRef.current=false` **before** the `immediateCheck` effect re-runs, which then sees the guard clear and dispatches `onLoadMore` a second time. Both dispatches land before the host `loading` prop can dedupe. The infinite-scroll test wrapper is **not** wrapped in `<React.StrictMode>`, so this is invisible to the 138-test suite.
- **MM-23** `countdown.test.tsx` + `infinite-scroll.test.tsx`: both files have **zero** `StrictMode` matches, unlike `pull-refresh.test.tsx:292-311` and `swipe-cell.test.tsx:247-261` which verify their MA-02/MA-13 dispatch-defense patterns. This gap is exactly what lets MM-16 escape the suite.
- **MM-24** `notice-bar.test.tsx` vs `notice-bar.tsx:36,132,183`: `direction: 'right'` produces `animationDirection: 'normal'` — a distinct branch with zero test coverage (the marquee test omits `animationDirection`).
- **OA-22** `notice-bar.tsx:36,132` + keyframe `styles.css:15-22` + `notice-bar/design.md:26,52`: `direction: 'left'` (the default) maps to `animation-direction: 'reverse'`, which plays the keyframe backwards → text moves **left-to-right**. An author setting `direction: 'left'` expecting conventional leftward motion (Vant's default, generic CSS marquee convention) silently gets the inverse. Code matches doc (`design.md:26` "默认左→右"), so this is a **design-level naming smell**, not an impl bug.
- **MM-25** `infinite-scroll.tsx:128-133,182-195`: with `disabled:true && error:true` the retry `<Button>` renders fully enabled (no `disabled`/`aria-disabled`) but clicking it calls `triggerLoadMore()` which silently `return`s on the `disabled` guard — a dead-button UX. No test combines `disabled` + `error`.

## Goals

- Make `targetTime` countdown pause/resume correct (MM-14): after pause + wall-clock advance + resume, the displayed value is unchanged (no forward jump).
- Make `time` countdown wall-clock-accurate (OA-21): under throttled `setInterval` (background tab / event-loop jitter) the displayed remaining converges to the true elapsed time, matching `targetTime` branch accuracy and `design.md:99`'s `time - elapsed` formula.
- Reconcile `countdown/design.md §6` with whichever mechanism ships (OA-21/MM-22): either implement the documented `requestAnimationFrame` compensation, or correct §6 to honestly state "`setInterval` only; rAF compensation deferred (§11)" — ending the §6↔§11↔code three-way disagreement.
- Stop the notice-bar carousel timer from churning after close (MM-15): no `setCurrentIndex` re-render after `visible=false`.
- Make `infinite-scroll`'s in-flight guard robust to React 19 StrictMode / remount (MM-16): `onLoadMore` fires exactly once per mount cycle.
- Add the missing behavior test class the open audit identifies as the durable fix (MM-23, MM-24, MM-25): StrictMode dispatch tests for countdown + infinite-scroll; `direction:'right'` branch coverage; disabled+error retry-button coverage.
- Resolve the `direction` naming smell honestly (OA-22): either rename the values to match intuition, or lock the current mapping with a test + a doc clarification — record the Decision.

## Non-Goals

- Do NOT touch findings owned by sibling `2026-06-23-2031-1` (MM-07..MM-13, OA-18..OA-20) — they have their own closure surface and active plan.
- Do NOT redesign `useCountdownTimer`'s hook contract beyond what MM-14/OA-21 require (the reset/start shape from OA-13 stays; only the tick derivation changes).
- Do NOT change the CSS keyframe direction (`styles.css:15-22`) unless the OA-22 Decision selects the "swap the mapping" option — the keyframe's `from { translateX(100%) } to { translateX(-100%) }` is the conventional right-to-left marquee and is correct.
- Do NOT add a real-device CDP touch-emulation harness (noted as a non-blocking follow-up by the open audit; happy-dom inline-style + fake-timer assertions are sufficient for closure of these findings).
- Do NOT speculatively remove hand-written memo (MM-13 is owned by sibling 2031-1 as a profiling-gated Decision).
- Do NOT touch `countdown.tsx:72-76` (the `autoStart` reset effect — owned by sibling 2031-1 Phase 3 / MM-08). This plan's Phase 1 touches only `countdown.tsx:91-116` (the tick body) and the reset/start paths needed for the wall-clock rebase. Both plans share `Execution Order: {1}` and edit distinct regions of the same file; coordinate landing order to avoid merge conflicts (recommend landing 2031-1's MM-08 split first since it is a smaller, more contained change).

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/countdown.tsx` (MM-14, OA-21/MM-22 tick derivation)
- `packages/flux-renderers-mobile/src/notice-bar.tsx` (MM-15 carousel timer lifecycle; OA-22/MM-24 direction)
- `packages/flux-renderers-mobile/src/infinite-scroll.tsx` (MM-16 guard robustness; MM-25 retry button)
- `docs/components/countdown/design.md` (OA-21/MM-22 §6 reconciliation)
- `docs/components/notice-bar/design.md` (OA-22 direction decision record, if rename/clarify selected)
- Test files: `countdown.test.tsx`, `notice-bar.test.tsx`, `infinite-scroll.test.tsx` (regression + StrictMode + branch proofs)

### Out Of Scope

- The 5 `docs/components/*/design.md` files addressed by sibling `docs/plans/2026-06-23-2235-2-mobile-design-doc-reconciliation-plan.md` (MM-17, MM-18, MM-19, MM-20, MM-21) — different closure surface (doc-code drift across multiple components).
- `pull-refresh.tsx` geometry (OA-18 — sibling 2031-1).
- `swipe-cell.tsx` (MM-10 stale comment — sibling 2031-1).
- `index.ts` export trimming (MM-11 — sibling 2031-1).

## Failure Paths

| Scenario id                                  | Trigger                                                                               | Behavior                                                                                                  | Retryable                       | User-visible                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `countdown-target-pause-resume`              | `targetTime=now+60s`, run 10s, `paused:true`, advance wall-clock 10s, `paused:false`  | Displayed remaining unchanged across the pause window (no 60→50 jump); tick resumes from the paused value | n/a                             | Countdown holds then continues smoothly                 |
| `countdown-time-throttled-tab`               | `time=60000, millisecond:false`, background tab for 30s wall-clock (1 tick delivered) | Displayed remaining ≈ 30000 (wall-clock accurate), not 59970 (subtractive drift)                          | n/a                             | Backgrounded countdown stays accurate                   |
| `countdown-finish-exactly-once-strictmode`   | Mount under `<React.StrictMode>`, `time` reaches 0                                    | `onFinish` dispatched exactly once (finishedRef holds across the StrictMode double-invoke)                | n/a                             | Single finish event                                     |
| `notice-close-no-churn`                      | Multi-text bar, close it, advance fake timers 6s                                      | Zero `setCurrentIndex` re-renders after `visible=false`; no pending timer                                 | n/a                             | Closed bar stays dormant (until host unmounts/remounts) |
| `infinite-scroll-strictmode-single-dispatch` | Mount under `<React.StrictMode>`, `immediateCheck:true`                               | `onLoadMore` called exactly once on mount                                                                 | Host may retry via retry button | Single initial load                                     |
| `infinite-scroll-disabled-error-retry`       | `disabled:true, error:true`, user taps retry `<Button>`                               | Button is `disabled` (or hidden); no silent no-op click                                                   | n/a                             | Disabled control is visibly disabled                    |
| `notice-direction-right`                     | `direction:'right'`, overflowing text                                                 | `animationDirection === 'normal'` (locked by test regardless of OA-22 decision)                           | n/a                             | Right-to-left marquee motion                            |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**

Rationale: MM-14 (P2) and OA-21 are correctness defects in the documented primary use case (秒杀 countdown) — the package's whole reason for existing is native-feel gesture AND accurate time display. MM-16 (StrictMode double-dispatch) and MM-25 (disabled dead-button) are core regression paths (React 19 baseline + WCAG 4.1.2 operability). Per the AGENTS.md Test Strategy Tier table, these mandate must-automate. Per the Plan Guide, when the tier is must-automate, the corresponding Proof items precede the Fix items (Phases 1, 3 — including MM-25). The Phase-4 direction item is P3 contract-verification and adds its proof in-Phase alongside the Fix.

The structural deliverable — a throttled-timer countdown test + StrictMode dispatch tests + branch coverage — is what the open audit's "Overall assessment direction #1" identifies as the durable fix for the defect factory. It is a first-class Exit Criterion of Phases 1 and 3.

## Execution Plan

### Phase 1 - Countdown wall-clock correctness + §6 doc reconciliation (MM-14, OA-21, MM-22)

Status: completed
Targets: `packages/flux-renderers-mobile/src/countdown.tsx`, `docs/components/countdown/design.md`, `packages/flux-renderers-mobile/src/countdown.test.tsx`

- Item Types: `Proof` (before Fix, per must-automate), `Fix`, `Decision`

- [x] **Proof (MM-14)**: Add a regression test — mount `targetTime = Date.now() + 60_000`, advance fake timers 10s, set `paused:true`, advance fake timers another 10s (simulating wall-clock passage during pause), set `paused:false`, run one tick; assert `remaining` is unchanged across the pause window (no 60→50 jump). Must FAIL against current `main`.
- [x] **Proof (OA-21)**: Add a regression test that simulates a throttled `setInterval` — mount `time: 60_000, millisecond: false`, mock `Date.now` so that 30s of wall-clock pass with only ONE 1000ms tick actually delivered (background-tab throttle); assert `remaining ≈ 30_000` (wall-clock accurate), NOT `≈ 59_000` (subtractive drift). Must FAIL against current `main`. (The existing `vi.advanceTimersByTime(30)` test fires exactly one precise tick and asserts the ideal subtractive math — it stays as a happy-path check; the new test closes the ideal-timer blind spot.)
- [x] **Decision**: Choose the unification strategy. Recommended (converges both branches, matches `design.md:99`): introduce a `startTimestampRef` + `initialRemainingRef` captured on start/resume/reset; BOTH branches compute `remaining = Math.max(0, initialRemaining - (Date.now() - startTimestamp))`. For `targetTime` this is algebraically equivalent to the current `targetTime - Date.now()` (set `initialRemaining = targetTime - startTimestamp`); for `time` it replaces the subtractive `prev - interval` with wall-clock elapsed. For MM-14's pause: on a `paused:true` transition capture `remainingAtPause`; on resume rebase `startTimestamp = Date.now() - (initialRemaining - remainingAtPause)` so the next tick continues from the paused value. Record the chosen strategy in the commit evidence.
- [x] **Fix (MM-14 + OA-21 code)**: Apply the chosen strategy in `countdown.tsx:91-116` (tick body) + the reset/start/reset-on-pause paths. Preserve MA-16's `Math.max(0, …)` clamp and OA-13's `reset()` contract (`remaining` returns to initial + `started=false`). The `finishedRef` MA-02 finish-dispatch effect (`:83-89`) is unchanged.
- [x] **Decision (MM-22 doc)**: Decide rAF fate. Option A (honest-doc, recommended — code already drift-free after the wall-clock fix): correct `countdown/design.md §6:96` to "使用 `setInterval` 驱动（wall-clock 派生，毫秒精度模式仍用 30ms `setInterval`；`requestAnimationFrame` 补偿为后续优化，见 §11）" and reconcile `:99` to "`剩余时间 = max(0, initialRemaining - (Date.now() - startTimestamp))`（`targetTime` 与 `time` 两支统一为 wall-clock 派生）"; remove the §6↔§11 contradiction. Option B (implement rAF): add a `requestAnimationFrame`-driven 30ms interpolation layer for millisecond mode. Default to Option A unless profiling shows the 30ms `setInterval` produces visible stutter; record the Decision.
- [x] **Fix (MM-22 doc)**: Apply the chosen doc edit to `countdown/design.md §6` (and §8 `:128` "快速切换 `paused` 正确恢复，不丢失已过时间" — keep, now genuinely true after the MM-14 fix). Per Plan Guide Rule 14, write only the final design state, no "Proposed vs Current".
- [x] **Proof**: Both Phase-1 regression tests now pass; the existing happy-path tick-granularity test (`countdown.test.tsx:199-220`) and finish/`reset()`/`start()` tests still pass unchanged.

Exit Criteria:

> Owner-doc (`countdown/design.md §6`) genuinely changes here — the MM-22 doc reconciliation is a doc obligation. Per Rule 17 it belongs in this Phase's Exit Criteria.

- [x] A `targetTime` pause/resume regression test proves the displayed value is unchanged across the pause window, failing without the MM-14 fix.
- [x] A throttled-tick `time`-mode regression test proves wall-clock accuracy (≈30s drop for 30s wall-clock with 1 tick), failing without the OA-21 fix.
- [x] `countdown.tsx:91-116` derives `remaining` from wall-clock elapsed in both branches; `targetTime` and `time` modes are equally drift-proof; pause/resume preserves the displayed value.
- [x] `countdown/design.md §6` no longer promises rAF compensation the code lacks, and `:99` matches the wall-clock derivation; §6↔§11 no longer contradict.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the countdown suite (focused check; full-repo verification is a Closure Gate).

### Phase 2 - Notice-bar carousel timer lifecycle after close (MM-15)

Status: completed
Targets: `packages/flux-renderers-mobile/src/notice-bar.tsx`, `packages/flux-renderers-mobile/src/notice-bar.test.tsx`

- Item Types: `Proof` (before Fix), `Fix`

- [x] **Proof**: Add a regression test — mount a multi-text bar (`text: ['a','b','c']`, `closable: true`), advance fake timers to put a carousel `setTimeout` in flight, click close, advance fake timers 6s (two carousel intervals); assert zero `setCurrentIndex`-driven re-renders after `visible=false` (e.g. spy on a render-driven `data-slot="notice-bar-text"` text mutation, or assert the pending-timer count is 0). Must FAIL against current `main`.
- [x] **Fix**: In `notice-bar.tsx:90-101` add `if (!visible) return;` at the top of the carousel effect body AND include `visible` in the dep array: `}, [textList.length, currentIndex, loop, visible]);`. Verify the early-return ordering stays AFTER all hooks (the existing `if (!visible) return null;` at `:123-125` stays where it is — the new guard is inside the effect, not a render-time early return).

Exit Criteria:

- [x] A close-and-advance regression test proves no carousel re-render fires after `visible=false`, failing without the `visible` dep + guard.
- [x] `notice-bar.tsx:90-101` carousel effect early-returns when `!visible` and lists `visible` in its dep array.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the notice-bar suite (focused check).

### Phase 3 - Infinite-scroll StrictMode correctness + missing StrictMode/branch tests (MM-16, MM-23, MM-25)

Status: completed
Targets: `packages/flux-renderers-mobile/src/infinite-scroll.tsx`, `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx`, `packages/flux-renderers-mobile/src/countdown.test.tsx`

- Item Types: `Proof` (before Fix for MM-16), `Fix`, `Decision`

- [x] **Proof (MM-16)**: Add a regression test — mount `infinite-scroll` with `immediateCheck: true` wrapped in `<React.StrictMode>`; assert `onLoadMore` is called **exactly once** on mount. Must FAIL against current `main` (it will fire twice today).
- [x] **Decision (MM-16 fix surface)**: Choose the guard-robustness strategy. Recommended (most faithful to MA-13's "release on actual change" intent): track previous `loading`/`error` values via a ref and only reset `isLoadingRef.current = false` when one of them actually changed since the last setup — not on every effect invocation. Alternative: move the in-flight guard reset into the same effect that consumes it (collapse the two effects). Record the chosen strategy.
- [x] **Fix (MM-16)**: Apply the chosen strategy in `infinite-scroll.tsx:59-62` (and/or `:118-126`) so a StrictMode double-setup does not clear the guard before the `immediateCheck` effect re-runs. Preserve OA-16's contract (host clearing `error` releases the guard) and MA-13's observer-vs-immediateCheck dedupe within a single mount.
- [x] **Proof (MM-16)**: The StrictMode test now passes (`onLoadMore` once on mount); the existing MA-13 observer-vs-immediateCheck test and OA-16 error-clear-retry test still pass.
- [x] **Proof (MM-23 countdown)**: Add a `<React.StrictMode>` test for countdown asserting `onFinish` fires exactly once when `time` reaches 0 (mirrors `pull-refresh.test.tsx:292-311` / `swipe-cell.test.tsx:247-261`). Should PASS today (MA-02's effect-based dispatch + `finishedRef` already handles StrictMode) — this is coverage hardening, not a regression proof.
- [x] **Proof (MM-25)**: Add a test combining `disabled: true` + `error: true` asserting the retry `<Button>` is disabled (or hidden). Must FAIL against current `main`.
- [x] **Fix (MM-25)**: In `infinite-scroll.tsx:182-195`, forward `disabled={disabled}` to the retry `<Button>` (or hide the retry row entirely when `disabled && status === 'error'`, per Decision). Recommended: forward `disabled` so the WCAG 4.1.2 operability signal is honest.

Exit Criteria:

- [x] A StrictMode regression test proves `infinite-scroll` `onLoadMore` fires exactly once on mount, failing without the MM-16 fix.
- [x] A countdown StrictMode test asserts `onFinish` fires exactly once (coverage hardening for MA-02).
- [x] A `disabled + error` test proves the retry `<Button>` is disabled or hidden, failing without the MM-25 fix.
- [x] `infinite-scroll.tsx:59-62,118-126` guard is robust to StrictMode/remount; MA-13 and OA-16 contracts preserved.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the infinite-scroll + countdown suites (focused check).

### Phase 4 - Notice-bar direction branch coverage + naming smell decision (MM-24, OA-22)

Status: completed
Targets: `packages/flux-renderers-mobile/src/notice-bar.test.tsx`, `packages/flux-renderers-mobile/src/notice-bar.tsx`, `packages/flux-renderers-mobile/src/schemas.ts`, `docs/components/notice-bar/design.md`

- Item Types: `Decision`, `Proof`, `Fix`

- [x] **Decision (OA-22)**: Decide the direction-prop semantics. Options:
  - (A) **Lock current mapping + clarify doc** (lowest churn, code already matches doc intent): keep `direction: 'left'` → `animationDirection: 'reverse'` → left-to-right motion; rewrite `design.md:26,52` to make the semantics explicit ("`direction: 'left'` 表示文本从左向右滚动（默认）；`direction: 'right'` 表示从右向左滚动" — i.e. the value names the **motion direction**, not the keyframe direction). Add a one-line code comment at `notice-bar.tsx:132` documenting the inversion vs the keyframe.
  - (B) **Swap the mapping** so `direction: 'left'` → conventional leftward motion (`animationDirection: 'normal'`): swap the ternary at `notice-bar.tsx:132`; update `design.md:26` decision-table note. Risk: silent behavior change for any existing schema that sets `direction: 'right'` (none in-repo per grep, but the schema value is public).
  - (C) **Rename the values** to `'toward-left'`/`'toward-right'` (or `'ltr'`/`'rtl'`): cleanest semantics, but a public-schema rename — defer unless the team explicitly wants v1 API churn.
  - Default recommendation: **(A)** — the inversion is documented, the public schema is stable, and the smell is resolved by making the semantics unambiguous. Record the Decision; if (B) or (C) is chosen, escalate as a schema-change gate.
- [x] **Proof (MM-24)**: Extend the marquee test to cover BOTH branches — assert `animationDirection === 'normal'` for `direction: 'right'` AND `animationDirection === 'reverse'` for `direction: 'left'` (and the default). If Decision (B) was chosen, invert the expected values. Lock the chosen mapping regardless of Decision outcome.
- [x] **Fix (OA-22 doc)**: Apply the chosen doc edit to `notice-bar/design.md:26,52` (and §5 if it references direction). Per Rule 14, write only the final design state.

Exit Criteria:

> Owner-doc (`notice-bar/design.md`) changes here only if Decision (A)/(B)/(C) requires a doc edit. Per Rule 17 the doc obligation is listed only because it is genuine.

- [x] The marquee test asserts `animationDirection` for both `direction: 'right'` (`'normal'` or swapped per Decision) and `direction: 'left'`/default, locking the chosen mapping.
- [x] The OA-22 Decision is recorded; if (A)/(B)/(C) changed doc or code, `notice-bar/design.md` (and `notice-bar.tsx:132` / `schemas.ts` if renamed) reflects the final semantics with no "Proposed vs Current" residual.
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the notice-bar suite (focused check).

## Draft Review Record

> Reviewed by an independent sub-agent (fresh session, not the authoring session) per the Plan Review Rule.

- Reviewer / Agent: independent general sub-agent, fresh session (task `ses_10b1309f2ffe3G1Sb6hf6wYWZ4`)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor (addressed): "Plan 2" reference in Out-of-Scope lacked a file path → added `docs/plans/2026-06-23-2235-2-mobile-design-doc-reconciliation-plan.md`.
  - Minor (addressed): MM-25 Fix was listed before its regression Proof → reordered Proof-before-Fix for stricter must-automate discipline; Test Strategy rationale updated to reflect MM-25 is now Proof-before-Fix.
  - Minor (addressed): Both this plan (Phase 1, `countdown.tsx:91-116`) and sibling 2031-1 (Phase 3, `countdown.tsx:72-76`) edit `countdown.tsx` — added an explicit Non-Goals coordination note (distinct regions; recommend landing 2031-1's MM-08 first).
  - Reviewer re-verified every cited `file:line` against the live repo (countdown.tsx tick body + reset effect + finishedRef effect; notice-bar.tsx carousel effect + direction mapping + visible early-return; infinite-scroll.tsx guard reset + immediateCheck + triggerLoadMore + retry Button; styles.css keyframe; countdown/notice-bar design.md sections; countdown.test.tsx 30ms granularity test; notice-bar.test.tsx missing animationDirection assertion; pull-refresh/swipe-cell StrictMode tests). All accurate.
  - Reviewer confirmed the wall-clock unification algebra (targetTime equivalence + pause rebase) verifies out, and the OA-21 throttled-timer test is feasible via `vi.spyOn(Date)` decoupled from the faked `setInterval` queue.
  - Reviewer confirmed zero Blockers, zero Majors, zero scope overlap with sibling 2031-1 (MM-07..13, OA-18..20, MM-09/OA-23 all excluded).

## Closure Gates

> Full-repo verification runs once here (Plan Guide Rule 18). Phase Exit Criteria carry only focused per-package checks. Owner-doc consistency is checked here per Rule 17 / When-Closing step 4.

- [x] MM-14: `targetTime` pause/resume preserves the displayed value; regression test fails without the fix.
- [x] OA-21: `time` mode is wall-clock accurate under throttled `setInterval`; throttled-tick regression test fails without the fix.
- [x] MM-22: `countdown/design.md §6` no longer promises rAF compensation the code lacks; §6↔§11 reconciled.
- [x] MM-15: notice-bar carousel timer does not churn after close; close-and-advance test fails without the fix.
- [x] MM-16: `infinite-scroll` `onLoadMore` fires exactly once under StrictMode; regression test fails without the fix.
- [x] MM-23: countdown + infinite-scroll have StrictMode dispatch tests (countdown hardening; infinite-scroll regression).
- [x] MM-24: marquee test locks `animationDirection` for both direction branches.
- [x] MM-25: retry `<Button>` is disabled/hidden under `disabled + error`; regression test fails without the fix.
- [x] OA-22: direction naming Decision recorded; doc/code reflect the final semantics.
- [x] No in-scope confirmed live defect or contract drift is silently degraded to deferred/follow-up (MM-14/OA-21/MM-15/MM-16/MM-25 are runtime defects — Fixed, not deferred).
- [x] Owner-doc consistency: `countdown/design.md §6/§8` reflects the wall-clock derivation + pause/resume correctness; `notice-bar/design.md` reflects the OA-22 decision; other mobile design docs unchanged (no drift introduced; MM-17/MM-18/MM-19/MM-20/MM-21 are owned by Plan 2).
- [x] Closure-audit completed by an independent sub-agent (fresh session) with evidence recorded; the execution session did not self-audit this gate.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Real-device CDP touch-emulation + `getComputedStyle` pass

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: The open audit's blind-spot self-assessment notes OA-18/OA-20/OA-22 (geometry/animation) are proven by inline-style math + measured `animationDuration`, not by a captured `getComputedStyle` trace through CDP touch emulation. This plan's findings (MM-14/OA-21/MM-15/MM-16/MM-25) are timing/state-machine defects proven by fake-timer + StrictMode harnesses, which are deterministic and sufficient for closure. The CDP pass would promote confidence but cannot change the pass/fail outcome of the regression tests.
- Successor Required: `yes`
- Successor Path: a future real-device mobile verification plan (pairs with the OA-18/OA-20 device-confirmation follow-up noted in sibling 2031-1).

## Non-Blocking Follow-ups

- Optional: a generic "throttled-timer" test harness utility (shared between countdown and any future timer-driven renderer) so the OA-21 throttle-simulation pattern is reusable. Not blocking: the in-test `Date.now` mock is sufficient for the single countdown case.
- Optional: document all 5 mobile semantic event payload shapes in each renderer's `design.md` Events section (cross-references sibling 2031-1's MM-12 follow-up). Not blocking: payloads are consistent after 2031-1 lands.

## Closure

Status Note: All owned findings resolved and the data-\*-only/ideal-timer-only test gap materially closed. MM-14/OA-21 unified the countdown tick to wall-clock derivation (`remaining = max(0, remainingAtStart - (Date.now() - startTimestamp))`) across both `targetTime` and `time` branches with a run-segment anchor that re-bases on start/resume/config-change — pause/resume now preserves the displayed value (no 50→39 jump) and throttled `setInterval` no longer drifts. MM-22 reconciled `countdown/design.md §6↔§11` to honest `setInterval` + wall-clock (rAF deferred, no longer promised). MM-15 added the `visible` guard + dep to the notice-bar carousel effect (no churn after close). MM-16 made the infinite-scroll in-flight guard StrictMode-robust (release only on actual `loading`/`error` change), preserving OA-16/MA-13. MM-25 forwards `disabled` to the retry `<Button>` (honest WCAG operability). MM-23 added countdown + infinite-scroll StrictMode dispatch tests; MM-24 locked both `direction` branches; OA-22 Decision A locked the mapping and clarified `notice-bar/design.md`. 7 new behavior tests added (mobile suite 147→154); the structural "ideal-timer-only" blind spot is now closed by the throttled-tick + StrictMode + geometry(`animationDirection`) assertions. Independent fresh-session closure audit `approved`.

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent, fresh session (task `ses_10acae81fffebNY4S17eaUulNr`)
- Evidence: Verdict `approved`; zero Blocker/Major. Re-verified every owned finding against live code (`countdown.tsx` wall-clock tick + refs, `notice-bar.tsx` `visible` guard + direction comment, `infinite-scroll.tsx` conditional guard + `disabled` Button), confirmed all 5 regression proofs (MM-14/OA-21/MM-15/MM-16/MM-25) genuinely fail pre-fix via `git diff`, confirmed no `[ ]` remains in Phases 1-4 / Exit Criteria, confirmed deferred items honestly classified (`out-of-scope improvement` / `optimization candidate`), confirmed MA-16/OA-13/MA-02/MM-08/OA-16/MA-13 contracts preserved. `pnpm --filter @nop-chaos/flux-renderers-mobile test` → 154 passed (9 files).

Follow-up:

- Real-device CDP verification successor — see `Deferred But Adjudicated`.
- Optional throttled-timer harness + payload-doc items — see `Non-Blocking Follow-ups`.
