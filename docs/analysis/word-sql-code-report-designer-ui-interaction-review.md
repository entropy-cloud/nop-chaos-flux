# Word / SQL / Code / Report Designer 交互评审

## 范围

- 评审基线：`docs/references/ui-interaction-review-checklist.md`
- 评审方式：基于当前代码和 playground 实现走查，不讨论视觉风格，只关注结构布局、状态可见性、主路径效率、反馈、数据安全、键盘/跨端等价。
- `word editor` 评审对象：`packages/word-editor-renderers/src/WordEditorPage.tsx`
- `sql editor` / `code editor` 评审对象：`packages/flux-code-editor/src/code-editor-renderer.tsx` 和 `apps/playground/src/pages/CodeEditorPage.tsx`
- `report designer` 评审对象：当前可见 demo `apps/playground/src/pages/ReportDesignerDemo.tsx`。它没有走 `report-designer-page` 的 region shell，而是直接拼装 spreadsheet 组件，所以本次结论以 demo 当前真实交互为准。

## 总结

| 模块 | 结论 |
| --- | --- |
| Word Editor | 有 1 个 `P0`、2 个 `P1`、2 个 `P2`；字段插入主路径当前被阻断。 |
| SQL Editor | 有 1 个 `P1`、1 个 `P2`；主路径可用，但异步反馈和大规模变量浏览仍不稳。 |
| Code Editor | 有 1 个 `P1`、1 个 `P2`；基础可用，fullscreen 和工作区利用率需要补强。 |
| Report Designer | 有 2 个 `P0`、4 个 `P1`；当前更像 spreadsheet demo，不适合作为可交付的 report designer 交互基线。 |

## Word Editor

### P0 - Fields 面板主路径被阻断

- 场景：用户先在左侧数据集列表选择数据集，再切到 `Fields` 面板插入字段表达式。
- 违反原则：`4.2 上下文连续`、`4.4 高频直达`、`6.3 操作组织与冲突隔离`。
- 当前行为：数据集卡片点击只会打开编辑弹窗，不会写入 `selectedDatasetId`；`FieldList` 却完全依赖 `selectedDatasetId` 决定显示哪个数据集的字段，因此 `Fields` 面板会长期停留在 “No dataset selected”。
- 期望常规：单击卡片应先选中数据集；编辑、删除等次级动作应放到局部菜单里，不应占用主点击语义。
- 影响：字段插入是 word template 设计器的高频主路径，但当前路径默认不可达，属于主任务阻断。
- 严重级别：`P0`
- 证据：`packages/word-editor-renderers/src/panels/DatasetPanel.tsx:20-25`、`packages/word-editor-renderers/src/panels/DatasetPanel.tsx:88-91`、`packages/word-editor-renderers/src/panels/FieldList.tsx:12-20`、`packages/word-editor-core/src/dataset-store.ts:136-138`
- 局部修复建议：把“选中数据集”和“编辑数据集”拆成两个动作；卡片主点击执行 `store.select(dataset.id)`，更多菜单再承载编辑/删除；新增或保存后应自动选中新数据集。
- 是否需要沉淀为共享组件或规范：需要，属于典型的“列表选中 + 次级菜单”交互基线。

### P1 - 三栏布局固定宽度，主画布不能让辅助区让位

- 场景：笔记本宽度、浏览器 `125%` 到 `150%` 缩放、或未来增加更多面板内容时编辑正文。
- 违反原则：`4.1 主任务优先，辅助区让位`、`6.1 结构与布局`、`6.5 跨端与可访问性`。
- 当前行为：左右两侧面板都是固定 `280px`，没有折叠、拖拽调宽、恢复默认值入口。
- 期望常规：正文画布应始终优先拿到最大稳定空间；左右辅助区至少要可收起、可调宽、可 reset。
- 影响：当前页是典型的工作台/编辑器布局，固定双侧栏会直接挤压主编辑区，属于明显违背常规的布局问题。
- 严重级别：`P1`
- 证据：`packages/word-editor-renderers/src/WordEditorPage.tsx:154-198`
- 局部修复建议：抽成共享 `WorkbenchShell` / `SplitPanel`，提供左右面板最小宽度、折叠、拖拽和 reset。
- 是否需要沉淀为共享组件或规范：需要，这类问题也在 report designer 中重复出现。

