# 01 Industrial HMI Component Audit — HCA6 Symbol Shapes（23 内置图元 23 维包级深审 + 自动修复）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA6. Symbol shapes 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA6；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；symbol shapes 非复杂交互层，维度 21-23 可选触发）；几何/属性先验基线 `docs/plans/2026-08-06-0900-2-industrial-hmi-symbol-geometry-property-consistency.md`（completed）
> Related: HCA5（completed，symbols core 框架基线，本 plan 前置依赖）、HCA0（done，编排基线）、HCA-BL（successor，bug 归档）、HCA-CR（successor，跨层集中修复；HCA5 P3-2「无 extent+无 resize hook 时 width/height 静默丢弃」标注归 HCA6/HCA-CR）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **symbol shapes 层**（5 族 27 源文件，~1,660 行，23 个内置图元定义 + 4 个族级 `common.ts` helper）做一次完整的 23 维包级深审，把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，复核 HCA5 P3-2 转交的「符号定义 resize 责任」问题（逐图元核查 width/height binding 响应 + resize hook 注册），产出审计记录文件。symbol shapes 是 industrial 包图元库的实体定义层——23 个图元的 create/applyProps 几何正确性、状态驱动视觉、动画绑定、diff-resize 响应直接决定 SCADA 画面的渲染保真与交互正确性。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/symbols/` 5 个图元族子目录，行号/`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览一致）。

### 审计对象：5 族 27 源文件（`wc -l` 实测）

**base-shapes（11 文件 / 10 图元 + common.ts helper / ~564 行）**：

- `base-shapes/common.ts`（32）— `toShapeAttrs(props)`：将 `ScadaSymbolProps`→leafer attrs 的共享映射（13 direct keys + scale→scaleX/scaleY + strokeDash→dashPattern + fillStyle→fill 透传）。所有 base 图元 create/applyProps 共用。
- `base-shapes/rect.ts`（35）— `scadaRectDefinition`：矩形图元。
- `base-shapes/round-rect.ts`（36）— `scadaRoundRectDefinition`：圆角矩形。
- `base-shapes/ellipse.ts`（35）— `scadaEllipseDefinition`：椭圆。
- `base-shapes/line.ts`（65）— `scadaLineDefinition`：线段（含 x1/y1/x2/y2 端点映射 + strokeDash）。
- `base-shapes/arrow.ts`（65）— `scadaArrowDefinition`：箭头（含方向 + 箭头头部几何）。
- `base-shapes/pipe.ts`（69）— `scadaPipeDefinition`：管道（含 path 几何 + flow 动画接入）。
- `base-shapes/polygon.ts`（45）— `scadaPolygonDefinition`：多边形（points 数组驱动）。
- `base-shapes/text.ts`（86）— `scadaTextDefinition`：文本（含 fontFamily/fontWeight/align/textSize→fontSize 映射）。
- `base-shapes/image.ts`（52）— `scadaImageDefinition`：图片（含 imageUrl + engine image bridge resolveImageUrl）。
- `base-shapes/video.ts`（44）— `scadaVideoDefinition`：视频（含 videoUrl）。

**device（5 文件 / 4 图元 + common.ts / ~328 行）**：

- `device/common.ts`（75）— `createDeviceSymbol` 装配器：parts WeakMap 绑定 + 统一 applyProps 路由（复用 `composite.ts applyCompositeProps`）+ `deviceStates`（run=绿/stop=灰/fault=红+闪烁）+ `deviceRunRotateAnimation`（run 态转子旋转）。
- `device/motor.ts`（57）— `scadaDeviceMotorDefinition`：电机（rotor 旋转件）。
- `device/pump.ts`（58）— `scadaDevicePumpDefinition`：水泵（rotor 旋转件）。
- `device/valve.ts`（70）— `scadaDeviceValveDefinition`：阀门（阀芯开度路由 + applyProps 增量钩子）。
- `device/fan.ts`（68）— `scadaDeviceFanDefinition`：风机（blades 旋转件 + parts.resize hook）。

**instrument（5 文件 / 4 图元 + common.ts / ~342 行）**：

