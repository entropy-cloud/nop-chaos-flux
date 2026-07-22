# Gantt 甘特图

企业级甘特图组件，支持任务层级、依赖链接、资源分配、基线对比。

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

## 里程碑和基线

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
      "baselines": [
        {
          "id": 1,
          "taskId": 1,
          "baseStart": "2026-06-28",
          "baseEnd": "2026-07-05",
          "baseDuration": 7
        }
      ]
    },
    { "id": 2, "text": "正式发布", "start": "2026-07-10", "end": "2026-07-10", "type": "milestone" }
  ],
  "links": [{ "id": 1, "source": 1, "target": 2, "type": "finish_to_start", "lag": 2 }]
}
```

## 自定义列

```json
{
  "type": "gantt",
  "tasks": [],
  "columns": [
    { "name": "text", "label": "任务名称", "width": 250, "sortable": true },
    { "name": "start", "label": "开始日期", "width": 120 },
    { "name": "end", "label": "结束日期", "width": 120 },
    { "name": "progress", "label": "进度", "width": 100, "align": "center" }
  ]
}
```

## 字段参考

| 字段                  | 类型                | 说明                      |
| --------------------- | ------------------- | ------------------------- |
| `tasks`               | `GanttTaskData[]`   | 任务数组                  |
| `links`               | `GanttLinkData[]`   | 依赖链接数组              |
| `resources`           | `GanttResource[]`   | 资源列表                  |
| `assignments`         | `GanttAssignment[]` | 资源分配                  |
| `columns`             | `GanttColumn[]`     | 左侧表格列配置            |
| `scales`              | `GanttScale[]`      | 时间刻度配置              |
| `zoomLevels`          | `GanttZoomLevel[]`  | 缩放级别配置              |
| `defaultZoom`         | `string`            | 默认缩放级别（默认 week） |
| `cellWidth`           | `number`            | 单元格宽度 px（默认 40）  |
| `startDate`/`endDate` | `string`            | 视图时间范围              |
| `draggable`           | `boolean`           | 拖拽（默认 true）         |
| `editable`            | `boolean`           | 编辑（默认 true）         |
| `linkable`            | `boolean`           | 链接编辑（默认 true）     |
| `showWeekends`        | `boolean`           | 显示周末（默认 true）     |
| `showToday`           | `boolean`           | 显示今日线（默认 true）   |

### Events

| 事件                | 说明           |
| ------------------- | -------------- |
| `onTaskClick`       | 任务点击       |
| `onTaskDoubleClick` | 任务双击       |
| `onTaskDragEnd`     | 任务拖拽结束   |
| `onLinkClick`       | 依赖线点击     |
| `onLinkDragEnd`     | 依赖线拖拽结束 |
| `onZoomChange`      | 缩放级别变化   |
| `onScroll`          | 滚动事件       |

### Regions

| 区域      | 说明             |
| --------- | ---------------- |
| `body`    | 覆盖默认整体布局 |
| `taskBar` | 自定义任务条渲染 |
| `toolbar` | 工具栏区域       |
| `editor`  | 内联任务编辑器   |
| `empty`   | 空状态           |
| `loading` | 加载中           |

### Reactions

`zoomIn`, `zoomOut`, `scrollToToday`, `scrollToTask`
