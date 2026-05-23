# 开放式对抗性审查 — 2026-05-08 — 第一轮

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：已快速浏览 `docs/analysis/2026-05-05-open-ended-adversarial-review-01/`、`docs/analysis/2026-05-06-open-ended-adversarial-review-01/`、`docs/analysis/2026-05-07-open-ended-adversarial-review-01/` 以及 `docs/references/reopened-design-decisions-and-audit-adjudications.md`。
> 本轮切入点：让结构 DSL、slot 参数、Resource lifecycle、Reaction cancellation 这些跨边界路径自己暴露异常，而不是按固定维度扫描。

---

## 发现 1：`when` 被文档定义为结构激活机制，但普通节点和 `fragment` 根本没有执行它

**在哪里**

- 文档基线：`docs/architecture/frontend-programming-model.md:140-150`
- 文档示例：`docs/components/fragment/design.md:95-107,129-139`
- 文档示例：`docs/components/recurse/design.md:93-116,144-148`
- 类型/编译入口：`packages/flux-core/src/types/schema.ts:19-38`
- 元字段集合：`packages/flux-core/src/constants.ts:1`
- 字段分类：`packages/flux-compiler/src/schema-compiler/fields.ts:30-42`
- meta 求值：`packages/flux-runtime/src/node-runtime.ts:154-171`
- `fragment` 实现：`packages/flux-renderers-basic/src/fragment.tsx:6-20`
- 唯一显式声明 `when` 的 renderer 是 `reaction`：`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:245-257`

**是什么**

当前规范明确写着：

- `visible` 只控制视觉呈现。
- `when` 控制结构激活与生命周期参与。
- `fragment + when` 是推荐的结构条件分组方式。

但 live code 中普通 renderer 没有任何通用 `when` 执行路径：

- `META_FIELDS` 只包含 `visible` / `hidden` / `disabled` 等，不包含 `when`。
- `resolveNodeMeta()` 只解析 `visible` / `hidden`，不解析 `when`。
- `classifyField()` 对普通节点的 `when` 走默认 `{ kind: 'prop' }`，除非 renderer 自己显式消费。
- `FragmentRenderer` 完全不读取 `props.props.when`。
- 基础 renderer 定义里只有 `reaction` 把 `when` 声明为自身业务 prop。

所以作者按文档写：

```json
{
  "type": "fragment",
  "when": "${false}",
  "body": [{ "type": "text", "text": "should not render" }]
}
```

运行时仍会渲染 body。若 body 里是 `data-source`、`reaction`、`form` 或带 `onMount` 的节点，这些结构和生命周期也会照常参与。

**为什么值得关心**

这不是一个 renderer 漏读 prop 的小问题，而是顶层结构 DSL 的核心承诺没有接到执行路径。更危险的是，现有结构测试里已经写了 `fragment.when`，但测试样例恰好把 false 分支包成空递归，因此没有暴露“false body 仍执行”的问题。

**信心水平**：确定

---

## 发现 2：`loop.itemData` 在父 scope 预先求值，既无法读取当前 item，又可以覆盖结构性 `$slot` 参数

**在哪里**