### P1 - 数据集编辑结果会静默丢失

- 场景：用户配置完 dataset 后刷新页面、返回首页、关闭标签，或稍后再回来继续编辑。
- 违反原则：`4.7 数据安全边界清晰，修改应可恢复`、`6.4 反馈与数据安全`。
- 当前行为：文档内容会自动保存到 `localStorage`，但数据集 store 只存在内存里；`saveDatasets` / `loadDatasets` 已经存在，却没有被 `WordEditorPage` 接线。
- 期望常规：文档和数据集都要进入同一套持久化/脏状态/离开保护边界，不能只保存正文不保存模板数据源。
- 影响：用户会误以为点击过 Save 或等待过 autosave 就已经保存完成，但 dataset 修改会在刷新后消失。
- 严重级别：`P1`
- 证据：`packages/word-editor-renderers/src/WordEditorPage.tsx:27-33`、`packages/word-editor-renderers/src/WordEditorPage.tsx:74-93`、`packages/word-editor-renderers/src/EditorCanvas.tsx:25-45`、`packages/word-editor-core/src/document-io.ts:58-66`
- 局部修复建议：把 dataset 持久化接进现有保存链路；把 document 和 datasets 的 dirty scope 显式展示；离开页时对未持久化修改做保护。
- 是否需要沉淀为共享组件或规范：需要，属于“高成本编辑页的脏状态和离开保护”共性能力。

### P2 - 保存态和字数反馈不连续

- 场景：用户边输入边观察页头的保存状态和字数统计。
- 违反原则：`4.2 上下文连续，状态不要靠记忆`、`4.6 反馈及时，结果可感知`。
- 当前行为：字数只在挂载时读取一次；文档又会在 `500ms` 后自动保存并把 `isDirty` 清掉，页头只有按钮样式变化，没有清楚区分“自动保存成功”“手动保存成功”“还有哪些部分未保存”。
- 期望常规：字数应随编辑更新；保存态应明确展示最后保存时间和未保存范围，至少区分 document 与 dataset。
- 影响：用户很难信任顶部状态，尤其在 dataset 实际不会保存的前提下，反馈会更误导。
- 严重级别：`P2`
- 证据：`packages/word-editor-renderers/src/WordEditorPage.tsx:41-46`、`packages/word-editor-renderers/src/WordEditorPage.tsx:140-149`、`packages/word-editor-renderers/src/EditorCanvas.tsx:25-45`、`packages/word-editor-renderers/src/EditorCanvas.tsx:110-113`
- 局部修复建议：内容变化时同步更新字数；页头增加 autosave/manual save 状态和时间戳；把保存范围拆开显示。
- 是否需要沉淀为共享组件或规范：建议沉淀为共享状态栏模式。

### P2 - 有误导性控件和伪反馈

- 场景：用户点击数据集卡片右上角菜单，或使用搜索替换观察结果数。
- 违反原则：`4.5 一个动作只表达一个含义`、`4.6 反馈及时，结果可感知`。
- 当前行为：数据集右上角 `MoreVertical` 按钮可见但没有任何菜单；搜索替换结果数写死为“有输入就显示 1”。
- 期望常规：控件要么可用，要么不要出现；计数反馈应来自真实搜索结果，而不是占位值。
- 影响：这类伪反馈会快速消耗用户对工具栏和面板状态的信任。
- 严重级别：`P2`
- 证据：`packages/word-editor-renderers/src/panels/DatasetPanel.tsx:27-29`、`packages/word-editor-renderers/src/panels/DatasetPanel.tsx:119-126`、`packages/word-editor-renderers/src/toolbar/SearchReplace.tsx:17`、`packages/word-editor-renderers/src/toolbar/SearchReplace.tsx:74-76`
- 局部修复建议：未做好的更多菜单先移除；搜索结果数改成真实命中数，或明确隐藏计数直到接上真实数据。
- 是否需要沉淀为共享组件或规范：建议纳入 PR 自查项，避免“占位控件”进入工作台页面。

