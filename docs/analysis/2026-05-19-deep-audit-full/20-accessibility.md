# 维度 20: 可访问性 (WCAG)

## 第 1 轮（初审）

### [维度20-01] `input-number` stepper Buttons 从 Tab 顺序移除

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:540-565`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    data-slot="stepper-increase"
    aria-label="Increase"
    variant="ghost"
    size="icon-xs"
    disabled={!presentation.interactive}
    onClick={() => handleStep(1)}
    tabIndex={-1}
  ```
- **严重程度**: P3
- **WCAG 准则**: 2.1.1 Keyboard / 2.4.3 Focus Order
- **影响**: stepper button 本身不可 Tab 聚焦；但 input type number 已有键盘调步路径。
- **修复建议**: 移除 `tabIndex={-1}` 或明确采用 spinbutton keyboard model 并隐藏鼠标-only affordance 的 button role。
- **为什么值得现在做**: 小改动改善可发现性。
- **误报排除**: 复核降为 P3，因为存在 input 键盘等价路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 已降级

### [维度20-02] `input-tree` treeitem 全部 `tabIndex=0`，缺少 roving focus 与完整树键盘模型

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:59-67`; `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:74-94`
- **证据片段**:
  ```tsx
  role="treeitem"
  aria-level={props.option.depth + 1}
  aria-expanded={hasChildren ? expanded : undefined}
  aria-selected={checked}
  aria-disabled={props.disabled || undefined}
  tabIndex={props.disabled ? -1 : 0}
  onClick={props.disabled ? undefined : handleSelect}
  onKeyDown={props.disabled ? undefined : handleKeyDown}
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.4.3 Focus Order / 4.1.2 Name, Role, Value
- **影响**: 用户需 Tab 经过每个 visible node，缺少 ArrowUp/ArrowDown/Home/End 导航。
- **修复建议**: 实现 roving tabindex 或 `aria-activedescendant`，补齐 tree keyboard pattern。
- **为什么值得现在做**: 自定义 `role="tree"` 控件应匹配 tree interaction model。
- **误报排除**: 子项复核降为 P2；仍可 Tab 到各项并操作，但模型不完整。
- **参考文档**: WAI-ARIA tree pattern, `docs/architecture/renderer-runtime.md`
- **复核状态**: 子项复核通过

### [维度20-03] `tree-select` popup 复用不完整 tree keyboard model

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:272-333`; `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:74-94`
- **证据片段**:
  ```tsx
  <PopoverContent align="start">
    <TreeOptionList
      options={options}
      value={value}
      multiple={multiple}
      showPathLabel={props.props.showPathLabel === true}
      searchable={props.props.searchable === true}
      onChange={(nextValue) => handlers.onChange(nextValue)}
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.4.3 Focus Order
- **影响**: popup 内树选项缺少完整方向键导航，弹层场景还叠加焦点管理风险。
- **修复建议**: 与 input-tree 共用完整 tree focus controller，打开后定位 active item，关闭后返回 trigger。
- **为什么值得现在做**: 与 input-tree 同修复路径，ROI 高。
- **误报排除**: 不重复审 Popover/Button；问题在自定义 tree content。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 子项复核通过

