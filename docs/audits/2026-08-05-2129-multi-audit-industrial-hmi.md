> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: industrial-hmi
> Remediation: P1-1 → plan `2026-08-05-2129-3` Phase 2；P1-2 → Phase 3；P1-3 → Phase 1；15×P2 → `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节

# Multi-Dimensional Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-05 · **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` — code, config, tests, and public contracts (exports / API surface), cross-referenced against `docs/components/industrial-hmi/design-*.md`, recent remediation plans (`2026-08-05-0653-{2,3,4,5}`, `2026-08-05-1253-{1}`, `2026-08-05-2129-1`), and architecture docs.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design).
**Methodology:** read calibration docs + reopened-adjudications + audit-tooling + react19-best-practices; ran mechanical gates; dispatched 4 parallel deep-dive sub-agents across dimensions 01/03/04/05/07/14/15/16/19/21/22/23; **every P1 candidate re-verified by the orchestrator against live code** (the binding-expression subscription gap was hand-walked through `use-scada-points-bridge.ts:53-86,182-197` + `reverse-index.ts:24-33` + `variables-optional-contract.test.ts:77-94`; the pipeline `onError` gap was hand-walked through `use-scada-engine.ts:53-87` + `dirty-collector.ts:325,348,354,415,421,585-589`). Only independently verified findings appear below.
**Context:** post-remediation audit. Prior audit `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md` found 2 P1s (W3 revert-vs-binding + oversized test files) + 6 P2s. Remediation plans `2026-08-05-0653-2` (P1s) and `2026-08-05-0653-{3,4,5}` + `2026-08-05-1253-1` + `2026-08-05-2129-1` (P2s + I18 expression unification) all landed. This audit verifies those closures and surfaces residuals / new defects introduced or missed by the remediation work. Since the 0653 audit, ~12 commits changed `packages/flux-renderers-industrial/src` (+4359 / −2320 lines across 58 files); tests grew 615 → 683.

## Mechanical Gates (run at audit time)

