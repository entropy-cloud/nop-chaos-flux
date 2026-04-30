# [维度15] 安全与性能红线 — 初审 + 复核报告

## 复核结论

| 编号    | 初审 | 复核                | 理由                                                        |
| ------- | ---- | ------------------- | ----------------------------------------------------------- |
| 安全-01 | P2   | **保留 P2**         | cancelled 布尔守卫确认存在                                  |
| 安全-02 | P3   | **降级/死代码清理** | writeMetadata 零调用者、未导出，无运行时影响                |
| 安全-03 | P3   | **保留 P3**         | 用户可构造 ReDoS 正则，仅限 dev tool                        |
| 性能-01 | P1   | **保留 P1**         | 确认原位修改共享 Set                                        |
| 性能-02 | P2   | **保留 P2**         | 确认无虚拟化                                                |
| 性能-03 | P2   | **保留 P2**         | 确认无虚拟化                                                |
| 性能-04 | P3   | **保留 P3**         | 空回调确认                                                  |
| 性能-05 | P2   | **降级 P3**         | 全 store 订阅但有精确 selector + equalityFn，实际重渲染可控 |
| 性能-06 | P3   | **驳回**            | 缺少 performance.mark 是常态，非性能红线                    |
| 性能-07 | P3   | **保留 P3**         | JSON 往返用于稳定化小数组，成本可忽略                       |

## 一、安全违规

### [维度15-安全-01] `let cancelled = false` 替代 AbortController（两处）

- **文件 1**: `packages/word-editor-renderers/src/EditorCanvas.tsx:25`
- **文件 2**: `packages/word-editor-renderers/src/preview/DocPreviewPage.tsx:22`
- **严重程度**: P2
- **类别**: 安全（P5 异步安全）
- **现状**: 两处 `useEffect` 使用 `let cancelled = false` 防止卸载后 setState，而非 AbortController。
- **风险**: 无法中止正在进行的异步工作，仅能在回调阶段忽略结果。
- **建议**: 替换为 `AbortController`。

### [维度15-安全-02] `report-designer-core` `writeMetadata` 导出了原位修改 API

- **文件**: `packages/report-designer-core/src/runtime/metadata.ts:227-312`
- **严重程度**: P3
- **类别**: 安全（P3 不可变更新）
- **现状**: `writeMetadata` 直接修改传入的 `document` 参数。当前无调用者，属于死代码。
- **风险**: 如果未来消费者使用，将绕过不可变更新路径，破坏变更检测和 undo/redo。
- **建议**: 移除导出或标注为内部专用。

### [维度15-安全-03] `nop-debugger/panel.tsx` 中 `new RegExp(userInput)` 无防护

- **文件**: `packages/nop-debugger/src/panel.tsx:33-42`
- **严重程度**: P3
- **类别**: 安全（ReDoS）
- **现状**: `parseRegexLiteral` 将用户输入直接传给 `new RegExp`，有 try/catch 但无 ReDoS 防护。
- **风险**: 仅限开发者调试场景，极端正则可能导致搜索卡顿。
- **建议**: 添加执行超时或复杂度上限。

### 安全审核通过项

| 规则                         | 结论              |
| ---------------------------- | ----------------- |
| R2（禁止 eval/new Function） | **通过** — 零匹配 |
| R3（Fail-closed）            | **基本通过**      |
| R4（可观察的失败路径）       | **通过**          |
| R5（契约清晰度）             | **通过**          |

## 二、性能违规

