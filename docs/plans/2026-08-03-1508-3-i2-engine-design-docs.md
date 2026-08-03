# 3 I2 通用引擎层设计文档（4 份 design-\*.md）

> Plan Status: completed
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I2、Cross-Cutting 平台能力复用表/文档共识审查/测试纪律）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§八最终决策）、I0 调研报告 `docs/analysis/industrial-hmi/research-*.md`、I1.2 spike 结论（gate 结论文档）
> Related: `docs/plans/2026-08-03-1508-1-i0-research-and-source-downloads.md`、`docs/plans/2026-08-03-1508-2-i1-research-gate-and-spike.md`（上游输入）；I3 gate 为设计文档共识审查终轮复核
> Mission: industrial-hmi
> Work Item: I2

## Purpose

产出通用引擎层的 4 份设计文档（`docs/components/industrial-hmi/design-engine.md` / `design-data-binding.md` / `design-symbols.md` / `design-renderer.md`），把 I0 调研结论 + I1.2 spike 实测验证落到**可实现的最终设计契约**：引擎架构（LeaferJS 适配/图层/坐标变换/渲染循环/性能策略）、数据绑定与动画（点表模型/双轨桥接/订阅节流/状态动画）、图元模型（Symbol 接口/注册机制/复合图元）、序列化与 renderer 契约（组态 JSON schema / `scada-canvas` fields/events/regions/handles / React 桥接 / 事件联动）。设计文档采用 scheduling 12 节 design.md 结构（参考 `docs/components/kanban/design.md`），经文档共识审查定稿（I3.1 gate 为终轮复核），作为 I3 设计 gate 的审查输入与 I4–I11 实现的契约依据。

## Current Baseline

- I0 调研完成：5 份报告含对比矩阵、选型可行性验证点、可提取设计清单、差距分析（假设 I0 plan 已 closure）。
- I1 gate 完成：独立审查修正项已落地、选型经 I1.2 spike 实测确认（或有条件确认 + API 风险清单）——**以 I1 plan closure 为前提**；若选型变更处人工裁决中，本 plan 保持等待（roadmap「人工确认阈值」：必须停下标记人工决策，不自动推进），不提前起草设计文档（见 Failure Paths `upstream-not-ready`）。
- **I1.2 spike 约束（来自 `docs/analysis/industrial-hmi/gate-1-review.md` §4/§6，I1 Follow-up 映射）**：I1.2 实测选型确认（10 万包络全达标：首屏 165 ms / 持续平移吞吐 114 fps / 10 万内存 47.5 MB / 1 万点端到端 ~17–20 ms），官方数字同量级复现（100 万 1.52 s / 448 MB vs 1.28 s / 320 MB）。5 条 API 契合度注意项为设计文档必须回应的约束：A1（viewport 需显式 `tree: { type: 'viewport' }` 配置 → design-engine 实例生命周期节）、A2（渲染帧事件/测试句柄需含 `tree` 引用 → design-engine/design-renderer）、A3（命中 10 万级 O(候选) 预检 ≤2.4 ms、无需空间索引 → design-engine 命中章节）、A4（headless 无 vsync 吞吐≠显示 fps，I14 固化测量口径 → design-engine 性能策略）、A5（批量更新合帧实测 ~20 ms、上层仍需合并帧 + 脏属性收集 → design-data-binding 刷新流水线）。spike 验证点 V1–V8（`research-summary.md` §3）全部实测通过。
- 平台能力复用表（roadmap Cross-Cutting）已固化：`useScopeSelector`/`useRenderScope`（flux-react）、`useActionDispatcher`/`createNormalizedActionEvent`（flux-react）、renderer 注册与 `RendererComponentProps`（flux-react + flux-renderers-\*）、formula compiler（flux-formula/flux-compiler）、i18n（flux-i18n）、UI 基元（@nop-chaos/ui）——**禁止重复实现**；另有设计流程约束：复杂组件设计遵循 `docs/references/new-renderer-introduction-audit.md` / `complex-component-design-process.md` / `renderer-implementation-guidelines.md`（roadmap 复用表消费方含 **I2** 与 I10.2）。
- 测试纪律（roadmap Cross-Cutting）：纯逻辑层 Vitest 单测先行；canvas 渲染 Playwright 程序化断言（测试句柄 `window.__flux_scada_<cid>`）；不引 node-canvas。
- 设计文档 12 节结构先例：`docs/components/kanban/design.md`（## 1. 组件定位 到 ## 12. 风险、取舍与后续阶段）。
- 真实 gap：`docs/components/industrial-hmi/` 目录不存在；4 份设计文档均未起草；`scada-canvas` 的 fields/events/regions/handles 契约未定义；组态 JSON schema 未定义；引擎层与既有 flux 架构（scope/action/renderer registry）的衔接未设计。

