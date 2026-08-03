# 2 I10 React 渲染器与 flux 集成

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I10、Cross-Cutting 平台能力复用表/测试纪律/人工确认阈值）、`docs/components/industrial-hmi/design-renderer.md`（§4.1 schema/§5 字段分类/§6 regions/§7 状态归属/§8.2 事件联动/§8.3 React 桥接/§8.4 测试句柄/§8.5 组件句柄/§10 样式契约/§12.2 审计预审）、`docs/references/new-renderer-introduction-audit.md`（五边界审计 INV-1–INV-5）、`docs/analysis/industrial-hmi/gate-3-review.md`（§10 onReady/onError/component:\* 句柄归属）
> Related: 上游 `docs/plans/2026-08-03-2307-1-i6-data-binding-and-animation-wave2.md`（deferred 点表↔flux 桥接）、`docs/plans/2026-08-03-2307-2-i7-implementation-gate-review.md`（deferred I10.2 五边界审计）；下游 roadmap I11（事件联动/画布交互，依赖 I10.x）
> Mission: industrial-hmi
> Work Item: I10

## Purpose

实现 `scada-canvas` renderer 组件与 flux 集成：renderer 组件与 LeaferJS 实例生命周期/ref 同步（I10.1）、renderer-definitions 完整注册（fields/events/regions/handles + 五边界审计）（I10.2）、点表↔flux 表达式桥接（I10.3）——落在 `packages/flux-renderers-industrial/src/renderer/` 新目录（scada-canvas.tsx + hooks 拆分），替换 I4.2 空壳占位组件，消费 I5/I6/I8 已建成的引擎/绑定/图元契约，复用平台能力（useScopeSelector/useActionDispatcher/createNormalizedActionEvent/ComponentHandleRegistry）。收口状态：I10.1–I10.3 全部完成、五边界审计结论落盘（作 I12 gate 输入）、roadmap I10 回写 `done`。

## Current Baseline

- I4.2 空壳已注册：`renderer-definitions.ts`（type/sourcePackage/defaultSchema/占位组件就位，fields 留空）、`schemas.ts`（ScadaCanvasSchema/ScadaCanvasEvents 类型就位）、`scada-canvas-placeholder.tsx`（占位 DOM 契约）、manifest runtime + playground `registerScadaRenderers(registry)` 已接线。
- 引擎域（I5/I6 已收口）：`ScadaCanvasEngine` 完整句柄面（create/destroy/reset/applyAttrs/applyDiff/setSize/getSymbol/getSymbols/getSymbolProps/setSymbolProps/fit/center/setViewport/zoomAt/getViewport/getWorldPoint/getViewportPoint/cacheImage/exportConfig/importConfig/forceRender）；`ScadaEngineOptions` 含 `cid`/`exposeTestHandle`/`interactionLayer`（惰性）；`test-handle.ts` 挂载/移除 `window.__flux_scada_<cid>`（引擎侧唯一所有权）。
- 绑定域（I6 已收口）：`PointStore`（setPointValues/getPointValue/getPointState/subscribe）、`RefreshPipeline`（帧内合并 + state:change）、`ExpressionEvaluator`（@{pointId} 子集）。
- gate-3-review §10 归属：`onReady`/`onError` 引擎事件 → I10.1/I10.3（引擎当前仅 onRender/onSymbolEvent，ready/error 桥接属 renderer 消费）；`component:*` 组件句柄 → I10.2（ComponentHandleRegistry 注册）。
- I7 deferred 触发点：I10.2 五边界审计（new-renderer-introduction-audit INV-1/INV-2 全量执行，结论作 I12 gate 输入）；I6 deferred 触发点：点表↔flux scope 桥接（I10.3）。
- **事件派发归属裁定核对**：gate-3-review §8 #8 记录「createNormalizedActionEvent 调用归 I11.1，I11.1 落地时核对」——该裁定针对**组态内图元事件声明**（ScadaSymbolEvent[]）的派发；roadmap I10.3 原文「事件经 action dispatcher 派发（对齐 props.events）」指向 **schema 级 props.events 事件**（onSymbolClick 等）——本 plan 的 use-scada-events.ts 只落地 props.events 映射派发 + 桥接基座，组态内声明派发明确留 I11.1（见 Deferred 条目），两口径不冲突。
- 平台能力（已核实）：`useScopeSelector(selector, eqFn?, { enabled?, fallback?, paths? })`（flux-react，quick-reference.md:521,526）；`useActionDispatcher()`；`createNormalizedActionEvent(event)` 单参数（renderer-helpers.ts:98）；`useCurrentComponentRegistry()` → `ComponentHandleRegistry.register({ id, type, capabilities: { hasMethod, listMethods, invoke } })`（list-renderer 先例）；`RendererComponentProps`（props.props/meta/regions/events/helpers + cid）。
- 真正剩余的 gap：`renderer/` 目录不存在；占位组件未桥接引擎；fields/events/regions/handles 未注册；component:\* 句柄未注册；点表↔flux 桥接未实现；五边界审计未执行；onReady/onError 未消费。

