# 维度 11: UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-01] 表格排序头仍使用 `span role="button"` 绕过 `Button`

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`
- **行号范围**: `141-155`
- **证据片段**:
  ```tsx
  {isSortable ? (
    <span
      className="cursor-pointer hover:text-primary focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      role="button"
      tabIndex={0}
      onClick={() => { if (column.name) onSort(column.name); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
  ```
- **严重程度**: P2
- **原生元素**: `<span role="button">`
- **应替换为**: `@nop-chaos/ui` 的 `Button`（例如 `variant="ghost"` / `size="sm"`，保留表头内联视觉类）
- **所在层**: 渲染器层，`flux-renderers-data` 的 table header renderer。
- **替换可行性**: 高；该文件已经从 `@nop-chaos/ui` 导入 `Button`，同一文件内其他表格操作也使用共享 UI 组件。
- **现状**: 排序 label 自行实现 click、keyboard activation、focus ring 和 button semantics。
- **风险**: 后续维护者需要在表格头内重复维护键盘触发、焦点样式和语义；与 `@nop-chaos/ui` 的按钮默认行为、主题变量、disabled/focus 约定脱节。
- **建议**: 将排序 label 包装为 `Button type="button" variant="ghost" size="sm"` 或等价共享按钮触发器，保留 `aria-sort` 在 `TableHead` 上，并把 `onSort` 绑定到 Button。
- **为什么值得现在做**: 这是公开 table renderer 的高频交互点，且替换不需要新增 UI 抽象；可立即减少手写 role widget 和键盘处理重复。
- **误报排除**: 已按 calibration pattern 3 克制判断；这里不是 `input[type=file]`、高性能 grid 宿主表面或 ui 包内部实现，且等价 `Button` 已存在并已在同文件使用。
- **历史模式对应**: Raw HTML as automatic UI contract violation 需更强证据；本例的更强证据是现有共享 Button 可直接替换、当前代码重复实现 role button 交互。
- **参考文档**: `AGENTS.md` MANDATORY UI Component Usage；`packages/ui/src/index.ts`；`docs/references/deep-audit-calibration-patterns.md` pattern 3。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

### [维度11-02] Network debugger 可展开条目用 `article/div role="button"` 自建 disclosure

- **文件**: `packages/nop-debugger/src/panel/network-tab.tsx`
- **行号范围**: `34-49,65-77`
- **证据片段**:
  ```tsx
  <article
    key={request.key}
    className="ndbg-entry"
    role="button"
    tabIndex={0}
    onClick={() =>
      setNetworkExpandedKey(networkExpandedKey === request.key ? null : request.key)
    }
    onKeyDown={(e) => {
  ```
- **严重程度**: P2
- **原生元素**: `<article role="button">`，以及 expanded content 上的 `<div role="button">`
- **应替换为**: `@nop-chaos/ui` 的 `Button` / `Collapsible`（或至少用共享 Button/Collapsible trigger 承担展开触发；expanded content 不应伪装成 button）
- **所在层**: 其他 UI 包，`nop-debugger` 面板。
- **替换可行性**: 中；整行卡片式触发器需要保留现有视觉，但 `@nop-chaos/ui` 已导出 `Button`、`Collapsible`，可用共享触发器承载语义。
- **现状**: debugger 网络请求列表手写 role button、tabIndex、Enter/Space 键处理；expanded detail 区域为了阻止冒泡也被标成 `role="button"`。
- **风险**: 语义与行为不一致，尤其 expanded detail 区域并不执行按钮动作；后续可访问性修复和主题/focus 样式需要在 debugger 内重复维护。
- **建议**: 用 `Collapsible` 建模 request entry 展开状态，触发区域用 `Button` 或 `CollapsibleTrigger`；详情容器只作为内容区域，移除 `role="button"`。
- **为什么值得现在做**: `nop-debugger` 是诊断面板，交互密集且面向开发者排障；统一 disclosure/button 语义可降低未来键盘和屏幕阅读器修复成本。
- **误报排除**: 不是 ui 包内部，也不是 spreadsheet/flow canvas 类高性能宿主表面；等价共享 disclosure/button 抽象存在，且当前 expanded content 的 role button 已体现真实语义偏差。
- **历史模式对应**: 命中 calibration pattern 3 的“raw HTML 需更强证据”，保留原因是此处为手写 role widget，而非平台原生能力控件。
- **参考文档**: `AGENTS.md` MANDATORY UI Component Usage；`packages/ui/src/index.ts`；`docs/skills/deep-audit-prompts.md` 维度 11；`docs/references/deep-audit-calibration-patterns.md` pattern 3。
- **复核状态**: 未复核

### [维度11-03] Node debugger 树节点和事件条目重复使用 `div/article role="button"`

- **文件**: `packages/nop-debugger/src/panel/node-tab.tsx`
- **行号范围**: `234-248,340-376`
- **证据片段**:
  ```tsx
  <div
    key={item.cid}
    className={itemClassName}
    role="button"
    tabIndex={0}
    onClick={() => inspectTreeItem(item)}
    style={{ paddingLeft: `${item.depth * 16 + 8}px` }}
    onKeyDown={(e) => {
  ```
- **严重程度**: P2
- **原生元素**: `<div role="button">`、`<article role="button">`、expanded content 上的 `<div role="button">`
- **应替换为**: `@nop-chaos/ui` 的 `Button` / `Collapsible`；树项可用 Button 作为 row trigger，事件详情用 Collapsible 建模。
- **所在层**: 其他 UI 包，`nop-debugger` 面板。
- **替换可行性**: 中；该文件已导入并使用 `Button`、`Input`，说明共享 UI 入口可用，但树行缩进与卡片布局需要迁移时保留样式。
- **现状**: 组件树 item、node diagnostics event row、expanded detail 区域都用 role button + 手写 keyboard handler 表达交互。
- **风险**: 同一面板内共享 Button 与手写 role button 混用，导致 focus/active/disabled/ARIA 语义不一致；expanded content 被声明为 button 会误导辅助技术。
- **建议**: 将可点击树项和事件条目收敛到 `Button` 或 `CollapsibleTrigger`，把内容区域改为普通 region/content 容器；保留 `.ndbg-*` 类作为视觉样式。
- **为什么值得现在做**: 这是同一 debugger 包内的重复模式，迁移一次即可形成后续 panel 代码的可复用约定。
- **误报排除**: 不报告普通展示用 `article/div`，只报告明确带 `role="button"` 且实现交互的节点；不是高性能 canvas 或 ui 内部实现。
- **历史模式对应**: calibration pattern 3；本例满足“等价 UI 抽象存在 + 替换有一致性/a11y/维护收益”的保留门槛。
- **参考文档**: `AGENTS.md` MANDATORY UI Component Usage；`packages/ui/src/index.ts`；`docs/references/deep-audit-calibration-patterns.md` pattern 3。
- **复核状态**: 未复核

### [维度11-04] Timeline debugger 事件条目和错误组标题用 `role="button"` 自建触发器

- **文件**: `packages/nop-debugger/src/panel/timeline-tab.tsx`
- **行号范围**: `147-159,175-187,285-298`
- **证据片段**:
  ```tsx
  <article
    key={event.id}
    className="ndbg-entry"
    role="button"
    tabIndex={0}
    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
  ```
- **严重程度**: P2
- **原生元素**: `<article role="button">`、`<div role="button">`、`<strong role="button">`
- **应替换为**: `@nop-chaos/ui` 的 `Button` / `Collapsible`，错误组标题可用 Button 或 CollapsibleTrigger。
- **所在层**: 其他 UI 包，`nop-debugger` 面板。
- **替换可行性**: 中；该文件已导入 `Button`、`Input` 并在 filter chips 使用 Button，timeline row 的卡片视觉需要保留但不阻碍迁移。
- **现状**: timeline event row、expanded detail、error group summary 分别手写 role button、tabIndex 和 Enter/Space 处理。
- **风险**: 同一文件内既有共享 `Button` 又有多个手写 role widget，交互语义分裂；expanded content 本身不是按钮却暴露为按钮，屏幕阅读器和键盘用户会获得错误模型。
- **建议**: 将事件展开和错误组展开统一改成 `Collapsible` 模式，触发点使用 `Button`/CollapsibleTrigger；详情内容只阻止冒泡即可，不要设置 button role。
- **为什么值得现在做**: Timeline 是 debugger 的核心列表视图，事件条目数量多；统一触发器能减少重复键盘逻辑，并与现有 filter Button 视觉/语义收敛。
- **误报排除**: 虽然列表可能虚拟化，但这里不是必须避开共享组件的 spreadsheet/grid 宿主表面；当前问题集中在 disclosure trigger 语义，不是渲染性能优化建议。
- **历史模式对应**: calibration pattern 3；保留原因是同文件已存在共享 Button 用法，且 role widget 的语义偏差可被明确定位。
- **参考文档**: `AGENTS.md` MANDATORY UI Component Usage；`packages/ui/src/index.ts`；`docs/references/deep-audit-calibration-patterns.md` pattern 3。
- **复核状态**: 未复核

## 维度复核结论

- [维度11-01]: 保留 (P2)。`packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:141-158` 仍用 `span role="button"` 承担排序触发，而同文件过滤菜单已使用 `@nop-chaos/ui` 的 `Button`。
- [维度11-02]: 保留 (P2)。`packages/nop-debugger/src/panel/network-tab.tsx:34-49` 仍以 `article role="button"` 实现整行 disclosure trigger；虽然 expanded detail 已去掉伪 button role，但主触发器仍是手写 role widget。
- [维度11-03]: 保留 (P2)。`packages/nop-debugger/src/panel/node-tab.tsx:234-248,340-378` 仍在树项和事件列表上使用 `div/article role="button"`，expanded detail 已是普通内容容器，但主交互语义仍未收敛到共享组件。
- [维度11-04]: 保留 (P2)。`packages/nop-debugger/src/panel/timeline-tab.tsx:147-159,278-291` 仍用 `article role="button"` 和 `strong role="button"` 承担展开触发；详情内容容器虽非按钮，但 disclosure trigger 仍是手写模式。

## 子项复核结论

- [维度11-01] 至 [维度11-04]: 均成立。复核后仍集中指向可直接替换为 `@nop-chaos/ui` Button/Collapsible 的 disclosure/sort trigger，自定义 role widget 仍在主路径存续。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                           | 一句话摘要                                                   |
| ----- | -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 11-01 | P2       | `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:141-158` | table 排序触发仍用 `span role="button"`，未用共享 Button     |
| 11-02 | P2       | `packages/nop-debugger/src/panel/network-tab.tsx:34-49`                        | debugger network row disclosure 仍用 `article role="button"` |
| 11-03 | P2       | `packages/nop-debugger/src/panel/node-tab.tsx:234-248,340-378`                 | debugger node/event 列表 disclosure 仍用手写 role widget     |
| 11-04 | P2       | `packages/nop-debugger/src/panel/timeline-tab.tsx:147-159,278-291`             | debugger timeline disclosure trigger 仍未收敛到共享组件      |
