# DingTalk Workflow Tree Example

## Purpose

本示例展示如何用通用 Tree DSL 描述一个完整的钉钉审批流程。

示例来源参考了 FlowLong 项目的 JSON 测试用例，但已转换为通用 `TreeDocument` 格式。

## Structural Mapping

FlowLong 的树形结构到通用 Tree DSL 的映射：

| FlowLong 概念                                                        | Tree DSL                    | 说明                                                  |
| -------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `nodeConfig`                                                         | `root`                      | 根节点                                                |
| `childNode`                                                          | `child`                     | 链式序列                                              |
| `conditionNodes` / `parallelNodes` / `inclusiveNodes` / `routeNodes` | `branches`                  | 统一为扇出分支                                        |
| `type` (0,1,2,4,8,9...)                                              | `type` + `data.type`        | `type` 指向 TreeNodeTypeConfig，原始 type 值放 `data` |
| `conditionList`                                                      | `branch.data.conditionList` | 条件表达式放在分支的 data 里                          |
| `nodeAssigneeList`                                                   | `data.nodeAssigneeList`     | 审批人配置放 data                                     |
| `examineMode`                                                        | `data.examineMode`          | 审批方式放 data                                       |
| `setType`                                                            | `data.setType`              | 审批人选择方式放 data                                 |

**关键点**：FlowLong 用不同的字段名（`conditionNodes` / `parallelNodes` / `inclusiveNodes`）区分网关类型。Tree DSL 统一用 `branches`，网关类型放在节点的 `data` 里。

## Example: 请假审批流程

这是一个包含条件分支、并行分支、子流程的完整请假审批流程。

```
发起人
  → 条件路由（排他分支）
     ├─ 长期（day > 7）→ CEO审批 ┐
     └─ 短期（默认）→ 直接主管审批 ┤ → 抄送HR
       → 并行处理
          ├─ 并行分支1 → 人事确认
          └─ 并行分支2 → 工作交接（子流程）
       → 结束
```

```json
{
  "id": "leave-approval",
  "kind": "dingtalk-workflow",
  "name": "请假审批",
  "version": "1.0.0",
  "root": {
    "id": "k001",
    "type": "dt-initiator",
    "data": {
      "label": "发起人",
      "type": 0
    },
    "child": {
      "id": "k002",
      "type": "dt-approval",
      "data": {
        "label": "主管审批",
        "type": 1,
        "setType": 2,
        "examineMode": 1,
        "examineLevel": 1,
        "directorLevel": 1,
        "typeOfApprove": 1,
        "nodeAssigneeList": [],
        "rejectStrategy": 2,
        "allowTransfer": true,
        "allowAppendNode": false,
        "allowRollback": true,
        "termAuto": false
      },
      "child": {
        "id": "k003",
        "type": "dt-condition",
        "data": {
          "label": "条件路由",
          "type": 4,
          "mode": "exclusive"
        },
        "branches": [
          {
            "id": "b1",
            "data": {
              "label": "长期请假",
              "priority": 1,
              "conditionList": [
                [
                  {
                    "label": "请假天数",
                    "field": "day",
                    "operator": ">",
                    "value": "7"
                  }
                ]
              ]
            },
            "child": {
              "id": "k004",
              "type": "dt-approval",
              "data": {
                "label": "CEO审批",
                "type": 1,
                "setType": 1,
                "examineMode": 2,
                "nodeAssigneeList": [{ "id": "ceo001", "name": "张总" }],
                "rejectStrategy": 1,
                "allowTransfer": true,
                "allowAppendNode": true,
                "allowRollback": true,
                "termAuto": false
              }
            }
          },
          {
            "id": "b2",
            "data": {
              "label": "短期请假",
              "priority": 2,
              "conditionList": []
            },
            "child": {
              "id": "k004b",
              "type": "dt-approval",
              "data": {
                "label": "直接主管审批",
                "type": 1,
                "setType": 2,
                "examineMode": 1,
                "nodeAssigneeList": [],
                "rejectStrategy": 2,
                "allowTransfer": true,
                "allowAppendNode": false,
                "allowRollback": true,
                "termAuto": false
              }
            }
          }
        ],
        "child": {
          "id": "k005",
          "type": "dt-cc",
          "data": {
            "label": "抄送HR",
            "type": 2,
            "allowSelection": true,
            "nodeAssigneeList": [{ "id": "hr001", "name": "HR部门" }]
          },
          "child": {
            "id": "k006",
            "type": "dt-parallel",
            "data": {
              "label": "并行处理",
              "type": 8,
              "mode": "parallel"
            },
            "branches": [
              {
                "id": "b3",
                "data": {
                  "label": "并行分支1",
                  "priority": 1
                },
                "child": {
                  "id": "k007",
                  "type": "dt-approval",
                  "data": {
                    "label": "人事确认",
                    "type": 1,
                    "setType": 1,
                    "examineMode": 1,
                    "nodeAssigneeList": [{ "id": "hr002", "name": "李人事" }],
                    "rejectStrategy": 2,
                    "termAuto": false
                  }
                }
              },
              {
                "id": "b4",
                "data": {
                  "label": "并行分支2",
                  "priority": 2
                },
                "child": {
                  "id": "k008",
                  "type": "dt-subprocess",
                  "data": {
                    "label": "工作交接",
                    "type": 5,
                    "callProcess": "workHandover",
                    "callAsync": true
                  }
                }
              }
            ],
            "child": {
              "id": "k009",
              "type": "dt-end",
              "data": {
                "label": "结束",
                "type": -1
              }
            }
          }
        }
      }
    }
  }
}
```

