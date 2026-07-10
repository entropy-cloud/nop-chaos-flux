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

| 字段                                | 类型                 | 说明                                 |
| ----------------------------------- | -------------------- | ------------------------------------ |
| `columns`                           | `InputTableColumn[]` | 列定义（label/width）                |
| `item`                              | `SchemaInput`        | 每行模板（region，参数 index/value） |
| `rowKey`                            | `string`             | 稳定 React key                       |
| `addable`/`removable`/`reorderable` | `boolean`            | 行操作按钮                           |
| `minItems`/`maxItems`               | `number`             | 数量限制                             |
| `readOnly`                          | `boolean`            | 只读模式                             |
| `onAdd`/`onRemove`/`onReorder`      | `ActionSchema`       | 事件回调                             |
