# Report Designer 架构设计

## 1. 目标与边界

### 1.1 核心目标

- 将 Excel 式多 sheet 编辑能力提炼为可单独复用的 `Spreadsheet Editor`
- 在 `Spreadsheet Editor` 之上叠加可配置的 `Report Designer`
- 外部通过 JSON 配置定义字段面板、工具栏、属性面板、报表元数据编辑方式和预览集成
- 复用现有 `SchemaRenderer` 体系，而不是平行再造一套页面渲染运行时
- 保持 `Report Designer` 通用，允许通过适配器支持 `nop-report` 等具体后端模型

### 1.2 非目标

- 不追求完整 Excel 兼容
- 不内建公式执行引擎
- 不把表达式编辑语言在当前阶段写死
- 不将字段面板、属性面板、预览协议写死为 `nop-report`

## 2. 总体架构

`Report Designer` 应实现为 `SchemaRenderer` 上的一层领域扩展，并且其底层 `Spreadsheet Editor` 可以单独作为一个通用控件使用。

```text
+---------------- SchemaRenderer Host ----------------+
|                                                     |
|  spreadsheet-page / report-designer-page            |
|    |                                                |
|    +- toolbar region -> standard schema render      |
|    +- field panel    -> designer field renderer     |
|    +- canvas region  -> spreadsheet renderer        |
|    +- inspector      -> standard schema render      |
|    +- dialogs        -> standard schema render      |
|                                                     |
|  formulaCompiler / action dispatch / page runtime   |
|  form runtime / dialog host / plugin pipeline       |
+--------------------------+--------------------------+
                           |
                           v
+---------------- Spreadsheet Core -------------------+
| workbook | sheets | cells | styles | merges         |
| selection | editing | layout | history | commands    |
+--------------------------+--------------------------+
                           |
                           v
+--------------- Report Designer Core ----------------+
| field sources | semantic metadata | drag-drop       |
| inspector matching | preview bridge | adapters       |
+-----------------------------------------------------+
```

## 3. 模块拆分

### 3.1 `@nop-chaos/spreadsheet-core`

职责: 纯表格运行时，不依赖 React，不依赖 `SchemaRenderer`，可以单独复用。

建议包含:

- workbook / sheet / row / column / cell 文档模型
- 稀疏单元格存储
- 样式引用池
- merge 模型
- row/column resize 与 hidden 状态
- active sheet、selection、editing 状态
- layout skeleton 与 visible range 计算
- undo/redo 历史
- spreadsheet commands 执行器
- 文档序列化、反序列化、迁移

### 3.2 `@nop-chaos/spreadsheet-renderers`

职责: 与现有 `SchemaRenderer` 集成。

建议包含:

- `spreadsheet-page`、`spreadsheet-canvas`、`spreadsheet-toolbar-shell` 等 `RendererDefinition`
- `createSpreadsheetRegistry()` 或 `registerSpreadsheetRenderers()`
- spreadsheet runtime 到 schema runtime 的桥接层
- 宿主 scope 注入
- `spreadsheet:*` action 注册
- DOM overlay editor 和 canvas renderer 适配

### 3.3 `@nop-chaos/report-designer-core`

职责: 在 spreadsheet 之上增加报表设计语义，但不绑定具体业务模型。

建议包含:

- report template document 类型定义
- 字段源与字段拖拽模型
- workbook/sheet/cell/range metadata 层
- selection target 到最终 inspector schema 的组装逻辑
- preview 接口抽象
- 外部适配器注册
- `report-designer:*` action 的底层执行器

### 3.4 `@nop-chaos/report-designer-renderers`

职责: 与 `SchemaRenderer` 集成通用报表设计器外壳。

建议包含:

- `report-designer-page`、`report-field-panel`、`report-inspector-shell` 等 renderer
- `createReportDesignerRegistry()` 或 `registerReportDesignerRenderers()`
- 左侧字段面板拖拽到 spreadsheet 的桥接层
- inspector schema 运行时宿主注入
- `report-designer:*` actions 注册

