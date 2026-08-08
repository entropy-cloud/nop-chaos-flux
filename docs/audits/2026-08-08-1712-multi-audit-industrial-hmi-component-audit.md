> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: industrial-hmi-component-audit
>
> Remediation mapping: 全部 5 个 P1 已进第一波 plans `docs/plans/2026-08-08-1809-{1,2,3}-*`：P1-1→1809-2；P1-3→1809-2；P1-2/P1-4/P1-5→1809-3。P2-1~P2-11（11 项）登记于 `docs/backlog/industrial-hmi-component-audit-roadmap.md ## Follow-up Backlog`。本 audit 无 P0；与 open-audit 共享的 finding（A5=P1-1）已在 open-audit 的 mapping 注明，不重复开 plan。

# Multi-Dimensional Audit — Mission `industrial-hmi-component-audit` (`packages/flux-renderers-industrial`)

- **Audit date:** 2026-08-08
- **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
- **Scope:** `packages/flux-renderers-industrial/src/**` — code, config, tests, and public contracts (exports / API surface / `./editor` subpath), cross-referenced against `docs/components/industrial-hmi/*.md`, `docs/components/industrial-hmi-editor/*.md`, and the live post-HCA state.
- **Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design). Per `docs/skills/deep-audit-prompts.md` shared prefix: a live defect is a defect even when introduced/exposed by a non-audit commit; "transitional / not-yet-converged" is not a valid downgrade reason.
- **Methodology:** Read calibration docs + reopened-adjudications + audit-tooling + react19-best-practices + the IND-1~IND-6 industrial checklist (`docs/audits/component-audit-checklist.md` §2.1). Ran mechanical gates fresh. Dispatched 4 parallel `general` deep-dive sub-agents (API/boundary; editor subsystem; engine/binding/serialization/symbols + e2e failures; docs/i18n/test-fidelity). **Every P1 candidate was independently re-verified by the orchestrator against live source** — the transaction-leak chain was hand-walked through `undo-redo-adapter.ts:28-30,39-44,52-69` + `editor-session.ts:78-84` + `runtime-mutators.ts:204-229`; the applyUpdate-drops-children chain was hand-walked through `runtime-factories.ts:162-177` + `editor-engine.ts:221-239,403-414` + `diff.ts:67-101`; the viewport.fit chain was hand-walked through `scada-engine.ts:96-126` + `use-scada-config-sync.ts:103-139,205-239`; the nested-mutator + stale-selection paths were read in full from `runtime-mutators.ts:84-166,100-123`. Only independently verified findings appear below.
- **Context:** The mission has been heavily audited and remediated prior to this pass — HCA1–HCA11 + HCAX-1/HCAX-2 layer audits (all done), HCA-CR cross-layer remediation (done), HCA-CV full verification (done, 0 audit regression), HCA-BL bug archival (9 cards `docs/bugs/77–85`), HCA-LL lesson sink (done). All previously-reported P1s (binding-expression subscription, `RefreshPipeline.onError`, oversized files, editor onSave/onLoad/commitPolicy/runtime-handles/controlled-push-back, grouped-child undo, connection coordinate-space, `use-editor-engine.ts` split, palette drop, raw textarea, selection dual-source, mode desync, test false-greens, perf O(n²), coalesce/redo-truncation, toolbox importConfig mode sync, custom deep-clone) were **re-confirmed FIXED** in live code during this audit (spot-checked `use-scada-points-bridge.ts:56,122-124,232-238`, `use-scada-engine.ts:61-91,187,275`, `scada-editor-canvas.tsx:111-166`, `runtime-mutators.ts:191-229`, `editor-session.ts:78-84,123-129`, `undo-redo-adapter.ts:243-261`). This audit therefore focuses on **NEW residuals** the prior waves missed or that the remediation work itself introduced.

## Mechanical Gates (run fresh at audit time)