## Goals

- I10.1：`renderer/scada-canvas.tsx` 主渲染器——`RendererComponentProps<ScadaCanvasSchema>` 契约装配（props.props/meta/regions/events/helpers）、引擎实例生命周期（mount：useEffect 内 `ScadaCanvasEngine.create` + config 解析 + 场景构建 + 测试句柄挂载；unmount：destroy 幂等；resize：ResizeObserver → `setSize` 防抖到帧）、ref 同步与 props 同步（config 变化经 `diffScadaConfig` → `applyDiff` 增量，diff 不可用/版本变更走 `reset`）；cid/exposeTestHandle 经 `ScadaEngineOptions` 传入引擎。
- I10.2：renderer-definitions 完整注册——fields（`config` prop/`loading`/`empty` region/`events.*` event，design-renderer.md §5 规则）、schemas.ts 类型、样式契约（`nop-scada-canvas` marker + data-slot）；`component:*` 组件句柄注册（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy——**对齐 design-renderer.md §8.5 表逐项，不含 `getSymbolProps`**（引擎命令句柄，design-engine.md §8.2，非 component:\* 句柄面；gate-3 m-6 记录其 leafer 属性面返回语义）；经 `useCurrentComponentRegistry` + ComponentHandleRegistry 既有通道）；**new-renderer-introduction-audit 五边界审计全量执行并记录结论**（作 I12 gate 输入）。
- I10.3：点表↔flux 表达式桥接——`useScopeSelector`（paths 从 config `$xxx` 引用提取，精细化失效）订阅 scope 数据流 → 表达式经 flux-formula 编译器求值（平台能力复用，禁止重复实现）→ `setPointValues` 注入点表（刷新流水线，不逐点 setState）；事件经 `useActionDispatcher`/`createNormalizedActionEvent` 派发（props.events.onSymbolClick 等 + onReady/onError）。
- 占位组件退役（`scada-canvas-placeholder.tsx` 替换为真实组件，smoke 测试升级）；roadmap I10 回写 `done`。

## Non-Goals

- 不实现图元事件→flux action 全链路（组态内图元事件声明派发 + playground 验证场景，I11.1）与画布浏览交互（I11.2）。
- 不实现 Playground 演示页（I13）；不写 Playwright 用例（真实浏览器断言属 I13.1/I15.1）。
- 不扩展 `RendererEnv` 接口（INV-2 未触发，设计期预审结论，审计时复核）；不引入协议适配器（P2 评估项）。
- 不实现 `scada-symbol` 图元级 type 注册（I9 评估裁定后按路径处理）。

## Scope

### In Scope

- `src/renderer/` 新目录：`scada-canvas.tsx`、`scada-canvas.types.ts`、`hooks/use-scada-engine.ts`（生命周期）、`hooks/use-scada-config-sync.ts`（config diff 同步）、`hooks/use-scada-points-bridge.ts`（I10.3）、`hooks/use-scada-events.ts`（I10.3 事件桥接基座）、`hooks/use-scada-handles.ts`（I10.2 组件句柄注册）。
- `src/renderer-definitions.ts` 完整注册（fields/events/regions/handles）+ `src/schemas.ts` 类型收口。
- `component:*` 组件句柄注册（ComponentHandleRegistry 既有通道，list-renderer 模式）。
- 五边界审计（new-renderer-introduction-audit INV-1–INV-5）执行 + 结论记录（`docs/analysis/industrial-hmi/renderer-boundary-audit.md` 落盘，作 I12 gate 输入）。
- 点表↔flux 桥接（useScopeSelector + flux-formula 求值 + setPointValues 注入）。
- 占位组件替换 + smoke/组件测试升级；`docs/logs/2026/08-04.md` 记录产出摘要。

