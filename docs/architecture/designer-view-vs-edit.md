# Designer View vs Edit 分离设计

## 1. 目标

为 Flux 设计器家族（Flow Designer、Report Designer、Spreadsheet Page、Word Editor）定义统一的 **View（只读查看）** 与 **Edit（编辑）** 分离模式，使得：

1. 同一个设计器可以独立运行在 View 模式下，不依赖编辑能力的 schema、action、UI 组件
2. 业务方可以通过单一开关（`readOnly: true`）将任意设计器切换为只读查看器，无需手动关闭每个子能力
3. 新增设计器家族时，View/Edit 分离作为架构约束，而非事后补救
4. View 模式是基础能力层，Edit 模式在其上叠加——不把编辑能力硬编码进设计器核心

---

## 2. 原则

### 2.1 View 是 Edit 的子集，而非反向

View 模式不是"把 Edit 模式的按钮全部禁用"，而是"只加载和渲染查看所需的最小能力集"。架构分层：

```
View Core (spreadsheet-core / flow-designer-core / report-designer-core)
  ├── 文档打开/渲染
  ├── 导航（翻页、切换 sheet、缩放、平移）
  ├── 选择（选中节点/单元格/边，但不产生 mutation）
  ├── 只读快照投影到宿主 scope
  ├── 事件：点击、hover、选中（但不触发创建/修改/删除）
  └── 只读 Toolbar：back/title/badge/text/fitView/minimap

Edit Layer (在 View Core 之上叠加)
  ├── mutation 命令通道（addNode/setCellValue/connect 等）
  ├── 可编辑 Toolbar：undo/redo/save/export/样式按钮
  ├── 拖拽（palette/field-panel → canvas）
  ├── 键盘编辑、inline edit、clipboard
  ├── 创建对话框、属性编辑面板的写动作
  └── dirty 追踪与保存
```

### 2.2 单一 `readOnly` 开关，而非层层 features

每个设计器页面的 schema 顶层提供一个 `readOnly` boolean 开关。当 `readOnly: true` 时：

- Core 层拒绝所有 mutation 命令（command firewall）
- Renderer 层不渲染编辑 UI 组件（toolbar buttons、palette、drag handles、inline editors）
- 不产生 `dirty` 状态，不追踪 undo/redo
- 不注册也不执行 `designer:*` 写操作 action handler

禁止的做法：

- 要求业务方逐个关闭 `features.undo`、`features.redo`、`features.clipboard` 等来达到"类似只读"
- 在 renderer 层仅在 onClick 回调里判断 `disabled` 而非短路渲染
- View 模式仍加载编辑组件只是设为 `disabled`

### 2.3 View 模式在不同设计器家族中的公共契约

| 能力                                          | View 模式          | Edit 模式 |
| --------------------------------------------- | ------------------ | --------- |
| 文档加载与渲染                                | ✅                 | ✅        |
| 缩放/平移/适配视口                            | ✅                 | ✅        |
| 选中（高亮，无副作用）                        | ✅                 | ✅        |
| 节点/单元格点击事件 (`onClick`)               | ✅                 | ✅        |
| Minimap                                       | ✅                 | ✅        |
| 导航（翻页、切换 sheet）                      | ✅                 | ✅        |
| 只读 Toolbar（back/title/badge/text/fitView） | ✅                 | ✅        |
| 属性查看 (`inspector.body` 只读渲染)          | ✅ when configured | ✅        |
| Selection → host scope 投影                   | ✅                 | ✅        |
| 数据导出 (`exportDocument`)                   | ✅                 | ✅        |
| Palette / 字段面板 / 拖拽                     | ❌ 不渲染          | ✅        |
| 编辑 Toolbar（undo/redo/save/样式）           | ❌ 不渲染          | ✅        |
| Inline edit / 单元格编辑                      | ❌                 | ✅        |
| 创建/删除/连线/断开                           | ❌                 | ✅        |
| Clipboard（copy/cut/paste）                   | ❌                 | ✅        |
| Dirty 追踪                                    | ❌                 | ✅        |
| Undo/Redo 历史                                | ❌                 | ✅        |
| Clipboard - Copy（仅读取选择内容）            | ✅                 | ✅        |
| Clipboard - Cut/Paste（产生 mutation）        | ❌                 | ✅        |
| 属性编辑（写回到 document）                   | ❌                 | ✅        |
| 创建对话框                                    | ❌                 | ✅        |

