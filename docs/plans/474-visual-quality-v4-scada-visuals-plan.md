# 474 视觉质量 V4：SCADA/工业视觉修复 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-19
> Source: `docs/analysis/visual-quality/V4-scada-visuals.md`（已独立核实 pass：0 Blocker / 0 Major）、`docs/backlog/visual-quality-roadmap.md` V4、`docs/components/industrial-hmi/design-*.md`
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（V0 工具链）

## Purpose

把路线图 V4 收口：I17 后残余视觉问题 13 项候选逐项裁定（1 项 Fix + 2 项 Fix + 10 项显式 adjudicated/维持既往裁决）、`background.grid` 死配置 runtime 消费、画布尺寸声明 vs 渲染一致性 e2e L2 守护、报警/趋势组件边界显式否决落卡。不重打 I17 已完成工作。

## Current Baseline

- master @ d0fdfa088（V3 收口；unit 74/74、3D 包 204/204、scripts 70/70、check 全绿；全量 e2e 1479 passed / 2 负载 flake 隔离 20/20）。
- `background.grid` 死配置全链：`serialization/validate.ts:59-73` 校验接受、`config-types.ts:107` 类型、engine 仅消费 color（`scada-engine.ts:139-141/:212-214`，:211 watch-only 注释）、demo 传死参（`scada-demo.tsx:27/:96`）、`demo-visual-design.md:39` 网格规格 `#dae3ec size 24` + :168 验收项承诺未兑现、单测固化忽略（lifecycle :230-241）。
- leafer 分层：engine:130 `ground: {}` 建层、视口变换仅作用 `tree.zoomLayer`（:393/:397/:460-519）、hittable:false 先例（interaction-overlay.ts:90）。
- 画布尺寸：P1-5 修复在案（scada-engine.ts:96-108 容器优先/schema fallback + viewport-resize 单测 :44-97）；e2e 无「声明 vs 实际」对比断言（scada-canvas-assert.ts:54-57 仅非零）。
- 报警/趋势：24 内置图元无趋势/报警表组件；既往裁决逐字在案（design-data-binding.md:410、design-symbols.md:165-169）；报警视觉原语已有（状态三色 + fault blink + value-to-state）。
- R5 scada-image loadFailed 诊断：决策锁定 ⑤ 维持现状（roadmap-industrial-hmi.md:31），重开须 Rule 3 人工确认。
- 既有 scada e2e 37 test 基线（scada-demo 15 + edge-cases 6 + perf 5 + pressure 3 + editor-interaction-correctness 2 + editor-perf 3 + pointer-events-regression 1 + leafer-examples 2）。

## Goals

- `background.grid` runtime 消费：ground 层静态网格线（size/color），构造期与 reset 期接线；无 grid 配置零绘制（向后兼容）；demo 即时受益（兑现 demo-visual-design.md 规格与验收项）。
- 尺寸一致性回归守护：「schema 声明尺寸 vs 实际 canvas boundingBox」L2 断言进 e2e（声明尺寸/容器自适应两态）。
- 报警/趋势组件边界显式否决落卡（维持既往裁决，登记非静默）。
- R1-R13 全量裁定落证据卡。

## Non-Goals

- 硬编码色令牌化与豁免收紧（R2/R13 → V12a）。
- 运行时 dark 切换（R3 编写期主题裁定）。
- 报警/趋势新组件族（A2 否决，归 industrial-hmi roadmap 新 item）。
- scada-image loadFailed 画布诊断（R5 决策锁定 ⑤，重开待人工确认）。
- 文本像素验证（R6）、多画面导航/视口持久化/编辑器覆盖物（R9/R11/R12 既往裁决）、inter-frame 跳变 warn（R8 作者契约）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`：ground 层网格绘制（构造期 + reset 期；`hittable:false`；无 grid 零绘制）。
- `packages/flux-renderers-industrial/src/**/__tests__`：网格接线单测（先红后绿）。
- `tests/e2e/helpers/scada-canvas-assert.ts`（或 spec 层组合）：L2 尺寸一致性断言；`tests/e2e/scada-demo.spec.ts` 消费（自适应态）。
- `apps/playground/src/pages/scada-edge-demo.tsx`：增第二画布——固定 960×520 容器 + 显式声明 960×520 的 scada schema（draft review M-1：「声明尺寸态」载体——scada-canvas 容器恒 h-full w-full、schema 尺寸仅 engine fallback，须有"容器恰为声明尺寸"的场景该断言才可构造；自适应态由现有 flex 布局画布承载）。
- Owner docs：`docs/components/industrial-hmi/design-renderer.md` §4.2 grid 消费语义改写；证据卡 industrial-scada.md R1-R13 裁决回写；roadmap/daily log。

### Out Of Scope

- R2/R13 硬编码色与 token 化（V12a）、R3 dark、报警/趋势组件、R5-R12 各既往裁决项、editor 侧（I16 线所有）。

## Failure Paths

| 场景        | 触发                      | 行为                                                                                        | 可重试 | 用户可见表现     |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------- | ------ | ---------------- |
| grid-absent | schema 无 background.grid | 零绘制（与现行为一致）                                                                      | —      | 无网格，向后兼容 |
| grid-reset  | 场景 reset                | 网格按当前配置重绘（与 background.color 同路径）                                            | —      | 网格持续正确     |
| grid-resize | 容器尺寸变化（setSize）   | 网格按新尺寸重绘（先清后绘，draft review M-2 接线裁定——几何线节点不随 app.resize 自动铺满） | —      | 网格持续覆盖画布 |
| perf-noise  | 万级图元 + 网格           | 网格为 O(cols+rows) 常量线数一次性绘制，无逐图元成本；scada-perf 阈值回归守护               | —      | 无               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——grid 消费是行为变更（死配置 → 真实视觉），单测先红后绿 + e2e 像素/几何断言双通道；尺寸一致性守护本身即测试。

## Execution Plan

### Phase 1 - grid runtime 消费（ground 层网格）

Status: completed
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts`、`src/**/__tests__`

