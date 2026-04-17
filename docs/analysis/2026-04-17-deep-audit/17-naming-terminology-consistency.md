# 17 命名与术语一致性

- Task ID: `ses_268b24db9ffeQduL4y0KA5NG2F`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## 命名冲突清单

### [维度17] DataSource 发布标识仍存在 `name` vs `dataPath` 双字段（已自动化）
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\schema.ts:125-136`
- **严重程度**: P1
- **冲突名称**: `name` vs `dataPath`
- **冲突位置**: `packages/flux-runtime/src/source-registry.ts:56-63` 仍把两者都当作发布目标；`packages/flux-renderers-data/src/__tests__/data-source.test.tsx:7-18` 仍同时覆盖“按 `name` 发布”和“按 `dataPath` 发布”
- **统一建议**: 统一以 `name` 作为唯一规范作者字段；`dataPath` 仅保留兼容层并明确标注 deprecated，不再作为新示例、测试命名和默认 authoring 路径
- **参考文档**: `docs/references/terminology.md`, `docs/references/flux-json-conventions.md`

### [维度17] 渲染器实现文件名在裸名与 `*-renderer.tsx` 之间混用（需人工收敛）
- **文件**: `packages/flux-renderers-basic/src/button.tsx:1-9`
- **严重程度**: P3
- **冲突名称**: 裸文件名（如 `button.tsx` / `designer-page.tsx`）vs 后缀文件名（如 `table-renderer.tsx` / `code-editor-renderer.tsx` / `page-renderer.tsx`）
- **冲突位置**: `packages/flow-designer-renderers/src/designer-page.tsx:1-20` 与 `packages/flux-renderers-basic/src/button.tsx:1-9` 使用裸名；`packages/flux-renderers-data/src/table-renderer.tsx:1-45`、`packages/flux-code-editor/src/code-editor-renderer.tsx:1-40`、`packages/report-designer-renderers/src/page-renderer.tsx:1-20` 使用 `*-renderer` 命名
- **统一建议**: 为“导出的 renderer 实现文件”统一采用一种项目级规则；建议统一为 `*-renderer.tsx`，避免跨包检索同类实现时出现双模式
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/frontend-baseline.md`

其余本次检查项未发现需要报告的问题。
