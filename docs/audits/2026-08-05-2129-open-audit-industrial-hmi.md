> Audit Status: closed
> Audit Type: open-ended
> Mission: industrial-hmi
> Remediation: P1-1 → `docs/plans/2026-08-05-2129-3-industrial-hmi-audit-p1-remediations.md` Phase 4；10×P2 → `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节

# Open-Ended Adversarial Audit — Mission `industrial-hmi` (`packages/flux-renderers-industrial`)

**Date:** 2026-08-05 · **Auditor:** opencode (open-ended adversarial review per `docs/skills/open-ended-adversarial-review-prompt.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` — engine, binding, serialization, symbols, renderer, hooks, tests — read end-to-end and cross-referenced against `docs/components/industrial-hmi/design-*.md`, `AGENTS.md`, `docs/skills/react19-best-practices-review.md`. Two parallel verification sub-agents independently swept the serialization layer and the symbols layer; every reported P1 was hand-walked by the orchestrator against live code.
**Baseline:** v1 / no compatibility burden / no transitional main-path allowances — live code judged as final design.

**Perspectives used:** combination-explosion tester (what breaks when two independently-correct features target the same property), contract archaeologist (state-style type contract vs revert implementation; read-API vs write-API field-name symmetry), dead-code/anti-pattern sweeper (sibling paths missed by a fix that landed on one path), fail-closed boundary hunter (host JSON → number/shape validation gaps).

## Deduplication Note (read first)

This is the **5th** adversarial pass on this package. Prior reports: `2026-08-03-1506-{open,multi}`, `2026-08-04-2242-{open,multi}`, `2026-08-05-0653-{open,multi}`, `2026-08-05-2129-multi`. The 0653 wave (2 P1 + 9 P2) and 2129 wave (3 P1 + 15 P2) are the most recent; their P1s (W3 revert-vs-binding, indicator draw order, `flow` missing from `SYMBOL_KEYS`, oversized files, binding-expression subscription, pipeline `onError`) are all confirmed **FIXED** in live code and are NOT re-reported here. Each candidate below was checked against all prior titles/evidence sites before being kept, and independently re-verified against live code. Several findings below are **new instances of known defect classes on sibling paths the prior remediation waves missed** — the highest-value category for a package this heavily audited.

---

## Priority Summary

| Priority                                                                                                                 | Count  | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / security / failing-or-absent test for changed behavior) | **0**  | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                                   | **1**  | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc rot, wording, dead-code nits, narrow foot-guns)                              | **10** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 1 P1.

---

# P1 Findings (must fix — hand-verified by orchestrator)

## [P1-1] `StateVisualApplier` never reverts a state-applied `shadow` on state exit — the alarm "glow" persists permanently + leaks the `applied` tracking set

_Justification: contract break + incorrect behavior. `shadow` is a type-legal `ScadaSymbolStylePatch` field, the entry path (`collectStates`) applies it, but the exit/revert path silently no-ops on it because `STYLE_RESET_DEFAULTS` omits `shadow` and the revert guard `if (revert !== undefined)` skips both the collect and the `applied.delete()`. For every builtin symbol (none declare `shadow` in defaults), a state-applied shadow survives the state exit forever — a permanent false-alarm visual on the exact module whose entire purpose is exit-revert. `shadow` is the sole `ScadaSymbolStylePatch` field missing from the reset map, proving the omission is mechanical, not deliberate._

- **Files:**
  - `packages/flux-renderers-industrial/src/symbols/visual-state.ts:11-19` — `STYLE_RESET_DEFAULTS` lists `visible/opacity/fill/stroke/strokeWidth/textColor/strokeDash`, **omits `shadow`**.
  - `packages/flux-renderers-industrial/src/symbols/visual-state.ts:80-92` — the revert branch:
    ```ts
    const revert = base[key] !== undefined ? base[key] : (STYLE_RESET_DEFAULTS[key] as unknown);
    if (revert !== undefined) {
      // ← false for shadow: no base, no reset default
      if (this.collector) {
        this.collector.collect({ symbolId, property: key, value: revert });
      } else {
        immediatePatch[key] = revert;
      }
      applied.delete(key); // ← INSIDE the if → never reached for shadow
    }
    ```
  - `packages/flux-renderers-industrial/src/symbols/symbol-types.ts:47-52` — `ScadaSymbolStylePatch` explicitly `Pick<..., 'fill'|'stroke'|'strokeWidth'|'opacity'|'visible'|'textColor'|'shadow'|'strokeDash'>` — **`shadow` is a blessed state-style field**.
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:509-516` — `collectStates` applies **every** style entry including `shadow` on state enter (`for (const [property, value] of Object.entries(style)) collector.collect(...)`).

