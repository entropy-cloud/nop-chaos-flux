# Kanban 看板

拖拽式看板组件，支持列管理、卡片拖拽、过滤、WIP 限制与折叠状态持久化。

## 基础用法

```json
{
  "type": "kanban",
  "data": {
    "col-1": {
      "id": "col-1",
      "type": "column",
      "children": ["card-1", "card-2"],
      "data": { "title": "待办", "cardLimit": 10 }
    },
    "col-2": {
      "id": "col-2",
      "type": "column",
      "children": ["card-3"],
      "data": { "title": "进行中", "cardLimit": 5, "wipStrict": true }
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
    "col-1": { "id": "col-1", "collapsed": false },
    "col-2": { "id": "col-2", "collapsed": false }
  },
  "draggable": true,
  "columnWidth": 280
}
```

> `data` 是 `id → BoardItem` 的扁平图结构（`type: root | column | card | divider`，`children` 为子 id 数组）。列标题、WIP 限制（`cardLimit`/`wipStrict`）取自列节点的 `data`。`columnsConfig` 仅用于 controlled 模式下列折叠状态（`collapsed`），其余字段运行时不读取。

## 过滤卡片

```json
{
  "type": "kanban",
  "data": {
    "col-1": { "type": "column", "children": [], "data": { "title": "任务" } },
    "card-1": {
      "type": "card",
      "parentId": "col-1",
      "children": [],
      "data": { "title": "Task", "tags": ["urgent"] }
    }
  },
  "filterText": "${searchKeyword}",
  "filterCard": "${card.title}",
  "filterTags": ["urgent"]
}
```

> `filterCard` 是**表达式**（作用域 `{ card, text }`），如 `"${card.title}"` 或 `"${card.data.title}"`——注意它不是属性路径字符串。

## 状态所有权

```json
{
  "type": "kanban",
  "data": {},
  "columnsConfig": {},
  "collapsedOwnership": "scope",
  "collapsedStatePath": "kanban.collapsed",
  "statusPath": "kanban.status"
}
```

- `collapsedOwnership`：`'local' | 'controlled' | 'scope'`，折叠状态所有权
- `collapsedStatePath`：scope 模式下列折叠状态的存储路径
- `kanbanOwnership` / `kanbanStatePath`：整板数据所有权（local/controlled/scope），受控模式需宿主经 `data` 驱动
- `statusPath`：业务状态字段路径（已注册，未接线）

## 字段参考

| 字段                    | 类型                                 | 说明                                                                                     |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `data`                  | `Record<string, BoardItem>`          | 看板数据（root/column/card/divider 图结构；列标题与 cardLimit/wipStrict 在列 `data` 中） |
| `configMap`             | `Record<string, any>`                | 额外配置映射                                                                             |
| `columnsConfig`         | `Record<string, KanbanColumnConfig>` | 列配置（仅 controlled 模式的 `collapsed` 生效）                                          |
| `filterText`            | `string`                             | 按文本过滤                                                                               |
| `filterCard`            | `string`                             | 过滤表达式（作用域 `{card, text}`）                                                      |
| `filterTags`            | `string[]`                           | 按标签过滤                                                                               |
| `columnWidth`           | `number \| 'auto' \| 'equal'`        | 列宽                                                                                     |
| `columnDraggable`       | `boolean`                            | 列可拖拽                                                                                 |
| `draggable`             | `boolean`                            | 卡片可拖拽                                                                               |
| `wipStrict`             | `boolean`                            | 全局 WIP 严格模式（超限禁入；列级可覆盖）                                                |
| `collapsedOwnership`    | `'local' \| 'controlled' \| 'scope'` | 折叠状态所有权                                                                           |
| `collapsedStatePath`    | `string`                             | 折叠状态存储路径                                                                         |
| `kanbanOwnership`       | `'local' \| 'controlled' \| 'scope'` | 整板数据所有权                                                                           |
| `kanbanStatePath`       | `string`                             | 整板数据存储路径                                                                         |
| `statusPath`            | `string`                             | 业务状态字段路径（已注册，未接线）                                                       |
| `columnHeaderClassName` | `string`                             | 列头类名                                                                                 |
| `cardClassName`         | `string`                             | 卡片类名                                                                                 |
| `columnFooterClassName` | `string`                             | 列底部类名                                                                               |

### Events

| 事件              | 说明         |
| ----------------- | ------------ |
| `onCardMove`      | 卡片拖拽移动 |
| `onCardClick`     | 卡片点击     |
| `onCardAdd`       | 添加卡片     |
| `onCardRemove`    | 删除卡片     |
| `onColumnReorder` | 列排序变化   |
| `onColumnClick`   | 列头点击     |
| `onColumnAdd`     | 添加列       |
| `onMount`         | 挂载完成     |
| `onUnmount`       | 卸载前       |

### Regions

| 区域                  | 说明               |
| --------------------- | ------------------ |
| `columnHeader`        | 列头部自定义渲染   |
| `columnHeaderToolbar` | 列头部工具栏       |
| `cardTemplate`        | 卡片模板自定义渲染 |
| `columnFooter`        | 列底部区域         |
| `empty`               | 空状态             |
| `loading`             | 加载中             |
