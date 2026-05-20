# 维度 20: 可访问性 (WCAG)

## 第 1 轮（初审）

### [维度20-01] 包装型字段把验证错误关联到非焦点 wrapper，实际输入控件无法读到错误说明

- **文件**: `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:77-99`; 关联：`packages/flux-react/src/field-frame.tsx:187-194`
- **行号范围**: `input-number-renderer.tsx:77-99`, `field-frame.tsx:187-194`
- **证据片段**:
  ```tsx
  <div
    className={cn('nop-input-number', props.meta.className)}
    data-slot="field-control"
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
    <div className="relative flex items-center">
      ...
      <Input
        type="number"
        id={name ? `${name}-control` : undefined}
        ...
        aria-invalid={presentation.showError ? true : undefined}
  ```
  ```tsx
  const child = isValidElement(children)
    ? cloneElement(children, {
        id: childProps?.id ?? controlId,
        'aria-labelledby': mergeDescribedBy(childProps?.['aria-labelledby'], labelId),
        'aria-describedby': mergeDescribedBy(childProps?.['aria-describedby'], describedBy),
        'aria-errormessage': showError ? errorId : undefined,
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships；3.3.1 Error Identification；4.1.2 Name, Role, Value
- **影响**: `input-number` 的焦点目标是内部 `<Input type="number">`，但 `FieldFrame` 只能把 `aria-describedby` / `aria-errormessage` 克隆到 renderer 返回的外层 `<div>`。当字段校验失败时，屏幕阅读器聚焦实际输入框只会得到 `aria-invalid`，无法直接获得错误文本关系。
- **修复建议**: 为包装型控件提供显式 a11y slot/props 透传机制，或让 `input-number` 等组件从 `FieldFrame`/field controller 获得 `errorId`、`describedBy` 后直接传到内部焦点控件。类似 `SelectRenderer` 这类外层 wrapper + 内部 trigger 的字段也应一并检查。
- **为什么值得现在做**: 表单校验是低代码表单的主路径；错误文本已渲染但未关联到焦点控件，会让无障碍用户难以定位失败原因，且修复后可形成包装型字段的统一 contract。
- **误报排除**: 这不是要求所有字段重复渲染错误；问题在于当前关联落在非焦点、无交互语义的 wrapper 上。普通直接返回 `<Input>` 的字段会被 `FieldFrame` 正确克隆，包装型字段不会。
- **历史模式对应**: 对应本仓库“wrapper/FieldFrame 语义边界容易遗漏真实焦点目标”的重复模式；与 `Wrapped Secondary Actions Stay Non-Labelable` 裁定无冲突，本条报告的是错误说明关联而非要求替换 secondary action。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md` 维度 20；`packages/ui/src/index.ts`
- **复核状态**: 未复核

### [维度20-02] input-tree roving tabindex 只改状态不移动 DOM 焦点，方向键导航后屏幕阅读器焦点停留在旧节点

- **文件**: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:271-302`; 关联：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:80-89`
- **行号范围**: `tree-control-controllers.ts:271-302`, `tree-controls.tsx:80-89`
- **证据片段**:

  ```ts
  const moveFocus = React.useCallback(
    (direction: 'prev' | 'next' | 'first' | 'last') => {
      if (visibleOptions.length === 0) {
        return;
      }

      if (direction === 'first') {
        setActiveItemKey(visibleOptions[0]?.valueKey);
        return;
      }
      ...
      setActiveItemKey(visibleOptions[nextIndex]?.valueKey);
    },
  ```

  ```tsx
  role="treeitem"
  id={itemId}
  aria-level={props.option.depth + 1}
  aria-expanded={hasChildren ? expanded : undefined}
  aria-selected={checked}
  aria-disabled={props.disabled || undefined}
  tabIndex={props.disabled ? -1 : focused ? 0 : -1}
  onClick={props.disabled ? undefined : handleSelect}
  onKeyDown={props.disabled ? undefined : handleKeyDown}
  ```

- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard；2.4.3 Focus Order；4.1.2 Name, Role, Value
- **影响**: 键盘用户按 ArrowUp/ArrowDown/Home/End 后，代码只更新哪个 treeitem 的 `tabIndex=0`，没有调用 `.focus()` 或采用 `aria-activedescendant`。浏览器实际焦点仍停留在旧 treeitem，后续按键和屏幕阅读器读焦点都可能继续基于旧节点。
- **修复建议**: 在 active item 改变后用 ref map 将 DOM 焦点移动到新 treeitem；或改为树容器持焦点并维护 `aria-activedescendant`，同时确保目标 id 对应当前可见 treeitem。
- **为什么值得现在做**: `input-tree` / `tree-select` 是复杂表单选择控件，键盘树导航属于核心 WCAG 路径；当前测试只断言 `tabIndex`，容易掩盖真实焦点未移动。
- **误报排除**: 组件确实实现了 tree/treeitem 角色与方向键处理，因此不是“完全没有键盘支持”；缺陷是 roving tabindex 模式缺少实际焦点迁移，导致实现不完整。
- **历史模式对应**: 对应“复杂自定义控件只完成 ARIA 外形但未完成交互语义”的高频审核模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-03] table 行级 onRowClick / expandRowByClick 只支持鼠标，交互行不可 Tab 聚焦也无键盘激活

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:140-160`
- **行号范围**: `table-body-row-rendering.tsx:140-160`
- **证据片段**:

  ```tsx
  const hasRowClickHandler = Boolean(parentProps.events.onRowClick);
  const isRowClickable = hasRowClickHandler || expandRowByClick;

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (hasRowClickHandler) {
      void parentProps.events.onRowClick?.(event, { scope: rowScope });
    }

    if (expandRowByClick) {
      onToggleExpand(rowKey);
    }
  };
  ...
  <TableRow
    data-interactive={isRowClickable || undefined}
    onClick={isRowClickable ? handleRowClick : undefined}
  ```

- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard；2.4.7 Focus Visible；4.1.2 Name, Role, Value
- **影响**: 当 schema 配置 `onRowClick` 或 `expandRowByClick` 时，鼠标点击整行可触发动作，但键盘用户无法 Tab 到该行，也没有 Enter/Space 激活路径。若业务把详情、编辑或展开绑定到行点击，键盘用户无法完成同等操作。
- **修复建议**: 对交互行补充可聚焦与键盘语义，例如 `tabIndex={0}`、合适的 role/aria-label、`onKeyDown` 处理 Enter/Space；或把行级动作显式映射到每行内的可见 `<Button>`，并避免只依赖 `<tr onClick>`。
- **为什么值得现在做**: data table 是 `flux-renderers-data` 主交互组件，行点击通常承载详情/编辑主路径；修复范围集中，不依赖 shadcn/ui 上游。
- **误报排除**: 展开列存在 `<Button>` 时局部展开可键盘操作，但这里报告的是 schema 暴露的“整行点击动作”本身缺少键盘等价路径，尤其 `onRowClick` 无替代入口。
- **历史模式对应**: 对应“鼠标事件被标记为 interactive，但没有同步提供键盘可操作性”的交互控件审核模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-04] spreadsheet grid 使用 aria-activedescendant 指向普通 td，虚拟表格缺少 gridcell/row 语义

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:243-246`; 关联：`packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:155-162`
- **行号范围**: `spreadsheet-grid.tsx:243-246`, `table-shell.tsx:155-162`
- **证据片段**:
  ```tsx
  tabIndex={0}
  role="grid"
  aria-label="Spreadsheet grid"
  aria-activedescendant={viewport.mountedSelectedCellId}
  ```
  ```tsx
  <td
    key={col}
    id={`spreadsheet-cell-${addr}`}
    className={cellStyle.className}
    style={style}
    tabIndex={isSelected ? 0 : -1}
    aria-selected={isSelected || inRange || undefined}
  ```