- Item Types: `Proof | Fix`

- [x] Proof：单测先红（沿 lifecycle-wiring :230-241 的 ground 断言模式 + leafer-ui-mock 已 mock 的 MockLine/MockRect 可断言 points/stroke/config）——①构造期传 `background.grid` → ground 层出现网格线子节点（子节点/线段数与 size 换算断言）；②reset 后网格仍在且随配置更新（**先清后绘、重复 reset 不叠加线节点**——断言线段数，draft review m-1）；③无 grid 时 ground 层无网格节点（向后兼容不变式）；④setSize 后网格按新尺寸重绘
- [x] Fix：scada-engine ground 层网格绘制——按 `grid.size/color` 画线（Leafer Line/Rect，`hittable:false` Group，先例 interaction-overlay.ts:90），构造期与 reset 期同路径接线；无 grid 零绘制
- [x] Fix：`setSize` 路径网格重绘接线（draft review M-2：几何线节点不随 app.resize 自动铺满）+ 单测（setSize 前后线段数 28→58 断言）
- [x] Fix：单测转绿；全包既有测试零回归

Exit Criteria:

- [x] 单测先红后绿有记录（stash 接线真实红态 4/4 失败 → 恢复 4/4 绿）；industrial 全包零回归
- [x] 无 grid 配置时零绘制不变式有单测

### Phase 2 - 尺寸一致性 e2e 守护 + owner docs 收口

Status: completed
Targets: `tests/e2e/helpers/scada-canvas-assert.ts`（或 spec 层）、`tests/e2e/scada-demo.spec.ts`、`docs/components/industrial-hmi/design-renderer.md`、证据卡 industrial-scada.md

- Item Types: `Proof | Fix`

- [x] Proof：新增/扩展 e2e——守护主判据「**canvas 绘制缓冲（width/height ÷ devicePixelRatio）vs 容器 boundingBox**」L2 断言（二轮 review M-1：CSS `inset:0` 使 canvas bbox 恒等于容器盒，bbox 对比无守护力），红态可构造=模拟缓冲/容器错配探针；两态 bbox 载体降级冒烟断言：①声明尺寸态——edge-demo 新增的 960×520 固定容器画布（声明 == box）；②容器自适应态——scada-demo 现有 flex 画布（box == 容器，P1-5 语义）。grid 像素断言固定采样语义：ground canvas 采样断言 ≥2 种颜色（或 grid 色出现）。既有 scada 套件零回归
- [x] Fix：`design-renderer.md` §4.2 grid 消费语义改写（:162 watch-only 声明失效 → ground 层网格消费语义 + 无 grid 零绘制契约）
- [x] Fix：证据卡 industrial-scada.md 回写——F1→A1 fixed、F2→A2 显式否决（维持既往边界 + industrial-hmi roadmap 新 item 归属）、F3→A3 fixed、F4→R1-R13 三态裁定表（R5 决策锁定 ⑤ + 重开候选待人工确认登记）；roadmap V4 状态翻转

Exit Criteria:

- [x] 新增 e2e 断言全绿（缓冲/容器盒主判据轮询断言 + 两态 bbox 冒烟 + 网格组 test-handle 证据承载 A1 的 e2e 证据面）；缓冲断言红态=构造期容器测量竞态（1374 vs 960 实录，防抖收敛后 match）
- [x] 既有 scada 37 test 零回归（37+2=39/39；执行期修复 edge-demo 双画布 strict-mode 冲突——helper 增 scopeTestId + spec 定位收窄）
- [x] owner docs 与证据卡回写完成且与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-20，一轮）
- Verdict: `pass-with-minors`（0 Blocker / 2 Major / 5 Minor；审查员明示文本层修正后可达 pass 升 active）
- Rounds: 1
- Findings addressed: M-1——「声明尺寸态」载体补进 Scope（edge-demo 第二画布：960×520 固定容器 + 显式声明 schema）；M-2——grid-resize 行为缺口接线（setSize 重绘 + Failure Path + Proof ④）。Minor 1-5 择要落字（先清后绘不叠加断言、R10 枚举补齐、closure 时核对 design-data-binding.md §9.3 维持、执行期记录所选证据通道）。

