# 快速入门 - 17 个最常用代码段

> 所有组件字段参考 `flux-types/*.d.ts`。这里只给最常用的骨架。

---

## 1. 最简页面

```json
{ "type": "page", "title": "首页", "body": [{ "type": "text", "text": "Hello" }] }
```

## 2. 页面带数据请求

> Page 没有 `initApi`。请求下沉到 `data-source` 节点（兄弟节点消费其结果）。

```json
{
  "type": "page",
  "body": [
    { "type": "data-source", "name": "profile", "action": "ajax", "args": { "url": "/api/init" } },
    { "type": "text", "text": "用户: ${profile.name}, 角色: ${profile.role}" }
  ]
}
```

## 3. CRUD 表格

> CRUD 没有 `api`/`perPage` 字段。取数走 `source`（消费 data-source 结果，推荐）或 `loadAction`（自带取数）。详见 `design-patterns/crud.md`。

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "id": "users-source",
      "name": "pagedUsers",
      "action": "ajax",
      "args": { "url": "/api/users" }
    },
    {
      "type": "crud",
      "id": "users-crud",
      "source": "${pagedUsers}",
      "rowKey": "id",
      "onRefresh": { "action": "refreshSource", "targetId": "pagedUsers" },
      "columns": [
        { "name": "id", "label": "ID" },
        { "name": "name", "label": "姓名" }
      ],
      "toolbar": [
        {
          "type": "button",
          "label": "新增",
          "variant": "default",
          "onClick": {
            "action": "openDialog",
            "args": {
              "title": "新增",
              "body": {
                "type": "form",
                "id": "createForm",
                "submitAction": {
                  "action": "ajax",
                  "args": { "url": "/api/users/create", "method": "post" }
                },
                "onSubmitSuccess": {
                  "action": "closeSurface",
                  "then": { "action": "refreshSource", "targetId": "pagedUsers" }
                },
                "body": [{ "type": "input-text", "name": "name", "label": "姓名" }]
              }
            }
          }
        }
      ],
      "footerToolbar": [
        { "type": "statistics", "total": "${$crud.total}" },
        { "type": "pagination" }
      ]
    }
  ]
}
```

## 4. 表单 + 提交

```json
{
  "type": "form",
  "id": "myForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/submit", "method": "post" } },
  "onSubmitSuccess": {
    "action": "showToast",
    "args": { "level": "success", "message": "提交成功" }
  },
  "body": [
    { "type": "input-text", "name": "name", "label": "姓名", "required": true },
    { "type": "input-email", "name": "email", "label": "邮箱" },
    {
      "type": "button",
      "label": "提交",
      "onClick": { "action": "component:submit", "componentId": "myForm" }
    }
  ]
}
```

## 5. 弹窗编辑（提取当前行数据）

```json
{
  "type": "button",
  "label": "编辑",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "编辑",
      "data": { "id": "${id}", "name": "${name}" },
      "body": {
        "type": "form",
        "id": "editForm",
        "submitAction": {
          "action": "ajax",
          "args": { "url": "/api/users/${id}", "method": "put" }
        },
        "onSubmitSuccess": { "action": "closeSurface" },
        "body": [{ "type": "input-text", "name": "name", "label": "姓名" }]
      }
    }
  }
}
```

## 6. Combo 动态增删

```json
{
  "type": "combo",
  "name": "items",
  "label": "明细",
  "addable": true,
  "removable": true,
  "reorderable": true,
  "items": [
    { "type": "input-text", "name": "product", "placeholder": "商品" },
    { "type": "input-number", "name": "quantity", "label": "数量" }
  ]
}
```

## 7. 条件显隐

```json
[
  {
    "type": "select",
    "name": "type",
    "label": "类型",
    "options": [
      { "label": "A", "value": "a" },
      { "label": "B", "value": "b" }
    ]
  },
  { "type": "input-text", "name": "detail", "label": "详情", "visible": "${type === 'a'}" }
]
```

## 8. Action Algebra 动作链

```json
{
  "type": "button",
  "label": "提交",
  "onClick": {
    "action": "ajax",
    "args": { "url": "/api/save", "method": "post" },
    "then": { "action": "showToast", "args": { "level": "success", "message": "完成" } },
    "onError": {
      "action": "showToast",
      "args": { "level": "error", "message": "${error.message}" }
    }
  }
}
```

## 9. Data Source 数据容器

> `data-source` 节点自身**不渲染**（return null），其结果经 `name` 发布到 scope，由**兄弟节点**消费。`action` 是字符串，`args` 同级。

```json
[
  {
    "type": "data-source",
    "name": "dashboard",
    "action": "ajax",
    "args": { "url": "/api/dashboard" }
  },
  { "type": "text", "text": "用户数: ${dashboard.userCount}" },
  { "type": "chart", "source": "${dashboard.chartData}" }
]
```

## 10. Wizard 多步骤

```json
{
  "type": "wizard",
  "id": "wizard1",
  "steps": [
    {
      "title": "第一步",
      "body": [{ "type": "input-text", "name": "name", "label": "姓名", "required": true }]
    },
    { "title": "第二步", "body": [{ "type": "input-text", "name": "address", "label": "地址" }] }
  ],
  "onStepCommit": { "action": "ajax", "args": { "url": "/api/step", "method": "post" } },
  "onComplete": { "action": "showToast", "args": { "level": "success", "message": "完成" } }
}
```

## 11. Tabs 多标签页

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
      "body": [{ "type": "input-password", "name": "password", "label": "密码" }]
    }
  ]
}
```

