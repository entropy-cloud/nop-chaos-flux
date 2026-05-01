# 171 Workbench Surface And Package Boundary Successor Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full/01-dependency-graph.md`, `docs/analysis/2026-05-01-deep-audit-full/03-api-surface.md`, `docs/analysis/2026-05-01-deep-audit-full/06-async-safety.md`, `docs/analysis/2026-05-01-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-01-deep-audit-full/17-naming.md`, `docs/analysis/2026-05-01-deep-audit-full/18-cross-package.md`
> Related: `docs/plans/165-reactive-subscription-precision-plan.md`, `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`, `docs/plans/167-test-quality-and-reliability-improvement-plan.md`, `docs/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`, `docs/plans/156-reference-doc-sync-and-audit-consensus-plan.md`

## Purpose

在 `Plan 166` 已经执行且当前不能改 scope 的前提下，单独 owning 剩余的 workbench/package surface 问题：包边界泄漏、workbench asset owner 漂移、domain-specific fallback / vocabulary drift，以及未被 166 覆盖的 word-editor async/authority 问题。

## Current Baseline

- `Plan 166` 当前 owning entry-file extraction、designer async cleanup、AGENTS/styling wording drift、以及两处 UI component compliance；当前不能再修改它。
- `packages/flux-renderers-form/package.json` / `tsconfig.build.json` 当前仍有 test-only export/build leakage。
- `packages/word-editor-core/src/index.ts` 已经作为 vendor wrapper/type boundary 存在，但 renderer 侧仍直接从 vendor 包引 type，形成 authority drift。
- `packages/flux-code-editor/src/index.ts` root barrel 仍过宽。
- `packages/flux-code-editor/src/code-editor-renderer.tsx` 的视觉壳层仍依赖 `apps/playground/src/styles.css`。
- `packages/flow-designer-renderers/src/designer-theme.css` 与 `designer-node-appearance.ts` 的 token 默认值仍大量依赖字面量。
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 与 `canvas-styles.css` 之间仍存在结构类命名和 canvas CSS owner 边界漂移。
- `packages/word-editor-renderers/src/word-editor-page.tsx` / `word-editor-action-provider.ts` 的 save 路径仍存在“可重入且反馈弱”的剩余语义，不被 `Plan 166` 当前 wording 完整 owning。
- `packages/report-designer-renderers/src/report-designer-inspector.tsx` / `field-panel-renderer.tsx` 的 fallback string policy 仍与 peer domain 不一致。
- active docs / prompts 中 `name` vs `dataPath`、`CompiledSchemaNode` 等术语漂移仍未被当前执行计划 owning。

## Goals

- 收口剩余 package boundary / asset ownership / domain vocabulary 问题，使 workbench family 的 package surface 和 shipped asset ownership 更清晰。
- 消除 code-editor / Flow / spreadsheet / word-editor / report-designer 这几个 workbench family 的残余 drift。
- 让 active docs/prompts 的术语重新对齐当前 live baseline。

## Non-Goals

- 不重开 `Plan 165` 的 reactive subscription work。
- 不重开 `Plan 166` 的 entry-file split 或已在 scope 中的 async cleanup。
- 不处理 validation/action semantics（`Plan 168`）或 renderer slot convergence（`Plan 169`）。
- 不处理 test-quality/mega-test cleanup（`Plan 167`）。

## Scope

### In Scope

- `packages/flux-renderers-form/package.json`
- `packages/flux-renderers-form/tsconfig.build.json`
- `packages/word-editor-core/src/index.ts`
- `packages/word-editor-renderers/src/editor-canvas.tsx`
- `packages/word-editor-renderers/src/panels/outline-panel.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/word-editor-renderers/src/word-editor-action-provider.ts`
- `packages/flux-code-editor/src/index.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flow-designer-renderers/src/designer-theme.css`
- `packages/flow-designer-renderers/src/designer-node-appearance.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/spreadsheet-renderers/src/canvas-styles.css`
- `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx`
- `docs/skills/deep-audit-prompts.md`
- `docs/architecture/api-data-source.md`
- `docs/references/terminology.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- `packages/flux-react/src/dialog-host-surface.tsx`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/spreadsheet-core/src/core/filter-operations.ts`

