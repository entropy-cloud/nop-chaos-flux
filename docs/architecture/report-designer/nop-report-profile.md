# Report Designer 的 nop-report Profile 设计

本文档描述如何在通用 `Report Designer` 之上，通过 profile 和 adapter 支持 `nop-report`。

它不是通用 `Report Designer` core 契约的一部分，而是首个具体领域适配方案。

目标是回答三个问题:

- 通用 `Report Designer` 如何映射到 `nop-report` 的 `ExcelWorkbook + Xpt*Model`
- 左侧字段拖拽、右侧属性面板、预览、导入导出分别应该由哪些 adapter 承担
- 哪些能力应在 profile 层完成，哪些仍应保留在通用 spreadsheet/report-designer core 中

## 1. 适配目标

`nop-report` 的真实目标模型不是一个通用 spreadsheet JSON，而是双层模型:

- Excel 结构层: `ExcelWorkbook`、`ExcelSheet`、`ExcelTable`、`ExcelCell`
- 报表语义层: `XptWorkbookModel`、`XptSheetModel`、`XptCellModel`

关键参考:

- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/workbook.xdef`
- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/excel-table.xdef`
- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/style.xdef`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelWorkbook.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelSheet.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelCell.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptWorkbookModel.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptSheetModel.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptCellModel.java`

因此 `nop-report` profile 的核心任务不是替换通用设计器模型，而是建立下列映射:

- `SpreadsheetDocument` <-> Excel 结构层
- `ReportSemanticDocument` <-> XPT 语义层
- 字段拖拽行为 <-> `XptCellModel` patch 生成规则
- inspector panels <-> workbook/sheet/cell 级 XPT 属性页

## 2. Profile 定位

建议 `nop-report` 作为一个外部 profile 注入，而不是写死在 `report-designer-core` 中。

```ts
export interface ReportDesignerProfile {
  id: string;
  kind: string;
  fieldSourceIds: string[];
  inspectorIds: string[];
  fieldDropIds: string[];
  previewId?: string;
  codecId?: string;
  expressionEditorId?: string;
}
```

`nop-report` profile 推荐形态:

```ts
const nopReportProfile: ReportDesignerProfile = {
  id: 'nop-report-default',
  kind: 'nop-report',
  fieldSourceIds: ['nop-report-datasets'],
  inspectorIds: [
    'nop-report-workbook-panel',
    'nop-report-sheet-panel',
    'nop-report-cell-basic-panel',
    'nop-report-cell-xpt-panel',
    'nop-report-range-panel'
  ],
  fieldDropIds: ['nop-report-cell-binding'],
  previewId: 'nop-report-preview',
  codecId: 'nop-report-xpt-codec',
  expressionEditorId: 'nop-report-expression-editor'
};
```

## 3. 文档映射策略

### 3.1 Excel 结构层映射

通用 `SpreadsheetDocument` 应承载 `nop-report` 的 Excel 结构部分:

- workbook props
- styles
- sheets
- row/column width/height/hidden
- cell value/type/formula/styleId/comment/linkUrl/protected/richText
- merges

推荐映射原则:

- 能放进 `SpreadsheetDocument` 的结构化 Excel 数据，不放进 semantic metadata
- `ExcelCell.model` 不直接存进 `CellDocument`
- `sheet` 上的 page setup、images、charts、annotations、data validations 等可先进入 `WorksheetDocument.props`

### 3.2 XPT 语义层映射

`XptWorkbookModel`、`XptSheetModel`、`XptCellModel` 建议映射到通用 `ReportSemanticDocument`:

- `workbookMeta` -> workbook 级 XPT model
- `sheetMeta[sheetId]` -> sheet 级 XPT model
- `cellMeta[sheetId][address]` -> cell 级 XPT model
- `rangeMeta[sheetId]` -> 将来如果 `nop-report` 有区域型语义，可承载 range 级元数据

推荐 namespaced 存储:

```ts
interface NopReportWorkbookMeta {
  'nop-report': {
    model?: Record<string, unknown>;
  };
}

interface NopReportCellMeta {
  'nop-report': {
    model?: Record<string, unknown>;
  };
}
```

这样做的好处:

- 通用设计器不需要理解 `field`、`ds`、`expandType` 等字段
- 将来可并存多个 profile 的 metadata
- 便于导出时只提取 `nop-report` 命名空间

## 4. `nop-report` 重点字段映射

### 4.1 cell 基础字段

下列字段应主要保存在 `SpreadsheetDocument`:

- `value`
- `formula`
- `type`
- `styleId`
- `comment`
- `linkUrl`
- `protected`
- `richText`
- `mergeAcross`
- `mergeDown`

其中:

- `mergeAcross` / `mergeDown` 在前端统一表现为 `MergeRange`
- 导出到 `ExcelCell` 时由 codec adapter 重新还原