## Goals

- `design-engine.md`（I2.1）：LeaferJS 适配层（实例生命周期/场景树）、图层分层（背景/图元/交互/HTML 覆盖层）、世界↔视口坐标变换、渲染循环与脏区/局部重绘、性能策略（实例化/裁剪/合帧）。
- `design-data-binding.md`（I2.2）：点表/变量表模型、绑定表达式（静态/flux `$xxx` 桥接）、订阅与节流（合并帧/脏属性收集）、状态驱动动画（旋转/闪烁/流动/位移）、多状态呈现（运行/停止/故障）。
- `design-symbols.md`（I2.3）：Symbol 接口与属性 schema、图元注册机制（对齐 flux registry）、复合图元（group/instance）、基础形状与工业设备图元分类。
- `design-renderer.md`（I2.4）：组态 JSON schema 校验与序列化/反序列化、`scada-canvas` fields/events/regions/handles、React 桥接（ref 同步/实例生命周期）、事件→flux action 联动。
- 4 份文档全部采用 12 节结构、全部引用 I0 调研结论 + I1.2 spike 实测（含 API 风险清单的规避约束）、全部经文档共识审查（I3.1 为终轮复核，不叠加）。

## Non-Goals

- 不实现任何引擎/渲染器代码（I4–I11）。
- 不创建 `flux-renderers-industrial` 包（I4）。
- 不定义 I5.4 图元库的完整实现细节——`design-symbols.md` 只定 Symbol 接口/注册机制/分类，具体图元实现属 I8/I9。
- 不编写 benchmark 或性能基准方法（I14）。
- 不修改 `docs/architecture/` 既有架构文档（若设计揭示架构冲突，记录为 I15.2 收尾处理项，不提前改）。

## Scope

### In Scope

- 4 份设计文档的起草、内部一致性交叉核对（如 schema 字段与 renderer fields 一致、Symbol 接口与序列化格式一致）。
- 平台能力复用表逐项映射：每份文档标出消费的既有能力（`useScopeSelector`/`createNormalizedActionEvent`/registry/formula/i18n/ui），禁止重复实现；设计流程约束（`new-renderer-introduction-audit.md`/`complex-component-design-process.md`/`renderer-implementation-guidelines.md`）为**全部 4 份文档**的起草必读输入（roadmap 复用表消费方 I2），`design-renderer.md` 起草时需特别执行其中 renderer 契约相关的审计要求。
- 测试策略落位：每份文档写明纯逻辑层可单测边界（点表/绑定/动画状态机/坐标/序列化）与 Playwright 程序化断言边界（场景树句柄），供 I5/I6/I10 引用。
- 4 份文档的文档共识审查（独立子 agent 逐份审查直到共识；I3.1 gate 为终轮复核）。
- roadmap Phase Status 回写（I2: `todo` → `planned` 激活时；→ `done` closure 通过时）。

### Out Of Scope

- 设计 gate 审查本身（I3.1/I3.2）。
- 包基建（I4）与实现（I5+）。
- 编辑器交互设计（I16 立项材料）。
- 图元级 type `scada-symbol` 的注册契约（讨论 §九 待定事项：I8/I9 后再评估）。

## Failure Paths

| 可测场景编号             | 触发                                                    | 行为（含状态码/错误码）                                         | 可重试 | 用户可见表现                                       |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------------------------------------------- |
| design-contract-conflict | 设计文档与既有架构（renderer-runtime/模块边界）冲突     | 记录冲突点与取舍理由，纳入 I15.2 收尾清单，不提前改架构文档     | 否     | 设计文档「风险与取舍」节显式列出冲突项             |
| schema-field-drift       | `scada-canvas` fields 与组态 JSON schema 字段不一致     | 交叉核对（I2.4 依赖 I2.2/I2.3），发现即回写对应文档             | 是     | 四份文档交叉引用点一致，git diff 可证              |
| spike-risk-unaddressed   | I1.2 API 风险清单未被设计文档逐条回应                   | gate 结论对照检查项：每条风险在对应设计文档有规避策略或显式接受 | 否     | 设计文档引用 gate 结论的「风险→策略」映射表        |
| upstream-not-ready       | I0 调研报告或 I1.2 spike 结论未就绪（选型处人工裁决中） | 本 plan 保持等待（对齐 I1 plan 的 wait 模式），不引用不存在产物 | 是     | 执行 agent 在 Phase 1 前置验证项处停止，不虚构引用 |
| consensus-round-limit    | 某份文档共识审查超 3 轮                                 | 停止循环，升级人工裁决（roadmap Cross-Cutting）                 | 否     | 文档头部记录超限事实，等待人工                     |

