# 07 Lifecycle

- 深挖轮次: 3
- 深挖发现数: 6
- 维度复核: 3 保留 / 2 降级 / 1 驳回
- 子项复核: 无单独高风险成立项

## 第 1 轮初审

- declarative surface close summary 仍由 React 侧参与发布
- form status publication 仍由 renderer effect 聚合并发布

## 深挖第 2 轮追加

- report-designer page renderer 在 React 层重复 kick off 初始 refresh
- form initAction 生命周期仍由 renderer effect 管理

## 深挖第 3 轮追加

- `EditorCanvas` 在 React effect 中直接管理文档恢复/自动保存/localStorage
- `word-editor-page` effect 管理 datasets 恢复与 schema seed precedence

## 维度复核结论

保留:

- form status/values publication 仍为 renderer-side effect
- `EditorCanvas` 文档恢复/自动保存副作用仍在 renderer
- `word-editor-page` datasets 初始化 precedence 仍挂在 page effect

降级:

- report-designer 初始 refresh 重复 kick off
- form initAction 仍在 renderer effect

驳回:

- use-surface-renderer “重复 publishClosed” 线索不成立

## 最终保留项

### [维度07] Form 的 `statusPath` / `valuesPath` 外部发布仍由 renderer effect 聚合承担

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`
- **严重程度**: P2
- **现状**: React 层订阅 form store、组装 summary 后写回 parent scope
- **风险**: owner publication 语义持续留在 renderer，而不是 runtime owner
- **建议**: 下沉到 `FormRuntime`
- **复核状态**: 维度复核通过

### [维度07] Word Editor 的恢复/自动保存与 dataset bootstrap 仍由 renderer 生命周期直接管理

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`
- **严重程度**: P2
- **现状**: 文档恢复、autosave、localStorage、datasets 恢复/覆盖都在 React effect 中执行
- **风险**: owner precedence 与持久化边界被 UI 挂载顺序隐式决定
- **建议**: 收敛到 `word-editor-core` 的统一 bootstrap/persistence owner
- **复核状态**: 维度复核通过
