# 1 I9 工业设备图元库（Wave 4）

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I9、Cross-Cutting 测试纪律/平台能力复用表）、`docs/components/industrial-hmi/design-symbols.md`（§4.4 图元分类/§4.2 属性 schema/§8 句柄）、`docs/components/industrial-hmi/design-data-binding.md`（§4.4 动画/§4.5 多状态呈现——设备/仪表动画与状态消费）、`docs/analysis/industrial-hmi/gate-3-review.md`（§10 flow 语义消费归属）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§九 scada-symbol 评估时点）
> Related: 上游 `docs/plans/2026-08-03-2307-3-i8-basic-symbol-library-wave3.md`（completed，I8.1–I8.3）；下游 roadmap I10（React 渲染器与 flux 集成，依赖 I9 成型）
> Mission: industrial-hmi
> Work Item: I9

## Purpose

实现工业设备图元库 Wave 4：设备图元（电机/泵/阀门/风机，含旋转/开关状态动画）（I9.1）、仪表类（仪表盘/液位计/温度计/进度指示，绑定量程换算+指针动画）（I9.2）、传感与控制类（传感器/指示灯/开关/按钮，报警闪烁+状态色）（I9.3）、管道连接与流动动画（连接点/流动方向/与设备连接语义）（I9.4）——全部落在 `packages/flux-renderers-industrial/src/symbols/` 的 `device/`、`instrument/`、`sensor-control/`、`pipe/` 子目录，复用 I5.4/I8 已建成的符号注册/样式解析/复合图元/状态视觉契约，消费 I6.2/I6.3 的 scale/format 换算与动画能力。收口状态：I9.1–I9.4 全部完成、`scada-symbol` 图元级 type 注册契约评估裁定落地（I8 deferred 触发点）、roadmap I9 回写 `done`。

## Current Baseline

- I8 已收口（326 tests / 24 files 全绿，coverage 阈值 90 达标）：**11 个内置符号**（8 基础形状 + `scada-image`/`scada-video` + `scada-group` 容器，`builtinScadaSymbolDefinitions` 数组长度 11，register-builtin.ts:16-28；本 plan 计数口径 = 内置符号总数含 `scada-group`）、`symbol-registry.ts`（registerScadaSymbol/unregister/定义校验）、`symbol-factory.ts`（type→leafer 节点）、`style-resolver.ts`（defaults ∪ 实例 ∪ statePatch 状态优先）、`visual-state.ts`（StateVisualApplier 消费 I6.3 state:change + 退出恢复 normal）、`compound.ts`（group 建树/instance 深合并优先级链/覆盖集 diff 序列化）、`interaction-overlay.ts`（sky 层 hover/press/selected/disabled 预设 + INTERACTION_STYLE_PRESETS）。
- I6 已收口：`bind-resolver.ts`（applyScale/formatValue 量程换算与格式化）、`value-to-state.ts`（区间/布尔/枚举→状态判定）、`animator.ts`（rotate/blink/flow/move 四种动画 kind + start/stop/pause/resume/isPlaying + 状态触发）、`point-store.ts`（三源点表）、`dirty-collector.ts`（帧内脏属性收集 + state:change 发射）。
- `design-symbols.md` §4.4 分类契约：设备族 `scada-device-motor`/`scada-device-pump`/`scada-device-valve`/`scada-device-fan`（I9.1）；仪表族 `scada-instrument-gauge`/`scada-instrument-level`/`scada-instrument-thermometer`/`scada-instrument-progress`（I9.2，消费 I2.2 scale/format）；传感控制族 `scada-sensor-control-sensor`/`scada-sensor-control-indicator`/`scada-sensor-control-switch`/`scada-sensor-control-button`（I9.3，消费状态样式）；管道族 `scada-pipe-junction`（I9.4，消费 flow 动画）。命名约定：`scada-<族>-<名称>`。
- gate-3-review §10 归属记录：flow 语义消费（base shapes 无 applyProps，`flow`/`dashOffset` 直写节点属性）→ I9.4 管道图元实现时经 applyProps 消费 flow 参数。
- I8 plan deferred 触发点：`scada-symbol` 图元级 type 注册契约评估——「I9 设备图元库成型后由 roadmap 状态机触发评估」（design-symbols.md §12.2/§12.3），本 plan 落地评估裁定。
- 真正剩余的 gap：`device/`、`instrument/`、`sensor-control/`、`pipe/` 四个图元族目录不存在；无任何设备/仪表/传感控制/管道符号注册；旋转/开关状态动画的图元级装配（消费 animator 与状态联动）未落地；指针类动画（仪表盘/液位计指针旋转）未落地；管道连接点/流动方向语义未落地。

