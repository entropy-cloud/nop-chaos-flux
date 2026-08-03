# Gantt 甘特图

企业级甘特图组件，支持任务层级、依赖链接、资源分配、基线对比、多刻度缩放与撤销。

## 基础用法

```json
{
  "type": "gantt",
  "tasks": [
    {
      "id": 1,
      "text": "需求分析",
      "start": "2026-07-01",
      "end": "2026-07-10",
      "type": "task",
      "progress": 100
    },
    {
      "id": 2,
      "text": "UI 设计",
      "start": "2026-07-11",
      "end": "2026-07-20",
      "type": "task",
      "progress": 60
    },
    {
      "id": 3,
      "text": "开发阶段",
      "start": "2026-07-21",
      "end": "2026-08-20",
      "type": "project",
      "progress": 30
    }
  ],
  "links": [
    { "id": 1, "source": 1, "target": 2, "type": "finish_to_start" },
    { "id": 2, "source": 2, "target": 3, "type": "finish_to_start" }
  ],
  "defaultZoom": "week",
  "draggable": true,
  "editable": true
}
```

## 多层级任务

```json
{
  "type": "gantt",
  "tasks": [
    {
      "id": "p1",
      "text": "V2.0 项目",
      "start": "2026-07-01",
      "end": "2026-09-30",
      "type": "project",
      "open": true,
      "children": [
        {
          "id": "t1",
          "text": "需求",
          "start": "2026-07-01",
          "end": "2026-07-15",
          "type": "task",
          "progress": 100,
          "parent": "p1"
        },
        {
          "id": "t2",
          "text": "开发",
          "start": "2026-07-16",
          "end": "2026-09-01",
          "type": "task",
          "progress": 40,
          "parent": "p1"
        },
        {
          "id": "m1",
          "text": "里程碑: 封版",
          "start": "2026-09-01",
          "end": "2026-09-01",
          "type": "milestone",
          "parent": "p1"
        }
      ]
    }
  ]
}
```

> 层级通过 `tasks[].children` 嵌套声明，子任务同时显式写 `parent` 引用父 id。

## 里程碑、分段与基线

```json
{
  "type": "gantt",
  "tasks": [
    {
      "id": 1,
      "text": "热修复",
      "start": "2026-07-01",
      "end": "2026-07-08",
      "type": "task",
      "progress": 80,
      "segments": [
        { "start": "2026-07-01", "end": "2026-07-03", "progress": 100 },
        { "start": "2026-07-04", "end": "2026-07-08", "progress": 60 }
      ],
      "baselines": [
        {
          "id": 1,
          "taskId": 1,
          "baseStart": "2026-06-28",
          "baseEnd": "2026-07-05",
          "baseDuration": 7,
          "baseProgress": 100
        }
      ]
    },
    { "id": 2, "text": "正式发布", "start": "2026-07-10", "end": "2026-07-10", "type": "milestone" }
  ],
  "links": [{ "id": 1, "source": 1, "target": 2, "type": "finish_to_start", "lag": 2 }]
}
```

- `segments`：任务分段（如实际/计划拆分），每段独立起止与进度
- `baselines`：基线对比（灰色底条），`baseProgress` 可选
- `links[].lag`：依赖延迟天数

## 自定义列与缩放级别

```json
{
  "type": "gantt",
  "tasks": [],
  "columns": [
    { "name": "text", "label": "任务名称", "width": 250, "sortable": true },
    { "name": "start", "label": "开始日期", "width": 120 },
    { "name": "end", "label": "结束日期", "width": 120 },
    { "name": "progress", "label": "进度", "width": 100, "align": "center" }
  ],
  "zoomLevels": [
    {
      "key": "day",
      "label": "日",
      "minCellWidth": 30,
      "maxCellWidth": 80,
      "scales": [
        { "unit": "hour", "step": 6, "format": "HH:mm" },
        { "unit": "day", "format": "MM-dd" }
      ]
    },
    { "key": "week", "label": "周", "scales": [{ "unit": "day", "step": 1 }, { "unit": "week" }] }
  ],
  "defaultZoom": "week",
  "cellWidth": 40,
  "taskBarHeight": 28,
  "showWeekends": true,
  "showToday": true
}
```

