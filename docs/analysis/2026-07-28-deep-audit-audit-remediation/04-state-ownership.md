# Dimension 04: State Ownership & Single Source of Truth

## 第 1 轮（初审）

### [D04-01] useXyflowSync: Zustand 设计器 store 与 xyflow 本地状态间的双节点/边状态

- **文件**: packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:83-105
- **严重程度**: P1
- **双状态详情**: 来源 A: DesignerSnapshot (store) — `props.snapshot` 包含规范 `doc.nodes`/`doc.edges`/`doc.viewport`；来源 B: `useNodesState(snapshotNodes)` 的 `localNodes` — 在拖拽期间会分歧的 React 管理节点数组。同步: 第 93-101 行的 `useEffect` 调用 `syncLocalNodesWithSnapshot`。
- **同步失败症状**: 快速操作后画布显示与规范 store 不同的节点；节点在 store 中删除后在画布上仍可见。
- **现状**: 活跃的有意适配器模式，但存在真正的双状态风险。
- **风险**: 高。如果 reconciliation 遗漏边缘情况（如快速 mutations 期间的陈旧闭包），画布会显示分歧的数据。
- **建议**: 评估是否可以将 `nodes`/`edges` 作为完全受控属性传递给 `ReactFlow`。如果不可行，将同步 `useEffect` 改为 `useLayoutEffect` 并添加 generation 计数器。

### [D04-02] useSurfaceRenderer: ScopeRef 同时存储在 React useState 和 useRef 中

- **文件**: packages/flux-renderers-basic/src/use-surface-renderer.ts:69-70, 107-108, 127-134
- **严重程度**: P1
- **双状态详情**: 来源 A: `useState<ScopeRef>` 的 `declarativeScope`；来源 B: `useRef<ScopeRef>` 的 `declarativeScopeRef`。两者在同一个 `useLayoutEffect` 中顺序设置。
- **同步失败症状**: 闭包中清理时使用的 ref 值与使组件重新渲染的 state 值可能分歧，导致双重释放或 scope 泄漏。
- **现状**: 活跃。ref 在清理效果中使用；state 驱动渲染。
- **风险**: 高。如果效果清理运行时 `declarativeScopeRef.current` 已被重新赋值，可能发生双重释放。
- **建议**: 移除 React state 依赖，只依靠 ref 来处理清理。scope 在 JSX 中从不被读取。

### [D04-03] DesignerPageBody: creatingNode 同时在 useState 和 useRef 中

- **文件**: packages/flow-designer-renderers/src/designer-page-body.tsx:187-188, 210, 231
- **严重程度**: P1
- **双状态详情**: 来源 A: `useState(false)` 的 `creatingNode`；来源 B: `useRef(false)` 的 `creatingNodeRef`。`handleCloseCreateDialog` 从 state 读取；`handleConfirmCreateDialog` 从 ref 读取。
- **同步失败症状**: 由于 state 和 ref 间的不一致读取模式，可能发生双重创建或无法阻止创建。
- **现状**: 活跃。不一致的访问模式（state vs ref 用于相同逻辑布尔值）。
- **风险**: 高。如果一条代码路径更新一个但不更新另一个，对话保护逻辑会中断。
- **建议**: 整合为单一来源。如果回调中需要 ref 来实现异步闭包安全，只使用 ref 并从 `pendingCreateDialog !== null` 派生对话渲染守卫。

### [D04-04] UploadField: 本地 items state 镜像了已提交到 form store 的文件列表

- **文件**: packages/flux-renderers-form-advanced/src/upload-field.tsx:141, 258-264
- **严重程度**: P2
- **双状态详情**: 来源 A: `useState<UploadItemState[]>` 的 `items`；来源 B: form store `value` 中的已提交文件条目。上传成功后，`done` 条目在 `items` 中冗余镜像了已写入 form store 的文件。
- **同步失败症状**: 提交成功后可能显示陈旧进度条或缺少缩略图。
- **现状**: 活跃的草稿缓存模式（重开裁定#4，认为已知的草稿缓存权衡）。
- **风险**: 中等。双重写入同步点是真实的风险。
- **建议**: 成功上传后，考虑仅将 `items` 用于 pending/error 状态，并为已提交的文件依赖 `readUploadValue(value)`。

