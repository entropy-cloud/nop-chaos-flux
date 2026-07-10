# DynamicRenderer 动态加载

## 基本用法

远程加载 schema 并渲染：

```json
{
  "type": "dynamic-renderer",
  "loadAction": { "action": "ajax", "args": { "url": "/api/dynamic-form-schema" } },
  "body": [{ "type": "spinner" }]
}
```

- `loadAction` 响应应返回 Flux schema（`{ status: 0, data: { type: 'form', body: [...] } }`）
- `body` 是加载前/无自动加载时的 fallback 内容
- `autoLoad` 默认 `true`（挂载时自动触发）

## 手动刷新

```json
{
  "type": "dynamic-renderer",
  "componentId": "dynamicArea",
  "autoLoad": true,
  "loadAction": { "action": "ajax", "args": { "url": "/api/dynamic-content?section=${section}" } },
  "body": [{ "type": "spinner" }]
}
```

调用 `component:refresh` 重新加载：

```json
{
  "type": "button",
  "label": "刷新",
  "onClick": { "action": "component:refresh", "componentId": "dynamicArea" }
}
```

## CRUD 动态列

```json
{
  "type": "dynamic-renderer",
  "componentId": "dynamicColumns",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/api/dynamic-columns?table=${tableName}"
    }
  }
}
```

## 字段参考

| 字段         | 类型               | 说明                        |
| ------------ | ------------------ | --------------------------- |
| `loadAction` | `ActionSchemaLike` | 加载动态 schema 的动作      |
| `body`       | `SchemaInput`      | 加载前的 fallback 内容      |
| `autoLoad`   | `boolean`          | 挂载时自动触发（默认 true） |

组件能力：`refresh`（重新评估 loadAction 并重新加载）。
