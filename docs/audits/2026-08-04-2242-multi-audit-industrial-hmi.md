> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: industrial-hmi
> Planned Into: `docs/plans/2026-08-04-2242-1-hmi-diagnostic-channel-wiring-plan.md` (P1-1 onError + P1-2 onHandlerError). P2 findings triaged to `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog (2026-08-04-2242 子节).

# Multi-Dimensional Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-04 · **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/` — code, config, tests, public contracts (exports / API surface) of `@nop-chaos/flux-renderers-industrial` (scada-canvas), cross-referenced against `docs/components/industrial-hmi/design-*.md`, `docs/plans/2026-08-04-12{35,58}-*`, and architecture docs.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design).
**Methodology:** read calibration docs + reopened-adjudications + audit-tooling; ran mechanical gates; dispatched 4 parallel deep-dive sub-agents across dimensions 03/04/07/14/16/21/22/23; **every P0/P1 candidate re-verified by the orchestrator against live code** (both new P1s traced to the exact lines in `scada-canvas.tsx` / `use-scada-engine.ts` / `use-scada-points-bridge.ts` / `scada-engine.ts` / `event-bridge.ts`). Only independently verified findings appear below.
**Context:** post-remediation audit. Prior audit `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md` found 9 P1s; remediation plans `docs/plans/2026-08-04-1235-{1,2,3}-*` and `docs/plans/2026-08-04-1558-{1,2,3}-*` (all marked completed) targeted them. This audit verifies those closures and surfaces residuals / new defects introduced by the remediation work.

## Mechanical Gates (run at audit time)

| Gate                                                                                                                                                                 | Result                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck`                                                                                                       | PASS                                                                                                                                       |
| `pnpm --filter @nop-chaos/flux-renderers-industrial lint`                                                                                                            | PASS                                                                                                                                       |
| `pnpm --filter @nop-chaos/flux-renderers-industrial build`                                                                                                           | PASS                                                                                                                                       |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test`                                                                                                            | **562 / 562 pass (40 files)**                                                                                                              |
| `pnpm check:workspace-manifest-deps`                                                                                                                                 | FAIL — **0 undeclared imports in this package** (P1-1 closed); 5 pre-existing failures in form/scheduling only                             |
| `check:audit-suspects` (reactive-render-reads / runtime-raw-schema-reads / missing-renderer-markers / styling-suspects / async-failure-paths / performance-suspects) | 0 actionable hits in package (cold-path `JSON.stringify` equality in `diff.ts:50`, `compound.ts:82`; structured `catch` paths in 11 sites) |
| `pnpm check:oversized-code-files`                                                                                                                                    | No warnings for this package post-remediation                                                                                              |

## Priority Summary

| Priority                                                                                                      | Count   | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / failing-or-absent test for changed behavior) | **0**   | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                        | **2**   | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc line-number rot, wording, naming consistency, cosmetic nits)      | **~22** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 2 P1s.

---

# Prior P1 Verification (all 9 confirmed FIXED in live code)

| Prior ID | Title                                                     | Status           | Live-code proof site                                                                                                                                                                 |
| -------- | --------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1-1     | manifest gate undeclared imports                          | **FIXED**        | `package.json:32-37` declares `@nop-chaos/flux-formula` + `@nop-chaos/flux-runtime` devDeps; gate shows 0 hits for this package.                                                     |
| P1-2     | no initial refresh on mount                               | **FIXED**        | `use-scada-engine.ts` `reloadBindings` triggers `pipeline.requestRender(applyAttrs)` after rebuild; regression at `scada-canvas-lifecycle-wiring.test.tsx`.                          |
| P1-3     | `scada:ready`/onReady double-dispatch                     | **FIXED**        | `use-scada-config-sync.ts:203-206` empty-diff branch updates `prevRef` only, does NOT call `latest.current.onBuilt?.()`.                                                             |
| P1-4     | `nodeById` goes stale after diff                          | **FIXED**        | `config-adapter.ts:75-83, 158-163` `applyDiff`/`applyUpdate` reconcile `nodeById` against `nextConfig`; engine reads fresh nodes.                                                    |
| P1-5     | `component:importConfig` bypasses props-config baseline   | **FIXED**        | `scada-canvas.tsx:193-197` routes via `syncImported`; `use-scada-config-sync.ts:227` updates `prevRef.current = imported`; `pendingSkipRef` suppresses self-induced re-run.          |
| P1-6     | viewport fill/center wrong centering formula              | **FIXED**        | `use-scada-config-sync.ts:97-113` uses `bounds.x + bounds.width/2 - size.width/(2*scale)` (= `cx - sw/(2s)`); hand-checked for non-special-case geometry.                            |
| P1-7     | InteractionOverlay renders in sky layer with world coords | **FIXED**        | `interaction-overlay.ts:90` Group `hittable:false`; `:130-138` uses `getViewportPoint` + `width*scale`/`height*scale`; `refresh()` wired in 3 hooks (`scada-engine.ts:370,440,446`). |
| P1-8     | canvas-wide degrade on single flux expression failure     | **FIXED (core)** | `scada-canvas.tsx:175-184` does NOT pass `onError` to `useScadaPointsBridge` (no escalation to canvas status). **Residual observability gap → new P1-1 below.**                      |
| P1-9     | programmatic zoom anchor uses content-space point         | **FIXED**        | `scada-engine.ts:359, 436` both pass `{x:0,y:0}` screen origin; `leafer-ui-mock.ts:198-199` models the real `zoomOfLocal` x/y side effect; matrix-level unit + e2e assertions added. |

