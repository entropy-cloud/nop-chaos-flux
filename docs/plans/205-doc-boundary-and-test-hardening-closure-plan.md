# 205 Doc Boundary And Test Hardening Closure

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full/01-dependency-graph.md`, `docs/analysis/2026-05-05-deep-audit-full/02-module-responsibility.md`, `docs/analysis/2026-05-05-deep-audit-full/16-doc-code-consistency.md`, `docs/analysis/2026-05-05-deep-audit-full/summary.md`
> Related: `docs/plans/199-doc-and-verification-closure-plan.md`

## Purpose

收口 05-05 retained docs/package-boundary/test-hardening defects，并把高频重复问题转成自动化守卫：active docs 坏路径、package CSS exports 指向 `src/*`、以及 `action-dispatcher.test.ts` 的硬阈值问题。

## Current Baseline

- 6 份 active docs 仍引用不存在的 playground 路径或旧命名文件。
- `flux-react` / `theme-tokens` / `word-editor-renderers` 的公开 CSS exports 仍指向 `src/*`。
- `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts` 仍超过 700 行，已命中仓库 `check:oversized-code-files` 硬阈值。
- `pnpm check:oversized-code-files` 与 lint hard gate 已存在，但 docs-path / exports-path 仍缺少同等级自动化守卫。

## Goals

- 修复 in-scope active docs 的失效路径。
- 修复 package CSS exports -> `src/*` 的 boundary drift。
- 拆分 `action-dispatcher.test.ts` 到硬阈值以内，并保留 focused coverage。
- 将上述高频问题转成自动化守卫，减少重复审计命中。

## Non-Goals

- 非 active docs 的历史材料清理
- 全仓测试覆盖提升运动
- 其它已降级 docs/naming/hygiene 项

## Scope

### In Scope

- `docs/index.md`
- `docs/architecture/playground-experience.md`
- `docs/architecture/theme-compatibility.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/flow-designer/collaboration.md`
- `docs/references/maintenance-checklist.md`
- `packages/flux-react/package.json`
- `packages/theme-tokens/package.json`
- `packages/word-editor-renderers/package.json`
- `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts`
- any newly added script/test files required to enforce docs-path, export-path, and oversized-file rules

### Out Of Scope

- logs/archive/plans 历史路径清理
- `flux-react` 的 `@nop-chaos/flux-compiler` devDependency 收尾
- report designer e2e 闭环增强

## Execution Plan

### Phase 1 - Active Doc Path Closure

Status: completed
Targets: 6 in-scope active docs, related verification

- Item Types: `Fix | Proof`

- [x] [Fix] 6 份 active docs 的 playground 代码锚点改为 live 路径和 live 文件命名。
- [x] [Proof] focused verification：所有 in-scope code anchors 均能在 live repo 中解析。

Exit Criteria:

- [x] in-scope active docs 不再指向缺失路径或旧 PascalCase 文件名
- [x] focused verification 已覆盖所有 in-scope docs anchors
- [x] 6 份 in-scope active docs 已同步到 live baseline
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Package Boundary Export Closure

Status: completed
Targets: 3 package manifests, any needed build-path adjustments, verification

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] `flux-react` / `theme-tokens` / `word-editor-renderers` 的 CSS exports 不再指向 `src/*`。
- [x] [Proof] focused verification：in-scope package exports 均指向可发布的 `dist/*` 资源。
- [x] [Decision] 如需要 build/resource copy 调整，完成最小可行实现并同步文档裁定。

Exit Criteria:

- [x] in-scope package CSS exports 已收敛到 `dist/*`
- [x] focused verification 已覆盖 retained package-boundary defect
- [x] 若 live baseline 改变：相关 references/docs 已更新；否则明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Oversized Test Split And Automation Guards

Status: completed
Targets: `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts`, in-scope guard scripts/tests

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] 将 `action-dispatcher.test.ts` 按核心语义拆分，确保每个文件都不再触发 `>700` 硬阈值。
- [x] [Proof] focused verification：dispatcher retained coverage 仍成立，且 `pnpm check:oversized-code-files` 不再命中该文件。
- [x] [Fix] 新增自动化守卫，至少覆盖：active docs 锚点存在、package exports 不指向 `src/*`。
- [x] [Decision] 若 host renderer metadata 检查适合与本计划一并落地，则补入第三条 guard；否则明确 successor owner。

Exit Criteria:

- [x] `action-dispatcher` retained oversized-file defect 已修复
- [x] 至少两条当前仍缺失的高频重复问题已转成自动化守卫
- [x] focused verification 覆盖 dispatcher split 与新增 guards
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Host Renderer Metadata Guard

- Classification: `watch-only residual`
- Why Not Blocking Closure: 若该 guard 与 renderer owner files 的改动耦合过深，可由 plan 204 一并落地；本计划 closure 的最低要求仍是 docs-path 与 export-path guards。
- Successor Required: yes
- Successor Path: `docs/plans/204-renderer-workbench-and-accessibility-closure-plan.md`

## Non-Blocking Follow-ups

- 若 report designer e2e 闭环增强仍需 successor owner，可在测试计划中单独承接。

## Closure

Status Note: Plan 205 in-scope doc-anchor drift, package CSS export boundary drift, and oversized dispatcher test defects are closed in the live repository. The repeated audit hits are now guarded by `check-active-doc-code-anchors` and `check-package-css-exports`, dispatcher coverage remains intact after the split, and the fresh independent closure audit plus full workspace verification leave no remaining in-scope blocker.

Closure Audit Evidence:

- Reviewer / Agent: independent audit task `ses_209da0340ffeP56Z9YIhZgMrvo`
- Evidence: verified active-doc and CSS-export guards from root `package.json`, package export targets in `packages/flux-react/package.json`, `packages/theme-tokens/package.json`, and `packages/word-editor-renderers/package.json`, dispatcher split coverage under `packages/flux-action-core/src/__tests__/action-dispatcher-routing.test.ts`, `action-dispatcher-control-flow.test.ts`, and `action-dispatcher-monitoring.test.ts`, and a clean `pnpm check:oversized-code-files`; no blocking findings remained and full `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` passed.

Follow-up:

- None.
