# 144 Flux Execution Boundary Diagnostics And Host-Contract Tooling Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-26
> Source: `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md`
> Related: `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md`, `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md`, `docs/plans/112-capability-projection-manifest-implementation-plan.md`

## Purpose

把 analysis 中已经形成共识、且可直接落地的三条主线收敛成一个 owner plan：固定 `Final Execution Schema` 输入边界、补齐最小 diagnostics 回溯链、统一 `RendererDefinition.hostContract -> resolveManifest(...)` 的工具消费路径。

这份计划只处理“执行边界可诊断、且可被工具统一消费”这一类结果面，不处理依赖追踪/订阅粒度优化，也不把 analysis 本身升级为新的 architecture baseline。

## Current Baseline

**Verified against live repo (2026-04-26):**

- `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` 已完成独立子 agent 交叉审核，并收敛为 4 条主线 + 2 条治理项。
- `docs/architecture/frontend-programming-model.md` 已明确 `Final Execution Schema` 边界，以及运行期动态依赖收集作为当前执行模型的一部分。
- `docs/architecture/flux-dsl-vm-extensibility.md` 已明确 Flux 是最终 DSL VM，浏览器执行核心不应重新打开 loader 风格装配语义。
- `docs/architecture/capability-projection-manifest.md`、`packages/flux-core/src/types/renderer-core.ts`、`packages/flux-core/src/schema-diagnostics/manifest.ts` 已提供 `RendererDefinition.hostContract` 和 manifest resolution 入口，工具原则上可以直接消费。
- analysis 中的两条治理项目前仍更适合作为文档/评审 guardrail，而不是本计划的代码交付目标。
- 真正还未收口的是：
  - `Final Execution Schema` 输入不变量尚未被整理成更明确的最终文档表述
  - authoring-to-runtime diagnostics 回溯链还没有形成最小统一方案
  - `hostContract -> resolveManifest(...)` 的工具消费路径尚未被固定成共享规则或 helper

## Goals

- 把 `Final Execution Schema` 边界、最小 diagnostics 回溯链、以及 `hostContract -> resolveManifest(...)` 工具消费路径收敛为同一套 owner-doc + code baseline
- 明确哪些内容属于文档收口，哪些需要最小代码改动，哪些只需要共享 helper 或工具接线
- 保持与现行 architecture baseline 一致，不让本计划变成新的并行规范来源

## Non-Goals

- 不在前端重做 `nop-entropy` 的 Loader、Delta、可逆计算、authoring 装配职责
- 不把 host/workbench helper 平台化漂移治理作为本计划的交付目标
- 不把 React 19 使用约束细化作为本计划的主要执行结果
- 不处理依赖追踪精度、编译期依赖推断、订阅热路径优化；如需推进，另开 successor plan
- 不把 analysis 文档直接改写成 architecture baseline；只有达成团队共识的 settled subset 才能提升到 owner doc

## Scope

### In Scope

- `Final Execution Schema` 输入不变量的文档收敛与必要的代码/校验接线核对
- 最小 diagnostics 回溯链的落地方案选择与实现，优先采用最小 schema-native 位置元数据方案
- `RendererDefinition.hostContract -> resolveManifest(...)` 的共享消费路径定义、helper 或工具接线
- 与上述工作直接相关的 architecture / analysis / logs 更新

### Out Of Scope

- 设计器平台化治理的长期规则
- React 19 全仓迁移或统一最佳实践清理
- 依赖追踪精度、订阅粒度优化、编译期依赖推断、以及运行时热路径收窄
- 新的 host contract 模型重构
- 新的 loader transport envelope
- 大规模性能治理中与本计划无直接关系的其他热点

## Execution Plan

### Phase 1 - Final Execution Schema Boundary Wording And Contract Audit

Status: planned
Targets: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md`

- [ ] Re-audit the live baseline and identify the smallest wording gaps around `Final Execution Schema` input invariants
- [ ] Decide whether any code-level validation hook or type surface also needs tightening, or whether this phase is documentation-only
- [ ] Update the owning architecture doc(s) to make the settled boundary wording explicit without introducing a second baseline
- [ ] Keep the analysis doc synchronized if any of its wording becomes outdated after the owner-doc update

Exit Criteria:

- [ ] `Final Execution Schema` input invariants are stated in the owning architecture doc as current baseline wording
- [ ] No analysis wording remains that suggests Flux executes half-assembled loader artifacts
- [ ] Any code-level contract touchpoints identified by the audit are either updated or explicitly moved out of scope
- [ ] 相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Minimal Diagnostics Backtracking

Status: planned
Targets: `packages/flux-core/`, `packages/flux-compiler/`, `docs/architecture/schema-file-validator.md`, `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md`

- [ ] Audit the current diagnostics pipeline and identify the smallest viable carrier for source-location metadata
- [ ] Choose one minimal approach for live implementation, directionally preferring schema-native node metadata unless the audit proves that insufficient
- [ ] Wire expression / action / validation diagnostics to surface that location metadata where sound
- [ ] Update the owning diagnostics architecture doc with final wording after implementation choice is settled

Exit Criteria:

- [ ] A concrete minimal diagnostics backtracking approach is implemented for the chosen carrier and covered by focused verification
- [ ] Diagnostics can report authoring-origin information for at least one representative compiler error path
- [ ] The final design wording lives in the owning architecture doc, not only in analysis
- [ ] 相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Host Contract Tool Consumption Path

Status: planned
Targets: `packages/flux-core/`, relevant tool package(s), `docs/architecture/capability-projection-manifest.md`, `docs/architecture/capability-contract-model.md`

- [ ] Audit current tool-side manifest resolution code paths, if any, and identify duplication or missing shared entry points
- [ ] Define one shared consumption rule or helper for publishing-owner-context resolution through `RendererDefinition.hostContract -> resolveManifest(...)`
- [ ] Apply that rule/helper to at least one concrete consumer path (editor, debugger, or docs export)
- [ ] Update the owning architecture doc(s) to describe the final shared consumption path and the explicit host-context fallback for standalone fragment scenarios

Exit Criteria:

- [ ] At least one concrete tool consumer path uses the shared `hostContract -> resolveManifest(...)` resolution approach
- [ ] The owning architecture doc states the shared consumption path and its context requirements
- [ ] Standalone fragment / explicit host-context fallback is documented where needed
- [ ] 相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态
- [ ] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] `Final Execution Schema` boundary wording is aligned across owner docs and the surviving analysis note
- [ ] The diagnostics slice has a concrete minimal implementation and focused verification
- [ ] The host-contract tool-consumption path is implemented or codified for at least one real consumer
- [ ] Remaining governance-only items stay explicitly out of this plan's scope
- [ ] Dependency-tracking optimization work is explicitly out of this plan's scope and assigned to a successor plan if pursued
- [ ] Focused verification has been completed for every landed phase
- [ ] Independent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<fill when the plan is actually closed>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or subagent>>
- Evidence: <<task id / daily log link / focused verification summary>>

Follow-up:

- Dependency-tracking precision work, including compile-time dependency inference and subscription narrowing, belongs in a successor plan
- Governance-only work on host/workbench helper drift remains outside this plan unless promoted into a successor plan
- Governance-only work on React 19 usage constraints remains outside this plan unless promoted into a successor plan
