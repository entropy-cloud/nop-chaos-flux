# Loop 组件设计

## 1. 组件定位

- `loop` 是集合驱动的结构展开节点。
- 它负责把一个集合展开成重复实例子树，而不是承担表格、列表视觉壳、分页或复杂交互状态。
- 它是结构 DSL，不是普通布局容器的属性增强版。
- `loop` 本身没有固定 UI shell；它负责结构展开，不负责列表视觉。

## 2. 设计判断

- 组件名称应使用 `loop`。
- 循环变量命名优先使用 `itemName`，不使用 `varName`。
- `loop` item scope 默认应继承父 scope，再叠加 item-local bindings。
- `loop` 与 `table row` 共享同一 repeated-instance identity model，但不共享“默认隔离”这一性能特例。

## 3. 为什么用 `itemName` 而不是 `varName`

推荐：

- `itemName`
- `indexName`
- `keyName`

不推荐：

- `varName`
- `itemVar`
- `loopVar`

原因：

- `loop` 不是通用变量声明节点，而是集合项展开节点
- 这里绑定的是“当前 item / index / key”，不是任意语义变量
- `itemName` 对作者更直观，和 `items` 形成自然对应

## 4. Flux 中的 renderer/type 定义

- `type: 'loop'`
- `category: 'layout'`
- 预期 source package: `@nop-chaos/flux-renderers-basic`
- 主要 region: `body`
- 可选 region: `empty`

## 5. schema 设计

建议正式字段：

```ts
interface LoopSchema extends BaseSchema {
  type: 'loop';
  items: SchemaValue;
  body?: SchemaInput;
  empty?: SchemaInput;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
}
```

推荐默认值：

- `itemName: 'item'`
- `indexName: 'index'`
- `keyName`: optional，默认不注入

## 6. 字段分类

- `items`: `value`
- `body`、`empty`: `region`
- `itemName`、`indexName`、`keyName`: `value`
- `itemData`: `value`
- `keyBy`: `value`

## 7. Scope 设计

### 7.1 Loop Shell Scope

`loop` 节点本身不应默认创建一个隔离 shell scope。

它的 `items` 应在当前 lexical scope 中求值。

### 7.2 Loop Item Scope

每个 item 实例都创建一个 repeated child scope。

默认规则：

- 继承 parent lexical scope
- 注入 item-local bindings
- 不默认 `isolate`

推荐心智模型：

```text
loop item scope = parent lexical visibility + { item, index, optional key, ...itemData }
```

### 7.3 为什么默认不隔离

`loop` 的典型 authoring 目标是：

- item 需要自然读取父级上下文
- 子项模板经常同时依赖当前 item 和外层页面/表单数据

例如：

```json
{
  "type": "loop",
  "items": "${users}",
  "body": {
    "type": "fragment",
    "body": {
      "type": "text",
      "text": "${item.name} - ${currentRole}"
    }
  }
}
```

如果默认隔离，authoring 会立刻变重，而且很容易逼出 `$parentScope` 这类后门。

因此：

- `table row` 是高频性能特例，默认隔离
- `loop item` 是通用结构展开，默认继承

## 8. Item Bindings

推荐默认绑定：

- `item`
- `index`

可选绑定：

- `key`

绑定名可通过 `itemName` / `indexName` / `keyName` 覆写。

示例：

```json
{
  "type": "loop",
  "items": "${users}",
  "itemName": "user",
  "indexName": "userIndex",
  "body": {
    "type": "text",
    "text": "${userIndex + 1}. ${user.name}"
  }
}
```

## 9. `itemData`

如果某个 loop item 需要一组额外的显式局部绑定，推荐使用 `itemData`。

其职责类似 table 的 `rowData`，但不等同：

- `rowData` 主要服务 isolated row 的显式投影
- `itemData` 主要服务 loop item 的局部别名/派生值注入

推荐求值上下文：

- parent lexical scope
- 当前 item-local roots，例如 `item`、`index`、optional `key`

