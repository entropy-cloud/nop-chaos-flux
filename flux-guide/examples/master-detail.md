# 范例：主从联动（左列表 + 右详情 + 级联子表）

> 演示 `valuesPath` 把"当前选中"发布成过滤器 → 多个 `data-source` 用 `dependsOn`+`sendOn` 并行级联重取 → 详情卡 + 只读 `table` 消费。这是 ERP 里最常见的主从布局。

## 场景

左侧 radio 列表选订单 → 右侧详情卡 + 日志/地址两个只读子表同时刷新。

## Schema

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "flex",
      "direction": "row",
      "gap": 12,
      "body": [
        // ── 左：订单选择 ──
        {
          "type": "container",
          "body": [
            // 1) 取选项列表（挂载即取）
            {
              "type": "data-source",
              "name": "orderPicker",
              "action": "ajax",
              "args": { "url": "/api/orders/pickerOptions", "method": "get" },
            },
            // 2) radio 选择 → 经 valuesPath 发布到 scope.mdFilter
            {
              "type": "form",
              "valuesPath": "mdFilter", // 表单值落到 scope.mdFilter
              "data": { "orderId": "" },
              "bodyClassName": "p-0",
              "body": [
                {
                  "type": "radio-group",
                  "name": "orderId",
                  "options": "${orderPicker?.items}",
                },
              ],
            },
          ],
        },

        // ── 右：详情 + 子表（都监听 mdFilter） ──
        {
          "type": "container",
          "body": [
            // 3) 详情：dependsOn mdFilter，sendOn 等到有 orderId 才发
            {
              "type": "data-source",
              "name": "orderDetail",
              "dependsOn": ["mdFilter"],
              "sendOn": "mdFilter?.orderId",
              "action": "ajax",
              "args": {
                "url": "/api/orders/get",
                "method": "get",
                "data": { "id": "${mdFilter?.orderId}" },
              },
            },
            // 4) 同样的依赖可复制多份：日志、地址……并行重跑
            {
              "type": "data-source",
              "name": "orderLogs",
              "dependsOn": ["mdFilter"],
              "sendOn": "mdFilter?.orderId",
              "action": "ajax",
              "args": {
                "url": "/api/order-logs",
                "method": "get",
                "data": { "orderId": "${mdFilter?.orderId}" },
              },
            },

            // 5) 详情卡（条件标题 + 兜底显示）
            {
              "type": "text",
              "text": "${mdFilter?.orderId ? \"订单详情\" : \"请选择左侧订单\"}",
            },
            { "type": "text", "text": "单号：${orderDetail?.orderNo ?? \"-\"}" },
            { "type": "text", "text": "金额：${orderDetail?.amount ?? \"-\"}" },

            // 6) 只读子表消费 data-source
            {
              "type": "table",
              "source": "${orderLogs?.items}",
              "rowKey": "id",
              "empty": { "type": "text", "text": "暂无日志" },
              "columns": [
                { "name": "time", "label": "时间" },
                { "name": "action_label", "label": "操作" },
                {
                  "type": "operation",
                  "label": "操作",
                  "buttons": [
                    // 行按钮用 $slot.record 显式取当前行
                    {
                      "type": "button",
                      "label": "查看",
                      "size": "sm",
                      "onClick": {
                        "action": "openDialog",
                        "args": {
                          "title": "日志详情",
                          "data": { "id": "${$slot.record.id}" },
                          "body": { "type": "text", "text": "日志 ${$slot.record.id}" },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
```

## 为什么这样接

| 关键点               | 说明                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `valuesPath`         | 把 radio 选择收拢成 `mdFilter = { orderId }`，避免污染父 scope；下游统一监听这一个路径。            |
| `dependsOn`+`sendOn` | `dependsOn` 决定"何时重跑"，`sendOn` 决定"何时才真发请求"——避免选中前/空值时打无效请求。            |
| 多数据源同依赖       | 详情/日志/地址都 `dependsOn: ["mdFilter"]`，会并行重跑，互不阻塞。                                  |
| `$slot.record.*`     | 只读 `table` 操作列的行按钮用 `$slot.record` 显式取当前行（与 `crud.md` §5 的 `$slot.item` 对应）。 |
| `?? "-"` 兜底        | 详情字段在首次未取/取空时显示占位，避免渲染 `undefined`。                                           |

> 真实完整版（含可编辑子表 CRUD、addresses 子表、tabs 分组）见 `apps/playground/src/complex-pages/page-schemas/master-detail.json`。