- **严重程度**: P1
- **WCAG 准则**: 1.3.1 Info and Relationships；2.1.1 Keyboard；4.1.2 Name, Role, Value
- **影响**: 外层声明为 ARIA `grid` 并用 `aria-activedescendant` 表示当前单元格，但目标元素是普通 `<td>`，没有 `role="gridcell"` / `aria-rowindex` / `aria-colindex` 等 grid 语义。屏幕阅读器可能无法把活动后代解释为表格单元格，也难以报告坐标、选择状态和虚拟滚动中的当前位置。
- **修复建议**: 为虚拟 spreadsheet 表格补齐 ARIA grid pattern：行容器提供 `role="row"`，单元格提供 `role="gridcell"`、行列索引，必要时在 grid 上提供 `aria-rowcount` / `aria-colcount`；并确保 `aria-activedescendant` 永远指向当前挂载且具备 gridcell 语义的元素。
- **为什么值得现在做**: spreadsheet 是本轮重点复杂控件，且代码已经选择了 `aria-activedescendant` 模式；现在补齐语义比后续在更多虚拟化/合并单元格能力上叠加后再修更低成本。
- **误报排除**: 这不是要求普通 `<table>` 重写为 ARIA grid；问题在于外层已经显式声明 `role="grid"` 并脱离原生表格焦点模型，必须满足 ARIA grid 的 name/role/value 关系。
- **历史模式对应**: 对应“复杂画布/表格控件声明 ARIA 容器角色但内部 owned elements 语义不完整”的复杂控件审核模式。
- **参考文档**: `docs/architecture/report-designer/design.md`; `docs/components/spreadsheet-page/design.md`; `docs/skills/deep-audit-prompts.md` 维度 20
- **复核状态**: 未复核

### [维度20-05] Flow Designer 节点工具栏只由鼠标 hover 打开，键盘选中节点后默认编辑/复制/删除按钮不可达

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:92-115`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:215-281`
- **行号范围**: `designer-xyflow-node.tsx:92-115`, `designer-xyflow-node.tsx:215-281`
- **证据片段**:

  ```tsx
  const handleNodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'selectNode', nodeId: props.id });
    }
  };

  function showToolbarNow() {
    ...
    setShowToolbar(true);
  }
  ```

  ```tsx
  {(hasQuickActions || showToolbar) && (
    <NodeToolbar isVisible={showToolbar} position={Position.Top}>
      <div
        role="toolbar"
        tabIndex={0}
        ...
      >
        ...
        <Button aria-label="Edit node" ... />
  ```

- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard；2.4.3 Focus Order；2.4.7 Focus Visible
- **影响**: 节点本身有 `role="button"`、`tabIndex={0}` 和 Enter/Space 选择，但默认 toolbar 的显示条件依赖 `showToolbar`，而 `showToolbar` 只在 mouse enter 时置为 true。键盘用户可选中节点，却无法通过焦点/键盘显露同一组 Edit/Duplicate/Delete 按钮。
- **修复建议**: 在节点 `onFocus` 或键盘选中后打开 toolbar，或当 `props.selected` 为 true 时显示默认 toolbar；同时为离开节点/toolbar 的焦点路径提供合理关闭策略，避免只用 hover 控制。
- **为什么值得现在做**: Flow Designer 是重点 complex designer control，节点编辑、复制、删除是核心工作流；当前已有 ARIA 外壳和按钮实现，补齐焦点触发路径即可显著提升键盘可用性。
- **误报排除**: 不是要求替换 `Button` 或重写 React Flow；内部按钮本身使用 shadcn/ui，问题是键盘路径无法打开包含这些按钮的 toolbar。
- **历史模式对应**: 对应“复杂设计器 hover-only affordance 未提供键盘等价入口”的交互审核模式。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md` 维度 20
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。
