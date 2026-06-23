> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: mobile
> Remediation Plans: `docs/plans/2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md` (MA-01, MA-02, MA-12, MA-13, MA-14, MA-15, MA-16, MA-20 observer-rebuild/touchCancel sub-items), `docs/plans/2026-06-23-0655-2-mobile-contract-honesty-and-markers-gating-plan.md` (MA-03, MA-04, MA-08, MA-09, MA-11, MA-17, MA-18, MA-19, MA-25), `docs/plans/2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md` (MA-05, MA-06, MA-07, MA-10, MA-20 marquee/e2e sub-items, MA-21, MA-22, MA-23, MA-24). All MA-01..MA-25 findings are covered across the three plans; none dropped.
> Remediation Progress: ✅ Plan 1 (`...0655-1-...`) completed 2026-06-23 — MA-01, MA-02, MA-12, MA-13, MA-14, MA-15, MA-16, MA-20 (observer-rebuild/touchCancel sub-items) fixed with focused regression tests; repo full-green (typecheck/build/lint/test 51·27·27·51). Plans 2 & 3 remain `active`/`planned`.

# Multi-Dimensional Audit — `packages/flux-renderers-mobile`

- **Audit date**: 2026-06-22 (timestamp 20:39); status promoted `planned → open` on independent live-code re-verification
- **Auditor**: opencode main agent + 4 deep-dive sub-agents + 1 independent review sub-agent + 1 closure live-code re-verification pass
- **Scope**: `packages/flux-renderers-mobile/` (code, config, tests, public exports/API surface) cross-referenced against architecture docs for contract drift
- **Baseline**: v1, no compat burden, no "transitional / future / migration" excuses for live main-path code
- **Dimensions covered**: 01 (dependency graph), 02 (module responsibility), 03 (API surface), 06 (async safety), 07 (lifecycle), 09 (renderer contract), 10 (styling), 14 (test coverage), 15 (perf/security), 19 (error propagation)
- **Method**: per-dimension deep-dive → independent review sub-agent verified every cluster against live code → 保留 / 降级 / 驳回 adjudication → main-agent live-code re-verification pass (this `open` revision)

## Independent live-code re-verification (this `open` revision)

The main agent re-read the full live source of every mobile renderer (`pull-refresh.tsx`, `swipe-cell.tsx`, `infinite-scroll.tsx`, `notice-bar.tsx`, `countdown.tsx`), `schemas.ts`, `mobile-renderer-definitions.ts`, `hooks/use-touch.ts`, `index.ts`, `package.json`, plus the playground consumer (`apps/playground/src/pages/mobile-components-demo.tsx`) and e2e suite (`tests/e2e/mobile-components.spec.ts`). Outcome:

- **All 3 P1 findings re-confirmed** against current source: MA-01 (`pull-refresh.tsx:86` `void Promise.resolve(...).then(...)` still has no `.catch`, `loading` is the only exit), MA-02 (dispatch inside `setState` updater still present at `pull-refresh.tsx:83-96`, `swipe-cell.tsx:84-104`, `countdown.tsx:80-96`), MA-03 (BEM `nop-X__region` / `nop-X--variant` classes still emitted by all 4 of {notice-bar, pull-refresh, infinite-scroll, swipe-cell}; mobile package still has **no** `__tests__/` markers-contract gate while every sibling package does).
- **Sampled P2/P3 re-confirmed**: MA-07 (`grep touch-action|overscroll-behavior|preventDefault|user-select` in src → only keyboard-handler `preventDefault` hits in infinite-scroll/notice-bar; no touch-action anywhere), MA-08 (`InfiniteScrollSchema` still omits `hasMore`/`loading`/`error`; `infinite-scroll.tsx:27-29` still casts via `as InfiniteScrollRuntimeProps`), MA-09 (`onAction` appears **only** in `schemas.ts:64` and `mobile-renderer-definitions.ts:73`; zero invocations in `swipe-cell.tsx`), MA-11 (`use-touch.ts:25` interface declares `onTouchEnd: (e: React.TouchEvent) => void` but `:88` impl takes no arg; both callers cast `{} as React.TouchEvent`), MA-19 (`grep from '@nop-chaos/(flux-react|flux-i18n|flux-runtime|flux-formula|flux-compiler)` in src → **zero** hits; all 5 deps declared but unused).
- **Open-audit cross-checks re-confirmed**: OA-01 multi-text rotation (`notice-bar.tsx:186-190` handler gated on `!loop` while `loop` defaults true; `loop:false` branch sets `animationIterationCount:'1'` so `animationiteration` never fires), OA-07 runaway demo (`mobile-components-demo.tsx:59-60` `hasMore: true, loading: false` static literals + no in-flight guard → repeat `onLoadMore`), OA-03 Chinese-only defaults with no `t(...)`/i18n seam.
- **No drift since `planned`**: the mobile package has not been modified since commit `8f947df9` (M5 scaffolding); every line-number citation in the findings below still resolves to the cited code. No finding was invalidated by live code.

## Summary

| Severity                                 | Count   |
| ---------------------------------------- | ------- |
| P0                                       | 0       |
| P1                                       | 3       |
| P2                                       | 11      |
| P3                                       | 10      |
| **Total retained**                       | **24**  |
| Rejected (noise per project calibration) | 1 batch |

**Result**: Issues found. The package is functionally usable but contains three P1 correctness defects (silent pull-refresh deadlock on async rejection, setState-updater side effects under StrictMode, and missing mobile markers contract gate that allowed BEM classes to slip through CI), plus a coherent cluster of P2 contract/UX gaps around async hygiene, event-passthrough, schema drift, and missing touch-action CSS.

---

## Cross-cutting root causes

1. **Unhandled async action chains.** `void props.events.onXxx?.(...).then(...)` with no `.catch` and no unmount guard, repeated in `pull-refresh.tsx` and `infinite-scroll.tsx`. The submit-concurrent-guard pattern from `docs/bugs/07-submit-concurrent-guard-fix.md` and the P5 AbortController rule in `docs/architecture/performance-design-requirements.md` were not carried over to these new mobile renderers.
2. **setState-updater side effects.** Action dispatches (`onRefresh` / `onOpen` / `onClose` / `onFinish`) fire inside `setState` updaters across three files. Only `countdown.tsx` has an accidental `finishedRef` guard; the other two double-dispatch under React 19 StrictMode dev.
3. **Missing mobile-package test gates + weak event-payload discipline.** The basic/data/form packages ship `*-markers-contract.test.tsx` that hard-assert no `nop-X__region` / `nop-X--modifier` BEM classes exist; the mobile package has no such test, so the BEM violation was not caught at CI. Event handlers also drop native events and semantic payloads throughout.

---

## P1 Findings (3)

### [MA-01] `pull-refresh.tsx`: `onRefresh` rejection has no `.catch` → loading state deadlocks forever (spinner-of-death)