- `instrument/common.ts`（48）— `createInstrumentSymbol` 装配器（与 device 同型：parts WeakMap + applyCompositeProps 路由 + 仪表族默认状态色）。
- `instrument/gauge.ts`（77）— `scadaInstrumentGaugeDefinition`：仪表盘（needle 指针 + value→角度映射）。
- `instrument/level.ts`（68）— `scadaInstrumentLevelDefinition`：液位计（liquid extent + value→高度映射）。
- `instrument/thermometer.ts`（87）— `scadaInstrumentThermometerDefinition`：温度计（liquid bar + value→高度映射）。
- `instrument/progress.ts`（62）— `scadaInstrumentProgressDefinition`：进度条（bar extent + value→宽度映射）。

**sensor-control（5 文件 / 4 图元 + common.ts / ~307 行）**：

- `sensor-control/common.ts`（64）— `createSensorControlSymbol` 装配器（同型：parts WeakMap + applyCompositeProps + 传感族默认状态色）。
- `sensor-control/sensor.ts`（52）— `scadaSensorControlSensorDefinition`：传感器。
- `sensor-control/indicator.ts`（61）— `scadaSensorControlIndicatorDefinition`：指示灯（booleanMap 状态色驱动）。
- `sensor-control/switch.ts`（76）— `scadaSensorControlSwitchDefinition`：开关（toggle 视觉 + booleanMap）。
- `sensor-control/button.ts`（54）— `scadaSensorControlButtonDefinition`：按钮（press/release 视觉）。

**pipe（1 文件 / 1 图元 / ~118 行）**：

- `pipe/pipe-junction.ts`（118）— `scadaPipeJunctionDefinition`：管道接头（多端口 path 几何 + 管道连接拓扑；本层最大文件）。

### 6 colocated 测试文件（喂入 Phase 1/2 回归，不纳入审计对象 / 1,911 行）

`base-shapes/media-symbols.test.ts`（144）/ `base-shapes/style-refinement.test.ts`（107）/ `device/device-symbols.test.ts`（524）/ `instrument/instrument-symbols.test.ts`（376）/ `sensor-control/sensor-control-symbols.test.ts`（399）/ `pipe/pipe-symbols.test.ts`（361）。

### 已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）

- **symbol 几何/属性 P2 一致性**（0900-2 completed）：base-shapes create/applyProps 几何参数读写对称、device/instrument/sensor-control composite applyProps 路由、resize hook 注册（fan/motor/pump/valve/gauge/level/thermometer/progress）。
- **symbols core 框架**（HCA5 completed）：`fontFamily`/`fontWeight`/`align` 跨层 diff 漏键（P1-1）已修 + `check-scada-symbol-keys.mjs` 守卫已落地。本 plan shapes 消费此框架基线。

### HCA5 转交项（P3-2，本 plan 必须复核）

HCA5 P3-2（`composite.ts:72-77`）：无 extent part 且无 `parts.resize` hook 时，width/height 静默丢弃。HCA5 裁定归 HCA6/HCA-CR（符号定义责任）。**本 plan 逐图元核查**：每个 composite 族图元（device 4 + instrument 4 + sensor-control 4 = 12 个）是否注册了 resize hook 或声明了 extent part；未注册者确认为 P3（author-controlled + 框架行为可辩护）或升级为 P2（若导致 live 渲染缺陷）。

### owner doc 现状

`docs/components/industrial-hmi/design-symbols.md` §4.4「图元分类（映射 I8/I9）」+ §5「字段分类」+ §10「样式与 DOM marker 约定」文档化 23 图元分类与属性 schema。Phase 3 核对这些章节与 live shapes 一致性。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1300+ tests / 97 test files）。

## Goals

