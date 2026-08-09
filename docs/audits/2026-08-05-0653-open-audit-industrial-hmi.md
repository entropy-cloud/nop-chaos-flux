> Audit Status: closed
> Audit Type: open-ended
> Mission: industrial-hmi
> Remediation Plan: `docs/plans/2026-08-05-0653-2-industrial-hmi-audit-p1-remediations.md`（2×P1 → Phase 2 flow diff + Phase 3 indicator draw order）；9×P2 → `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-0653 post-remediation audit P2」open-ended 子节

# Open-Ended Adversarial Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-05 · **Auditor:** opencode (open-ended adversarial review per `docs/skills/open-ended-adversarial-review-prompt.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` — engine, binding, serialization, symbols, renderer, hooks, tests — read completely end-to-end, cross-referenced against `docs/components/industrial-hmi/design-*.md`, recent plans (`2026-08-04-2242-*`, `2026-08-04-2243-*`, `2026-08-05-0325-1`), `AGENTS.md`, `docs/skills/react19-best-practices-review.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances — live code judged as final design.

**Perspectives used:** contract archaeologist (3-layer type↔validator↔runtime-consumer drift), dead-code/anti-pattern sweeper (two modules writing/neighboring the same concern with divergent adjudications), scale-cliff hunter (10x operator on the documented 10万图元 envelope), draw-order / visual-fidelity debugger (mock↔real leafer drift on z-order).

## Deduplication Note (read first)

The same-session multi-dimensional audit `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md` owns **2 P1s** (`StateVisualApplier` W3 revert overwrites binding value within same `flushFrame`; `pnpm check:oversized-code-files` fails for 2 industrial test files) and **6 P2s** (§11 `serializeScadaConfig` enumeration drift, test boilerplate DRY, dead `scada-canvas.types.ts`, diagnostic cause-chain loss, fill-branch unclamped scale, `flux-deps-empty` dual report). The prior open-audit `docs/audits/2026-08-04-2242-open-audit-industrial-hmi.md` owns the `x`/`y` 3-way contract drift (FIXED), the "two writers on state-style" P2 (subsequently consolidated by W3), the `setPointValue` host-action validation P2 (FIXED by W4), the `diff.ts` JSON.stringify-equality P2 (FIXED by W5), and the viewport-prop-post-mount-ignored P2. **This report records ONLY findings not covered by either prior report.** Each candidate below was checked against both prior reports' titles/evidence sites before being kept, and independently re-verified against live code (either by hand or by a dispatched verification sub-agent).

---

## Priority Summary

| Priority                                                                                                                 | Count | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / security / failing-or-absent test for changed behavior) | **0** | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                                   | **2** | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc rot, wording, dead-code nits, narrow foot-guns)                              | **9** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 2 P1s.

---

# P1 Findings (must fix — independently re-verified by orchestrator + sub-agent)

## [P1-1] `diffScadaConfig` silently drops the `flow` field — same-version config update cannot toggle/change pipe flow animation

_Justification: real three-layer contract drift (type declares `flow`, validator accepts `flow`, create path consumes `flow`, diff path silently omits `flow`). Same-version config prop change toggling `flow.enabled` / changing `flow.speed` / changing `flow.dash` produces an empty diff patch → pipe animation state is frozen at the initial value for the entire session. No error, no diagnostic, no test._

- **Files:**
  - `packages/flux-renderers-industrial/src/serialization/diff.ts:3-30` — the `SYMBOL_KEYS` enumeration omits `'flow'`:
    ```ts
    const SYMBOL_KEYS: Array<keyof ScadaSymbolNode> = [
      'id',
      'type',
      'x',
      'y',
      'width',
      'height',
      'rotation',
      'scale',
      'visible',
      'opacity',
      'fill',
      'stroke',
      'strokeWidth',
      'strokeDash',
      'dashOffset',
      'fillStyle',
      'shadow',
      'text',
      'textColor',
      'textSize',
      'custom',
      'bindings',
      'states',
      'animations',
      'events',
      'children',
      // ← 'flow' is missing
    ];
    ```
  - `packages/flux-renderers-industrial/src/serialization/config-types.ts:78` — `ScadaSymbolNode.flow?: { enabled: boolean; speed: number; dash?: number[] }` is a declared, documented field.
  - `packages/flux-renderers-industrial/src/serialization/validate.ts:200-211` — validator checks `flow.enabled` is boolean, `flow.speed` is a number, `flow.dash` is a number array.
  - `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts:90-94, 102-115` — `flow` is consumed at create time AND its `applyProps` reacts to `props.flow` at update time (the only consumer in the package).

