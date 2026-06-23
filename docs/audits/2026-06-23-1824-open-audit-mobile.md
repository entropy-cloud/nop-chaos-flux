> Audit Status: planned
> Audit Type: open-ended
> Mission: mobile

# Open-Ended Adversarial Audit — `packages/flux-renderers-mobile` (fresh re-execution, timestamp 18:24)

- **Audit date**: 2026-06-23 (timestamp 18:24)
- **Auditor**: opencode main agent, single discovery-driven session (no fixed checklist)
- **Scope**: `packages/flux-renderers-mobile/` — all 5 renderers (`pull-refresh`, `infinite-scroll`, `swipe-cell`, `countdown`, `notice-bar`), `use-touch` hook, `schemas.ts`, `mobile-renderer-definitions.ts`, `index.ts`, `test-support.ts`, `styles.css`, all 8 `*.test.ts(x)` incl. `__tests__/mobile-markers-contract.test.tsx`, config (`package.json`, `tsconfig*`, `vitest.config.ts`); cross-referenced against the 5 `docs/components/*/design.md`, the playground consumer (`apps/playground/src/pages/mobile-components-demo.tsx`), and the e2e (`tests/e2e/mobile-components.spec.ts`). Read completely.
- **Method**: read code first, let anomalies surface, then **empirically verify** every candidate via a throwaway vitest probe (inline-style / DOM-text / fake-timer assertions) before reporting. All evidence quoted below is from real probe output captured against the live package; the probe was deleted afterward and the tree confirmed clean.
- **Seed lenses used**: 契约考古学家 (contract archaeologist) + 异常路径侦探 (exception-path detective) + 生命周期追踪者 (lifecycle tracker) + 时序攻击者 (timing attacker, for the new countdown finding).
- **Baseline**: v1, no compat burden, no "transitional / future" excuses for live main-path code.
- **Tool baseline (pre-search)**: `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` PASS, `build` PASS, `lint` PASS, `test` PASS (**138 tests, 8 files**). Clean tree confirmed (no stray artifacts in `src/`; `git status` clean w.r.t. this audit).

## Dedup & freshness

- This is a **fresh, code-driven re-execution** of the audit at this timestamp. The prior 18:24 run produced OA-18/OA-19/OA-20 and a remediation plan (`docs/plans/2026-06-23-2031-1-mobile-reaudit-2-remediation-owner-plan.md`, status `active`). **That plan has NOT executed** — all three findings are re-verified LIVE below with empirical evidence. They are not re-reported as new; they are listed as "still-open, confirmed" so the closure surface stays honest.
- **All earlier findings verified REMEDIATED in live code** before searching for new ones: MA-01..25, OA-01..17, NEW-MM-01..06 (each spot-checked against the cited fix lines; e.g. OA-14 `direction` locked to `'down'` at `pull-refresh.tsx:41`; OA-15 carousel driven by independent `setTimeout` at `notice-bar.tsx:90-101`; OA-16 `isLoadingRef` reset deps `[loading, error]` at `infinite-scroll.tsx:60-62`; OA-17 `displayedErrorText` surfaces host string at `infinite-scroll.tsx:139-140`; NEW-MM-01 gated `console.error` at `infinite-scroll.tsx:75-82`; NEW-MM-02 status `<div>` is `role="status"`-only at `infinite-scroll.tsx:161-195`; NEW-MM-03 synchronous `statusRef` mirror across `pull-refresh.tsx:67-70,130,140,146,152,179`; NEW-MM-04 unmount-safe success timer at `pull-refresh.tsx:76-87,139,144`; NEW-MM-05/06 doc drift corrected).
- **`docs/references/reopened-design-decisions-and-audit-adjudications.md` checked** (`rg` for `mobile|pull-refresh|notice-bar|carousel|swipe-cell|infinite-scroll|countdown|rebound|transform|marquee` → zero matches). None of the findings below are a re-report of an already-adjudicated decision.

