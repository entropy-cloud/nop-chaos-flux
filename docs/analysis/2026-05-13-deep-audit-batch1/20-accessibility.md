# 维度 20：可访问性 (WCAG)

## 第 1 轮（初审）

### [维度20-01] Composite `FieldFrame` 在 `rootTag="div"` 路径下丢失程序化 label 关联

- **文件**: `packages/flux-react/src/field-frame.tsx:162-167,225-241`; `packages/flux-react/src/node-frame-wrapper.tsx:69-90`; `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:571-586`
- **证据片段**:

  ```tsx
  const Tag = isGroup ? 'fieldset' : (rootTag ?? 'label');
  const LabelTag = isGroup ? 'legend' : 'span';

  {
    label ? (
      <LabelTag data-slot="field-label" style={labelStyle}>
        {label}
      </LabelTag>
    ) : null;
  }
  ```

- **严重程度**: P2
- **WCAG 准则**: `1.3.1 Info and Relationships`, `4.1.2 Name, Role, Value`
- **影响**: 复合控件内部实际焦点目标往往只能读出局部控件名，听不到 schema 作者定义的字段总 label。
- **修复建议**: 为 `FieldFrame` 生成稳定 label id；`rootTag="div"` 路径通过 `aria-labelledby` 传给复合控件根或真实焦点目标。

### [维度20-02] `radio-group` 的 source error 仍未关联到实际焦点目标

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:317-337`
- **证据片段**:
  ```tsx
  <RadioGroup
    data-slot="radio-group-options"
    value={selectedValue}
    disabled={loading || presentation.effectiveDisabled}
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
  >
  ...
  {errorMessage ? (
    <span data-slot="radio-group-error" role="alert">
      {errorMessage}
    </span>
  ) : null}
  ```
- **严重程度**: P2
- **WCAG 准则**: `3.3.1 Error Identification`, `4.1.2 Name, Role, Value`
- **影响**: 键盘或屏幕阅读器用户回到该字段时，无法从当前焦点上下文获知“选项加载失败”这类错误。
- **修复建议**: 给 source error 生成稳定 id，并通过 `aria-describedby` / `aria-errormessage` 绑定到 `RadioGroup`。

### [维度20-03] `input-tree` / `tree-select` 的 source error 未与 tree trigger 语义关联

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:257-264,311-317`; `packages/flux-renderers-form-advanced/src/tree-controls.tsx:197-221`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="outline"
    aria-label={fieldLabel}
    disabled={presentation.effectiveDisabled || presentation.readOnly || optionsSourceState?.loading === true}
  >
  ...
  {sourceError ? (
    <span data-slot="tree-select-source-error" role="alert">
      {sourceError}
    </span>
  ) : null}
  ```
- **严重程度**: P2
- **WCAG 准则**: `3.3.1 Error Identification`, `4.1.2 Name, Role, Value`
- **影响**: AT 用户重新聚焦树控件时会丢失 source error 上下文，不满足稳定错误暴露要求。
- **修复建议**: 为 source error 提供稳定 id，并绑定到 `tree-select` trigger / `input-tree` tree root。

## 深挖第 2 轮追加

### [维度20-04] `input-tree` / `tree-select` 的 checkbox 模式暴露了可聚焦但不可操作的伪复选框

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:59-66,92-97`; `packages/ui/src/components/ui/checkbox.tsx:12-23`
- **证据片段**:
  ```tsx
  <div
    role="treeitem"
    tabIndex={props.disabled ? -1 : 0}
    onClick={props.disabled ? undefined : handleSelect}
    onKeyDown={props.disabled ? undefined : handleKeyDown}
  >
    {props.multiple ? (
      <Checkbox
        checked={checked}
        aria-label={props.option.label}
        className="pointer-events-none ml-1.5 mr-1.5 shrink-0"
      />
    ) : null}
  </div>
  ```
- **严重程度**: P2
- **WCAG 准则**: `2.1.1 Keyboard`, `4.1.2 Name, Role, Value`
- **影响**: checkbox 模式下每个 tree node 同时暴露 `treeitem` 和内部 `checkbox` 语义；内部 `Checkbox` 没有 `onCheckedChange`、也未移出 Tab 顺序，键盘/读屏用户可能聚焦到一个看似可操作但实际不可操作的死焦点。
- **修复建议**: 收敛语义：要么让真实可操作目标就是 checkbox，要么把内部 checkbox 彻底降为展示元素（`aria-hidden`、`tabIndex={-1}`），只保留 `treeitem` 作为唯一交互目标。

## 已检查但未保留的候选

- chart 文本等价物已补
- spreadsheet `aria-activedescendant` 已改为 mounted cell
- DingFlow add-node menu 已补初始 focus / Escape / menu 语义
- condition-builder 的 AND/OR / remove-group 已补 `aria-pressed` / `aria-label`
- word-editor icon-only buttons 已补 `aria-label`

## 维度复核结论

- [维度20-01]: 保留 (P2)。Composite `FieldFrame` 在 `rootTag="div"` 路径下仍丢失程序化 label 关联。
- [维度20-02]: 保留 (P2)。`radio-group` source error 仍未关联到实际焦点目标。
- [维度20-03]: 保留 (P2)。`input-tree` / `tree-select` source error 仍未与树控件焦点语义节点关联。
- [维度20-04]: 保留 (P2)。checkbox 模式仍暴露可聚焦但不可操作的伪复选框。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                        |
| ----- | -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| 20-01 | P2       | `packages/flux-react/src/field-frame.tsx`                     | composite `FieldFrame` 仍缺程序化 label 关联      |
| 20-02 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx`        | `radio-group` source error 仍未关联到焦点目标     |
| 20-03 | P2       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx` | tree controls source error 仍未与焦点语义节点关联 |
| 20-04 | P2       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx` | checkbox 模式仍暴露伪复选框死焦点                 |
