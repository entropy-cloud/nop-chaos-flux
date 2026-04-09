# TreeSelect 组件设计

## 1. 组件定位

- `tree-select` 是树下拉选择字段。
- 它通过 trigger + popup/panel 的交互外壳，让用户从树结构候选项中选择值。
- 它不是普通 `select` 的视觉变体，也不是直接内嵌展示的 `input-tree`。

## 2. 与 AMIS 的关系

AMIS 已有成熟参考：

- `tree-select`
- 具备 `treeMode`、`cascade`、`searchable`、`creatable` 等树选择语义

Flux 可以先保留较小首版，再按 field family 演进。

## 3. Flux 中的 renderer/type 定义

- `type: 'tree-select'`
- `category: 'form'`
- 预期 source package: `@nop-chaos/flux-renderers-form`

## 4. schema 设计

首版建议字段：

```ts
interface TreeSelectSchema extends InputSchema {
  type: 'tree-select';
  options?: SchemaValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showIcon?: boolean;
  showPathLabel?: boolean;
  clearable?: boolean;
  placeholder?: SchemaValue;
}
```

## 5. 字段分类

- `options`: `value`，允许 source-enabled value
- trigger / tree 行为字段：`value`

## 6. 运行期状态归属

- 当前选中值归 form runtime 或 scope
- 打开态、搜索关键字、弹层定位等纯 UI 状态归本地组件状态
- 不默认把 popup open-state 写进表单值

## 7. 与 Select 的边界

- `select`：平面离散选项
- `tree-select`：树形层级选项

不建议把 `tree-select` 做成普通 `select` 的一个布尔开关模式。

## 8. 与 InputTree 的边界

- `tree-select`：下拉/弹出式树选择
- `input-tree`：直接内嵌树选择面板

二者共享树 option model，但不共享同一交互壳。

## 9. 结论

- `tree-select` 应作为独立 field renderer 保留
- 它与 `tree`、`select`、`input-tree` 都应保持明确边界
