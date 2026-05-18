# 169 Complex Renderer Contract And Field-Slot Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-01-deep-audit-full/12-field-slot.md`, `docs/analysis/2026-05-01-deep-audit-full/13-type-safety.md`, `docs/analysis/2026-05-01-adversarial-review-follow-up.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/report-designer/inspector-design.md`
> Related: `docs/plans/132-runtime-schema-dependency-elimination-plan.md`, `docs/plans/147-object-field-inline-semantics-alignment-successor-plan.md`, `docs/plans/154-complex-control-code-doc-convergence-implementation-plan.md`, `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`

## Purpose

收口 2026-05-01 审核后仍未被现有计划 owning 的 complex renderer contract / field-slot / region-modeling 漂移，避免继续同时存在：

- 一部分 renderer 已按 `props.props` / `regions` / hooks / `meta` 合同运行
- 另一部分 complex renderer 仍把 semantic inputs 标成 `ignored`，却直接回头读 raw schema 或 store
- host page renderer 和 design-tool renderer 又各自保留一套 contract 豁免

这份计划只负责 `renderer contract + field-slot convergence` 这一条 owner surface，不把 validation/action semantics、surface-root owner lifecycle、styling token policy、或 generic typing redesign 混进同一个计划。

## Current Baseline

- `docs/plans/132-runtime-schema-dependency-elimination-plan.md` 已完成 source/reaction 的 runtime schema dependency 收口，但明确把 `RendererComponentProps.schema` 的全面移除推迟到更窄的 successor plan；当前 repo 仍允许合法 static-config schema consumers 存在。
- `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md` 已修复 `designer-page` 的 `props.schema` 直读问题，但这是一个窄 slice，不覆盖剩余 complex renderer family。
- `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md` 明确把 raw schema fallback / `ignored + raw schema read` 一类 renderer-contract bypass 排除出 scope，并要求单独 successor plan owning。
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`、`detail-view/detail-field.tsx`、`detail-view/detail-view.tsx`、`variant-field/variant-field.tsx` 当前仍存在同一模式：field metadata 把 semantic action inputs 标成 `ignored`，但 renderer 运行时直接从 raw schema 消费这些输入。
- `packages/report-designer-renderers/src/renderers.tsx` 与 `report-designer-inspector.tsx` 当前把 inspector `body` 建模为 prop 而不是 region，和 DSL-first / slot-based renderer contract 不一致。
- `packages/flux-compiler/src/schema-compiler/tables.ts` 与 `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx` 当前没有为 `table.quickEdit.body` 建立 deep-region extraction，导致 quick-edit body 仍停留在浅层 prop/inline 读取路径。
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` 当前直接读 store，而不是通过标准 reactive hooks / selector contract。
- `packages/spreadsheet-renderers/src/page-renderer.tsx`、`packages/word-editor-renderers/src/word-editor-page.tsx`、`packages/report-designer-renderers/src/page-renderer.tsx`、`packages/flow-designer-renderers/src/designer-page.tsx` 当前仍存在不同程度的 root meta 透传不完整问题。
- `packages/flow-designer-renderers/src/designer-toolbar.tsx` 当前仍以本地 shadow type + 双重断言绕过 `flow-designer-core` 已存在的 toolbar contract。
- 低严重度的 `cn()` / helper style cleanup、container fallback gap、和 broader styling/token drift 仍然存在，但不是这份计划的主收口目标。

## Goals

- 区分“合法 static-config schema consumer”和“不应继续存在的 raw schema semantic bypass”，并把 in-scope complex renderer 收敛到单一可解释 baseline。
- 让 complex field/action slots 不再一边标成 `ignored`、一边在 runtime 执行 raw schema。
- 让 report inspector body、table quick-edit body 等 slot-like surface 回到一致的 region / extraction / renderer contract 路径。
- 让 code editor binding、host page root meta、flow toolbar typing 等相邻 renderer contract 漂移一起收口到当前 repo 约定。
- 为这些 contract 收敛补 focused tests，并同步 owner docs 到最终设计状态。

## Non-Goals

