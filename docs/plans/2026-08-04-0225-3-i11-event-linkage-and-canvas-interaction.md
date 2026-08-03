# 3 I11 事件联动与画布交互

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I11、Cross-Cutting 平台能力复用表/测试纪律/性能红线）、`docs/components/industrial-hmi/design-renderer.md`（§8.1 schema 级事件/§8.2 图元事件→flux action 联动/§8.3 React 桥接/§8.5 组件句柄）、`docs/components/industrial-hmi/design-engine.md`（§4.4 视口变换/§6 交互覆盖层/§8.1 引擎事件/§8.2 命令句柄）、`docs/analysis/industrial-hmi/gate-3-review.md`（§10 wheel/pinch 交互配置/sky 覆盖物接线归属）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（Q8 交互/事件能力）
> Related: 上游 `docs/plans/2026-08-03-2307-1-i6-data-binding-and-animation-wave2.md`（deferred 事件→action 派发/触发器体系评估）、`docs/plans/2026-08-03-2307-3-i8-basic-symbol-library-wave3.md`（deferred sky 覆盖物接线）、本批 `2026-08-04-0225-2-i10-renderer-and-flux-integration.md`（前置，use-scada-events.ts 桥接基座）；下游 roadmap I12（整体 gate）
> Mission: industrial-hmi
> Work Item: I11

## Purpose

实现事件联动与画布交互：图元事件→flux action 全链路（click/dblclick→dialog/页面跳转/数据请求，playground 验证场景）（I11.1）、画布浏览交互（视口平移/缩放 wheel/pinch、fit/center 控制、图元 hover 命中反馈）（I11.2）——在 I10 renderer 桥接基座之上完成事件派发全链路与画布浏览能力，消费 I6.4 事件系统（EventBridge/HitResolver）+ I5.2 视口命令 + I8.2 交互覆盖层。收口状态：I11.1–I11.2 全部完成、roadmap I11 回写 `done`。

## Current Baseline

- I6.4 事件系统已落地：`EventBridge`（attach/destroy 幂等，tap/double_tap/pointer.move → symbol:click/dblclick/hover 发射，载荷 `{ symbolId, symbolType, pointValues?, world?, viewport? }`，M-1/M-2 修正后真实 leafer API 对齐）、`HitResolver`（getByPoint 解包 IPickResult.target，M-2 修正后可用）、`buildSymbolEventPayload`（规范化载荷）。
- I5.2 视口已落地：`viewport.ts` 纯逻辑坐标工具（worldToViewport/viewportToWorld/fit/center/zoomAt/setViewport，MIN_SCALE 0.1/MAX_SCALE 20 钳制）；引擎命令句柄 fit/center/setViewport/zoomAt/getViewport/getWorldPoint/getViewportPoint（M-3 平移符号修正后真实 leafer 可用）。
- I8.2 交互覆盖层已落地：`InteractionOverlay`（sky 层 Group + INTERACTION_STYLE_PRESETS hover/press/selected/disabled 预设）、`interactionLayer` 引擎选项惰性接线（m-7 记录：sky 覆盖物接线归 I8.2/I11.2 语义）。
- I10（前置，本批 plan）将交付：renderer 桥接（use-scada-events.ts：onSymbolEvent → createNormalizedActionEvent → dispatch + props.events 映射 + onReady/onError；use-scada-engine.ts：引擎实例 + 测试句柄）、组件句柄（use-scada-handles.ts：fit/center 等）。
- gate-3-review §10 归属：wheel/pinch 用户交互配置（引擎依赖 viewport 插件默认配置；zoom min/max 引擎状态钳制 0.1/20 vs 插件无钳制——I11.2 落地核对）；视觉状态交互层（hover 高亮等 sky 覆盖物）与 `interactionLayer` 接线（m-7 关联）。
- I6 deferred 触发点：事件→flux action 全链路派发（→ I11.1）；触发器体系（dataEvents 条件-动作完整触发，→ 随 I11 评估）；sky 覆盖物接线（hover 真实事件桥→覆盖层，I8 plan Phase 2 Fix 记录「真实 hover 事件桥→覆盖层接线归 I11.2」，interaction-overlay.ts:24/scada-engine.ts:44 前向引用，归 I11.2 兑现）。
- 平台能力（已核实）：`useActionDispatcher()`/`createNormalizedActionEvent(event)` 单参数（renderer-helpers.ts:98）、`props.events` 映射（flux-react 既有模式）、`useScopeSelector`（由 I10.3 前置交付接入点表桥接，本 plan 不重复接线）。
- 真正剩余的 gap：组态内图元事件声明（`ScadaSymbolEvent[]`，design-symbols.md §4.2 `events` 字段）→ action 派发未实现；playground 事件联动验证场景不存在；wheel/pinch 平移缩放交互未核对/配置（viewport 插件默认配置 vs 引擎钳制）；hover 命中反馈覆盖物未接线（interactionLayer → InteractionOverlay → EventBridge symbol:hover）；触发器体系评估未执行。