- 对 5 族 27 源文件逐文件完成 23 维包级深审，产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 复核 HCA5 P3-2 转交项：逐图元核查 resize hook 注册 / extent part 声明，给出 per-shape 裁定（landed fix / confirmed P3 watch-only）。
- owner doc `design-symbols.md` §4.4/§5/§10 与 live shapes 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca6-symbol-shapes.md`。

## Non-Goals

- 不审计 symbols core 框架层（8 顶层文件，HCA5 done）。
- 不审计 renderer / engine / binding / serialization / editor 层（HCA1/HCA2 done、HCA3 done、HCA4 done、HCA7 planned、HCA8–HCA11 todo）。
- 不重做已收口的几何/属性 P2 修复（0900-2，仅 Phase 3 抽查回归）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改图元注册公共面或 ScadaSymbolDefinition 契约（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/symbols/base-shapes/`（11 源文件）。
- `packages/flux-renderers-industrial/src/symbols/device/`（5 源文件）。
- `packages/flux-renderers-industrial/src/symbols/instrument/`（5 源文件）。
- `packages/flux-renderers-industrial/src/symbols/sensor-control/`（5 源文件）。
- `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`（1 源文件）。
- 审计记录 `docs/audits/2026-08-08-*-hca6-symbol-shapes.md`。
- owner doc `docs/components/industrial-hmi/design-symbols.md` §4.4/§5/§10（仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/symbols/` 顶层 8 文件（symbol-types/registry/factory/style-resolver/visual-state/composite/compound/register-builtin，HCA5 done）。
- `*.test.ts` / `*-fixtures.ts` / `index.ts` barrel（测试基础设施 / 聚合导出，不纳入审计对象，仅作回归喂入）。
- `src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）、`src/renderer/`（HCA1）、`src/editor/`（HCA7–HCA11）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Failure Paths

> symbol shapes 是图元实体定义层，无外部 IO / 鉴权 / API 契约。失败路径关注点是几何边界与状态驱动的降级行为。

| 可测场景编号         | 触发                                                         | 行为                                                        | 可重试 | 用户可见表现                   |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | ------ | ------------------------------ |
| shape-zero-size      | width=0 或 height=0 传入 create/applyProps                   | 几何不产生 NaN/Infinity；渲染退化或空图形（不崩溃）         | 否     | 图元不可见或退化，无控制台异常 |
| shape-resize-no-hook | composite 族图元无 resize hook 时 applyProps 改 width/height | width/height 不生效（HCA5 P3-2 已知行为）；应可识别不静默吞 | 否     | 图元尺寸不响应 resize          |
| shape-state-no-match | 状态值不匹配声明 states                                      | 回退默认样式（不 throw）                                    | 否     | 图元显示默认外观               |
| shape-nan-geometry   | rotation/points 含 NaN                                       | 不传播为 leafer attr NaN（守卫或跳过）                      | 否     | 图元正常渲染默认值             |

## Test Strategy

本档选择：**建议有测**

symbol shapes 是图元实体定义层（create + applyProps + 状态驱动视觉），非注册 renderer。审计前无已知 P0/P1 live defect（先验 0900-2 几何/属性 P2 已收口）。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（几何正确性 / resize 响应 / 状态色驱动 / 动画绑定）为主。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage + HCA5 P3-2 复核

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/`（5 族 27 源文件）、`docs/audits/2026-08-08-*-hca6-symbol-shapes.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（symbol shapes 非复杂交互层，维度 21-23 可选触发），按族分组审查。重点维度：
  - **几何正确性**（维度 21 可选触发）：create() 内 leafer 节点构造的坐标/尺寸/路径数学（pipe path、arrow 方向、gauge needle 角度、level/thermometer value→高度映射、polygon points 闭合）；width/height=0 / NaN / 负值边界。
  - **applyProps 路由正确性**：base-shapes `toShapeAttrs` 映射穷尽性（13 direct keys + scale/strokeDash/fillStyle）；device/instrument/sensor-control composite `applyCompositeProps` 路由 + 族级增量钩子（valve 阀芯开度）。
  - **diff-resize 响应**：每个 composite 族图元的 `parts.resize` hook 注册情况；base-shapes 非 composite 图元的 width/height binding 响应路径。
  - **状态驱动视觉**：device `deviceStates`（run/stop/fault）、instrument/sensor-control 状态色声明与 visual-state apply/revert 配合；booleanMap 映射。
  - **动画绑定**：device `deviceRunRotateAnimation`（run 态）、pipe flow 动画、fault 闪烁；`when.state` 联动正确性。
  - **create/applyProps 幂等与对称**：重复 applyProps 不累积；applyProps 后再 create 等价。
  - **类型安全**：`LeafNode` cast、`as unknown as { add }` leafer 内部方法访问、props 字段窄化。
