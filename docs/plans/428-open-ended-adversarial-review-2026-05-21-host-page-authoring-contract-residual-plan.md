# 428 Open-Ended Adversarial Review 2026-05-21 Host Page Authoring Contract Residual Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-21-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`, `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`, `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md`, `docs/plans/426-deep-audit-2026-05-21-consolidated-code-and-contract-closure-plan.md`

## Purpose

收口 2026-05-21 open-ended adversarial review 中一组同结果面的 residual：builder-facing host/workbench page 的 formal authoring contract 已落后于 live code 和 owner docs，导致 tooling / validation / autocomplete 看到的公开契约比实际支持面更弱或更假。

这份计划只负责把这批 residual 收敛到单一、可发现、可校验的 authoring baseline，不假装处理所有 host family 历史问题。

## Current Baseline

- `round-01` 发现 `spreadsheet-page` 默认宿主仍把交互面硬编码为 `100x26`，且 `SpreadsheetConfig` 大部分公开字段未兑现；这是真正的 runtime/host contract defect，不只是 metadata 漂移。
- `round-02` 与 `round-03` 发现 `word-editor-page` 的 `eventContracts` 与 `config.propContracts` 仍停留在更弱的旧 authoring surface，而 live runtime 和 owner docs 已承诺更强的 payload/config 结构。
- `round-04` 进一步确认这不是 Word Editor 孤例：`report-designer-page.config` formal metadata 仍是 opaque object，`designer-page` formal metadata 也没表达 runtime 已强制执行的文档输入前置条件。
- 现有完成计划 `409` / `410` / `411` 已修复当时 in-scope 的 host runtime truth-surface defects，但没有 owning 这批 2026-05-21 新暴露的 authoring-contract residual；直接回写已 completed 计划不符合当前规则。
- Plan `426` 的 Workstream 3/4/5 的确触达同一批 host families，但它当前 owning 的 retained set来自 2026-05-20 deep audit 的更大 code/contract queue，closure 语义是“消化 Bucket B 的 99 条 retained findings”。把 2026-05-21 这 5 条 open-ended residual 直接塞回 `426` 会让 `426` 再次向 routing umbrella 回弹，并把一个可独立验证的结果面重新混入跨 family、多 workstream 的大型 execution queue。
- 本计划之所以保持独立，不是因为“文件路径相近就拆 plan”，而是因为这 5 条 finding 共享一个更窄、可单独 closure 的结果面：**builder-facing host page formal authoring contract 必须与 live runtime prerequisite / owner-doc baseline 一致**。它们共享同类修改点（`propContracts` / `eventContracts` / prerequisite validation / component-page host contract）、同类 focused proof（metadata discovery + runtime prerequisite + owner-doc sync），并且 closure 时可由一轮独立审阅直接判定这一结果面是否成立。

## Goals

- 修复 `spreadsheet-page`、`word-editor-page`、`report-designer-page`、`designer-page` 在 formal authoring contract 上的当前 residual drift。
- 让 renderer `propContracts` / `eventContracts` / prerequisite validation 与 live runtime、owner docs、公开 TS 类型重新一致。
- 为这批 host page residual 提供 focused proof，避免后续再次回退到“runtime 已支持、metadata 仍更弱”的状态。

## Non-Goals

- 不重做 `409` / `410` / `411` 已关闭计划的原始 runtime truth-surface修复。
- 不处理 host family 中更深层 manifest/provider/action payload 问题，除非为本计划 in-scope residual 的 focused fix 所必需。
- 不做新一轮广泛 routing；本计划直接 owning 已确认的 2026-05-21 residual finding。
- 不把本计划扩成所有 host/workbench renderer 的完整 inventory；仅收口当前已确认的四个 page-level residual cluster。

## Scope

### In Scope

- `R21-01`: `spreadsheet-page` default host truncates effective interactive dimensions to `100x26` and leaves most `SpreadsheetConfig` fields dead (`docs/analysis/2026-05-21-open-ended-adversarial-review-01/round-01.md`)
- `R21-02`: `word-editor-page` `eventContracts` still publish empty payloads for `onBack` / `onSave` (`round-02.md`)
- `R21-03`: `word-editor-page.config` formal metadata still publishes an opaque object instead of the supported `leftPanel` / `rightPanel` structure (`round-03.md`)
- `R21-04`: `report-designer-page.config` formal metadata still publishes an opaque object instead of the live config vocabulary that controls side-panel existence (`round-04.md`)
- `R21-05`: `designer-page` formal metadata does not model the runtime prerequisite that graph mode needs `document` and tree mode needs `treeDocument` (`round-04.md`)
- Affected code under `packages/spreadsheet-core/src/`, `packages/spreadsheet-renderers/src/`, `packages/word-editor-renderers/src/`, `packages/report-designer-renderers/src/`, `packages/flow-designer-renderers/src/`
- Affected owner docs: `docs/components/spreadsheet-page/design.md`, `docs/components/word-editor-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/designer-page/design.md`, plus any deeper architecture docs that truly need update after live-baseline review
- Focused tests and `docs/logs/2026/05-21.md`

### Out Of Scope

- New same-family residuals not yet confirmed in the 2026-05-21 analysis directory
- Generic nested component contract cleanup for non-page renderers
- Debugger / E2E truthfulness / naming / doc-routing work owned by other active plans

## Execution Plan

