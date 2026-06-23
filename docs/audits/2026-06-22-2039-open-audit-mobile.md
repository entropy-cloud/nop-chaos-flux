> Audit Status: planned
> Audit Type: open-ended
> Mission: mobile
> Remediation Plans: `docs/plans/2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md` (OA-05, OA-10, OA-13), `docs/plans/2026-06-23-0655-2-mobile-contract-honesty-and-markers-gating-plan.md` (OA-01, OA-02, OA-03, OA-06, OA-11), `docs/plans/2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md` (OA-04, OA-07, OA-08, OA-09, OA-12). OA-01..OA-07 detailed descriptions live in the prior `planned` revision; this `open` revision's re-verification (lines 22-25) confirms all still live and is the basis for the plans.
> Remediation Progress: ✅ Plan 1 (`...0655-1-...`) completed 2026-06-23 — OA-05 (touchcancel ≠ commit, pull-refresh + swipe-cell), OA-10 (error state suspends auto-load), OA-13 (reset contract: stop + await explicit start) fixed with focused regression tests; repo full-green. Plans 2 & 3 remain.

# Open-Ended Adversarial Audit — `packages/flux-renderers-mobile`

- **Audit date**: 2026-06-22 (timestamp 20:39); this revision promoted `planned → open` after a fresh, independent, code-driven re-execution
- **Auditor**: opencode main agent (single discovery-driven session; no fixed checklist)
- **Scope**: `packages/flux-renderers-mobile/` — `src/` (all 5 renderers, `use-touch`, `schemas`, definitions, `index`, `test-support`), config (`package.json`, `tsconfig*`, `vitest.config.ts`), all `*.test.tsx`, the playground consumer (`apps/playground/src/pages/mobile-components-demo.tsx`), the 5 `docs/components/*/design.md`, and the `@nop-chaos/ui` icon util the package depends on — read completely
- **Method**: read code first, let anomalies surface, chase each lead across renderer ↔ schema ↔ definition ↔ design.md ↔ playground ↔ sibling util
- **Lens used (seed only)**: "无障碍用户" (a11y) + "契约考古学家" (contract archaeologist) + "异常路径侦探"; most findings came from cross-referencing live DOM/CSS behavior and design-doc contracts, not from a dimension table
- **Baseline**: v1, no compat burden, no "transitional/future" excuses for live main-path code

## Dedup & freshness

