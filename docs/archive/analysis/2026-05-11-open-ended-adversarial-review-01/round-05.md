# 开放式对抗性审查 — 2026-05-11 — 第五轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：`2026-05-08-deep-audit-full/19-error-fidelity.md` 已记录“component/namespace action 抛错时，`onActionEnd` 丢失 enrichment metadata”；本轮不重复那个错误路径问题，只检查 monitor 合同里另一条独立缺口：开始事件是否从一开始就缺少 delegated dispatch metadata。
> 本轮切入点：`ActionMonitorPayload` 声明了丰富的 delegated 元数据，但 `onActionStart` 是否永远只收到基础 payload。

---

## 发现 1：`monitor.onActionStart` 永远拿不到 delegated dispatch metadata，`ActionMonitorPayload` 的多数字段只在结束态才存在

**在哪里**

- `ActionMonitorPayload` 类型公开了 `dispatchMode`、`namespace`、`method`、`targetId`、`sourceScopeId`、`providerKind`、`componentId`、`componentName`、`componentType`：`packages/flux-core/src/types/actions.ts:267-282`
- 但 `buildActionMonitorPayload()` 只构造基础字段：`actionType`、`instancePath`、`nodeId`、`path`、`interactionId`：`packages/flux-action-core/src/action-core.ts:52-63`
- `runSingleAction()` 在 built-in/component/named/namespaced classification 之前立刻发出 `onActionStart`：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:72-85,122-166`
- delegated metadata 只会在成功走到 `finishAction()` 时注入，而且只进入 `onActionEnd`：`packages/flux-action-core/src/action-dispatcher/action-runners.ts:19-39,42-93,95-141`
- 现有测试也只证明了 `onActionEnd` 有这些 metadata，没有对应的 `onActionStart` 覆盖：`packages/flux-runtime/src/__tests__/runtime-actions-monitor.test.ts:412-487`
- debugger 的 start-event adapter 也因此只能记录通用 action identity，无法在开始态区分 component/namespace target/provider：`packages/nop-debugger/src/adapters.ts:164-179`

**是什么**

当前 monitor contract 在类型层看起来支持丰富的 delegated action metadata，但 live dispatch 流程中：

1. `onActionStart` 总是用基础 payload 触发。
2. `dispatchMode` / `namespace` / `method` / `componentId` / `sourceScopeId` 等信息，要等 action 已经执行结束后，`finishAction()` 才能补上。

这意味着对 `component:validate`、`designer:export`、`refreshSource(targetId)` 这类 action，start-event 观察者看到的永远只是：

- action type
- node id/path
- interaction id

而不是“它正在调用哪个 component handle、哪个 namespace provider、哪个 targetId、哪个 source scope”。

**为什么值得关心**

这不是小型 observability 美化问题，而是 monitor contract 的结构性断裂：类型和调用者会自然以为 `ActionMonitorPayload` 的字段在 start/end 两个阶段都是同一 contract，只是 end 多了 `durationMs` / `result`。但 live code 里其实是两套不同 payload：

1. start 只有最基础的 node/action identity。
2. end 才有 delegated dispatch context。

这会直接影响 debugger、监控和卡住动作排查：

- 对长时间运行、超时、挂起中的 delegated action，start-event 无法告诉你它到底是哪个 component target / namespace / provider scope。
- `targetId` 在 monitor 类型里是公开字段，但在 start-event 上实际上是死字段。
- 作者和工具维护者会误以为开始态就能做“按 provider / component / target 分类”的 tracing，结果只能在 action 结束后补看。

与 5 月 8 日已报问题的区别在于：那条是异常路径让 `onActionEnd` 降级；本轮是正常路径下 `onActionStart` 从设计上就不携带 delegated metadata，属于另一条 live contract 不闭合。

**信心水平**：确定

---

## 本轮小结

本轮确认了一条新的观测面缺口：action runtime 已经能在结束态区分 built-in/component/namespace/provider，但开始态仍停留在“未分类 action”视角。这让 monitor/debugger 对 in-flight delegated action 的可观测性从一开始就被削弱。

## 本轮盲区自评

- 本轮只检查了 action monitor payload，没有继续扩展到 render/api monitor 的 start/end 合同是否也存在类似不对称。
- 没有写 focused test 去证明 `onActionStart` 缺 `dispatchMode` / `targetId` / `namespace`；当前依据是 dispatch 时序与现有测试范围。
- 下一轮若继续，适合切到新的 subsystem，例如 component registry、surface monitor、或 imported namespace lifecycle，避免继续围绕 monitor 同一文件打转。
