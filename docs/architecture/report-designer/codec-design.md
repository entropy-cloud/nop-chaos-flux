# Report Designer Codec Design

本文档定义 `Report Designer` 在持久化与外部模型之间的 codec 设计，重点是 `nop-report` 场景下的 round-trip 保真。

它回答的问题是:

- `SpreadsheetDocument` 如何映射到 Excel 结构层
- `ReportSemanticDocument` 如何映射到 XPT 语义层
- 导入、编辑、导出过程中哪些数据必须原样保留
- codec 层与通用 core、profile adapter、后端接口之间的责任边界是什么

## 1. 目标

codec 设计的核心目标不是简单序列化，而是保证三件事:

- 前端通用模型足够稳定，便于 spreadsheet/report-designer 运行时编辑
- 领域模型 round-trip 尽量无损，尤其是 `nop-report` 的 `ExcelWorkbook + Xpt*Model`
- UI 暂时不支持编辑的字段也应尽量保留，而不是在导出时被清空

## 2. codec 分层结论

推荐把 codec 拆成两层，而不是一个黑盒函数:

- `SpreadsheetCodec`: `SpreadsheetDocument <-> ExcelWorkbookLike`
- `ReportSemanticCodec`: `ReportSemanticDocument <-> ReportModelLike`

在 `nop-report` 场景下再由 profile 组合:

- `NopReportTemplateCodec`
  - spreadsheet codec
  - semantic codec
  - profile-specific preservation policy

## 3. 外部模型抽象

通用 `Report Designer` 不需要直接依赖 `nop-entropy` 的 Java 类，但 codec 文档需要明确它们的对应层次。

### 3.1 Excel 结构层

对 `nop-report` 来说，等价目标是:

- `ExcelWorkbook`
- `ExcelSheet`
- `ExcelTable`
- `ExcelRow`
- `ExcelColumn`
- `ExcelCell`
- style / image / chart / validation / page setup 等附属结构

### 3.2 语义层

对 `nop-report` 来说，等价目标是:

- `XptWorkbookModel`
- `XptSheetModel`
- `XptCellModel`

### 3.3 codec 内部中间对象

建议在 TypeScript 实现里先定义轻量中间对象，而不是直接把 Java 结构逐字段搬到前端。

```ts
export interface ExcelWorkbookLike {
  props?: Record<string, unknown>;
  styles?: unknown[];
  sheets: ExcelSheetLike[];
  raw?: Record<string, unknown>;
}

export interface ExcelSheetLike {
  id?: string;
  name: string;
  props?: Record<string, unknown>;
  rows?: Record<string, unknown>;
  columns?: Record<string, unknown>;
  cells?: Record<string, ExcelCellLike>;
  merges?: unknown[];
  raw?: Record<string, unknown>;
}

export interface ExcelCellLike {
  id?: string;
  name?: string;
  value?: unknown;
  formula?: string;
  type?: string;
  styleId?: string;
  comment?: string;
  linkUrl?: string;
  protected?: boolean;
  richText?: unknown;
  mergeAcross?: number;
  mergeDown?: number;
  raw?: Record<string, unknown>;
}

export interface XptWorkbookLike {
  model?: Record<string, unknown>;
  sheets?: Record<string, XptSheetLike>;
}

export interface XptSheetLike {
  model?: Record<string, unknown>;
  cells?: Record<string, XptCellLike>;
}

export interface XptCellLike {
  model?: Record<string, unknown>;
}
```

这里的 `raw` 是刻意保留的无损扩展点。

## 4. SpreadsheetDocument 到 Excel 结构层的映射

### 4.1 workbook 映射

`SpreadsheetDocument.workbook` 应映射下列内容:

- `WorkbookDocument.props` -> `ExcelWorkbook.props`
- `WorkbookDocument.styles` -> workbook style definitions
- `WorkbookDocument.sheets[]` -> sheet 列表
- `SpreadsheetDocument.meta` 中属于 workbook 视图层的信息，不应写回领域模型，除非 profile 明确要求

### 4.2 sheet 映射

`WorksheetDocument` 应映射:

- `name`
- `props`
- rows
- columns
- cells
- merges

建议原则:

- `WorksheetDocument.props` 可承载 sheet-level passthrough 信息，例如 page setup、images、charts、annotations、conditional styles、validations
- codec 不要求 UI 当前能理解这些结构，只要能够保留与回写

