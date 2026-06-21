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

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决，命名对齐 X3 基线（`docs/references/naming-conventions.md` §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                                                                                 | 采纳                                                                                                                                                                                                 | 不采纳                                                          | 理由                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `treeMode: normal\|radio\|checkbox`                                                                                  | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| `options` source（一次性异步加载 + 加载/错误态）                                                                     | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| 自定义 `childrenKey`/`labelField`/`valueField`                                                                       | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| 本地搜索（`searchable`）+ zero-results empty state + clear affordance + roving focus（同步 `aria-activedescendant`） | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| `showPathLabel`、`onlyLeaf`                                                                                          | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| 全键盘导航                                                                                                           | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                       |
| `cascade` 级联半选 + indeterminate                                                                                   | **实现**：父子传播 + indeterminate 派生（E0b 收口，见 §cascade 语义）                                                                                                                                | —                                                               | 多选树刚需                                                                                                                                                                                                                                     |
| `showIcon` / `showOutline` 图标                                                                                      | —                                                                                                                                                                                                    | **不采纳（删字段）**                                            | 当前 schema 未定义图标数据来源（无 `iconField`/`iconKey`），实现需一整套图标解析设计；属 feature 而非漂移修复。已从 `InputTreeSchema` 移除以消除"声明了但设了无效"的契约漂移。如后续需要，须以独立 feature plan 提供完整图标来源设计后再加字段 |
| 异步懒加载（`deferApi`/`deferField`）                                                                                | **实现**：走 data-source `childrenSource`（on-demand `dispatch` + `helpers.evaluate`，请求引用 `${expandedNodeValue}`；节点 `deferChildren: true` 标记触发；展开 loading/error/重试 + cascade 重算） | amis 组件级 `api`/`autoComplete`/`initFetch` SchemaApi 生命周期 | 请求下沉 data-source + action，不在组件开 api（X3 §1/§3）                                                                                                                                                                                      |
| 远程搜索（`searchApi`）                                                                                              | **实现**：走 data-source `searchSource`（on-demand `dispatch` + `helpers.evaluate`，请求引用 `${searchQuery}`，debounce 300ms，结果替换 options）                                                    | —                                                               | 当前仅本地子串过滤                                                                                                                                                                                                                             |
| 虚拟滚动（`virtualThreshold`）                                                                                       | **实现**：`virtualThreshold`（默认 100，对齐 select），`@tanstack/react-virtual`，`useVirtualizer` + 视口滚动 + 键盘 `scrollToIndex` 跟随                                                            | —                                                               | 深树性能                                                                                                                                                                                                                                       |
| 节点 CRUD（`creatable`/`editable`/`removable` + addApi/editApi/deleteApi/saveOrderApi）                              | **暂不实现**                                                                                                                                                                                         | —                                                               | 场景窄，后续按需（见 §4）                                                                                                                                                                                                                      |
| `nodeBehavior`、`itemActions`                                                                                        | **暂不实现**                                                                                                                                                                                         | —                                                               | 后续按需                                                                                                                                                                                                                                       |
| `enableNodePath`+`pathSeparator`（值作为路径串）、`hideRoot`/`rootLabel`                                             | **暂不实现**                                                                                                                                                                                         | —                                                               | 后续按需                                                                                                                                                                                                                                       |
| amis `mobileUI` 双实现                                                                                               | —                                                                                                                                                                                                    | **不采纳**                                                      | 移动端走响应式（见 mobile-roadmap，X3 §3）                                                                                                                                                                                                     |

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
  showPathLabel?: boolean;
  // E2d 新增（见 §9 数据源）：
  virtualThreshold?: number; // 默认 100；0 关闭虚拟化
  childrenSource?: TreeSourceConfig; // 懒加载子节点，on-demand executeSource
  searchSource?: TreeSourceConfig; // 远程搜索，on-demand executeSource（debounce 300ms）
}
```

> `showIcon` / `showOutline` 已于 E0b 移除（见决策表"不采纳（删字段）"）。

> **E2d source 契约（实现中）**：`childrenSource`/`searchSource` 用 `TreeSourceConfig`（不含 `type: 'source'`）声明，避免被 runtime source-prop 自动解析；renderer 在调用前重建 `{ type: 'source', ...config }` 并经 `helpers.executeSource(...)` 触发，请求完全走 data-source runtime（X3 §1/§3）。详见 §9。

### cascade 语义（E0b 最终裁定）

`cascade: true` 仅在多选模式（`treeMode: 'checkbox'` 或 multiple 语义）下生效；单选模式（`treeMode: 'radio'` / `'normal'`）**不受影响**，`cascade` 被忽略。

- **向下传播（点击父节点）**：点击父节点翻转其全部"可选后代"的选中态（连父节点本身，当 `onlyLeaf: false`）：
  - 选中父节点 → 所有可选子孙加入当前 value；
  - 取消父节点 → 所有可选子孙（及父值）从当前 value 移除。
  - "可选后代" 集合由 `onlyLeaf` 决定：`onlyLeaf: true` 时只收集叶子后代；`onlyLeaf: false` 时收集全部后代。
  - 叶子节点（无 children）的 cascade 退化为单点翻转。
- **向上派生（父节点 checked / indeterminate 状态）**：父节点的选中态不是独立存储的，而是由其可选后代的选中态派生：
  - 全部可选后代已选 → 父节点 `checked: true`；
  - 部分（非全部）可选后代已选 → 父节点 `indeterminate: true`、`checked: false`；
  - 无可选后代已选 → 父节点 `checked: false`、`indeterminate: false`。
- **`onlyLeaf` 优先级**：`onlyLeaf: true` 优先于 `cascade` —— 父节点（非叶节点）的值**永不写入** value 数组；cascade 仅向叶子后代传播；父节点仍显示派生的 `checked` / `indeterminate` 视觉态（不响应把自身写入 value 的"直接选中"），点击父节点会批量翻转其叶子后代。`onlyLeaf: true` 且某父节点的可选后代集合为空（例如其全部后代均为内部节点）时，父节点不响应 cascade 选中。
- **提交值**：只有真正被翻转的值进入表单 value 数组。`onlyLeaf: true` 下父/内部节点值不进入数组；`onlyLeaf: false` 下被批量翻转的父值与其全部后代值一起进入数组。

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

### 异步懒加载（E2d `childrenSource`）

- schema 级声明 `childrenSource: TreeSourceConfig`（不含 `type: 'source'`，避免被 runtime source-prop controller 自动解析）。
- 节点 record 可携带 `deferChildren: true` 标记自己「子节点未加载」；展开此类节点时，renderer 重建 `{ type: 'source', ...childrenSource }`，经 `helpers.executeSource(source, { scope: 包含 expandedNodeValue 的子作用域 })` 触发；返回的子节点数组按 `childrenKey` 合并进父节点 option 模型。
- 请求引用约定：source 的 `args` / `api.data` 内可用 `${expandedNodeValue}` 引用当前展开节点的 `value`。
- 加载中：节点显示 inline loading（chevron 处或节点标签旁）；加载失败：inline error + 重试入口，**不破坏既有选中值**。
- 懒加载与 cascade（E0b）共存：子节点到达后，renderer 用 `deriveCheckedState` 重算父节点 indeterminate；子节点未到达时按已知子集派生（不阻塞交互）。
- 未声明 `childrenSource` 但节点标记 `deferChildren`：dev schema warn + 运行时退化为无子节点（不抛错）。
- `executeSource` 是 runtime 既有的 on-demand source 入口（`runtime-factory.ts:423`），refreshDedup/cancel-previous 等并发治理复用 runtime data-source 层，不引入 X4 的 `sendOn`/initFetch gate（X4 落地后可回头精炼触发语义，non-blocking）。

### 远程搜索（E2d `searchSource`）

- schema 级声明 `searchSource: TreeSourceConfig`；`searchable: true` 且声明了 `searchSource` 时，query 变化经 300ms debounce 后驱动 `helpers.executeSource({ type: 'source', ...searchSource }, { scope: 包含 searchQuery 的子作用域 })`。
- 请求引用约定：source 的 `args` / `api.data` 内可用 `${searchQuery}` 引用当前 query。
- 结果数组替换 `options`（remote options）；source loading/error 态复用既有 source-state 渲染。
- 未声明 `searchSource`：`searchable` 保持当前本地子串过滤（向后兼容）。
- 远程搜索与虚拟化共存：远程结果列表同样适用 `virtualThreshold`。

### 虚拟滚动（E2d `virtualThreshold`）

- `virtualThreshold?: number`（默认 100，对齐 select；`0` 关闭）：当「可见拍平节点数」`>= threshold` 时，`TreeOptionList` 的可见节点改用 `@tanstack/react-virtual` `useVirtualizer` 渲染（仅渲染视口 + overscan），保证深树滚动性能。
- 未超阈值时保持当前全量递归渲染，与基线一致。
- 虚拟化容器保留 `role="tree"` + `aria-activedescendant` + roving tabIndex；方向键/Home/End 导航时通过 `scrollToIndex`/`scrollIntoView` 让视口跟随键盘焦点。
- 过滤（searchable local/remote）后按「过滤后可见节点数」决定是否虚拟化。
- 虚拟化与 cascade/indeterminate（E0b）、onlyLeaf、showPathLabel、键盘 roving focus、source loading/error 态共存。

### Searchable Baseline

- 当 `searchable=true` 时，`input-tree` 的本地 query 属于 renderer-local UI state，不进入表单值。
- query 非空时，搜索框旁必须提供稳定可发现的 clear affordance；pointer 与键盘都可回到空查询状态。
- query 命中为空时，树面板必须渲染明确的 zero-results empty state，而不是留白。
- zero-results empty state 只表达当前 query 未命中，不改变原始 `options`、字段值或展开 owner。清空 query 后列表恢复到当前 live options。
- roving focus 的 live baseline 现已要求同步真实 DOM focus 与 `aria-activedescendant`：方向键/Home/End 移动后，屏幕阅读器焦点必须跟随当前 active treeitem，而不是只改本地 active key 状态。

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