## Goals

- I11.1：组态内图元事件声明→flux action 全链路——图元 `events` 声明读取（`{ on: 'click'|'dblclick'|'hover', action: ActionSchema }`）→ 事件载荷规范化（`createNormalizedActionEvent`）→ `useActionDispatcher`/helpers.dispatch 派发；`props.events.onSymbolClick/onSymbolDblClick/onSymbolHover` 全局钩子并存（图元声明优先，全局钩子兜底，design-renderer.md §8.2）；playground 验证场景（click→dialog、click→页面跳转、click→数据请求的最小验证页，非 I13 完整 demo）；触发器体系评估裁定（I6 deferred：`point:change`/`state:change` 事件源是否扩展条件-动作触发，裁定 + 依据回写）。
- I11.2：画布浏览交互——wheel/pinch 平移缩放（viewport 插件默认交互配置核对 + zoom 边界钳制核对：引擎状态 0.1/20 vs 插件行为，gate-3-review §10）、fit/center 控制（组件句柄已注册，验证接入）、图元 hover 命中反馈（EventBridge symbol:hover → InteractionOverlay sky 覆盖物高亮，interactionLayer 接线兑现 m-7）；**不含编辑器交互**（拖拽/旋转/多选/属性面板后置 I16，范围与讨论 Q8 一致）。
- 全部以组件测试 + 纯逻辑单测覆盖（vi.mock leafer）；roadmap I11 回写 `done`。

## Non-Goals

- 不实现编辑器交互（图元拖拽/旋转/多选/属性面板/工具箱，I16 后继 mission）。
- 不实现 Playground 演示页（I13）；不写 Playwright 用例（真实浏览器断言属 I13.1/I15.1）。
- 不实现完整触发器体系（meta2d 19 动作体系）——只做评估裁定；条件-动作纯数据模型已由 `point:change`/`state:change` 事件源支撑，扩展与否随裁定。
- 不实现性能复测（I14）、协议适配器（P2）。

## Scope

### In Scope

- 组态内图元事件声明→action 全链路（`src/renderer/` 扩展：图元事件声明读取 → 规范化 → 派发；props.events 并存）。
- playground 事件联动最小验证场景（click→dialog/跳转/数据请求验证页，注册临时路由；非 I13 完整 demo）。
- 触发器体系评估裁定（`point:change`/`state:change` 条件-动作扩展评估，裁定 + 依据回写 design-data-binding.md §12.3）。
- 画布浏览交互（`src/engine/` + `src/renderer/`）：wheel/pinch 平移缩放核对与配置、zoom 边界钳制核对、fit/center 接入验证、hover 命中反馈覆盖物接线（interactionLayer → InteractionOverlay → symbol:hover）。
- `docs/logs/2026/08-04.md` 记录本 plan 产出摘要。

### Out Of Scope

- 编辑器交互（图元拖拽/旋转/多选/属性面板/连线，I16）。
- Playground 演示页（I13.1 scada-demo / I13.2 大屏示例）、e2e 程序化断言（I13.1/I15.1）。
- 完整触发器体系实现（仅评估裁定）、性能复测（I14）。

## Failure Paths

