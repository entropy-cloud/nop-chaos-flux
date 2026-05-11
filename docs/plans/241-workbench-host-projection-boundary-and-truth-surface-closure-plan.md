# 241 Workbench Host Projection Boundary And Truth-Surface Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-open-ended-adversarial-review-01/{round-09.md,round-10.md,round-11.md,round-12.md,round-13.md,round-14.md}`, `docs/architecture/{frontend-programming-model.md,capability-projection-manifest.md}`, `docs/architecture/{flow-designer/runtime-snapshot.md,report-designer/design.md,word-editor/design.md}`
> Related: `docs/plans/{208-host-projection-vocabulary-convergence-successor-plan.md,220-cross-boundary-state-and-host-contract-closure-plan.md,238-spreadsheet-canonical-state-owner-closure-plan.md}`

## Purpose

收口 2026-05-11 开放式对抗性审查中仍未修复的 workbench-host family defects，但按最新架构原则重写问题边界：本计划**不是**“把所有 snapshot/projection 改成 clone-on-read”的防御性复制工程，而是要把 Flow Designer / Spreadsheet / Report Designer 的公开 projection boundary，以及 Word Editor 的 explicit-save truth surface，重新收口到当前支持的只读模型。

完成态要求：

- 内部 framework-owned read surfaces 可以继续零拷贝复用 live owner state，只要仍处于严格只读纪律内。
- schema-visible `Host Projection` 与 external bridge/integration snapshot 必须只暴露最小、稳定、readonly-contract 所需字段，而不是把整份 internal owner graph 直接交出去。
- save/history/export/host-scope 这些 truth surfaces 不能再出现 split-brain；若文档要求 canonical persisted snapshot，它们必须在 supported path 上重新收敛到同一份真相源。
- 所有 in-scope defects 都需要 focused proof；不允许把已确认 defect 重新降级成“只是 live 引用”或“以后再考虑 clone”。

## Current Baseline

- `docs/architecture/frontend-programming-model.md` 已把当前总规则冻结为：`readonly` 默认表示单向读语义，而不是强制 detached clone；`getSnapshot()`、`Host Projection`、capability read result 可以合法返回 by-reference readonly view，只要没有真实 mutation path、没有 owner doc 明确要求 detached snapshot、也没有越过只读纪律边界交给外部不受约束消费者。
- `docs/architecture/capability-projection-manifest.md` 进一步明确：projection contract 约束的是 schema-visible readonly shape 和 capability write boundary，而不是内部 bridge snapshot 的全量形状；宿主可以零拷贝，但应发布**裁剪后的**稳定 projection，而不是把 richer internal snapshot 直接暴露出去。
- 因此，今天 rounds 11/13/14 最重要的结论不是“任何 live by-reference projection 都必须 clone”，而是：**当 schema-visible host scope 或 external bridge snapshot 把整份 owner graph/bridge-private object 暴露给外部时，它已经越过了当前前端编程模型允许的边界**。
- `round-09` 仍是确定的 canonical-baseline defect：Flow Designer 的 history/save baseline 使用对 `node.data` / `edge.data` 仅一层展开的 clone，嵌套 payload 共享引用会污染 live doc、history、和 saved baseline。这不是 readonly-projection 误报，而是 canonical persistence/history owner 自身未封闭。
- `round-10` 仍是确定的 owner-boundary defect：Report Designer `syncSpreadsheetDocument(...)` 直接接入调用方传入的 spreadsheet subtree 引用，导致 report canonical document 与外部可变对象 aliasing；这同样不是 projection copy 要求，而是 owner 接受外来值时没有完成 owner-owned baseline 封闭。
- `round-11`、`round-13`、`round-14` 需要按最新架构原则重述为 projection-boundary defect：Spreadsheet bridge、Report Designer host scope、Flow Designer region host scope 目前把过宽的 live internal object graph（如 workbook/doc/activeNode/fieldSources/inspector 等）直接发布给 schema 或 integration boundary，而不是发布最小 readonly projection DTO。
- `round-12` 是独立的 truth-surface defect：Word Editor explicit save 成功后，持久化层、dirty 状态、host projection `document` 没有同时重新收敛；文档要求 `document` 是 persisted snapshot，而 live code 只 patch `charts/codes` extras，不刷新正文/paper settings。
- `docs/plans/208-host-projection-vocabulary-convergence-successor-plan.md` 已完成 report/spreadsheet vocabulary layering 裁定；本计划不重开那轮 top-level 分类，而只 owning今天新确认的 live over-exposure / external bridge boundary / nested aliasing residual，并要求 per-host retained/removed surface matrix 明确落到当前代码与 owner docs。
- `docs/plans/220-cross-boundary-state-and-host-contract-closure-plan.md` 已经关闭 2026-05-07 的 report/word/flow cross-boundary defects；本计划不重开其已关闭 owner docs 或 generic host architecture，只 owning rounds 09-14 新确认的 projection over-exposure、external readonly boundary、nested aliasing、以及 Word Editor explicit-save truth-surface convergence。
- `docs/plans/238-spreadsheet-canonical-state-owner-closure-plan.md` 只 owning spreadsheet resize canonical owner，不 owning spreadsheet/report/flow/word 的通用 projection boundary 和 snapshot over-exposure family。

