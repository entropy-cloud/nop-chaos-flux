# 内容展示组件（Card / Alert / Status / Mapping）

## Card

```json
{
  "type": "card",
  "variant": "default",
  "header": [{ "type": "text", "text": "用户信息" }],
  "body": [
    { "type": "text", "text": "姓名：张三" },
    { "type": "text", "text": "角色：管理员" }
  ],
  "footer": [
    {
      "type": "button",
      "label": "编辑",
      "onClick": { "action": "showToast", "args": { "message": "编辑" } }
    }
  ]
}
```

### Card 小尺寸

```json
{
  "type": "card",
  "variant": "sm",
  "header": [{ "type": "text", "text": "统计摘要" }],
  "body": [{ "type": "text", "text": "本月新增用户 128 人" }]
}
```

### Card 带图片

```json
{
  "type": "card",
  "image": "https://example.com/cover.jpg",
  "imageClassName": "h-48 w-full object-cover",
  "title": [{ "type": "text", "text": "文章标题" }],
  "body": [{ "type": "text", "text": "文章内容..." }]
}
```

## Alert

```json
{
  "type": "alert",
  "level": "info",
  "title": "提示",
  "body": "当前处于只读模式",
  "closable": true
}
```

### Alert 级别

```json
{
  "type": "alert",
  "level": "success",
  "title": "操作成功",
  "body": "数据已保存"
}
```

```json
{
  "type": "alert",
  "level": "warning",
  "title": "注意",
  "body": "此操作不可撤销"
}
```

```json
{
  "type": "alert",
  "level": "error",
  "title": "错误",
  "body": "保存失败，请重试",
  "closable": true,
  "actions": [{ "type": "button", "label": "重试" }]
}
```

## Status

```json
{
  "type": "status",
  "value": "${order.status}",
  "labelMap": { "0": "待处理", "1": "处理中", "2": "已完成", "3": "已取消" },
  "levelMap": { "0": "pending", "1": "processing", "2": "success", "3": "inactive" },
  "iconMap": { "0": "clock", "1": "loader", "2": "check-circle", "3": "x-circle" }
}
```

### Status 在 CRUD 列中使用

```json
{
  "type": "crud",
  "columns": [
    { "label": "订单号", "name": "orderNo" },
    {
      "label": "状态",
      "type": "status",
      "value": "${item.status}",
      "labelMap": { "0": "待付款", "1": "已付款", "2": "已完成" },
      "levelMap": { "0": "warning", "1": "processing", "2": "success" }
    }
  ]
}
```

## Mapping

```json
{
  "type": "mapping",
  "value": "${item.status}",
  "map": { "1": "启用", "0": "禁用", "-1": "已删除" },
  "defaultLabel": "未知",
  "placeholder": "-"
}
```

### Mapping 自定义模板

```json
{
  "type": "mapping",
  "value": "${item.level}",
  "map": {
    "high": { "type": "text", "text": "高风险", "className": "text-red-500" },
    "medium": { "type": "text", "text": "中风险", "className": "text-yellow-500" },
    "low": { "type": "text", "text": "低风险", "className": "text-green-500" }
  }
}
```

## 字段参考

### Card

| 字段             | 类型                | 说明                    |
| ---------------- | ------------------- | ----------------------- |
| `variant`        | `'default' \| 'sm'` | 卡片尺寸                |
| `image`          | `string`            | 顶部图片 URL            |
| `imageClassName` | `string`            | 图片样式                |
| `header`         | `SchemaInput`       | 顶部区域                |
| `title`          | `SchemaInput`       | 标题（value-or-region） |
| `body`           | `SchemaInput`       | 主体区域                |
| `footer`         | `SchemaInput`       | 底部区域                |
| `actions`        | `SchemaInput`       | 操作区                  |
| `onClick`        | `ActionSchema`      | 点击事件                |

### Alert

| 字段       | 类型                                          | 说明                        |
| ---------- | --------------------------------------------- | --------------------------- |
| `level`    | `'info' \| 'success' \| 'warning' \| 'error'` | 语义级别                    |
| `icon`     | `string`                                      | 覆盖默认图标（Lucide 名称） |
| `title`    | `SchemaInput`                                 | 标题                        |
| `body`     | `SchemaInput`                                 | 主要内容                    |
| `actions`  | `SchemaInput`                                 | 操作区                      |
| `closable` | `boolean`                                     | 显示关闭按钮                |
| `onClose`  | `ActionSchema`                                | 关闭事件                    |

### Status

| 字段          | 类型                          | 说明           |
| ------------- | ----------------------------- | -------------- |
| `value`       | `SchemaValue`                 | 业务状态值     |
| `labelMap`    | `Record<string, SchemaValue>` | 值→显示标签    |
| `levelMap`    | `Record<string, SchemaValue>` | 值→语义级别    |
| `iconMap`     | `Record<string, SchemaValue>` | 值→Lucide 图标 |
| `placeholder` | `string`                      | 空/未命中回退  |

### Mapping

| 字段           | 类型                          | 说明                   |
| -------------- | ----------------------------- | ---------------------- |
| `value`        | `SchemaValue`                 | 要映射的值             |
| `map`          | `Record<string, SchemaValue>` | 查找表                 |
| `defaultLabel` | `string`                      | 值存在但无匹配时的回退 |
| `placeholder`  | `string`                      | 值为空/缺失时的回退    |
| `item`         | `SchemaInput`                 | 命中项的自定义模板     |
