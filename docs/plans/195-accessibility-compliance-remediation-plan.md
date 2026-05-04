# 195 Accessibility Compliance Remediation

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/analysis/2026-05-04-adversarial-review-7.md` (R7-F1 to F7), `docs/analysis/2026-05-04-adversarial-review-2.md` (R2-F7)
> Related: plan-192 (Phase 3.1 covers aria-describedby only; this plan covers full a11y)

## Purpose

修复表单和数据渲染器的 WCAG 2.1 AA 违规问题，使核心 UI 组件对键盘用户和屏幕阅读器用户可用。

## Current Baseline

- `FieldError` 渲染 `<span>` 无 `role="alert"` / `aria-live`（R7-F1, CRITICAL）
- `FieldLabel` 渲染 `<span>` 而非 `<label>`，无 `htmlFor` 关联（R7-F2, CRITICAL）
- Condition Builder 删除按钮 hover-only 可见 + 无 `aria-label`（R7-F3, HIGH）
- Array Field 增删无 focus management（R7-F4, HIGH）
- Tree renderer 缺少 ARIA tree role 语义（R7-F5, MEDIUM）
- Table 排序缺少 `aria-sort`（R7-F6, MEDIUM）
- Loading overlay 缺少 `role="status"`（R7-F7, MEDIUM）
- form-advanced icon-only 按钮缺少 `aria-label`（R2-F7, MEDIUM）
- Plan-192 Phase 3.1 仅覆盖 `aria-describedby` 关联

## Goals

- 所有表单 field 有正确的 label-input 关联
- 动态内容（验证错误、加载状态）有 live region 通告
- 所有交互元素键盘可达且有 accessible name
- 复合控件有正确的 ARIA role 语义

## Non-Goals

- Color contrast 审计（需要运行时渲染验证，超出本计划范围）
- 完整的 ARIA Authoring Practices 实现（如 tree 的完整键盘导航——标记为后续方向）

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/shared/error.tsx` — live region
- `packages/flux-renderers-form/src/renderers/shared/label.tsx` — `<label>` + `htmlFor`
- `packages/flux-renderers-form-advanced/src/condition-builder/` — a11y 补全
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` — focus management
- `packages/flux-renderers-data/src/tree-renderer.tsx` — ARIA tree roles
- `packages/flux-renderers-data/src/table-renderer.tsx` — `aria-sort`
- `packages/flux-renderers-data/src/table-renderer/table-loading-overlay.tsx` — `role="status"`
- form-advanced 所有 icon-only 按钮的 `aria-label`

### Out Of Scope

- Color contrast verification
- Tree 完整键盘导航（Up/Down/Left/Right arrows）
- Dialog/Drawer focus trap（Radix 已处理）

## Closure Gates

- [ ] 所有 CRITICAL + HIGH a11y defects 已修复
- [ ] 每项修复有 focused test（检查 DOM attribute 存在性）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/logs/` 已更新

## Deferred But Adjudicated

### Tree 完整键盘导航

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 基础 ARIA role 已加，完整键盘导航是增强功能
- Successor Required: no

## Execution Plan

### Phase 1 - 表单基础 A11y（CRITICAL）

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/shared/`

- Item Types: Fix

- [ ] [Fix] `error.tsx` — `<span>` 改为 `<span role="alert" aria-live="assertive">`（或包裹在 live region 中）
- [ ] [Fix] `label.tsx` — `<span data-slot="field-label">` 改为 `<label data-slot="field-label" htmlFor={inputId}>`。需要在 FieldFrame 层生成唯一 `inputId` 并传递给 label 和 input
- [ ] [Fix] 所有 form field renderers（input.tsx, select 等）接收并使用 `id={inputId}` 属性
- [ ] [Proof] 测试：FieldError 渲染后 DOM 包含 `role="alert"`
- [ ] [Proof] 测试：FieldLabel 渲染为 `<label>` 元素且 `htmlFor` 指向正确 input id

Exit Criteria:

- [ ] `<label>` + `htmlFor` 关联在所有 form fields 生效
- [ ] 验证错误出现时 screen reader 自动通告
- [ ] `docs/architecture/renderer-runtime.md` 更新 field a11y contract
- [ ] `docs/logs/` 已更新

### Phase 2 - 复合控件 A11y

Status: planned
Targets: `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-data/`

- Item Types: Fix

- [ ] [Fix] `condition-item.tsx:141-148` — 删除按钮添加 `aria-label={t('flux.conditionBuilder.removeCondition')}`；将 `opacity-0 group-hover:opacity-100` 改为 `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100`
- [ ] [Fix] `condition-builder.tsx:144-177` — picker trigger 添加 `aria-label`
- [ ] [Fix] `array-editor.tsx` / `array-field.tsx` — Add 后 focus 到新增项第一个 input；Remove 后 focus 到相邻项或 Add 按钮；所有 icon-only 按钮添加 `aria-label`
- [ ] [Fix] `key-value.tsx:66-102` — key/value Input 添加 `aria-label`（不依赖 placeholder）
- [ ] [Proof] 测试：condition-item 删除按钮有 `aria-label`
- [ ] [Proof] 测试：array field add 后 focus 在新增项

Exit Criteria:

- [ ] 所有 icon-only 按钮有 accessible name
- [ ] 键盘用户可达所有 condition builder 和 array field 操作
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

### Phase 3 - 数据渲染器 A11y

Status: planned
Targets: `packages/flux-renderers-data/src/`

- Item Types: Fix

- [ ] [Fix] `tree-renderer.tsx:209-229` — 添加 `role="tree"` 在根容器、`role="treeitem"` 在节点、`role="group"` 在子节点容器、`aria-expanded` 在可展开节点
- [ ] [Fix] `table-renderer.tsx:420-437` — 可排序 th 添加 `aria-sort="ascending|descending|none"`
- [ ] [Fix] `table-loading-overlay.tsx:10-11` — 添加 `role="status"` 和 `aria-live="polite"`
- [ ] [Proof] 测试：tree root 有 `role="tree"`
- [ ] [Proof] 测试：排序后 th 有正确的 `aria-sort` 值
- [ ] [Proof] 测试：loading overlay 有 `role="status"`

Exit Criteria:

- [ ] Tree/Table/Loading 有正确的 ARIA semantics
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

## Validation Checklist

- [ ] 所有 CRITICAL a11y 违规已修复（FieldError live region, FieldLabel）
- [ ] 所有 HIGH a11y 违规已修复（condition builder, array field focus）
- [ ] 所有 MEDIUM a11y 违规已修复（tree roles, table sort, loading status）
- [ ] 不存在被降级的 in-scope live defect
- [ ] 独立子 agent closure-audit 已完成并记录
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者>>
- Evidence: <<task id / findings>>

Follow-up:

- <<完成时填写>>