---

## 3. 实现策略

### 3.1 设计器核心的只读守卫模式

#### 3.1.1 参考模式：Spreadsheet Core 的 command firewall

spreadsheet-core 已实现的标准模式——**中央命令调度 + 白名单守卫**：

```
SpreadsheetCore 初始化时接收 readonly 选项
  → 存入 InternalState.readonly
  → dispatch() 入口守卫：if (readonly && !READ_ONLY_COMMANDS.has(type)) → { ok:false, error:'Document is readonly' }
  → Snapshot 暴露 readonly 状态给 renderer 层
  → Renderer 层通过 snapshot.readonly 短路编辑 UI
```

当前 spreadsheet-core 的 `READ_ONLY_COMMANDS` 白名单（`command-handlers/index.ts`）：

```
READ_ONLY_COMMANDS = new Set([
  'spreadsheet:setActiveSheet',     // 导航
  'spreadsheet:setSelection',       // 选中
  'spreadsheet:copyCells',          // 只读复制
  'spreadsheet:selectAll',          // 全选
  'spreadsheet:selectRow',          // 行选中
  'spreadsheet:selectColumn',       // 列选中
  'spreadsheet:undo',               // ⚠️ 已知不符合本文档原则，见 §3.1.1.1
  'spreadsheet:redo',               // ⚠️ 已知不符合本文档原则，见 §3.1.1.1
  'spreadsheet:find',               // 搜索
  'spreadsheet:findNext',           // 搜索下一处
])
```

**要求**：所有设计器 core 必须实现：

- 工厂函数接收 `readonly?: boolean` 参数
- 内部状态记录 `readonly`
- 所有 mutation 操作（无论通过命令调度还是直接方法）在入口处受 `readonly` 守卫
- `getSnapshot()` 返回中包含 `readonly: boolean`

##### 3.1.1.1 已知的 Spreadsheet 现有问题

现有 spreadsheet-core 将 `spreadsheet:undo` 和 `spreadsheet:redo` 列入白名单，允许在 readonly 模式下调用。这与本文档 §2.3 的原则矛盾——View 模式下不应产生 undo/redo 历史。

**Phase 0 修复**：从 `READ_ONLY_COMMANDS` 中移除 `spreadsheet:undo` 和 `spreadsheet:redo`。readonly 模式下 undoStack/redoStack 保持为空，这两个命令即使被调用也无副作用，但从契约层面应拒绝。

#### 3.1.2 Flow Designer Core 的 readOnly 集成

Flow Designer Core 的架构与 Spreadsheet Core 不同——它不使用中央命令调度，而是通过 `DesignerCore` 接口的**直接方法**（`addNode()`、`deleteNode()`、`undo()`、`save()` 等）暴露操作。

因此实现 readOnly 守卫有两种可行路径：

Flow Designer 从 Flux action 到 Core 方法的完整链路：

```
Flux schema: toolbar button onClick={action: "designer:addNode"}
  → Flux Runtime action dispatch
  → Host action provider (DesignerPageRenderer 注册的 designer: namespace)
  → DesignerCore.addNode()          ← readonly 守卫在此层（选项 A）
    → 如果 readonly: 返回 error
    → 如果 !readonly: 执行 mutation → push history → update dirty
```

View 模式下，toolbar 不渲染 mutation 按钮（短路在 renderer 层），因此 action dispatch 链路本身就不会触发。但作为防御性编程，core 层的方法级守卫仍然必需。

**选项 A — 方法级守卫（推荐 Phase 2 首选）**：在每个 mutation 方法入口添加 `readonly` 检查。

```typescript
// core.ts
function createDesignerCore(initialDoc, config, options?: { readonly?: boolean }) {
  const readonly = options?.readonly ?? false;
  // ...
  return {
    addNode(node) {
      if (readonly) return { ok: false, error: 'Document is readonly' };
      // ... 原有逻辑
    },
    deleteSelection() {
      if (readonly) return { ok: false, error: 'Document is readonly' };
      // ...
    },
    // 所有 mutation 方法同理
    // 导航/选择/查看类方法无需守卫
    setSelection(selection) {
      /* 无需守卫 */
    },
    fitView() {
      /* 无需守卫 */
    },
    exportDocument() {
      /* 无需守卫 */
    },
    getSnapshot() {
      return { ...snapshot, readonly };
    },
  };
}
```

