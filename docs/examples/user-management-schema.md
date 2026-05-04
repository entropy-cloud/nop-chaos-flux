# User Management Schema Example

## Purpose

This example is intentionally small but complete.

- each important capability appears once
- form business flow is owned by the `form` node
- submit buttons stay thin and trigger `component:submit`
- inside a form subtree, pending UI reads the readonly `$form` binding
- `closeSurface` uses the default current-surface behavior
- page data updates rely on current `ajax` plus explicit follow-up write actions instead of outdated top-level write-field assumptions

Covered capabilities:

- page data
- template strings
- single-field expression values
- search form
- `ajax`
- `requestAdaptor` and `responseAdaptor`
- `setValues.args.path`
- `openDialog`
- form-owned `submitAction`
- `component:submit`
- `$form`
- `closeSurface`
- `component:refresh`
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
          "type": "text",
          "text": "Hello ${currentUser.name}, welcome to the user center."
        },
        {
          "type": "form",
          "id": "searchForm",
          "statusPath": "searchFormStatus",
          "data": {
            "keyword": "${keyword}"
          },
          "submitAction": {
            "action": "ajax",
            "debounce": 300,
            "args": {
              "method": "post",
              "url": "/api/users/search",
              "requestAdaptor": "return {data: {keyword: scope.keyword, page: scope.page, perPage: scope.perPage}};",
              "responseAdaptor": "return {items: payload.items, total: payload.total};"
            }
          },
          "onSubmitSuccess": {
            "action": "setValues",
            "args": {
              "path": "searchResult",
              "values": {
                "items": "${result.data.items}",
                "total": "${result.data.total}"
              }
            }
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
              "disabled": "${$form.submitting}",
              "onClick": {
                "action": "component:submit",
                "componentId": "searchForm"
              }
            },
            {
              "type": "button",
              "label": "新增用户",
              "visible": "${currentUser.role === 'admin'}",
              "onClick": {
                "action": "openDialog",
                "args": {
                  "title": "新增用户",
                  "body": {
                    "type": "form",
                    "id": "createUserForm",
                    "data": {
                      "username": "",
                      "email": "",
                      "role": "viewer"
                    },
                    "submitAction": {
                      "action": "ajax",
                      "args": {
                        "method": "post",
                        "url": "/api/users",
                        "requestAdaptor": "return {data: {username: scope.username, email: scope.email, role: scope.role}};",
                        "responseAdaptor": "return payload.user;"
                      }
                    },
                    "onSubmitSuccess": [
                      {
                        "action": "closeSurface"
                      },
                      {
                        "action": "component:refresh",
                        "componentId": "usersTable"
                      }
                    ],
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
                          "action": "closeSurface"
                        }
                      },
                      {
                        "type": "button",
                        "label": "提交",
                        "disabled": "${$form.submitting}",
                        "onClick": {
                          "action": "component:submit",
                          "componentId": "createUserForm"
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
          "type": "text",
          "text": "查询表单状态：${searchFormStatus.submitting ? '查询中' : '空闲'}"
        },
        {
          "type": "table",
          "id": "usersTable",
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
                    "action": "openDialog",
                    "args": {
                      "title": "用户详情",
                      "body": {
                        "type": "container",
                        "body": [
                          {
                            "type": "text",
                            "name": "username",
                            "label": "用户名"
                          },
                          {
                            "type": "text",
                            "name": "email",
                            "label": "邮箱"
                          },
                          {
                            "type": "text",
                            "name": "role",
                            "label": "角色"
                          },
                          {
                            "type": "button",
                            "label": "关闭",
                            "onClick": {
                              "action": "closeSurface"
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
          "type": "text",
          "text": "共 ${searchResult.total || 0} 条记录，当前第 ${page} 页，每页 ${perPage} 条。"
        }
      ]
    }
  ]
}
```

## Notes

- This example demonstrates the current preferred authoring direction, not every historical AMIS-compatible variation.
- Page-level values such as `currentUser`, `keyword`, `page`, and `perPage` are assumed to come from the host application's root render data rather than from a page-local schema `data` field.
- Submit buttons are intentionally thin: validation, request dispatch, and success follow-up all belong to the owning `form` node through `submitAction` and `onSubmitSuccess`.
- Inside a form subtree, pending UI reads `${$form.submitting}`. Outside the form subtree, the same readonly status summary can be read through `statusPath`.
- Form `id` and `name` are for component targeting and diagnostics. They are not implicit data-binding paths.
- The search flow uses one semantic form submit backed by one `ajax` action, then a follow-up `setValues` write through `args.path` to publish the returned list data into page state.
- If schema semantics change, update `docs/architecture/flux-core.md` first, then update this example.
