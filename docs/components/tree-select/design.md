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

## 10. 实现拆分建议

- `tree-select` 的 renderer/view 层应主要负责 trigger、popover、`@nop-chaos/ui` 组合和 field contract 接线，不应把搜索、节点展开、选中标签派生、键盘交互全部堆回同一个 JSX 文件。
- 纯 tree option 数据处理应优先放在 helper 模块，例如 option meta 构建、flatten、path label 计算、选择切换等；这类逻辑适合脱离 React 单独测试。
- 当同一个 renderer 文件同时承担 query 状态、过滤投影、展开状态、selected label 派生、commit/cancel 或键盘交互时，优先抽出 local controller hook，而不是发明新的平台协议。
- `tree-select` 与 `input-tree` 可以共享 tree option helper 层，但不应强行共享同一个交互 controller：`tree-select` 额外拥有 trigger/popup open-state、placeholder/trigger text、popover close/open 等外壳语义。
- 若未来扩展到 async search、lazy expand、批量展开或 richer controlled open/expanded state，再评估是否需要进一步下沉到 shared runtime helper；在此之前，本地 controller hook 仍应视为 renderer 内部实现细节。
- 实现时应遵循 `docs/references/renderer-implementation-guidelines.md`：优先最小正确实现，先抽 pure helpers，再在行为复杂时抽 local controller hook，不机械追求 renderless/headless 化。
