# 34 NOP Debugger AI 诊断能力增强计划

> Plan Status: planned
> Last Reviewed: 2026-04-04
> Source: `docs/architecture/debugger-runtime.md` reviewed against current code anchors on 2026-04-04

## 复审结论

- 当前 `@nop-chaos/nop-debugger` 已经完成第一阶段目标：它不再只是 playground 内部日志面板，而是框架级调试基础设施，开发者和 AI 都已经可以实际使用它。
- 但它还没有达到第二阶段目标：复杂框架问题下的高可靠自动诊断。主要缺口集中在请求/交互因果关联、inspect 上下文完整性、自动化契约级回归覆盖，以及 AI 可直接消费的高层失败摘要。
- 这份计划不是重复 `docs/plans/20-nop-debugger-implementation-plan.md` 或 `docs/plans/22-debugger-node-inspector-enhancement-plan.md` 的已完成能力，而是承接它们之后的下一阶段强化计划。

## 与现有计划的关系

- `docs/plans/20-nop-debugger-implementation-plan.md` 已完成 debugger 的基础 package 化、automation API、Timeline/Network/Node 面板和基础持久化能力；本计划不重做这些基础能力。
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md` 已完成 `data-cid`、inspect mode、Node Tab 基础 inspect；本计划在此基础上补齐更强的 scope/props/trace 诊断上下文。
- `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md` 关注的是文件拆分和结构收口；本计划关注的是 debugger 的诊断能力和测试基础设施强化，不重复做结构性重构。

## Problem

当前 `nop-debugger` 已经可用，但还存在 6 类关键能力缺口，直接限制它在 AI 集成测试和复杂开发诊断场景中的价值。

- `packages/nop-debugger/src/controller-helpers.ts:105-107` 当前 `requestKey` 仅由 `method + url + nodeId + path` 组成，无法区分同一节点对同一 URL 的并发请求，也无法区分相同 URL 不同 payload 的并发实例。
- `packages/nop-debugger/src/adapters.ts:146-166` 和 `:181-239` 目前的 API 事件归并仍然主要依赖该弱 `requestKey`，因此 `waitForEvent()`、Network 归并和 interaction trace 在高并发场景下不够稳定。
- `packages/nop-debugger/src/controller.ts:35-85` 当前 `inspectByCid()` 返回 `formState`、`scopeData`、`tagName`、`className`，但没有稳定的 `scopeChain`、props/meta 摘要、registry/debug snapshot 补充信息，因此“值来自哪里”仍然难以定位。
- `packages/nop-debugger/src/panel.tsx:128-131` 和 `packages/nop-debugger/src/panel/node-tab.tsx:226-239` 中的 Expression Evaluator 仍是禁用占位，而不是可用诊断能力。
- `packages/nop-debugger/src/diagnostics.ts:273-320` 当前 `getInteractionTrace()` 主要靠 `requestKey/actionType/nodeId/path` 做启发式关联，还没有显式 interaction id、parent event id 或 request instance id。
- `tests/e2e/debugger.spec.ts` 已覆盖基础 UI 和 automation API 可访问性，但尚未把 `waitForEvent()`、`inspectByElement()`、`getInteractionTrace()`、`exportSession()` 等真正当作自动化诊断契约来回归测试。

## Root Cause

- 第一阶段实现优先完成“可接入、可展示、可查询”的 debugger 基线，先让事件流、面板和 automation API 跑起来，尚未对复杂并发、严格因果链和契约级测试做第二轮设计收口。
- 现有 monitor 契约 `packages/flux-core/src/types/renderer-api.ts:41-48` 和 action/api 上报链路 `packages/flux-runtime/src/action-runtime.ts` / `request-runtime.ts` 主要是“关键节点上报”，不是为严格 tracing 系统设计的，因此当前 trace 只能做到启发式关联。
- `ComponentHandle` / `ComponentHandleRegistry` 当前只暴露了最小运行时能力和 `getDebugSnapshot()`，但并没有原生承载 debugger 所需的 richer inspect data，因此 inspect 增强必须以“契约最小补强 + controller 聚合”为原则推进。
- 先前 E2E 目标更多是确认 UI 存在和面板可操作，而不是把 debugger 当作“测试失败后的第一诊断数据源”来设计。

## Goals

- 让 `nop-debugger` 在复杂异步和并发场景下提供稳定的 request/action/interaction 关联能力。
- 让 `inspectByCid()` 和 Node Tab 提供足够强的 scope、props、meta、handle 上下文，支持 AI 和开发者直接做首轮诊断。
- 把 `waitForEvent()`、`getInteractionTrace()`、`exportSession()`、`inspectByElement()` 提升为经过 E2E 回归保护的正式自动化契约。
- 提供更高层、对 AI 更友好的失败摘要接口，降低每次测试失败后重新手工聚合事件的成本。
- 在保持安全边界的前提下，为 Node 级表达式诊断预留或落地受控的 evaluator 能力。

## Non-Goals

- 不把 `nop-debugger` 升级为完整分布式 tracing 平台。
- 不引入远程日志上报、后端会话存储或线上生产监控平台能力。
- 不开放任意 JS 执行器给 debugger UI 或 automation API。
- 不重做当前 panel 视觉形态或 playground 信息架构，除非改动直接服务于本计划中的诊断能力。
- 不为了 debugger 需求打破现有 `flux-core -> flux-runtime -> flux-react -> nop-debugger` 的依赖边界。

## Fix Plan

**Phase 0 — 文档冻结与契约校准**

Targets: `docs/architecture/debugger-runtime.md`, `README.md`, `apps/playground/src/pages/FluxBasicPage.tsx`, `apps/playground/src/pages/DebuggerLabPage.tsx`

- 清理仍然残留的旧术语，统一以 `window.__NOP_DEBUGGER_API__` / `window.__NOP_DEBUGGER_HUB__` 为唯一全局 API 名称，不再出现 `__NOP_FLUX_DEBUGGER_API__`。
- 在 `docs/architecture/debugger-runtime.md` 中补充一个“automation contract”小节，明确哪些方法属于稳定接口，哪些只是当前 UI 便捷能力。
- 校正 playground 页面里的 AI 脚本示例和说明文字，确保示例代码与真实全局 API 一致。
- 为后续 Phase 1-4 补一个最小术语表：`requestKey`、`requestInstanceId`、`interactionId`、`trace anchor event`、`scopeChain`、`node inspect payload`。

Exit criteria: 文档、README、playground 示例和当前实现使用同一套 debugger 术语和全局命名，不再误导 AI、用户或测试脚本。

**Phase 1 — 稳定请求实例标识与事件因果字段**

Targets: `packages/flux-core/src/types/renderer-api.ts`, `packages/flux-core/src/types/actions.ts`, `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/controller-helpers.ts`, `packages/nop-debugger/src/adapters.ts`, `packages/nop-debugger/src/diagnostics.ts`, tests under `packages/nop-debugger/src/*.test.ts`

- 在 debugger 内部事件模型中区分两层概念：
  - `requestKey`：用于“语义相同请求”的归类
  - `requestInstanceId`：用于区分具体某一次请求实例
- 新增事件关联字段，至少包括：
  - `requestInstanceId?`
  - `interactionId?`
  - `parentEventId?` 或等价的 `parentSpanId?`
- 对 `api:start` / `api:end` / `api:abort` 事件改为按实例关联，不再只靠语义 key 归并。
- 保持现有 monitor 契约尽量最小变动：如果 `flux-core` 上游 monitor payload 暂不增加新字段，则由 `nop-debugger` 在 `decorateEnv()` / `fetcher` wrapper / `beforeAction` 边界自行生成并传播最小关联上下文。
- `getInteractionTrace()` 在保持现有启发式兼容的前提下，优先消费新的 instance/interaction 关联字段；只有没有新字段时才回退到旧的 `requestKey/nodeId/path/actionType` 规则。
- 更新 Network Tab 的归并逻辑，让其按 request instance 聚合，再提供可选的“按 requestKey 分组”视图，而不是反过来。

Exit criteria: 并发请求、同 URL 不同 payload、同节点重复提交等场景下，`waitForEvent()`、Network 归并和 interaction trace 都能稳定指向某一次具体请求实例，而不是模糊匹配到“某一类请求”。

**Phase 2 — 增强 inspect payload 与 Node diagnostics**

Targets: `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/panel/node-tab.tsx`, related tests

- 扩展 `NopComponentInspectResult`，至少补齐：
  - `scopeChain?: Array<{ id?: string; label: string; data: Record<string, unknown> }>`
  - `metaSummary?: Record<string, unknown>`
  - `propsSummary?: Record<string, unknown>`
  - `availableMethods?: readonly string[]`
  - `registryEntry?` 或等价句柄摘要
- 调研当前 `ScopeRef` / `FormRuntime` / `RendererComponentProps` 可稳定拿到哪些调试数据，优先使用现有公开能力；如需新增 debug-only 契约，保持最小、只读、无副作用。
- 如果 `ComponentHandle` 需要补充调试接口，优先增加类似 `getDebugData?(): Record<string, unknown>` 或等价的 capabilities 子能力，而不是把 runtime 私有状态直接暴露给 debugger。
- 在 Node Tab 中分开展示：
  - Handle / DOM 概览
  - Props / Meta 摘要
  - Form State
  - Scope Chain
  - Recent node events
- 让 `getNodeDiagnostics()` 与 `inspectByCid()` 之间建立更清晰的互补关系：inspect 面向“当前节点状态”，diagnostics 面向“当前节点最近行为”。必要时新增 `getNodeInspectSnapshot()` 聚合接口，避免 UI 和 AI 反复手工拼装两个接口的结果。

Exit criteria: 选中页面节点后，开发者和 AI 都能直接看见“当前节点是什么、来自哪个 handle、拿到了什么 props/meta、处在哪条 scope chain 上、最近发生过什么事件”，而不是只看到一层 `scopeData` 快照。

**Phase 3 — AI 友好的高层失败摘要与异常接口**

Targets: `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/diagnostics.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`, tests

- 在现有 `createDiagnosticReport()` 之外，新增更聚焦的高层摘要接口，例如：
  - `getLatestFailedRequest()`
  - `getLatestFailedAction()`
  - `getNodeAnomalies({ nodeId | path })`
  - `getRecentFailures({ sinceTimestamp, limit })`
- 高层摘要对象必须结构化，不能只是拼字符串；需要直接包含关键事件引用、request instance、node 信息和已聚合的 probable cause hints。
- “probable cause hints” 只做简单、确定性的规则提示，例如：
  - request aborted
  - repeated render bursts
  - action ended with error after api failure
  - form has validation errors before submit
- 保持这些 hint 是辅助字段，不把 debugger 变成黑箱诊断系统。
- `createDiagnosticReport()` 可选择性引用这些高层摘要，但不强制改变现有输出结构，优先做向后兼容增强。

Exit criteria: 当自动化测试失败时，AI 不需要每次从零遍历所有 events 就能拿到“最近失败的请求/动作/节点异常”这种首轮诊断材料。

**Phase 4 — Node 级表达式诊断能力（受控）**

Targets: `packages/nop-debugger/src/panel.tsx`, `packages/nop-debugger/src/panel/node-tab.tsx`, `packages/nop-debugger/src/controller.ts`, potentially `packages/flux-formula` integration points, tests/docs

- 把当前禁用占位的 Expression Evaluator 改成真正可用的“公式/表达式调试器”，但只允许走现有表达式引擎，不允许执行任意 JS。
- 设计一个受控接口，例如：
  - `evaluateNodeExpression({ cid, expression })`
  - 或 `evaluateScopeExpression({ scopeChain, expression })`
- 上下文默认以当前节点最内层 scope 为根，并在返回结果时同时带上：
  - 结果值
  - 解析错误（如有）
  - 用到的主要变量键（如果表达式引擎可提供）
- UI 层只作为入口，真正能力应同时通过 automation API 暴露，这样 AI 在集成测试中也能使用。
- 如实现成本或安全边界暂时不满足，本阶段允许降级为“计划内 deferred item”，但必须明确原因和替代接口，而不是继续保留误导性的假入口。

Exit criteria: Node Tab 中的表达式调试要么成为正式可用功能，要么被明确移除/降级，不再存在看似可用但实际被硬编码禁用的入口。

**Phase 5 — 契约级 E2E 回归与实验面升级**

Targets: `tests/e2e/debugger.spec.ts`, new focused e2e specs if needed, `apps/playground/src/pages/FluxBasicPage.tsx`, `apps/playground/src/pages/DebuggerLabPage.tsx`

- 把 debugger 当作自动化契约来写 E2E，而不是只测试 UI 可见性。新增至少以下真实场景：
  - 在 `FluxBasicPage` 提交真实表单后，使用 `waitForEvent({ kind: 'api:end' })` 等待并校验响应事件
  - 校验 `getInteractionTrace({ inferFromLatest: true })` 能返回该次提交链路
  - 对真实页面中的表单或字段节点执行 `inspectByElement()` / `inspectByCid()` 并断言结果结构
  - 校验 `exportSession()` 对敏感字段脱敏
  - 校验 request instance 级归并在并发请求场景下正确工作
- 在 `DebuggerLabPage` 中增加专门用于自动化验证的场景按钮或展示区域，例如：
  - 并发 API 场景
  - request abort 场景
  - action -> api -> error 复合链路场景
  - inspect seed 节点
- 对 automation API 的回归优先使用 `page.evaluate()` 直接读全局 API，而不是通过 panel DOM 文本断言。

Exit criteria: `waitForEvent()`、`getInteractionTrace()`、`inspectByElement()`、`exportSession()` 和 request instance 归并语义都被 Playwright 直接保护，debugger 真正成为集成测试诊断基础设施的一部分。

**Phase 6 — 文档收口与兼容性审查**

Targets: `docs/architecture/debugger-runtime.md`, `README.md`, `docs/logs/`, touched package docs/tests

- 在所有能力落地后，更新 `docs/architecture/debugger-runtime.md`，明确第二阶段目标哪些已经落地，哪些被 deferred。
- 更新 README 中 debugger 和 AI 调试示例，确保示例方法和全局对象名称准确。
- 每个阶段完成后补 daily log，记录关键取舍和未做事项。
- 如果某个能力需要修改 `flux-core` 契约，补一段“为什么值得进 core，而不是停留在 debugger 本地聚合”的说明，避免后续再次漂移。

Exit criteria: 文档、代码、自动化示例和测试契约对同一套 debugger 能力描述一致，不再依赖旧分析文档或 plan 文件猜测当前状态。

## Scope

- `docs/architecture/debugger-runtime.md`
- `README.md`
- `docs/logs/2026/04-04.md`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/renderer-api.ts`
- `packages/flux-core/src/types/renderer-component.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller-helpers.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/node-tab.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`
- `apps/playground/src/pages/DebuggerLabPage.tsx`
- `tests/e2e/debugger.spec.ts`
- 相关单元测试文件

## 不在 Scope 内的事项

- debugger 远程上传、服务端存储或线上会话回放
- 独立监控后端、告警系统或 tracing 平台接入
- 把 playground 重构成新的产品级 DevTools 应用
- 大规模重写 panel 视觉系统或切换 UI 框架
- 非 debugger 目标驱动的 `flux-runtime` / `flux-react` 结构重构

## Effort

- 预计 7-10 个工作日。
- 建议拆成 6 个独立执行切片：术语校准、请求实例与因果字段、inspect 增强、高层失败摘要、表达式诊断、契约级 E2E。
- `Phase 1` 与 `Phase 2` 可以并行设计，但实现上建议先完成 `Phase 1`，因为 inspect 与 trace 都会依赖新的关联模型。
- `Phase 3` 与 `Phase 5` 可以部分并行：摘要接口落地后即可开始补 E2E。

## Verification

每个阶段至少执行 `@nop-chaos/nop-debugger` 包级验证；若触及 core/runtime/react，再追加对应分包验证。最终做全仓验证。

```bash
pnpm --filter @nop-chaos/nop-debugger typecheck
pnpm --filter @nop-chaos/nop-debugger build
pnpm --filter @nop-chaos/nop-debugger lint
pnpm --filter @nop-chaos/nop-debugger test

pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-core test

pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-runtime lint
pnpm --filter @nop-chaos/flux-runtime test

pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-react test

pnpm test:e2e

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

## Acceptance Criteria

- 并发请求场景下，debugger 事件可稳定区分“语义相同请求”和“某一次请求实例”。
- `getInteractionTrace()` 优先依赖显式关联字段，而不是只靠旧启发式匹配。
- `inspectByCid()` / `inspectByElement()` 返回的结构足够展示 scope chain、props/meta 摘要和 handle 摘要。
- Node Tab 的表达式入口要么可用、可测试、可通过 automation API 调用，要么被明确删除并在文档中说明。
- `waitForEvent()`、`getInteractionTrace()`、`inspectByElement()`、`exportSession()` 都有 E2E 回归覆盖。
- 文档、README、playground 示例和代码使用同一套 debugger 全局对象名称与术语。

## 风险与回退

- 风险 1：如果过早把 tracing 字段上推到 `flux-core` monitor 契约，可能导致跨包改动过大。规避方式：优先在 `nop-debugger` 本地 wrapper 中生成关联字段，只有证明多个调用点都需要时才上推契约。
- 风险 2：inspect 增强若直接暴露 runtime 私有状态，容易破坏包边界。规避方式：优先走只读 debug snapshot 或最小化 debug capability，而不是透传内部对象。
- 风险 3：表达式 evaluator 若边界不清，容易退化成任意代码执行。规避方式：只允许既有公式/表达式引擎，不允许 JS `eval` / `new Function`。
- 风险 4：E2E 若继续依赖 panel DOM，会让契约测试脆弱。规避方式：所有关键自动化断言都通过 `window.__NOP_DEBUGGER_API__` 进行。
- 风险 5：workspace 级验证可能再次命中 unrelated 问题。若出现这种情况，按 repo 规范记录 blocker，不把 unrelated failure 误记为本计划回归。

## Related Documents

- `docs/architecture/debugger-runtime.md`
- `docs/analysis/framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`
