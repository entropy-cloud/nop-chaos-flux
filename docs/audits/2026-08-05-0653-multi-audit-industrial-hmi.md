> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: industrial-hmi
> Remediation Plan: `docs/plans/2026-08-05-0653-2-industrial-hmi-audit-p1-remediations.md`（2×P1 → Phase 1 oversized files split + Phase 4 W3 revert-vs-binding）；6×P2 → `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-0653 post-remediation audit P2」multi-audit 子节

# Multi-Dimensional Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-05 · **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` — code, config, tests, and public contracts (exports / API surface), cross-referenced against `docs/components/industrial-hmi/design-*.md`, recent remediation plans (`2026-08-04-2242-{1,2}`, `2026-08-04-2243-{1,2,3}`, `2026-08-05-0325-1`), and architecture docs.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design).
**Methodology:** read calibration docs + reopened-adjudications + audit-tooling + react19-best-practices; ran mechanical gates; dispatched 4 parallel deep-dive sub-agents across dimensions 01/03/04/07/14/16/19/21/22/23; **every P1 candidate re-verified by the orchestrator against live code** (the W3 revert-vs-binding trace was hand-walked through `dirty-collector.ts:322-364` + `visual-state.ts:48-82` + the alarm-storm test at `state-visual.test.ts:247-316`). Only independently verified findings appear below.
**Context:** post-remediation audit. Prior audit `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` found 2 P1s (`onError` + `onHandlerError` channel wiring) + ~22 P2s; prior open-audit `docs/audits/2026-08-04-2242-open-audit-industrial-hmi.md` found 1 P1 (`x`/`y` 3-way contract drift). Remediation plans `2026-08-04-2242-{1,2}` (both marked completed 2026-08-05) targeted the P1s; plans `2026-08-04-2243-{1,2,3}` + `2026-08-05-0325-1` (all completed) targeted P2s + added new diagnostics. This audit verifies those closures and surfaces residuals / new defects introduced by the remediation work.

## Mechanical Gates (run at audit time)

| Gate                                                           | Result                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` | PASS                                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-industrial lint`      | PASS                                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test`      | **615 / 615 pass (43 files)** — up from 562/40 in prior audit (remediation added 53 tests)    |
| `pnpm check:workspace-manifest-deps`                           | PASS for this package (0 undeclared imports; 5 pre-existing failures in form/scheduling only) |
| `pnpm check:audit-runtime-raw-schema-reads`                    | 0 hits in package                                                                             |
| `pnpm check:oversized-code-files`                              | **FAIL — 2 industrial test files exceed 700-line hard limit** (see P1-2)                      |

## Priority Summary

| Priority                                                                                                                 | Count | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / security / failing-or-absent test for changed behavior) | **0** | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                                   | **2** | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc line-number rot, wording, naming consistency, cosmetic nits)                 | **6** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 2 P1s.

---

# Prior P1 Verification (all 3 confirmed FIXED in live code)

| Prior ID     | Source audit    | Title                                            | Status    | Live-code proof site                                                                                                                                                                                                                                                                                                                           |
| ------------ | --------------- | ------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 (multi) | 2026-08-04-2242 | `useScadaPointsBridge` `onError` never wired     | **FIXED** | `scada-canvas.tsx:222` — `useScadaPointsBridge({ ..., onError: reportDiagnostic })`. `reportDiagnostic` (`:121-141`) routes to `console.warn` + `env.monitor.onError` (flux codes). Production-path regression test in `scada-canvas-diagnostic-channels.test.tsx`.                                                                            |
| P1-2 (multi) | 2026-08-04-2242 | `onHandlerError` never wired in `useScadaEngine` | **FIXED** | `use-scada-engine.ts:42` — `UseScadaEngineArgs.onHandlerError?` declared; `:150` forwards via `latest.current.onHandlerError?.(error)`; `scada-canvas.tsx:168-169` subscribes `reportDiagnostic('handler-error', ...)`. Production-path regression test covers user-action throw → diagnostic visible + canvas stays ready.                    |
| P1 (open)    | 2026-08-04-2242 | `x`/`y` 3-way contract drift → NaN viewport      | **FIXED** | `config-types.ts:57-58` — `x?: number; y?: number` (optional); `use-scada-config-sync.ts:67-69, 98-99` — `boundsOfNode`/`boundsFromCustomPoints` default `?? 0`; `viewport.ts:32-41` — `clampViewport` defends non-finite `x`/`y` via `Number.isFinite → 0`. Regression tests in `viewport.test.ts:143-154` + `use-scada-config-sync.test.ts`. |

---

# P1 Findings (must fix — independently re-verified by orchestrator)

## [P1-1] W3 visual-state revert overwrites binding value within same flushFrame for binding+state-style-same-property symbols

_Justification: real visual regression introduced by plan `2026-08-04-2243-1` Phase 3 W3 (alarm-storm N+1 applyAttrs fix). The W3 migration moved the revert path from immediate `engine.applyAttrs` to `collector.collect`, making revert participate in the collector's last-write-wins pending Map — where binding values for the same property already live. Pre-W3 the immediate applyAttrs was overwritten by the subsequent flush (binding won); post-W3 the revert overwrites the binding (base/reset wins). The alarm-storm proof test does not catch this because frame 3 (the revert frame) asserts only call-count, not the resulting fill value._

- **Files:**
  - `packages/flux-renderers-industrial/src/symbols/visual-state.ts:48-82` (revert path via `collector.collect`)
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:322-337` (`collectBindings` collects binding values FIRST, then calls `collectStates`), `:340-364` (`collectStates` emits `state:change` → `applyState` revert), `:48-62` (`collect` last-write-wins into `pending`)
  - `packages/flux-renderers-industrial/src/symbols/state-visual.test.ts:309-314` (frame 3 missing fill-value assertion)