## Goals

- I9.1：4 个设备图元（motor/pump/valve/fan）——复合图元装配（基础形状组合 + instance 覆盖复用）、旋转动画（motor/fan 转子经 animator rotate 驱动）、开关状态动画（valve/pump 开关位形态切换经状态样式 + 动画联动）、设备视觉惯例色（run=绿/stop=灰/fault=红闪烁，design-data-binding.md §10 建议色）。
- I9.2：4 个仪表图元（gauge/level/thermometer/progress）——量程换算（消费 I6.2 `applyScale`/`scale` 声明）、指针/液位/进度动画（经 animator 或直接属性绑定驱动）、刻度与数值文本（formatValue 格式化消费）、与绑定值联动（指针旋转角 = 值经量程换算映射）。
- I9.3：4 个传感控制图元（sensor/indicator/switch/button）——状态色呈现（消费 I8.2 状态样式应用 + I6.3 状态判定）、报警闪烁联动（fault→blink，消费 I6.3 animator）、开关/按钮的交互外观区分（静态呈现，事件联动归 I11.1）。
- I9.4：管道族 `scada-pipe-junction`——连接点语义（端点连接声明）、流动方向动画（dash 位移，消费 flow 参数经 applyProps 增量应用，gate-3-review §10 归属）、管道与设备连接语义（连接关系声明结构，编辑器连接交互后置 I16）。
- 全部图元注册进 `register-builtin.ts`（内置符号 **11 → 24**，+13 新图元：device 4 + instrument 4 + sensor-control 4 + pipe 1），V5 全路径单测扩展；`scada-symbol` 图元级 type 注册契约评估裁定落地（设计文档回写）；roadmap I9 回写 `done`。

## Non-Goals

- 不实现 React 桥接层（I10.1）、renderer-definitions 完整注册（I10.2）、点表↔flux 桥接（I10.3）。
- 不实现图元事件→flux action 全链路（I11.1）与画布浏览交互（I11.2）；开关/按钮交互外观静态呈现。
- 不实现编辑器交互（拖拽放置/连线/属性面板，I16 后继 mission）。
- 不写 Playwright 用例（真实浏览器视觉断言属 I13.1/I15.1）；不新增 leafer 之外的重型依赖；不实现 `scada-symbol` 图元级 type 的注册契约本身（仅评估裁定，若裁定注册则产出契约草案供 roadmap 后续项消费，注册实现不在本 plan）。

## Scope

### In Scope

- `src/symbols/device/`：motor/pump/valve/fan 4 图元（复合装配 + 旋转/开关状态动画 + 视觉状态色）。
- `src/symbols/instrument/`：gauge/level/thermometer/progress 4 图元（量程换算 + 指针/液位/进度动画 + 刻度/数值文本）。
- `src/symbols/sensor-control/`：sensor/indicator/switch/button 4 图元（状态色 + 报警闪烁联动 + 交互外观静态呈现）。
- `src/symbols/pipe/`：`scada-pipe-junction`（连接点 + 流动方向动画 + 与设备连接语义声明结构）。
- `src/symbols/register-builtin.ts` 注册扩展（**11 → 24** 内置符号，含 `scada-group` 计数口径）；V5 全路径单测（注册 → 校验 → 实例化 → 场景树加载 → 序列化 → 卸载）。
- `scada-symbol` 图元级 type 注册契约评估（I8 deferred 触发点）：评估裁定 + 设计文档回写。
- `docs/logs/2026/08-04.md` 记录本 plan 产出摘要。

### Out Of Scope

- React 桥接层与 flux 集成（I10）、事件联动与画布交互（I11）、Playground 演示页（I13）。
- 编辑器交互（图元拖拽/连线/属性面板，I16）、性能复测（I14）、真实浏览器 e2e 断言（I13.1/I15.1）。
- `scada-symbol` 图元级 type 注册的实现（仅评估裁定）。

## Failure Paths

