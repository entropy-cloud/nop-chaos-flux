# Debugger Runtime Design

## Purpose

本文定义 `@nop-chaos/nop-debugger` 的当前架构基线，以及它在两个场景中的职责边界：

- 作为开发阶段的人机调试工具，帮助开发者定位 render、action、api、scope 与节点 inspect 问题。
- 作为 AI 与自动化测试可消费的框架诊断基础设施，提供稳定、结构化、非 UI 依赖的诊断接口。

本文是当前有效设计基线。历史取舍、前期方案和实现计划仍保留在：

- `docs/analysis/framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`

## Current Code Anchors

- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/use-inspect-mode.ts`
- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`
- `apps/playground/src/pages/DebuggerLabPage.tsx`
- `tests/e2e/debugger.spec.ts`

## 1. Design Position

`nop-debugger` 不是 playground 专属日志面板，也不是仅供人类查看的 UI 组件。

它的正式定位是：

- 一个框架级调试 package
- 一个统一事件采集与归一化层
- 一个宿主可挂载的浮动调试面板
- 一个 AI / E2E / browser automation 可直接读取的结构化诊断 API

这与参考 `amis` 调试器相比，最大的方向性差异是：

- `amis` 更偏向“运行时可视调试工具”
- `nop-debugger` 明确同时承担“自动化诊断接口”职责

## 2. Comparison With AMIS

参考实现：

- `C:/can/nop/templates/amis/packages/amis-core/src/utils/debug.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/SchemaRenderer.tsx`
- `C:/can/nop/templates/amis/docs/zh-CN/extend/debug.md`

### 2.1 AMIS 保留价值

`amis` 调试器有三点仍然值得保留为参考：

- 调试能力由显式开关启用，不污染默认运行时
- 同时提供 log 和 inspect 两种视角
- DOM 元素与组件实例之间有可反查的映射关系

### 2.2 Flux 已经超出的部分

当前 `nop-debugger` 在几个关键方向上已经明显超过 `amis` 原始设计：

- `amis` 主要暴露 UI 和 console log；`nop-debugger` 还暴露 `window.__NOP_DEBUGGER_API__` 与 `window.__NOP_DEBUGGER_HUB__`
- `amis` 的查询能力主要依赖人工查看面板；`nop-debugger` 提供 `queryEvents()`、`waitForEvent()`、`getInteractionTrace()`、`exportSession()`、`createDiagnosticReport()`
- `amis` 以松散日志为主；`nop-debugger` 已形成统一事件模型 `compile/render/action/api/notify/error/state:snapshot`
- `amis` inspect 主要读取组件 `props.data` 原型链；`nop-debugger` 已支持 `data-cid -> handle -> formState/scopeData`
- `amis` 文档只覆盖“开启调试器 + 查看日志/数据链”；`nop-debugger` 已具备面向集成测试的 API 设计和 Playwright 基础回归

### 2.3 AMIS 仍然提醒我们的风险

`amis` 的经验仍然提醒几个现实问题：

- inspect 是高频场景，必须保证从页面元素快速回到节点和数据域
- 调试器若只做事件堆叠，很快会淹没有效线索
- 调试器若只对人友好、不对自动化友好，AI 在集成测试里仍然只能依赖脆弱的 DOM 文本解析

## 3. Current Capability Baseline

截至当前代码基线，`nop-debugger` 已经具备以下正式能力。

### 3.1 Host Integration

宿主通过 `createNopDebugger()` 获得 controller，并在 renderer root 边界接入：

- `decorateEnv(env)`
- `plugin`
- `onActionError`
- `setComponentRegistry()`
- `setActionScope()`

当前 playground 的真实接入路径在：

- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`

这说明 debugger 已经站在框架宿主边界，而不是硬编码在具体 renderer 内部。

### 3.2 Unified Event Model

当前统一事件种类为：

- `compile:start`
- `compile:end`
- `render:start`
- `render:end`
- `action:start`
- `action:end`
- `api:start`
- `api:end`
- `api:abort`
- `notify`
- `error`
- `state:snapshot`

事件统一包含：

- `kind`
- `group`
- `level`
- `timestamp`
- `summary`
- 以及可选的 `nodeId/path/rendererType/actionType/requestKey/requestInstanceId/interactionId/parentEventId/durationMs/network/exportedData`

术语最小集：

- `requestKey`: 语义同类请求的分组键
- `requestInstanceId`: 某一次具体请求实例的稳定标识
- `interactionId`: 一次动作链或用户交互的关联标识
- `trace anchor event`: 用于推断 interaction trace 的锚点事件
- `scopeChain`: inspect 返回的逐层 scope 快照数组
- `node inspect payload`: `inspectByCid()` / `inspectByElement()` 返回的聚合节点上下文

这已经满足 AI 进行结构化检索的最基本要求。

### 3.3 Automation API

当前自动化接口已经不是草案，而是已落地能力。核心方法包括：

- `getSnapshot()`
- `getOverview()`
- `queryEvents()`
- `getLatestEvent()`
- `getLatestError()`
- `getPinnedErrors()`
- `getNodeDiagnostics()`
- `getInteractionTrace()`
- `createDiagnosticReport()`
- `exportSession()`
- `waitForEvent()`
- `inspectByCid()`
- `inspectByElement()`
- `getLatestFailedRequest()`
- `getLatestFailedAction()`
- `getRecentFailures()`
- `getNodeAnomalies()`
- `evaluateNodeExpression()`

#### 3.3.1 Automation Contract

以下接口属于当前稳定自动化契约，AI/E2E 应优先直接调用，而不是依赖 panel DOM：

- `getSnapshot()` / `getOverview()` / `queryEvents()` / `getLatestEvent()`
- `waitForEvent()`
- `getInteractionTrace()`
- `inspectByCid()` / `inspectByElement()`
- `exportSession()` / `createDiagnosticReport()`
- `getLatestFailedRequest()` / `getLatestFailedAction()` / `getRecentFailures()` / `getNodeAnomalies()`

`evaluateNodeExpression()` 也是正式能力，但它只走现有表达式引擎，不执行任意 JS。

全局暴露为：

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`

注意：当前仓库的真实全局名称是 `__NOP_DEBUGGER_API__`，不是旧草案中的 `__NOP_FLUX_DEBUGGER_API__`。

### 3.4 Developer-Facing UI

当前面板已经具备以下稳定形态：

- launcher
- floating panel
- minimize bar
- Overview / Timeline / Network / Node 四个 tab
- 搜索、筛选、暂停、清空
- 错误聚合
- network 请求归并
- inspect mode 与 overlay
- Node Tab 中的 formState / scopeData 查看

对于开发联调，这已经明显超过“简单日志面板”。

### 3.5 Verification Baseline

当前仓库已经有真实回归验证，而不只是文档宣称：

- 单元测试覆盖 controller / automation / diagnostics / inspect / panel
- `tests/e2e/debugger.spec.ts` 已验证 launcher、panel、automation API、最小化持久化等基本行为
- `DebuggerLabPage` 提供手工和自动化共同使用的 API 实验面

## 4. Has It Reached The AI Integration-Test Goal?

结论分两层。

### 4.1 Short Answer

- 对“让 AI 在集成测试中开始使用 debugger 进行辅助诊断”这个目标，答案是：**基本达成**。
- 对“已经足够支撑复杂框架问题的高可靠自动归因”这个更高目标，答案是：**还没有完全达成**。

### 4.2 Why It Is Already Usable

当前能力已经足够支持 AI 在浏览器自动化或集成测试中做以下事情：

- 不依赖 panel DOM，直接通过全局 API 读取结构化状态
- 等待异步事件完成，而不是盲等 timeout
- 提取最近错误、最近请求、最近 action
- 导出脱敏 session 数据用于失败诊断
- 通过 `data-cid` 与 inspect API 从页面元素回查组件状态
- 在多事件流中按 `kind/group/nodeId/path/requestKey` 做筛选

这意味着 `nop-debugger` 已经不只是“给人看”的工具，而是可被测试和 AI 程序消费的诊断层。

### 4.3 Why It Is Not Fully There Yet

但如果目标是“复杂框架问题出现时，AI 大概率能稳定拿到足够上下文并做首轮归因”，当前还存在几类关键缺口。

## 5. Current Gaps

### 5.1 Request Correlation Is Still Too Weak

当前 `requestKey` 由 `method + url + nodeId + path` 组成。

这有两个直接问题：

- 相同节点对同一 URL 的并发请求会共享同一个 `requestKey`
- 不同参数但同 URL 的请求会被错误合并为同一链路

这会削弱：

- `waitForEvent()` 的确定性
- Network 视图的链路准确性
- AI 在一次失败交互后对“到底是哪次请求失败”的归因能力

结论：当前 API 去重足够应对基础开发调试，但还不够作为复杂并发场景下的强关联标识。

### 5.2 Node Diagnostics 缺少 Stable Scope Chain Model

当前 `inspectByCid()` 可以返回 `formState` 和 `scopeData`，但仍然偏向“单层快照”。

还缺少稳定的：

- scope chain 分层模型
- 每层 scope 的来源标识
- 节点 props 摘要
- 节点编译后关键输入摘要

这意味着开发者能看到一些当前值，但 AI 和开发者都还不容易判断“这个值来自哪里、被哪一层覆盖、为什么此节点拿到的是这份数据”。

### 5.3 Interaction Trace Still Depends On Heuristics

`getInteractionTrace()` 已经可用，但当前“related trace”仍然主要依赖：

- `requestKey`
- `actionType`
- `nodeId`
- `path`

这属于合理的 MVP 方案，但还不是严格的交互因果链模型。

缺少的是真正稳定的：

