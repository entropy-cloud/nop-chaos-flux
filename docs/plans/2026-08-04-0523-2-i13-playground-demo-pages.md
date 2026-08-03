# 2 I13 Playground 演示页

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I13、Cross-Cutting 测试纪律/性能红线）、`docs/components/industrial-hmi/design-renderer.md`（§4.1 schema/§8.1 事件/§8.5 组件句柄）、`docs/components/industrial-hmi/design-data-binding.md`（§4.1 点表三源/§4.3 刷新流水线）、`docs/analysis/industrial-hmi/gate-3-review.md`（§10 e2e 归属）、`docs/analysis/industrial-hmi/renderer-boundary-audit.md`（测试句柄 `window.__flux_scada_<cid>` 恒开）
> Related: 上游 `docs/plans/2026-08-04-0225-3-i11-event-linkage-and-canvas-interaction.md`（completed，验证页退役条款）；下游 roadmap I14（Benchmark，依赖 I13.1）、I15（测试补强/文档收尾）
> Mission: industrial-hmi
> Work Item: I13

## Purpose

实现 Playground 演示页（I13）：I13.1 `scada-demo` 工艺流程组态画面（设备图元+管道+仪表，点表模拟数据定时刷新，点击设备弹出详情）+ I13.2 大屏/复杂组态示例页（万级图元压力示例 + 多画面切换），均注册 playground domain 路由与导航卡片。该页面同时成为 I5/I8/I9/I11 deferred 项所述的**首个可挂载真实浏览器载体**（`window.__flux_scada_<cid>` 测试句柄读取场景树）。收口状态：I13.1/I13.2 全部完成、路由/导航卡片注册、smoke e2e 通过、I11 验证页收敛、roadmap I13 回写 `done`。

## Current Baseline

- 引擎/绑定/图元/renderer/事件全链已落地（I5–I11 全部 `done`）：`scada-canvas` renderer（`config`/`width`/`height`/`viewport`/`events` fields + loading/empty regions）、24 内置符号（基础形状/设备/仪表/传感控制/管道 junction）、点表三源（static/expression/flux）、组件句柄（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy）、图元事件声明→flux action 全链路（click/dblclick/hover，`createNormalizedActionEvent` + helpers.dispatch）、画布浏览交互（wheel/pinch 平移缩放 + fit/center + hover 反馈）。
- 测试句柄机制就绪：renderer 在 dev/test 下经 `window.__flux_scada_<cid>` 暴露引擎实例（I10.1 落地，`exposeTestHandle` 恒开，renderer-boundary-audit「例外与未决项」记录 e2e（I15.1）依赖）；`ScadaCanvasEngine` 含 getSymbols/getViewport/getPointTable 等只读面 + `tree` 引用。
- Playground 注册模式已核实：`apps/playground/src/pages/<demo>.tsx`（页面组件，`onBack` prop）+ `pages/index.ts` export + **`route-model.ts` `DOMAIN_RENDERER_ROUTES`（domain 路由解析唯一入口，`parseRoute` 经它匹配；未注册的 hash 一律解析为 home 兜底）** + `App.tsx` domain switch case + `home-page.tsx` NAV_CARDS 条目（+ `NavigationTarget` 联合类型）；scada-canvas 装配先例 = `scada-event-linkage-demo.tsx`（I11 验证页：createSchemaRenderer + registerScadaRenderers + Button/dialog 承载 + env.fetcher/navigate/notify，**已注册于 route-model.ts:252-257 的 DOMAIN_RENDERER_ROUTES**）。
- I11 plan Non-Blocking Follow-ups：**I11 playground 验证场景在 I13.1 scada-demo 落地后收敛（验证页退役或并入 demo）**——`scada-event-linkage-demo.tsx` 首页卡片标注「I11 验证用，I13.1 正式 demo 取代」。
- I5/I8/I9/I11 deferred（watch-only residual）：真实浏览器视觉/动画/e2e 断言需 I13.1 挂载点——本 plan 落地挂载点 + 基础 smoke e2e；**正式 e2e 程序化断言补强（场景树/点表刷新/事件联动/边界用例）属 I15.1**，不提前。
- 真正剩余的 gap：无任何可挂载 scada-canvas 的正式 playground 页面（仅 I11 临时验证页）；工艺流程演示组态不存在；大屏/压力示例页不存在；I11 验证页待收敛。

