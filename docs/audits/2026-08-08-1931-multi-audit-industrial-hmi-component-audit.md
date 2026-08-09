> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: industrial-hmi-component-audit
>
> > Planned 2026-08-09: 4 [P1] findings routed to 2 remediation plans — P1-1 (oversized test-file hard-gate regression) → `docs/plans/2026-08-08-1931-3-industrial-scada-oversized-test-split.md`; P1-2/P1-3/P1-4 (editor.target reconciliation + error-recovery seam) → `docs/plans/2026-08-08-1931-4-industrial-scada-editor-target-reconciliation-error-recovery.md` (both `Plan Status: active`, independent draft-review consensus reached). 8 [P2] findings (no P0/P1) routed to `docs/backlog/industrial-hmi-component-audit-roadmap.md` `## Follow-up Backlog` (subsection "来自 2026-08-08-1931 ...", prefix `1931-P2-*`).

# Multi-Dimensional Audit — Mission `industrial-hmi-component-audit` (`packages/flux-renderers-industrial`)

- **Audit date:** 2026-08-08 (1931 driver)
- **Auditor:** opencode (deep-audit skill per `docs/skills/deep-audit-prompts.md`)
- **Scope:** `packages/flux-renderers-industrial/src/**` — code, config, tests, public contracts (exports / `./editor` subpath), cross-referenced against `docs/components/industrial-hmi/*.md`, `docs/components/industrial-hmi-editor/*.md`, and the live post-remediation state.
- **Baseline:** v1 / no compatibility burden / no transitional main-path allowances (live code judged as final design). Per shared prefix: a live defect is a defect even when introduced/exposed by a remediation commit; "transitional / not-yet-converged" is not a valid downgrade reason.
- **Methodology:** Read calibration docs + reopened-adjudications + IND-1~IND-6 industrial checklist (`docs/audits/component-audit-checklist.md` §2.1). Ran mechanical gates fresh. Dispatched 4 parallel `general` deep-dive sub-agents (Dim 04/19/22 editor mutators; Dim 06/07/21 refit-on-resize + applyUpdate; Dim 03/16/17/18 surface/docs/i18n; Dim 14/23 test fidelity). **Every P1 candidate was independently re-verified by the orchestrator against live source** — the editor.target-dangle chain was hand-walked through `editor-engine.ts:214-224,324-339,404-435` + `runtime-factories.ts:162-177` + `runtime-mutators.ts:64-75,125-164`; the syncWorkingCopy-catch asymmetry was hand-walked against the `applyUndoRedoDiff` catch (`runtime-mutators.ts:150-163`, whose own comment proves the team already treats the no-rebuild symptom as a defect). Only independently verified findings appear below.
- **Context:** This is the **successor re-audit** to `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md` (5 P1 + 11 P2). **All 5 prior P1s were re-confirmed FIXED** in live code during this pass:
  - P1-1 (transform transaction leak across load) → `undoRedo.abortTransaction()` now called in `load` (`runtime-mutators.ts:291`) and `importConfig` (`toolbox-runtime.ts:249`), before `resetSession`. ✓
  - P1-2 (applyUpdate drops `children`) → `applyUpdate` now recurses via `registry.subtreeIds` teardown + `buildNode` rebuild (`editor-engine.ts:420-433`). ✓
  - P1-3 (stale selection after undo/redo) → `applyUndoRedoDiff` now prunes via `collectAllSymbols` + `setSessionSelection` + engine-target reconcile (`runtime-mutators.ts:136-148`). ✓
  - P1-4 (structural mutators top-level only) → `removeWorkingSymbol`/`groupSymbols`/`ungroupSymbols` now resolve nested ids via `collectAllSymbols`/`detachNodesRecursive`. ✓
  - P1-5 (viewport.fit no refit on resize) → `refitViewportOnResize` callback wired into the ResizeObserver handler + container-first sizing (`use-scada-engine.ts:224-267,278-295`). ✓
  - Prior P2-1/P2-2/P2-3 (serialization exports / session type / definitions array), P2-6/P2-7 (palette+toolbox i18n), P2-8 (`editor-internal-error` registry), P2-9/P2-10/P2-11 (design §11 file trees for property-panel/connection/engine) — **all confirmed FIXED** (verified independently; see Agent C table below). Tests grew 1340 → 1439.
  - This audit therefore focuses on **NEW residuals the prior waves missed or that the remediation work itself introduced** (plans 1809-2/3, 1910-1/2, 1931-1/2, 0121-1/2, 0648-1/2/3).

## Mechanical Gates (run fresh at audit time)

| Gate                                                           | Result                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` | **PASS**                                                                                                                                                                                                                                                                                                           |
| `pnpm --filter @nop-chaos/flux-renderers-industrial lint`      | **PASS**                                                                                                                                                                                                                                                                                                           |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test`      | **PASS** (~1439 tests / 107 files, up from 1340/100 at the 1712 audit)                                                                                                                                                                                                                                             |
| `pnpm check:oversized-code-files`                              | **FAIL (exit 1)** — workspace-wide; **2 industrial files now >700** (`serialization-validate.test.ts:786`, `scada-points-bridge.test.tsx:709`). The 1712 audit recorded **0 industrial files >700** (these two were 656/652). The remediation test additions pushed both over the hard limit. → drives **[P1-1]**. |
| `pnpm check:audit-runtime-raw-schema-reads` (in-package)       | 0 hits — compile-once honored                                                                                                                                                                                                                                                                                      |

Package-level typecheck/lint/raw-schema health is clean. The oversized hard gate **regressed** for the audited package (0 → 2 files).

