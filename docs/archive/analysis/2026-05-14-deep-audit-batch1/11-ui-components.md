# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

零发现结论已被独立复核推翻。本维度存在 1 项可报告问题。

### 检查范围

- 已复核 `packages/ui/src/index.ts`
- 已重查 `packages/*/src`、`apps/*/src` 中的原生元素使用
- 已排除 `packages/ui` 内部实现、`input[type=file]`、高性能 spreadsheet/grid 宿主面、虚拟化 spacer 行等合理例外

## 深挖第 2 轮追加

### [维度11-01] Code Editor toolbar primitive 仍用 `<span role="button">` 手工模拟按钮

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:27-52`
- **证据片段**:
  ```tsx
  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : handleKeyDown}
    >
  ```
- **严重程度**: P3
- **原生元素**: `<span role="button">`
- **应替换为**: `@nop-chaos/ui` `Button`
- **所在层**: `flux-code-editor` renderer primitive
- **替换可行性**: 高
- **误报排除**: 不属于 `ui` 内部实现，也不是文件/颜色 input 或 spreadsheet/grid 宿主面等例外
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度11-02] Flow Designer inspector 的分支卡片仍用 `<div role="button">` 模拟主交互控件

- **文件**: `packages/flow-designer-renderers/src/designer-inspector.tsx:124-142`
- **证据片段**:
  ```tsx
  <div
    role="button"
    tabIndex={0}
    onClick={...}
    onKeyDown={...}
  >
  ```
- **严重程度**: P2
- **原生元素**: `<div role="button">`
- **应替换为**: `@nop-chaos/ui` `Button` 或 button-rendered card action
- **所在层**: `flow-designer-renderers`
- **替换可行性**: 中
- **误报排除**: 文件已直接依赖 `@nop-chaos/ui Button`，这里不是因为缺少现成组件而只能手写
- **复核状态**: 未复核

### [维度11-03] Condition Builder 的可移除值标签仍用 `<Badge role="button">` 承担按钮语义

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:188-208`
- **证据片段**:
  ```tsx
  <Badge
    role="button"
    tabIndex={0}
    onClick={...}
    onKeyDown={...}
  >
  ```
- **严重程度**: P2
- **原生元素**: `Badge` underlying `span` with button role
- **应替换为**: 真正的 `Button`/button-rendered chip
- **所在层**: `flux-renderers-form-advanced`
- **替换可行性**: 中
- **误报排除**: 问题不是 Badge 外观，而是它承担了真实 remove/select 交互语义
- **复核状态**: 未复核

## 维度复核结论

- 维度初审“零发现”结论不成立。
- [维度11-01]: 保留为 P3。Code Editor toolbar primitive 仍手工模拟按钮语义。
- [维度11-02]: 保留为 P2。Flow Designer inspector 核心选择路径仍以 `div role=button` 实现主控件。
- [维度11-03]: 保留为 P2。Condition Builder 的已选值移除交互仍由 `Badge role=button` 承担。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                  | 一句话摘要                                             |
| ----- | -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 11-01 | P3       | `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:27-52`         | Code Editor toolbar 仍用 `span role=button` 模拟按钮   |
| 11-02 | P2       | `packages/flow-designer-renderers/src/designer-inspector.tsx:124-142`                 | Flow Designer inspector 分支卡片仍用 `div role=button` |
| 11-03 | P2       | `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:188-208` | Condition Builder 可移除值标签仍用 `Badge role=button` |
