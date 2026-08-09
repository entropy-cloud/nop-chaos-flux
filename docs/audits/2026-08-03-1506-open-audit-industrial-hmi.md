> Audit Status: planned
> Audit Type: open-ended
> Mission: industrial-hmi
> Planned Into: `docs/plans/2026-08-04-1235-1-hmi-diff-path-convergence-plan.md` (P1 type-drop), `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md` (P1 background/viewport dead fields, P1 StateVisualApplier unwired); P2 → `docs/components/roadmap-industrial-hmi.md` `## Follow-up Backlog`

# Open-Ended Adversarial Audit — Mission `industrial-hmi`

**Date:** 2026-08-04 · **Auditor:** opencode (open-ended adversarial review per `docs/skills/open-ended-adversarial-review-prompt.md`)
**Scope:** `packages/flux-renderers-industrial/src/**` (engine/binding/serialization/symbols/renderer/hooks), `apps/playground/src/pages/scada-*.tsx`, `tests/e2e/scada-*.spec.ts`, package config, against `docs/components/industrial-hmi/design-*.md` and `AGENTS.md`.

**Deduplication note:** `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md` (same session, ran 12:21) already owns 9 P1s (manifest gate, no initial refresh, ready double-dispatch, nodeById stale, importConfig dual-writer, viewport fill/center formula, overlay sky coords, flux-error escalation, zoomLayer anchor) and ~30 P2s. This report re-verifies the P1-3/P1-4/P1-7/P1-9 families briefly (all confirmed live) and reports **only findings not covered there**, plus two live-browser probes performed during this audit.

**Perspectives used:** contract archaeologist (config JSON schema vs runtime consumption), dead-code sweeper (exports without production wiring), exception-path detective (state restore on transition), 10x-operator (per-frame/per-render amplification), test-effectiveness reviewer (console-error suppression allowances).

---

# New findings (not covered by the multi-audit)

## [P1] Config-JSON `background` and `viewport` fields (三件套之「视图配置」) are validated, serialized, and round-tripped but never applied at runtime

_Justification: documented serialization-contract fields silently no-op — an author setting a scene's background or initial viewport inside the config JSON gets nothing, and no code path or test documents the deferral._

- **Where:** `serialization/validate.ts:336-347` (structure-checked), `serialization/config-types.ts:86-90` (typed), `serialization/serialize.ts:10` (round-tripped), `engine/scada-engine.ts:59,124-126` (background only via `ScadaEngineOptions`), `renderer/hooks/use-scada-engine.ts:38-59` (options omit background), `renderer/scada-canvas.tsx:109-119` (no wiring); `design-renderer.md §4.2` declares `viewport`/`background` as part of the 组态 JSON contract.
- **What:** grep across the package shows `config.viewport`/`config.background` are consumed **nowhere** except validate.ts. The engine has a `background` option, but the renderer never passes `config.background` into it; `config.viewport {x,y,scale}` is never fed to `engine.setViewport`. `exportConfig`→`importConfig` preserves the fields, so round-trip masks the deadness.
- **Why it matters:** design-renderer.md §4.2 positions these as first-class scene configuration ("视图配置（三件套之「视图配置」）"); a scene authored per the docs with a saved viewport offset/zoom or a background color renders without it, silently. The `viewport` **prop** (`{fit, center}` policy) is a separate field and does work, which makes the config-JSON fields look even more plausible to an author.
- **Confidence:** certain (code-path exhaustive grep; live-browser probe confirmed no ground fill applies for a config with `background`).
- **Suggestion:** wire `config.background` into the engine ground layer on `reset()`/build, and apply `config.viewport` as the initial viewport state when present (or explicitly document them as export-only v1 fields in design-renderer.md §4.2 and remove from the runtime-validation surface).

## [P1] State style patches are never restored on state exit when the target state has no `style`; the dedicated restore mechanism (`StateVisualApplier`) is exported but never wired into the runtime

_Justification: real user-visible defect for the common "only fault styled" partial declaration pattern — the fault color/blink sticks forever; the restore component exists, is publicly exported, but has zero production wiring (tests-only)._

- **Where:** `binding/dirty-collector.ts:291-315` (`collectStates` applies only `declaration.states[state]?.style` — no base-style restore), `symbols/visual-state.ts:27-65` (`StateVisualApplier.applyState` restores via `lastApplied`), `renderer/hooks/use-scada-engine.ts` (never instantiates it), `src/index.ts:70` (exported), only exercised in `device-symbols.test.ts:76-77` / `sensor-control-symbols.test.ts:55-56` / `state-visual.test.ts`.
- **What:** the pipeline writes state patches as pure incremental collects. On transition run→fault it collects `fill:'#e53935'`; on fault→run, if `states.run` has **no** `style` entry (or the state map only defines `fault`), nothing is collected — the node keeps the fault fill forever (the `collectStates` tests all use full three-state declarations with styles, so 462 green tests never exercise the partial case). `StateVisualApplier` was built exactly for restore semantics ("退出状态恢复 normal 样式", visual-state.ts:24) but `attachTo` is never called in the renderer runtime.
- **Why it matters:** SCADA alarm semantics (fault red until acknowledged) make partial state declarations the norm; a reset alarm leaves the device permanently red, with no self-healing path.
- **Confidence:** certain (code-path analysis + tests confirm the masking).
- **Suggestion:** wire `StateVisualApplier` into `use-scada-engine` (`pipeline.on('state:change')`) — or implement base-style restore in `collectStates`; add a regression test with a partial state declaration (style only on `fault`) asserting fill returns to base after the value clears.