- [x] 重点抽查边界值：空 props / width=0 / height=0 / rotation=NaN / points=[] / value 超量程（>1 或 <0）/ 无匹配 state / 无 imageUrl / 无 videoUrl / 深嵌套 group。
- [x] **HCA5 P3-2 复核（必须逐图元）**：对 12 个 composite 族图元（device motor/pump/valve/fan + instrument gauge/level/thermometer/progress + sensor-control sensor/indicator/switch/button）核查：是否注册 `parts.resize` hook？是否声明 extent part？未注册者确认为 P3（框架行为可辩护 + author-controlled）或升级 P2（若导致 live 渲染缺陷）。pipe-junction（非 composite）单独核查 width/height 响应路径。base-shapes 10 个非 composite 图元核查 `toShapeAttrs` 是否覆盖 width/height（direct keys 含此二者）。
- [x] 产出 `docs/audits/2026-08-08-*-hca6-symbol-shapes.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）+ HCA5 P3-2 per-shape 裁定表。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 5 族 27 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。
- [x] HCA5 P3-2 per-shape 裁定表存在（13 个 composite/pipe 图元（12 composite + 1 pipe-junction）+ 10 个 base-shapes 各一行裁定 = 23 行）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。
  > 本 plan 零 P0/P1 finding（Phase 1 triage 确认），本项 vacuously satisfied。
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [x] 若 HCA5 P3-2 复核发现有图元应升级为 P2（resize 缺失致 live 渲染缺陷），test-first 补 resize hook。
  > pipe-junction 升级为 P2-1，failing-first 2 test → 补 width/height resize 逻辑（重算 body + stubs points）→ 转绿。
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。
  > 零 P0/P1；P2-1 failing-first 2 test 转绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
  > 97 test files / 1309 tests（+2 regression），typecheck/lint 全绿。
- [x] 审计记录 finding 状态已回写（含 HCA5 P3-2 per-shape 裁定结果）。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi/design-symbols.md`（§4.4/§5/§10）、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 `design-symbols.md` §4.4（23 图元分类映射）/ §5（字段分类）/ §10（样式 marker）与 live shapes 一致；仅当发现 drift 时同步（无 drift 不写）。
  > 6 契约逐条核对，无 drift（§4.4 23 图元 = register-builtin 24 entries 含 group；§10 P2-4 Decision 范围为 composite 族，pipe-junction 不在范围）。
- [x] 抽查先验修复回归（0900-2 几何/属性 P2 + HCA5 P1-1 漏键守卫 行为仍成立）。
  > 97 test files / 1309 tests 全绿，6 覆盖文件逐项确认。
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。
  > P2-1 pipe-junction 候选（单包，根因中非显然）喂入。

Exit Criteria:

- [x] `design-symbols.md` §4.4/§5/§10 经 rg/读核对待无 drift（或有同步 commit）。
- [x] 先验修复回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`，或明确「无复杂/跨层 bug 候选」+ 理由）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_0209b5f7affe7KWdlF3Mk9DnRB`（R1）→ `ses_02097c40fffeeMdhHKwDDq3z4z`（R2）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 M-1（Phase 1 P3-2 复核 + Exit Criteria 漏算 sensor-control 4 个 composite 图元，8→12 / 19→23 行）——已修正为 12 composite（device 4 + instrument 4 + sensor-control 4）+ 1 pipe-junction + 10 base = 23；R1 m-1（test count ~1307 与 sibling 文档不一致）——已改为 ~1300+；R2 m-2（Current Baseline HCA5 转交项节残留旧计数 "8 个"）——已同步为 12。Live repo 全量复核通过：27 源文件行数精确、6 测试文件行数精确、HCA5=done/HCA6=todo、HCA5 P3-2 转交确认、23-dim methodology + dims 21-23 optional、register-builtin 24 entries（23 shapes + 1 group）、design-symbols.md §4.4/§5/§10 存在、predecessor plans completed。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。
>
> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18），不在 Phase Exit Criteria 重复。

