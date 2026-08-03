# 3 I14 Benchmark 与性能优化

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I14、Cross-Cutting 性能红线/测试纪律/人工确认阈值）、`docs/components/industrial-hmi/design-engine.md`（§4.6 性能策略与基线/§12.1 spike 测量方法、A4 双口径声明、内存 +40% 观察项）、`docs/analysis/industrial-hmi/research-download.md`（§2.2 性能数字校准）、`docs/analysis/industrial-hmi/gate-3-review.md`（§3 leafer 真实 API 抽查结论、§10 1 万点批量合并断言 + batch.add 对照归属 I14）
> Related: 上游 `docs/plans/2026-08-04-0523-2-i13-playground-demo-pages.md`（draft，I13.1/I13.2 页面为挂载载体）；下游 roadmap I15（测试补强/文档收尾）
> Mission: industrial-hmi
> Work Item: I14

## Purpose

执行性能基准固化与优化闭环（I14）：I14.1 固化测量方法与基线（Playwright 测量 10 万图元首屏创建/拖动 fps/内存 + 1 万点实时刷新端到端延迟）→ I14.2 按基线结果逐项优化 → I14.3 复测并固化结论（达标写结论到 benchmark 文档；不达标分析瓶颈并标记人工决策）。验收包络（roadmap 总览 + design-engine.md §4.6）：10 万图元可交互 **≥45fps** / 首屏创建 **<2s** / 内存 **≤320MB**；1 万实时数据点端到端刷新 **<200ms**。收口状态：I14.1–I14.3 全部完成、benchmark 文档达成文档共识、roadmap I14 回写 `done`。

## Current Baseline

- 挂载载体（I13 计划）：`scada-demo` 工艺流程演示页 + `scada-pressure-demo` 万级压力示例页（含程序化组态生成器）——I13 plan `pressure-scale-drift` 裁定已记录：10 万级测量场景加载方式（扩展压力页 scale 参数 vs 独立 harness）交 I14.1 决策。
- 测量基础设施：`tests/e2e/helpers/measure-perf.ts`（`measureFps`/`measureTiming`，rAF 时间戳）；既有 perf e2e 先例 `calendar-perf.spec.ts`/`gantt-perf.spec.ts`/`diff-perf.spec.ts`（首屏 timing + idle/scroll/drag fps 测量模式）；Playwright CDP session 可用于 JS heap 测量（spike 已用 CDP JS heap 口径：10 万图元 47.5 MB）。
- **测量口径基线（spike 实测 + gate 校准）**：design-engine.md §4.6 记录——10 万图元首屏创建（spike 实测基线）、内存 47.5 MB（CDP JS heap，验收 ≤320MB，余量 ~6.7x）、平移吞吐 114.3 fps/缩放 174.2 fps（吞吐口径）；**A4 声明**：headless 无 vsync，rAF 吞吐 ≠ 显示 fps，≥45fps 判定基于渲染吞吐代理口径，真实指针事件路径需 **I14 在真实浏览器复测**（指针端到端口径 17–29fps 为 CDP 输入路径开销）；**内存 +40% 观察项**：100 万对照 448.4MB vs 官方 320MB（推测 stroke 属性 + 软渲染缓冲），I14 复测时补**无 stroke 对照组**。
- gate-3-review §10 归属：**1 万点全量批量合并断言 + 组态 JSON 加载 batch.add 对照（m-8）→ I14**（config-adapter 逐节点 add vs spike batch.add，语义等价但性能观察项，I14 复测对照）；leafer 真实 API 抽查结论（§3）作 I14 复测口径基线（mock↔真实漂移历史基线）；onRender dirtyBlocks 预留字段（m-1）在 I14 复核。
- 1 万点刷新基线（spike 实测，design-engine.md §4.6）：批量更新端到端 16.9–19.7 ms（更新 1.7–2.6 ms + 渲染 ~15–17 ms），验收 <200ms，余量 ~10x。
- 性能红线（roadmap Cross-Cutting）：点表刷新走合并帧 + 脏属性收集，禁止逐点 setState 直刷 React；动画合帧调度，禁止每帧全量重建场景——引擎实现已按此落地（I6/I10），I14 复测验证。
- 真正剩余的 gap：mission 验收包络（10 万 ≥45fps/首屏 <2s/内存 ≤320MB、1 万点 <200ms）**未经本项目真实浏览器/真实实现复测**（spike 为最小 demo 实测，非本项目引擎链路）；测量方法与基线值未固化到文档；benchmark 报告不存在；优化轮未启动。

