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

> `recurse` 自身没有 `body`。它复用最近 enclosing `loop` 的 `body` 模板，以新的 `items` 再次实例化（词法递归，见 `docs/components/recurse/design.md` §6）。正确形态：

```json
{
  "type": "loop",
  "items": "${treeData}",
  "itemName": "node",
  "body": [
    { "type": "text", "text": "${node.name}" },
    {
      "type": "fragment",
      "when": "${node.children && node.children.length > 0}",
      "body": [{ "type": "recurse", "items": "${node.children}" }]
    }
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

## Keyboard Bindings (键盘绑定)

`keyboard` 是不可见 logic 渲染件（`reaction` 同族，恒渲染 null）：把键盘序列（单键位组合或空格分隔 chord 序列）绑定到动作派发。任意节点可挂——page body 挂即页面级，子树挂即局部级。

```jsonc
{
  "type": "keyboard",
  "chordTimeout": 1000,
  "bindings": [
    { "keys": "mod+shift+s", "action": { "action": "submitForm" } },
    { "keys": "g o", "action": { "action": "navigate", "args": { "url": "/orders" } } },
    {
      "keys": "g u",
      "when": "flags.canEdit",
      "action": { "action": "navigate", "args": { "url": "/users" } },
    },
    {
      "keys": "mod+enter",
      "allowInInput": true,
      "action": { "action": "showToast", "args": { "level": "success", "message": "已保存" } },
    },
  ],
  "onTrigger": { "action": "setValue", "args": { "path": "lastKeys", "value": "${keys}" } },
}
```

**绑定字段**：

| 字段             | 说明                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `keys`           | 单键位组合 `"mod+shift+s"` 或空格分隔 chord 序列 `"g o"`；每 token 为 `[(mod\|ctrl\|shift\|alt)+]key` |
| `when`           | 裸布尔表达式（无 `${}`），按键时对节点 scope 求值，falsy 不触发（`checkableWhen` 同型）               |
| `allowInInput`   | 缺省 false——焦点在 input/textarea/select/contenteditable 内不触发；true 豁免                          |
| `preventDefault` | 缺省 true——命中后阻止浏览器默认行为                                                                   |
| `action`         | 静态派发轨（`ActionSchema \| ActionSchema[]`），命中时派发                                            |

**匹配语义**：

- **chord 时序**：首键后 `chordTimeout` 毫秒（缺省 1000）内续键才推进序列；失配或超时复位，失配键按 idle 重新求值（重叠序列可启动）。
- **最长匹配**：短绑定 `g` 与长序列 `g o` 并存时——按 `g` 等待，窗口内续 `o` 派发长序列；超时兜底派发短绑定。
- **输入优先**：焦点在可编辑元素内不触发（`allowInInput: true` 豁免）。
- **内建优先**：更早注册的内建键位（palette hotkey、kanban undo 等）已消费的按键（defaultPrevented）不再触发绑定；勿在内建已占用键位上声明绑定。
- **冲突**：同节点内归一化序列重复 → 登记序（数组序）优先 + dev warn 一次。
- **surface 路由**：dialog/drawer/sheet 打开期间，页面级绑定暂停；surface 内声明的绑定保持活跃，栈复位自动恢复。
- **派发**：先 `binding.action`（payload `{ keys, index, nativeEvent }` 可作 args 模板绑定），再 `onTrigger` 事件同 payload；派发失败 dev warn，监听不解绑。

**J/K 指针组合**（与 `optionRow` 组合表达键盘高亮指针）：

```jsonc
{
  "type": "keyboard",
  "bindings": [
    {
      "keys": "j",
      "action": {
        "action": "setValue",
        "args": { "path": "cursor", "value": "${cursor < 2 ? cursor + 1 : cursor}" },
      },
    },
    {
      "keys": "k",
      "action": {
        "action": "setValue",
        "args": { "path": "cursor", "value": "${cursor > 0 ? cursor - 1 : cursor}" },
      },
    },
  ],
}
// 同树下的 list/table 用 optionRow 把指针投影到行选中态：
// "optionRow": { "value": "${cursor === 0 ? \"a\" : cursor === 1 ? \"b\" : \"c\"}" }
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
