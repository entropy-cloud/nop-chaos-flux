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

**关键点**：`data-source` 是非视觉的命名数据生产者，通过 `name` 发布值到 scope，其他组件（兄弟节点）通过 `${name.xxx}` 读取。
