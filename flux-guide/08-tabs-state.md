# Tabs 状态管理

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录 Tabs 的状态管理机制。

---

## 非受控 (默认)

```json
{
  "type": "tabs",
  "items": [
    { "title": "Tab 1", "body": [{ "type": "text", "text": "内容 1" }] },
    { "title": "Tab 2", "body": [{ "type": "text", "text": "内容 2" }] }
  ]
}
```

## 受控 (scope 持久化)

```json
{
  "type": "tabs",
  "value": "${currentTab}",
  "valueOwnership": "scope",
  "valueStatePath": "currentTab",
  "items": [
    { "title": "列表", "body": [{ "type": "table" }] },
    { "title": "图表", "body": [{ "type": "chart" }] }
  ]
}
```

## Ownership 选项

| 值           | 说明                 |
| ------------ | -------------------- |
| `local`      | 组件内部管理（默认） |
| `controlled` | 外部受控             |
| `scope`      | 持久化到 scope 路径  |
