# 2026-04-17 Deep Audit Meta Review

- Review date: `2026-04-17`
- Inputs: `docs/analysis/2026-04-17-deep-audit/`, selected live code paths, and owner docs including `docs/architecture/field-frame.md` and `docs/components/word-editor-page/design.md`
- Goal: recalibrate the deep audit so follow-up work is driven by real engineering value, not architecture purity for its own sake

## Calibration Rules

- Keep findings that point to real boundary drift, duplicated ownership, contract breakage, or doc-code mismatch with ongoing maintenance cost.
- Downgrade findings that describe a valid direction but do not yet justify churn.
- Reject findings that mainly enforce uniformity where the current implementation is a reasonable special case.
- Do not recommend extraction or abstraction solely because a file is large or a package does not match a preferred pattern.

## Retained Findings

### 1. `flux-runtime` module boundary drift is a real problem

- Keep `docs/analysis/2026-04-17-deep-audit/02-module-boundaries.md` findings on `packages/flux-runtime/src/index.ts` and `packages/flux-runtime/src/source-registry.ts`.
- Why retained:
  - `packages/flux-runtime/src/index.ts` is not just a thin assembly layer; it owns runtime creation details, page/surface/form factory logic, wiring, and disposal.
  - `packages/flux-runtime/src/source-registry.ts` contains execution-oriented helpers such as result mapping and formula-controller behavior, not just registry ownership.
  - Both conflict with the stated owner boundary in `docs/architecture/flux-runtime-module-boundaries.md` and increase the cost of future runtime work.
- Action bias: worth fixing incrementally because the boundary is already documented and the drift is concrete.

### 2. `wrap: true` plus local field chrome conflicts are real

- Keep the `input-tree`, `tree-select`, and `condition-builder` findings from `docs/analysis/2026-04-17-deep-audit/12-field-slot-modeling.md`.
- Why retained:
  - `packages/flux-renderers-form-advanced/src/tree-controls.tsx` declares `wrap: true` while still rendering `data-slot="field-error"` and `data-slot="field-hint"` locally.
  - `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx` declares `wrap: true` while still rendering `FieldLabel` and `FieldHint` directly.
  - `docs/architecture/field-frame.md` is explicit that wrap-compatible renderers should let `NodeFrameWrapper -> FieldFrame` own outer field chrome.
- Action bias: fix the direct conflicts first; they are contract inconsistencies, not style preferences.

### 3. Word editor contract mismatch is real

- Keep the `word-editor-renderers` inconsistency from `docs/analysis/2026-04-17-deep-audit/18-cross-package-pattern-consistency.md`, but narrow its framing.
- Why retained:
  - `docs/components/word-editor-page/design.md` describes `word-editor-page` as a Flux renderer contract.
  - `packages/word-editor-renderers/src/index.ts` currently exports React components only and does not expose a renderer registration surface.
  - This is less about cross-package sameness and more about code not currently matching the documented package contract.
- Action bias: either implement the renderer-registration surface or revise the doc/packaging story so they agree.

### 4. Dependency findings should only survive when they are real correctness issues

- Keep the manifest mismatch in `packages/flux-code-editor/package.json` where production code uses `@nop-chaos/flux-formula` but the package metadata treats it as a dev dependency.
- Why retained:
  - The `flux-code-editor` case is a straightforward package-manifest correctness issue.
  - Public dependency edges are only interesting when they reflect bad manifests, private-path leakage, cycles, or undocumented private coupling.

## Downgraded Findings

### 1. Direct renderer dependencies on `flux-core` / `flux-runtime` / `flux-formula`

- Reject the idea that these direct dependencies are a problem by default.
- Why downgraded:
  - The current packages often depend on stable public APIs and shared types, not internal-path imports or private implementation details.
  - No cycle or `@nop-chaos/*/src/...` style leakage was reported.
  - The real question is whether these dependencies are causing churn or preventing clean API ownership, not whether the dependency graph matches an idealized ladder.
- Practical rule: do not open work items for public `renderers -> flux-core/flux-formula/flux-runtime` dependencies unless they are tied to a concrete failure mode.

### 2. Large renderer files that are merely large

- Downgrade the general pressure to split files such as `table-renderer.tsx` and `code-editor-renderer.tsx` unless there is clear evidence of repeated logic, ownership confusion, or active change pain.
- Why downgraded:
  - File size alone is not a defect.
  - The repo already tolerates some orchestrator-style large files where the responsibility is still coherent.
  - The user explicitly asked not to split or abstract just for purity.
