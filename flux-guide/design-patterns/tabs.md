# Tab 导航布局

> Tabs 用 `items` 数组（非 `tabs`），激活态用 `value`/`valueOwnership`/`valueStatePath`（非 `activeKey*`）。

## 基础 Tabs

```json
{
  "type": "tabs",
  "items": [
    {
      "title": "基本信息",
      "body": [
        { "type": "input-text", "name": "name", "label": "姓名" },
        { "type": "input-email", "name": "email", "label": "邮箱" }
      ]
    },
    {
      "title": "安全设置",
      "body": [
        { "type": "input-password", "name": "password", "label": "密码" },
        { "type": "switch", "name": "twoFactor", "label": "双因素认证" }
      ]
    }
  ]
}
```

## 受控 Tabs（scope 持久化）

```json
{
  "type": "tabs",
  "value": "${currentTab}",
  "valueOwnership": "scope",
  "valueStatePath": "currentTab",
  "items": [
    { "title": "列表", "body": [{ "type": "table", "source": "${rows}" }] },
    { "title": "图表", "body": [{ "type": "chart", "source": "${chartData}" }] }
  ]
}
```

## 带图标 Tabs

```json
{
  "type": "tabs",
  "items": [
    { "title": "首页", "icon": "home", "body": [{ "type": "text", "text": "首页内容" }] },
    { "title": "设置", "icon": "settings", "body": [{ "type": "text", "text": "设置内容" }] }
  ]
}
```

## 条件显示 Tab

```json
{
  "type": "tabs",
  "items": [
    { "title": "普通用户", "body": [{ "type": "text", "text": "用户视图" }] },
    {
      "title": "管理员",
      "visible": "${role === 'admin'}",
      "body": [{ "type": "text", "text": "管理视图" }]
    }
  ]
}
```

## 禁用 Tab

```json
{
  "type": "tabs",
  "items": [
    { "title": "可访问", "body": [{ "type": "text", "text": "内容" }] },
    { "title": "不可访问", "disabled": true, "body": [] }
  ]
}
```

**关键点**：Tabs 是 interaction owner，管理互斥面板和激活状态。可通过 `valueOwnership` 控制状态归属（local/controlled/scope）。

## 视图集合管理（closable / addable / draggable）

多视图数据库形态的**管理侧**语义：运行时新增/删除/重排 tab 项（owner 契约
`docs/references/renderer-interfaces.md` §Tabs View Collection Management Contract）。

```json
{
  "type": "tabs",
  "closable": true,
  "addable": true,
  "draggable": true,
  "itemsOwnership": "scope",
  "itemsStatePath": "ui.viewItems",
  "valueOwnership": "scope",
  "valueStatePath": "activeView",
  "onTabClose": { "action": "setValue", "args": { "path": "ui.lastClose", "value": "${value}" } },
  "items": [
    { "title": "表格视图", "body": [{ "type": "table" }], "closable": false },
    { "title": "看板视图", "body": [{ "type": "kanban" }] }
  ]
}
```

- `closable`：tab 内渲染 ✕（`data-slot="tabs-trigger-close"`，点击经 `removeTab` 通道删除；最后一项不渲染 ✕，禁止删空兜底）；item 级 `closable` 可逐 tab 覆盖；无内建删除确认（经 `onTabClose` 链 + 宿主 confirm 自组）
- `addable`：列表尾部 `+`（`data-slot="tabs-trigger-add"`），缺省标题走 i18n `flux.tabs.newTab`，value 自动生成（`tab-<ts>`），不自动激活——激活由作者经 `onTabAdd` 链 + `setValue` 驱动
- `draggable`：tab 原生拖拽重排，落位经 `moveTab` 通道
- 删除激活 tab 时 active 指针自动迁移（右邻优先 → 左邻兜底），走同一 `valueStatePath` 写链
- `itemsOwnership` / `itemsStatePath`：集合所有权轴（kanban 同名先例）。`local`（缺省）首次管理变更后集合归组件会话持有（后续 schema items 变化不再 re-seed）；`scope` 变更写回 `itemsStatePath`；`controlled` 拒绝全部变更
- 句柄：`component:addTab` / `component:removeTab` / `component:renameTab` / `component:moveTab`（含前置校验；unknown value → `{ok:false}`）