## [P1] `diffScadaConfig` drops the `type` key — a symbol type change between configs is silently ignored, leaving the old leafer node on stage

_Justification: real contract drift in the primary props-change (diff) path — the scene tree permanently diverges from config truth for an ordinary scene edit; also affects group→leaf `children` removal._

- **Where:** `serialization/diff.ts:71-77` (`if (key === 'id' || key === 'type') continue;`), `engine/config-adapter.ts:121-146` (`applyUpdate` has no type handling; a type change cannot rebuild the node), `serialization/validate.ts` (both types valid, so validation passes).
- **What:** prev `scada-rect` id=x → next `scada-ellipse` id=x (e.g., an author re-shapes a tank body) produces `updated: [{id, patch: {…geometry}}]` with no `type`; `applyUpdate` runs `node.set(toNodePatch(...))` on the old Rect — the new ellipse never materializes and the old rectangle keeps its (now stale) geometry. Related sub-case: a group whose `children` become `undefined` diffs `patch.children = undefined`, which `applyUpdate:125` skips (`!== undefined` guard) — children stay in the tree while the config no longer contains them (same divergence family as multi-audit P1-4 but a distinct root cause: the diff itself discards the key).
- **Why it matters:** the diff path is the promised incremental-update mechanism (design-renderer.md §4.3); silent tree/config divergence on type edits breaks the "config is single source of truth" contract and produces duplicates if the id is later reused.
- **Confidence:** certain.
- **Suggestion:** treat `type` changes as remove+add in `diffScadaConfig` (or validate that `applyUpdate` rejects type-change patches), and normalize `children: undefined` to a removal patch; add serialization-level tests.

---

# P2 findings (non-blocking polish — backlog)

## [P2] `useScadaConfigSync` `onBuilt` guard must be change-based, not identity-based — unstable `config` object identity re-dispatches `scada:ready` on every render

_Justification: amplification of multi-audit P1-3's fix suggestion; a guard keyed on "same config object" would leave this trigger unfixed._

- **Where:** `renderer/hooks/use-scada-config-sync.ts:113-114` (unconditional `onBuilt()`), `renderer/scada-canvas.tsx:64-67` (`useMemo` on `props.props.config` identity).
- **What:** when the host passes a freshly constructed config object each render (store-derived or inline spread), the effect re-runs with an empty diff and fires `onBuilt` → `onReady` action dispatch on **every render**; the demo pages use module constants so this never manifests in e2e. The multi-audit's suggested "already fired for this config" guard would not fix this trigger — the guard needs to be diff/change-based (skip `onBuilt` when the computed diff is empty).

## [P2] `reloadBindings` wipes all live point values on any symbol/variable change — injected values reset to `init` with no merge

_Justification: data-plane value loss in the props-change path (currently only hit by demo/perf injection, but is the designated adapter entry point per design-data-binding §9.2)._

- **Where:** `renderer/hooks/use-scada-engine.ts:165-181` (`pointStore.reset()` + `loadDeclarations`), `binding/point-store.ts:95-110`, `use-scada-config-sync.ts:110` (reload on any diff touching symbols/variables).
- **What:** a config change that only adds a deadband/unit resets every point to its declaration `init`; flux-bridge points are re-injected by the effect re-run, but static/expression values with runtime-mutated state and any future adapter-driven values are silently lost.

## [P2] `scada-image` load-failure signal (`loadFailed`) has no consumer — the claimed "onError 语义归 I10 桥接层消费" wiring does not exist

_Justification: the code comment promises a bridge channel that was never built; image load failures are invisible to the renderer and to `onError`._

- **Where:** `symbols/base-shapes/image.ts:43-47` (error → `node.set({background: placeholder, loadFailed: true})`), `symbol-types.ts:79-82` (bridge interface), renderer hooks (no image-error channel).
- **What:** `loadFailed` is written but never read anywhere; `custom.url` validation exists (validate.ts:219-224) but a runtime 404 renders a permanent grey block with zero diagnostics. Either wire the event to the error channel or fix the comment.

## [P2] `point:change` subscribers run inside `applyValue` with no try/catch — a throwing subscriber breaks the remaining write loop

_Justification: exception-path residue on the designated adapter ingestion point; today there are zero production subscribers so it is latent, not live._

- **Where:** `binding/point-store.ts:187-203` (`events.emit` + subscriber loop inside `applyValue`; exception propagates out of `setPointValues`), `EventHub.emit` (point-store.ts:42-46).
- **What:** per design-data-binding §8.1 `point:change` is the data-event source for future trigger/action wiring; a subscriber throw aborts the batch loop (later points unwritten) and surfaces in whichever caller injected values.