- 不在本计划内全量移除 `RendererComponentProps.schema`；合法 static-config consumers 仍允许存在。
- 不重做 `object-field` / `detail-view` / `variant-field` 的 owner semantics 或 value-adaptation baseline；这些已由 `Plan 147` / `Plan 157` 收口。
- 不处理 validation/action semantics、built-in form targeting、hidden-field submit policy；这些属于 `Plan 168`。
- 不处理 surface-root owner lifecycle、runtime disposal、或 `SchemaRenderer.surfaceRuntime` seam；这些属于 `Plan 163`。
- 不处理 code-editor / spreadsheet / Flow token / canvas CSS owner policy；这些属于后续 styling/package-hygiene surface。
- 不处理 `RendererComponentProps.props` 的类型系统重设计。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flux-compiler/src/schema-compiler/tables.ts`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`
- `packages/report-designer-renderers/src/renderers.tsx`
- `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-toolbar.tsx`
- focused tests for the above contract paths
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/report-designer/inspector-design.md`
- `docs/components/code-editor/design.md`
- `docs/components/designer-page/design.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/form-runtime*`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-renderers-basic/src/container.tsx`
- `packages/report-designer-renderers/src/helpers.ts`
- broader styling/token/canvas CSS cleanup
- global `props.schema` removal across all renderer families

## Execution Plan

### Phase 1 - Freeze Allowed Schema Consumers And Contract Baseline

Status: completed
Targets: this plan, scoped docs, in-scope renderers

- [x] Re-audit every in-scope raw schema or direct-store consumer and classify it as one of: accepted static config, temporary compatibility carrier, or unsupported contract bypass.
- [x] Freeze the final normalized baseline for in-scope semantic slots: if a renderer actually executes an action-like input at runtime, it must not remain modeled as `ignored` without an explicit accepted reason.
- [x] Freeze the final normalized baseline for host page root meta and complex renderer binding paths, so Phase 2-4 have repo-observable closure criteria rather than "reduce drift" wording.

Exit Criteria:

- [x] The plan records which in-scope schema consumers are legitimate and which must be removed or reclassified.
- [x] Scoped docs are updated to final-design wording where the baseline is already fixed.
- [x] `docs/logs/2026/05-01.md` is updated.

Phase 1 Audit Classification:

- `object-field.tsx` transformInAction/transformOutAction: unsupported `ignored + raw schema read` → changed to `prop`
- `detail-field.tsx` surface/transformInAction/validateValueAction/transformOutAction: unsupported → changed to `prop`
- `detail-view.tsx` surface/transformInAction/validateValueAction/transformOutAction: unsupported → changed to `prop`
- `variant-field.tsx` variants: **accepted schema-owned static config** (contains nested schema content with expressions that must not be compiled by the expression compiler)
- `variant-field.tsx` selector/selectorMode/defaultVariant/detectVariantAction/transformInAction/transformOutAction/validateValueAction: unsupported → changed to `prop`
- `variant-field.tsx` labelAlign/remark/labelRemark/hint/description/labelWidth: already `prop` by default but read from raw schema → fixed to read from `schemaProps`
- `tables.ts` quickEdit.body: missing deep-region extraction → added rule
- `table-quick-edit-cell.tsx`: temporary compatibility carrier → updated to check for region key
- `use-code-editor-binding.ts` store.getState(): unsupported direct store read → changed to reactive `useCurrentFormState`/`useScopeSelector`
- `report-designer-inspector.tsx` body: accepted prop-based modeling (body sourced from runtime scope data)
- Host page renderers (spreadsheet/word-editor/report-designer/flow-designer): incomplete root-meta passthrough → fixed
- `designer-toolbar.tsx` local ToolbarItemLike: unsupported shadow type → replaced with canonical `ToolbarItem` from `flow-designer-core`
- `flow-designer-core/types.ts`: added missing `switch` variant to `ToolbarItem` discriminated union

### Phase 2 - Remove Raw Semantic-Action And Ignored-Slot Bypass

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, related compiler/metadata/tests

- [x] Align composite-field semantic action inputs with the Phase 1 baseline: route them through normalized prop/slot metadata or explicitly reclassify them as accepted schema-owned static config, but do not leave them as `ignored + raw schema read`.
- [x] Remove the remaining raw-schema semantic bypass in `variant-field`, including action-like and nested content paths that still skip metadata / region normalization.
- [x] Add focused tests proving the chosen normalized path for each in-scope composite renderer.

Exit Criteria:

- [x] No in-scope composite renderer still relies on the unsupported `ignored + raw schema read` pattern (except `variant-field.variants` which is accepted schema-owned static config).
- [x] Any remaining schema-owned static config consumers are explicitly documented and justified.
- [x] Focused tests cover the normalized behavior for `object-field`, `detail-field`, `detail-view`, and `variant-field`.
- [x] `docs/architecture/field-binding-and-renderer-contract.md` and `docs/architecture/field-metadata-slot-modeling.md` are updated to final-design wording.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Normalize Region Modeling And Reactive Binding Paths

Status: completed
Targets: `packages/report-designer-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`, `packages/flux-compiler/src/schema-compiler/tables.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`, `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`, focused tests, scoped docs