- **Files**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:80-104` (esp. `:86`)
- **Cross-dim sources**: 维度06-01, 维度19-01, 维度14-03 (coverage gap)
- **Severity**: P1
- **Evidence**:
  ```ts
  setStatus((current) => {
    if (current === 'loading' || current === 'success') return current;
    if (directionalDelta >= threshold) {
      void Promise.resolve(props.events.onRefresh?.(undefined)).then(() => {
        setStatus('success');
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setStatus('normal');
        }, successDuration);
      });
      return 'loading';
    }
    return 'normal';
  });
  ```
- **现状**: `RendererEventHandler` is typed `(event?, ctx?) => Promise<ActionResult>` (`packages/flux-core/src/types/renderer-core.ts:176-179`). If the bound `onRefresh` action rejects (network error, ajax 5xx, dispatch cancellation, host bridge failure), the `.then` success branch is the _only_ path that transitions out of `'loading'`, and the outer `void` discards the rejection with no `.catch`. The status-guard effect at `:70-78` and `handleTouchEnd` at `:82-84` both early-return on `status === 'loading'`, so there is **no alternate reset path**. The spinner is permanently wedged for the page session. `pull-refresh.test.tsx` covers only the resolve path (lines 111-137, 139-172); the reject path has zero coverage.
- **风险**: Any failed refresh action bricks pull-to-refresh for the rest of the session with no error feedback. Same shape as `docs/bugs/07-submit-concurrent-guard-fix.md`.
- **建议**: Add `.catch((error) => { setStatus('normal'); /* optionally surface via runtime monitor */ })` (or `try { await ...; setStatus('success') } catch { setStatus('normal') }`), plus a regression test for the reject path. Pair with MA-12 (unmount guard).
- **复核状态**: ✅ Cluster A — 保留 (P1), live-code confirmed by independent review; re-confirmed in this `open` pass (`pull-refresh.tsx:86` unchanged).

### [MA-02] Action dispatch inside `setState` updater — purity violation + StrictMode double-fire (pull-refresh / swipe-cell / countdown)

- **Files**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:83-96`; `packages/flux-renderers-mobile/src/swipe-cell.tsx:84-90,95-101`; `packages/flux-renderers-mobile/src/countdown.tsx:80-96`
- **Cross-dim sources**: 维度06-01 (root), 维度07-01, 维度07-02, 维度07-03, 维度19-02
- **Severity**: P1
- **Evidence** (swipe-cell, most legible):
  ```ts
  const closeCell = React.useCallback(() => {
    setOpenState((current) => {
      if (current !== 'closed') {
        void props.events.onClose?.(undefined); // dispatch side effect inside updater
        return 'closed';
      }
      return current;
    });
  }, [props.events]);
  ```
  Same pattern in `pull-refresh.tsx:86` (inside `setStatus` updater) and `countdown.tsx:92` (`onFinishRef.current()` inside `setRemaining` updater).
- **现状**: `setOpenState` / `setStatus` / `setRemaining` are React `useState` setters. React 19 StrictMode double-invokes updater functions to surface impurity. Each invocation schedules `void props.events.onXxx?.(undefined)`, so the action dispatches twice per user tap in dev. For gesture events that may trigger `ajax`, `showToast`, navigation, or analytics, double dispatch is observable and potentially destructive (double-submit, double-toast, double-network-call). `countdown.tsx` is accidentally mitigated by a `finishedRef` mutation that happens alongside the dispatch; `pull-refresh` and `swipe-cell` have no such guard. Separately: a sync throw inside an updater (e.g. host validation throw during dispatch payload preparation) propagates as a state-machine failure and crashes the nearest error boundary — typically the page-level boundary for a mobile surface.
- **风险**: Latent source of double API calls / double side-effects in dev StrictMode; contract violation of "Render phase must stay side-effect free" (`docs/architecture/renderer-runtime.md:97-98`); the basic-package renderers do NOT use this pattern (`flux-renderers-basic/src/button.tsx:96` invokes `void props.events.onClick?.(event)` from a regular `onClick` handler).
- **建议**: Move dispatches out of the updater — compute next status synchronously, `setState(next)`, then dispatch in the handler body. Optionally track current state via a ref for the post-`setState` guard.
- **复核状态**: ✅ Cluster B — 保留 (P1), live-code confirmed; re-confirmed in this `open` pass (all three call sites unchanged).

### [MA-03] BEM classes (`nop-X__region` and `nop-X--variant`) on 4 of 5 renderers; no mobile markers contract test gate

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.tsx:135-203`; `packages/flux-renderers-mobile/src/pull-refresh.tsx:136-150`; `packages/flux-renderers-mobile/src/infinite-scroll.tsx:90-138`; `packages/flux-renderers-mobile/src/swipe-cell.tsx:167-226`
- **Cross-dim sources**: 维度09-01A, 09-02A, 09-03A, 09-04A, 维度10-01, 维度10-02, 维度14-01
- **Severity**: P1
- **Evidence**:

  ```tsx
  // notice-bar.tsx:135-203
  className={cn('nop-notice-bar', `nop-notice-bar--${variant}`, variantClass, props.meta.className)}
  <span data-slot="notice-bar-icon" className="nop-notice-bar__icon">
  <div  data-slot="notice-bar-content" className="nop-notice-bar__content">
  <span data-slot="notice-bar-text"    className="nop-notice-bar__text">
  <Button ... className="nop-notice-bar__close">

  // Same pattern in pull-refresh.tsx:136-150 (__indicator/__text/__body),
  // infinite-scroll.tsx:90-138 (__body/__sentinel/__status/__loading/__finished/__error),
  // swipe-cell.tsx:167-226 (__content/__left/__right).
  ```

- **现状**: `docs/architecture/renderer-markers-and-selectors.md:120-153` ("Internal Region Rules" / "State Rules") contractually prohibits `nop-page__header`, `nop-table__pagination`, `nop-icon--check` etc. The sibling gate `packages/flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx:135-137` hard-asserts `expect(container.querySelector('.nop-page__header')).toBeNull()`. The mobile package's `mobile-renderer-definitions.test.tsx` only checks type/category/region/event declarations — it has **no** BEM-prohibition assertion, so all 13 region BEM classes plus the `nop-notice-bar--${variant}` modifier slipped through CI. The `--variant` modifier additionally violates State Rules; `data-variant` is _already_ emitted (`notice-bar.tsx:144`), making the modifier doubly redundant. CSS grep across the repo for `nop-(pull-refresh|swipe-cell|notice-bar|infinite-scroll|countdown)__` returns **zero** hits — so the classes are dead DOM noise (no styling effect); the real risk is contract drift plus the missing test gate that allowed it.
- **风险**: Marker contract drift; future contributors copying the mobile pattern; reader confusion about which is the source of truth (`data-slot` vs class). Without a test gate, regressions will continue.
- **建议**: Add `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` mirroring the basic package's contract test (assert no `nop-X__*` regions and no `nop-X--*` modifiers across all 5 renderers; assert `data-slot` / `data-status` / `data-variant` correctly exist). Delete the redundant BEM class strings; rely on `data-slot` exclusively.
- **复核状态**: ✅ Cluster C — 保留 (P1), live-code confirmed. Risk reframed as "contract drift + missing gate," not "broken styling" (the BEM classes are dead-noise). Re-confirmed: mobile still has no `__tests__/` directory while every sibling package ships a markers-contract test.

---

## P2 Findings (11)

### [MA-04] Event Passthrough Contract: DOM events dispatched with `undefined` instead of forwarding the native event

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.tsx:100,104` (DOM origin); `packages/flux-renderers-mobile/src/pull-refresh.tsx:86` (semantic `onRefresh`); `packages/flux-renderers-mobile/src/swipe-cell.tsx:86,97` (semantic `onOpen`/`onClose`); `packages/flux-renderers-mobile/src/countdown.tsx:133` (semantic `onFinish`)
- **Cross-dim sources**: 维度03-04, 维度09-01D, 维度09-02C, 维度09-04C, 维度09-05B
- **Severity**: P2 (DOM violations drive severity; semantic events are softer)
- **Evidence**:

  ```tsx
  // notice-bar.tsx:98-105 — DOM-origin click on root div and close Button
  const handleClose = React.useCallback(() => {
    setVisible(false);
    void props.events.onClose?.(undefined);    // close Button onClick has the event
  }, [props.events]);
  const handleClick = React.useCallback(() => {
    void props.events.onClick?.(undefined);    // root div onClick — native event available
  }, [props.events]);
  ...
  <Button onClick={(event) => { event.stopPropagation(); handleClose(); }}>   // event is right here

  // Compare correct pattern in flux-renderers-basic/src/button.tsx:96:
  onClick={(event) => void props.events.onClick?.(event)}
  ```