| 可测场景编号                | 触发                                                                                    | 行为                                                                                                                                                                                                                                                                                                                                                                                            | 可重试 | 用户可见表现                      |
| --------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| upstream-not-ready          | 前置未就绪——roadmap I9/I10 = `done` 且 I9 评估裁定无待人工裁决项；renderer 桥接基座可用 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                                                                                                                                                                                                                                                                                                   | 是     | plan 保持 `planned`/`in progress` |
| event-declaration-drift     | 图元事件声明字段（on/action）与 ScadaSymbolEvent 契约漂移                               | 纯逻辑单测固化声明读取（on 枚举/action 形状校验）；歧义记录回写 design-renderer.md §8.2                                                                                                                                                                                                                                                                                                         | 是     | 事件派发正确、非法声明走 onError  |
| dispatch-conflict           | 图元声明与 props.events 全局钩子并存时的派发顺序漂移（声明优先/钩子兜底）               | 组件测试固化优先级链（图元声明优先，props.events 兜底）；歧义记录回写                                                                                                                                                                                                                                                                                                                           | 是     | 派发行为确定，无双触发            |
| hover-overlay-drift         | symbol:hover 事件 → InteractionOverlay 覆盖物接线漂移（高亮错位/残留）                  | 组件测试断言覆盖物出现/消失/跟随（hover 进/出/移）；接线经 interactionLayer 选项开关                                                                                                                                                                                                                                                                                                            | 是     | hover 高亮正确跟随，无残留        |
| viewport-interaction-drift  | wheel/pinch 交互行为与引擎视口钳制（0.1/20）不一致（越界缩放/平移漂移）                 | 引擎 `clampViewport` 仅钳制 **scale**（MIN_SCALE 0.1/MAX_SCALE 20，viewport.ts:32-34），平移 x/y 设计上不钳制——单测断言缩放钳制 + 平移坐标正确性（非「平移钳制」）；viewport 插件默认交互配置核对记录；**若插件缩放路径绕过 clampViewport（插件直改 zoomLayer 矩阵）**，兜底机制 = 引擎订阅 viewport 缩放事件后重钳制（或 I11.2 在 wheel 处理器处钳制），Proof 核对后按实际情况接线，不静默接受 | 是     | 缩放/平移行为稳定，不越界         |
| playground-scenario-missing | I11.1 playground 验证场景与 I13.1 scada-demo 边界漂移（提前实现 demo 或验证页永久化）   | 验证页为最小临时场景（明确标注「验证用，I13.1 正式 demo 取代」），退出时收敛范围                                                                                                                                                                                                                                                                                                                | 是     | 验证场景可用，demo 归 I13         |

## Test Strategy

档位选择：`必须自动化`——事件→action 派发是公共契约核心路径（对齐 `createNormalizedActionEvent`/props.events 既有模式），画布交互（平移/缩放/hover 反馈）是运行时核心行为；Proof 项先于 Fix 项落地。组件测试用 flux-react test-support-runtime 装配 + `vi.mock('leafer-ui')`；视口钳制/事件声明读取为纯逻辑单测；playground 验证场景以组件测试覆盖派发链路（非手动验收）；真实浏览器 wheel/pinch/hover 视觉断言延后 I13.1/I15.1（watch-only residual，见 Deferred 条目）。

## Execution Plan

### Phase 1 - I11.1 图元事件→flux action 全链路 + 触发器体系评估

Status: planned
Targets: `src/renderer/`（图元事件声明派发扩展）、playground 临时验证路由、`docs/components/industrial-hmi/design-data-binding.md`（§12.3 评估回写）

- Item Types: `Proof | Fix | Decision`