- [x] Align report inspector `body` with the final slot baseline: either make it a true region path or explicitly narrow docs/code/tests to an accepted prop-based baseline. Do not keep prop-vs-region ambiguity.
- [x] Add the missing deep-region extraction path for `table.quickEdit.body`, or explicitly narrow the public contract and docs if full region support is still out of scope.
- [x] Move code-editor binding off direct store reads onto the standard reactive selector / hook contract used by the rest of the renderer surface.
- [x] Add focused tests that prove these bindings and region paths in live behavior.

Exit Criteria:

- [x] Report inspector `body` has one explicit supported modeling path across code/docs/tests.
- [x] `table.quickEdit.body` no longer depends on shallow/raw runtime reads that bypass deep-region extraction.
- [x] Code-editor binding follows the standard reactive renderer contract instead of direct `store.getState()` reads.
- [x] `docs/architecture/report-designer/inspector-design.md`, `docs/architecture/renderer-runtime.md`, and `docs/components/code-editor/design.md` are updated to final-design wording.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 4 - Restore Common Renderer Contract For Host Pages And Type Surfaces

Status: completed
Targets: `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-toolbar.tsx`, focused tests, scoped docs

- [x] Align in-scope host page renderers with the common root-meta contract so `meta.className`, `meta.testid`, and `meta.cid` are forwarded consistently where the renderer contract expects them.
- [x] Replace flow-designer toolbar shadow typing / double assertions with the canonical core toolbar contract.
- [x] Add focused tests proving root-meta passthrough and canonical toolbar typing behavior.

Exit Criteria:

- [x] In-scope host page renderers consistently honor the agreed root-meta contract.
- [x] Flow-designer toolbar no longer depends on local shadow types plus double assertion to cross the package boundary.
- [x] Focused tests cover the landed contract behavior.
- [x] `docs/architecture/renderer-runtime.md` and `docs/components/designer-page/design.md` are updated to final-design wording where needed.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 5 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, scoped docs, this plan

- [x] Run focused verification for each landed contract change.
- [x] Run repo-wide required verification after code changes land.
- [x] Perform a fresh independent closure audit that re-checks live code, docs, and tests for remaining renderer-contract / field-slot drift in this plan's scope.

Exit Criteria:

- [x] Each phase has focused verification tied to its contract change.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Scoped docs describe final baseline only.
- [x] Independent closure audit confirms no remaining plan-owned work in scope.
- [x] `docs/logs/2026/05-01.md` records closure-audit evidence.

## Validation Checklist

- [x] no in-scope renderer still depends on unsupported `ignored + raw schema read` (variant-field.variants is accepted schema-owned static config)
- [x] report inspector and table quick-edit body use one explicit supported modeling path
- [x] code-editor binding follows the standard reactive renderer contract
- [x] in-scope host page renderers forward root meta consistently
- [x] flow-designer toolbar uses canonical core typing
- [x] independent sub-agent or independent reviewer closure audit is completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- The biggest scope risk is accidentally turning this plan into a global `props.schema` elimination rewrite. Keep closure limited to the in-scope complex renderer families and explicitly accepted static-config consumers.
- The biggest semantic risk is relabeling a bypass as “accepted static config” without proving it is truly static and compiler-independent. Closure must check live behavior, not just field metadata labels.
- The biggest migration risk is changing report inspector or quick-edit modeling without focused tests; both paths already have downstream tests and docs that can silently encode the old surface.

## Closure

Status Note: All 5 phases completed. In-scope complex renderers now route action-like fields through `props.props` instead of raw schema reads. Host page renderers forward root meta consistently. Code editor uses reactive hooks. Quick-edit body has deep-region extraction. Flow designer toolbar uses canonical core typing. `variant-field.variants` remains as accepted schema-owned static config.

Closure Audit Evidence:

- Reviewer / Agent: independent sub-agent (session ses_21bcc64c1ffewqou5Fwg0doYPO)
- Evidence: All 12 checks PASS after fixing `data-cid` infrastructure gap in `WorkbenchShellProps`. Phase 2: no unsupported `ignored + raw schema read` in composite renderers. Phase 3: quickEdit.body extraction added, code-editor binding uses reactive hooks. Phase 4: root meta forwarded on all host page renderers, canonical toolbar typing used. `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` pass for all in-scope packages.

Follow-up:

- Validation/action semantic closure remains with `Plan 168`.
- Surface-root owner lifecycle and managed-surface boundary work remain with `Plan 163`.
- Styling/token/canvas CSS ownership cleanup should move through a separate successor plan instead of widening this one.
- Pre-existing `flux-renderers-data` build failure (unrelated `useState`/`stableDefaultQueryRef` issue) is not plan-owned.