### 4.2 XPT cell model 字段

下列字段应进入 `cellMeta[sheetId][address]['nop-report'].model`:

- `field`
- `ds`
- `expandType`
- `expandExpr`
- `valueExpr`
- `formatExpr`
- `styleIdExpr`
- `linkExpr`
- `rowParent`
- `colParent`
- `exportFormula`
- `editorId`
- `viewerId`

不建议把这些字段摊平到通用 cell document 中，否则通用设计器会被 `nop-report` 语义污染。

### 4.3 workbook / sheet model 字段

`XptWorkbookModel` 与 `XptSheetModel` 字段建议进入:

- `semantic.workbookMeta['nop-report'].model`
- `semantic.sheetMeta[sheetId]['nop-report'].model`

是否在 UI 上完整展开这些字段，应由 inspector providers 决定。

## 5. 左侧字段面板适配

### 5.1 字段源来源

`nop-report` 的字段源通常不是静态数组，而是数据集树、字段树、可能还带有类型信息、标签、可拖放提示。

因此建议实现 `FieldSourceProvider`:

```ts
export interface NopReportDatasetField {
  dataset: string;
  path: string;
  label: string;
  type?: string;
  meta?: Record<string, unknown>;
}
```

`nop-report-datasets` provider 的职责:

- 从外部上下文加载数据集和字段列表
- 生成 `FieldSourceSnapshot`
- 给每个字段附带足够的拖拽 payload

### 5.2 拖拽 payload 建议

推荐 payload:

```ts
{
  type: 'nop-report-field',
  sourceId: 'datasets',
  fieldId: 'orders.amount',
  data: {
    dataset: 'orders',
    path: 'amount',
    label: 'Amount',
    valueType: 'number'
  }
}
```

这类 payload 只表达字段事实，不表达最终写到 cell meta 的所有规则。

真正的绑定策略交给 `FieldDropAdapter`。

## 6. 字段拖放到单元格的映射规则

建议在 `nop-report-cell-binding` adapter 中完成从字段 drop 到 metadata patch 的变换。

### 6.1 默认单元格绑定策略

当字段被拖到单个 cell 时，推荐默认 patch:

```ts
{
  'nop-report': {
    model: {
      field: '${field.path}',
      ds: '${field.dataset}'
    }
  }
}
```

如果希望保留可显示标签，可额外触发 spreadsheet 命令设置 cell value 为字段 label，但这属于 UI 便利行为，不应替代 metadata 绑定。

### 6.2 范围拖放策略

当字段被拖到 range 时，不建议在通用 core 中假设一定要生成循环区域。

对 `nop-report` profile 更合理的策略是:

- 首版仅支持 drop 到单 cell
- range drop 保留为后续扩展，用于批量生成表头/明细区/模板区
- 若实现 range drop，由 adapter 生成多个 `UpdateReportMetaCommand` 或一个复合 patch

### 6.3 类型感知策略

adapter 可根据字段类型增加默认值:

- number -> 可能建议 `formatExpr` 或数值格式
- date/time -> 可能建议默认日期格式
- string -> 普通 field 绑定

但这些都是 adapter 逻辑，不应进入通用 drop command 合同。

## 7. inspector 面板适配

`nop-report` 的属性编辑不应是一个单一大表单，而应拆成多个 provider。

### 7.1 workbook panel

`nop-report-workbook-panel` 建议负责:

- workbook 基础属性
- workbook 级 model
- 默认样式和导出相关设置

### 7.2 sheet panel

`nop-report-sheet-panel` 建议负责:

- sheet 基础属性
- sheet 级 model
- page setup、print、sheet options 的 profile 级编辑入口

### 7.3 cell basic panel

`nop-report-cell-basic-panel` 建议负责:

- 单元格显示值
- 类型
- styleId
- comment
- linkUrl
- 只读/保护

这些字段多数对应 `SpreadsheetDocument` 层。

### 7.4 cell XPT panel

`nop-report-cell-xpt-panel` 建议负责:

- `field`
- `ds`
- `expandType`
- `expandExpr`
- `valueExpr`
- `formatExpr`
- `styleIdExpr`
- `linkExpr`
- `rowParent`
- `colParent`
- `exportFormula`
- `editorId`
- `viewerId`

这些字段应从 `meta['nop-report'].model` 读取并回写。

### 7.5 inspector 组织方式建议

推荐由多个 provider 组合成 tabs:

- `Basic`
- `Style`
- `Report`
- `Advanced`

好处是:

- 通用 inspector shell 不需要理解 `nop-report`
- profile 可以逐步扩展面板，而不需要推翻原有结构

## 8. 表达式字段与表达式编辑器接入

当前通用文档只定义 `ExpressionEditorAdapter`，对 `nop-report` profile 推荐如下约束:

- `expandExpr`
- `valueExpr`
- `formatExpr`
- `styleIdExpr`
- `linkExpr`

这些字段都声明为 expression-kind property，由 inspector provider 标注需要调用表达式编辑器。

`nop-report` profile 需要提供:

- 哪些字段属于 expression field
- 表达式编辑上下文的 scopeData 如何构造
- 表达式编辑器 placeholder 与辅助文案

但当前阶段仍不固化表达式语言或补全协议。

## 9. `rowParent` / `colParent` 的前端表现

这是 `nop-report` 里最容易把前端设计做复杂的部分之一。

建议分阶段处理:

### 9.1 首版

- 属性面板中允许通过地址输入或引用选择器填写
- canvas 中只做轻量高亮，不做复杂依赖图

### 9.2 后续增强

- 提供“选择父单元格”交互
- 在 canvas 上显示轻量依赖连线或 hover 提示

关键原则:

- 这些依赖关系属于 profile 级辅助交互
- 通用 spreadsheet core 不需要理解它们的业务含义

## 10. preview adapter

`nop-report-preview` adapter 建议负责:

- 把当前 `ReportTemplateDocument` 导出为 `nop-report` 可接受的结构
- 调用后端 preview API
- 将结果回传给 designer

推荐边界:

- designer core 只知道 `preview(document, mode, params)`
- `nop-report-preview` 负责请求 URL、参数结构、返回结果转换
- 若后端预览依赖 `.xpt.xlsx` 或特定 JSON 结构，也由 adapter 层决定

## 11. codec adapter

`nop-report-xpt-codec` 是最关键的 adapter 之一。

它应负责:

- 导入 `nop-report` 模板为 `ReportTemplateDocument`
- 导出 `ReportTemplateDocument` 为 `nop-report` 可保存格式
- 在 Excel 结构层与 XPT 语义层之间做往返映射

### 11.1 导入策略

导入时拆成两层:

- `ExcelWorkbook` -> `SpreadsheetDocument`
- `XptWorkbookModel` / `XptSheetModel` / `XptCellModel` -> `ReportSemanticDocument`

### 11.2 导出策略

导出时反向组装:

- 先从 `SpreadsheetDocument` 生成 `ExcelWorkbook` 结构
- 再从 `semantic.*Meta['nop-report']` 提取 XPT model
- 最后由 adapter 组合为后端需要的 payload

### 11.3 保真原则

codec adapter 必须优先保证:

- 不丢失未知但可保留的 workbook/sheet props
- 不丢失未在 UI 中完整编辑的 XPT 字段
- 不因前端通用化而损伤 `nop-report` round-trip 能力

## 12. 哪些能力必须在 profile 层做

以下能力明确属于 `nop-report` profile，而不是通用 core:

- dataset/field 树加载与展示
- 字段 drop 到 cell 的语义映射
- XPT cell model 的字段定义与默认值
- workbook/sheet/cell/range 的 `nop-report` inspector panels
- preview 请求协议
- import/export codec
- `rowParent` / `colParent` 等语义辅助交互

## 13. 哪些能力仍应在通用 core 做

以下能力应留在通用层:

- workbook / sheet / cell 基础文档模型
- selection / active cell / range 模型
- merge、resize、hidden、style、sheet tabs
- canvas 渲染、hit test、DOM overlay 编辑
- history / transaction / command pipeline
- bridge 与宿主 scope 注入
- inspector shell 与 provider 匹配框架
- expression editor adapter 注入位

## 14. 推荐落地顺序

若后续开始编码，最合理的 `nop-report` 适配落地顺序是:

1. 实现 `SpreadsheetDocument <-> ExcelWorkbook` 基础 codec
2. 实现 `ReportSemanticDocument <-> Xpt*Model` 基础 codec
3. 实现 `nop-report-datasets` field source provider
4. 实现 `nop-report-cell-binding` field drop adapter
5. 实现 cell basic / cell XPT inspector providers
6. 实现 `nop-report-preview` adapter
7. 再增强 `rowParent` / `colParent` 交互和高级 sheet/workbook 面板

这个顺序可以最快得到一个可用的 `nop-report` 设计器最小闭环。

## 15. 结论

`nop-report` 最合理的接入方式不是把它的模型写死进 `Report Designer` core，而是把它实现成一组 profile + adapter:

- 用 `SpreadsheetDocument` 承载 Excel 结构
- 用 `ReportSemanticDocument` 承载 XPT 语义
- 用 `FieldSourceProvider`、`FieldDropAdapter`、`InspectorProvider`、`PreviewAdapter`、`TemplateCodecAdapter` 做领域映射

这样既能保证 `nop-report` 的 round-trip 和设计器体验，也不会破坏 `Report Designer` 作为通用设计器的定位。