### 3.5 表达式编辑器适配边界

表达式编辑器不是本期实现内容，但 `Report Designer` 必须从一开始就预留接入位。

建议约束:

- designer 不内建表达式输入框实现
- 属性面板通过 adapter 渲染表达式字段
- adapter 只暴露编辑和值回传能力，不要求当前文档定义具体语言协议

补充边界：

- Report Designer 的最小 inspector 路径仍可以只是 `cell -> 一个 schema/form -> 一个写回动作/JSON patch`
- 即使需求扩展到多 target / 多 tabs / 多 profile，规范主路径仍然是生成最终 Flux schema/form，而不是再定义一套 provider/panel 组织模型

## 4. 为什么要分成 Spreadsheet 和 Report Designer 两层

参考 `packages/flux-react/src/index.tsx:479`，当前体系已经具备:

- registry 驱动 renderer 发现
- schema compile 和动态值编译缓存
- page/form runtime
- scope 上下文
- dialog host
- action dispatch
- plugin 生命周期

因此这里真正需要新增的是领域运行时，而不是新的通用页面引擎。

同时，用户明确要求 Excel 展现和编辑能力可以单独使用，所以不能把 spreadsheet core 深埋到 report designer 内部。

## 5. 两种根节点组织模型

### 5.1 `spreadsheet-page`

用于单独使用的 workbook 编辑器。

推荐结构:

```ts
interface SpreadsheetPageSchema {
  type: 'spreadsheet-page';
  id?: string;
  title?: string;
  document: SpreadsheetDocumentInput;
  config?: SpreadsheetConfig;
  readOnly?: boolean;
  statusPath?: string;
  toolbar?: SchemaInput;
  body?: SchemaInput;
  dialogs?: SchemaInput;
}
```

### 5.2 `report-designer-page`

用于报表设计器。

当前 renderer owner contract 以 `docs/components/report-designer-page/design.md` 与 live code 为准。这里保留 family-level 页面 shape 摘要，不再把 target-only renderer fields 混写成当前 contract：

```ts
interface ReportDesignerPageSchema {
  type: 'report-designer-page';
  id?: string;
  title?: string;
  document: ReportTemplateDocumentInput;
  designer: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: ReportDesignerAdapterConfig;
  statusPath?: string;
  toolbar?: SchemaInput;
  fieldPanel?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
  body?: SchemaInput;
}
```

说明:

- `spreadsheet-page` 只关心 workbook 编辑，并已支持 `toolbar` / `body` / `dialogs` 三个 region 与 `statusPath` 摘要发布
- `report-designer-page` 在 workbook 之上叠加字段拖拽、metadata、preview、inspector 适配，并已支持 `toolbar` / `fieldPanel` / `inspector` / `dialogs` / `body` 五个 region 与 `statusPath`
- 当前 live renderer 使用 `document.spreadsheet` 作为 spreadsheet 文档入口；本 family doc 不再把额外 top-level `spreadsheet?: SpreadsheetConfig` 写成当前页面 schema 字段

## 6. 数据模型分层

### 6.1 持久化文档

`SpreadsheetDocument` 只保存稳定的表格文档:

- workbook 元信息
- sheets
- rows/columns/cells
- styles
- merges
- 可选 viewport

不保存:

- hover
- 当前编辑态 DOM 信息
- drag preview
- 打开的属性页签
- 临时错误高亮

### 6.2 Report Designer 语义层

`Report Designer` 不应直接把业务语义塞进 spreadsheet core 的 cell 结构。建议单独维护 metadata 平面:

- workbook metadata
- sheet metadata
- cell metadata
- range metadata
- field binding metadata

metadata 默认采用通用 namespaced object 结构，具体语义由外部适配器解释。

### 6.3 运行时状态

运行时状态由三层组成:

- spreadsheet runtime state: activeSheet、selection、editing、history、layout
- report designer runtime state: field drag、active metadata target、preview session、adapter state
- schema runtime state: form/page/dialog/action 相关状态

