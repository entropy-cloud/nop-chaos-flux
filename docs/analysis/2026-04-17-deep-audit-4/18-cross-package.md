# 维度 18：跨包模式一致性

## 初审概览
- 初审候选：5
- 维度复核：2 条保留，3 条降级

## 条目复核
### [降级] `flux-code-editor` 缺少统一包级 renderer 注册入口
- **关键文件**: `packages/flux-code-editor/src/index.ts`, `packages/flux-code-editor/src/code-editor.integration.test.tsx`, `apps/playground/src/pages/CodeEditorPage.tsx:263`
- **说明**: 是真实的一致性偏差，但当前只有单个 renderer，影响仍属低强度。

### [保留] condition-builder 自建私有 i18n
- **关键文件**: `packages/flux-renderers-form-advanced/src/condition-builder/i18n.ts`, `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx`
- **说明**: 该包已依赖 `flux-i18n`，但 condition-builder 仍维护并行文本体系。

### [降级] `flux-renderers-form/src/renderers/input.tsx` 混用 `t()` 与英文硬编码
- **关键文件**: `packages/flux-renderers-form/src/renderers/input.tsx:64,103,200,221,262`
- **说明**: 影响真实存在，但范围集中在单文件残留。

### [降级] `nop-debugger` overview tab 混用 `t()` 与英文硬编码
- **关键文件**: `packages/nop-debugger/src/panel/overview-tab.tsx:22-58`
- **说明**: 属于局部 i18n 覆盖不完整，而非更大契约分叉。

### [保留] `word-editor-renderers` 已接入 `flux-i18n`，但仍残留大量英文硬编码
- **关键文件**: `packages/word-editor-renderers/src/WordEditorPage.tsx`, `packages/word-editor-renderers/src/toolbar/RibbonToolbar.tsx`, `packages/word-editor-renderers/src/toolbar/SearchReplace.tsx`, `packages/word-editor-renderers/src/toolbar/PageControls.tsx`
- **说明**: 同一产品面同时存在 locale key 和大量裸字符串，已形成持续维护成本。
