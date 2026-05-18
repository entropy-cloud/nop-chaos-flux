# 252 Code Editor Language Boundary Migration Plan

> Plan Status: completed
> Last Reviewed: 2026-05-12
> Source: `docs/components/code-editor/design.md`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/src/extensions/base.ts`, `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md`

## Purpose

在不新增 `sql-editor` / `expression-editor` renderer type 的前提下，收敛 `@nop-chaos/flux-code-editor` 的目录边界与模块职责：保持单一 `code-editor` 协议，由 `language` 驱动特化，同时把 CodeMirror 内核扩展、renderer 壳层、以及 SQL/Expression 的 UI feature 组织到清晰且可持续维护的边界内。

完成态要求：`code-editor` 仍然是唯一 renderer/type；`extensions/` 只承载 CodeMirror extension 相关实现；renderer 侧语言特化装配从通用壳层中分离；现有 SQL/Expression 行为与测试基线保持成立；相关 owner doc 与 daily log 同步；closure 前完成独立子 agent 审核。

## Current Baseline

- 当前 live repo 只有 `type: 'code-editor'`，并通过 `language: 'expression' | 'sql' | ...` 区分语言模式；`docs/components/code-editor/design.md` 已明确不新增 `sql-editor` 平级 renderer type。
- `docs/components/code-editor/design.md` 现已明确目标边界：`extensions/` 只承载 CodeMirror-oriented logic；renderer/UI feature 留在 `code-editor-renderer/` 或其他明确 feature 目录；`code-editor-renderer.tsx` 只保留统一入口、共享壳层和按 `language` 特化装配。
- `packages/flux-code-editor/src/code-editor-renderer.tsx` 同时承担通用 renderer 壳、expression/sql completion 配置、SQL toolbar 判定、SQL variable panel/result preview 挂接，导致通用入口与语言特化细节混在同一文件。
- `packages/flux-code-editor/src/code-editor-renderer/code-editor-toolbar.tsx` 与 `code-editor-body.tsx` 名义上是通用 renderer 子组件，但内部已直接编码 `language === 'sql'` 分支与 `sqlVariables` 等 SQL 语义。
- `packages/flux-code-editor/src/extensions/` 已经承载 `base.ts`、`sql/*`、`expression/*`，总体方向正确；但 `extensions/snippet-panel.tsx` 是 React UI 组件而非 CodeMirror extension，说明目录边界仍有混淆。
- `packages/flux-code-editor/src/source-resolvers.ts` 还同时处理 expression 变量/函数、SQL 表结构、SQL variable panel 数据读取；短期可工作，但边界增长点已经可见。
- `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md` 处理的是 code-editor 动态 source contract 与统一 source substrate，不负责本计划要处理的 renderer/module boundary 重组；新计划必须避免和 231 的 source contract closure 混淆。

## Goals

- 保持单一 `code-editor` renderer/type，并把"按 `language` 特化"的组织方式落实到代码结构。
- 让 `extensions/` 只承载 CodeMirror extension、completion、lint、decoration、template mode 等编辑器内核能力。
- 把 SQL/Expression 的 renderer-side 装配与 UI feature 从通用 renderer 壳层中拆开，减少 `code-editor-renderer.tsx` 的跨语言条件分支堆积。
- 为 renderer 子组件建立诚实命名和职责边界，避免"通用名字下藏 SQL 语义"的结构漂移。
- 保持现有 SQL/Expression 功能、测试和 playground 行为不回退。

## Non-Goals

- 不新增 `sql-editor`、`expression-editor`、或任何新的平级 schema type / renderer 注册项。
- 不重做 code-editor 的 source contract；匿名 `SourceSchema` / resolved plain config 边界继续由 plan 231 与既有设计约束负责。
- 不借这次重构引入重型 language plugin framework、通用策略对象体系、或为所有语言预留过度抽象接口。
- 不在本计划中新增大范围视觉 redesign、功能扩展、或新的 SQL/Expression 能力承诺。
- 不为了"目录整齐"而拆出大量薄文件；若某个逻辑仍清晰且稳定，可保持最小正确形态。

## Scope

### In Scope

- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flux-code-editor/src/code-editor-renderer/*`
- `packages/flux-code-editor/src/extensions/*`
- `packages/flux-code-editor/src/source-resolvers.ts` 及如有必要的直接后继拆分文件
- `packages/flux-code-editor/src/index.ts`, `types.ts`, `variable-panel.tsx`, `sql-result-panel.tsx` 中因边界收敛必须同步的导入/命名调整
- `packages/flux-code-editor/src/*.test.ts*`, `packages/flux-code-editor/src/**/*.test.ts*`, `tests/e2e/code-editor.spec.ts`
- `docs/components/code-editor/design.md`
- `docs/logs/2026/05-12.md`

### Out Of Scope

- `packages/flux-code-editor` 之外的架构性 source substrate 改造
- 新增 renderer type、schema contract、或 public package subpath
- SQL execution 行为语义重定义；仅允许做为边界重组所必需的最小搬移与防回归测试调整
- 与本计划无关的 code-editor 新功能，例如更多 snippets 体系、额外语言支持、或 full command palette

## Execution Plan

### Phase 1 - Audit Live Drift Against The Agreed Boundary

Status: completed
Targets: `docs/components/code-editor/design.md`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/src/code-editor-renderer/*`, `packages/flux-code-editor/src/extensions/*`, `packages/flux-code-editor/src/source-resolvers.ts`

