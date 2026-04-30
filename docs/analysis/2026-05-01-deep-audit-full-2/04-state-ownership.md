# 维度 04 审核：状态所有权与单一事实来源（初审）

## 总结

经逐一审查，当前代码库中 **不存在活跃的 P0 级双状态 bug**。ArrayEditor、KeyValue 等历史双状态问题已在之前的迭代中修复。复杂字段现在均从 form store / scope store 读取值，不再维护独立本地值镜像。

---

### [维度04-F1] ObjectField 的 resolvedValue 工作副本与 store 值形成双路径写入

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:133-185`
- **严重程度**: **P2**
- **现状**: 当 `schema.transformInAction` 存在时，ObjectField 维护一个 `resolvedValue` 本地 state 作为"工作副本"（`projectedValue`），同时子字段的 `writeProjectedValue` 先写 `resolvedValue`，再通过 `transformOutAction` 异步回写 store。
- **风险**: 在 `transformOut` 的 Promise 尚未 resolve 期间，`rawValue`（store）和 `projectedValue`（local）可能指向不同内容。但有序列号保护，实际竞态窗口极窄。
- **建议**: 当前设计是有意为之的 working copy 模式。建议在代码注释中记录状态流向。
- **双状态详情**: `resolvedValue`（local state）与 `rawValue`（来自 store）表达同一个字段值，但经过 transformIn 转换。
- **同步失败症状**: 极端竞态下，快速连续切换 transformOut 和 reset 可能让 UI 短暂展示旧值。

**证据片段**:

```tsx
// Line 133-134
const [resolvedValue, setResolvedValue] = React.useState(rawValue);
const projectedValue = usesWorkingValue ? resolvedValue : rawValue;

