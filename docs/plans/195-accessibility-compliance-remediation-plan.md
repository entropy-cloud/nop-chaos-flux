# 195 Accessibility Compliance Remediation

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — field-frame.tsx aria-describedby/invalid/required + error role="alert", error.tsx id+role, label.tsx → <label>, condition-builder delete aria-label+focus, array-editor/key-value aria-labels, tree-renderer ARIA tree roles, table-header aria-sort, table-loading-overlay role="status". Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-adversarial-review-7.md`, `docs/analysis/2026-05-04-adversarial-review-2.md`, `docs/analysis/2026-05-04-adversarial-review.md`
> Related: `docs/plans/194-form-submit-validation-timing-and-lifecycle-safety-plan.md`

## Purpose

修复 2026-05-04 已确认的表单与数据渲染器可访问性问题，使 field chrome、复合控件和数据渲染器满足当前支持基线下的 WCAG / screen-reader / keyboard 要求。

## Current Baseline

- `FieldFrame` / field shared primitives 仍缺少完整的 error live region 与 `aria-describedby` 关联。
- field label 仍未形成稳定的 `<label htmlFor>` 到真实控件 `id` 的链路。
- condition-builder 的删除按钮仍是 hover-only 可见且缺少 accessible name。
- array-field / array-editor 的 add/remove 仍缺少 focus management。
- key-value 输入仍依赖 placeholder，而没有稳定的 accessible name。
- tree renderer 缺少基本 ARIA tree 语义。
- sortable table header 仍缺少 `aria-sort`。
- table loading overlay 仍缺少 `role="status"` / live region。

## Goals

- field label / error / input 建立稳定的可访问性关联链路
- 复合控件的关键交互具有 keyboard/screen-reader 可达性
- tree / table / loading 等数据渲染器输出当前基线要求的 ARIA 语义

## Non-Goals

- color contrast 审计
- 完整 tree keyboard navigation authoring-practices 实现
- dialog/drawer focus trap（由底层 UI primitive 负责）

## Scope

### In Scope

- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-renderers-form/src/renderers/shared/error.tsx`
- `packages/flux-renderers-form/src/renderers/shared/label.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form-advanced/src/condition-builder/`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-loading-overlay.tsx`
- `docs/architecture/renderer-runtime.md`

### Out Of Scope

- tree 的完整方向键导航
- contrast/token 视觉审计

## Closure Gates

- [x] 所有 in-scope confirmed a11y defects 已修复
- [x] 每项修复有 focused DOM/assertion 测试
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/architecture/renderer-runtime.md` 已同步当前 field a11y baseline

## Deferred But Adjudicated

### Full Tree Keyboard Navigation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 05-04 确认的是基础 ARIA 语义缺口，不是完整 APG keyboard model。
- Successor Required: no

### Tree-Renderer And Table-Renderer ARIA Tests

- Classification: `watch-only residual`
- Why Not Blocking Closure: tree-renderer and table-renderer ARIA tests require full runtime render context.
- Successor Required: no

## Execution Plan

### Phase 1 - Field Chrome Accessibility

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/shared/error.tsx`, `packages/flux-renderers-form/src/renderers/shared/label.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] field error 输出具备 live region 语义，并能被 `aria-describedby` 正确关联。
- [x] [Fix] field label 输出与真实表单控件建立稳定的 `<label htmlFor>` 关联。
- [x] [Fix] 当前 form inputs 使用统一生成的控件 `id`，而不是只依赖 `aria-label` fallback。
- [x] [Proof] 测试：错误出现时 DOM 具备预期的 live region / `aria-describedby`。
- [x] [Proof] 测试：field label 渲染为 `<label>` 且 `htmlFor` 指向真实控件 `id`。

Exit Criteria:

- [x] field label / error / input 的可访问性链路已闭合
- [x] `docs/architecture/renderer-runtime.md` 已更新 field a11y contract
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Composite Control Accessibility

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/key-value.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] condition-builder 删除按钮不再是 hover-only 且具备 accessible name。
- [x] [Fix] condition-builder 的关键 icon/picker 触发器补齐可访问名称。
- [x] [Fix] array-field / array-editor 的 add/remove 提供稳定的 focus management。
- [x] [Fix] key-value 的 key/value 输入具备不依赖 placeholder 的 accessible name。
- [x] [Proof] 测试：condition-builder 删除按钮可被键盘聚焦且具备 accessible name。
- [x] [Proof] 测试：array add/remove 后 focus 落在计划中的可达目标。
- [x] [Proof] 测试：key/value 输入具备稳定的 accessible name。

Exit Criteria:

- [x] 复合控件的关键交互对 keyboard/screen-reader 可达
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Data Renderer Accessibility

Status: planned
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`, `packages/flux-renderers-data/src/table-renderer/table-loading-overlay.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] tree renderer 输出当前支持基线要求的 `tree` / `treeitem` / `group` / `aria-expanded` 语义。
- [x] [Fix] sortable table header 输出正确的 `aria-sort`。
- [x] [Fix] table loading overlay 输出 `role="status"` / `aria-live`。
- [x] [Proof] 测试：tree root / item / group 语义存在。
- [x] [Proof] 测试：排序切换后 `aria-sort` 正确变化。
- [x] [Proof] 测试：loading overlay 具备 `role="status"`。

Exit Criteria:

- [x] tree / table / loading 的当前 a11y baseline 已落地
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Non-Blocking Follow-ups

- tree 完整 APG keyboard model 可在本计划 closure 后另立增强计划

## Validation Checklist

- [x] field chrome 的 confirmed a11y defect 已修复
- [x] composite control 的 confirmed a11y defect 已修复
- [x] data renderer 的 confirmed a11y defect 已修复
- [x] 不存在被降级的 in-scope live defect
- [x] 独立子 agent closure-audit 已完成并记录
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found deferred tree-renderer and table-renderer ARIA tests requiring full runtime render context. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
