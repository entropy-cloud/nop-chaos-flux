# 20 Accessibility

- 深挖轮次: 1
- 深挖发现数: 4
- 维度复核: 2 保留 / 2 降级 / 0 驳回
- 子项复核: 已完成唯一 P1 条目复核

## 第 1 轮初审

- `WrappedFieldAction` 键盘激活只走 `onPress`，与业务 `onClick` 脱节
- `condition-group` 图标删除按钮缺少可靠可访问名称
- `input-tree` / `tree-select` source error 未与控件建立 aria 关联
- `tree-renderer` `expandOnClickNode` 模式下把 `aria-expanded` 挂在非焦点目标

## 维度复核结论

保留:

- `WrappedFieldAction` 键盘激活与点击业务路径脱节
- `tree-renderer` 焦点目标与 `aria-expanded` 状态目标分离

降级:

- `condition-group` 删除按钮 accessible name 仅属弱兜底不足
- `input-tree` / `tree-select` source error aria 关联不足

## 子项复核结论

成立:

- `WrappedFieldAction` 键盘激活只走 `onPress`

## 最终保留项

### [维度20] `WrappedFieldAction` 的键盘激活路径仍与鼠标点击业务路径脱节

- **文件**: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx`, 以及多个只传 `onClick` 的调用方
- **严重程度**: P1
- **现状**: click 会触发 `onClick` 与 `onPress`，但 Enter/Space 只触发 `onPress`
- **风险**: 键盘用户无法对 condition-builder、array-field、tag-list 等控件执行与鼠标等价的操作
- **建议**: 让键盘激活走与点击相同的主业务 handler
- **复核状态**: 子项复核通过

### [维度20] `tree-renderer` 在 `expandOnClickNode` 模式下把展开状态挂在非焦点目标

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx`
- **严重程度**: P2
- **现状**: 焦点落在内部 `role="button"` 节点，但 `aria-expanded` 挂在外层 `treeitem`
- **风险**: 读屏用户聚焦实际可操作元素时无法直接获知展开状态
- **建议**: 将 `aria-expanded` 挂到实际焦点/交互目标，或收敛成单一交互元素
- **复核状态**: 维度复核通过
