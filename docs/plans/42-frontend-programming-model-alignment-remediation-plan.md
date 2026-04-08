# 42 顶层编程模型对齐修正计划

> Plan Status: completed
> Last Reviewed: 2026-04-08; drafted from code/doc audit on 2026-04-08
> Source: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/articles/flux-design-introduction.md`

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
- 当前主要未收口项集中在四个方向：
- `data-source` 发布合同仍偏 `id` / `dataPath` 兼容模型，尚未真正收敛到 `name` / `mergeToScope` / `statusPath`
- 多宿主 capability boundary 尚未完全一致，`report-designer` / `spreadsheet` 仍复用继承 `ActionScope`
- `ComponentHandleRegistry` 对 `componentName` 重名仍是覆盖式行为，没有落实 ambiguous error 语义
- 顶层解释性文档中有少量表述已经比当前实现更超前，需要补 current-vs-target 标记

## 与现有计划的关系

- `docs/plans/38-action-api-source-convergence-migration-plan.md` 已完成 action/api/source 主干收敛，但没有把 `data-source` 的 `name`-first 发布合同完整落到代码上。本计划只继续承接其剩余的发布/状态/兼容收口，不重开命名体系讨论。
- `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` 负责 root-binding dependency substrate。本计划不重复处理 dependency collector、normalized roots、row-scope invalidation。
- `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md` 已经承担 `TemplateNode` / `NodeInstance` / live `cid` / canonical `NodeLocator` 迁移。本计划不重写该主线，只把“顶层文档与当前实现仍有 node-instance 差距”记为依赖项，并在解释性文档里正确标注其状态。
- `docs/plans/12-action-scope-imports-and-component-invocation-plan.md` 已被后续 action-scope 文档和实现吸收；本计划只处理剩余的 boundary hardening，不回退到更早期的 action extension 讨论。

## Problem

- `packages/flux-core/src/types/schema.ts` 的 `BaseDataSourceSchema` 仍只有 `statusPath` / `dataPath` / `dependsOn` / `initialData` / `mergeStrategy` / `mergeKey`，没有把 `name` 和 `mergeToScope` 作为当前类型合同的一部分。
- `packages/flux-runtime/src/data-source-runtime.ts` 仍保留“无 `dataPath` 时对象自动 `scope.merge(...)`”的兼容行为，这与顶层编程模型中“隐式 merge 非规范”的结论不一致。
- `packages/flux-runtime/src/source-registry.ts` 和 `packages/flux-runtime/src/action-runtime.ts` 里的 source refresh / targeting 仍主要围绕 `id` 工作，没有建立 author-visible `name` first 的目标路径。
- `packages/report-designer-renderers/src/page-renderer.tsx` 与 `packages/spreadsheet-renderers/src/page-renderer.tsx` 当前是在继承 `ActionScope` 上直接 `registerNamespace(...)`，没有像 `packages/flow-designer-renderers/src/index.tsx` 那样声明本地 `actionScopePolicy: 'new'` 边界。
- `packages/flux-runtime/src/component-handle-registry.ts` 对 `componentName` 重名的处理仍接近 last-wins，开发态只打印 warning，没有形成文档要求的“ambiguous 是配置错误”的正式运行时语义。
- `docs/articles/flux-design-introduction.md` 中部分具体 runtime 叙述已经更接近目标态，例如 `data-source` 的命名发布、宿主边界纪律、某些 contract 的收敛表述；如果不补 current-vs-target 说明，会给后续实现和读者造成“代码已完全到位”的误判。

## Root Cause

- 顶层架构文档已经进入更明确的收敛阶段，但部分实现仍处于兼容迁移中，导致“normative target”和“current executable baseline”之间存在自然时间差。
- `data-source` 是从较早的 `dataPath` / `id` 兼容模型演化过来的，发布合同和 refresh targeting 的 author-visible 语义还没有完成最后一轮切换。
- 多宿主 renderer 的 capability boundary 是分批接入的，Flow Designer 已经走了局部新边界，而 Report/Spreadsheet 还停在较早的复用路径上。
- 解释性文档承担了“讲清设计意图”的职责，但少量地方把“目标方向”写得像“当前已完全落地”，缺少 current baseline 注解。

## Goals

- 让 `data-source` 的 author-visible 发布合同朝 `name` / `mergeToScope` / `statusPath` 收敛，并把旧 `dataPath` / `id` 明确降级为兼容路径。
- 去掉或显式诊断隐式 merge-to-scope 行为，不再让“未声明发布目标但对象被浅合并进 scope”继续作为默认路径存在。
- 统一复杂宿主的 `ActionScope` 边界，让 host-owned namespace provider 的词法可见性与顶层文档一致。
- 让 `componentName` 冲突变成显式的 resolution error，而不是隐式覆盖。
- 对解释性文档补齐 current-vs-target 标记，让架构原则、文章和实际执行状态之间不再形成误导性落差。

## Non-Goals

- 不重新讨论是否需要新增 primitive category。
- 不在本计划中替换表达式引擎或重写 dependency tracking substrate。
- 不在本计划中重新设计 action algebra 主模型。
- 不在本计划中接手 `TemplateNode` / `NodeInstance` 主迁移，该项继续由 Plan 40 负责。
- 不在本计划中推进 Flow/Report/Spreadsheet 的更高层 domain protocol 重构，除非它直接阻塞本计划定义的 capability boundary 收口。

## Scope

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-design-principles.md`
- `docs/articles/flux-design-introduction.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/logs/`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/flux-runtime/src/action-scope.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/useNodeImports.ts`
- `packages/flux-renderers-data/src/data-source-renderer.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- 相关测试文件和 representative examples

