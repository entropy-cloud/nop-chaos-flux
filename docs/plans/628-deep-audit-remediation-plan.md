# 628 Deep-Audit Four-Track Remediation Plan（全仓缺口与技术债修正）

> Plan Status: active
> Last Reviewed: 2026-10-17
> Source: 2026-10-17 四轨深度审查（核心管线架构 / 渲染器体系 / 测试工程化 / 项目定位），全部发现已逐条对照 live repo 核实；`docs/analysis/2026-10-16-deep-audit-report.md`（前次审计，其 findings 已由 plans 622-627 收口，本计划不重复）
> Related: `docs/plans/622-owner-doc-drift-remediation-plan.md`（completed）、`docs/plans/623-e2e-skip-governance-plan.md`（completed）、`docs/plans/624-package-manifest-baseline-hygiene-plan.md`（completed）、`docs/plans/625-plan-status-machine-maintenance-plan.md`（completed）、`docs/plans/626-scanner-ratchet-stringify-equality-plan.md`（completed）、`docs/plans/627-loop-closing-consistency-plan.md`（completed）、`docs/plans/621-xlang-debug-editor-assembly-plan.md`（active，并发会话领地——本计划排除 xlang 域）、`docs/backlog/cross-roadmap-remediation-roadmap.md`（UR-1~UR-20，源自在册 roadmap 盘点，与本计划发现集不重叠）

## Purpose

把四轨深度审查确认的全部可修正缺口与技术债收口到可验证的终态：验证门禁基线恢复可信、核心运行时的三处结构性类型债清偿、schema 编译获得跨实例缓存、文档自认的功能缺口全部落地或显式裁定、静态债存量完成全量 triage 并实质收缩、维护者交接路径可用。每项工作结束时仓库里必须有可直接观测的结果（测试、基线 JSON、文档状态行），不允许停留在"已登记待办"。

## Current Baseline

以下事实均已于 2026-10-17 在 live repo 实测核对。

### A. 核心架构类型债

- 分层真实成立：flux-runtime 及以下五包源码 grep `from 'react'` 零命中；package.json 依赖严格单向。
- 失败态用类型伪造：`packages/flux-react/src/schema-renderer.tsx:229-265` 三处（RendererRuntime / PageRuntime / SurfaceRuntime）以 `undefined as unknown as ...` 建模创建失败，下游靠 `creationErrorRef` 旁路判空，类型系统失明。
- 公共 API 残留 any：`packages/flux-core/src/types/runtime.ts:590` `renderSurface: (surface: SurfaceEntry) => any`。
- flux-react `as unknown as` 双重断言 19 处（2026-10-17 grep 实测；口径：src 业务源码 15 处 + test-support 3 处 + 构建产物 d.ts 1 处）。
- 边界小毛病：`packages/flux-react/src/test-support-runtime.tsx:12` 公开入口引用 devDep `@nop-chaos/flux-compiler`；`packages/flux-runtime/src/action-adapter.ts:27` 引 `@nop-chaos/flux-i18n`（后者声明 react/react-i18next peerDeps，使 React-free 层产生传递耦合）；依赖集归一化在 `packages/flux-react/src/hook-subscriptions.ts:41-83`（`createScopeDependencySet`）与 `packages/flux-runtime/src/scope-change.ts:96-116`（`createRootDependencySet`）双层各写一份。
- 宽门面：`packages/flux-core/src/types/renderer-core.ts:242-404` `RendererRuntime` 约 47 个顶层成员横跨九类职责；`packages/flux-core/src/types/runtime.ts:534-578` `FormRuntime` 约 40 成员；组装代价体现为 `packages/flux-runtime/src/runtime-factory.ts` 670 行。
- schema 编译产物无跨实例缓存：`packages/flux-runtime/src/runtime-factory.ts` compile 为纯转发；`packages/flux-react/src/schema-renderer.tsx:72-133` 仅组件实例内 `useMemo`，卸载重挂即全量重编译（公式层已有 LRU+epoch 先例：`packages/flux-formula/src/compile/formula-compiler.ts:89-140`）。

### B. 验证基线现状（2026-10-17 实测 / docs/logs/2026/10-16.md、10-17.md）

