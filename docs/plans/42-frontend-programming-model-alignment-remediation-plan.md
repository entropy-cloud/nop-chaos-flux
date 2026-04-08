# 42 顶层编程模型对齐修正计划

> Plan Status: partially completed
> Last Reviewed: 2026-04-09; refreshed after runtime/host-projection remediation
> Source: `docs/architecture/frontend-programming-model.md`, `docs/architecture/frontend-programming-model-improvement-design.md`, `docs/architecture/flux-design-principles.md`

## Purpose

本计划用于处理一次顶层架构对照审查后确认的剩余差距，目标不是重开 primitive closure 讨论，而是把已经确认的顶层设计基线继续收敛到代码、宿主接线和解释性文档上。

这次审查的结论不是“整体方向错误”，而是：

- `ScopeRef` / `Value` / `ActionScope` / `ComponentHandleRegistry` / `data-source` / `reaction` 的主干设计已经与顶层编程模型基本一致
- 若干关键点仍停留在兼容态、过渡态或文档超前表述阶段
- 如果不单独立计划处理，后续实现很容易继续沿着“文档说的是目标态，代码跑的是兼容态”的双轨状态演化

## 已确认结论

- 顶层 primitive 边界总体成立：`ScopeRef` 仍是纯数据词法作用域，source/reaction 是 runtime-owned sidecar，`Capability` 已分成 built-in、`component:<method>`、`ActionScope` 三条解析路径。
- React integration 总体符合当前 renderer runtime 文档：根边界显式，内部通过 hooks/context 提供 runtime services，fragment rendering 通过显式 options 传递 `scope` / `actionScope` / `componentRegistry`。
- `xui:imports` 的词法可见性、scope-local 注册、加载中 placeholder provider、失败显式诊断和表达式侧 `$alias` 投影都已经进入主链。
- 2026-04-09 已完成一轮关键运行时收口：
- `Action Algebra` 已按 `success-class` / `failure-class` / `neutral-class` 执行 `then` / `onError` / `parallel` 控制流，并把 `continueOnError` 收窄为“是否继续主链”的控制位。
- `result` / `error` / `prevResult` 以及 reaction `value` / `prev` / `changed` / `changedPaths` 已通过 transient evaluation bindings 接入 action 表达式求值，而不是只停留在 `ActionContext.event`。
- Host Projection 已改成 snapshot replacement 语义；`useHostScope` 现在会 replace 自有快照并对 projected field 写入做诊断失败。
- Flow/Report/Spreadsheet 的 schema-visible host scope 已去掉 `designerCore` / `reportDesignerCore` / `spreadsheetCore` / `spreadsheetSnapshot` 等泄漏对象，只保留 DTO-style projection。
- formula `data-source` 已不再错误要求 `dataPath`，与 `name`-first 资源发布合同保持一致。
- 当前真正仍未收口的顶层缺口已经缩小到两个方向：
- `Semantic Lifecycle Entry` 仍缺少 form/page/dialog 的 author-visible schema 收口
- 若干 architecture / protocol / plan 文档仍保留 2026-04-08 审计时的过时 current-state 描述，需要刷新 current-vs-target 标记

## 与现有计划的关系

- `docs/plans/38-action-api-source-convergence-migration-plan.md` 已完成 action/api/source 主干收敛，但没有把 `data-source` 的 `name`-first 发布合同完整落到代码上。本计划只继续承接其剩余的发布/状态/兼容收口，不重开命名体系讨论。
- `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` 负责 root-binding dependency substrate。本计划不重复处理 dependency collector、normalized roots、row-scope invalidation。
- `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md` 已经承担 `TemplateNode` / `NodeInstance` / live `cid` / canonical `NodeLocator` 迁移。本计划不重写该主线，只把“顶层文档与当前实现仍有 node-instance 差距”记为依赖项，并在解释性文档里正确标注其状态。
- `docs/plans/12-action-scope-imports-and-component-invocation-plan.md` 已被后续 action-scope 文档和实现吸收；本计划只处理剩余的 boundary hardening，不回退到更早期的 action extension 讨论。

## Problem

- 旧版计划把若干已经完成的收口项继续描述成未完成事项，尤其是：
- `report-designer` / `spreadsheet` 缺本地 `ActionScope` boundary
- `componentName` 仍是覆盖式解析
- `data-source` 未收敛到 `name` / `statusPath` / scope-scoped registry 主线
- `Action Algebra` 的 failure branch、branch result context、reaction action context、host snapshot replacement 在 2026-04-09 前后已经进入代码主链，但本计划仍没有正确反映这一变化。
- 当前剩余缺口主要是 schema-level semantic lifecycle ownership 尚未对齐到顶层文档；`form` 仍只有 `body` / `actions` / `data` 这类较早期字段，尚未引入 `initAction` / `submitAction` / `onSubmitSuccess` / `onSubmitError` / `onValidateError` 之类的显式语义入口。
- 部分 narrower docs 仍保留“Spreadsheet host scope 通过 region data 注入”“Host Projection 可能仍泄漏 core/config object”等过时描述，需要更新成当前基线。

## Root Cause

