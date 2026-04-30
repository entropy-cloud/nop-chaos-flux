# 2026-04-30 Architecture Doc-Code Consistency Audit

## Scope

This audit reviews `docs/architecture/` against the live repository state, with emphasis on:

- owner-doc accuracy for active architecture contracts
- separation between live baseline docs and target/future/reference docs
- exact mismatches where docs claim behavior the code does not implement, or code exposes behavior the docs do not describe

This report was synthesized from direct code/doc inspection plus independent subagent passes:

- platform-extension audit: `ses_223d55629ffe4Pw94JjtdK6xEj`
- core runtime audit: `ses_223d55619ffeb6W7A23UQ5pIVg`
- styling/supporting docs audit: `ses_223d555f5ffe9PNH1vDZXoqnch`
- doc-hygiene / precedence audit: `ses_223d55591ffet9DtqLEBC4gY7q`

## Precedence-Based Adjudication

This report uses the following decision order to determine whether a mismatch means docs should move toward code or code should move toward docs:

1. `docs/architecture/frontend-programming-model.md` owns top-level normative precedence for primitive identity, execution boundaries, and hard invariants.
2. `docs/architecture/flux-design-principles.md` owns governing direction, but does not override normative precedence.
3. `docs/architecture/flux-dsl-vm-extensibility.md` and `docs/architecture/complex-control-host-protocol.md` own platform-extension boundaries for complex hosts and final-model execution rules.
4. Family READMEs under `docs/architecture/*/README.md` decide whether a question belongs to family architecture or a component owner doc under `docs/components/`.
5. `docs/references/architecture-doc-status-matrix.md` helps with role/placement, but it is a routing/reference aid rather than a stronger contract than top-level owner docs.

Each finding is therefore judged as one of:

- `Docs lagging behind code`
- `Code lagging behind docs`
- `Mixed-owner drift`

`Mixed-owner drift` is used when same-family docs conflict, current-vs-target text is mixed, or owner boundaries are not expressed clearly enough to tell which doc should win without first repairing doc precedence.

## Overall Verdict

`docs/architecture/` is partially consistent with the live repo, but not fully converged.

The largest problems are:

1. several active docs still describe stale live behavior
2. some docs under `docs/architecture/` are actually target/reference docs but are not labeled strongly enough
3. the architecture status matrix is behind the actual routed owner-doc set
4. one styling contract family currently contains direct owner-doc conflict

The repo does not show one global architecture collapse. Most core runtime docs are still directionally correct. The inconsistency is concentrated in a smaller set of high-value documents.

## Consensus Findings

### High Severity

#### 1. `word-editor` document model doc does not match the live model

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/word-editor/design.md:67-84`

The doc says `WordDocument` contains:

- `paperSettings`
- `watermark`
- `datasets`
- `charts`
- `codes`

Live code:

- `packages/word-editor-core/src/template-model.ts:11-14`
- `packages/word-editor-core/src/document-io.ts:11-15`
- `packages/word-editor-core/src/document-io.ts:33-54`

Live `WordDocument` only contains the three-zone content plus optional `charts` and `codes`. `paperSettings` belongs to the saved envelope `SavedDocumentData`, not `WordDocument`. Datasets are maintained separately in dataset store / host projection, not in the document model. `watermark` is also absent from the live domain model.

This is primarily doc lag against the live domain model. A smaller same-family hygiene issue also exists because the component owner doc already treats `datasets` separately from `initialDocument`, but the family owner doc still presents them as part of one document-model block.

#### 2. Report Designer family docs still present stale renderer-schema shape around `spreadsheet?: SpreadsheetConfig`

Adjudication: `Docs lagging behind code`.

Documents:

- `docs/architecture/report-designer/design.md:170-186`
- `docs/architecture/report-designer/config-schema.md:26-41`

Relevant renderer owner doc:

- `docs/components/report-designer-page/design.md:5-13`
- `docs/components/report-designer-page/design.md:22-33`

Owner-boundary evidence:

- `docs/architecture/report-designer/README.md:20-25`

Live code:

- `packages/report-designer-renderers/src/types.ts:12-32`
- `packages/report-designer-renderers/src/page-renderer.tsx:81-84`

`docs/architecture/report-designer/README.md` explicitly says the family docs own platform-extension architecture, while `docs/components/report-designer-page/design.md` owns the single renderer contract. The component owner doc does not advertise `spreadsheet?: SpreadsheetConfig`, but the family docs still present it inside a schema shape that reads as current.

The live schema type does not define that field and the page renderer never reads it. Because the renderer owner doc and live code already align, this is best treated as family-doc wording drifting behind the actual contract, not as a mismatch in the component owner doc.

#### 3. Styling owner docs disagree about whether root `nop-*` markers may carry visual/layout defaults

Adjudication: `Mixed-owner drift`.

Documents:

- `docs/architecture/renderer-markers-and-selectors.md:83-89`
- `docs/architecture/renderer-markers-and-selectors.md:103-118`
- `docs/architecture/styling-system.md:422-433`
- `docs/architecture/container-spacing-design.md:7-16`

Live code:

- `packages/flux-react/src/default-spacing.css:3-13`
- `packages/flux-react/src/default-spacing.css:15-31`
- `packages/flux-react/src/default-spacing.css:33-65`
- `packages/flux-react/src/default-spacing.css:74-141`

`renderer-markers-and-selectors.md` and parts of `styling-system.md` still say root markers must not be the source of visual layout or color rules. But the shipped default spacing and field-frame CSS are keyed directly off `.nop-page`, `.nop-form`, `.nop-fieldset`, `.nop-container`, and `.nop-field`, often together with slot selectors.

`container-spacing-design.md` accurately describes the shipped default-spacing model, while the stricter marker-only docs still describe an older or narrower contract.

This is the clearest current owner-doc conflict in the tree.

### Medium Severity

#### 4. `flow-designer/api.md` current-implementation notes are stale for save/export and minimap behavior

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/flow-designer/api.md:41-58`