- **现状**: `docs/architecture/renderer-runtime.md:650-668` "Event Passthrough Contract" is a Required rule for DOM entry points: "DOM or React event entry points such as `onClick`, `onChange`, `onSubmit`, `onFocus`, and `onBlur` should call `props.events.onXxx?.(event)` rather than dropping the event object." The notice-bar root `<div onClick>` and close `<Button onClick>` both have direct access to the React event but drop it. Downstream actions therefore lose `event.preventDefault`, `event.target`, `currentTarget`, etc., defeating the `FluxActionEvent` normalization contract. The semantic events (`onRefresh`/`onOpen`/`onClose`/`onFinish`) are softer ("should carry a meaningful `type` field") but still drop useful context.
- **风险**: Action authors cannot `preventDefault`, `stopPropagation`, or read the triggering target. `x2-no-native-event` warnings fire under the sync timing model. Imported namespace providers / debuggers / automated tests cannot resolve `ActionContext.event.currentTarget`.
- **建议**: For DOM-origin events: thread the event through — `(event) => void props.events.onXxx?.(event)` (after `stopPropagation()` for the close button). For semantic events: pass a structured payload like `{ type: 'refresh', direction, threshold }` or `{ type: 'open', side: 'open-left' | 'open-right' }`.
- **复核状态**: ✅ Cluster D — 保留 (P2); re-confirmed live (`notice-bar.tsx:100,104`, `pull-refresh.tsx:86`, `swipe-cell.tsx:86,97`, `countdown.tsx:133`).

### [MA-05] `notice-bar.tsx`: `ensureMarqueeKeyframes()` injects a global `<style>` into `document.head` with no cleanup

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.tsx:28-37, 76-78`
- **Cross-dim sources**: 维度07-04, 维度09-01B
- **Severity**: P2
- **Evidence**:
  ```ts
  const NOTICE_BAR_KEYFRAMES_ID = 'nop-notice-bar-keyframes';
  function ensureMarqueeKeyframes() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(NOTICE_BAR_KEYFRAMES_ID)) return;
    const style = document.createElement('style');
    style.id = NOTICE_BAR_KEYFRAMES_ID;
    style.textContent = `@keyframes nop-notice-bar-marquee { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`;
    document.head.appendChild(style);
  }
  // ...
  React.useEffect(() => {
    ensureMarqueeKeyframes();
  }, []); // no cleanup return
  ```
- **现状**: CSS `@keyframes` rule injected from a React `useEffect` into `document.head`. The `getElementById` guard bounds the leak to at most one node per page session, so it is not an unbounded accumulation. However: (1) the node survives all unmounts in a long-lived SPA; (2) the empty-cleanup `useEffect` is misleading (the effect owns a global DOM resource but signals the opposite); (3) it contradicts `docs/architecture/styling-system.md` "TailwindCSS as the Foundation" — "The framework does not introduce a parallel styling system"; (4) it is hostile to CSP environments that forbid inline `<style>` tags; (5) hosts that purge or sandbox `<head>` (shadow DOM, iframe boundaries) will silently lose the animation.
- **风险**: Layer violation; CSS injection survives unmount; brittle across host environments.
- **建议**: Move `@keyframes nop-notice-bar-marquee` into the package's CSS file (alongside existing `.nop-notice-bar*` selectors). Delete `ensureMarqueeKeyframes()` and the `useEffect` entirely.
- **复核状态**: ✅ Cluster E — 保留 (P2); re-confirmed live (`notice-bar.tsx:30-37, 76-78`).

### [MA-06] `notice-bar.tsx`: hardcoded Tailwind palette literals bypass theme tokens; no `dark:` variants

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.tsx:6-11`
- **Cross-dim sources**: 维度09-01C, 维度10-03
- **Severity**: P2
- **Evidence**:
  ```tsx
  const VARIANT_CLASS_MAP: Record<NoticeBarVariant, string> = {
    info: 'bg-blue-50 text-blue-800',
    warning: 'bg-amber-50 text-amber-800',
    success: 'bg-emerald-50 text-emerald-800',
    error: 'bg-red-50 text-red-800',
  };
  ```
- **现状**: `docs/architecture/theme-compatibility.md:34-36,215` contractually requires "reading CSS variables instead of hardcoded colors where visuals are package-owned." The four notice-bar variants hardcode Tailwind palette literals with no `dark:` variants — dark mode is broken. The renderer already emits `data-variant={variant}` (`notice-bar.tsx:144`), so variant state is already available to CSS via attribute selector; the TSX literals are a parallel non-tokenized channel.
- **风险**: Theme authors cannot retint notice-bar variants without editing renderer source; dark mode renders with bad contrast; bypasses the `--nop-*` / `hsl(var(--primary))` design-token layer used elsewhere.
- **建议**: Drop `VARIANT_CLASS_MAP`; emit only `data-variant` and let package CSS key off `[data-slot="notice-bar"][data-variant="warning"]` with tokenized colors and `dark:` variants. Reference pattern: `packages/ui/src/components/ui/badge.tsx:19-20` (`bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400`).
- **复核状态**: ✅ Cluster F — 保留 (P2); re-confirmed live (`notice-bar.tsx:6-11`).

### [MA-07] Missing `touch-action` on pull-refresh and swipe-cell — browser competes for the gesture on real mobile