- 2026-04-08 的初版计划是在审计刚结束时写下的，后续运行时修复已经让多项 gap 退出了未完成列表，但计划文本没有同步更新。
- 顶层 architecture 文档推进速度快于 explanation / protocol / plan 文档更新速度，导致 current baseline 发生变化后，旧计划仍停留在审计时刻的快照。
- `Semantic Lifecycle Entry` 尚未形成单独计划承接，导致旧计划把已解决的 runtime gap 和未解决的 schema-surface gap 混在一起。

## Goals

- 把 Plan 42 刷新为“当前仍未完成的顶层对齐事项”的准确索引，而不是继续重复已经落地的 gap。
- 记录 2026-04-09 已经落地的运行时收口：`Action Algebra` branch semantics、reaction action bindings、Host Projection replacement/readonly hardening、formula `data-source` guard 修正。
- 把真正剩余的 schema-level `Semantic Lifecycle Entry` 收口切分到独立计划中，避免继续与已完成的 runtime gap 混在一起。
- 对相关 architecture/protocol docs 补 current-baseline 注记，避免读者继续依据旧计划误判现状。

## Non-Goals

- 不重新讨论是否需要新增 primitive category。
- 不在本计划中替换表达式引擎或重写 dependency tracking substrate。
- 不把已经完成的 runtime 收口重新打开成新一轮大规模重构。
- 不在本计划中接手 `TemplateNode` / `NodeInstance` 主迁移，该项继续由 Plan 40 负责。
- 不在本计划中直接实现 semantic lifecycle schema surface；该部分由新建的专门计划承接。

## Scope

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/frontend-programming-model-improvement-design.md`
- `docs/architecture/flux-design-principles.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/api-data-source.md`
- `docs/logs/`
- `docs/plans/44-semantic-lifecycle-entry-alignment-plan.md`

## 不在 Scope 内的事项

- `TemplateNode` / `NodeInstance` / live `cid` 的主体迁移
- root-binding dependency collector 继续实现
- form runtime / validation 体系重构
- complex host snapshot contract 的大规模扩展

## 执行策略

本计划从“实现计划”调整为“对齐收口与计划分流计划”：

- 已完成的 runtime gap 在这里记录 current baseline 与 cross-reference
- 仍未完成且需要继续编码的 schema-level gap 被拆到新计划
- 顶层/协议文档只保留准确的 current-vs-target 说明，不再让旧计划承担过多 implementation 细节

## Execution Plan

**Phase 0 — 刷新 current baseline**

Targets: `frontend-programming-model.md`, `action-scope-and-imports.md`, `api-data-source.md`, `complex-control-host-protocol.md`

- 把 2026-04-09 已完成的运行时收口写回 current baseline：
- `onError` 已参与 failure branching
- `result` / `error` / `prevResult` 与 reaction bindings 已可用于 action expression evaluation
- `parallel` 已按 failure-class 处理 `cancelled` / `timedOut`
- `useHostScope` 已采用 snapshot replacement 并对 projected field 写入做 diagnostic failure
- spreadsheet host scope 已从 region `data` 注入切换为 DTO-style host scope projection

Exit criteria: 顶层和协议文档不再把这些项写成“未来收敛目标但当前未实现”。

**Phase 1 — 计划分流**

Targets: `docs/plans/42-frontend-programming-model-alignment-remediation-plan.md`, `docs/plans/44-semantic-lifecycle-entry-alignment-plan.md`

- 在 Plan 42 中移除已经完成的 runtime gap，把 remaining gap 重新收敛到 plan-level statement。
- 新建 `Semantic Lifecycle Entry` 专门计划，承接 form/page/dialog 的 author-visible lifecycle schema 收口。
- 对 Plan 40 保留 node identity 依赖引用，不在这里重复立项。

Exit criteria: Plan 42 只描述剩余的顶层对齐工作，semantic lifecycle 有明确 owner plan。

**Phase 2 — 日志与交叉引用闭环**

Targets: `docs/logs/2026/04-09.md`, related docs/plans

- 记录本轮 runtime/host-projection 修复、doc baseline 刷新、以及 semantic lifecycle 新计划建立。
- 在相关文档中补 cross-reference，避免后续再次依据旧计划重复审计已完成项。

Exit criteria: 代码、文档、计划、日志都指向同一个 current baseline。

## Validation Checklist

- [x] Plan 42 不再把 `Action Algebra` failure branching / branch-result bindings / host snapshot replacement 误写成未完成项
- [x] Plan 42 不再错误声称 `report-designer` / `spreadsheet` 缺本地 `ActionScope` boundary
- [x] semantic lifecycle remaining gap 被拆分到独立计划
- [ ] 相关 architecture / protocol docs 已补 current baseline 更新
- [ ] `docs/logs/2026/04-09.md` 已记录本轮收口与剩余工作
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Success Criteria

本计划刷新完成后，读者从 Plan 42 看到的应该是：

- 已完成的 runtime 对齐项被准确记录，而不是继续出现在未完成清单里
- 剩余的顶层差距被准确压缩到 semantic lifecycle schema 收口和少量文档更新
- 后续实现者可以直接跳到新的 semantic lifecycle 计划继续编码，而不是再次重复 runtime gap 审计
