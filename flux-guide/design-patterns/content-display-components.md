# 内容展示组件

> `icon`、`badge`、`link`、`image`、`html`、`json-view`、`markdown`、`statistics`、`empty`、`spinner`、`progress` 是轻量级展示组件。
>
> 所有字段定义见 `flux-types/schema.d.ts`。

---

## 1. Icon 图标

```jsonc
{ "type": "icon", "icon": "check-circle", "className": "text-green-500" }
```

**icon 名称**：优先使用 Lucide kebab-case 名（如 `settings`、`check-circle`、`chevron-down`）。

**Ant Design 兼容**：支持 `ant-design:` 前缀和 `-outlined`/`-filled`/`-twotone` 后缀，自动映射到 Lucide 等价图标：

```jsonc
{ "type": "icon", "icon": "ant-design:setting-outlined" }
{ "type": "icon", "icon": "ant-design:robot-filled" }
```

约 205 条映射覆盖方向、文件、图表、表单、导航等常见图标。完整映射见 `packages/ui/src/lib/icon-utils.ts` 中的 `ANT_DESIGN_LUCIDE_MAP`。

**size**：`number | 'sm' | 'md' | 'lg'`（像素或 token；`sm`=12, `md`=16, `lg`=20）

**color**：CSS color 字符串，映射到 inline style

---

## 2. Badge 徽标

```jsonc
{
  "type": "badge",
  "text": "3",
  "variant": "destructive",
}
```

**variant**：`default` / `secondary` / `destructive` / `outline`

---

## 3. Link 链接

```jsonc
{
  "type": "link",
  "label": "查看详情",
  "href": "/detail/${id}",
  "blank": true,
}
```

---

## 4. Image 图片

```jsonc
{
  "type": "image",
  "src": "${avatar}",
  "alt": "用户头像",
  "width": 100,
  "height": 100,
}
```

---

## 5. HTML 富文本

```jsonc
{
  "type": "html",
  "html": "<strong>注意：</strong>此操作不可撤销",
}
```

---

## 6. JSON View

```jsonc
{
  "type": "json-view",
  "data": "${responseData}",
  "theme": "light",
}
```

---

## 7. Markdown 渲染

```jsonc
{
  "type": "markdown",
  "content": "${articleContent}",
}
```

---

## 8. Statistics 统计数字

```jsonc
{
  "type": "statistics",
  "total": 128,
}
```

---

## 9. Empty 空状态

```jsonc
{
  "type": "empty",
  "description": "暂无数据",
  "image": "empty.png",
}
```

---

## 10. Spinner 加载中

```jsonc
{ "type": "spinner" }
```

---

## 11. Progress 进度条

```jsonc
{
  "type": "progress",
  "value": 75,
  "status": "active",
}
```

**status**：`active` / `success` / `exception`
