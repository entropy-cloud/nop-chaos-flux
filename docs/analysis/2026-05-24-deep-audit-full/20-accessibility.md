# 维度 20：可访问性 (WCAG)

## 第 1 轮（初审）

### [维度20-01] 表单校验错误没有可靠关联到基础输入控件

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:40-54`; `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:140-154`
- **证据片段**:
  ```tsx
  <Input
    type={inputType}
    id={name ? `${name}-control` : undefined}
    name={name || undefined}
    value={inputValue}
    disabled={presentation.effectiveDisabled}
    aria-label={String((props.props.label ?? name) || '') || undefined}
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
  />
  ```
  ```tsx
  <Textarea
    id={name ? `${name}-control` : undefined}
    name={name || undefined}
    value={textareaValue}
    disabled={presentation.effectiveDisabled}
    aria-label={String((props.props.label ?? name) || '') || undefined}
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
  />
  ```
- **严重程度**: P1
- **WCAG 准则**: 3.3.1 Error Identification / 3.3.3 Error Suggestion / 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships
- **现状**: `input-text`、`input-email`、`input-password`、`textarea` 等基础字段在出错时只设置 `aria-invalid`，没有显式把错误/说明节点通过 `aria-describedby` 或 `aria-errormessage` 关联到控件。`FieldFrame` 试图 clone 直接 child 注入 describedby，但这些 wrapped renderer 的直接 child 是具体控件时才可靠；高级/复合 wrapped renderer 多数根是 `<div>`，而基础 renderer 自身也未声明错误 id。
- **风险**: 屏幕阅读器用户在提交失败或 blur/change 校验失败后，聚焦输入框只能听到“invalid”，无法直接获知错误文本（例如“Email is required”）。键盘用户需要额外浏览页面才能找到错误，表单修复成本显著增加。
- **建议**: 统一由 FieldFrame 暴露稳定的 `describedBy/errorId` 注入契约，或让 `useFormFieldController` / presentation 返回 `errorId`，基础控件在 `presentation.showError` 时显式设置 `aria-describedby` 与 `aria-errormessage`。确保 hint/description/error 均能被真实 focus target 引用。
- **影响**: 依赖屏幕阅读器、语音提示或认知辅助的用户；场景是填写 Flux 表单后触发必填、邮箱或异步校验错误，需要定位并修正具体字段。
- **为什么值得现在做**: 这是基础表单字段的通用路径，影响所有消费 `flux-renderers-form` 的表单页面，不是单个组件细节。
- **误报排除**: 这不是维度 11 的 raw HTML vs UI component 问题；也不是 shadcn/ui 基础组件问题。问题在本仓库 renderer 对错误信息与 focus target 的使用方式。
- **历史模式对应**: field shell / wrapped control 的可访问性关联遗漏。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-02] input-number 错误只设置 aria-errormessage，缺少 aria-describedby 兜底

- **文件**: `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:91-121`
- **证据片段**:
  ```tsx
  <Input
    type="number"
    id={name ? `${name}-control` : undefined}
    name={name || undefined}
    value={numericValue !== undefined ? numericValue : ''}
    disabled={presentation.effectiveDisabled}
    aria-label={String((props.props.label ?? name) || '') || undefined}
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
    aria-errormessage={presentation.showError ? errorId : undefined}
  />
  ```
- **严重程度**: P2
- **WCAG 准则**: 3.3.1 Error Identification / 4.1.2 Name, Role, Value
- **现状**: `input-number` 的错误状态引用 `aria-errormessage`，但没有同步设置 `aria-describedby`。部分 AT/browser 对 `aria-errormessage` 支持仍不如 `aria-describedby` 稳定，且错误元素由外层 `FieldFrame` 生成时，实际可读性依赖 clone 注入是否落到真实 input。
- **风险**: 使用屏幕阅读器的用户在数字字段校验失败时可能无法稳定听到错误说明，只感知字段 invalid。
- **建议**: 在 `presentation.showError` 时同时设置 `aria-describedby={errorId}`；如果同时有 hint/description，需要合并 describedby token。
- **影响**: 屏幕阅读器用户；场景是输入数字超出范围、为空或格式不符合规则后需要知道具体错误。
- **为什么值得现在做**: `input-number` 是基础字段之一，且修复局部、风险低。
- **误报排除**: 不是要求替换 UI 组件；当前已经使用 `Input`，问题是 ARIA 关联不完整。
- **历史模式对应**: 错误提示只视觉展示、未完整绑定到输入控件。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-03] select / radio-group / checkbox-group 加载状态未通过 aria-live 宣告

- **文件**: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:114-123,238-267,298-333`
- **证据片段**:
  ```tsx
  {
    loading ? (
      <span data-slot="select-loading" role="status" className="flex items-center gap-1.5">
        <Spinner className="size-4" aria-hidden="true" />
        <span>{t('flux.common.loading')}</span>
      </span>
    ) : null;
  }
  ```
  ```tsx
  {
    loading ? (
      <span data-slot="radio-group-loading">
        <Spinner className="size-4" aria-hidden="true" />
        <span>{t('flux.common.loading')}</span>
      </span>
    ) : null;
  }
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.3 Status Messages / 1.3.1 Info and Relationships
- **现状**: `select` 的 loading 节点有 `role="status"` 但没有显式 `aria-live="polite"`；`radio-group` 和 `checkbox-group` loading 节点甚至没有 `role="status"` / `aria-live`。同仓其他位置（如 tree controls、table loading、chart loading）已显式使用 live region，模式不一致。
- **风险**: 依赖屏幕阅读器的用户打开异步 options 字段时不会被告知选项正在加载，可能误以为空列表或控件无响应。
- **建议**: 三处 loading 节点统一为 `role="status" aria-live="polite"`，并保证加载完成后的错误状态使用 `role="alert"` 或与控件 describedby 关联。
- **影响**: 屏幕阅读器用户；场景是远程加载下拉、单选、复选选项时等待并判断是否可操作。
- **为什么值得现在做**: 异步选项字段是低代码表单常见路径；修复简单且能与 tree controls 现有模式收敛。
- **误报排除**: 不是装饰性 spinner 必须 aria-hidden 的问题；这里有用户可感知的动态状态文本，应按 status message 处理。
- **历史模式对应**: 动态状态只视觉更新、未通知辅助技术。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `packages/ui/src/index.ts`
- **复核状态**: 未复核

### [维度20-04] 报表字段面板的拖拽字段无法用键盘完成同等插入流程

- **文件**: `packages/report-designer-renderers/src/report-field-panel.tsx:90-120`
- **证据片段**:
  ```tsx
  <li
    key={field.id}
    data-slot="report-field-panel-item"
    draggable
    data-field-id={field.id}
    data-field-source-id={source.id}
    onDragStart={(event) => {
      writeReportFieldDragPayload(event, fieldPayload);
      onFieldDragStart(source.id, field.id, field.label);
    }}
  >
  ```
- **严重程度**: P1
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.7 Dragging Movements（WCAG 2.2）/ 1.3.1 Info and Relationships
- **现状**: 字段项本体的主要 affordance 是 `draggable` + drag handle，但 `li`/drag handle 不可聚焦、无键盘 drag/drop 语义。虽然旁边提供 Insert 按钮，但它只在已有 `selectionTarget` 为 cell/range 时可插入；键盘用户仍需要先能在 spreadsheet canvas 中选择目标，再回到字段面板插入。当前字段拖到目标单元格的直接流程没有键盘等价操作。
- **风险**: 不能使用鼠标或精细拖拽的用户无法完成“选择字段并投放到目标单元格”的核心报表设计流程，或需要依赖不明显的先选中目标再 Insert 的替代流程。
- **建议**: 为字段项提供显式键盘流程：例如“选择字段/开始插入模式”按钮 + canvas/grid 键盘目标选择 + Enter 确认；或在字段列表中提供可发现的 “Insert to current selection” 状态说明，并确保 grid selection 可完全键盘完成且按钮 disabled 原因可感知。
- **影响**: 键盘用户、运动障碍用户、使用开关设备的用户；场景是在 Report Designer 中把字段源插入/绑定到报表单元格。
- **为什么值得现在做**: 字段拖放是 Report Designer 的核心任务，不是装饰交互；当前替代按钮依赖预先选中目标，未覆盖拖放到目标的同等路径。
- **误报排除**: 不是要求移除 HTML5 drag/drop；问题是缺少键盘等价机制。维度 11 负责 UI component 替代，本条只报告 WCAG 键盘可操作性。
- **历史模式对应**: complex control drag/drop 只有鼠标路径。
- **参考文档**: `docs/architecture/report-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-05] Spreadsheet 行/列尺寸拖拽句柄隐藏于辅助技术，缺少键盘调整入口

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:349-354,411-416`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:72-100`
- **证据片段**:
  ```tsx
  <div
    className="ss-col-resize-handle"
    data-slot="spreadsheet-column-resize-handle"
    aria-hidden="true"
    onMouseDown={(event) => onColumnResizeStart(col, event)}
  />
  ```
  ```tsx
  <div
    className="ss-row-resize-handle"
    data-slot="spreadsheet-row-resize-handle"
    aria-hidden="true"
    onMouseDown={(event) => onRowResizeStart(row, event)}
  />
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.1 Pointer Gestures / 2.5.7 Dragging Movements（WCAG 2.2）
- **现状**: 行/列 resize 的直接操作只通过 `onMouseDown` 拖拽句柄触发，句柄 `aria-hidden="true"` 且不可聚焦。虽然 context menu 中存在 resize dialog 入口，但它依赖用户知道并打开特定表头上下文菜单；直接可见的 resize affordance 没有键盘等价。
- **风险**: 键盘用户或无法拖拽的用户难以发现/执行行高列宽调整，影响 spreadsheet/report 设计中布局精调。
- **建议**: 在列/行 header button 上增加可发现的键盘 resize 命令（例如快捷键、菜单项说明、`aria-keyshortcuts`、或可聚焦 separator/slider-like handle），并保持已有 context menu resize dialog 作为可访问替代入口。
- **影响**: 键盘用户、运动障碍用户；场景是在 spreadsheet/report designer 中调整列宽或行高。
- **为什么值得现在做**: Spreadsheet 是本维度重点 complex control；尺寸调整是编辑器核心能力，当前直接路径明显 mouse-only。
- **误报排除**: raw handle 作为高性能 grid surface 可接受；缺陷不是 raw HTML，而是键盘操作与可发现性不足。
- **历史模式对应**: spreadsheet-like grid pointer-only 操作缺少 keyboard fallback。
- **参考文档**: `docs/components/spreadsheet-page/design.md`; `docs/architecture/report-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-06] Flow Designer palette 拖拽新增节点缺少键盘等价的目标定位流程

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:142-152`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:293-306`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    className="flex flex-1 min-w-0 items-center justify-start gap-3 text-left border-none p-0 hover:bg-transparent"
    onClick={() => handleAddNode(nt)}
    draggable
    onDragStart={(event) => {
      event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
      event.dataTransfer.effectAllowed = 'move';
    }}
  >
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.7 Dragging Movements（WCAG 2.2）
- **现状**: palette item 支持 click 直接新增随机位置，也支持拖拽到 canvas 指定位置；canvas drop 目标仅基于 pointer `clientX/clientY`。键盘用户可以 click 新增，但无法完成“选择节点类型并放置到指定 canvas 位置”的同等操作。
- **风险**: 键盘用户可创建节点但不能精确控制初始位置，后续需要依赖其他移动/布局能力；对大型流程图编辑效率和可控性有实际影响。
- **建议**: 提供键盘插入模式：选择节点类型后将焦点移动到 canvas，用方向键/网格位置选择插入点，Enter 确认；或明确提供“插入到当前选中节点附近/当前 viewport 中心”的可发现操作，并可通过键盘调整。
- **影响**: 键盘用户、运动障碍用户；场景是在 Flow Designer 中从 palette 添加节点到特定画布位置。
- **为什么值得现在做**: Flow Designer 是本维度重点 complex control；拖放新增节点是核心 authoring 路径。
- **误报排除**: 这不是“必须禁用 drag/drop”或“必须替换 Button”的问题；`Button` 使用本身可访问，缺陷是拖放语义没有完整键盘等价。
- **历史模式对应**: designer canvas drag/drop only 精确定位。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-07] Dialog draggable 标题只能 pointer 拖动，缺少键盘移动语义