**Result: Issues found.** This round contributes **3 NEW, non-duplicate findings** (OA-21, OA-22, OA-23) and re-confirms **3 still-open** prior findings (OA-18, OA-19, OA-20) whose remediation plan has not yet executed. The headline NEW finding (OA-21) is a correctness defect on the documented primary use case (秒杀/flash-sale countdown): the `time` mode drifts arbitrarily under real-browser timer throttling, while its own design doc specifies a wall-clock formula and a `requestAnimationFrame` compensation that the code never implements.

---

## Still-open prior findings (re-verified LIVE, remediation plan not yet executed)

### [OA-18] `pull-refresh` body never rebounds — re-confirmed LIVE

- **Where**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:94-95, 109-116, 186-211, 231`; shared root in `hooks/use-touch.ts:88-90`.
- **Empirical proof** (throwaway probe, `threshold:60, successDuration:200`, pull to `deltaY=200` → `pullDistance=100`):

  | lifecycle point                         | `root.style.transform` (actual) | expected                           |
  | --------------------------------------- | ------------------------------- | ---------------------------------- |
  | loading                                 | `translateY(60px)`              | ✓ correct                          |
  | success                                 | `translateY(60px)`              | ✓ correct                          |
  | **success → normal**                    | **`translateY(100px)`**         | `translateY(0px)` — should rebound |
  | **below-threshold release** (pull 30px) | **`translateY(15px)`**          | `translateY(0px)`                  |

- **Why still live**: `trackTranslate` at `:186-189` falls through to `pullDistance` whenever `resolvedStatus==='normal'`; `pullDistance` is derived from `directionalDelta = Math.max(0, state.deltaY)` which is **not** gated on `state.isTouching`. `useTouch.onTouchEnd` (`use-touch.ts:88-90`) zeroes only `isTouching`, not `deltaY`. MA-10 gated the _label_ (`resolvedStatus`) on `isTouching` but left the _transform_ un-gated. `pull-refresh` (unlike `swipe-cell:171`) never calls `reset()`.
- **Confidence**: **确定** (inline-style math, confirmed by measurement). Invisible to the 138-test suite because every transform/geometry assertion is absent — the third audit running to bite this exact class.

### [OA-19] `notice-bar` `currentIndex` not reset on `text` shrink — re-confirmed LIVE

- **Where**: `packages/flux-renderers-mobile/src/notice-bar.tsx:45-55, 61, 90-101, 131`.
- **Empirical proof** (carousel `['A','B','C']` advanced to index 2 = `'C'`, then `text` rerendered to `['only-now']`):

  ```
  [after shrink to 1] text = ""
  [after +20s more]    text = ""      // never recovers — timer bails at length<=1
  ```

- **Why still live**: no clamp/reset effect for `currentIndex` on `textList.length` change; `activeText = textList[currentIndex] ?? ''` at `:131` has no defensive clamp; the carousel timer bails at `if (textList.length <= 1) return;` (`:91`) so the blank state is permanent.
- **Confidence**: **确定**. Different root from OA-15 (index-lifecycle vs advancement-coupling).

### [OA-20] OA-15's carousel decoupling regressed overflowing multi-text bars — re-confirmed LIVE

- **Where**: `packages/flux-renderers-mobile/src/notice-bar.tsx:17, 90-101, 134-136`.
- **Empirical proof** (`scrollWidth=500, clientWidth=120, speed=50`):

  ```
  animationDuration style = "12s" -> 12000ms
  CAROUSEL_INTERVAL_MS     = 3000
  ratio (anim/carousel)    = 4 -> swap at 25.0% of one marquee
  ```

- **Why still live**: the fixed `3000ms` carousel timer never reconciles with `animationDuration` (typically 8–14s for overflowing text). Each overflowing item is swapped at ~25% of its marquee; equal-width items swap text in-place mid-animation.
- **Confidence**: **很可能** (the `animationDuration ≫ CAROUSEL_INTERVAL_MS` inequality is structural for any overflowing notice).

---

## New findings

### [OA-21] `countdown` `time` mode drifts arbitrarily under real-browser timer throttling — AND its own design doc specifies a wall-clock formula + rAF compensation the code never implements

- **Where**: `packages/flux-renderers-mobile/src/countdown.tsx:100-116` (the `time`-branch tick); doc contract `docs/components/countdown/design.md:96,99,128,147`. Default schema `mobile-renderer-definitions.ts:86` (`defaultSchema: { type: 'countdown', time: 60_000 }`) makes `time` the canonical mode.
- **What**: The `time`-branch tick is purely subtractive:

  ```ts
  const tick = () => {
    setRemaining((prev) => {
      if (typeof targetTime === 'number') return Math.max(0, targetTime - Date.now()); // wall-clock ✓
      if (typeof time === 'number') return Math.max(0, prev - interval); // subtractive ✗
      return prev;
    });
  };
  const timer = setInterval(tick, interval); // interval = millisecond ? 30 : 1000
  ```

  `prev - interval` is correct **only if `setInterval` fires exactly every `interval` ms**. Real browsers do not:
  - Background tabs: Chrome throttles `setInterval` to ≥1000ms, then to **once per minute** for fully backgrounded tabs; Safari/Firefox similar. A 60s 秒杀 countdown backgrounded for 30s wall-clock fires ~1 tick → display drops by 30ms–1000ms instead of 30000ms.
  - Foreground `setInterval(30)` (millisecond mode): each tick is delayed by event-loop jitter (typically 5–15ms), accumulating to seconds of drift over a minute.
  - The `targetTime` branch is immune (wall-clock `Date.now()`); only `time` mode drifts.

- **Empirical proof** (throwaway probe, `Date.now` mocked, simulated background-tab throttle = 30s wall-clock with only 1 of the periodic ticks delivered):

  ```
  [time-mode]    t=0                  remaining = 60000
  [time-mode]    30s wall / 1 tick    remaining = 59970   ← drift 29970ms SLOW (should be ≈30000)
  [target-mode]  t=0                  remaining = 60000
  [target-mode]  30s wall / 1 tick    remaining = 30000   ← wall-clock accurate
  ```

- **Doc-vs-code contract drift (two distinct violations, both `确定`)**:
  1. **Formula drift**: `design.md:99` states _"剩余时间 = `targetTime - Date.now()` 或 **`time - elapsed`**"_ — i.e. wall-clock `elapsed` for the `time` branch, which would be drift-free. The code implements `prev - interval` instead. The word `elapsed` implies a wall-clock delta (`Date.now() - startTimestamp`), not a subtractive accumulator.
  2. **rAF compensation drift**: `design.md:96` states _"使用 `setInterval` 驱动（毫秒精度用 `setInterval` + **`requestAnimationFrame` 补偿`**）"_. The code calls only `setInterval(tick, interval)` (`:114`); there is **no** `requestAnimationFrame` compensation anywhere in the file. `design.md:147` (§11 risks) honestly lists rAF as a _future_ option, but §6 (§6 is the implementation spec) documents it as already present — §6 and §11 disagree, and the code matches neither.