## Test Strategy

本档选择：`不适用：纯设计文档产出，无代码变更；文档正确性（与 I0/I1 结论一致、与既有架构一致）由文档共识审查 + I3.1 gate 独立审查承担；单测/性能验证落点在 I5/I6/I10/I14 的实现计划。`

## Execution Plan

### Phase 1 - I2.1 引擎架构设计 `design-engine.md`

Status: completed
Targets: `docs/components/industrial-hmi/design-engine.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Decision`：roadmap Phase Status 回写 I2: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [x] `Proof`：前置验证——确认 I0 的 5 份调研报告（`docs/analysis/industrial-hmi/`）与 I1.2 spike 结论（含选型「确认/有条件确认」状态）均已就绪；未就绪或选型处人工裁决中则本 Phase 等待，不提前起草、不引用不存在产物（见 Failure Paths `upstream-not-ready`）。
- [x] `Proof`：起草 `design-engine.md`（12 节结构，参考 `docs/components/kanban/design.md`，并遵循 `complex-component-design-process.md` 设计流程）——LeaferJS 适配层（实例生命周期/场景树组织）、图层分层（背景/图元/交互/HTML 覆盖层）、世界↔视口坐标变换（缩放/平移/fit/center）、渲染循环与脏区/局部重绘、性能策略（实例化/裁剪/合帧）；**逐节引用 I0.5 调研结论与 I1.2 spike 实测数字**，并回应 I1.2 API 风险清单。
- [x] `Decision`：明确引擎层与既有 flux 架构的边界（引擎纯逻辑不依赖 React，React 桥接属 I2.4 契约），标注平台能力复用映射（registry 模式对齐等）。
- [x] `Proof`：独立子 agent（fresh session）对 `design-engine.md` 执行文档共识审查（≥1 轮，0 新增修正项即共识；≤3 轮超限升级人工），记录到文档头部「文档共识审查记录」。

Exit Criteria:

- [x] `docs/components/industrial-hmi/design-engine.md` 存在，12 节结构完整，含图层/坐标变换/渲染循环/性能策略设计；I1.2 风险清单每条有规避策略或显式接受。
- [x] 文档引用 I0/I1.2 结论处有可核查引用（文件路径/报告编号）。

### Phase 2 - I2.2 数据绑定与动画设计 `design-data-binding.md`

Status: completed
Targets: `docs/components/industrial-hmi/design-data-binding.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：起草 `design-data-binding.md`（12 节结构）——点表/变量表模型（三源：静态值/表达式/flux scope 桥接，讨论 Q3 双轨）、绑定表达式→属性映射（颜色/文本/旋转/可见性/位置）、订阅与节流（**合并帧/脏属性收集，禁止逐点 setState 直刷 React**，roadmap 性能红线）、状态驱动动画（旋转/闪烁/流动/位移）与动画生命周期（start/stop/pause）、多状态呈现（运行/停止/故障）。
- [x] `Proof`：平台能力复用映射——`useScopeSelector`/`useRenderScope`（flux scope 桥接）、formula compiler（表达式编译求值）标出消费方式与边界。
- [x] `Proof`：独立子 agent（fresh session）对 `design-data-binding.md` 执行文档共识审查（判据同上），记录到文档头部。

Exit Criteria:

- [x] `docs/components/industrial-hmi/design-data-binding.md` 存在，12 节结构完整，含点表三源模型/合并帧刷新流水线/状态动画/多状态呈现设计。
- [x] 点表刷新与动画合帧策略明确写入（对齐 roadmap 性能红线条款）。

### Phase 3 - I2.3 图元模型设计 `design-symbols.md`

Status: completed
Targets: `docs/components/industrial-hmi/design-symbols.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：起草 `design-symbols.md`（12 节结构）——Symbol 接口与属性 schema（样式解析与状态样式）、图元注册机制（对齐 flux renderer registry 的 `registerScadaSymbol` 模式）、复合图元（group 组合/instance 模板复用/实例属性覆盖）、基础形状与工业设备图元分类（形状族/设备族/仪表族/传感控制族，映射 I8/I9）。
- [x] `Decision`：图元分类与 `design-renderer.md` 的组态 JSON schema 字段对齐约定（图元 type 命名、属性 schema 归属），与 Phase 4 保持交叉一致。
- [x] `Proof`：独立子 agent（fresh session）对 `design-symbols.md` 执行文档共识审查（判据同上），记录到文档头部。