## [P2] `component:destroy` leaves `data-status="ready"` and the canvas wrapper mounted — the destroyed state is not reflected anywhere

_Justification: lifecycle state/status contract hole; e2e/tooling asserting `data-status` would report a destroyed canvas as healthy._

- **Where:** `renderer/hooks/use-scada-handles.ts:54-57` (destroy returns `{ok:true}`), `renderer/scada-canvas.tsx:169-190` (status derives only from build events).
- **What:** after `component:destroy` the canvas shows the ready-state wrapper indefinitely (and per `use-scada-engine.ts:152` the mount effect never re-creates the engine because `containerRef` never changes). Either surface a `destroyed` status or document the handle as unmount-only.

## [P2] `scada-perf-scale` console-error allowance is a blanket copy of the calendar precedent, not evidence-based — this audit's live probe found zero console errors on the route

_Justification: test-effectiveness hygiene — `allowConsoleErrors(100)` and `ROUTES_WITH_KNOWN_ERRORS` membership suppress the strongest regression signal (uncaught exceptions) on the mission's own perf pages without demonstrated need._

- **Where:** `tests/e2e/scada-perf.spec.ts:134,148,237,273,346` (`allowConsoleErrors(100)`), `tests/e2e/playground-entry-pages.spec.ts:450` (route in `ROUTES_WITH_KNOWN_ERRORS`).
- **What:** live Chromium probe (this audit): placeholder mount, 100k `engine.reset` build, and 10k-point `setPointValues` injection all produced **zero** `console.error`/`pageerror` entries. The allowances were introduced per commit "scada-perf-scale 入 ROUTES_WITH_KNOWN_ERRORS，对齐 calendar-perf-scale 先例" — precedent-copy, not a measured error. Recommend dropping the allowances (or documenting the actual known errors) so perf-page regressions surface as test failures.

---

# Re-verification of multi-audit P1s (all confirmed live, no fixes landed since)

- P1-3 (ready double-dispatch): confirmed — `use-scada-config-sync.ts:113-114` unconditional `onBuilt`; the `reloadBindings → setRuntime(新对象) → 空 diff 重跑` sequence fires a second `scada:ready`; lifecycle test only asserts `dispatch.mock.calls[0]` (scada-canvas-lifecycle.test.tsx:104-110), masking it.
- P1-4 (nodeById stale): confirmed — `config-adapter.ts:121-146` never touches `nodeById` on update; `getSymbolDeclarations` (scada-engine.ts:217-235) reads the stale node.
- P1-7 (overlay world coords on sky layer): confirmed — `interaction-overlay.ts:86-121`; e2e hover assertions run at the identity viewport so they pass.
- P1-9 (zoomLayer anchor space): confirmed — `scada-engine.ts:340-355` passes a content-space point to `scaleOfWorld`; mock `leafer-ui-mock.ts:189-194` models only scale.

# 总评

1. **The config-JSON → runtime wiring has a class of "validated but dead" contract fields** (`background`/`viewport`, and the `StateVisualApplier` restore path): validation, serialization, and tests all pass while the runtime effect is absent. The 462-unit-green suite is systematically blind to this because tests exercise the same code paths the wiring skips. The highest-value fix is closing these two silent no-ops (F1, F2) — they are the kind of defect that survives a "full green" baseline forever.
2. **The diff path is the weakest contract surface**: three independent divergences now accumulate there (multi-audit P1-4 nodeById, P1-5 importConfig baseline, new P1-3 type-drop). Each was introduced by a different feature wave; nothing prevents the next one. A single "diff application must converge tree indexes + declarations + baselines in one transaction" invariant (with one regression test per divergence) would pay off more than any individual fix.
3. **Test allowances are masking the mission's own quality signal**: the perf pages' console-error allowances (blanket precedent-copy) and the scene-tree-only e2e assertion channel mean the two most expensive pages in the repo are the least supervised. This audit's probe shows the allowance is currently unnecessary — remove it while it is still cheap.

# 本次审查的盲区自评

- **未深入验证的领域：** (a) leafer-ui 真实矩阵/坐标语义的进一步逐行核对（本轮只复查了多审计已覆盖的 zoomLayer 锚点族；真实 leafer `Text` 布局、`Image` 生命周期、`Group` 相对坐标在缩放下的行为仍可能有 mock 掩蔽点）；(b) `@nop-chaos/flux-formula` 编译器的 `compileValue/evaluateValue` 在私有 eval scope（`createPrivateEvalScope` 的 `readOwn/readVisible` 语义）下的真实行为——若 compiler 依赖 scope 的 store 面而非 value 面，flux 桥接求值可能在真实环境下静默失败；(c) `useScopeSelector` paths 订阅在超大 scope（10 万字段）下的退化行为。
- **下一轮切入点建议：** 用真实浏览器对 `Text`/`Image`/复合图元在「缩放 + 平移」后的渲染像素做一次直接断言（绕过测试句柄的场景树面），以及构造一个 1 万 flux 点的配置实测 `useScadaPointsBridge` 每 scope 更新的 O(N) 求值成本。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