### Out Of Scope

- 组态内图元事件声明→action 全链路（I11.1）、画布浏览交互（I11.2）。
- Playground 演示页（I13）、e2e 程序化断言（I13.1/I15.1）、性能复测（I14）。
- 协议适配器（P2）、`scada-symbol` 图元级 type 注册实现（I9 裁定后按路径）。

## Failure Paths

| 可测场景编号               | 触发                                                                                     | 行为                                                                                                                                     | 可重试 | 用户可见表现                      |
| -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| upstream-not-ready         | 前置未就绪——roadmap I8/I9 = `done` 且 I9 评估裁定无待人工裁决项；引擎/绑定/图元契约可用  | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                                            | 是     | plan 保持 `planned`/`in progress` |
| config-invalid             | config 校验失败（validateScadaConfig errors）/JSON.parse 失败                            | `empty` region 渲染 + `onError` 事件派发（载荷 `{ code, message }`），不崩溃渲染树（design-renderer.md §12.3 错误面）                    | 是     | 错误占位显示，画面不崩溃          |
| engine-create-failure      | 引擎创建失败（canvas 不可用/容器丢失）                                                   | 同 config-invalid 路径（empty region + onError）；清理半创建资源（destroy 幂等）                                                         | 是     | 错误占位显示                      |
| diff-sync-mismatch         | props.config 变化经 diff 增量应用与全量 reset 判定漂移（diff 不可用/版本变更未走 reset） | 单测固化判定链（diff 可用 → applyDiff；diff 失败/version 变更/首次 → reset）；歧义记录回写                                               | 是     | config 变化正确增量/全量更新      |
| react-compiler-re-exec     | React Compiler 优化导致 useEffect 意外重复执行                                           | ref 幂等守卫（引擎已创建则跳过/正确清理后重建），组件测试覆盖双挂载/严格模式（renderer-implementation 风险项，design-renderer.md §12.3） | 是     | 无重复实例/无泄漏                 |
| scope-bridge-path-mismatch | useScopeSelector paths 提取与 config `$xxx` 引用集合漂移（漏订阅/过订阅）                | paths 提取纯函数单测（config 扫描 → 引用集 → paths 数组）；漏/过订阅断言；禁用时 fallback 行为断言                                       | 是     | 点表刷新正确、无订阅风暴          |
| event-dispatch-contract    | createNormalizedActionEvent/useActionDispatcher 调用面与既有契约漂移                     | 复用 renderer-helpers.ts:98 单参数签名 + useActionDispatcher；组件测试断言派发载荷形状（对齐 props.events 既有模式）                     | 是     | 事件正确派发到 action             |

## Test Strategy

档位选择：`必须自动化`——renderer 桥接层是公共契约核心路径（RendererComponentProps/生命周期/diff 同步/flux 桥接/句柄注册），且 I10.2 五边界审计是 I12 gate 的强制输入（roadmap I10 强制原则审计）；Proof 项先于 Fix 项落地。组件测试用 `@nop-chaos/flux-react` test-support-runtime 装配（对齐 flux-renderers-\* 既有组件测试模式）+ `vi.mock('leafer-ui')`（复用 `src/test-support/leafer-ui-mock.ts`）；纯逻辑（paths 提取/config→diff 判定）单独单测；真实浏览器 e2e 断言延后 I13.1/I15.1（watch-only residual，见 Deferred 条目）。

## Execution Plan

### Phase 1 - 前置验证 + I10.1 renderer 组件与实例生命周期

Status: planned
Targets: `src/renderer/scada-canvas.tsx`、`src/renderer/hooks/use-scada-engine.ts`、`src/renderer/hooks/use-scada-config-sync.ts`

- Item Types: `Proof | Fix | Decision`