- **Why it wasn't caught**: the existing countdown test suite (`countdown.test.tsx:199-220`, "ticks at the 30ms granularity in millisecond mode") uses `vi.advanceTimersByTime(30)` which in fake-timer-land fires **exactly one** 30ms tick, subtracting exactly 30. Fake timers fire precisely; real `setInterval` does not. The test asserts the _ideal_ subtractive math, never the _real_ drift — exactly the same "tests assert the happy-path invariant, never the failure mode" blind spot that hid OA-18 (transform geometry) and OA-20 (animation timing). No test simulates throttled/delayed ticks.

- **Why care / consequence**: `design.md:6` documents 秒杀倒计时 (flash-sale countdown) as the **primary** use case, and `millisecond:true` is the documented mode for that scenario (`design.md:25` "秒杀场景需要"). A flash-sale countdown that drifts 10–30+ seconds when the user switches tabs (the normal shopping behavior — open product details, compare tabs) means the user sees "00:30" when the sale already ended, or "00:10" when 40 seconds remain. The fix is trivial (capture `startTimestamp = Date.now()` on start/resume and compute `Math.max(0, time - (Date.now() - startTimestamp))`, converging with the `targetTime` branch), and it is what the design doc already prescribes. The current code is strictly worse than its own spec. Confidence: **确定** (drift proven by measurement; doc-vs-code drift proven by line citation).

