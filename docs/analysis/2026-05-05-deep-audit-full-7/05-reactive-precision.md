# 维度 05《响应式订阅精度》深挖结果

- 审核轮次：第 1 轮至第 5 轮
- 当前状态：深挖已完成，第 5 轮后停止
- 说明：本文仅记录初审/深挖发现，暂不包含复核结论

## 第 1 轮（初审）

### 1. 单个 surface 摘要对整栈 `entries` 宽订阅

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts:218-225`
- **订阅位置**: `useSurfaceRenderer()` 内 `React.useSyncExternalStore(...)`
- **订阅范围**: `surfaceRuntime.store.getState().entries` 整个 surface 栈
- **实际需要**: 当前 `id` 对应的 `runtimeEntry`，以及顶部 `activeId`
- **建议**: 改成 selector 订阅，只选择 `{ runtimeEntry, activeId }`；或在 `SurfaceStore` 增加按 `surfaceId` / `activeId` 的窄订阅接口

### 2. Designer toolbar 使用 full snapshot

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-toolbar.tsx:99-125`
- **订阅位置**: `DesignerToolbarContent()` 内 `useDesignerFullSnapshot()`
- **订阅范围**: `DesignerSnapshot` 全量快照
- **实际需要**: `canUndo`、`canRedo`、`isDirty`、`gridEnabled`、`paletteCollapsed`、`inspectorCollapsed`、`doc.name`、节点/边计数等少量摘要字段
- **建议**: 用 `useDesignerSnapshotSelector()` 拆成窄订阅，不要让 toolbar 跟随整个图状态一起刷新

### 3. Designer inspector 使用 full snapshot

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-inspector.tsx:22-27`
- **订阅位置**: `DefaultInspector()` 内 `useDesignerFullSnapshot()`
- **订阅范围**: `DesignerSnapshot` 全量快照
- **实际需要**: 当前选中对象相关数据（`activeNode` / `activeEdge` / `activeBranch`）和少量文档摘要（`doc.name`、节点/边计数）
- **建议**: 改为多个 `useDesignerSnapshotSelector()` 窄订阅，避免 inspector 因无关画布更新整体重跑

## 第 2 轮追加

### 4. DesignerPageBody 订阅全量 snapshot

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:166-171,308-320,349-381`
- **订阅位置**: `DesignerPageBody()` 内 `const snapshot = useDesignerSnapshot(core);`
- **订阅范围**: `DesignerSnapshot` 全量快照
- **实际需要**: `isDirty`、`canUndo`、`canRedo`、`activeNode` / `activeEdge`、`selection` 计数、`paletteCollapsed`、`inspectorCollapsed`
- **建议**: 将 page shell 改为多个 `useDesignerSnapshotSelector()` 窄订阅，拆分 shell 折叠态、statusPath 摘要、selection 统计

### 5. Spreadsheet page 用全量 runtime snapshot 驱动 host scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\page-renderer.tsx:80-99,122-159`
- **订阅位置**: `SpreadsheetPageRenderer()` 内 `useSyncExternalStore(spreadsheetCore.subscribe, ...)`
- **订阅范围**: `SpreadsheetRuntimeSnapshot` 全量快照，并整体 `deriveHostSnapshot(snapshot)` 后重建 `spreadsheetScopeData`
- **实际需要**: 页面壳层只需要标题状态、只读/撤销重做、当前 sheet/selection 等摘要；不需要每次单元格变化都刷新整个 host scope
- **建议**: 将 page shell UI 摘要订阅与 host projection 拆开；对 header/status 用 selector 订阅，对真正需要完整 workbook/activeSheet 的区域单独提供局部 bridge/scope

### 6. Report designer page 以双 full snapshot 驱动 host scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\page-renderer.tsx:106-122,170-204`；`C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-data.ts:198-208`
- **订阅位置**: `ReportDesignerPageRenderer()` 内对 `core` 与 `spreadsheetCore` 的两个 `useSyncExternalStore(...)`
- **订阅范围**: `ReportDesignerRuntimeSnapshot` 全量 + `SpreadsheetRuntimeSnapshot` 全量，并整体传入 `useReportDesignerHostScope(...)`
- **实际需要**: 页面头部与状态发布只需要 dirty、preview、selectionTarget、fieldSources 计数、undo/redo 等摘要
- **建议**: 将 report designer 页面壳层改为 selector 化订阅，把高频大对象与 header/status 摘要拆开

### 7. DialogHost 对每个 surface body 订阅整个 visible scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\dialog-host.tsx:84-85,173-174`；`C:\can\nop\nop-chaos-flux\packages\flux-react\src\dialog-host-surface.tsx:50-73`
- **订阅位置**: `DialogView()` / `DrawerView()` 中 `useSurfaceScopeSnapshot(props.surface.scope)`
- **订阅范围**: `scope.readVisible()` 全量可见 scope；未传 `paths`
- **实际需要**: surface body/title/actions 内部各自只需要其子树实际读到的路径；host 容器本身不需要整 scope 统一订阅
- **建议**: 让 surface host 仅订阅 open/active 等宿主级状态；若必须保留 host 级订阅，也应传明确 `paths`