- [ ] `Decision`：roadmap Phase Status 回写 I10: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0–I9 plan 先例）。
- [ ] `Proof`：前置验证——roadmap I9 = `done`（I9 评估裁定无待人工裁决项）；`ScadaCanvasEngine`/`parseScadaConfig`/`validateScadaConfig`/`diffScadaConfig`/`applyDiff`/`test-handle` 契约可用（实测）；`RendererComponentProps` cid 通道（gate-3-review 核对项 4 已确认）；`design-renderer.md` §4.1/§8.3/§8.4 未被 I7 gate 修正为冲突。
- [ ] `Proof`：生命周期组件测试失败先行（`renderer/scada-canvas-lifecycle.test.tsx`）：mount 创建引擎（`ScadaCanvasEngine.create` 调用断言 + cid/exposeTestHandle 传递）、config 解析 + 场景构建（组态 JSON 加载）、unmount destroy（幂等 + 测试句柄移除）、resize 防抖 setSize（ResizeObserver mock）、config 变化 diff 增量应用（`applyDiff` 调用断言）/全量 reset 判定（版本变更 → reset）、loading/empty region 切换（config 校验中/失败）。
- [ ] `Fix`：`src/renderer/hooks/use-scada-engine.ts`（引擎实例生命周期：mount 创建/destroy 清理/ResizeObserver resize/ref 幂等守卫，INV-4 环境稳定性）、`use-scada-config-sync.ts`（config → parse/validate → diff 判定 → applyDiff/reset，Failure Paths `diff-sync-mismatch` 兜底）。
- [ ] `Fix`：`src/renderer/scada-canvas.tsx` 主渲染器——`RendererComponentProps<ScadaCanvasSchema>` 装配（props.props 读 config/width/height/viewport，meta 读 disabled/visible/testid/className，regions 渲染 loading/empty，events 读 props.events）；占位组件退役替换；DOM 契约（`nop-scada-canvas` marker + data-slot `scada-canvas`/`scada-canvas-canvas`/`scada-canvas-loading`/`scada-canvas-error`，design-renderer.md §10）；render path 无副作用（INV-5）。

Exit Criteria:

- [ ] 生命周期组件测试全绿（mount 引擎创建 + cid 传递、unmount destroy 幂等、resize setSize、diff 增量/reset 判定、loading/empty region 切换断言）。
- [ ] 占位组件替换完成（`scada-canvas-placeholder.tsx` 移除或降级为内部占位，smoke 测试升级为真实组件渲染断言）；包级 typecheck 通过。

### Phase 2 - I10.2 renderer-definitions 完整注册 + 组件句柄 + 五边界审计

Status: planned
Targets: `src/renderer-definitions.ts`、`src/schemas.ts`、`src/renderer/hooks/use-scada-handles.ts`（句柄注册）、`docs/analysis/industrial-hmi/`（审计结论）

- Item Types: `Proof | Fix | Decision`

- [ ] `Proof`：注册契约测试失败先行（`renderer-definitions.test.ts` 升级）：fields 完整（config prop/loading/empty region/events.\* event，design-renderer.md §5 字段分类表规则）、schemas.ts 类型收口（ScadaCanvasSchema 与 §4.1 逐字段对齐）、renderer 组件从占位切换为真实组件（registry.get('scada-canvas').component 断言）。
- [ ] `Fix`：`renderer-definitions.ts` 完整注册——fields/events/regions 按 design-renderer.md §5 规则落地（`config: { key: 'config', kind: 'prop' }`、`loading/empty: { kind: 'region' }`、`events.*: { kind: 'event' }`，对齐 quick-reference.md「Layer 2 field rule」）；schemas.ts 类型收口。
- [ ] `Proof`：组件句柄注册失败测试先行（`renderer/scada-handles.test.tsx`）：`useCurrentComponentRegistry` 注册 `component:*` 句柄（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy，**对齐 design-renderer.md §8.5 表逐项**），capabilities（hasMethod/listMethods/invoke）断言；not-mounted/point-not-found 等失败路径（§8.5 失败路径表）。
- [ ] `Fix`：`src/renderer/hooks/use-scada-handles.ts`——组件句柄注册（ComponentHandleRegistry 既有通道，list-renderer `register({ id, type, capabilities })` 模式；句柄方法转发到引擎命令句柄 + 点表 store；卸载时退订）。
- [ ] `Decision`：**五边界审计全量执行**（new-renderer-introduction-audit INV-1/INV-2）：A. IO 边界（无直调 fetch/WebSocket/localStorage/history；图片经 env.fetcher 归位——I8.1 cacheImage 注入点；外部数据经 RendererEnv/xui:imports）、B. 复用边界（useScopeSelector/flux-formula/action/UI 复用，无自造 DSL）、C. 内部 state 边界（引擎/点表/动画不进 scope，INV-4）、D. 契约边界（严格 RendererComponentProps，render path 无副作用）、E. 扩展点（事件/region/组态内事件声明）、F. 样式边界（marker + data-slot，无新 token 命名空间）——审计结论落盘（`docs/analysis/industrial-hmi/renderer-boundary-audit.md`），作为 I12 gate 输入；INV-2 复核设计期预审（不扩 env）是否成立。

