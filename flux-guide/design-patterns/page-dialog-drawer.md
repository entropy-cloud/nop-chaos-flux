# Page / Dialog / Drawer

> `page` 是页面根容器，`dialog` 和 `drawer` 是浮层容器。三者都支持 `body` region 和 `data` 数据域。
>
> 所有字段定义见 `packages/flux-renderers-basic/src/schemas.ts`。

---

## 1. Page 页面根容器

```jsonc
{
  "type": "page",
  "title": "用户管理",
  "subTitle": "管理系统中的所有用户",
  "body": [{ "type": "text", "text": "欢迎使用用户管理系统" }],
  "header": [{ "type": "button", "label": "设置" }],
  "footer": [{ "type": "text", "text": "© 2024 Company" }],
}
```

**Page 区域**：

| 区域     | 说明                              |
| -------- | --------------------------------- |
| `body`   | 主内容区                          |
| `header` | 顶部栏                            |
| `footer` | 底部栏                            |
| `aside`  | 侧边栏（需 `asidePosition` 配合） |

**Page 属性**：

| 属性               | 类型               | 说明                            |
| ------------------ | ------------------ | ------------------------------- |
| `title`            | `string`           | 页面标题                        |
| `subTitle`         | `string`           | 副标题                          |
| `remark`           | `string`           | 标题旁 Tooltip 提示             |
| `data`             | `object`           | 静态初始数据                    |
| `statusPath`       | `string`           | 状态数据路径                    |
| `asidePosition`    | `string`           | 侧边栏位置：`left` / `right`    |
| `asideResizable`   | `boolean`          | 侧边栏可拖拽调整宽度            |
| `asideMinWidth`    | `number \| string` | 侧边栏最小宽度（默认 200px）    |
| `asideMaxWidth`    | `number \| string` | 侧边栏最大宽度（默认 600px）    |
| `asideSticky`      | `boolean`          | 侧边栏粘性定位（不随内容滚动）  |
| `asideClassName`   | `string`           | 侧边栏额外 CSS 类               |
| `bodyClassName`    | `string`           | body 区域额外 CSS 类            |
| `headerClassName`  | `string`           | header 区域额外 CSS 类          |
| `footerClassName`  | `string`           | footer 区域额外 CSS 类          |
| `toolbarClassName` | `string`           | header slot 内容区域额外 CSS 类 |

> **命名注意**：`headerClassName` 样式化标题栏（title + subTitle + remark），`header` slot 内容渲染在 `data-slot="page-toolbar"` 区域，由 `toolbarClassName` 样式化。

---

## 2. Page 带侧栏（aside）

```jsonc
{
  "type": "page",
  "title": "用户管理",
  "asidePosition": "left",
  "asideResizable": true,
  "asideSticky": true,
  "aside": [
    { "type": "tree", "source": "/r/departments", "onSelect": { "action": "loadData", "args": { "deptId": "${event.value.id}" } } }
  ],
  "header": [
    { "type": "button", "label": "新建用户", "onClick": { "action": "dialog", "args": { "schema": { "type": "form", "body": [...] } } } }
  ],
  "body": [
    { "type": "table", "source": "/r/users?deptId=${scope.deptId}", "columns": [...] }
  ]
}
```

**Aside 行为**：

| 场景     | 行为                                      |
| -------- | ----------------------------------------- |
| 桌面端   | 内联渲染 aside，可拖拽调整宽度            |
| 移动端   | aside 折叠为 Sheet 滑出，点击菜单按钮触发 |
| 空 aside | 自动折叠，不渲染占位列                    |

---

## 3. Page 带数据请求

```jsonc
{
  "type": "page",
  "title": "仪表盘",
  "body": [
    {
      "type": "data-source",
      "name": "stats",
      "action": "ajax",
      "args": { "url": "/api/dashboard" },
    },
    { "type": "text", "text": "用户数: ${stats.userCount}" },
  ],
}
```

---

## 4. Dialog 弹窗