实现约束：

- `itemData` 不能作为普通 resolved prop 在父 scope 预求值
- compiler 应把它保存在编译后结构字段中，runtime/renderer 只在当前 repeated item scope 下求值
- 注入结果进入当前 `loop.body` 的 `$slot` frame，而不是平铺成新的顶层 lexical binding
- schema-authored `itemData` 不得覆盖保留结构绑定：当前 item/index/key 别名以及 `$parent`

示例：

```json
{
  "type": "loop",
  "items": "${users}",
  "itemData": {
    "canEdit": "${item.ownerId === currentUser.id}",
    "displayName": "${item.firstName + ' ' + item.lastName}"
  },
  "body": {
    "type": "text",
    "text": "${$slot.displayName}"
  }
}
```

## 10. Repeated Identity

`loop` 必须使用与 table row 相同的 repeated-instance identity model：

- 编译一次模板
- 每个 item 实例拥有自己的 `instanceKey`
- 每个 item 实例向 `instancePath` 追加一个 repeated frame

`keyBy` 的职责：

- 为 repeated instance 提供稳定 key

推荐顺序：

1. `keyBy`
2. item 的稳定主键字段
3. `index` 作为最后兜底

## 11. Empty State

如果 `items` 为空：

- 有 `empty` -> 渲染 `empty`
- 无 `empty` -> 不渲染 body instances

`empty` 不进入 repeated item scope。

## 12. Action And Targeting

loop 内部的按钮、表单、组件 targeting 应遵循现有 repeated-instance 解析规则。

也就是说：

- 当前 item 内的 targeting 默认命中当前 repeated instance
- 跨实例 targeting 应使用 repeated selector 或完整 locator，而不是依赖同名 `componentId`

## 12.1 Recursive Structural Expansion

当 loop body 需要对嵌套集合再次使用同一模板时，不建议引入命名模板注册表。

推荐方向是搭配 `recurse`：

- `recurse` 命中最近 enclosing `loop.body`
- 用新的 `items` 再次实例化同一套 body 模板
- 需要整体条件控制时，继续使用 `fragment + when`

## 13. 与 Table 的关系

- `loop` 是通用结构展开节点
- `table` 是带视觉壳和交互 ownership 的 specialized collection renderer
- `list` 是带视觉壳但交互语义较轻的 collection renderer

二者共享：

- repeated-instance model
- item/row local scope carrier 思路

二者不同：

- `table row` 默认隔离
- `loop item` 默认继承
- `rowData` 服务性能敏感 row projection
- `itemData` 服务普通结构展开的局部派生绑定

与 `list` 的边界：

- `loop` 无 UI shell
- `list` 有顺序集合展示的 UI shell
- `list` 内部可以复用 `loop` 的 repeated-item substrate，但不应把 `loop` 本身做成视觉 list

## 14. 为什么现在不做通用 repeated projection 字段

虽然 table row 和 future loop 都有“额外局部绑定”需求，但当前不建议先升格成一个全局 repeated-projection 字段。

原因：

- `table row` 和 `loop item` 的默认 scope 规则不同
- `rowData` 的性能约束更强
- `loop itemData` 更偏 authoring ergonomics，而不是性能优化

因此当前最佳做法是：

- 先保留 `rowData` 为 table 专名
- `loop` 单独使用 `itemData`
- 如果未来更多 repeated owners 出现，再评估是否抽象出共享 repeated projection contract

## 15. 结论

最佳设计是：

- `type: 'loop'`
- `itemName` 优于 `varName`
- `loop item scope` 默认继承父 scope
- 用 `itemData` 承载少量局部派生绑定
- repeated identity 与 table row 完全对齐
- 不把 table 的默认隔离特例硬推广成所有循环节点的默认行为
- 需要无 UI 的整体条件/分组时，搭配 `fragment`，而不是引入 `if` 或滥用 `container`
- 需要结构递归时，搭配 `recurse`，而不是引入命名模板注册表