Exit Criteria:

- [ ] renderer-definitions 完整注册测试全绿（fields/events/regions + component 切换断言）；component:\* 句柄注册测试全绿（含失败路径）。
- [ ] 五边界审计结论落盘（审计文档存在，INV-1/INV-2 逐项结论 + I12 gate 输入说明）。

### Phase 3 - I10.3 点表↔flux 桥接 + 事件派发

Status: planned
Targets: `src/renderer/hooks/use-scada-points-bridge.ts`、`src/renderer/hooks/use-scada-events.ts`

- Item Types: `Proof | Fix`

- [ ] `Proof`：paths 提取纯函数失败测试先行（`renderer/scada-points-bridge.test.tsx` 内纯逻辑断言）：config 扫描 → `$xxx` 引用集 → paths 数组（复用点表声明 `source: 'flux'` 的 `flux` 字段），漏订阅/过订阅断言；禁用（enabled: false）/fallback 行为。
- [ ] `Fix`：`use-scada-points-bridge.ts`——`useScopeSelector`（paths 精细化失效，design-renderer.md §8.3）订阅 scope 数据流 → flux-formula/flux-compiler 编译求值（平台能力复用表；私有求值子 scope 注入点表上下文，INV-4）→ `PointStore.setPointValues` 注入（刷新流水线合帧，**不逐点 setState 直刷 React**——性能红线）。
- [ ] `Proof`：事件桥接测试失败先行（`renderer/scada-events.test.tsx`）：引擎 `onSymbolEvent`（symbol:click/dblclick/hover）→ `createNormalizedActionEvent`（单参数签名 renderer-helpers.ts:98）→ `useActionDispatcher`/helpers.dispatch 派发，载荷形状（ScadaSymbolEventPayload → FluxActionEvent）断言；props.events.onSymbolClick 等映射；onReady/onError 桥接（引擎 ready/error → region 切换 + 事件派发，gate-3-review §10 归属兑现）。
- [ ] `Fix`：`use-scada-events.ts`——引擎事件桥接（onSymbolEvent → 规范化 → dispatch；props.events 映射；onReady/onError 消费）；I11.1 桥接基座就绪（组态内图元事件声明派发留 I11.1 扩展）。
- [ ] `Fix`：`docs/logs/2026/08-04.md` 记录本 plan 产出摘要（置顶条目）。

Exit Criteria:

- [ ] 点表↔flux 桥接测试全绿（paths 提取/求值注入/刷新流水线断言，无逐点 setState）；事件桥接测试全绿（派发载荷形状 + onReady/onError）。
- [ ] 包级全量测试全绿（组件测试 + 既有域核心测试无回归）；五边界审计结论可作 I12 gate 输入。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（general，fresh session），R1 task `ses_0371be85fffeNr78EyA11QVty2`（pass-with-minors，3 Minor + 1 Nit），修正后由起草者逐条落地
- Verdict: `pass-with-minors`（R1 零 Blocker/Major；3 Minor + 1 Nit 全部落地）
- Rounds: 1（minors 非阻塞且已落地，无需重审轮）
- Findings addressed: m-1「component 句柄列表含 getSymbolProps，超出 §8.5 表」→ 句柄清单对齐 design-renderer.md §8.5 逐项（删 getSymbolProps，注明其为引擎命令句柄 design-engine.md §8.2 + gate-3 m-6 语义）；m-2「use-scada-handles.ts 不在 Scope 清单」→ Scope In-Scope 补 use-scada-handles.ts；m-3「createNormalizedActionEvent 归属（gate-3 §8 #8 裁定 vs roadmap I10.3）未对账」→ 基线补「事件派发归属裁定核对」条目（props.events 级属 I10.3、组态内声明派发属 I11.1，两口径不冲突）；Nit「审计落盘路径表述不统一」→ Scope 与 Phase 2 统一为 `docs/analysis/industrial-hmi/renderer-boundary-audit.md`。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] I10.1–I10.3 全部落地：renderer 组件生命周期/完整注册/组件句柄/点表↔flux 桥接/事件派发，均有 focused 测试覆盖，包级 typecheck 通过。
- [ ] 契约一致性：renderer-definitions 与 `design-renderer.md` §5 字段分类表对齐；DOM 契约与 §10 对齐；组件句柄与 §8.5 对齐；点表桥接复用平台能力（useScopeSelector/flux-formula）无重复实现（roadmap 平台能力复用表）。
- [ ] 五边界审计完成并落盘（new-renderer-introduction-audit INV-1/INV-2 逐项结论），结论可作 I12 gate 输入（I7 deferred 兑现）。
- [ ] I6 deferred 兑现：点表↔flux scope 桥接（I10.3）落地。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] roadmap 状态机未跳序：I10 `todo → planned` 已在激活期完成，收口时 `planned → done` 由独立 closure-audit 核验后回写。
- [ ] 受影响的 owner 文档已同步（docs/logs/2026/08-04.md 收口摘要；审计文档落盘；无其他风险节需回写；架构文档同步属 I15.2）。
- [ ] roadmap Phase Status I10 已回写 `done`。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 组态内图元事件声明→flux action 全链路派发

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 明确属 I11.1（图元事件→flux action 全链路：click/dblclick→dialog/页面跳转/数据请求 + playground 验证场景）；本 plan 的 use-scada-events.ts 只落地桥接基座（onSymbolEvent → createNormalizedActionEvent → dispatch + props.events 映射），组态内 `events` 声明读取与 playground 验证属 I11.1；不构成 I10 的 in-scope 缺项。
- Successor Required: `yes`
- Successor Path: roadmap I11.1