## Priority Summary

| Priority                                                                                 | Count | Drives remediation plan? |
| ---------------------------------------------------------------------------------------- | ----- | ------------------------ |
| **[P0]** (blocking — contract break / wrong behavior / data loss / security)             | **0** | —                        |
| **[P1]** (material — real defect or contract drift that should be fixed)                 | **4** | **Yes**                  |
| **[P2]** (trivial / non-blocking polish — doc rot, wording, naming, weak test, cosmetic) | **8** | No (backlog)             |

**Outcome:** audit has issues → remediation plan required for the 4 P1s.

---

# [P1] Findings (must fix — independently re-verified by orchestrator)

## [P1-1] (Dim 02) Two industrial **test** files exceed the 700-line hard gate — regression from the documented "0 industrial files >700" baseline

_Justification: hard-gate contract regression (exit 1). The remediation test wave (plans 1809/1910/1931/0121) added ~130 lines to `serialization-validate.test.ts` and ~60 to `scada-points-bridge.test.tsx` without splitting, pushing both over the 700 hard limit the 1712 audit explicitly recorded as clean for industrial._

- **Files:**
  - `packages/flux-renderers-industrial/src/serialization/serialization-validate.test.ts:1-786` (was 656 at 1712 → +130)
  - `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx:1-709` (was 652 at 1712 → +57)
- **Evidence:**

  ```
  $ pnpm check:oversized-code-files; echo "exit: $?"
  [check-oversized-code-files] ERROR: 16 files exceed 700 lines (MUST split):
    - packages/flux-renderers-industrial/src/serialization/serialization-validate.test.ts: 786
    ...
    - packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx: 709
  exit: 1
  ```

  `scripts/check-oversized-code-files.mjs:11-13,89-114` applies the 700-line hard limit to ALL tracked `.ts`/`.tsx` files (no test-file exemption) and flips the exit code to 1 for any non-exempt over-limit file. Neither file carries an `OVERSIZED_EXEMPTIONS` entry.

- **Severity:** **[P1]** — hard-gate regression in the audited package. The 1712 baseline table recorded "0 in `flux-renderers-industrial`" for >700; the remediation wave regressed this to 2. `check:oversized-code-files` now exits 1 with industrial contributors. Per Dim 02, >700 is a hard gate that "MUST split".
- **Status:** Live regression introduced by the remediation test wave (plans 1809-2/3 regression tests, 1910-2 A6 rollback tests, 0121-1 e2e-healing unit tests all landed in these two files).
- **Risk:** The gate exits non-zero; if this gate is wired into CI/pre-commit it blocks the whole workspace. Even advisory, it contradicts the audited package's own documented baseline and the `AGENTS.md` "Files over 500 lines should be evaluated for extraction; split at 50 KB" convention. Both files will keep growing as the validator/bridge gain cases.
- **Suggestion:** Split each by domain: `serialization-validate.test.ts` → per-validator files mirroring `serialization/validators/{symbol-node,animation,binding,point-declaration,state-declaration,symbol-event}.ts` + a `legacy-scan.test.ts`; `scada-points-bridge.test.tsx` → `scada-points-bridge-{lifecycle,expression,error,subscription}.test.tsx`. Public behavior unchanged; the suite is already 107 files so the split is conventional.
- **False-positive exclusion:** NOT a one-off oversized source file with an orchestrator-coherence argument (the documented exemption pattern at `check-oversized-code-files.mjs:33-44`) — these are test files whose size is cumulative case growth, exactly what per-domain split addresses. NOT already-fixed — the 1712 audit recorded 0; live count is 2. Mitigating factor (transparently noted): the workspace gate was already failing from 14 non-industrial files, so the marginal workspace-CI impact is nil — but the audited-package regression is real and measurable.

## [P1-2] (Dim 04 / 22) Editing a selected grouped symbol's property rebuilds the child leafer node (P1-2 fix side effect) without refreshing `editor.target` → selection/transform box dangles on the common edit path

