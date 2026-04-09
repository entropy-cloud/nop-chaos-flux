# 跨 Store 数据驱动方案设计

> 2026-04-09 更新说明
>
> 本讨论前两轮中的核心方向“宿主内部 readonly snapshot 投影 + 宿主外部显式状态发布”仍然成立，但有三点已经被后续 active docs 收口，需要按当前基线理解：
>
> 1. `publishScope` 已不再建议作为独立字段名；统一收口为 `statusPath`。
> 2. 复杂宿主内部的 schema 读取面应称为 `Host Projection`，不是一次性注入的静态快照，也不等同于 `$form` 这类局部保留绑定。
> 3. designer / spreadsheet / report-designer 这类复杂宿主现在更准确地归类为 `Domain Host Owner`，而不是泛化写成普通 `Interaction Owner`。

## 第 1 轮

### 用户原始表述

用户提出两个核心问题：

- 现在有没有跨 store 的数据驱动方案？
- 有没有实际需要会导致跨 store 监听和触发？

要求在仔细阅读 `docs/architecture/` 下文档后，在 `docs/discussions/` 记录这次讨论。

核心约束：
- 方案必须是**声明式的**，在 JSON 中表达。
- 命令式具体实现接口是底层实现细节，不是讨论焦点。
- 首先要确定**使用层面**，必须是使用层面非常简单直观。

### AI 复述

本轮讨论的焦点是：在当前 Flux 架构下，跨越 ScopeRef 边界的数据响应问题。

具体说，需要回答三个层次的问题：

1. **现状诊断**：当前架构中，数据驱动的 pub/sub 机制到底覆盖了哪些情况，哪些情况属于结构性空白。
2. **真实场景**：是否有具体的低代码使用场景，确实需要跨 store 监听或触发。
3. **声明式设计**：如果有实际需要，使用层面最简单直观的 JSON 方案是什么。

### AI 分析

#### 1. 当前架构的数据驱动机制

调研已覆盖：`flux-core.md`、`api-data-source.md`、`flux-runtime-module-boundaries.md`，以及 `packages/flux-runtime/src/` 下的实现代码。

当前架构以 `ScopeRef.store.subscribe()` 作为统一 pub/sub 骨干。所有数据驱动都经过这条通路：

```
ScopeStore / FormStore / PageStore
  ↓ 通过 adapter 包装为 ScopeRef
ScopeRef.store.subscribe(change => ...)
  ↓ 订阅方：
  ├── source-registry.ts  → 依赖命中 → controller.refresh()  → 重算并写回 scope
  └── reaction-runtime.ts → 依赖命中 → scheduleReaction()    → dispatch actions
```

**已经完整实现的部分：**

| 模式 | 实现状态 |
|---|---|
| 当前 scope 内任意路径变化 → 表达式自动重算 | 完整 |
| 父 scope 变化 → 子 scope 可见（composite 订阅） | 完整 |
| scope 变化 → `data-source` 公式重算 / API 重新拉取 | 完整，有依赖追踪、自环防护 |
| scope 变化 → `reaction` 调度 actions | 完整，有 debounce / once / 循环防护 |
| FormStore / PageStore → ScopeRef 统一接入 | 通过 adapter 包装，完整 |

**核心设计原则**：不存在直接的 Zustand-to-Zustand 跨 store 订阅。一切响应都经由 `ScopeRef.store.subscribe()`，Zustand store 只是该 subscribe 接口的具体实现。

---

#### 2. 数据驱动的结构性约束

当前 scope 模型是**严格词法层级**的：

- 表达式只能读到当前 scope 及其**祖先**链上的数据。
- `reaction`、`data-source` 都在其**所在 scope** 的 `ScopeRef` 上注册，只监听该 scope 树的变化。
- 没有"从 scope B 读取 scope A 的值"这样的跨链能力。

这是**有意识的设计选择**——词法可见性保证了可推导性，scope 边界就是数据所有权边界。

但这个约束在一种情况下产生了真实的结构性空白：

> **Domain store（设计器、电子表格等）维护自己的 Zustand store，不参与 ScopeRef 系统。**

---

#### 3. 真实的跨 Store 场景分析

