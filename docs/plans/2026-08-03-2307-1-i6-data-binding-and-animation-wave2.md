# 1 I6 数据绑定与动画引擎（Wave 2）

> Plan Status: completed
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I6、Cross-Cutting 性能红线/测试纪律/平台能力复用表）、`docs/components/industrial-hmi/design-data-binding.md`（§4.1-§4.5/§7/§8.1/§8.2/§9/§11 实现拆分）、`docs/components/industrial-hmi/design-engine.md`（§4.5 合帧义务/§8.1 引擎事件/§11 hit.ts）、`docs/components/industrial-hmi/design-renderer.md`（§8.2 事件载荷契约）
> Related: 上游 `docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`（completed，引擎 Wave 1，deferred 项 getPointValue/hit.ts 由本 plan 吸收）；下游 roadmap I7（实现对照 gate，依赖本 plan I6.4）、I8（Wave 3，依赖 I6.3 动画联动）、I10.3（点表↔flux 桥接）
> Mission: industrial-hmi
> Work Item: I6

## Purpose

实现 `scada-canvas` 数据绑定与动画引擎 Wave 2：点表模型与刷新流水线（I6.1）、属性绑定解析与多状态判定（I6.2）、状态动画引擎（I6.3）、事件系统与命中解析（I6.4）——全部落在 `packages/flux-renderers-industrial/src/binding/` 新域 + `src/engine/`（hit.ts/event-bridge.ts）域核心（无 React 依赖），纯逻辑 Vitest 单测先行，并吸收 I5 plan deferred 项（测试句柄 `getPointValue`、命中封装 `hit.ts`）。收口状态：I6.1–I6.4 全部完成、roadmap I6 回写 `done`。

## Current Baseline

- I5（引擎 Wave 1）已 `completed`，roadmap I5 已回写 `done`：`ScadaCanvasEngine` 生命周期/`applyAttrs` 批量写唯一入口（`src/engine/scada-engine.ts:131`）、视口命令、tree 层 render 帧事件（`scada-engine.ts:85`）、tree-registry `id→Leaf` 索引、config-adapter 场景树构建/销毁/重建/applyDiff、serialization 四模块、symbols 注册表与 8 基础形状、V5 20+ 自定义图元全路径。
- 测试句柄现状：`src/engine/test-handle.ts` 已暴露 engine/tree/app/getSymbol/getViewport/forceRender（I5 实现面），**`getPointValue` 依赖点表数据层，显式延后由本 plan I6.1 增量补入**（I5 plan Deferred 条目）。
- 图元属性 schema 已就绪：`ScadaSymbolProps` 含 `states?`/`bindings?`/`animations?`/`events?` 声明字段与 `ScadaSymbolStylePatch` 类型（`src/symbols/symbol-types.ts:36-42`），样式解析 `resolveSymbolStyle`（defaults ∪ 实例 ∪ statePatch）已存在。
- 序列化校验已含 bindings/states/animations 基本类型检查（`src/serialization/validate.ts:77-84`），绑定/状态/动画字段的语义校验属本 plan 增量。
- `src/binding/` 域不存在（待创建）；`src/engine/hit.ts` 不存在（design-engine.md §11 归属 I6.4）。
- 测试基建：`src/test-support/leafer-ui-mock.ts`（MockLeaf on/emit/add/remove 事件模型）已存在，供 I6 wiring 测试复用（I5 plan Non-Blocking Follow-up：mock 面维护为独立测试支持模块）。
- 契约依据：`design-data-binding.md` §11 给出 7 模块拆分（point-store/bind-resolver/expression-evaluator/reverse-index/dirty-collector/value-to-state/animator）；§4.3 刷新流水线（去重 → 帧内脏收集 → 帧尾 `engine.applyAttrs` 单次批量写）为性能红线固化；§4.4 动画（rotate/blink/flow/move + 生命周期）与 §4.5 多状态判定（ranges/booleanMap/valueMap）；§8.1 数据层事件（point:change/state:change/animation:start/stop）；§8.2 数据层句柄（setPointValues/getPointValue/getPointState/subscribe/animator.\*/flushFrame）。`design-engine.md` §8.1 引擎事件（symbol:click/dblclick/hover，载荷 `{ symbolId, world, viewport }`）；`design-renderer.md` §8.2 事件载荷规范化契约（`ScadaSymbolEventPayload`：symbolId/symbolType/pointValues/world/viewport）。
- 平台能力复用边界：`@{pointId}` 组态内表达式子集由**自研纯逻辑求值器**实现（design-data-binding.md §4.2 明确）；`$xxx` flux 表达式经 flux-formula/flux-compiler 编译求值与 `useScopeSelector` scope 订阅均属 **I10.3 renderer 桥接层**，本 plan 不实现；`createNormalizedActionEvent`/dispatch 属 **I11.1**（React 层）。
- 真正剩余的 gap：绑定/动画/事件域全部未实现；测试句柄缺 `getPointValue`；`hit.ts` 不存在。