## Goals

- I13.1：`scada-demo` 页面——工艺流程组态画面（设备图元 motor/pump/valve/fan + 管道/管道连接 + 仪表 gauge/level + 指示灯/开关等，组态 JSON 内嵌）+ **点表模拟数据定时刷新**（static 变量 + `component:setPointValue` 定时器驱动，或 flux 变量经 scope 桥接驱动，两者择一并记录裁定）+ **点击设备弹出详情**（组态内图元 `events` 声明 → openDialog，消费 I11.1 全链路）+ 注册 playground domain 路由与导航卡片。
- I13.2：大屏/复杂组态示例页——万级图元压力示例（程序化生成 ~10k 图元组态 JSON：矩形/线/文本/管道混合）+ **多画面切换**（≥2 个组态画面，页面内切换或页面导航）+ 注册导航卡片。
- I11 验证页收敛：`scada-event-linkage-demo.tsx` 退役（路由/卡片/export 移除）或并入 scada-demo（三链路场景并入 demo 页）——裁定 + 落地。
- 基础 smoke e2e：两个页面各自 Playwright 程序化断言（页面上挂、`window.__flux_scada_<cid>` 测试句柄读场景树/点表、点击事件链路、无 console error）；**不写截图断言、不引 node-canvas**（roadmap 测试纪律）。
- roadmap I13 回写 `done`；每日日志记录收口摘要。

## Non-Goals

- 不实现正式 e2e 程序化断言补强（场景树/点表刷新/事件联动的完整断言矩阵、边界用例空画面/超大画面/非法 JSON、i18n 文案）——属 I15.1。
- 不实现性能基准测量与固化（I14 依赖 I13.1 挂载点 + I13.2 压力页，但测量脚本/基线/优化属 I14 计划）。
- 不实现编辑器交互（拖拽/旋转/多选/属性面板，I16）；演示页只展示运行时浏览交互（平移/缩放/hover）。
- 不做组态编辑器式编辑能力（画面内容以静态组态 JSON 内嵌 + 程序化生成为主）。

## Scope

### In Scope

- `apps/playground/src/pages/scada-demo.tsx`：工艺流程组态演示页（I13.1）。
- `apps/playground/src/pages/scada-pressure-demo.tsx`：大屏/万级图元压力示例页（I13.2，含程序化组态生成器 + 多画面切换）。
- 路由/导航注册：`pages/index.ts` export、**`route-model.ts` `DOMAIN_RENDERER_ROUTES` 条目**、`App.tsx` domain switch case、`home-page.tsx` NAV_CARDS 条目（+ `NavigationTarget` 联合类型，对齐 I11 验证页先例）。
- I11 验证页收敛：`scada-event-linkage-demo.tsx` 退役或并入（裁定 + 落地，路由/卡片同步清理：`route-model.ts` 的 `scada-event-linkage` 条目、`App.tsx` case、`pages/index.ts` export、`home-page.tsx` NAV_CARDS 条目与 `NavigationTarget` 联合类型移除）。
- smoke e2e：`tests/e2e/scada-demo.spec.ts` + `tests/e2e/scada-pressure-demo.spec.ts`（程序化断言，测试句柄读场景树/点表/事件链路，无 console error）。
- `docs/logs/2026/08-04.md`（或当日日志）记录本 plan 产出摘要。

### Out Of Scope

- I15.1 正式 e2e 断言补强与边界用例、i18n 文案。
- I14 benchmark 脚本/基线/优化轮（依赖 I13.1/I13.2 页面作为挂载点与压力载体，但测量属 I14）。
- 架构文档/quick-reference/flux-guide 同步（I15.2）。

## Failure Paths

