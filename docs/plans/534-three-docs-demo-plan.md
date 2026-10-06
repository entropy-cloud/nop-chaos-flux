# 534 3D 文档一致性与演示路由收尾（D2）Plan

> Plan Status: completed
> Last Reviewed: 2026-10-06
> Source: `docs/backlog/scada-3d-ux-parity-roadmap.md`（D2 工作项）/ `docs/components/threejs-integration/design.md`（v5 定稿 owner doc）/ `docs/components/threejs-integration/design-renderer.md`（renderer 契约，plan 533 增补视口质感契约节）
> Related: plan 533（D1 done）；2026-08-28 快照政策（AGENTS.md / visual-page-quality-inspection-prompt.md）

## Purpose

收尾 3D 轨道的一致性债与可发现性缺口：v2–v4 中间稿「设计评审中」过时状态勘误与归档标注、工业适配器/重连管理器的演示路由补齐（导出面已有、无任何 demo 可达）、`__flux_three_handles` 生产暴露决策记录、深色模式/视觉回归覆盖方式按 2026-08-28 政策做一页裁定。收口状态：3D 轨道文档与 live 一致、两个数据源导出物有可达演示、两项决策留痕，roadmap D1–D2 全部收口。

## Current Baseline

2026-10-06 live repo 探查（证据到文件行号）：

- **v2/v3/v4 中间稿过时状态**：`docs/analysis/threejs-integration-design-v2.md:5`、`-v3.md:5`、`-v4.md:5` 均残留 `状态: 设计评审中`——而终稿 `docs/components/threejs-integration/design.md:3-5` 已是 **v5 定稿**（I1.1 共识审查通过，2026-09-13）。v4 头部自身注记「v4 历史版本归档于 docs/analysis/threejs-integration-design-v4.md」（design.md:6）——归档指向成立，但三份中间稿自身无归档标注。
- **analysis 文档状态**：`threejs-integration-analysis.md:3` 头部为「更新：2026-09-13（I0.1 调研收口）」——grep 全文无「评审中」字样。roadmap D2 行「`threejs-integration-analysis.md`「评审中」过时状态勘误」的前提**在 analysis 文档上不成立**（评审中仅存在于 v2/v3/v4）——执行期就地勘误 roadmap 该句。
- **演示路由缺口**：`packages/flux-renderers-3d/src/index.ts:5-6,11` 已导出 `ReconnectionManager`/`IndustrialAdapter`（+类型），但 playground grep 0 命中（无任何 demo 页消费）；既有 three 演示仅 `three-canvas-demo`（App.tsx:74-76 为 lazy 隔离注释；lazy 声明实际在 domain-route-pages.tsx:168-170，元数据表在 domain-route-entries.ts:494，domain-route-pages.test.tsx:22-39 双向对账测试强制两处同步）。domain-route 注册点：`apps/playground/src/domain-route-pages.tsx:169,248`（three-canvas-demo 先例：lazy import + `'three-canvas-demo': (ctx) => ...`）。
- **适配器 demo 可行性**：`IndustrialAdapter` 只消费 `RendererEnv.openSocket` 标准契约（industrial-adapter.ts:35-41 契约注释；`IndustrialAdapterOptions = { env, scope, onError? }`）——demo 页可用 `createDefaultEnv()` 覆写 `openSocket` 注入合成标签源（tick 推帧），无需真实 WS 服务。
- **`__flux_three_handles`**：`use-scene-manager.ts:19,54-58`——仅当 `debugHandleKey`（= meta.testid）存在时挂载 `getScene/getRenderer` 只读面；`three-canvas-visual.spec.ts` L4 观测层依赖它（:6-9 注释 + declare global）。无决策留痕。
- **视觉回归覆盖方式现状**：`three-canvas-visual.spec.ts:6-9` 头注已声明（`declare global` 在 :19-23）「Screenshots are not used as pass criteria (AGENTS.md 2026-08-28 policy)」——L1 DOM/L2 geometry/L4 handles 三层程序化断言。深色模式：three-canvas demo/测试均未覆盖 `data-mode` 翻转。无评估留痕。
- **HCA 已治理（不重复）**：重连退避算法、协议转换语义（I3 系列已治理）；本 plan 只做演示与文档面。