**选项 B — 命令调度层（长期目标）**：为 Flow Designer Core 引入中央命令调度模式，与 Spreadsheet Core 对齐。这需要将现有直接方法重构为命令对象 + dispatcher 架构，在 dispatcher 入口设统一守卫。

**Phase 2 采用选项 A**，Phase X（未来重构）再考虑选项 B。

`DesignerSnapshot` 增加 `readonly: boolean` 字段。

白名单方法（View 模式下允许）：

```
设计器 Core 方法              | 说明
----------------------------|----------------------
getSnapshot()               | 快照读取
subscribe()                 | 状态订阅
exportDocument()            | 数据导出
setSelection()              | 选中
fitView()                   | 适配视口
toggleGrid()                | 网格开关
toggleMinimap()             | 小地图开关
```

黑名单方法（View 模式下拒绝）：

```
设计器 Core 方法              | 说明
----------------------------|----------------------
addNode()                   | 创建节点
deleteSelection()           | 删除选中
duplicateSelection()        | 复制选中
connect()                   | 连线
disconnect()                | 断开
updateNodeData()            | 更新节点数据
updateEdgeData()            | 更新边数据
moveNodes()                 | 移动节点
addEdge()                   | 新增边
reconnectEdge()             | 重连边
undo()                      | 撤销
redo()                      | 重做
save()                      | 保存（View 模式下无 dirty 无需保存）
replaceDocument()           | 替换文档
acceptCurrentDocumentAsSaved() | 标记保存
```

`autoLayout` 的说明：虽然布局会修改节点位置（属于数据 mutation），但在 View 模式下也可能需要重新排列节点以便阅读。建议处理方式为：**View 模式下 autoLayout 走只读路径**——计算布局但不 push 历史、不设 dirty 标志、不触发 `documentChanged` 事件。这需要将 layout 与历史/脏状态解耦（建议在 Phase 2 中实现）。

#### 3.1.3 Report Designer Core 的 readOnly 集成

Report Designer 包含两层 core：spreadsheet-core（底层表格）和 report-designer-core（上层报表语义）。两者都需要 readOnly 支持：

```typescript
interface CreateReportDesignerCoreOptions {
  document: ReportTemplateDocument;
  config: ReportDesignerConfig;
  readonly?: boolean; // 新增
}
```

- `readonly: true` 时，spreadsheet core 也初始化为 `readonly: true`
- 白名单命令（View 模式下允许）：

```
report-designer:preview            // 预览
report-designer:stopPreview        // 停止预览
report-designer:exportTemplate     // 导出模板（不修改 document）
```

- 黑名单命令（View 模式下拒绝）：

```
report-designer:dropFieldToTarget   // 字段拖拽 = document mutation
report-designer:updateMeta          // 元数据写入
report-designer:importTemplate      // 模板导入 = document 替换，
                                     // 非纯查看操作，刷新页面 prop 替代
spreadsheet:setCellValue            // 由 spreadsheet core 守卫拒绝
spreadsheet:* (所有 mutation 命令)
```

### 3.2 Renderer 层短路规则

Renderer 层通过 `snapshot.readonly` 或 host scope 的 `runtime.readonly` 决定渲染内容。

#### 3.2.1 设计器页面入口

```
designer-page schema:
  readOnly?: boolean   // 新增字段
```

`DesignerPageSchemaInput` 加字段：

```typescript
interface DesignerPageSchemaInput {
  type: 'designer-page';
  // ... 现有字段 ...
  readOnly?: boolean; // 新增
}
```

`ReportDesignerPageSchemaInput` 加字段：

```typescript
interface ReportDesignerPageSchemaInput {
  type: 'report-designer-page';
  // ... 现有字段 ...
  readOnly?: boolean; // 新增
}
```

`SpreadsheetPageSchemaInput` 已有 `readOnly?: boolean`，保持不变。

#### 3.2.2 Toolbar 变换规则

