# 表单高级字段

> `tag-list`、`key-value`、`array-editor`、`input-tree`、`condition-builder`、`icon-picker` 是常用表单高级字段。所有字段定义见 `flux-types/schema.d.ts`。

---

## 1. TagList：标签选择

轻量级字符串标签数组编辑器。点击标签切换选中/取消。

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "tag-list",
      "name": "tags",
      "label": "标签",
      "tags": ["前端", "后端", "移动端", "DevOps", "AI"],
    },
  ],
}
```

**值结构**：`string[]`，如 `["前端", "AI"]`

---

## 2. KeyValue：键值对编辑

编辑配置项、HTTP Headers 等键值对数组。

```jsonc
{
  "type": "key-value",
  "name": "headers",
  "label": "HTTP Headers",
  "addLabel": "添加 Header",
  "uniqueKeys": true,
  "minItems": 1,
  "maxItems": 20,
}
```

**值结构**：`Array<{ id: string; key: string; value: string }>`

**组件方法**：`component:addItem`、`component:removeItem`、`component:moveItem`

---

## 3. ArrayEditor：简单数组编辑

编辑一维字符串列表，如评审人、标签名等。

```jsonc
{
  "type": "array-editor",
  "name": "reviewers",
  "label": "评审人",
  "itemLabel": "评审人",
  "minItems": 1,
  "maxItems": 10,
}
```

**值结构**：`Array<{ id: string; value: string }>`

---

## 4. InputTree：树形选择

表单内的树形选择控件，支持普通/单选/多选模式。

```jsonc
{
  "type": "input-tree",
  "name": "category",
  "label": "分类",
  "treeMode": "checkbox",
  "cascade": true,
  "searchable": true,
  "options": [
    {
      "label": "电子产品",
      "value": "electronics",
      "children": [
        { "label": "手机", "value": "phone" },
        { "label": "电脑", "value": "computer" },
      ],
    },
    {
      "label": "图书",
      "value": "books",
      "children": [
        { "label": "技术", "value": "tech" },
        { "label": "文学", "value": "literature" },
      ],
    },
  ],
}
```

**treeMode**：`normal`（默认展开）、`radio`（单选）、`checkbox`（多选）

**懒加载子节点**：

```jsonc
{
  "type": "input-tree",
  "name": "orgTree",
  "label": "组织架构",
  "treeMode": "checkbox",
  "childrenSource": {
    "action": "ajax",
    "args": { "url": "/api/children?parentId=${expandedNodeValue}" },
  },
}
```

---

## 5. ConditionBuilder：条件表达式编辑

规则表达式编辑器，支持条件组、逻辑关系（AND/OR/NOT）、字段-操作符-值三元组。

```jsonc
{
  "type": "condition-builder",
  "name": "filter",
  "label": "筛选条件",
  "builderMode": "full",
  "fields": [
    { "label": "用户名", "type": "text", "name": "username" },
    { "label": "年龄", "type": "number", "name": "age" },
    {
      "label": "状态",
      "type": "select",
      "name": "status",
      "options": [
        { "label": "启用", "value": "active" },
        { "label": "禁用", "value": "inactive" },
      ],
    },
  ],
}
```

**builderMode**：`full`（完整模式，默认）或 `simple`（简化模式）

**值结构**：

```json
{
  "id": "root",
  "conjunction": "and",
  "children": [
    {
      "id": "item1",
      "left": { "type": "field", "field": "username" },
      "op": "contains",
      "right": "admin"
    },
    { "id": "item2", "left": { "type": "field", "field": "age" }, "op": "greater", "right": 18 }
  ]
}
```

---

## 6. IconPicker：图标选择

弹层图标选择字段，基于 Lucide 图标集，支持搜索过滤和 Ant Design 名称兼容。

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "icon-picker",
      "name": "menuIcon",
      "label": "菜单图标",
      "placeholder": "选择图标",
      "searchable": true,
      "clearable": true,
    },
  ],
}
```

**值结构**：`string`（Lucide kebab-case 名，如 `"settings"`、`"check-circle"`）

**Ant Design 兼容**：值经 `resolveLucideIcon()` 解析，自动支持 `ant-design:*` 前缀名。

**字段**：`placeholder`（缺省 "选择图标"）、`searchable`（缺省 true）、`clearable`（缺省 true）、`disabled`、`readOnly`、`required`

---

## 与其他字段的选型

| 场景             | 推荐字段                                                 |
| ---------------- | -------------------------------------------------------- |
| 字符串标签选择   | `tag-list`                                               |
| 键值对配置       | `key-value`                                              |
| 简单字符串列表   | `array-editor`                                           |
| 对象数组子表单   | `array-field`（见 composite-fields.md）                  |
| 树形层级选择     | `input-tree`                                             |
| 复杂规则表达式   | `condition-builder`                                      |
| 图标选择         | `icon-picker`                                            |
| 结构化对象子表单 | `object-field`（见 composite-fields.md）                 |
| 多态值切换       | `variant-field`（见 composite-fields.md）                |
| 弹窗编辑详情     | `detail-field` / `detail-view`（见 composite-fields.md） |

> **易混淆区分**：
>
> - `array-editor` = 编辑**标量数组**（如 `string[]` / `number[]`），每项一个输入框。
> - `array-field` = 编辑**对象数组**（`Array<{...}>`），每项是一组子字段构成的子表单（见 `composite-fields.md`）。对象数组也可用 `combo` / `input-table`（见 `combo-input-table.md`）。
> - `markdown-editor`（表单字段，`flux-renderers-form`）= 表单里编辑 markdown 文本并写回字段值；不要与展示型 `markdown`（只读渲染，`flux-renderers-content`）或通用 `code-editor`（`flux-code-editor`，代码/SQL/表达式）混淆。
