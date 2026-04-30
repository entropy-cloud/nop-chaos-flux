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
- 在 `docs/architecture/data-domain-owner.md` 的 owner vocabulary 下，`array-field` 默认是 parent-owned `inherit-owner` projected editor，不是 child data domain。

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
  itemKey?: string;
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  sortable?: boolean;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

当前 live implementation note:

- `itemKind` / `itemKey` / add/remove baseline 已落地
- schema-level `transformInAction` / `transformOutAction` / `validateValueAction` 仍不是当前已接线 baseline
- `sortable` 目前也不应被表述为已完整落地的默认能力

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
  value: (itemValue, index, readOnly);
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

## Object Item Identity

当 `itemKind = 'object'` 时，推荐把“值位置”和“运行时 identity”分开。

规则：

1. 值路径和 validation path 仍按 index-addressed
2. repeated item identity、item-local UI state、item scope cache 优先按稳定 `itemKey`
3. 如果没有稳定 key，允许兼容退化到 index-based identity
4. 但对象数组的 editable baseline 仍推荐显式提供 `itemKey`

推荐解析顺序：

1. `schema.itemKey`
2. `record.__rowKey`
3. `record.id`
4. last-resort compatibility fallback to the current index

说明：

- `itemKey` 解决的是 item continuity，不是值写回路径
- add / remove / reorder 后，值和校验 remap 仍按 index 处理
- 稳定 `itemKey` 主要用于避免对象数组 item subtree 在 reorder/remap 时不必要地 remount
- parent owner 的 value path、validation path、writeback path 仍保持 index-addressed
- 当前 live implementation 只会在 duplicate preferred keys 时输出 development warning；missing preferred key 时会直接退回 compatibility index identity

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
- `array-field` 默认不创建新的独立 owner runtime
- 当前 live implementation 会为每个 item 创建 projected scope 和 projected `FormRuntime` view；这些 view 继续把 registration、validation、writeback 绑定到 parent owner

如果某个数组编辑场景确实需要 staged edit、确认后统一提交、或复杂 commit-time transformation，应使用明确的 surface-backed owner 包住该数组编辑器，而不是把 `array-field` 默认模型改成 owner-submit。

## Scope Model

### Scalar Item

```ts
{
  value: (itemValue, index, readOnly);
}
```

当前 live implementation 对标量 item 使用：

- `ownerRootPath = ${name}.${index}`
- `scalarValueAlias = 'value'`

这意味着：

- authoring 上子字段仍写 `value`
- runtime canonical path 仍是 parent owner 下的 `${name}.${index}`
- `value` 只是 projected alias，不是新的值地址层

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

### Validation And Addressing

`array-field` 的默认模型应与 parent owner validation 保持同一条轴：

- item child field state bucket 仍属于 parent owner
- owner-local absolute path 仍是 `${name}.0.sku`、`${name}.1` 这类 index-addressed 路径
- `itemKey` 只解决 repeated item continuity / scope reuse / instance identity，不替代值路径

因此：

- object item continuity 可以按 `itemKey`
- 但 value writeback 和 validation 仍按 index-addressed parent-owned path 执行
- projected item form 只是把相对 item 字段 rebasing 到 parent owner 的 owner-local absolute path

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
  "removable": true
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
  "removable": true
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
- 对 `object` item，优先提供稳定 `itemKey`
- 不必在作者层面再拆 `input-array` / `combo-field` 两套名字
- 但实现层可以像 AMIS 一样，共享一个底层 repeated item editor 内核
- richer transform/validate/sortable pipeline 只有在 live code 真正接线后，才应提升为 current baseline

## Related Documents

- `docs/architecture/data-domain-owner.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/unified-runtime-indexing-and-path-binding.md`
- `docs/architecture/object-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/components/list/design.md`
- `docs/components/loop/design.md`