## 12. Select 远程数据源

> `select` 没有 `source` 字段；远程选项用 `data-source` 节点准备，再绑定到 `options`。

```json
[
  {
    "type": "data-source",
    "name": "cities",
    "action": "ajax",
    "args": { "url": "/api/cities", "params": { "province": "${province}" } }
  },
  {
    "type": "select",
    "name": "city",
    "label": "城市",
    "options": "${cities}",
    "visible": "${province}"
  }
]
```

## 13. Loop 循环渲染

```json
{
  "type": "loop",
  "items": "${users}",
  "itemName": "user",
  "indexName": "idx",
  "body": [{ "type": "text", "text": "${idx + 1}. ${user.name} - ${user.email}" }],
  "empty": [{ "type": "empty", "description": "暂无用户" }]
}
```

## 14. Reaction 响应式监听

```json
{
  "type": "reaction",
  "watch": "${form.total}",
  "when": "${form.total > 1000}",
  "actions": { "action": "showToast", "args": { "level": "warning", "message": "金额超过 1000" } }
}
```

## 15. 文件上传

> `input-file` 没有 `maxSize`；数量上限用 `maxFiles`。实际上传靠字段上的 `uploadAction`（host 上传动作），表单 `submitAction` 只提交已上传后的字段值。

```json
{
  "type": "form",
  "id": "uploadForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/save", "method": "post" } },
  "body": [
    { "type": "input-text", "name": "title", "label": "标题", "required": true },
    {
      "type": "input-file",
      "name": "file",
      "label": "文件",
      "accept": ".pdf,.doc",
      "maxFiles": 5,
      "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } }
    },
    {
      "type": "button",
      "label": "提交",
      "onClick": { "action": "component:submit", "componentId": "uploadForm" }
    }
  ]
}
```

## 16. Confirm 确认对话框

```json
{
  "type": "button",
  "label": "删除",
  "onClick": {
    "action": "confirm",
    "args": { "message": "确定删除？", "title": "确认操作" },
    "then": {
      "action": "ajax",
      "args": { "url": "/api/delete/${id}", "method": "delete" },
      "then": { "action": "showToast", "args": { "level": "success", "message": "已删除" } }
    }
  }
}
```

## 17. Alert 警告对话框

```json
{
  "type": "button",
  "label": "提示",
  "onClick": {
    "action": "alert",
    "args": { "message": "操作已完成", "title": "提示" }
  }
}
```
