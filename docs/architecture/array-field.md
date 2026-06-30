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

### Parameterized Item Region Slot Contract

`array-field.item` 还是普通 region 字段，但当前 live baseline 已固定支持 `params: ['index', 'value']`。

这条 contract 的运行时规则是：

- item owner scope 继续承载 `value`、`index`、`readOnly` 等 projected owner payload
- parameterized region bindings 另外通过保留 `$slot` frame 发布，而不是覆盖 owner scope
- 因此 item region 内部的 supported authoring path 同时包括 `${$slot.index}` / `${$slot.value}` 和 owner-facing `${value}` / `${index}`

这也是当前 `array-field` focused regression proof 固定的 baseline：parameterized region bindings 与 owner scope 必须同时可见。

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

### Per-Row Delete Gating (`removeWhen`)

`array-field` 与 `combo` 支持 item-scoped 的删除门控：schema 可声明 `removeWhen`（一个相对当前 item 求值的布尔表达式字符串，如 `'${value.locked !== true}'`）。当声明了 `removeWhen` 时，某一行只有在表达式对该 item 求值为真时才允许删除；求值为假的行其删除按钮被禁用。

规则：

1. `removeWhen` 表达式以 `${...}` 形式编写，per-item 在投影 item scope 上求值（可引用 `value`（当前 item 对象）、`index`、`readOnly`，以及 `value.<childField>`）
2. 删除按钮 disabled 态 = `readOnly || atMinItems || (hasRemoveWhen && !truthy(eval(removeWhen, itemScope)))`（`atMinItems` 仅 `combo` 适用——`combo` 声明 `minItems` field-global 地板；`array-field` schema 无 `minItems`，该项恒为 false）
3. `removeWhen` 未声明时，所有行在 `minItems` 地板之上均可删除（无 per-row 条件）
4. `minItems` field-global 地板（仅 `combo`）保留，与 `removeWhen` 叠加（取并集禁用）
5. 表达式求值出错时 fail-open（不禁用，避免因表达式缺陷锁住数据），并在 console 报错
6. `array-field`（object itemKind）与 `combo` 两条路径行为一致

### Hidden Field Value And Submit Payload (C10)

参见 `docs/architecture/form-validation.md` 的 _Hidden Field Value And Submit Payload (C10 adjudication)_。`array-field`/`combo` 的 item 子字段若被 `when` 隐藏，其值默认仍保留并包含进提交 payload；仅当显式配置 `clearValueWhenHidden` 时才在隐藏时清值从而排除出提交。提交时投影排除（保留 store）是未建模的 distinct 语义，记为 successor（roadmap B7）。

### Row-Local Relative Cross-Field Addressing (V6)

参见 `docs/architecture/form-validation.md` 的 _Array Row-Local Relative Cross-Field Addressing (V6 adjudication)_。`array-field` 行内校验使用绝对 index-addressed 路径（`getChildFieldPathPrefix` 返回 false 是有意——item 子校验经投影 form 运行时注册，非静态模型）；行本地相对跨字段引用（如以兄弟名编写的 `equalsField`）不被支持，记为 candidate successor（roadmap B7，`DESIGN-ACK-NOT-IMPL`）。作者须用绝对路径。

### Nested Write Isolation (C1)

`array-field`/`combo` 的每个 item 经 `createItemScope`（`array-field-runtime.ts`）以 `itemPrefix = ${arrayPath}.${index}` 投影：所有读写经 `parentScope.get/update(${itemPrefix}...)`，per-item form proxy（`createItemFormProxy`）以 `${arrayPath}.${index}.${path}` 前缀所有 form 路径。嵌套 combo/array-field 在 item 内相对父 item 投影自身 `arrayPath`，得到 `${parent}.${i}.${child}.${j}`。因此跨行写串扰在结构上不可能：每 item 的 scope/form 是共享父 owner 上的隔离前缀投影，编辑某行的子项（含多级嵌套）只落在该行的 index-addressed 路径。

### External Error Addressing (C5)

外部（服务端）错误经 `applyExternalErrors` 以 path 为键存入 owner `externalErrors` map 并并入 `fieldStates[path]`，不论该字段是否已注册。`isPathOwned` 用 flat dotted-prefix 匹配，故行级（`items.1`）、叶级（`items.0.sku`）、穿容器/Tab（`items.2.tabs.t.sku`）均被 root form 拥有并附着高亮；undefined-target（如 `items.999.unknown`）不抛错，仍以 path 为键记录。数组变更（remove/move）时 `remapExternalErrors` + `transformArrayIndexedPath` 重映射 index 路径。

### Add-vs-Validate Timing (C7)

`add`/`scaffold` 新空行后，`array-field`/`combo`/`array-editor` 会触发 `validateSubtree('change')` / `validateField('change')`，但错误**可见性**由 `showErrorOn`（默认 `['touched','submit']`）门控：未 touch 的新行 required 错误不浮现，直至该行被 touch/编辑或 submit。submit 触发全行校验，使所有未通过行浮现。`showErrorOn` 策略本身不在此裁 定范围内（C7 仅靠其门控成立）。

### Submit Payload Contains Only Declared Fields (C9)

item 字段写仅经投影 item scope 的 `update()` / 投影 form 的 `setValue()` 落入 array 值。data-source 的 `options` 作为 transient `SourceTransientState`（`optionsSourceState`）交付在渲染期 `props.props.optionsSourceState`，**不写入** form scope values；故 item 含 select 其 options 来自 per-item data-source 时，提交值**仅含声明的子字段**，transient option payload（候选集）永不入提交值。

### Per-Item Re-render Isolation (C12)

`array-field`/`combo` 的 item 组件为 `React.memo`（自定义比较器：`itemIdentity`、`item`、`index`、`parentForm`…）并以稳定 `itemKey` 为 `key`。结构共享的值更新使仅编辑行的 `item` prop ref 变化，兄弟行因 memo 比较器命中而跳过重渲染。`itemKey` 连续性（非 index 身份）是关键：reorder/remap 时稳定 `itemKey` 保持 item subtree 身份，避免不必要 remount。`array-field` 记录 item-locality 不变量（item-local 回调的 `useCallback` deps 不含 `items`，避免每次数组变更改写所有 item 回调身份）。

### Per-Item Action Writeback (C13)

item scope 内运行的 action 经投影 item scope 的 `update()` / 投影 form 的 `setValue()` → `parent.update(${itemPrefix}.${path})` 回写，故 per-item action 返回数据可定向 `${name}.${i}.*` 并反映到父 array 值（index-addressed）。combo/array-field item affordance 不携带 per-row loading flag：async 治理 per-request/scope，单行 async loading 不会 field-global 地禁用兄弟行交互（兄弟行保持可交互）。

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

- upstream AMIS `InputArray.tsx` 头部注释直接写明：`InputArray 数组输入框。combo 的别名。`
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