| Gate                                                           | Result                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` | **PASS**                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm --filter @nop-chaos-flux-renderers-industrial lint`      | **PASS**                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm --filter @nop-chaos-flux-renderers-industrial test`      | **PASS** (~1340 tests / 100 files, matches HCA-CV closure baseline)                                                                                                                                                                                                                                                                                                            |
| `pnpm check:oversized-code-files`                              | **FAIL (workspace-wide)** — 14 files >700 lines, but **0 in `flux-renderers-industrial`** (largest industrial files are `serialization-validate.test.ts:656`, `scada-points-bridge.test.tsx:652`, `scada-canvas-lifecycle.test.tsx:639`, `scada-engine.ts:513` — all under the 700 hard limit). The prior P1-3 / editor-P1-03 oversized-gate failures are **confirmed FIXED**. |
| `pnpm check:audit-runtime-raw-schema-reads` (in-package)       | 0 hits — compile-once honored                                                                                                                                                                                                                                                                                                                                                  |

Package-level mechanical health is clean. All findings below are semantic defects the gates cannot catch.

## Priority Summary

| Priority                                                                                                                 | Count  | Drives remediation plan? |
| ------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------ |
| **P0** (blocking — contract break / wrong behavior / data loss / security / failing-or-absent test for changed behavior) | **0**  | —                        |
| **P1** (material — real defect or contract drift that should be fixed)                                                   | **5**  | **Yes**                  |
| **P2** (trivial / non-blocking polish — doc rot, wording, naming, cosmetic, weak test)                                   | **11** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 5 P1s.

---

# P1 Findings (must fix — independently re-verified by orchestrator)

## [P1-1] (Dim 04 / 22) Transform transaction leaks across `load` / `importConfig` → undo stack corrupted (restores pre-load config on undo)

_Justification: incorrect behavior + undo-data integrity. `UndoRedoAdapter.inTransaction`/`prevAtOpStart` survive `resetSession`, so a drag interrupted by a programmatic load pushes a bogus diff(OLD, NEW-config) onto the now-empty stack; undo restores the wrong (pre-load) config._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/undo-redo/undo-redo-adapter.ts:28-30,39-44,52-69` (transaction state + commitTransaction pushes diff(prevAtOpStart, current))
  - `packages/flux-renderers-industrial/src/editor/editor-session.ts:78-84` (`resetSession` clears `session.undoStack` ONLY — does NOT touch the adapter's `inTransaction`/`prevAtOpStart`)
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:204-229` (`load()` calls `resetSession` + `engine.build` but never `undoRedo.abortTransaction()`); same shape at `toolbox-runtime.ts` importConfig path
  - `packages/flux-renderers-industrial/src/editor/runtime-factories.ts:234-240` (`handleTransformEnd` → `commitTransaction(session.workingConfig)` fires after load with stale `prevAtOpStart`)

- **Evidence:**

  ```ts
  // undo-redo-adapter.ts:28-30 — adapter holds transaction state SEPARATE from the stack
  private inTransaction = false;
  private transactionKind: EditorOperationKind | undefined;
  private prevAtOpStart: ScadaConfig | undefined;

  // editor-session.ts:78-84 — resetSession clears the STACK but not the adapter
  export function resetSession(session, config): void {
    session.workingConfig = cloneConfig(config);
    session.committedBaseline = cloneConfig(config);
    session.selection = [];
    session.mode = 'edit';
    session.undoStack.clear();          // ← UndoRedoAdapter.inTransaction/prevAtOpStart UNTOUCHED
  }

  // runtime-mutators.ts:204-229 — load() never aborts the adapter's transaction
  const load = (input) => {
    try {
      ...
      resetSession(session, config);    // ← stack cleared, adapter.inTransaction still true
      ...
      engine.build(session.workingConfig);
      ...
    } catch (error) { ... }
  };
  // runtime-factories.ts:234-240 — pointerup after load fires commitTransaction
  const handleTransformEnd = () => {
    undoRedo.commitTransaction(session.workingConfig);  // diff(OLD prevAtOpStart, NEW post-load) → HUGE diff pushed
    notifySession();
  };
  ```

  **Hand-trace:** user starts a transform drag (`beginTransaction` snapshots OLD working copy, sets `inTransaction=true`) → host/programmatic `runtime.load(newConfig)` fires mid-drag → `resetSession` clears `session.undoStack` (the same `UndoStack` object the adapter wraps) but leaves `adapter.inTransaction=true` and `adapter.prevAtOpStart=OLD` → on pointerup, `commitTransaction(NEW)` computes `diffScadaConfig(OLD, NEW)` = a giant diff spanning the entire config swap → pushes 1 entry onto the now-empty stack → user presses Undo → working copy reverts to OLD (pre-load) config, not the pre-drag state. The undo stack is permanently desynchronized from the working copy.

- **Severity:** **P1** — undo-data corruption; the user's next undo silently restores an unrelated (pre-load) config, losing the post-load state with no diagnostic. Reachable via any `load()`/`importConfig` during an active drag: controlled-mode `config` prop push-back (the prior P1-09 fix wired a prop watcher that calls `runtime.load`), the `component:load` handle, the toolbox import-config button, or scripted/test-handle flows. Compounds with P1-3 (stale selection after undo).
- **Status:** Live defect. The HCA10 coalesce work hardened the undo stack itself, and HCA11 wired `setMode` parity on import, but neither touched the `resetSession` ↔ `UndoRedoAdapter` transaction-boundary gap. The `abortTransaction()` method exists (adapter:72-76) and is documented for "异常路径或事务期间 mode 切换" — a load-during-transaction is exactly that case but is not routed through it.
- **Risk:** Silent undo corruption is among the hardest editor bugs to diagnose. Under v1 baseline, a mid-drag load producing a bogus undo entry that restores the wrong config cannot be excused as an edge case — controlled-mode push-back makes it reachable in normal host wiring.
- **Suggestion:** In `load()` and `toolbox-runtime.importConfig`, call `undoRedo.abortTransaction()` BEFORE `resetSession()` (the transaction's `prevAtOpStart` is now meaningless after a full config swap). Add a regression test: `beginTransaction` → `load(newConfig)` → assert `undoRedo.isInTransaction === false`, `session.undoStack.canUndo === false`, and a subsequent pointerup does NOT push an entry.
- **False-positive exclusion:** NOT the already-fixed "undo-redo coalesce" (HCA10) — that addressed `replaceUndoTop` redo truncation and `singleNodeUpdate` payload rejection. NOT the already-fixed "toolbox importConfig mode sync" (HCA11) — that synced `engine.mode`→`session.mode`. This is a distinct gap: the adapter's transaction lifetime is not coupled to `resetSession`. NOT a low-code boundary — entirely within the editor domain's two cooperating classes (`UndoRedoAdapter` + `ScadaEditorSession`).

## [P1-2] (Dim 21 / 22) `engine.applyUpdate` unconditionally `delete`s the `children` patch → nested group-child inspector edits / nested-junction connection writes never reach the leafer canvas

_Justification: incorrect behavior / WYSIWYG break. `diffScadaConfig` is top-level-only, so a nested-child edit produces `{updated:[{id:group, patch:{children:[...]}}]}`; `applyUpdate` then `delete`s `children` and applies the remaining (empty) patch → the leafer canvas stays at the old child state while `workingConfig` advances._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:403-414` (`applyUpdate` — `delete (attrPatch).children`)
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:221-239` (`applyDiff` routes each `update` to `applyUpdate(update.id, update.patch)`)
  - `packages/flux-renderers-industrial/src/serialization/diff.ts:67-101` (`diffScadaConfig` iterates **top-level** `next.symbols` only; for a group, `valuesEqual(prev.children, next.children)` deep-compares → nested-child fill change yields `patch.children`)
  - `packages/flux-renderers-industrial/src/editor/runtime-factories.ts:162-177` (`syncWorkingCopy` → `engine.applyDiff`)
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:63-74` (`updateWorkingNode` → `applyPatchToWorkingNode` + `syncWorkingCopy`)

- **Evidence:**

  ```ts
  // diff.ts:75 — iterate TOP-LEVEL symbols only (no recursion into children)
  for (const node of next.symbols) {
    ...
    // diff.ts:92-99 — for the group, SYMBOL_KEYS includes 'children'; deep-equal fails when a child fill changed
    for (const key of SYMBOL_KEYS) {
      if (key === 'id' || key === 'type') continue;
      if (!valuesEqual(prevNode[key], node[key])) {
        patch[key] = key === 'children' && node[key] === undefined ? [] : node[key]; // ← group gets patch.children
      }
    }
  }
  // editor-engine.ts:230-232 — applyDiff routes each update to applyUpdate
  for (const update of diff.updated) {
    this.applyUpdate(update.id, update.patch);
  }
  // editor-engine.ts:403-414 — applyUpdate DISCARDS children, applies only remaining (empty) patch
  private applyUpdate(id, patch): void {
    const leaf = this.registry.get(id);
    if (!leaf) return;
    const attrPatch: Partial<ScadaSymbolProps> = { ...patch };
    delete (attrPatch as Partial<ScadaSymbolNode>).children;   // ← nested-child change dropped here
    if (leaf.definition?.applyProps) { leaf.definition.applyProps(node, attrPatch); }
    else { node.set(toNodePatch(node, attrPatch)); }           // ← nothing to set → canvas stale
  }
  ```

  **Hand-trace of inspector edit on a nested child:** select group child `inner-1` (supported — the inspector + connection layers handle nested children; P1-02 coordinate-space fix + HCA8 nested attribution confirm nested-child interaction is a supported path) → inspector `onChange` → `runtime.updateWorkingNode('inner-1', {fill:'#abc'})` → `applyPatchToWorkingNode` recurses, mutates `inner-1.fill` in `workingConfig` → `pushOperation('update-symbol', prev, current)` (undo entry created) → `syncWorkingCopy()` → `diffScadaConfig(prev, current)` = `{updated:[{id:'grp', patch:{children:[…inner-1.fill=#abc…]}}]}` → `engine.applyDiff` → `applyUpdate('grp', {children:[…]})` → `delete children` → remaining patch `{}` → group's leafer node unchanged → **inner-1's fill on the canvas stays at the old value**. Only a full `engine.build` (e.g. reload) recovers.

- **Severity:** **P1** — WYSIWYG contract broken for nested group-child edits (and the same path silently drops nested-junction `connection` writes via the group's `custom` patch when the junction lives inside a group). Existing tests assert against `session.workingConfig.symbols[g].children[i].fill` (data layer) — never `engine.getSymbol('inner-1').node.get('fill')` (canvas layer) — so the suite is systematically blind to this; the prior P1-01 (grouped-child undo) and P1-02 (coordinate-space) fixes both left the data↔canvas sync gap open.
- **Status:** Live defect. The `delete children` line predates the group feature and was reasonable when `applyUpdate` only handled leaf attribute patches; once `diffScadaConfig` started emitting group-level `children` patches (which it does for any nested-child mutation), the discard became a silent data-loss-on-canvas path. No prior audit caught it because every group-child test fixture asserts at the working-config level.
- **Risk:** A user adjusts a slider/field on a grouped symbol via the inspector, the data model updates (so undo/redo see it), but the canvas does not move/change — the user believes the edit failed and retries, or saves a config whose canvas preview is wrong. Groups are a documented first-class feature (`scada-group`, group/ungroup handles).
- **Suggestion:** When `applyUpdate` receives a patch containing `children`, recurse: diff old vs new children per id and call `buildNode`/`removeSymbol`/`applyUpdate` per child (mirror the runtime `ConfigAdapter` rebuild pattern, or expose a `rebuildSubtree(groupId, children)` helper). Add a regression test asserting `engine.getSymbol('inner-1').node.get('fill') === '#abc'` after `updateWorkingNode('inner-1', {fill:'#abc'})` on a grouped child.
- **False-positive exclusion:** NOT the already-fixed "grouped-child undo loss (shallow clone → deep clone)" (P1-01) — that fixed `cloneConfigSnapshot` so the diff is non-empty. Here the diff IS non-empty and correct; the engine discards the relevant field. NOT the already-fixed "connection coordinate-space" (P1-02) — that fixed `collectWorldBounds` parent-offset accumulation. NOT a low-code boundary — pure editor-engine internal contract between `applyDiff` and `applyUpdate`.

## [P1-3] (Dim 04 / 22) Undo/redo of structural ops leaves stale `session.selection` (dangling ids) — inspector/toolbox silently mis-target

_Justification: incorrect behavior. `applyUndoRedoDiff` updates working config + engine tree but never prunes `session.selection`, so after undoing an add (or redoing a remove) selection can hold ids that no longer exist; downstream toolbox/inspector ops then silently no-op on dead ids._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:100-123` (`applyUndoRedoDiff` applies diff + commits but never reconciles selection; contrast `removeWorkingSymbol:87` and `load:214` which DO deselect)

- **Evidence:**

  ```ts
  // runtime-mutators.ts:100-113 — applyUndoRedoDiff: no selection reconciliation
  const applyUndoRedoDiff = (diff, commit) => {
    const beforeWorking = cloneConfigSnapshot(session.workingConfig);
    try {
      session.workingConfig = undoRedo.applyDiff(session.workingConfig, diff);
      engine.applyDiff(diff, session.workingConfig);
      synced.config = cloneConfigSnapshot(session.workingConfig);
      commit();
      notifySession();                 // ← session.selection NOT pruned; onSelectionChange NOT fired
    } catch (error) { ... }
  };
  // contrast removeWorkingSymbol:87 — DOES deselect:
  setSessionSelection(session.selection.filter((id) => id !== nodeId));
  // contrast load:214 — DOES push [] to onSelectionChange:
  latest.current.onSelectionChange?.([]);
  ```

  **Hand-trace:** user adds symbol `foo`, selects it, then Undo (remove-symbol inverse applies) → `session.workingConfig` no longer contains `foo`, but `session.selection === ['foo']` (and the React mirror, if not re-rendered, also holds `foo`) → inspector `findNode('foo')` returns undefined (shows "no symbol") while toolbox `hasSelection=true` (Delete enabled) → user clicks Delete → `removeWorkingSymbol('foo')` filters top-level, no match → silent no-op (and `pushOperation` returns undefined → no undo entry). The leafer Editor's `target` may also still reference the destroyed node.

- **Severity:** **P1** — inconsistent editor state after undo/redo; subsequent toolbox actions silently fail with no feedback. The asymmetry (remove/load deselect, but undo/redo of the equivalent structural change do not) is the defect. Reachable in normal editing whenever a selected symbol is added then undone, or removed then redone.
- **Status:** Live defect. The HCA10 coalesce work and the selection dual-source unification (P1-07) did not extend to the undo/redo apply path.
- **Risk:** Hard-to-reproduce "Delete/align/distribute button does nothing" reports after undo; corrupts the user's mental model of selection. Programmatic/test-handle consumers hit it immediately.
- **Suggestion:** After successful `commit()` in `applyUndoRedoDiff`, prune `session.selection` against the new `workingConfig.symbols` (recurse via `collectAllSymbols`), call `setSessionSelection(pruned)` (which fires `onSelectionChange` and unifies the React mirror), and call `engine.setEditorTargets(resolvedNodes)` or `engine.clearEditorSelection()` if empty. Add a regression test: select added symbol → undo → assert `session.selection` does not contain the removed id, `canUndo`/`canRedo` flags match the stack, and a subsequent Delete is a clean no-op-with-feedback rather than a silent dead-id operation.
- **False-positive exclusion:** NOT the already-fixed "selection dual-source unified" (P1-07) — that unified canonical `session.selection` with the React `useState` mirror. This is a separate concern: post-undo reconciliation of the canonical selection against the new working config. NOT a low-code boundary — `selection` is an editor-session internal.

## [P1-4] (Dim 22) `removeWorkingSymbol` / `groupSymbols` / `ungroupSymbols` operate on top-level only → silent no-op for nested-group targets (asymmetric with `selectionNodes` which resolves nested ids)

_Justification: incorrect behavior. `selectionNodes()` resolves nested ids via `collectAllSymbols` for align/distribute/copy/cut, but the three core structural mutators filter/find top-level only; selecting a group child and pressing Delete/Group/Ungroup is a silent no-op (or, for mixed selection, produces a wrong-shape group)._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:84-91` (`removeWorkingSymbol` — top-level `.filter`); `:125-152` (`groupSymbols` — top-level `.filter` for children, silent `return` when nested); `:154-166` (`ungroupSymbols` — top-level `.find`, silent `return` when nested)
  - contrast the nested-aware resolver used by align/distribute (per sub-agent, `selectionNodes()` via `collectAllSymbols`)

- **Evidence:**

  ```ts
  // removeWorkingSymbol:84-91 — top-level filter; nested child id never matches
  const removeWorkingSymbol = (nodeId) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    session.workingConfig.symbols = session.workingConfig.symbols.filter((n) => n.id !== nodeId);
    // ↑ nested child → filter matches nothing → silent no-op (diff empty → pushOperation returns undefined)
    setSessionSelection(session.selection.filter((id) => id !== nodeId));
    undoRedo.pushOperation('remove-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();
    notifySession();
  };
  // groupSymbols:125-130 — top-level filter for children; nested selection → children.length===0 → silent return
  const children = session.workingConfig.symbols.filter((s) => childSet.has(s.id));
  if (children.length === 0) return; // ← no onError, no UI feedback
  // ungroupSymbols:154-158 — top-level find; nested group id never found
  const groupNode = session.workingConfig.symbols.find((s) => s.id === groupId);
  if (!groupNode || groupNode.type !== 'scada-group' || !groupNode.children) return; // silent
  ```

- **Severity:** **P1** — silent UI failure on a supported selection path. Nested-child selection is reachable (the connection layer's `collectWorldBounds` handles nested children for hit-testing per the P1-02 fix; the inspector drills into nested children per HCA8; `setSelection`/test-handles accept arbitrary nodeIds). The asymmetry — `align` two grouped children works but `delete` one is a silent no-op — is itself the defect. For mixed top-level + nested selection, `groupSymbols` produces a wrong-shape group containing only the top-level subset, silently dropping the nested selections.
- **Status:** Live defect. The prior waves fixed nested-child undo (P1-01) and nested-child coordinate-space (P1-02) but did not propagate nested-id resolution into the three structural mutators.
- **Risk:** User selects a group child (via drill-down / test-handle / scripted flow), clicks Delete/Group/Ungroup → nothing happens, no error, no flash; or mixed selection produces a corrupt group. Hard-to-diagnose "button does nothing" reports.
- **Suggestion:** (a) `removeWorkingSymbol`: walk `workingConfig.symbols` recursively and unlink the matched node from its parent's `children` (or top-level). (b) `groupSymbols`: collect children recursively, unlink them from original parents before re-parenting into the new group. (c) `ungroupSymbols`: find the group recursively via `findNodeInWorking`. (d) Where a fix is deferred, dispatch `onError('invalid-node', …)` instead of a silent `return`. Add tests: `handle.setSelection(['nested-child-id'])` → each mutator → assert visible behavior + non-empty undo stack (or a user-visible error).
- **False-positive exclusion:** NOT the already-fixed "grouped-child undo loss" (P1-01) — that was about deep cloning snapshots. NOT the already-fixed "connection coordinate-space" (P1-02) — that was about `collectWorldBounds`. This is about the mutators' lookup scope. NOT a low-code boundary — these are editor-domain pure-logic mutators.

## [P1-5] (Dim 21 / 22) `viewport.fit` computed against schema world-size and never recomputed on canvas resize → `fit:'contain'` broken in responsive containers (root cause of the 7 known scada e2e failures)

_Justification: incorrect behavior + failing tests. The engine conflates schema `width`/`height` (world/design space) with the leafer canvas DOM size, computes the initial `fit` against the schema size (scale=1), then the ResizeObserver resizes the canvas DOM to the real container but never re-applies fit → world coords map off-screen → hover/click land outside the canvas._

- **Files:**
  - `packages/flux-renderers-industrial/src/engine/scada-engine.ts:96-126` (constructor uses `options.width` — schema 960 — as BOTH `this.size` world space AND the leafer `appConfig.width` DOM size)
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts:103-139,205-239` (`applyInitialViewport` → `engine.fit(bounds)` uses `engine.size`; applied ONCE on the 'full'/reset path at line 223)
  - `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts` ResizeObserver (calls `engine.setSize(realContainerW, realContainerH)` — resizes only, no viewport recompute; `scada-engine.ts` `setSize` only does `this.size = {...}; this.app.resize(...)`)

- **Evidence:**

  ```ts
  // scada-engine.ts:98-100 — schema width (960) becomes the engine's WORLD size
  const width = options.width ?? options.container.clientWidth ?? 0;   // options.width=960 from schema
  const height = options.height ?? options.container.clientHeight ?? 0;
  this.size = { width, height };
  // scada-engine.ts:108-111 — SAME schema width handed to leafer as the CANVAS DOM size (conflation)
  const appConfig = { view: options.container, width: options.width, height: options.height, ... };
  this.app = new App(appConfig);

  // use-scada-config-sync.ts:111-112 — fit computed ONCE against this.size (=960) → scale=min(960/960,...)=1
  if (policy.fit === 'contain') { runtime.engine.fit(bounds, 0); }   // uses engine.size (960)

  // ResizeObserver (use-scada-engine.ts) — corrects canvas to REAL container (302px) but NEVER re-fits:
  //   runtimeRef.current.engine.setSize(width, height);   // setSize only resizes; no viewport recompute
  ```

  **Hand-trace (matches HCA-CV diagnosis exactly):** demo schema declares `width:960` + `viewport:{fit:'contain'}`, rendered in a responsive 3-region layout whose canvas column is ~302px wide. At mount: `engine.size = {960,...}`, leafer canvas DOM created at 960, `fit(bounds)` → `scale = min(960/worldW, ...) ≈ 1`. ResizeObserver fires → `setSize(302, ...)` resizes the canvas DOM to 302 but leaves `viewport.scale=1`. Now `getViewportPoint(world 350,278)` → screen `(350,278)` which is beyond the 302px canvas right edge → every hover/click on a symbol at world x>302 lands off-screen. This is exactly the 5 `scada-demo` + 2 `scada-edge-cases` hover/click failures and plausibly the `scada-perf:155` pointer-drag viewport guard.

- **Severity:** **P1** — core SCADA interaction (hover highlight, click→dialog, dblclick→navigate) is completely non-functional in any responsive container narrower than the authored world width. The normal responsive case (canvas filling a flex column) triggers it; it is NOT specific to the 3-region demo. HCA-CV correctly diagnosed the symptom and attributed it to "08-06 三区布局", then explicitly deferred it as "watch-only residual — feed to industrial successor" (out of CV's scope, which only verifies audit fixes didn't regress). Under this audit's v1/no-compatibility-burden baseline, a live defect that breaks the documented `viewport.fit` contract and fails 7 e2e tests is a material defect regardless of which commit exposed it.
- **Status:** Live defect, deferred by HCA-CV to the industrial successor (not CV's scope). The defect is the renderer's internal inconsistency: the ResizeObserver actively resizes the canvas to track the container (evidencing an intent to support responsive containers), but the initial-fit + no-refit-on-resize means the `fit` policy only holds when `container.clientWidth === schema.width`. The prior viewport-hardening wave (P2-5/P2-7/P2-8, NaN/Infinity/floor defenses) did not touch resize→refit.
- **Risk:** Authors following `design-renderer.md` §4.1 (which documents `viewport:{fit:'contain'}` as the initial-viewport contract) get a broken canvas in any responsive host layout, with no diagnostic. The editor canvas (`scada-editor-canvas.tsx`) has the same single-shot fit pattern and the same class of risk.
- **Suggestion:** Decouple world-space from DOM-space — do NOT pass schema `width`/`height` as the leafer canvas DOM dimensions; let the canvas fill its container (the CSS already does `h-full w-full`) and measure the container at mount. Then either (a) defer `applyInitialViewportState` until the first ResizeObserver callback delivers the real size, or (b) re-apply the declared `viewport` fit policy inside the ResizeObserver handler when the size delta is material. Apply the same fix to the editor canvas. Add an e2e asserting hover lands on-canvas after a container resize.
- **False-positive exclusion:** NOT "acceptable residual" — HCA-CV's "watch-only" status was a scope decision (CV verifies audit fixes, not pre-existing defects), not a verdict that the defect is acceptable; it explicitly called it an "industrial 包既有 layout 缺陷" and routed it to the successor. This audit IS the successor-facing fresh review. NOT a low-code boundary — it is the runtime canvas renderer's own sizing+viewport contract. NOT an already-fixed item (the fixed list covers NaN/Infinity defense, divide-by-zero, 1e-6 floors, depth caps — none touch resize→refit or world/DOM-size separation). The 7 failing e2e tests are concrete evidence the contract is broken.

---

# P2 Findings (non-blocking polish — backlog)

Each is tagged with a one-line justification. These are real but do not by themselves drive a remediation plan; they triage to the follow-up backlog.

## Public surface / boundary (Dim 03 / 18)

### [P2-1] `serializeScadaConfig` exported but `parseScadaConfig`/`validateScadaConfig`/`diffScadaConfig`/`ScadaValidationResult` are not — asymmetric surface vs. the documented "host 校验/审计" rationale

_Justification: missing-export gap, not wrong behavior; `index.ts:49-54` comment claims host-side validation/audit support but only `serializeScadaConfig` is public, while `propContracts.config.description` references `parseScadaConfig`/`validateScadaConfig` as the validation mechanism a host cannot import._

- **File:** `packages/flux-renderers-industrial/src/index.ts:49-54`; `src/serialization/parse.ts:3`; `src/serialization/validate.ts:6-10`
- **Suggestion:** Either co-export the parse/validate/diff helpers + `ScadaValidationResult`, or narrow the `index.ts` comment to drop "校验/审计".

### [P2-2] `ScadaEditorSession` exported as public type but leaks internal `UndoStack` class (unreachable from the public entry) and contradicts its own "域内部持有 INV-4" docstring

_Justification: type-surface leak with no runtime impact; downstream consumers cannot annotate `session.undoStack` without an internal-path import, and the test-handle session projection uses a different inline shape._

- **File:** `packages/flux-renderers-industrial/src/editor/index.ts:17`; `src/editor/editor-session.ts:2,41`
- **Suggestion:** Export the projection type `ScadaEditorSessionChangePayload` as the public session type, or hide `undoStack` behind a trimmed public interface.

### [P2-3] `industrialRendererDefinitions` array not exported — diverges from the registration pattern of all sibling `flux-renderers-*` packages

_Justification: documented intentional收敛 (`design-renderer.md §322`), so not a defect — but a real cross-package pattern divergence for tooling that introspects definitions pre-registration._

- **File:** `packages/flux-renderers-industrial/src/index.ts:3,64-67` (siblings `flux-renderers-{basic,data,layout,mobile}` all export their `*RendererDefinitions` array)
- **Suggestion:** Either align by exporting the definitions arrays, or document the divergence in `design-renderer.md §11` as an accepted exception.

## Editor correctness / UX (Dim 04 / 22)

### [P2-4] `handleDelete` / `handleUngroup` loop generates N undo entries for an N-element selection

_Justification: UX papercut + mild perf hit (O(N·n) syncWorkingCopy); user deletes 5 symbols → must press Undo 5 times; `remove-symbol`/`ungroup` are not in `isCoalescable`._

- **File:** `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:113-129`; mirrored keyboard path `scada-editor-canvas.tsx:309-329`
- **Suggestion:** Add a batched `removeWorkingSymbols(ids[])` / `ungroupSymbols(ids[])` that snapshots once and pushes a single diff.

## Test fidelity (Dim 23)

### [P2-5] `collectWorldBounds` "accumulates parent offset" unit tests are false-greens (parent offset = 0)

_Justification: two unit-test files claim in their titles to verify the P1-02 fix but use parent offset (0,0), so the assertions would pass with or without the accumulation logic; the canonical integration test (`scada-editor-canvas-grouping.test.tsx:102-115`) does verify correctly._

- **Files:** `packages/flux-renderers-industrial/src/editor/editor-working-helpers.test.ts:79-85`; `packages/flux-renderers-industrial/src/editor/connection/connection-adapter.test.ts:33-42`
- **Suggestion:** Set the parent group's `x`/`y` non-zero in both fixtures and assert the child's accumulated world position; one-line fixture change each.

## i18n (checklist Dim 9)

### [P2-6] `EditorPalettePanel` skips i18n — renders raw `def.name` (mostly Chinese display names) directly, while sibling panels (inspector/toolbox) wrap every label in `t(...)`

_Justification: i18n consistency gap; in a non-Chinese deployment the palette panel shows untranslated strings._

- **File:** `packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx:18-58` (no `useFluxTranslation` import; `def.name` rendered verbatim at `:42-55`)
- **Suggestion:** `const { t } = useFluxTranslation()` and wrap `{t(def.name)}` / `title={t(def.name)}`.

### [P2-7] Toolbox button visible labels are hardcoded English; only `title` (tooltip) is i18n'd

_Justification: partial i18n gap — zh-CN users see a mixed-language toolbox (Chinese tooltips/status, English button caps "Undo"/"Copy"/"Group"); the i18n keys already exist in both locales but are not applied to the visible label._

- **File:** `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:131-188` (`btn(label, …, title)` renders `{label}` raw; word-label buttons pass hardcoded English as `label`)
- **Suggestion:** Pass `t(key)` as the `label` arg for word buttons (keep symbol buttons `+`/`−` as-is).

### [P2-8] `editor-internal-error` code dispatched in production (2 sites) but unregistered in error-code registry, i18n locales, and design doc → `scadaEditorErrorI18nKey` degrades to `.unknown`

_Justification: contract consistency gap; code is emitted and tested (5 assertions in `runtime-error-propagation.test.ts`) but registry/i18n/doc silently fall back to generic "未知错误"/"Unknown error"._

- **Files:** `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:111`, `runtime-factories.ts:175`; registry `editor/renderer/editor-errors.ts:13-25`; locales `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`; doc `docs/components/industrial-hmi-editor/design-renderer.md:318`
- **Suggestion:** Add `editor-internal-error` to `SCADA_EDITOR_ERROR_CODES`, add the i18n key in both locales, append to design §8.5.2.

## Doc-code drift (Dim 16) — introduced/missed by the HCA remediation wave

### [P2-9] `design-property-panel.md` §11 references nonexistent files `panel-field.tsx`, `panel-group.tsx`, and nonexistent hook `useEditorSession`

_Justification: doc rot (commission — references files/APIs that don't exist); design-time naming drifted from implementation._

- **File:** `docs/components/industrial-hmi-editor/design-property-panel.md:335-337` (+ stale code comment `packages/flux-renderers-industrial/src/editor/inspector/inspector-panel.tsx:19`)
- **Suggestion:** Rename doc entries to `inspector-field.tsx` (actual), drop `panel-group.tsx` (no equivalent), replace `useEditorSession` with `runtime.session`; fix the comment.

### [P2-10] `design-connection.md` §11 file tree omits `connection-drag-controller.ts` and `connection-overlay-renderer.ts`

_Justification: doc rot — incomplete listing in the domain-specific sibling doc; the canonical `design-renderer.md §11` lists all 6 connection files correctly, so this is a consistency gap._

- **File:** `docs/components/industrial-hmi-editor/design-connection.md:270-274`
- **Suggestion:** Add the 2 missing entries to match `design-renderer.md §11`.

### [P2-11] `design-engine.md` §11 file tree omits `event-bridge.ts`, `interaction-overlay.ts`, `batch-add-probe.ts`

_Justification: doc rot (omission) — 3 of 9 engine modules undocumented in §11, including 2 (`EventBridge`, `InteractionOverlay`) cross-referenced by name elsewhere in the doc set._

- **File:** `docs/components/industrial-hmi/design-engine.md:293-300`
- **Suggestion:** Append the 3 missing modules with one-line role descriptions.

---

# Per-Dimension Coverage Summary

| Dim                    | Result                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01 Dependency graph    | **Clean.** No `@nop-chaos/*/src/internal` cross-package imports; leafer 2.2.9 pinned consistently; `@leafer-in/editor` sole consumer is `editor/renderer/editor-engine.ts`; runtime index never imports `/editor`; no reverse deps. Exports-map targets resolve in `dist/`.                                                                |
| 03 API surface         | **3 P2** (P2-1 serialize/parse/validate export asymmetry; P2-2 `ScadaEditorSession` leaks `UndoStack`; P2-3 `industrialRendererDefinitions` divergence). Surface otherwise收敛; schema↔manifest↔renderer contract closed.                                                                                                                  |
| 04 State ownership     | **2 P1** (P1-1 transaction leak across load; P1-3 stale selection after undo/redo). Selection/session/engine ownership otherwise sound; `setSessionSelection` single-write-entry correctly unifies canonical + React mirror for the paths that use it.                                                                                     |
| 07 Lifecycle           | **Clean** (effects minimal, destroyed gating symmetric, no setState-during-render). The transaction-lifetime gap is reported under Dim 04 (P1-1) since it is a state-ownership boundary, not an effect-deps issue.                                                                                                                         |
| 09 Renderer contract   | **Clean** (RendererComponentProps honored; no raw-schema reads; compile-once honored).                                                                                                                                                                                                                                                     |
| 14 Test coverage       | **Clean.** All production modules have focused tests; the suite is genuinely strong on asserted paths (1340 tests).                                                                                                                                                                                                                        |
| 15 Security/perf       | **Clean.** `eval`/`new Function` covered by lint (passing); no in-place store mutation on hot paths; the prior O(n²) in `recomputeLinkages` was fixed (microtask trailing sync).                                                                                                                                                           |
| 16 Doc-code            | **3 P2** (P2-9 property-panel §11 nonexistent files/hook; P2-10 connection §11 missing 2 files; P2-11 engine §11 missing 3 files) + P2-8 (`editor-internal-error` code undocumented). The post-HCA file-split wave (runtime-factories/mutators/toolbox-runtime/connection-wiring/test-handle-factory) left sibling design §11 trees stale. |
| 17 Naming              | **Clean.** No dual-vocabulary; file naming consistent.                                                                                                                                                                                                                                                                                     |
| 18 Cross-package       | **1 P2** (P2-3 definitions-array divergence, documented). Registration pattern (`registerIndustrialRenderers`) consistent with siblings.                                                                                                                                                                                                   |
| 19 Error propagation   | **Clean** (pipeline `onError` wired; `evaluateFlux` cause preserved; `handler-error` telemetry; error codes unified). P2-8 is a doc/registry consistency nit, not a swallowing defect.                                                                                                                                                     |
| 21 Display/positioning | **2 P1** (P1-2 applyUpdate drops children → nested-child canvas stale; P1-5 viewport.fit no-refit-on-resize). Prior x/y NaN defense, clamp-before-center, fill 1e-6 floor, zoom divide-by-zero guard all verified correct.                                                                                                                 |
| 22 Integration wiring  | **3 P1** (P1-1, P1-3, P1-4) + P1-2/P1-5 overlap. The "schema→store→DOM→event" chain has residual broken wires specifically on the nested-group-child and resize paths that prior audits did not survey.                                                                                                                                    |
| 23 Test effectiveness  | **1 P2** (P2-5 collectWorldBounds false-green unit tests). No frozen-defect value assertions, no dead-code-with-tests, no sole-`not.toThrow` in the HCA-era tests (spot-checked refresh-pipeline-_, runtime-error-propagation, scada-editor-canvas-_, connection-wiring, serialization-validate — all assert result values).               |

---

# Cross-Cutting Patterns

1. **"Nested-group-child path under-tested at the data↔canvas seam"** (P1-2, P1-4, + the prior P1-01/P1-02): every prior wave fixed ONE aspect of nested-group-child handling (undo deep-clone, coordinate-space) but left the next layer broken. `diffScadaConfig` is top-level-only, `applyUpdate` discards `children`, and the three structural mutators filter top-level only. Every group-child test fixture asserts at the `workingConfig` data level, never at the `engine.getSymbol().node.get()` canvas level — so the suite is systematically blind to the data↔canvas seam for nested children. **Actionable pattern:** add at least one regression test per mutator that asserts the leafer canvas (not just `workingConfig`) reflects the edit, using a group positioned at non-zero coordinates.

2. **"Lifecycle boundary between cooperating classes not coupled"** (P1-1, P1-3): `UndoRedoAdapter` transaction state and `session.selection` are each owned by a different object than the one that resets them. `resetSession` clears the stack but not the adapter's transaction; `applyUndoRedoDiff` updates the working config but not the selection. The single-write-entry pattern (`setSessionSelection`) and the abort-path (`abortTransaction`) both exist but are not routed through the reset/apply boundaries. **Actionable pattern:** any "reset/reload/apply" boundary must reconcile ALL cooperating state holders (stack, transaction, selection, engine targets), not just the primary one.

3. **"Viewport fit is single-shot, but canvas sizing is reactive"** (P1-5): the renderer added a ResizeObserver to track the container (reactive sizing) but kept the `fit` policy computation single-shot at mount (computed against the schema world-size). The two halves of the sizing contract are out of sync. **Actionable pattern:** when adding reactive sizing, any viewport/fit policy that depends on canvas size must be re-applied on resize, not just at mount.

4. **"Remediation wave left sibling design §11 trees stale"** (P2-9, P2-10, P2-11): the HCA file-split wave (extracting `runtime-factories.ts`/`runtime-mutators.ts`/`toolbox-runtime.ts`/`connection-wiring.ts`/`test-handle-factory.ts` from `use-editor-engine.ts`) updated `design-renderer.md §11` but not the domain-specific siblings (`design-property-panel.md`, `design-connection.md`, `design-engine.md`). Same shape as the prior I18 doc-drift cluster. **Actionable pattern:** any plan that splits/renames a file must grep ALL docs that reference it, not just the owner doc.

---

# Conclusion

`flux-renderers-industrial` is mechanically healthy at the package level — typecheck/lint/test all pass (~1340 tests, matching the HCA-CV closure baseline), the oversized-files hard gate now has **zero** industrial files failing, and all previously-reported P1s were re-confirmed FIXED in live code. The mission's extensive HCA1–HCA11 + HCAX + CR + CV + BL + LL wave genuinely closed its scoped items.

This fresh audit surfaces **5 new P1s** and **11 P2s**. The P1s cluster on two under-surveyed seams:

1. **Nested-group-child data↔canvas wiring** (P1-2 applyUpdate drops `children`; P1-4 structural mutators top-level only) — every prior wave fixed one nested-child aspect but left the next; tests assert at `workingConfig`, never at the leafer canvas.
2. **Cooperating-state-holder lifecycle boundaries** (P1-1 transaction leak across load; P1-3 stale selection after undo/redo; P1-5 fit not re-applied on resize) — each owner has a single-write-entry/abort path that exists but is not routed through the reset/apply/resize boundary that needs it.

None of the P1s is a global contract break, security issue, or data-loss-at-scale — hence P1 (material, should fix) rather than P0. But each produces a concrete user-visible failure (canvas-not-updating, undo-restores-wrong-config, delete-no-ops, hover/click-off-screen) in normal editing or responsive-layout scenarios. The 7 known scada e2e failures (deferred by HCA-CV as "non-audit watch-only residual") are shown here to root-cause to a genuine renderer defect (P1-5) that breaks the documented `viewport.fit` contract in any responsive container — under the v1 baseline this is a material defect, not acceptable residual.

A remediation plan should target the 5 P1s (wire `undoRedo.abortTransaction()` into load/importConfig + regression test; recurse `children` in `applyUpdate` + canvas-level regression test; prune `session.selection` in `applyUndoRedoDiff`; extend the 3 structural mutators to nested targets; decouple world-size from DOM-size + re-apply fit on resize + e2e). The 11 P2s triage to the follow-up backlog (export-surface cleanup, doc §11 tree refresh, i18n label coverage, false-green unit-test fixture fixes).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
