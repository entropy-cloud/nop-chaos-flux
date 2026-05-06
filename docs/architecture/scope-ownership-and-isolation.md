# Scope Ownership And Isolation

## Purpose

本文档定义以下问题的统一基线：

- `page` / `form` / `dialog` / fragment 等节点的 `data` 字段应表示什么
- scope 默认是否继承父 scope
- 是否需要显式隔离开关，以及名称应是什么
- table row 这类高频子树为什么要默认隔离
- 是否应提供 `$parentScope` 这类后门读取

## Position

- `docs/architecture/frontend-programming-model.md` 定义 `ScopeRef` 是词法数据环境。
- `docs/architecture/renderer-runtime.md` 定义当前 runtime 的 scope 创建与 selector 语义。
- `docs/architecture/table-row-identity-and-scope-performance.md` 拥有 row scope 的高频性能规则。
- 本文档收口 author-visible 的 scope 继承、初始化与隔离设计。

## Core Rules

1. scope 的默认基线是 **词法继承**。
2. `data` 的统一语义是：**当前节点 own scope 的初始 patch**，不是第二套独立数据系统。
3. 隔离是性能或边界控制的窄特例，不应成为默认。
4. 显式隔离应使用现有术语 `isolate`，不要再引入 `isolateScope`、`noParentScope` 之类并行名字。
5. 不提供 `$parentScope` 这种通用后门读取。
6. 如果一个隔离子树仍需要少量父级数据，应显式复制/投影这些字段，而不是重新打开任意父级穿透。

## Default Inheritance

默认情况下，child scope 继承 parent scope：

- own snapshot 中的同名字段遮蔽父级字段
- 未命中 own 字段时沿父链查找
- 依赖订阅会感知 parent scope 变化

这是当前最符合易用性的默认：

- 绝大多数页面、表单、容器、dialog body、fragment 都需要自然读取上层业务数据
- 作者无需额外声明“允许读取父 scope”

因此推荐的默认心智模型是：

```text
child scope = parent lexical visibility + own patch shadowing
```

## `data` Field

`data` 的推荐统一语义：

- 在该节点创建 own scope 时，向 own snapshot 写入初始 patch
- 它只影响当前节点 own scope
- 它与父 scope 的关系仍然受默认继承 / 显式隔离规则约束
- 如果 `data` 含表达式，这些表达式应在该 owner / scope 创建时，基于父 lexical scope 求值一次
- 求值结果写入 own snapshot 后，该 `data` 不再被视为对父 scope 的持续 live binding
- parent scope 后续变化默认不反向覆盖 child owner / scope 已经持有的值；需要重同步时应使用显式 lifecycle/action

这意味着：

- `page.data` 初始化 page root scope
- `form.data` 初始化 form own scope / initial values carrier
- future `dialog.data` 若存在，应初始化 dialog own scope

推荐心智模型：

```text
parent lexical scope
  --evaluate node.data once at owner/scope creation-->
initial patch snapshot
  --seed-->
child own scope
```

不应把 `data` 理解为：

- 第二套“局部 props 系统”
- 与 scope 脱节的静态常量袋
- 隐式关闭父级可见性的标志
- 父 scope 到 child own scope 的持续双向同步协议

## Recommended Naming

### Keep

- `data`
- `isolate`

### Reject

- `isolateScope`
- `inheritScope`
- `noParentScope`
- `$parentScope`

理由：

- `isolate` 已是 runtime 与 fragment/row scope 的现有术语
- `data` 已经在 `SchemaRendererProps`、`form` 文档和 runtime 中存在
- 继续新增并行名字只会制造第二心智模型

### Why Not `isolateScope`

不建议把 `isolate` 重命名为 `isolateScope`。

原因：

- `isolate` 已经足够表达“当前子树与父级数据链断开”
- 这里被隔离的本来就是 scope，不需要在字段名里再重复一次名词
- 当前 runtime、fragment options、row scope 文档都已经使用 `isolate`
- 改名只会增加迁移成本，却不会增加新的语义信息

## Isolation

`isolate: true` 的语义应保持简单：