- This is a **fresh re-execution** of the open-ended prompt against the same package. It does **not** repeat the 7 findings in the prior `planned` revision of this file (OA-01..OA-07) or the 24 findings in the sibling `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-01..MA-25). Those are treated as background.
- **`docs/references/reopened-design-decisions-and-audit-adjudications.md` checked**: none of the 5 recorded adjudications touch the mobile package or any finding below. Nothing here is a re-report of an already-adjudicated decision.
- Every new finding below was checked against the full OA-01..07 / MA-01..25 set and is either absent from them or a **materially different root/impact** (flagged inline where it sharpens a neighbor).

## Independent re-verification (this `open` revision)

The main agent re-read every live source file end-to-end. The package has **not** been modified since commit `8f947df9` (M5 scaffolding); every line citation in OA-01..07 and MA-01..25 still resolves and the code is unchanged. Conclusions re-confirmed:

- **All 7 OA findings still live**: OA-01 (`notice-bar.tsx:186-190` `onAnimationIteration` guard `if (!loop && …)` is unreachable because `loop` defaults `true`, and `loop:false` sets `animationIterationCount:'1'` so `animationiteration` never fires → `currentIndex` advance is dead in **every** config), OA-02 (no close path from an inner swipe-cell action button), OA-03 (Chinese-only default literals, zero `t(...)`/i18n seam), OA-04 (`role="alert"` + unconditional `tabIndex={0}` on an activatable control), OA-05 (commit-on-`touchcancel` at `pull-refresh.tsx:132` / `swipe-cell.tsx:186`), OA-06 (`useTouch` never `preventDefault`; no `touch-action`; `design.md:127,151` makes it contractual), OA-07 (playground `infinite-scroll` consumer uses static `hasMore:true, loading:false` literals → runaway `onLoadMore`).
- **All 24 MA findings still live** (spot-verified the P1 trio and a P2/P3 sample): MA-01 (`pull-refresh.tsx:86` `.then` has no `.catch`, `loading` is the only exit), MA-02 (dispatch inside `setState` updater across `pull-refresh.tsx:83-96`, `swipe-cell.tsx:84-104`, `countdown.tsx:80-96`), MA-03 (BEM `nop-X__region` / `nop-X--variant` emitted by 4 renderers; still no `src/__tests__/` markers gate), plus MA-04..MA-25.

**Result: Issues found.** This round contributes **6 new, non-duplicate findings** (OA-08..OA-13) spanning a11y, layout, error-state async, and doc/code contract drift. The most important is OA-08 (swipe-cell ships hidden-but-focusable delete buttons — a WCAG-relevant a11y defect on the package's canonical cart-delete surface).

---

## New findings

### [OA-08] `swipe-cell`: off-screen action buttons stay focusable and in the accessibility tree when the cell is closed (a11y — hidden interactive content)

- **Where**: `packages/flux-renderers-mobile/src/swipe-cell.tsx:188-223` (the `left`/`right` region wrappers); contract framing at `docs/components/swipe-cell/design.md:116` ("`overflow: hidden` 防止操作区在 closed 状态下可见"); reference consumer at `apps/playground/src/pages/mobile-components-demo.tsx:72-77` (puts `归档`/`删除` `<button>`s in the action regions).
- **What**: When `openState === 'closed'`, the `left`/`right` regions are hidden visually via `position: absolute; transform: translateX(±100%)` inside an `overflow: hidden` root. But they carry **no** `aria-hidden`, **no** `inert`, **no** `hidden`, and **no** `tabindex="-1"` on their focusable descendants. `overflow: hidden` only clips _paint_; it does **not** remove the content from the tab order or the screen-reader accessibility tree.
- **Consequence**: On the package's flagship mobile-mall surface (cart left-swipe → delete), a keyboard or screen-reader user can `Tab` to — and activate — a `删除` button that is visually off-screen, and have it announced out of context ("Delete, button") while the cell looks closed. This is the textbook "off-screen focusable content" defect (WCAG 1.3.1 / 2.4.3 / 4.1.2 territory: content hidden from the visual client must also be hidden from assistive tech, and interactive controls must not be operable while invisible). It is the exact scenario this package exists to serve, so it is not theoretical.
- **Root cause**: the design doc's stated hiding mechanism (`overflow: hidden`) is itself insufficient for AT/focus; the implementation copied that incomplete mechanism and added nothing on top. The `data-state` attribute is emitted, but nothing reads it to toggle focusability.
- **Why not caught**: no a11y-focused test exists; the `swipe-cell.test.tsx` suite only asserts `data-state` transitions and touch gestures. CI has no automated a11y gate.
- **Fix direction**: when `openState === 'closed'`, set `inert` (or `aria-hidden="true"` + `pointer-events:none` + `tabindex={-1}` recursively / on focusable children) on the `left`/`right` wrappers; clear it on open. Verify with a test that asserts no element inside `[data-slot="swipe-cell-left"]`/`-right` is in the tab order / accessibility tree while `data-state="closed"`.
- **Confidence**: **确定** (DOM + CSS + AT semantics; no browser-runtime dependency).
- **Discovery source**: a11y lens — asked "what does a screen-reader/keyboard user experience for the hidden action regions?" and traced focusability rather than paint.

---

### [OA-09] `pull-refresh`: the body over-travels ~2× the finger during pull — the indicator is in normal flow _inside_ the translated track (visual/UX correctness)

- **Where**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:117-153` (root `transform: translateY(trackTranslate)` at `:126`, in-flow indicator at `:134-149` with `height: … trackTranslate` at `:138`, body as the next in-flow sibling at `:150-152`).
- **What**: Both the indicator and the body are **in-flow siblings inside the same root** that is itself `translateY(trackTranslate)`. During a pull of effective distance `P` (`pullDistance`):
  - root translates down by `P` (`trackTranslate === pullDistance` while touching),
  - the indicator is the first in-flow child with `height: P`,
  - so the body's screen offset = `P` (root translate) + `P` (indicator height stacked above it) = **`2P`**.

  The user's finger moved `P`; the body content visibly moves ~`2P`. The canonical pull-to-refresh model (Vant `van-pull-refresh`, AMIS) translates **only the body track** by `P` and reveals a _separately positioned_ (absolute / negative-margin / `translateY(-100%)`) indicator as the "rubber-band" gap above — the body follows the finger 1:1.