## Goals

- v2/v3/v4 中间稿头部勘误（「设计评审中」→「已归档（superseded by v5 定稿）」+ 归档标注），analysis 文档前提勘误（roadmap D2 行就地注记）。
- 新增 `three-industrial-demo` 演示页：IndustrialAdapter（合成 openSocket 标签源）+ 重连可观测——**重连尝试计数由 demo 侧合成源观测**（合成 openSocket 每次被调用 = 每次重连建连，自增计数；判别性：无重连则不递增），UI 展示连接态/标签值/重连尝试计数，经 domain-route-entries 注册 `#/three-industrial-demo`。
- `__flux_three_handles` 生产暴露决策记录（一页，owner doc）。
- 深色模式/视觉回归覆盖方式按 2026-08-28 政策一页裁定（owner doc）。
- owner doc 回写：`docs/components/threejs-integration/design.md`（文档集状态/演示路由节）+ `design-renderer.md`（句柄决策/裁定）。

## Non-Goals

- 不改 IndustrialAdapter/ReconnectionManager 语义（HCA/I3 已治理；demo 只消费）。**显式裁定**：为 ReconnectionManager 增加 retryCount 只读 getter = out-of-scope improvement（本 plan 重连观测走 demo 侧合成源计数；getter 归 Non-Blocking Follow-ups，需要时独立小改动）。
- 不做真实 WS 服务端/设备模拟器（demo 用合成 openSocket）。
- 不新增截图类视觉回归（2026-08-28 政策维持）。
- 不含 D1 面与 S 系列条目。

## Scope

### In Scope

- `docs/analysis/threejs-integration-design-{v2,v3,v4}.md` 头部勘误标注。
- `apps/playground/src/pages/three-industrial-demo.tsx`（新）+ `domain-route-entries.ts`/`domain-route-pages.tsx`/`pages/index.ts` 注册（App.tsx 仅隔离注释补行）+ i18n（如需）。
- owner doc 两处（design.md + design-renderer.md）决策记录与勘误；roadmap D2 行前提勘误。
- 单测（domain-route 注册回归）+ e2e smoke（demo 页可达 + 连接态/标签值渲染）。

### Out Of Scope

- 适配器/重连语义、真实设备模拟、D1 面、性能。

## Failure Paths

| 可测场景编号       | 触发                                     | 行为                                                   | 可重试 | 用户可见表现 |
| ------------------ | ---------------------------------------- | ------------------------------------------------------ | ------ | ------------ |
| demo-ws-mock-error | 合成 openSocket 注入 close/error         | ReconnectionManager 退避重连可观测（重连计数 UI 递增） | 是     | 重连态展示   |
| route-unregistered | 路由未注册直达 `#/three-industrial-demo` | 既有 unknown-route 兜底（注册后不可达即回归）          | 是     | 兜底页       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`建议有测`（文档勘误为主 + 一个演示页）。演示页硬性自动化：domain-route 注册单测（route-model 断言）+ e2e smoke（页面可达、连接态/标签值/重连计数渲染——合成源可确定性驱动）。

## Execution Plan

### Phase 1 - 文档勘误与归档标注

Status: completed
Targets: `docs/analysis/threejs-integration-design-{v2,v3,v4}.md`、`docs/backlog/scada-3d-ux-parity-roadmap.md`

- Item Types: `Fix`

- [x] Fix：v2/v3/v4 头部「状态: 设计评审中」就地勘误为「已归档（superseded）——终稿 = `docs/components/threejs-integration/design.md`（v5 定稿，I1.1 共识审查通过）；本稿为历史中间稿，不再演进」+ 勘误日期注记（历史正文不改写）。
- [x] Fix：roadmap D2 行前提勘误——「analysis「评审中」勘误」子句就地注记（analysis 文档 grep 无评审中标记；评审中仅存在于 v2/v3/v4，勘误对象修正为三份中间稿）。

