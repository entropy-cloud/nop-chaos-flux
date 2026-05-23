# 04 状态所有权与单一事实来源

## 复核统计

- 初审条目: 2
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 0
- 降级: 2
- 驳回: 0

## 已降级

### [维度04] tree-mode designer 保留了 props + local state 双事实源

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:62-69`, `packages/flow-designer-renderers/src/designer-page.tsx:452-455`, `packages/flow-designer-renderers/src/designer-command-adapter.ts:58-64`
- **证据片段**:
  ```tsx
  62: const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  63: const [treeDocument, setTreeDocument] = React.useState<TreeDocument | undefined>(
  67:   setTreeDocument(inputTreeDocument);
  ```
  ```ts
  58: function applyTreeDocument(nextTree: TreeDocument): void {
  62:   treeOwner.setTreeDocument(nextTree);
  ```
- **严重程度**: P2
- **现状**: tree 可编辑文档既从 resolved prop 进入，又被本地 `useState` 持有并由命令系统直接写入。
- **风险**: 父级重新解析/刷新 `treeDocument` 时可能覆盖本地编辑，宿主与编辑器看到的 owner 也会分裂。
- **建议**: 统一为 fully controlled 或 fully local owner，不要同时保留 props-to-state sync 链。
- **为什么值得现在做**: 这是 tree mode 的核心 authoring 文档，不是局部 UI 展开态。
- **误报排除**: item review确认命令写的是本地 state，而不是回写 resolved prop。
- **历史模式对应**: props-to-state 双事实源
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: `已降级`

### [维度04] table quick-edit 在默认 field 模式下仍保留 local draft + rowScope 双状态路径

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:25-27`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:74-79`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:48-58`
- **证据片段**:
  ```ts
  25: const initialValue = toOptionalDraftValue(record, field);
  26: const [draftValue, setDraftValue] = useState(initialValue);
  27: const [savedValue, setSavedValue] = useState(initialValue);
  ```
  ```ts
  74: const handleInlineValueChange = useCallback(
  76:   setDraftValue(nextValue);
  78:   rowScope.update(`record.${field}`, nextValue);
  ```
- **严重程度**: P2
- **现状**: 默认 field-based quick-edit 同时维护 `draftValue/savedValue` 和 `rowScope.record.<field>`。
- **风险**: save/cancel/restore 的 owner 语义更容易继续膨胀成双写链。
- **建议**: 收口为单一 owner；若保留 custom-body 模式，也应区分哪条路径允许 local draft。
- **为什么值得现在做**: 当前测试已证明 change 会同时改本地和 row scope。
- **误报排除**: item review明确缩窄为默认 field 模式，不泛化到全部 custom-body quick-edit。
- **历史模式对应**: complex field/store mirror
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `已降级`

## 零发现

- 未把 `use-surface-renderer` 的 local/controlled open path 误判为双 owner。
- 未确认 detail draft runtime、report designer local collapsed flags 等局部 UI 状态构成第二事实源。