- **Fix direction**:
  1. Convert the `time`-branch tick to wall-clock: record `startTimestampRef.current = Date.now()` and `initialRemainingRef.current = time` on start/resume/reset; tick computes `Math.max(0, initialRemaining - (Date.now() - startTimestamp))`. This makes `time` and `targetTime` equally drift-proof and matches `design.md:99`.
  2. Either implement the rAF compensation promised by `design.md:96`, or correct §6 to honestly state "`setInterval` only; rAF compensation deferred (§11)" so the doc stops claiming a mechanism the code lacks.
  3. Add a regression test that simulates throttled ticks (e.g. `vi.advanceTimersByTime(30_000)` with only 1 tick due, or a custom timer mock that fires imprecisely) and asserts the wall-clock `remaining` — closing the ideal-timer blind spot for this class.

- **Discovery source**: 时序攻击者 (timing attacker) lens — "the tick decrements by a fixed delta; what happens when the timer doesn't fire on schedule?" Led to diffing the `time` branch against the `targetTime` branch and noticing only the latter is wall-clock. The doc cross-check then surfaced the §6/§11/code three-way disagreement.

---

### [OA-22] `notice-bar` `direction: 'left'` makes text scroll toward the RIGHT — counterintuitive prop naming that inverts the universal marquee convention (code matches doc, so this is a design-level naming smell, not an impl bug)

