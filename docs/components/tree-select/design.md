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

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。`tree-select` 与 `input-tree` 共享底层 tree option 模型，决策方向一致；命名对齐 X3 基线（`docs/references/naming-conventions.md` §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                                                                                 | 采纳                                                                                                                                                                                                 | 不采纳                                                          | 理由                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| popover 触发 + 树面板（与 input-tree 共享 option 模型）                                                              | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                |
| `treeMode: normal\|radio\|checkbox`、`onlyLeaf`、`showPathLabel`                                                     | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                |
| 自定义 `childrenKey`/`labelField`/`valueField`                                                                       | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                |
| `clearable`、`placeholder`                                                                                           | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                |
| 本地搜索（`searchable`）+ zero-results empty state + clear affordance + roving focus（同步 `aria-activedescendant`） | **实现**                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                |
| `cascade` 级联半选 + indeterminate                                                                                   | **实现**：父子传播 + indeterminate 派生（E0b 收口，语义与 `input-tree/design.md` 的 cascade 语义节一致）                                                                                             | —                                                               | 层级选择器头号需求                                                                                                                                                                      |
| `showIcon` 图标                                                                                                      | —                                                                                                                                                                                                    | **不采纳（删字段）**                                            | 当前 schema 未定义图标数据来源；实现需一整套图标解析设计，属 feature 而非漂移修复。已从 `TreeSelectSchema` 移除以消除"声明了但设了无效"的契约漂移。`showOutline` 从不适用于 tree-select |
| 异步懒加载（`deferApi`/`deferField`）                                                                                | **实现**：走 data-source `childrenSource`（on-demand `dispatch` + `helpers.evaluate`，请求引用 `${expandedNodeValue}`；节点 `deferChildren: true` 标记触发；展开 loading/error/重试 + cascade 重算） | amis 组件级 `api`/`autoComplete`/`initFetch` SchemaApi 生命周期 | 请求下沉 data-source + action，不在组件开 api（X3 §1/§3）                                                                                                                               |
| 远程搜索（`searchApi`）                                                                                              | **实现**：走 data-source `searchSource`（on-demand `dispatch` + `helpers.evaluate`，请求引用 `${searchQuery}`，debounce 300ms，结果替换 options）                                                    | —                                                               | 当前仅本地子串过滤                                                                                                                                                                      |
| 虚拟滚动（`virtualThreshold`）                                                                                       | **实现**：`virtualThreshold`（默认 100，对齐 select），`@tanstack/react-virtual`，`useVirtualizer` + popover 内部滚动 + 键盘 `scrollToIndex` 跟随                                                    | —                                                               | 深树性能                                                                                                                                                                                |
| 节点 CRUD（`creatable`/`editable`/`removable` + addApi/editApi/deleteApi/saveOrderApi）                              | **暂不实现**                                                                                                                                                                                         | —                                                               | 场景窄，后续按需                                                                                                                                                                        |
| `nodeBehavior`、`itemActions`、`enableNodePath`+`pathSeparator`                                                      | **暂不实现**                                                                                                                                                                                         | —                                                               | 后续按需                                                                                                                                                                                |
| amis `mobileUI` 双实现                                                                                               | —                                                                                                                                                                                                    | **不采纳**                                                      | 移动端走响应式（见 mobile-roadmap，X3 §3）                                                                                                                                              |

## 3. Flux 中的 renderer/type 定义