```jsonc
{
  "type": "button",
  "label": "打开弹窗",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "编辑用户",
      "size": "lg",
      "data": { "id": "${id}", "name": "${name}" },
      "body": {
        "type": "form",
        "id": "editForm",
        "submitAction": {
          "action": "ajax",
          "args": { "url": "/api/users/${id}", "method": "put" },
        },
        "onSubmitSuccess": { "action": "closeSurface" },
        "body": [{ "type": "input-text", "name": "name", "label": "姓名" }],
      },
    },
  },
}
```

Dialog/Drawer 默认继承触发位置的 scope（即弹窗内可以直接读取父级变量）。如果想切断继承、让弹窗只看到 `data` 中显式传入的值，可以设置 `isolate: true`：

```jsonc
{
  "type": "button",
  "label": "隔离弹窗",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "隔离弹窗",
      "isolate": true,
      "data": { "userId": "${id}" },
      "body": [{ "type": "text", "text": "只能看到 data 中传入的值，${parentKey} 读不到" }],
    },
  },
}
```

**Dialog 属性**：

| 属性      | 类型          | 说明                                                             |
| --------- | ------------- | ---------------------------------------------------------------- |
| `title`   | `string`      | 弹窗标题                                                         |
| `size`    | `string`      | 弹窗大小：`xs` / `sm` / `md` / `lg` / `xl` / `full`              |
| `data`    | `object`      | 传入弹窗的初始数据                                               |
| `isolate` | `boolean`     | 切断父 scope 继承，弹窗只读 own data；默认 `false`，声明式也支持 |
| `body`    | `SchemaInput` | 弹窗内容                                                         |

---

## 5. Drawer 抽屉

```jsonc
{
  "type": "button",
  "label": "查看详情",
  "onClick": {
    "action": "openDrawer",
    "args": {
      "title": "用户详情",
      "side": "right",
      "size": "md",
      "data": { "id": "${id}" },
      "body": {
        "type": "form",
        "id": "detailForm",
        "body": [{ "type": "input-text", "name": "name", "label": "姓名", "readOnly": true }],
      },
    },
  },
}
```

Drawer 的 `data` / `isolate` 语义与 Dialog 相同，`isolate: true` 同样切断父 scope 继承。

**Drawer 额外属性**：

| 属性        | 类型      | 说明                                          |
| ----------- | --------- | --------------------------------------------- |
| `side`      | `string`  | 弹出位置：`left` / `right` / `top` / `bottom` |
| `resizable` | `boolean` | 可拖拽调整宽度                                |

---

## 6. 关闭 Surface 与 Lifecycle Callback

弹窗/抽屉打开后，通过 `closeSurface` 关闭：

```jsonc
{
  "type": "button",
  "label": "取消",
  "onClick": { "action": "closeSurface" },
}
```

### 6.1 Lifecycle Callback（owner 侧响应 surface 内部事件）

`openDialog` / `openDrawer` 的 `args` 支持三个 lifecycle callback 字段，让 owner 侧响应 surface 内部事件：

| 字段              | 触发时机                                                                | `$formData` | `$result`       | 典型用途                                                                                      |
| ----------------- | ----------------------------------------------------------------------- | ----------- | --------------- | --------------------------------------------------------------------------------------------- |
| `onClose`         | surface 被关闭时（手动关闭、`closeSurface` action、ESC、outside click） | ✗           | ✗               | 关闭后刷新列表、清理临时状态                                                                  |
| `onSubmitSuccess` | surface body 内**标了 `submitScope: 'surface'`** 的 form 提交成功后     | ✓           | ✓ ajax response | 提交成功后刷新列表、导航、上报                                                                |
| `onSubmitError`   | surface body 内**标了 `submitScope: 'surface'`** 的 form 提交失败后     | ✓           | ✓ error payload | 自定义错误恢复（重置字段、上报埋点）—— **不用于错误 toast**（ajax 默认行为已 toast 后端 msg） |