The doc says:

- save/export go through `env.functions.saveFlowDocument` and `env.functions.publishFlowExport`
- the current minimap is a custom shell overview, not React Flow minimap

Live code:

- `packages/flow-designer-renderers/src/designer-command-adapter.ts:136-139`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts:160-162`
- `packages/flow-designer-renderers/src/designer-page.tsx:118-122`
- `packages/flow-designer-renderers/src/designer-page.tsx:234-265`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:456-467`

Live export returns `core.exportDocument()` through the local command path and the page shows a local JSON dialog. The minimap is the React Flow `<MiniMap />` path, not a custom overview-only implementation.

#### 5. `flow-designer/runtime-snapshot.md` still describes current selection as effectively single-select

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/flow-designer/runtime-snapshot.md:87-103`

Live code:

- `packages/flow-designer-core/src/core/selection.ts:3-7`
- `packages/flow-designer-core/src/core/selection.ts:76-143`

The doc says current selection is single-select with arrays only kept for shape compatibility. Live core supports toggled multi-node/multi-edge selection, `setSelectionState(...)`, and `selectAllNodeIds(...)`.

#### 6. `flow-designer/runtime-snapshot.md` underdescribes the live branch-aware host scope and snapshot shape

Adjudication: `Docs lagging behind code`.

Documents:

- `docs/architecture/flow-designer/runtime-snapshot.md:222-229`
- `docs/architecture/flow-designer/runtime-snapshot.md:49-60`

Live code:

- `packages/flow-designer-renderers/src/designer-context.ts:98-133`

The live host scope includes `activeBranch` and `selection.activeBranchId`, with branch-aware `selection.kind`. The top-level snapshot example also omits live branch-aware shape that is already present in renderer code.

#### 7. `flow-designer/config-schema.md` misdescribes the live node-body binding shape

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/flow-designer/config-schema.md:250-270`

Live code:

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:26-34`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:119-123`

The doc describes a top-level `NodeScope` with direct `id`, `type`, `label`, `position`, `data`, and `selected` fields. The live node-body binding shape is `{ node, data }`.

#### 8. Report Designer family doc uses a React-specific expression adapter return type while live core stays framework-agnostic

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/report-designer/config-schema.md:346-352`

Live code:

- `packages/report-designer-core/src/adapters.ts:68-87`

The doc says `ExpressionEditorAdapter.render(props): React.ReactNode`. Live core defines `render(props): unknown`, which is consistent with keeping `report-designer-core` framework-agnostic.

This is family-doc contract drift in the direction of docs lagging behind code, not evidence that the canonical code/interface owner itself is React-specific.

#### 9. `$form` contract is summary-only in docs and runtime, but one live consumer still treats it like a values object

Adjudication: `Code lagging behind docs`.

Document:

- `docs/architecture/form-external-publication-and-reserved-bindings.md:83-106`

Live runtime:

- `packages/flux-runtime/src/form-runtime-status.ts:12-47`
- `packages/flux-runtime/src/form-runtime-status.ts:50-70`

Conflicting live consumer:

- `packages/flux-renderers-data/src/crud-renderer.tsx:232-239`

Docs and runtime agree that `$form` exposes readonly status summary, not form values. But `crud-renderer` still uses `${$form.values}` in query-form submit payload generation.

This is not a docs-only problem; it is a live consumer violating the documented contract.

#### 10. `architecture-doc-status-matrix.md` is behind the routed active owner-doc set

Adjudication: `Mixed-owner drift`.

Routing docs:

- `docs/index.md:125-167`
- `docs/architecture/README.md:58-87`

Matrix:

- `docs/references/architecture-doc-status-matrix.md:20-80`

Clearly missing active docs include at least:

- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/capability-contract-model.md`
- `docs/architecture/node-level-compile-time-transforms.md`
- `docs/architecture/word-editor/design.md`