**场景 A（无需跨 store）：兄弟组件协调**

```
Page
├── FilterBar（写入 filters.keyword 到 page scope）
└── DataTable（data-source 参数引用 ${filters.keyword}）
```

这是最典型的"联动"场景。因为两者共享同一个 page scope，`data-source` 自动监听 `filters.keyword` 变化即可重新拉取。**这已经完整解决，不需要跨 store。**

---

**场景 B（无需跨 store）：表单联动**

```json
{
  "type": "reaction",
  "watch": "${country}",
  "actions": { "action": "setValue", "args": { "path": "state", "value": "" } }
}
```

country 变化时清空 state。仍然在同一 form scope 内，无需跨 store。

---

**场景 C（真实跨 Store 需求）：Domain Store 状态 → Schema 可观测**

Domain Store 是指 Flow Designer、Report Designer、Spreadsheet 等的内部 Zustand Store。它们维护自己的文档状态（dirty、selection、canUndo 等），但这些状态**不在 ScopeRef 系统里**。

当前的处理方式是"拉模式注入"：designer-page 在渲染 region（toolbar、inspector、dialogs）时，构建一个 `designerScopeData` 快照，作为 region 的子 scope 注入。

问题在于：
- 只有 **region 内部** 的 schema 能观测到 designer 状态。
- **Region 外部** 无法响应 designer 状态变化——例如页面级标题栏需要显示"未保存"指示，或页面层的 `reaction` 需要在 designer 变脏时触发自动保存倒计时。
- 注入是一次性快照，不是响应式的（designer 状态变化后，region schema 需要靠其他机制重新求值）。

这是当前架构的**真实结构性空白**。

---

**场景 D（真实跨 Store 需求）：复杂控件内部状态向上发布**

类似场景 C 的通用形式：任何封装了 domain store 的复杂控件（电子表格、富文本编辑器、图形设计器），其运行时内部状态（当前选中项、undo 深度、文档 dirty 状态）都无法被 schema 级别的表达式或 reaction 观测到。

---

**场景 E（边缘场景）：两个独立运行时实例之间**

两个分别实例化的 `RendererRuntime`（e.g. 微前端场景）之间没有 scope 共同祖先。这种场景在当前架构设计目标内不属于优先问题，属于宿主层协调职责。

---

#### 4. 真实需要小结

| 场景 | 是否需要跨 store | 当前是否解决 |
|---|---|---|
| 兄弟组件通过共同 scope 协调 | 不需要 | 已解决 |
| 父 scope 驱动子 scope | 不需要 | 已解决 |
| form 字段联动 | 不需要 | 已解决 |
| data-source 依赖上游值自动刷新 | 不需要 | 已解决 |
| Domain store 状态 → region 外 schema 可观测 | **需要** | **未解决** |
| Domain store 状态变化 → schema reaction 触发 | **需要** | **未解决** |

---

#### 5. 声明式方案候选

核心要求：使用层面简单直观，以 JSON 表达，不暴露命令式内部实现。

**候选方案 A：`publishScope` —— 复杂控件向父 scope 发布状态**

复杂控件（designer-page、spreadsheet-page 等）通过 `publishScope` 字段声明把自己的运行时状态发布到**上层 scope** 中的某个路径：

```json
{
  "type": "flow-designer",
  "id": "mainDesigner",
  "publishScope": "designer",
  ...
}
```

发布后，页面中任何可见该 scope 的表达式都可以直接使用：

```json
{ "type": "text", "text": "${designer.isDirty ? '● 未保存' : '已保存'}" }
```

```json
{
  "type": "button",
  "label": "保存",
  "disabled": "${!designer.isDirty}"
}
```

```json
{
  "type": "reaction",
  "watch": "${designer.isDirty}",
  "when": "${value === true}",
  "debounce": 30000,
  "actions": { "action": "autoSave" }
}
```

**优势：**
- 使用层完全透明——消费方什么都不需要知道，就是普通表达式。
- 与现有 scope 模型天然兼容，不引入新的读取语法。
- 复杂控件通过 `publishScope` 明确声明自己的状态边界，隐藏内部实现。
- 底层实现：复杂控件的 domain store 变化 → 调用 `scope.update(publishScope, snapshot)` → 正常 ScopeRef pub/sub 链路 → 所有订阅该路径的 data-source / reaction 自动触发。