- **Evidence:**

  ```ts
  // dirty-collector.ts:322-337 — collectBindings collects binding values FIRST into pending:
  private collectBindings(pointIds: string[]): void {
    const touchedSymbols = new Set<string>();
    for (const pointId of pointIds) {
      for (const target of this.options.reverseIndex.lookup(pointId)) {
        touchedSymbols.add(target.symbolId);
        const binding = this.options.reverseIndex.getBindings(target.symbolId)?.[target.property];
        if (!binding) continue;
        const value = this.resolver.resolveBinding(binding);
        if (value !== undefined) {
          this.options.collector.collect({ symbolId: target.symbolId, property: target.property, value });
          // ↑ pending[symId].fill = <binding value> (e.g. 'green' or raw point value)
        }
      }
    }
    this.collectStates(touchedSymbols); // ← THEN runs state change → revert OVERWRITES pending
  }

  // visual-state.ts:61-74 — W3 revert collects into the SAME pending Map (last-write-wins):
  } else if (applied.has(key)) {
    const revert = base[key] !== undefined ? base[key] : (STYLE_RESET_DEFAULTS[key] as unknown);
    if (revert !== undefined) {
      if (this.collector) {
        this.collector.collect({ symbolId, property: key, value: revert });
        // ↑ OVERWRITES pending[symId].fill = base.fill or '' (STYLE_RESET_DEFAULTS.fill = '')
      }
      applied.delete(key);
    }
  }

  // state-visual.test.ts:309-314 — frame 3 (revert frame) only asserts call count, NOT fill value:
  for (let i = 0; i < N; i++) pointStore.setPointValue(`flag-${i}`, 2);
  flush();
  expect(applyAttrsSpy).toHaveBeenCalledTimes(1); // ← NO assertion on frame3Arg['s0']?.fill
  ```

  **Hand-traced execution for a `scada-rect` with `bindings: { fill: { point: 'flag-0' } }` + `states: { run: { style: { fill: '#00aa00' } }, fault: { style: { fill: '#ff0000' } }, off: {} }`, transitioning fault→off when `flag-0` changes from 1 to 2:**
  1. `collectBindings(['flag-0'])` → binding resolves `fill = 2` (raw point value) → `pending['s0'].fill = 2`
  2. `collectStates` → state changes fault→off → emits `state:change` → `applyState` revert → `collector.collect({ fill: base.fill or '' })` → **OVERWRITES** `pending['s0'].fill = base.fill or ''`
  3. `collector.flush` → `engine.applyAttrs({ 's0': { fill: base.fill or '' } })` → engine ends at **base/reset value**, not the binding value `2`

  **Pre-W3 behavior (confirmed by reading the W3 plan comment at `visual-state.ts:29-31`):** `applyState` called `engine.applyAttrs({ fill: base.fill })` IMMEDIATELY (synchronous); then `collector.flush` wrote `pending['s0'].fill = 2` (binding value still in pending) → engine ended at **`2`** (binding won). The W3 migration broke this by moving revert into the same collector where binding values already live.

