# 1931-4 Industrial SCADA Editor-Target Reconciliation & Error-Recovery Completeness

> Plan Status: active
> Last Reviewed: 2026-08-09
> Source: `docs/audits/2026-08-08-1931-multi-audit-industrial-hmi-component-audit.md` §[P1-2] (Dim 04/22), §[P1-3] (Dim 19/22), §[P1-4] (Dim 19/22) + Cross-Cutting Patterns #1 & #2
> Related: `docs/plans/2026-08-08-1931-3-industrial-scada-oversized-test-split.md` (prerequisite {1}; its test-file split makes room for this plan's failing-first regression tests)

## Purpose

Close the one editor seam that prior remediation waves systematically missed: **leafer Editor `target` (a strong node reference) is not reconciled after any code path that destroys/recreates leafer nodes**, and **the two editor error catches handle the same failure class inconsistently**. Concretely:

- After the common grouped-symbol property edit (`updateWorkingNode → syncWorkingCopy → applyUpdate` rebuilds a group's child subtree), `editor.target` keeps referencing the destroyed old child node — the selection/transform box dangles and the next drag targets a detached node (P1-2).
- `applyUndoRedoDiff`'s catch rebuilds the whole scene via `engine.build(beforeWorking)` (good — plan 1910-2 pattern) but never re-resolves `editor.target`, so the Editor references destroyed nodes after error recovery (P1-3).
- `syncWorkingCopy`'s catch restores the working copy + rolls back the undo entry but does NOT rebuild the engine scene, so a mid-`applyDiff` throw leaves the canvas permanently desynchronized from the data — the exact symptom plan 1910-2's comment defines as a defect, just on the older, more-common path (P1-4).

End state: every site that destroys/recreates leafer nodes re-resolves `editor.target` from `session.selection` against the live registry afterward (unconditionally, not length-gated), and both error catches fully rebuild the scene + reconcile targets.

## Current Baseline

Re-verified against live source at draft time (hand-walked, matching the audit's independent re-verification):

- **P1-2 (common edit path, no target refresh):**
  - `editor-engine.ts:420-433` — `applyUpdate` with `patch.children` tears down the subtree via `registry.subtreeIds` and rebuilds via `buildNode`; child `LeafNode` objects are replaced (identity changes).
  - `runtime-factories.ts:162-177` — `syncWorkingCopy` calls `engine.applyDiff` but never touches `editor.target`/`setEditorTargets`.
  - `runtime-mutators.ts:64-75` — `updateWorkingNode` → `applyPatchToWorkingNode` → `syncWorkingCopy` → `notifySession`; no target refresh anywhere on this path.
  - `runtime-mutators.ts:138` — the only undo-path target refresh is **length-gated**: `if (pruned.length !== session.selection.length)` — so when the selected id survives an identity-changing rebuild, refresh is skipped.
  - The sites that DO refresh targets: `runtime-mutators.ts:141,146,256,262` + `toolbox-runtime.ts:225` (`setSelection`/`clearSelection`/`importConfig` + undo-prune-only-when-length-changes).
  - Existing test `editor-engine.test.ts:491-494` asserts the **canvas-layer** fill after rebuild (`inner!.node.get('fill')).toBe('#aabbcc')`) but has **zero** assertion on `editor.target` freshness — this is exactly the coverage gap.

- **P1-3 (undo/redo catch rebuild, no target reconcile):**
  - `runtime-mutators.ts:150-163` — catch block runs `engine.build(beforeWorking)` with no `clearEditorSelection`/`setEditorTargets`.
  - `editor-engine.ts:214-224` — `build` does `destroyRoot` + `registry.clear` + rebuild; **does not** touch `app.editor.target`.
  - Contrast `editor-engine.ts:312-321` — `setMode('preview')` DOES call `clearEditorSelection` when tearing down edit affordances (the asymmetric smoking gun).

- **P1-4 (sync catch, no scene rebuild — worse than P1-3):**
  - `runtime-factories.ts:162-177` — `syncWorkingCopy` catch restores `session.workingConfig` to `synced.config` + `undoRedo.rollbackOnApplyFailure()` + `onError('editor-internal-error')`, but **no `engine.build`** → engine stays half-mutated; since `synced.config` was restored to the pre-call state, the next `syncWorkingCopy` computes an empty diff and returns early → the canvas **never** self-heals → permanent canvas↔data divergence.
  - Contrast `runtime-mutators.ts:150-163` — the newer `applyUndoRedoDiff` catch DOES `engine.build(beforeWorking)` with a comment that proves the team already treats the no-rebuild symptom as a defect ("画布与 working copy/栈永久背离"). The fix was never backported to `syncWorkingCopy`.

- Available engine API for reconciliation (all confirmed present in `editor-engine.ts`): `getSymbol(id)` (:284), `clearEditorSelection()` (:324), `setEditorTargets(nodes)` (:330), `build(config)` (:214). `setEditorTargets([])` already delegates to `clearEditorSelection()`.

- `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck`/`lint`/`test` all **PASS** (1439 tests). The defects are behavioral, not compile/runtime failures.

## Goals

- **P1-2:** After the common grouped-symbol edit path (`updateWorkingNode → syncWorkingCopy → applyUpdate` child rebuild), `editor.target` references the NEW live node, not the destroyed old one.
- **P1-2:** Drop the length-equality gate in `applyUndoRedoDiff`'s success-path prune — re-resolve targets whenever a rebuild may have changed node identity, not only when selection length changed.
- **P1-3:** After `applyUndoRedoDiff`'s catch rebuilds via `engine.build(beforeWorking)`, `editor.target` is reconciled from `session.selection` against the rebuilt registry (or cleared if stale/empty).
- **P1-4:** `syncWorkingCopy`'s catch backports the 1910-2 pattern — `engine.build(synced.config)` full rebuild so the scene is restored to the known-good pre-call state, then reconciles `editor.target`. The permanent canvas↔data divergence closes.
- Failing-first regression tests exist for all three behaviors and assert **engine-target / scene state** (not just absence of throw or session-layer arrays).

## Non-Goals

- Not making `applyUpdate` identity-preserving (the alternative "diff old vs new children per id" approach). The chosen approach is "rebuild + re-resolve target" because it is uniform across all rebuild sites and lower-risk than restructuring scene-graph add/remove semantics. Identity-preservation is out of scope.
- Not fixing **P2-1** (`groupSymbols` ancestor+descendant duplicate-id edge case) — backlog item, traceable to source audit.
- Not fixing **P2-2** (editor container-driven DOM-sizing divergence from runtime, dormant) — backlog item.
- Not fixing **P2-7** (the _existing_ `editor-state-integrity.test.ts:186-232` undo-prune tests assert only `session.selection`). This plan adds authoritative failing-first engine-target assertions as **new** tests for the new behavior; retrofitting the old test file is a separate test-fidelity polish (backlog P2-7).
- Not touching `editor-errors.ts` dead-code wiring (P2-6) or the toolbox tooltip dead fallback (P2-5) — backlog items.

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts` — `updateWorkingNode`/`syncWorkingCopy`-call sites + `applyUndoRedoDiff` (success prune length-gate + catch target reconcile).
- `packages/flux-renderers-industrial/src/editor/runtime-factories.ts` — `syncWorkingCopy` catch (backport `engine.build` + target reconcile).
- `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts` — only if a shared reconciliation helper is the cleaner landing spot (Decision, Phase 2); otherwise no production change here (the API already exists).
- New failing-first regression tests (landing in the files split by plan {1} where applicable; otherwise in the existing `editor-engine.test.ts` / a new `editor-target-reconciliation.test.ts`).

### Out Of Scope

- `groupSymbols` (P2-1), editor sizing (P2-2), serialization §11 doc tree (P2-3), editor definitions export (P2-4), tooltip fallback (P2-5), `editor-errors.ts` dead code (P2-6), cosmetic no-op assertion (P2-8) — all P2, all routed to the roadmap Follow-up Backlog.
- Runtime (`use-scada-engine.ts` / runtime renderer) target/selection logic — the defects are editor-domain only.
- The oversized-file split itself (owned by plan {1}).

## Failure Paths

> Error-recovery plan — this section is load-bearing. The "behavior" column describes post-fix expected behavior.

| Scenario id        | Trigger                                                                        | Behavior (post-fix)                                                                                                                                              | Retry | User-visible                                                                                               |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| edit-grouped-child | Select grouped child, edit a property → `applyUpdate` rebuilds child identity  | `editor.target` re-resolved to the NEW child node at end of `syncWorkingCopy`/`updateWorkingNode`; selection/transform box stays attached                        | n/a   | Selection box + transform handles stay on the edited symbol; drag continues to work                        |
| undo-prune-survive | Undo/redo where the selected id survives an identity-changing rebuild          | Target refresh runs **unconditionally** (length-gate removed); `editor.target` references the rebuilt node                                                       | n/a   | Selection visually correct after undo/redo even when selection length is unchanged                         |
| undo-catch-rebuild | `engine.applyDiff` throws mid-way during undo/redo                             | Catch runs `engine.build(beforeWorking)` then re-resolves `editor.target` from live registry (or clears); `onError('editor-internal-error')` fires               | no    | Error toast + editor stays interactive on live nodes (no phantom selection box / destroyed-node reference) |
| sync-catch-rebuild | `engine.applyDiff` throws mid-way during a normal edit/transform/group/ungroup | Catch runs `engine.build(synced.config)` (full rebuild to known-good pre-call state) + rolls back undo entry + reconciles `editor.target` + `onError(...)` fires | no    | Error toast + canvas restored to match data (saved config); no permanent canvas↔data divergence            |

## Test Strategy

本档选择：**必须自动化**

These are editor-correctness defects on a documented first-class feature (grouped-symbol editing) and on error-recovery paths that can silently diverge data from canvas. They are core regression paths. Per the guide, Proof items must precede Fix items in the Execution Plan: write failing-first tests that prove the current code is broken, then implement so they pass.

## Execution Plan

> Test Strategy = 必须自动化 ⇒ Phase 1 = Proof (failing-first), Phase 2 = Fix. Phase 3 handles owner-doc sync only if the error-recovery behavior is documented.

### Phase 1 - Proof: failing-first regression tests for all three behaviors

Status: planned
Targets: new test file(s) under `packages/flux-renderers-industrial/src/editor/` (e.g. `editor-target-reconciliation.test.ts`); engine-target assertions also extendable into the existing `editor-engine.test.ts` P1-2 describe if it stays under the 700 gate after plan {1}.

- Item Types: `Proof`

- [ ] **P1-2 edit-path test:** build a group with child `inner-1`; `setSelection(['inner-1'])` → `engine.setEditorTargets([inner-1.node])`; capture `engine.editor.target` reference; call `runtime.updateWorkingNode('inner-1', { fill: '#aabbcc' })` (which runs `syncWorkingCopy → applyUpdate` child rebuild); assert `engine.editor.target === engine.getSymbol('inner-1')!.node` (the NEW node object, not the pre-edit reference) **and** the pre-edit reference is no longer the live target. (Fails on current code — target dangles on the destroyed node.)
- [ ] **P1-2 length-gate test:** drive an undo whose selected id survives a rebuild (selection length unchanged) and assert `engine.setEditorTargets`/target re-resolution still fires (fails on current code because the length-gate skips refresh).
- [ ] **P1-3 catch test:** seed a selection (`engine.editor.target = [nodeA,...]`); force `engine.applyDiff` to throw mid-way during undo/redo (e.g. inject a symbol type that makes `buildNode` throw); assert the catch's `engine.build(beforeWorking)` rebuilds and `engine.editor.target` references only live rebuilt nodes (fails on current code — target still references destroyed pre-rollback nodes).
- [ ] **P1-4 catch test:** force `engine.applyDiff` to throw mid-way inside `syncWorkingCopy` (partial apply → half-mutated scene); assert post-catch `engine.getSymbol(...)` reflects the pre-call `synced.config` state (scene fully rebuilt, not half-mutated) **and** a subsequent no-op `syncWorkingCopy` does not leave a diverged canvas (fails on current code — scene stays half-mutated because the catch never rebuilds).
- [ ] Confirm all four fail on the unmodified codebase (red), captured as the baseline before Phase 2.

Exit Criteria:

- [ ] Four failing-first tests committed and demonstrably **red** against current code (proof the tests actually exercise the defect, not a false-green).
- [ ] Tests assert engine-target / scene state (object identity or `getSymbol(...).node` equivalence), not merely `not.toThrow` or `session.selection` arrays.

### Phase 2 - Fix: reconcile `editor.target` on every node-identity-changing path; backport scene rebuild

Status: planned
Targets: `runtime-mutators.ts`, `runtime-factories.ts`, (optionally) `editor-engine.ts`

- Item Types: `Fix | Decision`

- [ ] **P1-2a (common edit path):** Re-resolve `editor.target` after `syncWorkingCopy`/`updateWorkingNode` whenever `applyDiff` may have run an `applyUpdate` with `patch.children`. Preferred landing: add a single reconciliation step at the end of `syncWorkingCopy` (or `updateWorkingNode`) that, given current `session.selection`, resolves `engine.getSymbol(id)?.node` for each id and calls `engine.setEditorTargets(...)` (or `clearEditorSelection()` when empty/all-stale). This covers `updateWorkingNode`, `addWorkingSymbol`, `removeWorkingSymbol`, connection writes — all the `syncWorkingCopy` callers — uniformly.
- [ ] **P1-2b (drop the length-gate):** In `applyUndoRedoDiff`'s success-path prune, remove the `if (pruned.length !== session.selection.length)` gate around the target re-resolution — re-resolve targets whenever a rebuild may have occurred (the prune-to-live-ids stays; the _target refresh_ becomes unconditional). Keep `setSessionSelection` semantics intact.
- [ ] **P1-3 (undo/redo catch reconcile):** After `engine.build(beforeWorking)` in `applyUndoRedoDiff`'s catch, re-resolve `session.selection` against the rebuilt registry and call `engine.setEditorTargets(...)` (or `engine.clearEditorSelection()` if empty/all-stale) — mirror the success-path prune logic.
- [ ] **P1-4 (sync catch backport):** In `syncWorkingCopy`'s catch, after restoring `session.workingConfig = clone(synced.config)` and `undoRedo.rollbackOnApplyFailure()`, call `engine.build(synced.config)` (full rebuild to the known-good pre-call state, mirroring the 1910-2 pattern), then reconcile `editor.target` (reuse the same reconciliation step from P1-2a). Keep `synced.config` unchanged (it already equals the pre-call state).
- [ ] **Decision (helper extraction):** If the reconciliation step is needed in ≥3 sites (success path, both catches, common sync path), extract a single private helper (e.g. `reconcileEditorTargetsFromSelection(ctx)` in `runtime-factories.ts` or as an engine method) rather than duplicating the resolve-or-clear logic. Choose the landing with the smaller blast radius; record the choice in the Phase 3 owner-doc note.
- [ ] All four Phase-1 failing-first tests now pass (green).

Exit Criteria:

- [ ] All four Phase-1 failing-first tests pass; target/scene assertions hold.
- [ ] No regression in the existing editor suite (`editor-engine.test.ts`, `editor-state-integrity.test.ts`, `runtime-mutators-nested.test.ts`) — re-run focused; full suite re-run is a Closure Gate.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` green (local; unblocks owner-doc work).

### Phase 3 - Owner-doc sync (only if the error-recovery / target-reconciliation behavior is documented)

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-renderer.md`, `docs/components/industrial-hmi-editor/design-undo-redo.md` (only the sections describing editor error recovery / selection lifecycle)

- Item Types: `Fix | Follow-up` (`Fix` when the grep finds an owner-doc describing the pre-fix catch/selection behavior — owner-doc drift is non-degradable per Anti-Slacking Rule; `Follow-up` = none, if no doc describes the behavior)

- [ ] Grep the owner docs for error-recovery / `editor-internal-error` / selection-reconcile descriptions. If (and only if) a doc section describes the catch behavior or selection/target lifecycle, update it to match the post-fix behavior (both catches now rebuild scene + reconcile targets; common edit path re-resolves target). If no doc describes this behavior, write no owner-doc change (per Minimum Rule 17 — do not add boilerplate).
- [ ] If `design-undo-redo.md` documents the 1910-2 catch pattern, note the backport to `syncWorkingCopy`'s catch so the two catches are described consistently.

Exit Criteria:

- [ ] Owner docs (if any describe the touched behavior) match live code; or an explicit one-line note that no owner-doc change was required.

## Draft Review Record

> Filled by independent sub-agent (fresh session) per the Plan Review Rule.

- Reviewer / Agent: independent sub-agent fresh session `ses_01b887451ffeWgq6muZpODU9eY`
- Verdict: `pass-with-minors` (zero Blocker / zero Major; 2 Minors — both addressed: Phase 2 Item Types corrected to `Fix | Decision`; Phase 3 Item Types re-tagged to `Fix | Follow-up` since owner-doc drift, if found, is non-degradable)
- Rounds: 1
- Findings addressed: m-1 (Phase 2 Decision item not reflected in Item Types line) → Item Types now `Fix | Decision`; m-2 (Phase 3 owner-doc drift tagged as plain `Follow-up` risks looking like a non-degradable downgrade) → re-tagged `Fix | Follow-up` with rationale; the Closure Gate still independently enforces the owner-doc sync. Reference-accuracy independently re-verified against live repo (all cited file:line exact: `editor-engine.ts` applyUpdate :420-433 / build :214-224 / getSymbol :284 / clearEditorSelection :324 / setEditorTargets :330 / setMode('preview')→clearEditorSelection :316; `runtime-mutators.ts` updateWorkingNode :64-75 / length-gate :138 / catch :150-163; `runtime-factories.ts` syncWorkingCopy catch :172-176; `editor-engine.test.ts:491-494` canvas-only assertion). Bundling/split ruling + {1}→{2} ordering dependency: AGREE — real and correctly represented. Test-strategy tiers confirmed appropriate.

## Closure Gates

> Behavioral correctness plan. Load-bearing: the failing-first tests must stay green and no in-scope defect may be downgraded.

- [ ] **P1-2** — `editor.target` references the live node after a grouped-child edit (failing-first test green).
- [ ] **P1-2** — length-gate removed; target re-resolution is unconditional on rebuild paths.
- [ ] **P1-3** — `applyUndoRedoDiff` catch reconciles `editor.target` after `engine.build(beforeWorking)` (failing-first test green).
- [ ] **P1-4** — `syncWorkingCopy` catch backports `engine.build(synced.config)` full rebuild + target reconcile; no permanent canvas↔data divergence (failing-first test green).
- [ ] The two editor error catches now handle the same failure class consistently (both rebuild scene + reconcile targets).
- [ ] No in-scope live defect / contract drift / hard-gate failure downgraded to deferred or follow-up.
- [ ] Affected owner docs synced to live baseline (or explicit "no owner-doc update required" with reason).
- [ ] Independent sub-agent closure audit completed and recorded (executor session must not self-audit this item).
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

_None at draft time._ If during execution a rebuild-performance concern arises on the common edit path (full `engine.build` is O(n) and the common edit path is hot), the chosen approach ("rebuild in catches only; re-resolve target on the common path without a full rebuild") already avoids that — `engine.build` is added only to the two error catches (rare paths), not to every edit. If a hot-path rebuild proves unavoidable, record it here as `optimization candidate` with a measured rationale; do **not** silently downgrade a confirmed target-freshness defect.

## Non-Blocking Follow-ups

- P2-7 (strengthen the _existing_ `editor-state-integrity.test.ts:186-232` undo-prune tests to also assert engine-target state) — this plan's new failing-first tests cover the seam authoritatively; retrofitting the older test file is independent test-fidelity polish.
- The other editor P2s from the source audit (P2-1..P2-6, P2-8) are routed to the roadmap Follow-up Backlog, not this plan.

## Closure

Status Note: _filled at closure_

Closure Audit Evidence:

- Auditor / Agent: _filled at closure_
- Evidence: _filled at closure_

Follow-up:

- _no plan-owned remaining work expected (P2-7 and other P2s are explicitly out of scope, routed to backlog)_