---

# P1 Findings (must fix — independently re-verified by orchestrator)

## [P1-1] `useScadaPointsBridge` `onError` channel never wired in `scada-canvas.tsx` — flux expression errors silently swallowed in production

_Justification: contract drift — the hook declares `onError?`, the package registers `flux-compile-failed`/`flux-evaluate-failed` in `SCADA_ERROR_CODES` with i18n mappings, plan `2026-08-04-1235-2` Phase 5 promised "走 onError 单次上报", but the production renderer never subscribes; the dedup machinery computes values that nothing consumes. Tests pass only because they inject `onError` directly, masking the production gap._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:175-184` (omission)
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:179` (`onError?` arg), `:223-227` (`reportOnce` dedup)
  - `packages/flux-renderers-industrial/src/renderer/scada-errors.ts` (`SCADA_ERROR_CODES` registry)
- **Evidence:**

  ```ts
  // scada-canvas.tsx:175-184 — useScadaPointsBridge invoked with NO onError:
  useScadaPointsBridge({
    config: parsedConfig,
    runtime,
    enabled: runtime !== null && parsedConfig !== undefined,
    expressionCompiler: rendererRuntime.expressionCompiler,
    env: rendererRuntime.env,
    // P1-8 降级契约：flux 数据错误（编译/求值失败）按声明跳过 + 单次去重上报（hook 内 onError），
    // 不直通 handleError——数据错误不升级画布级 error（§8.1 onError 仅限 config 校验/构建失败），
    // (no `onError:` property anywhere in this call)
  });

  // use-scada-points-bridge.ts:223-227 — dedup runs but channel is severed:
  const reportOnce = useCallback((expression, code, error) => {
    if (lastReportedErrors.current.get(expression) === code) return;
    lastReportedErrors.current.set(expression, code);
    latest.current.onError?.(code, errorMessage(error)); // undefined in production renderer
  }, []);
  ```

  Hook-level tests inject `onError: (code, message) => errors.push(...)` (`scada-points-bridge.test.tsx:437, 500, 551`), so the regression suites are silent on the production gap.

- **Severity:** **P1**
- **Status:** P1-8's core contract (canvas stays `ready`, failing declaration skipped, scope repair recovers) is fulfilled — the residual gap is that the remediation plan's promised "single dedup report via onError" was implemented at the hook layer but the React renderer never subscribes a host-side consumer. Flux compile/evaluate failures are dropped on the floor with zero author/host visibility.
- **Risk:** A SCADA author whose `${analog.temp}` expression has a typo, or whose scope path is wrong, gets zero feedback — the bound symbol silently keeps its prior value and there is no log, no `scada:error`, no devtools signal; debugging requires reading source. This replaces the pre-fix "visible wrong" (canvas-wide error) with "invisible nothing".
- **Suggestion:** From `scada-canvas.tsx`, wire a non-status-escalating channel — e.g. `onError: (code, message) => { if (import.meta.env?.DEV) console.warn('[scada-canvas]', code, message); }`, a host telemetry call via `RendererEnv`, or a new `props.events.onDiagnostic` channel. Add a production-renderer regression test (not a hook-direct test) that asserts a flux compile error is surfaced through the chosen channel.
- **False-positive exclusion:** Not a deliberate silent-fail design — the registered i18n keys (`industrial.scada.error.flux-compile-failed` / `flux-evaluate-failed`) demonstrate clear intent to be observable. v1 baseline: live code already entered the public `SCADA_ERROR_CODES` surface and the i18n namespace.

## [P1-2] `onHandlerError` channel never wired in `useScadaEngine` — user-side throws inside `onSymbolClick`/`onSymbolHover`/etc. silently swallowed

_Justification: same family as P1-1 — the engine layer has full dedup infrastructure (`reportedHandlerErrors` Set + `safeRun` try/catch + `reportHandlerError`), `handler-error` is registered in `SCADA_ERROR_CODES` with i18n mapping, plan `2026-08-04-1558-2` SL-5/m3 installed it, but the React layer never connects a host consumer. Worse than P1-1: `UseScadaEngineArgs` doesn't even expose the field, so the channel is severed at the type level._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:27-37` (`UseScadaEngineArgs` — no `onHandlerError`), `:130-140` (`ScadaCanvasEngine.create` call omits it)
  - `packages/flux-renderers-industrial/src/engine/scada-engine.ts:71` (`onHandlerError?` declared), `:407` (passed to EventBridge)
  - `packages/flux-renderers-industrial/src/engine/event-bridge.ts:153-166` (`safeRun` + `reportHandlerError` dedup)
  - `packages/flux-renderers-industrial/src/renderer/scada-errors.ts` (`handler-error` in `SCADA_ERROR_CODES`)
- **Evidence:**

  ```ts
  // use-scada-engine.ts:27-37 — UseScadaEngineArgs has onEngineError but NOT onHandlerError:
  export interface UseScadaEngineArgs {
    containerRef: RefObject<HTMLElement | null>;
    cid?: number;
    exposeTestHandle?: boolean;
    interactionLayer?: boolean;
    width?: number;
    height?: number;
    onSymbolEvent?: (name, payload) => void;
    getPointValuesFor?: (symbolId) => Record<string, unknown> | undefined;
    onEngineError?: (code: string, message: string) => void;
    // NO onHandlerError field
  }

  // use-scada-engine.ts:130-140 — ScadaCanvasEngine.create args lack onHandlerError:
  engine = ScadaCanvasEngine.create({
    container, cid, exposeTestHandle, interactionLayer, width, height, pointStore,
    onSymbolEvent: (name, payload) => latest.current.onSymbolEvent?.(name, payload),
    getPointValuesFor: (symbolId) => latest.current.getPointValuesFor?.(symbolId),
    // no onHandlerError
  });

  // event-bridge.ts:161-166 — dedup tracks but report is undefined:
  private reportHandlerError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (this.reportedHandlerErrors.has(message)) return;
    this.reportedHandlerErrors.add(message);
    this.options.onHandlerError?.(error);   // undefined in production renderer
  }
  ```

