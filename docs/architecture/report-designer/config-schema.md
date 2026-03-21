# Report Designer 配置模型

本文档描述新的 `Spreadsheet Editor` 和 `Report Designer` 配置模型。重点不是再发明一套页面 schema，而是定义 spreadsheet/report 领域 config，并把 UI 片段嵌入现有 schema renderer。

## 1. 总体分层

存在两种根输入:

- `spreadsheet-page` schema: standalone workbook 编辑器
- `report-designer-page` schema: 在 workbook 编辑器之上叠加字段面板、metadata 与 inspector

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

## 2. SpreadsheetDocument

`SpreadsheetDocument` 只表达通用 workbook 结构。

```ts
interface SpreadsheetDocument {
  id: string
  kind: string
  name: string
  version: string
  meta?: Record<string, unknown>
  viewport?: {
    scrollX: number
    scrollY: number
    zoom: number
  }
  workbook: WorkbookDocument
}

interface WorkbookDocument {
  id?: string
  name?: string
  props?: Record<string, unknown>
  styles?: StyleDefinition[]
  sheets: WorksheetDocument[]
}

interface WorksheetDocument {
  id: string
  name: string
  order: number
  props?: Record<string, unknown>
  rows?: Record<string, RowDocument>
  columns?: Record<string, ColumnDocument>
  cells?: Record<string, CellDocument>
  merges?: MergeRange[]
}

interface RowDocument {
  index: number
  height?: number
  hidden?: boolean
  styleId?: string
}

interface ColumnDocument {
  index: number
  width?: number
  hidden?: boolean
  styleId?: string
}

interface CellDocument {
  address: string
  row: number
  col: number
  value?: unknown
  formula?: string
  type?: string
  styleId?: string
  comment?: string
  linkUrl?: string
  protected?: boolean
  richText?: unknown
}

interface MergeRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}
```

说明:

- cell、row、column 都推荐使用稀疏存储
- `props` 允许挂少量通用扩展数据
- 不在这里引入报表语义字段

## 3. SpreadsheetConfig

```ts
interface SpreadsheetConfig {
  version?: string
  features?: SpreadsheetFeatures
  canvas?: SpreadsheetCanvasConfig
  editors?: SpreadsheetEditorConfig[]
  shortcuts?: SpreadsheetShortcutConfig[]
}
```

### 3.1 `SpreadsheetFeatures`

```ts
interface SpreadsheetFeatures {
  multiSheet?: boolean
  editCell?: boolean
  resizeRow?: boolean
  resizeColumn?: boolean
  merge?: boolean
  hiddenRowColumn?: boolean
  styleEditing?: boolean
  clipboard?: boolean
  undo?: boolean
  redo?: boolean
  formulas?: boolean
  frozenPane?: boolean
}
```

### 3.2 `SpreadsheetCanvasConfig`

```ts
interface SpreadsheetCanvasConfig {
  minZoom?: number
  maxZoom?: number
  defaultZoom?: number
  showGridLines?: boolean
  showRowHeaders?: boolean
  showColumnHeaders?: boolean
  showSheetTabs?: boolean
  overscanRows?: number
  overscanCols?: number
}
```

### 3.3 `SpreadsheetEditorConfig`

```ts
interface SpreadsheetEditorConfig {
  id: string
  match: {
    valueType?: string[]
    cellType?: string[]
  }
  kind: 'input' | 'textarea' | 'custom'
  customRenderer?: string
}
```

## 4. ReportTemplateDocument

`Report Designer` 在 `SpreadsheetDocument` 之上叠加通用语义层。

```ts
interface ReportTemplateDocument {
  id: string
  kind: string
  name: string
  version: string
  spreadsheet: SpreadsheetDocument
  semantic?: ReportSemanticDocument
}

interface ReportSemanticDocument {
  workbookMeta?: Record<string, unknown>
  sheetMeta?: Record<string, Record<string, unknown>>
  rowMeta?: Record<string, Record<string, Record<string, unknown>>>
  columnMeta?: Record<string, Record<string, Record<string, unknown>>>
  cellMeta?: Record<string, Record<string, Record<string, unknown>>>
  rangeMeta?: Record<string, RangeMetaDocument[]>
}

interface RangeMetaDocument {
  id: string
  range: {
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }
  meta: Record<string, unknown>
}
```

说明:

- 这里不写死 `nop-report` 的字段名
- 通用设计器只要求 metadata 可定位、可编辑、可持久化
- 具体语义由外部 profile 或 adapter 决定

## 5. ReportDesignerConfig