> **关键约束（容易踩坑）**：
>
> 1. **callback 在 owner ctx 执行**（不是 surface child scope）——`refreshNearest` 从 owner scope 开始向上查找，能命中外层 CRUD；`setValue` 写到 owner scope。
> 2. **submit callback 只对 `submitScope: 'surface'` 的 form 触发**——多 form dialog 场景必须在主提交 form 上显式声明 `submitScope: 'surface'`，否则即使配了 `args.onSubmitSuccess` 也不会触发。详见 §6.4。
> 3. **`onClose` 是 fire-and-forget 异步执行**——`closeSurface` 立即关闭 surface（同步），`onClose` callback 异步执行不阻塞 UI；hook 内 action 抛错只 `console.warn`，不影响 close 主流程。
> 4. **declarative dialog/drawer 不走此机制**——`type: 'dialog'` / `type: 'drawer'` 节点的 form submit 不触发 `args.onSubmitSuccess`；declarative surface 用自己的 function-based `onClose` 路径。本节机制（含 `closeOnSubmit`）仅适用于 action-style `openDialog` / `openDrawer`。

完整规则（owner context reconstruction、triggering order、与 ajax 默认通知的关系）见 `docs/architecture/surface-lifecycle-callbacks.md`。

### 6.2 提交后刷新外部列表：用 `refreshNearest` + `closeOnSubmit`

dialog 内提交成功后：**关闭 dialog 用 `closeOnSubmit`（推荐）**，刷新外部列表用 `refreshNearest`（不需要知道外层 CRUD 的 id/name）。

**`closeOnSubmit`（AMIS 语义）**：`openDialog` / `openDrawer` 的 `args.closeOnSubmit: true` 时，surface 内 `submitScope: 'surface'` 的 form 提交成功后（按钮点击或 Enter 回车都生效，两条路径统一经过 submit:success hook）先执行 `args.onSubmitSuccess`，再自动关闭 surface。提交失败（submit:error）不关闭。**推荐用它取代手写 `submitForm.then: closeSurface`**——后者只对按钮点击生效，Enter 回车提交不会经过按钮的 onClick。

> **为什么不用 `submitForm.then: closeSurface` 了？** flux 表单输入框内按 Enter 会触发 form 内置提交（`ownedForm.submit()`），不经过提交按钮的 onClick，因此按钮 then 链里的 `closeSurface` 不会执行——产生"提交成功但 dialog 不关闭"的体验落差。`closeOnSubmit` 把"提交成功 → 关闭"绑定到 form 提交流程本身（与 AMIS `Dialog.closeOnSubmit` 默认 true 同语义），Enter 与按钮行为一致。

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": {
      "type": "form",
      "submitScope": "surface",
      "submitAction": { "action": "ajax", "args": { "url": "/api/users", "method": "post" } },
      "body": [
        /* ... */
      ],
    },
    "onSubmitSuccess": { "action": "refreshNearest" },
    "closeOnSubmit": true,
  },
}
```

```jsonc
// 提交按钮只触发提交，不负责关闭
{
  "label": "提交",
  "level": "primary",
  "onClick": { "action": "submitForm" },
}
```

完整执行顺序：

```
form.submitAction (ajax)
  ↓
form lifecycle handlers (form schema 的 onSubmitSuccess)
  ↓
surface submit hook (args.onSubmitSuccess → refreshNearest，owner ctx，dialog 保持打开)
  ↓
