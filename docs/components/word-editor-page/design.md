# Word Editor Page 组件设计

## 1. 组件定位

- `word-editor-page` 是 Word 模板设计器宿主根 renderer。
- 它把 canvas-editor bridge、editor store、dataset store、工具栏、数据集面板、大纲面板和对话框组织为同一工作台。
- 本文档只拥有 `word-editor-page` 单 renderer 契约；Word Editor family 的平台架构由 `docs/architecture/word-editor/` 文档族负责。
- 左右工作台遵循 `docs/architecture/designer-workbench-shell.md` 的共享基线；本 renderer doc 只记录当前页面字段与 region surface，不拥有 side-panel existence 的 family-level 规则。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 没有 Word 编辑器对应组件。
- 本组件基于 `@hufe921/canvas-editor` 提供类 Word 编辑体验。
- 如果问题涉及 word-editor family 分层、canvas-editor bridge 或模板表达式语法，应先回到 `docs/architecture/word-editor/design.md`。

## 3. Flux 中的 renderer/type 定义

- `type: 'word-editor-page'`
- `sourcePackage: '@nop-chaos/word-editor-renderers'`
- `rendererClass: 'domain-host-renderer'`
- `rendererTraits`: `workbench-shell`, `builder-facing`
- 当前 regions: `toolbar`、`leftPanel`、`rightPanel`
- 当前 fields: `title` 为 `value-or-region`；`onBack`、`onSave` 为 `event`；`config`、`statusPath`、`initialDocument`、`datasets`、`initialCharts`、`initialCodes` 为 `prop`

## 4. schema 设计

```typescript
interface WordEditorPageSchema {
  type: 'word-editor-page';
  config?: WordEditorConfig;
  statusPath?: string;

  // 回退动作
  onBack?: ActionSchema;

  // 初始文档 (可选)
  initialDocument?: WordDocument;

  // 预配置数据集 (可选)
  datasets?: Dataset[];

  // 预置占位符
  initialCharts?: DocChart[];
  initialCodes?: DocCode[];

  // 保存回调
  onSave?: ActionSchema;
}

interface WordEditorConfig {
  leftPanel?: { generator?: 'default' };
  rightPanel?: { generator?: 'default' };
}
```

核心字段：

- `onBack` 是可选回调；提供时用于返回上级页面，renderer 会向事件处理器透传原始 click event
- `config` 是左右工作台是否存在的 canonical surface；当前最小支持面是 `leftPanel` / `rightPanel` 两个可选定义
- `initialDocument` 和 `datasets` 是可选初始数据
- `Dataset` 是当前公开契约词汇；`DataSet` 不再属于支持中的 public surface
- `initialCharts` / `initialCodes` 允许宿主直接注入初始占位符元数据
- `onSave` 是可选持久化回调
- `statusPath` 用于向宿主外部发布窄只读摘要 DTO
- `onSave` 在显式保存时接收完整 `SavedDocumentData` envelope，供宿主按同一已保存快照做持久化或校验
- builder-facing formal metadata 也必须与这条 live baseline 一致：`onBack` 发布 event-like payload，`onSave` 发布完整 `SavedDocumentData` envelope，`config` 不再退回 opaque object
- `statusPath.busy` 表示显式保存是否进行中，而不只是静态 shell 摘要
- 模板标签插入保留 core 发布的真实 `kind`；`c:out` 属于受支持的 `tag-selfclose` 插入面，而不是被降级成 open-tag 的伪契约
- 图表/条码插入只接受能通过 `validateDocChart` / `validateDocCode` 的完整 payload
- `word-editor:insertChart` / `word-editor:insertCode` 的公开 contract 同时包含 manifest-enforced args shape 和成功结果 `chartId` / `codeId`
- watermark 不属于当前受支持的 authoring surface，因为页面没有与 persisted truth surface 对齐的 watermark round-trip 契约

## 5. 字段分类