| 可测场景编号         | 触发                                                                                                   | 行为                                                                                                                               | 可重试 | 用户可见表现                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| upstream-not-ready   | 前置未就绪——具体判定：roadmap I12 = `done`（或 I12 修正项不阻塞本 plan 域且已落地）且 I10/I11 = `done` | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                                      | 是     | plan 保持 `planned`/`in progress`              |
| demo-schema-drift    | demo 组态 JSON 与 schema 校验漂移（图元类型/属性/绑定/事件声明非法）                                   | 以 `validate` 兜底（config-invalid → empty region + onError）；修正 demo JSON 或回写 schema 问题记录                               | 是     | demo 页显示 empty 态 + console error 被捕获    |
| event-linkage-drift  | 演示页事件声明与 I11.1 契约漂移（on 枚举/载荷形状/dblclick 合并语义）                                  | e2e 断言以 I11.1 既有测试语义为基准核对（click 派发/双击合并/dialog 打开），发现漂移则修正演示页或回写记录                         | 是     | 点击设备弹不出详情 → 断言失败暴露              |
| console-error-leak   | 页面加载/交互产生未捕获 console error（引擎错误/React 错误/网络 4xx）                                  | smoke e2e 断言无 console error（allowConsoleErrors 收紧）；错误归因后修复页面或记录引擎缺陷归属                                    | 是     | e2e 失败暴露，人工可见 console 报错            |
| pressure-scale-drift | 压力页图元规模（万级 10k）与 I14 benchmark 需求（10 万）漂移                                           | 本 plan 按 roadmap 原文只做万级（~10k）；10 万级测量场景加载方式（扩展压力页 scale 参数 vs 独立 harness）裁定记录，交由 I14.1 决策 | 是     | I14.1 按裁定加载 10 万场景，本 plan 无越界实现 |

## Test Strategy

档位选择：`建议有测`——演示页是视觉/交互载体，核心行为（点表刷新/事件联动/场景树挂载）以 Playwright 程序化断言（测试句柄读场景树）覆盖 smoke 级；完整断言矩阵与边界用例属 I15.1（roadmap 既定分层）。e2e 不在 mission 校验命令内（I10/I11 先例：全量验证 typecheck/build/lint/test + 包级单测；e2e smoke 作为本 plan 交付物单独运行验证）。

## Execution Plan

### Phase 1 - I13.1 scada-demo 工艺流程演示页

Status: planned
Targets: `apps/playground/src/pages/scada-demo.tsx`、`apps/playground/src/pages/index.ts`、`apps/playground/src/route-model.ts`、`apps/playground/src/App.tsx`、`apps/playground/src/pages/home-page.tsx`、`tests/e2e/scada-demo.spec.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] `Proof`：前置验证——具体判定：roadmap I12 = `done`（或 I12 gate 已产出注意项清单且其中不阻塞本 plan 的修正已落地）、I10/I11 = `done` 且 closure-audit 通过；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [ ] `Decision`：roadmap Phase Status 回写 I13: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I10/I11 plan 先例）。
- [ ] `Decision`：点表模拟数据刷新方式裁定——`component:setPointValue` 定时器驱动（static 变量，不依赖 scope）vs flux 变量经 `useScopeSelector` 桥接驱动（演示双轨数据模型）；择一或双演示，记录裁定依据（demo 复杂度 vs 双轨展示价值）。
- [ ] `Fix`：`scada-demo.tsx` 工艺流程组态画面——内嵌组态 JSON（设备图元 motor/pump/valve/fan + 管道/管道连接 + 仪表 gauge/level/thermometer + 指示灯/按钮等，图元间管道连接语义 per I9.4）+ 点表模拟数据定时刷新 + 点击设备弹出详情（组态内 `events` 声明 → openDialog，消费 I11.1 全链路）+ 画布浏览交互（fit/center 控制、hover 反馈消费 I11.2）+ loading/empty region 承接；若收敛裁定为「并入」，则 I11 验证页三链路（click→dialog、dblclick→页面跳转、click→数据请求）全部保留于 scada-demo。
- [ ] `Fix`：路由/导航注册——`pages/index.ts` export `ScadaDemoPage`、`route-model.ts` `DOMAIN_RENDERER_ROUTES` 新增 `scada-demo` 条目、`App.tsx` domain switch case（`scada-demo`）、`home-page.tsx` NAV_CARDS 条目 + `NavigationTarget` 联合类型（标题/eyebrow Industrial HMI/描述）。
- [ ] `Fix`：I11 验证页收敛——裁定（退役 vs 并入）并落地：退役则移除 `scada-event-linkage-demo.tsx` 的 export/路由/卡片（含 `route-model.ts` 的 `scada-event-linkage` 条目、`App.tsx` case、`home-page.tsx` NAV_CARDS 条目与 `NavigationTarget` 联合类型）；并入则把三链路场景并入 scada-demo 并同步清理验证页入口。
- [ ] `Proof`：`tests/e2e/scada-demo.spec.ts` smoke 断言——页面上挂（canvas 元素 + data-slot）、`window.__flux_scada_<cid>` 测试句柄存在且 getSymbols/getViewport 可读、点表刷新后 getPointTable 值变化、点击设备后 dialog 打开、无 console error（程序化断言，禁截图）。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。全量验证属 Closure Gates。

- [ ] `scada-demo` 页面落地：工艺流程组态画面渲染、点表定时刷新、点击设备弹出详情、路由/导航卡片注册（`#/scada-demo` 可访问）。
- [ ] I11 验证页收敛裁定已落地（退役或并入，路由/卡片同步清理，无残留临时入口标注）。
- [ ] `tests/e2e/scada-demo.spec.ts` smoke 断言全绿（测试句柄读场景树/点表/事件链路 + 无 console error）。