## SQL Editor

### P1 - 执行链路缺少忙碌态防重和取消语义

- 场景：用户连续点击 `Run` 执行 SQL，或在长耗时执行期间希望知道系统是否还在处理。
- 违反原则：`4.6 反馈及时，结果可感知`、`6.4 反馈与数据安全`。
- 当前行为：点击 `Run` 后只会把结果区切到 `loading`，但工具栏按钮仍然可点；loading 面板也没有 `Stop` / `Cancel` / `Close` 控件。
- 期望常规：执行中按钮应进入 disabled/busy 态；如果后端允许中断，应把主动作切换为 `Stop`；至少要阻止重复提交。
- 影响：容易重复发请求，也容易让用户误判系统没有收到操作。
- 严重级别：`P1`
- 证据：`packages/flux-code-editor/src/code-editor-renderer.tsx:204-264`、`packages/flux-code-editor/src/code-editor-renderer.tsx:325-334`、`packages/flux-code-editor/src/sql-result-panel.tsx:18-24`
- 局部修复建议：增加 `isExecuting` 状态；执行中禁用 `Run` 或切换成 `Stop`；把当前执行状态同步到工具栏而不是只放在底部面板。
- 是否需要沉淀为共享组件或规范：需要，属于异步编辑器/工作台的通用交互约束。

### P2 - 变量面板只适合小规模 schema

- 场景：SQL 编辑器接入真实数据源，变量和嵌套对象明显增多时浏览和插入变量。
- 违反原则：`4.4 高频直达，复杂度渐进展开`、`6.3 操作组织与冲突隔离`。
- 当前行为：变量树会递归全部展开，只有整个面板的收起，没有搜索、分组展开、局部折叠或最近使用区。
- 期望常规：大规模变量面板至少要支持搜索、局部折叠和记忆展开状态。
- 影响：真实场景下变量面板会迅速从“辅助工具”变成“噪音来源”，反过来挤压主编辑区。
- 严重级别：`P2`
- 证据：`packages/flux-code-editor/src/variable-panel.tsx:54-73`、`packages/flux-code-editor/src/variable-panel.tsx:76-114`
- 局部修复建议：增加过滤输入、节点折叠和最近插入项；把“面板折叠”和“树节点折叠”分成两层。
- 是否需要沉淀为共享组件或规范：建议沉淀为通用变量浏览器交互规范。

## Code Editor

### P1 - Fullscreen 是视觉覆盖层，不是完整编辑壳层

- 场景：用户进入 fullscreen 编辑，再用键盘切换焦点或退出。
- 违反原则：`4.8 多端等价，不做桌面界面的压缩版`、`6.5 跨端与可访问性`。
- 当前行为：fullscreen 通过固定定位容器覆盖全屏，并监听全局 `Escape`；但没有焦点陷阱、背景 inert、返回焦点、模态语义或页面滚动管理。
- 期望常规：fullscreen 编辑应是一个明确的工作模式，至少保证键盘焦点不会逃到被遮挡页面后面。
- 影响：键盘用户容易把焦点切到不可见背景元素，关闭后也没有稳定的焦点回退点。
- 严重级别：`P1`
- 证据：`packages/flux-code-editor/src/code-editor-renderer.tsx:164-171`、`packages/flux-code-editor/src/code-editor-renderer.tsx:281-293`、`apps/playground/src/styles.css:734-855`
- 局部修复建议：把 fullscreen 升级为共享的 editor fullscreen shell，补齐 focus trap、background inert、aria 语义和退出后焦点恢复。
- 是否需要沉淀为共享组件或规范：需要，适用于 code/sql/editor/designer 类页面。

### P2 - Playground 页面没有把代码宽度当作主任务资源