- **Severity:** **P1**
- **Status:** Plan `2026-08-04-1558-2` Phase 2 (SL-5/m3) installed the engine/binding channel and the dedup, but the React layer never connects a host consumer. The throw-isolation half of the contract (no exception bubbles into leafer's interaction pipeline) works; the report-half is observability-dead.
- **Risk:** A bad action in `onSymbolClick` (e.g. typo'd expression in `createNormalizedActionEvent`, malformed ActionSchema) is swallowed after one occurrence; the click appears non-functional with no diagnostic. Author has no way to learn that their event handler threw.
- **Suggestion:** (a) Add `onHandlerError?: (error: unknown) => void` to `UseScadaEngineArgs`; (b) forward it to `ScadaCanvasEngine.create`; (c) wire from `scada-canvas.tsx` to a non-escalating diagnostic (same channel as P1-1). Add a regression test that asserts the renderer surfaces a thrown user action.
- **False-positive exclusion:** `handler-error` registered in `SCADA_ERROR_CODES` + i18n mapping for `industrial.scada.error.handler-error` demonstrate intent to be observable. The dedup machinery (`reportedHandlerErrors` Set) was deliberately built — leaving its output unwired is incomplete delivery, not deliberate design.

---

# P2 Findings (non-blocking polish / residual cleanup — backlog)

## State & lifecycle (dim 04/07)

### [P2] RefreshPipeline has no destroyed guard — stale `runtime` closure can reactivate destroyed pipeline

- **File:** `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:213-221` (`RefreshPipeline.requestRender`), `:223-232` (`destroy`), `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:229-272` (eval effect with `runtime` in deps)
- **Justification:** real-but-currently-inert stale-closure window on every config reload; the only reason it doesn't visibly misbehave is the engine/pointStore are shared across reloads.
- **Evidence:**
  ```ts
  // dirty-collector.ts:213 — no destroyed flag
  requestRender(applyAttrs: ApplyAttrs): void {
    if (this.frameScheduled) return;
    this.frameScheduled = true;
    this.cancelFrame = this.scheduleTick(() => { ... this.flushFrame(applyAttrs); });
  }
  ```
  Config change → `useScadaConfigSync` effect (declared earlier) destroys OLD pipeline → `useScadaPointsBridge` eval effect runs in same commit batch with OLD `runtime` closure → OLD `pipeline.requestRender(...)` schedules a tick → tick fires after re-render → `flushFrame` on destroyed pipeline drains shared `pointStore` and writes to shared engine.
- **Severity:** P2
- **Risk:** Pattern is fragile: if anyone adds a destroyed check to `engine.applyAttrs`, the stale closure becomes a hard failure; OLD pipeline also "steals" NEW pipeline's first-frame work, masking future regression tests.
- **Suggestion:** Add `destroyed` flag on `RefreshPipeline` and gate `requestRender`/`flushFrame` on it (mirror `DirtyCollector.destroyed` at `dirty-collector.ts:42,67`); or make `useScadaPointsBridge`'s eval effect read `runtime` via a ref.

### [P2] `DirtyCollector.destroyed` flag inconsistent — `requestRender` honors it, `collect`/`flush`/`flushFrame` bypass it

- **File:** `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:42, 48-59, 67, 78-87, 90-95`
- **Justification:** half-gated state is the worst of both — future code adding a destroyed guard to `RefreshPipeline.requestRender` will still see zombie flushes via direct `collect`+`flush`.
- **Evidence:**
  ```ts
  // :67 — requestRender honors destroyed
  requestRender(onFrame?: () => void): void {
    if (this.frameScheduled || this.destroyed) return;
    ...
  }
  // :48 — collect does NOT check destroyed
  collect(entries: CollectedEntry | CollectedEntry[]): void {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) { ... this.pending.set(...) }
  }
  // :78 — flush does NOT check destroyed
  flush(applyAttrs: ApplyAttrs): boolean { ... applyAttrs(attrs); ... }
  ```
- **Severity:** P2
- **Suggestion:** Either gate `collect` and `flush` on `this.destroyed` (symmetric with `requestRender`), or remove the flag entirely and document post-destroy calls are caller-managed.

### [P2] `releaseRuntime` double-destroys the collector (redundant, relies on idempotency)

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:112-115` (`releaseRuntime`), `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:227`
- **Justification:** code-smell signalling ownership confusion; latent footgun if `RefreshPipeline.destroy` ever stops destroying its collector or if a future collector implementation has non-idempotent destroy.
- **Evidence:**
  ```ts
  // use-scada-engine.ts:112-115
  current.pipeline.destroy(); // (A) → RefreshPipeline.destroy → this.options.collector.destroy()
  current.animator.destroy();
  current.collector.destroy(); // (B) → DirtyCollector.destroy() AGAIN on the same instance
  current.engine.destroy();
  ```
- **Severity:** P2
- **Suggestion:** Pick one owner — either pipeline owns collector lifetime (remove `(B)`) or runtime owns it (remove `:227`).

### [P2] `pendingSkipRef` counter can leak when props `config` identity changes during `syncImported` self-induced re-run

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:172-180, 220-245`
- **Justification:** reachable in normal operation (host expression sources re-evaluate to fresh object identities on any scope change); an erroneously-skipped sync leaves canvas on imported scene while `prevRef` advances silently.
- **Evidence:**
  ```ts
  // syncImported sets pendingSkip=1 and remembers props config at import time
  lastImportBaselineRef.current = latest.current.config;
  pendingSkipRef.current += 1;
  prevRef.current = imported;
  currentRuntime.engine.reset(imported);
  reload(...);  // → setRuntime → re-render
  // effect re-run guard — only fires when config identity still matches baseline
  if (pendingSkipRef.current > 0 && config === lastImportBaselineRef.current) {
    pendingSkipRef.current -= 1;
    return;
  }
  ```
- **Severity:** P2
- **Suggestion:** Tie the skip token to a per-import nonce (incrementing counter compared by value, not config identity); or drop the skip mechanism and make `syncImported` set `prevRef` defensively so the empty-diff re-run is genuinely a no-op.

### [P2] `lastReportedErrors` Map never cleared across config reloads — unbounded growth + cross-config contamination

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:212, 218-221`
- **Justification:** asymmetric with sibling `compiledCache` clear pattern; becomes observable defect if P1-1 is fixed by wiring an onError channel — stale entries from a prior config suppress legitimate new reports for the same expression text.
- **Evidence:**
  ```ts
  const lastReportedErrors = useRef(new Map<string, string>());
  useEffect(() => {
    compiledCache.current.clear();
  }, [config]);
  // no equivalent clear for lastReportedErrors
  ```
- **Severity:** P2
- **Suggestion:** Add `lastReportedErrors.current.clear()` to the existing `compiledCache` clear effect.

### [P2] `useScadaHandles` effect re-runs every render due to inline `reloadConfig` (unstable identity)

- **File:** `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:193-197`, `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-handles.ts:147`
- **Justification:** pure performance/churn — every parent re-render creates a new `reloadConfig` arrow → effect re-runs → registry unregisters/re-registers the handle. Sibling args (`destroy`, `onDestroyed`) are explicitly `useCallback`-stabilized, so the inline `reloadConfig` is an inconsistency rather than a deliberate pattern.
- **Evidence:**
  ```ts
  // scada-canvas.tsx:193-197 — inline arrow, new identity every render
  reloadConfig: (config) => {
    const current = runtimeRef.current;
    if (!current) return;
    syncImported(config);
  },
  // use-scada-handles.ts:147 — reloadConfig in deps
  }, [componentRegistry, id, cid, runtime, destroy, onDestroyed, reloadConfig]);
  ```
- **Severity:** P2
- **Suggestion:** Wrap `reloadConfig` in `useCallback([], ...)` (its body only closes over stable `runtimeRef` + already-stable `syncImported`).

## Display & positioning (dim 21)

### [P2] `computeSymbolBounds` only honors explicit `custom.points` — default-triangle polygon and zero-height line still fit at MAX_SCALE (20×)

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:48-85`, `packages/flux-renderers-industrial/src/symbols/base-shapes/polygon.ts:7-11,32,35-37`, `packages/flux-renderers-industrial/src/symbols/base-shapes/line.ts:26-33`
- **Justification:** partial fix from plan `{3}` Phase 1 (targeted explicit-`custom.points` only); polygon-only scene without explicit `custom.points` still degrades to MAX_SCALE.
- **Evidence:**
  ```ts
  // use-scada-config-sync.ts:56-58 — only reads node.custom?.points:
  function boundsFromCustomPoints(node: ScadaSymbolNode): Bounds | undefined {
    const raw = node.custom?.points;
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
  // polygon.ts:7-11 — DEFAULT_TRIANGLE lives in create() closure, not in node.custom.points:
  const DEFAULT_TRIANGLE = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 86 }];
  // polygon.ts:35-37 — customPoints from props only; default applied to attrs.points
  const customPoints = props.custom?.points;
  attrs.points = Array.isArray(customPoints) ? customPoints : DEFAULT_TRIANGLE;
  // line.ts:26,33 — points derived from width/height (default w:100, h:0)
  defaults: { x: 0, y: 0, width: 100, height: 0, ... },
  attrs.points = [0, 0, width, height];
  ```