- **Severity:** **P1**
- **Status:** Introduced by commit `07658dfe` (plan 2026-08-04-2243-1 Phase 3 W3). The W3 Decision record (`visual-state.ts:27-31`) adjudicated active-vs-revert owner split but did NOT consider the three-way binding-vs-revert-vs-active interaction for the same property. The alarm-storm test config (`state-visual.test.ts:249-265`) uses exactly this pattern (`bindings: { fill: { point: 'flag-i' } }` + state-styles on `fill`) but frame 3 only asserts `toHaveBeenCalledTimes(1)`, allowing the regression to hide behind a missing value assertion.
- **Risk:** A SCADA pump/valve with `bindings: { fill: "${color}" }` (binding supplies normal-state color from data) + alarm state-style on `fill` (e.g. `states.fault.style.fill='#ff0000'`) will show base/reset color (e.g. empty string or default white) instead of the bound data color when transitioning from alarm state to a non-styled "normal/off" state, AND the wrong color persists until the next point change re-triggers `collectBindings`. This is the canonical SCADA alarm-override idiom — the regression is high-frequency for any mission that uses binding-driven colors with state-style alarm overrides. Visual fidelity defect.
- **Suggestion:** In `StateVisualApplier.applyState`, when reverting a property, check if the symbol has a binding for that property (via `reverseIndex.getBindings(symbolId)`). If a binding exists, skip the revert collect for that property — the binding value already in `pending` (from `collectBindings`) is the correct value. If the binding's source point did NOT change in this cycle (binding not re-evaluated), the engine retains the active-state value, which is a separate pre-existing edge case to handle in a follow-up. Additionally, extend the alarm-storm test frame 3 to assert `frame3Arg['s0']?.fill === <expected binding-resolved value>` (currently `2` for the test config) rather than only call-count.
- **False-positive exclusion:** NOT a calibrated non-issue — it is a concrete user-visible behavior regression with a clear cause (W3 changed side-effect ordering). NOT an already-adjudicated item — the W3 Decision record at `visual-state.ts:27-31` only adjudicated active-vs-revert owner split, not binding-vs-revert interaction. NOT reasonable local UI state — it concerns runtime data ownership (which writer owns the final `fill` value when both binding and state-style target the same property). The v1/no-compatibility-burden baseline means a recently-introduced regression cannot be excused as "still converging."

## [P1-2] `pnpm check:oversized-code-files` FAILS for 2 industrial test files — hard-gate regression from remediation wave