- [ ] `Decision`：roadmap Phase Status 回写 I11: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0–I10 plan 先例）。
- [ ] `Proof`：前置验证——roadmap I10 = `done`（I10 五边界审计无待人工裁决项）；`use-scada-events.ts` 桥接基座（onSymbolEvent → createNormalizedActionEvent → dispatch）可用；`ScadaSymbolEvent` 类型（design-symbols.md §4.2 `events` 字段）与 `createNormalizedActionEvent`（renderer-helpers.ts:98 单参数）契约可用。
- [ ] `Proof`：事件派发失败测试先行（`renderer/scada-event-actions.test.tsx`）：图元 `events` 声明读取（on 枚举 click/dblclick/hover、action 形状校验、非法声明 → onError）、声明优先 + props.events 兜底优先级链、派发载荷形状（ScadaSymbolEventPayload → FluxActionEvent，symbolId/pointValues 承载）、**双击合并语义**（leafer 交互层自带：`Interaction.ts:321-356` 对 path 含 `double_tap` 监听的首击延迟发射（`setTimeout(emitTap, tapTime)`，默认 tapTime=120ms，config.ts:14）+ 双击窗口（`tapTime+50`）内 `tapWaitCancel` 取消首击，双击只派发 dblclick 不派发 click——EventBridge 恒挂 `double_tap` 监听故抑制生效；mock 需按该语义建模延迟/取消，design-renderer.md §8.2:212「dblclick 由交互层合并」同口径）。
- [ ] `Fix`：组态内图元事件声明→action 全链路——`use-scada-events.ts` 扩展：场景构建时收集图元 `events` 声明（symbolId → ScadaSymbolEvent[] 索引），EventBridge onSymbolEvent 到达 → 查声明 → 优先派发声明 action；无声明时映射 props.events 全局钩子（onSymbolClick/onSymbolDblClick/onSymbolHover）；非法声明走 onError。
- [ ] `Fix`：playground 事件联动最小验证场景——注册临时路由/卡片（标注「I11 验证用，I13.1 正式 demo 取代」）：scada-canvas 加载最小组态（1-2 图元 + 事件声明），click→dialog、click→页面跳转、click→数据请求三链路验证。
- [ ] `Decision`：触发器体系评估（I6 deferred 触发点，design-data-binding.md §12.3）：以 `point:change`/`state:change` 事件源 + 既有事件派发链评估条件-动作触发扩展（meta2d dataEvents 蓝本）——裁定扩展/不扩展 + 依据（需求场景/成本/与既有事件体系边界），回写 design-data-binding.md §12.3；若裁定扩展则产出扩展设计草案供 roadmap 后续项消费（实现不在本 plan）。

Exit Criteria:

- [ ] 图元事件声明→action 全链路组件测试全绿（声明读取/优先级链/载荷形状/非法声明断言）；playground 验证场景可运行（三链路经组件测试覆盖断言，非手动验收）。
- [ ] 触发器体系评估裁定落地（design-data-binding.md §12.3 回写，裁定 + 依据）。

### Phase 2 - I11.2 画布浏览交互（wheel/pinch、fit/center、hover 反馈）

Status: planned
Targets: `src/engine/`（interactionLayer 接线）、`src/renderer/`（交互接线）、`docs/components/industrial-hmi/design-engine.md`（视口交互核对记录）

- Item Types: `Proof | Fix | Decision`

- [ ] `Proof`：视口交互前置核对——viewport 插件默认 wheel/pinch 交互配置（gate-3-review §10 归属）与引擎视口钳制（MIN_SCALE 0.1/MAX_SCALE 20，仅钳制 scale）核对：zoomAt/setViewport 纯逻辑钳制单测（越界缩放钳制 + 平移坐标正确性断言）；插件默认行为核对记录（能否满足浏览需求/钳制一致性）。
- [ ] `Proof`：hover 反馈失败测试先行（`renderer/scada-hover-overlay.test.tsx`）：EventBridge symbol:hover 到达 → InteractionOverlay 覆盖物出现/跟随断言（hover 进/移），**hover 退出/切换路径**（A→B 图元切换清前一覆盖物、指针移出命中为空 → 覆盖物消失）——事件源机制：EventBridge 增发 hover-miss 信号（pointer.move 命中为空且前一命中存在时发射）或 renderer 监听 tree `pointer.leave`（PointerEvent.LEAVE，@leafer-ui/event PointerEvent.ts:24），interactionLayer 选项开关行为。
- [ ] `Fix`：hover 命中反馈接线——`use-scada-engine.ts`/`use-scada-events.ts` 扩展：`interactionLayer` 选项开启时经引擎惰性 getter 获取 InteractionOverlay（sky 层，scada-engine.ts:125-128；renderer 传 `interactionLayer: true` 并驱动 `highlight`/`clear`，不自行创建），EventBridge symbol:hover → 覆盖物高亮（INTERACTION_STYLE_PRESETS）；**hover 退出/切换接线**：EventBridge 增发 hover-miss 信号（或 renderer 订阅 tree `pointer.leave`——注意 `pointerEnterOrLeave` 每次移动都发 LEAVE/ENTER，必须以前一命中存在为守卫，测试场景显式覆盖），A→B 切换清前一目标、命中为空清当前覆盖物（InteractionOverlay 按 symbolId 键控，必须显式清理防残留）；覆盖物随图元移动/移除清理（applyDiff 增删同步）；m-7 接线兑现。
- [ ] `Fix`：画布浏览交互——wheel/pinch 平移缩放（viewport 插件默认交互配置核对后启用；若插件行为与钳制不一致，引擎侧兜底钳制）、fit/center 控制接入验证（组件句柄 fit/center 已注册，经测试断言视图状态变化）；记录核对结论回写 design-engine.md §4.4（如需）。
- [ ] `Fix`：`docs/logs/2026/08-04.md` 记录本 plan 产出摘要（置顶条目）。

