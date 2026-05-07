# Tree 组件设计

## 1. 组件定位

- `tree` 是带 UI 的层级集合展示 renderer。
- 它负责节点缩进、展开/收起、层级结构展示，以及可选的节点选择/点击交互。
- 它不是纯结构递归原语；纯结构递归应由 `loop + recurse` 解决。
- 它也不是表单树选择控件；表单语义应留给后续 `input-tree` / `tree-select` 一类专门 field renderer。

## 2. 与 AMIS 的关系

AMIS 中确实有明确的 tree 相关参考：

- `input-tree`
- `tree-select`
- 底层 `Tree` UI 组件与相关测试/样式

但这些参考主要回答的是：

- 树形选择
- 表单值绑定
- 节点勾选/级联/搜索

Flux 中推荐分层更清楚：

- 通用树形展示/浏览 -> `tree`
- 表单树选择 -> future `input-tree` / `tree-select`
- 纯结构递归 -> `loop + recurse`

## 3. 设计判断

- `tree` 应该保留为独立 UI 组件，而不是 `loop + recurse` 的视觉别名。
- `tree` 内部可以复用递归/重复实例 substrate，但外部 schema 契约应围绕树 UI 自身定义。
- `tree` 首版优先解决展示、展开/收起与节点模板，不急于一次性吸收 AMIS 表单树的全部能力。

## 4. Flux 中的 renderer/type 定义

- `type: 'tree'`
- `category: 'data'`
- 预期 source package: `@nop-chaos/flux-renderers-data`
- 主要 region: `node`
- 可选 region: `empty`

## 5. schema 设计

建议正式字段：

```ts
interface TreeSchema extends BaseSchema {
  type: 'tree';
  data: SchemaValue;
  childrenKey?: string;
  labelField?: string;
  keyField?: string;
  node?: SchemaInput;
  empty?: SchemaInput;
  initiallyExpanded?: boolean | number;
  expandOnClickNode?: boolean;
  statusPath?: string;
}
```

首版推荐默认值：

- `childrenKey: 'children'`
- `labelField: 'label'`
- `keyField: 'id'`

## 6. 字段分类

- `data`、`childrenKey`、`labelField`、`keyField`、`initiallyExpanded`、`expandOnClickNode`、`statusPath`: `value`
- `node`: `region`
- `empty`: `value-or-region`

## 7. 结构与 Scope

### 7.1 Tree 与 Loop/Recurse 的边界

`tree` 是 UI renderer，不是结构原语。

因此：

- 作者不应直接在 `tree` schema 中思考“最近 enclosing loop.body”这类结构语义
- `tree` 自己拥有树节点渲染、缩进、展开态与 node template 入口

### 7.2 Node Scope

每个树节点的 node template scope 推荐默认继承 parent lexical scope，并注入 node-local bindings：

- `node`
- `index`
- `depth`
- optional `key`
- optional `parentNode`

推荐心智模型：

```text
tree node scope = parent lexical visibility + { node, index, depth, optional key, optional parentNode }
```

与 `loop item` 一样，tree node scope 首版不建议默认隔离。

## 8. 运行期状态归属

`tree` 属于 interaction owner。

它可拥有的状态包括：

- expanded keys
- active node
- selected keys（如果后续引入）

首版推荐：

- 先支持展开/收起
- 把更复杂的勾选级联、拖拽、编辑等能力放到后续阶段

如果外部需要读取树 UI 状态，应通过 `statusPath` 读取只读摘要，而不是把这些状态混进普通数据树本身。

## 9. Node Template

`node` region 是单节点模板入口。

典型示例：

```json
{
  "type": "tree",
  "data": "${fileSystem}",
  "childrenKey": "children",
  "node": [
    { "type": "icon", "icon": "${node.icon}" },
    { "type": "text", "text": "${node.name}" }
  ]
}
```

## 10. Empty State

如果 `data` 为空：

- 有 `empty` -> 渲染 `empty`
- 无 `empty` -> 不渲染节点内容

## 11. 与未来表单树控件的边界

后续如果实现 `input-tree` / `tree-select`，应把它们视为：

- form field renderer
- 有值绑定、校验、只读/禁用、选中值语义

而 `tree` 保持：

- 通用树形展示/交互 UI
- 不直接承担表单值字段语义

当前该边界已单独收口到：

- `docs/components/input-tree/design.md`
- `docs/components/tree-select/design.md`

## 12. 结论

最佳设计是：

- 承认 AMIS 里有强树形参考，但按 Flux 分层重新拆开
- `tree` 做通用树 UI renderer
- `input-tree` / `tree-select` 留给后续 form renderer
- `loop + recurse` 保持纯结构原语，不替代 `tree`

## 13. `expandOnClickNode` 可访问性基线

- 当 `expandOnClickNode: true` 且节点存在子节点时，真实可聚焦、可交互的节点元素同时承担展开/收起交互与 `aria-expanded` 状态发布。
- 不允许把焦点放在内层交互目标上、却把 `aria-expanded` 挂在外层非焦点元素上。
- 无子节点时不发布 `aria-expanded`。