runtime 自动 closeSurface（closeOnSubmit，关闭 dialog）
```

> **兼容**：`submitForm.then: closeSurface` 仍可用（显式编排风格），`closeOnSubmit` 打开时二者叠加为幂等关闭（closeSurface 对已关闭 surface 是 no-op），无副作用。

`refreshNearest` 从 callback 执行的 owner scope 开始沿 `scope.parent` 链向上查找，命中第一个具备 `refresh` capability 的 CRUD / tree 或第一个 data-source，调用其 refresh。

**关于 dialog actions 的 submit 按钮**：声明了 `submitScope: 'surface'` 的 form 在 mount 时会自动注册到当前 surface。dialog 或 page 的 footer actions 中的 submit 按钮可以用 `submitForm` 零参数触发提交：

```jsonc
{
  "type": "page",
  "body": {
    "type": "form",
    "submitScope": "surface",
    "submitAction": { "action": "ajax", "args": { "url": "/api/users", "method": "post" } },
    "body": [
      /* ... */
    ],
  },
  "actions": [
    { "label": "取消", "actionType": "close" },
    {
      "label": "提交",
      "level": "primary",
      "actionType": "submit",
      "onClick": {
        "action": "submitForm",
        "then": { "action": "closeSurface" },
      },
    },
  ],
}
```

`submitForm` 的查找优先级：

1. `ctx.form` — 按钮在 form body 内（`FormContext` 内）时直接使用。
2. surface form — 按钮在 dialog/page footer 时，自动从 surface 查找注册了 `submitScope: 'surface'` 的 form。
3. `componentId` — 显式指定 id 时从 component registry 解析（先匹配 `handle.id`，再匹配 `handle.name`）。

这样 dialog footer 的 submit 按钮无需传 `componentId` 或 `componentName`。

可选 `args`：

| 字段         | 类型                                                    | 默认       | 说明                                                                                                        |
| ------------ | ------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `targetType` | `'auto' \| 'crud' \| 'tree' \| 'data-source' \| 'form'` | `'auto'`   | 限定目标类型；`'auto'` 不区分类型按最近匹配                                                                 |
| `notFound`   | `'silent' \| 'error'`                                   | `'silent'` | 找不到目标时：`'silent'` 返回 `{ ok: true, data: { found: false } }`；`'error'` 返回 `{ ok: false, error }` |

如果明确知道外层组件 id/name，也可以用 `component:refresh`（等价但需要显式 id）：

```jsonc
{ "action": "component:refresh", "componentId": "userCrud" }
```

### 6.3 不推荐：依赖 `closeSurface then refreshSource`

下面的写法在某些场景能工作（declarative dialog + 共享 page scope），但对 action-style `openDialog` 不可靠（`then` 不切换 ctx，且 `refreshSource` 的 scope 精确匹配可能找不到 owner 注册的 source）：

```jsonc
// ⚠️ 不推荐：依赖 then 链的隐式 scope 行为
{
  "action": "closeSurface",
  "then": { "action": "refreshSource", "targetId": "listData" },
}
```

推荐改用 §6.2 的 lifecycle callback + `refreshNearest`，语义明确且不依赖隐式行为。

### 6.4 多 form dialog：用 `submitScope` 区分主提交 form

dialog 内可能有多个 form（搜索 form + 编辑 form / 主 form + 子 form / 多 step form）。默认情况下，所有 form 的 submit 都不触发 surface callback（`submitScope: 'local'` 是默认值）。必须在主提交 form 上显式声明 `submitScope: 'surface'`：

```jsonc
{
  "action": "openDialog",
  "args": {
    "body": [
      {
        // 搜索 form — 不标 submitScope，默认 'local'，submit 不触发 dialog callback
        "type": "form",
        "submitAction": { "action": "ajax", "args": { "url": "/api/search" } },
        "body": [
          /* ... */
        ],
      },
      {
        // 主编辑 form — 显式标 submitScope: 'surface'，submit 触发 dialog callback
        "type": "form",
        "submitScope": "surface",
        "submitAction": { "action": "ajax", "args": { "url": "/api/save" } },
        "body": [
          /* ... */
        ],
      },
    ],
    "onSubmitSuccess": { "action": "refreshNearest" },
  },
}
```

> **注意**：主编辑 form 的提交按钮配合 `closeOnSubmit: true`（推荐）或 `submitForm.then` 关闭 dialog：
>
> ```jsonc
> "onClick": {
>   "action": "submitForm"
> }
> ```
>
> `closeOnSubmit: true` 时提交成功（按钮或 Enter）自动关闭，推荐；手写 `submitForm.then: closeSurface` 亦可（Enter 提交不生效），详见 §6.2。

> **注意**：当前 flux 没有 schema-level 校验"同一 surface 内最多一个 `submitScope: 'surface'` form"。如果多个 form 都标了 `'surface'`，它们的 submit 都会触发同一个 callback。建议业务侧自行保证只有一个主 form。

完整多 form 场景示例见 `flux-guide/examples/crud-with-dialog-and-search-form.md`。

---

## 7. page vs dialog vs drawer 选型

| 特性     | page          | dialog             | drawer           |
| -------- | ------------- | ------------------ | ---------------- |
| 位置     | 全屏          | 居中浮层           | 侧边浮层         |
| 遮罩     | 无            | 有                 | 有               |
| 关闭方式 | 导航          | `closeSurface`     | `closeSurface`   |
| 适用场景 | 主页面        | 表单编辑、确认操作 | 详情查看、长表单 |
| 数据传递 | `data` 初始化 | `args.data` 传入   | `args.data` 传入 |

---

## 8. Command Palette 命令面板（⌘K）

`command-palette` 是键盘优先的命令面板 surface（注册于 `@nop-chaos/flux-renderers-basic`，dialog/drawer 同族）：搜索过滤、分组清单、键盘选择（↑↓/Enter/Esc，cmdk 内建）、命令执行后**面板即关**（先关后派发）。空查询/无命中显示空态文案，不抛错。

```jsonc
{
  "type": "command-palette",
  "id": "appPalette",
  "testid": "app-palette",
  "placeholder": "输入命令或搜索…",
  "emptyText": "没有匹配的命令",
  "groups": [
    {
      "label": "导航",
      "items": [
        {
          "id": "go-issues",
          "label": "前往问题列表",
          "shortcut": "G I",
          "action": { "action": "navigate", "args": { "url": "/issues" } },
        },
        {
          "id": "go-board",
          "label": "前往看板",
          "action": { "action": "navigate", "args": { "url": "/board" } },
        },
      ],
    },
  ],
  "items": [
    {
      "id": "new-issue",
      "label": "新建问题",
      "group": "操作",
      "icon": "plus",
      "action": { "action": "openDialog", "args": { "title": "新建问题", "body": [] } },
    },
  ],
  "onCommand": [{ "action": "setValue", "args": { "path": "lastCommand", "value": "${id}" } }],
}
```

**命令执行双轨**：

| 轨道   | 声明位置                 | 触发时机                                                                                  |
| ------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| 事件轨 | palette `onCommand` 事件 | 每次执行恒派发，payload `{ id, item, groupId }`（args 模板可解析 `${id}`/`${item.href}`） |
| 静态轨 | 条目 `action`            | 执行该条目时派发（`ActionSchema \| ActionSchema[]`），先于 `onCommand`                    |

两轨可并存（作者显式组合）。执行序列：**先关面板（onClose 派发）→ 条目 `action` 派发 → `onCommand` 派发**；派发失败走既有 action 错误约定，面板不回滚。

**动态条目轨**：`source` 接受 `SourceSchema`（自动取数）或表达式/数组，就绪条目追加在静态段之后；加载中/失败/为空均落空态：

```jsonc
// 形态一：表达式引用页面内数据（如 data-source 结果）
{ "type": "command-palette", "source": "${remoteCommands}" }