Exit Criteria:

- [x] `docs/components/industrial-hmi/design-symbols.md` 存在，12 节结构完整，含 Symbol 接口/注册机制/复合图元/图元分类设计。

### Phase 4 - I2.4 序列化与 renderer 契约设计 `design-renderer.md`

Status: completed
Targets: `docs/components/industrial-hmi/design-renderer.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：起草 `design-renderer.md`（12 节结构，遵循 `new-renderer-introduction-audit.md`/`complex-component-design-process.md`/`renderer-implementation-guidelines.md` 的 renderer 契约设计约束）——组态 JSON schema（图元树+点表+绑定+事件）与校验/序列化/反序列化、增量 diff；`scada-canvas` renderer 契约（fields/events/regions/handles，对齐 `RendererComponentProps` 与 renderer-definitions/schemas.ts 模式）；React 桥接（ref 同步/实例生命周期 mount/unmount/resize）；事件→flux action 联动（对齐 `props.events` + `createNormalizedActionEvent`）。
- [x] `Fix`：四文档交叉一致性核对——schema 字段 ↔ renderer fields ↔ Symbol 属性 schema 三者一致；点表绑定 ↔ 数据绑定模型一致；发现冲突即回写对应文档。
- [x] `Decision`：测试句柄契约定稿——dev/test 下经 `window.__flux_scada_<cid>` 暴露引擎实例（roadmap Cross-Cutting「测试纪律」），写入设计文档供 I5/I10 实现与 I15 e2e 引用。
- [x] `Proof`：独立子 agent（fresh session）对 `design-renderer.md` 执行文档共识审查（判据同上），记录到文档头部。
- [x] `Proof`：4 份文档整体终轮交叉审查（fresh session 独立 agent，覆盖全部文档）——确认 0 新增修正项后视为 4 份文档共识达成（I3.1 gate 将作为终轮复核，不叠加本轮）。

Exit Criteria:

- [x] `docs/components/industrial-hmi/design-renderer.md` 存在，12 节结构完整，含组态 JSON schema/`scada-canvas` 契约/React 桥接/事件联动设计。
- [x] 四份文档交叉引用一致（schema/fields/Symbol 属性映射可追溯），交叉核对记录可查。
- [x] 4 份文档均完成 ≥1 轮独立子 agent 共识审查且无未裁定修正项。
- [x] 每日日志（`docs/logs/2026/08-03.md`）已记录本 plan 产出摘要。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent（general，rounds 1-3）
- Verdict: `pass`（round 3；round 1 `revised`，round 2 `revised`）
- Rounds: 3
- Findings addressed: R1 Major「上游前置无执行期等待门」→ Phase 1 增前置验证 Proof 项 + `upstream-not-ready` Failure Path 行；R1 Major「复用表设计流程行缺失」→ Current Baseline/In Scope/Phase 1/Phase 4 补 `new-renderer-introduction-audit.md` 等三文档约束；R1 Minor「I12 vs I15.2 不一致」→ 统一为 I15.2；R2 Major「等待 vs 并行推进语义矛盾」→ Current Baseline 改为等待语义，并同步对齐 I1 计划 Deferred 条目。

## Closure Gates

> 纯文档计划：不涉及任何代码变更（仅修改 `docs/` 下文件），按 plan 指南从 Closure Gates 中删除 `pnpm typecheck`/`build`/`lint`/`test`。

- [x] 4 份设计文档（engine/data-binding/symbols/renderer）全部存在，12 节结构完整，内容与 I0 调研 + I1.2 spike 结论一致（含 API 风险规避映射）。
- [x] 四文档交叉一致性核对完成，无未裁定冲突；`scada-canvas` fields/events/regions/handles 与组态 JSON schema 契约闭环。
- [x] 4 份文档文档共识审查全部通过（≥1 轮独立审查，无未裁定修正项；I3.1 gate 为终轮复核的说明已写入各文档头部）。
- [x] 平台能力复用表已逐项映射（无重复实现设计）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺项。
- [x] roadmap Phase Status I2 已回写 `done`；`docs/logs/2026/08-03.md` 已记录收口摘要。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

### 架构文档冲突项收尾

- Classification: `optimization candidate`
- Why Not Blocking Closure: 若设计文档揭示与 `docs/architecture/`（renderer-runtime/模块边界等）的冲突，本 plan 只记录冲突点与取舍理由于「风险与取舍」节；架构文档同步属 I15.2 收尾职责，不阻塞设计 gate 与后续实现。
- Successor Required: `yes`
- Successor Path: roadmap I15.2（文档收尾）

### `scada-symbol` 图元级 type 注册契约

- Classification: `watch-only residual`
- Why Not Blocking Closure: 讨论 §九 已裁定图元级 type 本期不注册，I8/I9 图元库成型后评估；`design-symbols.md` 仅预留接口边界，不定义注册契约。
- Successor Required: `no`

## Non-Blocking Follow-ups

- I3.1 gate 审查前，执行者可预检 4 份文档与「讨论文件 §八」范围条款的一致性，减少 gate 返工。

## Closure

Status Note: I2 四份设计文档全部产出并经独立文档共识审查达成共识：design-engine（R1 `REVISE` 1M+2m → R2 `AGREE`）、design-data-binding（R1 3M+5m → R2 1m → R3 `AGREE`）、design-symbols（R1 1M+6m → R2 1m → R3 1m → R4 `AGREE`）、design-renderer（R1 1M+5m → R2 `AGREE`），修正轮均未超 3 轮上限；随后 4 份文档整体终轮交叉审查（fresh session）R1 4 Minor → 修正落地 → R2 `AGREE`，**4 份文档共识达成（0 未裁定修正项）**，I3.1 gate 将作为终轮复核（不叠加）。I1.2 spike A1–A5 风险清单逐条映射规避策略（A1 viewport 类型固化/ A2 测试句柄含 tree / A3 命中无空间索引 / A4 测量口径 / A5 合并帧+脏属性收集）；平台能力复用表逐项映射（useScopeSelector/useActionDispatcher/createNormalizedActionEvent/registry/formula/i18n/ui），无重复实现设计；`scada-canvas` fields/events/regions/handles 与组态 JSON schema（version/viewport/background/variables/symbols 图元树）契约闭环（设计-renderer.md 头部交叉一致性核对记录 5 行全 ✅）；`scada-symbol` 图元级 type 注册契约按讨论 §九 留待 I8/I9 评估（deferred 条目诚实裁定）。纯文档计划零代码变更（`git status` 仅 docs/ 变更；mission 校验 typecheck/build/lint/test 全绿，turbo 缓存回放）。所有 closure criteria 满足，可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit agent（fresh session，不复用 I2 执行上下文，task `ses_03842c52cffeKathXhk1IRGKFt`）
- Evidence: 对照 live repo 全量复核——plan 4 Phase 全 completed + Execution Plan 无孤儿 `[ ]`（仅 Closure Gates 待审计后勾选）；4 份文档均 12 节完整（48 节）且头部共识记录闭环至 AGREE + 终轮复核说明（I3.1 gate）；spike 数字（165.3ms/114.3fps/47.5MB/16.9–19.7ms/178.9ms）与 gate-1-review §3.2 逐项吻合；A1–A5 映射按 gate §4/§6 落位（engine §12.1 / data-binding §12.1 / symbols §12.1 如实「无新增约束」/ renderer §12.1）；跨文档契约闭环（ScadaConfig ↔ ScadaSymbolProps ↔ 点表/绑定/状态/动画类型；引擎 §8.2 API 面 15 项全覆盖；测试句柄 `window.__flux_scada_<cid>` 含 tree、单一所有权 engine/test-handle.ts）；日志顶部含 I2 执行条目；roadmap I2 原为 `planned`（审计时点正确）；4 份文档无 `<<`/TODO 等占位残留；`git status` 仅 docs/ 变更。判定 `approved`。

Follow-up:

- no remaining plan-owned work
