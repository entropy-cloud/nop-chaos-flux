# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] `useResize` 在 render 阶段重置预览状态

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:39-44`
- **证据片段**:
  ```ts
  if (snapshot.activeSheet?.id !== lastSheetIdRef.current) {
    lastSheetIdRef.current = snapshot.activeSheet?.id;
    setColumnWidthPreview({});
    setRowHeightPreview({});
  }
  ```
- **严重程度**: P2
- **effect 职责**: sheet 切换时清理本地 resize preview
- **应归属层级**: React commit 后 effect 或 keyed-state 重建
- **现状**: hook 在 render 期间直接调用两个 state setter
- **风险**: 违反 render-phase purity，可能再次触发仓内已记录的 setState-during-render 类问题
- **建议**: 将该重置逻辑移入 `useEffect`/`useLayoutEffect`
- **误报排除**: `lastSheetIdRef` 只是条件门，不能改变其 render-phase setState 本质
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-02] `SchemaRenderer` 在 render 阶段创建带外部订阅的 `PageRuntime`

- **文件**: `packages/flux-react/src/schema-renderer.tsx:162-166`, `packages/flux-runtime/src/runtime-owned-factories.ts:159-203,295-304`
- **证据片段**:
  ```ts
  const page = useMemo(() => runtime.createPageRuntime(...), [runtime, ...]);
  ```
  ```ts
  pageStoreSyncCleanups.push(externalPageStore.subscribe(...));
  ```
- **严重程度**: P1
- **effect 职责**: page owner 创建与 external pageStore 同步订阅挂接
- **应归属层级**: commit-safe owner lifecycle attach，而不是 render-phase allocation
- **现状**: `createPageRuntime()` 在 render/useMemo 中执行，且创建时立即建立外部订阅
- **风险**: 若 render 在 commit 前被放弃，cleanup effect 不会注册，但 listener 已经挂到 external pageStore 上
- **建议**: 将 external pageStore sync attach 拆到 commit-safe effect/attach API
- **误报排除**: 这不是旧的 committed-page dispose 问题，而是 aborted render 绕过 dispose 的新路径
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度07-03] ReportDesignerPageRenderer 在 render 阶段创建会立即启动异步副作用的 ReportDesignerCore

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:306,362`, `packages/report-designer-core/src/core.ts:374`
- **证据片段**:
  ```ts
  const core = useMemo(() => createReportDesignerCore(...), [...]);
  ```
  ```ts
  void refreshDerivedState();
  ```
- **严重程度**: P1
- **effect 职责**: core owner 创建与初始 async refresh
- **应归属层级**: commit-safe lifecycle owner，异步 refresh 不应在 render-allocated constructor 内启动
- **现状**: render 期间创建 core，constructor 立即启动 async refresh；dispose 只在 commit 后 effect 中注册
- **风险**: 若 render 被放弃，async task/store/AbortController 会脱离组件所有权继续存活
- **建议**: 把初始化副作用拆成 commit 后 attach/start API
- **误报排除**: 与 `SchemaRenderer createPageRuntime` 同型，但这是另一条独立 owner 构造路径
- **复核状态**: 未复核

## 维度复核结论

- [维度07-01]: 保留为 P2。render-phase setState 仍直接违背当前 renderer runtime 基线。
- [维度07-02]: 保留为 P1。render-phase createPageRuntime + external subscription attach 是更高风险的 owner lifecycle 缺陷。
- [维度07-03]: 保留为 P1。ReportDesignerCore 构造即启动异步副作用，存在 aborted render 泄漏风险。

## 子项复核结论

- [维度07-01]: 成立 (P2)。无需进一步子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                              | 一句话摘要                                                |
| ----- | -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 07-01 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:39-44` | useResize 在 render 阶段直接 setState                     |
| 07-02 | P1       | `packages/flux-react/src/schema-renderer.tsx:162-166`                             | SchemaRenderer render-phase 创建并挂接 pageStore 订阅     |
| 07-03 | P1       | `packages/report-designer-renderers/src/page-renderer.tsx:306`                    | ReportDesignerCore 在 render 阶段构造即启动 async refresh |