| Toolbar Item                            | View 模式               | Edit 模式     |
| --------------------------------------- | ----------------------- | ------------- |
| `back`                                  | ✅ 保留                 | ✅            |
| `title`                                 | ✅ 保留                 | ✅            |
| `badge`                                 | ✅ 保留（不显示 dirty） | ✅ 显示 dirty |
| `text`                                  | ✅ 保留                 | ✅            |
| `divider`                               | ✅ 保留                 | ✅            |
| `spacer`                                | ✅ 保留                 | ✅            |
| `button` with `designer:undo/redo/save` | ❌ 不渲染               | ✅            |
| `button` with `designer:exportDocument` | ✅ 保留                 | ✅            |
| `button` with `designer:fitView`        | ✅ 保留                 | ✅            |
| `button` with `designer:toggleGrid`     | ✅ 保留                 | ✅            |
| `button` with `designer:toggleMinimap`  | ✅ 保留                 | ✅            |
| `button` with `designer:autoLayout`     | ✅ 保留                 | ✅            |
| 其他 `designer:*` mutation action       | ❌ 不渲染               | ✅            |
| `switch` with `designer:*` mutation     | ❌ 不渲染               | ✅            |

View 模式下：

- `config.toolbar.items` 中的 editing items 被自动过滤，保留查看类 items
- `designer-page.toolbar` 自定义 override 若在 View 模式下提供，作者应自行保证内容只含查看类操作；但 renderer 仍对每个 item 的 action 做二次校验，拒绝执行 mutation 命令
- 如果在 View 模式下未提供自定义 toolbar，使用默认 View toolbar

**默认 View Toolbar：**

```typescript
const defaultViewToolbarItems: ToolbarItem[] = [
  { type: 'back' },
  { type: 'title', body: '${doc.name}' },
  { type: 'text', text: '${doc.nodes.length} 节点' },
  { type: 'spacer' },
  { type: 'button', action: 'designer:fitView', icon: 'maximize' },
  { type: 'button', action: 'designer:exportDocument', icon: 'download' },
];
```

**默认 Edit Toolbar**（保持不变，包含 undo/redo/save/dirty badge 等）：

```typescript
const defaultEditToolbarItems: ToolbarItem[] = [
  { type: 'back' },
  { type: 'title', body: '${doc.name}' },
  { type: 'text', text: '${doc.nodes.length} 节点' },
  {
    type: 'badge',
    level: '${runtime.dirty ? "warning" : "success"}',
    text: '${runtime.dirty ? "未保存" : "已保存"}',
  },
  { type: 'divider' },
  { type: 'button', action: 'designer:undo', icon: 'rotate-ccw', disabled: '${!runtime.canUndo}' },
  { type: 'button', action: 'designer:redo', icon: 'rotate-cw', disabled: '${!runtime.canRedo}' },
  { type: 'spacer' },
  { type: 'button', action: 'designer:fitView', icon: 'maximize' },
  { type: 'button', action: 'designer:exportDocument', icon: 'download' },
];
```

#### 3.2.3 Palette / 侧面板变换规则

| 侧面板                                | View 模式                                            | Edit 模式                      |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| Flow Designer Palette                 | ❌ 整体隐藏                                          | ✅ 从 config 渲染              |
| Report Designer 字段面板              | ❌ 整体隐藏                                          | ✅ 从 config.fieldSources 渲染 |
| Report Designer Inspector（属性编辑） | ❌ 隐藏，除非 config 单独提供只读版 `inspector.body` | ✅                             |
| Flow Designer Inspector（只读查看）   | ✅ 渲染只读版本                                      | ✅                             |
| Word Editor 字段面板                  | ❌ 整体隐藏                                          | ✅                             |
| Word Editor 大纲面板                  | ✅ 保留（导航用）                                    | ✅                             |

View 模式的 Inspector 规则：

- View 模式下的 inspector 只渲染 `body` 部分的**只读展示**（text、badge、table 等展示组件）
- 不渲染 form 控件（input、select、code-editor 等编辑组件）
- **降级策略**：推荐 View 模式下由 config 单独提供 `inspector.body` 的只读版本。若未提供只读版本而 inspector 包含编辑控件，renderer 应整体隐藏该面板（而非试图自动降级为展示组件——自动降级在 SchemaRenderer 框架层面尚不存在，且其组件类型映射是 renderer 私有的，不宜在框架层引入全局 readonly 组件映射表）
- 如果编辑器组件本身已支持 `readOnly` 模式（如 `code-editor`），renderer 可以在只读状态下渲染该组件，但不自动替换组件类型

#### 3.2.4 Host Scope 投影

View 模式下 host scope 的 `runtime` 摘要字段变化：

