# 维度 07：生命周期与副作用归属

## 初审摘要

- 初审未发现新的 render-phase `setState`/`store.setState` 问题。
- 初审集中发现 6 处 `statusPath` 发布 effect 缺少 unmount cleanup。

## 维度复核结论

- 6 处 `statusPath` effect 均保留为低风险但真实的 stale status 问题。
- “这些 effect 必须迁移到 runtime”未被复核确认；本次仅确认 cleanup 缺口。

## 通过复核的结论

### [维度07] CRUD statusPath 发布缺少卸载清理

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:144-157`
- **证据片段**:

```ts
144:   useEffect(() => {
145:     if (!scope || !statusPath) {
156:     prevSummaryRef.current = summary;
157:     scope.update(statusPath, summary);
```

- **严重程度**: P3
- **现状**: effect 只写入外部 statusPath，不在 unmount 时清理。
- **风险**: 宿主仍可能读取到已卸载 CRUD 的旧摘要。
- **建议**: 复用带 cleanup 的 status publication helper。
- **复核状态**: 维度复核通过

### [维度07] Tree statusPath 发布缺少卸载清理

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:184-196`
- **证据片段**:

```tsx
184:   useEffect(() => {
189:     publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, {
195:     });
196:   }, [props.node.scope, statusPath, data.length, childrenKey, keyField, labelField]);
```

- **严重程度**: P3
- **现状**: 卸载后不清理 tree 摘要。
- **风险**: 条件渲染移除后外部仍可能读到旧 tree 状态。
- **建议**: 在 cleanup 中清空该 `statusPath`。
- **复核状态**: 维度复核通过

### [维度07] Flow Designer host statusPath 发布缺少卸载清理

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:283-299`
- **证据片段**:

```tsx
283:   useEffect(() => {
288:     const summary: DesignerHostStatusSummary = {
298:     publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
299:   }, [layoutBusy, props.node.scope, snapshot, statusPath]);
```

- **严重程度**: P3
- **现状**: host 摘要在卸载后残留。
- **风险**: 外部读取方可能误判 designer 仍处于上一状态。
- **建议**: 统一收敛到带 cleanup 的 host status publisher。
- **复核状态**: 维度复核通过

### [维度07] Spreadsheet host statusPath 发布缺少卸载清理

- **文件**: `packages/spreadsheet-renderers/src/page-renderer.tsx:159-175`
- **证据片段**:

```tsx
159:   useEffect(() => {
164:     const summary: SpreadsheetHostStatusSummary = {
174:     publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
175:   }, [props.node.scope, snapshot.selection.kind, spreadsheet, statusPath]);
```

- **严重程度**: P3
- **现状**: 仅发布，不清理。
- **风险**: 外部 scope 继续保留旧 spreadsheet 摘要。
- **建议**: cleanup 时发布 `undefined` 或统一 helper。
- **复核状态**: 维度复核通过

### [维度07] Report Designer host statusPath 发布缺少卸载清理

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:223-239`
- **证据片段**:

```tsx
223:   useEffect(() => {
228:     const summary: ReportDesignerHostStatusSummary = {
238:     publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
239:   }, [props.node.scope, snapshot, spreadsheetSnapshot, statusPath]);
```

- **严重程度**: P3
- **现状**: report host status 发布缺少卸载清理。
- **风险**: statusPath 可能在宿主中残留过期状态。
- **建议**: 与 spreadsheet/word/designer 一起收敛。
- **复核状态**: 维度复核通过

### [维度07] Word Editor host statusPath 发布缺少卸载清理

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:320-337`
- **证据片段**:

```tsx
320:   useEffect(() => {
325:     const summary: WordEditorHostStatusSummary = {
336:     publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
337:   }, [charts.length, codes.length, datasets.length, editorRuntime, props.node.scope, statusPath]);
```

- **严重程度**: P3
- **现状**: 卸载后不清理 host 摘要。
- **风险**: 父 scope 仍可能读到旧 word editor 状态。
- **建议**: 统一为带 cleanup 的 shared publisher。
- **复核状态**: 维度复核通过
