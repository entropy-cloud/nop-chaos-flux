# Steps & Timeline 过程展示

## Steps

```json
{
  "type": "steps",
  "value": "${currentStep}",
  "items": [
    { "key": "submit", "title": "提交申请", "description": "填写基本信息" },
    { "key": "review", "title": "审核中", "description": "等待管理员审核" },
    { "key": "done", "title": "已完成", "description": "流程结束" }
  ]
}
```

### Steps 带状态

```json
{
  "type": "steps",
  "value": "review",
  "items": [
    { "key": "submit", "title": "提交申请", "status": "complete" },
    { "key": "review", "title": "审核中", "status": "active" },
    { "key": "done", "title": "已完成", "status": "waiting" }
  ]
}
```

## Timeline

```json
{
  "type": "timeline",
  "mode": "left",
  "items": [
    {
      "time": "2024-01-15 10:00",
      "title": "创建订单",
      "detail": "订单 #12345",
      "icon": "file-plus"
    },
    { "time": "2024-01-15 10:05", "title": "付款成功", "icon": "check-circle", "level": "success" },
    { "time": "2024-01-16 14:00", "title": "已发货", "icon": "truck", "level": "primary" },
    { "time": "2024-01-18 09:30", "title": "已签收", "icon": "package", "level": "success" }
  ]
}
```

### Timeline 水平布局

```json
{
  "type": "timeline",
  "orientation": "horizontal",
  "mode": "alternate",
  "items": [
    { "time": "Q1", "title": "需求评审", "level": "default" },
    { "time": "Q2", "title": "开发阶段", "level": "primary" },
    { "time": "Q3", "title": "测试阶段", "level": "warning" },
    { "time": "Q4", "title": "上线发布", "level": "success" }
  ]
}
```

### Timeline 倒序

```json
{
  "type": "timeline",
  "reverse": true,
  "items": [
    { "time": "2024-06-01", "title": "最新事件", "level": "success" },
    { "time": "2024-05-15", "title": "之前的事件", "level": "default" }
  ]
}
```

## 字段参考

### Steps

| 字段         | 类型               | 说明       |
| ------------ | ------------------ | ---------- |
| `items`      | `StepItemSchema[]` | 步骤项数组 |
| `value`      | `string \| number` | 当前步骤   |
| `statusPath` | `string`           | 作用域路径 |

每项：`key`、`title`、`description`、`status`（`'waiting' \| 'active' \| 'complete' \| 'error'`）。

### Timeline

| 字段          | 类型                               | 说明                      |
| ------------- | ---------------------------------- | ------------------------- |
| `items`       | `TimelineItemSchema[]`             | 事件项数组                |
| `mode`        | `'left' \| 'right' \| 'alternate'` | 内容对齐方式              |
| `orientation` | `'horizontal' \| 'vertical'`       | 布局方向（默认 vertical） |
| `reverse`     | `boolean`                          | 倒序显示                  |

每项：`time`（时间戳）、`title`（标题）、`detail`（详情）、`icon`（Lucide 图标）、`level`（`'default' \| 'primary' \| 'success' \| 'warning' \| 'error' \| 'info'`）。