- **Consequence**: the pull feels "loose"/over-travelled on a real device; the body snaps down by an extra `threshold` px when committing to `loading`/`success` (where `trackTranslate === threshold` while indicator height is also `threshold`). On the package's own demo this is the first thing a user notices. Because `getBoundingClientRect` layout is not asserted in any test (`pull-refresh.test.tsx` only checks `data-status`/`data-indicator-text`), the defect is invisible to CI.
- **Root cause**: the indicator was placed in normal document flow instead of being lifted out of flow (absolute, anchored above the track), so its height compounds the root's translate instead of being the revealed gap.
- **Verification note**: per AGENTS.md "NEVER diagnose UI failures via screenshots — use `page.evaluate()`/`getComputedStyle()`", confirm by measuring `getBoundingClientRect().top` of `[data-slot="pull-refresh-body"]` vs the root vs `state.deltaY` mid-pull in the playground; expect ~2× ratio.
- **Fix direction**: lift the indicator out of flow (`position:absolute; top:0; left:0; right:0; transform: translateY(-100%)`) so the body is the sole in-flow child of the translated track and follows the finger 1:1; or translate only the body and keep the indicator absolutely revealed.
- **Confidence**: **很可能** (pure layout reasoning from the DOM/CSS; the 2× stacking is a direct consequence of in-flow + translated-root; mild residual chance an outer CSS rule compensates, hence not "确定" — hence the `getBoundingClientRect` verification step).
- **Discovery source**: contract-archaeologist lens — "what is the body's actual screen position during pull?" led to tracing the indicator's box model instead of trusting `data-status`.

---

### [OA-10] `infinite-scroll`: the IntersectionObserver stays **armed during the error state** and `error` is absent from its effect deps — auto-load bypasses the explicit retry UX (distinct root from MA-13)

- **Where**: `packages/flux-renderers-mobile/src/infinite-scroll.tsx:43-64` (observer effect + callback); deps at `:64`.
- **What**:

  ```ts
  // observer effect deps (line 64):
  }, [distance, disabled, hasMore, loading]);   // ❌ no `error`

  // callback guards (lines 50-52):
  if (disabled) return;
  if (hasMore === false) return;
  if (loading === true) return;                  // ❌ no `error` guard
  for (const entry of entries) {
    if (entry.isIntersecting) { void onLoadMoreRef.current?.(); }
  }
  ```

  The `error` status (`resolveStatus` returns `'error'` when `error === true | string`) is meant to surface a retry affordance: the status row renders a retry `<Button>` (`:133-146`) and only that button should re-arm loading. But the observer callback never checks `error`, so while the host has published an error the observer is **still observing and still fires `onLoadMore`** whenever the sentinel re-intersects (any scroll that takes the 1px sentinel out of and back into view, or an observer callback re-fired on a host re-render). Auto-loading thus bypasses the explicit user-driven retry the error UI exists to gate.

- **Consequence**: a transient load failure can auto-retry in a tight loop without any user action as the user scrolls near the bottom; combined with MA-14 (no `.catch`) the rejection is swallowed and the loop is silent. MA-13 covers the _loading-edge_ double-fire and the `hasMore===undefined` auto-pagination; this is a **different root** (the _error_ branch is supposed to fully suspend auto-loading behind an explicit retry, and it does not) and a different consequence (silent retry storm, not duplicate in-flight requests).
- **Root cause**: the `error` runtime prop was added to `resolveStatus` and the retry button but never threaded into the observer's gate or dependency array.
- **Fix direction**: add `error` to the callback guard (`if (error === true || typeof error === 'string') return;`) and to the effect deps so the observer is rebuilt when error clears; keep the retry `<Button>` as the only auto-load-arming path out of error.
- **Confidence**: **很可能** (IntersectionObserver only fires on intersection _changes_, so a perfectly stationary sentinel in error state will not self-fire — but any scroll past/near the bottom, which is the normal reading gesture on a failed page, re-triggers it).
- **Note**: reported as distinct from MA-13 (loading-edge in-flight guard) per reopened-decisions §"distinct residual" guidance — different guard, different failure mode.

---

### [OA-11] `countdown`: `formatCountdown` token set diverges from its own schema-docstring contract, and `design.md`'s flagship `ss` example contradicts its own token table (three-way doc/code drift)