- **Files**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:117-133`; `packages/flux-renderers-mobile/src/swipe-cell.tsx:174-187`
- **Cross-dim sources**: 维度15-01, 维度10-04, 维度10-05
- **Severity**: P2 (independent review **downgraded from P1**: baseline doc does not currently mandate `pan-y`/`pan-x`, so this is a real UX defect but not an active contract violation)
- **Evidence**:
  ```tsx
  // pull-refresh.tsx:117 — no touch-action, no overscroll-behavior
  <div
    className={cn('nop-pull-refresh', props.meta.className)}
    data-slot="pull-refresh"
    style={{
      transform: `translateY(${trackTranslate}px)`,
      transition: state.isTouching ? 'none' : `transform ${animationDuration}ms ease`,
      // ❌ no touchAction: 'pan-y', no overscrollBehavior: 'contain'
    }}
    onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
    onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
    ...
  ```
- **现状**: Grep for `touch-action|overscroll-behavior` in `packages/flux-renderers-mobile/src` returns no hits. The renderers listen for `touchmove` but give the browser no CSS hint about gesture ownership. On real mobile: pull-refresh cannot prevent the page from native scroll/overscroll when the user drags down at the top of a list (the visual `translateY` diverges from the user's finger because Chrome is concurrently scrolling or firing its own pull-to-refresh); swipe-cell swipes can be intercepted by Chrome's back-swipe gesture, by horizontal-scroll ancestors, or by pull-to-refresh handlers higher in the tree. (The "passive touchmove preventDefault silently ignored" sub-concern is moot because the code never calls `preventDefault` anywhere.)
- **风险**: Components are functionally unreliable for their stated mobile purpose. Not enforced by any current contract (baseline doc only mandates `touch-action: manipulation` for closing 300ms tap delay).
- **建议**: pull-refresh root: `touch-action: pan-y` + `overscroll-behavior-y: contain`. swipe-cell root: `touch-action: pan-x`. Can be applied via inline style or a new `packages/flux-renderers-mobile/src/styles.css`. If product wants this enforced going forward, add a clause to `docs/architecture/mobile-responsive-baseline.md §5` first.
- **复核状态**: ✅ Cluster G — 降级 (P1 → P2), live-code confirmed; re-confirmed: `grep` for touch-action/overscroll-behavior in src still returns zero hits.

### [MA-08] `InfiniteScrollSchema` missing `hasMore`/`loading`/`error`; renderer casts via `as InfiniteScrollRuntimeProps`

- **Files**: `packages/flux-renderers-mobile/src/schemas.ts:29-46`; `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts:52-54`; `packages/flux-renderers-mobile/src/infinite-scroll.tsx:6-29`
- **Cross-dim sources**: 维度03-01, 维度09-03B
- **Severity**: P2
- **Evidence**:

  ```ts
  // schemas.ts:29-46 — public type omits the three runtime-consumed fields
  export interface InfiniteScrollSchema extends BaseSchema {
    type: 'infinite-scroll';
    body?: SchemaInput;
    distance?: number;
    disabled?: boolean;
    loadingText?: string;
    finishedText?: string;
    errorText?: string;
    immediateCheck?: boolean;
    onLoadMore?: ActionSchema;
  }   // missing: hasMore, loading, error — all consumed at runtime

  // mobile-renderer-definitions.ts:52-54 — but the field rules declare them
  { key: 'hasMore', kind: 'prop', valueType: 'boolean' },
  { key: 'loading', kind: 'prop', valueType: 'boolean' },
  { key: 'error', kind: 'prop' },

  // infinite-scroll.tsx:6-29 — so the renderer has to cast
  interface InfiniteScrollRuntimeProps {
    hasMore?: boolean;
    loading?: boolean;
    error?: boolean | string;
  }
  const hasMore = (slotProps as InfiniteScrollRuntimeProps).hasMore;
  const loading = (slotProps as InfiniteScrollRuntimeProps).loading;
  const error = (slotProps as InfiniteScrollRuntimeProps).error;
  ```

- **现状**: Schema TypeScript type, field rules, and runtime consumption are out of sync. Authors writing `{ type: 'infinite-scroll', hasMore: true, loading: false }` get no IntelliSense and no type check; the `SchemaObject` index signature even lets `hasMore: "true"` (string) compile, but `valueType: 'boolean'` will treat it as truthy-but-not-`false`, contradicting the compile contract.
- **风险**: Author trap; contract drift between schema type layer and field-rule layer; type-system lie inside the renderer.
- **建议**: Add `hasMore?: boolean; loading?: boolean; error?: boolean | string;` to `InfiniteScrollSchema`. Delete the local `InfiniteScrollRuntimeProps` interface and the `as` casts at `infinite-scroll.tsx:27-29`.
- **复核状态**: ✅ Cluster H — 保留 (P2); re-confirmed live (schema still omits the three fields; `infinite-scroll.tsx:27-29` still casts).

### [MA-09] `swipe-cell` `onAction` event declared in schema + field rules + design.md, but never dispatched

- **Files**: `packages/flux-renderers-mobile/src/schemas.ts:64`; `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts:73`; `packages/flux-renderers-mobile/src/swipe-cell.tsx` (zero invocations); `docs/components/swipe-cell/design.md:8,67,130`
- **Cross-dim sources**: 维度03-02, 维度09-04B, 维度14-04
- **Severity**: P2
- **Evidence**:

  ```ts
  // schemas.ts:64
  onAction?: ActionSchema;

  // mobile-renderer-definitions.ts:73
  { key: 'onAction', kind: 'event' },

  // docs/components/swipe-cell/design.md:8,67,130
  // - 它不是数据源——操作按钮的回调由 `onAction` 事件驱动。
  // - onAction?: ActionSchema;   // "滑动操作触发(由操作按钮的 action 驱动)"
  // - 操作按钮点击 → 触发 action 后自动回弹关闭

  // swipe-cell.tsx — grep for events. shows only:
  //   line 86:  void props.events.onClose?.(undefined);
  //   line 97:  void props.events.onOpen?.(undefined);
  // ❌ props.events.onAction is never invoked anywhere
  ```

- **现状**: Three layers of contract (TypeScript schema, field rules, design doc) declare `onAction` as the primary action callback, but the renderer never fires it. Authors can write `{ type: 'swipe-cell', onAction: { action: 'cart:remove', args: {...} } }` — schema validates, TypeScript validates, the action silently never runs.
- **风险**: Silent authoring trap; in a shopping-cart left-swipe-delete scenario this is "user taps delete but nothing happens." No test catches it (`grep -c "onAction" swipe-cell.test.tsx` = 0).
- **建议**: Either (A) dispatch `props.events.onAction?.({ type: 'action', side })` when a left/right action region is revealed or its inner button is tapped (then close); or (B) if action buttons inside left/right regions handle their own `onClick`, remove `onAction` from `schemas.ts`, `mobile-renderer-definitions.ts`, and `design.md` to stop lying about the contract.
- **复核状态**: ✅ Cluster I — 保留 (P2); re-confirmed live (`onAction` appears only in `schemas.ts:64` and `mobile-renderer-definitions.ts:73`; zero invocations in `swipe-cell.tsx`).

### [MA-10] `pull-refresh.tsx`: derived `'pulling'`/`'loosing'` status mirrored via `useEffect`+`setState` instead of render-time derivation (doubles renders on touch hot path)

- **Files**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:70-78`
- **Cross-dim sources**: 维度09-02B, 维度07-05, 维度15-02
- **Severity**: P2
- **Evidence**:
  ```ts
  React.useEffect(() => {
    if (disabled) return;
    if (!state.isTouching) return;
    if (status === 'loading' || status === 'success') return;
    if (directionalDelta > 0) {
      setStatus(reachedThreshold ? 'loosing' : 'pulling');
    }
  }, [state.isTouching, directionalDelta, reachedThreshold, disabled, status]);
  ```
- **现状**: `directionalDelta` and `reachedThreshold` are already derived from `state.deltaY` at `pull-refresh.tsx:64-68` and are available at render time. The mapping `(directionalDelta, reachedThreshold) → 'pulling' | 'loosing'` is a pure function of values already in scope. Funneling it through `useEffect → setStatus` doubles renders on every `touchmove` tick (touchmove fires at 60–120 Hz during a pull): useTouch setState → render → effect → setStatus → render. The dep array also includes `status`, so every status transition re-triggers the effect.
- **风险**: Visible jank during the exact moment the user is interacting (worst possible time for jank) on low-end mobile devices. Violates AGENTS.md "Prefer render-time derivation over `useEffect` + `setState` mirrors." Passed lint because the setState is conditional, not synchronous.
- **建议**: Delete the effect. Compute the live status at render time: `const resolvedStatus = isBusy ? status : (directionalDelta > 0 ? (reachedThreshold ? 'loosing' : 'pulling') : 'normal')`. Keep `setStatus` only for genuine state-machine transitions in `handleTouchEnd` (`loading`/`success`/`normal`).
- **复核状态**: ✅ Cluster K — 保留 (P2); re-confirmed live (`pull-refresh.tsx:70-78` unchanged).

