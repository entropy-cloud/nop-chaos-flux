# Report Designer 合同草案

本文档把 `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/config-schema.md` 和 `docs/architecture/report-designer/api.md` 中的抽象设计，收敛为更接近未来 TypeScript 实现的接口草案。

它仍然不是最终代码合同，但目标是:

- 帮助后续拆分 package 与文件边界
- 明确 spreadsheet core 与 report-designer core 的最小实现面
- 明确哪些接口属于通用设计器，哪些应该由外部 profile 或 adapter 提供

## 1. Package 级边界

建议未来包结构如下:

```text
packages/
  spreadsheet-core/
  spreadsheet-renderers/
  report-designer-core/
  report-designer-renderers/
  expression-editor/            // 后续独立问题，当前只预留边界
```

职责划分:

- `spreadsheet-core` - 通用 workbook 编辑运行时
- `spreadsheet-renderers` - `SchemaRenderer` 集成层
- `report-designer-core` - 字段拖拽、metadata、inspector 匹配、preview、adapter 管理
- `report-designer-renderers` - `report-designer-page` renderer 与壳层

## 2. Spreadsheet Core 合同

### 2.1 文档模型

```ts
export interface SpreadsheetDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  viewport?: SpreadsheetViewportSnapshot;
  workbook: WorkbookDocument;
}

export interface SpreadsheetViewportSnapshot {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface WorkbookDocument {
  id?: string;
  name?: string;
  props?: Record<string, unknown>;
  styles?: StyleDefinition[];
  sheets: WorksheetDocument[];
}

export interface WorksheetDocument {
  id: string;
  name: string;
  order: number;
  props?: Record<string, unknown>;
  rows?: Record<string, RowDocument>;
  columns?: Record<string, ColumnDocument>;
  cells?: Record<string, CellDocument>;
  merges?: MergeRange[];
}

export interface RowDocument {
  index: number;
  height?: number;
  hidden?: boolean;
  styleId?: string;
}

export interface ColumnDocument {
  index: number;
  width?: number;
  hidden?: boolean;
  styleId?: string;
}

export interface CellDocument {
  address: string;
  row: number;
  col: number;
  value?: unknown;
  formula?: string;
  type?: string;
  styleId?: string;
  comment?: string;
  linkUrl?: string;
  protected?: boolean;
  richText?: unknown;
}

export interface MergeRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}
```

### 2.2 运行时快照

```ts
export interface SpreadsheetRuntimeSnapshot {
  document: SpreadsheetDocument;
  activeSheetId: string;
  selection: SpreadsheetSelection;
  editing?: SpreadsheetEditingState;
  history: SpreadsheetHistoryState;
  viewport: SpreadsheetViewportSnapshot;
  layout: SpreadsheetLayoutSummary;
  readonly: boolean;
  dirty: boolean;
}

export interface SpreadsheetHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
}

export interface SpreadsheetLayoutSummary {
  visibleRange: SpreadsheetRange;
  frozen?: SpreadsheetFrozenPane;
}

export interface SpreadsheetFrozenPane {
  row?: number;
  col?: number;
}
```

### 2.3 选中与编辑状态

```ts
export type SpreadsheetSelectionKind = 'none' | 'cell' | 'range' | 'row' | 'column' | 'sheet';

export interface SpreadsheetSelection {
  kind: SpreadsheetSelectionKind;
  sheetId?: string;
  anchor?: SpreadsheetCellRef;
  range?: SpreadsheetRange;
  rows?: number[];
  columns?: number[];
}

export interface SpreadsheetCellRef {
  sheetId: string;
  address: string;
  row: number;
  col: number;
}

export interface SpreadsheetRange {
  sheetId: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SpreadsheetEditingState {
  cell: SpreadsheetCellRef;
  editorId: string;
  initialValue: unknown;
  draftValue: unknown;
}
```

### 2.4 命令模型