_Justification: `pnpm check:oversized-code-files` is a documented hard gate (`ERROR: N files exceed 700 lines (MUST split)`) wired into `pnpm check`. The prior audit explicitly recorded "No warnings for this package post-remediation"; the subsequent remediation wave (plans `2026-08-04-2242-{1,2}`, `2026-08-04-2243-{1,2,3}`, `2026-08-05-0325-1`) added ~53 new tests that pushed 2 files over the 700-line hard limit. The gate now fails for this package, regressing from clean to failing._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx` — **769 lines** (>700 hard limit)
  - `packages/flux-renderers-industrial/src/engine/scada-engine.test.ts` — **718 lines** (>700 hard limit)

- **Evidence:**

  ```text
  $ pnpm check:oversized-code-files
  [check-oversized-code-files] ERROR: 16 files exceed 700 lines (MUST split):
    - packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx: 769
    - packages/flux-renderers-industrial/src/engine/scada-engine.test.ts: 718
    [...]
  ELIFECYCLE Command failed with exit code 1
  ```

  The `scripts/check-oversized-code-files.mjs` script (lines 11-12) sets `WARN_LINES = 500` and `ERROR_LINES = 700`, with no test-file exemption (test files are subject to the same limit). The script is wired into `pnpm check` (root `package.json` `"check"` script includes `check:oversized-code-files`). The prior audit's mechanical-gate table recorded "No warnings for this package post-remediation" — this was accurate for the `2026-08-04-1558-*` remediation, but the subsequent `2026-08-04-2242-*` / `2026-08-04-2243-*` / `2026-08-05-0325-1` plans added the diagnostic-channel, x/y-bounds, destroy-gate, and flux-deps-empty regression tests that pushed these 2 files over 700.

- **Severity:** **P1**
- **Status:** Hard CI gate (`pnpm check`) currently fails for this package. The 2 files regressed from <700 (clean) to >700 (error) during the recent remediation wave. The workspace-level gate was already failing for 16 files total (many in other packages), but the industrial package specifically went from 0 failures to 2 failures.
- **Risk:** Any CI run that executes `pnpm check` will fail on these 2 files. Contributors running the gate locally get a hard error. If the gate is ever enforced as a merge blocker (it is documented as a hard gate with "MUST split" language), these files block all industrial-hmi merges until split. The files will continue growing as new tests are added, deepening the split debt.
- **Suggestion:** Split each file by domain. For `scada-points-bridge.test.tsx` (769 lines): separate `analyzeFluxSubscriptions` / `reportOnce` dedup / `compile-failed` / `deps-empty` / reload-clear tests into a sibling `scada-points-bridge-diagnostics.test.tsx`. For `scada-engine.test.ts` (718 lines): separate lifecycle / scene-tree / viewport / hit / overlay / image-cache / declarations `describe` blocks into focused siblings. Both files have clear domain boundaries already marked by `describe` blocks — the split is mechanical. Alternatively, request an exemption in `OVERSIZED_EXEMPTIONS` (with cited justification), but splitting is preferred per AGENTS.md ("Files over 500 lines should be evaluated for extraction").
- **False-positive exclusion:** NOT a pre-existing condition — the prior audit's gate table explicitly recorded this package as clean. NOT a workspace-wide issue that industrial can ignore — the AGENTS.md package-level verification checklist requires `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` to pass, and the oversized-files gate is a documented standard (`scripts/check-oversized-code-files.mjs` with "MUST split" language) that this package now violates. NOT a calibration-pattern shielded item — no calibration pattern exempts test-file bloat.

---

# P2 Findings (non-blocking polish / residual cleanup — backlog)

## [P2-1] (Dim 03) `serializeScadaConfig` missing from §11 public-surface enumeration while §4.3 declares it exported

- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:304, 307` (§11 enumeration does not mention `serializeScadaConfig`); `:162, 168` (§4.3 explicitly declares it exported as a Phase 3 design-contract decision)
- **File (code):** `packages/flux-renderers-industrial/src/index.ts:54` — `export { serializeScadaConfig } from './serialization/serialize.js';`
- **Severity:** P2 — internal doc inconsistency between §4.3 and §11 within the same design doc; no contract break, no consumer impact.
- **Status:** §4.3 was edited in plan `2026-08-04-1558-1` Phase 3 to declare `serializeScadaConfig` as a deliberately-exported design-contract function, but the §11 enumeration (set at Phase 2) was never back-propagated.
- **Risk:** Future readers of §11 (the canonical "implementation split" section) may believe `serializeScadaConfig` is an unintentional over-export, triggering re-reporting churn or removal proposals that contradict §4.3's documented intent.
- **Suggestion:** Update `design-renderer.md:304` and `:307` to include `serializeScadaConfig` in the public-surface enumeration.

## [P2-2] (Dim 14) Duplicated test setup boilerplate across 4 renderer test files