// Line 138-140
React.useEffect(() => {
    if (!usesWorkingValue || !schema.transformInAction) {
      setResolvedValue(rawValue);
      return;
    }
```

---

### [维度04-F2] TreeModeLayoutWrapper 的 props-to-state 同步链

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:62-68`
- **严重程度**: **P2**
- **现状**: `TreeModeLayoutWrapper` 用 `useState` 初始化 `treeDocument`，然后用 `useEffect` 监听 `inputTreeDocument` 变化并同步到 local state。
- **风险**: 存在一帧延迟。当外部 props 和设计器内部同时修改 `treeDocument` 时，useEffect 可能覆盖设计器内部的修改。
- **建议**: 这是设计器的过渡架构。长期应考虑将 treeDocument 移入 designer core store。
- **双状态详情**: `inputTreeDocument`（renderer props）与 `treeDocument`（local state）表达同一个树文档。
- **同步失败症状**: 外部更新 treeDocument 后 UI 延迟一帧反映。

**证据片段**:

```tsx
// Line 62-68
const [treeDocument, setTreeDocument] = React.useState<TreeDocument | undefined>(inputTreeDocument);
useEffect(() => {
  setTreeDocument(inputTreeDocument);
}, [inputTreeDocument]);
```

---

### [维度04-F3] TableQuickEditController 的 draftValue/savedValue props-to-state 同步

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:26-38`
- **严重程度**: **P2**
- **现状**: `useTableQuickEditController` 维护 `draftValue` 和 `savedValue` 两个 local state，并使用 `useEffect` 监听 `record` 变化来同步两者。
- **风险**: `draftValue` 和 `rowScope` 中的 `record.${field}` 是同一数据的不同来源。存在一帧延迟。实际风险较低。
- **建议**: 合理的快速编辑控制器设计。如需更精确同步，可考虑用 `useSyncExternalStore`。
- **双状态详情**: `draftValue`（local state）与 `rowScope.record[field]`（scope store）表达同一个单元格编辑值。
- **同步失败症状**: 在 record 更新的同一帧内检查 dirty 状态，可能得到过时结果。

**证据片段**:

```tsx
// Line 26-38
const [draftValue, setDraftValue] = useState(initialValue);
const [savedValue, setSavedValue] = useState(initialValue);
useEffect(() => {
  const nextValue = toOptionalDraftValue(record, field);
  setDraftValue(nextValue);
  setSavedValue(nextValue);
  setBodyDirty(false);
}, [field, record]);
```

---

### [维度04-F4] WordEditorPage 的 charts/codes/savedDocument 与 editorStore/dataStore 的双存

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:55-66`
- **严重程度**: **P3**
- **现状**: WordEditorPage 用 `useState` 维护 `charts`、`codes`、`savedDocument`，同时这些数据也通过 `editorStore` 和 `datasetStore` 管理。
- **风险**: 当前只有 append 语义，暂无删除/更新操作。随着功能扩展应迁移。
- **建议**: 这是 word-editor 的初始实现切片。随着功能扩展，应将 charts/codes 完整生命周期移入 editorStore。
- **双状态详情**: `charts`/`codes`（local state）与 `CanvasEditorBridge` 内部列表表达同一份数据。
- **同步失败症状**: 未来增加删除功能时可能出现不一致。

**证据片段**:

```tsx
// Line 55-66
const [charts, setCharts] = useState<DocChart[]>(
  () => (props.props.initialCharts as DocChart[] | undefined) ?? [],
);
const [codes, setCodes] = useState<DocCode[]>(
  () => (props.props.initialCodes as DocCode[] | undefined) ?? [],
);
```

---

### [维度04-F5] SurfaceRenderer 的 localOpen 与 controlledOpen 双路径

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:38-39`
- **严重程度**: **P3**
- **现状**: `useSurfaceRenderer` 维护 `localOpen` state 用于非受控模式，`surfaceStackSnapshot` 通过 useEffect + useState 同步，引入一帧延迟。
- **建议**: 当前实现是合理的 controlled/uncontrolled 模式。`surfaceStackSnapshot` 可优化为 `useSyncExternalStore`。
- **双状态详情**: `localOpen`（local state）与 `controlledOpen`（props）是互斥选择，不是同一数据的两个副本。

**证据片段**:

```tsx
// Line 38-39
const [localOpen, setLocalOpen] = React.useState(Boolean(props.props.defaultOpen ?? false));
const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : localOpen;
```

---

### [维度04-F6] VariantField 的 userSelectedKey / detectedKey 与 store 值的派生关系

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:98-106`
- **严重程度**: **P3**
- **现状**: VariantField 维护 `userSelectedKey` 和 `detectedKey` 两个 local state，与 `matchedKey`（从 store 值计算）构成 `activeKey` 优先级链。
- **建议**: 当前优先级链语义清晰。这些 state 不表达表单值本身，而是"用户选择了哪个变体分支"这一 UI 状态。
- **双状态详情**: local state 与 `matchedKey` 共同决定 activeKey，但不直接表达表单提交值。

**证据片段**:

```tsx
// Line 98-106
const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);
const activeKey = React.useMemo(() => {
  if (matchedKey) return matchedKey;
  if (userSelectedKey) return userSelectedKey;
  if (detectedKey) return detectedKey;
  return initialKey;
}, [matchedKey, userSelectedKey, detectedKey, initialKey]);
```

---

## 无问题的模式（审核后排除）

1. **ArrayEditor** - 已修复历史双状态问题，值直接从 store selector 读取。
2. **KeyValue** - 同 ArrayEditor 模式。
3. **ConditionBuilder** - 值从 `useFormFieldController` 读取。
4. **TagList** - 值从 `useFormFieldController` 读取，直接写 store。
5. **Table controls** - 采用三态互斥模式。
6. **Designer components** - 核心状态通过 Zustand store 管理。
7. **Spreadsheet** - `editingCell`/`editValue` 是局部编辑状态。
8. **CodeMirror** - `view` state 是 EditorView 实例引用，不是表单值。
9. **CrudRenderer** - 状态全部通过 scope store 读写。

## 维度复核结果

| 发现     | 初审 | 复核     | 理由                                          |
| -------- | ---- | -------- | --------------------------------------------- |
| F1 (P2)  | 保留 | **保留** | 工作副本模式经代码验证，单向写入+完备竞态保护 |
| F2 (P2)  | 保留 | **保留** | props-to-state 同步经确认，过渡架构           |
| F3 (P2)  | 保留 | **保留** | draftValue/savedValue 是编辑器 UI 概念        |
| F4 (P3)  | 保留 | **保留** | 初始实现切片                                  |
| F5 (P3)  | 保留 | **保留** | 互斥数据源，严格单向流                        |
| F6 (P3)  | 保留 | **保留** | 优先级解析链正确                              |
| 排除清单 | 合规 | **确认** | 逐个验证均无 dual-path write                  |

复核无修改，无新发现。