### [维度20-04] table row 可点击/可聚焦但无交互 role/name

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:108-126`
- **证据片段**:
  ```tsx
  <TableRow
    data-slot="table-row"
    data-interactive={isRowInteractive || undefined}
    data-expanded={isExpanded || undefined}
    aria-expanded={expandRowByClick ? isExpanded : undefined}
    tabIndex={isRowInteractive ? 0 : undefined}
    onClick={isRowInteractive ? handleRowActivate : undefined}
    onKeyDown={isRowInteractive ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2 Name, Role, Value / 2.1.1 Keyboard
- **影响**: focusable row behaves like button/expander but remains table row semantics; screen readers may not understand action/name/state.
- **修复建议**: Prefer explicit expand button; if row activation remains, provide appropriate interaction role/name/state without breaking table semantics.
- **为什么值得现在做**: data table is core UI; keyboard support exists but semantics lag.
- **误报排除**: Table component itself is fine; issue comes from renderer adding tabIndex/click/aria-expanded.
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

### [维度20-05] Spreadsheet fill handle declares button but is mouse-only

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:398-409`
- **证据片段**:
  ```tsx
  {
    isFillHandleCell && (
      <div
        className="ss-fill-handle"
        role="button"
        tabIndex={-1}
        onMouseDown={(e) => onFillHandleMouseDown(r, c, e)}
        onDoubleClick={() => onFillHandleDoubleClick()}
        aria-label="Fill handle"
      />
    );
  }
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **影响**: fill handle is announced as button semantics but cannot be keyboard focused/activated.
- **修复建议**: Provide keyboard equivalent command or remove unreachable button role; if role stays, implement focus and Enter/Space behavior.
- **为什么值得现在做**: Fill handle is core spreadsheet edit affordance.
- **误报排除**: Spreadsheet raw DOM is allowed, but declared `role="button"` requires keyboard path.
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 维度复核通过

### [维度20-06] input-tree/tree-select loading status 未关联 tree busy 状态

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:159-167,216-236`
- **证据片段**:
  ```tsx
  <div
    data-slot="tree-option-items"
    role="tree"
    aria-label={props.ariaLabel}
    aria-multiselectable={props.multiple || undefined}
    aria-describedby={props.describedBy}
    aria-errormessage={props.errorMessage}
    aria-invalid={props.invalid || undefined}
  >
  ```
  ```tsx
  <span data-slot="input-tree-source-loading" role="status" aria-live="polite">
    {t('flux.common.loading')}
  </span>
  ```
- **严重程度**: P3
- **WCAG 准则**: 4.1.2 Name, Role, Value / 4.1.3 Status Messages
- **影响**: loading status may be announced but not associated with specific tree via `aria-busy` or describedby.
- **修复建议**: Add `aria-busy="true"` to tree and merge loading status id into `aria-describedby`.
- **为什么值得现在做**: Small semantic improvement; source error already follows describedby model.
- **误报排除**: Low severity because status is present; association is incomplete.
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度20-07] DingFlow add-node menu 声明 `role="menu"` 但缺少 menu keyboard/focus model

- **文件**: `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:32-69`
- **证据片段**:
  ```tsx
  <div
    className="fixed z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg"
    role="menu"
    aria-label="Add node"
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }}
  >
    {items.map((item, index) => (
      <Button role="menuitem" ...>
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.4.3 Focus Order / 4.1.2 Name, Role, Value
- **影响**: role menu 承诺 Arrow/Home/End/focus loop，但 implementation only handles Escape.
- **修复建议**: Use `DropdownMenu`/`Popover` focus primitives or implement roving focus and focus return.
- **为什么值得现在做**: Add-node menu is key flow authoring operation.
- **误报排除**: Not every popover needs menu model; this one explicitly declares menu/menuitem roles.
- **参考文档**: `packages/ui/src/index.ts`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 维度复核通过

### [维度20-08] Flow Designer node root `role="button"` 缺稳定 accessible name/state

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:149-164`
- **证据片段**:
  ```tsx
  <div
    role="button"
    tabIndex={0}
    className={cn('nop-designer-node', 'relative', nodeType.appearance?.className)}
    style={appearanceStyle}
    data-selected={props.selected ? '' : undefined}
    data-branch-focused={data.__fdBranchFocused ? '' : undefined}
    onMouseEnter={showToolbarNow}
    onMouseLeave={scheduleHideToolbar}
    onKeyDown={handleNodeKeyDown}
  >
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2 Name, Role, Value / 2.1.1 Keyboard
- **影响**: Multiple focusable buttons may lack stable names when body is custom schema/icon; selected/focused state is data attr only.
- **修复建议**: Add stable `aria-label` and expose selected/pressed state, or adopt graph/treeitem pattern.
- **为什么值得现在做**: Canvas node is core interactive object and already in Tab order.
- **误报排除**: Body text cannot be relied on for arbitrary schema body.
- **参考文档**: `docs/architecture/flow-designer/design.md`
- **复核状态**: 维度复核通过

### [维度20-09] Flow Designer edge label `role="button"` 缺稳定 name/state

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:101-126`
- **证据片段**:
  ```tsx
  <div
    role="button"
    tabIndex={0}
    className={cn(
      'fd-edge-label px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground shadow-sm',
      props.selected && 'border-primary text-foreground',
    )}
    onClick={handleLabelClick}
    onKeyDown={handleLabelKeyDown}
  >
    <RenderNodes input={edgeType!.body!} ... />
  </div>
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2 Name, Role, Value / 2.4.6 Labels
- **影响**: Multiple edge buttons may be unnamed or unstable, selected state only visual.
- **修复建议**: Add `aria-label` like source-to-target edge and expose selected state.
- **为什么值得现在做**: Edge selection is core canvas operation.
- **误报排除**: Rendered body may be arbitrary schema; interactive root needs own name.
- **参考文档**: `docs/architecture/flow-designer/canvas-adapters.md`
- **复核状态**: 维度复核通过

## 维度复核结论

- [维度20-01]: 降级为 P3。input number itself has keyboard equivalent.
- [维度20-02]: 保留但降级为 P2。input-tree lacks complete tree keyboard model.
- [维度20-03]: 保留但降级为 P2。tree-select inherits same gap.
- [维度20-04]: 保留 (P2)。focusable/clickable row lacks interaction semantics.
- [维度20-05]: 保留 (P2)。fill handle declares button but is mouse-only.
- [维度20-06]: 保留 (P3)。loading status not associated with tree busy state.
- [维度20-07]: 保留 (P2)。custom menu lacks menu keyboard model.
- [维度20-08]: 保留 (P2)。node button lacks stable name/state.
- [维度20-09]: 保留 (P2)。edge button lacks stable name/state.

## 子项复核结论

- [维度20-02]: 成立但降级为 P2。Basic operation possible via Tab, but tree pattern incomplete.
- [维度20-03]: 成立但降级为 P2。同源 issue in popup tree.

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                           | 一句话摘要                                             |
| ----- | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 20-01 | P3       | `packages/flux-renderers-form/src/renderers/input.tsx:540-565`                                 | input-number stepper buttons 不可 Tab 聚焦             |
| 20-02 | P2       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:59-67`                            | input-tree 缺完整 tree roving focus/方向键模型         |
| 20-03 | P2       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:272-333`                          | tree-select popup 缺完整 tree keyboard model           |
| 20-04 | P2       | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:108-126`         | focusable table row 缺交互 role/name                   |
| 20-05 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:398-409`                              | spreadsheet fill handle role=button 但鼠标专属         |
| 20-06 | P3       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:159-167`                          | tree loading status 未关联 aria-busy/describedby       |
| 20-07 | P2       | `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:32-69`              | DingFlow add-node menu 缺 menu keyboard model          |
| 20-08 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:149-164` | Flow Designer node button 缺稳定 accessible name/state |
| 20-09 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:101-126` | Flow Designer edge button 缺稳定 accessible name/state |
