# 页面模板层语义件（PageHeader 页头 / QueryFilter 查询区 / Result 终态页）

> G-A 语义件族：把 AntD Pro `ProComponents` 式「页面级语义组件化」表达为 schema 能力，
> 消解企业页手拼组合（面包屑 5 个 text 节点拼装 / 非 crud 场景查询区手搭 / 终态页 text+icon 手写）。
> 契约细节见 `docs/references/renderer-interfaces.md` §Page Header Semantic Fields /
> §Query Filter Semantic Component / §Result Semantic Component。

## 1. PageHeader：page 面包屑 + extra 动作区

`page` 渲染器的语义增强字段（零新 type）。`breadcrumb` 是
`{ label, href? }` 条目数组（或求值为该数组的表达式），渲染在标题行上方；
`extra` region 渲染在标题行右端。声明任一语义字段时进入语义页头分支；
`header` region 与之正交（继续渲染进 `page-toolbar` 槽位，可并存）。
内容 tab 不属于本族——用既有 `tabs` 在 body 组合。

```json
{
  "type": "page",
  "breadcrumb": [
    { "label": "首页", "href": "/home" },
    { "label": "订单管理", "href": "/orders" },
    { "label": "订单详情" }
  ],
  "title": "订单详情",
  "subTitle": "单号 20260830-0001",
  "extra": [
    {
      "type": "button",
      "label": "导出",
      "onClick": { "action": "showToast", "args": { "message": "导出" } }
    },
    { "type": "button", "label": "编辑" }
  ],
  "body": [{ "type": "text", "text": "页面内容" }]
}
```

要点：

- 条目含 `href` 渲染链接，否则渲染当前页文本；条目间自带 chevron 分隔。
- 条目非对象或缺 `label` 被跳过，不中断渲染。
- 溢出语义：条目截断（ellipsis）+ 原生 `title` 提示，容器可换行，布局不溢出。
- 表达式形态：`"breadcrumb": "${crumbs}"`（scope 驱动，如面包屑由路由数据派生）。

## 2. QueryFilter：非 crud 场景查询区

`query-filter` 独立渲染器（注册于 `@nop-chaos/flux-renderers-data`）：
查询/重置按钮内建、展开/收起语义、网格布局。crud 场景继续用
`crud.queryForm`（主通道不变）；本组件面向 plain table / data-source 等
非 crud 载体。`body` 里的表单字段经编译降为嵌套 form（`filterForm` region）。

```json
{
  "type": "query-filter",
  "columnCount": 3,
  "submitLabel": "查询",
  "resetLabel": "重置",
  "onSubmit": { "action": "ajax", "args": { "url": "/api/orders/search" } },
  "body": [
    { "type": "input-text", "name": "keyword", "label": "关键字", "placeholder": "订单号/客户名" },
    {
      "type": "select",
      "name": "status",
      "label": "状态",
      "options": [
        { "label": "待支付", "value": "pending" },
        { "label": "已完成", "value": "done" }
      ]
    },
    { "type": "input-date", "name": "createdFrom", "label": "起始日期" }
  ]
}
```

要点：

- `onSubmit` 经嵌套 form 的 `submitAction` 管线承载（先校验后提交）；
  `onReset` 链在字段值重置后派发。二者声明为 prop（非事件契约）。
- 未声明 `onSubmit`/`onReset` 时：查询按钮走空管线（零动作、不抛错、无隐式取数），
  重置仅重置字段值。
- `mode`/`layout`/`columnCount`/`gap` 转发给嵌套 form（form 内建网格，不另造网格）。
- 展开/收起：`"togglable": true` 或
  `{ "defaultCollapsed": true, "collapsedLabel": "展开筛选", "expandedLabel": "收起筛选" }`。
- 自定义动作区：`actions` 替换默认查询/重置按钮。
- 与 crud 同页使用无运行时冲突面（两机制各自操作作者声明的 scope 通道）；
  crud 内嵌查询区的约定通道是 `crud.queryForm`。注意 crud 侧
  `queryForm.defaultCollapsed` 族字段已废弃（用 `filterTogglable`），
  误用会收到 authoring 迁移告警。

## 3. Result：操作终态页

`result` 渲染器（注册于 `@nop-chaos/flux-renderers-content`，`empty` 兄弟）：
status 四语义（success/error/warning/info，默认 info）映射默认图标与语义色，
title/description 支持 value-or-region，`actions` region 承载后续动作按钮。

```json
{
  "type": "result",
  "status": "success",
  "title": "提交成功",
  "description": "工单已创建，预计 2 个工作日内响应。",
  "actions": [
    { "type": "button", "label": "查看工单", "variant": "primary" },
    { "type": "button", "label": "返回列表" }
  ]
}
```

要点：

- `icon` 字段（lucide 图标名）覆盖 status 默认图标。
- 非法 `status` 值兜底为 info 语义 + dev 告警，不中断渲染。
- 无事件契约（终态页无交互事件面，按钮事件由 actions 内组件自带）。
- marker：根 `nop-result` + `data-slot="result"` + `data-status`。

## 组合样例：语义件拼一页

```json
{
  "type": "page",
  "breadcrumb": [{ "label": "首页", "href": "/" }, { "label": "任务" }],
  "title": "任务看板",
  "extra": [{ "type": "button", "label": "新建任务", "variant": "primary" }],
  "body": [
    {
      "type": "query-filter",
      "togglable": true,
      "onSubmit": { "action": "ajax", "args": { "url": "/api/tasks" } },
      "body": [{ "type": "input-text", "name": "q", "label": "搜索" }]
    },
    { "type": "text", "text": "……列表区……" }
  ]
}
```
