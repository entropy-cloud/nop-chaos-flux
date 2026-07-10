# 数据流

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录跨组件的数据流机制。

---

## 数据域 (ScopeRef)

```
Page {data: {x:1}}              ← data 字段（请求走 data-source 兄弟节点）
  └── Form {name: "${x}"}       ← 继承 Page 的数据
      └── InputText              ← 继承 Form 的数据
```

子组件自动继承父组件词法作用域。同名变量子遮蔽父。

## 数据来源

| 方式           | 适用组件                   | 说明                                       |
| -------------- | -------------------------- | ------------------------------------------ |
| `data`         | page, form, dialog, drawer | 静态初始数据                               |
| `initAction`   | form                       | 表单初始化请求                             |
| `submitAction` | form                       | 提交 API                                   |
| `source`       | table, crud                | 数据源（crud 消费 `{items,total}`）        |
| `loadAction`   | crud                       | CRUD 自带取数编排入口（接收分页/查询绑定） |
| `data-source`  | data-source                | 命名数据源节点（请求下沉，推荐）           |

> CRUD **没有** `api` 字段。Page/Dialog 无请求字段，取数一律下沉 `data-source` 节点。选项类控件（select 等）用 `options`（非 `source`）。

## 组件间通信

```json
[
  {
    "type": "data-source",
    "id": "users-src",
    "name": "pagedUsers",
    "action": "ajax",
    "args": { "url": "/api/users" }
  },
  {
    "type": "crud",
    "id": "crud1",
    "source": "${pagedUsers}",
    "onRefresh": { "action": "refreshSource", "targetId": "pagedUsers" }
  },
  {
    "type": "form",
    "id": "form1",
    "body": [],
    "onSubmitSuccess": { "action": "refreshSource", "targetId": "pagedUsers" }
  },
  {
    "type": "button",
    "label": "刷新",
    "onClick": { "action": "component:refresh", "componentId": "crud1" }
  },
  {
    "type": "button",
    "label": "提交",
    "onClick": { "action": "component:submit", "componentId": "form1" }
  }
]
```

## Data Source (命名数据源)

> `data-source` 节点自身不渲染；`action` 是字符串，`args` 同级。结果经 `name` 发布，由兄弟节点消费。

详细用法见 `design-patterns/data-source.md`。

```jsonc
// 命名 data-source 节点
{
  "type": "data-source",
  "name": "countries",
  "action": "ajax",
  "args": { "url": "/api/countries" },
  "mergeToScope": true
}

// 轮询 + 条件停止
{
  "type": "data-source",
  "name": "status",
  "action": "ajax",
  "args": { "url": "/api/status" },
  "interval": 3000,
  "stopWhen": "${status.complete}"
}

// 公式派生（formula，与 action 互斥）
{
  "type": "data-source",
  "name": "summary",
  "formula": "${{ total: users.length, active: users.filter(u => u.active).length }}"
}

// 条件发送
{
  "type": "data-source",
  "name": "details",
  "action": "ajax",
  "args": { "url": "/api/details?id=${id}" },
  "sendOn": "id"
}
```

## Data Source 合并策略

| 策略      | 说明              |
| --------- | ----------------- |
| `replace` | 替换（默认）      |
| `append`  | 追加              |
| `prepend` | 前置              |
| `merge`   | 合并              |
| `upsert`  | 按 key 更新或插入 |

```json
{
  "type": "data-source",
  "name": "list",
  "action": "ajax",
  "args": { "url": "/api/more" },
  "mergeStrategy": "append",
  "mergeKey": "id"
}
```
