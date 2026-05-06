# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### 校准说明

已对照 Calibration Pattern 8（渲染器本地 UI 状态）和 Pattern 5（演进中间态）。展开/折叠、激活 tab、hover、搜索查询等纯 UI 交互状态属于合理的 local state。

---

### [维度04] object-field resolvedValue useState 同步 store 值形成双状态

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:137-189`
- **严重程度**: P2
- **现状**: `object-field` 在使用 `transformInAction` 时，用 `useState(resolvedValue)` 维护一个本地 resolvedValue，通过 `useEffect` 将 store 中的 `rawValue` 经过 transformIn 同步到这个 local state。
- **风险**: 工作值缓存模式，双路径同步逻辑比较复杂但内部一致。
- **建议**: 短期内可接受。长期若 staged owner 语义落地可收敛。
- **双状态详情**: `useState(resolvedValue)` 和 store 值（working/adapted value vs committed/raw value）。
- **同步失败症状**: transformOut 异步结果写入时 store 已被外部更新，可能出现内容闪烁。

### [维度04] array-editor itemsRef 缓存 store 已有数据用于 validateChild

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:162-197,247-287`
- **严重程度**: P3
- **现状**: `itemsRef` 通过 `useEffect` 从 store 派生的 `items` 同步，用于 `RuntimeFieldRegistration.validateChild` 回调。
- **建议**: 合理的桥接模式。标注为观察项。
- **双状态详情**: `itemsRef.current` 和 store 派生的 `items`。
- **同步失败症状**: 无实际用户可见问题。

### [维度04] key-value pairsRef 缓存 store 已有数据用于 validateChild

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:209-247,274-336`
- **严重程度**: P3
- **现状**: 与 array-editor 的 `itemsRef` 模式完全一致。
- **建议**: 同 array-editor。
- **双状态详情**: `pairsRef.current` 和 store 派生的 `pairs`。
- **同步失败症状**: 无。

### [维度04] condition-builder valueRef 缓存 store 已有数据用于 validateChild

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:55-63,73-92`
- **严重程度**: P3
- **现状**: 与 array-editor/key-value 相同的 ref 桥接模式。
- **建议**: 同 array-editor/key-value。
- **双状态详情**: `valueRef.current` 和 store 派生的 `effectiveValue`。
- **同步失败症状**: 无。

### [维度04] table-quick-edit-controller useEffect 将 record 同步到 draftValue/savedValue

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:26-38`
- **严重程度**: P2
- **现状**: `useTableQuickEditController` 用 `useState` 维护 `draftValue` 和 `savedValue`，通过 `useEffect` 在 `record` 变化时重置。编辑值同时存在于 local state 和 row scope。
- **建议**: 可接受的 tradeoff，draft 逻辑需要 local 缓存。
- **双状态详情**: `draftValue`（local）和 `rowScope.record.${field}`（scope store）。
- **同步失败症状**: record 在编辑期间被外部修改，useEffect 会在下一帧重置 draftValue，可能丢失未保存编辑。

### [维度04] field-handlers useAdaptedFieldValue props-to-state 同步链

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:191-234`
- **严重程度**: P3
- **现状**: `useAdaptedFieldValue` 在 adapter 是异步时，用 `useState(value)` 维护 adapted value。
- **建议**: 异步值适配的合理模式。标注为观察项。
- **双状态详情**: `adaptedValue`（local）和 store 中的 raw value（语义不同）。
- **同步失败症状**: adapter.in 抛出异常时可能暂时显示过时值。

### [维度04] surface renderer localOpen 与 SurfaceStore open state 潜在双状态

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:37-38`
- **严重程度**: P2
- **现状**: 非受控模式下 `localOpen`（local state）和 `SurfaceRuntime.store` 中 entry 是否存在表达同一个 dialog/drawer 的打开状态。
- **建议**: 当前模式可接受。长期可考虑将非受控模式也纳入 SurfaceRuntime 管理。
- **双状态详情**: `localOpen` 和 `SurfaceRuntime.store.getState().entries`。
- **同步失败症状**: useEffect 执行前理论上可能不一致，但实际不会用户可见。

### [维度04] table axis hooks (sort/pagination/filter/selection/visible-columns) local+scope 双轨

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-*.ts`
- **严重程度**: P3
- **现状**: 互斥双轨模式（local/controlled/scope 三选一），不是双状态。
- **建议**: 无需修改。已校准为非双状态。
- **双状态详情**: N/A
- **同步失败症状**: N/A

### [维度04] variant-field userSelectedKey + detectedKey 与 matchedKey 多来源变体键

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:122-132`
- **严重程度**: P3
- **现状**: `activeKey` 仅用于决定显示哪个变体分支，不影响提交/验证/持久化。
- **建议**: 合理的 UI 选择状态缓存，符合 Calibration Pattern 8。
- **双状态详情**: UI 选择状态 vs 业务数据。
- **同步失败症状**: 无业务数据不一致风险。

### [维度04] designer-page treeDocument useState + useEffect props 同步

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:74-81`
- **严重程度**: P2
- **现状**: `treeDocument` 用 `useState` 初始化，通过 `useEffect` 在 `inputTreeDocument` 变化时同步。
- **建议**: 可考虑去掉 treeDocument state，直接在 useEffect 中使用 inputTreeDocument。
- **双状态详情**: `treeDocument`（local state）和 `inputTreeDocument`（props）。
- **同步失败症状**: 一帧内多次变化只会反映最后一次，不会出错。

---

## 总结

| 严重程度 | 数量 | 关键发现 |
|---------|------|---------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 3 | object-field working value cache、surface localOpen+SurfaceStore、designer-page treeDocument |
| P3 | 7 | array-editor/key-value/condition-builder ref 桥接、table-quick-edit、field-handlers、table axis hooks（非双状态）、variant-field、spreadsheet editing、flow-designer（合规） |

**整体评估**: 未发现 P0 级别的双状态缺陷。复杂表单字段渲染器已收敛为"从 store 读取 + ref 桥接"模式。

---

## 深挖第 2 轮追加

### [维度04] Word Editor EditorCanvas charts/codes 依赖导致编辑器全量重挂载 (P1)

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:148` 和 `packages/word-editor-renderers/src/word-editor-page.tsx:318-332`
- **严重程度**: P1
- **现状**: EditorCanvas 的挂载 useEffect 将 `charts` 和 `codes` 列为依赖项。用户插入 chart/code 时 setCharts 触发 effect 重执行 → cleanup 销毁编辑器实例 → setup 从 initialDocument 重建 → 刚插入的 chart 内容丢失。
- **风险**: 每次 chart/code 插入均复现。chart/code 模板表达式静默丢失，undo/redo 历史清空，光标位置丢失。
- **建议**: 将 charts/codes 从 effect 依赖数组中移除，改为 ref 传递。
- **双状态详情**: charts/codes（local state）驱动编辑器完整生命周期重挂载
- **同步失败症状**: 用户插入 chart 后编辑器中无对应内容

### 已审查无新问题的区域

report-designer-renderers/core, flux-react hooks.ts, flux-runtime stores, flux-code-editor, nop-debugger, spreadsheet-renderers (editing 之外), playground app — 均状态管理干净。
