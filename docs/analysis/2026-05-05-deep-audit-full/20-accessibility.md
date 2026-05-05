# 维度 20：可访问性 (WCAG)

## 初审

- 初审保留 9 条。

## 维度复核

- 9 条均成立，其中 `FieldFrame`、`tree-controls`、`spreadsheet-grid`、`word outline panel` 需要后续专项复核/设计。

## 最终结论

### [维度20] `FieldFrame` 没有把错误/提示关联到真实焦点控件

- **文件**: `packages/flux-react/src/field-frame.tsx:186-210`, `packages/flux-renderers-form/src/renderers/input.tsx:48-60`
- **证据片段**:
  ```tsx
  <div data-slot="field-control" id={controlId} aria-describedby={showError ? errorId : undefined}>
    {children}
  </div>
  ```
- **严重程度**: P1
- **WCAG 准则**: 1.3.1, 4.1.2
- **影响**: 屏幕阅读器聚焦真实控件时通常拿不到字段错误/提示关联。
- **修复建议**: 把 `aria-describedby` / `aria-errormessage` / `id` 透传到真实焦点控件，并补共享回归测试。
- **复核状态**: `子项复核通过`

### [维度20] `tree-controls` 的 ARIA 结构不成立，且展开箭头不可键盘触发

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:41-63`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx:112-137`
- **证据片段**:
  ```tsx
  <div ... role="treeitem" ...>
  <span role="button" tabIndex={0} onClick={handleChevronClick}>
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1, 4.1.2
- **影响**: treeitem/group/tree 语义不完整，键盘用户无法可靠展开/收起节点。
- **修复建议**: 补 `role="tree"` / `role="group"` 结构，并让展开入口成为真实可键盘操作的按钮。
- **复核状态**: `维度复核通过`

### [维度20] dingflow 的加节点/加分支/合并入口是纯鼠标 `div`

- **文件**: `packages/flow-designer-renderers/src/dingflow/ding-flow-plus-button.tsx`, `ding-flow-add-condition-overlay.tsx`, `ding-flow-merge-overlay.tsx`
- **证据片段**:
  ```tsx
  <div ... onClick={(e) => { e.stopPropagation(); onClick(e); }}>
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1, 4.1.2
- **影响**: 键盘与读屏用户无法触发树模式流设计器的关键新增入口。
- **修复建议**: 改成 `Button` 或至少补 `role/tabIndex/Enter/Space/aria-label`。
- **复核状态**: `维度复核通过`

### [维度20] `designer-palette` 分组标题只能鼠标切换

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:72-76`
- **证据片段**:
  ```tsx
  <div ... onClick={() => toggleGroup(group.id)}>
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1, 4.1.2
- **影响**: 键盘用户无法展开/收起节点分组。
- **修复建议**: 改为 `Button` / `CollapsibleTrigger`，并补 `aria-expanded`。
- **复核状态**: `维度复核通过`

### [维度20] spreadsheet grid 缺少核心键盘导航/选择入口

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:247-276`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:375-409`
- **证据片段**:
  ```tsx
  <td onClick={() => onCellClick(r, c)} onDoubleClick={() => onCellDoubleClick(r, c)}>
  ```
- **严重程度**: P1
- **WCAG 准则**: 2.1.1
- **影响**: 仅靠键盘无法进入单元格、移动选择、选择列/全表。
- **修复建议**: 为 grid 定义 roving tabindex 或 active-cell 键盘模型。
- **复核状态**: `维度复核通过`

### [维度20] sheet tab 关闭入口嵌套在 tab button 内且不可键盘操作

- **文件**: `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:113-149`
- **证据片段**:
  ```tsx
  <Button ...>
    <span className="ss-sheet-tab-close" onClick={(e) => handleCloseClick(e, sheet.id, sheet.name)}>
      ×
    </span>
  </Button>
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1, 4.1.2
- **影响**: 关闭 sheet 是独立操作，但当前既不可键盘触发，又形成嵌套交互语义。
- **修复建议**: 改成独立 `Button`，不要嵌套在 tab button 内。
- **复核状态**: `维度复核通过`

### [维度20] report toolbar 的 `Switch` 没有程序化标签

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:102-110`
- **证据片段**:
  ```tsx
  {item.label ? <span className="text-sm ...">{item.label}</span> : null}
  <Switch checked={checked} ... />
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1, 4.1.2
- **影响**: 读屏用户可能只得到“switch”而无名称。
- **修复建议**: 用 `Label` / `aria-labelledby` / `aria-label` 关联文字与控件。
- **复核状态**: `维度复核通过`

### [维度20] spreadsheet toolbar 图标按钮缺少 `aria-label`

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:18-31`
- **证据片段**:
  ```tsx
  <Button ...>
    {props.children ?? props.icon}
  </Button>
  <TooltipContent>{t(props.label)}</TooltipContent>
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2
- **影响**: tooltip 文本不能稳定替代按钮本体的可访问名称。
- **修复建议**: 将 `props.label` 同步到真实 `Button` 的 `aria-label`。
- **复核状态**: `维度复核通过`

### [维度20] word outline panel 折叠按钮缺少名称与状态

- **文件**: `packages/word-editor-renderers/src/panels/outline-panel.tsx:220-232`
- **证据片段**:
  ```tsx
  <Button type="button" variant="ghost" size="icon-xs" onClick={() => toggleExpanded(index)}>
    {item.expanded ? <ChevronDown /> : <ChevronRight />}
  </Button>
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2
- **影响**: 读屏用户会遇到“无名按钮”，也拿不到当前展开/折叠状态。
- **修复建议**: 补 `aria-label`、`aria-expanded`，必要时加 `aria-controls`。
- **复核状态**: `维度复核通过`
