# Calendar 日历

支持月/周/日视图、资源分组折叠、拖拽事件编辑、时区、打印与图片导出。

## 基础用法

```json
{
  "type": "calendar",
  "view": "month",
  "events": [
    {
      "id": "1",
      "title": "项目评审",
      "start": "2026-07-22T09:00",
      "end": "2026-07-22T11:00",
      "type": "meeting",
      "status": "confirmed"
    },
    {
      "id": "2",
      "title": "提交周报",
      "start": "2026-07-24T17:00",
      "end": "2026-07-24T18:00",
      "type": "deadline"
    }
  ],
  "firstDayOfWeek": 1,
  "showWeekends": true,
  "locale": "zh-CN"
}
```

> 事件 `status`：`scheduled | confirmed | cancelled`；`color` 可自定义事件颜色。

## 周视图

```json
{
  "type": "calendar",
  "view": "week",
  "date": "2026-07-22",
  "events": [
    { "id": "e1", "title": "站会", "start": "2026-07-22T09:30", "end": "2026-07-22T10:00" },
    { "id": "e2", "title": "需求评审", "start": "2026-07-22T14:00", "end": "2026-07-22T16:00" }
  ],
  "maxConcurrent": 4
}
```

## 资源分组视图

```json
{
  "type": "calendar",
  "view": "day",
  "date": "2026-07-22",
  "events": [
    {
      "id": "e1",
      "title": "面试",
      "start": "2026-07-22T10:00",
      "end": "2026-07-22T11:00",
      "resourceId": "room-a"
    },
    {
      "id": "e2",
      "title": "会议",
      "start": "2026-07-22T10:00",
      "end": "2026-07-22T11:00",
      "resourceId": "room-b"
    }
  ],
  "resources": [
    {
      "id": "room-group",
      "title": "会议室",
      "type": "group",
      "open": true,
      "resources": [
        { "id": "room-a", "title": "会议室 A", "type": "room" },
        { "id": "room-b", "title": "会议室 B", "type": "room" }
      ]
    }
  ]
}
```

> 资源用 `title`（`text` 已废弃）。`resources[].resources` 嵌套子资源，`open` 控制分组折叠（`onGroupToggle` 事件）。

## 自定义事件模板

```json
{
  "type": "calendar",
  "view": "month",
  "events": [],
  "eventTemplate": [
    { "type": "text", "text": "${event.title}", "className": "font-medium" },
    { "type": "text", "text": "${event.start}", "className": "text-xs text-gray-500" }
  ]
}
```

## 字段参考

| 字段                            | 类型                                 | 说明                                            |
| ------------------------------- | ------------------------------------ | ----------------------------------------------- |
| `view`                          | `'month' \| 'week' \| 'day'`         | 视图模式（默认 month）                          |
| `date`                          | `string` (ISO)                       | 当前日期                                        |
| `events`                        | `CalendarEvent[]`                    | 事件数组（`status`/`color`/`resourceId`）       |
| `resources`                     | `CalendarResource[]`                 | 资源列表（`resources[]` 嵌套 + `open`）         |
| `firstDayOfWeek`                | `0 \| 1`                             | 每周第一天（0=周日 1=周一）                     |
| `showWeekends`                  | `boolean`                            | 显示周末（默认 true）                           |
| `maxConcurrent`                 | `number`                             | 事件重叠最大行数（默认 4）                      |
| `showCrossDayLines`             | `boolean`                            | 显示跨日线（默认 true）                         |
| `timezoneSelector`              | `boolean`                            | 显示时区选择器（保留）                          |
| `batchScheduling`               | `boolean`                            | 批量排期（保留）                                |
| `locale`                        | `string`                             | 区域语言（默认跟随浏览器 `navigator.language`） |
| `viewOwnership`/`dateOwnership` | `'local' \| 'controlled' \| 'scope'` | 视图/日期所有权                                 |
| `viewStatePath`/`dateStatePath` | `string`                             | scope 模式下视图/日期的存储路径                 |
| `statusPath`                    | `string`                             | 业务状态字段路径（已注册，未接线）              |
| `headerClassName`               | `string`                             | 头部类名                                        |
| `eventClassName`                | `string`                             | 事件类名                                        |
| `emptyClassName`                | `string`                             | 空状态类名                                      |

### Events

| 事件               | 说明                               |
| ------------------ | ---------------------------------- |
| `onEventClick`     | 事件点击                           |
| `onDateChange`     | 日期变化                           |
| `onViewChange`     | 视图切换                           |
| `onEventChange`    | 事件拖拽/大小调整                  |
| `onEventCreate`    | 拖拽创建新事件（创建通道唯一入口） |
| `onGroupToggle`    | 资源分组折叠切换                   |
| `onImportError`    | iCal 导入失败（保留，未接线）      |
| `loadAction`       | 加载事件数据                       |
| `onMount`          | 挂载完成                           |
| `onUnmount`        | 卸载前                             |
| `onBatchSchedule`  | 批量排期（保留，未接线）           |
| `onImport`         | iCal 导入（保留，未接线）          |
| `onTimezoneChange` | 时区切换（保留，未接线）           |

### Regions

| 区域            | 说明             |
| --------------- | ---------------- |
| `body`          | 覆盖默认整体布局 |
| `eventTemplate` | 自定义事件渲染   |
| `loading`       | 加载中           |
| `empty`         | 空状态           |

### Reactions

`print`, `exportPNG`, `importICal`（保留）, `exportToICal`（保留）

### 组件句柄方法

| 方法                                        | 说明       |
| ------------------------------------------- | ---------- |
| `goNext()`                                  | 下一周期   |
| `goPrev()`                                  | 上一周期   |
| `goToday()`                                 | 回到今天   |
| `setView(view)`                             | 切换视图   |
| `scrollToDate(date)`                        | 滚动到日期 |
| `exportToPNG(element?, fileName?, signal?)` | 导出为图片 |
| `exportToPrint()`                           | 打印       |
