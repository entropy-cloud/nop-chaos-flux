# Action Flow Tree Example

## Purpose

本示例展示如何用通用 Tree DSL 描述一个完整的 Action Flow——即 `ActionSchema` 的可视化编排。

`then` / `onError` 在树形结构中本质上是**条件分支扇出**：运行时根据 ActionResult 类别走其中一条。这和钉钉条件分支的结构完全相同，不需要任何结构扩展。

## Structural Mapping

Action Schema 概念到 Tree DSL 的映射：

| Action Schema       | Tree DSL       | 承载位置                                 |
| ------------------- | -------------- | ---------------------------------------- |
| 主链顺序 A → B → C  | `child` 递归链 | 结构字段                                 |
| `parallel: [...]`   | `branches`     | 结构字段，`data.branchType = "parallel"` |
| `then`              | `branches[0]`  | `data.branchType = "then"`               |
| `onError`           | `branches[1]`  | `data.branchType = "onError"`            |
| `when`              | 节点自身       | `data.when`                              |
| `retry` / `timeout` | 节点自身       | `data`                                   |
| `continueOnError`   | 节点自身       | `data`                                   |
| `debounce`          | 节点自身       | `data`                                   |

### 关键洞察：then / onError 就是条件分支

```
钉钉条件网关：
  branches: [
    { data: { conditionList: [[{field:"day", op:">", val:"7"}]] }, child: ... },
    { data: { conditionList: [] }  // 默认                            }, child: ... }
  ]

Action flow：
  branches: [
    { data: { branchType: "then" }    // success-class 走这里  }, child: ... },
    { data: { branchType: "onError" } // failure-class 走这里  }, child: ... }
  ]
```

结构完全相同，区别仅在 `data` 里放的是条件表达式还是结果类型判断。

## Example: 用户保存流程

```
入口
  → 预检查（when: userId != null）
     ├─ then: 加载用户数据（ajax）
     │   ├─ then: 保存表单（component:submit）
     │   │   ├─ then: 刷新列表（component:refresh）
     │   │   └─ onError: 显示错误（showToast）
     │   └─ onError: 重试加载（ajax + retry）
     └─ onError: 显示提示（showToast）
  → 结束
```

```json
{
  "id": "user-save-flow",
  "kind": "action-flow",
  "name": "用户保存流程",
  "version": "1.0.0",
  "root": {
    "id": "entry",
    "type": "action-entry",
    "data": {
      "label": "入口"
    },
    "child": {
      "id": "precheck",
      "type": "action-step",
      "data": {
        "label": "预检查",
        "action": "setValue",
        "args": {
          "path": "checked",
          "value": true
        },
        "when": "${userId != null}"
      },
      "branches": [
        {
          "id": "then-precheck",
          "data": {
            "branchType": "then",
            "label": "成功"
          },
          "child": {
            "id": "fetch-user",
            "type": "action-step",
            "data": {
              "label": "加载用户数据",
              "action": "ajax",
              "args": {
                "method": "get",
                "url": "/api/users/${userId}"
              },
              "timeout": 5000
            },
            "branches": [
              {
                "id": "then-fetch",
                "data": {
                  "branchType": "then",
                  "label": "成功"
                },
                "child": {
                  "id": "save-form",
                  "type": "action-step",
                  "data": {
                    "label": "保存表单",
                    "action": "component:submit",
                    "componentId": "userForm"
                  },
                  "branches": [
                    {
                      "id": "then-save",
                      "data": {
                        "branchType": "then",
                        "label": "成功"
                      },
                      "child": {
                        "id": "refresh-list",
                        "type": "action-step",
                        "data": {
                          "label": "刷新列表",
                          "action": "component:refresh",
                          "componentName": "userTable"
                        }
                      }
                    },
                    {
                      "id": "onerror-save",
                      "data": {
                        "branchType": "onError",
                        "label": "失败"
                      },
                      "child": {
                        "id": "show-save-error",
                        "type": "action-step",
                        "data": {
                          "label": "显示错误",
                          "action": "showToast",
                          "args": {
                            "message": "${error.message ?? '保存失败'}",
                            "variant": "destructive"
                          }
                        }
                      }
                    }
                  ]
                }
              },
              {
                "id": "onerror-fetch",
                "data": {
                  "branchType": "onError",
                  "label": "失败"
                },
                "child": {
                  "id": "retry-fetch",
                  "type": "action-step",
                  "data": {
                    "label": "重试加载",
                    "action": "ajax",
                    "args": {
                      "method": "get",
                      "url": "/api/users/${userId}"
                    },
                    "retry": {
                      "times": 2,
                      "delay": 1000
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "id": "onerror-precheck",
          "data": {
            "branchType": "onError",
            "label": "失败"
          },
          "child": {
            "id": "show-precheck-error",
            "type": "action-step",
            "data": {
              "label": "提示选择用户",
              "action": "showToast",
              "args": {
                "message": "请先选择用户"
              }
            }
          }
        }
      ],
      "child": {
        "id": "end",
        "type": "action-end",
        "data": {
          "label": "结束"
        }
      }
    }
  }
}
```