```ts
export type SpreadsheetCommand =
  | SetActiveSheetCommand
  | SetSelectionCommand
  | SetCellValueCommand
  | SetCellFormulaCommand
  | SetCellStyleCommand
  | ResizeRowCommand
  | ResizeColumnCommand
  | MergeRangeCommand
  | UnmergeRangeCommand
  | HideRowCommand
  | HideColumnCommand
  | AddSheetCommand
  | RemoveSheetCommand
  | BeginSpreadsheetTransactionCommand
  | CommitSpreadsheetTransactionCommand
  | RollbackSpreadsheetTransactionCommand
  | UndoSpreadsheetCommand
  | RedoSpreadsheetCommand;

export interface SpreadsheetCommandBase {
  type: string;
  transactionId?: string;
  source?: 'user' | 'toolbar' | 'shortcut' | 'inspector' | 'adapter' | 'import';
}

export interface SetActiveSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setActiveSheet';
  sheetId: string;
}

export interface SetSelectionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setSelection';
  selection: SpreadsheetSelection;
}

export interface SetCellValueCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellValue';
  cell: SpreadsheetCellRef;
  value: unknown;
}

export interface SetCellFormulaCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellFormula';
  cell: SpreadsheetCellRef;
  formula?: string;
}

export interface SetCellStyleCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellStyle';
  target: SpreadsheetCellRef | SpreadsheetRange;
  styleId: string;
}

export interface ResizeRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:resizeRow';
  sheetId: string;
  row: number;
  height: number;
}

export interface ResizeColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:resizeColumn';
  sheetId: string;
  col: number;
  width: number;
}

export interface MergeRangeCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:mergeRange';
  range: SpreadsheetRange;
}

export interface UnmergeRangeCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:unmergeRange';
  range: SpreadsheetRange;
}

export interface HideRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:hideRow';
  sheetId: string;
  row: number;
  hidden: boolean;
}

export interface HideColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:hideColumn';
  sheetId: string;
  col: number;
  hidden: boolean;
}

export interface AddSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:addSheet';
  name?: string;
  index?: number;
}

export interface RemoveSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:removeSheet';
  sheetId: string;
}

export interface BeginSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:beginTransaction';
  label?: string;
}

export interface CommitSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:commitTransaction';
}

export interface RollbackSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:rollbackTransaction';
}

export interface UndoSpreadsheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:undo';
}

export interface RedoSpreadsheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:redo';
}

export interface SpreadsheetCommandResult {
  ok: boolean;
  changed: boolean;
  error?: unknown;
}
```

### 2.5 Core 对外接口

```ts
export interface SpreadsheetCore {
  getSnapshot(): SpreadsheetRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
  replaceDocument(nextDocument: SpreadsheetDocument): void;
  exportDocument(): SpreadsheetDocument;
}

export interface CreateSpreadsheetCoreOptions {
  document: SpreadsheetDocument;
  config?: SpreadsheetConfig;
  readonly?: boolean;
}
```

## 3. Spreadsheet Renderer 合同

### 3.1 宿主快照

```ts
export interface SpreadsheetHostSnapshot {
  workbook: WorkbookDocument;
  activeSheet?: WorksheetDocument;
  selection: SpreadsheetSelection;
  activeCell?: SpreadsheetCellRef;
  activeRange?: SpreadsheetRange;
  runtime: {
    canUndo: boolean;
    canRedo: boolean;
    readonly: boolean;
    dirty: boolean;
    zoom: number;
  };
}
```

### 3.2 Bridge

```ts
export interface SpreadsheetBridge {
  getSnapshot(): SpreadsheetHostSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
}
```

## 4. Report Designer Core 合同

### 4.1 语义文档模型

```ts
export interface ReportTemplateDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  spreadsheet: SpreadsheetDocument;
  semantic?: ReportSemanticDocument;
}

export interface ReportSemanticDocument {
  workbookMeta?: MetadataBag;
  sheetMeta?: Record<string, MetadataBag>;
  rowMeta?: Record<string, Record<string, MetadataBag>>;
  columnMeta?: Record<string, Record<string, MetadataBag>>;
  cellMeta?: Record<string, Record<string, MetadataBag>>;
  rangeMeta?: Record<string, RangeMetaDocument[]>;
}

export interface RangeMetaDocument {
  id: string;
  range: SpreadsheetRange;
  meta: MetadataBag;
}

export interface MetadataBag {
  [key: string]: unknown;
}
```