### [MA-11] `use-touch.ts`: `onTouchEnd` signature declares `(e: React.TouchEvent)` but implementation ignores the arg; callers forced to cast `{} as React.TouchEvent`

- **Files**: `packages/flux-renderers-mobile/src/hooks/use-touch.ts:22-26, 88-90`; `packages/flux-renderers-mobile/src/pull-refresh.tsx:81`; `packages/flux-renderers-mobile/src/swipe-cell.tsx:121`; `packages/flux-renderers-mobile/src/hooks/use-touch.test.ts:162`
- **Cross-dim sources**: 维度09-09A
- **Severity**: P2
- **Evidence**:

  ```ts
  // use-touch.ts:22-26 — public interface
  export interface UseTouchReturn {
    state: TouchState;
    touchHandlers: {
      onTouchStart: (e: React.TouchEvent) => void;
      onTouchMove: (e: React.TouchEvent) => void;
      onTouchEnd: (e: React.TouchEvent) => void; // <-- signature requires event
    };
    reset: () => void;
  }
  // use-touch.ts:88-90 — implementation
  const onTouchEnd = useCallback(() => {
    // <-- takes no argument
    setState((prev) => ({ ...prev, isTouching: false }));
  }, []);

  // callers — forced to construct fake events:
  // pull-refresh.tsx:81
  touchHandlers.onTouchEnd({} as React.TouchEvent);
  // swipe-cell.tsx:121
  touchHandlers.onTouchEnd({} as React.TouchEvent);
  ```

- **现状**: Public hook API actively misleads. Two production callers and the hook's own test construct `{} as React.TouchEvent` casts to satisfy a parameter that the implementation does not use. A future maintainer reading the signature will assume the event is consumed inside (e.g. for `changedTouches`) and may add such logic without realizing the cast at the call site would feed in `{}`.
- **风险**: Type-system lie propagating through the public API and three call sites. Future-fragility.
- **建议**: Drop the parameter from the interface signature: `onTouchEnd: () => void`. Update all callers to drop the `({} as React.TouchEvent)` cast. If a future refactor needs the event, restore the parameter at that time.
- **复核状态**: ✅ Cluster L — 保留 (P2); re-confirmed live (`use-touch.ts:25` interface vs `:88` impl; both callers unchanged).

### [MA-12] `pull-refresh.tsx`: `successTimerRef` cleanup only clears the current ref — timer scheduled by `.then` after unmount leaks and fires setState on unmounted instance

