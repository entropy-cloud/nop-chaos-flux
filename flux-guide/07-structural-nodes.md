# 结构节点与组件方法

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录结构节点的跨组件机制。

---

## Fragment (分组)

```json
{
  "type": "fragment",
  "when": "${showAdvanced}",
  "body": [{ "type": "input-text", "name": "adminCode", "label": "管理员代码" }]
}
```

> `when=false` 的子树整体不激活、不参与生命周期。

## Loop (循环)

```json
{
  "type": "loop",
  "items": "${users}",
  "itemName": "user",
  "indexName": "idx",
  "body": [{ "type": "text", "text": "${idx + 1}. ${user.name}" }],
  "empty": [{ "type": "empty", "description": "暂无数据" }]
}
```

## Recurse (递归)

```json
{
  "type": "recurse",
  "items": "${treeData}",
  "body": [
    { "type": "text", "text": "${item.name}" },
    { "type": "recurse", "items": "${item.children}" }
  ]
}
```

## Reaction (响应式监听)

```json
{
  "type": "reaction",
  "watch": "${form.total}",
  "when": "${form.total > 1000}",
  "actions": { "action": "showToast", "args": { "level": "warning", "message": "金额超过 1000" } }
}
```

---

## 组件实例方法

通过 `component:method` 动作调用组件实例方法（目标用顶层 `componentId`，不是 `args._target`）：

| 方法                 | 说明                        |
| -------------------- | --------------------------- |
| `component:submit`   | 提交表单                    |
| `component:reset`    | 重置表单                    |
| `component:setValue` | 设置值                      |
| `component:getValue` | 获取值                      |
| `component:refresh`  | 刷新组件                    |
| `component:loadMore` | 加载更多（infinite-scroll） |

```json
[
  { "type": "form", "id": "myForm", "body": [] },
  {
    "type": "button",
    "label": "提交",
    "onClick": { "action": "component:submit", "componentId": "myForm" }
  }
]
```