- 当前 child scope 不再沿父链查找数据
- child store 不再订阅 parent store
- child 只读取 own snapshot

因此：

```text
isolate: false (default) -> lexical inheritance
isolate: true            -> own-scope only
```

## When Isolation Is Appropriate

适合显式隔离的场景：

- row scope 等高频重复子树
- 纯局部片段，不应被父 scope churn 持续扇出通知
- 明确需要封闭局部数据环境的优化型渲染子树

不适合作为默认的场景：

- page
- form
- dialog body
- 一般 container / fragment
- `loop` item scope

这些场景从 authoring 直觉上都更适合默认继承。

## Loop Item Rule

`loop` item scope 也属于 repeated child scope，但它与 table row 的默认目标不同：

- `loop item` 默认继承 parent lexical scope
- `loop item` 再叠加 item-local bindings，例如 `item`、`index`、optional `key`
- 若存在 `itemData`，也在同一 item-local patch 中注入

推荐心智模型：

```text
loop item scope = parent lexical visibility + { item, index, optional key, ...itemData }
```

为什么默认不隔离：

- `loop` 是通用结构展开，不是 table 那种高频性能特例
- 典型 loop body 往往同时依赖当前 item 与外层页面/表单数据
- 如果默认隔离，会立刻逼出 `$parentScope` 一类后门需求

因此：

- `table row` 默认隔离
- `loop item` 默认继承

future optimization rule:

- 如果以后出现高频纯展示 loop 的明确性能压力，可以再评估是否增加窄的 item-scope isolation 优化开关
- 但那不应成为首版 `loop` 的默认行为

## Table Row Rule

table row 是一个明确例外：

- row scope 仍然是 child scope
- 但出于性能考虑，**materialized row scopes should be isolated by default**

原因：

- row 数量多
- parent churn 很容易扇出到所有 row scope
- 大多数 cell 只需要 `record`、`index`、`rowKey` 这类 row-local 数据

因此 row scope 的默认应是：

- 默认 `isolate: true`
- 只有确实需要父级词法回退时，才显式 opt out

## Table Scope And Row Projection

table 需要区分两层：

### Table Shell Scope

table shell 本身默认遵循普通规则：

- 默认继承 parent scope
- 如未来 schema 明确支持 `table.data`，其语义也应与其他容器一致：初始化 table own scope patch

因此 table shell 获取额外数据的默认方式不是特殊协议，而是：

- 直接继承 parent lexical scope
- 或通过 `table.data` 显式补充 own patch

### Row Scope

row scope 是 table owner 派生出来的高频子 scope：

- 默认 `isolate: true`
- 基础 row carrier 至少包含 `record`、`index`
- 如有需要，可额外包含 `rowKey`、`viewIndex`、以及少量显式投影的外部字段

推荐新增的 authoring 方向：

- `rowData`

其职责是：

- 显式声明每个 row scope 还需要哪些额外字段
- 由 table owner 在创建 row scope 时把这些字段投影进 row own patch
- 替代 `$parentScope` 这类任意穿透后门

推荐心智模型：

```text
table shell scope = inherited lexical scope (+ optional table.data)
row scope        = isolated row-local scope built from { record, index, ...rowData }
```

### `rowData` Evaluation Rule

`rowData` 若存在，推荐按以下顺序求值：

1. 先构造一个临时求值上下文，拥有：
   - table shell 可见 lexical scope
   - 当前 row-local roots，例如 `record`、`index`、`rowKey`
2. 在这个上下文中解析 `rowData`
3. 把解析结果写入最终 isolated row scope own patch

这样 row scope 最终仍然是隔离的，但它所需的少量外部值已经被显式投影进来了。

## No `$parentScope`

不推荐提供 `$parentScope` 或类似通用逃生口。

原因：

1. 它破坏词法边界的显式性。
2. 它会把“是否隔离”从结构级规则退化成表达式里的隐式穿透。
3. 一旦出现 `$parentScope`，很容易继续膨胀成 `$rootScope`、`$ancestorScope(n)` 之类协议。
4. 它会让性能优化和依赖推导变得更不可控。

## How Isolated Subtrees Read External Data