## Execution Plan

### Phase 1 - Freeze Remaining Workbench / Package Boundary Baseline

Status: planned
Targets: in-scope files, scoped docs, this plan

- [ ] Re-audit each retained finding and freeze the final accepted baseline for package boundaries, asset ownership, save feedback, and terminology.
- [ ] Separate “real shipped contract drift” from “low-risk convenience surface” before code changes begin.

Exit Criteria:

- [ ] The plan records repo-observable final decisions for every in-scope drift item.
- [ ] `docs/logs/2026/05-01.md` is updated.

### Phase 2 - Package Surface And Async Authority Cleanup

Status: planned
Targets: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/tsconfig.build.json`, `packages/word-editor-core/src/index.ts`, `packages/word-editor-renderers/src/*`, `packages/flux-code-editor/src/index.ts`

- [ ] Remove test-only export/build leakage from `flux-renderers-form`.
- [ ] Restore word-editor vendor type authority to the wrapper boundary instead of direct renderer-side vendor imports.
- [ ] Narrow `flux-code-editor` root barrel to the intended package surface.
- [ ] Finish the remaining word-editor save-path behavior so concurrent save / weak feedback drift is resolved in a single supported baseline.

Exit Criteria:

- [ ] `flux-renderers-form` no longer leaks test-only surface through build/export.
- [ ] word-editor renderers no longer bypass the core wrapper as the type authority boundary.
- [ ] `flux-code-editor` root barrel no longer exports an overly broad mixed surface.
- [ ] word-editor save behavior has one explicit supported in-flight / feedback baseline with focused tests.
- [ ] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Asset Ownership, Cross-Package Styling, And Vocabulary Cleanup

Status: planned
Targets: `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flow-designer-renderers/src/designer-theme.css`, `packages/flow-designer-renderers/src/designer-node-appearance.ts`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, `packages/spreadsheet-renderers/src/canvas-styles.css`, `packages/report-designer-renderers/src/*`, `docs/skills/deep-audit-prompts.md`, `docs/architecture/api-data-source.md`, `docs/references/terminology.md`

- [ ] Move code-editor visual shell ownership out of playground-only CSS.
- [ ] Align Flow token defaults with shared token policy.
- [ ] Align spreadsheet structural class naming and canvas CSS owner boundary.
- [ ] Align report-designer fallback string policy with peer domains.
- [ ] Remove active terminology drift around `name` / `dataPath` and `CompiledSchemaNode` from docs/prompts in scope.

Exit Criteria:

- [ ] code-editor visual shell no longer depends on playground-only CSS to render its reusable chrome.
- [ ] Flow token defaults and spreadsheet canvas ownership follow one explicit supported baseline.
- [ ] report-designer fallback string policy matches peer-domain conventions.
- [ ] active docs/prompts in scope no longer teach stale terminology.
- [ ] `docs/logs/2026/05-01.md` is updated.

### Phase 4 - Verification And Closure Audit

Status: planned
Targets: in-scope packages, focused tests, scoped docs, this plan

- [ ] Run focused verification for each landed behavior/contract change.
- [ ] Run repo-wide required verification after code changes land.
- [ ] Perform an independent closure audit.

Exit Criteria:

- [ ] Focused verification recorded for every landed slice.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned work.
- [ ] `docs/logs/2026/05-01.md` records closure evidence.

## Validation Checklist

- [ ] no test-only package surface leaks from `flux-renderers-form`
- [ ] word-editor wrapper remains the type authority boundary
- [ ] code-editor / Flow / spreadsheet asset ownership drift is resolved
- [ ] report-designer fallback string policy aligns with peer domains
- [ ] active docs/prompts in scope use current terminology
- [ ] independent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<Fill when execution is complete.>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or fresh subagent>>
- Evidence: <<task id / log link / audit summary>>

Follow-up:

- Test-quality and mega-test cleanup remain with `Plan 167`.
- Renderer-contract bypass work remains with `Plan 169`.