- **Trace:** A host re-emits a same-version config prop with one pipe's `flow.enabled` flipped `true → false` (e.g. the host compiles a flux expression that resolves to a new `flow` object). Path:
  1. `useScadaConfigSync.ts:217` → `diffScadaConfig(prev, next)` → `diff.ts:80-100` loops over `SYMBOL_KEYS` only; `'flow'` is not in the array → the `flow` change is invisible to the differ.
  2. The pipe node's `updated` patch is empty (assuming no other field changed) → it is NOT pushed into `diff.updated` → `engine.applyDiff` is not called for this node, OR is called with a patch that lacks `flow`.
  3. `pipe-junction.ts:applyProps` (which would honor `props.flow`) is never invoked with the new `flow`.
  4. The pipe animation continues running (or continues stopped) at the old `flow.enabled` value forever.

  The first build (`engine.reset` → `adapter.build` → `buildNode` → `resolveSymbolStyle` → `pipe-junction.create`) reads `flow` from the full config and honors it correctly. Only the incremental diff path drops it.

- **Severity:** **P1**
- **Risk:** The `flow` field is the documented pipe-animation contract (`docs/components/industrial-hmi/design-symbols.md` §4.4 per the `config-types.ts:77` comment). Industrial HMI scenes frequently toggle pipe flow to indicate process state (e.g. "this pipeline is currently transferring"). A host driving `flow` via a same-version config prop change (the diff path, not a full `importConfig`) sees the toggle silently ignored — the pipe keeps animating after `flow.enabled = false`, or stays static after `flow.enabled = true`. The bug is invisible to the test suite because every test exercises either the full reset path or a diff that changes non-`flow` fields.
- **Confidence:** certain (mechanical absence — `'flow'` is literally not in the `SYMBOL_KEYS` literal array; cross-checked against `ScadaSymbolNode` keys: every other declared field is present).
- **Suggestion:** add `'flow'` to `SYMBOL_KEYS` (between `'textSize'` and `'custom'` to match the `config-types.ts` declaration order). Add a regression test that constructs `prev`/`next` configs differing only in `flow.enabled`, asserts `diffScadaConfig(prev, next).updated[0].patch.flow` equals the new `flow` object, AND an integration test asserting the pipe-junction `applyProps` receives the new `flow` after `engine.applyDiff(diff, next)`.
- **False-positive exclusion:** NOT a calibrated non-issue — `flow` is a documented, validator-checked, runtime-consumed field; the diff path's omission is mechanical, not a deliberate scope exclusion. NOT an already-adjudicated item — `docs/references/reopened-design-decisions-and-audit-adjudications.md` has zero entries touching industrial-hmi or `diff.ts` symbol-key coverage.

## [P1-2] `scada-sensor-control-indicator` draw order paints the opaque housing ON TOP of the colored lamp — primary visual semantic is invisible in real leafer renders