| Gate                                                           | Result                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` | PASS                                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-industrial lint`      | PASS                                                                                          |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test`      | **683 / 683 pass (49 files)** — up from 615/43 in prior audit (remediation added 68 tests)    |
| `pnpm check:workspace-manifest-deps`                           | PASS for this package (0 undeclared imports; 5 pre-existing failures in form/scheduling only) |
| `pnpm check:audit-runtime-raw-schema-reads`                    | 0 hits in package                                                                             |
| `pnpm check:oversized-code-files`                              | **FAIL — 2 industrial files exceed 700-line hard limit** (see P1-3)                           |

## Priority Summary

| Priority                                                                                                                 | Count  | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / security / failing-or-absent test for changed behavior) | **0**  | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                                   | **3**  | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc line-number rot, wording, naming consistency, cosmetic nits)                 | **15** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 3 P1s.

---

# Prior P1 / P2 Verification (all confirmed FIXED in live code)

| Prior ID     | Source audit    | Title                                               | Status    | Live-code proof site                                                                                                                                                                                                                                                                                                                                        |
| ------------ | --------------- | --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1-1 (multi) | 2026-08-05-0653 | W3 visual-state revert overwrites binding value     | **FIXED** | `symbols/visual-state.ts:71-79` — when reverting a property, `if (instanceBindings?.[key]) { applied.delete(key); continue; }` skips the revert collect so the binding value already in `pending` wins. Regression test `state-visual.test.ts:318-321` now asserts `frame3Arg[\`s${i}\`]?.fill).toBe(2)` (the binding-resolved value), not just call-count. |
| P1-2 (multi) | 2026-08-05-0653 | 2 oversized industrial test files >700              | **FIXED** | `scada-points-bridge.test.tsx` now **647** (<700), `engine/scada-engine.test.ts` now **344** (<700). Plan `2026-08-05-0653-5` extracted shared boilerplate + split engine tests into `scada-engine-events-declarations.test.ts` + `scada-engine-plugin-sync.test.ts`. (Note: remediation introduced 2 _new_ oversized files — see P1-3.)                    |
| P2-1 (multi) | 2026-08-05-0653 | `serializeScadaConfig` missing from §11 enum        | **FIXED** | `design-renderer.md:316` §11 public-surface enumeration now lists `serializeScadaConfig（序列化契约函数…§4.3 裁定保留导出）`.                                                                                                                                                                                                                               |
| P2-3 (multi) | 2026-08-05-0653 | dead `scada-canvas.types.ts` blessed by §11         | **FIXED** | File deleted (`git diff` shows `scada-canvas.types.ts                                                                                                                                                                                                                                                                                                       | 1 -`; `ls`confirms absent). Plan`2026-08-05-1253-1` P2-3 hygiene. |
| P2-4 (multi) | 2026-08-05-0653 | diagnostic channel loses cause for flux-\* codes    | **FIXED** | `scada-canvas.tsx:135` — `const reportedError = error === undefined ? new Error(message) : new Error(message, { cause: error });` preserves stack/cause for `flux-compile-failed`/`flux-evaluate-failed`/`flux-deps-empty`. (Residual on `handler-error` code — see P2-5.)                                                                                  |
| P2-5 (multi) | 2026-08-05-0653 | fill-branch computes centering with unclamped scale | **FIXED** | `use-scada-config-sync.ts:117-126` — scale is now `clampScale(...)`'d BEFORE `x`/`y` are computed. (New residual: fill branch still lacks the 1e-6 width/height floor that `fit` has — see P2-7.)                                                                                                                                                           |
| P2-6 (multi) | 2026-08-05-0653 | flux-deps-empty dual-reports with compile-failed    | **FIXED** | `use-scada-points-bridge.ts:96-110` — `extractExpressionDepsViaProbe` returns a discriminated `{status:'ok'                                                                                                                                                                                                                                                 | 'deps-empty'                                                      | 'compile-failed' | ...}`; only `deps-empty`pushes to the diagnostic set. Test`scada-points-bridge-diagnostics.test.tsx:458-514`verifies`flux-compile-failed`reported AND`flux-deps-empty` NOT reported. |

---

# P1 Findings (must fix — independently re-verified by orchestrator)

## [P1-1] (Dim 22 / 05) Binding-level `expression` scope dependencies are never subscribed — documented "variables-optional + direct-scope binding" contract ① is broken in the live renderer

_Justification: contract break + incorrect behavior. Plan `2026-08-05-2129-1` Phase 2 explicitly locked contract ① ("无点表直连：binding.expression `${scopeMember}` 直连 scope 求值") and added a green test for it. But the test exercises the pipeline in isolation by manually injecting `scopeData`; the actual React bridge that SUPPLIES `scopeData` only subscribes to `config.variables` flux paths, never to binding-expression scope paths. So the documented contract is green-tested yet broken end-to-end. This is the canonical dimension-22 "schema→store→DOM wiring" / dimension-23 "integration-boundary mock" blind spot._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:53-86` (`analyzeFluxSubscriptions` scans **only** `config.variables`), `:182-197` (`useScopeSelector` is **disabled** when `paths.length === 0`)
  - `packages/flux-renderers-industrial/src/binding/reverse-index.ts:24-33` (`collectBindingPointIds` DOES collect binding-expression scope paths via `probeExpressionPaths`, but they stay in the reverse index and are never forwarded to the bridge's subscription)
  - `packages/flux-renderers-industrial/src/binding/variables-optional-contract.test.ts:77-94` (scenario ① — the false-green proof)

- **Evidence:**

  ```ts
  // use-scada-points-bridge.ts:53-86 — analyzeFluxSubscriptions ONLY scans config.variables:
  export function analyzeFluxSubscriptions(config, options) {
    ...
    for (const decl of config.variables ?? []) {     // ← symbols[].bindings NOT scanned
      if (decl.source !== 'flux' || typeof decl.flux !== 'string') continue;
      ...
    }
    return { paths: [...paths].sort(), depsEmptyExpressions };
  }

  // use-scada-points-bridge.ts:189-197 — subscription disabled when no flux variables:
  const scopeData = useScopeSelector(..., (snapshot) => snapshot, Object.is, {
    enabled: enabled && paths.length > 0,            // ← false when variables:[]
    fallback: {},                                    // ← scopeData stays {} forever
    paths,
  });

  // reverse-index.ts:24-33 — binding.expression scope paths ARE collected, but only into the index:
  export function collectBindingPointIds(binding, context) {
    const ids = new Set();
    if (binding.point) ids.add(binding.point);
    if (binding.expression) {
      for (const path of probeExpressionPaths(binding.expression, context)) {  // ← never reaches useScopeSelector
        if (path && path !== '*') ids.add(path);
      }
    }
    return [...ids];
  }

  // variables-optional-contract.test.ts:77-94 — scenario ① tests PIPELINE in isolation:
  it('① 无点表直连：binding.expression ${scopeMember} 直连 scope 求值', () => {
    const harness = createHarness([],                   // ← NO variables
      [{ id: 'sym', type: 'scada-rect', bindings: { text: { expression: '${scopeVal * 2}' } } }],
      { scopeVal: 21 });                                // ← scopeData MANUALLY injected
    harness.pipeline.flushFrame(harnessApply(harness)); // ← bypasses the bridge entirely
    expect(harness.applied[0]).toEqual({ sym: { text: 42 } });
  });
  ```

  **Hand-trace of the live renderer with config `{ version:1, variables:[], symbols:[{ id:'sym', type:'scada-rect', bindings:{ text:{ expression:'${scopeVal * 2}' } } }] }` and scope `{ scopeVal: 21 }`:**
  1. `analyzeFluxSubscriptions(config)` → `config.variables` is `[]` → `paths = []`, `depsEmptyExpressions = []`.
  2. `useScopeSelector(..., { enabled: false, fallback: {} })` → `scopeData = {}` and never updates, regardless of scope changes.
  3. The scope-push effect (`:255-259`) pushes `{}` to `pipeline.updateScopeData({})` and `requestRender`.
  4. `pipeline.flushFrame` → `collectBindings(reverseIndex.pointIds())` → resolves `binding.expression '${scopeVal * 2}'` against evalScope built from `{...pointValues, ...scopeData}` = `{...{}, ...{}}` = `{}` → `scopeVal` undefined → `undefined * 2` = `NaN` → `isScadaPrimitive(NaN)` true → `text = NaN`.
  5. The binding never reactively updates on subsequent scope changes because `scopeData` is permanently `{}`.

- **Severity:** **P1** — contract break + incorrect behavior. Same shape as the prior 0653 P1s ("channel/contract declared and tested but not wired in production"): the I18 plan declared contract ① and the pipeline implements it correctly, but the bridge wiring that supplies the scope data was never extended to subscribe to binding-expression paths. Under the v1 / no-compatibility-burden baseline, a headline feature contract ("点表可选") that silently produces `NaN` and never updates cannot be excused as "edge case."
- **Status:** Introduced/locked by plan `2026-08-05-2129-1` Phase 2 (I18.2 "点表可选契约锁定"). The plan added scenario ① as a contract-lock test but the test mocks the integration boundary (direct `pipeline.flushFrame` with hand-injected scope), so CI green does not reflect end-to-end behavior. Pre-I18 the same gap existed (`extractFluxScopePaths` also scanned only variables), but I18 explicitly promoted "no-variables direct scope binding" to a locked contract — at which point the gap became a contract break rather than a latent limitation.
- **Risk:** Any SCADA config that (a) omits `variables` AND (b) uses `bindings: { x: { expression: '${scopeMember}' } }` — the exact pattern contract ① blesses — silently renders `NaN`/`undefined`-derived values and never reactively updates. Authors following `design-data-binding.md` §9.1 (which documents the no-variables direct-scope pattern as supported) get a broken canvas with no diagnostic. The reverse index correctly tracks the dependency (so the pipeline would recompute IF it got fresh scope), but the subscription that triggers fresh scope is missing — a partial wiring that is especially hard to diagnose.
- **Suggestion:** In `useScadaPointsBridge`, union `analyzeFluxSubscriptions(config).paths` with the binding-expression scope paths from the reverse index (`runtime.reverseIndex.pointIds()`, or a derived helper that scans `config.symbols[].bindings[].expression` via `collectBindingPointIds`). Since the reverse index is (re)built in `use-scada-engine` on config reload, expose its `pointIds()` (or a memoized binding-scope-path set) to the bridge and include it in the `useScopeSelector` `paths`. Add an integration test that mounts the real `ScadaCanvasRenderer` (or at least the real bridge + a real `useScopeSelector` driving scope) with a no-variables + binding.expression config and asserts the symbol updates when scope changes — closing the dimension-23 false-green.
- **False-positive exclusion:** NOT a calibrated non-issue — it is a concrete user-visible incorrect behavior with a clear cause (subscription path set is incomplete). NOT an already-adjudicated item — the I18 plan adjudicated the _syntax_ unification (`${expr}`-only) and the _variables-optional type contract_, but never adjudicated the _subscription wiring_ for binding-expression scope paths. NOT reasonable local state — it concerns the runtime data-flow ownership (who triggers scopeData refresh). The v1/no-compatibility-burden baseline means a recently-locked contract that is broken end-to-end cannot be excused as "still converging."

## [P1-2] (Dim 19) `RefreshPipeline.onError` is never wired in production — all `source:'expression'` / `binding.expression` / `scale.expression` evaluation failures are SILENT

_Justification: error swallowing in production wiring, masked by tests that wire `onError`. This is the same defect class as the prior 0653 P1-1/P1-2 ("error channel declared, implemented, and tested — but never wired in production"), for a THIRD parallel channel. The 0653 audit caught and fixed the bridge's `onError` (flux-variable errors) and the engine's `onHandlerError` (symbol-event-handler errors); the pipeline's `onError` (expression-point + binding.expression + scale.expression errors) was missed. The result is a stark observability asymmetry: `source:'flux'` declaration errors are reported, but the equivalent-looking `source:'expression'` / `binding.expression` / `scale.expression` errors vanish silently._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:53-87` (`createBindingDomain` constructs `RefreshPipeline` with **no** `onError`; the function signature `:53-60` does not even accept an `onError` parameter)
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:585-589` (`reportError` → `this.options.onError?.(error)` → `undefined?.()` → no-op in production)
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:325` (iteration-budget guard), `:348,354` (`source:'expression'` point eval), `:415,421` (`binding.expression` / `scale.expression` eval) — all call `reportError` → all silent in production

- **Evidence:**

  ```ts
  // use-scada-engine.ts:53-87 — production pipeline construction (NO onError):
  function createBindingDomain(engine, pointStore, reverseIndex, collector, expressionCompiler?, env?) {
    ...
    const pipeline = new RefreshPipeline({
      pointStore, reverseIndex, collector,
      compiler: expressionCompiler, env,
      getStates: ..., getAnimations: ..., getSymbolIds: ...,
      animator,
      // ← NO onError field; signature has no onError parameter either
    });
    ...
  }

  // dirty-collector.ts:585-589 — reportError is a no-op when onError is undefined:
  private reportError(key: string, error: string): void {
    if (this.lastError.has(key)) return;
    this.lastError.add(key);
    this.options.onError?.(error);     // ← undefined in production → silent
  }

  // dirty-collector.ts:415-421 — binding.expression failures route here (silent in prod):
  private evaluateBindingExpression(expression: string): ScadaPrimitive | undefined {
    ...
    try {
      const value = this.evaluateFlux(expression);
      if (value === undefined) {
        this.reportError(expression, 'expression evaluation failed');   // ← silent in prod
        return undefined;
      }
      ...
    } catch (error) {
      this.reportError(expression, error instanceof Error ? error.message : String(error)); // ← silent
      return undefined;
    }
  }
  ```

  By contrast, the bridge DOES wire its parallel channel for `source:'flux'` declarations:

  ```ts
  // scada-canvas.tsx:220-231 — bridge onError IS wired (the prior 0653 P1-1 fix):
  useScadaPointsBridge({ ..., onError: reportDiagnostic });
  ```

  So `source:'flux'` errors reach `console.warn` + `env.monitor.onError`; `source:'expression'` / `binding.expression` / `scale.expression` errors reach nothing.

- **Severity:** **P1** — real defect (production error swallowing) + contract drift (the `RefreshPipeline.onError` option is a finished, documented field exercised by 27+ test cases, including `refresh-pipeline.test.ts:67` which wires it and `scada-robustness-hardening.test.ts` which asserts errors reach it). The test harness wires `onError`, so CI is green while production is silent — a textbook dimension-23 "integration-boundary mock" false-green (the test boundary is the pipeline with onError injected; production wiring is never exercised).
- **Status:** Live defect. `createBindingDomain` has never wired `onError` (verified by reading the full function and confirming zero `onError` references in `use-scada-engine.ts`). Neither the 0653 audit nor the subsequent remediation plans caught it, because the remediation focused on the bridge/engine channels (which were the reported P1s) and no integration test mounts the real engine to verify pipeline-layer errors reach a consumer.
- **Risk:** Authors writing `{ id:'foo', source:'expression', expression:'${broken syntax' }` or `bindings:{ fill:{ expression:'${broken}' } }` see the binding silently evaluate to `undefined` and the symbol stay at base style. There is no `console.warn`, no `env.monitor.onError`, no `onError` action dispatch, no `flux-compile-failed`/`flux-evaluate-failed` code anywhere. The author has no way to discover why their binding does nothing. For industrial HMI, where a mis-bound alarm-color binding is a safety-relevant silent failure, this is materially harmful. It also undermines the entire diagnostic-channel architecture (`scada-errors.ts` `SCADA_ERROR_CODES`, i18n mapping, `reportDiagnostic` outlet) which assumes all expression failures surface through one outlet.
- **Suggestion:** Add an `onError` (ideally `(code, message, error?) => void` matching the bridge signature — see also P2-4) to `createBindingDomain` parameters and wire it in `useScadaEngine` to the same `reportDiagnostic` outlet the bridge uses (`scada-canvas.tsx:126`). Unify the error codes so pipeline-layer expression errors emit `flux-compile-failed` / `flux-evaluate-failed` (the same codes the bridge uses), making the three declaration sources (`flux` / `expression` / binding-level) observably symmetric. Add an integration test that constructs the engine via `useScadaEngine` (not the test harness) with a broken `binding.expression` and asserts the error reaches `reportDiagnostic`/`monitor.onError`.
- **False-positive exclusion:** NOT a "transition layer" or "future contract" — `RefreshPipeline.onError` is a finished field with 27+ tests. NOT covered by existing integration tests — the bridge-diagnostics test mounts the bridge (which has its own onError wiring); no test mounts the engine's pipeline path with a broken binding.expression. NOT the same as the prior 0653 P1-1 — that was the _bridge_ channel; this is the _pipeline_ channel (different code path, different declaration sources). The v1 baseline disallows "the remediation only fixed the reported channels" as an excuse for an unfixed sibling channel.

## [P1-3] (Dim 02 / 14) `pnpm check:oversized-code-files` FAILS for 2 new industrial test files — hard-gate regression re-introduced by the remediation wave

_Justification: `pnpm check:oversized-code-files` is a documented hard gate (`ERROR: N files exceed 700 lines (MUST split)`) wired into `pnpm check`. The 0653 audit's P1-2 fixed the prior 2 oversized files (`scada-points-bridge.test.tsx`, `scada-engine.test.ts`) via plan `2026-08-05-0653-5`. But the same remediation wave (plans `2026-08-05-0653-{3,4}` + `2026-08-05-2129-1`) added tests that pushed 2 DIFFERENT industrial files over the 700-line hard limit. The package went from 0 oversized failures (post-0653-5) back to 2 oversized failures — the exact "hard-gate regression from test growth without split" pattern the 0653 audit called out as a cross-cutting lesson._

- **Files:**
  - `packages/flux-renderers-industrial/src/serialization/serialization.test.ts` — **749 lines** (>700 hard limit)
  - `packages/flux-renderers-industrial/src/binding/refresh-pipeline.test.ts` — **726 lines** (>700 hard limit)

- **Evidence:**

  ```text
  $ pnpm check:oversized-code-files
  [check-oversized-code-files] ERROR: 16 files exceed 700 lines (MUST split):
    ...
    - packages/flux-renderers-industrial/src/serialization/serialization.test.ts: 749
    - packages/flux-renderers-industrial/src/binding/refresh-pipeline.test.ts: 727
    ...
  ELIFECYCLE  Command failed with exit code 1
  ```

  `scripts/check-oversized-code-files.mjs` sets `ERROR_LINES = 700` with no test-file exemption (test files are subject to the same limit) and is wired into `pnpm check`. The 0653-5 closure left this package at 0 industrial failures; the subsequent `0653-{3,4}` (binding/state + config-build/equality/diagnostics) and `2129-1` (expression unification) plans added the regression tests that pushed `serialization.test.ts` (C1/C2/legacy-atSyntax + I18 round-trip) and `refresh-pipeline.test.ts` (B1-B5 binding/state + C3/C4) over 700.

- **Severity:** **P1** — hard CI gate (`pnpm check`) currently fails for this package. Same grading as the prior 0653 P1-2 (which was identical in shape). The package regressed from clean (post-0653-5) to failing.
- **Status:** Hard gate failing at audit time. `wc -l` confirms 749 / 726 lines respectively (both > 700).
- **Risk:** Any CI run that executes `pnpm check` fails on these 2 files. If the gate is enforced as a merge blocker (it carries "MUST split" language), these files block all industrial-hmi merges until split. The files will keep growing as the serialization/binding contract tests expand, deepening the split debt — exactly the trajectory the 0653 audit warned about.
- **Suggestion:** Split each file by domain. For `serialization.test.ts` (749): separate the legacy-at-syntax/codemod, C1 leaf-with-children, C2 key-order-insensitive equality, and round-trip/serialize suites into focused siblings. For `refresh-pipeline.test.ts` (726): separate B1-B5 binding/state-resolution, C3 cause-透传, C4 deps-empty, and lifecycle describe blocks into focused siblings. Both files already have clear `describe` boundaries — the split is mechanical. (Alternatively request an `OVERSIZED_EXEMPTIONS` entry with cited justification, but splitting is preferred per AGENTS.md.) Remediation plans that add tests MUST include a file-size check in their exit criteria, not just a test-count check — this is the second time the same pattern has regressed.
- **False-positive exclusion:** NOT a pre-existing condition — the 0653-5 closure explicitly brought this package to 0 oversized failures. NOT a workspace-wide issue the package can ignore — AGENTS.md's package-level verification checklist requires the gates to pass, and this package now violates the documented "MUST split" standard. NOT shielded by any calibration pattern.

---

# P2 Findings (non-blocking polish / residual cleanup — backlog)

## [P2-1] (Dim 16) `design-renderer.md` §11 implementation tree is stale: wrong paths for `schemas.ts`/`renderer-definitions.ts`, missing `use-scada-handles.ts`/`scada-errors.ts`/`serialization/equality.ts`

- **File (doc):** `docs/components/industrial-hmi/design-renderer.md:303-313` (§11 实现拆分建议)
- **Evidence:**
  ```
  ├── renderer/
  │   ├── scada-canvas.tsx
  │   ├── schemas.ts                # ← doc places this under renderer/; live: src/schemas.ts
  │   ├── renderer-definitions.ts   # ← doc places under renderer/; live: src/renderer-definitions.ts
  │   ├── hooks/
  │   │   ├── use-scada-engine.ts
  │   │   ├── use-scada-config-sync.ts
  │   │   ├── use-scada-points-bridge.ts
  │   │   └── use-scada-events.ts   # ← use-scada-handles.ts MISSING (consumed at scada-canvas.tsx:16,233)
  │   └── ...
  └── index.ts
  ```
  Live layout: `src/schemas.ts`, `src/renderer-definitions.ts` (both top-level, verified by `ls src/`); `src/renderer/hooks/use-scada-handles.ts` exists; `src/renderer/scada-errors.ts` exists (referenced in §8.5 line 265 but absent from §11 tree); `src/serialization/equality.ts` exists (C2 shared deep-equal, absent from §11 serialization/ list).
- **Severity:** P2 — doc line/path rot on the canonical implementation map; no contract break, no consumer impact.
- **Status:** §11 tree out of sync since at least the `2026-08-04-1558-1` surface cleanup; the I18 wave did not refresh it.
- **Risk:** Future maintainers reading §11 to navigate the package look in `src/renderer/schemas.ts` / `src/renderer/renderer-definitions.ts` and don't find them; believe `use-scada-handles.ts` does not exist; miss `scada-errors.ts`/`equality.ts`. Increases onboarding friction and risks duplicate file creation.
- **Suggestion:** Rewrite §11 tree to match live layout: move `schemas.ts` and `renderer-definitions.ts` to `src/` top level; add `use-scada-handles.ts` to hooks; add `scada-errors.ts` to `renderer/`; add `equality.ts` to `serialization/`.
- **False-positive exclusion:** Not a low-code dynamic boundary; these are stable main-path production modules. Under v1 baseline, doc drift on the canonical implementation map is a real (if low-severity) defect.

## [P2-2] (Dim 16) `design-engine.md` §9 still references deprecated `$xxx` flux syntax after I18 unification

- **File (doc):** `docs/components/industrial-hmi/design-engine.md:270`
- **Evidence:** `- **表达式**：引擎不参与表达式求值；绑定表达式/flux \`$xxx\` 由数据层（I2.2）消费…`. Per `design-data-binding.md` §4.2 (post-I18 authoritative): `$xxx`不再剥离`$` → 视为未知标识符求值 undefined（Failure Path `dollar-without-brace`）. So `$xxx`is no longer valid flux binding syntax post-I18; only`${expr}` is honored.
- **Severity:** P2 — stale syntax sample in a sibling design doc; misleads readers about the live binding contract.
- **Status:** `design-data-binding.md` was updated for I18 (§2/§4.2/§9.1/§12), but `design-engine.md` §9 retained the obsolete `$xxx` example.
- **Risk:** A reader follows the §9 example, authors a `$xxx` binding, and hits the `dollar-without-brace` failure path with undefined value; or assumes `$xxx` is canonical and propagates it.
- **Suggestion:** Replace `` `$xxx` `` with `` `${expr}` `` and add a one-line pointer to `design-data-binding.md` §4.2 as the post-I18 authoritative syntax contract.
- **False-positive exclusion:** The string is presented as the live consumption syntax; after I18 it is explicitly the deprecated form the runtime rejects. v1 baseline disallows "transitional syntax" allowances.

## [P2-3] (Dim 16) `editor-initiation.md:60` references deleted `expression-evaluator` module and deprecated `@{pointId}` syntax

- **File (doc):** `docs/components/industrial-hmi/editor-initiation.md:60` (§3 三态清单 row 8)
- **Evidence:** Row 8 lists `…dirty-collector（合帧单次 applyAttrs）、expression-evaluator（\`@{pointId}\` 子集）、value-to-state…`. Live: `ls packages/flux-renderers-industrial/src/binding/expression-evaluator.ts`→ **No such file or directory**.`binding-expression-unification.test.ts:265-269`actively asserts the deletion.`@{pointId}` is the deprecated pre-I18 dialect (`validator`now warns`legacy-at-syntax`). The authoritative post-I18 module split (`bind-resolver.ts`+`flux-eval.ts`) is in `design-data-binding.md` §11.
- **Severity:** P2 — capability-inventory doc references a non-existent module + deprecated syntax.
- **Status:** Row 8 was not updated after I18 deleted `expression-evaluator.ts` and replaced it with `bind-resolver.ts` + `flux-eval.ts`.
- **Risk:** The editor-mission (I16) initiation work treats this row as a reusable-surface inventory; readers look for `binding/expression-evaluator.ts`, fail to find it, and either assume the binding domain is incomplete or duplicate the module. This is the most consequential of the three doc-drift items because the doc's purpose is to map live surfaces for the next mission.
- **Suggestion:** Replace `expression-evaluator（\`@{pointId}\` 子集）`with`bind-resolver（\`${expr}\` 经注入 compiler 求值 + 属性映射，I6.2/I18）+ flux-eval（isScadaPrimitive + createPrivateEvalScope，I18 提取）`, aligning row 8 with `design-data-binding.md` §11.
- **False-positive exclusion:** The deletion is verified by an active regression test, and `design-data-binding.md` §11 already reflects the post-I18 split — so this is a genuine outlier, not a coordinated pre-I18 snapshot.

## [P2-4] (Dim 19) `evaluateFlux` collapses non-cycle errors to a generic string — even with `onError` wired (P1-2), the host receives no structured error context

- **File:** `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:384-407, 410-424, 348, 415`
- **Evidence:**
  ```ts
  private evaluateFlux(expression: string): ScadaPrimitive | undefined {
    ...
    try { compiled = this.options.compiler.compileValue(normalized); }
    catch (error) {
      const cycle = findCircularDependencyError(error);
      if (cycle) throw cycle;
      return undefined;                 // ← swallows compile error, no upstream visibility
    }
    ...
    try { return isScadaPrimitive(value) ? value : undefined; }
    catch (error) {
      const cycle = findCircularDependencyError(error);
      if (cycle) throw cycle;
      return undefined;                 // ← swallows evaluate error
    }
  }
  // callers then dedupe to a literal string:
  if (value === undefined) { this.reportError(pointId, 'expression evaluation failed'); ... }
  ```
- **Severity:** P2 — debuggability gap that compounds P1-2. Distinct from P1-2 (P1-2 = channel absent; this = channel signature loses context even when present).
- **Status:** Pipeline-layer expression errors collapse to the literal `'expression evaluation failed'` (or `error.message` only in the catch branch). The original `Error` from `flux-formula` (syntax position, evaluator reason, cause chain) is discarded inside `evaluateFlux`'s catch and never re-emitted. Compare the bridge path (`use-scada-points-bridge.ts:224-230` + `scada-canvas.tsx:135`) which preserves the original error via `new Error(message, { cause: error })`.
- **Risk:** Even after P1-2 wires `onError`, host monitoring cannot distinguish `${1+}` (syntax) from `${a.b.c}` (runtime TypeError) from a cycle that escaped `findCircularDependencyError`. The pipeline path is structurally weaker than the bridge path.
- **Suggestion:** Widen `RefreshPipelineOptions.onError` to `(code, message, error?) => void` (mirror `UseScadaPointsBridgeArgs.onError`). Plumb the original error from `evaluateFlux` via a sentinel return or a wrapped non-cycle re-throw caught by `syncExpressionPoint`/`evaluateBindingExpression`. Unify codes (`flux-compile-failed` / `flux-evaluate-failed`) with the bridge.
- **False-positive exclusion:** Not the same finding as P1-2. Both must be addressed for faithful error propagation.

## [P2-5] (Dim 19) `handler-error` diagnostic drops the original `Error` AND has no `monitor.onError` telemetry path

- **File:** `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:126-147, 176-177`
- **Evidence:**
  ```ts
  // scada-canvas.tsx:176-177 — caller extracts message ONLY, drops the error object:
  onHandlerError: (error) =>
    reportDiagnostic('handler-error', error instanceof Error ? error.message : String(error)),
  // scada-canvas.tsx:130-141 — reportDiagnostic forwards to monitor.onError ONLY for flux-* codes:
  if (code === 'flux-compile-failed' || code === 'flux-evaluate-failed' || code === 'flux-deps-empty') {
    const reportedError = error === undefined ? new Error(message) : new Error(message, { cause: error });
    rendererRuntime.env.monitor?.onError?.({ phase: 'expression', error: reportedError, details: { code } });
  }
  // handler-error gets console.warn only
  ```
- **Severity:** P2 — observability gap for a distinct error code; residual of the prior P2-4 fix (which added `cause` preservation for flux-\* codes but explicitly left `handler-error` out).
- **Status:** Two compounding losses: (a) the inline arrow at `:176-177` extracts only `error.message`, dropping the original `Error` (stack/cause) before reaching `reportDiagnostic`; (b) `reportDiagnostic` only forwards to `monitor.onError` for the three `flux-*` codes — `handler-error` gets only `console.warn`. The file comment at `:117` explicitly defers this as a "Follow-up."
- **Risk:** Host monitoring has zero visibility into user-side symbol-handler failures. A regression that breaks every symbol-click handler produces only `console.warn`, invisible to telemetry pipelines; the handler stack is also lost. Under the v1 baseline, a documented "follow-up" for production observability is a live defect.
- **Suggestion:** (a) Pass the original error as the third arg: `reportDiagnostic('handler-error', …, error)`. (b) Either extend `monitor.onError` typing to admit an `'action'` phase (preferred — unifies telemetry) or add a parallel `monitor.onActionError` channel. (c) Update the comment to reflect the implemented contract, not a deferred follow-up.
- **False-positive exclusion:** NOT the same as the prior-confirmed-fixed P2-4 (cause-chain for flux-\* codes). This is a DIFFERENT code (`handler-error`) that was explicitly left out of that fix and still has neither cause preservation nor a monitor channel.

## [P2-6] (Dim 19) `findCircularDependencyError` cause-chain depth cap of 10 is too low for realistic 10+ layer expression chains

- **File:** `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:137-148`
- **Evidence:**
  ```ts
  export function findCircularDependencyError(error: unknown): CircularDependencyError | undefined {
    let current: unknown = error;
    let depth = 0;
    while (current && typeof current === 'object' && depth < 10) {
      // ← cap of 10
      if (current instanceof CircularDependencyError) return current;
      const cause = (current as { cause?: unknown }).cause;
      if (cause === current || cause === undefined) break;
      current = cause;
      depth++;
    }
    return undefined;
  }
  ```
  The file's own comment (`:124-127`) documents that each level of nested expression evaluation adds one wrapper layer to the cause chain.
- **Severity:** P2 — cycle misclassified as generic eval failure for deep (≥11) expression chains.
- **Status:** Industrial HMI data pipelines routinely chain `source:'expression'` declarations (raw input → engineering units → range check → bounded value → formatted display → derived state). 10+ layer chains are realistic for process plants. When such a chain contains a cycle, the cap of 10 causes `findCircularDependencyError` to return `undefined` → `evaluateFlux` swallows the error → surfaces as generic `'expression evaluation failed'` (via P1-2, silently in production), losing the cycle identification and involved-point list.
- **Risk:** Deep accidental cycles are undiagnosable: operator sees "expression evaluation failed" with no cycle hint, no involved-point list, and (per P1-2) not even that in production. Diagnosis requires hand-tracing the dependency graph.
- **Suggestion:** Either walk the cause chain without an artificial depth cap (the `cause === current` / `cause === undefined` guards already prevent infinite loops), or raise the cap to a value large enough for realistic pipelines (e.g. 1000). The cap is purely defensive redundancy and is too low.
- **False-positive exclusion:** Not hypothetical — the formula-compiler wrapping behavior is documented in the file's own comments, and 10+ layer expression chains are realistic for industrial process pipelines.

## [P2-7] (Dim 21) Fill branch lacks the `1e-6` width/height floor — `clampScale(Infinity)` returns `MIN_SCALE`, producing zoom-OUT (opposite of `fit`/contain) for zero-size content

- **Files:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:113-127` (fill branch) vs `packages/flux-renderers-industrial/src/engine/viewport.ts:61-75` (`fit`/contain) and `:27-30` (`clampScale`)
- **Evidence:**
  ```ts
  // use-scada-config-sync.ts:120-126 — fill branch (NO width/height floor):
  const size = runtime.engine.getSize();
  const scale = clampScale(Math.max(size.width / bounds.width, size.height / bounds.height));
  //                                  ↑ bounds.width === 0 → Infinity
  // viewport.ts:27-30 — clampScale maps Infinity to MIN_SCALE:
  export function clampScale(scale: number): number {
    if (!Number.isFinite(scale)) return MIN_SCALE; // ← Infinity → 0.1 (zoom OUT)
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }
  // viewport.ts:65-67 — fit (contain) DOES floor:
  const bw = Math.max(1e-6, bounds.width); // ← → huge finite → clampScale → MAX_SCALE (zoom IN)
  const bh = Math.max(1e-6, bounds.height);
  ```
- **Severity:** P2 — display-correctness inconsistency between `fit:'contain'` and `fit:'fill'` for the same degenerate (zero-size) input.
- **Status:** For a config whose bounds have zero width or height (e.g. a single `custom.points = [[5,5]]` symbol, or a layout where all symbols share one coordinate), `size.width / 0 = Infinity` → `clampScale(Infinity) = MIN_SCALE` (zoom out). The `fit`/contain branch defends with `Math.max(1e-6, bounds.width)` → huge finite → `MAX_SCALE` (zoom in). Author intent for "fill" is "maximize coverage of viewport" = zoom IN. The P2-5 clamp-before-center fix correctly handled scale-then-center ordering but missed the upstream Infinity→MIN_SCALE misrouting.
- **Risk:** A page that works under `contain` silently breaks (zooms the wrong way) if the author switches to `fill` for a single-point schematic. Single-point schematics are realistic in industrial HMI (single sensor with `custom.points` overlay).
- **Suggestion:** Apply the same `Math.max(1e-6, bounds.width)` / `Math.max(1e-6, bounds.height)` floor before the divisions in the fill branch, so fill's zero-size behavior converges to `MAX_SCALE` (matching contain). Better: refactor `fit` to expose a shared helper that both branches call.
- **False-positive exclusion:** Not "edge case with no impact" — single-point schematics are realistic, and the contain/fill asymmetry is a contract-level inconsistency, not a stylistic preference.

## [P2-8] (Dim 21) `handlePluginZoom` divide-by-zero — `clamped / rawScale` produces `Infinity` passed to `scaleOfWorld` when `zoomLayer.scaleX === 0`

- **File:** `packages/flux-renderers-industrial/src/engine/scada-engine.ts:425-445` + `:466-468` (`readZoomLayerScale`)
- **Evidence:**
  ```ts
  private readonly handlePluginZoom = (event?) => {
    const zoomLayer = this.app.tree.zoomLayer as ...;
    const rawScale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale); // = 0 when scaleX === 0 (0 is finite)
    const clamped = clampScale(rawScale);          // clampScale(0) = MIN_SCALE (0.1)
    if (clamped !== rawScale) {                     // 0.1 !== 0 → enter branch
      this.app.tree.zoomLayer.scaleOfWorld(readZoomAnchor(event), clamped / rawScale);
      //                                                              ↑ 0.1 / 0 = Infinity
    }
    ...
  };
  ```
- **Severity:** P2 — undefined engine behavior on a degenerate plugin state.
- **Status:** If `zoomLayer.scaleX` ever becomes 0 (direct leafer manipulation, a viewport-plugin transition, or memory corruption), `readZoomLayerScale` returns 0 (0 is finite, fallback unused), the clamp-mismatch branch fires, and `MIN_SCALE / 0 = Infinity` is passed to leafer's `zoomLayer.scaleOfWorld`, whose behavior on `Infinity` is undefined (likely NaN matrix or thrown exception inside the affine transform). There is no recovery — subsequent pan/zoom reads garbage from `zoomLayer`.
- **Risk:** A single degenerate zoom event corrupts the `zoomLayer` matrix for the rest of the session (canvas freezes or throws inside leafer). The codebase already anticipates leafer returning non-finite values (`readZoomLayerScale` fallback, `clampViewport` NaN guards); the write-back direction lacks the same defensive posture.
- **Suggestion:** Guard early: `if (rawScale === 0 || !Number.isFinite(rawScale)) { this.syncViewportFromZoomLayer(); return; }`, or guard the division: `if (rawScale > 0) { ... scaleOfWorld(anchor, clamped / rawScale); }`. Defense-in-depth matches `clampViewport`.
- **False-positive exclusion:** Not "impossible in practice" — the fallback in `readZoomLayerScale` shows the codebase already anticipates non-finite leafer values; third-party leafer plugins or in-DOM test harnesses can produce 0.

## [P2-9] (Dim 15) Unbounded recursion in `validateSymbolNode` and `deepEqual` — stack overflow on deeply nested config

- **Files:** `packages/flux-renderers-industrial/src/serialization/validate.ts:264-280` (children recursion) and `packages/flux-renderers-industrial/src/serialization/equality.ts:17-32` (`deepEqual`)
- **Evidence:**
  ```ts
  // validate.ts:276-278 — recurse into children with no depth bound:
  nodeObj.children.forEach((child, index) => {
    validateSymbolNode(child, seenIds, errors, `${scope}.children[${index}]`, isKnownType);
  });
  // equality.ts:27-30 — recurse into object values with no depth bound:
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRecord, key)) return false;
    if (!deepEqual(aRecord[key], bRecord[key])) return false;
  }
  ```
- **Severity:** P2 — resource-exhaustion (stack overflow) on hostile/corrupted input; fail-closed boundary gap (R5).
- **Status:** No depth limit on either recursion. V8 caps at ~10-15k frames; a malicious/corrupted config with ~10k nested `scada-group` children, or a `custom` field with ~10k-level nested object, overflows both. `parseAndValidateConfig` catches it generically as `config-parse`, losing the structural reason; `diffScadaConfig` → `valuesEqual` → `deepEqual` crashes mid-diff and surfaces as `config-build-failed`. The `${scope}.children[...]` string concatenation also produces a ~120 KB scope string per level-10000 path.
- **Risk:** Untrusted host configs (FUXA import, projector JSON) crash the renderer with "Maximum call stack size exceeded"; author cannot locate the offending nesting.
- **Suggestion:** Add a `depth` parameter (cap e.g. 100) to both `validateSymbolNode` and `deepEqual`; on overflow, push a structured error / return a sentinel. Cheap, removes the hard crash.
- **False-positive exclusion:** Not a low-code dynamic boundary — these are deterministic pure functions on host-supplied JSON. Industrial-HMI host configs come from external project files (realistic untrusted input).

## [P2-10] (Dim 07) `engine.reset()` (full rebuild path) does not clear `InteractionOverlay` — stale hover highlights persist after `importConfig` / version-change reset

- **Files:** `packages/flux-renderers-industrial/src/engine/scada-engine.ts:191-199` (`reset`) vs `:308-321` (`applyDiff` DOES clear), `:313`; `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-events.ts:77` (`lastHoverSymbolRef` not reset)
- **Evidence:**
  ```ts
  // scada-engine.ts:191-199 — reset path (no overlay clear):
  reset(config: ScadaConfig): void {
    if (config.background?.color) { this.app.ground.fill = config.background.color; }
    this.adapter.build(config);   // destroys + rebuilds tree/registry only
    // ← no this.interaction?.clear() anywhere
  }
  // scada-engine.ts:313 — diff path DOES clear:
  for (const id of diff.removed) { this.interaction.clear(id); }
  ```
- **Severity:** P2 — stale hover-rect UI residue on programmatic full config swap.
- **Status:** `engine.reset` only runs `adapter.build` (registry.clear + tree destroy). The sky-layer `InteractionOverlay` group and its `overlays` Map are untouched. The diff path explicitly clears removed-symbol overlays, but the full-reset path (used by the `importConfig` handle and any version-change full rebuild via `use-scada-config-sync`) has no equivalent. `useScadaEvents.lastHoverSymbolRef` is also not reset on config change, so the events hook continues to believe the user is hovering the old (now-removed) symbol.
- **Risk:** If the user is hovering symbol A when the host calls `component:invoke('importConfig', …)`, the translucent hover rect for A persists at A's old geometry until the user moves the pointer. On a periodic-config-refresh deployment this is observable as ghost highlights. It also breaks A→A re-enter dedup if the new config re-adds a symbol with the same id.
- **Suggestion:** At the end of `engine.reset()` (or inside `adapter.build()` destroy phase), call `this.interaction?.clear()`. Symmetrically reset `lastHoverSymbolRef.current = undefined` from a config-change effect in `use-scada-events.ts` (alongside the existing `eventIndex` rebuild).
- **False-positive exclusion:** NOT the diff path (which IS tested by `scada-hover-overlay.test.tsx:121-134`). The gap is the full-reset path; verified no test asserts overlay state after `engine.reset` or after the `importConfig` handle. NOT transient local state — the highlight lives in the engine layer, survives the registry clear, and has no self-expiry.

## [P2-11] (Dim 22) `useScadaHandles` re-registers the component handle on every `runtime` change (every config reload), although `invoke` already reads latest runtime via ref

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-handles.ts:45-156` (effect deps at `:156`)
- **Evidence:**
  ```ts
  // use-scada-handles.ts:55-147 — invoke reads runtime from the ref, not the closure:
  invoke(method, payload) {
    ...
    const current = latest.current.runtime;     // ← reads from ref
    if (!current?.engine || current.engine.isDestroyed()) return notMounted();
    switch (method) { ... }
  },
  // use-scada-handles.ts:156 — but runtime is STILL in the dep array:
  }, [componentRegistry, id, cid, runtime, destroy, onDestroyed, reloadConfig]);
  ```
