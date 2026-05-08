# 230 Renderer, Slot, And Type Contract Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-08
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,09-renderer-contract.md,11-ui-components.md,12-field-slot.md,13-type-safety.md}`
> Related: `docs/plans/{212-renderer-workbench-contract-and-accessibility-closure-plan.md,224-validation-subtree-follow-up-plan.md}`

## Purpose

收口 `full-8` 中 retained renderer contract drift、slot/deep-region modeling defects、以及低优先级 internal type-safety cleanup set。完成态要求：owned renderers 通过标准 `props.meta` / `readOnly` / `regions` channel 工作，deep-slot extraction/metadata/action-field 建模一致，`input-number` 不再使用 raw button，而低优先级 `as any` cleanup set 获得明确 owner 与 focused proof。

## Current Baseline

- 维度 09 的 retained renderer contract drift 已在 live code 收敛：`props.meta.className/testid/cid` 传递缺口、retained raw `props.schema` fallback、shared field-controller `readOnly` write blocking、and `FieldFrame` hint/aria association drift 都已修复。
- 维度 11 保留了 `input-number` stepper raw `<button>`。
- 维度 12 保留了 table expandable / tabs / tree / variant-field deep region extraction 缺口、private helper `regions`、raw `templateNode` render、schema action fields 与 metadata/event channel 不一致。
- 维度 08 中与 renderer/field contract 直接相连的 `FieldFrame` hint/aria drift 也由本计划 owning：`field-frame.tsx` 在 error presence 与 showError/hint association 上仍有 retained residual。
- 维度 13 没有 P0/P1 retained item；此前列出的 low-priority internal type cleanup set 现已获得 landed or adjudicated outcome，当前不再存在 plan-owned live blocker。
- `212` 已关闭 earlier renderer/accessibility families；本计划只拥有 `full-8` 仍保留的 contract/model/type residuals。

## Goals

- 恢复 owned renderers 的标准 contract channels。
- 修复 retained slot/deep-region extraction 与 action-field modeling drift。
- 为 low-priority internal type cleanup set 建立明确 owner，而不是继续 ownerless 漂浮。

## Non-Goals

- 不接管 validation semantic fixes；这些由 `224` owning。
- 不接管 accessibility-only fixes；这些由 `226` owning。
- 不把 low-priority type cleanup 提升成 broader generic typing rewrite。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/input.tsx` and directly affected field utilities/controllers
- `packages/flux-renderers-form-advanced/src/{array-field.tsx,object-field.tsx,tree-controls.tsx,condition-builder/*,tag-list.tsx,key-value.tsx,array-editor.tsx,variant-field/*,detail-view/detail-draft-controller.ts}`
- `packages/flux-code-editor/src/code-editor-renderer/*`
- `packages/flux-renderers-data/src/table-renderer/*`
- `packages/flux-renderers-basic/src/{tabs.tsx,schemas.ts}`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flow-designer-renderers/src/designer-page-helpers.tsx`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/flux-react/src/defaults.ts`
- `packages/flux-runtime/src/validation/validators.ts`
- `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts`
- directly affected renderer/slot/type docs including `docs/architecture/{renderer-runtime.md,field-binding-and-renderer-contract.md}`
- focused tests for renderer contract, slot modeling, and low-priority type cleanup

### Out Of Scope

- validation structural semantics owned by `224`
- accessibility-only fixes owned by `226`
- module-boundary refactors owned by `222`

## Execution Plan

### Workstream 1 - Restore Renderer Contract Integrity

Status: completed
Targets: owned renderer files, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Restore `props.meta.className/testid/cid` pass-through for the retained form and advanced controls.
- [x] [Fix] Remove retained raw `props.schema` runtime fallbacks from condition-builder, code-editor, variant, array/object, and designer helper patterns where the audit confirmed them.
- [x] [Fix] Make `readOnly` actually block writes on the owned form/advanced control paths, including field-controller propagation.
- [x] [Fix] Repair the retained `FieldFrame` hint/aria association drift so hint/description wiring follows the supported visibility/error baseline.
- [x] [Fix] Replace `input-number` raw stepper buttons with `@nop-chaos/ui` `Button` or an equivalent ui-owned primitive.
- [x] [Proof] Add focused renderer-contract tests for meta pass-through, readOnly blocking, and input-number UI ownership.

Exit Criteria:

- [x] The retained renderer meta/raw-schema/readOnly defects are closed.
- [x] The retained `FieldFrame` hint/aria association drift is closed.
- [x] `input-number` no longer uses raw stepper buttons on the supported path.
- [x] Focused tests prove the final renderer contract baseline.
- [x] `docs/architecture/{renderer-runtime.md,field-binding-and-renderer-contract.md}` are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Align Slot Modeling And Region Rendering

Status: completed
Targets: table/tabs/tree/variant/detail/domain slot surfaces, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Extend deep region extraction/validation for the retained deep-region set and close the supported-path adjudication; tabs item slot extraction/validation now lands in live code, and the retained table/detail/domain/tree/variant-field slices have explicit landed or adjudicated outcomes recorded by the closure audit.
- [x] [Fix] Remove private helper `regions` and raw `templateNode` rendering paths where retained by the audit.
- [x] [Fix] Align schema action fields with metadata/event channels on the retained detail/domain/table paths.
- [x] [Proof] Add focused proof for deep-slot extraction, `region.render()` usage, and schema action/metadata alignment.

Exit Criteria:

- [x] The retained field-slot and deep-region defects are closed on the supported paths.
- [x] Focused tests prove the landed slot/region baseline for tabs, owner-page `region.render(...)`, and the other retained region/model slices that the closure audit adjudicated as landed.
- [x] Affected owner docs are updated if the stable slot-model baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Close Low-Priority Type Cleanup Set

Status: completed
Targets: owned low-priority `any` / type-escape surfaces, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Replace the retained low-priority `as any` / `any` surfaces with precise types or `unknown` + guards where the audit confirmed existing precise types already exist.
- [x] [Proof] Add or adjust focused tests/type assertions where needed so the cleanup remains auditable.
- [x] [Decision] Record any residual low-priority type escape that truly remains non-blocking after live re-audit.

Exit Criteria:

- [x] The retained low-priority type cleanup set has an explicit landed or adjudicated outcome for each owned file.
- [x] Focused proof or equivalent type-level verification exists where needed.
- [x] Affected owner docs are updated if the stable public typing baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused renderer-contract, slot-model, and type-cleanup verification after the fixes land.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [x] Perform an independent closure audit and fix any remaining in-scope ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for all three retained families.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained renderer-contract defects are fixed.
- [x] All in-scope retained field-slot defects are fixed.
- [x] The retained low-priority type cleanup set has explicit landed or adjudicated outcomes.
- [x] Focused verification exists for each landed family.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Validation Checklist

- [x] `212` and `224` carve-outs remain explicit.
- [x] Renderer contract fixes route through standard `props.meta` / `readOnly` / `regions` channels.
- [x] Tabs and other retained deep-region owners are explicitly in scope.
- [x] No retained `full-8` item from dimensions 09/11/12/13 is left without an owner decision.

## Closure

Status Note: the plan is now fully closed in live code. Beyond the earlier readOnly/meta repairs, tabs item title/body/toolbar regions declare and receive isolated `$slot.item/$slot.index/$slot.key` bindings end to end, `FieldFrame` now honors the supported focus-time hint plus fallback description/ARIA baseline, retained deep-region/action-channel slices are closed on the supported paths, and the owned low-priority type-cleanup set now has explicit landed or adjudicated outcomes.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode fresh closure pass plus independent general-agent audit (`ses_1f9650af5ffeM5XTkaLP2GfRxj`)
- Evidence: live repo contains shared readOnly write-blocking in `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`, readOnly propagation repairs in `packages/flux-renderers-form-advanced/src/{condition-builder/condition-builder.tsx,key-value.tsx,array-editor.tsx,tree-controls.tsx,tag-list.tsx}`, tabs deep-slot extraction/runtime fixes in `packages/flux-compiler/src/schema-compiler/tables.ts` plus `packages/flux-renderers-basic/src/tabs.tsx`, normalized `name` prop declarations in `packages/flux-renderers-form-advanced/src/detail-view/{detail-field.tsx,detail-view.tsx}`, the final `FieldFrame` hint/ARIA repair in `packages/flux-react/src/field-frame.tsx` with focused proof in `packages/flux-react/src/{field-frame-layout.test.tsx,frame-slot-meta.test.tsx}`, and the `object-field` type cleanup in `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` with focused proof in `packages/flux-renderers-form-advanced/src/composite-field/object-field-transform.test.tsx`. The independent audit found no remaining plan-owned blocker.

Follow-up:

- No further plan-owned follow-up is required.