### 8. Word editor 页面对高频 `selection` / 运行时摘要做顶层订阅

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\word-editor-page.tsx:116-145`
- **订阅位置**: `WordEditorPageRenderer()` 内 `selection` 与 `editorRuntime` 两处 `useSyncExternalStoreWithSelector(...)`
- **订阅范围**: `state.selection` 整个对象，以及聚合后的 `editorRuntime` 新对象
- **实际需要**: 页面宿主通常只需要少量摘要字段（undo/redo、页码、缩放、dirty）；selection 应下沉到直接消费处
- **建议**: 顶层 page 只订阅宿主真正需要的标量摘要，将 selection 相关高频状态下沉到 ribbon/formatting 等直接消费处

## 第 3 轮追加

### 9. 通用字段控制器在空 `name` 时退化为整表/整 scope 订阅

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-handlers.tsx:30-47,236-250`
- **订阅位置**: `useFormFieldController()` -> `useBoundFieldValue()`
- **订阅范围**: `name` 为空时，`useCurrentFormState` 读取 `state.values` 全量；非 form 场景下 `useScopeSelector` 读取整个 `scopeData`
- **实际需要**: 普通 field controller 应只订阅具体字段路径；无 `name` 时更合理的是退回静态 props/value 或禁用 reactive field binding
- **建议**: 对空 `name` 明确走非订阅 fallback，不要让通用 field controller 以“无 name = 订阅全量 values/scope”方式工作

### 10. VariantField 在空 `name` 时直接订阅整表单值/整 scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:96-102`
- **订阅位置**: `VariantFieldRenderer()` 内 `rawValue` / `scopeValue`
- **订阅范围**: `name` 为空时读取 `state.values` 或整个 `data`
- **实际需要**: variant-field 的活跃变体判定应依赖绑定字段值；无 `name` 时不应默认订阅整个 owner 数据域
- **建议**: 要么要求 `name` 为必填绑定，要么在无 `name` 时退回显式 `props.props.value` / 非响应式来源

### 11. ObjectField 在空 `name` 时订阅整表单/整 scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:106-113`
- **订阅位置**: `ObjectFieldRenderer()` 内 `formValue` / `scopeValue`
- **订阅范围**: `name` 为空时读取 `state.values` 或整个 `data`
- **实际需要**: object-field 应绑定到对象字段路径；无字段路径时不应默认消费整个 form/scope 作为对象值
- **建议**: 将 `name` 视为 object-field 的必需绑定；或在无 `name` 时走明确的 non-reactive input

### 12. CodeEditor 绑定 hook 在空 `name` 时订阅整 scope/整表单，但最终并不使用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:16-30`
- **订阅位置**: `useCodeEditorBinding()` 内 `formValue` / `scopeValue`
- **订阅范围**: `name` 为空时读取 `state.values` 或整个 `data`
- **实际需要**: `name` 为空时实际返回分支直接使用 `props.props.value`，不需要任何 form/scope 响应式订阅
- **建议**: 先按 `name` 判定是否需要订阅；`name` 为空时直接跳过 `useCurrentFormState` / `useScopeSelector`

## 第 4 轮追加

### 13. ArrayField 在空 `name` 时订阅整表单/整 scope，并把整个 owner 数据归一化为数组项

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:197-215`
- **订阅位置**: `ArrayFieldRenderer()` 内 `formValue` / `scopeValue`
- **订阅范围**: `name` 为空时，`useCurrentFormState` 读取 `state.values` 全量；非 form 场景下 `useScopeSelector` 读取整个 `scopeData`
- **实际需要**: array-field 应只绑定数组字段路径；无 `name` 时不应把整表单/整 scope 当作当前数组值
- **建议**: 将 `name` 视为 array-field 的必需绑定；无 `name` 时走显式非响应式输入或直接拒绝绑定

### 14. DetailField 在空 `name` 时仍保留全量订阅，但 selector 恒为 `undefined`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:54-63`
- **订阅位置**: `DetailFieldRenderer()` 内 `currentValue` / `scopeValue`
- **订阅范围**: `name` 为空时，`useCurrentFormState(..., { path: undefined })` 与 `useScopeSelector(...)` 仍建立 form/scope 订阅
- **实际需要**: 空 `name` 分支下 selector 明确返回 `undefined`，因此不应建立任何响应式订阅
- **建议**: 在无 `name` 时直接跳过 form/scope 订阅，改走显式 props/fallback

