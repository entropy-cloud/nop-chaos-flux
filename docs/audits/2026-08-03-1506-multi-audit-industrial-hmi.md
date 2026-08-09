> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: industrial-hmi
> Planned Into: `docs/plans/2026-08-04-1235-1-hmi-diff-path-convergence-plan.md` (P1-4, P1-5), `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md` (P1-2, P1-3, P1-8), `docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md` (P1-1, P1-6, P1-7, P1-9); P2 → `docs/components/roadmap-industrial-hmi.md` `## Follow-up Backlog`

# Multi-Dimensional Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-04 · **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/` — code, config, tests, public contracts (exports / API surface) of `@nop-chaos/flux-renderers-industrial` (scada-canvas), cross-referenced against `docs/components/industrial-hmi/design-*.md`, `docs/analysis/industrial-hmi/*` gate reviews, and architecture docs.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design).
**Methodology:** read calibration (`deep-audit-calibration-patterns.md`) + reopened-adjudications + `audit-tooling.md`; ran mechanical gates; dispatched 12 parallel deep-dive sub-agents across dimensions 01/03/04/06/09/14/16/21/22/23 (+03/14/16/21/22/23 second pass); every P0/P1 candidate re-verified against live code by the orchestrator AND by an independent fresh-session review agent (10 candidates re-audited, 9 confirmed P1, 1 downgraded to P2, 0 rejected). Only independently verified findings appear below.

## Mechanical Gates (run at audit time)

| Gate                                                                                                                                                                   | Result                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck`                                                                                                         | PASS                                                                                                                                                                                      |
| `pnpm --filter @nop-chaos/flux-renderers-industrial lint`                                                                                                              | PASS                                                                                                                                                                                      |
| `pnpm --filter @nop-chaos/flux-renderers-industrial build`                                                                                                             | PASS                                                                                                                                                                                      |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test`                                                                                                              | **462 / 462 pass (34 files)**, coverage 95.88% stmts / 90.57% branch                                                                                                                      |
| `pnpm check:workspace-manifest-deps`                                                                                                                                   | **FAIL (exit 1)** — 3 undeclared imports in this package (see P1-1); also pre-existing 5 in form/scheduling                                                                               |
| `check:oversized-code-files`                                                                                                                                           | 3 warnings >500 lines — all test files (`scada-canvas-lifecycle.test.tsx` 582, `scada-engine.test.ts` 536, `refresh-pipeline.test.ts` 527) — no mixed-ownership evidence → not reportable |
| `check:audit-runtime-raw-schema-reads` / `missing-renderer-markers` / `reactive-render-reads` / `fieldframe-bypasses` / `hardcoded-type-dispatch` / `styling-suspects` | 0 hits                                                                                                                                                                                    |
| `check:audit-async-failure-paths`                                                                                                                                      | 8 candidates in package → all verified as structured failure paths (lastError/onError/error codes); none swallowed                                                                        |
| `check:audit-performance-suspects`                                                                                                                                     | 2 hits (`diff.ts:50`, `compound.ts:82` `JSON.stringify` equality) — cold-path diff/cache-key semantics, not hot-path change-detection → not reportable                                    |

## Priority Summary

| Priority                                         | Count   | Drives remediation plan? |
| ------------------------------------------------ | ------- | ------------------------ |
| **P0** (blocking)                                | **0**   | —                        |
| **P1** (material — real defect / contract drift) | **9**   | **Yes**                  |
| **P2** (non-blocking polish / residual cleanup)  | **~30** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 9 P1s.

---

# P1 Findings (must fix — independently re-verified)

## [P1-1] `check:workspace-manifest-deps` hard gate FAILS — 3 undeclared workspace imports

_Justification: hard-gate contract break introduced by this mission's package; `pnpm check` pipeline fails; manifest declares less than the actual import surface._

- **File:** `packages/flux-renderers-industrial/package.json:20-35` vs `src/test-support/renderer-test-support.tsx:14-15`, `src/renderer/scada-points-bridge.test.tsx:5`
- **Evidence:**
  ```ts
  // renderer-test-support.tsx:14-15
  import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  ```
  Command output (run at audit time):
  ```
  [check-workspace-manifest-deps] ERROR: undeclared workspace imports found:
    - packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx: @nop-chaos/flux-formula missing
    - packages/flux-renderers-industrial/src/test-support/renderer-test-support.tsx: @nop-chaos/flux-formula missing
    - packages/flux-renderers-industrial/src/test-support/renderer-test-support.tsx: @nop-chaos/flux-runtime missing
  ```