### Phase 2 - I13.2 大屏/复杂组态示例页

Status: planned
Targets: `apps/playground/src/pages/scada-pressure-demo.tsx`、`apps/playground/src/pages/index.ts`、`apps/playground/src/route-model.ts`、`apps/playground/src/App.tsx`、`apps/playground/src/pages/home-page.tsx`、`tests/e2e/scada-pressure-demo.spec.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision`：压力示例页结构裁定——单页多画面 tab 切换 vs 页面级多路由切换（多画面切换语义，roadmap I13.2「多画面切换（页面导航）」）；**若选页面级多路由切换，需在 scope 内增加对应 domain 路由条目 + NAV_CARDS 卡片注册**（裁定记录，防止注册面越界）；程序化组态生成器设计（~10k 图元：矩形/线/文本/管道混合，固定随机种子保证 e2e 确定性）。
- [ ] `Fix`：`scada-pressure-demo.tsx` 大屏/复杂组态示例页——程序化生成万级（~10k）图元组态 JSON + 多画面切换（≥2 个组态画面：工艺流程大屏 + 高密度图元压力画面）+ 大屏布局（全屏 canvas + 顶部信息栏）+ fit/center 初始视口。
- [ ] `Fix`：路由/导航注册——`pages/index.ts` export、`route-model.ts` `DOMAIN_RENDERER_ROUTES` 新增 `scada-pressure-demo` 条目、`App.tsx` domain switch case（`scada-pressure-demo`）、`home-page.tsx` NAV_CARDS 条目 + `NavigationTarget` 联合类型（若裁定页面级多路由，则对应画面路由一并注册）。
- [ ] `Proof`：`tests/e2e/scada-pressure-demo.spec.ts` smoke 断言——页面上挂、测试句柄 getSymbols 计数（≥10k）、多画面切换后场景树/视口变化断言、无 console error（程序化断言，禁截图；`pressure-scale-drift` 裁定记录交 I14.1）。

Exit Criteria:

- [ ] `scada-pressure-demo` 页面落地：万级图元组态渲染、多画面切换、路由/导航卡片注册（`#/scada-pressure-demo` 可访问）。
- [ ] `tests/e2e/scada-pressure-demo.spec.ts` smoke 断言全绿（getSymbols 计数 ≥10k + 画面切换 + 无 console error）。
- [ ] 10 万级测量场景加载方式裁定已记录（供 I14.1 决策，无越界实现）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，round 1 task `ses_0367aa6cdffeGaIl783wUSWNeo`、round 2 task `ses_03674f3e1ffe6pLXdM94cZx5nM`）
- Verdict: `pass`（round 2；round 1 `revise`，1 Blocker + 3 Minor 落地；round 2 零 Blocker/Major/Minor）
- Rounds: 2
- Findings addressed: B-1 路由注册补齐 `route-model.ts` `DOMAIN_RENDERER_ROUTES`（基线/In Scope/两 Phase Targets/注册 Fix/收敛 Fix/Closure Gates，含 `scada-event-linkage` 条目与 `NavigationTarget` 联合类型清理）；M-1 Closure Gates 补 roadmap I13 回写 `done` 项；M-2 Phase 2 Decision 记录页面级多路由需在 scope 内增路由/卡片注册；M-3 并入裁定保留 I11 三链路（click→dialog/dblclick→跳转/click→ajax）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] I13.1 与 I13.2 页面全部落地（路由/导航卡片注册，`#/scada-demo` 与 `#/scada-pressure-demo` 经 `route-model.ts` `DOMAIN_RENDERER_ROUTES` 可访问）。
- [ ] I11 验证页收敛落地（退役或并入，无残留临时入口标注；`scada-event-linkage` 路由/卡片/export 已清理）。
- [ ] 两个 smoke e2e spec 全绿（程序化断言：场景树/点表/事件链路 + 无 console error；无截图断言、未引 node-canvas）。
- [ ] `pressure-scale-drift` 裁定已记录（10 万级加载方式归属 I14.1）。
- [ ] roadmap Phase Status I13 已回写 `done`（前置：本 plan Closure Gates 全通过 + 独立 closure-audit 通过——由独立 closure-audit session 核验后执行）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] 受影响的 owner docs 已同步（无设计变更时不新增回写；本 plan 为 playground 演示层，不改变 `scada-canvas` 公共契约）。
- [ ] `docs/logs/2026/08-04.md`（或当日日志）已记录收口摘要。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 正式 e2e 程序化断言补强（场景树/点表刷新/事件联动完整矩阵 + 边界用例 + i18n）

- Classification: `watch-only residual`
- Why Not Blocking Closure: roadmap I15.1 明确定义正式断言补强（边界用例空画面/超大画面/非法 JSON、i18n 文案）；本 plan 只做演示页 smoke 断言（页面上挂/句柄可读/点表刷新/事件链路/无 console error），演示页作为 I15.1 的挂载载体，不提前实现完整断言矩阵。
- Successor Required: `yes`
- Successor Path: roadmap I15.1（测试补强）

### 性能基准测量与优化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 性能验收（10 万图元 ≥45fps/首屏 <2s/内存 ≤320MB；1 万点刷新 <200ms）属 I14 benchmark 计划（I14.1 固化测量方法、I14.3 复测结论）；本 plan 的 I13.2 压力页只提供万级（~10k）载体，10 万级测量场景加载方式裁定交 I14.1（Failure Paths `pressure-scale-drift`）。
- Successor Required: `yes`
- Successor Path: roadmap I14

## Non-Blocking Follow-ups

- 演示页可作后续 I15.1 e2e 断言的常驻载体（测试句柄 `window.__flux_scada_<cid>` 恒开）。
- 工艺流程组态 JSON 若暴露图元能力缺口（如缺少某内置符号组合语义），记录回写 `design-*.md` 或归属 I12 注意项清单。

## Closure

Status Note: 待关闭时填写。

Closure Audit Evidence:

- Auditor / Agent: 待独立 closure-audit session 填写
- Evidence: 待填

Follow-up:

- 待关闭时填写。

## Optional Sections

## Risks And Rollback

- **demo 与正式断言边界漂移风险**：演示页易被要求承担 I15.1 断言职责——Non-Goals 与 Deferred 区已显式声明分层（smoke vs 完整矩阵），e2e 断言以「页面上挂 + 句柄读场景树 + 无 console error」为界。
- **压力页规模漂移风险**：I13.2 万级 vs I14 十万级——`pressure-scale-drift` Failure Path 固化裁定记录，避免 I13 越界实现 10 万场景导致 I14 口径混乱。
- **演示页依赖 I12 修正风险**：若 I12 gate 产出阻塞本 plan 域的修正（如 demo 消费的契约面缺陷），按 `upstream-not-ready` 等待修正落地后再执行。