- 场景：在 playground 中对长代码、长 SQL、较宽 JSON 进行阅读或编辑。
- 违反原则：`4.1 主任务优先，辅助区让位`、`6.5 跨端与可访问性`。
- 当前行为：整个页面被放进一个居中的 `max-w-[1100px]` 卡片里，多个编辑器垂直堆叠；对代码型工作区来说，默认宽度偏保守。
- 期望常规：代码 playground 至少应允许更宽的工作区，或按编辑器维度单独扩展，而不是统一塞进展示型 hero card。
- 影响：在笔记本和浏览器缩放场景下，代码换行和可视宽度会先退化，主任务区优先级不够。
- 严重级别：`P2`
- 证据：`apps/playground/src/pages/CodeEditorPage.tsx:270-300`
- 局部修复建议：把代码页改成更接近工作台的宽屏布局，或允许单个编辑器区域独立展开。
- 是否需要沉淀为共享组件或规范：建议纳入 playground/workbench 页面壳层规范。

## Report Designer

### P0 - 画布被固定壳层持续挤压，没有任何自救入口

- 场景：在 report designer 中选单元格、拖字段、观察表格整体布局，尤其是笔记本宽度和浏览器缩放场景。
- 违反原则：`4.1 主任务优先，辅助区让位`、`6.1 结构与布局`、`7 最低发布门槛`。
- 当前行为：外层页面先把整个设计器放进 `max-w-[1100px]` 卡片，内部再固定左侧 `250px` 字段面板和右侧 `280px` inspector；没有折叠、拖宽、reset。
- 期望常规：报表画布必须是优先级最高的区域，辅助面板应能让位。
- 影响：这是典型的设计器 `P0` 问题，尤其对列较多、合并较多的报表会直接影响可用性。
- 严重级别：`P0`
- 证据：`apps/playground/src/pages/ReportDesignerPage.tsx:9-18`、`apps/playground/src/styles.css:172-208`
- 局部修复建议：把 demo 先升级为全宽 workbench；左右面板接入 split panel，提供 collapse / resize / reset。
- 是否需要沉淀为共享组件或规范：必须，和 word editor 共用同一套工作台壳层更合适。

### P0 - 没有保存、脏状态和离开保护，编辑结果只存在内存里

- 场景：用户调格式、绑字段、改 sheet 后刷新页面或返回首页。
- 违反原则：`4.2 上下文连续`、`4.7 数据安全边界清晰，修改应可恢复`、`7 最低发布门槛`。
- 当前行为：文档和 designer state 都是 `useMemo` 时创建的内存对象；页头没有 save/dirty/preview/export，代码里也没有任何持久化或离开保护。
- 期望常规：哪怕只是 demo，也至少要明确标注“临时会话，不保存”；如果作为设计器基线，则必须具备保存和离开保护。
- 影响：高成本编辑会在刷新或离开时静默丢失，属于设计器类产品的发布阻断项。
- 严重级别：`P0`
- 证据：`apps/playground/src/pages/ReportDesignerDemo.tsx:98-107`、`apps/playground/src/pages/ReportDesignerDemo.tsx:220-267`
- 局部修复建议：接入 save/export/preview；显式 dirty badge；刷新、返回、tab 切换时做 leave guard。
- 是否需要沉淀为共享组件或规范：必须，属于所有 designer/workbench 的共性能力。

### P1 - 当前 toolbar 是 spreadsheet toolbar，不是 report designer toolbar

- 场景：用户希望完成报表设计器的一线任务，例如字段绑定、预览、导出、模板设置、元数据编辑。
- 违反原则：`4.3 控件就近，作用对象映射清楚`、`4.4 高频直达，复杂度渐进展开`。
- 当前行为：页头直接挂了 `SpreadsheetToolbar`，主要是剪贴板、单元格格式、合并、插删行列、注释、冻结等 spreadsheet 动作。
- 期望常规：report designer 应在保留底层表格操作的同时，把领域动作放进第一层工具栏。
- 影响：用户会看到很多“表格工具”，却找不到“报表设计器真正想做的事”。
- 严重级别：`P1`
- 证据：`apps/playground/src/pages/ReportDesignerDemo.tsx:223-266`
- 局部修复建议：新建 `ReportDesignerToolbar`，组合共享 spreadsheet 控件和 report-specific 操作，而不是直接复用 spreadsheet toolbar。
- 是否需要沉淀为共享组件或规范：需要，属于 report designer 的领域壳层约束。

