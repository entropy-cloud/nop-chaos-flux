# 11 UI Components

- 深挖轮次: 1
- 深挖发现数: 2

## 第 1 轮初审

### [维度11-01] nop-debugger JSON 折叠开关仍使用原生 button

- **文件**: `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\panel\json-viewer.tsx:58-66`, `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\panel\json-viewer.tsx:103-111`
- **行号范围**: 58-66、103-111
- **证据片段**:
  ```tsx
  <button
    type="button"
    className="ndbg-json-toggle"
    aria-expanded={!collapsed}
    aria-label={`${collapsed ? 'Expand' : 'Collapse'} JSON array`}
    onClick={() => setCollapsed((value) => !value)}
  >
    {collapsed ? `▶ Array(${data.length})` : `▼ Array(${data.length})`}
  </button>
  ```
- **严重程度**: P3（可观察）
- **原生元素**: `<button>`
- **应替换为**: `Button` from `@nop-chaos/ui`
- **所在层**: 其他 / 调试器面板（`@nop-chaos/nop-debugger`）
- **替换可行性**: 高
- **现状**: `JsonViewer` 的数组和对象折叠开关直接使用原生 `<button>`，而 `@nop-chaos/ui` 已提供 `Button`，且该包本身已依赖并在其他面板使用 `@nop-chaos/ui` 的 `Button` / `Input`。
- **风险**: 该调试器面板按钮会绕过共享 Button 的焦点、disabled、variant、size、data-slot 与主题一致性约定；后续调试器 UI 维护时容易继续复制局部按钮样式，而不是走统一组件抽象。
- **建议**: 将两个折叠开关改为 `Button`，例如 `variant="ghost"` / `size="xs"` 并保留 `aria-expanded`、`aria-label` 与现有 `ndbg-json-toggle` 类名中确有必要的调试器局部样式。
- **为什么值得现在做**: 这是小范围、低风险替换；`nop-debugger` 已经可从 `@nop-chaos/ui` 引入组件，统一后可以减少调试器局部按钮样式和共享 UI 体系之间的漂移。
- **误报排除**: 这不是 `packages/ui` 内部实现，也不是 `input[type=file]` / `input[type=color]` 等浏览器原生能力控件；也不是 spreadsheet/grid 这类高性能宿主表面。原生 button 本身可访问性尚可，所以降为 P3，但仍违反“已有等价 UI 组件时优先使用 `@nop-chaos/ui`”的组件使用约定。
- **历史模式对应**: 命中 `deep-audit-calibration-patterns.md` 的 “Raw HTML As Automatic UI Contract Violation” 高误报模式；本条保留的原因是存在等价 `Button`、替换成本低、且当前包已使用共享 UI 组件，局部原生按钮会造成真实一致性维护成本。
- **参考文档**: `AGENTS.md` “MANDATORY: UI Component Usage”；`docs/skills/deep-audit-prompts.md` 维度 11；`docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度11-02] code-editor toolbar 自建 span role=button 复制了 Button 抽象

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\toolbar-button.tsx:28-52`
- **行号范围**: 28-52
- **证据片段**:
  ```tsx
  <span
    role="button"
    tabIndex={0}
    className={cn(
      'cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-accent',
      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
      'transition-colors',
      sizeClasses[size] ?? sizeClasses['icon-xs'],
      className,
    )}
  ```
- **严重程度**: P3（可观察）
- **原生元素**: `<span role="button">`
- **应替换为**: `Button` from `@nop-chaos/ui`
- **所在层**: 渲染器 / `flux-code-editor`
- **替换可行性**: 中
- **现状**: code-editor 自定义 `ToolbarButton` 用 `span role="button"`、`tabIndex`、键盘处理和一组本地尺寸 / focus / hover 类来模拟按钮；`@nop-chaos/ui` 已提供 `Button`，并且共享 Button 已支持 `xs`、`icon-xs` 等该 toolbar 需要的尺寸。
- **风险**: 该组件在渲染器包内复制了按钮语义、键盘激活和视觉状态，后续 Button 体系的焦点环、disabled、pressed、data-slot 或主题修正不会自动覆盖 code-editor toolbar；同时 `ButtonHTMLAttributes<HTMLSpanElement>` 也容易误导后续调用者以为它具备完整 button 属性语义。
- **建议**: 评估将 `ToolbarButton` 改为包装 `@nop-chaos/ui` 的 `Button`，保留 `variant="ghost"`、`size="xs" | "icon-xs"`、`data-slot` 和现有 compact toolbar className。若 `PopoverTrigger nativeButton={false}` 组合需要非 button host，应在该处局部说明并只为 trigger 保留非原生宿主，而不是让所有 toolbar action 共享 span-button。
- **为什么值得现在做**: code-editor 是已落地的字段级渲染器，toolbar 按钮会被 SQL 格式化、变量面板、执行、全屏和 snippet 入口复用；现在收敛可以避免继续扩散一套平行 Button primitive。
- **误报排除**: 本条不报告“缺少键盘支持”：当前代码已有 `tabIndex` 与 Enter/Space 处理，因此不同于历史上已驳回的 CodeEditor toolbar “无键盘”误报。它也不是 `wrapped-field-action.tsx` 的非 labelable secondary action，未触发 reopened decision 1 的保留边界；报告点仅限于在已有等价 `Button` 抽象时继续维护平行 span-button。
- **历史模式对应**: 命中 `deep-audit-calibration-patterns.md` 的 “Raw HTML As Automatic UI Contract Violation” 需更强举证模式；本条保留为 P3，因为存在等价共享 Button、当前实现复制共享按钮能力，并且位于 renderer 包的复用 toolbar 组件中。
- **参考文档**: `AGENTS.md` “MANDATORY: UI Component Usage”；`docs/skills/deep-audit-prompts.md` 维度 11；`docs/references/deep-audit-calibration-patterns.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的问题。深挖结束。

## 维度复核结论

- [维度11-01] 保留：live code 仍在 `JsonViewer` 两处使用原生 `<button>`；`@nop-chaos/ui` 已提供 `Button`，且 `nop-debugger` 已依赖并使用共享 UI 组件。按校准规则不升高严重度，保留为 P3。
- [维度11-02] 保留：`ToolbarButton` 仍以 `<span role="button">` 复制按钮语义、键盘处理和样式；多数调用并非必须使用非 button host，且 `Button` 已支持所需尺寸。保留为 P3，`PopoverTrigger nativeButton={false}` 场景可作为迁移时的局部例外处理。
- 需子项复核：无。

## 子项复核结论

- [维度11-01] 保留：维度复核已回到 live code 确认，低风险 P3 原生按钮替换项无需额外子项复核。
- [维度11-02] 保留：维度复核已区分 `wrapped-field-action` 历史例外，低风险 P3 平行 span-button 实现无需额外子项复核。

最终进入汇总：11-01、11-02。