- **Files**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:54-62, 86-92`
- **Cross-dim sources**: 维度06-02, 维度15-03
- **Severity**: P2
- **Evidence**:

  ```ts
  const successTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []); // <- cleanup runs once, only sees timer state at unmount moment

  // inside handleTouchEnd (lines 86-92):
  void Promise.resolve(props.events.onRefresh?.(undefined)).then(() => {
    setStatus('success'); // <- can fire post-unmount
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setStatus('normal'); // <- can fire post-unmount
    }, successDuration);
  });
  ```

- **现状**: The cleanup effect reads `successTimerRef.current` only at the moment of unmount. If the component unmounts while `onRefresh` is in flight, the cleanup runs with `successTimerRef.current === null` (no-op); when the promise later resolves, the `.then` callback both calls `setStatus('success')` on an unmounted instance and schedules a new `setTimeout` that the already-run cleanup will never clear. That timer then fires `setStatus('normal')` on the unmounted instance `successDuration` ms later.
- **风险**: Dangling timer; post-unmount state writes (React no longer warns in 18+ but work is still done); retained instance; under StrictMode dev the unmount-then-remount cycle can cause the remounted instance to receive a `setStatus('success')` intended for the prior instance.
- **建议**: Track an `isMountedRef` (or use an `AbortController` per `performance-design-requirements.md` P5), check it inside the `.then` before any setState, and pair with MA-01 (the `.then` needs both `.catch` and the unmounted guard).
- **复核状态**: ✅ Cluster P — 保留 (P2); re-confirmed live (`pull-refresh.tsx:54-62, 86-92` unchanged).

### [MA-13] `infinite-scroll.tsx`: IO callback + immediateCheck effect can double-fire `onLoadMore`; no in-flight guard; `hasMore === false` lets undefined auto-paginate

- **Files**: `packages/flux-renderers-mobile/src/infinite-scroll.tsx:43-72`
- **Cross-dim sources**: 维度06-04
- **Severity**: P2
- **Evidence**:
  ```ts
  // IO effect at line 48-64:
  const observer = new IntersectionObserver((entries) => {
    if (disabled) return;
    if (hasMore === false) return;            // <-- undefined falls through
    if (loading === true) return;
    for (const entry of entries) {
      if (entry.isIntersecting) {
        void onLoadMoreRef.current?.();        // <-- trigger path #1
      }
    }
  }, ...);
  // immediateCheck effect at line 66-72 with deps including `loading`:
  React.useEffect(() => {
    if (!immediateCheck) return;
    if (disabled) return;
    if (hasMore === false) return;
    if (loading === true) return;
    void onLoadMoreRef.current?.();            // <-- trigger path #2
  }, [immediateCheck, disabled, hasMore, loading]);
  ```
- **现状**: Two independent trigger paths, neither locally deduped. Between dispatch and the host's `loading` prop landing `true` (the host may defer the loading flag to a microtask or batch it on next render), both paths can pass the `loading === true` guard and fire `onLoadMore` — two server requests in flight for what should be one page fetch. The renderer has no local in-flight guard (no `isLoadingRef`, no `AbortController`) like Bug 07's `submitting` gate; it fully trusts the host to publish `loading` synchronously, which is not encoded as a contract anywhere. Separately: `hasMore === false` does not catch `undefined`, so a host that completes a load and resets `loading: false` automatically triggers the next page — implicit auto-pagination that never terminates if `hasMore` is left `undefined`.
- **风险**: Duplicate network requests for the same page (duplicate rows if host doesn't dedupe server-side); runaway auto-pagination when `hasMore` is not explicitly `false`; combined with MA-14, a single persistent error becomes an infinite retry storm whenever the host resets `loading: false` on rejection.
- **建议**: Introduce a local `isLoadingRef` set synchronously when `onLoadMore` fires and cleared only when the host's `loading` prop transitions. Tighten `hasMore === false` to `hasMore !== false` → require explicit boolean, or document the implicit-truthy contract.
- **复核状态**: ✅ Cluster Q — 保留 (P2); re-confirmed live (`infinite-scroll.tsx:43-72` unchanged; three fire sites at `:55,71,77`).

### [MA-14] `infinite-scroll.tsx`: `onLoadMore` rejections silently swallowed (no `.catch`); can deadlock host's `loading` prop

- **Files**: `packages/flux-renderers-mobile/src/infinite-scroll.tsx:55, 71, 77`
- **Cross-dim sources**: 维度06-03
- **Severity**: P2
- **Evidence**:
  ```ts
  // line 55 (IO observer callback):
  for (const entry of entries) {
    if (entry.isIntersecting) {
      void onLoadMoreRef.current?.(); // no .catch
    }
  }
  // line 71 (immediateCheck effect):
  void onLoadMoreRef.current?.(); // no .catch
  // line 77 (triggerLoadMore — retry button):
  void onLoadMoreRef.current?.(); // no .catch
  ```
- **现状**: Three fire-and-forget dispatch sites of a `() => Promise<ActionResult>` typed callback, none followed by `.catch`. Lower stakes than MA-01 because infinite-scroll does not self-transition to a sticky loading state (it relies on the host's `loading` prop), but if the host keys its loading flag off the promise resolution, the host's flag can also deadlock.
- **风险**: Silent retry failure on transient errors with no UI feedback (the renderer's `error` status only activates if the host publishes `error: true | string` as a runtime prop); or, if the host's contract doesn't reset `loading` on rejection, the renderer hangs at `'loading'` forever.
- **建议**: Apply the same `.catch` hygiene as MA-01. At minimum, document the host contract that `onLoadMore` rejection must publish `error` for the renderer to surface it; stronger: catch locally and route through a runtime-monitor seam.
- **复核状态**: ✅ Cluster R — 保留 (P2); re-confirmed live (`infinite-scroll.tsx:55,71,77` all still `void ...?.()` with no catch).

### [MA-15] Coverage gap: `useCountdownTimer` `reset()`/`start()` methods, `millisecond` mode, and targetTime-completion paths are untested

- **Files**: `packages/flux-renderers-mobile/src/countdown.test.tsx` (missing cases); public API at `packages/flux-renderers-mobile/src/countdown.tsx:111-118, 49`; `packages/flux-renderers-mobile/src/index.ts:24`
- **Cross-dim sources**: 维度14-05
- **Severity**: P2
- **Evidence**:

  ```ts
  // countdown.tsx:49
  const interval = millisecond ? 30 : 1000;

  // countdown.tsx:111-118 — exported hook methods with zero coverage
  return {
    remaining, formatted, isFinished, started,
    reset() {
      setRemaining(computeInitialRemaining());
      finishedRef.current = false;
    },
    start() { setStarted(true); },
  };

  // countdown.test.tsx:169-180 — weak targetTime assertion
  const value = view.container.querySelector(...)?.textContent ?? '0';
  expect(Number(value)).toBeGreaterThanOrEqual(0);   // almost any output passes
  expect(Number(value)).toBeLessThanOrEqual(59);
  ```

- **现状**: (a) `millisecond: true` (30 ms interval path) is completely untested. (b) The targetTime test's assertion is so weak that almost any numeric output passes — it does not even assert the `targetTime - Date.now()` delta. (c) `useCountdownTimer` is publicly exported via `index.ts:24`, but its `reset()` and `start()` methods have zero coverage. `formatCountdown`'s SSS formatting is covered as a pure function but the runtime 30 ms cycle and recompute branch are not.
- **风险**: Public API regresses silently; high-frequency re-render path (30 ms interval) is exactly the path most likely to harbor the MA-16 perf leak.
- **建议**: Use `vi.useFakeTimers()` + `vi.setSystemTime()` to lock the present, render `{ targetTime: now + 90_000, format: 'ss' }` and assert text equals `30`. Add a millisecond-mode test. Add direct hook tests for `reset()` and `start()`.
- **复核状态**: ✅ Cluster S-14-05 — 保留 (P2).

---

## P3 Findings (10)

### [MA-16] `countdown.tsx`: `targetTime` branch never clamps to 0 → `setState` with ever-negative values → infinite re-renders after finish

- **Files**: `packages/flux-renderers-mobile/src/countdown.tsx:80-96`
- **Cross-dim sources**: 维度15-04
- **Severity**: P3
- **Evidence**:
  ```ts
  const tick = () => {
    setRemaining((prev) => {
      let next: number;
      if (typeof targetTime === 'number') {
        next = targetTime - Date.now(); // <- no clamp; grows negative forever
      } else if (typeof time === 'number') {
        next = Math.max(0, prev - interval); // <- correctly clamped
      } else {
        next = prev;
      }
      if (next <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        onFinishRef.current();
        return 0;
      }
      return next; // <- after finish: returns ever-more-negative number
    });
  };
  ```
- **现状**: When `targetTime` is in the past (the normal finished state), `next = targetTime - Date.now()` returns an ever-more-negative value each tick. `finishedRef.current` becomes `true` on the first finishing tick, so the `if (next <= 0 && !finishedRef.current)` guard no longer catches subsequent ticks, and the updater falls through to `return next`. Because each returned `next` differs from the previous (e.g., -1500, -2500, -3500…), React sees a state change and re-renders once per interval (1 s or 30 ms) indefinitely. Display is saved only because `formatCountdown` clamps (`countdown.tsx:13`). The `time`-mode branch is correctly clamped, proving the author knew the pattern.
- **风险**: A page with N finished countdowns (e.g., a flash-sale list with expired items — common in mobile mall scenarios) re-renders N times per second indefinitely. With `millisecond: true`, N times per 30 ms — battery and frame-budget drain on mobile devices, exactly the scenario this package targets.
- **建议**: Clamp the `targetTime` branch the same way as the `time` branch (`next = Math.max(0, targetTime - Date.now())`) so React's bail-out path engages, and/or `clearInterval` once `finishedRef.current` is set.
- **复核状态**: ✅ Cluster J — 保留 (P3); re-confirmed live (`countdown.tsx:82-83` still `next = targetTime - Date.now()` with no clamp).

### [MA-17] `NoticeBarSchema.icon` typed `SchemaValue` while all 5 other repo `icon?` fields use `string`

- **Files**: `packages/flux-renderers-mobile/src/schemas.ts:92`; `packages/flux-renderers-mobile/src/notice-bar.tsx:53-54`
- **Cross-dim sources**: 维度03-03, 维度09-08B
- **Severity**: P3
- **Evidence**:

  ```ts
  // schemas.ts:92
  icon?: SchemaValue;   // accepts string | number | boolean | object | array

  // notice-bar.tsx:53-54 — only the string branch is honored
  const iconName = typeof slotProps.icon === 'string' ? slotProps.icon : undefined;
  const iconComp = resolveLucideIconStrict(iconName) ?? DefaultVariantIcons[variant];

  // Other icon declarations repo-wide (all string):
  // flux-renderers-basic/src/schemas.ts:105,206,218; flux-renderers-data/src/schemas.ts:42;
  // report-designer-renderers/src/schemas.ts:11
  ```

- **现状**: The schema type advertises that `icon` can be any `SchemaValue`, but the renderer silently ignores everything except strings. Authors writing `icon: { name: 'star', size: 16 }` get the default variant icon with no diagnostic.
- **建议**: Narrow to `icon?: string`, matching the renderer's actual behavior and the cross-package convention.
- **复核状态**: ✅ Cluster M — 保留 (P3); re-confirmed live (`schemas.ts:92` still `SchemaValue`).

### [MA-18] `useCountdownTimer` exported but its option/result interfaces are not — half-exported API

- **Files**: `packages/flux-renderers-mobile/src/countdown.tsx:28-46, 175`; `packages/flux-renderers-mobile/src/index.ts:24`
- **Cross-dim sources**: 维度03-05
- **Severity**: P3
- **Evidence**:

  ```ts
  // countdown.tsx:28-46 — interfaces not exported
  interface CountdownTimerOptions { time?: number; targetTime?: number; paused?: boolean; ... }
  interface CountdownTimerResult { remaining: number; formatted: string; ... }

  // countdown.tsx:175 — function exported, interfaces are not
  export { useCountdownTimer };

  // index.ts:24 — re-exports only the function
  export { CountdownRenderer, useCountdownTimer, formatCountdown } from './countdown.js';

  // Contrast with useTouch at index.ts:14-19, which exports all 4 supporting types
  ```

- **现状**: External consumers cannot annotate options/result types. The `dist/countdown.d.ts` build artifact confirms the interfaces are absent from the public surface. The same package's `useTouch` does export all its supporting types, so the correct pattern is already in-repo.
- **建议**: Add `export` to both interfaces in `countdown.tsx`; add `export type { CountdownTimerOptions, CountdownTimerResult } from './countdown.js';` to `index.ts`.
- **复核状态**: ✅ Cluster N — 保留 (P3); re-confirmed live (`countdown.tsx:28-46` interfaces still not exported; `index.ts:24` re-exports only the function).

### [MA-19] `package.json` declares 5 unused workspace dependencies

- **Files**: `packages/flux-renderers-mobile/package.json:15-31`
- **Cross-dim sources**: 维度01-01
- **Severity**: P3
- **Evidence**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-i18n": "workspace:*",      // zero src references
    "@nop-chaos/flux-react": "workspace:*",     // zero src references — renderers use only RendererComponentProps from flux-core
    "@nop-chaos/ui": "workspace:*"
  },
  "peerDependencies": { "lucide-react": "^1.17.0", "react": "^19.0.0" },
  "devDependencies": {
    "@nop-chaos/flux-compiler": "workspace:*",  // zero src/test references
    "@nop-chaos/flux-formula": "workspace:*",   // zero src/test references
    "@nop-chaos/flux-runtime": "workspace:*",   // zero src/test references
    "lucide-react": "^1.17.0",
    "react": "^19.0.0"
  }
  ```
  Grep of `packages/flux-renderers-mobile/src` for `from '@nop-chaos/(flux-react|flux-i18n|flux-runtime|flux-formula|flux-compiler)` returns zero hits. Only `flux-core` and `ui` are imported.
