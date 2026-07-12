# 范例：行内编辑（逐行保存）

> 演示 `quickEdit.body` 声明每列的编辑控件 + `quickSaveItemAction` 决定单行如何保存 + 用挂载 marker 让 CRUD 取一次数。无弹窗、每行独立保存。

## 场景

季度预算表：Q1–Q4 单元格可直接改，每行末尾"保存"按钮只提交该行。

## Schema

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "crud",
      "id": "budget-crud",
      "rowKey": "id",
      "loadAllData": true,

      // 1) 挂载即触发一次：dependsOn 塞个永不写入的私有 marker
      "loadAction": {
        "action": "ajax",
        "dependsOn": ["__budget_load__"],
        "args": { "url": "/api/budget", "method": "get" },
      },

      // 2) 单行保存：includeScope:"*" 把该行草稿一起提交
      "quickSaveItemAction": {
        "action": "ajax",
        "args": { "url": "/api/budget/save", "method": "post", "includeScope": "*" },
        "messages": { "success": "保存成功" },
        "then": [{ "action": "component:refresh", "componentId": "budget-crud" }],
      },

      "columns": [
        { "name": "department", "label": "部门", "width": 160 },

        // 3) quickEdit.body：name 用 record.<字段> 写回行草稿；frameWrap:false 去掉表单项外框
        {
          "name": "q1",
          "label": "Q1 预算(万)",
          "width": 130,
          "quickEdit": {
            "body": { "type": "input-number", "name": "record.q1", "min": 0, "frameWrap": false },
          },
        },
        {
          "name": "q2",
          "label": "Q2 预算(万)",
          "width": 130,
          "quickEdit": {
            "body": { "type": "input-number", "name": "record.q2", "min": 0, "frameWrap": false },
          },
        },
        {
          "name": "q3",
          "label": "Q3 预算(万)",
          "width": 130,
          "quickEdit": {
            "body": { "type": "input-number", "name": "record.q3", "min": 0, "frameWrap": false },
          },
        },
        {
          "name": "q4",
          "label": "Q4 预算(万)",
          "width": 130,
          "quickEdit": {
            "body": { "type": "input-number", "name": "record.q4", "min": 0, "frameWrap": false },
          },
        },

        // 4) 行内保存按钮：CRUD 专用 actionType（裸 spec，与 master-detail 一致）
        {
          "type": "operation",
          "label": "操作",
          "buttons": [{ "label": "保存", "actionType": "quickSaveItem" }],
        },
      ],
    },
  ],
}
```

## 为什么这样接

| 关键点                           | 说明                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `quickEdit.body.name`            | 必须用 `record.<字段>` 前缀，编辑值才会落到该行草稿（而非整表 scope）。                    |
| `frameWrap: false`               | 去掉表单项 label/边框，让控件直接铺进单元格。                                              |
| `actionType: "quickSaveItem"`    | 行按钮专用动作类型，触发 CRUD 的 `quickSaveItemAction`，自动以当前行 scope 求值。          |
| `includeScope: "*"`              | 保存时把整行草稿（`record.*`）一起提交，后端按整行 update。                                |
| `dependsOn: ["__budget_load__"]` | CRUD 自带 `loadAction` 没有"挂载即取"开关；用私有 marker 触发一次（见 `data-source.md`）。 |

> 易错点：行内保存字段是 **`quickSaveItemAction`**（不是 `quickSaveAction`）；行按钮触发用 **`actionType: "quickSaveItem"`**。
>
> 真实完整版见 `apps/playground/src/complex-pages/page-schemas/inline-edit-table.json`。