### [D04-05] useXyflowSync: props-to-state 同步链（useEffect → setLocalNodes）

- **文件**: packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:93-101
- **严重程度**: P2
- **双状态详情**: `snapshotNodes` → `useEffect` → `setLocalNodes`。在 React 提交阶段，存在 `snapshotNodes` 已更改但 `localNodes` 尚未更新的帧。
- **同步失败症状**: ReactFlow 在那一帧展示陈旧节点。
- **现状**: 活跃的 xyflow 适配器要求。
- **风险**: 中等。陈旧渲染帧，但 xyflow 的下一次渲染会解决。
- **建议**: 评估使用 `useLayoutEffect` 替代 `useEffect` 以同步 reconciliation。

### [D04-07] DiffViewRenderer: props 派生的防抖 state（useEffect → setState 同步链）

- **文件**: packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx:74-91
- **严重程度**: P2
- **双状态详情**: `debouncedOld`/`debouncedNew`/`debouncedMid`/`debouncedLang` 是 props 的防抖副本，仅在视觉上有意义。
- **同步失败症状**: 无。防抖是有效的渲染优化。
- **现状**: 活跃的防抖缓存，非规范数据。
- **风险**: 低。
- **建议**: 考虑使用 React 19 的 `useDeferredValue` 替代手动防抖。

### [D04-08 to D04-21] 各种本地 UI state 发现 — 均为 P3 或清理状态

- **严重程度**: 均为 P3 或"清理"。
- **发现项**: openingData 冻结快照 (D04-08)、PaginationRenderer 本地 currentPage (D04-09)、TreeControls 本地 query (D04-10)、FieldFrame focused (D04-11)、Report Designer 面板折叠 (D04-12)、DesignerPageBody jsonOpen/pendingCreateDialog (D04-13)、InputRenderer initialValueRef (D04-14)、useDesignerAutoLayout (D04-15)、DropdownButton open (D04-16)、AlertRenderer open (D04-17)、PageAsideToggle open (D04-18)、DesignerTreeMode useState init (D04-19)、DesignerCanvas hoveredEdgeId (D04-20)、useSurfaceRenderer controlled/uncontrolled 双路径 (D04-21)。
- **现状**: 所有项为本地 UI 状态或有意设计的模式。
- **风险**: 无。
- **建议**: 无。

## 维度复核结论

- [D04-01]: 保留 P1。真实的双状态风险，需整改。
- [D04-02]: 保留 P1。ScopeRef 双存储是真实的清理风险。
- [D04-03]: 保留 P1。state vs ref 的不一致读取模式是问题。
- [D04-04]: 保留 P2。草稿缓存模式，已知权衡。
- [D04-05]: 保留 P2。同步链问题，但由适配器需求驱动。
- [D04-07]: 保留 P2。低风险防抖，可考虑 useDeferredValue。
- [D04-08 to D04-21]: 全部保留 P3 或清理。无进一步整改需求。

## 最终保留项

| 编号  | 严重程度 | 文件                                                         | 一句话摘要                                        |
| ----- | -------- | ------------------------------------------------------------ | ------------------------------------------------- |
| 04-01 | P1       | `flow-designer/.../use-xyflow-sync.ts:83-105`                | Zustand store 与 xyflow 本地节点/边状态间的双状态 |
| 04-02 | P1       | `flux-renderers-basic/src/use-surface-renderer.ts:69-70`     | ScopeRef 双存于 useState 和 useRef                |
| 04-03 | P1       | `flow-designer-renderers/src/designer-page-body.tsx:187-188` | creatingNode 双存导致不一致读取模式               |
| 04-04 | P2       | `flux-renderers-form-advanced/src/upload-field.tsx:141`      | 本地 items state 镜像已提交的 store 值            |
| 04-05 | P2       | `flow-designer/.../use-xyflow-sync.ts:93-101`                | props-to-state useEffect 同步链                   |
| 04-07 | P2       | `flux-renderers-content/src/diff-view-renderer.tsx:74-91`    | 防抖 props-to-state 同步                          |