**候选方案 B：`xui:data` 导入**

类比 `xui:import` 导入 action namespace，允许从命名 scope 注册表导入数据：

```json
{
  "type": "container",
  "xui:data": ["cart", "userPrefs"],
  "body": [
    { "type": "text", "text": "${cart.items.length} 件" }
  ]
}
```

**问题：** 需要维护一个命名 scope 注册表（类似 ActionScope 注册中心），引入了新的全局协调概念。消费方需要感知"命名 scope"存在，使用层心智负担较高。

**候选方案 C：`targetScope` 让 reaction 跨 scope 边界监听**

```json
{
  "type": "reaction",
  "targetScope": "mainDesigner",
  "watch": "${isDirty}",
  "actions": { "action": "showAutoSaveTimer" }
}
```

**问题：** 在 schema 层暴露了"scope 寻址"概念，引入了不直观的非词法跨界语义。

---

#### 6. 初步判断

方案 A（`publishScope`）与 Flux 的统一原语哲学最吻合：

- 数据驱动的读取路径完全不变——消费方只用普通表达式。
- 复杂控件是新增机制的唯一感知方（声明 `publishScope`）。
- 底层路径复用已有 ScopeRef pub/sub，不引入新的数据驱动通路。
- 使用层面极其简单：把 designer 状态当普通 scope 变量用即可。

当前唯一需要澄清的是：`publishScope` 发布的更新应该在复杂控件内部 domain store 的哪个时机触发（每次状态变化同步推送？还是去抖聚合推送？），这属于实现细节。

---

### 待澄清问题

1. 你描述的"跨 store"主要是指哪类场景：是 domain store（designer、spreadsheet 等）状态需要被 schema 表达式或 reaction 观测，还是两个普通 scope 树之间的横向通信，还是两者都有？

2. `publishScope` 方案中，复杂控件向上发布状态这一方向（内部 domain state → 外层 scope），是否覆盖了你设想的主要使用场景？还是也需要"外层 scope 数据流入复杂控件内部"这个反向路径？

3. 对于方案 A，`publishScope` 发布的粒度你是否有预期——是发布整个 designer snapshot（包含 selection、canUndo、isDirty 等完整快照），还是只允许发布用户指定的特定字段？

4. 当你说"跨 store 监听和触发"时，是否也包含"跨 store 写入"（即 reaction 或 action 直接写入另一个独立 store），还是只讨论读/监听方向？

---

## 第 2 轮

### 用户回答

用户提出 `docs/architecture/action-interaction-state.md`，询问该文档中的设计与本讨论提出的方案是否一致，以及如何统一。

### AI 整理

用户补充的背景文档定义了以下核心机制：

- **Read Surface Rule**：owner 的状态有两条读取路径——内部通过保留绑定（如 `$form`），外部通过显式 `statusPath`，即 owner 将只读状态 DTO 发布到 scope 中的命名路径。
- **四类 Owner 模型**：Producer Owner（data-source）、Semantic Lifecycle Owner（form）、Interaction Owner（table/tabs/dialog）、Explicit Tracked Operation。
- **Correctness 与 UX Projection 分离**：status owner 拥有正确性保障，UI 状态是其只读投影。

用户的问题是：本讨论第 1 轮提出的 `publishScope` 方案，与 `action-interaction-state.md` 中的 `statusPath` 读面机制是否一致，能否统一。

### AI 分析

#### 1. 两个方案的本质是同一机制

对比：

| 概念 | 来源文档 | 机制描述 |
|---|---|---|
| `statusPath` | `action-interaction-state.md` | owner 将只读状态 DTO 发布到 scope 中的命名路径；外部表达式通过该路径读取 |
| `publishScope`（第 1 轮候选方案 A） | 本讨论 | 复杂控件将 domain snapshot 发布到**父级** scope 中的命名路径；外部表达式直接使用 |

二者的**底层实现路径完全相同**：

