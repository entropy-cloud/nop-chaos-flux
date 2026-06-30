# Tab 导航布局

## 基础 Tabs

```json
{
  "type": "tabs",
  "tabs": [
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

## 受控 Tabs

```json
{
  "type": "tabs",
  "activeKey": "${currentTab}",
  "activeKeyOwnership": "scope",
  "activeKeyStatePath": "currentTab",
  "tabs": [
    { "title": "列表", "body": [{ "type": "table", "api": "/api/list" }] },
    { "title": "图表", "body": [{ "type": "chart", "source": "/api/chart" }] }
  ]
}
```

## 带图标 Tabs

```json
{
  "type": "tabs",
  "tabs": [
    { "title": "首页", "icon": "home", "body": [{ "type": "text", "text": "首页内容" }] },
    { "title": "设置", "icon": "settings", "body": [{ "type": "text", "text": "设置内容" }] }
  ]
}
```

## 条件显示 Tab

```json
{
  "type": "tabs",
  "tabs": [
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
  "tabs": [
    { "title": "可访问", "body": [{ "type": "text", "text": "内容" }] },
    { "title": "不可访问", "disabled": true, "body": [] }
  ]
}
```

**关键点**：Tabs 是 interaction owner，管理互斥面板和激活状态。可通过 `activeKeyOwnership` 控制状态归属（local/controlled/scope）。