## 字段参考

| 字段               | 类型                | 说明                                                                 |
| ------------------ | ------------------- | -------------------------------------------------------------------- |
| `tasks`            | `GanttTaskData[]`   | 任务数组（`children` 嵌套层级；`segments`/`baselines`/`calendar`）   |
| `links`            | `GanttLinkData[]`   | 依赖链接数组（`type` ×4 + `lag`）                                    |
| `resources`        | `GanttResource[]`   | 资源列表                                                             |
| `assignments`      | `GanttAssignment[]` | 资源分配（`taskId`/`resourceId`/`units`）                            |
| `columns`          | `GanttColumn[]`     | 左侧表格列配置（`sortable`/`fixed`/`resizable`/`align`）             |
| `zoomLevels`       | `GanttZoomLevel[]`  | 缩放级别配置（`key`/`label`/`scales`/`minCellWidth`/`maxCellWidth`） |
| `defaultZoom`      | `string`            | 默认缩放 key（默认 week）                                            |
| `cellWidth`        | `number`            | 单元格宽度 px（默认 40）                                             |
| `taskBarHeight`    | `number`            | 任务条高度 px                                                        |
| `draggable`        | `boolean`           | 拖拽（默认 true）                                                    |
| `editable`         | `boolean`           | 编辑（默认 true）                                                    |
| `linkable`         | `boolean`           | 链接编辑（默认 true）                                                |
| `showWeekends`     | `boolean`           | 显示周末（默认 true）                                                |
| `showToday`        | `boolean`           | 显示今日线（默认 true）                                              |
| `toolbarClassName` | `string`            | 工具栏类名                                                           |
| `taskBarClassName` | `string`            | 任务条容器类名                                                       |
| `editorClassName`  | `string`            | 内联编辑器类名                                                       |
| `emptyClassName`   | `string`            | 空状态类名                                                           |

> **已废弃字段**（保留兼容、不再推荐）：`scales` → 用 `zoomLevels`；`startDate`/`endDate` → 用任务自身 `start`/`end` + `zoomLevels`；`childrenField`/`initiallyExpanded` → 用 `children` 嵌套；`progressBarHeight` → 用 `taskBarHeight`；`calendar` → 用 `tasks[].calendar` 或 `parse()` 的 `CalendarEntry[]`。

**链接类型**：`finish_to_start` / `start_to_start` / `finish_to_finish` / `start_to_finish`。
**任务类型**：`task` / `project`（汇总条）/ `milestone`（里程碑）。

### Events

| 事件                | 说明                                  |
| ------------------- | ------------------------------------- |
| `onTaskClick`       | 任务点击                              |
| `onTaskDoubleClick` | 任务双击                              |
| `onTaskDragEnd`     | 任务拖拽结束                          |
| `onLinkClick`       | 依赖线点击                            |
| `onLinkDragEnd`     | 依赖线拖拽结束                        |
| `onEmptyCellClick`  | 空白单元格点击                        |
| `onZoomChange`      | 缩放级别变化                          |
| `onScroll`          | 滚动事件（高频，需在 handler 内防抖） |
| `onMount`           | 挂载完成                              |
| `onUnmount`         | 卸载前                                |

### Regions

| 区域      | 说明             |
| --------- | ---------------- |
| `taskBar` | 自定义任务条渲染 |
| `toolbar` | 工具栏区域       |
| `editor`  | 内联任务编辑器   |
| `empty`   | 空状态           |
| `loading` | 加载中           |

### Reactions

`zoomIn`, `zoomOut`, `scrollToToday`, `scrollToTask`

> 编辑操作（拖拽/链接/修改）内部走撤销栈；可交互性受 `draggable`/`editable`/`linkable` 控制。
