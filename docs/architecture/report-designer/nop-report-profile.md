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
- inspector schema <-> workbook/sheet/cell 级 XPT 属性页

## 1.1 Cell Comment 与扩展属性的设计立场

### nop-entropy 的 comment-as-config 是什么

`nop-entropy` 没有独立的报表设计器 UI，用户直接在 Excel 中设计报表模板。由于 Excel 单元格本身没有"扩展属性"机制，nop-entropy **不得已**借用 cell comment 来承载 `XptCellModel` 的配置属性（`expandType`、`field`、`ds`、`expandExpr` 等）。

其解析管线为:

1. `ExcelWorkbookParser` 从 `xl/commentsN.xml` 读取 comment 文本 → `ExcelCell.comment`
2. `ExcelToXptModelTransformer.parseCellModel()` 遍历有 comment 的单元格
3. `MultiLineConfigParser` 将 comment 文本解析为 `key=value` 键值对
4. `DslXNodeToJsonTransformer` 按 `excel-table.xdef` 的类型定义转换值类型
5. 解析完成后 `ec.setComment(null)` 清空注释

Comment 文本格式为每行一个 `key=value`:

```
expandType=r
field=orderId
ds=orderList
expandExpr=`data.filter(x => x.amount > 100)`
```

此外单元格文本还支持简写语法（`*=^dsName!fieldName`、`*=fieldName`、`${...}` 等），由 `XptModelInitializer` 解析。

WorkBook/Sheet 级模型存储在独立命名的 sheet 中（`XptWorkbookModel`、`SheetName-XptSheetModel`），通过 `xpt.imp.xml` 定义的 ImportModel 解析。

关键源码:

- `nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/build/ExcelToXptModelTransformer.java`
- `nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/util/MultiLineConfigParser.java`
- `nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/build/XptModelInitializer.java`

### Report Designer 的设计立场

本 Report Designer 的定位是**替代** nop-entropy 中基于 Excel 的报表设计方式，提供专用 UI。因此:

1. **不延续 comment-as-config**: 扩展属性直接存储在 `cellMeta['nop-report'].model` 结构化对象中，不借用 comment 文本。Inspector form 是扩展属性的编辑界面，用户不需要接触 `key=value` 文本格式
2. **Comment 归还给用户**: 单元格注释回归其本来用途——用户备注。Report Designer 不把 comment 用作配置通道
3. **Codec adapter 负责互操作**: 导入 `.xpt.xlsx` 时，adapter 从 comment 解析配置写入 metadata；导出时，adapter 从 metadata 序列化回 comment 文本，确保与后端 `ExcelToXptModelTransformer` 兼容。这是一个**适配层职责**，不是设计器核心模型
4. **通用扩展属性机制**: Report Designer 提供通用的 cell metadata 平面，任何 profile 都可以通过 namespaced object 注册自己的扩展属性编辑界面，不限于 nop-report 的 XPT 模型

### Workbook/Sheet 级模型来源

XPT 模型不仅仅存在于 cell comment 中:

- **Workbook 级模型**: 存储在名为 `XptWorkbookModel` 的独立 sheet 中（通过 `xpt.imp.xml` 定义的 ImportModel 解析）
- **Sheet 级模型**: 存储在名为 `SheetName-XptSheetModel` 的独立 sheet 中
- **命名样式**: 在 `XptWorkbookModel` sheet 的 `ext:namedStyles` 字段中定义

这些专用 sheet 在模板加载后被移除，不参与报表生成。codec adapter 需要正确处理这些 sheet 的读取和写入。

## 1.2 样式模型

### nop-entropy 的样式架构

nop-entropy 采用 **workbook 级命名样式注册表 + styleId 引用** 的间接模型:

```
ExcelWorkbook
  |-- styles: KeyedList<ExcelStyle>   ← 全局样式注册表，以 id 为键
  |
  |-- sheets[0]
        |-- table.cols[0].styleId → "s1"  ← 列默认样式引用
        |-- table.rows[0].styleId → "s2"  ← 行默认样式引用
        |-- table.rows[0].cells[0].styleId → "s3"  ← 单元格样式引用
```

`ExcelStyle` 的完整属性集（参考 `/nop/schema/excel/style.xdef`）:

| 属性                                                        | 类型                        | 说明                                                                           |
| ----------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| `id`                                                        | `String`                    | 样式唯一标识（注册表键）                                                       |
| `name`                                                      | `String`                    | 显示名称                                                                       |
| `font`                                                      | `ExcelFont`                 | 字体（fontName, fontSize, fontColor, bold, italic, strikeout, underlineStyle） |
| `numberFormat`                                              | `String`                    | 数字格式字符串（如 `"#,##0.00"`）                                              |
| `horizontalAlign`                                           | `OfficeHorizontalAlignment` | 水平对齐（LEFT / CENTER / RIGHT）                                              |
| `verticalAlign`                                             | `OfficeVerticalAlignment`   | 垂直对齐（TOP / CENTER / BOTTOM）                                              |
| `indent`                                                    | `Integer`                   | 缩进                                                                           |
| `wrapText`                                                  | `boolean`                   | 自动换行                                                                       |
| `shrinkToFit`                                               | `boolean`                   | 缩小字体填充                                                                   |
| `rotate`                                                    | `Integer`                   | 旋转角度                                                                       |
| `locked`                                                    | `Boolean`                   | 锁定（配合 sheet 保护）                                                        |
| `hidden`                                                    | `Boolean`                   | 隐藏公式                                                                       |
| `fillFgColor`                                               | `String`                    | 前景填充色                                                                     |
| `fillBgColor`                                               | `String`                    | 背景填充色                                                                     |
| `fillPattern`                                               | `String`                    | 填充图案                                                                       |
| `topBorder` / `bottomBorder` / `leftBorder` / `rightBorder` | `ExcelBorderStyle`          | 四边边框                                                                       |
| `diagonalLeftBorder` / `diagonalRightBorder`                | `ExcelBorderStyle`          | 对角线边框                                                                     |

样式解析顺序: `cell.styleId` > `row.styleId` > `column.styleId` → 统一在 `ExcelWorkbook.styles` 中查找。

### 动态样式

`XptCellModel` 还提供了 `styleIdExpr`（`IEvalAction`），允许运行时根据数据动态选择样式。例如:

```
styleIdExpr=${cell.value > 1000 ? 'highlight-red' : 'normal'}
```

这在报表生成时计算，覆盖静态 `styleId`。

### 当前 spreadsheet-core 的样式现状

当前 `spreadsheet-core` 的 `CellDocument` 使用**内联 `CellStyle` 对象**:

```typescript
interface CellStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  fontColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: string;
  borderWidth?: number;
  borderTop?: BorderLineStyle;
  borderRight?: BorderLineStyle;
  borderBottom?: BorderLineStyle;
  borderLeft?: BorderLineStyle;
  textAlign?: string;
  verticalAlign?: string;
  wrapText?: boolean;
  textIndent?: number;
}
```

每个 `CellDocument` 直接持有完整的样式属性副本，**没有** `styleId` 间接引用机制。

### 差距与对齐计划

| 方面          | 当前状态                        | 目标状态                                                   |
| ------------- | ------------------------------- | ---------------------------------------------------------- |
| 样式存储      | 每个单元格内联 `CellStyle` 对象 | `styleId` 引用 + workbook 级 `styles` 注册表               |
| 样式共享      | 无法共享（每个 cell 独立副本）  | 相同样式的 cell 共享同一个 `styleId`                       |
| 数字格式      | 不支持                          | `numberFormat` 字段（如 `"#,##0.00"`）                     |
| 动态样式      | 不支持                          | `styleIdExpr` 运行时计算                                   |
| 列/行默认样式 | 不支持                          | `ExcelColumnConfig.styleId`、`ExcelRow.styleId`            |
| XLSX 导出     | 不适用                          | `StylesPart` 构建 `xl/styles.xml`（去重 font/fill/border） |
| 条件样式      | 不支持                          | `ExcelSheet.conditionalStyles` 范围级条件格式              |

对齐策略建议分阶段:

1. **第一阶段**: 在 `SpreadsheetDocument` 中增加 `workbook.styles` 注册表（`Record<string, CellStyle>`）和 `CellDocument.styleId` 字段；codec adapter 在导入时将 `ExcelStyle` 转为 `CellStyle` 存入注册表；导出时从注册表重建 `ExcelStyle` 列表
2. **第二阶段**: `cell-style-map.ts` 利用 `styleId` 做 `CellStyleResult` 缓存（同一 `styleId` 只计算一次映射），提升 canvas 渲染性能
3. **第三阶段**: 支持列/行默认样式继承链（`column.styleId` → `row.styleId` → `cell.styleId`）和 `numberFormat`
4. **第四阶段**: 通过 inspector 暴露 `styleIdExpr` 动态样式配置

## 2. Profile 定位

建议 `nop-report` 作为一个外部 profile 注入，而不是写死在 `report-designer-core` 中。

```ts
export interface ReportDesignerProfile {
  id: string;
  kind: string;
  fieldSourceIds: string[];
  inspectorSchemaId?: string;
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
  inspectorSchemaId: 'nop-report-default',
  fieldDropIds: ['nop-report-cell-binding'],
  previewId: 'nop-report-preview',
  codecId: 'nop-report-xpt-codec',
  expressionEditorId: 'nop-report-expression-editor',
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

是否在 UI 上完整展开这些字段，应由 `nop-report` profile 生成的 inspector schema 决定。

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

`nop-report` 的属性编辑不应再建一套 provider 体系；如果需要多块内容，应由 profile 生成最终的多 tab / 多 section Flux schema。

### 7.1 workbook schema

`nop-report` 生成的 workbook inspector schema 建议覆盖:

- workbook 基础属性
- workbook 级 model
- 默认样式和导出相关设置

### 7.2 sheet schema

`nop-report` 生成的 sheet inspector schema 建议覆盖:

- sheet 基础属性
- sheet 级 model
- page setup、print、sheet options 的 profile 级编辑入口

### 7.3 cell basic schema

`nop-report` 生成的 cell basic schema 建议覆盖:

- 单元格显示值
- 类型
- styleId
- comment
- linkUrl
- 只读/保护

这些字段多数对应 `SpreadsheetDocument` 层。

### 7.4 cell XPT schema

`nop-report` 生成的 cell XPT schema 建议覆盖:

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

推荐由 profile 直接生成 tabs schema:

- `Basic`
- `Style`
- `Report`
- `Advanced`

好处是:

- 通用 inspector shell 不需要理解 `nop-report`
- profile 可以逐步扩展 schema，而不需要推翻原有结构

## 8. 表达式字段与表达式编辑器接入

当前通用文档只定义 `ExpressionEditorAdapter`，对 `nop-report` profile 推荐如下约束:

- `expandExpr`
- `valueExpr`
- `formatExpr`
- `styleIdExpr`
- `linkExpr`

这些字段都声明为 expression-kind property，由最终 inspector schema 标注需要调用表达式编辑器。

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
- workbook/sheet/cell/range 的 `nop-report` inspector schema
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
- inspector shell 与最终 schema 挂载边界
- expression editor adapter 注入位

## 14. 推荐落地顺序

若后续开始编码，最合理的 `nop-report` 适配落地顺序是:

1. 实现 `SpreadsheetDocument <-> ExcelWorkbook` 基础 codec
2. 实现 `ReportSemanticDocument <-> Xpt*Model` 基础 codec
3. 实现 `nop-report-datasets` field source provider
4. 实现 `nop-report-cell-binding` field drop adapter
5. 生成 cell basic / cell XPT inspector schema
6. 实现 `nop-report-preview` adapter
7. 再增强 `rowParent` / `colParent` 交互和高级 sheet/workbook 面板

这个顺序可以最快得到一个可用的 `nop-report` 设计器最小闭环。

## 15. 结论

`nop-report` 最合理的接入方式不是把它的模型写死进 `Report Designer` core，而是把它实现成一组 profile + adapter:

- 用 `SpreadsheetDocument` 承载 Excel 结构
- 用 `ReportSemanticDocument` 承载 XPT 语义
- 用 `FieldSourceProvider`、`FieldDropAdapter`、`PreviewAdapter`、`TemplateCodecAdapter` 做领域映射，并为 profile 生成对应 inspector schema

这样既能保证 `nop-report` 的 round-trip 和设计器体验，也不会破坏 `Report Designer` 作为通用设计器的定位。