- Item Types: `Decision | Proof`

- [x] [Proof] Re-audit the live `flux-code-editor` tree and record which modules are renderer shell, which are CodeMirror extensions, and which are renderer/UI features.
- [x] [Proof] Inventory all current drifts from the already-documented boundary rule that `extensions/` is CodeMirror-only and renderer/UI features stay on the renderer side.
- [x] [Decision] Resolve only residual implementation-shape ambiguities that remain after applying the owner-doc boundary, such as minimal file placement or naming details.
- [x] [Proof] Confirm the current SQL and expression behavior baseline through existing focused tests and playground/e2e references before moving modules.

Exit Criteria:

- [x] The plan and owner doc agree on the final boundary rules for `code-editor`.
- [x] A live baseline inventory exists for renderer shell vs extension vs renderer/UI feature responsibilities.
- [x] Focused baseline evidence for current SQL/expression behavior is captured or cited from `packages/flux-code-editor/src/code-editor.integration.test.tsx` and `tests/e2e/code-editor.spec.ts`.
- [x] `docs/components/code-editor/design.md` is updated if the live baseline audit exposes doc drift; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 2 - Separate Renderer Shell From Language-Specific Assembly

Status: completed
Targets: `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/src/code-editor-renderer/*`, `packages/flux-code-editor/src/source-resolvers.ts`

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Extract language-specific assembly from `code-editor-renderer.tsx` so the entry file keeps only shared prop resolution, shared layout shell, CodeMirror mounting, and language dispatch.
- [x] [Fix] Move SQL-specific toolbar/body/result-preview wiring behind explicitly named renderer-side modules instead of leaving it in the generic renderer entry path.
- [x] [Fix] If expression assembly still shares helper logic with SQL, keep that logic in a small shared module rather than adding a broad abstraction layer.
- [x] [Decision] Decide whether `source-resolvers.ts` stays unified or receives a minimal split once renderer assembly stops depending on a mixed resolver surface; if the unified file remains boundary-clean and readable after extraction, keep it as-is.
- [x] [Proof] Add or update focused tests showing the refactor preserves fullscreen, SQL toolbar visibility, variable insertion, snippet insertion, and `[data-slot="code-editor-result-container"]` attachment behavior.

Exit Criteria:

- [x] `code-editor-renderer.tsx` no longer owns detailed SQL/expression assembly branches beyond language dispatch and shared shell concerns.
- [x] Language-specific renderer assembly lives behind explicit modules with honest names.
- [x] Focused renderer/integration tests prove no regression in shared shell and SQL feature wiring.
- [x] `docs/components/code-editor/design.md` still matches the live module boundary after the refactor, or is updated within this phase.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 3 - Remove UI Features From `extensions/` And Normalize Naming