Exit Criteria:

- [ ] hover 反馈接线测试全绿（覆盖物出现/跟随/消失 + interactionLayer 开关断言）；视口钳制单测全绿（越界断言）。
- [ ] wheel/pinch 平移缩放与 fit/center 控制验证完成（组件测试断言视图状态变化；插件配置核对结论记录，无未裁定偏离）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（general，fresh session），R1 task `ses_0371bc60effehPghCzh2QQLNeE`，R2 task `ses_037152178ffeEG5LwYg1m7bBcw`
- Verdict: R1 `revise`（2 Major + 3 Minor + 1 Nit 全部落地）→ R2 `pass-with-minors`（零 Blocker/Major，1 Minor + 3 Nit，Minor 已落地）
- Rounds: 2
- Findings addressed: M-1「dblclick 不触发 click 断言无实现路径」→ Proof 重写：双击合并语义落地为 leafer 交互层机制（Interaction.ts:321-356 首击延迟 setTimeout(emitTap, tapTime) + 双击窗口内 tapWaitCancel 取消首击，path 含 double_tap 监听才抑制——EventBridge 恒挂故生效；mock 按该语义建模）；M-2「hover 退出/消失无事件源」→ Phase 2 Proof/Fix 重写：EventBridge 增发 hover-miss 信号（pointer.move 命中为空且前一命中存在）或 renderer 订阅 tree `pointer.leave`（PointerEvent.LEAVE，PointerEvent.ts:24，需以前一命中存在为守卫——pointerEnterOrLeave 每次移动都发 LEAVE），A→B 切换清前一目标、命中为空清当前、applyDiff 增删清理；m-1「I10.3 已接入时态冲突」→ 改「由 I10.3 前置交付接入」；m-2「覆盖物创建已落地」→ renderer 经引擎惰性 getter 获取并驱动 highlight/clear，不自行创建；m-3「平移钳制措辞」→ 改「缩放钳制 + 平移坐标正确性」（clampViewport 仅钳 scale，viewport.ts:32-34）；Nit「sky 覆盖物归属措辞」→ 归 I8 plan Phase 2 Fix 内联记录；R2 Minor「wheel/pinch 兜底钳制机制未命名」→ Failure Paths 补拦截路径（引擎订阅 viewport 缩放事件重钳制或 wheel 处理器钳制，Proof 核对后接线）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] I11.1–I11.2 全部落地：图元事件→action 全链路/hover 反馈/画布浏览交互，均有 focused 测试覆盖，包级 typecheck 通过。
- [ ] 契约一致性：事件派发对齐 `createNormalizedActionEvent`/props.events 既有模式（design-renderer.md §8.2）；视口钳制与 design-engine.md §4.4 一致；interactionLayer 接线兑现 m-7（design-engine.md §6 交互覆盖层语义）。
- [ ] I6 deferred 兑现：事件→flux action 全链路派发（I11.1）落地；触发器体系评估裁定落地（§12.3 回写）。
- [ ] I8 deferred 兑现：sky 覆盖物接线（hover 真实事件桥→覆盖层，I11.2）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] roadmap 状态机未跳序：I11 `todo → planned` 已在激活期完成，收口时 `planned → done` 由独立 closure-audit 核验后回写。
- [ ] 受影响的 owner 文档已同步（docs/logs/2026/08-04.md 收口摘要；design-data-binding.md §12.3 评估回写；design-engine.md §4.4 核对结论（如需）；架构文档同步属 I15.2）。
- [ ] roadmap Phase Status I11 已回写 `done`。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 编辑器交互（图元拖拽/旋转/多选/属性面板/连线）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 讨论 Q8 明确本期不做编辑器交互，范围边界与 roadmap I11.2 一致（「不含编辑器交互」）；roadmap 已预留 I16 后继 mission 立项入口；本 plan 只做运行时浏览交互（平移/缩放/hover），不构成 in-scope 缺项。
- Successor Required: `yes`
- Successor Path: roadmap I16（组态编辑器后继 mission 立项入口）

