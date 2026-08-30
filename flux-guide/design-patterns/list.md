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

## 3.1 选中态 schema 表达（optionRow）

`optionRow` 为行提供「选中值绑定 + 状态 marker 输出」通道：选中态不再依赖 visible 双渲染或 CSS `.group:hover` 模拟，而是 schema 声明 + 标准 data-\* 输出（`data-option-row` / `data-state` / `data-selected` / `aria-selected`）。

```jsonc
{
  "type": "list",
  "items": "${rows}",
  "keyField": "id",
  "optionRow": {
    "value": "${activeId}", // 选中值绑定（owner scope 表达式，数组 = 命中任意一项）
    "valueField": "id", // 可选：参与比对的 item 字段，默认 keyField
    "selectedClass": "my-row-on", // 可选：选中行追加的 schema 类（显式样式覆盖通道）
  },
  "item": [{ "type": "text", "text": "${$slot.item.name}" }],
}
```

**状态类消费**（host / 复刻页 CSS 层）：

```css
/* 选中/hover 态走标准 marker + 伪类；hover 自动被 @media (hover: hover) 门控（触摸端 no-op） */
[data-option-row][data-state~='selected'] {
  background: var(--accent);
}
@media (hover: hover) {
  [data-option-row]:hover {
    background: var(--muted);
  }
}
```

**行为要点**：

- `value` 求值失败/为空 → 兜底为无选中态，不中断渲染。
- 未声明 `value` 时选中态复用 `selectionMode` 内部选择集；`value` 与 `selectionMode` 同时声明时绑定独占视觉标记（dev warn），`onSelectionChange` 事件照常派发。
- 不声明 `optionRow` 时输出与旧版完全一致。

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