- Exception: if a file is both large and already mixing unrelated responsibilities, it can stay on the backlog. That is why the runtime entrypoint findings remain retained while generic "large file" pressure does not.

### 3. Generalized `FieldFrame` adoption for all advanced controls

- Downgrade the broad claim that every advanced field renderer should be converted to `FieldFrame`.
- Affected examples:
  - `tag-list`
  - `array-editor`
  - `key-value`
  - `object-field`
  - `array-field`
  - `variant-field`
  - `detail-field`
  - `detail-view`
- Why downgraded:
  - `docs/architecture/field-frame.md` explains the common path, but it does not prove every composite or dual-mode control should share the same shell.
  - Several advanced controls have custom body structure, nested errors, or viewer/editor surfaces where forcing `FieldFrame` could add churn without improving behavior.
- Practical rule: prioritize only direct wrapper conflicts, not blanket migration.

### 4. Cross-package consistency findings that are really long-term alignment ideas

- Downgrade the dimension 18 recommendations about:
  - all domain cores using the same store implementation
  - all domain bridges using the same public shape
  - all user-facing text moving to defaults modules
  - all packages adopting identical event payload conventions immediately
- Why downgraded:
  - These can be good convergence directions, but they are not automatically defects.
  - Different domains can reasonably choose different internals when the external contract remains understandable and maintainable.

## Rejected Findings

### 1. Treating spreadsheet grid raw table/input markup as an automatic UI violation

- Reject the strict reading of the dimension 11 finding on `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`.
- Why rejected:
  - This component is effectively a spreadsheet surface with virtualization, merged cells, custom hit-testing, and cell editing.
  - Native table structure and a plain edit input are reasonable implementation choices here.
  - Replacing them with generic `@nop-chaos/ui` `Table` or `Input` components is not obviously better and may make the surface worse.

### 2. Treating hidden file input and color input as automatic UI violations

- Reject the dimension 11 findings on:
  - `packages/word-editor-renderers/src/toolbar/InsertControls.tsx`
  - `packages/word-editor-renderers/src/toolbar/FontControls.tsx`
- Why rejected:
  - Hidden file inputs and `type="color"` inputs are platform-native controls with special browser behavior.
  - `@nop-chaos/ui` does not automatically provide a superior abstraction for these cases.
  - The issue is not raw HTML itself; the issue would be inconsistent UX or missing wrapper support, which is not what the audit demonstrated.

### 3. Assuming cross-renderer dependencies must be eliminated on principle

- Reject the blanket recommendation that `report-designer-renderers -> spreadsheet-renderers` must be removed.
- Why rejected:
  - Live code indicates a real bridge reuse relationship, not accidental leakage.
  - `spreadsheet-renderers` is reasonably treated as a reusable shared package for spreadsheet-host behavior.
  - The dependency is therefore valid unless future code ownership or publishing constraints create a concrete reason to refactor it.

## Re-Prioritized Backlog

### High priority

- Narrow `flux-runtime` back toward documented ownership boundaries:
  - `packages/flux-runtime/src/index.ts`
  - `packages/flux-runtime/src/source-registry.ts`
- Resolve direct `wrap: true` / local field chrome conflicts:
  - `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
  - `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx`
- Reconcile the `word-editor-page` package contract with docs:
  - implement renderer registration, or
  - revise docs so the package is explicitly a React-host package instead of a Flux renderer package
- Fix package metadata correctness in `packages/flux-code-editor/package.json`.

### Medium priority

- Revisit a small number of advanced field renderers only when there is a clear UX or maintenance win from `FieldFrame` adoption.
- Turn mechanical audit checks into automation only where the rule has proven signal.

### Low priority

- Cross-package internal consistency work that has no active bug, no real change friction, and no contract drift.
- Text centralization and other style-level convergence tasks.

## Suggested Follow-Up Framing

- Use the deep audit archive as a discovery set, not as a direct remediation backlog.
- When converting findings into work items, require one of these justifications:
  - fixes a real bug or regression risk
  - removes duplicated ownership or conflicting contracts
  - resolves an actual doc-code mismatch
  - reduces repeated maintenance cost in an actively changing area
- Do not create work items whose only rationale is architectural neatness.