| 可测场景编号                  | 触发                                                                                           | 行为                                                                                                        | 可重试 | 用户可见表现                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| upstream-not-ready            | 前置未就绪——roadmap I6/I7/I8 = `done` 且 gate-3-review 无待人工裁决项；I6.2/I6.3/I8.x 契约可用 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                               | 是     | plan 保持 `planned`/`in progress`    |
| leafer-animation-drift        | 旋转/指针动画在 leafer 真实 API 上的插值行为与设计不符（rotation 属性直接写 vs 过渡原语）      | 回退为自研插值写入（animator tick 内直接写 rotation 属性，合帧批量），记录回写供 I12 gate 复核              | 是     | 动画呈现不变，内部实现降级为直接插值 |
| scale-format-mismatch         | 仪表量程换算/格式化与 I6.2 applyScale/formatValue 语义漂移                                     | 纯逻辑单测固化换算链（scale 声明 → applyScale → 指针角/文本），歧义记录为设计回写项                         | 是     | 仪表读数/指针位置确定，无漂移        |
| instance-composition-drift    | 设备复合图元与 instance 深合并（I8.3）协同漂移（设备默认属性覆盖/动画声明分层冲突）            | 复用 I8.3 深合并优先级链单测扩展设备族装配；歧义记录回写，不静默选择                                        | 是     | 设备实例属性覆盖行为确定             |
| flow-apply-diff-drift         | 管道 flow 参数增量应用（applyProps）与序列化 diff 协同漂移                                     | 管道图元 applyProps 消费 flow/dashOffset 的增量单测断言（gate-3-review §10 归属兑现）；修正序列化/diff 协同 | 是     | 管道流动动画随参数变化正确增量更新   |
| symbol-type-registration-eval | `scada-symbol` 评估裁定与讨论 §九/design-symbols.md §12.2 既有裁定冲突                         | 按讨论 §九 口径评估（图元库成型后评估注册价值与成本），裁定记录回写设计文档；重大契约变化标记人工决策       | 是     | 评估结论落盘，无静默契约变化         |

## Test Strategy

档位选择：`必须自动化`——设备/仪表/传感控制/管道图元库是图元模型核心扩展路径（roadmap 测试纪律「纯逻辑层单测先行」）；Proof 项先于 Fix 项落地。图元 wiring（复合装配/动画装配/applyProps 增量）以 `vi.mock('leafer-ui')` 覆盖（复用 `src/test-support/leafer-ui-mock.ts`）；量程换算/状态判定/流动参数映射为纯逻辑单测；真实浏览器视觉/动画断言延后 I13.1/I15.1（watch-only residual，见 Deferred 条目）。

## Execution Plan

### Phase 1 - 前置验证 + I9.1 设备图元（motor/pump/valve/fan）

Status: completed
Targets: `src/symbols/device/`、`src/symbols/register-builtin.ts`

- Item Types: `Proof | Fix | Decision`

- [x] `Decision`：roadmap Phase Status 回写 I9: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0–I8 plan 先例）。
- [x] `Proof`：前置验证——roadmap I6 = `done`、I7 = `done`、I8 = `done`；`applyScale`/`formatValue`（bind-resolver.ts）、`Animator`（animator.ts，rotate/blink 支持）、`StateVisualApplier`（visual-state.ts）、`deepMergeInstanceProps`/`instantiateInstance`（compound.ts）契约可用；`design-symbols.md` §4.4 设备族条目未被 gate-3-review 修改为冲突（gate-3 仅 m-5 补 `dashOffset` 于 §4.2）。
- [x] `Proof`：设备图元失败测试先行（`device/device-symbols.test.ts`，实现前红）：motor（机座/转轴复合装配、rotation 动画经 animator rotate 驱动、run/stop/fault 状态色）、pump（泵体/叶轮复合、开关状态形态切换）、valve（阀体/阀芯开合形态、开度状态样式）、fan（扇叶旋转动画、状态色）——注册 → 校验 → 实例化 → 场景树加载 → 状态样式应用 → 序列化 → 卸载全路径断言。
- [x] `Fix`：`src/symbols/device/` 实现 motor/pump/valve/fan：复合图元装配（复用 I8.3 group/instance 语义，子形状组合 + 默认属性 + 状态样式声明）、旋转动画装配（消费 animator：`when: { state: 'run' }` rotate 启停）、开关状态形态（状态样式 patch + 可选动画）、默认属性与 `custom` schema 声明（转速/开度等参数化字段）。
- [x] `Fix`：`register-builtin.ts` 注册扩展（内置 11 → 15：+motor/pump/valve/fan）；V5 设备族全路径单测扩展（`v5-custom-registration.test.ts` 基线保持绿，不弱化）。

Exit Criteria:

- [x] device 族 focused 单测全绿（复合装配/旋转动画启停/状态色/序列化覆盖集断言）——device-symbols.test.ts 全量绿。
- [x] motor/pump/valve/fan 经 config-adapter 组态 JSON 构建路径可实例化（tag/属性/状态样式映射断言）；register-builtin 计数 15 断言（含 scada-group）。

### Phase 2 - I9.2 仪表图元（gauge/level/thermometer/progress）

Status: completed
Targets: `src/symbols/instrument/`、`src/symbols/register-builtin.ts`

- Item Types: `Proof | Fix`

- [x] `Proof`：仪表失败测试先行（`instrument/instrument-symbols.test.ts`）：gauge（表盘/刻度/指针复合、值→指针角量程换算映射）、level（液位矩形随值变化、量程换算）、thermometer（液柱/刻度、温度换算）、progress（进度条/文本、formatValue 消费）——换算链（scale 声明 → applyScale → 指针角/液位/文本）断言 + 状态样式 + 序列化。
- [x] `Fix`：`src/symbols/instrument/` 实现 gauge/level/thermometer/progress：复合装配 + 量程换算消费（applyScale/formatValue）+ 指针/液位/进度动画装配（animator 或直接属性插值，Failure Paths `leafer-animation-drift` 兜底）+ 刻度与数值文本呈现。
- [x] `Fix`：`register-builtin.ts` 注册扩展（内置 15 → 19）；V5 仪表族全路径单测扩展。

Exit Criteria:

- [x] instrument 族 focused 单测全绿（量程换算链/指针角映射/formatValue 文本/状态样式断言）。
- [x] gauge/level/thermometer/progress 经 config-adapter 构建路径可实例化；register-builtin 计数 19 断言（含 scada-group）。

### Phase 3 - I9.3 传感控制图元（sensor/indicator/switch/button）

Status: completed
Targets: `src/symbols/sensor-control/`、`src/symbols/register-builtin.ts`

- Item Types: `Proof | Fix`

- [x] `Proof`：传感控制失败测试先行（`sensor-control/sensor-control-symbols.test.ts`）：sensor（探测点/状态色）、indicator（指示灯多态：run/stop/fault 色 + fault 闪烁联动）、switch（开/关位形态 + 状态色）、button（静态呈现 + 状态色）——状态判定（value-to-state 消费）→ 状态样式（StateVisualApplier 消费）→ 报警闪烁（animator blink 联动）链路断言。
- [x] `Fix`：`src/symbols/sensor-control/` 实现 sensor/indicator/switch/button：状态色呈现（I8.2 状态样式应用消费）+ 报警闪烁联动（I6.3 animator）+ 交互外观静态区分（开关/按钮形态，事件联动归 I11.1）。
- [x] `Fix`：`register-builtin.ts` 注册扩展（内置 19 → 23）；V5 传感控制族全路径单测扩展。

Exit Criteria:

- [x] sensor-control 族 focused 单测全绿（状态判定→样式→blink 链路断言）。
- [x] sensor/indicator/switch/button 经 config-adapter 构建路径可实例化；register-builtin 计数 23 断言（含 scada-group）。

### Phase 4 - I9.4 管道图元 + scada-symbol 评估裁定 + 收口