- **现状**: 5 deps declared but unused. Sibling renderer packages (`flux-renderers-basic`, `-data`, `-form`, `-form-advanced`) declare the same deps but actually use them in source/tests; mobile is the only one with all five empty.
- **风险**: Manifest inaccuracy; downstream host/bundler sees `flux-react`/`flux-i18n` in `dependencies` and assumes they're runtime needs; lockfile/install pulls 3 unused dev packages; future contributors may copy the manifest and introduce flux-react hooks into what should be props-only renderers.
- **建议**: Remove `flux-i18n` and `flux-react` from `dependencies`; remove `flux-compiler`, `flux-formula`, `flux-runtime` from `devDependencies`. Re-add per-package if a future renderer actually needs them.
- **复核状态**: ✅ Cluster O — 保留 (P3); re-confirmed live (grep for the 5 deps in `src/` returns zero hits; `package.json:15-31` unchanged).

### [MA-20] Test coverage gaps: marquee path untestable in happy-dom (document), observer rebuild, touchCancel, e2e assertions too weak

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.test.tsx:99-106`; `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx`; `packages/flux-renderers-mobile/src/pull-refresh.test.tsx`; `packages/flux-renderers-mobile/src/swipe-cell.test.tsx`; `tests/e2e/mobile-components.spec.ts:24-66`
- **Cross-dim sources**: 维度14-02, 14-06, 14-07, 14-08
- **Severity**: P3
- **Evidence**:

  ```tsx
  // notice-bar.test.tsx:99-106 — test acknowledges happy-dom limitation, only asserts false branch
  it('marks data-scrollable=false when scrollable=true but text fits container', () => {
    const { view } = renderNoticeBar({ text: 'short', scrollable: true });
    // Without layout, scrollWidth === clientWidth === 0 in happy-dom, so no overflow -> false.
    expect(root?.getAttribute('data-scrollable')).toBe('false');
  });

  // tests/e2e/mobile-components.spec.ts:24-66 — assertion allows 'normal' status, equivalent to no-op
  const status = await pullRefresh.getAttribute('data-status');
  expect(['pulling', 'loosing', 'loading', 'normal']).toContain(status ?? '');
  // 'normal' is in the allow-list, so even a totally failed drag passes the test
  ```

- **现状**: (a) notice-bar's marquee animation branch (`scrollable: true` with overflow) is never reached in happy-dom because layout measurement returns 0/0; the test acknowledges the gap but only asserts the false branch. (b) `infinite-scroll` observer rebuild on prop changes (`distance`/`disabled`/`hasMore`/`loading`) is untested. (c) `onTouchCancel` is wired in `pull-refresh.tsx:132` and `swipe-cell.tsx:186` but never fired in tests. (d) The e2e `mobile-components.spec.ts` assertions are predominantly `toBeVisible()` + weak status checks; the "pull-refresh transitions through pulling state" test allows `'normal'` in the status allow-list, making it equivalent to a no-op.
- **建议**: (a) Use `vi.spyOn(el, 'scrollWidth', 'get')` to mock overflow and cover the shouldScroll=true branch. (b) Use `view.rerender(...)` to change `distance`/`disabled` and assert the old MockIntersectionObserver called `disconnect()` and a new one was created. (c) Add `fireEvent.touchCancel(root)` tests. (d) Tighten the e2e assertion to `expect(['pulling', 'loosing', 'loading']).toContain(status)`.
- **复核状态**: ✅ Cluster S (14-02/06/07/08) — 保留 (P3); 14-02 specifically downgraded from P2 to P3 (inherent jsdom limitation). Re-confirmed: `mobile-components.spec.ts:63` still includes `'normal'` in the allow-list; `:75` status regex still permits `'normal'`.

### [MA-21] `notice-bar.test.tsx` couples to literal Tailwind class names — will break on MA-06 token migration

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.test.tsx:62-79`
- **Cross-dim sources**: 维度14-09
- **Severity**: P3
- **Evidence**:
  ```tsx
  it('applies warning variant styling and data-variant', () => {
    const { view } = renderNoticeBar({ text: 'warn', variant: 'warning' });
    const root = view.container.querySelector('[data-slot="notice-bar"]') as HTMLElement;
    expect(root.getAttribute('data-variant')).toBe('warning');
    expect(root.className).toContain('bg-amber-50'); // <- implementation detail
    expect(root.className).toContain('text-amber-800'); // <- implementation detail
  });
  // success/error variants assert bg-emerald-50 / bg-red-50 the same way
  ```
- **现状**: Tests assert literal Tailwind class names. When MA-06's token migration lands (replacing `bg-amber-50` with `bg-warning/15` or similar), these tests will all go red despite no behavioral breakage.
- **建议**: Either assert through user-visible channels (`getComputedStyle` background color) or limit implementation-detail assertions to a centralized `variantExpectedClass` table; the protocol-level `data-variant` assertion is already sufficient.
- **复核状态**: ✅ Cluster S-14-09 — 保留 (P3).

### [MA-22] `notice-bar.tsx`: stable layout values as inline `style` instead of Tailwind classes

- **Files**: `packages/flux-renderers-mobile/src/notice-bar.tsx:149-155`
- **Cross-dim sources**: 维度09-06A, 维度10-08
- **Severity**: P3
- **Evidence**:
  ```tsx
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    overflow: 'hidden',
  }}
  ```
- **现状**: `docs/architecture/theme-compatibility.md:277` "Prefer class-based CSS over inline style for reusable surfaces." Six stable layout properties on the root use inline style, bypassing Tailwind utility generation and theme override. Dynamic values (`animationDuration`, `textWidth`) are correctly kept inline and are not flagged.
- **建议**: Convert stable layout to Tailwind classes (`flex items-center gap-2 px-3 py-2 overflow-hidden`); keep only dynamic values as inline style.
- **复核状态**: ✅ Cluster T — 保留 (P3); re-confirmed live (`notice-bar.tsx:149-155` unchanged).