## Example: Parallel Actions

```
入口
  → 并行执行
     ├─ 分支1: 发送邮件
     └─ 分支2: 发送短信
  → 记录日志
     ├─ then: 通知成功
     └─ onError: 通知失败
  → 结束
```

```json
{
  "id": "notify-parallel",
  "kind": "action-flow",
  "name": "并行通知",
  "version": "1.0.0",
  "root": {
    "id": "entry",
    "type": "action-entry",
    "data": { "label": "入口" },
    "child": {
      "id": "parallel-notify",
      "type": "action-parallel",
      "data": {
        "label": "并行通知",
        "when": "${notifyEnabled !== false}"
      },
      "branches": [
        {
          "id": "branch-email",
          "data": {
            "branchType": "parallel",
            "label": "发送邮件"
          },
          "child": {
            "id": "send-email",
            "type": "action-step",
            "data": {
              "label": "发送邮件",
              "action": "ajax",
              "args": {
                "method": "post",
                "url": "/api/notify/email",
                "body": { "userId": "${userId}", "message": "${message}" }
              },
              "timeout": 10000
            }
          }
        },
        {
          "id": "branch-sms",
          "data": {
            "branchType": "parallel",
            "label": "发送短信"
          },
          "child": {
            "id": "send-sms",
            "type": "action-step",
            "data": {
              "label": "发送短信",
              "action": "ajax",
              "args": {
                "method": "post",
                "url": "/api/notify/sms",
                "body": { "userId": "${userId}", "message": "${message}" }
              },
              "timeout": 10000
            }
          }
        }
      ],
      "child": {
        "id": "log-result",
        "type": "action-step",
        "data": {
          "label": "记录日志",
          "action": "ajax",
          "args": {
            "method": "post",
            "url": "/api/audit/log",
            "body": { "action": "notify", "userId": "${userId}" }
          }
        },
        "branches": [
          {
            "id": "then-log",
            "data": { "branchType": "then", "label": "成功" },
            "child": {
              "id": "notify-success",
              "type": "action-step",
              "data": {
                "label": "通知成功",
                "action": "showToast",
                "args": { "message": "通知发送完成" }
              }
            }
          },
          {
            "id": "onerror-log",
            "data": { "branchType": "onError", "label": "失败" },
            "child": {
              "id": "notify-failure",
              "type": "action-step",
              "data": {
                "label": "通知失败",
                "action": "showToast",
                "args": { "message": "日志记录失败", "variant": "destructive" }
              }
            }
          }
        ],
        "child": {
          "id": "end",
          "type": "action-end",
          "data": { "label": "结束" }
        }
      }
    }
  }
}
```

## Lowering: Tree → ActionSchema

Tree → `ActionSchema` JSON 的编译规则：

| Tree 结构                                     | 导出 ActionSchema                                  |
| --------------------------------------------- | -------------------------------------------------- |
| `child` 链上的多个 step                       | `ActionSchema[]` ordered array（主顺序链）         |
| `branches` + `data.branchType === "then"`     | `then` 字段（取 branches[0].child 作为 then 子树） |
| `branches` + `data.branchType === "onError"`  | `onError` 字段                                     |
| `branches` + `data.branchType === "parallel"` | `parallel` 数组                                    |
| 节点的 `data.when`                            | `when` 字段                                        |
| 节点的 `data.retry`                           | `retry` 字段                                       |
| 节点的 `data.timeout`                         | `timeout` 字段                                     |
| 节点的 `data.continueOnError`                 | `continueOnError` 字段                             |

### Lowering 示例

上面的"用户保存流程"中，`save-form` 节点 lowering 后：

```json
{
  "action": "component:submit",
  "componentId": "userForm",
  "then": {
    "action": "component:refresh",
    "componentName": "userTable"
  },
  "onError": {
    "action": "showToast",
    "args": {
      "message": "${error.message ?? '保存失败'}",
      "variant": "destructive"
    }
  }
}
```

### Lowering 约束

1. `child` 链 lowering 为 ordered array，不转为 nested `then`（保留主链 skipped 语义）
2. 一个节点的 `then` 和 `onError` 来自同一组 `branches`，用 `data.branchType` 区分
3. `parallel` 节点的 `branches` 全部 lowering 为 `parallel` 数组，不作为 `then` / `onError`
4. `action-entry` 和 `action-end` 节点在 lowering 时省略（它们是 UX 辅助节点）

## DesignerConfig for Action Flow