Exit Criteria:

- [x] 三份中间稿归档标注落地（v2:5/v3:5/v4:5 →「已归档（superseded）」+ v5 指向 + 勘误日期）。
- [x] roadmap D2 前提勘误注记在案（Phase Details D2 行后附注）。

### Phase 2 - 工业适配器/重连管理器演示路由

Status: completed
Targets: `apps/playground/src/pages/three-industrial-demo.tsx`（新）、`domain-route-entries.ts`、`domain-route-pages.tsx`、`pages/index.ts`（App.tsx 仅隔离注释补行）

- Item Types: `Fix | Proof`

- [x] Fix：demo 页——`createDefaultEnv({ openSocket })` 覆写注入合成标签源（tick 推 bool/int16/float32 帧 + 可触发 close/error 演示重连）；`scope` 经 `createPrivateEvalScope`（index.ts:14 已导出）构造，UI 读 `dataSources.*` 通道；**重连尝试计数 = demo 侧合成 openSocket 调用次数自增**（ReconnectionManager retryCount 为 private 无 getter——见 Non-Goals 裁定）；UI 展示连接态/标签值/重连尝试计数（testid：`three-industrial-demo`/`-status`/`-tags`/`-reconnects`）。
- [x] Fix：路由注册（对齐 three-canvas-demo 先例三点）——`domain-route-entries.ts` 新增元数据条目（completeness 双向对账测试强制）+ `domain-route-pages.tsx` lazy import + 表条目（先例 :168-170/:248）+ `pages/index.ts` re-export（先例 :22）；App.tsx 74-76 隔离注释按惯例补一行（非接线项）。
- [x] Proof：单测——domain-route 注册回归（completeness 双向对账 2/2 过）（entries completeness 双向对账 + route-model 自动收录断言）；e2e smoke——`#/three-industrial-demo` 可达、标签值渲染、重连尝试计数（触发 mock error 后递增——判别性：无重连实现则合成 openSocket 不复用、计数不增）。

Exit Criteria:

- [x] demo 页 + 路由注册落地，单测/e2e smoke 全绿（`three-industrial-demo.spec.ts` 2/2：连接 connected + 三标签值渲染 + 模拟断线计数 ≥ +1 + 恢复 connected）。**执行期发现**：`createPrivateEvalScope` 为只读求值面（`update: () => undefined`，flux-react bindings/flux-eval.ts:38）——adapter 的 scope.update 写入被静默丢弃；demo 改用最小可写 ScopeRef（adapter.update + UI.get 契约），该发现已记 owner doc 交付形态注记。 **第二项执行期发现**：scope 为可变外部状态——渲染期直读（readTag during render）被 React Compiler 记忆化跳过重渲染（DOM 卡 '—'，setState 类更新不受影响）；demo 改为 500ms 镜像 interval 把 scope 值写入组件 state（setState 可追踪，重渲染保证）——该形态是 React Compiler 时代消费可变外部状态的正确姿势，已固化于 demo 代码注释。

### Phase 3 - 决策记录与一页裁定

Status: completed
Targets: `docs/components/threejs-integration/design.md`、`design-renderer.md`

- Item Types: `Decision | Fix`

- [x] Decision（D-534-1）：`__flux_three_handles` 生产暴露——裁定 = **保留**（仅 `debugHandleKey`=testid 存在时挂载的只读面；three-canvas-visual L4 层依赖；无写通道），决策记录写入 owner doc（消费方/暴露条件/风险与边界）。
- [x] Decision（D-534-2）：深色模式/视觉回归覆盖方式——按 2026-08-28 政策裁定 = **维持程序化断言（L1/L2/L4）不引入截图基线**；深色覆盖以 `data-mode` 翻转下的程序化断言补强方式记录（含是否补 demo 开关的结论），一页裁定写入 owner doc。
- [x] Fix：owner doc 回写——design.md（文档集状态注记 v2-v4 归档 + 演示路由节）+ design-renderer.md（D-534-1/D-534-2 裁定）；roadmap D2 行回写前提。

