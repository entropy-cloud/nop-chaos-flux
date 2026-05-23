# 维度18 跨包模式一致性

- 初审发现数: 2
- 复核结果: 保留 1 / 降级 1 / 驳回 0

### [维度18] spreadsheet/report host family 的 namespaced action 返回面丢失统一错误语义

- **涉及包**: `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/report-designer-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **文件**: `packages/spreadsheet-renderers/src/page-renderer.tsx:35-47,57-67`, `packages/report-designer-renderers/src/page-renderer.tsx:37-49,59-69`, `packages/flow-designer-renderers/src/designer-context.ts:100-105`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:15-17`
- **证据片段**:

```ts
return {
  ok: Boolean((response as { ok?: unknown }).ok),
  data: response,
};
```

- **严重程度**: P1
- **不一致类别**: 错误处理 / ActionResult 契约
- **包 A 模式**: flow/word 会把失败暴露到顶层 `ActionResult.error`。
- **包 B 模式**: spreadsheet/report 只保留顶层 `ok`，把 core 结果整体塞进 `data`，错误落到 `data.error`。
- **统一建议**: 统一把 core `error` 映射到顶层 `ActionResult.error`，保留共享 host action 结果面。
- **为什么值得现在做**: 这已影响跨包 action chaining、onError 和调试观察面的可替换性。
- **误报排除**: 不是实现风格差异；统一错误字段已在 `flux-core` 的 `ActionResult` 上定义。
- **历史模式对应**: lossy result normalization across host families。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: `子项复核通过`

### [维度18] workbench 家族的默认 UI 文案 i18n 收敛不完整

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/report-designer-renderers`
- **文件**: `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx`, `packages/word-editor-renderers/src/toolbar/page-controls.tsx`, `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`, `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- **严重程度**: P2
- **不一致类别**: 文本 / i18n
- **包 A 模式**: page shell 层已较多使用 `flux-i18n`。
- **包 B 模式**: 若干下层 toolbar/dialog/default items 仍硬编码默认英文文案。
- **统一建议**: 包自带默认 UI 文案统一接入 `@nop-chaos/flux-i18n`；只把 schema 作者自定义文案排除在外。
- **为什么值得现在做**: 这是共享 workbench family 的一致性债务，拖久后补齐成本更高。
- **误报排除**: 不包含测试文案、业务数据标签或作者输入 schema 文本。
- **历史模式对应**: partial i18n adoption across sibling host packages。
- **参考文档**: `AGENTS.md`, `docs/architecture/word-editor/design.md`
- **复核状态**: `已降级`