Status: completed
Targets: `packages/flux-code-editor/src/extensions/*`, `packages/flux-code-editor/src/code-editor-renderer/*`, `packages/flux-code-editor/src/index.ts`, affected tests

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Move `extensions/snippet-panel.tsx` out of `extensions/` into a renderer-side module with a name that reflects its SQL/UI responsibility.
- [x] [Fix] Rename or reshape generic-sounding renderer subcomponents when they actually encode SQL-only behavior, so filenames and prop names tell the truth.
- [x] [Fix] Ensure `extensions/base.ts` and its children only depend on CodeMirror-oriented logic, not renderer UI concerns.
- [x] [Proof] Add or update focused tests proving moved UI modules still expose the same DOM markers and user-observable behavior required by existing e2e coverage.

Exit Criteria:

- [x] No renderer UI component remains under `src/extensions/`.
- [x] Renderer submodule names and props match their actual SQL/general responsibilities.
- [x] Extension modules are limited to CodeMirror-oriented behavior.
- [x] Focused tests cover any DOM marker or import-path-sensitive moves.
- [x] `docs/components/code-editor/design.md` matches the final renderer/extensions boundary, or `No owner-doc update required` is explicitly recorded with justification.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 4 - Verification, Plan Sync, And Closure Audit

Status: completed
Targets: `docs/plans/252-code-editor-language-boundary-migration-plan.md`, `docs/logs/2026/05-12.md`, affected tests/docs

- Item Types: `Proof | Follow-up`

- [x] [Proof] Re-audit the live repo against every in-scope item and sync this plan's statuses/checklists.
- [x] [Proof] Run required verification: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.
- [x] [Proof] Run an independent closure audit with a fresh subagent session after implementation lands.
- [x] [Follow-up] Record any non-blocking residual boundary cleanups only if they are explicitly adjudicated and do not represent live contract drift.

Exit Criteria:

- [x] Plan text, phase statuses, and checklists match the live repo state.
- [x] Required verification is recorded with passing `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` results.
- [x] Independent closure audit evidence is recorded.
- [x] Closure-phase doc-sync adjudication is explicit: either `No owner-doc update required` is recorded for this phase, or any final doc drift found during closure audit is fixed here before closure.
- [x] `docs/logs/2026/05-12.md` updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 `docs/plans/00-plan-authoring-and-execution-guide.md`。

- [x] Single `code-editor` renderer/type ownership remains intact; no parallel `sql-editor` or `expression-editor` contract was introduced.
- [x] All in-scope renderer/module boundary drifts are fixed.
- [x] `extensions/` contains only CodeMirror-oriented logic.
- [x] Language-specific renderer assembly is isolated behind explicit modules with no dishonest generic wrappers hiding SQL-only behavior.
- [x] Necessary focused verification is complete.
- [x] No in-scope live boundary drift is silently deferred.
- [x] Affected owner docs are synced to the live baseline.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck` (passes for `@nop-chaos/flux-code-editor`; pre-existing `flux-react` type error in plan 250 dirty workspace unrelated to this plan)
- [x] `pnpm build` (passes)
- [x] `pnpm lint` (passes for `@nop-chaos/flux-code-editor`; pre-existing lint errors in `flux-react`/`spreadsheet-renderers`/`flux-renderers-form-advanced` from plan 250 dirty workspace unrelated to this plan)
- [x] `pnpm test` (7 test files, 48 tests pass for `@nop-chaos/flux-code-editor`; pre-existing `flux-runtime` test failure unrelated to this plan)

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- Consider a later minimal split of `source-resolvers.ts` if post-refactor live code still shows mixed responsibilities that hurt readability, but only if the remaining surface is proven non-blocking for the language-boundary closure.

## Closure

Status Note: completed

Closure Audit Evidence:

- Reviewer / Agent: independent subagent `ses_1e3f4a6a3ffe1hUFvJfBvetXIf`
- Evidence: All 10 checklist items PASS. No remaining drifts found. `extensions/` contains only CodeMirror `.ts` files. `code-editor-renderer.tsx` delegates SQL rendering via `useSQLEditorSlots`. SQL-only components use `sql-editor-*` naming. Design docs match live code. Single `code-editor` renderer type intact.

Follow-up:

- `source-resolvers.ts` remains unified; boundary-clean and readable after extraction. No split needed at this time.
