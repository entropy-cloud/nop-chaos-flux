# 事件与动作 (Action Algebra)

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录动作系统的跨组件机制。

---

## 简单动作

按钮/组件上的 `onClick` / `onChange` / `onSubmit` 字段：

```json
{
  "type": "button",
  "label": "删除",
  "onClick": {
    "action": "ajax",
    "args": { "url": "/api/delete/1", "method": "delete" },
    "then": { "action": "showToast", "args": { "level": "success", "message": "已删除" } },
    "onError": { "action": "showToast", "args": { "level": "error", "message": "删除失败" } }
  }
}
```

## Action Algebra 系统 (推荐)

任意组件的事件字段携带 `ActionSchema`，支持链式、并行、条件分支：

```json
{
  "onClick": {
    "action": "ajax",
    "args": { "url": "/api/save", "method": "post" },
    "then": {
      "action": "showToast",
      "args": { "level": "success", "message": "完成" },
      "then": { "action": "closeSurface" }
    },
    "onError": {
      "action": "showToast",
      "args": { "level": "error", "message": "${error.message}" }
    }
  }
}
```

## ActionShapeFields 完整字段

| 字段              | 类型                             | 说明                                   |
| ----------------- | -------------------------------- | -------------------------------------- |
| `action`          | `string`                         | 动作类型                               |
| `args`            | `Record<string, SchemaValue>`    | 动作参数                               |
| `when`            | `boolean \| string`              | 条件守卫                               |
| `then`            | `ActionSchema \| ActionSchema[]` | 成功后执行                             |
| `onError`         | `ActionSchema \| ActionSchema[]` | 失败后执行                             |
| `onSettled`       | `ActionSchema \| ActionSchema[]` | 完成后执行（无论成功失败）             |
| `parallel`        | `ActionSchema[]`                 | 并行执行                               |
| `timeout`         | `number`                         | 超时时间（ms）                         |
| `retry`           | `{ times, delay, strategy }`     | 重试配置                               |
| `debounce`        | `number`                         | 防抖时间（ms）                         |
| `control`         | `OperationControlConfig`         | 控制配置（含 retry/debounce/dedup 等） |
| `preventDefault`  | `boolean \| string`              | 阻止默认事件                           |
| `stopPropagation` | `boolean \| string`              | 阻止事件冒泡                           |
| `continueOnError` | `boolean`                        | 失败后继续执行                         |
| `targetId`        | `string`                         | 目标组件 ID                            |
| `componentId`     | `string`                         | 目标组件 ID（兼容）                    |
| `componentName`   | `string`                         | 目标组件名称                           |
| `dialogId`        | `string`                         | 目标弹窗 ID                            |
| `surfaceId`       | `string`                         | 目标 surface ID                        |

## 可用动作

| 动作类型                      | 说明             |
| ----------------------------- | ---------------- |
| `ajax`                        | 发起 HTTP 请求   |
| `submitForm`                  | 提交表单         |
| `openDialog` / `openDrawer`   | 打开弹窗/抽屉    |
| `closeDialog` / `closeDrawer` | 关闭弹窗/抽屉    |
| `closeSurface`                | 关闭任意 surface |
| `refreshTable`                | 刷新表格         |
| `refreshSource`               | 刷新数据源       |
| `setValue` / `setValues`      | 设置值           |
| `showToast`                   | Toast 通知       |
| `confirm`                     | 确认对话框       |
| `alert`                       | 警告对话框       |
| `navigate`                    | 页面跳转         |
| `component:method`            | 调用组件实例方法 |
| `namespace:method`            | 调用命名空间方法 |

## 事件数据流

```
ajax 输出 → 通过 result / prevResult 链式传递
dialog 输出 → ${result} (形态: {confirmed, value})
```