- **Where**: implementation `packages/flux-renderers-mobile/src/countdown.tsx:20-25` (only `DD`/`HH`/`mm`/`ss`/`SSS` branches); schema docstring contract `docs/components/countdown/design.md:47-49` ("支持：YYYY MM DD HH mm ss SSS"); token table `design.md:79-92` (lists only DD/HH/mm/ss/SSS and the example `"ss"` → `"1845"`).
- **What**:
  1. **Schema docstring advertises unsupported tokens.** `design.md:47-49` documents `format` as supporting `YYYY` and `MM`, but `formatCountdown` has no `YYYY`/`MM` branch. A format like `"YYYY-MM-DD"` renders with `YYYY` and `MM` left as **literal** characters (only the `DD` branch substitutes) — silently, with no diagnostic. Authors reading the authoritative field docstring are lied to.
  2. **`design.md`'s own example is self-contradictory.** The token table (`:84`) defines `ss` = 秒, range `00-59` (zero-padded seconds). But the example at `:92` claims `"ss"` → `"1845"`. With the documented (and implemented) semantics, 1845 seconds formats as `"ss"` → `"45"` (the seconds part), never `"1845"`. The example only makes sense under an undocumented "total seconds, unpadded" semantic that neither the table nor the code implements.
  3. **No single-digit/unpadded tokens.** Only zero-padded `DD/HH/mm/ss` are supported; there is no `D/H/m/s`. This is fine _if_ documented, but the schema docstring's loose "支持：… 自定义" wording implies broader coverage than the code delivers.
