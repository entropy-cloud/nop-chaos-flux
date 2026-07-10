# List 列表

> `list` 是列表展示容器，适用于移动端/卡片式布局。与 `table` 的区别：`list` 按行渲染自定义模板，适合非结构化展示；`table` 按列渲染，适合结构化数据。
>
> 所有字段定义见 `flux-types/schema.d.ts` 的 `ListSchema`。

---

## 1. 基础列表

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
      "type": "list",
      "source": "${users}",
      "item": [{ "type": "text", "text": "${$slot.item.name} - ${$slot.item.email}" }],
    },
  ],
}
```

---

## 2. 卡片式列表

```jsonc
{
  "type": "list",
  "source": "${products}",
  "item": [
    {
      "type": "card",
      "body": [
        { "type": "image", "src": "${$slot.item.image}", "className": "h-40" },
        { "type": "text", "text": "${$slot.item.name}", "tag": "h3" },
        { "type": "text", "text": "¥${$slot.item.price}" },
      ],
    },
  ],
}
```

---

## 3. 选择模式

```jsonc
{
  "type": "list",
  "source": "${users}",
  "selectionMode": "checkbox",
  "rowKey": "id",
  "item": [{ "type": "text", "text": "${$slot.item.name}" }],
}
```

**selectionMode**：`checkbox` 多选 / `radio` 单选 / 无（默认）

---

## 4. 分页加载

```jsonc
{
  "type": "list",
  "source": "${users}",
  "pagination": { "mode": "page" },
  "item": [{ "type": "text", "text": "${$slot.item.name}" }],
}
```

---

## 5. 无限滚动

```jsonc
{
  "type": "list",
  "source": "${users}",
  "pagination": { "mode": "infinite" },
  "onLoadMore": { "action": "refreshSource", "targetId": "users" },
  "item": [{ "type": "text", "text": "${$slot.item.name}" }],
}
```

---

## 6. 空状态

```jsonc
{
  "type": "list",
  "source": "${users}",
  "empty": { "type": "empty", "description": "暂无用户" },
  "item": [{ "type": "text", "text": "${$slot.item.name}" }],
}
```

---

## list vs table 选型

| 特性         | list                                       | table                      |
| ------------ | ------------------------------------------ | -------------------------- |
| 渲染方式     | 自定义模板（`item` region）                | 按列渲染（`columns`）      |
| 布局         | 纵向卡片/行                                | 网格表格                   |
| 适用场景     | 移动端、卡片展示、非结构化数据             | 结构化数据、大数据量       |
| 虚拟滚动     | 不支持                                     | 支持（`virtualThreshold`） |
| 与移动端配合 | 常与 `pull-refresh`/`infinite-scroll` 配合 | 较少用于移动端             |