- **Severity:** P2
- **Suggestion:** Either extend `boundsFromCustomPoints` to consult `getScadaSymbolDefinition(node.type)` and use the definition's default points, or add `width`/`height` defaults to polygon. Add focused regression test asserting `scale < MAX_SCALE` for a polygon-only config without explicit `custom.points`.

### [P2] `scada-text` `align: 'center'` centering fix landed only on instruments — base text shape still inert

- **File:** `packages/flux-renderers-industrial/src/symbols/base-shapes/text.ts:27-37`, `packages/flux-renderers-industrial/src/symbols/instrument/{gauge,level,thermometer}.ts` (fixed)
- **Justification:** plan `{3}` Phase 1 explicitly listed `text.ts` in scope but only instruments received the explicit-width main path; base `scada-text` still relies on leafer `autoSizeAlign` which is inert without `layoutWidth` (verified against installed leafer-ui@2.2.9 dist).
- **Evidence:**
  ```ts
  // text.ts:27-37 — no width set; just textAlign forwarding
  defaults: { x: 0, y: 0, text: '', textColor: '#000000', textSize: 14 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (props.align !== undefined) attrs.textAlign = props.align;
    // no measureText, no explicit width injection
    return new Text(attrs);
  },
  // instrument-symbols.test.ts:314-325 — Phase-1 fix verified ONLY for instruments
  ```
