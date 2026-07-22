# 其他组件

> 低频/调试类组件速查。所有字段定义见 `flux-types/schema.d.ts`。
>
> 媒体组件（Audio / Video / Carousel）见 `media.md`、二维码见 `qrcode.md`。

---

## 1. Transfer 穿梭框

```jsonc
{
  "type": "transfer",
  "name": "selectedUsers",
  "label": "选择用户",
  "source": "${allUsers}",
  "searchable": true,
}
```

**值类型**：`Array<string | number>`（已选中的 value 数组）

---

## 2. Picker 选择器

```jsonc
{
  "type": "picker",
  "name": "category",
  "label": "分类",
  "options": "${categories}",
  "multiple": true,
  "searchable": true,
}
```

---

## 3. DropdownButton 下拉按钮

```jsonc
{
  "type": "dropdown-button",
  "label": "更多操作",
  "items": [
    { "type": "button", "label": "编辑", "onClick": { "action": "openDialog" } },
    {
      "type": "button",
      "label": "删除",
      "variant": "destructive",
      "onClick": { "action": "confirm" },
    },
  ],
}
```

---

## 4. ScopeDebug 调试工具

```jsonc
{
  "type": "scope-debug",
  "label": "调试面板",
}
```

---

## 5. TreeSelect 树选择

```jsonc
{
  "type": "tree-select",
  "name": "org",
  "label": "组织",
  "options": "${orgTree}",
  "cascade": true,
}
```

---

## 6. InputTree 输入树

```jsonc
{
  "type": "input-tree",
  "name": "permissions",
  "label": "权限",
  "treeMode": "checkbox",
  "options": "${permissionTree}",
}
```

---

## 7. TagList 标签列表

```jsonc
{
  "type": "tag-list",
  "name": "tags",
  "label": "标签",
  "tags": ["前端", "后端", "移动端"],
}
```

---

## 8. KeyValue 键值对

```jsonc
{
  "type": "key-value",
  "name": "headers",
  "label": "请求头",
}
```

---

## 9. ArrayEditor 数组编辑器

```jsonc
{
  "type": "array-editor",
  "name": "emails",
  "label": "邮箱列表",
  "itemLabel": "邮箱",
}
```

---

## 10. ConditionBuilder 条件构建器

```jsonc
{
  "type": "condition-builder",
  "name": "filter",
  "label": "筛选条件",
  "fields": [{ "label": "用户名", "type": "text", "name": "username" }],
}
```

---

## 11. DetailField 详情字段

```jsonc
{
  "type": "detail-field",
  "name": "address",
  "label": "地址",
  "triggerLabel": "编辑",
  "viewer": [{ "type": "text", "text": "${address.city}" }],
  "content": [{ "type": "input-text", "name": "city", "label": "城市" }],
}
```

---

## 12. DetailView 详情视图

```jsonc
{
  "type": "detail-view",
  "scopePath": "serverInfo",
  "triggerLabel": "编辑",
  "viewer": [{ "type": "text", "text": "${serverInfo.name}" }],
  "content": [{ "type": "input-text", "name": "name", "label": "名称" }],
}
```