// 形态二：SourceSchema 自动取数
{
  "type": "command-palette",
  "source": { "type": "source", "action": "ajax", "args": { "url": "/api/commands" } }
}
```

**开合接线**：

- 未声明 `open`：`defaultOpen` + 句柄 `component:open` / `component:close` / `component:toggle`（`componentId` 寻址，外控时 no-op `{ok:true, skipped:true}`）。
- 声明 `open`（受控）：外部值优先，句柄与 hotkey 均 no-op；简单路径表达式（`"open": "${paletteOpen}"`）在用户关闭（Esc/外部点击/执行）时自动写回 `false`，幂等 `setValue(paletteOpen, true)` 可重开（dialog plan-459 同语义）。
- `hotkey`：单键位呼出（如 `"mod+k"`，`mod` = meta‖ctrl），renderer 局部监听、卸载清理；不做键位冲突仲裁——全局键位注册归 G-B2。
- `statusPath`：向 scope 发布 `{ id, kind: 'command-palette', open }` 摘要。

**条目形态**：`{ id?, label?, description?, shortcut?, group?, icon?, disabled?, action? }`——`icon` 为 lucide 图标名；扁平 `items` 按 `group` 首现顺序聚类成组；缺 `label` 回退 `id`、缺 `id` 用合成键，条目降级不中断清单。`shouldFilter: false` 关闭 cmdk 内建过滤（外置过滤候选：用表达式自行过滤 `items`）。

CSS 消费：面板根 marker `nop-command-palette`（`className` 可叠加），内部区域为 ui `data-slot="command*"` 标记；选中态为 cmdk `data-selected` / `aria-selected`。契约详情见 `docs/references/renderer-interfaces.md` §Command Palette Surface Contract。
