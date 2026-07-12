# 范例：业务单据（明细公式 + 聚合合计）

> 演示 `input-table` 行内逐行公式（金额 = 数量 × 单价）+ 自定义 `$Arr` 命名空间做跨行聚合 + `$Math` 算折扣/税额。这是采购单/报价单/报销单的典型结构。

## 前置：宿主注册 `$Arr` 命名空间

`$Arr` 不是内置命名空间，需宿主在构建 formula registry 时注册（见 `11-host-integration.md`）：

```ts
formulaRegistry.registerNamespace('$Arr', {
  sum: (vals) => vals.reduce((a, b) => a + Number(b || 0), 0),
  sumField: (records, field) => records.reduce((a, r) => a + (Number(r?.[field]) || 0), 0),
  sumProducts: (records, fa, fb) =>
    records.reduce((a, r) => a + (Number(r?.[fa]) || 0) * (Number(r?.[fb]) || 0), 0),
  count: (records) => records?.length ?? 0,
});
```

## Schema

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "form",
      "id": "purchase-order-form",
      // 初始数据：表头 + 两行明细
      "data": {
        "supplier": "",
        "discountRate": 0,
        "taxRate": 13,
        "items": [
          { "name": "服务器", "qty": 2, "price": 18000 },
          { "name": "交换机", "qty": 1, "price": 6800 },
        ],
      },
      "submitAction": {
        "action": "ajax",
        "args": { "url": "/api/purchase-order/save", "method": "post", "includeScope": "*" },
        "messages": { "success": "采购单已提交" },
        "then": [{ "action": "setValue", "args": { "path": "orderSaved", "value": true } }],
      },
      "body": [
        // ── 表头 ──
        {
          "type": "fieldset",
          "title": "表头信息",
          "columnCount": 2,
          "body": [
            { "type": "input-text", "name": "supplier", "label": "供应商", "required": true },
            {
              "type": "input-number",
              "name": "discountRate",
              "label": "折扣率(%)",
              "min": 0,
              "max": 100,
            },
            { "type": "input-number", "name": "taxRate", "label": "税率(%)", "min": 0, "max": 100 },
          ],
        },

        // ── 明细：input-table，每行一个 item spec ──
        {
          "type": "input-table",
          "name": "items",
          "label": "采购明细",
          "rowKey": "name",
          "addable": true,
          "removable": true,
          "columns": [
            { "label": "商品名称", "width": 240 },
            { "label": "数量", "width": 110 },
            { "label": "单价(元)", "width": 130 },
            { "label": "金额(元)", "width": 130 },
          ],
          "item": [
            { "type": "input-text", "name": "name", "required": true },
            { "type": "input-number", "name": "qty", "min": 0 },
            { "type": "input-number", "name": "price", "min": 0 },

            // 1) 逐行公式：行内 scope 里 qty/price 即本行字段
            { "type": "text", "text": "${(qty ?? 0) * (price ?? 0)}" },
          ],
        },

        // ── 合计：$Arr 跨行聚合 + $Math 折扣/税 ──
        {
          "type": "fieldset",
          "title": "金额合计",
          "body": [
            // 2) sumField：对 items 每行的 qty 求和
            { "type": "text", "text": "数量合计：${$Arr.sumField(items, \"qty\")}" },

            // 3) sumProducts：对 items 每行 qty×price 求和 = 小计
            { "type": "text", "text": "小计：${$Arr.sumProducts(items, \"qty\", \"price\")} 元" },

            // 4) 折后小计：小计 × (1 - discountRate/100)
            {
              "type": "text",
              "text": "折后小计：${$Math.round($Arr.sumProducts(items, \"qty\", \"price\") * (1 - (discountRate ?? 0) / 100))} 元",
            },

            // 5) 税额：折后小计 × taxRate/100
            {
              "type": "text",
              "text": "税额：${$Math.round($Arr.sumProducts(items, \"qty\", \"price\") * (1 - (discountRate ?? 0) / 100) * (taxRate ?? 0) / 100)} 元",
            },

            // 6) 应付合计：折后小计 × (1 + taxRate/100)
            {
              "type": "text",
              "text": "应付合计：${$Math.round($Arr.sumProducts(items, \"qty\", \"price\") * (1 - (discountRate ?? 0) / 100) * (1 + (taxRate ?? 0) / 100))} 元",
              "className": "text-base font-bold",
            },
          ],
        },

        // 7) 提交状态回写：setValue 写 flag，文本读它
        { "type": "text", "text": "提交状态：${orderSaved ? \"已提交 ✓\" : \"未提交\"}" },
      ],
      "actions": [
        {
          "type": "button",
          "label": "提交采购单",
          "variant": "default",
          "onClick": { "action": "submitForm" },
        },
      ],
    },
  ],
}
```

## 为什么这样接

| 关键点                      | 说明                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| 逐行公式 `${qty * price}`   | `input-table.item` 里每个 spec 的 scope 是**当前行**，直接用裸字段名 `qty`/`price`。            |
| `$Arr.sumField/sumProducts` | 跨行聚合需宿主注册的命名空间；内置过滤器 `SUM` 只能对**一个数组**求和，无法跨记录乘积求和。     |
| `$Math.round`               | 内置命名空间，做金额取整。                                                                      |
| 表头字段联动明细合计        | `discountRate`/`taxRate` 是表头字段，与 `items` 同表单 scope，合计表达式可直接引用并自动重算。  |
| `setValue` 写提交 flag      | ajax 成功后用 `setValue` 把 `orderSaved=true` 写回 scope，文本节点读它显示状态——无需手动刷 UI。 |

> 真实完整版见 `apps/playground/src/complex-pages/page-schemas/business-document.json`。
