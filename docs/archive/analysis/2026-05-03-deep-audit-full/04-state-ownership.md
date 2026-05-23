# 维度 04：状态所有权与单一事实来源

## 初审摘要

- 初审在 `word-editor-renderers` 中发现 2 条双状态线索。

## 维度复核结论

- `document` vs `charts/codes` 被文档定义为 persisted snapshot 与 live state 的不同语义面，驳回。
- `PageControls.margins` 作为本地 draft 与 bridge/store 镜像不同步成立，并进一步做了子项复核。

## 子项复核结论

- 本地 `margins` 默认值不会从当前 owner hydrate。
- Apply 后仅调用 bridge command，不回写 store；该本地 draft 不是合理的 UI 临时态。

## 通过复核的结论

### [维度04] Word Editor 页边距编辑存在脱离 owner 的第二份状态

- **文件**: `packages/word-editor-renderers/src/toolbar/page-controls.tsx:41-44`, `:86-89`; `packages/word-editor-core/src/editor-store.ts:46-50`, `:101-103`
- **证据片段**:

```tsx
41:   const [showMarginDialog, setShowMarginDialog] = useState(false);
42:   const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
43:   const [margins, setMargins] = useState<[number, number, number, number]>([100, 120, 100, 120]);
```

```tsx
86:   const handleApplyMargins = () => {
87:     bridge?.command?.executeSetPaperMargin(margins);
88:     setShowMarginDialog(false);
89:   };
```

- **严重程度**: P2
- **现状**: 页边距对话框使用硬编码本地 draft，打开时不从当前 paper settings 初始化，提交后也不回写 store。
- **风险**: 用户可能在查看和提交旧值，导致边距编辑 UI 与真实 owner 脱节。
- **建议**: 打开对话框时从当前 owner hydrate；Apply 后同步回写 owner。
- **复核状态**: 子项复核通过