- **Consequence**: authoring trap — a schema author who writes `format: "YYYY年MM月DD日"` for a "countdown to New Year" gets literal `YYYY年MM月15日`. The drift is invisible to CI (the i18n/static checks don't cover format-token coverage, and `countdown.test.tsx` only exercises `HH:mm:ss`/`DD:HH:mm:ss`/`mm:ss`/`ss`/`SSS`).
- **Root cause**: the schema docstring, the token table, and the formatter were written at three different times and never reconciled.
- **Fix direction**: pick one source of truth. Either (a) implement `YYYY`/`MM`/single-digit tokens and fix the `ss`→`"1845"` example to `→"45"`, or (b) narrow the schema docstring to exactly `DD HH mm ss SSS` and correct the example. Add a `formatCountdown` test for the literal-token pass-through and for `YYYY`/`MM` whichever way it resolves.
- **Confidence**: **确定** (code reading + doc reading; no runtime dependency).
- **Discovery source**: contract-archaeologist lens — the schema docstring's token list and the token table disagreed, which prompted diffing both against the formatter.

---

### [OA-12] `swipe-cell`: action-region width is measured exactly once (`useLayoutEffect` keyed only on `[hasLeft, hasRight]`) — never re-measured when region content resizes (no `ResizeObserver`)

- **Where**: `packages/flux-renderers-mobile/src/swipe-cell.tsx:42-49` (`useLayoutEffect` → `setLeftWidth(leftRef.current.offsetWidth)` / `setRightWidth(...)`); consumed by `computedOffset`/`effectiveOffset` at `:57-79`.
- **What**: The widths that govern how far the cell opens (`computedOffset` snaps to `leftWidth`/`rightWidth`) are read exactly once, re-running only when the _presence_ of the `left`/`right` regions flips. They do **not** re-run when the _contents_ of those regions change size after mount — e.g. an async-loaded action icon, a locale switch that lengthens a label (`"删除"` → `"Delete"`), a conditionally-rendered second button, or a font-load reflow. `design.md:97` promises "操作区宽度自动测量，滑动距离不超过操作区宽度".
- **Consequence**: after such a resize, `leftWidth`/`rightWidth` are stale; the cell opens to the wrong offset — either clipping the action (partially hidden, hard to tap) or overshooting (gap left of the action). The playground demo happens to use static content so it never trips, but any dynamic action region does.
- **Root cause**: a one-shot `useLayoutEffect` was used where the measured dimension is a function of live content; no `ResizeObserver` (or re-measure on region render) tracks it.
- **Fix direction**: observe the action wrappers with a `ResizeObserver` (or re-measure inside an effect keyed on a rendered-content signature) and update `leftWidth`/`rightWidth` on change.
- **Confidence**: **很可能** (standard React one-shot-measurement limitation; dynamic action regions are a realistic mobile-mall scenario — icons/labels/locale are routinely dynamic).
- **Discovery source**: lifecycle-tracker lens — "a width is measured; what re-measures it?" led to the dep array.

---

### [OA-13] `countdown`: `useCountdownTimer.reset()` is asymmetric — it resets `remaining` but not `started`, so a finished timer immediately re-arms on reset; the public hook's reset/start contract is undocumented

- **Where**: `packages/flux-renderers-mobile/src/countdown.tsx:106-118` (`reset`/`start` return methods); effect at `:69-73` re-runs on `computeInitialRemaining`/`autoStart` change; tick effect at `:75-101` keys off `started`.
- **What**: `reset()` does `setRemaining(computeInitialRemaining()); finishedRef.current = false;` — it does **not** touch `started`. After a countdown finishes (`started === true`, `finishedRef.current === true`), calling `reset()` clears the finish flag but leaves `started === true`; since `computeInitialRemaining` is a dependency of the reset effect (`:69-73`), remaining is reseeded and the tick effect (`started && !paused`) immediately resumes counting down from the reset value — i.e. reset silently **restarts** the timer. `start()` only ever sets `started = true` (there is no `stop`/`pause`-via-hook counterpart beyond the schema-level `paused`). The reset/start/stop contract of the exported hook is undocumented anywhere (design.md has no `reset`/`start` — they exist only on the hook surface).
- **Consequence**: an external consumer (the hook is publicly exported via `index.ts:24`) that calls `reset()` expecting "reset to initial, stay still until I `start()`" instead gets an auto-restart. Whether reset-should-restart is a product decision, but the current behavior is undocumented and asymmetric with `start()`. Pairs with MA-15 (these methods are untested) and MA-18 (their option/result interfaces aren't exported) — but the _behavioral asymmetry_ itself is a new angle.
- **Root cause**: `reset` was written to reset the value/finish flag but not the run-state; no spec defined the intended post-reset run state.
- **Fix direction**: decide the contract (reset → stopped-and-awaiting-`start()`, matching `autoStart:false` semantics, is the least surprising) and have `reset()` also restore `started` to `autoStart !== false`; add tests for the post-reset run state and document it on the exported interface.
- **Confidence**: **很可能** (code reading confirms `reset` omits `started`; the "least surprising" framing is judgment).
- **Discovery source**: lifecycle-tracker lens — "a reset exists; what state does it actually reset?" led to diffing `reset` against the full state set.

---

## Overall assessment (1-3 directions most worth attention)

1. **The package's interaction surfaces were built for the _happy touch path_ and never audited for keyboard/SR users or for live (post-mount) layout changes.** OA-08 (hidden-but-focusable delete buttons) and OA-12 (one-shot width measurement) are two faces of the same gap: the renderers assume touch + static content and never reconcile focusability or measurement with state transitions. For a package whose entire reason to exist is mobile-native interaction, "a keyboard user can trigger an invisible Delete" is the single highest-urgency item in this round.

2. **Layout/box-model reasoning was never done — the unit tests only assert `data-*` attributes, never geometry.** OA-09 (pull-refresh body over-travels ~2×) slipped because every test checks `data-status`/`data-indicator-text`, never `getBoundingClientRect`. This is the same class of "tests pass, UI is wrong" blind spot the multi-audit flagged for touch (MA-20), but for _layout_ rather than gestures — and it is structurally un-catchable in happy-dom without geometry assertions.

3. **Docs and code drift in three independent directions within a single small package.** OA-11 shows the countdown `format` contract disagreeing across schema-docstring ↔ token-table ↔ example ↔ implementation; OA-01 (prior) shows notice-bar's multi-text contract unimplemented; OA-02 (prior) shows swipe-cell's close-after-action contract unimplemented. Three different features, same pattern: the design-doc layer is not gated against the code layer. The durable fix is a doc/code-consistency check (or per-feature contract tests), not per-renderer patches.

## Blind-spot self-assessment (what this round likely missed)

- **Real-device geometry and animation timing.** OA-09 is reasoned from the box model, not a captured `getBoundingClientRect` trace; OA-08 from AT semantics, not a VoiceOver/TalkBack pass. A follow-up round should drive the playground mobile page through CDP/Playwright touch emulation + `page.evaluate()` geometry assertions and an axe-core a11y scan — that would promote OA-08/OA-09 from "很可能" to confirmed and likely surface animation-timing issues (e.g. the `animationDuration = ceil((textWidth+100)/speed)` formula in `notice-bar.tsx:128-130` under variable text widths).
- **The `useCountdownTimer`/`useTouch` public hook API freeze question.** I assessed behavior (OA-13) but did not decide whether these hooks should be public at all before v1 (zero external consumers by grep); a "should this be exported yet?" round is open.
- **Bundle/build artifacts.** I read source + config but did not diff `dist/` against `src/` (e.g. whether the JS-injected `@keyframes` in `notice-bar.tsx` survives `sideEffects:false` tree-shaking, and whether the module-level `resolveLucideIconStrict(...)` calls in `notice-bar.tsx:20-26` run at import — they return `null`-on-miss, so no import-time throw, but they do run once at module eval). A built-bundle-in-host-app round would close this.
- **Scale/frame-budget.** I did not benchmark N concurrent countdowns (the MA-16 flash-sale-list re-render storm) or N swipe-cells quantitatively.
- **Best next切入点**: drive the playground mobile page through real touch + geometry + a11y automation in one pass — that single move would confirm/refute OA-08/OA-09/OA-10 and is the highest-ROI follow-up.