## Goals

- I14.1：固化测量方法与基线——Playwright 测量脚本落地（10 万图元首屏创建 / 拖动 fps（渲染吞吐 + 显示帧率双口径，A4）/ CDP JS heap 内存（含无 stroke 对照组）/ 1 万点实时刷新端到端延迟）；10 万级场景加载方式裁定（消费 I13 plan `pressure-scale-drift`）；gate-3-review §10「1 万点全量批量合并断言 + 组态 JSON 加载 batch.add 对照（m-8）」兑现；基线值写入 `docs/analysis/industrial-hmi/benchmark-report.md`（含测量方法/环境/数值/对照）。
- I14.2：性能优化轮——按基线结果逐项优化（图元实例化、裁剪、脏区、数据节流、动画合帧，roadmap I14.2 范围；含 m-8 batch.add 对照结论驱动的优化决策），每项优化落地携带 focused 单测（行为不回归）+ 逐项复测记录；基线已达标的项记录裁定（不无谓优化）。
- I14.3：复测与结论固化——最终复测全项达标（≥45fps / 首屏 <2s / 内存 ≤320MB / 刷新 <200ms）则结论写入 benchmark 报告；不达标则分析瓶颈并**标记人工决策**（roadmap 人工确认阈值：benchmark 不达标必须停下标记人工决策，不自动推进）。
- `benchmark-report.md` 自身经独立文档共识审查（≤3 轮，0 新增修正项即共识，超限升级人工）；roadmap I14 回写 `done`；每日日志记录收口摘要。

## Non-Goals

- 不实现 e2e 程序化断言补强（I15.1：场景树/点表刷新/事件联动完整矩阵、边界用例、i18n）。
- 不做设计文档/架构文档收尾（I15.2）与编辑器立项材料（I16）。
- 不引入 node-canvas；不做截图判定（roadmap 测试纪律）。
- 不优化 demo 页面本身的 React 层性能（非引擎链路；如发现 renderer 桥接热点则记录归属，评估后按需落地）。

## Scope

### In Scope

- 测量方法固化与基准脚本：`tests/e2e/scada-perf.spec.ts`（或按既有 perf spec 命名约定，`test.describe.configure({ timeout: 180_000 })` 对齐既有 perf specs 超时档位）——10 万图元首屏创建（性能计时）、拖动/平移 fps（`measureFps`，双口径：渲染吞吐（tree render 事件计数）+ 显示帧率（rAF）；A4）、内存（CDP JS heap，含无 stroke 对照组）、1 万点实时刷新端到端延迟（**经裁定批量注入通道（见 Phase 1 Decision `perf-injection-channel`）注入 → 渲染完成计时**）。
- 10 万级场景加载方式裁定 + 落地（消费 I13 `pressure-scale-drift` 记录：独立 perf 页/路由（对齐 calendar-perf-scale 先例）或扩展 `scada-pressure-demo` 规模参数；**无 stroke 对照变体一并纳入裁定选项空间**）。
- gate-3-review §10 兑现：1 万点全量批量合并断言 + 组态 JSON 加载 batch.add 对照（m-8）复测记录。
- `docs/analysis/industrial-hmi/benchmark-report.md`：测量方法/环境（机型/浏览器版本）/基线数值（含 spike 对照）/优化前后对比/达标结论——经独立文档共识审查。
- I14.2 优化轮：按基线差距逐项优化（图元实例化、裁剪、脏区、数据节流、动画合帧），每项 focused 单测 + 复测记录；达标项裁定记录。
- roadmap I14 回写 `done`；`docs/logs/2026/08-04.md`（或当日日志）记录收口摘要。

### Out Of Scope

- I15.1 正式 e2e 断言补强、I15.2 文档收尾、I16 编辑器立项。
- 组态编辑器交互性能（I16 域）。
- 非引擎链路优化（playground 页面 React 层，发现即记录归属）。

## Failure Paths