```json
{
  "version": "1.0.0",
  "kind": "action-flow",
  "documentMode": "tree",
  "treeConfig": {
    "layout": {
      "direction": "TB",
      "nodeSpacing": 40,
      "layerSpacing": 80
    },
    "showGatewayNodes": false,
    "showMergeNodes": false,
    "autoLayout": true,
    "chainEdgeType": "action-chain",
    "branchEdgeType": "action-branch"
  },
  "edgeTypes": [
    {
      "id": "action-chain",
      "label": "主链",
      "appearance": {
        "stroke": "#64748b",
        "strokeWidth": 2,
        "markerEnd": "arrow-closed"
      }
    },
    {
      "id": "action-branch",
      "label": "分支",
      "appearance": {
        "stroke": "#3b82f6",
        "strokeWidth": 1.5,
        "strokeDasharray": "6 3",
        "markerEnd": "arrow-closed"
      }
    }
  ],
  "nodeTypes": [
    {
      "id": "action-entry",
      "label": "入口",
      "icon": "play",
      "appearance": {
        "minWidth": 120,
        "minHeight": 40,
        "fill": "#dbeafe",
        "stroke": "#2563eb",
        "cornerRadius": 20
      },
      "body": {
        "type": "flex",
        "className": "nop-af-node nop-af-node--entry",
        "items": [
          { "type": "icon", "icon": "play" },
          { "type": "text", "body": "${data.label}" }
        ]
      },
      "tree": {
        "allowChild": true,
        "allowBranches": false,
        "isTerminal": false
      }
    },
    {
      "id": "action-step",
      "label": "动作",
      "icon": "zap",
      "appearance": {
        "minWidth": 200,
        "minHeight": 70,
        "fill": "#ffffff",
        "stroke": "#64748b",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "gap": 4,
        "className": "nop-af-node nop-af-node--step",
        "items": [
          {
            "type": "flex",
            "className": "nop-af-node__header",
            "items": [
              { "type": "icon", "icon": "zap", "className": "nop-af-node__icon" },
              { "type": "text", "body": "${data.label}", "className": "nop-af-node__title" }
            ]
          },
          {
            "type": "text",
            "body": "${data.action ?? '未配置动作'}",
            "className": "nop-af-node__subtitle"
          },
          {
            "type": "text",
            "body": "${data.when != null ? 'Guard: ' + data.when : ''}",
            "className": "nop-af-node__badge",
            "visibleOn": "data.when != null"
          }
        ]
      },
      "inspector": {
        "body": {
          "type": "form",
          "body": [
            {
              "type": "input-text",
              "name": "data.label",
              "label": "名称"
            },
            {
              "type": "input-text",
              "name": "data.action",
              "label": "动作",
              "placeholder": "ajax / setValue / component:submit ..."
            },
            {
              "type": "input-text",
              "name": "data.when",
              "label": "前置条件 (when)"
            },
            {
              "type": "input-number",
              "name": "data.timeout",
              "label": "超时 (ms)"
            },
            {
              "type": "switch",
              "name": "data.continueOnError",
              "label": "失败后继续"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": true,
        "maxBranches": 3,
        "isTerminal": false
      }
    },
    {
      "id": "action-parallel",
      "label": "并行",
      "icon": "git-merge",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#fef9c3",
        "stroke": "#ca8a04",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "className": "nop-af-node nop-af-node--parallel",
        "items": [
          { "type": "icon", "icon": "git-merge", "className": "nop-af-node__icon" },
          { "type": "text", "body": "${data.label}", "className": "nop-af-node__title" }
        ]
      },
      "tree": {
        "allowChild": true,
        "allowBranches": true,
        "minBranches": 2,
        "isTerminal": false
      }
    },
    {
      "id": "action-end",
      "label": "结束",
      "icon": "square",
      "appearance": {
        "minWidth": 100,
        "minHeight": 36,
        "fill": "#f1f5f9",
        "stroke": "#94a3b8",
        "cornerRadius": 4
      },
      "body": {
        "type": "text",
        "body": "结束",
        "className": "nop-af-node nop-af-node--end"
      },
      "tree": {
        "allowChild": false,
        "allowBranches": false,
        "isTerminal": true
      }
    }
  ],
  "palette": {
    "groups": [
      {
        "label": "节点",
        "items": [
          { "type": "action-step", "label": "动作" },
          { "type": "action-parallel", "label": "并行" }
        ]
      }
    ]
  }
}
```

## Related Documents

- `docs/architecture/flow-designer/tree-mode.md` — Tree 模式设计文档
- `docs/architecture/action-algebra-formal-spec.md` — Action Schema 执行语义
- `docs/architecture/action-graph-authoring.md` — Action 可视化设计器和 lowering 规则
- `docs/examples/dingtalk-workflow-tree.md` — 钉钉工作流 tree 配置示例
