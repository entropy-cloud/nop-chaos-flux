# Kanban 看板

拖拽式看板组件，支持列管理、卡片拖拽、过滤。

## 基础用法

```json
{
  "type": "kanban",
  "data": {
    "col-1": {
      "id": "col-1",
      "type": "column",
      "children": ["card-1", "card-2"],
      "data": { "title": "待办" }
    },
    "col-2": {
      "id": "col-2",
      "type": "column",
      "children": ["card-3"],
      "data": { "title": "进行中" }
    },
    "col-3": { "id": "col-3", "type": "column", "children": [], "data": { "title": "已完成" } },
    "card-1": {
      "id": "card-1",
      "type": "card",
      "parentId": "col-1",
      "children": [],
      "data": { "title": "设计评审", "tags": ["设计"] }
    },
    "card-2": {
      "id": "card-2",
      "type": "card",
      "parentId": "col-1",
      "children": [],
      "data": { "title": "技术预研", "tags": ["研发"] }
    },
    "card-3": {
      "id": "card-3",
      "type": "card",
      "parentId": "col-2",
      "children": [],
      "data": { "title": "实现登录页", "tags": ["研发"] }
    }
  },
  "columnsConfig": {
    "col-1": { "id": "col-1", "title": "待办", "cardLimit": 10 },
    "col-2": { "id": "col-2", "title": "进行中", "cardLimit": 5 },
    "col-3": { "id": "col-3", "title": "已完成", "cardLimit": 10 }
  },
  "draggable": true,
  "columnWidth": 280
}
```

## 过滤卡片

```json
{
  "type": "kanban",
  "data": {
    "col-1": { "type": "column", "children": [] },
    "card-1": {
      "type": "card",
      "parentId": "col-1",
      "children": [],
      "data": { "title": "Task", "tags": ["urgent"] }
    }
  },
  "columnsConfig": { "col-1": { "title": "任务" } },
  "filterText": "${searchKeyword}",
  "filterCard": "title",
  "filterTags": ["urgent"]
}
```

## 受控列排序

```json
{
  "type": "kanban",
  "data": {},
  "columnsConfig": {},
  "columnsOrderOwnership": "controlled",
  "columnsOrderStatePath": "kanban.columnsOrder",
  "collapsedOwnership": "scope",
  "collapsedStatePath": "kanban.collapsed"
}
```

## 字段参考

| 字段                    | 类型                                 | 说明                      |
| ----------------------- | ------------------------------------ | ------------------------- |
| `data`                  | `Record<string, BoardItem>`          | 看板数据（列+卡片图结构） |
| `configMap`             | `Record<string, any>`                | 额外配置映射              |
| `columnsConfig`         | `Record<string, any>`                | 列配置（标题/数量限制等） |
| `filterText`            | `string`                             | 按文本过滤                |
| `filterCard`            | `string`                             | 过滤的属性路径            |
| `filterTags`            | `string[]`                           | 按标签过滤                |
| `columnWidth`           | `number \| 'auto' \| 'equal'`        | 列宽                      |
| `columnDraggable`       | `boolean`                            | 列可拖拽                  |
| `draggable`             | `boolean`                            | 卡片可拖拽                |
| `columnsOrderOwnership` | `'local' \| 'controlled' \| 'scope'` | 列排序所有权              |
| `collapsedOwnership`    | `'local' \| 'controlled' \| 'scope'` | 折叠状态所有权            |

### Events

| 事件              | 说明         |
| ----------------- | ------------ |
| `onCardMove`      | 卡片拖拽移动 |
| `onCardClick`     | 卡片点击     |
| `onCardAdd`       | 添加卡片     |
| `onCardRemove`    | 删除卡片     |
| `onColumnReorder` | 列排序变化   |
| `onColumnClick`   | 列头点击     |

### Regions

| 区域                  | 说明               |
| --------------------- | ------------------ |
| `body`                | 覆盖默认整体布局   |
| `columnHeader`        | 列头部自定义渲染   |
| `columnHeaderToolbar` | 列头部工具栏       |
| `cardTemplate`        | 卡片模板自定义渲染 |
| `columnFooter`        | 列底部区域         |
| `empty`               | 空状态             |
| `loading`             | 加载中             |