如果一个隔离子树仍然需要少量外部数据，推荐顺序是：

1. **显式复制需要的父级字段到 own patch**
2. **为该子树设计窄的 host/status/value projection**
3. 只有在确有必要且结构稳定时，再评估是否需要更窄的专用保留绑定

也就是说，不要给它一个任意父级读取后门，而是显式提供它真正需要的少量值。

### Example: Isolated Row With Parent Data

推荐：

```ts
createScope(
  {
    record,
    index,
    currency,
    locale,
  },
  { isolate: true, source: 'row' },
);
```

或在 authoring surface 上等价表达为：

```json
{
  "type": "table",
  "rowData": {
    "currency": "${currency}",
    "locale": "${locale}"
  }
}
```

而不是：

```ts
// read record from row scope, then fallback to $parentScope.currency
```

前者更清晰：row 到底依赖哪些父级值，是显式声明的。

## Ease-Of-Use Baseline

从易用性角度，最佳默认是：

- 所有普通节点默认继承父 scope
- 所有普通节点都可用 `data` 初始化自己的 own scope patch
- 只有高频或明确封闭场景才显式 `isolate: true`
- 一旦隔离，就要求显式传入所需父级数据，而不是靠 `$parentScope` 后门补洞

这条路的优点是：

- 默认最自然
- 优化点足够明确
- 性能和语义边界不会互相污染

## Data Field Ownership By Node Family

下面是 `data` 字段在各节点家族中的统一归属规则。

其中：

- `page` / `form` / table row 的条目已基于当前 live codebase 审计
- `dialog` / `drawer` 的 `data` 语义仍是推荐 baseline，而不是已落地的 live feature

| 节点                            | data 语义                                                                                                   | scope 创建者                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `page`                          | 初始化 page root scope                                                                                      | page renderer/host 在 mount 时创建 `PageRuntime` + page scope                                                                             |
| `form`                          | 初始化 form own scope / initial values                                                                      | form renderer 在 mount 时创建 `FormRuntime` + form scope                                                                                  |
| `dialog`                        | future `data` should initialize dialog own scope                                                            | dialog host/renderer 在每次打开时创建 `SurfaceRuntime` + surface scope；`data` 语义是推荐 baseline，不表示该 authoring surface 已完整落地 |
| `drawer`                        | future `data` should initialize drawer own scope                                                            | 与 dialog 相同，共用 `SurfaceRuntime`/`SurfaceStore` 模型，`kind: 'drawer'`；`data` 语义仍属推荐 baseline                                 |
| fragment `render({ bindings })` | 创建 fragment child scope                                                                                   | `RenderNodes` 在收到 `options.bindings` 时创建 child scope；不由 `NodeRenderer` 创建                                                      |
| table row                       | 隔离 row scope；当前 live baseline payload 是 `record`/`index`，future 可再增加窄的 `rowKey`/`rowData` 投影 | table renderer 在每行渲染时创建；默认 `isolate: true`                                                                                     |
| loop item                       | 继承 parent lexical scope，叠加 item-local bindings                                                         | loop renderer 在每项渲染时创建；默认非隔离                                                                                                |

这些 owner 规则与 `docs/architecture/renderer-runtime.md` 的"Execution Boundary Ownership Matrix"保持一致：creator-owned boundaries 只由具体创建者创建和发布，不经过 `NodeRenderer` 通用层。

同时它们与 `docs/architecture/data-domain-owner.md` 的边界保持一致：

- own scope creation 不等于 `Data Domain Owner` creation
- `dialog` / `drawer` 的 own scope 解决 lexical read environment，不把 surface 自动升级成业务 submit owner
- table row scope 默认是 isolated read scope，不是默认 child data domain

## Recommended Follow-Up

- 在 `page` 组件设计中补齐 `data` 作为 root scope init patch（如尚未更新）
- `dialog` / `drawer` 引入 `data` 时沿用相同语义（初始化 surface own scope）
- 继续保持 row scope 使用现有 `isolate` 术语，不再新增 `isolateScope`

## Related Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
- `docs/components/page/design.md`
- `docs/components/form/design.md`