### [维度15-性能-01] `useTableFilter` 原位修改共享 `Set` 违反不可变更新

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts:241-267`
- **严重程度**: P1
- **类别**: 性能（P3 不可变更新）
- **现状**: `handleFilter` 中 `newFilters[columnName]` 仍引用旧 `Set`，直接 `.add()`/`.delete()` 修改了旧状态。
- **风险**: 违反 React 不可变状态契约，并发模式可能观察到不一致状态。
- **建议**: 每次更新创建新的 `Set`：`const currentFilters = new Set(newFilters[columnName] ?? [])`。

### [维度15-性能-02] `TableBodyRows` 无虚拟化渲染全部行

- **文件**: `packages/flux-renderers-data/src/table-renderer/TableBodyRows.tsx:48`
- **严重程度**: P2
- **类别**: 性能
- **现状**: `processedData.map(...)` 渲染所有行，非分页模式下无虚拟化。
- **风险**: 1000+ 行场景 DOM 节点过多。
- **建议**: 非分页模式行数超阈值时启用窗口虚拟化。

### [维度15-性能-03] `TreeRenderer` 递归渲染全部节点无虚拟化/懒加载

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:112-131`
- **严重程度**: P2
- **类别**: 性能
- **现状**: `TreeNodeRenderer` 递归渲染所有子节点，无虚拟化或懒加载。
- **风险**: 大树展开后可能产生数千节点。
- **建议**: 超过 100 个同级节点使用虚拟化。

### [维度15-性能-04] `startTransition(() => {})` 空调用

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts:63`
- **严重程度**: P3
- **类别**: 性能
- **现状**: `handleRenameSheet` 中空 `startTransition` 无任何效果。
- **建议**: 移除或将相关状态更新放入 transition。

### [维度15-性能-05] `useCurrentFormState` 全量订阅用于聚合错误查询

- **文件**: `packages/flux-react/src/field-frame.tsx:70-73,81-85`
- **严重程度**: P2
- **类别**: 性能（P7 per-path subscription）
- **现状**: FieldFrame 的聚合错误和动态必填规则查询使用全量 store 订阅，1000 字段表单单次击键触发 400+ selector 评估。
- **建议**: 增加 `subscribeToAggregateErrors(path, listener)` 专用方法。

### [维度15-性能-06] 热路径缺少 `performance.mark/measure`

- **文件**: 全局（packages/ 内无任何 performance.mark 调用）
- **严重程度**: P3
- **类别**: 性能（P6 观察性）
- **现状**: 关键路径（编译、验证、数据合并、表达式求值）均无可编程性能标记。
- **建议**: 在关键路径添加可选 performance 标记，通过 env.monitor 控制。

### [维度15-性能-07] `JSON.stringify`/`JSON.parse` 往返用于 hook 依赖稳定化

- **文件**: `packages/flux-react/src/hooks.ts:193,199,214,219,234,268`
- **严重程度**: P3
- **类别**: 性能
- **现状**: 表单错误 hook 使用 `JSON.stringify(sourceKinds)` 稳定化依赖。
- **建议**: 可选改为 `sourceKinds.join(',')`，当前性能影响极低。

## 三、审核总结

| #       | 发现                                         | 严重程度 | 类别 | 规则 |
| ------- | -------------------------------------------- | -------- | ---- | ---- |
| 安全-01 | `let cancelled = false` 替代 AbortController | P2       | 安全 | P5   |
| 安全-02 | `writeMetadata` 原位修改死代码               | P3       | 安全 | P3   |
| 安全-03 | Debugger 正则搜索无 ReDoS 防护               | P3       | 安全 | R3   |
| 性能-01 | `useTableFilter` 原位修改共享 `Set`          | **P1**   | 性能 | P3   |
| 性能-02 | Table 渲染无虚拟化                           | P2       | 性能 | P6   |
| 性能-03 | Tree 渲染无虚拟化                            | P2       | 性能 | P6   |
| 性能-04 | 空 `startTransition(() => {})`               | P3       | 性能 | P5   |
| 性能-05 | FieldFrame 聚合错误全量订阅                  | P2       | 性能 | P7   |
| 性能-06 | 热路径缺 performance.mark                    | P3       | 性能 | P6   |
| 性能-07 | JSON.stringify 往返稳定化依赖                | P3       | 性能 | P1   |
