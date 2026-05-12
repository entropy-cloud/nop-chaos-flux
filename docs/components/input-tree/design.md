# InputTree 组件设计

## 1. 组件定位

- `input-tree` 是表单树选择字段。
- 它用于在 form 中以内嵌树结构展示候选项并绑定选中值。
- 它不是通用树形展示 renderer；通用层级展示应使用 `tree`。

## 2. 与 AMIS 的关系

AMIS 已有成熟参考：

- `input-tree`
- 支持 `treeMode`、`cascade`、`searchable`、`creatable`、`editable`、`draggable` 等能力

Flux 不必一次性照搬全部能力，但应承认该组件属于独立 field family，而不是把它压回普通 `tree` 或 `select`。

## 3. Flux 中的 renderer/type 定义

- `type: 'input-tree'`
- `category: 'form'`
- 当前 source package: `@nop-chaos/flux-renderers-form-advanced`

## 4. schema 设计

首版建议字段：

```ts
interface InputTreeSchema extends InputSchema {
  type: 'input-tree';
  options?: SchemaValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showIcon?: boolean;
  showOutline?: boolean;
  showPathLabel?: boolean;
}
```

后续阶段再考虑：

- `creatable`
- `editable`
- `removable`
- `draggable`
- `addApi` / `editApi` / `deleteApi` / `saveOrderApi`

## 5. 字段分类

- `options`: `value`，允许 source-enabled value
- 其余 tree 行为字段：`value`

## 6. 运行期状态归属

- 当前选中值归 form runtime 或 scope
- 展开态、搜索关键字、hover、临时过滤等纯 UI 状态归本地组件状态
- 如果后续支持复杂受控展开态，再评估是否需要独立 ownership surface

## 7. 与 Tree 的边界

- `tree`：通用树 UI renderer
- `input-tree`：表单字段

差异：

- `tree` 不承担字段值绑定
- `input-tree` 必须承担 value/validation/disabled/readOnly 语义
- `readOnly` 是稳定字段契约的一部分：read-only tree items仍可见，但鼠标和键盘都不得改变字段值；展开/折叠按钮也不得顺带触发 selection

## 8. 与 TreeSelect 的边界

- `input-tree`：树本体直接呈现在表单区域
- `tree-select`：下拉触发器 + 弹出树选择面板

二者可共享底层 tree option model，但交互外壳不同。

## 9. 数据源与选项模型

- `options` 应优先接最终树节点数组
- 远程加载、搜索请求与缓存仍应遵循统一 source/API 语义
- 节点 children 默认读取 `childrenKey`

## 10. 结论

- `input-tree` 应作为独立 form field family 保留
- 它不应退化成普通 `tree`
- 也不应直接吞并 `tree-select`

## 11. 实现拆分建议

- `input-tree` 的 renderer/view 层应保留 field contract 接线、树节点结构输出和 `@nop-chaos/ui` 组合；不要把 option normalization、过滤投影、节点交互和字段 writeback 全部塞进一个主组件文件。
- 纯数据处理应优先抽成 helper 模块并与 `tree-select` 共享，例如 option meta 构建、path label 解析、flatten 和 selection toggle；这些逻辑不需要依赖 React 生命周期。
- 当 `input-tree` 开始同时承担搜索 query、过滤结果树、节点展开/折叠、selected summary、checkbox/radio 模式切换等交互语义时，优先抽 local controller hook。该 hook 只服务当前控件 family，不应变成新的通用 renderer 协议。
- 如果未来确实加入 `editable`、`draggable`、`creatable`、异步节点加载或 order persistence，先判断新增复杂度属于 renderer-local 交互、共享 tree helper，还是更大的 owner/runtime 问题；不要默认继续把所有能力累积到一个 React 文件。
- 对 `input-tree` 来说，最先共享的应是 tree option helper 层，而不是 popup shell；与 `tree-select` 的差异主要在交互壳而不是数据模型。
- 具体拆分判断应遵循 `docs/references/renderer-implementation-guidelines.md`，并在实现时保持 `RendererComponentProps`、field state ownership 和现有 runtime hooks 不变。
