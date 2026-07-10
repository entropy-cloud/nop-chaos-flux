# Collapse 折叠面板

## 基本用法

```json
{
  "type": "collapse",
  "items": [
    { "key": "basic", "title": "基本信息", "body": [{ "type": "text", "text": "姓名：张三" }] },
    {
      "key": "contact",
      "title": "联系方式",
      "body": [{ "type": "text", "text": "电话：13800138000" }]
    },
    { "key": "address", "title": "地址", "body": [{ "type": "text", "text": "北京市朝阳区" }] }
  ]
}
```

## 单面板模式

```json
{
  "type": "collapse",
  "multiple": false,
  "items": [
    {
      "key": "overview",
      "title": "概览",
      "body": [{ "type": "chart", "chartType": "bar", "source": "${data}" }]
    },
    { "key": "detail", "title": "详情", "body": [{ "type": "table", "source": "${details}" }] }
  ]
}
```

## 受控展开

```json
{
  "type": "collapse",
  "value": "${openPanels}",
  "valueOwnership": "scope",
  "valueStatePath": "openPanels",
  "multiple": true,
  "items": [
    { "key": "a", "title": "面板 A", "body": [{ "type": "text", "text": "内容 A" }] },
    { "key": "b", "title": "面板 B", "body": [{ "type": "text", "text": "内容 B" }] }
  ],
  "onChange": { "action": "showToast", "args": { "message": "面板切换" } }
}
```

## 字段参考

| 字段                   | 类型                                       | 说明                              |
| ---------------------- | ------------------------------------------ | --------------------------------- |
| `items`                | `CollapseItemSchema[]`                     | 面板数组                          |
| `value`/`defaultValue` | `string \| number \| (string \| number)[]` | 展开的键                          |
| `valueOwnership`       | `'local' \| 'controlled' \| 'scope'`       | 值所有权                          |
| `valueStatePath`       | `string`                                   | 作用域路径                        |
| `multiple`             | `boolean`                                  | 允许多个面板同时展开（默认 true） |
| `collapsible`          | `boolean`                                  | 面板可折叠（默认 true）           |
| `onChange`             | `ActionSchema`                             | 展开状态变化时触发                |

每项支持：`key`、`title`（value-or-region）、`body`（region）、`disabled`。