- **文件**: `packages/ui/src/components/ui/dialog.tsx:126-147,165-177`; `packages/ui/src/components/ui/use-dialog-drag.ts:149-180`
- **证据片段**:
  ```tsx
  <DialogPrimitive.Popup
    ref={contentRef}
    data-slot="dialog-content"
    ...
    onPointerDown={draggable ? handlePointerDown : props.onPointerDown}
  >
  ```
  ```tsx
  function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    const { draggable } = React.useContext(DialogContext);
    return (
      <div
        data-slot="dialog-header"
        className={cn('flex flex-col gap-2 p-4 pb-0', draggable && 'cursor-grab select-none', className)}
        {...props}
      />
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.7 Dragging Movements（WCAG 2.2）/ 4.1.2 Name, Role, Value
- **现状**: `Dialog` 默认 `draggable = true`，并把 header 显示为 draggable（cursor grab），但移动操作仅由 pointer down/move 实现。header 本身不是可聚焦移动控件，没有键盘移动指令、状态说明或重置按钮。Flow Designer JSON panel 等使用 `draggable noOverlay noCenter`，因此该能力暴露在主路径。
- **风险**: 不能使用鼠标拖拽的用户无法移动非居中浮动 dialog；当浮动面板遮挡 canvas/inspector 内容时，键盘用户只能关闭而不能重新定位。
- **建议**: 对 draggable dialog 增加可聚焦拖动把手或菜单命令（例如 “Move dialog”，方向键移动，Esc 取消，Enter 确认），并提供 reset position；或者默认关闭 draggable，仅在有可访问移动机制的场景启用。
- **影响**: 键盘用户、运动障碍用户、屏幕放大用户；场景是打开 Flow Designer 的可拖动 JSON 面板或其他 draggable dialog 后需要移动面板查看被遮挡内容。
- **为什么值得现在做**: draggable dialog 是 `@nop-chaos/ui` 基础组件默认能力，影响所有使用者；修复一次可覆盖多个复杂控制。
- **误报排除**: shadcn/base dialog 的基础 focus trap 不在审计范围；本条针对仓库自定义 draggable 扩展的键盘缺口。
- **历史模式对应**: 自定义 pointer drag 扩展未补 keyboard operation。
- **参考文档**: `packages/ui/src/index.ts`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## a11y 问题清单

- [维度20-01] 基础文本输入/textarea 错误信息没有稳定绑定到真实输入控件。
- [维度20-02] input-number 缺少 `aria-describedby` 错误兜底。
- [维度20-03] 异步选择控件 loading 状态 live region 不一致/缺失。
- [维度20-04] Report Designer 字段拖放缺少键盘等价目标投放流程。
- [维度20-05] Spreadsheet 行列 resize 直接操作 mouse-only。
- [维度20-06] Flow Designer palette 拖放到指定位置缺少键盘等价。
- [维度20-07] 自定义 draggable Dialog 只能 pointer 移动。

## 合理例外/排除项

- 未报告 raw HTML vs `@nop-chaos/ui` 替换问题：维度 11 负责该类问题。
- 未把 shadcn/base-ui 基础组件本身的 focus trap、Select、Popover、Dialog 基础语义作为缺陷；仅检查本仓库使用方式和自定义扩展。
- `WrappedFieldAction` 当前已实现为 `Button`，且具备 disabled/keyboard activation；不按 reopened adjudication 的“wrapped secondary actions non-labelable”旧模式重报。
- `flux-renderers-data` 的 `TreeRenderer` 与 `flux-renderers-form-advanced` 的 tree controls 已有 `role=tree/treeitem`、roving tabindex、Arrow/Home/End 操作和 `aria-expanded`，初审未发现需报告的新高价值问题。
- Spreadsheet grid 已有 `role="grid"`、`gridcell`、`aria-activedescendant`、方向键移动、Enter 编辑和 ContextMenu/Shift+F10 入口；本轮仅报告 resize/dragging 这类未覆盖的 pointer-only 子能力。

## 总结评估

第 1 轮初审发现的主要风险集中在两类：一是表单错误/动态状态对屏幕阅读器的关联与 live announcement 不完整；二是复杂设计器中的拖拽/拖动/resize 能力缺少同等键盘路径。整体不是基础 UI 组件不可访问，而是 renderer 与 complex controls 在把业务状态、错误信息、拖放语义接到真实 focus target 时存在缺口。

## 第 2 轮深挖方向

- 继续检查 composite fields（array-field/object-field/detail-field/variant-field）是否存在错误文本只显示在 wrapper、未绑定到内部 focus target 的同类问题。
- 深挖 Flow Designer tree-mode overlays、branch/merge add menu、edge label toolbar 的 keyboard/focus return。
- 深挖 Word Editor canvas bridge 是否提供可访问编辑面（如果第三方 canvas/contenteditable bridge 没有语义，需要明确 host wrapper 的责任边界）。
- 检查 Report/Spreadsheet field drop、cell metadata/binding 状态是否只靠颜色或视觉 marker 表达。

## 深挖第 2 轮追加

### [维度20-08] Flow tree-mode add-node menu 关闭后没有把焦点还给触发按钮

- **文件**: `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:30-32,78-81`; `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx:121-128`
- **证据片段**:
  ```tsx
  React.useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);
  ```
  ```tsx
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
  }
  ```
  ```tsx
  {
    popover && (
      <DingFlowAddNodeMenu
        screenX={popover.screenX}
        screenY={popover.screenY}
        items={menuItems}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    );
  }
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.3 Focus Order / 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **现状**: `DingFlowAddNodeMenu` 打开时会自动聚焦第一个菜单项，但 `Escape` 关闭或选择菜单项后只调用 `onClose` / `onSelect` 卸载菜单，没有保存触发按钮引用，也没有把焦点恢复到打开菜单的 branch/merge/plus 按钮或 canvas 中的合理节点。
- **风险**: 键盘用户在 tree-mode 分支/合流位置打开新增节点菜单后，取消或插入节点会丢失当前位置，焦点可能落到 `body` 或不可预期位置，继续编辑流程图需要重新 Tab 遍历。
- **建议**: 在打开 popover 时记录触发元素，`onClose` 和 `onSelect` 完成后恢复焦点；若触发元素随结构更新被移除，则聚焦新插入节点、源节点或 canvas region。
- **误报排除**: 这不是 20-06 的“palette 拖放定位”问题；本条针对 tree-mode overlay 菜单关闭后的焦点管理。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-09] Flow edge toolbar 删除边后缺少焦点落点，键盘用户会丢失编辑上下文

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:139-180`
- **证据片段**:
  ```tsx
  {showQuickActions && (
    <EdgeLabelRenderer>
      <div
        role="toolbar"
        tabIndex={0}
        data-slot="designer-edge-actions"
        className="fd-edge-actions inline-flex items-center gap-1.5 p-1 rounded-[10px] border border-border"
  ```
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    data-testid="designer-edge-delete"
    aria-label={t('flux.flowDesigner.deleteEdge')}
    onClick={handleDeleteEdge}
  >
  ```
  ```tsx
  const handleDeleteEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'deleteEdge', edgeId: props.id });
  };
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.3 Focus Order / 2.1.1 Keyboard
- **现状**: edge quick toolbar 内的 Delete 按钮会删除当前 edge，但删除后 toolbar 和 edge label 可能一起卸载，代码没有把焦点移动到 canvas、相邻节点、source/target 节点或状态区域。toolbar 只有 `role="toolbar"` 和 `tabIndex={0}`，没有删除后的 focus-return/next-focus 策略。
- **风险**: 键盘用户删除边后焦点容易丢到已卸载元素或页面 `body`，后续无法连续编辑流程图；在复杂流程图中，用户也难以判断当前操作上下文是否仍停留在原 source/target 附近。
- **建议**: 删除 edge 后显式选择并聚焦 source/target 节点之一，或聚焦 canvas 并通过 live/status 文本提示“edge deleted”；同时为 toolbar 增加稳定 `aria-label`，让辅助技术能识别该工具栏属于当前 edge。
- **误报排除**: 按钮本身是可聚焦的 `Button`，问题不在控件类型，也不是要求禁用删除能力；缺陷是当前焦点所在的复合控件被删除/卸载后没有可预测的替代焦点。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-10] Word Editor canvas host 没有可访问边界或备用编辑语义

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:95-160`; `packages/word-editor-renderers/src/word-editor-page.tsx:215-226`
- **证据片段**:
  ```tsx
  bridge.mount(
    container,
    editorData,
    {
      onContentChange: () => {
        debouncedSave();
        editorStore.setDirty(true);
      },
  ```
  ```tsx
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  ```
  ```tsx
  const canvasSlot = (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-[var(--nop-playground-stage-bg)]">
      <EditorCanvas
        editorStore={editorStore}
        bridge={bridge}
  ```
- **严重程度**: P1
- **WCAG 准则**: 4.1.2 Name, Role, Value / 2.1.1 Keyboard / 1.3.1 Info and Relationships
- **现状**: Word Editor 把第三方 `@hufe921/canvas-editor` mount 到一个裸 `<div>`，host wrapper 没有 `role`、`aria-label`、`tabIndex`、说明文本，也没有声明 canvas 编辑面的辅助技术责任边界或 fallback。
- **风险**: 如果第三方 canvas editor 主要通过 canvas/自绘 DOM 暴露内容，屏幕阅读器用户无法识别这里是文档编辑区、当前文档内容或可操作方式；键盘用户也缺少明确的进入/退出编辑边界。
- **建议**: 给 host 增加明确的可访问 region/application/textbox 边界与说明，确认第三方编辑器内部是否提供 contenteditable/ARIA；若不能保证，提供只读文本镜像、结构化 outline 或可访问编辑替代入口。
- **误报排除**: 不要求审计第三方库内部实现；本条要求本仓库 bridge wrapper 明确承担 host 边界与 fallback 责任。
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-11] Report/Spreadsheet 绑定单元格状态只通过背景色暴露，未进入 gridcell 可访问名称

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:132-177`; `packages/spreadsheet-renderers/src/canvas-styles.css:599-601`; `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:148-155,277-279`
- **证据片段**:
  ```tsx
  const hasBinding = getCellMetadata ? getCellMetadata(row, col) : undefined;
  ...
  <td
    id={`spreadsheet-cell-${addr}`}
    role="gridcell"
    aria-rowindex={row + 1}
    aria-colindex={col + 1}
  ```
  ```tsx
    data-cell-bound={hasBinding ? true : undefined}
  ```
  ```css
  .ss-cell[data-cell-bound] {
    background-color: #f0f8ff;
  }
  ```
  ```tsx
  const getCellMetadata = useCallback(
    (row: number, col: number) =>
      core.getMetadata({
        kind: 'cell',
        cell: { sheetId, address: cellAddress(row, col), row, col },
      }),
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.4.1 Use of Color / 1.3.1 Info and Relationships / 4.1.2 Name, Role, Value
- **现状**: Report Designer 将 cell metadata 传给 Spreadsheet grid 后，绑定状态只映射成 `data-cell-bound`，视觉上仅用浅蓝背景表示；`gridcell` 没有 `aria-label` / `aria-describedby` / 文本 token 来说明“已绑定字段”及字段来源。
- **风险**: 色觉障碍用户、屏幕阅读器用户或高对比模式用户无法可靠知道某个单元格是否已绑定报表字段，也无法区分普通值、绑定值和其他元数据状态。
- **建议**: 为绑定单元格生成可访问描述，例如 `aria-label="A1, bound to field Revenue"` 或 `aria-describedby` 指向隐藏描述；视觉上增加非颜色 marker（图标/角标/文本）并确保高对比模式可见。
- **误报排除**: 这不是 20-04 的字段拖放键盘路径；本条针对拖放/插入完成后的绑定状态表达是否只依赖颜色。
- **参考文档**: `docs/architecture/report-designer/design.md`; `docs/components/spreadsheet-page/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度20-12] Code Editor 的真实编辑面没有可访问名称与错误关联

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:134-142`; `packages/flux-code-editor/src/use-code-mirror.ts:90-93`
- **证据片段**:
  ```tsx
  const { editorRef, view } = useCodeMirror({
    initialValue: value,
    placeholder,
    readOnly,
    extensions,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });
  ```
  ```ts
  const editorView = new EditorView({
    state,
    parent: containerRef.current,
  });
  ```
- **严重程度**: P1
- **WCAG 准则**: 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships / 3.3.1 Error Identification
- **现状**: `code-editor` 使用 CodeMirror 动态生成内部可聚焦编辑面，但 `useCodeMirror` 没有配置 `EditorView.contentAttributes`，也没有把 FieldFrame 的 label、`aria-invalid`、`aria-describedby`、`aria-errormessage` 转发到 CodeMirror 的真实 content DOM。外层 renderer 虽然 `wrap: true`，但 FieldFrame 只能作用到 renderer 根节点，不能可靠命名内部编辑面。
- **风险**: 屏幕阅读器用户聚焦代码编辑器时可能只能听到未命名编辑区域；必填或校验失败时也无法从真实编辑光标位置获知错误文本，影响表达式/SQL/模板编辑等核心输入场景。
- **建议**: 在 `useCodeMirror` 增加可传入的 `contentAttributes`，由 renderer 生成稳定 `aria-label` 或 `aria-labelledby`，并在错误状态下把 FieldFrame 的 error/hint/description id 合并到 CodeMirror content DOM 的 `aria-describedby` / `aria-errormessage`。
- **误报排除**: 这不是已覆盖的基础 `Input` / `Textarea` 问题；CodeMirror 的真实 focus target 是库创建的内部 DOM，当前代码没有任何属性桥接路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-13] Flow Designer 连线/重连只能通过指针 Handle 完成，缺少键盘等价流程

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx:36-48`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:255-256`
- **证据片段**:
  ```tsx
  <Handle
    type="target"
    position={Position.Top}
    className={defaultHandleClass}
    data-testid="designer-handle-target-default"
    data-handle-id="default"
  />
  <Handle
    type="source"
    position={Position.Bottom}
  ```
  ```tsx
  onConnect={isTreeMode ? undefined : handleConnect}
  onReconnect={isTreeMode ? undefined : handleReconnect}
  ```
- **严重程度**: P1
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.7 Dragging Movements（WCAG 2.2）/ 4.1.2 Name, Role, Value
- **现状**: 节点端口通过 React Flow `Handle` 暴露，当前 wrapper 只提供视觉 handle 与 `data-*`，没有可聚焦端口、端口名称、键盘开始/完成连线命令。canvas 侧连线与重连主要接在 `onConnect` / `onReconnect`，依赖拖拽 handle。
- **风险**: 键盘用户可以选择节点，但无法完成“从节点 A 的输出端口连接到节点 B 的输入端口”或重连已有边，这是 Flow Designer 的核心 authoring 能力。
- **建议**: 为节点提供键盘连线模式：在选中节点/端口后通过命令开始连接，移动到目标节点/端口后 Enter 完成，Esc 取消；同时为端口提供可访问名称和当前连接状态说明。
- **误报排除**: 这不是 20-06 的 palette 拖放定位问题；本条针对已有节点之间的边创建/重连能力，属于独立核心路径。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-14] Flow 节点工具栏删除节点后没有可预测焦点落点

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:81-88,274-285`
- **证据片段**:
  ```tsx
  const actionScope = useMemo(
    () => ({
      onEdit: () => dispatch({ type: 'selectNode', nodeId: props.id }),
      onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
      onDelete: () => {
        if (!isDeletable) return;
        dispatch({ type: 'deleteNode', nodeId: props.id });
      },
  ```
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    data-testid="designer-node-delete"
    aria-label={t('flux.flowDesigner.deleteNode')}
    className="border-0 hover:bg-destructive/15 hover:text-destructive"
    onClick={actionScope.onDelete}
  >
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.3 Focus Order / 2.1.1 Keyboard
- **现状**: 节点 quick toolbar 的 Delete 按钮会删除当前节点，但删除后节点、toolbar 和按钮都会卸载，代码没有把焦点移动到 canvas、相邻节点、父/后继节点或状态区域。
- **风险**: 键盘用户删除节点后焦点可能落到已卸载元素或 `body`，连续编辑流程图时会丢失上下文。
- **建议**: 删除成功后选择并聚焦合理替代目标，例如相邻节点、canvas region，或在 tree mode 中聚焦父/后继节点；同时用 status/live 文本提示节点已删除。
- **误报排除**: 这不是 20-09 的 edge 删除焦点问题；本条是节点删除路径，卸载对象、后续上下文与恢复策略不同。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度20-15] Spreadsheet 工具栏 toggle/对齐按钮只用 `data-toolbar-active` 暴露状态

- **文件+行号**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:17-27`; `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:86-119`
- **证据片段**:
  ```tsx
  <Button
    variant={props.variant ?? 'ghost'}
    size="icon-sm"
    onClick={props.onClick}
    disabled={props.disabled}
    className={props.className}
    data-toolbar-active={props.active || undefined}
    aria-label={t(props.label)}
    title={t(props.label)}
  >
  ```
  ```tsx
  <ToolbarButton
    label="flux.spreadsheet.boldShortcut"
    icon={<Bold />}
    onClick={() => props.onStyleTool('bold')}
    disabled={!props.hasSelection || mutationDisabled}
    variant={isBold ? 'outline' : 'ghost'}
    active={isBold}
  />
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships
- **现状**: Spreadsheet 工具栏的 Bold/Italic/Underline 以及左右/居中对齐等按钮通过 `active` 控制视觉 variant，并写入 `data-toolbar-active`，但没有同步 `aria-pressed` 或等价语义。
- **风险**: 屏幕阅读器用户无法知道当前单元格/选区是否已加粗、斜体、下划线或当前对齐状态，只能听到按钮名称，不能获取 pressed/current value。
- **建议**: 对 toggle 型按钮在 `ToolbarButton` 中输出 `aria-pressed={props.active}`；对互斥对齐组可进一步使用 toolbar/group 语义或在 label 中包含当前状态。
- **误报排除**: 这不是已覆盖的 binding color 问题；这里针对工具栏按钮自身的状态语义。Word toolbar 的 `ToolbarButton` 已使用 `aria-pressed`，说明同类模式已有可参考实现。
- **参考文档**: `docs/components/spreadsheet-page/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-16] Spreadsheet 工作表重命名只能通过鼠标双击进入，且重命名输入框无可访问名称

- **文件+行号**: `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:53-58,108-118,120-128`
- **证据片段**:
  ```tsx
  const handleTabDoubleClick = (sheetId: string, currentName: string) => {
    if (readOnly) return;
    if (!onRenameSheet) return;
    setRenamingSheetId(sheetId);
    setRenameValue(currentName);
  };
  ```
  ```tsx
  <Input
    ref={renameInputRef}
    className="ss-sheet-tab-rename"
    value={renameValue}
    onChange={(e) => setRenameValue(e.target.value)}
    onBlur={handleRenameSubmit}
    onKeyDown={handleRenameKeyDown}
  ```
  ```tsx
  <Button
    variant="ghost"
    size="xs"
    className="ss-sheet-tab"
    data-active={isActive || undefined}
    onClick={() => handleTabClick(sheet.id)}
    onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard / 2.5.1 Pointer Gestures / 4.1.2 Name, Role, Value
- **现状**: 工作表重命名入口仅绑定在 `onDoubleClick`，没有键盘命令、菜单项或按钮入口；进入重命名后渲染的 `Input` 没有 `aria-label`、`aria-labelledby` 或可见 label。
- **风险**: 键盘用户无法发现或执行重命名；辅助技术用户即使进入编辑态，也可能听到未命名输入框，不知道正在编辑哪个 sheet 名称。
- **建议**: 提供可键盘触发的 Rename 命令，例如 sheet tab 上的 context menu/更多按钮/F2 快捷键；重命名输入框增加 `aria-label={t('flux.sheet.renameSheetAriaLabel', { name: sheet.name })}` 或关联隐藏 label。
- **误报排除**: 这不是已覆盖的 resize 或 drag/drop 问题；缺陷是双击专属操作和真实输入控件命名缺失。
- **参考文档**: `docs/components/spreadsheet-page/design.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度20-17] nop-debugger 顶层 tablist 的子项不是 `tab`，当前页签状态未暴露

- **文件+行号**: `packages/nop-debugger/src/panel.tsx:432-445,448-487`
- **证据片段**:
  ```tsx
  <div className="ndbg-tabs" role="tablist" aria-label={t('flux.debugger.tabsLabel')}>
    {(['overview', 'timeline', 'network', 'node'] as NopDebuggerTab[]).map((tab) => (
      <Button
        key={tab}
        type="button"
        variant="ghost"
        size="sm"
        className="ndbg-tab"
        data-active={chrome.activeTab === tab ? '' : undefined}
  ```
  ```tsx
  {chrome.activeTab === 'overview' ? (
    <OverviewTab
      overview={overview}
      paused={chrome.paused}
      strictMode={chrome.strictMode}
      latestTrace={latestTrace}
  ```
- **严重程度**: P2
- **WCAG 准则**: 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships / 2.4.3 Focus Order
- **现状**: 容器声明 `role="tablist"`，但子项只是普通 `Button`，没有 `role="tab"`、`aria-selected`、`aria-controls`；内容区域也没有对应 `role="tabpanel"` / `aria-labelledby`。
- **风险**: 辅助技术会识别到 tablist，却无法获得合法 tab 子项和当前选中页签；用户难以理解 Overview/Timeline/Network/Node 之间的关系与当前上下文。
- **建议**: 直接使用 `@nop-chaos/ui` 的 `Tabs/TabsList/TabsTrigger/TabsContent`，或补齐 ARIA tabs pattern：tab、tabpanel、aria-selected、aria-controls、id/labelledby，并支持方向键切换。
- **误报排除**: 这不是 dialog、loading、flow focus 或 code-editor 问题；问题集中在 debugger 面板自定义 tabs 的 ARIA 结构不完整。
- **参考文档**: `packages/ui/src/components/ui/tabs.tsx`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度20-01]`: 降级（P2）。live code 显示 `FieldFrame` 会 clone 直接 child 并注入 `aria-describedby/aria-errormessage`，基础 `Input/Textarea` 的直接 child 路径可关联错误；但复合 wrapper 根为 `<div>` 时仍可能只关联 wrapper 而非真实 focus target。
- `[维度20-02]`: 保留（P2）。live code 中 `input-number` 的真实 `<Input type="number">` 仍只有 `aria-errormessage={...}`，没有同步 `aria-describedby`，且外层 `FieldFrame` 注入会落到 renderer 根 `<div>` 而非真实 input。
- `[维度20-03]`: 降级（P3）。live code 中 select loading 已有 `role="status"`（隐含 polite live region），但 radio/checkbox group loading 仍只是普通 `<span>`，缺少 status/live 语义。
- `[维度20-04]`: 驳回（无）。live docs 明确要求字段行提供可聚焦 Insert 按钮作为 keyboard-accessible non-drag insert path，live code 也有 per-field `Button`，且 spreadsheet grid 已有键盘选区与 Shift+F10/context menu 基线；原发现把“拖到任意目标”的鼠标流程等同要求过高。
- `[维度20-05]`: 驳回（无）。live docs 将 row/column resize 的键盘基线固定为 header button + ContextMenu/Shift+F10 + size dialog，live code/tests 存在带 `aria-label` 的 Row height/Column width dialog；mouse handle `aria-hidden` 是文档化例外。
- `[维度20-06]`: 保留（P2）。live code 中 palette click/plus 仅随机位置新增，drop 精确定位仍依赖 pointer `clientX/clientY`，未见键盘选择 canvas 目标位置或插入到当前选中/viewport 中心的可发现等价流程。
- `[维度20-07]`: 保留（P2）。live code 中 `Dialog` 默认 `draggable=true`，拖动只由 header 区域 pointer down/move 驱动，header 没有 focusable move handle、键盘移动或 reset position UI。
- `[维度20-08]`: 保留（P2）。live code 中 add-node menu 打开后聚焦首项，但 `onClose/onSelect` 仅卸载菜单/dispatch，没有保存触发按钮引用或恢复焦点。
- `[维度20-09]`: 保留（P2）。live code 中 edge toolbar 删除按钮直接 dispatch `deleteEdge`，toolbar/edge 可能卸载，未见删除后聚焦 canvas/source/target 或 live status 的策略。
- `[维度20-10]`: 保留（P1）。live code 仍将 canvas-editor mount 到裸 `<div ref>`，host wrapper 没有 `role`、`aria-label`、`tabIndex` 或 fallback；bridge 仅 `new Editor(container, data)`，未暴露可访问边界。
- `[维度20-11]`: 保留（P2）。live code 中 `gridcell` 只用 `data-cell-bound` 和 CSS 背景表达绑定状态，没有 `aria-label/aria-describedby` 或非颜色文本/marker 进入可访问名称。
- `[维度20-12]`: 保留（P1）。live code 中 CodeMirror 创建仅传 `state,parent`，未配置 `EditorView.contentAttributes`，renderer 也未把 label/invalid/describedby/errormessage 转给真实编辑面。
- `[维度20-13]`: 保留（P1）。live code 中 React Flow `Handle` 仅有视觉 class 与 `data-*`，连线/重连挂在 `onConnect/onReconnect`，未见可聚焦端口、端口名称或键盘连线模式。
- `[维度20-14]`: 保留（P2）。live code 中 node toolbar 删除按钮直接 dispatch `deleteNode`，节点/toolbar 卸载后没有可预测 next-focus 或 status announcement。
- `[维度20-15]`: 保留（P2）。live code 中 spreadsheet `ToolbarButton` 只输出 `data-toolbar-active` 与 visual variant，没有 `aria-pressed`；Bold/Italic/Underline/Align active 状态未暴露给 AT。
- `[维度20-16]`: 保留（P2）。live code 中 sheet rename 入口仍只有 `onDoubleClick`，重命名 `<Input>` 无 `aria-label/labelledby`，未见 F2/context menu/显式按钮入口。
- `[维度20-17]`: 保留（P2）。live code 中 debugger 容器声明 `role="tablist"`，子项仍是普通 `Button`，无 `role="tab"`、`aria-selected`、`aria-controls`，内容也无 `tabpanel` 关联。

## 子项复核建议

- `[维度20-01]`：需用实际渲染 DOM 分别核对基础 input/textarea 与 select/radio/checkbox/code-editor 等复合 wrapped renderer 的最终 focus target ARIA 归属。

## 子项复核结论

- `[维度20-01]`: 子项复核降级（P2）。live code 显示基础 `Input`/`Textarea` 作为 `FieldFrame` 直接 child 会被 clone 注入错误 `aria-describedby/aria-errormessage` 到真实控件；但 select/radio/checkbox/code-editor 等复合 renderer 的注入仍落在 wrapper 或外层 root，真实 focus target 不稳定关联字段错误。
- `[维度20-10]`: 子项复核通过（P1）。live code 仍把 canvas editor mount 到裸 `<div ref>`，host 无 `role`、`aria-label`、`tabIndex` 或可访问 fallback 边界。
- `[维度20-12]`: 子项复核通过（P1）。live code 中 CodeMirror 仍仅 `new EditorView({ state, parent })`，未配置 `contentAttributes`，FieldFrame ARIA 注入只落到外层 renderer root。
- `[维度20-13]`: 子项复核通过（P1）。live code 中 React Flow `Handle` 仍只有视觉/data 属性，连线/重连仍依赖 pointer `onConnect/onReconnect`，无可聚焦端口或键盘连线流程。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                 | 摘要                                                                            |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 维度20-01 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx`; `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`                                          | 复合 wrapped renderer 的字段错误可能未稳定关联到真实 focus target。             |
| 维度20-02 | P2       | `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`                                                                                                   | input-number 错误只设置 aria-errormessage，缺少 aria-describedby 兜底。         |
| 维度20-03 | P3       | `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`                                                                                                  | radio/checkbox group 加载状态缺少 status/live 语义。                            |
| 维度20-06 | P2       | `packages/flow-designer-renderers/src/designer-palette.tsx`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`                    | Flow Designer palette 拖拽新增节点缺少键盘等价的目标定位流程。                  |
| 维度20-07 | P2       | `packages/ui/src/components/ui/dialog.tsx`; `packages/ui/src/components/ui/use-dialog-drag.ts`                                                                           | Dialog draggable 标题只能 pointer 拖动，缺少键盘移动语义。                      |
| 维度20-08 | P2       | `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx`; `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx`                | Flow tree-mode add-node menu 关闭后没有把焦点还给触发按钮。                     |
| 维度20-09 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx`                                                                                   | Flow edge toolbar 删除边后缺少焦点落点。                                        |
| 维度20-10 | P1       | `packages/word-editor-renderers/src/editor-canvas.tsx`; `packages/word-editor-renderers/src/word-editor-page.tsx`                                                        | Word Editor canvas host 没有可访问边界或备用编辑语义。                          |
| 维度20-11 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx`; `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`                            | Report/Spreadsheet 绑定单元格状态只通过背景色暴露，未进入 gridcell 可访问名称。 |
| 维度20-12 | P1       | `packages/flux-code-editor/src/code-editor-renderer.tsx`; `packages/flux-code-editor/src/use-code-mirror.ts`                                                             | Code Editor 的真实编辑面没有可访问名称与错误关联。                              |
| 维度20-13 | P1       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx` | Flow Designer 连线/重连只能通过指针 Handle 完成，缺少键盘等价流程。             |
| 维度20-14 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`                                                                                   | Flow 节点工具栏删除节点后没有可预测焦点落点。                                   |
| 维度20-15 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx`; `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx`                 | Spreadsheet 工具栏 toggle/对齐按钮只用 `data-toolbar-active` 暴露状态。         |
| 维度20-16 | P2       | `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`                                                                                                                   | Spreadsheet 工作表重命名只能通过鼠标双击进入，且重命名输入框无可访问名称。      |
| 维度20-17 | P2       | `packages/nop-debugger/src/panel.tsx`                                                                                                                                    | nop-debugger 顶层 tablist 的子项不是 `tab`，当前页签状态未暴露。                |
