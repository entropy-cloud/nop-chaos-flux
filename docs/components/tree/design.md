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

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action、不学 amis 散落条件属性与皮肤枚举（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。本表由 E3 plan（`docs/plans/2026-06-22-0330-3-e3-tree-display-search-icons-plan.md`）补齐，X5 P0/P1 硬前置已覆盖；`tree` 属 P2，决策表随 E3 按需启动（roadmap 授权）。

| 能力                                                                              | 采纳                                     | 不采纳     | 理由                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 展开收起（chevron + 整行 click + 键盘 roving focus）                              | **实现**                                 | —          | 当前基线（§13/§14）。`expandOnClickNode` 仅扩 click 入口，不改焦点/导航模型                                                                                                                                                                                                                                                                         |
| 节点模板 `node` region（绑定 `node/index/depth/key/parentNode`）                  | **实现**                                 | —          | 当前基线（§9）                                                                                                                                                                                                                                                                                                                                      |
| Empty state（`empty` value-or-region）                                            | **实现**                                 | —          | 当前基线（§10）；搜索无匹配也复用此入口（§10）                                                                                                                                                                                                                                                                                                      |
| 节点搜索/过滤（本地子串匹配 `labelField` + 自动展开匹配祖先链 + 高亮 + 清空恢复） | **实现**（`searchable: true`，E3）       | —          | 展示树头号 UX 缺口。`searchable` 肯定式布尔（X3 §2 命名）。本地子串过滤已覆盖展示树场景；远程搜索归 data-source（见下）。open-state：父级下发 `searchForcedOpenNodeIds` 受控覆盖子节点本地 `useState`（§8），搜索期间不写本地态，故清空自然恢复快照。高亮 marker `data-slot="tree-search-highlight"`，搜索框 marker `data-slot="tree-search-input"` |
| 节点图标（从数据字段渲染 Lucide 图标）                                            | **实现**（`showIcon` + `iconField`，E3） | —          | 便捷快捷方式。`node` region 自定义优先：两者同存时 region 胜出，`showIcon`/`iconField` 仅在无 region 的 label 回退路径生效。图标 marker `data-slot="tree-node-icon"`。注意 input-tree 的 `showIcon` 漂移已在 E0b 删字段（input-tree 专属裁定），tree 展示组件独立引入                                                                               |
| 缩进引导线（按 depth 垂直 guide-line）                                            | **实现**（`showGuideLine: true`，E3）    | —          | 文件树/深树可读性需求。`showGuideLine` 肯定式布尔。每层 depth 渲染一个引导线 spacer，marker `data-slot="tree-guide-line"`，Tailwind `border-l`。缺省不渲染（无回归）                                                                                                                                                                                |
| 大批量缓解（`TREE_EXPANDED_CHILD_BATCH_SIZE` 增量挂载子节点）                     | **实现**                                 | —          | 当前基线；非视口虚拟化                                                                                                                                                                                                                                                                                                                              |
| 选择 / 值绑定 / 勾选级联（checkbox/radio + cascade 半选）                         | —                                        | **不采纳** | 表单语义留给 `input-tree`/`tree-select`（§1/§8/§11）。E0b/E2d 已收口 input-tree/tree-select 的 cascade 半选。`tree` 是 interaction-owner 展示组件，不做 form 字段值绑定。`multiple` 字段当前仅驱动 `aria-multiselectable`，无选择逻辑                                                                                                               |
| 节点拖拽（层级 DnD：跨层级移动、父子重排）                                        | **计划实现（successor/后续）**           | —          | Deferred（`optimization candidate`，见本 plan `Deferred But Adjudicated`）。无共享 dnd 工具：E1c table 行拖拽 `use-row-drag-sort` 为 table 专属原生 HTML5 DnD，绑定 TableRowEntry + orderField 持久化，不可复用；tree 拖拽是层级 DnD 比扁平列表复杂；§8 已明确延后。non-blocking：当前 tree 无值绑定，拖拽不影响展示契约                            |
| 节点 CRUD（creatable/editable/removable）                                         | **计划实现（successor/后续）**           | —          | `out-of-scope improvement`。§8 延后；CRUD 需 addApi/editApi/deleteApi 请求下沉 data-source + action，属独立编辑能力，非展示 UX                                                                                                                                                                                                                      |
| 异步懒加载（按需加载子节点）                                                      | **计划实现（successor/后续）**           | —          | `out-of-scope improvement`。属 input-tree/tree-select 范围（E2d 已收口）；tree 显示异步独立评估                                                                                                                                                                                                                                                     |
| 虚拟滚动（视口虚拟化）                                                            | —                                        | **不采纳** | E2d 已将 tree 显示 renderer 虚拟化 Deferred 为 `out-of-scope`（`Successor Required: no`）。当前 `TREE_EXPANDED_CHILD_BATCH_SIZE=50` 增量挂载缓解首屏                                                                                                                                                                                                |
| 远程搜索（searchApi）                                                             | —                                        | **不采纳** | 请求下沉 data-source + action（X3 §1/§3，analysis §5「组件级请求」）；本地子串过滤已覆盖展示树场景                                                                                                                                                                                                                                                  |
| amis `nodeBehavior`/`itemActions`/`enableNodePath`/`unfoldedLevel`                | —                                        | **不采纳** | 归后续评估；当前无对应 Flux 契约需求（Non-Blocking Follow-ups）                                                                                                                                                                                                                                                                                     |
| amis 组件级 `api`/`initFetch`/`interval`                                          | —                                        | **不采纳** | 请求下沉 data-source + action（X3 §3 amis 不采纳清单）                                                                                                                                                                                                                                                                                              |
| amis `mobileUI` 双实现                                                            | —                                        | **不采纳** | 响应式归 `mobile-roadmap.md`，不双实现（X3 §3）                                                                                                                                                                                                                                                                                                     |

