# 182 Deep Audit Full-3 Mechanical Fixes

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full-3/summary.md`
> Related: `docs/analysis/2026-05-02-deep-audit-full-3/{01,05,06,09,15,18}-*.md`

## Purpose

修正 `deep-audit-full-3` 审核中可直接执行的机械性缺陷：i18n 文本硬编码、渲染器 marker class 缺失、Flex 隐式样式、空 startTransition、依赖分类错误。

## Current Baseline

- 审核于 2026-05-02 完成，共 0 P0 / 7 P1 / ~24 P2 / ~24 P3
- P1 中有 2 项 i18n 缺陷（crud-renderer-toolbar.tsx）已修复
- P1 中 3 项巨型文件拆分不在本计划范围，现由 `docs/plans/185-large-file-hotspot-split-plan.md` owning
- P1 中 2 项类型系统改动不在本计划范围，现由 `docs/plans/183-renderer-props-and-host-neutral-typing-convergence-plan.md` owning
- Phase 3（void promise .catch()）经复核确认为误报，已跳过

## Goals

- ✅ 修复 CRUD 工具栏 2 项 P1 i18n 缺陷
- ✅ 为 7 个 form-advanced 渲染器添加 nop-\* marker class 和 cn() 采用
- ⏭️ ~~为 3 处 void promise 链添加 .catch() 保护~~ — 误报（内部已有 try/catch）
- ✅ 移除 Flex 渲染器硬编码 flex class
- ✅ 移除空 startTransition 调用
- ✅ 修正 2 个包的 flux-compiler 依赖分类（实际为完全移除，因未被使用）

## Non-Goals

- 巨型文件拆分（`field-utils.tsx`, `api-data-source-controller.ts`, `spreadsheet-toolbar.tsx`）→ `docs/plans/185-large-file-hotspot-split-plan.md`
- 渲染器类型系统改动（`RendererHelpers.render` / `RendererDefinition.component`）→ `docs/plans/183-renderer-props-and-host-neutral-typing-convergence-plan.md`
- `requiredWhen` per-path 订阅 bug → `docs/plans/184-reactive-hot-path-precision-and-notification-scaling-plan.md`
- `detail-view` async sequencing / stale-result guard → `docs/plans/186-detail-and-variant-async-sequencing-safety-plan.md`
- `variant-field` async sequencing / race guard → `docs/plans/186-detail-and-variant-async-sequencing-safety-plan.md`
- 文件拆分相关 P2 项（`schema-compiler`, `runtime-factory`, `reaction-runtime`, `form-runtime`, 测试文件）仍超出本计划与当前 successor set scope；若转为 active work，需再按 owner surface 单独起 plan

## Scope

### In Scope

- `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`
- `packages/flux-i18n/src/locales/zh-CN.ts` + `en-US.ts`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
- `packages/flux-renderers-basic/src/flex.tsx`
- `packages/flux-react/src/default-spacing.css`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts`
- `packages/flux-renderers-form/package.json`
- `packages/flux-renderers-data/package.json`

### Out Of Scope

- 所有巨型文件拆分
- 类型系统改动
- 订阅精度 bug
- 新增自动化检查（eslint 规则等）

## Execution Plan

### Phase 1 - CRUD i18n 修复

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`, `packages/flux-i18n/src/locales/zh-CN.ts`, `packages/flux-i18n/src/locales/en-US.ts`

- [x] 在 zh-CN.ts 的 `flux.pagination` 中添加 `total: '共 {{count}} 条'` 和 `previous: '上一页'` 和 `next: '下一页'`
- [x] 在 en-US.ts 的 `flux.pagination` 中添加 `total: 'Total {{count}}'` 和 `previous: 'Previous'` 和 `next: 'Next'`
- [x] 在 crud-renderer-toolbar.tsx 替换硬编码英文为 `t('flux.pagination.page', ...)`，使用 `Math.ceil(summary.total / pagination.pageSize)` 计算 totalPages
- [x] 在 crud-renderer-toolbar.tsx 替换 `t('flux.common.collapse')` 为 `t('flux.pagination.previous')`
- [x] 在 crud-renderer-toolbar.tsx 替换 `t('flux.common.expand')` 为 `t('flux.pagination.next')`

Exit Criteria:

- [x] CRUD 工具栏在中文环境显示"上一页"/"下一页"而非"折叠"/"展开"
- [x] 页码显示使用 i18n 模板而非硬编码英文
- [x] `pnpm typecheck` 通过

### Phase 2 - 渲染器 marker class + cn()

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{array-editor,key-value,tag-list,condition-builder,...}.tsx`

