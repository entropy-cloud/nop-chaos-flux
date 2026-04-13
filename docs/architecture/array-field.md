# Array Field

## Purpose

本文档定义 `array-field`，用于编辑“一个字段本身就是数组”的场景。

典型场景：

- `tags: string[]`
- `emails: string[]`
- `lineItems: { sku, qty, price }[]`
- 任意需要对数组值做 add / remove / reorder / item edit 的字段

## Position

- `array-field` 是一个字段控件，所以 `name` 仍然是一等设计。
- 它与 `object-field`、`detail-field`、`detail-view`、`variant-field` 同属 value-oriented family，但默认是 inline live-edit control，而不是 staged submit owner。
- 它解决的是“一个字段值是数组，内部需要编辑多个元素”的问题。
- 本文档描述当前推荐 baseline：数组元素编辑直接作用于父表单当前值，不额外引入 owner draft/commit 层。

## Not The Same As `list` Or `loop`

`array-field` 不是 `list`，也不是 `loop`。

边界：

- `loop` 是无 UI 的结构展开节点
- `list` 是有 UI 的集合展示 renderer
- `array-field` 是数组值编辑控件

它们最多可以复用相同的 repeated rendering substrate，但 schema 语义不应混合。

因此不推荐用 `wrapComponent`、`tag`、`hasWrapper` 之类的低层渲染开关来统一这三类能力。那会把“值编辑”“视觉集合”“结构展开”的边界打平到 DOM 细节层。

## Core Model

数组编辑最大的区别是：数组元素可能是标量，也可能是对象。

推荐把这一点显式建模，而不是隐式猜测。

```ts
interface ArrayFieldSchema extends BaseSchema {
  type: 'array-field';
  name: string;
  readOnly?: boolean;
  itemKind: 'scalar' | 'object';
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  sortable?: boolean;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

## Item Kinds

### `scalar`

适合：

- `string[]`
- `number[]`
- `boolean[]`

每个数组元素就是一个值。

推荐给 `item` 发布：

```ts
{
  value: itemValue,
  index,
  readOnly
}
```

### `object`

适合：

- `{ name, email }[]`
- `{ label, value }[]`

每个数组元素是一个对象。

推荐规则：

- `item` 内部子字段的 `name` 相对当前 item 对象根
- 不要求作者写 `value.name` 或外层完整路径

也就是说，`array-field(itemKind='object')` 的单个元素编辑器，在 authoring 心智上类似一个“匿名 `object-field` item editor”。

## Lifecycle

推荐 lifecycle：

1. 从 `name` 读取当前数组值
2. 在当前父表单值上直接进行 add / remove / reorder / item edit
3. item child validation 继续通过普通 form validation / runtime child registration 生效
4. 表单 submit 时直接读取当前父表单数组值

关键边界：

- `array-field` 默认没有独立 draft array
- `array-field` 默认没有 owner-level confirm / cancel
- `array-field` 默认不要求 submit-time owner `validateValueAction` / `transformOutAction`

如果某个数组编辑场景确实需要 staged edit、确认后统一提交、或复杂 commit-time transformation，应使用明确的 surface-backed owner 包住该数组编辑器，而不是把 `array-field` 默认模型改成 owner-submit。

## Scope Model

### Scalar Item

```ts
{
  value: itemValue,
  index,
  readOnly
}
```

### Object Item

推荐内部建立 item-root 编辑上下文，使子字段名相对当前 item：

```json
{
  "type": "array-field",
  "name": "lineItems",
  "itemKind": "object",
  "item": [
    { "type": "input-text", "name": "sku", "label": "SKU" },
    { "type": "input-number", "name": "qty", "label": "Qty" }
  ]
}
```

这表示编辑当前元素的：

- `sku`
- `qty`

而不是要求作者写：

```json
{ "name": "value.sku" }
```

## Example: Scalar Array

```json
{
  "type": "array-field",
  "name": "tags",
  "itemKind": "scalar",
  "item": {
    "type": "input-text",
    "name": "value",
    "label": "Tag"
  },
  "addable": true,
  "removable": true,
  "sortable": true
}
```

## Example: Object Array

```json
{
  "type": "array-field",
  "name": "lineItems",
  "itemKind": "object",
  "item": {
    "type": "grid",
    "columns": 3,
    "body": [
      { "type": "input-text", "name": "sku", "label": "SKU" },
      { "type": "input-number", "name": "qty", "label": "Qty" },
      { "type": "input-number", "name": "price", "label": "Price" }
    ]
  },
  "addable": true,
  "removable": true,
  "sortable": true
}
```

## Relationship To `object-field`

- `object-field`：编辑一个对象
- `array-field`：编辑一组元素
- 当 `array-field.itemKind = 'object'` 时，单个元素编辑体验应接近一个匿名 `object-field`

因此两者是对称关系，而不是包含关系。

## AMIS Reference

`c:/can/nop/amis-react19` 中的现有设计有直接参考价值。

关键观察：

- `Combo` 是通用的重复子表单控件，适合对象数组或重复子表单编辑
- `InputArray` 不是独立内核，而是 `Combo` 的一种扁平特化

源码证据：

- `packages/amis/src/renderers/Form/InputArray.tsx` 头部注释直接写明：`InputArray 数组输入框。combo 的别名。`
- 实现上，`InputArray` 会把 `items` 规范成最多一个元素，然后传给 `Combo`，并强制：
  - `flat`
  - `multiple`
  - `multiLine={false}`

这说明 AMIS 的实际思路是：

- 对象数组编辑：`combo`
- 标量数组编辑：`input-array`

对当前架构的启发：

- 不要把数组编辑只当成一种模糊的“重复渲染”
- 应显式区分标量数组与对象数组
- 但底层仍可复用同一个 repeated item editor substrate

## Recommended Boundary

当前推荐：

- schema 层保留一个统一名字 `array-field`
- 通过 `itemKind` 显式区分 `scalar` / `object`
- 不必在作者层面再拆 `input-array` / `combo-field` 两套名字
- 但实现层可以像 AMIS 一样，共享一个底层 repeated item editor 内核

## Related Documents

- `docs/architecture/object-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/components/list/design.md`
- `docs/components/loop/design.md`