## 不在 Scope 内的事项

- `TemplateNode` / `NodeInstance` / live `cid` 的主体迁移
- root-binding dependency collector 继续实现
- form runtime / validation 体系重构
- complex host snapshot contract 的大规模扩展

## 执行策略

本计划采用“先分清哪些差距要改代码、哪些差距要改文档，再逐项收口”的策略，避免两个常见错误：

- 为了追求与文档字面一致，直接在一个阶段里同时重写 source runtime、host boundary、node identity
- 因为还没完成所有 target work，就长期放任 article/principles 把未来态描述成当前态

## Execution Plan

**Phase 0 — 基线冻结、差距归类与交叉计划切分**

Targets: target docs, `schema.ts`, `data-source-runtime.ts`, `component-handle-registry.ts`, host page renderers, related tests

- 把本次审查结论固化成三类事项：
- 必须在本计划中改代码的项：`data-source` 发布合同、隐式 merge、host `ActionScope` boundary、`componentName` ambiguity
- 必须在本计划中改文档的项：article/principles 中超前到会误导实现者的表述
- 继续委托给既有计划的项：`NodeInstance` / runtime identity 迁移
- 为当前行为补最小回归测试或夹具：
- `data-source` 无 `dataPath` 时对象自动 merge 到 scope
- duplicate `componentName` 当前被后注册实例覆盖
- `report-designer` / `spreadsheet` 当前使用继承的 `ActionScope`
- 锁定 owner：Plan 40 负责 node identity，本计划只负责顶层对齐与文档准确性，避免两个计划重复改同一块 runtime surface。

Exit criteria: 每个差距都有清晰 owner，且不会在实现阶段重新争论“这是文档问题还是代码问题”。

**Phase 1 — `data-source` 发布合同收敛**

Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/action-runtime.ts`, `docs/architecture/api-data-source.md`, related tests

- 在 `BaseDataSourceSchema` 中加入 `name?: string` 与 `mergeToScope?: boolean`，把它们提升为当前对外合同的一部分。
- 定义并接线统一的 published target 解析规则：
- 首选 `name`
- 兼容期允许 `dataPath`
- 仅在兼容路径上保留 `id` 级 targeting，不再把 `id` 当成新的 author-visible 首选语义
- 收紧 implicit merge 语义：
- 默认不再因为“返回值是对象且缺少 `dataPath`”就自动 `scope.merge(...)`
- 只有显式 `mergeToScope: true` 时才执行浅合并
- 对新 schema 不声明发布目标或错误使用 merge 语义的情况给出 structured diagnostic
- 接线 `statusPath` summary DTO 的第一版，至少覆盖 `loading` / `ready` / `stale` / `error` 基线字段。
- 为 refresh targeting 约定兼容策略：
- 文档与 authoring 示例优先使用 `name`
- runtime 在迁移期接受旧 `id` targeting，但不再把它描述成首选合同
- 明确 `mergeStrategy` / `mergeKey` 在新发布合同下的作用位置，避免它们继续只挂在 legacy `dataPath` 语义上。

Exit criteria: 新 schema 可以用 `name` + optional `mergeToScope` + optional `statusPath` 表达规范发布合同，旧 `dataPath` 行为被明确降级为兼容路径。

**Phase 2 — Capability Boundary Hardening**

Targets: `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `docs/architecture/action-scope-and-imports.md`, related tests

