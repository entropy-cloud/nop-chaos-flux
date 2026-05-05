# 维度 18：跨包模式一致性

## 初审

- 初审保留 2 条：host renderer authoring metadata 不一致、跨包 i18n 仍是“部分可翻译”。

## 维度复核

- 保留：host page 缺少 `rendererClass` 等 authoring metadata。
- 降级：运行时硬编码文案需逐文件清点，不作一刀切主问题。

## 最终结论

### [维度18] host page renderer 缺少 `rendererClass`，shared tooling 会误判成 `instance-renderer`

- **涉及包**: `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/report-designer-renderers`, `@nop-chaos/word-editor-renderers`, 对照 `@nop-chaos/flow-designer-renderers`
- **文件**: `packages/spreadsheet-renderers/src/renderers.tsx:11-17`, `packages/report-designer-renderers/src/renderers.tsx:31-37`, `packages/word-editor-renderers/src/renderers.tsx:13-27`, `packages/flow-designer-renderers/src/index.tsx:26-31`
- **证据片段**:
  ```ts
  rendererClass: definition.rendererClass ?? 'instance-renderer';
  ```
- **严重程度**: P1
- **不一致类别**: 注册模式 / authoring metadata
- **包 A 模式**: `designer-page` 明确声明 `rendererClass: 'domain-host-renderer'`、`sourcePackage`、`rendererTraits`。
- **包 B 模式**: spreadsheet/report/word host page 只有 `hostContract`，缺省会被 shared tooling 解析成 `instance-renderer`。
- **统一建议**: 最小必须补 `rendererClass: 'domain-host-renderer'`；建议同步补 `sourcePackage`、`rendererTraits`。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: `子项复核通过`

### [维度18] 多个工作台包仍是“部分可翻译”

- **涉及包**: `@nop-chaos/word-editor-renderers`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/report-designer-renderers`
- **文件**: `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar/find-replace-panel.tsx`, `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- **证据片段**:
  ```tsx
  placeholder="Search text..."
  DialogTitle>{isEditMode ? 'Edit Dataset' : 'Create Dataset'}</DialogTitle>
  ```
- **严重程度**: P3
- **不一致类别**: 文本 / i18n
- **包 A 模式**: 同组件内多数按钮/文案已走 `t('flux.*')`。
- **包 B 模式**: 仍混入直接硬编码的用户可见文案。
- **统一建议**: 逐文件清点并迁到 `flux.*` key，但当前先作为范围较大的收尾项记录。
- **参考文档**: `AGENTS.md`, `packages/flux-i18n/src/i18n.ts`
- **复核状态**: `已降级`