### 4.2 选中目标模型

```ts
export type ReportSelectionTargetKind = 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range';

export type ReportSelectionTarget =
  | { kind: 'workbook' }
  | { kind: 'sheet'; sheetId: string }
  | { kind: 'row'; sheetId: string; row: number }
  | { kind: 'column'; sheetId: string; col: number }
  | { kind: 'cell'; cell: SpreadsheetCellRef }
  | { kind: 'range'; range: SpreadsheetRange };
```

### 4.3 字段源模型

```ts
export interface FieldSourceSnapshot {
  id: string;
  label: string;
  groups: FieldGroupSnapshot[];
}

export interface FieldGroupSnapshot {
  id: string;
  label: string;
  fields: FieldItemSnapshot[];
  expanded: boolean;
}

export interface FieldItemSnapshot {
  id: string;
  label: string;
  path?: string;
  fieldType?: string;
  meta?: Record<string, unknown>;
}

export interface FieldDragState {
  active: boolean;
  sourceId?: string;
  fieldId?: string;
  payload?: FieldDragPayload;
  hoverTarget?: ReportSelectionTarget;
}

export interface FieldDragPayload {
  type: string;
  sourceId: string;
  fieldId: string;
  data: Record<string, unknown>;
}
```

### 4.4 命令模型

```ts
export type ReportDesignerCommand =
  | DropFieldToTargetCommand
  | UpdateReportMetaCommand
  | ReplaceReportMetaCommand
  | OpenInspectorCommand
  | CloseInspectorCommand
  | PreviewReportCommand
  | ImportTemplateCommand
  | ExportTemplateCommand;

export interface ReportDesignerCommandBase {
  type: string;
  source?: 'user' | 'toolbar' | 'field-panel' | 'inspector' | 'adapter';
}

export interface DropFieldToTargetCommand extends ReportDesignerCommandBase {
  type: 'report-designer:dropFieldToTarget';
  field: FieldDragPayload;
  target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
}

export interface UpdateReportMetaCommand extends ReportDesignerCommandBase {
  type: 'report-designer:updateMeta';
  target: ReportSelectionTarget;
  patch: MetadataBag;
}

export interface ReplaceReportMetaCommand extends ReportDesignerCommandBase {
  type: 'report-designer:replaceMeta';
  target: ReportSelectionTarget;
  nextMeta: MetadataBag;
}

export interface OpenInspectorCommand extends ReportDesignerCommandBase {
  type: 'report-designer:openInspector';
  target?: ReportSelectionTarget;
}

export interface CloseInspectorCommand extends ReportDesignerCommandBase {
  type: 'report-designer:closeInspector';
}

export interface PreviewReportCommand extends ReportDesignerCommandBase {
  type: 'report-designer:preview';
  mode?: 'inline' | 'dialog' | 'replace-page' | 'download';
  args?: Record<string, unknown>;
}

export interface ImportTemplateCommand extends ReportDesignerCommandBase {
  type: 'report-designer:importTemplate';
  payload: unknown;
}

export interface ExportTemplateCommand extends ReportDesignerCommandBase {
  type: 'report-designer:exportTemplate';
  format?: string;
}

export interface ReportDesignerCommandResult {
  ok: boolean;
  changed: boolean;
  error?: unknown;
  data?: unknown;
}
```

### 4.5 Runtime 快照

```ts
export interface ReportDesignerRuntimeSnapshot {
  document: ReportTemplateDocument;
  selectionTarget?: ReportSelectionTarget;
  activeMeta?: MetadataBag;
  inspector: {
    open: boolean;
    providerIds: string[];
  };
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  preview: {
    running: boolean;
    mode?: string;
    lastResult?: unknown;
  };
}
```

### 4.6 Core 对外接口

