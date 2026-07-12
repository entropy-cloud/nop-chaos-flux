# 命名数据源与轮询

> `data-source` 节点自身**不渲染**（return null）。`action` 是字符串（如 `"ajax"`），`args` 同级。结果经 `name` 发布到 scope，由**兄弟节点**消费（不要把内容放进 data-source 的 `body`）。

## 基础 Data Source

```json
[
  { "type": "data-source", "name": "users", "action": "ajax", "args": { "url": "/api/users" } },
  { "type": "text", "text": "用户数: ${users.length}" }
]
```

## 轮询 + 条件停止

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "taskStatus",
      "action": "ajax",
      "args": { "url": "/api/task/status" },
      "interval": 3000,
      "stopWhen": "${taskStatus.complete}"
    },
    { "type": "progress", "value": "${taskStatus.percent}" },
    { "type": "text", "text": "${taskStatus.message}" }
  ]
}
```

## 公式派生数据源

> 用 `formula`（与 `action` 互斥），无需发请求即可派生数据。

```json
{
  "type": "data-source",
  "name": "summary",
  "formula": "${{ total: users.length, active: users.filter(u => u.active).length }}"
}
```

## 多数据源并行

```json
{
  "type": "page",
  "body": [
    { "type": "data-source", "name": "stats", "action": "ajax", "args": { "url": "/api/stats" } },
    { "type": "data-source", "name": "recent", "action": "ajax", "args": { "url": "/api/recent" } },
    {
      "type": "grid",
      "columns": 2,
      "items": [
        { "body": [{ "type": "text", "text": "统计: ${stats.count}" }] },
        { "body": [{ "type": "text", "text": "最近: ${recent.items.length} 条" }] }
      ]
    }
  ]
}
```

## 响应式重跑：dependsOn / sendOn / silent

| 字段        | 作用                                                     |
| ----------- | -------------------------------------------------------- |
| `dependsOn` | 字符串数组，列出监听的 scope 路径；任一变化即重跑        |
| `sendOn`    | 表达式，求值真才真正发请求（用于"等上游有值再取"的级联） |
| `silent`    | `true` 时不显示加载态/UI 反馈（适合后台预取或次要数据）  |

级联取数（选中左侧项 → 右侧多个数据源并行重跑）：

```jsonc
{
  "type": "data-source",
  "name": "orderDetail",
  "dependsOn": ["mdFilter"], // mdFilter 变化即重跑
  "sendOn": "mdFilter?.orderId", // 直到有 orderId 才发请求
  "action": "ajax",
  "args": { "url": "/api/orders/get", "method": "get", "data": { "id": "${mdFilter?.orderId}" } },
}
```

静默预取（如左侧导航树，不希望抢占加载态）：

```jsonc
{
  "type": "data-source",
  "name": "deptTree",
  "silent": true,
  "action": "ajax",
  "args": { "url": "/api/dept/tree" },
}
```

## 挂载即触发一次（mount-marker 惯用法）

无天然依赖、只想"组件挂载时拉一次"时，给 `dependsOn` 塞一个**永远不会被写入的私有标记**作为触发器。标记名通常用双下划线包裹（如 `__budget_load__`、`__advq__`），它在首次求值时被视为已变化从而触发一次执行，之后无人写入便不再重跑。

```jsonc
{
  "type": "crud",
  "id": "budget-crud",
  "loadAction": {
    "action": "ajax",
    "dependsOn": ["__budget_load__"], // 仅挂载时触发一次
    "args": { "url": "/api/budget", "method": "get" },
  },
  "columns": [{ "name": "department", "label": "部门" }],
}
```

> 这是声明式取数里表达"一次性初始化"的约定写法；CRUD 的 `queryForm` 提交仍会通过 `query`/`filters` 绑定正常驱动后续 `loadAction`。

**关键点**：`data-source` 是非视觉的命名数据生产者，通过 `name` 发布值到 scope，其他组件（兄弟节点）通过 `${name.xxx}` 读取。