- **Severity:** P2
- **Suggestion:** Document the explicit-width requirement as a hard contract for `scada-text` centering + add validate-time warning when `align:'center'` is set without `width`, or implement measureText-based width in `text.ts create`.

### [P2] Wheel-zoom clamp fallback uses screen origin (`{0,0}`) instead of cursor anchor — content visually shifts when scale exceeds bounds

- **File:** `packages/flux-renderers-industrial/src/engine/scada-engine.ts:425-441`
- **Justification:** minor UX edge case at extreme scales only; functional behaviour (clamping, eventual viewport correctness) is intact.
- **Evidence:**
  ```ts
  private readonly handlePluginZoom = (): void => {
    const rawScale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale);
    const clamped = clampScale(rawScale);
    if (clamped !== rawScale) {
      // re-clamp anchored at screen origin — NOT at the wheel event's cursor position
      this.app.tree.zoomLayer.scaleOfWorld({ x: 0, y: 0 }, clamped / rawScale);
    }
    ...
  };
  ```
- **Severity:** P2
- **Suggestion:** Capture last wheel event's screen coords (engine already subscribes to `tree.on('zoom')`) and pass them as the clamp anchor. Add e2e assertion that wheel-zoom beyond MAX_SCALE preserves the cursor's world point.

### [P2] `viewport` prop changes silently ignored post-mount — asymmetry with `width`/`height`

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:165-217`, `docs/components/industrial-hmi/design-renderer.md:232`
- **Justification:** real ambiguity — `design-renderer.md §8.3` was clarified ("保持现状契约，不自动重应用") but the older "command-style reaction" wording still leaves room for author confusion; `width`/`height` ARE reactive so the asymmetry is non-obvious.
- **Evidence:**
  ```ts
  // use-scada-config-sync.ts:175-217 — effect deps are [config, runtime, reloadBindings]; NOT viewport
  useEffect(() => {
    ...
    if (strategy === 'full') {
      applyInitialViewportState(runtime, config, latest.current.viewport);  // only full path applies
      ...
    }
    ...
  }, [config, runtime, reloadBindings]);
  ```
- **Severity:** P2
- **Suggestion:** Either reword §8.3 to explicitly call out the asymmetry ("`width`/`height` reactive; `viewport` policy only on full/reset"), or wire an effect that re-applies viewport policy when `viewport` prop identity changes AND no user viewport mutation has occurred (track via a ref).

## Wiring (dim 22)

### [P2] Complex-expression subscription path silently disables on platform collector failure — no documented recovery

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:57-86, 100-131, 198-210`
- **Justification:** plan `{2}` Phase 3 WD-2 added the probe-based extractor; silent-failure path is the residual gap; common cases work if the platform collector supports them.
- **Evidence:**
  ```ts
  // extractExpressionDepsViaProbe returns [] on ANY of these failure paths:
  try { compiled = compiler.compileValue(expression); } catch { return []; }
  if (compiled.kind !== 'dynamic') return [];
  try { state = compiler.createState(compiled); } catch { return []; }
  try { compiler.evaluateWithState(compiled, probeScope, env, state); } catch { return []; }
  ...
  // consumer:
  const scopeData = useScopeSelector(..., { enabled: enabled && paths.length > 0, fallback: {}, paths });
  ```
  When `paths.length === 0`, `useScopeSelector` is disabled; the inner effect never re-runs on scope updates. The author's complex expression silently evaluates against `{}` forever.
- **Severity:** P2
- **Suggestion:** Add an integration test exercising the live `expressionCompiler` against representative complex expressions and asserting non-empty paths. If paths come back empty for an expression that demonstrably reads scope, emit a one-shot `flux-deps-empty` diagnostic via the same channel as P1-1.

### [P2] `ConfigAdapter.setConfig` is dead code with stale-index footgun

- **File:** `packages/flux-renderers-industrial/src/engine/config-adapter.ts:45-47`
- **Justification:** pre-existing dead code; a future contributor calling `setConfig` to "quickly update the config reference" would skip tree rebuild + `nodeById` refresh, reintroducing a P1-4-shaped stale-index defect.
- **Evidence:**
  ```ts
  setConfig(config: ScadaConfig): void {
    this.config = config;
  }
  ```
  Repo-wide grep for `adapter\.setConfig|\.setConfig\(` returns zero hits outside the declaration.
- **Severity:** P2
- **Suggestion:** Delete `setConfig` (no live consumer; not mentioned in any design doc; not a host-tooling contract like `serializeScadaConfig`), or rename to `setConfigReference` with an inline note that it does not refresh any index.

## Test effectiveness (dim 14/23)

### [P2] `MockApp.tree.zoomLayer` is a separate instance, not `app.tree` itself — latent drift from real leafer identity