## Goals

- 冻结 workbench-host family 的最新 boundary rule：内部 runtime snapshot 可零拷贝，schema-visible / integration-visible projection 必须最小化、稳定化、并明确写路径仍走 capability/command。
- 修复 Flow Designer shallow-clone history/save baseline defect，确保 nested payload 不再污染 live doc、undo/redo baseline、或 saved baseline。
- 修复 Report Designer canonical spreadsheet owner aliasing，确保 report document 接收 spreadsheet subtree 时完成 owner-owned baseline 封闭。
- 修复 Spreadsheet / Report Designer / Flow Designer 的 schema-visible host scope 或 external bridge snapshot over-exposure，按每个 host 的 retained/removed surface 决策矩阵收口到更窄 projection DTO。
- 修复 Word Editor explicit save truth-surface split-brain，确保 persisted content、dirty publication、host projection `document` 在成功保存后重新对齐。
- 为上述每一类 defect 提供 focused tests，并把 owner docs 更新到与 `frontend-programming-model.md` 一致的最终基线。

## Non-Goals

- 不把本计划扩展成“全仓 public getter 一律 defensive clone”的统一复制工程。
- 不重做 Flow / Spreadsheet / Report / Word 的全部 host UX 或 schema vocabulary，只处理已确认 defect 所需的 projection narrowing、owner sealing、和 truth-surface convergence。
- 不把所有 internal React 子组件消费的 framework-owned snapshot 一并迁移到 detached copies；若它们仍处于框架严格只读纪律内，本计划默认保持零拷贝。
- 不吸收与本 defect family 无关的 styling、a11y、performance、或 generic package split 工作。

## Scope

### In Scope

