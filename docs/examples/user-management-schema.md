# User Management Schema Example

## Purpose

This example is intentionally small but complete.

- each important capability appears once
- similar dialogs and actions are not repeated
- `closeDialog` uses the default nearest-dialog behavior
- page data updates rely on current `ajax` plus `dataPath` semantics instead of outdated `setValue` assumptions

Covered capabilities:

- page data
- template strings
- single-field expression values
- search form
- `ajax`
- `requestAdaptor` and `responseAdaptor`
- `dataPath`
- `dialog`
- `submitForm`
- `closeDialog`
- `refreshTable`
- table row `record` scope

## Example

```json
{
  "type": "page",
  "title": "用户管理",
  "body": [
    {
      "type": "container",
      "body": [
        {
          "type": "tpl",
          "tpl": "Hello ${currentUser.name}, welcome to the user center."
        },
        {
          "type": "form",
          "id": "searchForm",
          "data": {
            "keyword": "${keyword}"
          },
          "body": [
            {
              "type": "input-text",
              "name": "keyword",
              "label": "搜索",
              "placeholder": "输入用户名或邮箱"
            }
          ],
          "actions": [
            {
              "type": "button",
              "label": "查询",
              "disabled": "${searching}",
              "onClick": {
                "action": "ajax",
                "debounce": 300,
                "api": {
                  "method": "post",
                  "url": "/api/users/search",
                  "requestAdaptor": "return {data: {keyword: scope.keyword, page: scope.page, perPage: scope.perPage}};",
                  "responseAdaptor": "return {items: payload.items, total: payload.total};"
                },
                "dataPath": "searchResult"
              }
            },
            {
              "type": "button",
              "label": "新增用户",
              "visible": "${currentUser.role === 'admin'}",
              "onClick": {
                "action": "dialog",
                "dialog": {
                  "title": "新增用户",
                  "body": {
                    "type": "form",
                    "id": "createUserForm",
                    "data": {
                      "username": "",
                      "email": "",
                      "role": "viewer"
                    },
                    "body": [
                      {
                        "type": "input-text",
                        "name": "username",
                        "label": "用户名"
                      },
                      {
                        "type": "input-email",
                        "name": "email",
                        "label": "邮箱"
                      },
                      {
                        "type": "select",
                        "name": "role",
                        "label": "角色",
                        "options": [
                          {
                            "label": "Viewer",
                            "value": "viewer"
                          },
                          {
                            "label": "Editor",
                            "value": "editor"
                          },
                          {
                            "label": "Admin",
                            "value": "admin"
                          }
                        ]
                      }
                    ],
                    "actions": [
                      {
                        "type": "button",
                        "label": "取消",
                        "onClick": {
                          "action": "closeDialog"
                        }
                      },
                      {
                        "type": "button",
                        "label": "提交",
                        "disabled": "${saving}",
                        "onClick": {
                          "action": "submitForm",
                          "formId": "createUserForm",
                          "api": {
                            "method": "post",
                            "url": "/api/users",
                            "requestAdaptor": "return {data: {username: scope.username, email: scope.email, role: scope.role}};",
                            "responseAdaptor": "return payload.user;"
                          },
                          "then": [
                            {
                              "action": "closeDialog"
                            },
                            {
                              "action": "refreshTable"
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        },
        {
          "type": "table",
          "source": "${searchResult.items}",
          "columns": [
            {
              "label": "ID",
              "name": "id"
            },
            {
              "label": "用户名",
              "name": "username"
            },
            {
              "label": "邮箱",
              "name": "email"
            },
            {
              "label": "角色",
              "name": "role"
            },
            {
              "type": "operation",
              "label": "操作",
              "buttons": [
                {
                  "type": "button",
                  "label": "查看",
                  "onClick": {
                    "action": "dialog",
                    "dialog": {
                      "title": "用户详情",
                      "body": {
                        "type": "container",
                        "body": [
                          {
                            "type": "tpl",
                            "tpl": "用户名：${record.username}"
                          },
                          {
                            "type": "tpl",
                            "tpl": "邮箱：${record.email}"
                          },
                          {
                            "type": "tpl",
                            "tpl": "角色：${record.role}"
                          },
                          {
                            "type": "button",
                            "label": "关闭",
                            "onClick": {
                              "action": "closeDialog"
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "tpl",
          "tpl": "共 ${searchResult.total || 0} 条记录，当前第 ${page} 页，每页 ${perPage} 条。"
        }
      ]
    }
  ]
}
```

## Notes

- This example demonstrates the current preferred authoring direction, not every historical AMIS-compatible variation.
- Page-level values such as `currentUser`, `keyword`, `page`, `perPage`, and `searching` are assumed to come from the host application's root render data rather than from a page-local schema `data` field.
- The search flow uses one `ajax` action with `dataPath` to update page data. That matches the current runtime more closely than chaining `setValue` to mutate page state from inside a form-local action context.
- If schema semantics change, update `docs/architecture/amis-core.md` first, then update this example.