- 单元测试：2026-10-16 全绿（16,557 passed / 1,802 文件 / 0 FAIL）。
- typecheck 80/82：唯一红 = playground `vite.config` 既有红（10-16 log stash 对照确认，归本计划修复）。
- test 80/82 任务：唯一红 = playground 4 项（归因并发会话 db67dba02 / plan 621 收口流程——外部依赖，不属本计划修复面）。
- e2e：--list 1,871 项；最后一次 0 failed 全量 sweep 为 2026-10-05（串行口径 1671 passed / 0 failed，"串行口径为零噪声定门"，docs/logs/2026/10-05.md:28）；此后两次全量衰减——10-07 run2 4 基线 failed（10-07.md:115）、10-09 13 failed（其中 10 项 stash 对照确认为基线既有红）；10-10 起多批收口均未复跑全量 e2e——**距最后一次全绿约 12 天，当前存在未清基线红**。
- perf 阈值测试：gantt scroll/drag + kanban drag 共 3 项已按 plan 623 标记 `@watch-only`（50Hz 环境不可达 60Hz 阈值假设）；**scada-editor-perf 3 项（:170/:188/:201）未裁决**，且 DV 台账原 scada ×2 residual 名称在全部测试源零命中（记录失效），已按 inventory-drift 披露并登记待独立裁决（docs/logs/2026/10-17.md）。

### C. 静态债存量（ratchet 已保证不增，存量待收缩；scripts/baselines/ 2026-10-17 实测）

- `knip-baseline.json`：949 条（构成：20 files + 344 exports + 567 types + 18 devDeps；另有 35 unlisted 为 counts 元数据、无条目清单）。
- `scanner-baselines.json`：七类合计 2,093 条（audit-suspects 723 / react19 候选 650 / async 无失败路径 330 / styling 240 / test-global-leaks 108 / as-any 41 / todo-exitless 1）。
- `duplicates-baseline.json`：597 克隆 / 2.99%（阈值 8%；注记显示 ratio-only 门禁曾漏检 +31% 增长）。
- 超大文件：非测试源码 >500 行 103 个、含测试共 210 个（wc -l 实测）；>700 行仅 2 个已注册豁免（flux-i18n 两个 ~2,070 行 locale 数据文件）。逼近 700 上限的运行时文件：`form-store.ts` 691、`form-runtime-owner.ts` 684、`runtime-factory.ts` 670、`action-adapter.ts` 668、`action-execution.ts` 666、`form-runtime.ts` 649。
- 测试薄弱包：`flux-xlang-debug`（17 源/5 测试——xlang 领地，仅登记）、`spreadsheet-renderers`（50/28）、`editor-core`（2 测试）、`flux-bundle`、`flux-i18n`、`theme-tokens`（后三者为数据/打包薄壳包，无核心逻辑测试）。
- 结构不一致：`packages/flux-compiler/src/` 根目录散置 30+ 个 `*.test.ts`，未按全仓约定归入 `__tests__/`。

### D. 文档自认的功能缺口（均有 owner-doc 原文，非推测）