| 可测场景编号        | 触发                                                                                    | 行为                                                                                                                                | 可重试 | 用户可见表现                                                               |
| ------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| upstream-not-ready  | 前置未就绪——具体判定：roadmap I13 = `done` 且 I13 plan closure-audit 通过、压力页可挂载 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                                       | 是     | plan 保持 `planned`/`in progress`，roadmap I14 保持 `todo`                 |
| benchmark-not-pass  | 最终复测不达标（任一项：<45fps / 首屏 ≥2s / 内存 >320MB / 刷新 ≥200ms）                 | 分析瓶颈 → 标记人工决策（roadmap「人工确认阈值」：benchmark 不达标必须停下标记人工决策，不自动推进）；瓶颈分析记录入 benchmark 报告 | 否     | roadmap 标记人工确认项，I15 暂停推进，人工裁决后由 mission-driver 决定后续 |
| measure-drift       | 测量口径漂移（headless rAF 吞吐 vs 显示帧率混淆、CDP 环境差异、spike 对照不可比）       | 双口径核对（A4）+ 环境/数值记录入 benchmark 报告；发现漂移则修正测量脚本后重测                                                      | 是     | 报告数值口径可追溯，无跨口径混比误判                                       |
| perf-opt-regression | 优化轮改动引入行为回归（绑定/动画/序列化语义变化）                                      | 每项优化携带 focused 单测（行为不回归硬约束，I8–I11 既有测试保持绿）；发现回归立即回退或修复                                        | 是     | 既有测试全绿保障，优化不静默破坏行为                                       |
| memory-drift        | 内存测量环境漂移（JS heap 采样点差异、对照缺失）                                        | 固化采样口径（CDP JS heap，测量时机/采样方式记录）+ 无 stroke 对照组（design-engine.md §4.6 风险节）；漂移则修正后重测              | 是     | 内存数值与 spike 口径可比，对照组记录清晰                                  |

## Test Strategy

档位选择：`必须自动化`——性能验收是 mission 核心回归路径且与「人工确认阈值」绑定（benchmark 不达标 = 停下标记人工决策），测量脚本/断言必须先于优化落地（Proof 先于 Fix）；测量统一 Playwright 程序化断言（性能计时 + 测试句柄 + CDP），禁截图、不引 node-canvas；优化项携带 focused 单测防止行为回归；全量验证（typecheck/build/lint/test）归 Closure Gates。

## Execution Plan

### Phase 1 - I14.1 benchmark 脚本与基线

Status: planned
Targets: `tests/e2e/scada-perf.spec.ts`（或既有 perf 命名约定）、`docs/analysis/industrial-hmi/benchmark-report.md`、（按裁定）`apps/playground/src/pages/scada-pressure-demo.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] `Proof`：前置验证——具体判定：roadmap I13 = `done` 且 I13 plan closure-audit 通过、`scada-demo`/`scada-pressure-demo` 可挂载、I13 `pressure-scale-drift` 裁定记录可读；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [ ] `Decision`：roadmap Phase Status 回写 I14: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I10/I11 plan 先例）。
- [ ] `Decision`：10 万级测量场景加载方式裁定（消费 I13 `pressure-scale-drift`）——独立 perf 页/路由（对齐 calendar-perf-scale 先例：独立页面 + 独立路由 `#/scada-perf-scale`）vs 扩展 `scada-pressure-demo` 支持规模参数；**无 stroke 对照变体（10 万图元无 stroke 组态，design-engine.md §4.6 内存 +40% 观察项）一并纳入选项空间**；裁定记录入 benchmark 报告，落地归属明确（页面/路由扩展归本 plan I14.1，需保持 I13 页面既有 10k 模式不回归）。
- [ ] `Decision`（`perf-injection-channel`）：1 万点批量注入通道裁定——**`component:setPointValues` 不存在**（component 句柄面仅 `setPointValue` 单点，use-scada-handles.ts `SCADA_HANDLE_METHODS` 核实；批量写存在于 domain 层 `point-store.setPointValues`，经 `use-scada-points-bridge` 的 scope-bridge 通道可达（config 声明 1 万 `source:'flux'` 变量 + 订阅/求值链路注入，开销含订阅面））；1 万点逐点 `component:setPointValue` 经 action 派发链会以派发开销污染测量（spike 基线 16.9–19.7 ms 量级）——裁定批量注入通道：**dev/test 专用批量方法挂测试句柄 `window.__flux_scada_<cid>`（dev/test 投影，非 `scada-canvas` 公共契约变更，不触发人工确认阈值）** vs scope-bridge（flux 变量 1 万点注入）路径；裁定 + 依据记录入 benchmark 报告。
- [ ] `Fix`：测量脚本落地 `tests/e2e/scada-perf.spec.ts`（`test.describe.configure({ timeout: 180_000 })`，对齐 calendar-perf/gantt-perf 超时档位）——① 10 万图元首屏创建（性能计时，**口径边界明示：`组态生成完成 → tree render 首帧`**，与 spike 基线 165.3 ms（design-engine.md §4.6）口径对齐，导航/生成开销排除在计时外；经 I10.1 测试句柄 `window.__flux_scada_<cid>` + tree render 事件）；② 拖动/平移 fps（`measureFps`，**双口径 A4**：渲染吞吐（tree render 事件计数）+ 显示帧率（rAF），指针事件路径实测（真实浏览器 move 事件驱动平移））；③ 内存（CDP JS heap，含**无 stroke 对照组**，design-engine.md §4.6 风险节）；④ 1 万点实时刷新端到端延迟（经 `perf-injection-channel` 裁定通道批量注入 → 渲染完成计时，合并帧/脏属性收集路径断言）。
- [ ] `Proof`：gate-3-review §10 兑现——1 万点全量批量合并断言（合帧/脏属性收集路径）+ 组态 JSON 加载 **batch.add 对照（m-8）**（逐节点 add vs batch.add 对比记录，非缺陷、性能观察项口径固化）。
- [ ] `Fix`：`docs/analysis/industrial-hmi/benchmark-report.md`——测量方法（脚本路径/测量时机/采样口径/环境：机型/浏览器版本/CDP 采样点）、基线数值（各测量项 + spike 对照 + 无 stroke 对照组）、双口径记录（A4）、batch.add 对照结论；预填基线，优化轮后回填对比。
- [ ] `Proof`：`benchmark-report.md` 自身经独立子 agent（fresh session）文档共识审查（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工），共识记录写入文件头部。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。全量验证属 Closure Gates。