There are also broader family-level gaps around active Flow/Report docs, but the concrete omissions above are enough to establish that the matrix is lagging behind the routed owner-doc set.

This is primarily a doc-precedence / routing issue rather than code drift, but it matters because users rely on the matrix to understand which docs are truly active owners.

### Low Severity / Wording Drift

#### 11. `playground-experience.md` hardcodes stale route inventory counts

Adjudication: `Docs lagging behind code`.

Document:

- `docs/architecture/playground-experience.md:84-92`
- `docs/architecture/playground-experience.md:147-152`

Live code:

- `apps/playground/src/route-model.ts:18-80`
- `apps/playground/src/route-model.ts:82-86`
- `apps/playground/src/route-matrix.test.ts:125-128`
- `apps/playground/src/route-matrix.test.ts:157-160`

The doc says:

- `ALL_SHARED_RENDERER_ROUTES` has `41` entries
- `DOMAIN_RENDERER_ROUTES` has `6` entries

Live code currently has:

- `35 + 23 + 5 = 43` shared renderer routes
- `9` domain routes

This should be rewritten as shape/ownership guidance instead of exact counts.

#### 12. `field-frame.md` and related styling docs still describe some landed behavior as future or incomplete

Adjudication: `Docs lagging behind code`.

Representative subagent evidence:

- `docs/architecture/field-frame.md:379-396`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/field-frame-layout.test.tsx`

This appears to be wording lag rather than a fundamental contract break, but it should be cleaned up while reconciling the styling family.

#### 13. Report Designer doc family still has ambiguous owner-doc precedence for live vs future contracts

Adjudication: `Mixed-owner drift`.

Documents:

- `docs/architecture/report-designer/README.md:20-25`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/config-schema.md`
- `docs/architecture/report-designer/api.md`
- `docs/architecture/report-designer/contracts.md`

Renderer owner doc:

- `docs/components/report-designer-page/design.md:5-13`

`api.md` and `contracts.md` already self-identify as future/target-shape material, but they still live beside active owner docs under the same family path. `design.md` and `config-schema.md` mix live-current wording with target-shape material nearby.

This is more a routing/labeling problem than a single false statement, but it creates recurring confusion about what the live baseline actually is, especially when family docs are read as if they were the single renderer owner contract. Item 2 above is one concrete symptom of this broader family-level precedence problem.

## Areas That Are Consistent Enough

The following docs were repeatedly identified as broadly consistent with live code and tests, even if they still need normal wording cleanup:

- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/flow-designer/collaboration.md`
- `docs/architecture/flow-designer/tree-mode.md`
- `docs/architecture/report-designer/README.md` for owner-boundary text specifically; the surrounding family labeling context still participates in the mixed-owner drift described in finding 13
- `docs/architecture/report-designer/inspector-design.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/unified-runtime-indexing-and-path-binding.md` as a focused convergence/guidance doc

## Recommended Cleanup Order

1. Fix the active owner-doc mismatches first:
   - `docs/architecture/word-editor/design.md`
   - `docs/architecture/report-designer/design.md`
   - `docs/architecture/report-designer/config-schema.md`
   - styling-family docs around marker/default-spacing rules

2. Fix stale live-behavior notes in Flow docs:
   - `docs/architecture/flow-designer/api.md`
   - `docs/architecture/flow-designer/runtime-snapshot.md`
   - `docs/architecture/flow-designer/config-schema.md`

3. Reconcile doc-family precedence and status labeling:
   - update `docs/references/architecture-doc-status-matrix.md`
   - make future/reference docs under `docs/architecture/report-designer/` louder about their role
   - review similar status labeling for `flow-designer/api.md`, `flow-designer/runtime-snapshot.md`, `container-spacing-design.md`, and other secondary docs

4. Resolve live code that violates an otherwise-correct doc contract:
   - remove or replace `${$form.values}` usage in `packages/flux-renderers-data/src/crud-renderer.tsx`

## Bottom Line

The tree does not need wholesale rewriting. The current inconsistency is concentrated in a manageable set of files:

- docs lagging behind code in several high-value active docs, especially `word-editor`, Flow current-state docs, Playground route inventory, and field-frame wording
- one clear code-lagging-behind-docs issue in `${$form.values}` consumption inside `crud-renderer`
- several mixed-owner drift problems, especially Report Designer family precedence, styling-family contract conflict, and matrix/routing lag

Those should be treated as the next convergence batch for `docs/architecture/`.