三者必须分层，避免把 form runtime 再复制进 designer store。

## 7. 左侧字段面板模型

字段面板是 `Report Designer` 的可选能力，不属于 standalone spreadsheet 的内建部分。

建议约束:

- 字段来源由外部配置或 provider 提供
- 字段可拖拽到单元格或区域
- drop 时只产生标准化 designer command，不直接修改 document
- 字段面板可按组、分类、搜索、只读提示等方式配置

最小交互路径:

1. 用户从字段面板拖拽字段
2. canvas 命中单元格或区域
3. bridge 将 drop 归一化为 `report-designer:dropFieldToTarget`
4. core 调用当前适配器生成 metadata patch
5. inspector 与 canvas 同步刷新

## 8. 属性编辑与 inspector 模型

### 8.1 属性编辑必须外部可定制

点击单元格后，右侧属性框的可编辑内容必须由外部决定，而不是框架内建一套固定字段。

因此建议:

- inspector 本身只是很薄的 selection-aware 壳层
- 实际编辑体直接由外部 schema，或由 profile/schema 组装层生成的最终 Flux schema 决定
- selection target 改变时，切换最终要挂载的 schema/form，而不是切换第二套 provider/panel 运行时模型

可匹配目标至少包括:

- workbook
- sheet
- row
- column
- cell
- range

### 8.2 inspector 仍然复用现有 schema/form runtime

属性面板直接使用 schema 片段驱动，而不是单独维护字段引擎。

推荐方式:

- inspector schema 使用固定宿主 scope 读取 canonical `selectionTarget`，并保留 `selection` / `target` 作为兼容 alias，同时读取 `activeSheet`、`meta`
- `activeCell`、`activeRange` 如需提供，应视为从 `selection` 派生的便利字段，而不是高于 `selection` / `target` 的主契约
- 保存按钮触发 `report-designer:updateMeta` 或 `spreadsheet:*` actions
- 校验复用现有 form runtime

### 8.3 表达式字段通过适配器注入

若某属性项是表达式类型，则 inspector 不直接渲染普通输入框，而是通过 `ExpressionEditorAdapter` 渲染。

当前阶段只定义:

- 如何声明一个字段需要表达式编辑器
- 如何把值、只读态、上下文和变更回调交给适配器

不定义:

- 具体表达式语法
- 自动补全协议
- 校验诊断结构的最终格式

## 9. spreadsheet runtime 与 schema runtime 的桥接

桥接层负责把 spreadsheet/report designer runtime 暴露给 `spreadsheet-page` 或 `report-designer-page` 下的 schema 片段。

建议桥接原则:

- schema 片段通过固定宿主 scope 读取只读快照
- 写操作必须通过 `spreadsheet:*` 或 `report-designer:*` actions 提交
- schema 层不得直接拿到底层 store 并原地修改 document
- bridge 对外暴露稳定快照和有限命令面，而不是整个 store 私有实现

## 9.1 Excel-like 直接操控基线

`Report Designer` 的主工作区不是教学 demo，而是面向持续编辑的 spreadsheet workbench。

因此当前架构基线必须满足:

- canvas 交互以单元格直接操作为主，优先贴近 Excel 的鼠标工作流
- 单击单元格选中，拖拽形成范围选择，双击进入单元格编辑
- 除右侧属性编辑等 report-designer 特有语义面板外，主工作区提供的表格交互应以 Excel 原生支持的能力为边界，不引入 Excel 本身不存在的自定义工作表手势
- 点击行头、列头、左上角全选角时，分别直接进入行选中、列选中、整表选中
- 右键菜单属于主工作台交互的一部分，命中单元格/行头/列头/全选角时，应先归一化当前 selection，再展示对应的上下文操作
- 共享右键菜单的动作可用性也应随当前 selection 类型变化；若某项操作不符合当前 Excel 语义上下文，应在菜单中禁用而不是允许用户点击后再无意义返回
- 双击填充柄属于允许能力，但行为应遵循 Excel 习惯：根据相邻数据区域自动确定向下填充的终点，而不是无限制地填满可视网格
- 插入行/列这类结构性操作应优先采用 Excel 的方向性表达，例如“在上方插入行 / 在下方插入行 / 在左侧插入列 / 在右侧插入列”，而不是只暴露语义模糊的泛化入口
- 当当前选择是多行或多列 header 选择时，结构性插入/删除应按选中数量整体生效，而不是只对锚点所在的单行或单列生效
- 合并/取消合并以及冻结/取消冻结属于 Excel 原生表格能力，可以进入共享 workbench 的上下文操作面，但仍应通过统一 spreadsheet command 链执行，而不是宿主各自发明一套独立交互
- `sort/filter` 这类同样属于 Excel 原生能力，但只有在共享 spreadsheet runtime 已经具备稳定的数据模型、command 和 renderer 反馈后，才应进入默认上下文菜单；在底层能力缺失时，不应先暴露占位菜单项或宿主私有实现

当前最小共享基线:

- `sort` 与 `filter` 不是必须同时落地的单一特性包；在共享层能力尚不对等时，可以先落真实可用的 `sort`，并继续推迟 `filter`
- 第一阶段 `sort` 只要求支持基于当前锚点列、对当前选区行块执行升序/降序排序，并通过共享命令链真正重排 worksheet 数据
- 第一阶段 `filter` 只要求支持基于当前单元格值筛选当前列，以及清除当前工作表的筛选结果；筛选结果必须真实体现在共享 worksheet 行可见性上
- 第一阶段 `filter` 还应提供最小可见反馈，让用户能看出当前工作表或列处于筛选状态；这类反馈应附着在共享 grid/header 本身，而不是重新引入教学性质说明区
- 即便第一阶段 `filter` 还很小，worksheet 也应显式保存筛选条件本身，而不应只剩“哪些行被隐藏了”这一派生结果；共享 renderer 的筛选态反馈应优先读取这一显式模型
- 在没有列头下拉、多条件筛选模型和更完整筛选 UI 前，`filter` 不应以超出这一最小能力面的占位菜单项形式提前暴露
- 字段拖拽、toolbar 操作、inspector 操作都只是对这条直接操控主路径的补充，不能反过来要求用户先理解一套 demo 说明区
- `report-designer-page` 正式工作台不应在 canvas 下方保留教学性质的 `event log`、`keyboard shortcuts cheatsheet` 一类辅助面板

说明:

- 键盘快捷键仍然可以存在，也仍然可以走统一 action/command 分发链
- 但快捷键属于增强能力，不是 report designer 的主要可见交互入口
- 若需要帮助信息，应放在独立帮助入口、文档或可选面板里，而不是占用主工作台下方空间

## 10. 动作体系

所有外围交互统一接入现有 action schema，并扩展 spreadsheet/report designer actions。

建议的 spreadsheet 内建 actions:

- `spreadsheet:setActiveSheet`
- `spreadsheet:setSelection`
- `spreadsheet:setCellValue`
- `spreadsheet:setCellStyle`
- `spreadsheet:resizeRow`
- `spreadsheet:resizeColumn`
- `spreadsheet:mergeRange`
- `spreadsheet:unmergeRange`
- `spreadsheet:hideRow`
- `spreadsheet:hideColumn`
- `spreadsheet:addSheet`
- `spreadsheet:removeSheet`
- `spreadsheet:undo`
- `spreadsheet:redo`

建议的 report designer 内建 actions:

- `report-designer:dropFieldToTarget`
- `report-designer:updateMeta`
- `report-designer:openInspector`
- `report-designer:closeInspector`
- `report-designer:preview`
- `report-designer:importTemplate`
- `report-designer:exportTemplate`

好处:

- toolbar 按钮可直接触发
- inspector 表单可直接提交到 designer action
- 字段拖拽与快捷键可复用同一动作分发链

