# 命名数据源与轮询

## 基础 Data Source

```json
{
  "type": "data-source",
  "name": "users",
  "action": {
    "action": "ajax",
    "args": { "url": "/api/users" }
  },
  "body": [{ "type": "text", "text": "用户数: ${users.length}" }]
}
```

## 轮询 + 条件停止

```json
{
  "type": "data-source",
  "name": "taskStatus",
  "action": {
    "action": "ajax",
    "args": { "url": "/api/task/status" }
  },
  "interval": 3000,
  "stopWhen": "${taskStatus.complete}",
  "body": [
    { "type": "progress", "value": "${taskStatus.percent}" },
    { "type": "text", "text": "${taskStatus.message}" }
  ]
}
```

## 公式派生数据源

```json
{
  "type": "data-source",
  "name": "summary",
  "action": {
    "action": "ajax",
    "args": { "url": "/api/dashboard" }
  },
  "body": [
    { "type": "text", "text": "总用户: ${summary.totalUsers}" },
    { "type": "text", "text": "活跃用户: ${summary.activeUsers}" },
    {
      "type": "text",
      "text": "活跃率: ${summary.activeUsers / summary.totalUsers * 100 | number:1}%"
    }
  ]
}
```

## 多数据源并行

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "stats",
      "action": { "action": "ajax", "args": { "url": "/api/stats" } }
    },
    {
      "type": "data-source",
      "name": "recent",
      "action": { "action": "ajax", "args": { "url": "/api/recent" } }
    },
    {
      "type": "grid",
      "columns": [
        { "body": [{ "type": "text", "text": "统计: ${stats.count}" }] },
        { "body": [{ "type": "text", "text": "最近: ${recent.items.length} 条" }] }
      ]
    }
  ]
}
```

**关键点**：`data-source` 是非视觉的命名数据生产者，通过 `name` 发布值到 scope，其他组件通过 `${name.xxx}` 读取。