### 15. KeyValueRenderer 在空 `name` 时额外建立全表单/全 scope 订阅，但结果恒为 `undefined`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:213-236`
- **订阅位置**: `KeyValueRenderer()` 内 `formExternalValue` / `scopeExternalValue`
- **订阅范围**: `name` 为空时，form 分支通过 `{ path: undefined }` 订阅整个 form store；scope 分支通过 `useScopeSelector` 订阅整个 lexical scope
- **实际需要**: 无 `name` 时该 external value 本身不应从 owner 读取，当前 selector 也明确返回 `undefined`
- **建议**: 先按 `name` 判定是否需要 owner 订阅；空 `name` 时直接返回 `EMPTY_KEY_VALUE_PAIRS` 或显式 props 输入

### 16. ArrayEditorRenderer 在空 `name` 时额外建立全表单/全 scope 订阅，但结果恒为 `undefined`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:169-186`
- **订阅位置**: `ArrayEditorRenderer()` 内 `formExternalValue` / `scopeExternalValue`
- **订阅范围**: `name` 为空时，form 分支订阅整个 form store；scope 分支订阅整个 lexical scope
- **实际需要**: 空 `name` 时 array-editor 不应从 owner 响应式读取数组值；当前 selector 也没有任何实际数据读取
- **建议**: 将空 `name` 分支改为无订阅 fallback；只在存在真实字段路径时建立 external value 订阅

## 第 5 轮追加（最后一轮）

- 原始第 17 条记录在生成时已截断，当前文件仅保留到标题起始，未纳入复核统计。

## 维度复核结论

- 已成功复核 16 条可读发现；复核后保留 7 项、降级 6 项、驳回 3 项。
- 主要保留项集中在两类高置信宽订阅：一类是顶层 shell 对 full snapshot 的不必要订阅，另一类是空 `name` 分支下明知结果恒为空却仍建立全表单/全 scope 订阅。

## 子项复核结论

- `1. 单个 surface 摘要对整栈 entries 宽订阅`: 保留。实际只消费当前 `runtimeEntry` 与栈顶 `activeId`，订阅整段 `entries` 明显过宽。
- `2. Designer toolbar 使用 full snapshot`: 保留。toolbar 只消费少量布尔、计数和标题摘要，不需要跟随整图状态重渲染。
- `3. Designer inspector 使用 full snapshot`: 保留。inspector 主要关心当前选中对象和少量摘要，整快照订阅没有必要。
- `4. DesignerPageBody 订阅全量 snapshot`: 降级。shell 订阅可继续收窄，但当前实现同时承担 designer host scope 生成，存在架构性原因。
- `5. Spreadsheet page 用全量 runtime snapshot 驱动 host scope`: 降级。header/status 订阅偏宽成立，但 host projection 当前确实依赖整份 runtime 投影。
- `6. Report designer page 以双 full snapshot 驱动 host scope`: 降级。shell 订阅过宽属实，但两份 full snapshot 也承担 host scope 与跨核心同步职责。
- `7. DialogHost 对每个 surface body 订阅整个 visible scope`: 降级。订阅面可收窄，但 title/body/actions 当前确实依赖该整 scope 订阅兜底。
- `8. Word editor 页面对高频 selection / 运行时摘要做顶层订阅`: 降级。顶层 selection 订阅偏重，但它也被放进 host scope 供下游子区消费。
- `9. 通用字段控制器在空 name 时退化为整表/整 scope 订阅`: 降级。空 `name` 退化成全量订阅属实，但不能直接断言所有空 `name` 都不应绑定 owner 根值。
- `10. VariantField 在空 name 时直接订阅整表单值/整 scope`: 驳回。空 `name` 读取 owner 根值在该组件中仍可视作合法语义，证据不足以认定为错误宽订阅。
- `11. ObjectField 在空 name 时订阅整表单/整 scope`: 驳回。绑定根对象在 object-field 中是合理用法，不能一概视为无效订阅。
- `12. CodeEditor 绑定 hook 在空 name 时订阅整 scope/整表单，但最终并不使用`: 保留。空 `name` 分支最终直接走 `props.props.value`，此前 form/scope 订阅纯属多余成本。
- `13. ArrayField 在空 name 时订阅整表单/整 scope，并把整个 owner 数据归一化为数组项`: 驳回。绑定根数组是可成立场景，不能直接认定为空 `name` 误订阅。
- `14. DetailField 在空 name 时仍保留全量订阅，但 selector 恒为 undefined`: 保留。空 `name` 分支下 selector 恒 `undefined`，继续挂 form/scope 订阅只有成本没有收益。
- `15. KeyValueRenderer 在空 name 时额外建立全表单/全 scope 订阅，但结果恒为 undefined`: 保留。当前 selector 明确返回 `undefined`，却仍建立 owner 订阅，是无效开销。
- `16. ArrayEditorRenderer 在空 name 时额外建立全表单/全 scope 订阅，但结果恒为 undefined`: 保留。与 key-value 同类，空 `name` 时没有实际读取却仍建立全量订阅。
- `17. 第 5 轮原始记录`: 未纳入统计。源文件在条目标题处截断，无法完成独立复核。