_Justification: incorrect behavior / editor-target contract violation introduced by the remediation. The P1-2 fix made `applyUpdate` rebuild group children (good — canvas now updates), but the rebuild changes child node identity, and neither the regular edit path (`updateWorkingNode → syncWorkingCopy`) nor the length-gated undo prune re-resolves `editor.target` afterward._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:420-435` (`applyUpdate` — `patch.children` branch tears down subtree via `registry.subtreeIds` + rebuilds via `buildNode`; child `LeafNode` objects are replaced)
  - `packages/flux-renderers-industrial/src/editor/runtime-factories.ts:162-177` (`syncWorkingCopy` calls `engine.applyDiff` but never touches `editor.target`/`setEditorTargets`)
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:64-75` (`updateWorkingNode` → `applyPatchToWorkingNode` → `syncWorkingCopy` → `notifySession`; no target refresh)
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:136-148` (applyUndoRedoDiff success-path prune is **length-gated** — `if (pruned.length !== session.selection.length)` — so it skips refresh when the selected id survives an identity-changing rebuild)
  - contrast the only sites that DO refresh targets: `runtime-mutators.ts:141,146,256,262` + `toolbox-runtime.ts:225` (setSelection/clearSelection/importConfig + undo-prune-when-length-changes)

- **Evidence:**

  ```ts
  // editor-engine.ts:420-433 — patch.children rebuilds the subtree; OLD child node destroyed, NEW created
  if (patch.children !== undefined) {
    for (const subtreeId of this.registry.subtreeIds(id)) {
      if (subtreeId === id) continue;
      const child = this.registry.get(subtreeId);
      if (child) { (node as IGroup).remove(child.node); this.registry.remove(subtreeId); }
    }
    const editable = this.mode === 'edit';
    for (const child of patch.children) { this.buildNode(child, node as IGroup, id, editable); }
  }
  // editor-engine.ts:338 — editor.target is a STRONG reference to a leafer node object
  (editor as { target: unknown }).target = nodes.length === 1 ? nodes[0] : nodes;

  // runtime-mutators.ts:64-75 — common property-edit path: NO setEditorTargets/clearEditorSelection
  const updateWorkingNode = (nodeId, patch) => {
    const prevSnapshot = cloneConfigSnapshot(session.workingConfig);
    applyPatchToWorkingNode(session, nodeId, patch);
    ...
    undoRedo.pushOperation('update-symbol', prevSnapshot, session.workingConfig);
    syncWorkingCopy();   // ← triggers applyUpdate → child identity changes; editor.target NOT refreshed
    notifySession();
  };

  // runtime-mutators.ts:138 — undo prune refreshes targets ONLY when selection length changed
  if (pruned.length !== session.selection.length) {   // ← false when selected id survived rebuild
    setSessionSelection(pruned); ... engine.setEditorTargets(resolvedNodes);
  }
  ```

  **Hand-trace:** user drill-selects group child `inner-1` → `setSelection(['inner-1'])` → `engine.setEditorTargets([inner-1.node])` → leafer Editor's `target = inner-1.node` (object A). User changes fill in inspector → `runtime.updateWorkingNode('inner-1', {fill:'#abc'})` → `applyPatchToWorkingNode` mutates `inner-1.fill` in workingConfig → `syncWorkingCopy` → `diffScadaConfig` emits `{updated:[{id:'grp', patch:{children:[…inner-1.fill=#abc…]}}]}` → `engine.applyDiff` → `applyUpdate('grp', {children:[…]})` rebuilds the group's children → `inner-1` is now a NEW leafer node (object B), object A removed from the scene → **`editor.target` still = object A** (destroyed/orphaned). The leafer-in/editor EditBox/transform handles now reference an orphaned node; the next drag of the "selected" symbol operates on a detached node (no visible move, or leafer-in/editor internal error). Undoing the edit rebuilds `inner-1` again (object C); in the success path `liveIds` still has `'inner-1'` → `pruned.length === selection.length` → refresh skipped → `editor.target` now dangles on object B while the scene holds object C.

- **Severity:** **[P1]** — editor-target contract violation on the **common** property-edit path for grouped symbols (a documented first-class feature). The P1-2 fix moved the defect from "canvas stale" to "editor.target stale": the canvas correctly reflects the edit (primary goal achieved) but the selection/transform affordance detaches and subsequent canvas interaction can target a destroyed node. This is precisely the "data↔canvas seam" gap the 1712 audit's cross-cutting pattern #1 flagged as systematically under-tested — `editor-engine.test.ts:491-494` now asserts canvas-level fill after rebuild, but **no** test asserts `editor.target` freshness after a rebuild.
- **Status:** Live defect introduced by the P1-2 remediation (plan 1809-3 Phase 1). Before the fix `applyUpdate` discarded `children` (canvas stale — the original P1-2 bug); the fix rebuilt children (canvas correct) but the node-identity change was not coupled to `editor.target` reconciliation.
- **Risk:** "Selection box / transform handles detach after editing a grouped symbol" and "dragging the selected grouped symbol does nothing / throws" — hard-to-diagnose editor papercuts on a supported path. Compounds on undo (the length-gate prevents self-healing).
- **Suggestion:** After any `engine.applyDiff` that may run `applyUpdate` with `patch.children`, re-resolve `engine.setEditorTargets(...)` from current `session.selection` unconditionally (drop the length-equality gate in `applyUndoRedoDiff`, and add a target-refresh at the end of `syncWorkingCopy` or `updateWorkingNode`). Alternatively, make `applyUpdate` identity-preserving (diff old vs new children per id; only add/remove changed ones). Add a regression test that selects a grouped child, edits a property, and asserts `engine.editor.target === engine.getSymbol('inner-1').node` (the NEW node) after the edit.
- **False-positive exclusion:** NOT the already-fixed P1-2 — that fixed the canvas-stale symptom; this is the editor-target-stale residual the fix introduced. NOT a low-code boundary — pure editor-engine internal contract between `applyUpdate` (rebuilds) and the Editor's `target` (strong node reference). NOT acceptable residual — node-identity change without external-ref refresh is a structural ownership break, provable from the code; the only uncertainty is the exact leafer-in/editor UI symptom, which does not excuse the contract violation.

## [P1-3] (Dim 19 / 22) `applyUndoRedoDiff` catch-path rollback calls `engine.build` but never clears/re-resolves `editor.target` → leafer Editor left referencing destroyed nodes after error recovery

_Justification: incomplete error recovery. The plan-1910-2 A6 rollback correctly restores working copy + engine scene + `synced.config`, but `engine.build` (full `destroyRoot` + rebuild) destroys every scene-graph node while the leafer Editor's `target` keeps holding the pre-rollback references._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:150-163` (catch block — `engine.build(beforeWorking)` with no `clearEditorSelection`/`setEditorTargets`)
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:214-224` (`build` → `destroyRoot` + `registry.clear` + rebuild; **does not** touch `app.editor.target`)
  - contrast `editor-engine.ts:312-321` (`setMode('preview')` DOES call `clearEditorSelection` when tearing down edit affordances)

- **Evidence:**

  ```ts
  // runtime-mutators.ts:150-163 — A6 rollback restores scene but not editor targets
  } catch (error) {
    session.workingConfig = beforeWorking;
    engine.build(beforeWorking);            // ← destroyRoot kills every node; editor.target still references them
    synced.config = cloneConfigSnapshot(beforeWorking);
    latest.current.onError?.('editor-internal-error', errorMessage(error));
    // ← no engine.clearEditorSelection() / setEditorTargets() reconciliation
  }

  // editor-engine.ts:214-224 — build() does not clear editor.target
  build(config): void {
    this.destroyRoot();          // destroys root Group + all descendant nodes
    this.registry.clear();
    ...
    for (const node of config.symbols) { this.buildNode(node, this.root, undefined, editable); }
    this.app.tree.add(this.root);
  }
  ```

  **Hand-trace:** user has a selection (`editor.target = [nodeA, nodeB]`) → undo/redo fires → `engine.applyDiff` throws mid-way (e.g. a symbol definition missing, a leafer internal error) → catch: `engine.build(beforeWorking)` destroys nodeA/nodeB and rebuilds fresh nodeA'/nodeB' from the pre-apply config → `editor.target` still = `[nodeA, nodeB]` (now-destroyed objects). The error is surfaced via `onError('editor-internal-error')`, but the editor canvas remains interactive; the next user click/drag goes through leafer-in/editor which still holds the dead target references → phantom selection box or internal error.

- **Severity:** **[P1]** — the rollback's stated purpose (per its own comment, "保证场景 === beforeWorking") is full consistency on the error path; it reconciles working copy + scene + `synced.config` but missed the editor-target holder. The asymmetry with the success-path prune (P1-3, which DID add target reconciliation) and with `setMode('preview')` (which clears selection on teardown) is the smoking gun. Error path is rarer than the edit path but the consequence (destroyed-node references in the live editor) is a contract break.
- **Status:** Live defect introduced by plan 1910-2 Phase 2 / A6. The A6 comment proves the team already understands leafer has no transaction and a full rebuild is the only reliable rollback — but the rebuild's effect on `editor.target` was not followed through.
- **Risk:** Post-error editor interaction operates on destroyed nodes; selection visuals detach; potential leafer-in/editor throw. Hard-to-reproduce "editor acts weird after an internal-error toast" reports.
- **Suggestion:** After `engine.build(beforeWorking)` in the catch, re-resolve `session.selection` against the rebuilt registry and call `engine.setEditorTargets(...)` (or `engine.clearEditorSelection()` if empty/all-stale) — mirror the success-path prune logic at lines 136-148. Add a regression test: select symbols → force `engine.applyDiff` to throw (inject a bad symbol type) → assert `engine.editor.target` references only live rebuilt nodes.
- **False-positive exclusion:** NOT the already-fixed P1-3 (selection prune after undo) — that's the success path. This is the catch path of the same function, added by a different plan (1910-2 vs 1809-2), which did not receive the same reconciliation. NOT a low-code boundary — internal editor error recovery.

## [P1-4] (Dim 19 / 22) `syncWorkingCopy` catch restores the working copy but does NOT rebuild the engine scene after a mid-`applyDiff` throw → permanent canvas↔data desync (same defect class plan 1910-2 already fixed in the undo path)

_Justification: asymmetric / incomplete error recovery on the common sync path. `syncWorkingCopy` is hit by every edit/transform/group/ungroup/connection-write; its catch assumes `synced.config === engine actual state`, but if `engine.applyDiff` threw mid-way the engine is half-mutated, so restoring the working copy to `synced.config` leaves the canvas permanently desynchronized from the data. The newer `applyUndoRedoDiff` catch (plan 1910-2) was added precisely to fix this symptom via `engine.build` — but `syncWorkingCopy`'s older catch was not upgraded._

- **Files:**
  - `packages/flux-renderers-industrial/src/editor/runtime-factories.ts:162-177` (`syncWorkingCopy` catch — restores `session.workingConfig` + `undoRedo.rollbackOnApplyFailure()` + `onError`, but **no `engine.build`**)
  - contrast `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:150-163` (`applyUndoRedoDiff` catch — DOES `engine.build(beforeWorking)`, with comment proving the team treats the no-rebuild symptom as a defect)

- **Evidence:**

  ```ts
  // runtime-factories.ts:162-177 — syncWorkingCopy catch: restores working copy, NOT the engine
  const syncWorkingCopy = () => {
    const diff = diffScadaConfig(synced.config, session.workingConfig);
    ...
    try {
      engine.applyDiff(diff, session.workingConfig);   // NOT atomic — remove/build/update/reorder can throw mid-way
      synced.config = cloneConfigSnapshot(session.workingConfig);
    } catch (error) {
      session.workingConfig = cloneConfigSnapshot(synced.config);   // ← restores to PRE-call state
      undoRedo.rollbackOnApplyFailure();
      latest.current.onError?.('editor-internal-error', errorMessage(error));
      // ← engine scene stays HALF-MUTATED (some ops applied, some not); synced.config still = pre-call
    }
  };

  // runtime-mutators.ts:150-163 — the newer applyUndoRedoDiff catch DOES rebuild (proves the recognized pattern)
  } catch (error) {
    // ... "catch 仅回滚 working copy 不回滚引擎 → 画布半变；... 画布与 working copy/栈永久背离。
    //      Decision（strategy a）：catch 中 engine.build(beforeWorking) 全量重建 ...
    session.workingConfig = beforeWorking;
    engine.build(beforeWorking);   // ← full rebuild; syncWorkingCopy's catch lacks this
    ...
  }
  ```

  **Hand-trace:** steady state `synced.config = workingConfig = engine scene = S0`. User action (e.g. a property edit, or a transform commit) mutates `workingConfig` to S1 → `syncWorkingCopy` → `diff(S0, S1)` non-empty → `engine.applyDiff(diff, S1)` throws after partially applying (e.g. removed a symbol then `buildNode` threw on a malformed replacement) → engine scene = S0.5 (half-mutated). Catch: `workingConfig = clone(synced.config=S0)`, `undoRedo.rollbackOnApplyFailure()` pops the undo entry. Now: `workingConfig = S0`, `synced.config = S0`, but **engine scene = S0.5**. Next `syncWorkingCopy`: `diff(synced.config=S0, workingConfig=S0)` = empty → returns early → engine NEVER rebuilt → canvas permanently shows S0.5 while data says S0. The 1910-2 comment's exact words ("画布与 working copy/栈永久背离") describe this symptom; that plan fixed it in the undo path but not the sync path.

- **Severity:** **[P1]** — permanent canvas↔data desync after a (rare) mid-`applyDiff` throw on the most common sync path. The trigger is rare (requires `buildNode`/`removeSymbol`/`applyUpdate` to throw, which needs a malformed config or leafer internal error — configs are normally validated upstream), but the consequence is severe (silent permanent divergence with no self-heal) and the fix is already proven in the sibling catch. The asymmetry is itself the defect: two error catches in the same editor domain handle the same failure class inconsistently.
- **Status:** Live defect. The `syncWorkingCopy` catch predates the `applyUndoRedoDiff` catch; plan 1910-2 established the correct pattern (`engine.build`) but did not backport it to `syncWorkingCopy`.
- **Risk:** "I dragged/edited something, got an internal-error toast, and now the canvas doesn't match what gets saved" — the saved config (`workingConfig`) and the visible canvas diverge silently; a subsequent save persists the data-side state while the user believes the canvas. No self-heal (empty diff on next sync).
- **Suggestion:** In `syncWorkingCopy`'s catch, after restoring `workingConfig`, call `engine.build(synced.config)` to fully rebuild the scene to the known-good pre-call state (mirroring the 1910-2 pattern), then reconcile `editor.target` (see P1-3). Add a regression test that forces `engine.applyDiff` to throw mid-way and asserts the post-catch engine scene `=== synced.config` (e.g. via `engine.getSymbol` reflecting the pre-call state) and that a subsequent no-op `syncWorkingCopy` does not leave a diverged canvas.
- **False-positive exclusion:** NOT the same as P1-3 (P1-3 is the dangling-target symptom in the undo-path catch; this is the no-rebuild-at-all symptom in the sync-path catch — different file, different manifestation, strictly worse). NOT a low-code boundary — internal editor sync error recovery. NOT acceptable residual — the 1910-2 comment explicitly defines this symptom class as a defect warranting `engine.build`; the sync path was simply missed.

---

# [P2] Findings (non-blocking polish — backlog)

Each is tagged with a one-line justification. These are real but do not by themselves drive a remediation plan; they triage to the follow-up backlog.

## Editor correctness / UX (Dim 04 / 22)

### [P2-1] (Dim 22) `groupSymbols` produces duplicate ids when the selection contains both an ancestor group and its descendant — shallow clone keeps the nested reference

_Justification: data-corruption edge case on an uncommon selection combo. `selectedNodes` is collected from the original tree, so `{...G1}` shallow-clone still references the original `children` containing G2; the new group's children becomes `[{...G1 (children still has G2)}, {...G2}]` — G2 appears twice._

- **File:** `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:184-205`
- **Evidence:**

  ```ts
  const selectedNodes = collectAllSymbols(session.workingConfig.symbols).filter((s) => childSet.has(s.id));
  ...
  const groupNode: ScadaSymbolNode = {
    id: groupId, type: 'scada-group', x: 0, y: 0,
    children: selectedNodes.map((c) => ({ ...c })),   // SHALLOW — ancestor's children array still refs the descendant
  };
  ```

- **Severity:** **[P2]** — duplicate ids corrupt `TreeRegistry` (last-write-wins per `addWorkingSymbol` comment at line 80) and emit duplicate entries on serialize. Trigger requires multi-selecting a group + its own descendant, which standard leafer shift-click UX discourages but is reachable via `setSelection` API / test handles / scripted flows. Existing nested tests (`runtime-mutators-nested.test.ts:168-213`) cover top-level+nephew and same-parent siblings, never ancestor+descendant.
- **Suggestion:** Before constructing `groupNode.children`, drop any selected node that is a descendant of another selected node (filter the overlap), or deep-rebuild each selected node's children excluding selected descendants. Add a regression test selecting `[G1, G2]` where G2 ⊂ G1.

### [P2-2] (Dim 21) Editor container-driven DOM-sizing effect diverges from the runtime P1-5 / plan-0121-1 fix (no refit, inverted precedence) — currently dormant

_Justification: asymmetry the prior audit explicitly flagged. Runtime got container-first sizing + `refitViewportOnResize()`; the editor's post-mount effect kept schema-first precedence (`args.width ?? container`) and omits the refit call. Currently masked (editor passes no `args.width`; the editor's ResizeObserver handler and constructor were fixed), but the asymmetry is a future landmine._

- **File:** `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts:258-266` (contrast `use-scada-engine.ts:288-295`)
- **Evidence:**

  ```ts
  // Editor — schema-first, NO refit:
  useEffect(() => {
    const targetWidth = args.width ?? containerRef.current?.clientWidth ?? 0;   // args.width FIRST
    ...
    current.engine.setSize(targetWidth, targetHeight);
    // ← NO current.refitViewportOnResize?.()
  }, [runtime, containerRef, args.width, args.height]);
  ```

- **Severity:** **[P2]** — no live wrong behavior in the default `scada-editor-canvas` wiring (it never passes `args.width`, the constructor + RO handler already self-heal), but (a) a one-frame stale-viewport window remains that runtime closed synchronously, and (b) any future caller wiring `args.width` re-introduces the exact P1-5 class of bug on the editor side.
- **Suggestion:** Mirror runtime exactly — prefer `containerRef.current?.clientWidth` over `args.width`, append `current.refitViewportOnResize?.()` after `setSize` (the refit closure is already registered via `setResizeRefit` in `scada-editor-canvas.tsx:245-251`, so it's a no-op when no policy declared).

## Public surface / docs (Dim 03 / 16)

### [P2-3] (Dim 16) `design-renderer.md` §11 serialization file tree omits `legacy-scan.ts` and the entire `validators/` subdirectory (9 source files)

_Justification: doc-rot (omission) from the validation-refactor wave (plan HCA-CG split `validate.ts` 537→72 into `validators/` per-shape + `legacy-scan.ts`). The authoritative file tree is missing 9 non-trivial source files._

- **File:** `docs/components/industrial-hmi/design-renderer.md:302-307`
- **Evidence:** live `src/serialization/` additionally contains `legacy-scan.ts` (exports `scanLegacyAtSyntax`, consumed by `validate.ts`) and `validators/` with 8 files (`animation.ts`, `binding.ts`, `helpers.ts`, `index.ts`, `point-declaration.ts`, `state-declaration.ts`, `symbol-event.ts`, `symbol-node.ts`); none appear in the §11 tree.
- **Severity:** **[P2]** — doc-rot misleads future readers about the validation layer's modular structure.
- **Suggestion:** Append `legacy-scan.ts` + `validators/` (index + per-domain) entries to §11, mirroring how `design-engine.md §11` was updated for the engine split.

### [P2-4] (Dim 03) `./editor` subpath does not export `industrialEditorRendererDefinitions` — parity gap with the main entry's documented host-customization rationale

_Justification: public-surface asymmetry. Main entry exports `industrialRendererDefinitions` for host selective/order-controlled registration (documented rationale); the editor subpath imports the editor array internally but does not re-export it, so hosts cannot apply the same customization to the editor renderer._

- **File:** `packages/flux-renderers-industrial/src/editor/index.ts:1-2,28-30`
- **Evidence:**

  ```ts
  import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
  // ... only types + registerScadaEditorRenderers exported; the array is NOT re-exported
  export function registerScadaEditorRenderers(registry) {
    return registerRendererDefinitions(registry, industrialEditorRendererDefinitions);
  }
  ```

- **Severity:** **[P2]** — public-surface asymmetry between the two entry points of the same package.
- **Suggestion:** Add `export { industrialEditorRendererDefinitions } from './renderer-definitions.js';` and update the editor `design-renderer.md` §11 public-surface description.

## i18n (Dim 09 / 23)

### [P2-5] (Dim 09) Toolbox tooltip `t(key) || 'Fallback'` is a dead/broken fallback — i18next returns the key string on miss, so `||` never triggers

_Justification: latent landmine + false safety. The file's own comment (lines 130-133) warns about exactly this and works around it with `labelOr`/`=== key` detection for visible labels, but the tooltip position on 3 buttons (lines 161-163) was not migrated to the corrected pattern._

- **File:** `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:161-163`
- **Evidence:**

  ```ts
  {
    btn(
      labelOr('industrial.scada.editor.toolbox.label.delete', 'Del'),
      handleDelete,
      !hasSelection,
      t('industrial.scada.editor.toolbox.delete') || 'Delete',
      'toolbox-btn-delete',
    );
  }
  ```

- **Severity:** **[P2]** — no active breakage (all 3 keys exist in both locales), but if a tooltip key is ever removed/renamed the tooltip renders the raw dotted key (`industrial.scada.editor.toolbox.delete`) instead of the English fallback.
- **Suggestion:** Drop the dead `|| '...'` (align with lines 167+ which use bare `t(key)`), or reuse `labelOr` for the tooltip position too.

### [P2-6] (Dim 23) `editor-errors.ts` i18n mapping (`scadaEditorErrorI18nKey` / `isRuntimeErrorCode` / `SCADA_EDITOR_ERROR_CODES`) has zero production importers — dead code with a test suite

_Justification: false coverage. The plan-1931-2 P2-8 fix registered `editor-internal-error` into `SCADA_EDITOR_ERROR_CODES_M1` to "avoid `.unknown` fallback", but since dispatch sites hardcode `t('industrial.scada.editor.error.<code>')` inline and never call `scadaEditorErrorI18nKey`, the registration is moot and the "silent gap" P2-8 claimed to close is only closed if a host independently resolves the code (which this module does not enable)._

- **File:** `packages/flux-renderers-industrial/src/editor/renderer/editor-errors.ts:1-73` (+ `editor-errors.test.ts`); `rg "from.*editor-errors"` over `src/` returns only the test file.
- **Severity:** **[P2]** — dead-code-with-tests (the test green-proves a mapping that runs but is never reached).
- **Suggestion:** Either wire `scadaEditorErrorI18nKey` into the dispatch sites (replace hardcoded `t(...)` strings), or delete `editor-errors.ts` + its test and document that i18n keys are inlined at dispatch sites.

## Test fidelity (Dim 14 / 23)

### [P2-7] (Dim 14) P1-3 undo/redo selection-pruning tests assert only `session.selection`, never engine target state

_Justification: coverage gap at the seam the fix actually touched. The 3 P1-3 tests (`editor-state-integrity.test.ts:186-232`) verify the session-layer pruning but never assert the engine-target re-sync (`engine.clearEditorSelection()` / `engine.setEditorTargets(...)`) the same fix added at `runtime-mutators.ts:140-147`._

- **File:** `packages/flux-renderers-industrial/src/editor/editor-state-integrity.test.ts:186-232`
- **Evidence:** the describe block has 0 matches for `engine.setEditorTargets`/`clearEditorSelection`/`getSymbol`; it only asserts `session.selection.not.toContain('foo')`, `workingConfig.symbols...`, `onSelectionChange` to-be-called.
- **Severity:** **[P2]** — if a refactor drops the `setEditorTargets(resolvedNodes)` branch, the leafer editor keeps stale highlight boxes on dead nodes while the session array is correct; invisible to this test. (P1-2/P1-3 in this audit are exactly this class of engine-target gap; this test would not catch them.)
- **Suggestion:** After `mutators.undo()`, spy on `engine.clearEditorSelection`/`engine.setEditorTargets` and verify they fire with the pruned id set (mirrors `runtime-mutators-nested.test.ts:141`).

### [P2-8] (Dim 23) Cosmetic no-op assertion kept only to suppress an unused-import lint

_Justification: tautological assertion implying coverage where there is none. `queryByTestId('noop')` is always `null` (no such testid exists), so `toBeNull()` always passes regardless of behavior._

- **File:** `packages/flux-renderers-industrial/src/editor/scada-editor-canvas-reactivity.test.tsx:147-148`
- **Evidence:**

  ```ts
  // Touch the root element to keep `within` import meaningful for future field-level assertions.
  expect(within(root).queryByTestId('noop')).toBeNull(); // always passes — no 'noop' testid exists
  ```

- **Severity:** **[P2]** — pollutes a reactivity test with a dead assertion.
- **Suggestion:** Remove the import + the two lines, or replace with a real DOM assertion (e.g. toolbox region's `data-selection` reflecting pruned selection).

---

# Per-Dimension Coverage Summary

| Dim                    | Result                                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 Dependency graph    | **Clean.** No `@nop-chaos/*/src/internal` cross-package imports; leafer 2.2.9 pinned consistently; `@leafer-in/editor` sole consumer is `editor/renderer/editor-engine.ts`; runtime index never imports `/editor`; no reverse deps.                                          |
| 02 Module size         | **1 P1** (P1-1 — 2 industrial test files >700 hard gate; was 0 at 1712). `scada-engine.ts` grew 513→547 (500-700 warn band, under the hard limit).                                                                                                                           |
| 03 API surface         | **1 P2** (P2-4 editor subpath definitions-array parity). Prior P2-1/P2-2/P2-3 all confirmed FIXED (serialization exports parity; `ScadaEditorSessionPublic` trims `undoStack`; `industrialRendererDefinitions` exported).                                                    |
| 04 State ownership     | **1 P1** (P1-2 editor.target not refreshed after applyUpdate rebuild on common edit path; + P1-3/P1-4 error-recovery residuals overlap here). Selection/session ownership otherwise sound.                                                                                   |
| 06 Async safety        | **Clean.** rAF throttling on resize verified (cancel-pending-then-requestAnimationFrame); ResizeObserver disposed on unmount; no stale-closure in `refitRef` pattern.                                                                                                        |
| 07 Lifecycle / React19 | **Clean.** `setResizeRefit` `useCallback` justified (flows into effect dep as stable identity, defensible under React Compiler per `react19-best-practices`); ref-based refit closure correct; no setState-during-render; ResizeObserver/abort cleanup symmetric.            |
| 09 Renderer contract   | **Clean** (RendererComponentProps honored; compile-once honored — 0 raw-schema reads; canvas a11y `role="application"` + `aria-label` present on both renderers).                                                                                                            |
| 14 Test coverage       | **1 P2** (P2-7 P1-3 tests assert only session layer, not engine targets). Suite otherwise strong (1439 tests); the prior #1 cross-cutting concern (data↔canvas seam) is RESOLVED for applyUpdate (canvas-level assertions added at `editor-engine.test.ts:491-494`).         |
| 16 Doc-code            | **1 P2** (P2-3 serialization §11 omits 9 files). Prior P2-9/P2-10/P2-11 all confirmed FIXED (property-panel/connection/engine §11 trees updated).                                                                                                                            |
| 17 Naming              | **Clean.** No new dual-vocabulary; error-code naming/hooks/file naming consistent post-remediation.                                                                                                                                                                          |
| 18 Cross-package       | **Clean.** `registerIndustrialRenderers` + exported definitions array now consistent with sibling packages (basic/form/content/layout); scheduling is the outlier, not industrial.                                                                                           |
| 19 Error propagation   | **2 P1** (P1-3 applyUndoRedoDiff catch dangling target; P1-4 syncWorkingCopy catch no engine rebuild — asymmetric with the 1910-2 pattern). Error-code registry unified; `editor-internal-error` registered (prior P2-8 FIXED, though P2-6 shows the registry is dead code). |
| 21 Display/positioning | **1 P2** (P2-2 editor container-sizing divergence, dormant). Prior P1-5 (viewport.fit no refit on resize) confirmed FIXED; refit math / NaN/Infinity/zero guards all verified still present.                                                                                 |
| 22 Integration wiring  | **3 P1** (P1-2/P1-3/P1-4) + P2-1 overlap. The "schema→store→DOM→event" chain has residual broken wires on the engine-rebuild ↔ editor-target seam that prior audits did not survey.                                                                                          |
| 23 Test effectiveness  | **2 P2** (P2-6 editor-errors dead code w/ tests; P2-8 cosmetic no-op assertion). No frozen-defect value assertions; not.toThrow is never the sole assertion in remediation tests (spot-checked).                                                                             |

---

# Cross-Cutting Patterns

1. **"Engine scene rebuilds are not coupled to `editor.target` reconciliation"** (P1-2, P1-3, + P2-7): the leafer Editor's `target` is a strong reference to leafer node objects. Any code path that rebuilds nodes (`applyUpdate` children recursion, `engine.build` rollback, `applyDiff` mid-throw) changes node identity, but only `setSelection`/`clearSelection`/`importConfig`/the length-gated undo-prune refresh `editor.target`. The common property-edit path (`updateWorkingNode → syncWorkingCopy`) and the rollback paths do not. The prior P1-2 fix (applyUpdate rebuild) and the 1910-2 A6 fix (engine.build rollback) each rebuilt the scene without following through on the editor-target holder. **Actionable pattern:** every site that calls `engine.build`, `engine.applyDiff` (which may run `applyUpdate` with `patch.children`), or otherwise destroys/recreates leafer nodes must re-resolve `editor.target` from `session.selection` against the live registry afterward — unconditionally, not length-gated.

2. **"Two error catches in the same editor domain handle the same failure class inconsistently"** (P1-3 vs P1-4): `applyUndoRedoDiff`'s catch (plan 1910-2) does full `engine.build` rollback; `syncWorkingCopy`'s catch (plan 0900-1, older, more-common path) only restores the working copy and leaves the engine half-mutated. The 1910-2 comment proves the team already recognizes the no-rebuild symptom ("画布与 working copy/栈永久背离") as a defect — but the fix was not backported. **Actionable pattern:** any "error catch that restores data-side state after an engine-mutating call" must also restore the engine scene (full rebuild, since leafer has no transaction) and reconcile all cooperating holders (working copy, `synced.config`, undo stack, engine scene, editor targets).

3. **"Remediation test wave regressed the file-size gate it had previously closed"** (P1-1): the 1712 audit explicitly recorded "0 industrial files >700"; the subsequent test additions (regression tests for the very P1s being fixed) pushed the two largest test files over the hard limit without per-domain splitting. **Actionable pattern:** plans that add regression tests to an already-large test file must split the file as part of the same change, not defer.

4. **"Dead i18n/error-code registry module + dead-tooltip-fallback survive because the suite green-proves them"** (P2-5, P2-6): the tooltip `|| 'Fallback'` and the `editor-errors.ts` mapping both have tests/assertions that pass despite the production path never exercising the fallback/mapping. **Actionable pattern:** when adding a fallback/registry, wire it into the production dispatch site in the same change, or delete it — a green test for an unwired path is negative coverage.

---

# Conclusion

`flux-renderers-industrial` typecheck/lint/test are green (1439 tests, up from 1340), compile-once is honored, and **all 5 prior P1s + all 9 audited prior P2s were re-confirmed FIXED** in live code. The HCA1–HCA11 + HCAX + CR + CV + CG + BL + LL wave plus the 1712→1931 remediation plans genuinely closed their scoped items.

This fresh successor audit surfaces **4 new [P1]s** and **8 [P2]s**. The P1s cluster on **one under-surveyed seam** that prior waves systematically missed:

- **Engine scene rebuilds ↔ `editor.target` reconciliation, and inconsistent error-recovery completeness.** The P1-2 fix (applyUpdate rebuilds group children) and the 1910-2 A6 fix (engine.build rollback) each rebuilt the scene without following through on the leafer Editor's strong `target` reference; the older `syncWorkingCopy` catch was never upgraded to the 1910-2 rebuild pattern. The result: on the common grouped-symbol edit path, after any undo/redo error, and after any mid-sync throw, the editor's selection/transform affordance references destroyed/stale nodes (P1-2/P1-3) or the canvas permanently diverges from the data (P1-4). Plus the remediation test wave itself regressed the oversized hard gate from 0→2 industrial files (P1-1).

None of the P1s is a global contract break, security issue, or data-loss-at-scale — hence [P1] (material, should fix) rather than [P0]. But each produces a concrete editor-canvas failure (selection-box detach, destroyed-node reference after error toast, canvas↔data divergence, hard-gate red) reachable in normal grouped-symbol editing or error paths.

A remediation plan should target the 4 [P1]s: (a) reconcile `editor.target` after every node-identity-changing path (drop the length-gate; add refresh to `syncWorkingCopy`/`updateWorkingNode`/rollback catches) + canvas-target-level regression tests [P1-2/P1-3]; (b) backport the `engine.build` rollback to `syncWorkingCopy`'s catch + a force-throw regression test [P1-4]; (c) split the 2 oversized test files by domain [P1-1]. The 8 [P2]s triage to the follow-up backlog (groupSymbols ancestor+descendant dedup, editor sizing parity, serialization §11 doc-tree refresh, editor definitions-array export, tooltip fallback cleanup, dead editor-errors module wiring/removal, engine-target test strengthening, cosmetic-assertion removal).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