- **Severity:** P2 — redundant re-registration churn on every config reload; no correctness impact (ref keeps invoke correct).
- **Status:** The L6 fix (`plan 2026-08-04-2243-1 Phase 3`, `scada-canvas.tsx:240-249`) wrapped `reloadConfig` in `useCallback` to stop same-props re-renders from churning the handle. But the effect's dep array still includes `runtime`, so every config reload (`reloadBindings` → `setRuntime(next)` at `use-scada-engine.ts:276`) produces a new `runtime` reference and forces re-registration. This is redundant because `capabilities.invoke` reads `latest.current.runtime` (the ref), so a registered handle always operates against the live runtime without re-registration.
- **Risk:** (1) Each reload allocates a throwaway `capabilities` object and runs `register` + unsubscribe. (2) If the host `ComponentHandleRegistry` emits registration lifecycle events or interns handles by identity, downstream listeners see a spurious unregister/register pair per reload even though the renderer is stably mounted. The existing test (`scada-handles.test.tsx:262-283`) only covers the same-props re-render case, not the reload case.
- **Suggestion:** Drop `runtime` from the dep array (registration identity is `{ id, _cid: cid, type }`, all stable; `invoke` reads runtime from the ref). Keep `[componentRegistry, id, cid, destroy, onDestroyed, reloadConfig]`. Add a regression test that triggers a non-empty diff (→ `reloadBindings` → `setRuntime`) and asserts `componentRegistry.register` is not called a second time.
- **False-positive exclusion:** NOT covered by the existing L6 test — that test re-renders with identical props, so `runtime` never changes. The reload path is distinct. NOT necessary for correctness — traced every `invoke` branch; all read `latest.current.runtime`.