- 文档承诺：`docs/components/loop/design.md:159-188`
- renderer 字段定义：`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:76-84`
- 编译为普通 prop：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:160-187`
- `LoopRenderer` 直接读取已解析的 `props.props.itemData`：`packages/flux-renderers-basic/src/loop.tsx:58-84`
- slot binding 构造：`packages/flux-renderers-basic/src/structural-loop.tsx:82-100`
- `$slot` frame 包装：`packages/flux-react/src/node-renderer-resolved.tsx:234-247`
- slot 保留字段规则：`docs/architecture/scoped-render-slots.md:271-282`

**是什么**

`docs/components/loop/design.md` 明确说 `itemData` 的推荐求值上下文是：

- parent lexical scope
- 当前 item-local roots，例如 `item`、`index`、optional `key`

并给出示例：

```json
"itemData": {
  "canEdit": "${item.ownerId === currentUser.id}",
  "displayName": "${item.firstName + ' ' + item.lastName}"
}
```

live code 不是这样执行的。`itemData` 被声明为普通 `prop`，随整个 loop 节点的 `propsProgram` 在父 scope 中一次性求值；到了 `LoopRenderer`，`props.props.itemData` 已经是一个解析完成的对象，`buildSlotBindings()` 只是把它 `Object.assign` 到每个 item 的 slot bindings 里。

这带来两个相反方向的问题：

1. `itemData` 里的 `${item...}` / `${index...}` 在求值时还没有当前 item，因此文档推荐的 per-item 派生值不可用。
2. `Object.assign(slotBindings, itemData)` 发生在结构性 binding 之后，所以 `itemData` 可以覆盖 `[itemName]`、`[indexName]`、`[keyName]`，甚至在最外层 slot 中写入 `$parent`，绕过 `scoped-render-slots.md` 对 `$parent` 等保留字段的设计约束。

**为什么值得关心**

这会让 loop 的“当前 item 局部派生”能力看起来存在、文档也推荐，但运行时实际不成立。更隐蔽的是，覆盖结构性 slot 参数会让 `${$slot.item}`、`${$slot.index}`、`${$slot.$parent}` 读到 schema 注入值而非真实 repeated context，递归条件、key 展示、权限判断都会被误导。

**信心水平**：确定

---

## 发现 3：`DataSourceController.stop()` / `reset()` 后无法再次 `start()` 或 `refresh()`，`stopWhen` 会把 source 变成假活状态

**在哪里**

- API-backed controller：`packages/flux-runtime/src/async-data/api-data-source-controller.ts:42-68,91-114`
- API request runner 早退：`packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:114-117,292-294`
- Formula-backed controller：`packages/flux-runtime/src/async-data/formula-data-source-controller.ts:148-154,187-204`
- source registry refresh：`packages/flux-runtime/src/async-data/source-registry.ts:316-328`
- public interface：`packages/flux-core/src/types/runtime.ts:275-280`
- lifecycle 文档：`docs/architecture/api-data-source.md:571-594`

**是什么**

两个 controller 实现都有同一个状态机缺口：

- `start()` 先检查 `started`，如果已经 true 就直接返回。
- `stop()` 和 `reset()` 都把 `stopped = true`，但不把 `started` 复位。
- API-backed 的 `refresh()` 进入 `runRequest()` 后又被 `if (mutable.stopped) return` 挡掉。
- Formula-backed 的 `refresh()` 调 `publish()`，而 `publish()` 开头也会在 `stopped` 时直接返回。

因此一旦 controller 被 `stop()`、`reset()` 或 `stopWhen` 停止，它仍然保留 `started=true`，后续：

- `start()` 不能把 `stopped` 改回 false，因为被 `started` guard 提前返回。
- `refresh()` 不会实际刷新。
- `sourceRegistry.refreshDataSource()` 仍返回 `true`，因为它只找到 entry 并调用 `controller.refresh()`，不知道 refresh 实际早退。

**为什么值得关心**

`stopWhen` 本应只是停止轮询；但当前实现会把 source 推入一种“registry 里还存在、refreshSource 返回成功、状态看起来 started，但永远不再请求”的假活状态。对于长轮询任务、用户点击“重新查询”、或 reset 后复用同一 controller 的场景，这是直接功能失效，而且很难从外部诊断。

**信心水平**：确定

---

## 发现 4：Reaction dispose 创建了 AbortController，却没有把 signal 传入 dispatch，无法取消在途 action

**在哪里**

- reaction 自己创建 abort controller：`packages/flux-runtime/src/async-data/reaction-runtime.ts:102`
- dispatch action 时没有传 `signal`：`packages/flux-runtime/src/async-data/reaction-runtime.ts:208-223`
- dispose 只 abort 自己的 controller：`packages/flux-runtime/src/async-data/reaction-runtime.ts:389-405`
- action context 已支持 signal：`packages/flux-runtime/src/runtime-factory.ts:552-560`
- action execution 会沿用 signal：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:76-81,286-289`
- ajax/request runtime 会消费 signal：`packages/flux-runtime/src/async-data/request-runtime.ts:267-294,342-378`

**是什么**

`registerReaction()` 内部有自己的 `AbortController`，`dispose()` 时也会 `abortController.abort()`。但真正执行 action 时：

```ts
const dispatchResult = await input.helpers.dispatch(normalizeActionArray(actionsSource), {
  scope: input.scope,
  event: { ... },
  evaluationBindings: { ... },
});
```

没有传入 `signal: abortController.signal`。

这意味着 dispose 只能阻止尚未开始的 queued/debounced reaction；如果 action dispatch 已经进入 `ajax`、`submitForm`、namespaced action 或带 `then` 的长链路，reaction dispose 不会通知下游取消。下游 action 系统已经支持 signal，但 reaction 没有接上。

**为什么值得关心**

页面、dialog、fragment scope 被销毁后，reaction 发起的在途请求或 action chain 仍可能继续运行，并在完成后写 scope、提交表单、打开 surface 或触发外部副作用。此前报告过 `once` reaction 在异常时不 dispose；本问题不同，它是普通 reaction 的 in-flight cancellation 缺口，发生在 dispose 已经调用但 action 仍继续执行的路径上。

**信心水平**：确定

---

## 本轮小结

这一轮最值得关注的模式是：文档和类型层已经把某些能力描述成结构性或生命周期性合同，但 live code 只实现了较浅的 prop/状态标记层。

最危险的 3 条线：

1. `when` 没有通用执行路径，直接破坏结构 DSL 的作者心智。
2. loop slot/itemData 的求值时机和保留字段约束不闭合，容易在递归结构里制造错误上下文。
3. source/reaction lifecycle 的取消语义不完整，外部看起来已 stop/dispose，内部在途 work 仍可能继续或变成假活。

## 本轮盲区自评

- 本轮主要围绕结构 DSL 与 async lifecycle，没有做浏览器实测或完整测试运行。
- 尚未深入 `dynamic-renderer` 的 schema 替换生命周期、compiler validation 双路径、以及复杂表单 composite owner 的当前 live 状态。
- 下一轮适合切换到 schema 编译/校验与 dynamic schema 边界，避免继续围绕同一类 lifecycle 问题重复打转。