## DesignerConfig for DingTalk

```json
{
  "version": "1.0.0",
  "kind": "dingtalk-workflow",
  "documentMode": "tree",
  "treeConfig": {
    "layout": {
      "direction": "TB",
      "nodeSpacing": 60,
      "layerSpacing": 100
    },
    "showGatewayNodes": false,
    "showMergeNodes": false,
    "autoLayout": true,
    "chainEdgeType": "dt-chain",
    "branchEdgeType": "dt-branch",
    "mergeEdgeType": "dt-merge"
  },
  "edgeTypes": [
    {
      "id": "dt-chain",
      "label": "流程连线",
      "appearance": {
        "stroke": "#94a3b8",
        "strokeWidth": 2,
        "markerEnd": "arrow-closed"
      }
    },
    {
      "id": "dt-branch",
      "label": "分支连线",
      "appearance": {
        "stroke": "#3b82f6",
        "strokeWidth": 2,
        "strokeDasharray": "6 3",
        "markerEnd": "arrow-closed"
      }
    },
    {
      "id": "dt-merge",
      "label": "汇合连线",
      "appearance": {
        "stroke": "#94a3b8",
        "strokeWidth": 1.5,
        "strokeDasharray": "4 4",
        "markerEnd": "arrow-closed"
      }
    }
  ],
  "nodeTypes": [
    {
      "id": "dt-initiator",
      "label": "发起人",
      "icon": "user",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#e0f2fe",
        "stroke": "#0284c7",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "className": "nop-dt-node nop-dt-node--initiator",
        "items": [
          {
            "type": "text",
            "body": "${data.label}",
            "className": "nop-dt-node__title"
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
              "label": "节点名称"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": false,
        "isTerminal": false
      }
    },
    {
      "id": "dt-approval",
      "label": "审批人",
      "icon": "user-check",
      "appearance": {
        "minWidth": 220,
        "minHeight": 80,
        "fill": "#fef3c7",
        "stroke": "#d97706",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "gap": 4,
        "className": "nop-dt-node nop-dt-node--approval",
        "items": [
          {
            "type": "flex",
            "className": "nop-dt-node__header",
            "items": [
              {
                "type": "icon",
                "icon": "user-check",
                "className": "nop-dt-node__icon"
              },
              {
                "type": "text",
                "body": "${data.label}",
                "className": "nop-dt-node__title"
              }
            ]
          },
          {
            "type": "text",
            "body": "${data.nodeAssigneeList != null && data.nodeAssigneeList.length > 0 ? data.nodeAssigneeList.map(a => a.name).join(', ') : '未设置审批人'}",
            "className": "nop-dt-node__subtitle"
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
              "label": "节点名称"
            },
            {
              "type": "select",
              "name": "data.setType",
              "label": "审批人类型",
              "options": [
                { "label": "指定成员", "value": 1 },
                { "label": "直属主管", "value": 2 },
                { "label": "角色", "value": 3 },
                { "label": "发起人自选", "value": 4 },
                { "label": "发起人自己", "value": 5 },
                { "label": "多级主管", "value": 6 },
                { "label": "部门", "value": 7 }
              ]
            },
            {
              "type": "select",
              "name": "data.examineMode",
              "label": "审批方式",
              "options": [
                { "label": "依次审批", "value": 1 },
                { "label": "会签", "value": 2 },
                { "label": "或签", "value": 3 },
                { "label": "票签", "value": 4 }
              ]
            },
            {
              "type": "select",
              "name": "data.rejectStrategy",
              "label": "驳回策略",
              "options": [
                { "label": "驳回到发起人", "value": 1 },
                { "label": "驳回到上一节点", "value": 2 },
                { "label": "终止流程", "value": 4 }
              ]
            },
            {
              "type": "switch",
              "name": "data.termAuto",
              "label": "超时自动处理"
            },
            {
              "type": "input-number",
              "name": "data.term",
              "label": "超时(小时)",
              "visible": "${data.termAuto === true}"
            },
            {
              "type": "select",
              "name": "data.termMode",
              "label": "超时动作",
              "visible": "${data.termAuto === true}",
              "options": [
                { "label": "自动通过", "value": 0 },
                { "label": "自动拒绝", "value": 1 }
              ]
            },
            {
              "type": "switch",
              "name": "data.allowTransfer",
              "label": "允许转交"
            },
            {
              "type": "switch",
              "name": "data.allowAppendNode",
              "label": "允许加签"
            },
            {
              "type": "switch",
              "name": "data.allowRollback",
              "label": "允许回退"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": false,
        "isTerminal": false
      }
    },
    {
      "id": "dt-cc",
      "label": "抄送人",
      "icon": "mail",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#f0fdf4",
        "stroke": "#16a34a",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "className": "nop-dt-node nop-dt-node--cc",
        "items": [
          {
            "type": "flex",
            "className": "nop-dt-node__header",
            "items": [
              {
                "type": "icon",
                "icon": "mail",
                "className": "nop-dt-node__icon"
              },
              {
                "type": "text",
                "body": "${data.label}",
                "className": "nop-dt-node__title"
              }
            ]
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
              "label": "节点名称"
            },
            {
              "type": "switch",
              "name": "data.allowSelection",
              "label": "允许发起人自选抄送人"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": false,
        "isTerminal": false
      }
    },
    {
      "id": "dt-condition",
      "label": "条件分支",
      "icon": "git-branch",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#ede9fe",
        "stroke": "#7c3aed",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "className": "nop-dt-node nop-dt-node--condition",
        "items": [
          {
            "type": "flex",
            "className": "nop-dt-node__header",
            "items": [
              {
                "type": "icon",
                "icon": "git-branch",
                "className": "nop-dt-node__icon"
              },
              {
                "type": "text",
                "body": "${data.label}",
                "className": "nop-dt-node__title"
              }
            ]
          },
          {
            "type": "text",
            "body": "${data.mode === 'exclusive' ? '排他分支' : data.mode === 'parallel' ? '并行分支' : data.mode === 'inclusive' ? '包容分支' : '条件分支'}",
            "className": "nop-dt-node__subtitle"
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
              "label": "节点名称"
            },
            {
              "type": "select",
              "name": "data.mode",
              "label": "分支类型",
              "options": [
                { "label": "排他分支（条件路由）", "value": "exclusive" },
                { "label": "并行分支", "value": "parallel" },
                { "label": "包容分支", "value": "inclusive" }
              ]
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": true,
        "minBranches": 2,
        "maxBranches": 10,
        "isTerminal": false
      }
    },
    {
      "id": "dt-parallel",
      "label": "并行分支",
      "icon": "git-merge",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#ede9fe",
        "stroke": "#7c3aed",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "className": "nop-dt-node nop-dt-node--parallel",
        "items": [
          {
            "type": "flex",
            "className": "nop-dt-node__header",
            "items": [
              {
                "type": "icon",
                "icon": "git-merge",
                "className": "nop-dt-node__icon"
              },
              {
                "type": "text",
                "body": "${data.label}",
                "className": "nop-dt-node__title"
              }
            ]
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
              "label": "节点名称"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": true,
        "minBranches": 2,
        "maxBranches": 10,
        "isTerminal": false
      }
    },
    {
      "id": "dt-subprocess",
      "label": "子流程",
      "icon": "layers",
      "appearance": {
        "minWidth": 200,
        "minHeight": 60,
        "fill": "#fdf4ff",
        "stroke": "#a855f7",
        "cornerRadius": 8
      },
      "body": {
        "type": "flex",
        "direction": "column",
        "className": "nop-dt-node nop-dt-node--subprocess",
        "items": [
          {
            "type": "flex",
            "className": "nop-dt-node__header",
            "items": [
              {
                "type": "icon",
                "icon": "layers",
                "className": "nop-dt-node__icon"
              },
              {
                "type": "text",
                "body": "${data.label}",
                "className": "nop-dt-node__title"
              }
            ]
          },
          {
            "type": "text",
            "body": "${data.callProcess ?? '未关联子流程'}",
            "className": "nop-dt-node__subtitle"
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
              "label": "节点名称"
            },
            {
              "type": "input-text",
              "name": "data.callProcess",
              "label": "子流程标识"
            },
            {
              "type": "switch",
              "name": "data.callAsync",
              "label": "异步调用"
            }
          ]
        }
      },
      "tree": {
        "allowChild": true,
        "allowBranches": false,
        "isTerminal": false
      }
    },
    {
      "id": "dt-end",
      "label": "结束",
      "icon": "square",
      "appearance": {
        "minWidth": 120,
        "minHeight": 40,
        "fill": "#f1f5f9",
        "stroke": "#64748b",
        "cornerRadius": 4
      },
      "body": {
        "type": "text",
        "body": "结束",
        "className": "nop-dt-node nop-dt-node--end"
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
        "label": "流程节点",
        "items": [
          { "type": "dt-initiator", "label": "发起人" },
          { "type": "dt-approval", "label": "审批人" },
          { "type": "dt-cc", "label": "抄送人" },
          { "type": "dt-subprocess", "label": "子流程" },
          { "type": "dt-end", "label": "结束" }
        ]
      },
      {
        "label": "分支",
        "items": [
          { "type": "dt-condition", "label": "条件分支" },
          { "type": "dt-parallel", "label": "并行分支" }
        ]
      }
    ]
  }
}
```

