# 维度 20：可访问性

## 第 1 轮（初审）

### [维度20-01] `input-tree` 与 `tree-select` 声明了 `role="tree"` / `role="treeitem"`，但未实现标准树形键盘导航

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-control-controllers.ts`
- **证据片段**:

  ```tsx
  <div role="tree" ...>
  <div role="treeitem" tabIndex={0} onKeyDown={...}>
  ```

  ```ts
  // 键盘处理仅覆盖 Enter / Space / ArrowLeft / ArrowRight
  ```

- **严重程度**: P1
- **WCAG 准则**: 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **影响**: ARIA 语义声称这是 tree，但交互模型不符合 tree 预期；用户只能反复 Tab 穿过整棵树，无法通过 Up/Down/Home/End 进行节点间导航。
- **修复建议**: 实现 roving tabIndex 或 aria-activedescendant 风格的树形焦点管理，补齐 Up/Down/Home/End 键盘导航。
- **为什么值得现在做**: 这是实际键盘可操作性缺陷，不是样式或组件选型问题。
- **误报排除**: 不属于上游 shadcn/ui 基础组件问题；这是 renderer 自己声明 tree 语义后的行为缺口。
- **历史模式对应**: 对应 ARIA tree role 与真实 keyboard model 不一致的真实缺陷。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-02] 数据树 `tree` renderer 暴露 `role="tree"` / `role="treeitem"`，但 treeitem 焦点入口和键盘导航不完整

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\tree-renderer.tsx`
- **证据片段**:
  ```tsx
  <div role="tree" ...>
  <div role="treeitem">...</div>
  // 默认模式下 treeitem 无 tabIndex
  // expandOnClickNode 模式仅处理 Enter/Space
  ```
- **严重程度**: P1
- **WCAG 准则**: 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **影响**: 默认模式下 treeitem 焦点入口缺失，键盘只能落到小 chevron 按钮；`expandOnClickNode` 模式下虽可聚焦 treeitem，但仍缺少 Up/Down/Home/End 标准树导航。
- **修复建议**: 为 treeitem 建立明确焦点入口和树形键盘导航模型，不要只给展开按钮或 Enter/Space 交互。
- **为什么值得现在做**: 这是 ARIA 语义与真实键盘行为不一致的缺陷，会直接影响键盘和辅助技术用户。
- **误报排除**: 不是误报普通可点击 div；当前 renderer 已明确宣称 tree/treeitem 语义。
- **历史模式对应**: 对应 tree renderer 语义声明与键盘模型脱节的缺陷。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 初审排除项

- 已重点审查但未保留真实缺陷的范围：
  - `packages/flux-renderers-form/src/renderers/input.tsx`
  - `packages/flux-renderers-form/src/renderers/fieldset.tsx`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`
  - `packages/flux-renderers-form-advanced/src/key-value.tsx`
  - `packages/flux-renderers-form-advanced/src/array-editor.tsx`
  - `packages/flux-renderers-form-advanced/src/condition-builder/*`
  - `packages/flux-renderers-data/src/table-renderer*`
  - `packages/flux-renderers-data/src/chart-renderer.tsx`

## 维度复核结论

- [维度20-01]：降级为 P2。tree 模式不完整成立，但当前仍可通过 Tab 逐项聚焦并用 Enter/Space 操作，更像“树模式不完整”而非键盘基本不可用。
- [维度20-02]：保留 (P1)。默认模式 treeitem 无可聚焦入口，`expandOnClickNode` 模式也缺标准树导航，ARIA tree 语义与真实行为脱节。

## 子项复核结论

- [维度20-02]：成立。默认模式下 treeitem 不可聚焦，`expandOnClickNode` 模式也缺完整树导航。

## 最终保留项

| 编号  | 严重程度 | 文件                                                 | 一句话摘要                                         |
| ----- | -------- | ---------------------------------------------------- | -------------------------------------------------- |
| 20-02 | P1       | `packages/flux-renderers-data/src/tree-renderer.tsx` | 数据树 renderer 的 treeitem 焦点入口与树导航不完整 |
