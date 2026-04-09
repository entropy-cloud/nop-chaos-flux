# Action Graph Authoring And Visual Projection

## Purpose

本文档回答以下问题：

- `then` / `onError` 是否应只保留单 action 入口
- `parallel` 是否应改成 `steps` + `parallel: true`
- `when` 是否足够表达 optional / conditional step
- 如果未来做 action 可视化设计器，节点、端口、连线和 lowering 应如何设计

## Position

- `docs/architecture/action-algebra-formal-spec.md` 仍然拥有执行语义的规范性定义。
- 本文档只定义 visual authoring model 与导出 `ActionSchema` 之间的映射规则。
- 这里讨论的是 authoring projection，不是把 `Action Algebra` 改造成另一套通用 workflow engine。

## Core Decisions

- 保留 `then` / `onError` 的 `ActionSchema | ActionSchema[]` 形态。
- `ActionSchema[]` 是 ordered sequence shorthand，不是第二套 graph language。
- 保留 `parallel` 作为显式 aggregate fan-out node，不改成 `steps` + `parallel: true`。
- `when` 是 canonical optionality / guard 字段；`when = false` 已能表达“跳过该节点”。
- 可视化设计器可以有自己的 graph authoring IR，但导出时必须 lower 回当前 DSL：ordered arrays、`when`、`then`、`onError`、`parallel`。

## Why Arrays Stay

`then: step` 与 `then: [stepA, stepB]` 表达的是同一个心智模型：

- 前者表示“成功后做一件事”
- 后者表示“成功后按顺序做几件事”

保留 object-or-array 的原因不是历史兼容优先，而是它本身就是渐进式演化：

- 单步不需要额外 wrapper
- 多步顺序链可以在原有位置自然增长
- 手写 JSON 比强制引入 `steps` / `sequence` wrapper 更轻

更重要的是，主顺序链语义和 `then` 不完全相同。

如果一个顺序链中的前一步因为 `when = false` 被 `skipped`，后续 sibling 仍然可以继续执行；如果把所有顺序关系都强制改写成 `then`，那么 `skipped` 会错误地吞掉后续步骤。

## Why Not `steps` + `parallel`

不推荐把当前模型重写为：

```json
{
  "steps": [ ... ],
  "parallel": true
}
```

原因：

- 这会把“顺序 list carrier”和“并发 aggregate kind”揉成一个字段族，阅读时必须先看布尔值才知道语义。
- 它并不能替代 `then` / `onError`，因为 success / failure branching 仍然存在。
- 它对手写 schema 更啰嗦，对 visual lowering 也没有本质优势。
- `parallel` 当前是一个明确的 fan-out / join aggregate node；把它降格成布尔修饰词，语义反而更弱。

如果未来真的出现“需要给顺序 aggregate 自身挂 `when` / `retry` / `timeout` 等 group-level metadata”的稳定需求，更清晰的名字会是显式 `sequence`，而不是泛化为 `steps`。但当前 baseline 还没有到必须新增该导出 primitive 的程度。

## Optionality

### Single Step

单节点可选执行直接使用 `when`：

```json
{
  "action": "setValue",
  "when": "${shouldWrite}",
  "dataPath": "filters.keyword",
  "value": "${keyword}"
}
```

当 `when` 为 false 时：

- 当前节点返回普通 `ActionResult`
- 结果类为 `neutral-class`
- 该节点被视为 `skipped`
- 主顺序链可以继续向后执行

这已经足以表达“可选步骤”。因此“条件不满足就跳过整个节点”不是缺失能力。

### Multi-Step Segment

如果未来 visual designer 需要“多个顺序步骤共用一个 guard”，推荐做法是：

- 在 visual authoring 层提供 authoring-only guarded group / segment
- lowering 时把该 guard 分发到被导出 segment 的 contained steps 或 segment roots
- 不要为了 designer authoring convenience 立即把 runtime DSL 改成新的 `sequence` 字段

也就是说，group-level optionality 首先是 authoring-model 问题，不是当前 exported DSL 的缺口。

### Why `optional: true` Is Not Enough

单独引入 `optional: true` 不够，因为它没有回答：

- 什么时候 optional
- optional 不命中时应走哪条路径
- optional 是节点级还是 segment 级

在当前模型里，真正稳定的语义单位仍然是 `when`，不是裸 `optional` 布尔值。

## Visual Authoring Model