### P1 - 字段绑定只有拖拽入口，没有点击或键盘等价路径

- 场景：用户从左侧字段面板把字段放到当前选中单元格。
- 违反原则：`4.8 多端等价，不做桌面界面的压缩版`、`6.5 跨端与可访问性`。
- 当前行为：字段项是 `draggable` 的 `div`，只有拖拽开始回调，没有点击插入、上下文菜单、回车插入到当前选区等替代路径。
- 期望常规：拖拽可以保留，但必须有 click-to-insert / bind-to-selection / keyboard entry 这样的等价入口。
- 影响：键盘用户、触屏场景和不方便精确拖拽的用户都没有可用主路径。
- 严重级别：`P1`
- 证据：`packages/report-designer-renderers/src/report-field-panel.tsx:20-28`
- 局部修复建议：字段项主点击插入当前选区；更多菜单提供“绑定到当前单元格/整列/整块”；补充键盘快捷路径。
- 是否需要沉淀为共享组件或规范：需要，属于 designer 左侧资源面板的通用交互规范。

### P1 - Inspector 只展示摘要，不承担属性编辑职责

- 场景：用户选中单元格后，希望在右侧修改 metadata、绑定规则或样式语义。
- 违反原则：`4.2 上下文连续`、`4.3 控件就近`、`4.4 高频直达`。
- 当前行为：右侧面板只读展示 row/col/value/style/comment/frozen；没有表单、没有保存动作、没有 panel 分组，也没有接线到 `report-designer` inspector shell。
- 期望常规：右侧 inspector 应是设计器的主编辑面板之一，而不是只读说明区。
- 影响：当前对象虽然“可见”，但不可编辑，用户会立刻遇到“看得到却改不了”的断层。
- 严重级别：`P1`
- 证据：`apps/playground/src/pages/ReportDesignerDemo.tsx:331-389`
- 局部修复建议：优先把 demo 切回 `report-designer-renderers` 的 inspector shell；至少把 cell metadata 和 report metadata 的高频属性做成可提交表单。
- 是否需要沉淀为共享组件或规范：需要，属于 report designer 基础壳层。

### P1 - 查找替换和单元格编辑浮层不就近，容易遮挡画布

- 场景：用户打开查找替换，或在公式/单元格编辑器里输入内容。
- 违反原则：`4.3 控件就近，作用对象映射清楚`、`4.5 一个动作只表达一个含义`。
- 当前行为：这两个面板都是绝对定位在左上角的浮层，不锚定 toolbar，也不锚定当前单元格。
- 期望常规：查找替换应停靠在 toolbar 或右上角；单元格编辑应与公式栏/当前单元格形成清晰映射。
- 影响：浮层会压住画布顶部区域，用户要在 A 区看内容、B 区找控制、再回到 A 区确认结果。
- 严重级别：`P1`
- 证据：`packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:204-258`、`apps/playground/src/styles.css:445-513`
- 局部修复建议：把查找替换做成 toolbar 下拉区；把单元格编辑器做成固定公式栏或贴近选区的 popover。
- 是否需要沉淀为共享组件或规范：建议纳入 spreadsheet/designer 的共享壳层规范。

## 共性建议

1. 先补 `Workbench Shell`。
把 `word editor` 和 `report designer` 的左右面板统一收敛到一套可折叠、可拖拽、可 reset 的 split shell。

2. 统一“脏状态 + 保存 + 离开保护”协议。
设计器类页面不要再各自散落保存逻辑，至少统一 document/data source/metadata 三类修改的可见边界。

3. 把“主点击”和“次级动作”分开。
列表主点击负责选中或进入对象，编辑/删除/更多菜单放到局部次级入口，避免像 word editor dataset 列表这样把主路径挤掉。

4. 给异步主动作补 busy/stop 语义。
SQL 执行、设计器预览、导入导出这类动作都应该有统一的进行中、防重和结果反馈规范。

5. 为 drag-and-drop 能力补键盘等价入口。
字段面板、变量面板、资源面板这类区域，都不应把拖拽当成唯一主路径。