- **Risk:** `pnpm check` health gate fails; test-support (shared renderer-test harness) has implicit coupling to `flux-formula`/`flux-runtime` factory APIs invisible at manifest level; runtime API changes surface only via test crashes.
- **Suggestion:** add `@nop-chaos/flux-formula` + `@nop-chaos/flux-runtime` to devDependencies (`workspace:*`).
- **False-positive exclusion:** not a mechanical duplicate — the gate demonstrably fails on this package's sources.

## [P1-2] No initial refresh on mount — static/expression point bindings never materialize

_Justification: real core-behavior defect for the most common SCADA config (static tags drive color/state/animation); first frame renders binding-less and never self-heals._

- **File:** `src/renderer/hooks/use-scada-engine.ts:78-152` (mount effect), `src/renderer/hooks/use-scada-config-sync.ts:91-121` (full path), `src/binding/point-store.ts:95-103` (`loadDeclarations` sets `dirty: false`), `src/binding/dirty-collector.ts:185-213`
- **Evidence:**
  ```ts
  // point-store.ts:100  — declarations loaded with dirty=false
  value: initialValue(declaration), dirty: false,
  // requestRender call sites (whole package, grep): ONLY 3 —
  //   use-scada-points-bridge.ts:155 (flux points with values), use-scada-handles.ts:96 (setPointValue), use-scada-engine.ts:120 (test handle)
  // flushFrame (the ONLY place bindings/states get collected) runs solely inside requestRender scheduling
  ```
- **Risk:** a config with static/expression points and no external writer shows base styles only — bound fill, state colors, and `when:'always'` animations never apply, with no self-healing path.
- **Suggestion:** trigger one `pipeline.requestRender(applyAttrs)` at end of the config-sync full path (after reloadBindings); add a regression test asserting a static-point config applies binding values on mount with zero point writes.

## [P1-3] `scada:ready`/onReady double-dispatched on every config application (mount, full reset, non-empty diff)

_Justification: contract drift with user-visible duplicate side effects — onReady actions fire twice per config build._

- **File:** `src/renderer/hooks/use-scada-config-sync.ts:91-121`, `src/renderer/hooks/use-scada-engine.ts:165-181`, `src/renderer/hooks/use-scada-events.ts:128-130`
- **Evidence:**
  ```ts
  // use-scada-config-sync.ts
  } else { ... reloadBindings(...) }        // diff 路径非空时同样 setRuntime
  prevRef.current = config;
  latest.current.onBuilt?.();               // 无条件执行 — full 与空 diff 两路径都触发
  }, [config, runtime, reloadBindings]);    // runtime 变化 → effect 必重跑
  ```
  `reloadBindings` → `setRuntime(next)` (new object) → effect re-runs → `prevRef === config` → strategy `diff` → empty diff → line 114 still fires `onBuilt` → second `notifyReady`.
- **Risk:** user onReady side effects (navigation/init/load) run twice per build; lifecycle test only asserts `dispatch.mock.calls[0]` so the double is masked.
- **Suggestion:** skip `onBuilt` on the empty-diff re-run (guard "already fired for this config"), or only fire on first build; add a call-count regression test (mount/full reset/non-empty diff each dispatch exactly once).

## [P1-4] `nodeById` goes stale after diff updates — states/animations declarations read old nodes

_Justification: diff-path dual-source split — engine-side index diverges from config truth; updated state machines/animations silently ignored until full reset._

