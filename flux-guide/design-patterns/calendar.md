# Calendar 日历

支持月/周/日视图、资源分组、拖拽事件编辑。

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
      "type": "meeting"
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
  "showWeekends": true
}
```

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

## 资源视图

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
    { "id": "room-a", "text": "会议室 A", "type": "room" },
    { "id": "room-b", "text": "会议室 B", "type": "room" }
  ]
}
```

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

| 字段                            | 类型                                 | 说明                        |
| ------------------------------- | ------------------------------------ | --------------------------- |
| `view`                          | `'month' \| 'week' \| 'day'`         | 视图模式（默认 month）      |
| `date`                          | `string` (ISO)                       | 当前日期                    |
| `events`                        | `CalendarEvent[]`                    | 事件数组                    |
| `resources`                     | `CalendarResource[]`                 | 资源列表                    |
| `firstDayOfWeek`                | `0 \| 1`                             | 每周第一天（0=周日 1=周一） |
| `showWeekends`                  | `boolean`                            | 显示周末（默认 true）       |
| `maxConcurrent`                 | `number`                             | 事件重叠最大行数（默认 4）  |
| `showCrossDayLines`             | `boolean`                            | 显示跨日线（默认 true）     |
| `timezoneSelector`              | `boolean`                            | 显示时区选择器              |
| `viewOwnership`/`dateOwnership` | `'local' \| 'controlled' \| 'scope'` | 视图/日期所有权             |

### Events

| 事件            | 说明              |
| --------------- | ----------------- |
| `onEventClick`  | 事件点击          |
| `onDateChange`  | 日期变化          |
| `onViewChange`  | 视图切换          |
| `onEventChange` | 事件拖拽/大小调整 |
| `onEventCreate` | 创建新事件        |

### Regions

| 区域            | 说明             |
| --------------- | ---------------- |
| `body`          | 覆盖默认整体布局 |
| `eventTemplate` | 自定义事件渲染   |
| `loading`       | 加载中           |
| `empty`         | 空状态           |

### Reactions

`component:print`, `component:exportPNG`, `component:importICal`, `component:exportToICal`

### 组件句柄方法

| 方法                 | 说明       |
| -------------------- | ---------- |
| `goNext()`           | 下一周期   |
| `goPrev()`           | 上一周期   |
| `goToday()`          | 回到今天   |
| `setView(view)`      | 切换视图   |
| `scrollToDate(date)` | 滚动到日期 |
| `exportToPNG()`      | 导出为图片 |
| `exportToPrint()`    | 打印       |