## FlowLong JSON ↔ TreeDocument Conversion

### FlowLong → TreeDocument

转换规则：

1. `ProcessModel.nodeConfig` → `TreeDocument.root`
2. `NodeModel.childNode` → `TreeNode.child`（递归）
3. `NodeModel.conditionNodes` / `parallelNodes` / `inclusiveNodes` / `routeNodes` → `TreeNode.branches[]`
4. 每个 `ConditionNode.childNode` → `TreeNodeBranch.child`
5. `ConditionNode.conditionList` / `nodeName` / `priorityLevel` → `TreeNodeBranch.data`
6. 所有领域字段（`type`, `setType`, `examineMode`, `nodeAssigneeList`...）→ `TreeNode.data`

### TreeDocument → FlowLong

逆向转换：

1. `root` → `nodeConfig`
2. `child` → `childNode`
3. `branches` → 根据 `data.mode` 写入 `conditionNodes` / `parallelNodes` / `inclusiveNodes`
4. `TreeNodeBranch.data.conditionList` → `ConditionNode.conditionList`
5. `TreeNode.data` 中的领域字段展开到 FlowLong 的平级字段

## Related Documents

- `docs/architecture/flow-designer/tree-mode.md` — Tree 模式设计文档
- `docs/examples/action-flow-tree.md` — Action flow tree 配置示例