### 真实浏览器 e2e 断言（场景树/点表刷新/事件联动）

- Classification: `watch-only residual`
- Why Not Blocking Closure: renderer 桥接已由组件测试（test-support-runtime 装配）+ vi.mock 覆盖；真实浏览器内 e2e 程序化断言（测试句柄读场景树）需 playground 页面挂载点——首个可挂载页面为 I13.1 scada-demo，正式断言补强属 I15.1；属 roadmap 既定顺序，不构成 I10 的 in-scope 缺陷。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（首个可挂载页面）与 I15.1（e2e 程序化断言补强）

### 性能复测与基准固化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 性能验收（10 万图元 ≥45fps/首屏 <2s/内存 ≤320MB；1 万点刷新 <200ms）属 I14 benchmark 计划（I14.1 固化测量方法、I14.3 复测结论），I10 只按设计基线实现桥接层（diff 增量/合帧路径），不提前固化基准方法（gate-1-review A4 口径声明）。
- Successor Required: `yes`
- Successor Path: roadmap I14

## Non-Blocking Follow-ups

- `src/test-support/leafer-ui-mock.ts` 按需扩展（ready/error 事件面 mock），供 I10 组件测试复用。
- 若实现期发现 ResizeObserver/React Compiler 双挂载行为与设计表述偏差（Failure Paths `react-compiler-re-exec`），修正记录供 I12 gate 复核输入。
- 五边界审计若发现与 `docs/architecture/`（renderer-runtime/模块边界）冲突项，按 I15.2 收尾同步（I7 deferred 同口径）。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: 待执行
- Evidence: 待执行

Follow-up:

- 待执行（non-blocking follow-up 区见上；confirmed live defect 不得出现在这里）。

## Optional Sections

## Risks And Rollback

- **桥接层宽度风险**：renderer 桥接（生命周期 + diff 同步 + 句柄 + 点表桥接 + 事件派发）为多 hook 组合，phase 内按 hooks 拆分（use-scada-engine/config-sync/points-bridge/events/handles）逐项收口；组件测试先行覆盖组合行为。
- **双 schema 漂移风险**：组态 JSON 内部 schema 与 renderer-definitions fields 双层 schema 并存（design-renderer.md §12.3）——由五边界审计 + 交叉一致性核对兜底；字段漂移发现即回写对应文档。
- **React Compiler 与命令式引擎风险**：引擎副作用集中在 useEffect/useEffectEvent（design-renderer.md §8.3）；编译器优化引入意外重复执行时以 ref 幂等守卫（Failure Paths `react-compiler-re-exec`）。
- **config 大对象性能风险**：内嵌组态 JSON 可达 MB 级（10 万 symbol 11.6 MB，gate-1-review §3.2 #8）——config 变化频率预期低，diff 增量应用防全量重建；props 传递走引用（对象形态）防序列化开销（design-renderer.md §12.3）。