## Goals

- I6.1：点表模型与刷新流水线——`binding/point-store.ts`（三源声明加载/去重 onlyChange/deadband/量程换算/初值）、`binding/reverse-index.ts`（pointId → [{symbolId, property}]）、`binding/dirty-collector.ts`（帧内脏属性收集 + 帧尾批量写 `engine.applyAttrs` 单次调用）；测试句柄 `getPointValue` 增量补入。
- I6.2：属性绑定解析与多状态判定——`binding/expression-evaluator.ts`（`@{pointId}` 子集：算术/比较/三元/字符串拼接 + 依赖链 + 缓存）、`binding/bind-resolver.ts`（point/expression/map/scale/format → 属性映射）、`binding/value-to-state.ts`（ranges/booleanMap/valueMap 判定 + 量程换算）。
- I6.3：状态动画引擎——`binding/animator.ts`（单一动画时钟 rAF + 30ms 限频、生命周期 start/stop/pause/resume/isPlaying、rotate/blink/flow/move 属性插值、状态触发 `when: { state }`、动画增量汇入帧内脏收集合帧）。
- I6.4：事件系统与命中解析——`src/engine/hit.ts`（`selector.getByPoint` O(候选) → symbolId 解析，A3 固化）、`src/engine/event-bridge.ts`（leafer 节点事件 → `symbol:click`/`symbol:dblclick`/`symbol:hover` 引擎事件桥，载荷对齐 `design-engine.md` §8.1）、事件载荷规范化（`ScadaSymbolEventPayload` 形状构造，对齐 `design-renderer.md` §8.2，调用 `createNormalizedActionEvent` 属 I11.1）、数据层事件接线（point:change/state:change/animation:start/stop 发射）。
- 刷新流水线端到端单测：1 万点语义下单帧批量合并（合并帧 + 脏属性收集断言），验证性能红线路径（不逐点直刷）。
- roadmap I6 回写 `done`；`docs/logs/2026/08-03.md` 记录收口摘要。

## Non-Goals

- 不实现 React 桥接层（mount/unmount/resize、ref 同步，属 I10.1）、renderer-definitions 完整注册（I10.2）、点表↔flux scope 桥接（useScopeSelector/flux-formula，属 I10.3）。
- 不实现事件→flux action 全链路派发（`createNormalizedActionEvent` + dispatch + props.events 兜底，属 I11.1）。
- 不实现视觉状态样式应用（选中/悬停/报警闪烁视觉效果，属 I8.2）、image/video 占位图元（I8.1）、复合图元 group/instance（I8.3）。
- 不实现网络协议适配器（websocket/mqtt/http/SSE，P2 评估项，经 RendererEnv/xui:imports）与报警状态机（FUXA 语义，本期不内置）。
- 不新增 leafer 之外的重型依赖；动画实现走自研属性插值（不引 `@leafer-in/animate`，见 Phase 3 Decision 项）。
- 不写 Playwright 用例（无 playground 页面可挂载；真实浏览器渲染断言属 I13.1/I15.1）。

## Scope

### In Scope

