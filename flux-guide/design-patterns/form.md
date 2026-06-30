# 表单提交与校验

## 基础表单

```json
{
  "type": "form",
  "id": "userForm",
  "submitAction": {
    "action": "ajax",
    "args": { "url": "/api/users", "method": "post" }
  },
  "onSubmitSuccess": {
    "action": "showToast",
    "args": { "level": "success", "message": "保存成功" }
  },
  "onSubmitError": {
    "action": "showToast",
    "args": { "level": "error", "message": "${error.message}" }
  },
  "body": [
    { "type": "input-text", "name": "name", "label": "姓名", "required": true },
    { "type": "input-email", "name": "email", "label": "邮箱", "required": true },
    { "type": "input-number", "name": "age", "label": "年龄", "min": 0, "max": 150 },
    {
      "type": "select",
      "name": "role",
      "label": "角色",
      "options": [
        { "label": "管理员", "value": "admin" },
        { "label": "普通用户", "value": "user" }
      ]
    },
    {
      "type": "button",
      "label": "提交",
      "level": "primary",
      "onClick": {
        "action": "component:submit",
        "args": { "_target": "userForm" }
      }
    }
  ]
}
```

## 嵌套表单 (Fieldset)

```json
{
  "type": "form",
  "id": "orderForm",
  "body": [
    {
      "type": "fieldset",
      "title": "基本信息",
      "body": [
        { "type": "input-text", "name": "orderNo", "label": "订单号", "required": true },
        { "type": "input-date", "name": "orderDate", "label": "订单日期" }
      ]
    },
    {
      "type": "fieldset",
      "title": "收货信息",
      "body": [
        { "type": "input-text", "name": "receiver", "label": "收货人", "required": true },
        { "type": "textarea", "name": "address", "label": "地址" }
      ]
    },
    {
      "type": "button",
      "label": "提交订单",
      "level": "primary",
      "onClick": {
        "action": "component:submit",
        "args": { "_target": "orderForm" }
      }
    }
  ]
}
```

## 弹窗表单

```json
{
  "type": "button",
  "label": "编辑",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "编辑用户",
      "data": { "id": "${id}", "name": "${name}" },
      "body": {
        "type": "form",
        "id": "editForm",
        "submitAction": {
          "action": "ajax",
          "args": { "url": "/api/users/${id}", "method": "put" }
        },
        "onSubmitSuccess": {
          "action": "closeSurface",
          "then": { "action": "refreshTable", "args": { "target": "table1" } }
        },
        "body": [
          { "type": "input-text", "name": "name", "label": "姓名", "required": true },
          { "type": "input-email", "name": "email", "label": "邮箱" }
        ]
      }
    }
  }
}
```

**关键点**：按钮是 `component:submit` 的薄触发器，验证→提交→分支全部由表单节点拥有。