- [x] array-editor.tsx — className 从 `"grid gap-3"` 改为 `cn('nop-array-editor', 'grid gap-3')`，导入 cn
- [x] key-value.tsx — className 从 `"grid gap-3"` 改为 `cn('nop-key-value', 'grid gap-3')`，导入 cn
- [x] tag-list.tsx — className 从 `"flex flex-wrap gap-2.5"` 改为 `cn('nop-tag-list', 'flex flex-wrap gap-2.5')`，导入 cn
- [x] array-field.tsx — 添加 `cn('nop-array-field')` 到根 div，导入 cn
- [x] object-field.tsx — 添加 `cn('nop-object-field')` 到根 div，新增 cn 导入
- [x] detail-field.tsx — 添加 `cn('nop-detail-field')` 到根 div，导入 cn
- [x] condition-builder.tsx — 两处 `className="nop-condition-builder"` 改为 `cn('nop-condition-builder')`，导入 cn

Exit Criteria:

- [x] 7 个渲染器根元素均有 nop-\* marker class
- [x] 所有 className 使用 cn() 合并
- [x] `pnpm typecheck` 通过
- [x] `pnpm test` 通过

### Phase 3 - 异步安全 .catch()

Status: cancelled

经复核，3 处 `void` promise 调用的目标函数（`runRequest`、`runReaction`）均有完整的 try/catch/finally 内部处理，不会产生 unhandled rejection。`void` 仅表示不 await，不等于 unhandled。添加 `.catch(() => {})` 是冗余的。

- [x] 确认 api-data-source-controller.ts:467 `void runRequest()` — runRequest 内部有 try/catch/finally
- [x] 确认 api-data-source-controller.ts:477 `void runRequest().finally(...)` — 同上
- [x] 确认 reaction-runtime.ts:321 `void Promise.resolve().then(invoke)` — invoke 调用的 runReaction 有 try/catch

### Phase 4 - Flex / startTransition / 依赖分类

Status: completed
Targets: `packages/flux-renderers-basic/src/flex.tsx`, `packages/flux-react/src/default-spacing.css`, `packages/spreadsheet-renderers/.../use-sheet-commands.ts`, `packages/flux-renderers-form/package.json`, `packages/flux-renderers-data/package.json`

- [x] flex.tsx — 移除硬编码 `'flex'`，在 default-spacing.css 添加 `.nop-flex { display: flex; }` 通过 CSS 层提供
- [x] use-sheet-commands.ts — 删除 `startTransition(() => {});` 空调用，移除 startTransition 导入
- [x] flux-renderers-form/package.json — 移除未使用的 `@nop-chaos/flux-compiler` 依赖（非移至 devDependencies，而是完全移除）
- [x] flux-renderers-data/package.json — 移除未使用的 `@nop-chaos/flux-compiler` 依赖（同上）

Exit Criteria:

- [x] Flex 渲染器不再硬编码 `display: flex`，通过 CSS 层提供
- [x] 空 startTransition 已删除
- [x] 两个包的 flux-compiler 未使用依赖已移除
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过（仅预存问题）
- [x] `pnpm test` 通过

## Validation Checklist

- [x] 所有 P1 i18n 缺陷已修复，中文环境显示正确
- [x] 7 个渲染器均有 nop-\* marker class 和 cn()
- [x] Phase 3 void promise 已确认为误报，跳过合理
- [x] Flex 无硬编码隐式样式
- [x] 空 startTransition 已删除
- [x] 2 个未使用依赖已移除
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过（预存 schema-renderer.tsx 依赖项警告不影响）
- [x] `pnpm test` 通过

## Follow-up

- **巨型文件拆分计划**: `docs/plans/185-large-file-hotspot-split-plan.md`
- **渲染器类型系统计划**: `docs/plans/183-renderer-props-and-host-neutral-typing-convergence-plan.md`
- **订阅精度计划**: `docs/plans/184-reactive-hot-path-precision-and-notification-scaling-plan.md`
- **detail/variant 异步 sequencing 计划**: `docs/plans/186-detail-and-variant-async-sequencing-safety-plan.md`