## [P2-12] (Dim 23) Codemod test inlines a SUBSET of production codemod patterns — verifies an equivalent copy, not the actual `scripts/scada-expression-codemod.mjs`

- **File:** `packages/flux-renderers-industrial/src/serialization/expression-codemod.test.ts:21-37`
- **Evidence:**
  ```ts
  // === codemod 等价逻辑（与 scripts/scada-expression-codemod.mjs 的 patterns 同源） ===
  const AT_SYNTAX_PATTERN = /@\{([^{}]*?)\}/g;
  const DOLLAR_SHORTHAND_PATTERN = /(?<=flux:\s*'|expression:\s*')\$([a-z_][a-zA-Z0-9_.-]*)(?=['"])/g;
  function migrateContent(content: string): { migrated: string; count: number } { ... }
  ```
  Production `scripts/scada-expression-codemod.mjs:26-55` declares THREE patterns (`AT_SYNTAX_PATTERN`, `DOLLAR_SHORTHAND_PATTERN`, `QUOTED_DOLLAR_PATTERN`); the test's inline copy omits `QUOTED_DOLLAR_PATTERN` entirely and has only 2 `.replace()` calls.
- **Severity:** P2 — test verifies an inlined equivalent, not the production function; manual-sync hazard.
- **Status:** Test passes against its own copy; the production codemod's `QUOTED_DOLLAR_PATTERN` (declared, currently dead-code with a "暂不处理数组形式" comment) is invisible to the test. The comment explicitly acknowledges the manual-sync requirement ("若改 patterns，同步更新两边").
- **Risk:** If someone activates the `QUOTED_DOLLAR_PATTERN` branch, production diverges from the test's inlined copy and the test stays green. The test's stated purpose (its comment block) is to guard the production codemod contract ("Test Strategy Tier: Must automate — 表达式语法为组态公共契约"); testing an inlined equivalent defeats that.
- **Suggestion:** Replace the inlined copy with `import { migrateContent } from '../../../../../scripts/scada-expression-codemod.mjs'` so the test verifies the actual production function. (`migrateContent`/`migrateFile` are explicitly exported; only `migrateFile`/`main` use `node:fs`, which vitest can externalize.)
- **False-positive exclusion:** NOT a reasonable isolation test — the test's stated purpose is to guard the production codemod. The prod/test divergence on `QUOTED_DOLLAR_PATTERN` is already real (declared in prod, absent in test).

