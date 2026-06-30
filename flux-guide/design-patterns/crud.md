# CRUD 标准操作

```json
{
  "type": "crud",
  "name": "table1",
  "api": "/api/users",
  "perPage": 10,
  "columns": [
    { "name": "id", "label": "ID", "width": 60 },
    { "name": "name", "label": "姓名", "sortable": true },
    { "name": "email", "label": "邮箱" },
    { "name": "status", "label": "状态", "type": "mapping", "map": { "1": "启用", "0": "禁用" } },
    { "name": "createdAt", "label": "时间", "type": "date", "format": "YYYY-MM-DD" },
    {
      "type": "operation",
      "label": "操作",
      "buttons": [
        {
          "type": "button",
          "label": "编辑",
          "onClick": {
            "action": "openDialog",
            "args": {
              "title": "编辑用户",
              "data": { "id": "${id}", "name": "${name}", "email": "${email}" },
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
        },
        {
          "type": "button",
          "label": "删除",
          "onClick": {
            "action": "confirm",
            "args": { "message": "确定删除该用户？", "title": "确认" },
            "then": {
              "action": "ajax",
              "args": { "url": "/api/users/${id}", "method": "delete" },
              "then": { "action": "refreshTable", "args": { "target": "table1" } }
            }
          }
        }
      ]
    }
  ],
  "toolbar": [
    {
      "type": "button",
      "label": "新增",
      "level": "primary",
      "onClick": {
        "action": "openDialog",
        "args": {
          "title": "新增用户",
          "body": {
            "type": "form",
            "id": "createForm",
            "submitAction": { "action": "ajax", "args": { "url": "/api/users", "method": "post" } },
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
  ],
  "footerToolbar": ["statistics", "pagination"]
}
```

**关键点**：`dialog.data` 传当前行数据给弹窗 → 弹窗内 form 引用 `${id}` → 操作完 `closeSurface` 后 `refreshTable` 刷新列表。