Status: completed
Targets: `src/symbols/pipe/`、`src/symbols/register-builtin.ts`、`docs/components/industrial-hmi/design-symbols.md`

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`：管道失败测试先行（`pipe/pipe-symbols.test.ts`）：`scada-pipe-junction` 连接点语义（端点声明/连接方向）、流动方向动画（dash 位移，flow 参数消费）、applyProps 增量（flow/dashOffset 变更 → 节点属性增量更新，gate-3-review §10 归属兑现）、与设备连接语义（连接关系声明结构序列化）。
- [x] `Fix`：`src/symbols/pipe/` 实现 `scada-pipe-junction`：连接点呈现 + flow 动画装配（消费 I6.3 flow kind）+ applyProps 增量应用（flow/dashOffset）+ 连接关系声明结构（编辑器连线交互后置 I16）。注：基础 `scada-pipe` 形状（I5.4）本 plan **不**补 applyProps，保持既有直写路径（gate-3-review §10 口径：flow 消费归管道图元实现）。
- [x] `Decision`：`scada-symbol` 图元级 type 注册契约评估（I8 deferred 触发点，讨论 §九/design-symbols.md §12.2 口径）：以 24 图元成型事实评估注册价值（单图元独立 renderer 用法）与成本（双 schema 漂移面），裁定**不注册** + 依据（无画布外单图元真实消费场景 + renderer/组态双 schema 漂移成本），回写 design-symbols.md §12.2/§12.3（另同步 §1 边界/§2 决策表/§3 归属）；不产出注册契约草案（不注册路径）。
- [x] `Fix`：`register-builtin.ts` 注册扩展（内置 23 → 24：+pipe-junction）；V5 管道族全路径单测扩展；包级全量测试保持绿。
- [x] `Fix`：`docs/logs/2026/08-04.md` 记录本 plan 产出摘要（置顶条目）。

Exit Criteria:

- [x] pipe 族 focused 单测全绿（连接点/flow 动画/applyProps 增量/连接关系序列化断言）；包级全量测试全绿（覆盖 24 内置符号全路径，含 scada-group）。
- [x] `scada-symbol` 评估裁定落地（design-symbols.md §12.3 回写，裁定 + 依据 + 若注册则契约草案）；roadmap I9 状态待收口回写。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（general，fresh session），R1 task `ses_0371c08c3ffevkfqszv1rje6gI`，R2 task `ses_037153a7dffePkx3DZmv0o1lzd`
- Verdict: R1 `revise`（2 Major + 1 Nit 全部落地）→ R2 `pass`（零 Blocker/Major，3 Nit 非阻塞）
- Rounds: 2
- Findings addressed: M-1「基线内置符号数 10 vs 实测 11（含 scada-group）」→ 基线改 11 + 计数口径声明（含 scada-group，register-builtin.ts:16-28）+ 全部阶段计数改 11→15→19→23→24；M-2「内部计数矛盾（10→19 vs 23）」→ Goals/Scope/Phase 计数统一 11→24（+13 新图元），closure gate 改「4 族 13 个新图元」；N-1「flow 消费归属 I9.4/I8.1」→ Phase 4 Fix 注：基础 scada-pipe 不补 applyProps（保持 I5.4 直写路径），flow 消费归 scada-pipe-junction；R2 3 Nit 非阻塞（§4.4 未被 gate-3 修改措辞已修正/计数口径一致性确认/条件分类可接受）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] I9.1–I9.4 全部落地：4 族 13 个新图元（device 4 + instrument 4 + sensor-control 4 + pipe 1）全路径单测覆盖，内置符号 11 → 24（含 scada-group 计数口径），包级 typecheck 通过。
- [x] 契约一致性：图元 type 命名与 `design-symbols.md` §4.4 分类对齐（`scada-<族>-<名称>`）；scale/format 消费与 I6.2 一致；动画装配与 I6.3 一致；flow 消费与 gate-3-review §10 归属兑现（applyProps 增量路径）。
- [x] I8 deferred 触发点兑现：`scada-symbol` 评估裁定落地并回写设计文档，无静默契约变化。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] roadmap 状态机未跳序：I9 `todo → planned` 已在激活期完成，收口时 `planned → done` 由独立 closure-audit 核验后回写。
- [x] 受影响的 owner 文档已同步（docs/logs/2026/08-04.md 收口摘要；design-symbols.md §12.3 评估回写；无其他风险节需回写；架构文档同步属 I15.2）。
- [x] roadmap Phase Status I9 已回写 `done`。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 真实浏览器视觉/动画 e2e 断言（设备旋转/仪表指针/流动动画视觉）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 图元行为语义（复合装配/状态色/动画启停）已由纯逻辑 + vi.mock 单测覆盖；真实浏览器内的旋转/指针/流动动画视觉呈现需 playground 页面挂载点才能运行——首个可挂载页面为 I13.1 scada-demo，正式 e2e 程序化断言补强属 I15.1；属 roadmap 既定顺序，不构成 I9 的 in-scope 缺陷。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（首个可挂载页面）与 I15.1（e2e 程序化断言补强）

### `scada-symbol` 图元级 type 注册契约实现

- Classification: `watch-only residual`（若 Phase 4 裁定注册）或 `out-of-scope improvement`（若裁定不注册）
- Why Not Blocking Closure: 本 plan 只做评估裁定（讨论 §九 触发点）；若裁定注册，注册实现（renderer-definitions 新增 type/schema/fields）需 renderer 桥接层上下文（I10.1/I10.2 完成后更合理），按裁定路径移入 roadmap 后续项；不构成 I9 的 in-scope 缺项。
- Successor Required: `yes`（视裁定）
- Successor Path: roadmap I10.2（renderer-definitions 完整注册）或后续评估项

### 性能复测与基准固化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 性能验收（10 万图元 ≥45fps/首屏 <2s/内存 ≤320MB；1 万点刷新 <200ms）属 I14 benchmark 计划（I14.1 固化测量方法、I14.3 复测结论），I9 只按设计基线实现图元库（含复合/动画路径），不提前固化基准方法（gate-1-review A4 口径声明）。
- Successor Required: `yes`
- Successor Path: roadmap I14

## Non-Blocking Follow-ups

- `src/test-support/leafer-ui-mock.ts` 按需扩展（动画/旋转/指针节点 mock 面），供 I9/I10 测试复用。
- 若实现期发现 leafer 动画/旋转真实 API 与设计表述偏差（Failure Paths `leafer-animation-drift`），修正记录供 I12 gate 复核输入。
- I9 图元库落地后由 I15.1 补强图元体积面单测（与 I5/I8 plan Non-Blocking Follow-ups 一致）。

## Closure

Status Note: closure-audit 通过（2026-08-04，独立子 agent fresh session 核验，零 Blocker），plan 收口，roadmap I9 已回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，独立于执行 session；host 未暴露 ses\_ id，以 opencode 进程 PID 98616 标识）
- Evidence: 对照 live repo 核验全部 12 项 Closure Gates 与 4 Phase Exit Criteria：`register-builtin.ts` 数组实测 24 个内置符号定义（8 形状 + image/video + group + device 4 + instrument 4 + sensor-control 4 + pipe-junction 1），symbols.test.ts:172 断言 24；13 个新图元 type 均为 `scada-<族>-<名>`（motor/pump/valve/fan、gauge/level/thermometer/progress、sensor/indicator/switch/button、pipe-junction），对应目录 device/instrument/sensor-control/pipe 全部存在；pipe-junction.ts applyProps 经 flowPatch 增量消费 flow/dashOffset（gate-3-review §10 归属兑现）+ flow kind 动画声明；deviceStates run=#00cc66/stop=#9e9e9e/fault=#e53935+blink、deviceRunRotateAnimation when:{state:'run'}、valve openRatio→阀芯旋转角、gauge bindings.rotation scale→指针角/formatValue 文本、switch custom.on→拨杆位；engine.getSymbolDeclarations（scada-engine.ts:184）defaults∪instance 深合并；config-types.ts flow 字段 + validate.ts flow 形状校验；design-symbols.md §1/§2/§12.2/§12.3 裁定「scada-symbol 不注册」+ 依据回写齐全；docs/logs/2026/08-04.md 置顶条目为 I9 收口摘要；roadmap I9 审计前为 `(planned)`（未跳序），审计通过后已回写 `(done)`；命令实测：包级 379 tests / 28 files 全绿（coverage 阈值 90 达标，All files 96.15% stmts）、workspace `pnpm typecheck`/`pnpm build`/`pnpm lint`/`pnpm test` 全部通过（32/32、32/32、32/32、59/59 tasks）。

Follow-up:

- closure-audit 结论：零 Blocker / 零 live defect，无待关闭项。后续项按 Deferred But Adjudicated 与 Non-Blocking Follow-ups 区执行（视觉 e2e → I13.1/I15.1；性能复测 → I14；leafer-ui-mock 按需扩展）；confirmed live defect 不存在。

## Optional Sections

## Risks And Rollback

- **复合装配复杂度风险**：设备/仪表图元为多子形状复合（group 子树 + 动画/状态声明分层），装配正确性依赖 I8.3 深合并链路——纯逻辑单测固化优先级（复用 I8.3 既有断言扩展）；歧义记录回写设计文档，不静默选择。
- **动画与状态联动风险**：旋转/闪烁动画与状态样式（run/stop/fault）联动面宽（animator 启停 + StateVisualApplier 样式），分层由单测覆盖（I6.3 联动层输出 + I9 装配消费）；I6.3 revert-patch 已知边界由视觉层兜底（I8.2 记录，本 plan 继续消费）。
- **量程换算边界风险**：仪表量程换算（scale 声明 → applyScale → 指针角/文本）为纯逻辑链路，单测先行覆盖换算边界（k/b 线性、表达式、非法声明）；歧义记录回写 design-data-binding.md。
- **flow 增量路径风险**：管道 flow/dashOffset 增量应用（applyProps）与序列化 diff 协同，单测断言增量更新收敛；若 leafer 真实 API 不支持 dash-offset 直写，按 Failure Paths `leafer-animation-drift` 回退并记录。