### 第二轮独立 review（并行 fresh sub-agent session，2026-09-20）

- Reviewer / Agent: 独立 plan review 审查员 B（fresh sub-agent session）
- Verdict: `revised`（0 Blocker / 1 Major / 4 Minor）→ 修订后零 Blocker/Major
- Findings addressed: **M-1——bbox 尺寸断言在现 CSS 下恒真**（`styles.css:9-12` `.nop-scada-canvas-canvas { position:absolute; inset:0 }` 使 canvas 布局盒恒等于容器盒，「canvas bbox vs 容器 bbox」任何场景恒绿、回放原始 960/302 缺陷也不会红）——Phase 2 守护主判据升级为「**canvas 绘制缓冲（`canvas.width`/`canvas.height` ÷ devicePixelRatio）vs 容器 boundingBox**」，bbox 两态降级为载体 + 防样式表丢失冒烟断言；红态构造=模拟缓冲/容器错配（schema 宽直传 buffer 或 RO refit 断链探针）。m-1——grid 像素断言固定采样语义（ground canvas 采样 ≥2 种颜色或 grid 色出现；「任一 canvas 非零像素」三层扫描语义在 grid 合入前即绿，不可先红）。m-2——setSize 重绘（与首轮 M-2 同点，已吸收）。m-3——单测落点写实 colocated 路径。m-4——构造期 grid 接线无 runtime 调用方（renderer 仅经 reset 传 background），备案于 Exit。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–2 Exit Criteria 全勾）
- [x] 全部 in-scope 死配置已收敛：background.grid validate→runtime 消费链闭环
- [x] 行为/契约结果已达成：demo 场景网格视觉兑现（demo-visual-design.md 规格与验收项）；尺寸一致性守护常态化
- [x] 必要 focused verification 已完成（单测先红后绿 + scada 37 test 零回归 + scada-perf 回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（A2 否决/R5-R12 adjudicated 均有研究报告与既往裁决背书）
- [x] 受影响 owner docs 已同步：design-renderer.md §4.2、证据卡 industrial-scada.md、roadmap 状态、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（closure audit：`issues`——1 Major 全量 e2e 证据悬空 + 5 Minor；修正含 V4 树上全新全量 e2e 补跑与文本更正后达标。审计明示"修正后可直接进入完成标记"）
- [x] `pnpm typecheck`（40/40）
- [x] `pnpm build`（40/40）
- [x] `pnpm lint`（40/40）
- [x] `pnpm test`（74/74；industrial 1455/1455 含 ground-grid 4 用例）
- [x] `pnpm check`（全链 exit 0；industrial 豁免基数不变——本域零新硬编码色）

## Deferred But Adjudicated

### 报警/趋势组件族（研究报告 A2）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: FUXA 式报警状态机/历史数据通道超组态渲染内核边界（design-data-binding.md:410 既往裁决仍成立）；报警视觉原语已存在；新组件族立项归 industrial-hmi roadmap
- Successor Required: `no`（如需推进走 industrial-hmi roadmap 新 item，非 visual-quality 侧）

### scada-image loadFailed 画布诊断（R5）

- Classification: `watch-only residual`
- Why Not Blocking Closure: industrial-hmi roadmap 决策锁定 ⑤「维持现状=不再独立 plan 推进」（:31 在案）；重开须 Rule 3 人工确认，本 plan 不自行重开，证据卡已登记重开候选
- Successor Required: `no`（重开须人工确认后于 industrial-hmi 侧立项）

## Non-Blocking Follow-ups

- R2/R13 硬编码色令牌化与豁免收紧：V12a 排程。
- R3 dark 主题编写期裁定、R6 文本像素验证、R8 warn 语义、R9 多画面、R11 视口持久化、R12 编辑器覆盖物：各既往裁决归属，无新动作。

## Closure

Status Note: 两 Phase 全 completed；closure audit（fresh session）实跑 industrial 单测 1455/1455、size-consistency 2/2、build/check 绿，机制抽查（先清后绘/三路径接线/scopeTestId/零绘制守卫）与 owner docs 逐点吻合；1 Major（全量 e2e 证据悬空——执行者误引 V3 树数字）与 5 Minor 修正后达标。特别记录：全量 e2e 的 flow-designer 无限渲染失败系并行会话在途 V5 代码（未入库）所致，已如实归因，V4 域内证据面完整。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-20）
- Evidence: 实跑 industrial 1455/1455、size-consistency 2/2、build/check 绿；M-1 修正=V4 树全新全量 e2e 补跑（1478 passed / 5 failed，失败逐项归因：flow-designer ×2 系并行在途代码、ai-attachments ×2 与 gantt-perf ×1 隔离复绿）+ log/commit 口径更正；Minor-1 计数 1455 如实、Minor-2 Phase 2 completed、Minor-3 陈旧注释清除、Minor-4 §9.3 交叉引用更正、Minor-5 V5 行登记。

Follow-up:

- no remaining plan-owned work（R2/R13 归 V12a；R5 重开候选待人工确认；报警/趋势组件族归 industrial-hmi roadmap）