- [x] 5 族 27 源文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。
  > 零 P0/P1（Phase 1 triage 确认）；P2-1 test-first 修复（failing-first 2 test）。
- [x] HCA5 P3-2 转交项已逐图元复核并裁定（landed fix / confirmed P3 watch-only，per-shape 裁定表入审计记录）。
  > 12 composite 全部有 extent(3) 或 resize hook(9)，无静默丢弃；pipe-junction 升级 P2-1 landed fix；10 base 全响应 width/height。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc `design-symbols.md` §4.4/§5/§10 与 live baseline 一致（或明确无 drift）。
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
  > 独立子 agent fresh session `ses_02083e810ffeCdi5DCHN4TvasA` verdict: PASS（2026-08-08）。逐条核对：plan checklist 全 [x]、P2-1 fix 真实且 create↔applyProps 公式一致、审计记录 27 文件 + 23 行裁定表、P3-2 抽查 motor/level/pipe-junction 匹配 live、0 P0/P1 无静默降级、重跑 97 files/1309 tests green。
- [x] `pnpm typecheck`
  > 32/32 successful。
- [x] `pnpm build`
  > 32/32 successful。
- [x] `pnpm lint`
  > 32/32 successful。
- [x] `pnpm test`
  > industrial 97 files / 1309 tests（+2 regression）；全 workspace 包 green。

## Deferred But Adjudicated

> 起草时无已知可延期项。HCA5 P3-2 待 Phase 1 复核后裁定（若确认 P3 watch-only 则补条目于此，Classification + Why Not Blocking Closure）。

Phase 1 复核后确认的 P3 watch-only 项（归 HCA-CR，不阻塞 closure）：

- **P3-1**（switch.ts:60-62）：resize hook 用 `lever.x !== 3` 推断 on/off，width===height 时 on 位 x=3 误判 off。Classification: P3 watch-only。Why Not Blocking Closure: 默认 48×28 不触发，需 author 显式设 width===height 边缘尺寸；非 live 渲染缺陷（主路径正确）。
- **P3-2**（level.ts:42 / thermometer.ts:50 / progress.ts:44）：extent 族容器 width/height 变更丢失 create-time 内边距（cosmetic）。Classification: P3 cosmetic。Why Not Blocking Closure: 容器 resize 非主绑定用例（主用例 height→liquid/bar 填充正确）；视觉影响仅内边距像素级。
- **P3-3**（polygon.ts:41）：`custom.points=[]` 空数组 → 空图形无 fallback。Classification: P3 author-controlled。Why Not Blocking Closure: author 显式清空 points 的语义结果，非框架缺陷。
- **P3-4**（composite.ts:53-56 / common.ts:20-22）：rotation/几何 NaN 无守卫直传 leafer。Classification: P3 defense-in-depth。Why Not Blocking Closure: binding 层（flux-eval/value-to-state）应产合法数值，NaN 输入为 malformed binding，非 shape 层职责。

## Non-Blocking Follow-ups

- 本层 P2 高成本项 / P3 归 HCA-CR 跨层集中修复。
- 本层 bug 候选喂入 HCA-BL 正式归档。

## Closure

Status Note: 完成。5 族 27 源文件 23 维深审完成，零 P0/P1 live defect；HCA5 P3-2 转交项逐图元复核——12 composite 全部有 extent/resize hook（无静默丢弃），pipe-junction 升级 P2-1 landed fix（width/height resize test-first），10 base 全响应 width/height；4 P3 归 HCA-CR；owner doc §4.4/§5/§10 无 drift。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_02083e810ffeCdi5DCHN4TvasA`
- Verdict: PASS（2026-08-08）
- Evidence: plan checklist 全 [x]；P2-1 fix `pipe-junction.ts:109-124` create↔applyProps 公式一致 + 2 regression test 断言结果值；审计记录 `docs/audits/2026-08-08-1121-hca6-symbol-shapes.md` 含 27 文件 finding 表 + 23 行 P3-2 裁定表；P3-2 抽查 motor.ts:48/level.ts:59/pipe-junction.ts 匹配 live；重跑 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 97 files / 1309 tests green。

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
