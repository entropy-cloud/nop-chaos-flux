# [维度04] 状态所有权与单一事实来源 — 初审 + 复核报告

## 复核结论

| #   | 发现                                     | 判定        | 核心依据                                                                         |
| --- | ---------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| 1   | ArrayEditor 删除双重写入                 | **保留 P1** | 确认为真实 bug，removeValueOp 读取已过滤数组再删一个                             |
| 2   | KeyValue 删除双重写入                    | **保留 P1** | 与 #1 完全同构，真实 bug                                                         |
| 3   | ArrayEditor/KeyValue ref 先于 store 更新 | **降级**    | composite field registration 的刻意设计，ref 必须先于 store 更新供同步验证链读取 |
| 4   | ConditionBuilder valueRef 先于 store     | **降级**    | 同 #3，设计模式而非 bug                                                          |
| 5   | Spreadsheet 选区双路径                   | **保留 P2** | 确认存在双源，实际风险较低但架构上不理想                                         |
| 6   | CrudRenderer loading 永远 false          | **保留 P3** | 确认无 setLoading 调用，死代码                                                   |

## 发现汇总

| #   | 标题                                                   | 严重程度 | 文件                            |
| --- | ------------------------------------------------------ | -------- | ------------------------------- |
| 1   | ArrayEditor 删除操作双重写入                           | P1       | array-editor.tsx                |
| 2   | KeyValue 删除操作双重写入                              | P1       | key-value.tsx                   |
| 3   | ArrayEditor/KeyValue ref 在 onChange 时先于 store 更新 | P2       | array-editor.tsx, key-value.tsx |
| 4   | ConditionBuilder valueRef 先于 store 更新              | P2       | ConditionBuilder.tsx            |
| 5   | Spreadsheet 选区本地状态与 core store 双路径           | P2       | use-selection.ts                |
| 6   | CrudRenderer `loading` 永远为 false                    | P3       | crud-renderer.tsx               |

---

### [维度04] ArrayEditor 删除操作双重写入导致多删一个元素

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:96-107`
- **严重程度**: P1
- **现状**: 删除按钮的 onClick 同时调用 `onSync(nextItems)`（setValue）和 `removeValue(name, index)`，导致实际删除两个元素。
- **风险**: 用户点击删除第 N 项时，第 N+1 项也会被意外删除。
- **建议**: 仅使用 `removeValue`，参考 `array-field.tsx:255-264` 的正确实现。
- **双状态详情**: `onSync(nextItems)` 中的 `setValue(name, nextItems)` 和 `removeValue(name, index)` 对同一 form store 路径执行两次写入。
- **同步失败症状**: 用户删除一个条目后，紧随其后的条目也会消失。

### [维度04] KeyValue 删除操作双重写入导致多删一个条目

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:158-169`
- **严重程度**: P1
- **现状**: 与 ArrayEditor 完全相同的双重写入模式。同时调用 `onSync(nextPairs)` 和 `removeValue(name, index)`。
- **风险**: 每次删除操作实际删除两个 key-value 对。
- **建议**: 仅使用 `removeValue`。
- **双状态详情**: `onSync(nextPairs)` 中的 `setValue(name, nextPairs)` 和 `removeValue(name, index)` 双重写入。
- **同步失败症状**: 用户删除一个 key-value 条目后，紧随其后的条目也会消失。

### [维度04] ArrayEditor/KeyValue itemsRef/pairsRef 在变更时先于 store 更新

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:143,266` 和 `packages/flux-renderers-form-advanced/src/key-value.tsx:208,359`
- **严重程度**: P2
- **现状**: `itemsRef`/`pairsRef` 镜像 form store 中的数组值。在"添加"按钮的 onClick 中，ref 先于 store 更新。
- **风险**: ref 和 store 之间存在短暂不一致窗口。
- **建议**: 将 ref 更新移到 store 写入之后，或从 `currentForm.scope.get(name)` 直接读取。
- **双状态详情**: `itemsRef.current`/`pairsRef.current` 与 form store `values[name]` 表达同一份数据。
- **同步失败症状**: 验证期间的 `getValue()` 可能返回与 store 实际值不一致的数据。

### [维度04] ConditionBuilder valueRef 在变更时先于 store 更新

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx:50,71`
- **严重程度**: P2
- **现状**: `valueRef` 在 `syncValue` 回调中先于 `currentForm.setValue` 更新。
- **风险**: ref 和 store 之间有短暂不一致窗口。
- **建议**: 将 ref 更新移到 store 写入之后。
- **双状态详情**: `valueRef.current` 与 form store `values[name]` 表达同一份数据。
- **同步失败症状**: 同上。

### [维度04] Spreadsheet 选区本地状态与 core store 双路径同步

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:24,30-31`
- **严重程度**: P2
- **现状**: `selectedCell` 通过 `useState` 维护，同时通过 `syncSelectionToCore` 派发到 core store。`bridge.dispatch` 是异步的。
- **风险**: 本地选区和 core 选区可能短暂不一致。如果 core 状态回滚，本地状态不会自动回退。
- **建议**: 让本地 `selectedCell` 从 core snapshot 派生，或在 `bridge.dispatch` 完成后校验一致性。
- **双状态详情**: `selectedCell`（React useState）和 spreadsheet core store `selection` 表达同一选区。
- **同步失败症状**: readonly 模式下 UI 高亮与 core 选区不一致。

### [维度04] CrudRenderer loading 状态永远为 false（死代码）

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:116`
- **严重程度**: P3
- **现状**: `const [loading] = useState(false)` 从未调用 `setLoading`。该值被传入 `useCrudSummary`。
- **风险**: scope 中 `$crud.loading` 永远为 false，消费者无法正确感知加载中状态。
- **建议**: 移除 loading 状态硬编码 false，或实现真实的 loading 追踪。
- **双状态详情**: 不构成双状态，但声明了从未使用的状态变量。
- **同步失败症状**: CRUD 刷新时工具栏不显示加载状态。

## 审计排除说明

以下模式经审核后排除，不构成双状态问题：

1. **ArrayEditor/KeyValue/ConditionBuilder 的 ref 缓存模式（渲染路径）** — ref 仅用于同步回调，渲染始终从 store 读取
2. **VariantField 的 userSelectedKey/detectedKey** — 纯 UI 层变体选择状态
3. **ArrayField 的 compatibilityItemKeys** — 纯 React key 标识
4. **DynamicRenderer 的 schema 加载状态** — 异步资源加载，无 store 重复
5. **useOwnedAxisValue 的 local/scope/controlled 分叉** — 路径互斥
6. **use-table-controls 的分页/选区/排序/筛选** — ownership 路径互斥或纯 UI 状态
7. **Dialog/Drawer 的打开状态** — 由 SurfaceStore 管理，无 local state 双存
8. **Flow Designer 的 localNodes/localEdges** — React Flow 受控组件适配，core snapshot 是唯一事实源
9. **Flow Designer 的 layoutBusy/jsonOpen/pendingCreateDialog** — 纯本地 UI 状态
10. **Report Designer / Word Editor 的 panel collapse** — 纯 UI 状态
11. **Word Editor 的 charts/codes** — 唯一数据源
12. **TreeSelect 的 query 搜索文本** — 纯 UI 输入状态
13. **TagList 的表单值读取** — 直接从 controller 读取
14. **ChartRenderer 的 chartInstance ref** — DOM 资源引用
15. **useSourceValue / useNodeImports** — 标准异步数据获取模式
