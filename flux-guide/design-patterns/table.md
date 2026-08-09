# Table 数据表格

> `table` 是独立的数据展示组件，与 `crud` 的区别：`table` 只负责展示，不含查询表单/工具栏/分页等编排能力；`crud` 是 table + 查询 + 工具栏 + 分页的组合容器。
>
> 所有字段定义见 `packages/flux-renderers-data/src/schemas.ts` 的 `TableSchema`。

---

## 1. 基础表格

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "users",
      "action": "ajax",
      "args": { "url": "/api/users" },
    },
    {
      "type": "table",
      "source": "${users}",
      "columns": [
        { "name": "id", "label": "ID", "width": 60 },
        { "name": "name", "label": "姓名" },
        { "name": "email", "label": "邮箱" },
      ],
    },
  ],
}
```

---

## 2. 列配置

```jsonc
{
  "type": "table",
  "source": "${users}",
  "columns": [
    { "name": "id", "label": "ID", "width": 60, "fixed": "left" },
    { "name": "name", "label": "姓名", "sortable": true },
    { "name": "email", "label": "邮箱" },
    {
      "name": "status",
      "label": "状态",
      "type": "mapping",
      "map": { "1": "启用", "0": "禁用" },
    },
    {
      "name": "createdAt",
      "label": "创建时间",
      "format": "YYYY-MM-DD HH:mm",
    },
  ],
}
```

**列类型**：

| `type`         | 说明       | 示例                                                                                  |
| -------------- | ---------- | ------------------------------------------------------------------------------------- |
| `text`（默认） | 纯文本     | `{ "name": "name", "label": "姓名" }`                                                 |
| `index`        | 序号列     | `{ "type": "index", "name": "index", "label": "序号", "width": 50, "fixed": "left" }` |
| `mapping`      | 值映射     | `{ "name": "status", "type": "mapping", "map": { "1": "启用" } }`                     |
| `operation`    | 操作列     | `{ "type": "operation", "buttons": [...] }`                                           |
| `image`        | 图片       | `{ "name": "avatar", "type": "image", "width": 60 }`                                  |
| `date`         | 日期格式化 | `{ "name": "date", "type": "date", "format": "YYYY-MM-DD" }`                          |

> **index 序号列**：不读 `record`，自动渲染跨页累计的行号（`(currentPage-1)*pageSize + 页内行号 + 1`），对齐 AMIS `__index` 的 offset 语义。建议配 `width` + `fixed` 作为固定列。

---

## 3. 排序与筛选

```jsonc
{
  "type": "table",
  "source": "${users}",
  "sortOwnership": "local",
  "filterOwnership": "local",
  "columns": [
    { "name": "name", "label": "姓名", "sortable": true },
    {
      "name": "status",
      "label": "状态",
      "filterable": true,
      "filterOptions": [
        { "label": "启用", "value": "1" },
        { "label": "禁用", "value": "0" },
      ],
    },
  ],
}
```

---

## 4. 行选择

```jsonc
{
  "type": "table",
  "source": "${users}",
  "rowKey": "id",
  "rowSelection": { "type": "checkbox" },
  "selectionOwnership": "local",
  "columns": [{ "name": "name", "label": "姓名" }],
}
```

**rowSelection 配置**：

| 字段                 | 说明                           |
| -------------------- | ------------------------------ |
| `type`               | `checkbox` 多选 / `radio` 单选 |
| `keepOnPageChange`   | 翻页时保留选中状态             |
| `maxSelectionLength` | 最大可选数量                   |

---

## 5. 虚拟滚动（大数据量）

```jsonc
{
  "type": "table",
  "source": "${largeList}",
  "virtualThreshold": 100,
  "scrollHeight": 400,
  "columns": [
    { "name": "id", "label": "ID" },
    { "name": "name", "label": "名称" },
  ],
}
```

---

## 6. 操作列

> 操作列按钮的求值 scope 是**当前行**，因此可直接 `${id}`、`${name}` 读行字段。需要显式取行上下文时用 `${$slot.record.<字段>}`（`$slot.record` 指向当前行记录）。`$slot.record` 与 cards/list 的 `$slot.item`（见 `crud.md` §5）对应，区别是 table 操作列用 `record` 命名。
>
> **注意**：`record` 和 `index` 不再作为顶层 key 存在。`record` 需要通过 `$slot.record` 访问，`index` 通过 `$slot.index` 访问。此变更与 crud 的 row scope 对齐。

```jsonc
{
  "type": "table",
  "source": "${users}",
  "columns": [
    { "name": "name", "label": "姓名" },
    {
      "type": "operation",
      "label": "操作",
      "buttons": [
        {
          "type": "button",
          "label": "编辑",
          "size": "sm",
          "onClick": {
            "action": "openDialog",
            // 显式取行记录：$slot.record.id 等价于裸 ${id}
            "args": {
              "title": "编辑 ${$slot.record.name}",
              "data": { "id": "${$slot.record.id}" },
              "body": { "type": "form", "id": "editForm", "body": [] },
            },
          },
        },
        {
          "type": "button",
          "label": "删除",
          "size": "sm",
          "variant": "destructive",
          "onClick": {
            "action": "confirm",
            "args": { "message": "确定删除？" },
            "then": { "action": "ajax", "args": { "url": "/api/users/${id}", "method": "delete" } },
          },
        },
      ],
    },
  ],
}
```

**关键点**：操作列按钮既可用裸字段 `${id}`（行 scope 直读），也可用 `${$slot.record.id}`（显式行上下文，可读性更好、避免与外层同名字段混淆）。

---

## 7. 表格事件

| 事件                | 说明       |
| ------------------- | ---------- |
| `onRowClick`        | 点击行     |
| `onRowDoubleClick`  | 双击行     |
| `onSort`            | 排序变化   |
| `onFilter`          | 筛选变化   |
| `onSelectionChange` | 选中项变化 |

---

## 8. 树形表格

> 树模式由 `rowChildrenField` 开启：该字段名指向每行记录中保存子行数组的属性。展开/折叠开关内嵌在**首列单元格**中（与单元格内容同格渲染，无独立展开列配置）；支持 `childrenSource` 懒加载子节点（按节点缓存）。

```jsonc
{
  "type": "table",
  "source": "${projects}",
  "rowKey": "id",
  "rowChildrenField": "tasks", // 树模式开关：子行数组所在字段
  "columns": [
    { "name": "name", "label": "项目/任务" },
    { "name": "hours", "label": "工时" },
  ],
}
```

数据形态：`projects` 每行带 `tasks` 数组（子行 key 取 `__rowKey`，缺省回退 `id`，再缺省用父 key 派生），递归嵌套即多级树：

```jsonc
{
  "id": 1,
  "name": "项目A",
  "hours": 40,
  "tasks": [
    { "__rowKey": "t1", "name": "开发", "hours": 38 },
    { "__rowKey": "t2", "name": "测试", "hours": 2 },
  ],
}
```

**懒加载子节点**：子数据不在行记录内、需按节点按需拉取时用 `childrenSource`（`ActionSchema`）。节点首次展开且无缓存子节点时派发该 action（行记录以顶层 `record`（及 `rowKey`）暴露在 action scope 中，例如 `${record.id}`），结果按节点缓存，折叠再展开直接复用；加载失败可在开关上重试。

```jsonc
{
  "type": "table",
  "source": "${projects}",
  "rowKey": "id",
  "rowChildrenField": "tasks",
  "childrenSource": {
    "action": "ajax",
    "args": { "url": "/api/projects/${record.id}/tasks" },
  },
  "columns": [{ "name": "name", "label": "项目/任务" }],
}
```

> **注意**：`defaultExpanded`/`maxDepth` 仅存在于 `flattenTreeRows` 的内部 options（`use-table-tree.ts`），**未接线到 `TableSchema`**，不要在 schema 中使用。
>
> **`expandable` 与树形不同**：`expandable` 是"展开行"特性（`expandedRowKeys`/`expandedRow`/`expandableWhen`，见 §7 表格事件之外的 `TableSchema.expandable`），每行可展开一块自定义内容区域，与树形子行是两套独立机制，不要混用。

---

## 9. 表头分组（多行表头）

> 列定义支持嵌套：任一列声明 `children`（子列数组）即启用表头分组，渲染为多行表头。`colSpan`/`rowSpan` 由 `computeHeaderRows` 自动推导（父列 `colSpan` = 叶子数，叶子列 `rowSpan` 跨满剩余行数），**不需要也不支持在列上手写**；数据行只消费叶子列。

```jsonc
{
  "type": "table",
  "source": "${timesheets}",
  "columns": [
    { "name": "employee", "label": "员工" },
    {
      "label": "本周工时",
      "children": [
        { "name": "mon", "label": "周一" },
        { "name": "tue", "label": "周二" },
        { "name": "wed", "label": "周三" },
      ],
    },
    { "name": "total", "label": "合计" },
  ],
}
```

上面示例渲染两行表头：`员工`/`合计` 为叶子列、`rowSpan` 跨满两行；`本周工时` 为分组列、`colSpan = 3`，其下三个子列各占一行。表头行由 `computeHeaderRows` 计算，叶子列集合由 `extractLeafColumns` 提取（表头分组激活时数据行按叶子列渲染）。

---

## 10. footer（表格底部插槽）

> `footer` 渲染在表格容器内最底部（分页栏之下），类型为 `SchemaInput | string`——可以是任意 schema 节点，也可以是纯字符串。

```jsonc
{
  "type": "table",
  "source": "${timesheets}",
  "columns": [{ "name": "employee", "label": "员工" }],
  "footer": {
    "type": "text",
    "text": "共 ${timesheets.length} 条记录，合计 ${hoursTotal} 小时",
  },
}
```

等价写法：直接给字符串 `"footer": "底部说明"`。渲染逻辑：解析后的 footer 内容非空才渲染（`data-slot="table-footer"`），未配置或内容为空时零渲染。需要"每列统计"这类结构化合计行时用 §12 的 `affixRow` 而非 footer。

---

## 11. quickEdit 单元格直编

> 单元格常驻编辑：`quickEdit` 开启后该列单元格直接渲染输入控件（inline 模式常驻输入框 / dialog 模式点击弹窗编辑），与树形行开关同格共存。保存语义三选一：`saveImmediately` 失焦提交、行级 draft 保存条（配 `quickSaveAction`/`quickSaveItemAction`）、单元格内保存按钮。

### 11.1 inline 常驻输入

```jsonc
{
  "type": "table",
  "source": "${timesheets}",
  "rowKey": "id",
  "quickSaveItemAction": {
    "action": "ajax",
    "args": { "url": "/api/timesheets/save", "method": "post", "includeScope": "*" },
  },
  "columns": [
    { "name": "employee", "label": "员工" },
    { "name": "hours", "label": "工时", "quickEdit": true },
  ],
}
```

- `quickEdit: true` 等价于 `{ mode: 'inline', saveImmediately: false }`，单元格内渲染常驻输入框，**多格可同时编辑**
- 配了 `quickSaveAction`（表格级）/`quickSaveItemAction`（行级）且非 `saveImmediately` 时，行内出现**行级 draft 保存条**（保存/取消），保存把整行 draft 提交给 action（`includeScope: "*"` 会把整行草稿一起提交）
- `quickEdit: { mode: 'inline', saveImmediately: true }`：输入失焦即提交（`saveImmediately` 也可为表达式 `SchemaValue`），无需保存按钮
- 自定义编辑控件：`quickEdit: { mode: 'inline', body: { type: 'input-number', ... } }`（`body` 为 `SchemaInput`）

### 11.2 dialog 弹窗编辑

```jsonc
{
  "type": "table",
  "source": "${timesheets}",
  "rowKey": "id",
  "columns": [
    {
      "name": "remark",
      "label": "备注",
      "quickEdit": {
        "mode": "dialog",
        "body": { "type": "textarea", "label": "备注" },
      },
    },
  ],
}
```

点击单元格内"编辑"按钮弹出 dialog，`body` 为弹窗内编辑表单（缺省为输入框）；保存按钮在配了 `quickSaveAction`/`quickSaveItemAction` 时出现。

> quickEdit 与树形行可同格共存：树形开关与 inline 输入框渲染在同一单元格内（首列 + quickEdit 列任一组合均可）。

---

## 12. 合计行（prefixRow / affixRow）

> `prefixRow` 渲染在表头下方，`affixRow` 渲染在表尾（`<tfoot>` 语义）。每行由 `cells` 数组定义：`column` 匹配列 `name`，`value` 为 `SchemaInput | string`（支持 `${...}` 表达式求值，表达式在表格 scope 下求值），`align` 控制对齐。

```jsonc
{
  "type": "table",
  "source": "${timesheets}",
  "rowKey": "id",
  "columns": [
    { "name": "employee", "label": "员工" },
    { "name": "mon", "label": "周一" },
    { "name": "tue", "label": "周二" },
  ],
  "affixRow": {
    "cells": [
      { "column": "employee", "value": "合计", "align": "right" },
      { "column": "mon", "value": "${SUM(ARRAYMAP(timesheets, x => x.mon))}" },
      { "column": "tue", "value": "${SUM(ARRAYMAP(timesheets, x => x.tue))}" },
    ],
  },
  "prefixRow": {
    "cells": [{ "column": "employee", "value": "表头下说明行" }],
  },
}
```

- 未配置 `cells` 对应列时该列单元格留空；`align` 缺省不设显式对齐（单元格默认左对齐）
- 合计行单元格渲染语义：`value` 为字符串时按表达式求值（非 `${...}` 的普通字符串原样展示），对象（`SchemaInput`）时以 helpers 求值
- `affixRow`/`prefixRow` 都支持，可同时使用（表头下一条 + 表尾一条）

---

## table vs crud 选型

| 特性           | table                     | crud                                |
| -------------- | ------------------------- | ----------------------------------- |
| 查询表单       | 无                        | 内置 `queryForm`                    |
| 工具栏         | 无                        | 内置 `toolbar`                      |
| 分页           | 需手动配合 `pagination`   | 内置 `footerToolbar` + `pagination` |
| 新增/编辑/删除 | 需手动编排                | 内置操作列 + 弹窗                   |
| 数据源         | `source` 消费 data-source | `source` 或 `loadAction`            |
| 适用场景       | 纯展示、嵌入其他容器      | 完整 CRUD 工作流                    |
