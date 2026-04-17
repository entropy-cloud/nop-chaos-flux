# 17 命名与术语一致性

- Task ID: `ses_268b24db9ffeQduL4y0KA5NG2F`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## Verification Audit: 2026-04-17

All issues were re-verified against the live repo. Results below.

## 命名冲突清单

### [维度17] DataSource 发布标识仍存在 `name` vs `dataPath` 双字段 — ✅ CONFIRMED, FIXED
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\schema.ts:125-136`
- **严重程度**: P1
- **冲突名称**: `name` vs `dataPath`
- **冲突位置**: `packages/flux-runtime/src/source-registry.ts` 把两者都当作发布目标；测试同时覆盖"按 `name` 发布"和"按 `dataPath` 发布"
- **统一建议**: 统一以 `name` 作为唯一规范作者字段；`dataPath` 仅保留兼容层并明确标注 deprecated，不再作为新示例、测试命名和默认 authoring 路径
- **参考文档**: `docs/references/terminology.md`, `docs/references/flux-json-conventions.md`
- **验证结果**: `BaseDataSourceSchema` 同时定义了 `name?: string` 和 `dataPath?: string`，语义有重叠。
- **修复**: 已完成以下变更：
  - 从 `BaseDataSourceSchema` 移除 `dataPath` 字段
  - 从 `source-registry.ts` 移除 `dataPath` fallback 分支，`name` 为唯一发布路径
  - `renderer-core.ts` 的 `createDataSourceController` API 参数从 `dataPath` 改为 `targetPath`
  - `runtime-factory.ts` 映射从 `targetPath: inputValue.dataPath` 改为 `targetPath: inputValue.targetPath`
  - 所有 DataSource schema 测试从 `dataPath` 迁移到 `name`
  - 所有直接 API 调用测试从 `dataPath` 迁移到 `targetPath`
  - 文档 `api-data-source.md`、`frontend-programming-model.md`、`terminology.md` 同步更新
  - 注意：`ActionSchema.dataPath`（ajax 结果写入页面数据）和 `flux-code-editor` 的 `dataPath`（数据提取路径）不受影响

### [维度17] 渲染器实现文件名在裸名与 `*-renderer.tsx` 之间混用 — ✅ CONFIRMED, NOT FIXED (P3 style-only)
- **文件**: `packages/flux-renderers-basic/src/button.tsx:1-9`
- **严重程度**: P3
- **冲突名称**: 裸文件名（如 `button.tsx` / `designer-page.tsx`）vs 后缀文件名（如 `table-renderer.tsx` / `code-editor-renderer.tsx` / `page-renderer.tsx`）
- **冲突位置**: `packages/flow-designer-renderers/src/designer-page.tsx:1-20` 与 `packages/flux-renderers-basic/src/button.tsx:1-9` 使用裸名；`packages/flux-renderers-data/src/table-renderer.tsx`、`packages/flux-code-editor/src/code-editor-renderer.tsx`、`packages/report-designer-renderers/src/page-renderer.tsx` 使用 `*-renderer` 命名
- **统一建议**: 为"导出的 renderer 实现文件"统一采用一种项目级规则；建议统一为 `*-renderer.tsx`，避免跨包检索同类实现时出现双模式
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/frontend-baseline.md`
- **验证结果**: 文件名确实不一致，但这是 P3 风格问题。重命名涉及所有 import 路径更新，风险高于收益。建议在后续批量重构中统一。

其余本次检查项未发现需要报告的问题。