- 让 `report-designer` 和 `spreadsheet` 像 `designer-page` 一样拥有明确的本地 `ActionScope` boundary，而不是在继承 scope 上直接注册 namespace provider。
- 优先采用 renderer definition 层的 `actionScopePolicy: 'new'` 统一表达 host-owned boundary；如果短期无法直接切换，也必须在运行期显式建立同等语义的新边界，而不是继续复用父 scope。
- 把 `componentName` 冲突从“开发态 warning + 覆盖式注册”改为正式 resolution 结果：
- registry 能表达 `ambiguous`
- dispatcher 在 `component:<method>` 解析到重名目标时返回明确错误，而不是落到某个偶然实例
- 保留 `componentId` 作为稳定唯一定位锚点，继续优先于 `componentName`。
- 补齐多宿主页面与 dialog/fragment 渲染测试，确保 namespace shadowing 与 component targeting 都遵循词法边界，不再依赖渲染顺序或注册覆盖顺序。

Exit criteria: 多宿主 capability visibility 与目标文档一致，`componentName` 冲突不再 silently resolve。

**Phase 3 — 文档准确性与 current-vs-target 标记收敛**

Targets: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/articles/flux-design-introduction.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-scope-and-imports.md`

- 保持 `frontend-programming-model.md` 作为 normative architecture，不为迁就当前代码而回退其结论；只在需要时补更明确的 compatibility note，确保读者能区分“规范目标”和“当前仓库仍在兼容过渡”。
- 对 `flux-design-principles.md` 做两类清理：
- 保留原则级语言，不把尚未落地的具体 runtime 合同写成既成事实
- 若某条原则引用了当前实现细节，则补充“当前 baseline / convergence target”说明
- 对 `flux-design-introduction.md` 做更严格的 current-vs-target 标记，尤其是：
- `data-source` 的 `name` / `mergeToScope` / `statusPath`
- 多宿主 action boundary 的一致性
- Node identity / `NodeInstance` 仍在 Plan 40 迁移中
- 如 `Reaction` comparator 仍保持 `Object.is`，文章中涉及 watcher equality 的段落要显式说明当前 baseline，而不是只写理想态
- 统一文档中的语气：
- 原则文档可以描述 why
- architecture 文档定义 must
- article 负责解释设计，但不得把未落地目标伪装成“当前仓库已经如此实现”

Exit criteria: 读者从三份顶层文档中读到的是同一个架构方向，并且能分辨哪些已经实现、哪些仍在收敛。

**Phase 4 — 示例、验证与计划闭环**

Targets: representative examples, affected tests, `docs/logs/`, plan cross-references

- 更新 playground / docs examples 中与 `data-source` 和 namespaced host action 相关的代表性示例，避免继续示范非规范 implicit merge 或依赖继承 `ActionScope` 的宿主接线方式。
- 跑完整验证：`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`。
- 更新 `docs/logs/`，记录：
- 为什么要继续执行这轮对齐
- 哪些差距已经通过本计划解决
- 哪些仍委托给 Plan 40 或其他既有计划
- 在相关既有计划中补交叉引用，防止 Plan 38 / 40 和本计划长期并存却没有职责说明。

Exit criteria: 代码、文档、示例和计划引用关系都指向同一个收敛方向。

## Validation Checklist

- [x] `BaseDataSourceSchema` 暴露 `name` 和 `mergeToScope`
- [x] `data-source` 默认不再隐式 merge object 到 scope
- [x] `mergeToScope: true` 成为唯一的显式浅合并扩展
- [x] `statusPath` 有可观察的第一版 summary DTO
- [x] author-visible 示例优先使用 `name`，`dataPath` 被明确标记为 compatibility-only
- [x] `refreshSource` 的文档与 runtime targeting 语义一致
- [x] `report-designer` 和 `spreadsheet` 具备明确本地 `ActionScope` boundary
- [x] duplicate `componentName` 触发 ambiguous resolution，而不是覆盖式成功解析
- [x] `frontend-programming-model.md`、`flux-design-principles.md`、`flux-design-introduction.md` 对 current-vs-target 的表述一致
- [x] 与 node identity 相关的剩余差距被明确交给 Plan 40，而不是在本计划里重复立项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Success Criteria

本计划完成后，顶层审查的结论应从“核心方向对，但还有几个显著兼容态差距”收敛到：

- 顶层编程模型中的 `Resource` 发布合同与当前代码不再明显脱节
- capability lexical boundary 在复杂宿主中具备一致实现
- component targeting 的错误语义不再依赖隐式覆盖
- 解释性文档不再把未来态描述成当前态

剩余未完成的顶层差距，如果仍存在，必须已经被明确地归档到既有计划中，而不是留在“大家都知道还没做但没有 owner”的灰色地带。