- [ ] `tests/e2e/scada-perf.spec.ts` 落地且运行通过（四项测量可重复执行；性能断言阈值按基线试探性设定，最终阈值在 I14.3 固化）。
- [ ] `perf-injection-channel` 裁定已记录（1 万点批量注入通道：dev/test 专用批量方法 vs scope-bridge，裁定依据入 benchmark 报告）。
- [ ] `benchmark-report.md` 存在：测量方法/环境/基线数值/双口径记录/batch.add 对照结论，文档共识闭环（≤3 轮）。
- [ ] 10 万级场景加载方式裁定落地（独立 perf 页/路由或压力页规模参数，含无 stroke 对照变体，I13 既有 10k 模式不回归）。

### Phase 2 - I14.2 性能优化轮

Status: planned
Targets: `packages/flux-renderers-industrial/src/**`（按基线差距）、`docs/analysis/industrial-hmi/benchmark-report.md`

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision`：按 Phase 1 基线结果裁定优化项清单——设计文档预设优化面（图元实例化、裁剪、脏区、数据节流、动画合帧，design-engine.md §4.6 策略）逐项对照基线：达标且余量充分 → 记录裁定不优化；存在差距 → 列入优化执行；优化候选排序（收益/风险）。
- [ ] `Fix`：按裁定执行优化（如 batch.add 批量入树（m-8 对照结论）、裁剪/脏区策略、数据节流参数、动画合帧路径），每项优化落地携带 focused 单测（行为不回归，I8–I11 既有测试保持绿为硬约束）。
- [ ] `Proof`：逐项复测记录——每项优化后重跑 `scada-perf.spec.ts` 对应测量项，数值与基线对比记录入 benchmark 报告（优化前后表格）。

Exit Criteria:

- [ ] 优化项清单裁定记录（达标项 + 差距项 + 排序）已入 benchmark 报告。
- [ ] 执行的优化项全部落地且 focused 单测全绿（既有 I8–I11 测试未被弱化）。
- [ ] 每项优化复测数值已记录（优化前后对比）。

### Phase 3 - I14.3 复测与结论固化

Status: planned
Targets: `docs/analysis/industrial-hmi/benchmark-report.md`、`docs/components/roadmap-industrial-hmi.md`

- Item Types: `Fix | Decision | Proof`

- [ ] `Proof`：最终复测——全项重跑 `scada-perf.spec.ts`（10 万图元首屏创建/拖动 fps（双口径）/内存（含无 stroke 对照组）/1 万点刷新延迟），数值对照验收包络（≥45fps / 首屏 <2s / 内存 ≤320MB / 刷新 <200ms）。
- [ ] `Decision`：达标裁定——全项达标 → 结论写入 benchmark 报告（含测量口径声明、spike 对照、余量分析）；任一项不达标 → 分析瓶颈 + **标记人工决策**（roadmap「人工确认阈值」，不自动推进，Failure Paths `benchmark-not-pass`）。
- [ ] `Fix`：roadmap Phase Status I14 回写 `done`（前置：本 plan Closure Gates 全通过 + 独立 closure-audit 通过——由独立 closure-audit session 核验后执行）；`docs/logs/2026/08-04.md`（或当日日志）记录本 plan 产出摘要（含 benchmark 结论摘要）。

Exit Criteria:

- [ ] benchmark 报告最终版含：最终复测数值表、验收包络对照（逐项达标/不达标）、达标结论或人工决策标记、测量口径与环境声明。
- [ ] 不达标时 roadmap 已标记人工确认项并暂停推进；达标时 roadmap I14 状态与本文一致（`planned` → `done` 由独立 closure-audit session 核验后回写）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，round 1 task `ses_0367a8836ffeMttJLRO6MccCyd`、round 2 task `ses_03674de04ffeAKzBKdo9ENFWyx`）
- Verdict: `pass-with-minors`（round 2；round 1 `revise`，1 Major + 4 Minor 落地；round 2 零 Blocker/Major，1 Minor 落地）
- Rounds: 2
- Findings addressed: Major 补 `perf-injection-channel` Decision（`component:setPointValues` 不存在——批量写仅 domain 层 `point-store.setPointValues`，逐点 setPointValue 污染测量；裁定 dev/test 专用批量方法挂测试句柄 vs scope-bridge，非公共契约变更不触发人工确认阈值）；m-1 calendar-perf-scale 先例改述（独立页/路由）且无 stroke 对照变体纳入加载裁定选项空间；m-2 首屏计时口径明示（`组态生成完成 → tree render 首帧`，对齐 spike 165.3 ms）；m-3 perf spec 超时档位 180_000 声明；m-4 空 `## Optional Sections` 移除；round 2 minor 措辞修正（scope-bridge 通道可达性限定：需 1 万 `source:'flux'` 变量声明 + 订阅/求值链路注入，`无 e2e 可达通道` 绝对化表述修正）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] `tests/e2e/scada-perf.spec.ts` 四项测量可重复运行（首屏/拖动 fps 双口径/内存含无 stroke 对照/1 万点刷新延迟）。
- [ ] `benchmark-report.md` 达成文档共识（≤3 轮），含：测量方法/环境/基线/优化前后对比/最终复测结论。
- [ ] gate-3-review §10 归属兑现（1 万点批量合并断言 + batch.add 对照复测记录）。
- [ ] 达标则结论固化（含余量分析）；不达标则 roadmap 已标记人工决策且暂停推进（无静默放行）。
- [ ] 优化项无行为回归（focused 单测 + 既有 I8–I11 测试全绿）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] `docs/logs/2026/08-04.md`（或当日日志）已记录收口摘要。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 架构文档同步与 e2e 断言补强（I15 域）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 架构文档（renderer-runtime/模块边界）同步属 I15.2 收尾、正式 e2e 程序化断言补强属 I15.1（roadmap 既定顺序）；benchmark 报告只在本计划内固化测量口径与结论，不承担文档收尾职责。
- Successor Required: `yes`
- Successor Path: roadmap I15.1/I15.2