| 字段               | View 模式               | Edit 模式       |
| ------------------ | ----------------------- | --------------- |
| `runtime.dirty`    | 始终 `false`            | 正常追踪        |
| `runtime.canUndo`  | 始终 `false`            | 正常追踪        |
| `runtime.canRedo`  | 始终 `false`            | 正常追踪        |
| `runtime.readonly` | `true`                  | `false`（缺省） |
| `doc`              | ✅ 文档快照（只读引用） | ✅ 文档快照     |
| `selection`        | ✅ 选中摘要             | ✅ 选中摘要     |

### 3.3 默认 Toolbar 的选择逻辑

设计器页面渲染器根据 `readOnly` 自动选择默认 toolbar：

```typescript
function resolveDefaultToolbar(readOnly: boolean): ToolbarItem[] {
  return readOnly ? defaultViewToolbarItems : defaultEditToolbarItems;
}
```

规则：

- 如果页面 schema 未提供 `toolbar` override，使用 `resolveDefaultToolbar(readOnly)`
- 如果页面 schema 提供了 `toolbar` override，优先使用自定义 toolbar（作者负责保证内容适配）
- `config.toolbar.items` 在 View 模式下，renderer 过滤掉 mutation action items

### 3.3.1 `readOnly` 与 `disabled` 的关系

设计器页面 schema 同时继承自 `BaseSchema` 的 `disabled?: boolean | string` 字段。两者的区别：

| 维度       | `readOnly`               | `disabled`                 |
| ---------- | ------------------------ | -------------------------- |
| 文档可见性 | 完全可读                 | 完全可读                   |
| 选择/导航  | ✅ 允许                  | ❌ 禁止                    |
| Mutation   | ❌ 禁止                  | ❌ 禁止                    |
| 视觉反馈   | 正常显示，无灰化         | 灰化，不可交互             |
| 适用场景   | 只读查看器（如报表展示） | 条件性禁用（如表单未就绪） |

规则：

- `readOnly` 和 `disabled` 可独立设置。如果同时设为 `true`，`disabled` 优先——所有交互（包括选择/导航）被禁止
- `disabled` 主要用于条件表达式（如 `${formStatus === 'pending'}`），`readOnly` 主要用于页面级别的查看/编辑切换
- 两者不互斥，也不暗示对方

### 3.4 现有 `features` 配置的关系

`DesignerFeatures` 保持不变，与 `readOnly` 的关系需要将 features 分为两类：

**View-Safe Features**（View 模式下仍按 features 配置生效）：

| Feature       | 说明     | 与 readOnly 的关系                                    |
| ------------- | -------- | ----------------------------------------------------- |
| `grid`        | 网格背景 | 按 features.grid 决定                                 |
| `minimap`     | 小地图   | 按 features.minimap 决定                              |
| `fitView`     | 适配视口 | 按 features.fitView 决定                              |
| `export`      | 数据导出 | 按 features.export 决定                               |
| `multiSelect` | 多选     | 按 features.multiSelect 决定（选择不产生 mutation）   |
| `autoLayout`  | 自动布局 | 按 features.autoLayout 决定（见 §3.1.2 只读布局路径） |

**Mutation-Related Features**（View 模式下强制关闭）：

| Feature           | 说明                | 与 readOnly 的关系                   |
| ----------------- | ------------------- | ------------------------------------ |
| `undo`            | 撤销                | `readOnly: true` 时强制 false        |
| `redo`            | 重做                | `readOnly: true` 时强制 false        |
| `history`         | 历史记录            | `readOnly: true` 时强制 false        |
| `shortcuts`       | 键盘快捷键          | `readOnly: true` 时仅保留方向键/缩放 |
| `floatingToolbar` | 浮动工具栏          | `readOnly: true` 时强制 false        |
| `clipboard`       | 剪贴板（cut/paste） | `readOnly: true` 时强制 false        |

运行时判定逻辑：

```typescript
function isFeatureEnabled(
  feature: string,
  readOnly: boolean,
  configFeatures: DesignerFeatures,
): boolean {
  // View-Safe features 不被 readOnly 覆盖
  if (VIEW_SAFE_FEATURES.has(feature)) {
    return configFeatures[feature] !== false; // 缺省 true
  }
  // Mutation-related features 被 readOnly 覆盖
  if (readOnly) return false;
  return configFeatures[feature] !== false;
}

const VIEW_SAFE_FEATURES = new Set([
  'grid',
  'minimap',
  'fitView',
  'export',
  'multiSelect',
  'autoLayout',
]);
```