## 11. 固定宿主 Scope

为了让 schema 片段稳定工作，`spreadsheet-page` 和 `report-designer-page` 必须注入固定宿主 scope。

### `spreadsheet-page` 建议暴露

- `workbook`
- `activeSheet`
- `selection`
- `runtime`

如有需要，`activeCell`、`activeRange` 可以作为从 `selection` 派生的便利字段补充暴露，但它们不是高于 `selection` 的固定主契约。

### `report-designer-page` 额外暴露

- `designer` — 主投影，包含 `selectionTarget`、`inspector`、`fieldDrag`、`preview`、`activeMeta`、`fieldSources`、`fieldSourceCount`、`fieldCount` 等
- `runtime` — 运行时摘要 (`canUndo`, `canRedo`, `previewRunning`, `previewMode`, `dirty`)
- `spreadsheet` — 嵌套 spreadsheet 投影
- `selectionTarget` — 当前选择目标（canonical）
- `selection`、`target` — `selectionTarget` 的兼容别名

Dirty 语义收敛规则:

- `designer.dirty` 只表示 report-designer 自身语义层是否有未保存变更，例如 metadata / inspector 驱动的文档修改
- `runtime.dirty` 表示对宿主发布的聚合 dirty，等于 `designer.dirty || spreadsheet.runtime.dirty`
- bridge、status summary、host scope 必须使用这同一套定义，不能把 `designer.dirty` 再降级成 spreadsheet-only dirty

导入模板后，`report-designer:importTemplate` 必须立即刷新 `fieldSources`、`inspector.resolvedSchema` 和相关 loading/error 状态，避免新文档与旧派生缓存并存。

顶层便利字段 (`inspector`, `meta`, `canUndo`, `canRedo`, `documentName`, `fieldCount`) 是 `designer.*` 或 `runtime.*` 的镜像。当前 live code 如仍暴露 `inspectorPanels` 一类字段，应视为 implementation lag / compatibility detail，而不是规范主路径。

这样 inspector 和 toolbar schema 可以稳定写成:

```json
{
  "type": "tpl",
  "tpl": "当前目标: ${selectionTarget.kind}"
}
```

## 12. 性能策略

### 12.1 文档归一化

- workbook、sheet、rows、columns、cells 预处理为索引结构
- merges、style references、visible ranges 预编译为快速查询结构
- inspector 匹配规则在初始化阶段编译

### 12.2 局部订阅

- canvas 只订阅 sheet/grid/layout 状态
- inspector 主要订阅 selection 与 active metadata
- field panel 主要订阅 field source 与拖拽态
- 不让整个 designer 因单个 cell 改动全局重渲染

### 12.3 布局缓存

- row/column offsets 独立缓存
- merge 几何缓存独立维护
- visible range 与 hit-test 索引独立维护
- DOM overlay editor 只在 active edit cell 上存在

## 13. 与 nop-report 的关系

`nop-report` 适配应作为一个外部 profile，而不是内建设计器契约。

典型适配内容包括:

- 左侧字段源如何映射到数据集/字段树
- 单元格 metadata 如何映射到 `field`、`ds`、`expandType` 一类语义
- inspector 如何组织 workbook/sheet/cell 级属性页
- 导入导出如何映射到 `workbook.xdef`、`excel-table.xdef` 或 `ExcelWorkbook + Xpt*Model`

这保证 `Report Designer` 仍然可以服务于其他报表模板模型。

## 14. Implementation Progress Note

Implementation progress should be checked against code, logs, plans, and focused runtime-snapshot material.

This document's primary role is the target architecture contract, not a historical ledger of which implementation phase landed first.

## Related Documents

- `docs/architecture/complex-control-host-protocol.md` — 跨域共享协议
- `docs/architecture/flow-designer/runtime-snapshot.md` — Flow Designer host scope 参考实现
- `docs/plans/33-complex-control-platform-convergence-refactor-plan.md` — Phase 3 执行计划