```
owner 内部状态变化
  → owner 调用 scope.update(targetPath, readonlyDTO)
  → ScopeRef pub/sub 触发
  → 所有依赖该路径的 data-source / reaction / 表达式自动更新
```

`publishScope` 就是 `statusPath` 应用于 domain store owner 的实例，没有引入任何新机制。

---

#### 2. `action-interaction-state.md` 已经描述了正确的内外分离结构

该文档对 form 的描述是：

- 表单**内部**：`$form.submitting`（保留绑定，只读语义摘要）
- 表单**外部**：`${createUserFormStatus.submitting}`（通过 `statusPath`）

designer 的现有结构已经天然对应这个内外分离：

- designer **region 内部**：`${designer.isDirty}`（region scope 注入，即"内部保留绑定"的等价形式）
- designer **region 外部**：目前**缺失**，这正是结构性空白所在

因此，`publishScope` 要填补的，正是 `action-interaction-state.md` 体系中 designer 这类 Interaction Owner 还没有补齐的"外部读面"（`statusPath`）。

---

#### 3. 统一方案：用 `statusPath` 替代 `publishScope`

**统一后的结论：废弃 `publishScope` 这个独立字段名，改用 `statusPath`，并将其覆盖范围扩展到 domain store owner。**

字段名和语义：

| Owner 类型 | 内部读 | 外部读（`statusPath`） | DTO 形状 |
|---|---|---|---|
| `form` | `$form` | `${myFormStatus.submitting}` | `FormStatusSummary` |
| `data-source` | 当前 scope 内直接引用 `name` | `${usersStatus.loading}` | `SourceStatusSummary` |
| `dialog` / `drawer` | `$surface` | via `statusPath` | `SurfaceStatusSummary` |
| `flow-designer` | `${designer.isDirty}`（region 内） | `${mainDesignerStatus.isDirty}` | `DesignerStatusSummary` |
| `spreadsheet-page` | region scope 内 | `${spreadsheetStatus.dirty}` | `SpreadsheetStatusSummary` |

对 designer 的 JSON 示例：

```json
{
  "type": "flow-designer",
  "id": "mainDesigner",
  "statusPath": "mainDesignerStatus",
  "document": { ... }
}
```

外部消费（在同一页面 scope 中的任意位置）：

```json
{ "type": "text", "text": "${mainDesignerStatus.isDirty ? '● 未保存' : '已保存'}" }
```

```json
{
  "type": "button",
  "label": "保存",
  "disabled": "${!mainDesignerStatus.isDirty}"
}
```

```json
{
  "type": "reaction",
  "watch": "${mainDesignerStatus.isDirty}",
  "when": "${value === true}",
  "debounce": 30000,
  "actions": { "action": "autoSave" }
}
```

使用层面与 form 完全一致——作者感知不到任何跨 store 的存在。

---

#### 4. 双向数据流的完整对称性

统一后的架构形成了非常清晰的双向对称：

```
domain store 状态 → scope (读出)
  手段：statusPath 发布 readonly DTO
  消费：普通 scope 表达式

外部 schema → domain store (写入)
  手段：namespaced actions（designer:save、designer:undo 等）
  消费：普通 action dispatch
```

读方向走数据，写方向走 action。两条通路都已存在于架构中，没有新的原语。

---

#### 5. 关于 DTO 的粒度

`action-interaction-state.md` 对 `statusPath` 的约束是"只读语义摘要，不暴露底层 store"。designer 的 `DesignerStatusSummary` 应遵守同样约束：

- 包含：`isDirty`、`canUndo`、`canRedo`、`selection`（只读摘要）、`activeNodeId`、`nodeCount`、`edgeCount` 等
- 不包含：底层 `DesignerCore` 实例、内部 `Zustand` store 引用、可调用方法

这与 form 不暴露 `$store`、不暴露可调用方法的原则完全一致。

---

#### 6. 统一后两个文档的关系