| 字段              | 分类              | 说明                   |
| ----------------- | ----------------- | ---------------------- |
| `title`           | `value-or-region` | 页面标题               |
| `onBack`          | `event`           | 返回动作               |
| `onSave`          | `event`           | 保存动作               |
| `statusPath`      | `value`           | 外部只读状态摘要路径   |
| `config`          | `value`           | 侧栏存在性配置         |
| `initialDocument` | `value`           | 初始文档数据           |
| `datasets`        | `value`           | 预配置数据集           |
| `initialCharts`   | `value`           | 初始图表占位符         |
| `initialCodes`    | `value`           | 初始条码/二维码占位符  |
| `toolbar`         | `region`          | 顶部 Ribbon 工具栏     |
| `leftPanel`       | `region`          | 左侧面板 (数据集/字段) |
| `rightPanel`      | `region`          | 右侧大纲面板           |

## 6. regions 与 slot 约定

- `toolbar` 承接顶部 Ribbon 风格动作区，包含格式化、插入、视图等功能组。
- `leftPanel` 承接左侧 override surface；当前默认生成器可提供数据集管理 (`datasets` tab) 和字段列表 (`fields` tab) 等内容。
- `rightPanel` 承接右侧 override surface；当前默认生成器提供 outline 内容。
- renderer definition 当前将 host capability publication 约束到 `toolbar`、`leftPanel`、`rightPanel` 三个 region。
- 是否显示左/右工作台由 `config.leftPanel` / `config.rightPanel` 决定；对应 side 未定义时应整体隐藏。
- 当前 `generator: 'default'` 会启用内置默认生成器；region override 只在对应 side 已由 config 启用后才挂载。

## 7. 运行期状态归属

| 状态                   | 归属                 | 说明                    |
| ---------------------- | -------------------- | ----------------------- |
| 编辑器模式/选区/脏标记 | `editor-store`       | 通过 Zustand store 管理 |
| 数据集/字段定义        | `dataset-store`      | 独立 Zustand store      |
| canvas-editor 实例     | `CanvasEditorBridge` | 桥接层封装              |

- schema 片段通过宿主 scope 读取快照，并通过命名空间动作写操作。
- `word-editor-page` 属于 `Domain Host Owner`：内部读面是 host projection，宿主外部若需要观测状态，应通过窄 `statusPath` 摘要。
- 页边距对话框以 `editor-store.paperSettings` 为 owner truth：打开时从当前 paper settings hydrate，确认时同时回写 store 与 canvas bridge 的 `executeSetPaperMargin(...)` 路径。
- hyperlink 与 page margins dialog 输入当前都要求稳定程序化标签：不得仅依赖 placeholder 或相邻视觉文本。当前 live baseline 至少固定了 hyperlink display/url 与四个 margin 输入的 accessible name。

### 7.1 Host Projection Contract

host scope 向下投影四个只读字段：