- **File:** `packages/flux-renderers-industrial/src/test-support/leafer-ui-mock.ts:210, 219-228, 297-325`
- **Justification:** real leafer has `tree.zoomLayer === tree` (P1-9 evidence verified in bundle); mock separates them, so any future production code reading `tree.scaleX/x/y/worldBox` directly (instead of `tree.zoomLayer.*`) would see identity in mock but viewport transform in real. No current consumer, but a footgun.
- **Evidence:**
  ```ts
  // MockLeafer constructor unconditionally creates a separate zoomLayer:
  this.zoomLayer = new MockZoomLayer({ name: 'zoomLayer' }); // line 223
  // real leafer: tree.zoomLayer === tree (getter returns this['_zoomLayer'] || this)
  ```
- **Severity:** P2
- **Suggestion:** Make `MockLeafer.zoomLayer` return `this` when no explicit zoomLayer is set (mirror the real getter), or add an invariant comment + lint guard.

### [P2] `MockLeaf`/`MockGroup` do not model `getBoundsToWorld`/`worldBox`/`getBounds()` — latent drift

- **File:** `packages/flux-renderers-industrial/src/test-support/leafer-ui-mock.ts:16-124`
- **Justification:** no current production consumer uses leafer's bounds API (verified: `interaction-overlay.ts` reads raw attrs, `hit.ts` uses `selector.getByPoint`), but any future code that calls `node.getBoundsToWorld()` would see `undefined` in mock and a real bounds object in production.
- **Severity:** P2
- **Suggestion:** Add stub methods on MockLeaf (`getBoundsToWorld`, `worldBox` getter, `boxBounds` getter) that throw with a clear "mock does not model this — write an integration test" message, so future production consumers fail loudly.

### [P2] `scada-pressure-demo.spec.ts` canvas-existence hard-gate covers only the overview scene

- **File:** `tests/e2e/scada-pressure-demo.spec.ts:49-110, 112-145`
- **Justification:** the 10k-symbol scene switch (the path most likely to black-screen under heavy rebuild) has no `assertScadaCanvasRendered` — only `data-status='ready'` (which flips from a config-build callback, independent of actual leafer rendering).
- **Severity:** P2
- **Suggestion:** Call `assertScadaCanvasRendered(page, cid, { notes: 'pressure 10k scene' })` and `'overview restored scene'` after each successful `data-status='ready'` + symbol-count assertion in the pressure/back tests.

### [P2] `scada-perf.spec.ts` canvas-existence hard-gate skipped on 10k-refresh and memory tests

- **File:** `tests/e2e/scada-perf.spec.ts:272-305, 307-377`
- **Justification:** per the prior audit P2 directive ("add at least one canvas-pixel or DOM-canvas existence assertion per spec family"), the gate was added to 3 of the 5 tests in this file but skipped on the two most reliant on a real painted canvas.
- **Severity:** P2
- **Suggestion:** Add `await assertScadaCanvasRendered(page, cid, { notes: '10k refresh scene' })` at end of refresh test (~line 376) and memory test (~line 304).

### [P2] `assertScadaCanvasRendered` pixel probe is best-effort for non-empty scenes — "renders blank frames" regressions invisible

- **File:** `tests/e2e/helpers/scada-canvas-assert.ts:85-113, 122-128`
- **Justification:** the hard gate catches "canvas missing" and "tree never renders", but a regression where every symbol gets `visible:false`/`opacity:0` would pass: `renderFrames > 0` satisfied, pixel probe returns `fallback-all-zero` which is non-failing.
- **Severity:** P2
- **Suggestion:** For non-empty scenes (where harness knows expected symbol count > 0), tighten the pixel probe to fail when `pixelProbe === 'fallback-all-zero'`. Keep the fallback only for documented empty scenes.

### [P2] Several `not.toThrow()` weak assertions on defensive/guard paths + duplicated coverage

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/scada-canvas-lifecycle-hardening.test.tsx:453-472` (destroyed-runtime `setPointValues` guard)
  - `packages/flux-renderers-industrial/src/binding/scada-robustness-hardening.test.ts:194-241` (three inline `not.toThrow()` for defensive early returns)
  - `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx:122-132` (`createPrivateEvalScope` write no-op asserted only via `not.toThrow()`)
  - `packages/flux-renderers-industrial/src/renderer-definitions.test.ts:139-148` (`registerScadaRenderers` idempotency weak)
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.test.ts:78-84` (two identical `computeSymbolBounds([])` tests; main hook effect branches not unit-tested in this file)
- **Justification:** individually low-risk; collectively worth a cleanup pass. The misnamed `use-scada-config-sync.test.ts` only tests one pure function — gives false impression the hook is unit-tested.
- **Severity:** P2
- **Suggestion:** Replace `not.toThrow()` guard tests with side-effect negative assertions (destroyed-pipeline write check via `pointStore.setPointValue` spy; private-scope write check via re-read; defensive-early-return animator.start negative spy). Remove duplicate test; either rename file to `compute-symbol-bounds.test.ts` or add direct `renderHook`-based tests of `useScadaConfigSync` covering full-reset → onBuilt and diff-throw → onBuildError branches.

## Public API surface (dim 03)

### [P2] `IndustrialRendererSchema` leaked to public surface — zero consumers, not in §11 authorized list

