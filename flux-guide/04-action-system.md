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

| 字段              | 类型                             | 说明                                                                |
| ----------------- | -------------------------------- | ------------------------------------------------------------------- |
| `action`          | `string`                         | 动作类型                                                            |
| `args`            | `Record<string, SchemaValue>`    | 动作参数                                                            |
| `when`            | `boolean \| string`              | 条件守卫                                                            |
| `then`            | `ActionSchema \| ActionSchema[]` | 成功后执行                                                          |
| `onError`         | `ActionSchema \| ActionSchema[]` | 失败后执行                                                          |
| `onSettled`       | `ActionSchema \| ActionSchema[]` | 完成后执行（无论成功失败）                                          |
| `parallel`        | `ActionSchema[]`                 | 并行执行                                                            |
| `timeout`         | `number`                         | 超时时间（ms）                                                      |
| `retry`           | `{ times, delay, strategy }`     | 重试配置                                                            |
| `debounce`        | `number`                         | 防抖时间（ms）                                                      |
| `control`         | `OperationControlConfig`         | 控制配置（含 retry/debounce/dedup 等）                              |
| `messages`        | `MessagesConfig`                 | 内置 Toast 消息（`{ success, failed }`），用于 ajax/submit 自动反馈 |
| `confirmText`     | `string`                         | 执行前确认提示文案                                                  |
| `preventDefault`  | `boolean \| string`              | 阻止默认事件                                                        |
| `stopPropagation` | `boolean \| string`              | 阻止事件冒泡                                                        |
| `continueOnError` | `boolean`                        | 失败后继续执行                                                      |
| `targetId`        | `string`                         | 目标组件 ID                                                         |
| `componentId`     | `string`                         | 目标组件 ID（兼容）                                                 |
| `componentName`   | `string`                         | 目标组件名称                                                        |
| `dialogId`        | `string`                         | 目标弹窗 ID                                                         |
| `surfaceId`       | `string`                         | 目标 surface ID                                                     |

## 可用动作

| 动作类型                      | 说明                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `ajax`                        | 发起 HTTP 请求                                                                            |
| `submitForm`                  | 提交表单                                                                                  |
| `openDialog` / `openDrawer`   | 打开弹窗/抽屉（args 支持 `onClose`/`onSubmitSuccess`/`onSubmitError` lifecycle callback） |
| `closeDialog` / `closeDrawer` | 关闭弹窗/抽屉                                                                             |
| `closeSurface`                | 关闭任意 surface                                                                          |
| `refreshTable`                | 刷新表格（bump `ctx.page.refreshTick`）                                                   |
| `refreshSource`               | 刷新指定 name 的 data-source（需要 `targetId`）                                           |
| `refreshNearest`              | 沿 scope 链向上找最近的 CRUD / data-source / tree 刷新（不需要 id/name）                  |
| `setValue` / `setValues`      | 设置值                                                                                    |
| `showToast`                   | Toast 通知                                                                                |
| `confirm`                     | 确认对话框                                                                                |
| `alert`                       | 警告对话框                                                                                |
| `navigate`                    | 页面跳转                                                                                  |
| `component:method`            | 调用组件实例方法                                                                          |
| `namespace:method`            | 调用命名空间方法                                                                          |

## 目标标识字段

| 字段            | 适用场景                                                    | 示例                                                              |
| --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `componentId`   | 调用组件实例方法（`component:submit`、`component:refresh`） | `{ "action": "component:submit", "componentId": "myForm" }`       |
| `targetId`      | 刷新数据源（`refreshSource`）或指定动作目标                 | `{ "action": "refreshSource", "targetId": "pagedUsers" }`         |
| `componentName` | 按组件名称查找（多个同类型组件时使用）                      | `{ "action": "component:refresh", "componentName": "userTable" }` |

> **不需要目标标识**的场景：`refreshNearest` 沿 scope 链自动查找最近的 CRUD / data-source / tree，适用于"不知道外层组件 id/name"的场景（如 dialog 提交后刷新外部列表）。详见 `design-patterns/page-dialog-drawer.md` 与 `docs/architecture/surface-lifecycle-callbacks.md`。

## `refreshNearest` 参数

```jsonc
{
  "action": "refreshNearest",
  "args": {
    "targetType": "auto", // 'auto' | 'crud' | 'tree' | 'data-source'，默认 'auto'
    "notFound": "silent", // 'silent' | 'error'，默认 'silent'
  },
}
```

| 字段         | 类型                                          | 默认       | 说明                                                                                                        |
| ------------ | --------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `targetType` | `'auto' \| 'crud' \| 'tree' \| 'data-source'` | `'auto'`   | 限定查找目标类型。`'auto'` 不区分类型按"最近"匹配；`'crud'` / `'tree'` / `'data-source'` 跳过其他类型       |
| `notFound`   | `'silent' \| 'error'`                         | `'silent'` | 找不到目标时：`'silent'` 返回 `{ ok: true, data: { found: false } }`；`'error'` 返回 `{ ok: false, error }` |

`refreshNearest` 从当前作用域开始沿父级作用域链向上查找：

- 在每一层作用域的 component registry 中查 CRUD / tree（要求组件注册时携带 `scope` 信息；详见 `docs/architecture/surface-lifecycle-callbacks.md` §Finding Algorithm）
- 在每一层作用域的 source registry 中查 data-source
- 命中第一个匹配后调用其 refresh（CRUD/tree 走 component capability，data-source 走 `refreshDataSource`）

## `openDialog` / `openDrawer` Lifecycle Callback 参数

`openDialog` / `openDrawer` 的 `args` 除了 `title` / `size` / `data` / `body` 等常规字段外，还支持三个 lifecycle callback 字段（仅对 action-style 生效；declarative `type: 'dialog'` / `type: 'drawer'` 不走此机制）：

| 字段              | 触发时机                                               | `$formData` | `$result`  | 典型用途                                              |
| ----------------- | ------------------------------------------------------ | ----------- | ---------- | ----------------------------------------------------- |
| `onClose`         | surface 被关闭时（任意路径）                           | ✗           | ✗          | 关闭后刷新外部列表（`refreshNearest`）、清理状态      |
| `onSubmitSuccess` | surface body 内 `submitScope: 'surface'` form 提交成功 | ✓           | ✓ response | 提交后刷新外部列表、导航、上报                        |
| `onSubmitError`   | surface body 内 `submitScope: 'surface'` form 提交失败 | ✓           | ✓ error    | 错误恢复（字段重置、上报）—— **不替代默认错误 toast** |

> **关键约束**：submit callback 只对 form schema 上**显式标了 `submitScope: 'surface'`** 的 form 触发。多 form dialog 场景必须在主提交 form 上声明。详见 `design-patterns/page-dialog-drawer.md` §6.4。

callback 在 **owner ctx** 执行（不是 surface child scope），由 surface runtime 主动触发。完整规则（owner context reconstruction、triggering order、hook error semantics）见 `docs/architecture/surface-lifecycle-callbacks.md`。

## 事件数据流

```
ajax 输出 → 通过 result / prevResult 链式传递
dialog 输出 → ${result} (形态: {confirmed, value})
```

                            