## [P2-13] (Dim 23) `binding-expression-unification.test.ts:459` asserts an UNRELATED point's value — branch covered but claimed behavior not verified

- **File:** `packages/flux-renderers-industrial/src/binding/binding-expression-unification.test.ts:459-473`
- **Evidence:**
  ```ts
  it('expression 声明无 expression 字段（`?? ""` 兜底，line 342/372 false branch）', () => {
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 1 },
        { id: 'blank', source: 'expression' as unknown as 'expression', init: 0 } as never,
      ],
      symbols: [],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.pointStore.getPointValue('a')).toBe(1); // ← asserts 'a', NOT 'blank'
  });
  ```
- **Severity:** P2 — false-green: the test title and comment claim to verify the `?? ''` fallback for a missing `expression` field, but the assertion verifies `getPointValue('a') === 1` — point `a` is a static point unrelated to `blank`. `getPointValue('blank')` is never asserted.
- **Status:** The comment admits the goal is branch coverage ("仅触发 syncExpressionPoint('blank') 即可覆盖 ?? 兜底分支（不写入 meaningful 值也无妨）"). The claimed behavior (`blank` → `'${}'`) is never asserted.
- **Risk:** If the `?? ''` fallback changes (e.g. someone "fixes" it to throw, or flux-formula's handling of `${}` changes from literal to error), this test still passes because `a`'s value is unaffected. False confidence that the fallback is verified.
- **Suggestion:** Add `expect(harness.pointStore.getPointValue('blank')).toBe('${}')` (or the actual evaluated value) to verify the claimed behavior. If the value is truly meaningless, at minimum assert it is not `undefined` / not the `init` value to prove the `?? ''` path ran.
- **False-positive exclusion:** The behavior IS verifiable — `getPointValue('blank')` is a public API and the comment already predicts the expected value. The test simply asserts the wrong point.

## [P2-14] (Dim 23) `scada-canvas-smoke.test.tsx:35` claims "scene build" but only verifies the engine constructor ran (handle registered)

- **File:** `packages/flux-renderers-industrial/src/scada-canvas-smoke.test.tsx:35-52`
- **Evidence:**
  ```tsx
  it('compiles and renders the real scada-canvas renderer with scene build', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialRendererDefinitions);
    const { container } = render(<SchemaRenderer ... schema={{ type: 'scada-canvas', config: validConfig }} ... />);
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    const handles = Object.keys(window).filter((key) => key.startsWith('__flux_scada_'));
    expect(handles.length).toBeGreaterThan(0);
    // ← NO assertion that rect-1 was added to the scene
    // ← NO assertion that data-status === 'ready'
    // ← NO assertion that bindings were resolved
  });
  ```
- **Severity:** P2 — the sole full-schema-pipeline integration test gives false confidence; "scene build" claim unverified.
- **Status:** This is the ONLY file in the package using `createSchemaRenderer` (full schema compilation → renderer mount). The strongest assertion (`handles.length > 0`) is satisfied by the engine constructor running (`use-scada-engine.ts:191-203` registers the handle BEFORE config sync runs, and `scada-canvas.tsx:165` hardcodes `exposeTestHandle: true`). The test passes even if the config is silently dropped and zero symbols are built. The sibling test in the same file (`:70`) does assert `data-status === 'ready'`; this one lacks even that.
- **Risk:** If schema compilation produces a renderer that mounts but silently fails to process `config` (e.g. compiler misclassifies the `config` prop, or `parseAndValidateConfig` drops it), this test stays green. The "scene build" name gives false confidence that the integration is verified.
- **Suggestion:** Add assertions that verify the scene was built: query the test handle for `getSymbols()` and assert `rect-1` is present, or assert `root.getAttribute('data-status') === 'ready'`, or query the canvas DOM for the rendered symbol node.
- **False-positive exclusion:** NOT "smoke test is supposed to be minimal" — the test name explicitly says "with scene build". `handles.length > 0` is essentially `not.toThrow()` in disguise (it verifies the engine was constructed, nothing more).

## [P2-15] (Dim 14) `variables-optional-contract.test.ts:247` sole assertion is `not.toThrow()` — pipeline-empty contract not actually verified

- **File:** `packages/flux-renderers-industrial/src/binding/variables-optional-contract.test.ts:235-248`
- **Evidence:**
  ```ts
  it('空 config（仅 version + symbols）：pipeline 仍可构造并 flushFrame', () => {
    const pointStore = new PointStore();
    const reverseIndex = new ReverseIndex([], { compiler: expressionCompiler, env });
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
    });
    expect(() => pipeline.flushFrame(() => undefined)).not.toThrow(); // ← sole assertion
  });
  ```
- **Severity:** P2 — `not.toThrow()` as the sole assertion; the test claims to verify "pipeline 仍可构造并 flushFrame" but does not verify the return value (`false` when nothing pending) nor that `applyAttrs` was NOT called.
- **Status:** If `flushFrame` on an empty pipeline starts returning `true` (falsely claiming work done) or starts calling `applyAttrs` with garbage, this test still passes. Low-impact edge case, but the contract is documented and verifiable.
- **Risk:** Low. False confidence that the empty-pipeline contract is verified.
- **Suggestion:** Add `expect(pipeline.flushFrame(...)).toBe(false)` and wrap the `applyAttrs` callback in a `vi.fn()` to assert it was not called — mirroring `dirty-collector.test.ts:30-36`.
- **False-positive exclusion:** The behavior IS verifiable — `flushFrame` returns a boolean and the callback is injectable.

---

# Per-Dimension Coverage Summary

| Dim                    | Result                                                                                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Dependency graph    | Clean — manifest, gates, cycles, internal-path scan all clean. leafer 2.2.9 locked; `@leafer-in/viewport` correctly in deps; no undeclared `@nop-chaos/*` imports; no private subpaths; no cycles.                                                                                              |
| 02 Module size         | **1 P1** (P1-3 — 2 oversized test files regress the hard gate).                                                                                                                                                                                                                                 |
| 03 API surface         | Clean — public surface收敛; schema↔manifest↔renderer contract closed (no undeclared/consumed fields); `RendererComponentProps<ScadaCanvasSchema>` consistent. Prior `serializeScadaConfig` over-export+enum drift confirmed FIXED.                                                              |
| 04 State ownership     | Clean — `status`/`errorInfo` are local UI state; `engineRef`/`runtimeRef` are necessary latest-ref patterns; bridge caches bounded + symmetrically invalidated; no props-to-state sync chains; no setState-during-render.                                                                       |
| 05 Reactive precision  | **1 P1 folded** (P1-1 binding-expression subscription gap). `useScopeSelector` selector/paths usage is otherwise correct; `pointSnapshotRef` generation-memoize correct.                                                                                                                        |
| 07 Lifecycle           | **1 P2** (P2-10 — `engine.reset` doesn't clear `InteractionOverlay`). All effect deps minimal; destroy gating symmetric (DirtyCollector + RefreshPipeline); no React 19 violations.                                                                                                             |
| 14 Test coverage       | **1 P2** (P2-15 — `not.toThrow()`-only empty-pipeline test). All production modules have focused tests; isolation solid; recent C1-C4/B1-B5 tests assert real behavior.                                                                                                                         |
| 15 Security/perf       | **1 P2** (P2-9 — unbounded recursion in validate + deepEqual). `eval`/`new Function` covered by lint (passing); no in-place mutation of store state on hot paths; no JSON.stringify change detection.                                                                                           |
| 16 Doc-code            | **3 P2** (P2-1 §11 stale file tree; P2-2 design-engine `$xxx`; P2-3 editor-initiation deleted `expression-evaluator`). I18 doc updates partially landed (data-binding doc correct; sibling docs lag).                                                                                           |
| 19 Error propagation   | **1 P1 + 3 P2** (P1-2 pipeline `onError` not wired; P2-4 evaluateFlux collapses errors; P2-5 handler-error loses error+telemetry; P2-6 cycle depth cap). All other catch blocks audited — none silently swallow beyond these. No `enabled:false` hardcodes.                                     |
| 21 Display/positioning | **2 P2** (P2-7 fill branch missing 1e-6 floor; P2-8 handlePluginZoom divide-by-zero). Prior x/y contract, defaultGeometryPoints, measureText, wheel anchor, isScadaPrimitive guard, own-keys deep-equal, clamp-before-center all verified correct.                                              |
| 22 Integration wiring  | **1 P1 + 1 P2** (P1-1 binding-expression subscription wiring; P2-11 handle re-registration). All 9 component handles + 5 events verified connected otherwise; `reloadConfig` stable-identity fix verified; `setPointValue` guard verified.                                                      |
| 23 Test effectiveness  | **3 P2** (P2-12 codemod inlined subset; P2-13 asserts unrelated point; P2-14 smoke "scene build" unverified). Plus the P1-1 false-green (scenario ① mocks the bridge boundary). No frozen-defect value assertions; no dead-code-with-tests; recent C1-C4/B1-B5 tests genuinely assert behavior. |

---

# Cross-Cutting Patterns

1. **"Channel/contract declared, tested, and green — but never wired in production" (P1-1, P1-2):** The same defect class as the prior 0653 P1-1/P1-2 (bridge `onError` + engine `onHandlerError` never wired), now resurfacing on two MORE channels: (a) the bridge's scope subscription never includes binding-expression paths (P1-1), and (b) the pipeline's `onError` is never forwarded (P1-2). In both cases a unit/isolation test green-checks the contract by injecting the missing wiring manually (scenario ① injects `scopeData`; `refresh-pipeline.test.ts` injects `onError`), so CI cannot see the production gap. **Actionable pattern:** any error channel or data-flow contract MUST have at least one integration test that mounts the real React/renderer boundary (not the pipeline/hook in isolation) and verifies the channel fires end-to-end. The 0653 remediation fixed the two REPORTED channels; the siblings stayed broken because no integration test surveyed the full channel set.

2. **"Hard-gate regression from test growth without split" (P1-3):** Identical to the 0653 P1-2 cross-cutting lesson. The 0653-5 closure fixed 2 files; the same remediation wave's later plans (0653-3/4 + 2129-1) added tests that pushed 2 DIFFERENT files over 700. Each plan individually added a reasonable number of tests; collectively they regressed the gate. **Actionable pattern:** remediation plans that add tests MUST include a `pnpm check:oversized-code-files` step in their exit criteria, not just a test-count check. This is the second occurrence — without an exit-criteria gate, a third is predictable.

3. **"I18 expression unification updated one doc, left siblings stale" (P2-2, P2-3) + "post-surface-cleanup §11 file tree not refreshed" (P2-1):** Same shape as the 0653 doc-drift cluster. `design-data-binding.md` was updated for I18 (`${expr}`-only, variables-optional), but `design-engine.md` §9 still shows `$xxx` and `editor-initiation.md:60` still references the deleted `expression-evaluator` module + deprecated `@{pointId}`. Separately, the §11 implementation file tree has been stale since the surface-cleanup phase (wrong paths for `schemas.ts`/`renderer-definitions.ts`, missing `use-scada-handles.ts`). **Actionable pattern:** any plan that changes syntax, deletes/renames a module, or moves a file MUST update ALL docs that reference it, not just the owner doc — with a grep-driven checklist in the plan's exit criteria.

4. **"Display-math defense added on one path, missed the sibling path" (P2-7, P2-8):** The viewport-hardening wave (x/y NaN defense, clamp-before-center) added `clampViewport`/`clampScale`/`Math.max(1e-6,…)` defenses on the `fit`/contain path and the position path, but the `fill` branch kept an unguarded `size.width / bounds.width` (P2-7) and `handlePluginZoom` kept an unguarded `clamped / rawScale` division (P2-8). **Actionable pattern:** when adding a numeric-defense fix, audit ALL sibling code paths that perform the same class of arithmetic, not just the reported path.

---

# Conclusion

`flux-renderers-industrial` is mechanically healthy at the package level — typecheck/lint/test all pass (**683/683 tests green across 49 files**, up from 615/43), and the **prior 2 P1s + 5 P2s are all confirmed FIXED** in live code with production-path regression proofs. The remediation plans `2026-08-05-0653-{2,3,4,5}` + `2026-08-05-1253-1` + `2026-08-05-2129-1` genuinely closed their scoped items.

This post-remediation audit surfaces **3 new P1s** and **15 P2s**. The P1s are:

1. **P1-1 (Dim 22/05):** Binding-level `expression` scope dependencies are never subscribed. The bridge's `useScopeSelector` only subscribes to `config.variables` flux paths; binding-expression scope paths (collected by the reverse index) are never forwarded to the subscription. The documented "variables-optional + direct-scope binding" contract ① — locked and green-tested by plan `2026-08-05-2129-1` — is broken in the live renderer: such bindings render `NaN`/undefined-derived values and never reactively update. The contract test is a dimension-23 false-green (it calls `pipeline.flushFrame` with hand-injected `scopeData`, bypassing the bridge).

2. **P1-2 (Dim 19):** `RefreshPipeline.onError` is never wired in production (`createBindingDomain` constructs the pipeline with no `onError`; the function signature doesn't accept one). All `source:'expression'` / `binding.expression` / `scale.expression` evaluation failures are SILENT — no `console.warn`, no `monitor.onError`, no diagnostic code. This is the same defect class as the prior 0653 P1s, on a third parallel channel missed by the remediation. Tests wire `onError`, masking the gap.

3. **P1-3 (Dim 02/14):** `pnpm check:oversized-code-files` FAILS for 2 new industrial files (`serialization.test.ts:749`, `refresh-pipeline.test.ts:726`), regressing from the 0653-5 closure's clean baseline. Same "test growth without split" pattern as the prior P1-2, re-introduced by the same remediation wave.

The P2 cluster is residual cleanup: 3 doc-drift items (post-I18 sibling docs + §11 file tree), 4 error-propagation residuals (evaluateFlux context collapse, handler-error telemetry, cycle depth cap), 2 display-math defenses missed on sibling paths (fill floor, zoom divide-by-zero), 1 unbounded-recursion fail-closed gap, 1 stale-overlay reset gap, 1 handle re-registration churn, and 3 test-effectiveness false-greens (codemod inline, unrelated-point assertion, smoke "scene build" claim). None block; all are recordable for the follow-up backlog.

A remediation plan should target the 3 P1s (wire the binding-expression subscription + add an integration test; wire `RefreshPipeline.onError` to `reportDiagnostic` + unify error codes + add an integration test; split the 2 oversized test files + add a file-size check to remediation exit criteria); P2s triage to the follow-up backlog.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
