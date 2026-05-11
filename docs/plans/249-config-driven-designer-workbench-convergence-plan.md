# 249 Config-Driven Designer Workbench Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/architecture/designer-workbench-shell.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/word-editor/design.md`

## Purpose

Converge Flow Designer, Report Designer, and Word Editor on one shared designer-workbench shell baseline where left and right panels are config-driven, optional, and behaviorally symmetric, while keeping each family's canonical document model and output codec ownership separate.

## Current Baseline

- `packages/flux-react/src/workbench/workbench-shell.tsx` already provides a shared left / center / right shell used by Flow Designer, Report Designer, and Word Editor.
- The live shell still treats collapsed rails as icon-target-only expand affordances instead of whole-rail expand surfaces.
- Flow Designer, Report Designer, and Word Editor still differ in how they decide whether left and right side panels exist; some sides are effectively renderer-owned fallback chrome rather than config-driven resolved surfaces.
- Owner docs previously disagreed about whether these families participate in a shared workbench-shell baseline; this doc family now freezes the shared baseline in `docs/architecture/designer-workbench-shell.md`.
- Word Editor still lacks a formal family-level config model for its side panels, so its current built-in panels need to be re-framed as default config-backed generators rather than permanent renderer-private UI.

## Goals

- Make left and right workbench panels config-driven across Flow Designer, Report Designer, and Word Editor.
- Hide unavailable sides entirely instead of leaving empty rails or mandatory fallback chrome.
- Unify collapsed-rail interaction so the whole rail expands and the affordance sits next to the center surface.
- Keep each family as a general designer/editor that becomes domain-specific only after binding config and codec/adapters.

## Non-Goals

- Do not collapse all families into one identical page-schema field set.
- Do not move domain-specific document codecs into the shared workbench shell.
- Do not redesign each family's canonical document model as part of this plan.
- Do not broaden host projection scope beyond the already-approved owner-boundary work.

## Scope

### In Scope

- Shared `WorkbenchShell` interaction and collapsed-rail behavior.
- Flow Designer palette/inspector visibility convergence.
- Report Designer field-panel/inspector visibility convergence.
- Word Editor config-driven side-panel baseline and default-generator convergence.
- Focused tests and owner-doc updates required to freeze the new baseline.

### Out Of Scope

- New domain-specific node/cell/template editing capabilities unrelated to shell convergence.
- Deep output-codec rewrites beyond the minimum needed to preserve ownership boundaries.
- Generic mobile redesign beyond the shell rules needed to keep the center surface primary.

## Execution Plan

### Phase 1 - Shared Shell Contract

Status: completed
Targets: `packages/flux-react/src/workbench/workbench-shell.tsx`, related shell tests, `docs/architecture/designer-workbench-shell.md`

- Item Types: `Fix | Decision | Proof`

- [x] Move collapsed-rail affordances to the edge nearest the center work surface for both left and right sides.
- [x] Make the whole collapsed rail expand the corresponding side, not only the icon button.
- [x] Preserve accessibility semantics for keyboard activation and labels on collapsed rails.
- [x] Add focused tests that prove unavailable sides are hidden while available collapsed sides render expandable rails.

Exit Criteria:

> Every item below must be checked before Phase 1 can be marked `completed`.

- [x] Shared shell behavior is symmetric for left and right collapsed rails.
- [x] Focused tests cover whole-rail expand behavior and unavailable-side hiding.
- [x] Related owner docs are updated if implementation details changed beyond the current baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Flow And Report Config Visibility Convergence

Status: completed
Targets: `packages/flow-designer-renderers/src/`, `packages/report-designer-renderers/src/`, family tests, relevant architecture/component docs

- Item Types: `Fix | Decision | Proof`

- [x] Resolve Flow Designer left/right workbench visibility from `DesignerConfig` and resolved inspector availability instead of unconditional fallback shell chrome.
- [x] Resolve Report Designer left/right workbench visibility from `ReportDesignerConfig`, providers, and feature gates instead of unconditional fallback shell chrome.
- [x] Keep page regions as override surfaces without letting them redefine the canonical availability rules.
- [x] Add focused tests that prove missing palette/field-panel/inspector config hides the corresponding side.

Exit Criteria:

> Every item below must be checked before Phase 2 can be marked `completed`.

- [x] Flow Designer and Report Designer both treat side-panel availability as config-driven.
- [x] Missing left/right config hides the corresponding side entirely.
- [x] Family owner docs and component docs are updated to match the live baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Word Editor Config-Driven Side Panels

Status: completed
Targets: `packages/word-editor-renderers/src/`, Word Editor family docs/tests

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] Define the minimal `WordEditorConfig` or equivalent resolved-panel contract needed to make left/right workbench panels config-driven.
- [x] Reframe current dataset/field and outline panels as default generators under that config-driven contract.
- [x] Hide left/right sides when no resolved panel definition exists.
- [x] Add focused tests that prove Word Editor no longer requires always-on renderer-private sidebars.

Exit Criteria:

> Every item below must be checked before Phase 3 can be marked `completed`.

- [x] Word Editor side-panel existence is controlled by resolved family config rather than renderer-private permanence.
- [x] Default generators still preserve the supported authoring baseline when config is present.
- [x] Word Editor family docs and component docs are updated to the implemented baseline.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Closure Proof

Status: completed
Targets: affected packages, docs, and final verification artifacts

- Item Types: `Proof | Follow-up`

- [x] Run focused package tests for the shared shell and each affected designer family.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all convergence work lands.
- [x] Re-audit the live repo against `docs/architecture/designer-workbench-shell.md` and the family docs before closure.
- [x] Record the closure evidence in `docs/logs/` and gather an independent closure audit.

Exit Criteria:

> Every item below must be checked before Phase 4 can be marked `completed`.

- [x] Focused proofs and full-workspace verification all pass.
- [x] Owner docs match the live implemented baseline.
- [x] Residual items, if any, are explicitly adjudicated instead of silently deferred.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope config-driven side-panel contract gaps are closed.
- [x] Shared collapsed-rail behavior is converged and proven.
- [x] Flow Designer, Report Designer, and Word Editor all follow the shared workbench-shell baseline.
- [x] Necessary focused verification is completed.
- [x] No in-scope live defect or contract drift is silently deferred.
- [x] Affected owner docs are synchronized to the live baseline.
- [x] Independent closure audit evidence is recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Cross-family page-schema field-name unification

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan only requires semantic convergence of config-driven side panels and shared shell behavior; field-name normalization can be evaluated later without blocking the supported baseline.
- Successor Required: `no`
- Successor Path: `N/A`
