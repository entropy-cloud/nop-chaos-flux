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
    { "key": "submit", "title": "提交申请", "status": "finish" },
    { "key": "review", "title": "审核中", "status": "process" },
    { "key": "done", "title": "已完成", "status": "wait" }
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

### Timeline 受控当前事件（v2：播放/巡检联动）

> v2 立约（未实现）：下列字段需 timeline 受控扩展（`value`/`valueOwnership`/`valueStatePath`/`onChange`）落地后方可运行；当前 runtime 仅支持上方展示型字段。

`value` 驱动当前事件高亮，点击事件项 seek（`onChange` 声明后事件项可点）：

```json
{
  "type": "timeline",
  "value": "${playback.currentStep}",
  "valueOwnership": "scope",
  "valueStatePath": "playback.currentStep",
  "onChange": {
    "action": "setValue",
    "args": { "path": "playback.currentStep", "value": "${event.value}" }
  },
  "items": [
    { "value": "turn-1", "time": "09:00", "title": "用户发起请求", "level": "default" },
    { "value": "turn-2", "time": "09:01", "title": "策略拦截", "level": "error" },
    { "value": "turn-3", "time": "09:02", "title": "重试成功", "level": "success" }
  ]
}
```

- `value` 按 `item.value` key 匹配，未匹配数字值按索引（clamp）；`value` 未命中时回退 `defaultValue`，再未命中则无高亮（不回退首项，与 steps 的 →0 兜底不同，见 `docs/components/timeline/design.md` §2.1-1）。
- `valueOwnership`：`local`（默认，内部状态）/ `controlled`（只读 `value`，点击只派发）/ `scope`（读写 `valueStatePath`）。
- 播放/暂停计时器不内置：由宿主 `xui:imports` 连接器 + `setValue` 递增 `valueStatePath`，进度展示用 `progress`。

## 字段参考

### Steps

| 字段             | 类型                                 | 说明                                                    |
| ---------------- | ------------------------------------ | ------------------------------------------------------- |
| `items`          | `StepItemSchema[]`                   | 步骤项数组                                              |
| `value`          | `string \| number`                   | 当前步骤 key（未匹配数字值按索引 clamp）                |
| `defaultValue`   | `string \| number`                   | 未提供 value 时的初始值                                 |
| `valueOwnership` | `'local' \| 'controlled' \| 'scope'` | 当前步骤值归属（默认 local）                            |
| `valueStatePath` | `string`                             | scope 模式读写路径                                      |
| `orientation`    | `'horizontal' \| 'vertical'`         | 布局方向（默认 horizontal）                             |
| `onChange`       | `ActionSchema`                       | 点击步骤派发（payload `{ value, stepIndex, stepKey }`） |

每项：`key`（别名 `value`）、`title`、`description`、`status`（`'wait' \| 'process' \| 'finish' \| 'error'`）、`disabled`。

> 注：`statusPath` 不属于 steps（归属 `wizard`）；steps 当前步骤状态由 `value` 派生，不单独走 statusPath。

### Timeline

| 字段             | 类型                                 | 说明                                                         |
| ---------------- | ------------------------------------ | ------------------------------------------------------------ |
| `items`          | `TimelineItemSchema[]`               | 事件项数组                                                   |
| `mode`           | `'left' \| 'right' \| 'alternate'`   | 内容对齐方式                                                 |
| `orientation`    | `'horizontal' \| 'vertical'`         | 布局方向（默认 vertical）                                    |
| `reverse`        | `boolean`                            | 倒序显示                                                     |
| `value`          | `string \| number`                   | 当前事件（v2：key 匹配/索引，高亮）                          |
| `defaultValue`   | `string \| number`                   | value 未命中时的回退值（v2；逐渲染参与解析链，非 seed-only） |
| `valueOwnership` | `'local' \| 'controlled' \| 'scope'` | 当前事件值归属（v2，默认 local）                             |
| `valueStatePath` | `string`                             | scope 模式读写路径（v2）                                     |
| `onChange`       | `ActionSchema`                       | 点击 seek 事件（v2，payload `{ value, index, item }`）       |

每项：`value`（key，可选，缺省按索引；v2）、`time`（时间戳）、`title`（标题）、`detail`（详情）、`icon`（Lucide 图标）、`level`（`'default' \| 'primary' \| 'success' \| 'warning' \| 'error' \| 'info'`）。