- **File (code):** `packages/flux-renderers-industrial/src/index.ts:36` + `packages/flux-renderers-industrial/src/renderer-definitions.ts:209`
- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:304` (§11 authorized surface)
- **Justification:** Phase 2 of plan `{1558-1}` explicitly ran a zero-consumer Proof and declared the surface converged to §11; the alias survives that pass unenumerated, so the convergence Proof missed it.
- **Evidence:**
  ```ts
  // index.ts:36
  export type { IndustrialRendererSchema } from './renderer-definitions.js';
  // renderer-definitions.ts:209 (only definition site — trivial alias)
  export type IndustrialRendererSchema = ScadaCanvasSchema;
  ```
  Repo-wide grep confirms zero external consumers.
- **Severity:** P2
- **Suggestion:** Drop the `export type { IndustrialRendererSchema }` from `src/index.ts:36` (it remains module-internal for in-package use), or add it explicitly to §11's authorized enumeration.

## Documentation drift (dim 16)

### [P2] `design-renderer.md §10` marker table documents `—` for loading/error markers — code emits classes + ships CSS

- **File (code):** `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:213, 216`, `packages/flux-renderers-industrial/src/styles.css:14, 21`
- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:270-271`
- **Justification:** parallel of the prior audit's `nop-scada-canvas-canvas` row fix (which landed), but the loading/error rows were never addressed though the same drift logic applies verbatim.
- **Evidence:**
  ```
  // design-renderer.md:270-271
  | 加载占位 | — | scada-canvas-loading |
  | 错误提示 | — | scada-canvas-error   |
  ```
  ```ts
  // scada-canvas.tsx:213 — loading branch emits the marker class
  asReactNode(loading?.render()) ?? <div data-slot="scada-canvas-loading" className="nop-scada-canvas-loading" />
  // styles.css:14, 21 — matching CSS rules exist
  .nop-scada-canvas .nop-scada-canvas-loading { display: flex; ... }
  .nop-scada-canvas .nop-scada-canvas-error   { display: flex; ... color: #dc2626; ... }
  ```
- **Severity:** P2
- **Suggestion:** Update §10 marker table rows to `nop-scada-canvas-loading` and `nop-scada-canvas-error`, mirroring the canvas row fix.

### [P2] `design-renderer.md §6` still documents the removed `data-slot="scada-canvas-overlay"` — internal contradiction with §10

- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:187` (contradicted by `:275`)
- **Justification:** prior audit P2 was partially fixed by adding the §10 "已移除" note, but the original §6 line that introduces the slot to readers was left intact — active contradiction on any linear read of §6.
- **Evidence:**

  ```
  // design-renderer.md:187 (§6, still describes the slot as live)
  - 根容器 slot：`data-slot="scada-canvas"`（canvas 元素），HTML 覆盖层 slot
    `data-slot="scada-canvas-overlay"`（React 渲染的 DOM 覆盖层，design-engine.md §6 图层表； ...）。

  // design-renderer.md:275 (§10, declares the slot removed)
  - HTML 覆盖层（hover/selected 反馈）渲染在 leafer sky 层（`InteractionOverlay`），
    **不产 DOM marker / 不占 data-slot**——此前的 `scada-canvas-overlay` slot 行永不渲染，已移除；
  ```

- **Severity:** P2
- **Suggestion:** Rewrite §6 line to retire the `scada-canvas-overlay` slot reference (state overlays live in the leafer sky layer and produce no DOM marker/slot).

### [P2] `design-engine.md §8.3` `ScadaTestHandle` omits 2 impl fields (`setPointValues?`, `measureAddStrategies?`) — typing note covers type drift but not field-count drift

- **File (code):** `packages/flux-renderers-industrial/src/engine/test-handle.ts:9-21` (9 members)
- **File (doc):** `docs/components/industrial-hmi/design-engine.md:233-244` (7 members)
- **Justification:** the §8.3 doc-note at `:244` reconciles the typing drift (impl uses `unknown`) but does not mention the 2 extra optional fields. The sibling `editor-initiation.md:59` correctly lists both — internally inconsistent.
- **Evidence:**
  ```ts
  // engine/test-handle.ts:9-21 (impl — 9 members, 7 mandatory + 2 optional)
  export interface ScadaTestHandle {
    engine: unknown;
    tree: unknown;
    app: unknown;
    getSymbol(id: string): unknown;
    getPointValue(pointId: string): unknown;
    getViewport(): ViewportState;
    forceRender(): void;
    setPointValues?: (values: Record<string, ScadaPrimitive>) => void; // NOT in §8.3
    measureAddStrategies?: (count: number) => AddStrategyTiming; // NOT in §8.3
  }
  ```
- **Severity:** P2
- **Suggestion:** Extend §8.3 interface block to include the two optional dev/test members (with "非公共契约" note), or extend the existing impl-drift note to mention them.

---

# Per-Dimension Coverage Summary

| Dim                     | Result                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Dependency graph     | Clean — 0 undeclared imports in this package; leafer 2.2.9 locked; no private paths; no cycles.                                                                              |
| 03 API surface          | 1 P2 (`IndustrialRendererSchema` over-export); registration protocol, propContracts/eventContracts/componentCapabilityContracts (5+9) all align with `use-scada-handles.ts`. |
| 04 State ownership      | 0 P0/P1; 6 P2 residual lifecycle hardening (zombie pipeline, destroyed-flag inconsistency, double-destroy, pendingSkip leak, error map leak, inline-arrow churn).            |
| 06 Async safety         | Clean — all `catch` sites in package are structured failure paths; no eval/new Function; no void-promise-no-catch hot paths.                                                 |
| 07 Lifecycle            | Folded into Dim 04 above.                                                                                                                                                    |
| 09 Renderer contract    | Clean — compile-once gate clean, standard hooks only, no raw-schema reads, `data-slot` lands on real leafer canvas via effect.                                               |
| 13 Type safety          | Clean — all `as unknown as` usage is existential-erase pattern (RendererDefinition/Symbol registry) explicitly allowed by low-code calibration patterns.                     |
| 14 Test coverage        | 1 P2 (mock drift + weak assertions bundle); coverage 95.88% stmt; all 9 prior P1s have matrix-level regression proofs.                                                       |
| 15 Security/performance | Clean — no eval, no problematic mutation (`.sort()` is on spread copy), no global pollution, no O(n²) hot paths.                                                             |
| 16 Doc-code             | 3 P2 (§10 loading/error markers, §6 stale overlay slot, §8.3 ScadaTestHandle field-count drift); quick-reference / flux-guide / index.md all clean post-remediation.         |
| 18 Cross-package        | Clean — registration / store / hook patterns consistent with sibling renderer packages.                                                                                      |
| 19 Error propagation    | 2 P1 (onError + onHandlerError wiring); engine-layer dedup + i18n registry correctly built; only the React-layer subscription is missing.                                    |
| 21 Display/positioning  | 4 P2 (default-shape bounds, base-text centering, wheel-clamp anchor, viewport prop asymmetry); all 3 prior P1s (P1-6/7/9) verified FIXED with non-special-case math proofs.  |
| 22 Integration wiring   | 2 P1 (same as Dim 19) + 2 P2 (complex-expression silent disable, dead `setConfig`); all 9 handles + 5 events verified connected; hit chain viewport-aware; data-slot landed. |
| 23 Test effectiveness   | 5 P2 (mock drift, hard-gate coverage gaps, pixel-probe weakness, weak-assertion bundle); P1-9 mock↔real mask fully lifted.                                                   |

# Cross-Cutting Patterns

1. **"Invisible-nothing" replacement of pre-fix behaviour (P1-1, P1-2)**: the P1-8 remediation correctly stopped escalating flux/handler errors to canvas-level `error` state, but the replacement — dedup + report via `onError`/`onHandlerError` — was implemented only at the engine/hook layer. The React renderer never subscribes a host consumer, so the dedup computes values that nothing consumes, and tests pass because they inject callbacks directly. Same family as the prior audit's "first-frame wiring gaps": the contract reads correctly at one layer and silently fails at the next.

2. **Mock↔real drift is the recurring blind spot (P2 dim 23-01/14-08, prior P1-9)**: the P1-9 mask was lifted for the `scaleOfWorld` x/y side effect, but two other latent mock↔real drifts remain (`tree.zoomLayer !== tree`, missing `getBoundsToWorld`/`worldBox`). No current consumer masks a real defect, but any future production code that reads `tree.scaleX` directly or calls leafer's bounds API would diverge silently. Same lesson as gate-3: mock-shape audits must be revisited as production API surface grows.

3. **Display-math partial-fix residuals (P2 dim 21-08/09)**: plan `{3}` Phase 1 fixed `computeSymbolBounds` for explicit `custom.points` and instrument text centering, but the in-scope files `polygon.ts` / `text.ts` still have residual default-geometry paths that degrade. Pattern: Phase exit criteria were satisfied for the explicitly-tested case, leaving the default-case as residual.

4. **E2E assertion-channel discipline (P2 dim 23-02/03/04)**: the prior audit's "add canvas-pixel existence assertion per spec family" was applied to most spec families but skipped on the heavy-load paths (pressure 10k, 10k-refresh, memory) — exactly the paths most likely to black-screen. Plus the pixel probe is best-effort by design. Same lesson as scheduling bug 71: throughput/event-count metrics do not couple to visual outcome.

5. **Doc-table drift concentrates where fixes touch nearby rows (P2 dim 16-01/02/03)**: every doc drift is a "neighboring row of a fix that landed" — the canvas marker row was fixed but loading/error rows weren't; §10 overlay-removal note was added but §6 introduction wasn't updated; §8.3 typing note was added but field-count drift wasn't.

# Conclusion

`flux-renderers-industrial` is mechanically healthy — typecheck/lint/build all pass, **562/562 tests green across 40 files**, and the **prior 9 P1s are all confirmed FIXED in live code** with matrix-level regression proofs (P1-9's mock↔real mask is fully lifted). The remediation plans `{1235-1/2/3}` and `{1558-1/2/3}` genuinely closed their scoped issues.

This post-remediation audit surfaces **2 new P1s** and ~22 P2s. Both P1s are in the same family: the P1-8 fix correctly stopped escalating runtime errors to canvas-level state, but the planned "dedup + report via onError" follow-through was implemented only at the engine/hook layer — the React renderer (`scada-canvas.tsx`, `use-scada-engine.ts`) never wires a host consumer for either `onError` (P1-1) or `onHandlerError` (P1-2). Flux compile/evaluate failures and user-action throws are silently swallowed in production. Both layers register i18n mappings (`flux-compile-failed` / `flux-evaluate-failed` / `handler-error`) demonstrating clear observability intent; the dedup machinery exists but is observability-dead. Tests pass because they inject the callbacks directly, masking the production gap.

The P2 cluster is mostly residual cleanup: lifecycle-hardening edge cases (zombie pipeline, double-destroy, pendingSkip leak), display-math partial fixes (default-shape bounds, base-text centering), doc-table drift on neighboring rows of fixes, and test-effectiveness gaps (mock↔real latent drift, e2e hard-gate coverage holes, `not.toThrow()` weak assertions). None block; all are recordable for the follow-up backlog.

A remediation plan should target the 2 P1s (wire `onError` + `onHandlerError` from the React renderer to a non-escalating diagnostic channel, and add production-renderer regression tests that don't inject callbacks directly); P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