- `src/binding/` 新域 7 模块：point-store.ts、reverse-index.ts、dirty-collector.ts、expression-evaluator.ts、bind-resolver.ts、value-to-state.ts、animator.ts（全部纯逻辑 Vitest 单测先行）。
- `src/engine/hit.ts`：命中封装（selector.getByPoint → symbolId；A3：无空间索引）。
- `src/engine/event-bridge.ts`：引擎事件桥（tree 层事件捕获 → 命中解析 → `symbol:click/dblclick/hover` 事件发射，载荷 `{ symbolId, world, viewport }`）。
- `src/engine/test-handle.ts` 增量：`getPointValue(pointId)`（I6.1 接线，结构为既有句柄增量扩展，不构成契约缺口）。
- 数据层事件：point-store/value-to-state/animator 发射 point:change/state:change/animation:start/stop（订阅/退订协议，I11 触发器体系评估的输入源）。
- 刷新流水线编排（dirty-collector 承担）：绑定求值 → 状态判定 → 动画增量 → 帧尾批量写。
- 引擎 `ScadaEngineOptions` 增量接线（点表数据源注入点，供 test-handle getPointValue 投影——Decision 项，见 Phase 1）。
- `vi.mock('leafer-ui')` wiring 单测（复用 `src/test-support/leafer-ui-mock.ts`，按需扩展 selector.getByPoint 等 mock 面）。
- `docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

### Out Of Scope

- React 桥接 hooks（`use-scada-*`，I10.1/I10.3）、renderer-definitions 完整注册（I10.2）。
- 事件→flux action 全链路（I11.1）、画布浏览交互（I11.2）。
- 视觉状态样式应用（I8.2）、image/video 图元（I8.1）、复合图元（I8.3）、设备/仪表/传感控制/管道图元库（I9）。
- 网络协议适配器（P2 评估）、报警状态机、多画面订阅切换（本期单画面）。
- 真实浏览器渲染 e2e 断言（I13.1/I15.1）与性能复测（I14）。

## Failure Paths

| 可测场景编号           | 触发                                                                                                                                       | 行为                                                                                                                                                  | 可重试 | 用户可见表现                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| upstream-not-ready     | 前置未就绪——具体判定：roadmap I5 = `done` 且 `src/engine/`/`src/serialization/`/`src/symbols/` 已落盘；`applyAttrs`/tree-registry 契约可用 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                                                         | 是     | plan 保持 `planned`/`in progress` |
| binding-cycle          | 组态内表达式 `@{pointId}` 依赖环（v1 → v2 → v1）                                                                                           | 求值器检测依赖环，报错信号（错误入 `onError` 语义，I10 桥接层消费）；单测覆盖环检测                                                                   | 是     | 绑定值保持上次有效值 + 错误事件   |
| point-id-unknown       | 绑定/表达式引用未声明点表 id；或反向索引无目标                                                                                             | 校验层已挡（validate 语义增量）；运行时未命中走 skip + 警告信号，不崩溃                                                                               | 是     | 该图元属性不更新，其余正常        |
| leafer-event-api-drift | leafer 实际事件名/`selector.getByPoint` 行为与 mock/设计表述不符                                                                           | 对照 spike 工程（`~/sources/industrial-hmi-research/spike-leafer/src/demo.js`）真实 API 核对，回写 Failure Paths 与设计文档风险节，不偏离 A3 固化条款 | 是     | 后续 I7 gate 复核修正记录         |
| animation-storm        | 动画常驻导致时钟拥塞（全画面常驻动画/高频闪烁）                                                                                            | 时钟 30ms 限频 + 动画增量合帧（汇入帧内脏收集）；闪烁等高频动画限制为状态触发（design-data-binding §12.2）                                            | 是     | 帧率稳定，动画合帧生效            |
| test-handle-drift      | 测试句柄 `getPointValue` 与点表 store 语义漂移（值快照 vs 引用）                                                                           | 单测断言覆盖（快照语义：返回当前值副本）；I7 gate 复核句柄契约                                                                                        | 是     | e2e 句柄读取错误                  |

## Test Strategy

档位选择：`必须自动化`——点表刷新流水线/绑定求值/状态机/动画时钟是本 mission 核心回归路径（roadmap 测试纪律「纯逻辑层单测先行」+ 性能红线）；Proof 项先于 Fix 项落地（每个模块先写失败测试再实现）。动画时钟以依赖注入方式实现（注入 now/调度器），单测用 fake timers 确定性驱动；引擎事件桥/命中解析以 `vi.mock('leafer-ui')` 覆盖（mock 面锚定 spike demo.js 真实 API + `src/test-support/leafer-ui-mock.ts` 复用扩展，含 selector.getByPoint）。真实浏览器渲染断言由 I13.1/I15.1 承担，本 plan 不写 Playwright 用例（见 Deferred 条目）。

## Execution Plan

### Phase 1 - I6.1 点表模型与刷新流水线

Status: completed
Targets: `src/binding/point-store.ts`、`src/binding/reverse-index.ts`、`src/binding/dirty-collector.ts`、`src/engine/test-handle.ts`

- Item Types: `Proof | Fix | Decision`

- [x] `Decision`：roadmap Phase Status 回写 I6: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0/I1/I2/I3 plan 先例）。
- [x] `Proof`：前置验证——具体判定：roadmap I5 = `done`；`src/engine/scada-engine.ts`（applyAttrs 批量写入口）与 `src/engine/tree-registry.ts`（id→Leaf 索引）契约可用；`design-data-binding.md` §4.1/§4.3 未被 I7 gate 前修正为冲突。
- [x] `Decision`：点表数据源注入点——测试句柄 `getPointValue` 的数据来源：`ScadaEngineOptions` 增可选 `pointStore?: PointStore`（引擎不解析业务语义，仅持只读引用供 test-handle 投影，对齐 design-engine.md §5「引擎只接收节点 id → 属性值写入」）；renderer 桥接层（I10）负责装配绑定层实例并注入；若 I7 gate 裁定此连接方式不合约，记录修正。
- [x] `Proof`：为点表 store 写失败测试：三源声明加载（static 初值/expression 占位/flux 占位）、`setPointValue`/`setPointValues` 批量写入、onlyChange 去重（值未变不派发）、deadband 死区（|Δ| < deadband 不派发）、scale 量程换算（y = k\*x + b）、init 初值、`getPointValue`/`getPointState` 快照语义。
- [x] `Fix`：`binding/point-store.ts`——`PointStore`：声明加载（`loadDeclarations(variables: ScadaPointDeclaration[])`）、`setPointValues(Record<pointId, value>)`（统一归口，去重/死区/换算后进 store）、`getPointValue`/`getPointState`、`subscribe(pointIds, cb)` 订阅协议（FUXA 蓝本，内部索引维护）、point:change 事件发射（去重后）。
- [x] `Proof`：为反向索引写失败测试：从组态 symbol 树提取 bindings → pointId → [{symbolId, property}]、图元增删时增量维护、空绑定不产生索引项。
- [x] `Fix`：`binding/reverse-index.ts`——`ReverseIndex`：构建（递归扫描 symbol 树 bindings 声明，遍历 `ScadaBinding` 的 point/expression 引用提取 pointId）、查询（`lookup(pointId): Array<{ symbolId, property }>`）、增量维护（applyDiff 后重建受影响子集）。
- [x] `Proof`：为帧内脏收集写失败测试：单帧多次 setPointValues 合并为一次批量写、脏属性收集收敛（同 symbol 多属性合并）、帧尾 `flushFrame` 强制批量写（测试/性能测量用）、帧内无写入则不触发渲染请求。
- [x] `Fix`：`binding/dirty-collector.ts`——`DirtyCollector`：`collect(entries)`（经 reverse-index 定位 + 绑定求值钩子，Phase 2 接线 bind-resolver）、帧尾 `flush(applyAttrs)` 单次批量写（engine.applyAttrs 唯一调用点，A5 合帧义务）、`requestRender` 帧对齐（与 animator 时钟共享调度）。
- [x] `Fix`：`src/engine/test-handle.ts` 增量——`getPointValue(pointId)` 接线（经 `ScadaEngineOptions.pointStore` 只读投影；I5 实现面不变）。
- [x] `Fix`：包 `index.ts` 导出点表域类型与句柄（PointStore/ReverseIndex/DirtyCollector + 类型再导出）。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。全量验证属 Closure Gates。

- [x] binding 三模块（point-store/reverse-index/dirty-collector）focused 单测全绿（三源/去重/死区/换算/索引增删/单帧合并批量写断言）。
- [x] 测试句柄 `getPointValue` 接线完成（单测覆盖：注入 pointStore 后快照返回正确、未注入时返回 undefined 不崩溃）。
- [x] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（Phase 2-4 依赖本 Phase 类型导出）。

### Phase 2 - I6.2 属性绑定解析与多状态判定

Status: completed
Targets: `src/binding/expression-evaluator.ts`、`src/binding/bind-resolver.ts`、`src/binding/value-to-state.ts`

- Item Types: `Proof | Fix`

- [x] `Proof`：为表达式求值器写失败测试：`@{pointId}` 引用 + 算术/比较/三元/字符串拼接子集求值、依赖链变化重算（v1 变 → 依赖 v1 的表达式缓存失效重算）、依赖环检测（`binding-cycle` Failure Path）、未声明点表 id 报错信号、缓存命中不重算。
- [x] `Fix`：`binding/expression-evaluator.ts`——`ExpressionEvaluator`：`@{pointId}` 语法解析（前缀隔离：`@{}`=组态点表，`$`=flux scope——flux 不落本层）、子集求值器（算术/比较/三元/拼接）、依赖链收集（求值过程记录引用的 pointId）、带缓存重算（依赖点表值变化时失效）、环检测。
- [x] `Proof`：为绑定解析写失败测试：`point` 单点绑定（值直接作属性值）、`expression` 表达式绑定（经 evaluator）、`map` 值→属性映射（文本/颜色）、`scale` 量程换算、`format` 格式化（文本属性）、绑定结果 → 属性映射（可绑定属性集：fill/stroke/strokeWidth/opacity/visible/text/textColor/rotation/x/y/width/height/flow）。
- [x] `Fix`：`binding/bind-resolver.ts`——`resolveBinding(binding, pointStore): { property: value }[]`（统一归口：绑定只引用点表变量，`ScadaBinding` 各字段求值优先级：point → expression → map → scale → format）；输出属性键限制在可绑定属性集合（fill/stroke/strokeWidth/opacity/visible/text/textColor/rotation/x/y/width/height/flow，对齐 `design-data-binding.md` §4.2 可绑定属性集合）。
- [x] `Proof`：为状态判定写失败测试：`ranges` 区间映射（min/max 边界含端点）、`booleanMap`（true/false → state）、`valueMap`（枚举字符串 → state）、多判定配置优先级（ranges vs booleanMap vs valueMap）、无匹配 → 默认状态（run/stop/fault + 自定义）、量程换算先行（值 → scale → 判定）。
- [x] `Fix`：`binding/value-to-state.ts`——`resolveState(declaration: ScadaStateDeclaration, rawValue): string`（判定链纯逻辑：值 → 换算（scale）→ 区间/映射判定 → 状态；`state:change` 事件发射点由状态机联动层接线，Phase 3）。
- [x] `Fix`：刷新流水线接线——dirty-collector 的绑定求值钩子接入 bind-resolver（帧内脏属性收集 = 遍历 reverse-index → 绑定求值 → 状态判定 → 合并 Map<symbolId, Map<property, value>>）。

Exit Criteria:

- [x] evaluator/resolver/value-to-state 三模块纯逻辑单测全绿（子集语法/依赖链/环检测/映射/换算/判定优先级断言）。
- [x] 端到端单测：setPointValues → 绑定求值 → 状态判定 → 帧尾 applyAttrs 批量写全链路收敛断言（1 帧内多属性合并为单次批量写）。

### Phase 3 - I6.3 状态动画引擎

Status: completed
Targets: `src/binding/animator.ts`

- Item Types: `Proof | Fix | Decision`

- [x] `Decision`：动画实现路径——自研属性插值（**不引 `@leafer-in/animate` 插件**）：rotate=rotation 插值、blink=opacity/visible 方波、flow=strokeDash/strokeDashOffset 位移、move=x/y 插值；理由：四类动画均为属性级插值，走既有 `applyAttrs` 批量路径 + 合帧（design-engine §4.5），避免新增插件依赖面（对齐 I4 pnpm-lock 审查纪律）；若实现期发现 leafer 属性支持缺口（如 dash 动画属性名差异），按 `leafer-api-drift` Failure Path 记录。
- [x] `Proof`：为动画时钟写失败测试（依赖注入 now/调度器 + fake timers）：rAF + 30ms 限频（高频率请求合并）、单 tick 增量计算、动画增量汇入帧内脏收集（合帧断言）、生命周期 start/stop/pause/resume/isPlaying、`loop` 循环次数（0=无限）、数据动态替换动画参数（setAttrs 参数更新）。
- [x] `Fix`：`binding/animator.ts`——`Animator`：时钟（注入 `{ now, scheduleTick }` 调度，rAF 对齐 + interval 30ms 限频，design-data-binding §4.4）、`start(symbolId, animation)`/`stop`/`pause`/`resume`/`isPlaying`、rotate/blink/flow/move 四类插值计算（周期 period/幅度 from/to）、`when: 'always' | { state }` 状态触发（进入状态启动、退出停止，与 value-to-state 判定联动）、动画增量合并进 DirtyCollector（禁止每帧全量重建场景）、animation:start/stop 事件发射。
- [x] `Proof`：为状态联动写失败测试：状态切换 → 样式覆盖（`resolveSymbolStyle` 消费 `ScadaStateDefinition.style`，I5 已实现解析规则）→ 动画启停联动（fault 态自动 blink）；退出状态停止动画；state:change 事件发射。
- [x] `Fix`：状态机联动接线——`binding/` 状态联动层：绑定求值 → value-to-state 判定 →（样式覆盖 patch 汇入脏收集）+（animator 启停按 `when: { state }` 匹配）。

Exit Criteria:

- [x] animator 单测全绿（fake timers 确定性驱动：生命周期/限频/合帧/状态联动/blink 报警语义断言）。
- [x] 刷新流水线 + 动画合帧端到端单测通过（动画 tick 增量与点表刷新同一帧批量写收敛）。

### Phase 4 - I6.4 事件系统与命中解析

Status: completed
Targets: `src/engine/hit.ts`、`src/engine/event-bridge.ts`、`src/binding/`（数据层事件接线）

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`：为命中解析写失败测试（vi.mock）：`getByPoint` 命中 → symbolId 解析、屏外点立即排除（O(候选) 预检语义）、命中 group 子节点返回最深命中节点 id、无命中返回 undefined。
- [x] `Fix`：`src/engine/hit.ts`——`HitResolver`：`resolveSymbolId(viewX, viewY): string | undefined`（经 leafer `selector.getByPoint`（A3 固化，O(候选) 预检，不引空间索引）+ tree-registry 反查 id）。
- [x] `Proof`：为事件桥写失败测试（vi.mock）：tree 层节点事件捕获 → 命中解析 → `symbol:click`/`symbol:dblclick`/`symbol:hover` 发射（载荷 `{ symbolId, world, viewport }`）、事件注册/注销（引擎生命周期）、未命中事件不发射、重复注册幂等。
- [x] `Fix`：`src/engine/event-bridge.ts`——`EventBridge`：挂接 tree 层 leafer 事件（click/dblclick/hover 对应指针事件流）、命中解析（HitResolver）、事件载荷构造（world=viewportToWorld 换算，消费 I5.2 坐标工具）、发射回调（引擎构造参数注入 `onSymbolEvent` 或订阅接口）；destroy 时注销。
- [x] `Fix`：引擎接线——`ScadaEngineOptions` 增事件回调入口（`onSymbolClick/onSymbolDblClick/onSymbolHover` 或统一订阅接口）；场景构建/销毁时 event-bridge 生命周期对齐。
- [x] `Proof`：为载荷规范化写失败测试：`ScadaSymbolEventPayload` 形状构造（symbolId/symbolType/pointValues 只读快照/world/viewport）——symbolType 经 tree-registry 查 symbol 定义、pointValues 经 point-store 投影（快照，只读）。
- [x] `Fix`：事件载荷规范化模块（域核心内）——构造对齐 `design-renderer.md` §8.2 `ScadaSymbolEventPayload` 的数据对象；**`createNormalizedActionEvent` 调用与 action dispatch 属 I11.1（React 层），本层只产出规范化载荷**（避免重复实现，roadmap 平台能力复用表）。
- [x] `Decision`：`createNormalizedActionEvent` 归属裁定记录——roadmap 平台能力复用表将 I6.4 列为 `createNormalizedActionEvent` 消费方（roadmap-industrial-hmi.md Cross-Cutting 复用表）、roadmap I6.4 措辞为「事件载荷规范化（对齐 createNormalizedActionEvent）」；本 plan 的裁定：I6.4 消费语义 = **载荷形状对齐**（构造 `ScadaSymbolEventPayload` 数据对象），`createNormalizedActionEvent` 实际调用（React 依赖：renderer-helpers.ts:98）归 I11.1；该裁定作为差异清单项交 I7 gate 复核确认（I7 输入含本 plan 裁定记录，防双实现/防悬空）。
- [x] `Fix`：数据层事件接线——point-store/value-to-state/animator 的 point:change/state:change/animation:start/stop 统一发射出口（订阅/退订协议，I11 触发器体系评估的输入源）。
- [x] `Fix`：`docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

Exit Criteria:

- [x] hit.ts/event-bridge 经 vi.mock 单测验证（命中解析/事件发射/载荷/注册注销/销毁清理断言）。
- [x] 载荷规范化单测通过（payload 形状与 `design-renderer.md` §8.2 契约逐字段核对）。
- [x] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，task `ses_037d1212bffekKyZ1T0H8kgyht`）
- Verdict: `pass-with-minors`（round 2；round 1 `revise`，1 Major + 3 Minor 全部落地；round 2 零 Blocker/Major，1 新 nit 已修正）
- Rounds: 2
- Findings addressed: M-1「roadmap `todo → planned` 状态流转缺失」→ Phase 1 增 roadmap 回写 Decision 项 + Closure Gates 状态机未跳序断言；m-1「createNormalizedActionEvent 归属张力（reuse 表 I6.4 消费方）」→ Phase 4 增 Decision 裁定（载荷形状对齐 + 交 I7 gate 复核）+ Deferred 条目同步；m-2「可绑定属性集合引注错文档」→ 改为 design-data-binding.md §4.2 并列出属性集；R2 nit（Phase 4 Item Types 缺 Decision）已修正。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。
>
> **全量验证归此处**：`pnpm typecheck`/`build`/`lint`/`test` 是 plan 收口时跑一次的仓库级检查，不要在 Phase Exit Criteria 里重复。

- [x] I6.1–I6.4 全部落地：binding 七模块 + hit.ts/event-bridge + 测试句柄 getPointValue + 数据层事件，均有 focused 单测覆盖，包级 typecheck 通过。
- [x] 刷新流水线性能红线成立：帧内脏属性收集 → 帧尾 `engine.applyAttrs` 单次批量写（无逐点写路径）；动画增量汇入帧内脏收集合帧（无每帧全量重建）。
- [x] 契约一致性：绑定/状态/动画/事件类型与 `design-data-binding.md` §4.1-§4.5/§8.1-§8.2、`design-engine.md` §8.1、`design-renderer.md` §8.2 对照一致，无未裁定偏离；测试句柄 `getPointValue` 已补入（I5 deferred 项落地）。
- [x] `hit.ts` 落地且不引空间索引（A3 固化）；事件载荷规范化形状对齐（`createNormalizedActionEvent` 调用明确归属 I11.1，无重复实现）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] roadmap 状态机未跳序：I6 `todo → planned` 已在激活期完成，收口时 `planned → done` 由独立 closure-audit 核验后回写。
- [x] 受影响的 owner 文档已同步（docs/logs 收口摘要；design-\*.md 风险节如需回写已记录；架构文档同步属 I15.2）。
- [x] roadmap Phase Status I6 已回写 `done`。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 点表↔flux scope 桥接（useScopeSelector + flux-formula 求值注入）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 点表 `source: 'flux'` 三源之一属双轨数据模型（讨论 Q3）；scope 订阅与公式编译必须复用平台能力（`useScopeSelector`/flux-formula，roadmap 平台能力复用表），且依赖 renderer 桥接层（I10.3）才存在 scope 上下文；本 plan 的 point-store 已预留三源声明加载与 `setPointValues` 统一入口，桥接层注入不构成契约缺口。
- Successor Required: `yes`
- Successor Path: roadmap I10.3（点表↔flux 表达式桥接）

### 事件→flux action 全链路派发

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `createNormalizedActionEvent`（`@nop-chaos/flux-react` renderer-helpers.ts:98）与 `useActionDispatcher` 属 React 桥接层能力（roadmap 平台能力复用表消费方 I6.4/I11.1）；本 plan 域核心（无 React 依赖）只产出规范化载荷对象（`ScadaSymbolEventPayload` 形状，**reuse 表 I6.4 消费语义裁定 = 载荷形状对齐，已记录 Decision 项交 I7 gate 复核**），包装与 dispatch 属 I11.1——载荷契约已对齐，不构成行为缺口。
- Successor Required: `yes`
- Successor Path: roadmap I11.1（图元事件→flux action 全链路）

### 触发器体系（dataEvents 条件-动作完整触发）

- Classification: `watch-only residual`
- Why Not Blocking Closure: design-data-binding.md §2 决策表将条件-动作触发列为 P1 借鉴（meta2d 完整 Trigger 体系不采纳）；本 plan 已提供 `point:change`/`state:change` 事件源与订阅协议，是否扩展为触发器体系随 I11 评估。
- Successor Required: `yes`
- Successor Path: roadmap I11.1（随事件联动评估）

### 真实浏览器渲染 e2e 断言

- Classification: `watch-only residual`
- Why Not Blocking Closure: 引擎 wiring 与刷新流水线已由 vi.mock 单测覆盖；leafer 真实渲染路径已由 I1.2 spike 在真实浏览器验证；真实浏览器内 e2e 断言需 playground 页面挂载点——首个可挂载页面为 I13.1 scada-demo，正式 e2e 程序化断言补强属 I15.1；属 roadmap 既定顺序，不构成 I6 的 in-scope 缺陷。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（首个可挂载页面）与 I15.1（e2e 程序化断言补强）

### 网络协议适配器与报警状态机

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 协议适配器（websocket/mqtt/http/SSE）为 P2 评估项（经 RendererEnv/xui:imports，INV-1/INV-2）；报警状态机（阈值-ACK-历史）为 FUXA 服务端能力，roadmap 明确本期不内置（design-data-binding.md §9.3）；状态判定模型已预留 fault 语义扩展点。
- Successor Required: `no`
- Successor Path: —（P2 评估随后继 roadmap 项）

## Non-Blocking Follow-ups

- `src/test-support/leafer-ui-mock.ts` 按需扩展（selector.getByPoint 等 mock 面），供 I10/I11 测试复用（对齐既有包 test-support 惯例）。
- 若实现期发现 leafer 实际事件名/动画属性名与设计表述偏差（Failure Paths `leafer-event-api-drift`），修正记录供 I7 gate 复核输入。
- 刷新流水线端到端单测的 1 万点语义批量合并断言留作 I14 benchmark 的纯逻辑前置（性能复测本体属 I14）。

## Closure

Status Note: I6.1–I6.4 全部落地——binding 七模块（point-store/reverse-index/dirty-collector + RefreshPipeline/expression-evaluator/bind-resolver/value-to-state/animator）+ engine/hit.ts + engine/event-bridge.ts + 测试句柄 getPointValue + 数据层事件统一发射出口（point:change/state:change/animation:start/stop 订阅退订协议）；性能红线成立（帧内脏收集 → 帧尾 applyAttrs 单次批量写，1 万点语义单帧合并由 1000 点批量断言覆盖 + I14 全量基准后置）；契约对照 design-data-binding §4.1-§4.5/§8.1-§8.2、design-engine §8.1/§8.3、design-renderer §8.2 一致；createNormalizedActionEvent 归属裁定（载荷形状对齐、调用归 I11.1）与 leafer mock off 对称性修正已记录（mock 修正属测试支持面维护，align Non-Blocking Follow-up）；deferred 项分类诚实（5 项均含 successor path）；closure-audit 独立通过后收口，roadmap I6 `planned → done` 回写。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_037a325b3ffe9K13QXY2a8qteT`，复核轮 `ses_0379f3e0bffefRrXNbVnEECWOP`）
- Evidence: 六项检查全部 `approved`（① live repo 证据逐模块 file:line 核验；② 接口语义抽查——帧尾单次批量写/依赖链重算+环检测/30ms 限频合帧/屏外预检/载荷形状/`createNormalizedActionEvent` 零调用；③ plan 一致性——四 Phase 全 completed、Execution Plan/Exit Criteria 无孤儿 `[ ]`；④ deferred 诚实性——5 项分类与 successor path 逐一核对 roadmap 存在；⑤ 契约对齐——design-\*.md 逐项对照；⑥ 测试非空洞——268 passed 独立重跑 + coverage statements 96.77/branches 90.78/functions 97.57/lines 98.44）。1 项 blocking（docs/logs 收口摘要缺失）已补入 `docs/logs/2026/08-03.md` 并经独立复核轮 `pass` 后收口。

Follow-up:

- 无 in-scope 残留。Non-Blocking Follow-ups 三项维持：leafer-ui-mock 按需扩展（I10/I11 复用）、leafer 真实 API 偏差修正记录（I7 gate 复核输入）、1 万点批量合并全量断言留 I14 benchmark 纯逻辑前置。

## Optional Sections

## Risks And Rollback

- **动画实现路径风险**：自研插值不引 `@leafer-in/animate`（Phase 3 Decision）；若 I14 实测动画路径不达标，按 roadmap「人工确认阈值」处理（design-data-binding.md §12.2）。
- **双轨一致性风险**：`$xxx` 与 `@{pointId}` 语法前缀隔离已在设计层固化（§12.2）；本 plan 只实现 `@{}` 子集，flux 侧由 I10.3 兜底，无语法冲突面。
- **订阅风暴风险**：点表高频刷新不进 scope（INV-4）；flux 桥接按声明路径订阅（I10.3）；本层订阅协议为组态内单画面（不涉及多画面切换）。
