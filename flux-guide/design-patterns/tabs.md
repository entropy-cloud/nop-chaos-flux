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