### 2.1 关键裁定（E3 实现依据）

E3 plan（搜索/图标/引导线）落地时对四条机制作出显式裁定，作为 runtime 实现契约：

1. **搜索 open-state 管理** —— 采用**受控展开覆盖**（非「提升开合态到父」重构）。父 `TreeRenderer` 持有 `searchQuery` 状态，搜索激活时计算 `searchForcedOpenNodeIds`（所有匹配节点的祖先链集合）下发给 `TreeNodeRenderer`；子节点 `effectiveOpen = searchForcedOpenNodeIds.has(id) ? true : localOpen`。搜索期间**不写**子节点本地 `useState`，故清空搜索后本地态自然恢复（= 搜索前快照），无需显式快照/还原逻辑。非匹配、非祖先节点在搜索期间不渲染（DOM 隐藏）。
2. **`showIcon` 与 `node` region 关系** —— `node` region 自定义优先。若 schema 同时声明 `node` region 与 `showIcon`/`iconField`，region 胜出，`showIcon`/`iconField` 被忽略；`showIcon`/`iconField` 仅在**无 region 的 label 回退路径**生效（在 label 前 prepend Lucide 图标）。
3. **引导线实现** —— 按 depth 渲染垂直 `border-l` spacer（Tailwind）。`showGuideLine: true` 时，每个 `depth > 0` 的节点行内、chevron 之前渲染 `depth` 个 spacer（每个 `data-slot="tree-guide-line"`，`w-4 border-l border-border`），形成嵌套深度的引导线视觉。缺省不渲染。
4. **节点拖拽裁定** —— **Deferred**（`optimization candidate`，`Successor Required: no`）。理由：无共享 dnd 工具（E1c table 行拖拽为 table 专属不可复用）+ tree 拖拽是层级 DnD（跨层级移动、父子重排）比扁平列表复杂 + §8 已明确延后。non-blocking：当前 tree 是展示组件无值绑定，拖拽不影响展示契约成立。若未来提取共享 `useFluxDragSort` 抽象（从 E1c table + 本 plan tree），可重新评估。

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
  // E3 树展示 UX 增强（搜索/图标/引导线）
  searchable?: boolean;
  showIcon?: boolean;
  iconField?: string;
  showGuideLine?: boolean;
}
```

首版推荐默认值：

- `childrenKey: 'children'`
- `labelField: 'label'`
- `keyField: 'id'`

E3 新增字段（均缺省不渲染，无回归）：

- `searchable?: boolean`（肯定式布尔，X3 §2 命名）—— 顶部渲染搜索输入框 `data-slot="tree-search-input"`，本地子串过滤 `labelField`；详见 §2.1 裁定 1。
- `showIcon?: boolean` + `iconField?: string` —— 节点图标便捷快捷方式，从节点数据读 `iconField` 字段经 `resolveLucideIcon` 渲染；`node` region 自定义优先（同存时 region 胜出，图标仅在无 region 的 label 回退路径生效），详见 §2.1 裁定 2。
- `showGuideLine?: boolean` —— 缩进引导线，按 depth 渲染垂直 `border-l` spacer，详见 §2.1 裁定 3。

## 6. 字段分类

- `data`、`childrenKey`、`labelField`、`keyField`、`initiallyExpanded`、`expandOnClickNode`、`statusPath`、`searchable`、`showIcon`、`iconField`、`showGuideLine`: `value`（prop）
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

### 9.1 节点图标便捷快捷方式（`showIcon`/`iconField`）与 region 的关系

- `node` region 自定义优先：若 schema 同时声明 `node` region 与 `showIcon`/`iconField`，region 胜出，`showIcon`/`iconField` 被忽略（不在 region 输出上叠加图标）。
- `showIcon`/`iconField` 仅在**无 region 的 label 回退路径**生效：在 `labelField` 文本前 prepend 一个 Lucide 图标（经 `resolveLucideIcon`）。
- 节点缺 `iconField` 字段 → 该节点不渲染图标（不抛错）；icon 名无法 resolve → `resolveLucideIcon` 兜底（占位图标）。详见 §2.1 裁定 2 与 Failure Path `iconfield-missing`/`icon-name-invalid`。
- 注意 input-tree 的 `showIcon` 漂移已在 E0b 删字段（input-tree 专属裁定）；tree 展示组件独立引入 `showIcon`/`iconField`。

便捷图标示例（无 region）：

```json
{
  "type": "tree",
  "data": "${fileSystem}",
  "showIcon": true,
  "iconField": "icon"
}
```

### 9.2 DOM markers

tree 展示组件发布以下稳定 DOM marker（E2e/测试/styling 锚点）：

| marker (`data-slot`)    | 出现条件                                                 | 含义                                                              |
| ----------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `tree-search-input`     | `searchable: true`                                       | 顶部搜索输入框                                                    |
| `tree-search-highlight` | `searchable` + 当前节点 label 命中搜索词                 | 高亮匹配子串（`<mark>`）                                          |
| `tree-node-icon`        | 无 `node` region + `showIcon: true` + 节点有 `iconField` | 节点 Lucide 图标                                                  |
| `tree-guide-line`       | `showGuideLine: true` + `depth > 0`                      | 缩进引导线 spacer（每节点 `depth` 个）                            |
| `tree-node-row`         | 总是                                                     | 单节点行容器（含 `data-tree-node-id`）                            |
| `tree-node`             | 总是                                                     | 单节点外壳（含 `data-depth`/`data-node-key`/`data-tree-node-id`） |
| `tree-children`         | 节点有子节点                                             | 子节点分组容器                                                    |
| `tree-empty`            | `data` 为空 或 搜索无匹配                                | empty 提示容器                                                    |

## 10. Empty State

如果 `data` 为空：

- 有 `empty` -> 渲染 `empty`
- 无 `empty` -> 不渲染节点内容

搜索无匹配（`searchable: true` + 输入词命中零节点，Failure Path `search-no-match`）：

- 复用同一 `empty` 入口：搜索框保持可见（用户可改词/清空），下方渲染 `tree-empty`（`empty` region 内容，或默认 `flux.common.noData` 文案）。
- 搜索期间非匹配、非祖先节点不渲染（DOM 隐藏），故无匹配时树体为空，仅 empty 提示可见。

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

## 14. Tree Keyboard Contract

- `tree` renderer 在 default 模式与 `expandOnClickNode: true` 模式下共享同一套 `role="tree"` / `role="treeitem"` 键盘基线。
- 可见 `treeitem` 使用 roving `tabIndex`；键盘入口落在节点行本身，而不是只落在内部 chevron trigger。
- 支持的导航键包括 `ArrowUp`、`ArrowDown`、`Home`、`End`。
- 对带子节点的项：`ArrowRight` 负责展开并在已展开时进入第一个子节点；`ArrowLeft` 负责折叠并在已折叠时返回父节点。
- default 模式与 `expandOnClickNode: true` 模式都允许父节点 `treeitem` 通过 `Enter` / `Space` 触发展开收起；两者共享同一套键盘交互与焦点归属。
- `expandOnClickNode: true` 只额外把整行点击也纳入展开/收起交互，不改变整棵树的焦点与导航模型。
