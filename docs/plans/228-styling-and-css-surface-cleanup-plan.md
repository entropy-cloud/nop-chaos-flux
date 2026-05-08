# 228 Styling And CSS Surface Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-08
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,10-styling.md}`
> Related: `docs/plans/{221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md,224-validation-subtree-follow-up-plan.md}`

## Purpose

收口 `full-8` 维度 10 仍保留的 package CSS scope、global leakage、fallback UI、and shell styling residuals。完成态要求：in-scope package CSS 不再依赖模糊全局污染或难以发布的隐式 surface，core fallback UI 与 devtool/workbench shell style 有清晰 owner boundary，并且不把 `container/flex` semantic props 误当成 defect。

## Current Baseline

- `docs/analysis/2026-05-07-deep-audit-full-8/10-styling.md` 保留了 spreadsheet CSS namespace/theme risks、report field panel package CSS scope、word/code/form/flow widget CSS global hardcoded values、WorkbenchShell hardcoded layout、debugger inline styles。
- 同一维度明确要求优先处理 dimensions 01/03 的 asset/copy 问题；这些 publish/build defects 由 `221` owning，本计划只拥有 live CSS scope/global/fallback UI cleanup。
- `input-number` raw button 已被维度 11 归类为 UI component rule，归 `224` owning，不在本计划内。

## Goals

- 为 retained package CSS/global leakage 建立清晰 owner boundary。
- 让 core fallback UI 与 workbench/devtool shell style 收敛到 token/class-based baseline。
- 明确 styling cleanup 的 supported baseline，不把已驳回的 `container/flex` semantic props 重新拉回。

## Non-Goals

- 不重开 `221` owned build/publish CSS asset handling。
- 不把 widget 自样式能力整体否定为违约。
- 不接管 input-number UI primitive ownership 或 accessibility fixes。

## Scope

### In Scope

- spreadsheet package CSS/theme namespace surfaces retained by dimension 10
- report field panel, word/code/form/flow package CSS globals and shell styling surfaces retained by dimension 10
- core fallback UI and debugger/workbench shell styling surfaces retained by dimension 10
- directly affected owner docs/tests for the above styling baselines

### Out Of Scope

- build/publish CSS asset copy/export strategy owned by `221`
- input-number raw button owned by `224`
- accessibility or security/performance work owned by other plans

## Execution Plan

### Workstream 1 - Reduce Package CSS Global Leakage

Status: completed
Targets: spreadsheet/report/word/code/form/flow package CSS surfaces, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Reduce retained spreadsheet CSS namespace/theme leakage to a clear package-owned styling surface.
- [x] [Fix] Reduce retained word/code/form/flow package CSS globals and hardcoded widget values where the audit confirmed them as active cleanup items.
- [x] [Fix] Keep report field panel package CSS self-styled widget behavior, but narrow any retained scope leakage to stable package-owned selectors.
- [x] [Proof] Add focused proof for the final CSS boundary where practical.

Exit Criteria:

- [x] The retained package CSS leakage defects are closed on the supported paths.
- [x] Focused proof or equivalent auditable verification exists for the repaired styling surfaces.
- [x] Affected owner docs are updated if the stable styling boundary changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Consolidate Fallback UI And Shell Styling

Status: completed
Targets: core fallback UI, debugger, and workbench shell styling surfaces, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Migrate retained core fallback UI styling toward class/token-based ownership.
- [x] [Fix] Consolidate retained debugger inline styles and WorkbenchShell hardcoded layout into clearer owned styling primitives.
- [x] [Decision] Record which shell/widget defaults remain intentionally package-owned and why they are not renderer-layout violations.

Exit Criteria:

- [x] The retained fallback UI and shell styling defects are closed on the supported paths.
- [x] The final styling ownership is explicit about what remains package-owned widget/shell design.
- [x] Affected owner docs are updated if the stable styling baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: completed
Targets: in-scope styling surfaces/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused verification for the repaired styling surfaces.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc changes land.
- [x] Perform an independent closure audit and fix any remaining in-scope styling ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for package CSS and fallback/shell styling families.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained styling/CSS surface defects from `full-8` are closed.
- [x] Focused verification exists for each landed styling family.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Validation Checklist

- [x] `221` and `224` carve-outs remain explicit.
- [x] Styling cleanup does not reclassify the rejected `container/flex` semantic prop pattern as a defect.
- [x] Package-owned widget/shell styling that remains is documented honestly.
- [x] No retained `full-8` item from dimension 10 is left without an owner decision.

## Closure

Status Note: Plan-owned fallback UI, workbench shell, debugger, spreadsheet selector scope, and narrow code-editor theme cleanup are landed and verified against the live repository baseline.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode fresh closure pass
- Evidence: live re-audit of `packages/flux-react/src/{node-error-boundary.tsx,default-spacing.css,workbench/workbench-shell.tsx}`, `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/nop-debugger/src/panel/{node-tab.tsx,styles-css.ts}`, `packages/spreadsheet-renderers/src/{spreadsheet-grid.tsx,canvas-styles.css}`, `packages/flux-code-editor/src/code-editor-styles.css`, focused tests, and workspace verification.

Follow-up:

- no remaining plan-owned work.