优先级规则：

```
runtime feature enabled = schema.readOnly
  ? (feature ∈ VIEW_SAFE_FEATURES ? config.features[feature] : false)
  : config.features[feature]
```

`readOnly` 属于页面 schema 顶层字段，不在 `DesignerFeatures` 中。

流程：

```
schema.readOnly → Core readonly 初始化 → Renderer 层读取
                                                ↓
                  config.features 解析 → 分类特征 → 合并：readOnly 覆盖 mutation features
                                                ↓
                                          UI 渲染决策
```

---

## 4. 各设计器的 View/Edit 分离谱系

### 4.1 Spreadsheet Page

| 维度             | View 模式                                                      | Edit 模式                                    |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------- |
| Schema 字段      | `readOnly?: boolean`（已有）                                   | 缺省 `false`                                 |
| Core 层          | `createSpreadsheetCore({ readonly: true })`                    | `createSpreadsheetCore({ readonly: false })` |
| 工具栏           | 只读 View Toolbar                                              | 完整 Edit Toolbar                            |
| 单元格           | 可选中、可滚屏、可复制                                         | 可编辑、可拖拽填充、可样式化                 |
| 行/列操作        | 可调整宽高（视觉布局）                                         | 可增删行列、可隐藏                           |
| 状态             | `dirty = false`                                                | 正常 dirty 追踪                              |
| **当前实现状态** | ✅ 已实现（core command firewall + renderer 层 readOnly 消费） | ✅                                           |

### 4.2 Flow Designer

| 维度             | View 模式                                | Edit 模式                                 |
| ---------------- | ---------------------------------------- | ----------------------------------------- |
| Schema 字段      | `readOnly?: boolean`（**新增**）         | 缺省 `false`                              |
| Core 层          | `createDesignerCore({ readonly: true })` | `createDesignerCore({ readonly: false })` |
| Palette          | 隐藏                                     | 显示                                      |
| Canvas           | 选中、缩放、平移、fitView                | 拖拽、连线、编辑、创建                    |
| Inspector        | 只读查看（text/badge）                   | 表单编辑                                  |
| Toolbar          | View Toolbar                             | Edit Toolbar                              |
| 快捷键           | 仅方向键平移                             | 全量编辑快捷键                            |
| **当前实现状态** | ❌ 未实现                                | ✅                                        |

### 4.3 Report Designer

| 维度             | View 模式                                   | Edit 模式    |
| ---------------- | ------------------------------------------- | ------------ |
| Schema 字段      | `readOnly?: boolean`（**新增**）            | 缺省 `false` |
| Spreadsheet Core | `createSpreadsheetCore({ readonly: true })` | 正常编辑模式 |
| 字段面板         | 隐藏                                        | 显示         |
| Inspector        | 只读查看（无 form 控件）                    | 表单编辑     |
| 字段拖拽         | 禁用                                        | 启用         |
| Preview          | 可用                                        | 可用         |
| **当前实现状态** | ❌ 未实现                                   | 🟡 部分实现  |

### 4.4 Word Editor

| 维度             | View 模式                        | Edit 模式    |
| ---------------- | -------------------------------- | ------------ |
| Schema 字段      | `readOnly?: boolean`（**新增**） | 缺省 `false` |
| 文档渲染         | 完全可读                         | 可编辑       |
| 字段面板         | 隐藏                             | 显示         |
| 大纲面板         | 显示（导航用）                   | 显示         |
| **当前实现状态** | ❌ 未实现                        | 🟡 部分实现  |

---

## 5. 迁移路径

### Phase 0 — Spreadsheet Core 修复

在展开其他设计器之前，先修复现有 spreadsheet-core 与本文档原则的矛盾：

1. 从 `READ_ONLY_COMMANDS` 白名单中移除 `spreadsheet:undo` 和 `spreadsheet:redo`
2. 确认移除后不破坏现有 readonly 模式测试
3. 更新 `READ_ONLY_COMMANDS` 的文档注释标明这是一份"view-safe commands"白名单

**依赖**：后续所有 Phase 的参考模式以此修复后的行为为准。

### Phase 1 — Spreadsheet Core 文档固化