- **Where**: `packages/flux-renderers-mobile/src/notice-bar.tsx:36, 132`; keyframe `packages/flux-renderers-mobile/src/styles.css:15-22`; doc `docs/components/notice-bar/design.md:26,52`.
- **What**: The CSS keyframe goes `from { translateX(100%) } to { translateX(-100%) }` — i.e. `animation-direction: normal` moves text **right-to-left** (the conventional marquee). The renderer maps:

  ```ts
  const direction = slotProps.direction === 'right' ? 'right' : 'left'; // default 'left'
  const animationDirection = direction === 'left' ? 'reverse' : 'normal';
  ```

  So the default `direction: 'left'` produces `animation-direction: 'reverse'`, which plays the keyframe backwards → text moves **left-to-right**. An author who sets `direction: 'left'` (expecting "scroll toward the left", the convention used by CSS marquee libraries, Vant's default, and the natural reading of the prop name) gets the opposite motion. `direction: 'right'` produces `normal` → right-to-left motion.

- **Empirical proof** (throwaway probe):

  ```
  default(omitted)      animationDirection = "reverse"  → motion LEFT→RIGHT
  direction:"left"      animationDirection = "reverse"  → motion LEFT→RIGHT
  direction:"right"     animationDirection = "normal"   → motion RIGHT→LEFT
  ```

- **Code ↔ doc consistency**: `design.md:26` (§2 decision table) explicitly records _"默认左→右"_ (default left→right), so the code faithfully implements the documented intent. This is therefore **not** a code-vs-doc drift — it is a **design-level naming smell**: the prop value `direction: 'left'` does not mean "scroll toward the left" as convention would suggest; it means "default direction, which happens to move text left-to-right". The doc's terse "左→右" note is the only signal an author has that the mapping is inverted from intuition.

- **Why care**: this is a future schema-author footgun. Vant's `van-notice-bar` (the explicit reference impl per `design.md:14`) has no horizontal `direction` prop and always scrolls right-to-left; authors migrating from Vant or from generic CSS marquee conventions will set `direction: 'left'` expecting leftward motion and silently get the inverse. The fix is cheap (rename the values to `'start'`/`'end'`, or to `'rtl'`/`'ltr'`, or to `'toward-left'`/`'toward-right'`; or simply swap the mapping so `'left'` → `'normal'` → leftward motion and update the doc). Confidence: **确定** on the mapping; **很可能** that this will trip authors (no telemetry, but the inversion vs Vant/CSS convention is structural).

- **Discovery source**: 契约考古学家 lens — re-read the keyframe and asked "does `direction: 'left'` produce leftward motion?" Tracing the `animationDirection` mapping answered no.

---

### [OA-23] `notice-bar` marquee `animationDuration` formula diverges from its design doc (undocumented `+100` fudge; seconds-vs-ms unit mismatch)

- **Where**: `packages/flux-renderers-mobile/src/notice-bar.tsx:134-136`; doc `docs/components/notice-bar/design.md:88`.
- **What**: The design doc specifies the marquee duration as:

  > `duration = (contentWidth / speed) * 1000` ms (`design.md:88`, §5)

  The code computes:

  ```ts
  const animationDuration = shouldScroll
    ? Math.max(1, Math.ceil((textWidth + 100) / speed)) // yields SECONDS
    : 0;
  // used as: animationDuration: `${animationDuration}s`
  ```

  Three divergences:
  1. **Unit**: doc formula yields **ms** (`* 1000`); code yields **seconds** and appends `s`. (`(500/50)*1000 = 10000ms = 10s` vs code `ceil(600/50) = 12s`.)
  2. **`+100` fudge**: code adds `100` to `textWidth` (likely to account for the entry-from-`translateX(100%)` travel so the text fully exits before looping); the doc formula has no such term. The fudge is undocumented and effectively doubles the +travel influence for narrow bars.
  3. **`Math.ceil` + `Math.max(1, …)`**: code clamps to a minimum 1s animation; the doc has no floor. For a 1-character overflow at `speed=50`, code gives `ceil(101/50)=3s`; doc gives `(1/50)*1000=20ms` — three orders of magnitude apart.

- **Why care**: this is a doc-accuracy / authoring-trust issue, not a runtime crash. Combined with OA-20 (the carousel interval never reconciles with this duration), the two together mean the marquee cadence is governed by a formula whose derivation is not what the doc publishes, making both the doc and any author tuning `speed` reason against wrong math. Confidence: **确定** (formula diff is direct); severity low.

- **Fix direction**: align the doc and the code on one formula. Either (a) update `design.md:88` to `duration = Math.ceil((textWidth + travelPadding) / speed) s` with the `+100` explained as entry/exit travel, or (b) drop the `+100` from the code if the keyframe's `translateX(100%)` already accounts for entry travel (it does — the keyframe starts at `100%`, so the text enters from one full container-width away; the `+100` is likely double-counting). Add a test that asserts the documented formula for a known `textWidth`/`speed`.

- **Discovery source**: 契约考古学家 lens — the doc gives an explicit formula; tracing the code's formula and diffing the two surfaced all three divergences at once.

---

## Overall assessment (1–3 directions most worth attention)

1. **The `data-*`-only / ideal-timer-only test contract is now a four-audit-running structural defect factory for this package, and it has spread from geometry into time.** OA-09 (2× overtravel), OA-14 (`up` inverted), OA-15 (dead carousel), OA-18 (no rebound), OA-20 (truncated marquee) were all _geometry/animation_ behaviors invisible to the 138 tests because they assert `data-status` / `data-state` / event counts and never `style.transform` or `animationDuration`. **OA-21 (countdown drift) is the same disease in a new organ**: the countdown test uses `vi.advanceTimersByTime(30)` which fires exactly one precise tick, asserting the _ideal_ subtractive math and never the _real_ drift under throttled `setInterval`. The package's value propositions are native-feel gesture geometry AND accurate time display, yet no test reads a single transform value or simulates an imprecise timer end-to-end. The durable, highest-ROI fix is a small one-time set of assertions: transform-sign after each state transition (`translateY(0px)` at rest); marquee-cycle vs carousel-interval; and a throttled-tick countdown test. Until that exists, the next audit will find a fifth instance.

2. **`docs/components/*/design.md` §6 ("实现"/"定时器实现") is drifting from the code and is no longer a reliable spec.** OA-21 surfaced a three-way disagreement on countdown: §6 documents `time - elapsed` (wall-clock) + `requestAnimationFrame` compensation; §11 honestly defers rAF as a future option; the code implements pure subtractive `setInterval` with neither. OA-23 surfaced a formula divergence on notice-bar (`contentWidth/speed*1000 ms` vs `(textWidth+100)/speed s`). The pattern is: §6 was written aspirationally during design and never reconciled when the implementation shipped a simpler version. §6 is the section authors and auditors trust most as "the implementation contract" — it is the wrong section to let drift. A one-time "§6 vs code" reconciliation pass across the five mobile design docs would close OA-21's doc half, OA-23, and likely latent siblings in swipe-cell/pull-refresh.

3. **Host-driven dynamic mutations and timer-lifecycle edge cases remain the two under-tested surfaces.** OA-19 (`text` array shrink), OA-16 (host clearing `error`), OA-17 (host `error` string), and now OA-21 (timer throttle) are all bugs triggered by inputs/conditions the static-config, happy-path, fake-timer-precise tests never exercise. A "host rerender with mutated props" harness and a "throttled/delayed timer" harness would together catch the entire OA-19/OA-16/OA-21 class in one shot.

## Blind-spot self-assessment (what this round likely missed)

- **Real-device geometry & animation timing.** OA-18/OA-20/OA-22 are proven by inline-style math + measured `animationDuration` + keyframe direction, _not_ by a captured `getComputedStyle` / `getAnimations()` trace through CDP touch emulation on a real viewport. A follow-up that drives the playground mobile page with real touch synthesis + `page.evaluate(() => getComputedStyle(root).transform)` and `page.evaluate(() => getComputedStyle(textSpan).animationDuration)` (per AGENTS.md "NEVER diagnose UI via screenshots") would promote all three to device-confirmed and could surface transition-timing or `content-visibility` interactions invisible in happy-dom.
- **Concurrent / N-instance scale, still unmeasured.** I did not benchmark N simultaneous countdowns in `time` mode (OA-21 makes this worse — N drift-prone timers drift independently), nor N co-mounted `swipe-cell`s sharing the global `pointerdown` outside-close listener (the listener fires on every outside pointerdown; O(openCells) per tap — harmless at small N, untested at scale). Noted, not reported — known low severity.
- **`useTouch` / `useCountdownTimer` public-export freeze.** Both are exported from `index.ts:13,24` with **zero** in-repo consumers outside this package (grep-confirmed in the 17:32 round, not re-verified this round). Before v1 these hook contracts (`touchHandlers` container recreated each render; `useCountdownTimer` `reset/start` shape; the OA-21-affected `time`-branch tick contract) become semi-public API. A "should these be public before v1, and does OA-21's fix change the hook's observable behavior?" pass remains open and is the best next cut-in after the geometry/timer-test gap is closed.
- **Real `setInterval` drift distribution.** OA-21 proves drift exists using a synthetic 1-tick-per-30s throttle; I did not measure the actual drift distribution across Chrome/Safari/Firefox foreground+background over a 60s window. The qualitative conclusion (subtractive drifts, wall-clock does not) is certain; the exact user-visible magnitude on each browser is not.
- **Best next cut-in**: (a) one playground pass with real touch + `getComputedStyle().transform` + an axe-core a11y scan confirms OA-18/OA-20/OA-22 on-device; (b) a "throttled-timer" countdown test + the §6-vs-code doc reconciliation close OA-21 and OA-23 together. Both are single-session work.

## Related

- Prior open-audits: `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-01..13), `docs/audits/2026-06-23-1732-open-audit-mobile.md` (OA-14..17) — all remediated (verified live above).
- Sibling multi-audits: `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-01..25), `docs/audits/2026-06-23-1732-multi-audit-mobile.md` (NEW-MM-01..06), `docs/audits/2026-06-23-1824-multi-audit-mobile.md` — all remediated (verified live above).
- OA-18/OA-19/OA-20 remediation plan (status `active`, not yet executed): `docs/plans/2026-06-23-2031-1-mobile-reaudit-2-remediation-owner-plan.md`. OA-21/OA-22/OA-23 are net-new and not yet covered by any plan.
- Round artifact: `docs/analysis/2026-06-23-1824-open-ended-adversarial-review-mobile/round-01.md` (prior execution's round-01; this re-execution's evidence is captured inline above and via a deleted throwaway probe).
- Baseline at audit time: `typecheck`/`build`/`lint`/`test` (138 tests, 8 files) all PASS; clean tree (no stray `src/` artifacts; `git status` clean w.r.t. this audit).