Exit Criteria:

- [x] 两项决策记录完成（design-renderer.md「句柄暴露与覆盖方式裁定」节：D-534-1 保留现状 testid-gated 只读面 + D-534-2 维持程序化断言/不引入截图基线 + 深色补强方式）。
- [x] owner doc 与 live 一致（句柄挂载条件/覆盖方式逐条可对照；design.md 头部归档注记 + 演示路由行）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，不复用起草者上下文）
- Verdict: `pass-with-minors`（Rounds: 2；R1 fail 2 Major，修订后零 Blocker/零 Major）
- Findings addressed: M1 重连计数可观测面改为 demo 侧合成源观测（openSocket 调用次数自增）+ Non-Goals 显式裁定 retryCount getter = out-of-scope + Follow-ups 补条目；M2 路由接线点改为先例三点（domain-route-entries.ts 元数据 + domain-route-pages.tsx lazy/表条目 + pages/index.ts re-export），删除 route-model/App-lazy 幻影接线点，Baseline App 表述勘误；Minor m1-m4（行号/App 措辞/scope 构造 createPrivateEvalScope 点名/declare global 拼接）+ 复核 N1/N2 残留已随手修正。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（中间稿过时状态/演示路由缺口/决策无留痕——Phase 1-3 落地收敛）
- [x] 所有 in-scope confirmed contract drifts 已收敛（文档集指向 v5 定稿单一事实源；roadmap 前提勘误）
- [x] 行为/契约结果已达成（归档标注/演示路由/两项决策留痕）
- [x] 必要 focused verification 已完成（route 注册单测 + e2e smoke 2/2）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（retryCount getter = Non-Goals 显式裁定 out-of-scope + Follow-ups 在案）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md + design-renderer.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 零新增红（超出已登记存量）
- [x] e2e 通过（demo smoke 2/2 + 既有 three 家族）

## Deferred But Adjudicated

> 执行中推翻/改判条目时当场落本节（When Executing 7）。

（暂无——执行中落账）

## Non-Blocking Follow-ups

- 真实 WS 设备模拟器（demo 升级项，独立立项）。
- ReconnectionManager `get retryCount()` 只读 getter（Non-Goals 显式裁定 out-of-scope，本 plan 重连观测走 demo 侧合成源计数）。
- analysis 文档 §8 v4 核对表的条目级回写（属调研文档演进，超出归档勘误范畴）。

## Closure

Status Note: 三 Phase 全部 completed 且 closure audit（独立子 agent，2026-10-06）**approved**。v2/v3/v4 中间稿归档勘误、analysis 前提勘误、`three-industrial-demo` 演示路由三点接线（含两项执行期发现：createPrivateEvalScope 只读求值面 → 最小可写 ScopeRef；React Compiler 记忆化跳过渲染期直读 → scope 值镜像组件 state）、D-534-1 句柄保留裁定 + D-534-2 程序化断言裁定落 owner doc。审计附 3 Minor（roadmap 行多余单元格/e2e 分项计数/文件末换行）已随收口 commit 处理。至此本 roadmap D1–D2 全部收口，五工作项 done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，agent_582334e7-d9b1-477a-95c8-36c3dbc38561）
- Evidence: 2026-10-06 closure audit——git 变更面对账一致（cron 轨道排除核验）；playground 单测 407/407 + e2e industrial-demo 2/2 + three 家族 9/9 独立实跑；测试文件打开确认断言真实（重连计数判别机制链在 adapter/ReconnectionManager 源码逐环核实）；retryCount getter 裁定与 Deferred 诚实性核验；v2/v3/v4 勘误 + analysis grep 0 命中核验；两项执行期发现与 live 对照（flux-eval.ts:38 update no-op、React Compiler 记忆化）。

Follow-up:

- 真实 WS 设备模拟器、ReconnectionManager retryCount getter、analysis §8 条目级回写（Non-Blocking Follow-ups 已录）。
