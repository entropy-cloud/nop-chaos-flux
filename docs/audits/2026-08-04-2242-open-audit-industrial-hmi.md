> Audit Status: planned
> Audit Type: open-ended
> Mission: industrial-hmi
> Planned Into: `docs/plans/2026-08-04-2242-2-hmi-config-xy-bounds-contract-plan.md` (P1 x/y 3-way contract drift). P2 findings triaged to `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog (2026-08-04-2242 子节).

# Open-Ended Adversarial Audit — Mission `industrial-hmi`

**Date:** 2026-08-04 · **Auditor:** opencode (open-ended adversarial review per `docs/skills/open-ended-adversarial-review-prompt.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` (engine / binding / serialization / symbols / renderer / hooks), `apps/playground/src/pages/scada-*.tsx`, `tests/e2e/scada-*.spec.ts`, package config, against `docs/components/industrial-hmi/design-*.md`, `AGENTS.md`, `docs/skills/react19-best-practices-review.md`.

**Deduplication note (read first):** the same-session multi-dimensional audit `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` (ran moments ago) owns **2 P1s** (`useScadaPointsBridge` `onError` never wired in `scada-canvas.tsx`; `onHandlerError` never wired in `use-scada-engine.ts`) and **~22 P2s** (RefreshPipeline zombie guard, `DirtyCollector.destroyed` asymmetry, double-destroy collector, `pendingSkipRef` leak, `lastReportedErrors` never cleared, inline `reloadConfig` churn, default-shape bounds → MAX_SCALE, base-text centering, wheel-clamp anchor, `viewport` prop post-mount ignored, complex-expression silent disable, dead `ConfigAdapter.setConfig`, mock↔real drift on `zoomLayer`/bounds-API, e2e hard-gate coverage holes, pixel-probe weakness, `not.toThrow()` weak assertions, `IndustrialRendererSchema` over-export, three doc-table drifts). The prior session `docs/audits/2026-08-03-1506-open-audit-industrial-hmi.md` owned the original 3 P1s (all confirmed FIXED by the multi-audit) + 6 P2s. **This report records ONLY findings not covered by either.** Each candidate below was checked against both prior reports' titles/evidence sites before being kept.

**Perspectives used:** contract archaeologist (type ↔ validator ↔ runtime-consumer triple), exception-path detective (NaN/undefined propagation through the viewport pipeline), 10x-operator (alarm-storm write amplification), dead-code/anti-pattern sweeper (two modules writing the same field), cross-boundary messenger (handle-boundary input validation vs sibling bridge).

**Baseline:** v1 / no compatibility burden / no transitional main-path allowances — live code judged as final design.

---

# P1 Findings (must fix)

## [P1] `x`/`y` are a 3-way contract drift: type-required, validator-optional, bounds-consumer-raw → NaN viewport → silent total render failure

_Justification: real contract drift across the three layers that govern the config contract, with a catastrophic silent failure mode (blank canvas, no error) for any author who omits `x`/`y` while setting a viewport policy; the same omission is already defended in a sibling consumer, proving the intent is "default to 0", not "may be undefined"._

**Where (the drift triangulates across 3 layers):**

1. **Type declares `x`/`y` required.** `serialization/config-types.ts:57-58` — `interface ScadaSymbolNode { id; type; x: number; y: number; ... }`. A TS author cannot construct a node without `x`/`y`.
2. **Validator treats them as optional.** `serialization/validate.ts:180-181` — `checkNumberField(nodeObj, 'x', …)` / `'y'`, and `checkNumberField` (:13-22) only errors when the field **is present** and not a number (`if (field in node && typeof node[field] !== 'number')`). A JSON node that **omits** `x`/`y` passes `validateScadaConfig` with zero errors. `width`/`height`/`rotation`/`scale` are in the same optional boat (:182-184), but only `x`/`y` feed the bounds path below.
3. **Runtime bounds consumer reads them raw (no default).** `renderer/hooks/use-scada-config-sync.ts:48-54` `boundsOfNode`:
   ```ts
   const width = node.width ?? 0;
   const height = node.height ?? 0;
   return { x: node.x, y: node.y, width, height }; // node.x/node.y NOT defaulted
   ```
   and `:84` `boundsFromCustomPoints` (the polygon/line/arrow path): `return { x: node.x + minX, y: node.y + minY, … }` — also raw `node.x`/`node.y`. `undefined + number = NaN`.

**What happens end-to-end (traced through live code):**

- `computeSymbolBounds` → `unionBounds` (`:34-40`) does `Math.min(a.x, b.x)` → `Math.min(defined, undefined) = NaN`; the whole union collapses to `{x:NaN, y:NaN, width:NaN, height:NaN}`.
- `applyInitialViewport` (`:87-114`) calls `engine.fit(NaNbounds)` (contain) or `engine.setViewport({ x: NaN… })` (fill).
- `engine/viewport.ts:54-68` `fit()`: `bw = Math.max(1e-6, NaN) = NaN`; `scale = clampScale(NaN)` — `clampScale` (:27-30) **does** catch NaN → `MIN_SCALE` (0.1). So scale is defended. But `cx = bounds.x + bounds.width/2 = NaN`; returns `{ x: NaN, y: NaN, scale: 0.1 }`.
- `scada-engine.ts:350-371` `applyViewportState`: `clampViewport(next)` (`viewport.ts:32-34`) clamps **only `scale`**, leaving `x`/`y` as NaN. Then `zoomLayer.move({ x: -(NaN - cur.x)*scale, y: … })` writes NaN into leafer's zoomLayer transform. `this.viewport = { x: NaN, y: NaN, scale: 0.1 }`.
- Every subsequent `worldToViewport` / `viewportToWorld` (`viewport.ts:36-48`) produces NaN. All symbols render at NaN screen coordinates → off-screen / invisible. The canvas shows `data-status="ready"` (the build succeeded), so the user sees a blank ready canvas with no error signal.

**Internal inconsistency that proves intent.** `engine/interaction-overlay.ts:43-44` (`resolveOverlayGeometry`) **already defaults** `const baseX = node.x ?? 0; const baseY = node.y ?? 0;` — the hover-overlay path treats omitted `x`/`y` as `0`. The bounds path does not. So two consumers of the same "node geometry" disagree on whether `x`/`y` may be absent. The validator agrees with neither (it doesn't enforce either reading).

**Why it matters:**

- It is a **silent total failure** (blank canvas, `data-status="ready"`, no `onError`, no console error) — the worst diagnostic class for an industrial HMI where the config is the primary authoring surface and may be hand-edited or produced by a non-TS tool.
- The trigger is "omit `x`/`y` on any one symbol **AND** set `viewport: { fit } | { center }`". The demo configs always include `x`/`y` and always set `viewport.fit`, so demos pass and the 562-test suite never exercises the omit branch.
- `clampViewport` not defending `x`/`y` is the **amplifier**: even if NaN creeps in from any other source, it persists forever (scale is clamped, position is not).

**Confidence:** certain (code-path exhaustive trace; the only defense, `clampScale`, explicitly does not cover position; the sibling consumer already implements the fix).

**Suggestion (any one closes it; (a)+(b) together is belt-and-suspenders):**

- (a) `boundsOfNode` + `boundsFromCustomPoints`: default `node.x ?? 0` / `node.y ?? 0` (mirror `interaction-overlay.ts:43-44`) — makes the runtime consumer match the validator's permissiveness.
- (b) `validate.ts`: if the type's intent is "required", tighten `x`/`y` to required (`if (typeof nodeObj.x !== 'number') errors.push(...)`) — makes the validator match the type.
- (c) `clampViewport` (`viewport.ts:32-34`): defend `x`/`y` against non-finite (`Number.isFinite` → 0) so NaN position can never reach leafer regardless of source — closes the amplifier.
- Add a regression test: a config with a symbol omitting `x`/`y` + `viewport: { fit: 'contain' }` asserts `getViewport()` returns finite `x`/`y` and the symbol is on-screen (not NaN-blank).

**Adjudication check:** not in `docs/references/reopened-design-decisions-and-audit-adjudications.md` (that file's 5 entries cover form-advanced / surface / NodeRenderer / dual-state / summary-routing — none touch industrial-hmi or the validator↔bounds contract). This is a live defect, not a re-report.

---

# P2 Findings (non-blocking polish — backlog)

## [P2] Two modules now write the same state-style field on every transition — `collectStates` (batched) **and** `StateVisualApplier` (immediate, bypassing the A5 合帧 contract)

_Justification: the prior-session P1 wired `StateVisualApplier` for state-exit restore, but `RefreshPipeline.collectStates` was left in place ALSO collecting+applying the active state's style, so every state transition now does two overlapping leafer writes; the immediate write breaks the stated "single batched `engine.applyAttrs` per frame" (A5) invariant._

**Where:**

- `binding/dirty-collector.ts:323-347` `collectStates` — on a transition (`prev !== state`, :332) it (1) `events.emit('state:change')` (:335) → `StateVisualApplier.applyState` runs **synchronously** and calls `engine.applyAttrs(patch)` immediately (`symbols/visual-state.ts:62-64`), THEN (2) collects the active state's `style` into the collector (:338-345), which `flushFrame` later writes a **second** time via `collector.flush(applyAttrs)` (:209).
- `renderer/hooks/use-scada-engine.ts:61-64` — `new StateVisualApplier(engine).attachTo(pipeline)` is the wiring that made both writers live.

**What:** the pre-fix design had one writer (`collectStates`, batched) that could not handle state-exit restore. The fix added a second writer (`StateVisualApplier`, immediate) for restore. Neither removed the other. They converge (final node state is correct — the immediate write applies style+restore, the batched write reapplies the active style; no restore is undone because `collectStates` only ever collects the _current_ state's style), but:

- Each transition costs **2 `engine.applyAttrs` calls** for the same symbol (1 immediate + 1 share of the batched flush). For a burst of N transitions in one flushFrame (alarm storm), that is N immediate writes inside the `for (const symbolId of symbolIds)` loop (:324) plus 1 batched flush = N+1 `applyAttrs` invocations/frame. The A5 "single batched write per frame" invariant (`dirty-collector.ts:33-36` comment) is explicitly violated by the immediate path.
- Maintainability: two code paths computing "what style does this state imply", with subtly different scope (`StateVisualApplier` does styled-vs-base diff + restore; `collectStates` does raw active-state style only). The next contributor editing one will not know to edit the other.

**Severity:** P2 (convergent; perf + design-redundancy, not incorrectness).

**Suggestion:** pick one owner. Either (a) remove the style-collect block from `collectStates` (:338-345) and let `StateVisualApplier` own all visual-state application (restore + apply), gating it to run inside the batched flush; or (b) remove `StateVisualApplier` and add base-style restore to `collectStates` (the original P1 suggestion). Add a test asserting `engine.applyAttrs` is called at most once per symbol per frame during a multi-symbol alarm-storm transition.

## [P2] `component:setPointValue` handle casts `value as ScadaPrimitive` with no validation — asymmetric with the flux bridge which validates; a host action passing a non-primitive silently corrupts the point store

_Justification: contract enforcement gap at a host-facing boundary; the data-plane ingress (flux bridge) validates `isScadaPrimitive` before storing, but the command-plane ingress (component handle) does not, so the same corruption vector is defended on one path and open on the other._

**Where:**

- `renderer/hooks/use-scada-handles.ts:97-106`:
  ```ts
  case 'setPointValue': {
    const pointId = (payload as { pointId?: unknown })?.pointId;
    const value = (payload as { value?: unknown })?.value;
    if (typeof pointId !== 'string') return { ok: false, error: … };
    if (!current.pointStore.has(pointId)) return { ok: false, error: … };
    current.pointStore.setPointValue(pointId, value as ScadaPrimitive);  // <-- unchecked cast
    …
  }
  ```
- Compare the defended sibling: `renderer/hooks/use-scada-points-bridge.ts:140-142,264-266` — `function isScadaPrimitive(value) {…}` gates `values[decl.id] = value`.

**What:** `payload.value` is `unknown` from the host action. The handle validates `pointId` (string) and point existence, but casts `value` straight to `ScadaPrimitive`. A host action `component:setPointValue` with `args: { pointId, value: { complex } }` or `value: [1,2]` stores the object verbatim. Downstream: `applyLinearScale` on an object → `k*object+b` → `NaN`; `resolveState` on an object → falls through to default state; `getPointValue` returns the object to binding resolution. Silent degradation, no error surfaced, no `ok:false`.

**Severity:** P2 (handle is semi-trusted host boundary; effect is degraded behavior, not a crash or security hole; but the asymmetry with the flux bridge is a clear contract gap and a foot-gun for action authors).

**Suggestion:** reuse `isScadaPrimitive` (export it from `use-scada-points-bridge.ts` or move to a shared util) and return `{ ok: false, error: new Error('value must be a number, boolean, or string') }` on mismatch — mirroring the `pointId`/`point not found` guards already there. Add a handle-level regression test asserting a non-primitive value is rejected.

## [P2] `diffScadaConfig` deep-object equality is `JSON.stringify`-based (key-order-sensitive) on the warm incremental-update path — was mis-classified as "cold-path" by the same-session multi-audit

_Justification: the diff path is the designated incremental-update hot path (runs on every config prop change with the same version), and key-order divergence between prev/next produces false-positive diffs that trigger a full binding-domain rebuild; the multi-audit dismissed `diff.ts:50` as a cold-path equality, which is inaccurate for this file._

**Where:**

- `serialization/diff.ts:45-51`:
  ```ts
  function valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
    return JSON.stringify(a) === JSON.stringify(b); // key-order-sensitive
  }
  ```
  Called per-key for every symbol (:78-85) and every variable (:108-113) inside `diffScadaConfig`.
- Consumer: `renderer/hooks/use-scada-config-sync.ts:192` `diffScadaConfig(prevRef.current, config)` runs in the effect on every config prop change (diff strategy, same version). Non-empty diff → `engine.applyDiff` + `reloadBindings` (`:198-200`). `reloadBindings` (`use-scada-engine.ts:208-237`) destroys + recreates the entire binding domain (pipeline/animator/collector) and re-runs the first-sync.

**What:** `JSON.stringify({a:1,b:2}) !== JSON.stringify({b:2,a:1})`. If `prev` and `next` are constructed by different code paths (e.g. prev from `exportConfig`/`structuredClone`, next from a host expression that re-evaluates to a fresh object literal with reordered keys — common when scope-derived config spreads merge), structurally-equal objects compare unequal → a spurious `updated` patch → `applyUpdate` + full `reloadBindings`. The cost is not just "churn": a spurious diff forces a binding-domain rebuild + first-sync on every config prop re-evaluation, which for a 10k-symbol scene is exactly the expensive path the I14 perf work optimized against.

**Severity:** P2 (non-fatal; configs produced by a single tool have stable key order, so it bites mainly when prev/next come from heterogeneous sources — but the impact when it bites is a full pipeline rebuild, larger than "churn").

**Note on prior classification:** the multi-audit's `check:audit-suspects` row recorded "cold-path `JSON.stringify` equality in `diff.ts:50`". `diff.ts:50` is not cold — it is the core comparator of the incremental-update path. Recording this so the next audit does not inherit the mis-classification.

**Suggestion:** replace the object branch with a stable deep-equal (e.g. recursively compare own-keys-sorted, or reuse a workspace deep-equal util if one exists). Add a test asserting `diffScadaConfig(prev, nextWithReorderedKeys)` yields an empty diff.

---

# Re-verification & cross-notes (no new defect — recorded for traceability)

- **Same-session multi-audit P1-1 (`onError` unwired) and P1-2 (`onHandlerError` unwired):** independently re-verified live. `scada-canvas.tsx:175-184` calls `useScadaPointsBridge` with no `onError` property (confirmed); `use-scada-engine.ts:27-37` `UseScadaEngineArgs` has no `onHandlerError` field and `:130-140` `ScadaCanvasEngine.create` omits it (confirmed). Both are live, not fixed. Not re-reported — owned by the multi-audit.
- **Prior-session P1-3 (`scada:ready` double-dispatch):** re-verified FIXED — `use-scada-config-sync.ts:203-206` empty-diff branch updates `prevRef` only and does not call `onBuilt`.
- **Prior-session P1 (`StateVisualApplier` unwired):** re-verified FIXED — `use-scada-engine.ts:64` `new StateVisualApplier(engine).attachTo(pipeline)`. (The residual "two writers" overlap is the new P2 above.)
- **React 19 best-practices scan:** hand-written `useCallback`/`useMemo` are present throughout the renderer hooks (e.g. `scada-canvas.tsx`, `use-scada-engine.ts`, `use-scada-events.ts`). Per `docs/skills/react19-best-practices-review.md` rule 4, pre-existing hand-written memo is **not** a high-priority removal target and the `react-compiler/react-compiler` ESLint rule (error-level, enforced) has not flagged these files (lint passes). Not reported as a finding.
- **Expression evaluator security sweep:** `binding/expression-evaluator.ts` is a hand-rolled tokenizer+recursive-descent parser+evaluator with **no** `eval`/`new Function`; deeply-nested input throws `EvalError` caught at `:355-365` → returned as `{ok:false}`. `createTolerantProbeScopeData` (`use-scada-points-bridge.ts:34-49`) explicitly blocks `__proto__`/`constructor`/`prototype` access. No injection or prototype-pollution vector found via the evaluator path.

# 总评 (top 1-3 directions worth attention)

1. **The config-contract triple (type ↔ validator ↔ runtime-consumer) has no single owner, and the bounds path is its weakest link.** The P1 above is the clearest instance (`x`/`y`), but the same shape exists latently for every field where `checkNumberField`'s "optional-but-typed" reading disagrees with a runtime consumer that assumes presence. A single regression test that builds a config from the validator's _most permissive_ accepted shape (all optional fields omitted) and asserts the canvas still reaches a finite viewport + on-screen symbols would catch this whole family at once. The fact that `interaction-overlay.ts` already defaults `x`/`y` while `boundsOfNode` does not — in the same package, by the same mission — shows the left hand isn't checking what the right hand assumes.
2. **State-style application now has two writers and the frame-batching invariant is silently violated.** This is the "two modules doing the same thing" anti-pattern the open-ended prompt specifically asks to surface. It converges today, but it is exactly the kind of seam where the next feature (e.g. transitions, blend, partial style) will produce a real divergence bug. Collapsing to one owner now is cheap; later it will require re-deriving which fields each writer touches.
3. **Host-boundary input validation is enforced on the data plane but not the command plane.** The flux bridge validates `isScadaPrimitive`; the `component:setPointValue` handle does not. Symmetrizing the validation (and reusing the predicate) closes a silent-corruption vector and removes a "why does the same value work from flux but break from an action" confusion that an author will eventually hit.

# 本次审查的盲区自评 (self-blindness)

- **Real leafer matrix/coordinate semantics at the pixel level** were not re-verified end-to-end; I traced the math symbolically through `viewport.ts` / `scada-engine.ts` and relied on the multi-audit's `scaleOfWorld`/`zoomLayer` work. A real-browser probe of `Text`/`Image`/composite symbols under pan+zoom pixel output (the prior session's suggested next round) is still outstanding and could expose mock↔real drift the unit suite masks.
- **`@nop-chaos/flux-formula` compiler behavior under `createPrivateEvalScope`'s `readOwn`/`readVisible`** was not exercised; if the platform compiler reads scope via `readOwn`/`readVisible` rather than `get(path)`, the scada private scope's no-op `update`/`merge` could matter for side-effecting expressions. Worth a dedicated integration test against the real compiler.
- **`useScopeSelector` path-subscription degradation at very large scope (10k+ fields)** was not measured; the `extractFluxScopePaths` output drives the `paths` array, and a pathological config with thousands of distinct flux refs was not benchmarked.
- **Concurrency/tearing between `useScadaConfigSync`'s rebuild and `useScadaPointsBridge`'s eval effect** was reasoned about declaratively (the multi-audit owns the pipeline-zombie edge); I did not construct a forced-concurrent test. A good next-round cut is an effect-ordering test under rapid `config` + `scopeData` co-change.

**Best next切入点:** a focused sub-agent pass that (a) generates the "maximally-permissive validator-accepted config" and drives it through mount+viewport+bridge, and (b) counts `engine.applyAttrs` invocations per frame during a synthetic 1000-symbol alarm storm — these two probes would either promote or retire the P1 and the first P2 with hard numbers.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