- 错误处理 5 缺口（`flux-guide/15-error-handling.md`「已知缺口」节）：① `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 在 SchemaRenderer strict 路径被 continueOnError 强制覆盖、事实上无效；② `reportActionError` 对 onActionError 钩子自失败空 catch、无遥测；③ onSettled 子链 throw 不 notify、终端用户静默；④ 渲染期 throw 仅 console.error、不上报 `monitor.onError`；⑤ `reportUnhandledFailureClass` 合成事件名单硬编码。
- Monitor 事件缺口（`docs/architecture/flux-monitor.md`「已知缺口」节）：`navigate` 等事件类型未纳入 MonitorEvent。
- Surface 生命周期两段 `planned, not yet implemented`（`docs/architecture/surface-lifecycle-callbacks.md`「Single-Form Default」「Multi-Form Validation」）：依赖 schema validator（flux 当前无 runtime schema validator，见同文实现依赖说明）。
- 移动端基础设施（`docs/architecture/mobile-responsive-baseline.md`「辅助类」）：`nop-safe-top/bottom/left/right` 四类标注"实现状态：todo（M0.1a），当前代码库尚未实现"。
- i18n 运行时翻译：远程/动态 schema 字符串翻译 runtime 未实现（`docs/architecture/frontend-programming-model.md` DESIGN-ACK 标注）。
- Picker 多选标签 UI 未落地（`flux-guide/09-amis-migration.md` Deferred 标注）。
- 文档-实现失配：`packages/ui/package.json` description 写 "Radix + Tailwind"，实际依赖 `@base-ui/react`（grep 实测）。
- 包卫生：`packages/flux-renderers-form-advanced/` 下存在 `node_modules` 与 `src/node_modules` 残留目录（find 实测）。
- taskflow 设计器：fork 类型在 live adapter 未实现、导入显式拒绝；步骤类型清单大量 not-yet-implemented（`docs/architecture/taskflow-visual-designer.md`）。
- designer 家族 View 模式全线未实现（`docs/architecture/designer-view-vs-edit.md`：Flow ❌、Report/Word ❌或部分）。

### E. 领地与在途边界

- xlang 域（plans 616-621、`packages/flux-xlang-*`）：并发会话领地（plan 621 active），本计划全程排除。
- `docs/backlog/cross-roadmap-remediation-roadmap.md`（UR-1~UR-20）：今天由在册 roadmap 盘点产出，明确将"plan 层在途项"留在 plan 生命周期——本计划 Phase 1 据此认领 scada-editor-perf ×3 裁决（UR 表不收录、现有 plan 又无 owner，属无主项）。
- AI 子系统 ~40 条 bug 记录（docs/bugs/ 121-159 族）为已修复归档记录，不是 open debt，本计划不处理。

## Goals

- 验证门禁恢复可信：playground typecheck 红清零、scada-editor-perf ×3 每项有终态裁决、e2e 全量 sweep 重跑并落档，之后所有非绿项均处于"已修复"或"已注册（带理由）"二态之一。
- 清偿三处结构性类型债：失败态改判别联合建模、公共 API any 清零、test-support/i18n/依赖归一化三处边界毛病收敛。
- `RendererRuntime` / `FormRuntime` 拆为窄能力接口组合（类型兼容、消费方零破坏），`runtime-factory.ts` 降到 500 行 WARN 线以下。
- schema 编译产物获得跨实例缓存（身份键 + epoch 失效 + 容量上限），卸载重挂不再全量重编译，有判别性测试钉死。
- D 节所列有界功能缺口全部落地；roadmap 级缺口（taskflow 步骤类型、designer View 模式、mobile 组件扩展、AMIS 兼容层）显式移交 successor 所有权，不悬空。
- 静态债完成全量 triage：knip 949 / scanner 2,093 / duplicates 597 每条落到 removed / confirmed-keep(reason) / false-positive 三态之一，基线实质收缩且 ratchet 收紧到新值。
- 产出维护者交接包并以 fresh-agent 独立执行 canned 任务作为文档自足性证明。

## Non-Goals

- 不做 xlang 域任何改动（并发会话领地，plan 621 active）。
- 不做 UR-1~UR-20 队列项（另一条 remediation 轨道，发现集不同；两队列执行时的门禁竞争由执行会话协调）。
- 不做 designer View 模式、taskflow 步骤类型补齐、mobile 组件扩展、AMIS schema 兼容层本身——这些是 roadmap 级 feature 开发，本计划只负责把它们的 successor 所有权与入口登记清楚（见 Deferred But Adjudicated）。
- 不解决 bus factor 的组织面（招人/社区建设/生产案例）——非代码债，无法由 plan 收口。
- 不追求"每一个 WARN 文件必须拆完"： oversized 治理以 top 热点拆分 + 其余逐个 triage 注册为标准，WARN 线本身是 advisory。

## Scope（必填节）

### In Scope

- apps/playground vite.config typecheck 红；scada-editor-perf ×3 裁决；perf 阈值环境假设改造；e2e 全量 sweep 重跑落档。
- flux-core / flux-react / flux-runtime 的类型债与边界毛病（A 节全项）。
- RendererRuntime / FormRuntime 接口拆分 + runtime-factory 按域拆装（含 Protected Area 人闸）。
- schema 编译跨实例缓存（flux-runtime + flux-react 接线）。
- D 节有界缺口：错误处理 5 项、Monitor 事件、surface lifecycle 两段、safe-area 四类、i18n 运行时翻译、Picker 多选标签、ui description、form-advanced node_modules 残留、flux-compiler 测试归位。
- 三份静态债基线全量 triage 与收缩；超大文件 top 热点拆分；薄弱测试包 triage/补测。
- 维护者交接包（docs）与 owner-doc 一致性收口核对。

### Out Of Scope

- xlang 域全部内容（E 节）。
- UR-1~UR-20 队列。
- roadmap 级 feature（见 Non-Goals）。
- playground 4 项 test 红（归 plan 621 收口流程，本计划只在 621 关闭后复跑确认）。

## Failure Paths

| 可测场景编号 | 触发                                                              | 行为（含错误表现）                                                                           | 可重试             | 用户可见表现       |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| FP-1         | runtime/page/surface 创建失败                                     | 新判别联合返回 `{ ok: false, error }`；根边界渲染错误卡片 + retry；不再产生伪造 undefined 值 | 是（retry 重创建） | 错误卡片，非白屏   |
| FP-2         | registry 变更后命中编译缓存                                       | epoch 不匹配即失效重编译                                                                     | 自动               | 无感               |
| FP-3         | 编译缓存超容量                                                    | LRU 逐出最旧条目                                                                             | 自动               | 无感               |
| FP-4         | strict 模式 + schema 诊断 + `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` | 编译转失败、渲染阻断并输出诊断（缺口①修复后开关生效）                                        | 否（schema 缺陷）  | 阻断 + 诊断信息    |
| FP-5         | onActionError / onSettled 回调自失败                              | console.error + monitor 上报一次（WeakSet 防重复），不再静默                                 | 否                 | 错误通知一次       |
| FP-6         | 渲染期节点 throw                                                  | NodeErrorBoundary 兜底外，同步上报 `monitor.onError({ phase: 'render' })`                    | 是（节点级 retry） | 节点级 fallback UI |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——本计划触及公共契约（RendererRuntime 拆分）、运行时核心路径（编译缓存、失败态）、错误处理语义。凡"行为不变/兼容"声称必须点名判别性测试（旧实现必挂、新实现通过，并注明判别机制）；Proof 项在对应 Fix 项之前。

## Execution Plan

### Phase 1 - 验证基线恢复

Status: planned
Targets: `apps/playground/vite.config.*`、`tests/e2e/*perf*`、`playwright.config.ts`、`docs/context/project-context.md`、`docs/logs/2026/`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] Proof: 实跑取证当前全部非绿项清单（playground typecheck 红、scada ×3、watch-only ×3、playground 4 test），结果存 `docs/logs/`，作为本 Phase 的 before 快照
- [ ] Fix: playground `vite.config` typecheck 红修复——根因为 xlang 616/617 alias 增长（docs/logs/2026/10-16.md:197），与 active 的 plan 621 同域相邻：**先与 621 会话协调归属**（621 若先行收口则由其顺带修复，本项转复验；否则本计划在协调窗口内修复）
- [ ] Fix: scada-editor-perf ×3（:170/:188/:201）逐项独立裁决——可修复则修，环境/阈值不可达则按 plan 623 同款标 `@watch-only` 并附理由；同时修正 project-context 台账中已失效的 scada ×2 residual 名称记录
- [ ] Decision + Fix: perf 阈值测试的 60Hz 环境假设改造——改为"先实测环境帧预算、再断言相对比值"的相对度量，或显式注册为专属硬件门禁；三处 watch-only 阈值同步改造，改造后至少一项能在普通环境解除 watch-only
- [ ] Proof: 全量 e2e sweep 一次，结果（含每个非绿项的终态归属）记入 `docs/logs/`
- [ ] Follow-up: playground 4 项 test 红依赖 plan 621 收口——621 关闭后复跑确认并在此勾选（外部依赖项，不得静默）

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-playground typecheck` 通过（或 vite.config 红项根因登记+修复落地，typecheck 恢复 82/82）
- [ ] scada-editor-perf 每项在 plan 文本与 project-context 台账中均有终态标注（fixed / watch-only+理由）
- [ ] e2e sweep 记录在案；除 watch-only 与 621 领地项外零未注册红
- [ ] 后续 Phase 的验证命令在恢复后的门禁基线上可信任执行

### Phase 2 - 失败态类型建模与边界收敛

Status: planned
Targets: `packages/flux-react/src/schema-renderer.tsx`、`packages/flux-core/src/types/runtime.ts`、`packages/flux-react/src/test-support-runtime.tsx`、`packages/flux-runtime/src/action-adapter.ts`、`packages/flux-react/src/hook-subscriptions.ts`、`packages/flux-runtime/src/scope-change.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] Proof: 判别性测试——runtime/page/surface 创建失败路径断言返回判别联合 `{ ok: false, error }` 而非 undefined 值；注明判别机制（旧实现返回 `undefined as unknown as T`，`'ok' in result` 断言在旧实现必挂）
- [ ] Fix: `schema-renderer.tsx:229-265` 三处伪造失败态改为判别联合（内部类型即可，不强制改 RendererComponentProps 公共面），删除 `creationErrorRef` 旁路判空并同步改写其全部消费点（:270/:282/:308/:464 附近），FP-1 行为落地
- [ ] Fix: `runtime.ts:590` `renderSurface` 返回类型 `any` → 精确类型（`void` 或宿主渲染结果类型，以实际消费为准）
- [ ] Decision + Fix: test-support 公开入口依赖 devDep——将编译期依赖移出公开导出面（惰性注入或拆 dev-only 子入口），或把 flux-compiler 在消费语义上提升为直接依赖；择一并记录理由
- [ ] Decision + Fix: flux-i18n React 传递耦合——拆出 React-free `t()` 纯入口供 runtime 层使用，或 i18n 包移除 react peerDeps（React 绑定移入独立子入口）；择一并记录理由
- [ ] Fix: 依赖集归一化收敛到 flux-runtime 单实现，flux-react 转出口；grep 证明单一来源

Exit Criteria:

- [ ] 判别性测试通过且在旧实现下必挂（测试注释说明判别机制）
- [ ] flux-react src 业务源码 `as unknown as` 从 15 处降至仅剩逐处注释理由的残余（目标 0，允许≤3 处带理由注册；口径：非测试 src，不含 test-support 与 dist）
- [ ] `grep -rn "renderSurface" packages/flux-core/src/types/` 无 any 返回类型
- [ ] 依赖归一化单实现成立：`grep -rn "createScopeDependencySet\|createRootDependencySet" packages` 仅命中一个定义点
- [ ] focused 单测全绿；`docs/architecture/renderer-runtime.md` 失败路径小节与实现一致

### Phase 3 - RendererRuntime / FormRuntime 宽门面拆分

Status: planned
Targets: `packages/flux-core/src/types/renderer-core.ts`、`packages/flux-core/src/types/runtime.ts`、`packages/flux-runtime/src/runtime-factory.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision: 拆分设计稿——`RendererRuntime` 按现有九类职责组合为窄接口（编译 / scope 工厂 / action 派发 / imports / dataSource / reaction / form / surface / diagnostics），`FormRuntime` 同理；兼容策略：`RendererRuntime extends CompileSurface, ScopeFactories, ...` 接口继承组合，消费方类型引用零改动
- [ ] 【人闸】设计稿经 owner 确认后方可改动 flux-core 公共导出面（Protected Area：公共导出面变更需 plan + owner 确认；本 plan 即依据，但接口形状本身需 owner 过目）
- [ ] Fix: 接口组合落地（flux-core types）；`runtime-factory.ts` 按域拆为独立组装模块，主文件目标 ≤500 行（WARN 线）
- [ ] Proof: 判别性测试——工厂产物逐接口断言能力面完整（每个窄接口的全部成员存在且类型正确）；判别机制为**类型级**：旧单接口布局下对窄接口的 `implements`/assignable 断言无法通过编译，新布局下通过（以独立类型测试文件固化）；"消费方零破坏"以全仓渲染器包 typecheck + 既有 runtime/react 套件双背书

Exit Criteria:

- [ ] `renderer-core.ts` 中 `RendererRuntime` 声明体仅由接口组合构成，每个窄接口单一职责且成员数可数（文件内可见）
- [ ] 全仓 `packages/flux-renderers-*` 对 runtime 类型的 import 面不变（typecheck 全绿即证）
- [ ] `wc -l packages/flux-runtime/src/runtime-factory.ts` ≤500（或差额注册豁免并附拆分计划）
- [ ] `docs/architecture/flux-core.md` 与 `docs/references/quick-reference.md` 的 runtime 接口组织章节更新为最终状态

### Phase 4 - schema 编译产物跨实例缓存

Status: planned
Targets: `packages/flux-runtime/src/runtime-factory.ts`、`packages/flux-react/src/schema-renderer.tsx`

- Item Types: `Decision | Fix | Proof`

- [ ] Proof: 判别性测试——同一 schema 对象卸载重挂场景以 compile 调用计数器断言：现实现计数 2、缓存实现计数 1；注明判别机制（现实现每次挂载全量重编译）
- [ ] Decision: 缓存键与失效策略——schema 对象身份 + registry 快照 epoch（复用 `flux-formula/src/compile/formula-compiler.ts` 的 epoch 模式）+ 容量上限 LRU；**前置验证**：RendererRegistry 是否已有等价 snapshot/version 机制——若无，先以最小 snapshot 能力补齐 flux-core registry（工作量显式纳入本 Phase，不得依赖不存在的工具）；strict-validation 诊断路径与缓存的交互显式定义（FP-4 语义不受缓存影响）
- [ ] Fix: 实现 + 接线到工厂 compile 入口；epoch 失效与 LRU 逐出各有测试（FP-2/FP-3）
- [ ] Fix: tab 切换 / 列表-详情往返场景的组件级测试（或纳入既有 e2e 复刻页断言 compile 计数）

Exit Criteria:

- [ ] 判别性测试通过且旧实现下必挂
- [ ] epoch 失效、LRU 逐出、strict 诊断交互三类场景各有 focused 测试
- [ ] `docs/architecture/flux-core.md` 编译缓存小节（策略、上限、失效条件）与实现一致

### Phase 5 - 有界功能缺口收口

Status: planned
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`、`packages/flux-react/src/node-error-boundary.tsx`、`packages/flux-react/src/schema-renderer.tsx`（strict 路径）、`packages/flux-core`（schema validator 最小件）、`packages/ui`、`packages/flux-renderers-data`（picker）、`packages/flux-compiler/src/__tests__/`、`flux-guide/15-error-handling.md`、`docs/architecture/flux-monitor.md`、`docs/architecture/surface-lifecycle-callbacks.md`、`docs/architecture/mobile-responsive-baseline.md`、`docs/architecture/frontend-programming-model.md`、`flux-guide/09-amis-migration.md`、`packages/ui/package.json`、`packages/flux-renderers-form-advanced/`

- Item Types: `Fix | Decision | Proof`

错误处理五缺口（`Proof+Fix` 为同项内 Proof 先行——先落判别性测试，再落实现）：

- [ ] Proof+Fix 缺口①：`__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 在 SchemaRenderer strict 路径生效（continueOnError 不再强制覆盖该开关）；测试断言开关开启时诊断导致渲染失败（FP-4）
- [ ] Proof+Fix 缺口②：`reportActionError` 对 onActionError 自失败改为 console.error + monitor 上报（FP-5）；测试断言钩子 throw 不再静默
- [ ] Proof+Fix 缺口③：onSettled 子链 throw 补 notify；测试断言终端用户可见错误一次
- [ ] Proof+Fix 缺口④：渲染期 throw 上报 `monitor.onError({ phase: 'render' })`（FP-6）；测试断言 monitor 收到事件
- [ ] Proof+Fix 缺口⑤：`reportUnhandledFailureClass` 合成事件名单数据化（可注册扩展）；测试断言新增合成事件可注册
- [ ] Fix: `flux-guide/15-error-handling.md`「已知缺口」节重写为收口后状态

Monitor 与 surface lifecycle：

- [ ] Fix: `flux-monitor.md`「已知缺口」节所列事件（navigate 等）纳入 MonitorEvent 并有分发测试；文档缺口清单清空
- [ ] Proof+Fix: surface lifecycle 两段 planned 项（Single-Form Default / Multi-Form Validation）落地最小编译期校验（与现有 schema 校验同层），或执行中证明需完整 validator 时就地转 Deferred 并记入 Deferred But Adjudicated；两段文档状态行同步
- [ ] Proof: 上述每项至少 1 个 focused 测试

移动端与 i18n、Picker：

- [ ] Fix: `nop-safe-top/bottom/left/right` 四辅助类落地 `@nop-chaos/ui`（含 CSS 变量注入与测试）；`mobile-responsive-baseline.md` todo 标注回写
- [ ] Decision + Fix: 远程/动态 schema 字符串的运行时翻译通道最小实现（`frontend-programming-model.md` DESIGN-ACK 项）；若设计量超出最小实现，就地转 Deferred + successor
- [ ] Fix: Picker 多选标签 UI 落地（`flux-guide/09-amis-migration.md` Deferred 项），组件测试覆盖；迁移指南行回写

卫生杂项：

- [ ] Fix: `packages/ui/package.json` description 改为 Base UI 事实描述
- [ ] Fix: 删除 form-advanced `node_modules`/`src/node_modules` 残留；manifest 卫生检查增加嵌套 node_modules 判据（若 624 的检查未覆盖）
- [ ] Fix: `packages/flux-compiler/src/` 根目录 `*.test.ts` 全部移入 `src/__tests__/`（纯移动，不改断言；import 路径同步修正）

Exit Criteria:

- [ ] `flux-guide/15-error-handling.md` 已知缺口五项全部收口，五缺口各有判别性测试，文档节与实现一致
- [ ] monitor 事件缺口清空且文档回写
- [ ] surface lifecycle 两段有终态（实现落地 + 状态行更新，或 Deferred 记账）；文档无残留 "planned, not yet implemented" 指本计划范围项
- [ ] safe-area 四类在 ui 包存在且有测试；基线文档无 "尚未实现" 标注
- [ ] Picker 多选标签有组件测试；i18n 运行时翻译有终态（实现或 Deferred 记账）
- [ ] `find packages -name node_modules -not -path '*/node_modules/*'` 零命中；ui description 无 "Radix" 字样
- [ ] `ls packages/flux-compiler/src/__tests__/` 包含全部测试文件，src 根目录无散置 `*.test.ts`

### Phase 6 - 静态债存量 triage 与收缩

Status: planned
Targets: `scripts/baselines/knip-baseline.json`、`scripts/baselines/scanner-baselines.json`、`scripts/baselines/duplicates-baseline.json`、`scripts/check-oversized-code-files.mjs`、`packages/flux-runtime/src/`、`packages/flux-action-core/src/`、测试薄弱包

- Item Types: `Fix | Proof`

- [ ] knip 949 条全量 triage：每条落到 removed（删代码）/ confirmed-keep（附一条 reason）/ false-positive（上游误报，向 knip 配置修正）三态；基线收缩至 triage 残余并收紧 ratchet
- [ ] scanner 七类 2,093 条分批 triage（按 723/650/330/240/108/41/1 逐类收敛）：修复或 confirmed-keep(reason)；**批次节奏与 knip removed 同款：单批 ≤50 条、每批全量 typecheck+test+冒烟后提交**；ratchet 只减不增（硬约束，不得放松）
- [ ] duplicates 597 簇（2.99%）：top 簇消重，目标 ≤2.5%；残簇每簇一条 reason
- [ ] 超大文件：A 节所列 6 个 650+ 行运行时文件中未被 Phase 3 覆盖者（form-store 691、form-runtime-owner 684、action-adapter 668、action-execution 666、form-runtime 649）按职责拆分或注册豁免；103 个非测试 >500 行文件的其余项逐个 triage（拆分/注册二态）
- [ ] 薄弱测试包 triage：`spreadsheet-renderers`、`editor-core`、`flux-bundle`、`flux-i18n`、`theme-tokens`（`flux-xlang-debug` 属领地外，仅登记）——核心逻辑包补测（优先公共导出行为），纯数据/薄壳包在包 README 注册 data-only 说明

Exit Criteria:

- [ ] 三份基线 JSON 数值严格低于 2026-10-17 值，且每条残余可追溯到三态之一（JSON 注记或随附 triage 文档）
- [ ] 三个基线子门禁 `check:knip-baseline` / `check:scanner-baselines` / `check:duplicates-baseline` 在收缩后数值上 exit 0，基线 header `lastUpdated` 同步
- [ ] 6 个 650+ 文件无一处于"超线且未注册"状态；>700 行保持仅 2 个已注册 locale
- [ ] 薄弱包无一处于"无测试且未注册"状态（README 或测试文件为证）

### Phase 7 - 交接包与一致性收口

Status: planned
Targets: `docs/context/`、`docs/index.md`、`docs/logs/2026/`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision: 维护者交接包——`docs/context/` 增加 maintainer-handover 文档：新会话/新人首日路径、top-20 高频修改的 how-to 索引（加 renderer / 加 action / 改类型 / 跑门禁 / 读基线）、领地与在途 plan 地图
- [ ] Proof: fresh sub-agent 仅凭 docs 完成一个 canned 任务（在 playground 增加一个最小 demo renderer 并通过门禁），全程无人工上下文注入——记录为文档自足性证据
- [ ] Fix: 收口前全仓 owner-doc 交叉核对一轮（复用 plan 622 方法），本计划各 Phase 产生的漂移清零

Exit Criteria:

- [ ] 交接包文档存在且 Proof 记录在案（daily log 或 plan 内）
- [ ] owner-doc 交叉核对零新漂移（核对记录在案）

## Draft Review Record

- Reviewer / Agent: agent_569001ac（fresh session，独立审查子代理）
- Verdict: pass（R3，0B/0M；R1/R2 两轮 fail 的唯一 Major 为 B 节 e2e 全绿锚点声称，经两次修订后收敛）
- Rounds: R3（R1 fail 0B/1M/8m → 全量修订 → R2 fail 0B/1M（锚点被 10-05.md:28 推翻）→ 二次修订 → R3 pass；审查者 R3 一行理由：B 节五要件逐项与日志证据吻合，"最后一次 0 failed 全量 sweep = 2026-10-05"在其补扫的 10-05→10-17 全区间无反例）
- Findings addressed: **R1 fail（0B/1M/8m）**——M1「严格全绿基线停留在 2026-08-09」不成立（09-01.md:5 有 1456/0/0 flaky 严格全绿、09-19.md:43 有 1475/0 全量 0 failed）；8 条 Minor 全部吸收。**R2 fail（0B/1M）**——R2 复核确认 8 Minor 修复到位且未引入新不实声称，但 M1 修订句锚点仍错：10-05.md:28 存在全量串行 1671/0（晚于 09-19），10-07.md:115 另有全量 run2——已按正确锚点二次改写 B 节（最后一次 0 failed 全量 sweep = 2026-10-05 串行 1671/0；衰减 10-07 4 基线 failed → 10-09 13 failed；10-10 起未复跑，距最后全绿约 12 天）。R1 Minor 吸收明细：renderer-core.ts 尾界改 :404（47 成员）；knip 949 构成口径注明（unlisted 为元数据）；`as unknown as` 计数口径拆分（src 业务 15/test-support 3/dist 1）并同步 Phase 2 Exit；Phase 6 全链 `pnpm check` 降为三个基线子门禁（全链留在 Closure Gates）；vite.config 红标注根因（xlang alias 增长，10-16.md:197）并加 621 协调归属；Phase 4 Decision 增 registry snapshot 机制前置验证；Phase 6 scanner 增单批 ≤50 批次节奏；Phase 5 注明 Proof+Fix 同项内先行语义；Phase 2 增 creationErrorRef 消费点（:270/:282/:308/:464）改写；Phase 3 判别机制改为类型级（窄接口 assignable 断言旧布局下无法编译）

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（A/B/D 节全部项有终态）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（类型伪造、公共 API any、文档-实现失配）
- [ ] 行为/契约结果已达成（Phase 1-7 Exit Criteria 全勾）
- [ ] 必要 focused verification 已完成（判别性测试全部"旧实现必挂"验证）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步（flux-core.md、renderer-runtime.md、quick-reference.md、15-error-handling.md、flux-monitor.md、surface-lifecycle-callbacks.md、mobile-responsive-baseline.md、frontend-programming-model.md、09-amis-migration.md、project-context.md）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零未注册红）

## Deferred But Adjudicated

### designer View 模式（Flow ❌ / Report、Word ❌或部分）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 级 feature 开发（designer-view-vs-edit.md 明确 ❌ 清单），closure 单元独立于运行时债；本计划只登记所有权
- Successor Required: `yes`
- Successor Path: `docs/plans/629-designer-view-mode-plan.md`（待建档，scope 以 designer-view-vs-edit.md ❌ 清单为基线）

### taskflow fork 类型与未实现步骤类型

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 文档化的 feature backlog（taskflow-visual-designer.md 明示 not-yet-implemented 与导入拒绝语义），非 contract drift
- Successor Required: `yes`
- Successor Path: `docs/plans/630-taskflow-designer-completion-plan.md`（待建档）

### mobile 组件包扩展（5 → 对标 backlog）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 组件数量扩张是产品路线决策；本计划已覆盖其基础设施缺口（safe-area M0.1a）
- Successor Required: `yes`
- Successor Path: `docs/plans/631-mobile-package-expansion-plan.md`（待建档，需产品决策输入）

### AMIS schema 兼容层完整化

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: README 明示 "planned, but not the primary public contract"；xlib 转换层已覆盖迁移指南所列映射。完整化属产品定位决策
- Successor Required: `yes`
- Successor Path: 产品决策 → 决策后建档（依赖 owner 输入，非可独立执行的 plan）

### 生产验证与生态（采用案例、社区、多维护者）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 非代码债，无法由 repo 内 plan 收口；Phase 7 交接包是 repo 内可做的最大缓解
- Successor Required: `no`
- Successor Path: 无（组织面事项）

## Non-Blocking Follow-ups

- playground 4 项 test 红的最终复跑确认依赖 plan 621 关闭（Phase 1 Follow-up 项的外部依赖记录）。
- `flux-xlang-debug` 测试补强（17 源/5 测试）随 plan 621 领地归还后另行安排。
- UR-1~UR-20 队列与本计划并行推进时的门禁/基线竞争协调（两队列都改基线 JSON 时后落地方负责 rebase 数值）。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent）
- Evidence: （task id / daily log / findings 摘要）

Follow-up:

- （只记录 non-blocking follow-up；confirmed live defect 不得出现在这里）

## Risks And Rollback

- Phase 3 触碰 flux-core 公共类型面：以接口继承组合保证赋值兼容，任何消费方编译错误即回滚该接口的成员迁移（成员先加后删，分两步提交）。
- Phase 4 缓存引入陈旧产物风险：epoch 失效测试先行；如线上出现陈旧渲染，回滚开关为移除工厂层缓存接线（schema-renderer 退回实例内 useMemo，一行改动）。
- Phase 6 大面积删代码（knip removed 类）可能暴露隐式消费：以"删后全量 typecheck + test + e2e 冒烟"为每批提交门槛，单批 ≤50 条。