| 字段        | 来源                                                           | 时效性                                                                           | 说明                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`  | `savedDocument.data`（autosave 回调写入），null 时回退到空骨架 | **滞后** — 由 `EditorCanvas` 内部 500ms 防抖 autosave 回调驱动，不是实时编辑内容 | consumer 不应假定 `document` 反映当前屏幕上的实时编辑状态；若需实时脏标记，应读 `runtime.dirty`                                                                      |
| `datasets`  | `dataset-store`                                                | 实时                                                                             | 响应 dataset-store mutation                                                                                                                                          |
| `runtime`   | `editor-store` + `dataset-store` 计数 + React state 计数       | 实时                                                                             | 聚合字段：`ready`/`dirty`/`wordCount`/`canUndo`/`canRedo`/`currentPage`/`totalPages`/`scale` 来自 editor-store；`datasetCount`/`chartCount`/`codeCount` 来自独立订阅 |
| `selection` | `editor-store`                                                 | 实时                                                                             | 当前选区格式化快照                                                                                                                                                   |

关键约束：

- `document` 与 `runtime`/`selection` 存在时效差异：`runtime.dirty=true` 时 `document` 可能仍为上一次 autosave 时的内容。
- `runtime` 中 `datasetCount`/`chartCount`/`codeCount` 不从 editor-store selector 内读取，而是由独立订阅聚合，避免跨 store 热路径污染。
- 若存在 recovered persisted state，则 `document` 应先发布 recovered persisted snapshot，而不是继续停留在 schema `initialDocument`。
- `datasets` 的 schema 输入只作为首次 seed；一旦存在 recovered persisted datasets，remount 后 host projection 继续发布 persisted datasets，而不是被 schema `datasets` 重置。
- `statusPath.busy` 必须在显式保存进行中发布 `true`，保存完成或失败后再回落到 `false`。
- datasets recovery baseline 只应在显式保存成功后提交；失败或 abort 的 save 不得提前写入 partial-commit datasets。
- persisted `document.data.charts` / `document.data.codes` 从当前 canvas 文档里的 `nop:chart` / `nop:code` 标签重建；`initialCharts` / `initialCodes` 与运行期 chart/code 计数不再作为保存时的第二事实源。
- 保存使用 `editor-store.paperSettings` 作为纸张设置 owner truth；页面设置 UI 与 save snapshot 不再分别信任不同事实源。

## 8. 事件、动作与组件句柄能力

| 动作       | 命名空间                                | 说明                                                                                                          |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 保存文档   | `word-editor:save`                      | 序列化并持久化当前文档；成功路径向 `onSave` 交付完整 `SavedDocumentData` envelope                             |
| 插入字段   | `word-editor:insertField`               | 在光标位置插入数据字段                                                                                        |
| 插入图表   | `word-editor:insertChart`               | 仅在 payload 满足 manifest/core validator 契约时插入 `nop:chart` 自闭合模板占位符；成功结果返回 `{ chartId }` |
| 插入代码块 | `word-editor:insertCode`                | 仅在 payload 满足 manifest/core validator 契约时插入 `nop:code` 自闭合模板占位符；成功结果返回 `{ codeId }`   |
| 撤销/重做  | `word-editor:undo` / `word-editor:redo` | 历史操作                                                                                                      |

- 页面自身不应暴露大而全的 imperative ref。

## 9. 数据源、表达式、导入能力接入点

- 数据集通过 `dataset-store` 管理，支持 `static`、`api`、`graphql` 三种源类型。
- 模板表达式使用 NOP XLang 语法：`${expr}` 文本表达式、`<c:for>`/`<c:if>` 结构标签。
- `c:out` 作为 `tag-selfclose` 模板标签属于当前受支持插入面，dialog、toolbar、snippet 三条路径都必须发出同一 canonical expression kind。
- 字段拖拽插入自动生成对应的表达式占位符。
- 图表/条码占位符通过 `nop:chart` / `nop:code` 自闭合标签写入文档；保存/自动保存时从这些 live tags 重建 persisted `charts` / `codes` registry。
- 不存在受支持的 watermark authoring surface；页面不会宣称能持久化或恢复 watermark-only authoring state。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-word-editor-page` marker。
- 工作台布局使用 `WorkbenchShell` 组件，支持左右面板折叠。
- 工具栏使用 Ribbon 风格分组布局。
- playground 入口现在通过 `SchemaRenderer` + `registerWordEditorRenderers()` 渲染，而不是直接 lazy import 页面组件。

当前 runtime 状态说明：

- `word-editor-page` 已是 live registered renderer，应视为 `runtime` family，而不是目标契约占位文档。

## 11. 实现拆分建议

| 模块                 | 位置      | 职责                          |
| -------------------- | --------- | ----------------------------- |
| `WordEditorPage.tsx` | renderers | 主页面编排                    |
| `EditorCanvas.tsx`   | renderers | canvas-editor React 封装      |
| `toolbar/`           | renderers | Ribbon 工具栏组件             |
| `panels/`            | renderers | 左侧数据集/字段与右侧大纲面板 |
| `dialogs/`           | renderers | 数据集配置、图表配置等对话框  |
| `hooks/`             | renderers | 快捷键、store 订阅等 hooks    |

## 12. 风险、取舍与后续阶段

- 最主要风险是 canvas-editor 与 NOP 模板语义的映射复杂度。
- 模板表达式与 canvas-editor 元素模型的同步需要持续维护。
- 后续阶段：预览功能、与后端 WordTemplate 的 round-trip 集成。

## 13. 相关文档

- `docs/architecture/word-editor/design.md` - Word Editor 架构总览
- `docs/archive/plans/24-word-editor-development-plan.md` - 历史开发计划 (已 superseded)
- `docs/bugs/24-*`, `docs/bugs/25-*`, `docs/bugs/26-*` - 相关 bug 修复记录