- **Files:** `scada-canvas-lifecycle.test.tsx:17-65`, `scada-canvas-lifecycle-hardening.test.tsx:58-138`, `scada-canvas-lifecycle-wiring.test.tsx:16-60`, `scada-canvas-diagnostic-channels.test.tsx:14-79`
- **Severity:** P2 — non-blocking DRY violation; each file was added by a different remediation plan and the duplication is isolated to test scaffolding.
- **Status:** `makeProps` / `configProp` / `scadaTestHandle` / `validConfig` are reproduced nearly verbatim across all 4 files. The existing `test-support/renderer-test-support.tsx` extracts higher-level helpers but stops short of these lower-level fixtures. Copy-paste drift has already started (`cid` value differs: 7 in 3 files, 19 in diagnostic-channels).
- **Risk:** Future `RendererComponentProps` shape changes require touching 4 files identically; the `cid` divergence is a latent seed for cross-file test interference if a shared registry is ever introduced.
- **Suggestion:** Extend `renderer-test-support.tsx` with `makeScadaCanvasProps(overrides?)`, `configProp(config)`, `scadaTestHandle(cid)`, and a default `validCanvasConfig()` factory; import from the 4 consumers.

## [P2-3] (Dim 16) `scada-canvas.types.ts` is a zero-importer dead module blessed by §11 implementation layout

- **File (code):** `packages/flux-renderers-industrial/src/renderer/scada-canvas.types.ts` (1-line re-export: `export type { ScadaCanvasSchema, ScadaCanvasEvents } from '../schemas.js';`)
- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:295` (§11 implementation layout blesses the file)
- **Severity:** P2 — internal dead code, not a public-surface leak (not in `index.ts`); the doc's "implementation split" blesses a file that reality doesn't use.
- **Status:** Vestigial scaffolding from I4/I10. Repo-wide `rg "scada-canvas\.types"` returns ZERO importers — all actual consumers import directly from `../schemas.js`.
- **Risk:** Future contributors reading §11 may believe the file is a load-bearing indirection and add new exports through it, creating a divergent second internal surface.
- **Suggestion:** Either delete `scada-canvas.types.ts` and remove its §11 line (preferred — zero consumers), or add a one-line comment explaining the planned purpose.

## [P2-4] (Dim 19) Diagnostic channel loses original error stack/cause — hook reduces to message string before renderer wraps in fresh Error

- **Files:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:273` (`latest.current.onError?.(code, errorMessage(error))` — reduces `error: unknown` to string at hook boundary); `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:130-134` (wraps already-reduced string in `new Error(message)` for `env.monitor.onError` payload — no `{ cause }`, no original stack)
- **Severity:** P2 — debuggability gap, not a correctness defect. The channel does correctly deliver `code` + `message` to both outlets.
- **Status:** Production flux-compile-failed / flux-evaluate-failed errors carry the original parse/eval stack. By the time `env.monitor.onError` fires, the host receives a fresh `Error` whose `.stack` points at `scada-canvas.tsx:132`, not at the formula evaluator.
- **Risk:** Host monitoring tooling cannot pinpoint the failure origin without reproducing locally. Dedup still works (operates on `(expression, code)` tuple, not error identity).
- **Suggestion:** Widen `UseScadaPointsBridgeArgs.onError` to `(code: string, error: unknown, message: string)` and pass `error` into `env.monitor.onError({ phase, error, details: { code } })` directly (preserving stack/cause), or wrap with `new Error(message, { cause: error })` at `scada-canvas.tsx:132`.