- **Trace** for a builtin symbol (e.g. `scada-rect`, no `shadow` in defaults) with `states: { alarm: { style: { fill:'#e53935', shadow:{x:0,y:0,blur:12,color:'#e53935'} } }, normal: { style: { fill:'#4caf50' } } }`:
  1. Enter `alarm`: `collectStates` collects `shadow` → applied to node. `applyState`: `styled.shadow !== base.shadow(undefined)` → `applied.add('shadow')`. Glow renders.
  2. Exit to `normal` (no `shadow` in its style): iterate key `shadow` (still in `applied`): `styled.shadow(undefined) === base.shadow(undefined)` → revert branch. No binding on `shadow` → `revert = STYLE_RESET_DEFAULTS.shadow` → **`undefined`**. `if (revert !== undefined)` is **false** → no `collector.collect`, and `applied.delete('shadow')` is skipped.
  3. The alarm **glow persists on the node forever**. The `applied` set also retains `shadow`, so every subsequent `applyState` re-attempts (and re-fails) the revert. State→state transitions where state A has shadow and state B does not are equally broken (A's glow survives into B).

- **Severity:** **P1** — `StateVisualApplier`'s header comment (`:22-25`) states its sole responsibility is "退出状态恢复 base 样式 (revert)". It silently no-ops on a field the type contract blesses. For industrial HMI, an alarm glow that never clears is a persistent **false-alarm visual** — the operator sees an alarm indication after the condition has cleared. Every other `ScadaSymbolStylePatch` field IS in `STYLE_RESET_DEFAULTS`; `shadow` is the lone outlier.
- **Confidence:** **certain** — hand-walked through `visual-state.ts:56-100` + `dirty-collector.ts:494-518` + `symbol-types.ts:47-52`; confirmed no builtin symbol declares `shadow` in defaults (rect/ellipse/round-rect/line/arrow/pipe/polygon/text/image/video/device/instrument/sensor-control defaults all omit it).
- **Status:** Mechanical defect; `STYLE_RESET_DEFAULTS` was authored per-field and `shadow` was missed. The 0653 P1-1 (W3) fix touched this exact `else if` block (added the binding-skip at `:76-79`) but did not touch the reset-map completeness.
- **Suggestion:** Add a `shadow` reset to `STYLE_RESET_DEFAULTS` (leafer accepts a "no shadow" via `shadow: undefined`-equivalent / a zero-effect shadow object — verify the leafer contract), **and** hoist `applied.delete(key)` outside the `if (revert !== undefined)` guard so a missing reset default cannot leak the tracking entry. Add a regression test: builtin symbol (no base shadow) + `states.alarm.style.shadow` → assert shadow cleared on exit to `normal`.
- **False-positive exclusion:** NOT the prior 0653 P1-1 (W3) — that was revert _overwriting a binding value_ (precedence); this is revert _failing to fire at all_ (reset-map completeness). NOT a deliberate scope exclusion — `shadow` is in `ScadaSymbolStylePatch`. NOT covered by existing tests — `state-visual.test.ts` asserts revert for fill/opacity/visible/rotation but no case uses `shadow` in a state style.

---

# P2 Findings (non-blocking polish / narrow foot-guns — backlog)

## [P2-1] Animation increments vs binding on the same property — non-deterministic flicker + permanently wasted animation CPU; precedence undocumented and untested

_Justification: a realistic combination (gauge-needle `rotation` binding + fault-state `rotate` animation; alarm `blink` + `visible` binding) silently produces a broken, timing-dependent visual because the binding value overwrites the animation increment only on frames when its source point changes — so the result flickers rather than consistently honoring either writer. The animator also keeps ticking (30ms clock + rAF + collect + requestRender) even when its output is always discarded, wasting CPU on the documented 10万图元 envelope._

- **Files:**
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:62-65,85` — animator wiring: `collect: (entry) => collector.collect(entry)` and `requestFrame: () => pipeline.requestRender(...)`.
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:49-63` — `collect` is last-write-wins per property (`byProperty.set(entry.property, entry.value)`).
  - `packages/flux-renderers-industrial/src/binding/dirty-collector.ts:261-265` — `flushFrame` order: `collectBindings(...)` (bind values collected) **then** `collector.flush` — bindings are collected AFTER the animator's increments, so on any frame where a binding's source point is dirty the binding overwrites the animation.
- **What:** The animator ticks on its own rAF (30ms throttle), collecting e.g. `{property:'rotation', value:angle}` then requesting a render. `flushFrame` later runs `collectBindings`, which collects binding values **only for `changed` (dirty) point ids** (`:261-264`). So:
  - On frames where the binding's source point did **not** change → the animation increment survives → animation visible.
  - On frames where the binding's source point **did** change → the binding value overwrites the animation increment in `pending` → animation hidden that frame.
    The net effect on a `blink` (toggles `visible`) + `visible` binding is a non-deterministic flicker dependent on data-update cadence, not a consistent "binding wins" or "animation wins".
- **Why it matters:** Combination foot-gun on the canonical industrial-HMI patterns (alarm blink, gauge needle). No design doc states the precedence (`design-data-binding.md §4.4` describes animation lifecycle but not the binding↔animation same-property conflict); no test combines a `rotation`/`visible`/`opacity` binding with the matching `rotate`/`blink` animation on the same symbol (grep of `*.test.*` found them only in separate tests). The animator's wasted work compounds at scale.
- **Confidence:** **certain** on the collect/flush ordering and last-write-wins semantics; **likely** on the visible-user-impact (mock does not model rendered output).
- **Suggestion:** Either document the precedence explicitly + warn at validate/registration when a binding and a `when:'always'`/`when:{state}` animation target the same property, or give animations a documented "decorative override only when no binding" semantics. At minimum add a test asserting the documented behavior. Separately, consider skipping `collect`/`requestFrame` when a binding owns the same property (CPU win).
- **False-positive exclusion:** NOT the prior W3 finding (binding-vs-state-revert precedence). NOT covered by `state-visual.test.ts` (state-style, not animation).

## [P2-2] `equality.ts:deepEqual` conflates arrays with array-shaped objects — `deepEqual([1,2], {0:1,1:2}) === true`; the header comment claims array-index semantics that the implementation never implements

_Justification: the shared deep-equal (single source for BOTH `diff.valuesEqual` and `compound.diffInstanceProps`) has no `Array.isArray` branch despite its own comment asserting "数组按 index 顺序比较". A prev/next shape disagreement on an untyped-inside field (`custom`, `fillStyle`, `strokeDash`) yields a false "equal" → empty diff patch / dropped serialize override._

- **File:** `packages/flux-renderers-industrial/src/serialization/equality.ts:17-32`
- **What:** The function casts both sides to `Record<string, unknown>` and compares via `Object.keys` + `hasOwnProperty`. `Object.keys([1,2])` and `Object.keys({0:1,1:2})` both yield `['0','1']`, so `deepEqual([1,2], {0:1,1:2})` returns `true` and `deepEqual([], {})` returns `true`. The comment at `:13` explicitly promises array-index-order comparison — the implementation violates its own spec.
- **Why it matters:** For validator-typed array fields (`strokeDash`, `flow.dash`, `children`, `animations`) the validator enforces array-vs-object so the gap is unreachable. It IS exploitable for `custom: Record<string, unknown>` and `fillStyle` (object-or-string) where a host round-trip (YAML, structured-clone, hand-edit) can flip array↔object shape — the differ then emits an empty patch and the engine retains the prev rendering; the serializer drops the field as a redundant override.
- **Confidence:** **certain** (mechanical; `Object.keys` output verified).
- **Suggestion:** Add an `Array.isArray(a) !== Array.isArray(b) → false` guard plus an array branch comparing by index. Add tests for `deepEqual([], {})` and `deepEqual([1,2], {0:1,1:2})`.
- **False-positive exclusion:** NOT 2129-P2-9 (unbounded **recursion** in deepEqual — resource exhaustion) and NOT 0653-P2-6 (the **prior** `JSON.stringify` equality in `compound.deepEquals` — key-order sensitivity). This is a third, distinct equality defect (type confusion).

## [P2-3] `validate.ts:checkNumberField` accepts `NaN`/`Infinity`/`-Infinity` (reachable via `JSON.parse('1e400')`); non-finite values propagate undefended to many consumers

_Justification: the permissive validator (`typeof === 'number'`) lets `Infinity` through for every numeric field. `scale` is clamped downstream by `clampScale`'s `Number.isFinite` guard, but `x`/`y` only get a `?? 0` (Infinity stays Infinity) and `strokeWidth`/`textSize`/`period`/`loop`/`deadband` have no downstream clamp at all._

- **File:** `packages/flux-renderers-industrial/src/serialization/validate.ts:18-27`
- **What:** `if (field in node && typeof node[field] !== 'number')` — `typeof NaN === 'number'` and `typeof Infinity === 'number'`, so all of `x/y/width/height/rotation/scale/opacity/strokeWidth/textSize/dashOffset/period/loop/speed/deadband/viewport.{x,y,scale}` accept non-finites. `JSON.parse('1e400')` returns `Infinity` (single-token ingress; plausible as a typo for `1e4` in engineering notation).
- **Why it matters:** The 2026-08-04-2242 P1 established the validator-permissive↔consumer-raw drift for `x`/`y` and added downstream clamps for `scale` (`clampScale`) and position (`clampViewport`) — but `clampViewport` only clamps `scale`, and `?? 0` does not catch a present non-finite. For the many numeric fields with no downstream clamp, `Infinity` reaches leafer raw.
- **Confidence:** **certain** on the validator gap; **likely** on the consumer amplification (did not probe leafer's behavior on `strokeWidth: Infinity`).
- **Suggestion:** Tighten `checkNumberField` to `typeof n === 'number' && Number.isFinite(n)` (or push the finiteness check into the consumers). Add a test: `{scale: 1e400}` → validation error.
- **False-positive exclusion:** NOT the 2242 P1 (which was `x`/`y` being **optional/missing**); this is the adjacent gap of a **present-but-non-finite** value.

## [P2-4] Composite device/instrument symbols derive `width`/`height` geometry at create but drop it on update — 11 symbols silently ignore width/height on diff-resize and width/height bindings

_Justification: a distinct, larger-scope instance of the create-vs-update divergence class that plan 0653-3 B2 fixed ONLY for `scada-line`/`scada-arrow`/`scada-pipe`. The entire device (motor/pump/valve/fan) + instrument (gauge/thermometer/progress) + sensor-control family computes body/rotor/needle/core geometry from `props.width`/`height` at create only; `applyProps` routes width/height to `parts.extent` (which none of them define), so a width/height change via binding or diff produces zero geometry response._

- **Files:**
  - `packages/flux-renderers-industrial/src/symbols/composite.ts:64-67` — `EXTENT_FIELDS={width,height}` routes only to `parts.extent`.
  - All of `device/{motor,pump,valve,fan}.ts`, `instrument/{gauge,thermometer,progress}.ts`, `sensor-control/{indicator,sensor,button,switch}.ts` — each reads `const width = props.width as number` at **create only**; none define an `extent` part.
  - `packages/flux-renderers-industrial/src/engine/config-adapter.ts:157-161` — `applyUpdate` calls `applyProps` and does **not** rebuild the node.
- **What:** `width`/`height` are in `BINDABLE_PROPERTIES` and the validator accepts them, but on any width/height change the composite `applyProps` falls through (`parts.extent` undefined → skip; not in ROOT/BODY fields) → body rect, rotor radius, needle length etc. keep create-time geometry. Zero visual feedback, no warning.
- **Why it matters:** Same defect class as the (fixed) 0653 P2-8, but unfixed on a much larger family. The diff-path amplification (no rebuild) means the editor mission (I16) resize will silently fail across the whole device/instrument catalog when it lands.
- **Confidence:** **certain** (mechanics).
- **Suggestion:** Re-derive child geometry in each symbol's `applyProps` (mirror the line/arrow B2 fix), or give `createCompositeGroup` a per-symbol `resize(node, parts, w, h)` hook. Regression test: diff `width` on a motor → assert body/rotor resize.
- **False-positive exclusion:** 0653 P2-8 evidence lists only `line.ts:31-39, arrow.ts, pipe.ts` with "No applyProps defined". Composite symbols HAVE `applyProps` that routes width/height nowhere — distinct, unfixed instance.

## [P2-5] `scanLegacyAtSyntax` warns on top-level `@{pointId}` but never recurses into `scada-group` children — nested legacy dialect is silently un-warned

_Justification: the I18 migration warning fires for top-level symbols but not for children, even though group-nested symbols are the canonical shape for composite equipment. Authors following I18 migration guidance get no warning for exactly the configs most likely to need migration._

- **File:** `packages/flux-renderers-industrial/src/serialization/validate.ts:390-432` (iterates only `config.symbols`, only `node.bindings`; never descends `node.children`). Contrast `validateSymbolNode:276-278` which DOES recurse children for structural validation.
- **What:** A config `{symbols:[{id:'g',type:'scada-group',children:[{id:'c',type:'scada-rect',bindings:{fill:{expression:'@{p1}'}}}]}]}` returns `{ok:true}` with **zero** `legacy-at-syntax` warnings, despite the deprecated dialect being present.
- **Confidence:** **certain**.
- **Suggestion:** Walk children in `scanLegacyAtSyntax` (mirror `validateSymbolNode`). Add a test: group-nested child with `@{}` → warning emitted.

## [P2-6] Validator checks only surface type for declared object shapes — `shadow`/animation `from,to`/`background`/declaration `scale.k,b`/`init`/binding-`scale` all pass malformed

_Justification: a cluster of instances of the 0653 cross-cutting pattern #1 ("three-layer contract drift") localized to the validator layer. The type declares a sub-shape; the validator checks only "is plain object". Each lets malformed host JSON pass and reach a consumer that reads declared sub-fields raw (→ `NaN`/`undefined`)._

- **File:** `packages/flux-renderers-industrial/src/serialization/validate.ts`
- **Instances (all verified):**
  - `:204-206` `shadow` — `{ shadow: {} }` / `{ shadow: { color: 123 } }` pass (declared `{x,y,blur,color}`).
  - `:81-85` animation `from`/`to` — `{ from: { foo: 1 } }` passes (declared `number | {x,y}`).
  - `:373-375` `background` — `{ background: { color: 123, grid: 'nope' } }` passes (declared `{color?,grid?{size,color}}`).
  - `:310-321` declaration `scale.k`/`scale.b` not type-checked → `applyLinearScale('foo' * raw)` = `NaN` (asymmetric with the B4 fix that rejected `scale.expression` on the same field).
  - `:283-331` `ScadaPointDeclaration.init` never validated despite `diff.ts:47` tracking it as a first-class `POINT_KEYS` field → non-primitive `init` corrupts the point store at startup.
  - `:43-68` binding-level `scale` shape unvalidated (asymmetric with declaration-level B4 check) → non-string `scale.expression` reaches the compiler.
- **Why it matters:** Bounded (validator-enforced main paths are safe) but real for the untyped-inside / asymmetric fields. `init` and `scale.k/b` are the most consequential (silent NaN corruption of the point store).
- **Confidence:** **certain** on shadow/from-to/background/init; **likely** on scale consumer impact.
- **Suggestion:** Introduce one `assertShape(value, schema, scope)` helper covering the declared object shapes; closes the cluster mechanically. Add tests for each malformed shape.

## [P2-7] `video.ts` create unconditionally overwrites author `stroke`/`strokeWidth` (asymmetric with the guarded `fill` line directly above)

_Justification: the `fill` default is guarded (`if (attrs.fill === undefined)`), proving the intent was "default-if-absent", but the stroke lines are unguarded — any author `stroke`/`strokeWidth` on `scada-video` is silently discarded._

- **File:** `packages/flux-renderers-industrial/src/symbols/base-shapes/video.ts:34-36`
- **What:** `attrs.stroke = '#4b5563'; attrs.strokeWidth = 1;` run unconditionally after `toShapeAttrs` copied author stroke values into `attrs`. Narrow (video is a placeholder until I10) but a clear create-path contract gap.
- **Confidence:** **certain**.
- **Suggestion:** `if (attrs.stroke === undefined) attrs.stroke = '#4b5563'; if (attrs.strokeWidth === undefined) attrs.strokeWidth = 1;`

## [P2-8] `pipe-junction.ts` stubs hardcode `strokeWidth: 4` at create and never update it — a `strokeWidth` change thickens the body but leaves connection stubs thin

_Justification: visual-fidelity divergence on the connection primitive. The body consumes `props.strokeWidth`; the stubs ignore it and the custom `applyProps` routes `strokeWidth` to body only → an inconsistent junction on any strokeWidth binding/diff._

- **Files:** `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts:85` (create: `new Line({...,strokeWidth:4,...})`) and `:114` (`applyCompositeProps(node, {root, body}, props)` — no stub routing).
- **Confidence:** **certain**.
- **Suggestion:** Derive stub `strokeWidth` from `props.strokeWidth ?? 4` at create and route `strokeWidth` to stubs in the custom `applyProps` (alongside the existing `flow` patch loop).

## [P2-9] `thermometer.ts` create vs `applyProps` liquid-anchor constants diverge (`-24` vs `-16`) — empty-level liquid jumps 8px on first binding tick

_Justification: classic create-vs-update geometry divergence. The empty-liquid anchor is `height - 24` at create (`:42`) but `tubeHeight - 16` at update (`:78`); the two magic constants are unexplained and inconsistent, producing a visible jitter at the first data tick and a mis-anchored column for low values. Sibling `level.ts:42,66` keeps both paths consistent — thermometer is the outlier._

- **Files:** `packages/flux-renderers-industrial/src/symbols/instrument/thermometer.ts:42` (create) vs `:78` (applyProps).
- **Confidence:** **likely** (mechanics certain; visual jitter inferred).
- **Suggestion:** Unify on a single `BULB_RESERVE` constant used by both paths, or compute the anchor from the bulb geometry rather than a literal.

## [P2-10] `getSymbol` read handle returns leafer-internal attribute names typed as `ScadaSymbolProps` — read/write field-name asymmetry on the public component handle

_Justification: contract archaeologist finding. Hosts WRITE config with schema field names (`textSize`, `scale`, `strokeDash`, `textColor`) but READ via `component:getSymbol` and receive leafer-internal names (`fontSize`, `scaleX`+`scaleY`, `dashPattern`, `fill`-for-textColor). A host round-tripping getSymbol→setSymbolProps feeds leafer names back into a schema-typed setter; the typed return is a lie._

- **Files:** `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-handles.ts:89-97` (returns `current.engine.getSymbolProps(symbolId)`) → `packages/flux-renderers-industrial/src/engine/scada-engine.ts:252-257` (`getSymbolProps` returns `leaf.node.get() as ScadaSymbolProps`). The engine comment at `:255` acknowledges it returns leafer-mapped keys ("fontSize 非 textSize").
- **What:** `node.get()` returns leafer attrs. The `as ScadaSymbolProps` cast asserts a shape the runtime does not honor. `design-renderer.md:259` documents `getSymbol` only as "场景树只读" without specifying the shape; the e2e at `:252` works around it by reading `.fill` (a leafer name).
- **Why it matters:** Read/write field-name asymmetry on a public handle; a TypeScript consumer trusting the type reads `result.textSize` and gets `undefined` (actual key `fontSize`). Low blast radius (the registry-level `invoke` returns `data: unknown`), but a genuine contract drift no prior audit flagged.
- **Confidence:** **certain** on the mechanics; **likely** on host impact.
- **Suggestion:** Either remap leafer attrs back to schema names in `getSymbolProps` (inverse of `toNodePatch`), or document the return as raw leafer attrs and drop the `as ScadaSymbolProps` cast.

---

# Cross-Cutting Patterns

1. **"Fix landed on one path, the sibling path was missed" (P1-1, P2-4, P2-8, P2-9, P2-6).** Five findings share this shape: a prior plan fixed a defect on ONE instance/path, and an adjacent instance/path with the same defect class was left untouched. The W3 fix (0653 P1-1) rewrote the `else if` revert block but did not audit `STYLE_RESET_DEFAULTS` completeness (→ P1-1). The B2 fix (0653 P2-8) recomputed `points` for line/arrow/pipe but not composite geometry (→ P2-4). The B4 fix rejected declaration `scale.expression` but left `scale.k/b` and binding-level scale unchecked (→ P2-6). The C2 fix unified equality but kept the array/object confusion (→ P2-2). **Actionable pattern:** remediation plans for a defect class MUST include a grep/audit step over ALL sibling instances as an exit criterion, not just the reported site.

2. **"Two independently-correct writers on the same property" (P2-1, echoes the prior W3 binding-vs-revert).** The binding/animation/state-style trio can all target the same property; the merge order (last-write-wins in `pending`) produces undocumented, sometimes non-deterministic, precedence. W3 closed the binding-vs-state case; the animation-vs-binding case (P2-1) remains. **Actionable pattern:** the property-write precedence among {binding, state-style, animation} should be documented in ONE place and enforced/warned at validate or registration time.

3. **"Validator checks surface type, declared sub-shape unenforced" (P2-3, P2-5, P2-6).** Three findings are facets of one anti-pattern: the validator is the forgotten third layer of the type↔validator↔consumer contract. A single `assertShape` helper + a finiteness check + child-recursion in the legacy scanner would close the cluster mechanically.

---

# 总评 (top 1-3 directions worth attention)

1. **Exit-revert completeness needs a structural guard, not per-field enumeration.** P1-1 (`shadow` never reverted) is the highest-confidence live defect: `StateVisualApplier` fails its core responsibility for the one `ScadaSymbolStylePatch` field missing from `STYLE_RESET_DEFAULTS`, producing a permanent false-alarm glow. The fix is tiny, but the durable lesson is that a reset-default map enumerated per field will always be one field behind the type contract — driving `STYLE_RESET_DEFAULTS` from `keyof ScadaSymbolStylePatch`, and hoisting `applied.delete(key)` outside the revert guard, would make the next added style field safe by construction.

2. **The remediation waves consistently fixed the reported instance and missed its siblings.** P1-1 (reset-map completeness missed by W3), P2-4 (composite geometry missed by B2), P2-2 (array confusion kept by C2), and the P2-6 cluster (sub-fields missed by B4) are all residuals of otherwise-good plans that did not require a sibling-instance audit in their exit criteria. The single most leveraged process change is: every remediation plan that fixes a defect CLASS adds "grep all sibling instances and confirm fixed" to its checklist.

3. **The {binding, state-style, animation} property-write precedence is an undocumented contract.** P2-1 (animation-vs-binding flicker) is the cleanest remaining instance after W3 closed binding-vs-state. Industrial HMI authors will keep combining these (alarm blink + visibility binding; gauge needle + fault-spin animation); the combination silently misbehaves. Documenting the precedence and warning at authoring time is cheaper than fielding the bug reports.

# 本次审查的盲区自评 (self-blindness)

- **Real-leafer rendered output was not verified end-to-end.** P1-1 (shadow persistence), P2-1 (animation/binding flicker), P2-8 (pipe stub stroke), P2-9 (thermometer jitter) all carry residual confidence limits because the leafer mock does not model rendered pixels / z-order / attribute coercion. A real-browser screenshot + pixel-sample probe per state-decorated symbol would promote/retire all four. (This is the same residual blind-spot the prior two open-audits flagged; the mock↔real drift class remains the highest-value next-round cut.)
- **Performance findings (P2-1 wasted animation CPU) were reasoned analytically, not measured.** No synthetic 100k-symbol + binding+animation benchmark was run against the documented envelope.
- **The flux-formula compiler's safety model was not re-verified.** P2-6 (non-string `scale.expression` reaching the compiler) assumes the compiler throws/returns-undefined on bad input; a contract test against the real compiler would confirm.
- **`use-scada-events.ts`, `hit.ts`, and the `batch-add-probe`/`test-handle` paths were read but not deeply stress-tested** for concurrent/rapid pointer sequences (e.g. tap during a flushFrame, hover during config reload). The lifecycle symmetry looks correct, but a dedicated timing/race probe was not performed.

**Best next切入点:** (a) a real-browser pixel probe for each state-decorated builtin symbol (promotes/retires P1-1 and the mock↔real residuals), and (b) drive `STYLE_RESET_DEFAULTS` from `keyof ScadaSymbolStylePatch` + an exit-criteria "sibling-instance grep" rule added to the remediation-plan template (mechanically prevents the P1-1 / P2-4 / P2-2 / P2-6 recurrence class).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