### Phase 1 - Lock The Page-Level Residual Baseline

Status: completed
Targets: analysis files, touched page-renderer definitions/docs, this plan

- Item Types: `Decision | Proof`

- [x] Re-verify the five in-scope residuals against live code, public TS types, and owner docs so the plan owns one exact residual baseline.
- [x] Confirm the overlap boundary with completed Plans `409`, `410`, and `411`, and with umbrella Plan `426`, is explicit and non-duplicative.
- [x] Freeze the in-scope residual IDs and exact owner files in this plan before implementation begins.

Exit Criteria:

- [x] All five in-scope residuals are described once and only once in this plan.
- [x] The plan text explicitly states why these residuals are new owner work rather than reopenings of `409` / `410` / `411`.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 2 - Repair Host Page Formal Contracts And Prerequisite Modeling

Status: completed
Targets: `packages/word-editor-renderers/src/`, `packages/report-designer-renderers/src/`, `packages/flow-designer-renderers/src/`, affected tests, `docs/components/{word-editor-page,report-designer-page,designer-page}/design.md`, `docs/architecture/word-editor/design.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/flow-designer/{design.md,api.md,config-schema.md}`

- Item Types: `Fix | Proof`

- [x] Update `word-editor-page` `eventContracts` so `onBack` and `onSave` no longer advertise payload-less empty objects when runtime/docs guarantee richer payloads.
- [x] Update `word-editor-page.config` `propContracts` so the formal metadata exposes the supported `leftPanel` / `rightPanel` minimum structure.
- [x] Update `report-designer-page.config` `propContracts` so the formal metadata exposes the supported config structure that controls field-panel/inspector existence, or explicitly narrow the supported runtime/docs surface if the current structure is not meant to be public.
- [x] Update `designer-page` metadata and/or validation so the formal authoring surface models the runtime prerequisite for graph/tree document inputs instead of allowing runtime-invalid page roots to look formally valid.
- [x] Add focused proof for each touched host page so metadata-driven contracts and runtime preconditions stay aligned.

Exit Criteria:

- [x] `R21-02`, `R21-03`, `R21-04`, and `R21-05` are fixed.
- [x] Focused proof covers the final event payload contract, config-shape discovery contract, and designer-page prerequisite enforcement contract.
- [x] `docs/components/word-editor-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/designer-page/design.md`, and any affected architecture-level owner docs (`docs/architecture/word-editor/design.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/flow-designer/{design.md,api.md,config-schema.md}`) are updated if the supported baseline changes; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 3 - Repair Spreadsheet Page Host-Dimension Contract Truthfulness

Status: completed
Targets: `packages/spreadsheet-core/src/`, `packages/spreadsheet-renderers/src/`, affected tests, `docs/components/spreadsheet-page/design.md`, `docs/architecture/report-designer/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] Decide the supported source of truth for spreadsheet interactive dimensions: active workbook shape, explicit host config, or a documented bounded default strategy.
- [x] Implement that supported dimension policy so the default spreadsheet page no longer silently crops the interactive surface to `100x26` when the live document implies more rows/columns.
- [x] Either implement the remaining published `SpreadsheetConfig` knobs end to end or narrow the published contract so the public surface matches the actual supported baseline.
- [x] Add focused proof covering large-sheet/default-host dimensions and the final `SpreadsheetConfig` contract semantics.

Exit Criteria:

- [x] `R21-01` is fixed.
- [x] Focused proof confirms the default spreadsheet host no longer silently truncates the interactive sheet surface under the final supported policy.
- [x] `docs/components/spreadsheet-page/design.md` and any affected report/spreadsheet family owner docs are updated if the supported baseline changes; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-21.md` is updated.

## Closure Gates

- [x] All five in-scope residuals are fixed.
- [x] Formal host page contracts are consistent with live runtime behavior and owner docs.
- [x] Necessary focused verification is complete for all touched host pages.
- [x] No in-scope residual is silently downgraded to deferred or vague follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution uncovers additional same-family host page metadata residuals not named above, prefer extending this plan only when they share the same proof bundle and owner-doc obligations; otherwise route them through a new explicit successor plan.

## Closure

Status Note: Plan-owned work is complete: all five host-page authoring-contract residuals were fixed in live code, focused proof landed, owner docs were synced, and an independent fresh-session closure audit found no remaining plan-owned gaps. Final workspace verification also completed successfully: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are now green. While closing the workspace gates, unrelated pre-existing verification blockers were also repaired in `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-code-editor/src/{code-editor-renderer.tsx,code-editor-renderer/sql-editor-toolbar.tsx}`, `packages/flux-core/src/constants.ts`, and `packages/flux-compiler/src/schema-compiler/{shape-validation-traversal.ts,shape-validation-analyze.ts,node-compiler.ts}` plus the associated focused tests.

Closure Audit Evidence:

- Reviewer / Agent: general subagent `ses_1b6ec10f3ffeG2xcHW9z7jF1G9`
- Evidence: fresh-session closure audit returned `pass`, confirmed Phases 1/2/3 completed, found no remaining plan-owned findings, and verified owner-doc + focused-proof alignment across Spreadsheet, Word Editor, Report Designer, and Flow Designer host pages.

Follow-up:

- No remaining plan-owned follow-up is required for this slice. E2E/full-green baseline recording remains outside this plan because only workspace unit/integration verification was rerun here.