- `docs/architecture/action-interaction-state.md` 定义了 `statusPath` 读面机制和 owner 分类原则——这是**规范文档**。
- 本讨论验证了：designer / spreadsheet 等 domain owner 属于 **Interaction Owner** 分类，缺失的仅是"外部读面"（即 `statusPath`）的落地。
- 填补这个空白的方式是让 domain owner 声明 `statusPath`，实现与其他 owner 完全统一的状态发布机制。
- 无需新增任何架构层概念，`publishScope` 这个候选方案名已无必要——直接复用 `statusPath` 即可。

---

### 待澄清问题

1. 你是否认可将 `publishScope` 统一为 `statusPath`，并由此将 domain owner（designer、spreadsheet 等）纳入 `action-interaction-state.md` 的 owner 体系？

2. `DesignerStatusSummary` 的字段范围你是否有具体期望——是仅包含操作状态（isDirty、canUndo、canRedo），还是也包含选中状态（selection、activeNodeId）以便 schema 可以响应用户在 designer 里的选择操作？

3. 跨 store 的**写入方向**（外部 schema → domain store）你认为现有的 `namespaced action`（如 `designer:save`）已经足够，还是还有需要用数据驱动表达（而非 action 表达）的写入场景？

---

## 第 3 轮（2026-04-09 当前结论）

### 1. 现有讨论与当前 active docs 的关系

这份讨论的核心判断仍然正确：

- 普通 scope 树内部并不存在“任意 Zustand 跨 store 订阅”这一第二机制
- 真实需要补齐的，是复杂宿主 domain runtime 的 schema-visible 读面

但其中两处表述需要按当前基线修正：

1. **“region 注入是一次性快照”** 这一说法已经过时。
   当前 Flow Designer / Report Designer / Spreadsheet host 都已经有 reactive `Host Projection` 路径，宿主 region 内部会随着 host snapshot 更新而重算，不是一次性静态注入。

2. **“designer 属于普通 Interaction Owner”** 这一说法现在不够准确。
   当前更合理的分类是 `Domain Host Owner`：
   - 内部读：`Host Projection`
   - 外部读：可选 `statusPath`
   - 写方向：namespaced actions

### 2. 当前统一结论

当前应统一为：

- `publishScope` 不再作为独立字段名推进
- 对外 readonly summary publication 统一使用 `statusPath`
- 对内 schema fragment 读取复杂宿主快照，统一称为 `Host Projection`

也就是说：

```text
Domain Host Owner internal read  -> Host Projection
Domain Host Owner external read  -> statusPath
Domain Host Owner writes         -> namespaced actions
```

### 3. 这是否仍然算“跨 store 数据驱动”

从使用者视角看，是的：

- domain runtime 的状态变化可以驱动 schema 表达式、reaction、按钮 disabled 等 UI 行为

但从架构视角看，不需要引入新的“跨 store pub/sub 原语”：

- 宿主内部通过 host wiring 把 readonly snapshot 投影进 schema-visible `ScopeRef`
- 宿主外部通过 `statusPath` 把窄摘要 DTO 发布进普通 scope

所以 Flux 仍然保持：

- 读方向：`ScopeRef` / `Host Projection` / `statusPath`
- 写方向：`Capability` / namespaced actions

### 4. 哪些 active docs 需要更新

是，需要更新，而且当前已经开始收口：

- `docs/architecture/action-interaction-state.md`
  现在应明确 `Domain Host Owner` 分类，以及“内部 Host Projection / 外部 statusPath”分层。

- `docs/architecture/complex-control-host-protocol.md`
  现在应明确 host scope 是内部 host projection，而不是宿主外部的通用读面；外部摘要应统一使用 `statusPath`。

- `docs/components/designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- `docs/components/report-designer-page/design.md`
  这些组件文档应明确：它们内部通过 host scope 读取 snapshot，外部若要观测状态则走 `statusPath`。

### 5. 当前更推荐的术语

不再推荐：

- `publishScope`
- “跨 store 监听” 作为新的架构机制名

更推荐：

- `Domain Host Owner`
- `Host Projection`
- `statusPath`

### 6. 当前结论一句话

讨论第 1 轮提出的问题依然是真问题，但答案已经从“新增 `publishScope` 机制”收口为：

- 宿主内部继续走 reactive `Host Projection`
- 宿主外部统一走 `statusPath`
- 不新增第二套字段名和第二套读取机制