- **File:** `src/engine/config-adapter.ts:121-146` (`applyUpdate` never touches `nodeById`), `:28-33` (`getNode` index-hit-first), `src/engine/scada-engine.ts:217-235` (`getSymbolDeclarations` reads `adapter.getNode`)
- **Evidence:**
  ```ts
  private applyUpdate(id: string, patch: Partial<ScadaSymbolNode>): void {
    const leaf = this.registry.get(id);
    ...
    node.set(toNodePatch(node, attrPatch));
    // nodeById 无任何更新 → getNode(id) 返回上次 build 的旧对象
  }
  ```
  `diff.ts:26-27` treats `states`/`animations` as diffable keys, so they enter `updated.patch` — but `getSymbolDeclarations` (consumed by the refresh pipeline's `getStates`/`getAnimations` on the hot path) keeps merging the old node.
- **Risk:** editing a device's fault color/animation via diff silently doesn't take effect; new states never start; removed states keep running.
- **Suggestion:** refresh `nodeById` for updated ids in `applyUpdate` (or rebuild it from the new config after `applyDiff`); add regression test asserting new declarations after a diff update.

## [P1-5] `component:importConfig` bypasses the props-config sync baseline — duplicate symbols on later props change

_Justification: dual writers (handle vs props source) without coordination; import-then-edit flow duplicates scene nodes that never converge._

- **File:** `src/renderer/scada-canvas.tsx:160-165`, `src/renderer/hooks/use-scada-config-sync.ts:85,91-121`, `src/engine/tree-registry.ts:15-20`
- **Evidence:**
  ```ts
  reloadConfig: (config) => {
    const current = runtimeRef.current;
    if (!current) return;
    current.engine.reset(config);        // 场景被替换为 import 的 config
    reloadBindings(config.variables, config.symbols);
    // 不更新 useScadaConfigSync 的 prevRef → 下一次 props 变化 diff 基于过期基线
  },
  ```
  Next props change → `diffScadaConfig(prevRef.旧 props config, 新 props config)` → import-introduced nodes land in `added` → `buildNode` creates new leaves while the old ones remain in the tree (`registry.add` overwrites the by-id index but never removes the old tree node) → duplicated rendering that never converges.
- **Risk:** a normal edit after scene import produces visual duplicates; `status` also never returns to ready after import.
- **Suggestion:** route `importConfig` through the same sync chain (update `prevRef`), or make added-node application idempotent by removing same-id tree nodes first; add a handle-level regression test.

## [P1-6] `applyInitialViewport` fill/center branches use a wrong centering formula

_Justification: mathematically verifiable display-positioning error on public schema fields (`viewport.fit:'fill'`, `viewport.center`); the initial framing is mirrored/offset off-screen except at one coincidental geometry._

- **File:** `src/renderer/hooks/use-scada-config-sync.ts:49-66` vs `src/engine/viewport.ts:54-78`
- **Evidence:**
  ```ts
  // use-scada-config-sync.ts:53 (fill) and :62 (center) — 应为 cx - sw/(2s)
  x: size.width / 2 - (bounds.x + bounds.width / 2) * scale,
  // viewport.ts:64-65 — 引擎自身 fit 公式（正确）
  x: cx - viewport.width / (2 * scale),
  ```
  Engine convention `screen = (world - vx)·s`; centering requires `vx = cx - sw/(2s)`. Implemented `sw/2 - cx·s`. Hand-check sw=800, s=1, cx=50: code x=350 → content 50 renders at -300 (should be 400). The two forms coincide only at `cx = sw/(2s)` — which is exactly the lifecycle test's default geometry (cx=50 = 800/(2·8)), so tests miss it.
- **Risk:** initial viewport framing for `fill`/`center` policies is wrong on essentially all real scenes.
- **Suggestion:** use `cx - size.width/(2*scale)` (or delegate to `engine.fit(bounds, 0)`/`engine.center(bounds)`); add a non-special-case regression test.

## [P1-7] InteractionOverlay renders in the sky layer using world coordinates — misaligned under pan/zoom

_Justification: real display defect in a normal interaction path (hover highlight after zooming/panning the canvas)._

- **File:** `src/engine/interaction-overlay.ts:86-121`, `src/engine/scada-engine.ts:115-117`
- **Evidence:**
  ```ts
  // interaction-overlay.ts:87-88 — sky 层（恒等变换）
  this.group = new Group({ name: 'scada-interaction-overlay' });
  this.engine.app.sky.add(this.group);
  // :105-110 — 直接用图元世界坐标画覆盖物
  const attrs = { x: geometry.x, y: geometry.y, width, height, rotation: node.rotation ?? 0, ... };
  ```
  Only `tree` carries the viewport transform (`tree: { type: 'viewport' }`); `sky` composes at identity (verified in leafer-ui@2.2.9 bundle: zoomLayer belongs to the tree). After pan/zoom, tree symbols move to screen `(world - vx)·s` while overlay stays at `world`.
- **Risk:** hover/press/selected highlight feedback visibly floats off the symbol after any viewport interaction; stroke width also not scale-compensated.
- **Suggestion:** transform overlay geometry via `engine.getViewportPoint(...)` (and divide stroke width by scale); reposition active overlays in the plugin zoom/move sync path; add a non-identity-viewport regression test.

## [P1-8] A single flux expression failure downgrades the whole canvas to error state with no recovery

_Justification: degradation-path contract break — runtime data errors escalate to canvas-level error with no self-recovery; repeated onError per scope update._

- **File:** `src/renderer/hooks/use-scada-points-bridge.ts:130-157`, `src/renderer/scada-canvas.tsx:87-94,145-152`
- **Evidence:**
  ```ts
  // use-scada-points-bridge.ts:137,146
  } catch (error) {
    latest.current.onError?.('flux-compile-failed', errorMessage(error));
    continue;
  }
  // scada-canvas.tsx:151 → onError: handleError → setStatus('error') → 画布整体替换为错误区
  ```
  Recovery path is absent: `handleReady` fires only via config-build (`onBuilt`); scope-data recovery never resets `status`. `design-renderer.md §8.1/§6` scopes onError to config parse/build failures — runtime data evaluation errors are escalated beyond contract. Each scope update re-fires the error (no dedup like the pipeline's `lastError`).
- **Risk:** one bad expression (or a transient missing scope field) blanks the entire SCADA screen; after data recovery the picture does not return without a config change or reload.
- **Suggestion:** degrade per-declaration (skip the failing point, report once), don't touch canvas status; add an error→ready recovery test.

## [P1-9] Programmatic zoom anchor passes content-space point where leafer expects screen-space — scene jump after pan+zoom

_Justification: real browser-only positioning defect (verified against leafer-ui@2.2.9 bundle), masked by the mock's missing matrix side effects._

- **File:** `src/engine/scada-engine.ts:340-355` (`applyViewportState`), `src/test-support/leafer-ui-mock.ts:189-194` (mask), leafer-ui@2.2.9 `web.module.js:8181-8194, 4914-4936, 5045-5047`, `@leafer-in/viewport/src/type/viewport.ts:46`
- **Evidence:**
  ```ts
  // scada-engine.ts:344-345 — 传内容坐标作为 scaleOfWorld 锚点
  const anchor = viewportToWorld(cur, { x: 0, y: 0 }); // 内容/世界坐标
  this.app.tree.zoomLayer.scaleOfWorld(anchor, clamped.scale / cur.scale);
  ```
  Verified in the bundle: `zoomLayerType` getter returns `this.isLeafer ? this['_zoomLayer'] || this : ...` and `_zoomLayer` is never assigned → `tree.zoomLayer === tree`. The viewport plugin itself calls `zoomLayer.scaleOfWorld(e, changeScale)` with the ZoomEvent (screen-space). `scaleOfWorld` → `zoomOfWorld` → `getTempLocal` keeps the given point fixed in **outer (screen) space**. The engine passes a **content** point, so the fixed screen point becomes `(vx, vy)` instead of `(0,0)` → content drifts by `(vx·(1-k), vy·(1-k))` on any scale change with non-zero translation (hand-check: viewport {100,0,2}, zoomAt(·,1.5) → 50px offset). The mock (`MockZoomLayer.scaleOfWorld` only multiplies scaleX/scaleY, never updates x/y) masks this — unit tests only ever verify the scale component.
- **Risk:** wheel zoom is fine (plugin passes screen coords), but every programmatic zoom (`zoomAt`/`fit`/`center`/`setViewport` with scale change) after any pan jumps the scene off-anchor; e2e asserts engine state, not the matrix, so nothing catches it.
- **Suggestion:** pass the screen-space anchor (e.g. `{x:0,y:0}` so leafer's `toInnerPoint` converts to the correct content point), or emit move-then-scale consistently; extend the mock with the real x/y anchoring side effect and add a matrix-level e2e assertion.

---

# P2 Findings (non-blocking polish / residual cleanup — backlog)

## Dependency & packaging (dim 01/03)

- **[P2]** `src/index.ts:2,94` — module-load side effect `registerBuiltinScadaSymbols()`; any `import type` consumer pulls leafer-ui canvas runtime (already caused one repo-wide test break historically). Consider an explicit `registerScadaSymbols()` call aligned with the `registerXxxRenderers` convention.
- **[P2]** `dist/` — stale `scada-canvas-placeholder.*` artifacts from pre-I10 remain in build output (src deleted; `tsc` doesn't clean outDir). Build script should clean `dist` first.

## Public API surface (dim 03)

- **[P2]** `src/index.ts:5-92` — 91 of 94 exported symbols (engine/binding/symbols/viewport internals) have **zero** external consumers; only `registerScadaRenderers`/`ScadaConfig`/`ScadaSymbolNode` are used. Design `design-renderer.md §11` authorizes only register functions + types. Collapse the surface.
- **[P2]** `src/renderer-definitions.ts:14-32` — missing static authoring metadata that sibling packages carry: `propContracts`, `eventContracts`, `componentCapabilityContracts` (9 handles), `rendererClass`. Tooling (inspector/autocomplete/contract-honesty) can't discover the 9 component handles + 5 events.
- **[P3]** `schemas.ts:15` + `renderer-definitions.ts:20` — `defaultSchema` omits the required `config` field → author-less schema renders permanent loading.
- **[P3]** `serialization/serialize.ts` — `serializeScadaConfig` has no live consumers (design-contract function, tests only).

## State & lifecycle (dim 04/06)

- **[P2]** `src/binding/dirty-collector.ts:291-315` — `when:'always'` animations only start for symbols that also declare `states` (the only `animator.start` path is inside `collectStates`); an always-animation on a states-less symbol silently no-ops while validate accepts it.
- **[P2]** `src/renderer/hooks/use-scada-engine.ts:184-193` — `component:destroy` doesn't disconnect the ResizeObserver or cancel the pending resize rAF (unmount cleanup does); destroy keeps the container observed until unmount.
- **[P2]** `src/renderer/hooks/use-scada-engine.ts:113-123` — dev/test `setPointValues` injection closure captures the mount-time pipeline; after a config reload it writes to the destroyed pipeline → perf/e2e injection silently no-ops.
- **[P2]** `src/renderer/hooks/use-scada-points-bridge.ts:134-147` — flux compile/evaluate errors are re-reported on every scope update (no `lastError`-style dedup) → onError storm + status flapping.
- **[P2]** `src/renderer/hooks/use-scada-config-sync.ts:93-120` — full-reset failure (`config-build-failed`) leaves engine tree half-built + bindings old + `prevRef` stale; next diff applies on a corrupted baseline. Suggest forcing `prevRef=undefined` on error.
- **[P2]** `src/engine/event-bridge.ts:92-131` — leafer event handlers have no top-level try/catch; a user-side throw (e.g. bad ActionSchema in `createNormalizedActionEvent`) propagates into leafer's interaction pipeline.

## Display & positioning (dim 21)

- **[P2]** `src/renderer/hooks/use-scada-config-sync.ts:20-37` — `computeSymbolBounds` ignores `custom.points` geometry; polygon-only scenes fit/center at MAX_SCALE (20×) with the shape pinned off-canvas (line/polygon bounds degrade to 0-size; `viewport.ts:58-59` 1e-6 fallback).
- **[P2]** `src/binding/dirty-collector.ts:291-315` + `value-to-state.ts:11-16` — the state-judgment chain never forwards the primary binding's `scale` (`resolveState(declaration, raw)` without options) → judged value diverges from written value when bindings carry `scale`.
- **[P2]** `src/symbols/instrument/{gauge,level,thermometer}.ts` + `base-shapes/text.ts` — `textAlign:'center'` is ineffective on auto-width Text in leafer (no width, no autoSizeAlign → center offset 0); instrument value labels render left-aligned/off-center (verified against leafer TextLayout).
- **[P2]** `src/renderer/scada-canvas.tsx:188-190` — `data-slot="scada-canvas-canvas"` sits on an empty wrapper div, not the leafer canvas element (engine mounts the canvas to the root container); slot-based DOM assertions would target the wrong node.

## Wiring & degradation (dim 22)

- **[P2]** `use-scada-config-sync.ts` + `use-scada-engine.ts:154-162` — `viewport`/`width`/`height` prop changes after mount don't take effect (initial-apply only, diff path deliberately skips; `design-renderer.md §8.3` claims command-style reaction). Document the actual contract or wire a viewport-change effect.
- **[P2]** `use-scada-points-bridge.ts:9-41` — complex flux expressions (`${analog.temp + 1}`) yield no subscription paths → `useScopeSelector` disabled → points never update; failure is silent/opaque to the author.
- **[P2]** `use-scada-points-bridge.ts:109` — `compiledCache` never cleared across config reloads (unbounded growth in long sessions).
- **[P2]** `src/engine/event-bridge.ts:119-131` — `onSymbolHover` dispatches per pointer.move with no same-symbol dedup (hover action storm while hovering one symbol).
- **[P2]** `use-scada-config-sync.ts:114` + `use-scada-events.ts:128-130` — onReady semantic drift: fires on every build incl. diff (part of P1-3; the residual is the doc §8.1 "first-frame" wording).
- **[P2]** `use-scada-handles.ts:62-71` — `component:fit/center` don't implement the documented `not-visible` failure path.
- **[P2]** `scada-errors.ts` + `scada-canvas.tsx:184-185` — error codes are loose strings with no registry/i18n mapping; validate messages surface raw English.
- **[P2]** `scada-canvas.tsx:180-181` — absent `config` renders permanent loading with no empty state (documented behavior, needs explicit doc note).

## Test effectiveness & coverage (dim 23/14)

- **[P2]** `src/test-support/leafer-ui-mock.ts:189-194` — `MockZoomLayer.scaleOfWorld` doesn't model the x/y anchoring side effect of real `zoomOfLocal`; the viewport x-sync branch (`syncViewportFromZoomLayer`) is unverifiable in unit tests (direct mask of P1-9).
- **[P2]** `tests/e2e/scada-perf.spec.ts:158-184` — the "drag pan fps" metric counts only rAF frames, which fire at ~60fps regardless of whether panning actually happens — assertion is "恒真" for the pan half (render-throughput metric is meaningful). Assert viewport change as the pan-effectiveness proof.
- **[P2]** `src/engine/batch-add-probe.ts` — 0% coverage (I14.1 benchmark probe never executed by any test; timing values can't be asserted but shape/count/ratio can).
- **[P2]** e2e assertions are predominantly scene-tree property reads via `window.__flux_scada_<cid>` (design-approved channel); a renderer-wide black-screen would still pass most specs — add at least one canvas-pixel or DOM-canvas existence assertion per spec family.
- **[P2]** Coverage gaps: `scada-engine.ts:318,367` (`cacheImage`/`measureAddStrategies` projection), `use-scada-engine.ts` `setPointValues` injection channel, `use-scada-config-sync.ts` `onBuildError` catch, `use-scada-handles.ts` center-no-config, `validate.ts` 17 error branches, `expression-evaluator.ts` 14 error branches, switch OFF-position applyProps.
- **[P2]** `scada-canvas-smoke.test.tsx` — doesn't call `resetLeaferMock()` (only consumer file that skips it; latent trap for future innerId assertions).

## Documentation drift (dim 16)

- **[P2]** `design-renderer.md:179,258` — `data-slot="scada-canvas-overlay"` declared but never rendered (hover overlay lives in the leafer sky layer).
- **[P2]** `design-renderer.md:157` — point-table diff documented as `setPointValues` incremental path; implementation rebuilds the whole binding domain (`reloadBindings`).
- **[P2]** `design-renderer.md:257` — canvas marker listed as "—" but code emits `nop-scada-canvas-canvas` (with CSS).
- **[P2]** `design-renderer.md:235` — `not-visible` failure path documented but unimplemented (see above).
- **[P2]** `design-engine.md:203-204` — `ready`/`error` listed as engine events; they are renderer-layer `scada:ready`/`scada:error` action dispatches.
- **[P2]** `design-engine.md:220-229`, `design-symbols.md:80` — `ScadaTestHandle` and `SymbolCreateContext.engine` typed `unknown` in code (docs show strong types; likely circular-import constraint, needs a doc note).
- **[P2]** `design-symbols.md:85` — `registerScadaSymbol` documented "idempotent"; implementation throws on duplicate registration.
- **[P2]** `docs/components/index.md:341-357` — registered-domain-renderer list omits `scada-canvas` (registered + wired into playground).

---

# Per-Dimension Coverage Summary

| Dim                    | Result                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Dependency graph    | 1 P1 (manifest gate) + 2 P2; dep graph otherwise compliant (leafer 2.2.9 locked, no private paths, no cycles, test-support excluded from dist)                                                     |
| 03 API surface         | 0 P0/P1 — registration protocol, props two-way alignment, 9 handles, 5 events, exports map all confirmed; 2 P2 (surface bloat, static metadata)                                                    |
| 04 State ownership     | 3 P1 (initial refresh, ready double-dispatch, nodeById stale) + 1 P1 (importConfig) + P2s; no props→state mirrors, no per-point React writes                                                       |
| 06 Async safety        | 0 P0/P1 — all 8 suspect catch sites are structured failure paths; P2s (destroy cleanup, stale injection closure, error dedup, reset failure split)                                                 |
| 09 Renderer contract   | Rating B — compile-once gate clean, standard hooks only, no raw-schema reads; 3 P2 (empty-region params, config allowSource, marker table)                                                         |
| 14 Test coverage       | 1 P2 after independent review (batch-add-probe 0%, dev/test probe) + P2 branch gaps; isolation clean; I13-I15 behaviors have regression tests                                                      |
| 16 Doc-code            | 0 P0/P1; quick-reference/architecture docs clean; 9 P2 drifts (slot, diff path, markers, not-visible, event owner, unknown types, idempotency, index list)                                         |
| 21 Display/positioning | 2 P1 (initial viewport formula, overlay sky-layer coords) + 4 P2; viewport core math (worldToViewport/zoomAt/fit/center/clamp), hit chain, M-1/M-2/M-3 fixes all verified correct                  |
| 22 Integration wiring  | 1 P1 (canvas-wide degrade) + 8 P2; all 6 wiring chains verified connected (config/viewport/points/events/handles/three-state)                                                                      |
| 23 Test effectiveness  | 1 P1 (zoomLayer anchor drift masked by mock — the only mock↔real deviation found) + P2s (pan-fps metric, scene-tree assertion channel); event/getByPoint mock shapes confirmed correct post-gate-3 |

# Cross-Cutting Patterns

1. **First-frame semantics gap (P1-2, P1-3):** the binding pipeline and the ready lifecycle are both write-driven — nothing ever runs the "initial state" pass. `flushFrame`'s designed `synced=false` full-sync (dirty-collector.ts:187-193) is unreachable without a render request, and `onBuilt` fires for diff re-runs it shouldn't. Both are "first render is wrong/duplicated" siblings of the same wiring origin.
2. **Diff-path state divergence (P1-4, P1-5, P2-16-02):** incremental application was implemented for tree nodes but not for the indexes/declarations/baselines that consume config (`nodeById`, `prevRef`, point-table declarations). Three separate consumers now silently read stale state after a diff.
3. **Mock↔real drift is the recurring blind spot (P1-9, P2-23-01):** exactly the gate-3 lesson (M-1/M-2/M-3) reappears in the zoomLayer matrix — the mock models the write surface but not the transform semantics, so command-path defects are invisible to 462 green unit tests. The e2e layer asserts engine state, not matrix/pixel outcomes, so the second line of defense also misses it.
4. **Command/handle vs props dual-writer (P1-5, P2-22-01):** imperative handles (`importConfig`, viewport) and the declarative props baseline are not unified; each bypass creates a divergence with no reconciliation.
5. **Degradation escalation (P1-8):** runtime data-plane errors are routed through the config-plane error channel (canvas-level error state), conflating "bad config" with "bad data at runtime".

# Conclusion

`flux-renderers-industrial` is mechanically healthy — typecheck/lint/build all pass, 462/462 tests green, coverage 95.88%, and the core contracts (registration protocol, props alignment, 9 handles, 5 events, serialization, 24 built-in symbols, leafer version locking) are consistently documented and wired. The prior 4 review gates (I1/I3/I7/I12) genuinely fixed their scoped issues; no P0 remains.

This audit surfaces **9 NEW P1s** and ~30 P2s. The P1 cluster splits into three families: (a) first-frame/initial-state wiring gaps (P1-2, P1-3), (b) diff-path state divergence and dual-writer coordination (P1-4, P1-5), and (c) display/math defects — the initial viewport formula, the sky-layer overlay, the zoomLayer anchor-space mismatch (P1-6, P1-7, P1-9) — plus (d) the manifest gate failure (P1-1) and the canvas-wide error escalation (P1-8). The mock↔real zoomLayer drift (P1-9) is the most consequential: it is a real browser-only defect that 462 unit tests cannot see. A remediation plan should target the 9 P1s; P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
