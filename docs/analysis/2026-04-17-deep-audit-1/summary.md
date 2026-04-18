# 深度审核汇总报告

## 审核范围

- 执行维度：01-18 全量
- 审核日期：2026-04-17
- 结果目录：`docs/analysis/2026-04-17-deep-audit-full-opencode/`
- 执行方式：18 个初审子 agent + 18 个维度复核子 agent + 70+ 个逐项复核子 agent

## 复核统计

- 初审候选数：56
- 维度复核后保留/补充候选数：66
- 已逐项独立复核条目数：66
- 最终保留：62
- 降级保留：9
- 驳回：4

## P1 清单

- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`: spreadsheet selection 双事实源
- `packages/flux-renderers-form/src/field-utils.tsx`: `useFormFieldController` whole-form 订阅单字段
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`: schemaApi 切换竞态
- `packages/flux-runtime/src/form-runtime-field-ops.ts`: hidden 字段切换未立即清理/失效旧校验
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`: `frameWrap: none` 后无单一 root
- `apps/playground/src/flow-designer-nodes.css`: Flow Designer BEM 节点模板未迁移
- `packages/flux-i18n/src/i18n.ts`: 基础 i18n 包完全无测试
- `docs/architecture/renderer-runtime.md` + `packages/flux-react/src/schema-renderer.tsx`: `surfaceRuntime` 文档/类型已声明但实现未接线
- `docs/components/crud/design.md` + `docs/components/crud/example.json`: CRUD 仍指导作者使用 `actionType`
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`: code-editor 绕过共享字段控制器
- `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`: Condition Builder `any` + 真空值崩溃
- `packages/flux-renderers-data/src/chart-renderer.tsx`: chart 数组元素空值崩溃
- `packages/flux-renderers-data/src/table-renderer/table-data.ts`: table 数组元素空值崩溃

## 高频问题文件

- `packages/flux-react/src/hooks.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/report-designer-renderers/src/index.ts`

## 跨维度模式

- 表单链路仍存在 whole-store 广播读取单字段数据的问题。
- 多个 designer/editor 包的根入口 API 面明显宽于真实稳定契约。
- 文档层对验证系统、根入口契约和术语更新存在同步滞后。
- spreadsheet renderer 与 core 之间仍有 owner 漂移，尤其 selection/editing/edit buffer。

## 已自动化覆盖项

- oversized code file 基线检查
- package `build` / `tsconfig.build.json` / `exports` 基础检查
- 一方源码中 `eval` / `new Function` 搜索
- 多处 validation / runtime 集成路径已有间接测试覆盖

## 建议新增的自动化检查

- 针对 `frameWrap: none` 的 field renderer root/meta 合规测试
- 针对 form field 订阅范围的静态检查或 targeted benchmark
- 针对 slot-like schema 字段必须在 renderer metadata 中声明的校验
- 针对根入口过宽导出的 API surface 审计脚本
- 针对用户可见硬编码英文的 lint/check

## 可暂缓项

- `theme-tokens` CSS export 指向 `src` 的一致性问题
- `useCurrentFormModelGeneration()` 订阅范围过宽
- `designer-page.tsx` 超过 500 行的拆分评估
- 低层 helper 缺少直接单测但已有间接覆盖的项目

## 误报排除清单

- `word-editor-renderers` 根入口导出较多 UI 组件：更像 API 表面积选择，不构成模块职责违规
- `DynamicRenderer` 不应归类为“生命周期归属错误”；核心问题是异步取消与 stale guard
- `word-editor` / `code-editor` 并非“完全未接入 i18n”，而是部分接入后仍有硬编码残留