### 完整触发器体系实现（dataEvents 条件-动作）

- Classification: `watch-only residual`（随 Phase 1 评估裁定）
- Why Not Blocking Closure: 本期只做评估裁定（I6 deferred 触发点）；若裁定扩展，实现范围与既有事件派发链（props.events/图元声明）边界需独立收口，按裁定路径移入 roadmap 后续项；不构成 I11 的 in-scope 缺项。
- Successor Required: `yes`（视裁定）
- Successor Path: roadmap 后续项（随裁定记录）

### 真实浏览器 e2e 断言（wheel/pinch/hover 视觉 + 事件联动）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 事件派发链路与交互接线已由组件测试 + vi.mock 覆盖；真实浏览器内的 wheel/pinch/hover 视觉呈现与端到端断言需 playground 页面挂载点——首个可挂载页面为 I13.1 scada-demo，正式 e2e 程序化断言补强属 I15.1；属 roadmap 既定顺序，不构成 I11 的 in-scope 缺陷。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（首个可挂载页面）与 I15.1（e2e 程序化断言补强）

### 性能复测与基准固化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 性能验收（10 万图元 ≥45fps/首屏 <2s/内存 ≤320MB；1 万点刷新 <200ms）属 I14 benchmark 计划（I14.1 固化测量方法、I14.3 复测结论），I11 只实现交互路径（平移/缩放/hover），不提前固化基准方法（gate-1-review A4 口径声明）。
- Successor Required: `yes`
- Successor Path: roadmap I14

## Non-Blocking Follow-ups

- `src/test-support/leafer-ui-mock.ts` 按需扩展（viewport 交互/覆盖物 mock 面），供 I11 测试复用。
- 若实现期发现 viewport 插件 wheel/pinch 行为与引擎钳制不一致（Failure Paths `viewport-interaction-drift`），修正记录供 I12 gate 复核输入。
- I11 playground 验证场景在 I13.1 scada-demo 落地后收敛（验证页退役或并入 demo）。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: 待执行
- Evidence: 待执行

Follow-up:

- 待执行（non-blocking follow-up 区见上；confirmed live defect 不得出现在这里）。

## Optional Sections

## Risks And Rollback

- **事件派发链复杂度风险**：图元声明优先 + props.events 兜底 + dblclick 合并语义为多路并存，组件测试固化优先级链与载荷形状；歧义记录回写 design-renderer.md §8.2。
- **hover 覆盖物生命周期风险**：覆盖物出现/跟随/消失与图元增删（applyDiff）协同，组件测试断言清理路径；残留覆盖物属 live defect 不降级。
- **视口交互边界风险**：viewport 插件默认交互 vs 引擎钳制（0.1/20）的一致性依赖真实 leafer 行为核对；不一致时引擎侧兜底钳制（纯逻辑单测覆盖），记录供 I12 gate 复核。
- **验证场景边界风险**：I11.1 playground 验证场景易与 I13.1 demo 漂移——验证页明确标注临时性并在 I13.1 落地后收敛（Non-Blocking Follow-ups）。