未来 action visual designer 不应直接把画布上的每一根边都 1:1 映射成运行时字段。

推荐把设计器当成 **authoring IR**：

- 画布负责表达作者的结构意图
- compiler / exporter 负责把 graph IR lowering 成当前 `ActionSchema`

### Recommended Node Types

| Node | Purpose | Input Ports | Output Ports | Export Shape |
| --- | --- | --- | --- | --- |
| `entry` | 一次交互或语义生命周期的起点 | - | `next` | root action / root ordered array |
| `step` | 一个 effectful 或 semantic action 节点 | `prev` | `next`, `then`, `onError` | one `ActionSchema` leaf |
| `parallel` | 并发 fan-out + join aggregate | `prev` | `next`, `branch[*]`, `then`, `onError` | one `ActionSchema` with `parallel` |
| `end` | 可选的 UX terminator | `prev` | - | omitted in export |

补充说明：

- `step` / `parallel` 节点的 inspector 都可以编辑 `when`、`continueOnError`、`timeout`、`retry`、`debounce`。
- `end` 只是 designer UX 辅助节点，不需要成为运行时 primitive。
- 如果后续真的需要 segment 级批量编辑，再增加 authoring-only `group` container；不要先把它写进 exported DSL。

### Port Meanings

| Port | Meaning | Lowers To |
| --- | --- | --- |
| `next` | 主顺序链中的下一个 sibling step | ordered array position |
| `then` | success-only subordinate branch | `then` |
| `onError` | failure-only subordinate branch | `onError` |
| `branch[*]` | `parallel` fan-out 子分支 | `parallel[*]` |

关键约束：

- `next` 不是 `then` 的可视化别名。
- `next` 表示“主顺序链中的后继步骤”，lowering 后应进入 ordered list，而不是 nested `then`。
- 只有显式 success-only branch 才走 `then` port。

### Connection Rules

- `entry.next` 只能连到一个 root node。
- 每个 `step` / `parallel` 节点最多一个 incoming `next`。
- 每个 `step` / `parallel` 节点最多一个 outgoing `next`。
- 每个节点最多一个 `then` root 和一个 `onError` root。
- `parallel.branch[*]` 每个端口连到一个 branch root；branch 之间不允许任意交叉回连。
- `parallel` 的 branch 必须通过 owning `parallel` node 结构化 join，不允许任意 many-to-many join。
- 整体图保持可 lowering 的 structured DAG；不支持回边和循环。

这些限制是刻意的。目标不是让 designer 直接变成通用 BPMN/工作流引擎，而是让它稳定映射到当前 structured `Action Algebra`。

## Lowering Rules

| Visual authoring construct | Exported DSL |
| --- | --- |
| `entry -> next lane` | root `ActionSchema` or ordered `ActionSchema[]` |
| `next` edges | ordered list order |
| `step.then` | `then` |
| `step.onError` | `onError` |
| `parallel.branch[*]` | `parallel` array entries |
| node `when` | node `when` |
| authoring-only guarded group | compiler transform; not a new runtime field |

一个重要规则：

- main `next` lane lowering 成 ordered array
- 不要把整条 main lane 自动改写成 nested `then`

因为这样会破坏当前 `skipped` 对主顺序链的稳定语义。

## UI Recommendations

- 主画布优先表现为一条清晰的主顺序 lane，而不是一开始就放任任意自由连线。
- `then` / `onError` 用更小的侧边 handle 或 chip 表示，避免与主顺序链混淆。
- `when` 在节点卡片上显示为可见 badge，例如 `Run when ...`。
- `parallel` 节点表现为 split/join 结构，中间展示多个 branch lane。
- Inspector 至少分为：`Action`、`Guard`、`Control`、`Branches` 四组。
- `continueOnError` 应明确显示为节点级策略，而不是某条边的隐藏开关。

## Convergence Rule

结论不是“为了 visual designer 改写 JSON contract”，而是：

- exported DSL 保持 hand-authorable 的渐进式结构
- visual designer 拥有更适合画布的 authoring projection
- lowering 层负责把二者收敛起来

只有当 exported DSL 本身出现稳定、跨 authoring surface 的真实缺口时，才评估是否新增 `sequence` 之类的 aggregate node。当前还不需要因为 designer convenience 去重命名 `parallel` 或废掉 array shorthand。

## Related Documents

- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/flux-design-principles.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
