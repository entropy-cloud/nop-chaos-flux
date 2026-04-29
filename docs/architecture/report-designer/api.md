# Report Designer API

This file defines the future package/API contract for the Report Designer family.

Implementation status belongs in logs, plans, and focused runtime-snapshot/status docs. The API shapes here should remain the target design even when current code is behind them.

## 1. 包边界

### `@nop-chaos/spreadsheet-core`

负责纯 spreadsheet 编辑运行时。

建议导出:

- `SpreadsheetDocument`
- `WorkbookDocument`
- `WorksheetDocument`
- `CellDocument`
- `SpreadsheetConfig`
- `createSpreadsheetCore()`
- `validateSpreadsheetConfig()`
- `migrateSpreadsheetDocument()`
- `createSpreadsheetMigrationRegistry()`

### `@nop-chaos/spreadsheet-renderers`

负责和 `SchemaRenderer` 集成。

建议导出:

- `spreadsheetRendererDefinitions`
- `registerSpreadsheetRenderers(registry)`
- `createSpreadsheetRegistry()`
- `createSpreadsheetActionProvider(...)`
- `mountSpreadsheetNamespaces(actionScope, ...)`

### `@nop-chaos/report-designer-core`

负责通用报表设计语义。

建议导出:

- `ReportTemplateDocument`
- `ReportSemanticDocument`
- `ReportDesignerConfig`
- `FieldSourceConfig`
- `ReportInspectorConfig`
- `ExpressionEditorAdapter`
- `createReportDesignerCore()`
- `registerReportDesignerAdapter()`
- `validateReportDesignerConfig()`
- `migrateReportTemplateDocument()`

### `@nop-chaos/report-designer-renderers`

负责和 `SchemaRenderer` 集成。

建议导出:

- `reportDesignerRendererDefinitions`
- `registerReportDesignerRenderers(registry)`
- `createReportDesignerRegistry()`
- `createReportDesignerActionProvider(...)`
- `mountReportDesignerNamespaces(actionScope, ...)`

## 2. `spreadsheet-page` Schema

```ts
interface SpreadsheetPageSchema {
  type: 'spreadsheet-page'
  id?: string
  title?: string
  document: SpreadsheetDocumentInput
  config?: SpreadsheetConfig
  readOnly?: boolean
  statusPath?: string
  toolbar?: SchemaInput
  body?: SchemaInput
  dialogs?: SchemaInput
}
```

`spreadsheet-page` 是 standalone workbook 编辑器入口，负责:

- 初始化 spreadsheet runtime
- 将 spreadsheet runtime 注入固定宿主 scope
- 渲染 `toolbar`、`body`、`dialogs` 区域；未覆盖 `body` 时由 renderer 提供默认 spreadsheet canvas
- 在 page-owned `ActionScope` 上注册 `spreadsheet:*` namespace
- 通过 `statusPath` 向宿主发布窄只读状态摘要

## 3. `report-designer-page` Schema

```ts
interface ReportDesignerPageSchema {
  type: 'report-designer-page'
  id?: string
  title?: string
  document: ReportTemplateDocumentInput
  spreadsheet?: SpreadsheetConfig
  designer: ReportDesignerConfig
  profile?: ReportDesignerProfile
  adapters?: ReportDesignerAdapterConfig
  statusPath?: string
  toolbar?: SchemaInput
  fieldPanel?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
  body?: SchemaInput
}
```

`report-designer-page` 负责:

- 初始化 spreadsheet runtime 与 report designer runtime
- 注入字段面板、metadata、selection 和 preview 相关宿主 scope
- 渲染 `fieldPanel`、`body`、`inspector`、`toolbar`、`dialogs` 等工作台区域；未覆盖时由 renderer 提供默认 field panel / canvas / inspector
- 在 page-owned `ActionScope` 上注册 `spreadsheet:*` 与 `report-designer:*` namespace
- 通过 `statusPath` 向宿主发布窄只读状态摘要

## 1.1 Action Namespace Ownership

Report/Spreadsheet family 的 action 扩展应遵循词法 `ActionScope` owner 模型，而不是全局 runtime action registry。

推荐边界：

- page renderer / host 创建 provider
- page renderer / host 通过 `actionScope.registerNamespace(...)` 挂载 `spreadsheet` / `report-designer` namespace
- provider 再把 namespaced action 调用桥接到 spreadsheet core 或 report designer core

不推荐作为长期 owner contract 的写法：

- `registerSpreadsheetActions(runtime)`
- `registerReportDesignerActions(runtime)`
- 全局 mutable action handler registry

## 4. Bridge Contract

`spreadsheet-page` 和 `report-designer-page` 都需要建立 runtime 与 schema runtime 的 bridge。

推荐最小接口:

```ts
interface SpreadsheetBridge {
  getSnapshot(): SpreadsheetHostSnapshot
  subscribe(listener: () => void): () => void
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>
}

interface ReportDesignerBridge extends SpreadsheetBridge {
  getDesignerSnapshot(): ReportDesignerHostSnapshot
  dispatchDesigner(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>
}
```

约束:

- schema 片段只读 bridge snapshot，不直接改底层 store
- spreadsheet 写操作必须通过 `dispatch(command)` 或映射后的 `spreadsheet:*` action
- report 语义写操作必须通过 `dispatchDesigner(command)` 或映射后的 `report-designer:*` action

## 5. 固定宿主 Scope

### `spreadsheet-page` 暴露

#### `workbook`

当前 workbook 快照。

#### `activeSheet`

当前激活 sheet。

#### `selection`

当前选区摘要。最小稳定要求是宿主 scope 能表达当前 selection target；更细的拆分字段可以按宿主快照演进。

#### `runtime`

只读运行时摘要，至少应覆盖 `canUndo`、`canRedo`、`dirty` 与视口/模式类字段。

### `report-designer-page` 额外暴露

#### `designer`

只读 designer 运行时摘要。

#### `fieldSources`

字段源与当前拖拽态摘要。

#### `meta`

当前 selection target 对应的语义 metadata 快照。

#### `preview`

当前预览状态摘要。

## 6. Spreadsheet Actions

### `spreadsheet:setActiveSheet`

```ts
{
  action: 'spreadsheet:setActiveSheet',
  sheetId: string
}
```

### `spreadsheet:setSelection`

```ts
{
  action: 'spreadsheet:setSelection',
  sheetId: string,
  range: {
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  }
}
```

### `spreadsheet:setCellValue`

```ts
{
  action: 'spreadsheet:setCellValue',
  sheetId: string,
  address: string,
  value: unknown
}
```

### `spreadsheet:setCellStyle`

```ts
{
  action: 'spreadsheet:setCellStyle',
  sheetId: string,
  address: string,
  styleId: string
}
```

### `spreadsheet:resizeRow`

```ts
{
  action: 'spreadsheet:resizeRow',
  sheetId: string,
  row: number,
  height: number
}
```

### `spreadsheet:resizeColumn`

```ts
{
  action: 'spreadsheet:resizeColumn',
  sheetId: string,
  col: number,
  width: number
}
```

### `spreadsheet:mergeRange`

```ts
{
  action: 'spreadsheet:mergeRange',
  sheetId: string,
  range: {
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  }
}
```

### 其他建议内建动作

- `spreadsheet:unmergeRange`
- `spreadsheet:hideRow`
- `spreadsheet:hideColumn`
- `spreadsheet:addSheet`
- `spreadsheet:removeSheet`
- `spreadsheet:undo`
- `spreadsheet:redo`

## 7. Report Designer Actions

### `report-designer:dropFieldToTarget`

```ts
{
  action: 'report-designer:dropFieldToTarget',
  field: {
    sourceId: string,
    fieldId: string,
    payload?: Record<string, unknown>
  },
  target: {
    kind: 'cell' | 'range',
    sheetId: string,
    address?: string,
    range?: {
      startRow: number,
      startCol: number,
      endRow: number,
      endCol: number
    }
  }
}
```

### `report-designer:updateMeta`

```ts
{
  action: 'report-designer:updateMeta',
  target: {
    kind: 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range',
    sheetId?: string,
    key?: string
  },
  patch: Record<string, unknown>
}
```

### `report-designer:openInspector`

```ts
{
  action: 'report-designer:openInspector',
  target?: {
    kind: 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range',
    sheetId?: string,
    key?: string
  }
}
```

### `report-designer:preview`

```ts
{
  action: 'report-designer:preview',
  mode?: 'inline' | 'dialog' | 'replace-page' | 'download',
  args?: Record<string, unknown>
}
```

### 其他建议内建动作

- `report-designer:closeInspector`
- `report-designer:importTemplate`
- `report-designer:exportTemplate`

## 8. Renderers

建议的 renderer 类型:

- `spreadsheet-page`
- `spreadsheet-canvas`
- `spreadsheet-toolbar-shell`
- `report-designer-page`
- `report-field-panel`
- `report-inspector-shell`

其中:

- `spreadsheet-canvas` 负责 canvas 与 DOM overlay editor 的集成
- `report-field-panel` 负责字段源展示与拖拽
- inspector 内部表单仍优先使用已有 form renderer

## 9. ExpressionEditorAdapter API

当前阶段只定义接入接口:

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
```

说明:

- `Report Designer` 只关心如何嵌入表达式编辑器
- 不关心表达式语言实现细节
- 未来可由独立表达式编辑器包扩展自动补全、诊断、格式化等高级能力

## 10. nop-report 适配示意

未来若接入 `nop-report`，建议的使用形态类似:

```ts
import { registerSpreadsheetRenderers } from '@nop-chaos/spreadsheet-renderers'
import { registerReportDesignerRenderers } from '@nop-chaos/report-designer-renderers'

registerSpreadsheetRenderers(registry)
registerReportDesignerRenderers(registry)
```

然后在 `report-designer-page` 中通过:

- `designer.kind = 'nop-report'`
- `fieldSources.provider = 'nop-report-datasets'`
- `inspector.providers = ['nop-report-cell-panel', 'nop-report-sheet-panel']`
- `preview.provider = 'nop-report-preview'`

把通用设计器收敛到具体模型。