### [MA-23] `countdown.tsx`: `fontVariantNumeric: 'tabular-nums'` inline instead of Tailwind `tabular-nums` class

- **Files**: `packages/flux-renderers-mobile/src/countdown.tsx:164`
- **Cross-dim sources**: 维度10-07
- **Severity**: P3
- **Evidence**:
  ```tsx
  <span
    className={cn('nop-countdown', props.meta.className)}
    style={{ fontVariantNumeric: 'tabular-nums' }}
  >
  ```
- **现状**: Tailwind has a `tabular-nums` utility. Inline style bypasses it; same theme-doc clause as MA-22.
- **建议**: `className={cn('nop-countdown', 'tabular-nums', props.meta.className)}`.
- **复核状态**: ✅ Cluster U — 保留 (P3); re-confirmed live (`countdown.tsx:164` unchanged).

### [MA-24] `swipe-cell.tsx`: no `user-select: none` during drag (UX nit)

- **Files**: `packages/flux-renderers-mobile/src/swipe-cell.tsx:174-235`
- **Cross-dim sources**: 维度10-06
- **Severity**: P3
- **Evidence**: Grep of the package for `user-select` returns no hits. During a horizontal swipe, the browser highlights/selects text and icons in the content subtree, degrading the follow-feel. `mobile-responsive-baseline.md` does not currently mention `user-select` for mobile-native components, so this is not contractual.
- **建议**: Apply `select-none` to the content pane during `openState !== 'closed'` or `state.isTouching`. If adopted, add a baseline-doc clause.
- **复核状态**: ✅ Cluster W — 保留 (P3); re-confirmed: grep for `user-select` in src returns zero hits.

### [MA-25] Missing markers contract test for the mobile package

- **Files**: `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` (missing); compare `packages/flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx:119-138`, `packages/flux-renderers-data/src/__tests__/data-widget-markers-contract.test.tsx:75-77`
- **Cross-dim sources**: 维度14-01 (root cause enabler for MA-03)
- **Severity**: P3 (test-gap finding distinct from the MA-03 contract violation it enables)
- **Evidence**:
  ```tsx
  // flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx:135-137
  it('no BEM-style region classes exist in page layout', () => {
    expect(container.querySelector('.nop-page__header')).toBeNull();
    expect(container.querySelector('.nop-page__body')).toBeNull();
    expect(container.querySelector('.nop-page__footer')).toBeNull();
  });
  // equivalent test for data package at data-widget-markers-contract.test.tsx:75-77
  // mobile package has NO equivalent test
  ```
- **现状**: Three sibling renderer packages have markers contract tests that hard-enforce the no-BEM rule. The mobile package added 4 renderers with BEM classes (MA-03) without adding an equivalent gate, which is why the violation reached master.
- **建议**: Add `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx` mirroring the basic/data pattern. Assert no `.nop-mobile-type__region` and no `.nop-mobile-type--modifier` classes; assert `data-slot` / `data-status` / `data-variant` correctly emitted.
- **复核状态**: ✅ Cluster S-14-01 — 保留 (P3); re-confirmed: mobile package still has **no** `__tests__/` directory; every sibling package ships a markers-contract test.

---

## Rejected findings (1 batch)

- **Redundant hand-written `useCallback` / `useMemo` across all 5 renderers + `use-touch.ts`** (维度09-01E, 09-02D, 09-04D, 09-04E, 09-09B, 09-09C): **驳回**. `docs/skills/react19-best-practices-review.md:190-203` explicitly classifies existing hand-written memo as "不影响正确性，只是代码风格收敛" and "不要当成高优先级重构任务." With no `eslint-disable-next-line react-compiler/react-compiler` comments and `react-compiler/react-compiler` at `error`, the compiler accepts these; per the project's own calibration they are informational, not defects.

---

## Dimensions with zero findings

- **维度 02 — Module responsibility & file boundaries**: 零发现. All source files are <250 lines (well under the 500-line warn / 700-line error gates); `index.ts` is a thin 32-line re-export with a 2-line `registerMobileRenderers` glue matching sibling-package convention; `mobile-renderer-definitions.ts` cleanly co-locates the definitions array with its discriminated-union type; `schemas.ts` is a dedicated type module; `hooks/` is not over-split (use-touch has two consumers); `test-support.ts` is correctly excluded from dist via `tsconfig.build.json`. (See review agent's per-file reasoning.)

---

## Recommended follow-ups (ordered by ROI)

1. **Add `.catch` + unmount guard to `pull-refresh.tsx:86` and the three `infinite-scroll.tsx` onLoadMore sites** — closes MA-01, MA-12, MA-14 and the reject-path coverage gap in one stroke. Pair with bug 07's submit-concurrent-guard pattern.
2. **Refactor dispatch-out-of-updater** as a single mechanical pass: compute next state synchronously, `setState(next)`, then dispatch in the handler body. Fixes MA-02 holistically across pull-refresh / swipe-cell / countdown.
3. **Add a mobile markers contract test** mirroring `flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx`. Closes MA-25 and prevents MA-03 from regressing once the BEM classes are deleted.
4. **Delete the BEM class strings** from all 4 renderers (notice-bar, pull-refresh, infinite-scroll, swipe-cell). They are dead-noise (no CSS targets them); `data-slot` already carries the structural identity.
5. **Align InfiniteScrollSchema with its field rules** (add `hasMore`/`loading`/`error`, drop the `as` cast) and **either wire or remove swipe-cell `onAction`** — fixes MA-08 and MA-09.
6. **Forward native events on DOM-entry handlers** (notice-bar `onClick`/`onClose`) and pass structured `{ type, ... }` payloads on semantic events — fixes MA-04.
7. **Move `@keyframes nop-notice-bar-marquee` into package CSS** and migrate notice-bar variant colors to `--nop-*` tokens with `dark:` variants — fixes MA-05, MA-06, and decouples MA-21.
8. **Resolve `use-touch.ts` `onTouchEnd` signature** (drop the unused param) and **export the `useCountdownTimer` interfaces** — fixes MA-11, MA-18.
9. **Add `touch-action` to pull-refresh (`pan-y`) and swipe-cell (`pan-x`)** — fixes MA-07. Optionally tighten baseline doc §5 first.
10. **Add the missing tests** (countdown `reset`/`start`/`millisecond`/targetTime-completion, observer rebuild, touchCancel, marquee true-branch) — fixes MA-15, MA-20.

---

## Related sibling audit

`docs/audits/2026-06-22-2039-open-audit-mobile.md` (open-ended adversarial pass) surfaced 7 additional findings not covered by the dimensions above — most notably OA-01 (notice-bar multi-text rotation is dead code in **every** configuration — a P1-grade logic bug independent of the async cluster), OA-02 (swipe-cell close-after-action contract unimplemented), OA-03 (Chinese-only defaults with no i18n seam), OA-05 (commit-on-`touchcancel`), OA-06 (`useTouch` never calls `preventDefault` — sharpens MA-07 into an active `design.md` contract breach). Treat the two audits as complementary: this multi-dimensional pass covers the dimensions exhaustively; the open-ended pass chases cross-doc contract drift that the fixed checklist cannot reach. All OA findings were re-verified in this `open` revision's live-code pass.
