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

## 视图集合状态（items 轴）

激活指针（`valueOwnership`/`valueStatePath`）之外，tab **集合本身**也有独立的所有权轴
`itemsOwnership`/`itemsStatePath`（closable/addable/draggable 管理语义的载体，
示例见 `design-patterns/tabs.md` §视图集合管理）：

| 值           | 说明                                       |
| ------------ | ------------------------------------------ |
| `local`      | 首次管理变更后集合归组件会话持有（缺省）   |
| `controlled` | 集合由 schema items 驱动，管理变更全部拒绝 |
| `scope`      | 管理变更写回 `itemsStatePath`，跨组件共享  |