- `spreadsheet-core` 的 `readonly` 模式已实现并测试覆盖（含 Phase 0 修复）
- `spreadsheet-page` schema 已有 `readOnly`
- 文档固化当前行为作为参考模式

### Phase 2 — Flow Designer（新增 readOnly 支持）

1. **架构适配**：由于 Flow Designer Core 使用直接方法而非中央命令调度：
   - 采用选项 A（方法级守卫），在每个 mutation 方法入口添加 `readonly` 检查
   - `DesignerSnapshot` 增加 `readonly: boolean`
   - `autoLayout` 的 View 模式路径：执行布局算法但不 push 历史、不设 dirty
2. `DesignerPageSchemaInput` 增加 `readOnly` 字段
3. Renderer 层根据 `readOnly`:
   - 选择默认 toolbar
   - 隐藏 palette
   - inspector 降级为只读渲染（使用独立只读 schema，非自动降级）
   - 快捷键：仅保留方向键平移、Ctrl+滚轮缩放
4. 测试覆盖：view 模式的 method rejection、toolbar filter、panel visibility、shortcut isolation

### Phase 3 — Report Designer（新增 readOnly 支持）

1. `ReportDesignerCore` 工厂函数增加 `readonly` 参数
2. 透传 `readonly` 到 `SpreadsheetCore`（依赖 Phase 0）
3. `ReportDesignerPageSchemaInput` 增加 `readOnly` 字段
4. Renderer 层根据 `readOnly`:
   - 选择默认 toolbar
   - 隐藏字段面板
   - inspector 降级为只读渲染（使用独立只读 schema）
   - 字段拖拽不可用
5. 测试覆盖

### Phase 4 — Word Editor（新增 readOnly 支持）

1. 如果 Word Editor Core 尚不存在，Phase 4 先创建 Core 基础设施，再增加 `readonly` 参数
2. `WordEditorPageSchemaInput` 增加 `readOnly` 字段
3. Renderer 层根据 `readOnly` 调整 UI
4. 测试覆盖

---

## 6. Owner 文档更新

本文档生效后，以下 owner 文档需要同步更新（每处新增字段需加注"view-mode safe"标记）：

| 文档                                                 | 变更                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/architecture/flow-designer/design.md`          | `DesignerPageSchema` 增加 `readOnly` 字段                                                          |
| `docs/architecture/flow-designer/config-schema.md`   | `DesignerPageSchema` 增加 `readOnly` 字段                                                          |
| `docs/architecture/flow-designer/api.md`             | `CreateDesignerCoreOptions` 增加 `readonly`                                                        |
| `docs/architecture/report-designer/design.md`        | `ReportDesignerPageSchema` 增加 `readOnly` 字段                                                    |
| `docs/architecture/report-designer/config-schema.md` | `ReportDesignerPageSchema` 增加 `readOnly` 字段；`CreateReportDesignerCoreOptions` 增加 `readonly` |
| —                                                    | 固化已有 `readOnly` 行为（参见 spreadsheet 模块 types）                                            |
| `docs/architecture/word-editor/design.md`            | `WordEditorPageSchema` 增加 `readOnly` 字段                                                        |
| `docs/architecture/designer-workbench-shell.md`      | 补充 View/Edit 模式的侧面板可见性规则                                                              |
| —                                                    | `SpreadsheetRuntimeSnapshot.readonly` 文档化（参见 spreadsheet-core types）                        |
| —                                                    | `NormalizedDesignerConfig` 增加设计时约束（参见 flow-designer-core types）                         |
| —                                                    | `ReportDesignerCoreOptions` 增加 `readonly`（参见 report-designer-core types）                     |

---

## 7. 审核清单

PR 合并前，以下条件必须全部满足：

- [ ] 每个设计器 core 的 `READ_ONLY_COMMANDS` 白名单已定义并通过测试
- [ ] 每个设计器 page schema 的 `readOnly` 字段已添加
- [ ] View 模式下 toolbar 不包含 mutation action
- [ ] View 模式下 palette/字段面板隐藏
- [ ] View 模式下 inspector 不渲染 form 控件
- [ ] View 模式下 dirty 始终为 false
- [ ] View 模式下 `canUndo`/`canRedo` 始终为 false
- [ ] `readOnly: false`（缺省）行为与现有 Edit 模式完全一致，零回归
- [ ] 测试覆盖：view 模式的 command rejection、toolbar filter、panel visibility、shortcut isolation
