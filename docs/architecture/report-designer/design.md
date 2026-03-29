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
- inspector 匹配与 panel provider 选择逻辑
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
  type: 'spreadsheet-page'
  id?: string
  title?: string
  document: SpreadsheetDocumentInput
  config?: SpreadsheetConfig
  toolbar?: SchemaInput
  statusbar?: SchemaInput
}
```

### 5.2 `report-designer-page`

用于报表设计器。

推荐结构:

```ts
interface ReportDesignerPageSchema {
  type: 'report-designer-page'
  id?: string
  title?: string
  document: ReportTemplateDocumentInput
  spreadsheet?: SpreadsheetConfig
  designer: ReportDesignerConfig
  toolbar?: SchemaInput
  fieldPanel?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

说明:

- `spreadsheet-page` 只关心 workbook 编辑
- `report-designer-page` 在 workbook 之上叠加字段拖拽、metadata、preview、inspector 适配

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

- inspector 本身只是壳层
- 实际 panel body 由外部 schema 或 provider 决定
- selection target 改变时，通过匹配器选择合适的 panel 集合

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

- inspector schema 使用固定宿主 scope 读取 `activeCell`、`activeRange`、`sheet`、`meta`
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
- `activeCell`
- `activeRange`
- `runtime`

### `report-designer-page` 额外暴露

- `designer`
- `fieldDrag`
- `fieldSources`
- `meta`
- `preview`

这样 inspector 和 toolbar schema 可以稳定写成:

```json
{
  "type": "tpl",
  "tpl": "当前单元格: ${activeCell.address}"
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