## [P2-5] (Dim 21) `applyInitialViewport` fill branch computes centering with unclamped scale — content drifts at extreme bounds

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:110-123`
- **Severity:** P2 — only manifests at extreme bounds (scale out of `[0.1, 20]`); the prior P1-6 closure explicitly hand-checked only "non-special-case geometry", leaving this residual.
- **Status:** Fill branch computes `x`/`y` with the raw (unclamped) `scale`, then `engine.setViewport` → `clampViewport` clamps the scale AFTER `x`/`y` are decided. The sibling contain branch (`engine.fit` in `viewport.ts:61-75`) clamps FIRST. Hand-traced example: bounds 10000×10000 in 800×600 viewport → rawScale=0.08, `x` computed for 0.08, scale clamped to 0.1 → center drifts.
- **Risk:** For `viewport: { fit: 'fill' }` with bounds ≫ viewport or ≪ viewport, the screen-center mapping is off by factor `clampedScale/rawScale`. Edge-case only; most configs have scale within `[0.1, 20]`.
- **Suggestion:** Add `fitFill(bounds, viewport, padding)` pure helper in `engine/viewport.ts` mirroring `fit` but with clamp-before-centering; delegate from `applyInitialViewport`. Add regression test for both `scale > MAX_SCALE` and `scale < MIN_SCALE` fill cases.

## [P2-6] (Dim 22) `flux-deps-empty` diagnostic fires alongside `flux-compile-failed` for syntax-broken expressions — misleading dual report

- **Files:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:62-86` (probe collapses ALL failure modes into `[]`), `:137-146` (depsEmpty push), `:283-294` (depsEmpty report), `:317-321` (compile-failed report)
- **Severity:** P2 — diagnostic noise/inaccuracy only; the underlying expression still correctly fails and the point is skipped per P1-8 degradation contract. No behavioral defect.
- **Status:** Plan `2026-08-05-0325-1` (W1) correctly verified the happy-path "compile succeeds but deps empty" case; the compile-failure sub-path was never tested and silently produces dual reports. The existing test `reports flux-deps-empty once` (`scada-points-bridge.test.tsx:658-722`) uses a stub compiler where `compileValue` SUCCEEDS, so it never exercises the compile-throws dual-report path.
- **Risk:** Author of a typo'd expression like `${analog.temp +}` sees TWO warnings — (1) `flux-deps-empty` ("subscription paths could not be collected") and (2) `flux-compile-failed` with the actual syntax error. The first message is actively misleading — root cause is a syntax error, not a deps-collection limitation.
- **Suggestion:** Change `extractExpressionDepsViaProbe` to return a discriminated result (`{ kind: 'ok', paths } | { kind: 'compile-failed' } | { kind: 'deps-empty' }`), and only push to `depsEmptyExpressions` when `kind === 'deps-empty'`. Add regression test where stub compiler's `compileValue` throws, asserting ONLY `flux-compile-failed` fires.

---

# Per-Dimension Coverage Summary

| Dim                    | Result                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01 Dependency graph    | Clean — manifest, gates, cycles, internal-path scan all clean. leafer 2.2.9 locked; no undeclared `@nop-chaos/*` imports; no private paths; no cycles.                                                                                                                                     |
| 03 API surface         | 1 P2 (`serializeScadaConfig` §11 enumeration drift). Registration protocol, `RendererComponentProps<ScadaCanvasSchema>` vs renderer reads, exports field all align. Prior `IndustrialRendererSchema` over-export confirmed REMOVED.                                                        |
| 04 State ownership     | 0 P0/P1; all prior P2 lifecycle cluster (7 items) confirmed LANDED in plan `2026-08-04-2243-1`. No new state-ownership defects.                                                                                                                                                            |
| 07 Lifecycle           | **1 P1** (W3 revert overwrites binding value — Dim07-01). All effect deps correct, cleanup complete, destroyed-gating symmetric, no setState during render, no React 19 violations.                                                                                                        |
| 14 Test coverage       | 1 P2 (test boilerplate DRY — Dim14-01). All production modules have focused tests. Test names descriptive. Isolation solid (`resetLeaferMock` + idempotent registration in `beforeEach`).                                                                                                  |
| 16 Doc-code            | 1 P2 (dead `scada-canvas.types.ts` — Dim16-01). §10 marker table, §11 authorized surface, §8.3 `ScadaTestHandle` field-count, §4.2 x/y-optional all match live code. No stale line numbers.                                                                                                |
| 19 Error propagation   | 1 P2 (cause-chain loss in diagnostic channel — Dim19-01). All 17 `catch` blocks audited — none silently swallow. `safeRun` correctly isolates AND reports. No `enabled: false` hardcodes.                                                                                                  |
| 21 Display/positioning | 1 P2 (fill-branch unclamped scale — Dim21-01). All 6 recent display fixes (x/y contract, defaultGeometryPoints, measureText, wheel anchor, isScadaPrimitive guard, own-keys deep-equal) verified correct.                                                                                  |
| 22 Integration wiring  | 1 P2 (flux-deps-empty dual report — Dim22-01). All 9 component handles + 5 events verified connected. `pendingSkipNonceRef` bypass verified. `setPointValue` guard verified.                                                                                                               |
| 23 Test effectiveness  | 0 standalone findings (the alarm-storm frame-3 missing assertion is folded into P1-1). No frozen-defect assertions. No integration-boundary mocking (leafer mock is bottom-layer only). No dead-code-with-tests. The 2 new diagnostic-channel tests genuinely mount `ScadaCanvasRenderer`. |

