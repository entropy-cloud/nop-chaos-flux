# Table 数据表格

> `table` 是独立的数据展示组件，与 `crud` 的区别：`table` 只负责展示，不含查询表单/工具栏/分页等编排能力；`crud` 是 table + 查询 + 工具栏 + 分页的组合容器。
>
> 所有字段定义见 `flux-types/schema.d.ts` 的 `TableSchema`。

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

| `type`         | 说明       | 示例                                                              |
| -------------- | ---------- | ----------------------------------------------------------------- |
| `text`（默认） | 纯文本     | `{ "name": "name", "label": "姓名" }`                             |
| `mapping`      | 值映射     | `{ "name": "status", "type": "mapping", "map": { "1": "启用" } }` |
| `operation`    | 操作列     | `{ "type": "operation", "buttons": [...] }`                       |
| `image`        | 图片       | `{ "name": "avatar", "type": "image", "width": 60 }`              |
| `date`         | 日期格式化 | `{ "name": "date", "type": "date", "format": "YYYY-MM-DD" }`      |

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
            "args": { "title": "编辑", "body": { "type": "form", "id": "editForm", "body": [] } },
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

## table vs crud 选型

| 特性           | table                     | crud                                |
| -------------- | ------------------------- | ----------------------------------- |
| 查询表单       | 无                        | 内置 `queryForm`                    |
| 工具栏         | 无                        | 内置 `toolbar`                      |
| 分页           | 需手动配合 `pagination`   | 内置 `footerToolbar` + `pagination` |
| 新增/编辑/删除 | 需手动编排                | 内置操作列 + 弹窗                   |
| 数据源         | `source` 消费 data-source | `source` 或 `loadAction`            |
| 适用场景       | 纯展示、嵌入其他容器      | 完整 CRUD 工作流                    |
