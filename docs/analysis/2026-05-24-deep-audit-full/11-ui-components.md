# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-01] 表格 radio 行选择通过 Checkbox 强行覆盖 role，绕过 RadioGroup 组件契约

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:214-221`
- **证据片段**:
  ```tsx
          {schemaProps.rowSelection.type === 'radio' ? (
            <Checkbox
              shape="circle"
              checked={isSelected}
              role="radio"
              aria-checked={isSelected}
              onCheckedChange={(checked) => onSelectRow(rowKey, Boolean(checked))}
              aria-label={t('flux.table.selectRow')}
            />
  ```
- **严重程度**: P2
- **原生元素**: `role="radio"` 语义覆盖在 `Checkbox`/checkbox primitive 上
- **应替换为**: `RadioGroup` + `RadioGroupItem`（来自 `@nop-chaos/ui`）
- **所在层**: 渲染器层，`flux-renderers-data` 表格 renderer
- **替换可行性**: 中。需要把当前逐行 `onSelectRow(rowKey, checked)` 适配成 group value / onValueChange，或在表格选择列上建立共享 `RadioGroup` 语义；不是简单一行替换，但可局部收敛。
- **现状**: `@nop-chaos/ui` 已提供 `RadioGroup`/`RadioGroupItem`，但 radio 行选择复用了 `Checkbox` 并用 `role="radio"` 覆盖语义。
- **风险**: 选择控件视觉和交互实现继续绑定 checkbox 组件契约，后续维护者容易把 radio/checkbox 行选择逻辑混用；也会让 UI primitive 的键盘语义、group value 语义和测试选择器偏离 `@nop-chaos/ui` 的统一抽象。
- **建议**: 将 `rowSelection.type === 'radio'` 分支改为 `RadioGroupItem`，并在表格选择列/行集合上提供统一的 `RadioGroup` value 管理；测试从 `[data-slot="checkbox"][data-shape="circle"]` 改为 radio group slot/role 断言。
- **为什么值得现在做**: 这是 table 选择核心 UI，已有等价 UI primitive，收口能同时改善维护性和语义一致性。
- **误报排除**: 这不是 calibration pattern 3 中的 platform-native 控件、spreadsheet 高性能 grid、ui 包内部实现，也不是 `input[type=file/color]`。仓库已有等价 `@nop-chaos/ui` radio 抽象，替换能提升 UI 组件一致性和维护性。
- **历史模式对应**: 使用一个 UI primitive 再手写 ARIA role 模拟另一个 primitive 的跨组件契约漂移。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 原生 HTML 使用清单

### 建议整改

- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:214-221`: 当前 `Checkbox` + `role="radio"`，建议 `RadioGroup` + `RadioGroupItem`。

### 合理例外 / 不建议在本轮报告

- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx:132`: `<input type="file" hidden />` 属于浏览器原生文件选择能力；`@nop-chaos/ui` 没有等价 file picker 封装。
- `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:156,274-461`: 原生 `<table>/<thead>/<tbody>/<tr>/<th>/<td>` 属于 spreadsheet 高性能、强语义 grid/命中测试/虚拟滚动宿主表面。
- `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:282,329`: 原生 `<tr aria-hidden />` 虚拟滚动 spacer 行；替换为 `TableRow` 会引入默认 row 样式，收益不明确。
- `packages/ui/src/**`: ui 包内部大量原生元素是实现层合理使用。
- 测试与 test support: 已排除 `*.test.tsx`、`__tests__/**`、`test-support.tsx`、`*.test-support.tsx`、`config-test-support.tsx`。

## 导入模式检查

- `@base-ui/react` / radix 直接依赖仅在 `packages/ui/package.json` 与 `packages/ui/src/**`。
- 未发现 apps/packages 非 ui 包直接依赖或导入 radix/base-ui 绕过 `@nop-chaos/ui`。
- 非 ui 包未发现导入 `@nop-chaos/ui` 内部实现路径。
- `@nop-chaos/ui/chart` 是 `packages/ui/package.json` exports 暴露子路径，本轮不作为绕过问题。

## 总结评估

本轮按 calibration pattern 3 提高证据门槛后，仅保留 1 个建议整改项：表格 radio 行选择应从 `Checkbox + role="radio"` 收敛到 `RadioGroup/RadioGroupItem`。其余 raw HTML 命中主要是合理例外：文件输入、spreadsheet grid、虚拟化 spacer、ui 包内部实现和测试 mock。

## 第 2 轮深挖方向

- 深挖 `rowSelection.type === 'radio'` 的完整渲染路径和测试断言，确认是否还有依赖 checkbox slot/shape 的公开或测试契约。
- 检查其他复杂控件是否存在“使用一个 ui primitive，再手写 ARIA role 模拟另一个 primitive”的同类模式。

## 深挖第 2 轮追加

### [维度11-02] DingFlow 加节点菜单用 Button 手写 menuitem，绕过 DropdownMenu 菜单 primitive

- **文件+行号**: `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:48-112`
- **证据片段**:
  ```tsx
  <div
    className="fixed z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg"
    style={{ left: screenX - 100, top: screenY - 110 }}
    role="menu"
    aria-label="Add node"
  >
    <Button
      role="menuitem"
      tabIndex={index === activeIndex ? 0 : -1}
  ```
- **严重程度**: P2
- **现状**: 组件外层用 `div role="menu"`，菜单项用 `@nop-chaos/ui` 的 `Button` 再覆盖 `role="menuitem"`，并在本组件内手写 `activeIndex`、`itemRefs`、Arrow/Home/End/Escape 键盘导航。`@nop-chaos/ui` 已导出 `DropdownMenu` / `DropdownMenuContent` / `DropdownMenuItem` 等菜单 primitive。
- **风险**: 菜单语义和键盘契约分散在业务组件中，无法复用 `DropdownMenu` 的统一焦点管理、data-slot、disabled、关闭/返回焦点等行为；`Button` 的按钮契约与 `menuitem` 契约混用，后续容易继续扩大跨 primitive 语义漂移。
- **建议**: 将加节点浮层收敛到菜单 primitive：优先使用 `DropdownMenuContent` / `DropdownMenuItem`；若必须保留按 `screenX/screenY` 坐标定位，可先用 `Popover` 或等价浮层承载，再让可选项使用菜单/命令类 item primitive。测试应从手写 `tabIndex` roving 细节转为断言菜单可见性、选中回调和关键键盘行为。
- **误报排除**: 这不是 `packages/ui/src/**` 内部实现，也不是 spreadsheet/canvas 高性能宿主表面本身。问题点集中在画布弹出的菜单控件，仓库已有等价 `@nop-chaos/ui` 菜单抽象，替换有明确一致性和维护收益。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `docs/skills/deep-audit-prompts.md`; `docs/analysis/2026-05-24-deep-audit-full/11-ui-components.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度11-03] nop-debugger 标签页用 `div role="tablist"` + Button 手写，绕过 Tabs primitive

- **文件+行号**: `packages/nop-debugger/src/panel.tsx:432-441`
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
            onClick={() => props.controller.setActiveTab(tab)}
  ```
- **严重程度**: P2
- **现状**: `packages/ui/src/index.ts` 已导出 `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`，但 debugger 面板只使用 `Button`，外层手写 `role="tablist"`，tab 项未使用 `TabsTrigger`，也没有统一的 Tabs value/content 契约。
- **风险**: 当前 DOM 暴露了 tablist 语义，却没有把子项收敛到 Tabs primitive，容易遗漏 `role="tab"`、选中态、键盘切换、content 关联和 data-slot 约定；后续 debugger 标签页样式/可访问性会继续偏离全仓 UI primitive。
- **建议**: 将该区域改为 `Tabs value={chrome.activeTab} onValueChange={...}`，用 `TabsList` + `TabsTrigger value="overview|timeline|..."` 承载标签，用 `TabsContent` 包裹对应面板；保留现有 `ndbg-*` class 仅作为调试器外观扩展。
- **误报排除**: 这不是 `packages/ui/src/**` 内部实现，也不是 spreadsheet/canvas 高性能宿主表面；该包已依赖并导入 `@nop-chaos/ui`，且存在等价 Tabs primitive，替换能直接提升语义一致性和维护性。该问题也不同于已覆盖的表格 radio 与 DingFlow menu，是独立的 Tabs primitive 绕过。
- **参考文档**: `AGENTS.md`; `docs/skills/deep-audit-prompts.md`; `packages/ui/src/index.ts`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度11-04] Word Editor 左侧面板 Tabs 只手写 onClick/data-state，未使用 Tabs 的受控 value 契约

- **文件+行号**: `packages/word-editor-renderers/src/word-editor-page.tsx:178-199`
- **证据片段**:
  ```tsx
  <Tabs data-orientation="horizontal" className="flex min-h-0 flex-1 flex-col gap-0">
    <TabsList variant="line" className="w-full rounded-none border-b border-border px-0 shrink-0">
    <TabsTrigger
      value="datasets"
      data-state={activePanel === 'datasets' ? 'active' : 'inactive'}
      onClick={() => setActivePanel('datasets')}
  ...
  <TabsContent value={activePanel} className="flex-1 min-h-0 overflow-y-auto">
  ```
- **严重程度**: P2
- **现状**: 已使用 `@nop-chaos/ui` 的 `Tabs/TabsList/TabsTrigger/TabsContent`，但 `Tabs` root 没有传入 `value` / `onValueChange`，而是在 `TabsTrigger` 上手写 `onClick` 和 `data-state`，并用单个动态 `TabsContent value={activePanel}` 承载内容。
- **风险**: Tabs primitive 的键盘切换、受控状态、trigger/panel 匹配关系被业务状态绕开；鼠标点击可能正常，但键盘切换或后续外部状态同步容易出现 trigger 激活态与内容不一致。
- **建议**: 改为 `<Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as ...)}>`；移除手写 `data-state` 和 trigger `onClick`；为 `datasets` / `fields` 分别渲染稳定的 `TabsContent value="..."`。
- **误报排除**: 这不是已覆盖的 nop-debugger tabs；该文件已经引入并使用 `@nop-chaos/ui` Tabs primitive，问题是 primitive 使用方式绕开了其受控契约。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `packages/ui/src/components/ui/tabs.tsx`
- **复核状态**: 未复核

### [维度11-05] 表达式插入弹窗 Tabs 同样绕开 value/onValueChange，导致键盘契约漂移

- **文件+行号**: `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx:98-116`
- **证据片段**:
  ```tsx
  <Tabs data-orientation="horizontal" className="flex-col gap-0">
    <TabsList className="mb-4">
      <TabsTrigger
        value="el"
        data-state={exprType === 'el' ? 'active' : 'inactive'}
        onClick={() => setExprType('el')}
  ...
  <TabsContent value={exprType} className="mb-4">
  ```
- **严重程度**: P2
- **现状**: 弹窗内使用 Tabs primitive，但状态更新绑定在 trigger click 上，root 未受控，content 也使用动态 value。
- **风险**: Dialog 内 Tabs 是高频表单交互控件；绕过 root value/onValueChange 会让键盘切换、焦点管理和内容同步不完全依赖 UI primitive，后续测试也容易只覆盖 click 而漏掉键盘路径。
- **建议**: 使用 `<Tabs value={exprType} onValueChange={(v) => setExprType(v as 'el' | 'xpl')}>`；删除手写 `data-state` / `onClick`；分别渲染 `TabsContent value="el"` 与 `TabsContent value="xpl"`。
- **误报排除**: 不是原生 HTML 合理例外，也不是已覆盖的 debugger tabs；该处已有等价 `@nop-chaos/ui` Tabs primitive，只是使用方式未遵循其状态契约。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `packages/ui/src/components/ui/tabs.tsx`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度11-06] Fieldset 折叠标题用 `legend role="button"` 手写 Disclosure，绕过 Collapsible primitive

- **文件+行号**: `packages/flux-renderers-form/src/renderers/fieldset.tsx:51-63`
- **证据片段**:
  ```tsx
  <legend
    data-slot="fieldset-title"
    className={cn(
      collapsible && 'flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none',
      slotProps.titleClassName,
    )}
    onClick={toggle}
    onKeyDown={collapsible ? handleKeyDown : undefined}
    tabIndex={collapsible ? 0 : undefined}
    role={collapsible ? 'button' : undefined}
    aria-expanded={collapsible ? !collapsed : undefined}
  ```
- **严重程度**: P2
- **现状**: `fieldset` renderer 在 `collapsible` 模式下把原生 `legend` 改造成 button，并手写 `tabIndex`、`role`、`aria-expanded`、Enter/Space 键盘切换；但 `@nop-chaos/ui` 已导出 `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent`。
- **风险**: 表单核心 renderer 的折叠交互没有复用统一 disclosure primitive，后续容易遗漏 trigger/content 关联、data-slot、键盘行为和受控/非受控状态契约；`legend` 同时承担 fieldset 标题语义和按钮语义，维护者也容易继续扩展手写 ARIA。
- **建议**: 将可折叠分支收敛到 `Collapsible open={...} onOpenChange={...}`，用 `CollapsibleTrigger` 承载标题触发区域，用 `CollapsibleContent` 包裹 body；保留 `fieldset/legend` 的表单分组语义，但避免在 `legend` 本身手写 button 契约。
- **误报排除**: 这不是 `packages/ui/src/**` 内部实现，也不是 file input、spreadsheet grid 或 canvas 高性能宿主表面。问题位于核心表单 renderer，且仓库已有等价 `@nop-chaos/ui` Collapsible primitive。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `packages/ui/src/components/ui/collapsible.tsx`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度11-07] Flow Designer 调色板分组用 Button 手写 disclosure，绕过 Collapsible primitive

- **文件+行号**: `packages/flow-designer-renderers/src/designer-palette.tsx:113-128`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    data-slot="designer-palette-group-header"
    className="fd-panel-caption mb-2 flex w-full items-center justify-start gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.18em]"
    onClick={() => toggleGroup(group.id)}
    aria-expanded={expandedGroups.has(group.id)}
    aria-controls={`designer-palette-group-${group.id}`}
  >
  ...
  {expandedGroups.has(group.id) && (
    <div id={`designer-palette-group-${group.id}`}>
  ```
- **严重程度**: P2
- **现状**: Flow Designer palette 分组通过本地 `Set` 状态、`Button`、`aria-expanded`、`aria-controls` 和条件渲染手写折叠/展开交互；`@nop-chaos/ui` 已导出 `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent`。
- **风险**: 设计器核心入口的分组 disclosure 契约散落在业务组件中，无法复用统一 primitive 的 trigger/content、open 状态标记、data-slot 与后续可访问性行为；后续 palette 分组样式或交互扩展容易继续偏离 UI primitive。
- **建议**: 将每个 palette group 改为 `<Collapsible open={expandedGroups.has(group.id)} onOpenChange={...}>`，用 `CollapsibleTrigger render={<Button ... />}` 或等价模式承载标题按钮，用 `CollapsibleContent` 包裹节点列表；保留现有 `designer-palette-*` slot/class 作为业务标记。
- **误报排除**: 这不是已覆盖的 fieldset collapsible，也不是 table radio、DingFlow menu、debugger tabs 或 Word tabs；问题位于 Flow Designer palette 分组 disclosure，不属于 canvas 高性能宿主表面。该处已有明确等价的 `@nop-chaos/ui` Collapsible primitive，替换收益明确。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `packages/ui/src/components/ui/collapsible.tsx`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度11-08] nop-debugger 多处展开详情用 Button+aria-expanded 手写 disclosure，绕过 Collapsible/Accordion primitive

- **文件+行号**: `packages/nop-debugger/src/panel/disclosure-trigger.tsx:14-23`; `packages/nop-debugger/src/panel/timeline-tab.tsx:151-174`
- **证据片段**:
  ```tsx
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn('ndbg-entry-trigger active:translate-y-0', className)}
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onToggle}
      style={style}
    >
  ```
- **严重程度**: P2
- **现状**: `nop-debugger` 抽出了 `DisclosureTrigger`，但它只是 `Button + aria-expanded + aria-controls + onClick`。`timeline-tab.tsx`、`node-tab.tsx`、`network-tab.tsx` 多处再用外部状态和条件渲染手写详情展开/收起；`@nop-chaos/ui` 已导出 `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent`，也有 `Accordion` 可覆盖单项展开场景。
- **风险**: debugger 面板多处 disclosure 契约分散在业务状态和条件渲染中，无法复用统一 primitive 的 trigger/content 关联、data-slot、open 状态标记和后续可访问性行为；共享 `DisclosureTrigger` 会固化这种绕过模式，后续新增 debugger 分组/详情时容易继续扩散。
- **建议**: 将 `DisclosureTrigger` 收敛为基于 `CollapsibleTrigger` 的封装，调用点用 `Collapsible open={...} onOpenChange={...}` + `CollapsibleContent` 包裹详情；若需要列表内单项展开，可评估 `Accordion` root 管理 active item。保留 `ndbg-*` class 作为外观扩展。
- **误报排除**: 这不是已覆盖的 `nop-debugger` tablist 问题，也不是 Flow Designer palette Collapsible、fieldset Collapsible、table radio 或 DingFlow menu；问题点是 debugger 详情行的 disclosure primitive 绕过。该代码不在 `packages/ui/src/**` 内部，且仓库已有等价 `@nop-chaos/ui` primitive。
- **参考文档**: `AGENTS.md`; `packages/ui/src/index.ts`; `packages/ui/src/components/ui/collapsible.tsx`; `packages/ui/src/components/ui/accordion.tsx`
- **复核状态**: 未复核

## 深挖第 8 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度11-01]`: 保留（P2）。live `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:214-221` 仍在 radio 分支使用 `Checkbox shape="circle"` 并覆盖 `role="radio"`，且 `@nop-chaos/ui` 确认导出 `RadioGroup/RadioGroupItem`。
- `[维度11-02]`: 保留（P2）。live `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:48-112` 仍以 `div role="menu"` + `Button role="menuitem"` 手写 roving focus，而 `@nop-chaos/ui` 确认导出 `DropdownMenu*` 菜单 primitive。
- `[维度11-03]`: 保留（P2）。live `packages/nop-debugger/src/panel.tsx:432-445` 仍用 `div role="tablist"` + `Button` 手写标签切换，未使用已导出的 `Tabs/TabsList/TabsTrigger/TabsContent`。
- `[维度11-04]`: 保留（P2）。live `packages/word-editor-renderers/src/word-editor-page.tsx:178-210` 虽使用 Tabs primitive，但 root 未受控、trigger 手写 `onClick/data-state`、content 使用动态 value，偏离 `docs/components/tabs/design.md` 的 `value/onValueChange` owner 方向。
- `[维度11-05]`: 保留（P2）。live `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx:98-116` 同样使用未受控 Tabs root + trigger click 手写状态，且 `@nop-chaos/ui` Tabs 实现依赖 primitive 自身 active 语义。
- `[维度11-06]`: 降级（P3）。live `packages/flux-renderers-form/src/renderers/fieldset.tsx:51-63` 确有 `legend role="button"` 手写 disclosure，且 `@nop-chaos/ui` 导出 Collapsible；但 owner doc `docs/components/fieldset/design.md` 当前明确记录 collapsible fieldset 使用 `legend role="button"`，因此更像 owner-doc 与 UI primitive 收敛方向冲突，而非直接 P2 违约。
- `[维度11-07]`: 降级（P3）。live `packages/flow-designer-renderers/src/designer-palette.tsx:113-128` 仍用 `Button + aria-expanded/aria-controls` 手写分组 disclosure，且 Collapsible 已导出；但这里已使用 `@nop-chaos/ui` Button，owner doc 未明确要求 Collapsible，问题更偏一致性改进。
- `[维度11-08]`: 驳回（不计入）。live `packages/nop-debugger/src/panel/disclosure-trigger.tsx:14-23` 与调用处确为 `Button + aria-expanded/aria-controls`，但 owner doc `docs/architecture/debugger-runtime.md` 明确把 debugger disclosure trigger 当前基线定义为共享 `@nop-chaos/ui` Button 语义加 aria/content 关系，不能按 Collapsible/Accordion 绕过定性。

## 子项复核建议

无。

## 子项复核结论

- `[维度11-06]`: 降级（P3）。live fieldset 确实手写 `legend role="button"` disclosure，但 `docs/components/fieldset/design.md` 明确把该模式写为当前契约，先按 owner-doc 与 primitive 收敛方向冲突处理。
- `[维度11-07]`: 降级（P3）。live Flow Designer palette 仍用 `Button + aria-expanded/aria-controls` 手写 disclosure，但已使用 `@nop-chaos/ui` Button 且 owner doc 未明确要求 Collapsible，当前更偏一致性改进。
- `[维度11-08]`: 驳回（不计入）。live debugger disclosure 是 `Button + aria-expanded/aria-controls`，但 `docs/architecture/debugger-runtime.md` 明确将其定义为当前基线，不能按 Collapsible/Accordion 绕过定性。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                       | 摘要                                                                                      |
| --------- | -------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 维度11-01 | P2       | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` | 表格 radio 行选择仍使用 `Checkbox shape="circle"` 并覆盖 `role="radio"`。                 |
| 维度11-02 | P2       | `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx`    | DingFlow 加节点菜单仍以 `div role="menu"` + `Button role="menuitem"` 手写菜单焦点管理。   |
| 维度11-03 | P2       | `packages/nop-debugger/src/panel.tsx`                                          | debugger 标签页仍用 `div role="tablist"` + `Button` 手写标签切换，未使用 Tabs primitive。 |
| 维度11-04 | P2       | `packages/word-editor-renderers/src/word-editor-page.tsx`                      | Word Editor 左侧面板虽使用 Tabs primitive，但 root 未受控并手写 trigger 状态。            |
| 维度11-05 | P2       | `packages/word-editor-renderers/src/dialogs/expr-insert-dialog.tsx`            | 表达式插入弹窗 Tabs 仍绕开 `value/onValueChange` 受控契约。                               |
| 维度11-06 | P3       | `packages/flux-renderers-form/src/renderers/fieldset.tsx`                      | Fieldset 可折叠标题仍以 `legend role="button"` 手写 disclosure。                          |
| 维度11-07 | P3       | `packages/flow-designer-renderers/src/designer-palette.tsx`                    | Flow Designer palette 分组仍用 `Button + aria-expanded/aria-controls` 手写 disclosure。   |