- `type: 'tree-select'`
- `category: 'form'`
- 当前 source package: `@nop-chaos/flux-renderers-form-advanced`

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
  showPathLabel?: boolean;
  clearable?: boolean;
  placeholder?: SchemaValue;
  // E2d 新增（见 §9 数据源）：
  virtualThreshold?: number; // 默认 100；0 关闭虚拟化
  childrenSource?: TreeSourceConfig; // 懒加载子节点，on-demand executeSource
  searchSource?: TreeSourceConfig; // 远程搜索，on-demand executeSource（debounce 300ms）
}
```

> `showIcon` 已于 E0b 移除（见决策表"不采纳（删字段）"）。`showOutline` 从不适用于 tree-select。`cascade` 的完整语义（父子传播方向、indeterminate 触发条件、`onlyLeaf` 优先级、单选不受影响）见 `input-tree/design.md` 的 "cascade 语义" 节，tree-select 共享同一套语义与同一套 cascade helper。

> **E2d source 契约（实现中）**：`childrenSource`/`searchSource` 用 `TreeSourceConfig`（不含 `type: 'source'`）声明，避免被 runtime source-prop 自动解析；renderer 在调用前重建 `{ type: 'source', ...config }` 并经 `helpers.executeSource(...)` 触发，请求完全走 data-source runtime（X3 §1/§3）。完整契约见 `input-tree/design.md` §9（树族共享）。

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

### Component Handles（X1）

- X1 起落地 `component:clear`/`focus` handle。renderer definition 已发布 `componentCapabilityContracts`：
  - `clear`：清空选中。
  - `focus`：focus tree-select trigger 按钮。
- 详见 `docs/references/component-handle-vocabulary.md`。

## 9. Searchable Baseline + E2d 数据源

- 当 `searchable=true` 时，popup 内的树搜索必须提供本地 query 输入、zero-results empty state 和 clear affordance 的完整基础微交互。
- clear affordance 负责清空当前搜索 query，而不是清空字段值；字段值清空继续由 `clearable=true` 的 trigger-row clear button 承担。
- query 命中为空时，popup panel 必须显示明确的 empty state，而不是让树区域直接留白。
- 清空 query 后，tree-select 必须恢复当前 live options 列表与 roving-focus 基线。
- roving focus 的 live baseline 现已要求同步真实 DOM focus 与 `aria-activedescendant`，所以 popup 内 tree 键盘导航不会停留在旧 DOM 焦点上。

### E2d 数据源（与 input-tree 共享）

- **异步懒加载（`childrenSource`）**：popup 内的 `TreeOptionList` 与 input-tree 共享懒加载语义；展开 `deferChildren` 节点经 `helpers.executeSource(...)` 拉取子节点，加载/错误/重试态与 input-tree 一致。
- **远程搜索（`searchSource`）**：popup 内 query 驱动远程搜索；source loading/error 态在 popup 内显示。
- **虚拟滚动（`virtualThreshold`）**：popup 高度约束 + 内部滚动；当可见拍平节点数超阈值时，popup 内 `TreeOptionList` 同样虚拟化。
- 完整 source 契约（请求引用 `${expandedNodeValue}`/`${searchQuery}`、`TreeSourceConfig` 不含 `type:'source'`、`executeSource` 入口、refreshDedup 复用）见 `input-tree/design.md` §9。

## 10. 结论

- `tree-select` 应作为独立 field renderer 保留
- 它与 `tree`、`select`、`input-tree` 都应保持明确边界

## 11. 实现拆分建议

- `tree-select` 的 renderer/view 层应主要负责 trigger、popover、`@nop-chaos/ui` 组合和 field contract 接线，不应把搜索、节点展开、选中标签派生、键盘交互全部堆回同一个 JSX 文件。
- 纯 tree option 数据处理应优先放在 helper 模块，例如 option meta 构建、flatten、path label 计算、选择切换等；这类逻辑适合脱离 React 单独测试。
- 当同一个 renderer 文件同时承担 query 状态、过滤投影、展开状态、selected label 派生、commit/cancel 或键盘交互时，优先抽出 local controller hook，而不是发明新的平台协议。
- `tree-select` 与 `input-tree` 可以共享 tree option helper 层，但不应强行共享同一个交互 controller：`tree-select` 额外拥有 trigger/popup open-state、placeholder/trigger text、popover close/open 等外壳语义。
- 若未来扩展到 async search、lazy expand、批量展开或 richer controlled open/expanded state，再评估是否需要进一步下沉到 shared runtime helper；在此之前，本地 controller hook 仍应视为 renderer 内部实现细节。
- 实现时应遵循 `docs/references/renderer-implementation-guidelines.md`：优先最小正确实现，先抽 pure helpers，再在行为复杂时抽 local controller hook，不机械追求 renderless/headless 化。

## 12. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 + M0.1 基础设施）。

| 断点              | 行为                                                                                  | 实现方式                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | tree 选项面板从 Popover 切换为 `@nop-chaos/ui` `Sheet`（`side="bottom"`）底部滑入面板 | renderer 内部 `useIsMobile()` 运行时分支；trigger 渲染为 Button，Sheet 内复用 `TreeOptionList`（expand/collapse/search/lazy/remote 不变） |
| ≥ 768px (desktop) | Popover（行为不变）                                                                   | 同 E2d 后 Popover + `TreeOptionList` 渲染路径                                                                                             |

### 实现细节

- **schema 透明**：无新 `type`、无 `mobileUI` 标志位。mobile 分支完全在 renderer 内部，由 `useIsMobile()`（断点 768）决定。
- **trigger**：mobile 触发器是 `Button`（`variant="outline"`，`data-slot="tree-select-mobile-trigger"`），与 desktop 共享 `tree-select-value` / `tree-select-icons` 子 marker。
- **Sheet 内容**：`SheetContent side="bottom"` + `nop-safe-bottom`（M0.1a）+ `nop-hairline--bottom`（M0.1b）；Sheet 内 `TreeOptionList` 完整保留 expand/collapse、search、lazy children、remote search、虚拟滚动语义。
- **选择行为**：与 desktop 一致（单选/多选由 `treeMode` 决定）；Sheet 不因选择自动关闭（树选择通常需多步浏览，保持打开更符合预期）。
- **clearable**：trigger 右侧清除按钮在 mobile/desktop 下一致。
- **z-index**：Sheet 经 `SheetContent` 内 `useGlobalZIndex()`（M0.1d）取值。

### 触摸适配

- 触摸目标：tree 节点复用 `TreeOptionList` 内部尺寸（满足 baseline §3）。
- 手势：Sheet 遮罩点击关闭；expand/collapse 走 chevron 点击。

## 13. 实现拆分建议（原 §11 内容延续）

响应式 mobile 分支不引入新 controller；`sheetOpen` 状态归 renderer 本地管理，与 `query` 状态同级。
