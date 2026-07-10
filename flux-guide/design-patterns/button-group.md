# ButtonGroup & DropdownButton 按钮组合

## ButtonGroup

```json
{
  "type": "button-group",
  "items": [
    {
      "type": "button",
      "label": "保存",
      "variant": "default",
      "onClick": { "action": "component:submit", "componentId": "form1" }
    },
    { "type": "button", "label": "取消", "onClick": { "action": "closeSurface" } }
  ]
}
```

### 禁用组内部分按钮

```json
{
  "type": "button-group",
  "items": [
    {
      "type": "button",
      "label": "审核通过",
      "variant": "default",
      "disabled": "${status !== 'pending'}"
    },
    { "type": "button", "label": "驳回", "disabled": "${status !== 'pending'}" }
  ]
}
```

## DropdownButton

```json
{
  "type": "dropdown-button",
  "label": "操作",
  "variant": "default",
  "items": [
    {
      "type": "button",
      "label": "编辑",
      "onClick": { "action": "openDialog", "args": { "title": "编辑" } }
    },
    {
      "type": "button",
      "label": "删除",
      "onClick": { "action": "confirm", "args": { "message": "确认删除？" } }
    }
  ]
}
```

### DropdownButton 带图标

```json
{
  "type": "dropdown-button",
  "label": "导出",
  "icon": "download",
  "items": [
    {
      "type": "button",
      "label": "导出 Excel",
      "onClick": { "action": "ajax", "args": { "url": "/api/export/xls" } }
    },
    {
      "type": "button",
      "label": "导出 PDF",
      "onClick": { "action": "ajax", "args": { "url": "/api/export/pdf" } }
    }
  ]
}
```

## 字段参考

### ButtonGroup

| 字段                   | 类型               | 说明                                  |
| ---------------------- | ------------------ | ------------------------------------- |
| `items`                | `SchemaInput`      | 按钮数组（每个 item 为 ButtonSchema） |
| `value`/`defaultValue` | `string \| number` | 选中值（种子）                        |

### DropdownButton

| 字段       | 类型                | 说明                      |
| ---------- | ------------------- | ------------------------- |
| `items`    | `SchemaInput`       | 下拉项数组                |
| `label`    | `string`            | 主按钮文本                |
| `icon`     | `string`            | 主按钮图标（Lucide 名称） |
| `variant`  | `string`            | 按钮变体                  |
| `disabled` | `boolean \| string` | 禁用状态                  |