```ts
interface ReportDesignerConfig {
  $schema?: string
  version: string
  kind: string
  fieldSources?: FieldSourceConfig[]
  inspector?: ReportInspectorConfig
  preview?: ReportPreviewConfig
  expressions?: ExpressionEditorBindingConfig
  adapters?: ReportDesignerAdapterConfig
  features?: ReportDesignerFeatures
}
```

说明:

- `kind` 用于标识报表模板类型或 profile，例如 `generic-report`、`nop-report`
- `fieldSources` 定义左侧字段面板
- `inspector` 定义右侧属性面板如何匹配与渲染
- `preview` 定义预览集成边界
- `expressions` 定义表达式编辑器适配入口

## 6. 字段源配置

```ts
interface FieldSourceConfig {
  id: string
  label: string
  description?: string
  mode?: 'tree' | 'list'
  provider?: string
  groups?: FieldGroupConfig[]
  itemTemplate?: SchemaInput
  dragPayload?: {
    type: string
    include?: string[]
  }
}

interface FieldGroupConfig {
  id: string
  label: string
  fields: FieldItemConfig[]
  expanded?: boolean
}

interface FieldItemConfig {
  id: string
  label: string
  path?: string
  fieldType?: string
  meta?: Record<string, unknown>
}
```

建议约束:

- 字段面板可由静态配置生成，也可由外部 provider 动态生成
- 拖拽时必须产出标准化 payload
- payload 只表达字段信息，不直接表达如何写入某个具体后端模型

## 7. inspector 配置

右侧属性面板必须外部可定制，因此 inspector 不采用固定字段列表，而采用匹配规则 + panel provider。

```ts
interface ReportInspectorConfig {
  mode?: 'panel' | 'drawer'
  providers: InspectorProviderConfig[]
}

interface InspectorProviderConfig {
  id: string
  label?: string
  match: SelectionTargetMatch
  priority?: number
  body?: SchemaInput
  provider?: string
  submitAction?: Record<string, unknown>
}

interface SelectionTargetMatch {
  kinds: Array<'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range'>
  when?: string
}
```

说明:

- `body` 允许直接嵌入 schema 片段
- `provider` 允许引用外部动态 panel provider
- 多个 provider 可以组合为不同页签或分组
- `when` 是附加匹配条件，表达式语义后续由现有表达式编译体系或适配器处理

## 8. preview 配置

```ts
interface ReportPreviewConfig {
  provider?: string
  action?: Record<string, unknown>
  modes?: Array<'inline' | 'dialog' | 'replace-page' | 'download'>
}
```

说明:

- 通用设计器只定义 preview 触发边界
- 不内建 `nop-report` 的预览返回格式

## 9. 表达式编辑器绑定配置

根据前置决定，当前文档只定义表达式编辑器适配接口，不固定表达式语言协议。

```ts
interface ExpressionEditorBindingConfig {
  adapter: string
  fieldKinds?: string[]
}
```

属性面板中的字段若标记为表达式类输入，则通过该 adapter 渲染。

## 10. ExpressionEditorAdapter 抽象接口

```ts
interface ExpressionEditorAdapter {
  id: string
  render(props: ExpressionEditorProps): React.ReactNode
}

interface ExpressionEditorProps {
  value: string
  readonly?: boolean
  disabled?: boolean
  placeholder?: string
  context?: ExpressionEditorContext
  onChange(nextValue: string): void
  onBlur?(): void
}

interface ExpressionEditorContext {
  targetKind: 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range'
  scopeData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
```

刻意不在当前阶段固定:

- 表达式语言
- 诊断结构
- 自动补全协议
- 引用选择模型

这些属于后续独立调研范围。

## 11. ReportDesignerFeatures

```ts
interface ReportDesignerFeatures {
  fieldPanel?: boolean
  inspector?: boolean
  preview?: boolean
  expressionEditor?: boolean
  dragFieldToCell?: boolean
  dragFieldToRange?: boolean
  customPropertyPanels?: boolean
}
```

## 12. 版本迁移约束

`SpreadsheetDocument.version` 与 `ReportTemplateDocument.version` 都必须参与迁移协议。

建议约束:

- spreadsheet 与 report semantic 的迁移分开建模
- 迁移按显式 `from -> to` 链顺序执行
- 迁移失败时返回结构化错误，调用方可选择中断或只读降级

## 13. 与 nop-report 的适配方式

`nop-report` 不应改变通用配置模型，只应通过下列方式接入:

- `kind: 'nop-report'`
- 专用 `fieldSources` provider
- 专用 inspector providers
- 专用 preview provider
- 专用 import/export adapter
- 专用 metadata 映射器，把通用 `cellMeta` 等结构映射到 `ExcelWorkbook + Xpt*Model`