```ts
export interface ReportDesignerCore {
  getSnapshot(): ReportDesignerRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
  getMetadata(target: ReportSelectionTarget): MetadataBag | undefined;
  setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void;
  exportDocument(): ReportTemplateDocument;
}

export interface CreateReportDesignerCoreOptions {
  document: ReportTemplateDocument;
  spreadsheet: SpreadsheetCore;
  config: ReportDesignerConfig;
  adapters?: ReportDesignerAdapterRegistry;
}
```

### 4.7 inspector runtime state

```ts
export interface InspectorRuntimeState {
  open: boolean;
  activePanelId?: string;
  panelIds: string[];
  loading: boolean;
  error?: unknown;
}
```

## 5. Report Designer Adapter 合同

设计器的通用性主要由 adapter 保证，而不是由 core 认识某一个后端模型。

### 5.1 字段源 provider

```ts
export interface FieldSourceProvider {
  id: string;
  load(context: ReportDesignerAdapterContext): Promise<FieldSourceSnapshot[]> | FieldSourceSnapshot[];
}
```

### 5.2 inspector provider

```ts
export interface InspectorPanelDescriptor {
  id: string;
  title: string;
  targetKind: ReportSelectionTargetKind;
  group?: string;
  order?: number;
  mode?: 'tab' | 'section' | 'inline';
  body: SchemaInput;
  submitAction?: Record<string, unknown>;
  readonly?: boolean;
  badge?: string;
}

export interface InspectorProvider {
  id: string;
  match(target: ReportSelectionTarget, context: ReportDesignerAdapterContext): boolean;
  getPanels(context: InspectorPanelContext): InspectorPanelDescriptor[] | Promise<InspectorPanelDescriptor[]>;
  priority?: number;
}

export interface InspectorPanelContext {
  target: ReportSelectionTarget;
  metadata?: MetadataBag;
  designer: ReportDesignerRuntimeSnapshot;
  spreadsheet: SpreadsheetRuntimeSnapshot;
}
```

### 5.3 字段拖放映射器

```ts
export interface FieldDropAdapter {
  id: string;
  canHandle(field: FieldDragPayload, target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>): boolean;
  mapDropToMetaPatch(args: {
    field: FieldDragPayload;
    target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
    currentMeta?: MetadataBag;
    context: ReportDesignerAdapterContext;
  }): MetadataBag;
}
```

### 5.4 preview adapter

```ts
export interface PreviewAdapter {
  id: string;
  preview(args: {
    document: ReportTemplateDocument;
    mode?: string;
    params?: Record<string, unknown>;
    context: ReportDesignerAdapterContext;
  }): Promise<PreviewResult>;
}

export interface PreviewResult {
  ok: boolean;
  mode?: string;
  data?: unknown;
  error?: unknown;
}
```

### 5.5 import/export adapter

```ts
export interface TemplateCodecAdapter {
  id: string;
  importDocument(payload: unknown, context: ReportDesignerAdapterContext): Promise<ReportTemplateDocument> | ReportTemplateDocument;
  exportDocument(document: ReportTemplateDocument, format: string | undefined, context: ReportDesignerAdapterContext): Promise<unknown> | unknown;
}
```

### 5.6 expression editor adapter

```ts
export interface ExpressionEditorAdapter {
  id: string;
  render(props: ExpressionEditorProps): React.ReactNode;
}

export interface ExpressionEditorProps {
  value: string;
  readonly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  context?: ExpressionEditorContext;
  onChange(nextValue: string): void;
  onBlur?(): void;
}

export interface ExpressionEditorContext {
  targetKind: ReportSelectionTargetKind;
  scopeData?: Record<string, unknown>;
  metadata?: MetadataBag;
}
```

### 5.7 reference picker adapter

```ts
export interface ReferencePickerAdapter {
  id: string;
  pick(context: ReferencePickerContext): Promise<string | undefined>;
}

export interface ReferencePickerContext {
  targetKind: ReportSelectionTargetKind;
  allowedKinds?: Array<'cell' | 'range' | 'row' | 'column'>;
}
```

### 5.8 inspector value adapter

