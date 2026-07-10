# Pagination / Separator

> `pagination` 是分页组件，`separator` 是分隔线。两者都是轻量级展示组件。
>
> 所有字段定义见 `flux-types/schema.d.ts`。

---

## 1. Pagination 分页

### 配合 CRUD 使用

```jsonc
{
  "type": "crud",
  "source": "${pagedUsers}",
  "columns": [{ "name": "name", "label": "姓名" }],
  "footerToolbar": [{ "type": "statistics", "total": "${$crud.total}" }, { "type": "pagination" }],
}
```

### 配合 Table 使用

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "users",
      "action": "ajax",
      "args": {
        "url": "/api/users",
        "params": { "page": "${currentPage}", "perPage": "${pageSize}" },
      },
    },
    {
      "type": "table",
      "source": "${users}",
      "columns": [{ "name": "name", "label": "姓名" }],
    },
    {
      "type": "pagination",
      "total": "${users.total}",
      "currentPage": "${currentPage}",
      "pageSize": "${pageSize}",
    },
  ],
}
```

**Pagination 属性**：

| 属性              | 类型       | 说明                                                |
| ----------------- | ---------- | --------------------------------------------------- |
| `total`           | `number`   | 总条数                                              |
| `currentPage`     | `number`   | 当前页码                                            |
| `pageSize`        | `number`   | 每页条数                                            |
| `pageSizeOptions` | `number[]` | 可选每页条数                                        |
| `mode`            | `string`   | `simple` 简洁模式 / `with-page-size` 带每页条数选择 |

---

## 2. Separator 分隔线

```jsonc
{
  "type": "page",
  "body": [
    { "type": "text", "text": "第一部分" },
    { "type": "separator" },
    { "type": "text", "text": "第二部分" },
  ],
}
```

### 带标题的分隔线

```jsonc
{
  "type": "separator",
  "title": "基本信息",
}
```

### 垂直分隔线

```jsonc
{
  "type": "separator",
  "direction": "vertical",
}
```

**Separator 属性**：

| 属性        | 类型     | 说明                                   |
| ----------- | -------- | -------------------------------------- |
| `title`     | `string` | 分隔线标题                             |
| `direction` | `string` | 方向：`horizontal`（默认）/ `vertical` |