### 4.3 row / column 映射

前端模型里 row 和 column 用稀疏结构，导出时保持稀疏。

映射关注点:

- `height`
- `width`
- `hidden`
- `styleId`

不建议在 codec 层主动为未出现的行列生成默认结构，避免导出膨胀。

### 4.4 cell 映射

`CellDocument` 与 `ExcelCellLike` 的主映射:

- `value`
- `formula`
- `type`
- `styleId`
- `comment`
- `linkUrl`
- `protected`
- `richText`

此外:

- `CellDocument.address` / `row` / `col` 是前端定位字段
- 导出时 `address` 可用于回写 cell map key，不要求一定写入最终领域对象字段

### 4.5 merge 映射

前端统一用 `MergeRange`。

导出时:

- 若目标模型使用 range list，则直接转换
- 若目标模型使用 `mergeAcross` / `mergeDown` 语义，则由 codec 在 merge anchor cell 上回填

导入时:

- 若源模型是 anchor-cell merge 语义，则先归一化为 `MergeRange[]`

结论是 merge 在前端必须只有一种 canonical 表示，避免双表示导致编辑混乱。

## 5. ReportSemanticDocument 到 XPT 语义层的映射

### 5.1 workbook 级 model

```ts
semantic.workbookMeta['nop-report'].model
  <->
XptWorkbookModel
```

### 5.2 sheet 级 model

```ts
semantic.sheetMeta[sheetId]['nop-report'].model
  <->
XptSheetModel
```

### 5.3 cell 级 model

```ts
semantic.cellMeta[sheetId][address]['nop-report'].model
  <->
XptCellModel
```

### 5.4 推荐字段归类

`nop-report` 的 XPT 字段中，以下应优先被视为通用 property-panel 可编辑字段:

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

codec 责任不是理解这些字段的业务意义，而是保证这些字段在导入导出时位置稳定、命名稳定、未知值不丢失。

## 6. 无损 round-trip 规则

这是 codec 设计里最重要的部分。

### 6.1 unknown field preservation

对于 UI 不能完整理解的字段，codec 应遵循:

- 导入时保存在 `raw` 或 namespaced meta 中
- 导出时优先把这些值原样带回
- 只有当用户明确修改某个字段时，才覆盖该字段

### 6.2 sheet props preservation

`WorksheetDocument.props` 是保真关键点。以下内容应允许整体挂入 props:

- page setup
- page margins
- page breaks
- images
- charts
- annotations
- validations
- sheet options
- protection

即使首版 UI 只编辑其中很少一部分，也不能在导出时丢失其余部分。

### 6.3 cell raw preservation

如果某些 `ExcelCell` 字段不在 `CellDocument` 标准面中，但导入时出现，建议存在:

```ts
cell.raw
```

导出时 merge 回去。

### 6.4 XPT raw preservation

如果某些 `XptCellModel` 字段当前 UI 没有编辑器，也应保留在:

```ts
semantic.cellMeta[sheetId][address]['nop-report'].model
```

不要因为 inspector 没有暴露这些字段，就在导出时重新生成一个裁剪后的 model。

## 7. codec 的输入输出形态

### 7.1 import

推荐两段导入流程:

```ts
external payload
  -> decode external envelope
  -> to ExcelWorkbookLike + XptWorkbookLike
  -> to SpreadsheetDocument + ReportSemanticDocument
  -> to ReportTemplateDocument
```

### 7.2 export

推荐两段导出流程:

```ts
ReportTemplateDocument
  -> SpreadsheetDocument to ExcelWorkbookLike
  -> ReportSemanticDocument to XptWorkbookLike
  -> compose external envelope
  -> serialize for backend
```

这样做的好处是:

- standalone spreadsheet editor 可以只依赖 spreadsheet codec
- report profile 只在需要时叠加 semantic codec
- 更容易单独测试 Excel 结构层和 XPT 语义层

## 8. TemplateCodecAdapter 设计建议

建议把当前合同中的 `TemplateCodecAdapter` 明确为两级接口:

```ts
export interface SpreadsheetCodec {
  importSpreadsheet(input: unknown, context: CodecContext): SpreadsheetDocument;
  exportSpreadsheet(document: SpreadsheetDocument, context: CodecContext): unknown;
}

export interface ReportSemanticCodec {
  importSemantic(input: unknown, context: CodecContext): ReportSemanticDocument | undefined;
  exportSemantic(document: ReportSemanticDocument | undefined, context: CodecContext): unknown;
}

export interface TemplateCodecAdapter {
  id: string;
  importDocument(payload: unknown, context: CodecContext): Promise<ReportTemplateDocument> | ReportTemplateDocument;
  exportDocument(document: ReportTemplateDocument, format: string | undefined, context: CodecContext): Promise<unknown> | unknown;
}

export interface CodecContext {
  profileId?: string;
  kind?: string;
  readonly?: boolean;
}
```

其中 `TemplateCodecAdapter` 可组合 `SpreadsheetCodec + ReportSemanticCodec`，也可以自己做 envelope 解析。

## 9. nop-report codec adapter 建议

建议未来实现拆成:

- `nop-report-spreadsheet-codec`
- `nop-report-semantic-codec`
- `nop-report-xpt-codec`

### 9.1 `nop-report-spreadsheet-codec`

负责:

- `ExcelWorkbookLike -> SpreadsheetDocument`
- `SpreadsheetDocument -> ExcelWorkbookLike`

### 9.2 `nop-report-semantic-codec`

负责:

- `XptWorkbookLike -> ReportSemanticDocument`
- `ReportSemanticDocument -> XptWorkbookLike`

### 9.3 `nop-report-xpt-codec`

负责:

- 解析外部 payload
- 组合 spreadsheet codec 与 semantic codec
- 产出最终后端保存格式或预览 payload

## 10. 地址与 identity 规则

codec 要特别注意 identity 稳定性。

### 10.1 sheet identity

前端不应只依赖 sheet name 作为主键。

建议:

- 前端内部一律使用稳定 `sheetId`
- codec 负责维护 `sheetId <-> external sheet key/name` 的映射

### 10.2 cell identity

前端 cell semantic key 建议统一使用 `address`。

原因:

- 与 inspector、selection、引用选择器更一致
- 便于 `cellMeta[sheetId][address]` 建模

若外部模型使用 row/col 组合或其他 key，codec 负责转换。

### 10.3 rowParent / colParent

`rowParent` / `colParent` 若以地址表达引用，前端应保留其原始表示。

codec 不应擅自把它们解析成复杂对象再重新格式化，除非有专门的规范化规则已经被明确定义。

## 11. 错误处理与降级策略

codec 不是只会成功或失败两种状态。

建议结果模型支持:

```ts
export interface CodecDiagnostic {
  level: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  path?: string;
}

export interface CodecImportResult {
  ok: boolean;
  document?: ReportTemplateDocument;
  diagnostics: CodecDiagnostic[];
}
```

推荐降级策略:

- Excel 结构层失败 -> import 失败
- XPT 语义层部分失败 -> 允许导入 spreadsheet，但把 designer 降级为只读或部分功能受限
- unknown field -> warning，不中断导入

## 12. 测试分层建议

codec 必须有独立测试，而不是只靠 UI 集成测试。

至少需要:

- `SpreadsheetDocument -> ExcelWorkbookLike -> SpreadsheetDocument` round-trip 测试
- `ReportSemanticDocument -> XptWorkbookLike -> ReportSemanticDocument` round-trip 测试
- mixed template import/export 测试
- unknown field preservation 测试
- merge normalization 测试
- sheet props passthrough 测试
- `rowParent` / `colParent` preservation 测试

## 13. 推荐实现顺序

最合理的编码顺序是:

1. 定义 `ExcelWorkbookLike` / `XptWorkbookLike` 中间对象类型
2. 实现 `nop-report-spreadsheet-codec`
3. 实现 `nop-report-semantic-codec`
4. 为两者写 round-trip 测试
5. 实现 `nop-report-xpt-codec` envelope 组装
6. 再接入 preview adapter 与 UI

这样可以在 UI 还没完全完成时，先把最难丢数据的 codec 问题稳定下来。

## 14. 结论

codec 层必须被视为 `Report Designer` 的一等公民，而不是导入导出时顺手写的转换函数。

对 `nop-report` 而言，最合理的 codec 设计是:

- 用 `SpreadsheetDocument` 管 Excel 结构层
- 用 `ReportSemanticDocument` 管 XPT 语义层
- 用 `raw` / props / namespaced meta 保证未知字段保真
- 用分层 codec 代替单一黑盒转换

只有这样，通用设计器、`nop-report` profile、后端模板模型之间才能实现长期稳定的 round-trip。