- interaction id
- parent event id
- action -> api -> notify/error 的明确因果边

因此当前 trace 更适合“辅助理解”，还不适合“强因果回放”。

### 5.4 Expression Evaluator Is Not Actually Available

Node Tab 里虽然保留了 Expression Evaluator 区域，但当前 `handleEvalExpression()` 只返回固定文案：

- `Expression evaluation is disabled. Inspect scope data directly instead.`

这说明该能力在 UI 上存在入口，但并未形成真正可用的诊断功能。

对于开发者这只是体验缺口；对于 AI 则意味着它无法在选中节点上下文中直接试验表达式结果。

### 5.5 E2E Coverage Is Present But Still Shallow

当前 Playwright 只验证了：

- 面板可打开
- automation API 可访问
- 基础持久化可工作
- 实验页按钮能注入事件

但还没有覆盖更关键的 AI 诊断链路：

- `waitForEvent()` 在真实请求生命周期上的可靠性
- `queryEvents()` / `getInteractionTrace()` 在真实复杂页面上的正确性
- `inspectByElement()` 对真实表单节点返回的结构完整性
- `exportSession()` 脱敏输出的契约稳定性

结论：功能已落地，但“作为测试基础设施”的契约回归还不够强。

### 5.6 Docs And Playground Still Have Terminology Drift

当前代码真实使用的是：

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`

但部分旧文档和 playground 页面文本仍残留 `__NOP_FLUX_DEBUGGER_API__` 说法。

这类命名漂移会直接误导 AI、开发者和测试脚本，是需要持续清理的设计债务。

## 6. Design Judgment

从架构视角看，当前 `nop-debugger` 已经到达一个重要拐点：

- 它已经完成了从“playground 内部工具”到“框架级调试基础设施”的跃迁。

但从产品与测试基础设施视角看，它还没有完全达到最终目标：

- 它已经足够支撑开发联调。
- 它已经足够让 AI 在集成测试中开始使用。
- 它还不够支撑复杂异步链路、并发请求、深层 scope 覆盖问题的高可靠自动诊断。

因此当前最准确的结论不是“已经达成”或“完全未达成”，而是：

- **第一阶段目标已达成**：AI 和开发者都已经有可用调试器。
- **第二阶段目标未完全达成**：复杂问题诊断所需的强关联、强上下文和强回归契约还需要补强。

## 7. Required Next-Step Capabilities

如果目标是把 debugger 升级为真正的 AI 诊断基础设施，后续能力应按以下优先级推进。

### 7.1 P0: Stable Causality And Correlation

优先补强：

- request instance id，而不是只靠 `requestKey`
- action / api / error / notify 的关联 id
- 交互链路中的 parent-child 因果字段

这是 AI 稳定归因最重要的基础。

### 7.2 P0: Stronger Inspect Payload

优先补强：

- scope chain 分层
- scope 来源名称
- 节点 props/meta 摘要
- 节点最近 render/action/api/error 聚合摘要直接并入 inspect 结果

这样 AI 和开发者都不用手工在多个 API 之间拼上下文。

### 7.3 P1: Contract-Level E2E Coverage

需要新增集成测试覆盖：

- 真实表单提交后的 `waitForEvent({ kind: 'api:end' })`
- `getInteractionTrace({ inferFromLatest: true })` 的稳定输出
- `inspectByElement()` 对页面组件的真实 inspect
- `exportSession()` 脱敏契约

目标不是测试 UI 像不像，而是测试 automation contract 是否稳定。

### 7.4 P1: Better Failure Summaries For AI

建议把以下聚合能力提升为一等接口：

- latest failed request summary
- latest failed action summary
- recent node anomalies
- probable root cause hints

这类能力不要求替代 AI 推理，但要减少 AI 每次从零聚合数据的成本。

### 7.5 P2: Optional Safe Expression Evaluation

如果要补齐 Node Tab 的表达式诊断能力，应通过已有表达式引擎在受控上下文中执行，而不是开放任意 JS。

这项能力对开发者和 AI 都有价值，但优先级低于链路关联和 inspect 完整性。

## 8. Rules For AI-Facing Use

面向 AI、E2E 与自动化时，主接口应该始终是：

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`
- controller automation methods
- `exportSession()`
- `createDiagnosticReport()`

不应把以下内容当成稳定接口：

- panel DOM 结构
- tab 按钮文案
- launcher 文本
- 视觉样式 class
- 人类可读字符串日志

调试面板是开发体验层，不是自动化契约层。

## 9. Relationship To Playground

playground 继续承担两种职责：

- 作为 `nop-debugger` 的第一集成面
- 作为 `DebuggerLabPage` 的调试 API 演示面

但 playground 不是 debugger 的 source of truth。

调试器的正式契约应以：

- `docs/architecture/debugger-runtime.md`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/automation.ts`

为准。

## Related Documents

- `docs/architecture/playground-experience.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/analysis/framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`