_Justification: the colored state lamp (the indicator's only state-signal carrier) is fully obscured by an opaque dark housing Rect in any real canvas render. The mock-based unit test passes because the mock does not model z-order, and the e2e presence-check only asserts the type exists in the scene tree. This is a real visual-fidelity defect hidden by a mock↔real drift, on the canonical state-decorated composite symbol._

- **Files:**
  - `packages/flux-renderers-industrial/src/symbols/sensor-control/indicator.ts:42-45` — children order is `[lamp, housing]`:
    ```ts
    return createCompositeGroup(props, [
      { name: 'body', node: lamp }, // small Ellipse at center, height*0.72, fill = state color
      { name: 'housing', node: housing }, // opaque Rect {x:0,y:0,width,height, fill:'#455a64'} covering FULL bounds
    ]);
    ```
  - `packages/flux-renderers-industrial/src/symbols/composite.ts:90-91` — `createCompositeGroup` adds children in array order; later-added = rendered on top (standard canvas scene-graph semantics).
  - Compare every other composite symbol in the package — all use `[background_body, active_part]` order so the active part renders on top: motor (`device/motor.ts:43-46` `[body, rotor]`), pump (`[body, impeller]`), fan (`[body, blades]`), valve (`[body, core]`), gauge (`[body, needle, label]`), level, thermometer, progress, button (`[base, cap]`), switch (`[base, lever]`), sensor (`[stem, probe]`), pipe-junction. **Indicator is the sole outlier.**
  - `packages/flux-renderers-industrial/src/symbols/sensor-control/sensor-control-symbols.test.ts` — the indicator test reads `lamp.fill`/`housing.fill` directly off the mock nodes; the mock's `Group.add` just pushes into a `children` array (`leafer-ui-mock.ts:64-72`) with no z-order/render simulation, so the test cannot detect the inversion.
  - `tests/e2e/scada-demo.spec.ts:159-174` — the e2e only asserts the indicator type is present in `engine.getSymbols().map(leaf => leaf.definition?.type)`, not that it renders correctly.

- **Trace:** In a real leafer render, `Group` draws children in insertion order — later children paint over earlier ones. With `[lamp, housing]`:
  1. Lamp Ellipse (`{x: width/2 - r, y: height/2 - r, width: height*0.72, height: height*0.72, fill: state-color}`) is drawn first, centered, occupying ~52% of the bounds area.
  2. Housing Rect (`{x: 0, y: 0, width, height, fill: '#455a64'}`) is drawn SECOND, ON TOP, covering the full bounds with an opaque dark slate.
  3. The colored lamp is fully obscured. The user sees only a dark rectangle. State changes (run/stop/fault colors via `applyCompositeProps` → `parts.body.fill`) dutifully update the hidden lamp's `.fill` attribute — invisible to the operator.

- **Severity:** **P1** — visual fidelity defect on the canonical state-decorated composite symbol. Industrial HMI indicator lamps are the primary "is this device running / faulted / stopped" signal; making them invisible defeats the symbol's entire purpose. Mock tests and presence-only e2e both pass — the bug ships silently.
- **Confidence:** **likely.** Z-order semantics for leafer `Group` follow standard canvas/scene-graph convention (later-added child renders on top), and the geometry computation confirms the housing fully covers the lamp. A real-browser probe (`page.screenshot()` of a mounted indicator + pixel sample at the lamp center) would retire any residual doubt, but the structural evidence (children order + opaque full-bounds housing + every sibling symbol using the opposite order) is conclusive.
- **Status:** Introduced when the indicator symbol was authored (no plan specifically flags this). The mock's lack of z-order modeling is the proximate cause of test blindness — the same class of mock↔real drift that the prior `InteractionOverlay`/`pointer.move` and `Line/Polygon width` fixes addressed.
- **Suggestion:** swap the children order to `[housing, lamp]` (housing first as backdrop, lamp second on top). The `name: 'body'` role stays on `lamp` so `applyCompositeProps` continues to route state-style fills correctly. Add a unit-test assertion that exercises z-order: either extend the mock to track render order, or add an e2e screenshot/pixel probe in `tests/e2e/scada-demo.spec.ts` that samples the lamp-center pixel and asserts it matches the declared state color (not the housing color).
- **False-positive exclusion:** NOT a calibrated non-issue — the geometry is unambiguous (full-bounds opaque Rect over a smaller centered Ellipse), and every sibling composite symbol in the same package follows the opposite order. NOT reasonable local UI state — this is a deterministic render-output defect. NOT an already-adjudicated item.

---

# P2 Findings (non-blocking polish / narrow foot-guns — backlog)

## [P2-1] `TreeRegistry.subtreeIds` is O(N × subtree-size) per call and relies on an unstated parent-before-child insertion-order invariant

_Justification: real perf cliff on the documented 10万图元 envelope when diff-driven undo-redo lands (planned in `editor-initiation.md`); trivial localized fix; no live correctness bug today but the invariant is fragile._

- **File:** `packages/flux-renderers-industrial/src/engine/tree-registry.ts:65-73`
- **What:** Single forward pass over `this.byId.values()` with `ids.includes(entry.parentId)` as the inner check. `ids.includes` is `O(|ids|)` and `|ids|` grows from 1 to subtree-size during the pass → `O(N × avg_subtree)` per call. The function also relies on the unstated assumption that parents are inserted before children (only true because `buildNode` registers self before recursing — `config-adapter.ts:97-100`); any future caller that inserts child-first would silently miss grandchildren+.
- **Risk:** Called once per `diff.removed[i]` and once per `diff.updated[i]` whose patch has children (`config-adapter.ts:125, 136`). For a 100k-symbol scene with 100 concurrent removals and moderate nesting (subtree≈50): 100 × 100000 × 50 = 5×10⁸ ops — seconds of work, breaching the documented `1万 real-time data points end-to-end refresh <200ms` / `10万图元 ≥45fps` envelope (`docs/components/industrial-hmi/design-engine.md:24`). The runtime refresh path (binding/value) doesn't hit this; the diff path does, and `editor-initiation.md:34` plans undo-redo via diffs.
- **Suggestion:** add `private childrenOf = new Map<string, Set<string>>()` maintained in `add`/`remove`; rewrite `subtreeIds` as a DFS over `childrenOf` (`O(subtree-size)`). Add a regression test that inserts a grandchild before its parent (simulating a future refactor) and asserts `subtreeIds` still returns the full set.
- **Confidence:** certain (mechanical analysis; sub-agent verified no test exercises depth ≥ 2 through `subtreeIds`).

## [P2-2] `useScadaPointsBridge` rebuilds a full point-values record on every scope-data change, with an undocumented `{...pointValues, ...scopeData}` precedence rule

_Justification: real O(N) per-scope-change work over ALL points (not just flux-sourced), at 10k-point scale this is a 10k-key record per change; plus an undocumented collision rule that silently shadows a flux point whose id matches a scope path._

- **File:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:303-308`
- **What:** `for (const pointId of runtime.pointStore.pointIds()) { ... pointValues[pointId] = value; }` — `pointIds()` returns ALL declared points (static/expression/flux), not just flux-sourced. Then `createPrivateEvalScope({ ...pointValues, ...scopeData })`. Two issues:
  1. **Perf:** for a 10k-point scene with 100 flux points and 9900 static/expression points, every `scopeData` change builds a 10k-key record and a 10k-entry scope object. Partly justified (flux expressions may reference any point id like `${staticBase + fluxVal}`), but the optimization (filter to actually-referenced point ids via `analyzeFluxSubscriptions`) is absent.
  2. **Precedence:** `{ ...pointValues, ...scopeData }` means `scopeData` wins on key collision. If a flux point's `id` happens to equal a flux scope path (e.g. point id `analog` and scope path `analog`), the point's value is silently shadowed by scope data, and the host has no diagnostic. This collision rule is not documented in `createPrivateEvalScope` or its callers.
- **Risk:** perf headroom at mission-scale (1万 real-time data points); silent foot-gun for authors who name flux points the same as scope paths.
- **Suggestion:** restrict the rebuilt record to point ids actually referenced by flux expressions (intersect `pointStore.pointIds()` with `analyzeFluxSubscriptions(config).paths`-derived point-id set, falling back to all-points if the intersection is empty). Document the precedence rule in `createPrivateEvalScope` and consider warning when a collision is detected.
- **Confidence:** certain (sub-agent independently verified `pointStore.pointIds()` returns all entries).

## [P2-3] `ConfigAdapter.buildNode` silently demotes any node carrying `children` to a Group, even when `type` is a leaf shape

_Justification: validator-passing config that silently renders as the wrong shape — a `scada-rect` with `children` becomes an invisible empty Group with the rect's fill/stroke/width/height silently dropped._

- **Files:**
  - `packages/flux-renderers-industrial/src/engine/config-adapter.ts:84` — `const isContainer = node.type === GROUP_CONTAINER_TYPE || (node.children?.length ?? 0) > 0;`
  - `packages/flux-renderers-industrial/src/serialization/validate.ts:254-262` — recurses into `children` but never asserts `type === 'scada-group'`.
  - `packages/flux-renderers-industrial/src/serialization/config-types.ts:84` — `children?: ScadaSymbolNode[]` is declared on the base interface (allowed on any node).
- **What:** A node `{id, type: 'scada-rect', x, y, width, height, fill, children: [...]}` passes `validateScadaConfig` (children just has to be an array of valid symbol nodes). At build time, `isContainer` is `true` (because `children.length > 0`), so the node takes the Group branch — its `fill`/`stroke`/`width`/`height` are silently discarded (the Group constructor at lines 86-96 only consumes `x/y/rotation/visible/opacity/scale`).
- **Risk:** Authoring foot-gun for schema-merged configs (e.g. a host spreads a base rect template that mistakenly carries an empty-but-present `children: []`). The result is an invisible Group where a styled rect was expected, with no diagnostic.
- **Suggestion:** either tighten the validator (`children` allowed only when `type === 'scada-group'`), or change `buildNode` to honor `type` and only enter the Group branch when `type === 'scada-group'` (treating `children` on a leaf as a validator-level error). Add a regression test for a leaf type carrying `children`.
- **Confidence:** certain.

## [P2-4] `BindResolver.resolveBinding` applies `format` unconditionally, even for non-text binding targets — produces wrong-typed truthy values for `visible`/`opacity`/etc.

_Justification: narrow authoring foot-gun (requires misapplying `format` to a non-text target), but the resulting silent value-type inversion (boolean `false` → truthy string `"false"`) is the worst kind of authoring defect — the symbol stays visible when the author intended to hide it._

- **File:** `packages/flux-renderers-industrial/src/binding/bind-resolver.ts:109-111`
- **What:** `if (binding.format !== undefined) { value = formatValue(value, binding.format); }` runs regardless of which property the binding targets. For `bindings: { visible: { point: 'p', format: '%s' } }`:
  1. Boolean `false` → `formatValue(false, '%s')` → `String(false)` → `"false"` (`bind-resolver.ts:60-62`).
  2. Collector stores `pending[id].visible = "false"`.
  3. `engine.applyAttrs` → `toNodePatch` passes the string through uncoerced (`symbol-factory.ts:38`).
  4. leafer treats non-empty `"false"` as truthy → node stays visible. Author's intent (hide on `false`) is silently inverted.
- **Risk:** The prop tables declare `visible: { type: 'boolean' }` (e.g. `rect.ts:18`, `compound.ts:94`) but nothing coerces the resolved value back to the declared type after `format`. No test exercises `visible` + `format` (grep found none).
- **Suggestion:** either restrict `format` application to text-valued properties (`text`/`textColor`/`fill`/etc.), or coerce the final value back to the declared property type after `format` (`Boolean(value)` for `visible`, `Number(value)` for `opacity`/numeric fields). Document that `format` is a text-property facility.
- **Confidence:** likely (the mock does not model leafer's truthiness semantics for `visible`; the trace through the resolver is certain, the leafer interpretation of string `"false"` is the standard JS/leafer behavior).

## [P2-5] State-machine input selection and default-state fallback both depend on JSON object key insertion order — cosmetic edits change runtime semantics

_Justification: the author has no schema field to designate "this binding drives the state machine" or "this is the default resting state"; both are governed by an undocumented property of the authoring format (object key order), and any symbol with ≥2 bindings or a state-declaration block lacking a `run` state has semantics that silently shift under cosmetic reformatting._

- **Files:**
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:344` — `const primary = this.options.reverseIndex.lookupSymbol(symbolId)[0];` — `[0]` is insertion-order-first.
  - `packages/flux-renderers-industrial/src/binding/reverse-index.ts:119, 125-127` — `bySymbol` is indexed by `Object.entries(bindings)` order (JSON key insertion order).
  - `packages/flux-renderers-industrial/src/binding/value-to-state.ts:46-51` — `defaultState` returns `'run'` if present, else `Object.keys(declaration.states)[0]` (insertion-order-first).
- **What:** For a symbol with `bindings: { fill: {point:'color'}, rotation:{point:'angle'} }`:
  - The state machine is driven by `color` (first binding in JSON).
  - Reorder the JSON to `{ rotation:..., fill:... }` and the state machine is now driven by `angle` — same logical config, different state semantics. No validator rule, no schema field, no documentation; `primary` is a private variable name.
  - Similarly, a state-declaration `states: { stop: {...}, fault: {...} }` (no `run`) resolves undefined input to `stop`; the same two states in the other order resolves to `fault`.
- **Risk:** Combined, cosmetic JSON edits to a multi-binding state-decorated symbol can silently change both the state-driver and the resting-state visual. For an industrial HMI where state visuals signal equipment health, an unintended reorder (e.g. a formatter that alphabetizes keys) can flip a green "running" indicator to red "fault" with no other change.
- **Suggestion:** add an explicit `stateSource?: string` (point id) field on `ScadaStateDeclaration`; if absent, fall back to the first binding whose property appears in some state's `style` (more stable than pure insertion order). For `defaultState`, document the rule explicitly and prefer `'run'`/`'normal'`/`'off'` by name before falling back to `keys[0]`. Add tests that reorder JSON keys and assert state semantics are unchanged.
- **Confidence:** certain.

## [P2-6] `compound.ts:deepEquals` re-introduces the `JSON.stringify` key-order hazard that `diff.ts:valuesEqual` was rewritten to fix

_Justification: same anti-pattern, opposite adjudicated outcomes in two adjacent files. The serialize-path emitter accumulates redundant overrides when an instance's object-typed field has the same content as `defaults` but a different key order — exactly the hazard plan 2026-08-04-2243-2 W5 fixed for the diff path._

- **Files:**
  - `packages/flux-renderers-industrial/src/symbols/compound.ts:79-83` — `function deepEquals(a, b) { ...; return JSON.stringify(a) === JSON.stringify(b); }`
  - Compare `packages/flux-renderers-industrial/src/serialization/diff.ts:45-64` — `valuesEqual` rewritten to own-keys recursive comparison with an explicit comment: "旧实现 `JSON.stringify(a) === JSON.stringify(b)` 在异源 config... key 序不同时假阳性".
  - Consumer: `packages/flux-renderers-industrial/src/serialization/serialize.ts:14-26` → `pruneInstanceNode` → `diffInstanceProps` → `deepEquals`.
- **What:** When `serializeScadaConfig` runs against an instance whose nested object-typed field (e.g. `shadow`, `custom`) has the same content as `definition.defaults[key]` but a different key order, `deepEquals` returns false, the key is emitted as an "override", and the serialized output contains redundant property overrides. Round-tripping through `serialize` → host re-eval → `diff` against the un-pruned live config then produces spurious `updated` patches. The narrowness: in current builtin symbols, `defaults` only contains primitive fields (no object-typed defaults), so the hazard is latent — it bites the moment a third-party custom symbol registers object-typed defaults (e.g. `defaults: { shadow: {x:0, y:0, blur:0, color:'#000'} }`).
- **Risk:** Latent for builtins; real for any third-party `registerScadaSymbol` call with object-typed defaults.
- **Suggestion:** replace `compound.ts:deepEquals` with the same own-keys recursive algorithm as `diff.ts:valuesEqual` (extract to a shared `serialization/equality.ts` util and import from both call sites).
- **Confidence:** certain.

## [P2-7] `ScadaPointDeclaration.scale.expression` is silently dropped at runtime — validator accepts it, no consumer evaluates it

_Justification: contract gap between validator (accepts expression-scale on a declaration) and runtime (only LINEAR declaration-scale is applied at write time; expression-scale on a declaration is never evaluated anywhere)._

- **Files:**
  - `packages/flux-renderers-industrial/src/binding/point-store.ts:283-288` — `convert` skips expression-scale: `if (isLinearScale(scale)) return applyLinearScale(raw, scale); return raw;` (no `else` branch for expression-scale).
  - `packages/flux-renderers-industrial/src/binding/reverse-index.ts` `isLinearScale` (line 87-92) returns false for `{expression: ...}` — confirming the type union is supported.
  - `packages/flux-renderers-industrial/src/serialization/validate.ts:292-293` — accepts both linear and expression forms on a declaration.
  - `packages/flux-renderers-industrial/src/serialization/config-types.ts:11` — `scale?: { k?: number; b?: number } | { expression: string }` on `ScadaPointDeclaration`.
- **What:** A host authoring `variables: [{ id: 'p', source: 'static', value: 10, scale: { expression: '${x + 1}' } }]` passes validation. At write time, `convert` sees the scale is not linear → returns `raw` (10), never evaluating the expression. The point-store stores 10. No diagnostic. Note this is distinct from `ScadaBinding.scale.expression` (binding-scale, applied at READ time via `bind-resolver.applyScale:42-46`) — binding-scale expression works correctly; declaration-scale expression is the dropped case.
- **Risk:** Narrow (most authors use linear declaration-scale or binding-scale expression), but for those who reach for declaration-scale expression, the silence is the worst part — no error, no warning, the value is just unscaled.
- **Suggestion:** either evaluate declaration-scale expression at write time (requires injecting the flux compiler into `PointStore`, which currently has no expression-evaluation dependency — may not be worth the coupling), OR tighten the validator to reject `scale: { expression: ... }` on a declaration with an explanatory error pointing authors to binding-scale instead.
- **Confidence:** certain.

## [P2-8] `width`/`height` binding on points-based shapes (`scada-line`, `scada-arrow`, `scada-pipe`) silently produces no visual feedback

_Justification: `BINDABLE_PROPERTIES` advertises `width`/`height` for all symbols; the validator accepts bindings on any property; but points-based shapes derive geometry from `points` at create time only and have no `applyProps` that recomputes points on width/height change. Authors can write validator-passing bindings that produce zero visual response._

- **Files:**
  - `packages/flux-renderers-industrial/src/binding/bind-resolver.ts:14-28` — `BINDABLE_PROPERTIES` includes `width`/`height`.
  - `packages/flux-renderers-industrial/src/symbols/base-shapes/line.ts:31-39`, `arrow.ts` (same shape), `pipe.ts` (same shape) — `create` reads `width`/`height` once to build `attrs.points = [0, 0, width, height]`, then deletes `attrs.width`/`attrs.height`. No `applyProps` defined.
  - `packages/flux-renderers-industrial/src/engine/config-adapter.ts:151-155` — fallback path calls `node.set(toNodePatch(node, attrPatch))`; leafer `Line`/`Arrow`/`Pipe` do not recompute `points` from a width/height set.
- **What:** A host authoring `bindings: { width: { point: 'level' } }` on a `scada-line` produces a binding that resolves, batches into the collector, writes to the leafer Line node's `width` attribute — and the rendered line geometry is unchanged, because the line's visual is `points`-driven, not `width`-driven. No warning, no error.
- **Risk:** Narrow (bindings on line/arrow/pipe geometry are uncommon; bindings more often target `stroke`/`strokeWidth`/`dashOffset`), but a real contract gap for the next author who reaches for `width` binding on a line (a natural mistake).
- **Suggestion:** either (a) add an `applyProps` to line/arrow/pipe that recomputes `points = [0, 0, width, height]` when width/height change, or (b) remove `width`/`height` from the documented bindable-properties list for points-based shapes (validate at registration time), or (c) warn when a binding targets `width`/`height` on a points-based shape.
- **Confidence:** **likely** — the create-time-only points derivation is certain from the code; whether leafer's `Line.set({width})` truly doesn't recompute points was inferred from the symbol's deliberate `delete attrs.width/height; attrs.points = [...]` pattern (which only makes sense if width is not a live attribute post-create). A real-leafer probe would retire residual doubt.

## [P2-9] `PointStore.lastNotifyPointId` re-entrancy hazard — a re-entrant `setPointValue` inside a `point:change` listener mis-attributes the outer listener's error

_Justification: narrow diagnostic-correctness defect; only fires when a `point:change` listener re-enters `setPointValue` AND a later listener on the same emit throws, but in that case the error is reported against the wrong pointId — confusing telemetry for a real production signal._

- **File:** `packages/flux-renderers-industrial/src/binding/point-store.ts:121, 264-265, 276-281`
- **What:** `EventHub` is constructed with `onListenerError: (error) => this.reportSubscriberError(this.lastNotifyPointId, error)`. In `applyValue`, line 264 sets `this.lastNotifyPointId = pointId`, then line 265 emits the event. If a `point:change` listener's callback re-enters `setPointValue(otherPointId, ...)`, the re-entrant call sets `lastNotifyPointId = otherPointId` before returning. When the outer emit's NEXT listener throws, the resulting `onListenerError` reads the now-overwritten `lastNotifyPointId` and reports the error against `otherPointId`, not the original `pointId`.
- **Risk:** Industrial HMI telemetry relies on accurate per-point error attribution for diagnosing subscriber misbehavior. The defect requires re-entrancy (rare but legal — the public `subscribe`/`on` API allows listeners that write back to the store) plus a throwing listener, so impact is bounded.
- **Suggestion:** pass the `pointId` directly to `events.emit` as a sidecar (e.g. `events.emit('point:change', payload, { contextPointId: pointId })`) and read it back in `onListenerError`, instead of relying on a mutable `lastNotifyPointId` field. Or use a stack (`lastNotifyPointIdStack.push/pop`) so re-entrancy nests cleanly.
- **Confidence:** likely (the mutation sequence is certain; whether any production listener re-enters is unverified).

---

# Cross-Cutting Patterns

1. **"Three-layer contract drift where the diff/serialize path is the forgotten third layer" (P1-1, P2-3, P2-6, P2-7):** Four findings share the same shape — a field's type contract, validator, and create-time consumer all agree, but a path that operates on a parsed/transformed form of the config (the diff path, the build path's container detection, the serialize path's override-prune, the point-store's declaration-scale consumer) silently disagrees. The diff path is the most frequent offender (P1-1, P2-6's sibling). **Actionable pattern:** any field added to `ScadaSymbolNode` or `ScadaPointDeclaration` must be added to `SYMBOL_KEYS`/`POINT_KEYS` in the same commit, AND any equality/prune helper used by serialize must be at least as robust as the one used by diff. A lint rule that asserts `SYMBOL_KEYS` is the literal key-set of `ScadaSymbolNode` would have caught P1-1 mechanically.

2. **"Mock hides z-order / type-coercion / geometry-derivation semantics" (P1-2, P2-4, P2-8):** The leafer mock faithfully models `Group.add` as an array push but does not model z-order, attribute-coercion, or points-derived geometry. Three findings (indicator draw order, format-on-visible truthiness, width-binding on Line) all pass the mock-based unit suite because the mock doesn't simulate those leafer behaviors. The mission has already fixed several mock↔real drifts (`InteractionOverlay`/`pointer.move`, `Line/Polygon width` semantics, `path`-based hit); these three are residuals in the same class. **Actionable pattern:** the next round of mock hardening should pick one of (a) z-order tracking, (b) attribute-type coercion per leaf-type, or (c) points-derived geometry recomputation check — each would close a class of bugs rather than a single instance.

3. **"JSON object key insertion order leaks into runtime semantics" (P2-5, P2-9-honorable-mention):** Two findings (state-driver selection, default-state fallback) rely on `Object.keys(x)[0]` or `entries[0]` for authoring-significant selections. This is the canonical "implementation detail leaking into contract" anti-pattern. **Actionable pattern:** any place that picks "the first of N" from a config object should either declare an explicit discriminator field, or document the rule and add a test that reorders the keys and asserts invariance.

---

# 总评 (top 1-3 directions worth attention)

1. **The diff/serialize/prune path needs an automated guard that its key universe tracks `ScadaSymbolNode`'s declared fields.** P1-1 (`flow` silently dropped from `SYMBOL_KEYS`) is the highest-confidence live defect in this audit, and P2-6 (`compound.deepEquals` re-introducing the hazard `diff.valuesEqual` was fixed for) shows the same "two implementations of the same concept drifting apart" anti-pattern one layer over. A `scripts/check-scada-symbol-keys.mjs` that asserts `SYMBOL_KEYS ∪ {id,type} === keyof ScadaSymbolNode` (parsed from `config-types.ts`) would catch P1-1 mechanically and prevent recurrence as new fields are added.

2. **Mock↔real drift on z-order, attribute coercion, and points-derived geometry is the dominant residual class.** P1-2 (indicator draw order) is the highest-impact visible defect, and it ships silently because the mock's `Group.add` is an array push with no z-order. The mission has a documented history of paying for this class of drift post-hoc (`pointer.move`, `Line width`, `hit path`); proactively adding z-order tracking to the mock (or adding screenshot-level e2e probes for state-decorated composite symbols) would close the class.

3. **Authoring semantics that depend on JSON object key order are an invisible contract.** P2-5 (state-driver + default-state by `keys[0]`) is the cleanest instance — the author has no schema field to say "this binding drives the state machine", and a cosmetic JSON reformat can flip a green "running" indicator to red "fault". The fix is cheap (explicit `stateSource` field or named-default preference), but the pattern is worth surveying for: any place that reads `Object.keys(...)[0]` or `entries[0]` from a config object is a candidate.

# 本次审查的盲区自评 (self-blindness)

- **Real-leafer pixel output was not verified end-to-end.** P1-2 (indicator draw order) and P2-4 (format on `visible`) and P2-8 (width binding on Line) all carry residual "likely" confidence because the leafer mock's omission of z-order / type-coercion / points-derived geometry is exactly what hides the defect in unit tests, and I did not run a real-browser `page.screenshot()` + pixel-sample probe to retire residual doubt. A next-round cut that mounts each composite symbol + samples the center pixel against the declared state color would promote-or-retire all three.

- **Performance findings (P2-1 subtreeIds, P2-2 pointValues-rebuild) were reasoned about analytically, not measured.** The O(n²) and O(N) characterizations are mechanically certain; the breach of the <200ms envelope at 10万图元 scale is projected from the math, not from a synthetic 100k-symbol benchmark. A next-round cut that actually builds a 100k-symbol config and runs a 100-removal diff would produce hard numbers.

- **The expression-evaluator's cache invalidation under point-id rename was not exercised.** `RefreshPipeline.recomputeExpressionPoints` relies on `evaluator.invalidate(pointId)` + `lastDeps` to propagate changes; if a future refactor adds dynamic point-id construction (today the grammar only allows `@{literal}` refs, so this is impossible), the cache would silently go stale. Worth a dedicated property test if the evaluator grammar ever expands.

- **Cross-package integration with `@nop-chaos/flux-formula` was not re-verified.** `useScadaPointsBridge`'s `extractExpressionDepsViaProbe` + `createPrivateEvalScope` path depends on the platform compiler's `createState`/`evaluateWithState`/`state.root.dependencies` shape; if that shape changes upstream, the SCADA bridge's subscription-path collection silently degrades to the empty-deps fallback. Worth a contract test against the real compiler.

**Best next切入点:** (a) a screenshot-level e2e for each state-decorated composite symbol (would promote/retire P1-2 and harden against the next mock drift), and (b) a `scripts/check-scada-symbol-keys.mjs` lint rule keyed off `config-types.ts` (would mechanically close P1-1 and prevent the recurrence captured in cross-cutting pattern #1).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