### 编辑器交互性能（I16 域）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑器交互（拖拽/多选/属性面板）不在本期范围（讨论 Q8 + I11.2 Non-Goals），其性能面随 I16 编辑器立项后再评估；本期性能红线只覆盖运行时渲染链路。
- Successor Required: `yes`
- Successor Path: roadmap I16（编辑器后继 mission 立项入口）

## Non-Blocking Follow-ups

- benchmark 报告中的测量方法固化结果可作为后续版本性能回归的基线（与既有 calendar/gantt/diff perf spec 并列）。
- 若优化轮发现 leafer 侧可配置项（如 watcher 参数/渲染缓冲），记录供未来版本评估，不越界改 leafer 行为。

## Closure

Status Note: 待关闭时填写。

Closure Audit Evidence:

- Auditor / Agent: 待独立 closure-audit session 填写
- Evidence: 待填

Follow-up:

- 待关闭时填写。

## Risks And Rollback

- **验收不达标风险**：mission 包络（≥45fps/首屏 <2s/内存 ≤320MB/刷新 <200ms）如复测不达标，按 roadmap 人工确认阈值标记人工决策，不自动降标（design-engine.md §4.6 风险节同口径）。
- **测量环境漂移风险**：headless 无 vsync 导致吞吐≠显示帧率（A4）——双口径固化 + 环境声明，避免跨口径误判；内存测量固化 CDP 采样点 + 无 stroke 对照组。
- **优化引入回归风险**：I14.2 优化均携带 focused 单测，既有 I8–I11 测试保持绿为硬约束；发现回归立即回退或修复，全量验证归 Closure Gates 兜底。
