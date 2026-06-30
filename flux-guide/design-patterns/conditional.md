# 条件显隐与集合展开

## 显隐

```json
[
  {
    "type": "select",
    "name": "method",
    "label": "方式",
    "options": [
      { "label": "邮件", "value": "email" },
      { "label": "短信", "value": "sms" }
    ]
  },
  {
    "type": "input-email",
    "name": "email",
    "label": "邮箱",
    "visible": "${method==='email'}",
    "required": "${method==='email'}"
  },
  { "type": "input-text", "name": "phone", "label": "手机", "visible": "${method==='sms'}" }
]
```

## 条件激活 (when)

```json
{
  "type": "fragment",
  "when": "${showAdvanced}",
  "body": [
    { "type": "input-text", "name": "adminCode", "label": "管理员代码" },
    {
      "type": "select",
      "name": "permissions",
      "label": "权限",
      "multiple": true,
      "source": "/api/permissions"
    }
  ]
}
```

> `visible` 隐藏的字段仍参与验证；`when=false` 的子树整体不激活、不参与生命周期。

## Loop 集合展开

```json
{
  "type": "loop",
  "items": "${users}",
  "itemName": "user",
  "indexName": "idx",
  "body": [
    {
      "type": "container",
      "header": { "type": "text", "text": "${idx + 1}. ${user.name}" },
      "body": [
        { "type": "text", "text": "邮箱: ${user.email}" },
        { "type": "text", "text": "角色: ${user.role}" }
      ]
    }
  ],
  "empty": [{ "type": "empty", "description": "暂无数据" }]
}
```

## 选项联动

```json
[
  {
    "type": "select",
    "name": "province",
    "label": "省份",
    "options": [
      { "label": "广东", "value": "gd" },
      { "label": "浙江", "value": "zj" }
    ]
  },
  {
    "type": "select",
    "name": "city",
    "label": "城市",
    "source": "/api/cities?province=${province}",
    "visible": "${province}"
  }
]
```

## 禁用条件

```json
{ "type": "switch", "name": "superAdmin", "label": "超级管理员", "disabled": "${role!=='admin'}" }
```
