# Combo & InputTable 可编辑集合

## Combo 可重复表单组

```json
{
  "type": "combo",
  "name": "contacts",
  "label": "联系人",
  "addable": true,
  "removable": true,
  "reorderable": true,
  "items": [
    { "type": "input-text", "name": "name", "label": "姓名", "required": true },
    { "type": "input-text", "name": "phone", "label": "电话" },
    { "type": "input-email", "name": "email", "label": "邮箱" }
  ]
}
```

### Combo 限制数量

```json
{
  "type": "combo",
  "name": "items",
  "label": "订单项",
  "minItems": 1,
  "maxItems": 10,
  "items": [
    { "type": "select", "name": "product", "label": "产品", "options": "${products}" },
    { "type": "input-number", "name": "qty", "label": "数量" },
    { "type": "input-number", "name": "price", "label": "单价" }
  ]
}
```

### Combo 条件移除

```json
{
  "type": "combo",
  "name": "tags",
  "label": "标签",
  "removable": true,
  "removeWhen": "${isDefault}",
  "items": [{ "type": "input-text", "name": "label", "label": "标签名" }]
}
```

### Combo 事件

```json
{
  "type": "combo",
  "name": "items",
  "label": "明细",
  "onAdd": { "action": "showToast", "args": { "message": "已添加" } },
  "onRemove": { "action": "showToast", "args": { "message": "已移除" } },
  "onReorder": { "action": "ajax", "args": { "url": "/api/reorder" } },
  "items": [{ "type": "input-text", "name": "name" }]
}
```

## InputTable 可编辑表格

```json
{
  "type": "input-table",
  "name": "rows",
  "label": "明细行",
  "columns": [
    { "label": "产品", "width": 200 },
    { "label": "数量", "width": 100 },
    { "label": "单价", "width": 100 }
  ],
  "addable": true,
  "removable": true,
  "reorderable": true,
  "item": [
    { "type": "select", "name": "product", "placeholder": "选择产品" },
    { "type": "input-number", "name": "qty", "placeholder": "数量", "min": 1 },
    { "type": "input-number", "name": "price", "placeholder": "单价" }
  ]
}
```

### InputTable 只读模式

```json
{
  "type": "input-table",
  "name": "details",
  "label": "详情",
  "readOnly": true,
  "columns": [
    { "label": "项目", "width": 200 },
    { "label": "金额", "width": 100 }
  ],
  "item": [
    { "type": "text", "name": "name" },
    { "type": "text", "name": "amount" }
  ]
}
```

### InputTable 派生列 / 只读列（item region 表达式）

`item` region 内每列是一个完整控件节点，控件字段表达式直接绑定**当前行数据**（行 scope 已把当前行记录字段展开到顶层，直接用裸字段名即可，无需 `record.` 前缀）——派生列、只读列、联动均由此实现，**无需专门的 compute 机制**。

```json
{
  "type": "input-table",
  "name": "orderLines",
  "label": "订单明细",
  "addable": true,
  "removable": true,
  "columns": [
    { "label": "产品", "width": 200 },
    { "label": "数量", "width": 100 },
    { "label": "单价", "width": 100 },
    { "label": "小计", "width": 120 },
    { "label": "状态", "width": 120 }
  ],
  "item": [
    { "type": "select", "name": "product", "placeholder": "选择产品" },
    { "type": "input-number", "name": "qty", "placeholder": "数量", "min": 1 },
    { "type": "input-number", "name": "price", "placeholder": "单价" },
    {
      "type": "text",
      "text": "${qty * price}",
      "readOnly": true
    },
    {
      "type": "text",
      "text": "${status == 'paid' ? '已支付' : '未支付'}",
      "readOnly": true
    }
  ]
}
```

要点：

| 关键点              | 说明                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 表达式读行字段      | `text`/`disabled`/`placeholder` 等控件字段直接写 `${qty}`、`${qty * price}`，随行数据变化重算                      |
| 派生列（无 `name`） | 不写 `name` 的展示控件（如 `text`）只读展示派生值，不参与表单值写回                                                |
| 只读列              | 控件级 `readOnly: true`（或整表 `readOnly: true`），与普通编辑列混排                                               |
| 行索引              | 需要行号时用 region 参数 `index`（`item` region 参数：`index`/`value`，可经 `$slot.index`/`$slot.value` 显式访问） |

### InputTable footer（表格底部插槽）

`footer` 渲染在表格底部（组件最末，类型为 `SchemaInput | string`，对齐展示型 `table` 的 footer 语义）——适合放合计行、统计说明等。

```json
{
  "type": "input-table",
  "name": "orderLines",
  "label": "订单明细",
  "columns": [
    { "label": "产品", "width": 200 },
    { "label": "数量", "width": 100 },
    { "label": "单价", "width": 100 }
  ],
  "item": [
    { "type": "select", "name": "product", "placeholder": "选择产品" },
    { "type": "input-number", "name": "qty", "placeholder": "数量" },
    { "type": "input-number", "name": "price", "placeholder": "单价" }
  ],
  "footer": {
    "type": "text",
    "text": "共 ${orderLines.length} 行，合计金额 ${SUM(ARRAYMAP(orderLines, x => x.qty * x.price))}"
  }
}
```

等价写法：直接给字符串 `"footer": "底部说明"`。渲染语义：footer 内容非空才渲染（`data-slot="input-table-footer"`），未配置或内容为空时零渲染。

## 字段参考

### Combo

| 字段                           | 类型           | 说明                                 |
| ------------------------------ | -------------- | ------------------------------------ |
| `items`                        | `SchemaInput`  | 每行模板（region，参数 index/value） |
| `addable`                      | `boolean`      | 显示"添加"按钮（默认 true）          |
| `removable`                    | `boolean`      | 显示"移除"按钮（默认 true）          |
| `reorderable`                  | `boolean`      | 显示排序按钮（默认 true）            |
| `minItems`/`maxItems`          | `number`       | 数量限制                             |
| `itemKey`                      | `string`       | 稳定 React key 字段                  |
| `removeWhen`                   | `string`       | 条件移除门控                         |
| `onAdd`/`onRemove`/`onReorder` | `ActionSchema` | 事件回调                             |

### InputTable

| 字段                                | 类型                    | 说明                                 |
| ----------------------------------- | ----------------------- | ------------------------------------ |
| `columns`                           | `InputTableColumn[]`    | 列定义（label/width）                |
| `item`                              | `SchemaInput`           | 每行模板（region，参数 index/value） |
| `rowKey`                            | `string`                | 稳定 React key                       |
| `addable`/`removable`/`reorderable` | `boolean`               | 行操作按钮                           |
| `minItems`/`maxItems`               | `number`                | 数量限制                             |
| `readOnly`                          | `boolean`               | 只读模式                             |
| `footer`                            | `SchemaInput \| string` | 表格底部插槽（合计/统计区）          |
| `onAdd`/`onRemove`/`onReorder`      | `ActionSchema`          | 事件回调                             |