```ts
export interface InspectorValueAdapter {
  id: string;
  read(target: ReportSelectionTarget, context: InspectorPanelContext): Record<string, unknown>;
  write(values: Record<string, unknown>, target: ReportSelectionTarget, context: InspectorPanelContext): InspectorWritePlan;
}

export interface InspectorWritePlan {
  actions: Array<Record<string, unknown>>;
}
```

## 6. Adapter Registry 合同

```ts
export interface ReportDesignerAdapterRegistry {
  fieldSources: Map<string, FieldSourceProvider>;
  inspectors: Map<string, InspectorProvider>;
  fieldDrops: Map<string, FieldDropAdapter>;
  previews: Map<string, PreviewAdapter>;
  codecs: Map<string, TemplateCodecAdapter>;
  expressions: Map<string, ExpressionEditorAdapter>;
  references: Map<string, ReferencePickerAdapter>;
  inspectorValues: Map<string, InspectorValueAdapter>;
}
```

## 7. Report Designer Renderer 合同

### 7.1 宿主快照

```ts
export interface ReportDesignerHostSnapshot extends SpreadsheetHostSnapshot {
  designer: {
    kind: string;
    dirty: boolean;
    inspector: InspectorRuntimeState;
  };
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  meta?: MetadataBag;
  preview: {
    running: boolean;
    mode?: string;
  };
}
```

### 7.2 Bridge

```ts
export interface ReportDesignerBridge extends SpreadsheetBridge {
  getDesignerSnapshot(): ReportDesignerHostSnapshot;
  dispatchDesigner(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
  emit(event: ReportDesignerEvent): void;
}
```

### 7.3 事件模型

```ts
export type ReportDesignerEvent =
  | { type: 'report-designer:fieldDragStart'; payload: FieldDragState }
  | { type: 'report-designer:fieldDragEnd'; payload: FieldDragState }
  | { type: 'report-designer:selectionTargetChanged'; payload: ReportSelectionTarget | undefined }
  | { type: 'report-designer:previewStarted'; payload: { mode?: string } }
  | { type: 'report-designer:previewFinished'; payload: PreviewResult };
```

## 8. AMIS 集成建议

未来 renderer 组件建议遵循以下边界:

- `spreadsheet-page` 负责创建 `SpreadsheetCore` 与 `SpreadsheetBridge`
- `report-designer-page` 负责创建 `ReportDesignerCore` 与 `ReportDesignerBridge`
- 左侧字段面板与右侧 inspector 的实际 UI 仍尽量通过现有 `SchemaRenderer` 渲染
- 表达式字段通过 `ExpressionEditorAdapter` 注入，不在 renderer 层特判某一种表达式实现
- inspector shell 负责 tabs/sections/空态/只读态/错误态，provider 只负责产出 panel descriptors

## 9. `nop-report` Profile 如何落位

`nop-report` 适配应只表现为一组 adapter 和 profile 配置，例如:

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

这样 `nop-report` 的实现可以独立决定:

- 如何把 dataset/field 拖拽映射到 cell metadata
- 如何把 metadata round-trip 到 `ExcelWorkbook + Xpt*Model`
- 如何组织 workbook/sheet/cell 的 inspector 页面
- 如何发起 preview/import/export

而不要求通用设计器 core 直接理解 `field`、`ds`、`expandType` 等领域字段。

## 10. 当前最重要的落地优先级

如果开始实现，建议先把下面这些合同真正固化为 TypeScript:

1. `SpreadsheetDocument`、`SpreadsheetSelection`、`SpreadsheetCommand`
2. `SpreadsheetCore`、`SpreadsheetBridge`
3. `ReportSelectionTarget`、`ReportSemanticDocument`、`ReportDesignerCommand`
4. `FieldSourceProvider`、`InspectorProvider`、`FieldDropAdapter`
5. `ExpressionEditorAdapter`
6. `ReferencePickerAdapter`、`InspectorValueAdapter`

原因是这五组接口已经足够支撑:

- standalone spreadsheet MVP
- report-designer shell MVP
- 左拖右编的基础交互
- 后续 `nop-report` profile 的独立接入