- `packages/flow-designer-core/src/{core.ts,core/clone.ts,core/history.ts,core/snapshot.ts}`
- `packages/flow-designer-renderers/src/{designer-context.ts,designer-page*.tsx}` 及其 focused tests/docs
- `packages/spreadsheet-core/src/{core.ts,core/internal-state.ts}` 与 `packages/spreadsheet-renderers/src/{bridge.ts,page-renderer.tsx}` 及其 focused tests/docs
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-renderers/src/{host-data.ts,bridge.ts,page-renderer.tsx}` 及其 focused tests/docs
- `packages/word-editor-core/src/document-io.ts`
- `packages/word-editor-renderers/src/{word-editor-action-provider.ts,hooks/use-word-editor-state.ts,editor-canvas.tsx}` 及其 focused tests/docs
- 受影响 owner docs：`docs/architecture/{flow-designer/runtime-snapshot.md,report-designer/design.md,word-editor/design.md}`，以及 directly affected component/reference docs

### Out Of Scope

- generic clone-on-read policy changes for unrelated packages
- broader workbench projection vocabulary redesign beyond the in-scope hosts and fields
- unrelated report preview, spreadsheet resize, flow tree-mode, or word-editor dataset precedence work already owned by other plans
- generic security sandboxing of schema expressions/helpers beyond what focused projection narrowing requires

## Execution Plan

### Workstream 1 - Freeze Per-Host Projection Boundary Decisions

Status: completed
Targets: `docs/architecture/{flow-designer/runtime-snapshot.md,report-designer/design.md}`, affected component/reference docs, this plan

- Item Types: `Decision | Fix`

- [x] [Decision] Freeze a per-host retained/removed surface matrix for the newly confirmed residuals only: for Flow Designer region host scope, Spreadsheet external bridge snapshot, and Report Designer schema-visible host scope, explicitly mark each questioned field as `canonical and retained`, `derived convenience and retained`, or `overexposed and removed from schema/external boundary`.
- [x] [Decision] Record the concrete boundary line between framework-owned internal snapshot consumers and schema/external projection consumers, using `frontend-programming-model.md` and `capability-projection-manifest.md` as normative inputs rather than reopening them for redesign.
- [x] [Fix] Update host owner docs so retained fields are named explicitly and removed/compat-only fields stop appearing as current supported projection surface.

Exit Criteria:

- [x] A per-host retained/removed surface matrix exists in this plan or the updated owner docs.
- [x] Flow and Report owner docs no longer imply that the full internal owner graphs are valid schema-visible projection by default.
- [x] The plan explicitly records that `208` and `220` remain closed and are not being reopened by this successor scope.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Narrow Schema-Visible And External Projection Surfaces

Status: completed
Targets: `packages/{flow-designer-renderers,spreadsheet-renderers,report-designer-renderers}/src/**`, focused tests, affected docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Flow Designer: implement the retained/removed matrix for region host scope, keeping only the adjudicated schema-visible fields and trimming any retained complex field to the minimum readonly DTO needed by supported region schema.
- [x] [Fix] Spreadsheet: implement the retained/removed matrix for the external bridge snapshot so integration consumers receive only the adjudicated readonly bridge DTO rather than the full workbook/selection graph.
- [x] [Fix] Report Designer: implement the retained/removed matrix for schema-visible host scope, preserving canonical report-owned projection fields while removing overexposed designer/spreadsheet internal objects from the supported schema boundary.
- [x] [Proof] Add focused tests proving, per host, which fields remain reachable and which previously exposed internal objects are no longer reachable from the supported schema-visible / external boundary.
- [x] [Decision] Record explicitly where framework-owned internal React consumers may still use live zero-copy snapshots, so later reviews do not misclassify those retained internal surfaces as plan-owned residuals.

Exit Criteria:

- [x] Flow/Spreadsheet/Report schema-visible and external projection surfaces match the adjudicated per-host matrix.
- [x] Removed internal objects are no longer reachable through each supported projection boundary.
- [x] Focused tests lock the final per-host projection vocabulary and boundary.
- [x] Affected owner docs/references are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Seal Canonical Owner Baselines And Truth-Surface Convergence

Status: completed
Targets: `packages/flow-designer-core/src/**`, `packages/report-designer-core/src/core.ts`, `packages/word-editor-{core,renderers}/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Flow Designer: make history/save baselines sufficiently owner-owned so nested `node.data` / `edge.data` payloads cannot alias back into live doc or saved/history baselines.
- [x] [Fix] Report Designer: make spreadsheet subtree sync/import paths owner-seal the report document instead of retaining caller-owned spreadsheet subtree references.
- [x] [Fix] Word Editor: after explicit save succeeds, update host projection `document` from the same persisted snapshot/truth used for the save, including正文/paper settings rather than only `charts/codes` extras.
- [x] [Proof] Add focused tests covering nested payload alias isolation, owner-owned spreadsheet sync/import baseline, and explicit-save host-projection convergence.
- [x] [Decision] Update owner docs to describe exactly which surfaces are canonical persisted/history baselines and which are merely live convenience projections; Word Editor stays in this workstream only for save-convergence, not as a new projection-overexposure family.

Exit Criteria:

- [x] Flow history/save baselines are insulated from later nested payload mutation.
- [x] Report document no longer aliases caller-owned spreadsheet subtree input in the supported sync/import paths.
- [x] Word Editor explicit save re-aligns persisted content, dirty publication, and host projection `document`.
- [x] Focused tests cover all three truth-surface defect families.
- [x] Affected owner docs are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] Run all newly added focused tests for Flow Designer, Spreadsheet, Report Designer, and Word Editor.
- [x] [Proof] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope code/doc changes land.
- [x] [Decision] Perform an independent closure audit with a separate subagent or reviewer, explicitly checking that the landed fixes obey the zero-copy readonly principle without leaving overexposed projection surfaces behind.
- [x] [Decision] Record any true residuals only under `Deferred But Adjudicated`; no confirmed in-scope defect may be downgraded to vague follow-up language.

Exit Criteria:

- [x] Every in-scope defect family has focused verification evidence.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms both halves of the policy: no unnecessary clone-on-read regressions, and no remaining overexposed projection/truth-surface blocker in scope.
- [x] Affected owner docs are updated, or any explicit `No owner-doc update required` decision is recorded honestly.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] per-host retained/removed projection matrix 已落地，且 workbench host projection 边界已与 `frontend-programming-model.md` 对齐：内部零拷贝允许，但 schema/integration projection 已收窄
- [x] canonical save/history/persisted truth surfaces 已重新收敛
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None. Independent closure audit found no remaining in-scope residual that qualifies for deferred treatment under the current readonly-projection policy.

## Closure

Status Note: Completed. Flow/Report/Spreadsheet projection surfaces were narrowed to the retained readonly DTOs, Flow/Report/Word canonical truth surfaces were re-sealed, focused proofs landed, and the workspace verification chain is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Projection/truth-surface code landed in `packages/flow-designer-core/src/core/clone.ts`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/word-editor-core/src/document-io.ts`, and `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`.
  - Focused proof exists in `packages/flow-designer-renderers/src/auto-layout-guards.test.tsx`, `packages/report-designer-core/src/__tests__/designer-core.test.ts`, `packages/word-editor-core/src/__tests__/document-io.test.ts`, and `packages/word-editor-renderers/src/__tests__/word-editor-action-provider.test.ts`.
  - Owner-doc matrices and truth-surface baselines were updated in `docs/architecture/{flow-designer/runtime-snapshot.md,flow-designer/canvas-adapters.md,report-designer/design.md,word-editor/design.md}` and workspace-green verification was recorded in `docs/logs/2026/05-11.md`.