---

# Cross-Cutting Patterns

1. **"Three-way same-property interaction missed by two-way owner adjudication" (P1-1):** The W3 Decision record (`visual-state.ts:27-31`) correctly adjudicated the two-way active-vs-revert owner split but missed the three-way binding-vs-revert-vs-active interaction. The alarm-storm test config exercises exactly this three-way pattern but frame 3 only asserts call-count, not the resulting value. Same lesson as scheduling bug 71: throughput/count metrics do not couple to value correctness — a test that asserts "applyAttrs called once" says nothing about whether the single call carried the right payload. **Actionable pattern:** when a coalesce-owner migration changes side-effect ordering, regression tests must assert the resulting VALUES at every frame, not just call-count.

2. **"Hard-gate regression from test growth without split" (P1-2):** The remediation wave legitimately added ~53 new tests (562 → 615), but no corresponding split occurred when test files crossed the 700-line hard limit. The prior audit's "no warnings for this package" baseline masked the regression because the subsequent plans each added only 10-30 tests — individually reasonable, collectively over the limit. **Actionable pattern:** remediation plans that add tests must include a file-size check in their exit criteria, not just a test-count check.

3. **"Doc section updated without back-propagating to enumeration sections" (P2-1, P2-3):** Two doc drifts follow the same shape as the prior audit's doc drifts (§10 marker rows, §6 overlay slot, §8.3 field count) — a content section is edited but the canonical enumeration/summary section is not. §4.3 declares `serializeScadaConfig` exported; §11 doesn't list it. §11 implementation layout blesses `scada-canvas.types.ts`; reality has zero importers. **Actionable pattern:** any Phase that adds/removes/renames a public surface file or function must update BOTH the detail section AND the enumeration section in the same commit.

---

# Conclusion

`flux-renderers-industrial` is mechanically healthy at the package level — typecheck/lint/test all pass (**615/615 tests green across 43 files**, up from 562/40), and the **prior 3 P1s are all confirmed FIXED** in live code with production-path regression proofs. The remediation plans `2026-08-04-2242-{1,2}` and `2026-08-04-2243-{1,2,3}` + `2026-08-05-0325-1` genuinely closed their scoped items.

This post-remediation audit surfaces **2 new P1s** and **6 P2s**. The P1s are:

1. **P1-1 (Dim07-01):** The W3 visual-state coalesce migration (alarm-storm N+1 fix) introduced a behavioral regression for the binding+state-style-same-property pattern — the canonical SCADA alarm-override idiom. When a symbol transitions from a styled alarm state to an unstyled normal state, the revert value (base/reset) overwrites the binding value in the collector's pending Map within the same flushFrame, producing a wrong fill color that persists until the next point change. The alarm-storm proof test does not catch this because frame 3 asserts only call-count, not the resulting fill value.

2. **P1-2:** `pnpm check:oversized-code-files` now FAILS for 2 industrial test files (`scada-points-bridge.test.tsx: 769`, `scada-engine.test.ts: 718`), regressing from the prior audit's "no warnings for this package" baseline. The remediation wave added tests without splitting files that crossed the 700-line hard limit.

The P2 cluster is residual cleanup: doc enumeration drift (§11 vs §4.3), dead module blessed by doc (`scada-canvas.types.ts`), test boilerplate DRY, diagnostic cause-chain loss, fill-branch clamp ordering edge case, and flux-deps-empty dual-report noise. None block; all are recordable for the follow-up backlog.

A remediation plan should target the 2 P1s (fix the W3 revert-vs-binding interaction + add the missing frame-3 fill-value assertion; split the 2 oversized test files); P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
