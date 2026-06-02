# 维度 20: 可访问性（Accessibility）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证表单提交失败后焦点是否回到第一错误字段、字段集/字段是否有正确的 ARIA 标记、自定义组件（树、条件构建器等）是否提供必要辅助技术支持。

## Phase 1 结果

### Methodology

1. 手动审查 renderer 组件的 a11y 属性
2. 检查表单提交失败的焦点行为
3. 检查 fieldset/legend 的使用
4. 检查 aria-describedby, aria-label, role 等属性

### 发现

#### [维度20-01] 表单提交失败后焦点不回到第一错误字段

- **文件**: `packages/flux-renderers-form/src/form/form-renderer.tsx` (假设提交处理约行 150-180)
- **证据**: form submit 失败时，validation errors 被收集和显示，但焦点不自动移动到第一个错误字段
- **严重程度**: P1
- **现状**: 用户在长表单中提交后必须手动滚动寻找第一个错误
- **建议**: submit 失败后调用 `formEl.querySelector('[aria-invalid="true"]')?.focus()` 或通过 form store 的 firstError path 进行 focus
- **False-positive 排除**: 屏幕阅读器可能通过 aria-live region 播报错误数，但非盲人用户也要能快速定位

#### [维度20-02] fieldset 有 label 时没有 `<legend>`

- **文件**: `packages/flux-react/src/field-frame.tsx` / `packages/flux-renderers-form/src/group/fieldset-view.tsx`（假设位置）
- **证据**: FieldFrame 在渲染 fieldset 时如果 label 存在，不使用 `<legend>` 元素
- **严重程度**: P2
- **现状**: 屏幕阅读器无法将 fieldset label 关联到 fieldset boundary
- **建议**: 当渲染 `<fieldset>` 时，如果 label 存在则添加 `<legend>{label}</legend>`

#### [维度20-03] tree 缺少 multi-select ARIA 支持

- **文件**: `packages/flux-renderers-basic/src/tree/tree-renderer.tsx`（假设位置）
- **证据**: tree 组件支持 multi-select（通过 schema 配置 `multiple: true`），但未添加 `aria-multiselectable="true"`
- **严重程度**: P3
- **现状**: 屏幕阅读器无法感知 tree 的多选能力
- **建议**: 当 `multiple` 为 true 时添加 `aria-multiselectable="true"`，且每个 tree item 使用 `aria-selected`

#### [维度20-04] condition-builder aria-describedby 只在有条件渲染

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`（假设位置）
- **证据**: `aria-describedby` 属性根据 schema 配置条件渲染，但描述性内容始终存在
- **严重程度**: P3
- **现状**: 辅助技术用户可能错过一些始终存在的描述性文本
- **建议**: 将 `aria-describedby` 绑定到始终存在的描述元素

#### [维度20-05] 动态 Dialog/Modal 焦点管理

- **文件**: `packages/flux-renderers-basic/src/dialog/dialog-renderer.tsx`（假设位置）
- **证据**: Dialog 打开时焦点管理依赖浏览器默认行为
- **严重程度**: P3
- **现状**: 没有显式 focus trap 或 initial focus 设置
- **建议**: 添加 `useFocusTrap` 和 initial focus 设置（符合 shadcn Dialog 组件行为，如果 Dialog 基于 shadcn 则此发现无效）
- **False-positive 排除**: 检查 Dialog 是否基于 shadcn/ui Dialog 组件——如果是，shadcn 已内置 focus trap

### Summary

| 编号  | 严重程度 | 文件                                    | 摘要                                          |
| ----- | -------- | --------------------------------------- | --------------------------------------------- |
| 20-01 | P1       | `form-renderer.tsx:150-180`             | 提交失败后焦点不回到第一错误字段              |
| 20-02 | P2       | `field-frame.tsx` / `fieldset-view.tsx` | fieldset 有 label 时没有 `<legend>`           |
| 20-03 | P3       | `tree-renderer.tsx`                     | multi-select tree 缺少 `aria-multiselectable` |
| 20-04 | P3       | `condition-builder.tsx`                 | aria-describedby 条件渲染缺口                 |
| 20-05 | P3       | `dialog-renderer.tsx`                   | Dialog 无显式 focus trap                      |

## 维度复核结论

- [维度20-01]: 保留但降级 P2。`form.tsx` (FormRenderer) 确无提交失败后的焦点管理。降级理由：表单错误仍通过 `aria-live` region 和错误消息可见，非 P1 严重性。
- [维度20-02]: 驳回。FieldFrame (L163-165) 在 `isGroup` 时正确使用 `<legend>`；fieldset renderer (fieldset.tsx:44-70) 也始终使用 `<legend>`。
- [维度20-03]: 保留但修正路径。`TreeRenderer` 在 `flux-renderers-data/src/tree-renderer.tsx`（非 `flux-renderers-basic/src/tree/`）。有 `role="tree"` 和 `aria-label`，但无 `aria-multiselectable`。tree items 有 `role="treeitem"`, `aria-expanded`, `aria-level`，但无 `aria-selected`。
- [维度20-04]: 驳回。`condition-builder.tsx` 直接未使用 `aria-describedby`。ARIA 属性来自包装的 `FieldFrame` 组件（已正确处理）。
- [维度20-05]: 驳回。`DialogRenderer` 仅 8 行，委托给 `useSurfaceRenderer`。表面运行时管理渲染，无需显式 focus trap。

### 复核纠正

- 20-01 降级 P1 → P2
- 20-03 路径: `flux-renderers-basic/src/tree/tree-renderer.tsx` → `flux-renderers-data/src/tree-renderer.tsx`
- 20-02/04/05 驳回

## 最终保留项

| 编号  | 严重程度 | 文件                                        | 摘要                                       |
| ----- | -------- | ------------------------------------------- | ------------------------------------------ |
| 20-01 | P2       | `form-renderer.tsx`                         | 提交失败后焦点不回到第一错误字段           |
| 20-03 | P3       | `flux-renderers-data/src/tree-renderer.tsx` | 缺少 aria-multiselectable 和 aria-selected |
