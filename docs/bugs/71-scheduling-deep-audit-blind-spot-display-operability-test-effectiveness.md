# 71 Scheduling Deep-Audit Blind Spot: Display / Operability / Test-Effectiveness

## Problem

- `@nop-chaos/flux-renderers-scheduling`（Gantt / Kanban / Calendar / BarcodeInput）在 playground 中基本不可用：时间线空白、看板拖拽无反应、日历视图切换失效、扫码器永久黑屏。
- 但该包**已通过 600+ 单元测试全绿**，且已经过多轮 `docs/skills/deep-audit-prompts.md` 多维度审计（维度 05 响应式、06 异步、19 错误传播、20 可访问性），这些审计报告了 30 条发现却**完全没有覆盖**上述 P0 缺陷。
- 详细分析与多轮独立复核见 `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md`（共 12 个 P0）。

## Diagnostic Method

- 诊断难点：缺陷全部藏在"集成接线边界"（gantt.tsx / kanban-board.tsx / calendar.tsx / barcode-overlay），而 store/纯函数层质量尚可且单测充分，形成"底层绿、顶层坏"的假象。
- 调查路径：
  1. 先读 4 份 design.md 建立契约基线，再读 playground demo 与 example.json 看实际用法。
  2. 对照 `~/sources/complex-controls/`（SVAR/DHTMLX Gantt、react-kanban-kit、Schedule-X、react-zxing）开源实现，定位"定位算法/接线"差异。
  3. 逐个 P0 直接读源码二次确认（file:line），再用 3 轮、7 个独立审查子 agent + 1 轮作者共识并入反复审查直到共识。
- 排除的假设：最初怀疑是单个组件实现质量问题；复核后发现是**审计方法论盲区**——现有维度只查"代码质量结构"，不查"渲染结果是否正确/可操作/测试是否有效"。
- 决定性证据：
  - Gantt `gantt.tsx:33-37` 创建 store 时未透传 `zoomLevels` → 时间刻度/网格/缩放全空；而 zoom 的 store 级测试用 `new GanttStore({zoomLevels})` 直接构造，**绕过了 gantt.tsx**，故全绿。
  - Calendar `calendar-layout-utils.test.ts:74-89` 标题写 "should place single event at full width"，断言却是 `expect(width).toBe(25)`——**测试把缺陷值固化为"正确预期"**。
  - `gantt.test.tsx:6-77` mock 掉 GanttLayout 包装器（传递性抑制 GanttGrid/GanttBars 等子组件）+ store context + 4 个交互 hook，仅断言"壳渲染"。

## Root Cause

- **审计维度盲区**：`deep-audit-prompts.md` 维度 01-20 覆盖架构边界、运行时状态、渲染器契约、样式、类型、测试数量、安全性能、文档一致性、错误传播、a11y——但**没有**任何维度检查：①显示/定位算法正确性（坐标、行高对齐、日期边界）；②集成接线与可操作性（schema→store 转发、内部 state 是否驱动渲染、controlled/uncontrolled、事件是否派发）；③测试有效性（断言的是正确值还是缺陷值、是否 mock 掉被测边界）。
- **"假绿"测试模式未被识别为风险**：把缺陷值断言为正确（asserts the bug）、mock 掉集成边界只验壳、死代码带测试——这三类比"没测试"更危险，因为它们主动阻碍修复，但既有维度 14（测试覆盖与质量）只看覆盖率与数量，不看"断言是否正确"。
- **复杂交互组件的"集成接线边界"是缺陷集中地，却无专项审查**：顶层组件把 schema 转 store、把 store 转 DOM、把交互转事件——任一环节漏接即整体失效，而该边界恰好是单测最易 mock 绕过处。

## Fix

- **新增深度审计维度 21/22/23**（`docs/skills/deep-audit-prompts.md` 新增 G 组"复杂交互组件的功能正确性"）：
  - 维度 21 显示与定位正确性：核对坐标/行高对齐/日期边界/渲染数量，对照开源参考与 design.md。
  - 维度 22 集成接线与可操作性：schema→store→DOM→事件 全链路通断、controlled/uncontrolled、内部 state 是否驱动渲染、句柄/region/event 是否接线。
  - 维度 23 测试有效性与假绿：断言的是正确值还是缺陷值、是否 mock 掉被测边界、死代码是否带测试。
- **新增专项 skill** `docs/skills/complex-component-display-operability-audit-prompt.md`：面向 gantt/kanban/calendar/scheduler/designer 等复杂交互渲染器的事后功能正确性验证（与事前的 `flux-component-design-review-prompt.md` 互补）。
- **更新 `docs/skills/README.md`** 索引引用上述新维度与 skill。

## Tests

- 本次为方法论修正，无代码修复，故无新增单测文件。验证方式（偏离 bug-fix-note 模板的"测试文件"约定，因属方法论修复）：
  - 用新维度 21/22/23 重新审计 scheduling 包，应能复现 `docs/analysis/2026-07-22-...` 中的 12 个 P0（即新维度的"回归测试"是能检出已知缺陷）。
  - 新维度 prompt 内置 scheduling 案例作为 calibration 证据（"曾因缺此维度漏掉 12 个 P0"）。
  - 待 scheduling 的 12 个 P0 修复后，应补"渲染真实组件 + 断言具体 DOM 输出"的集成冒烟测试（见 Notes）。

## Affected Files

- `docs/skills/deep-audit-prompts.md`（新增维度 21/22/23 + G 组；总览表 20→23；为 dim19/20 补 F 组头）
- `docs/skills/complex-component-display-operability-audit-prompt.md`（新增）
- `docs/skills/README.md`（索引更新）
- `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md`（分析报告，证据来源）

## Notes For Future Refactors

- **复杂交互渲染器必须跑维度 21/22/23**：新增 gantt/kanban/calendar/scheduler/任意 designer 时，不能只跑维度 09（查"是否按 RendererComponentProps 模式写"），必须跑 21/22/23（查"写出来的东西是否真的渲染正确、可操作、测试有效"）。**写单测时禁止把当前实现值直接拷进 `expect()`**——必须先独立推算正确预期值；**集成边界测试不得 mock 掉被测对象本身**，至少保留一个"渲染真实组件 + 断言具体 DOM 输出（style.width/列数/视图切换后子组件出现）"的冒烟测试。
- **store 与顶层组件的"接线"是高风险面**：凡 store 接受 config 字段，必须核对顶层组件是否真的透传了该字段（本次 zoomLevels、ownership 字段、regions 全部漏传）；store mutation bump 的 revision 必须有生产组件订阅（本次 toggleOpen bump treeRevision 却零订阅）。
- **state ownership 三态（local/controlled/scope）必须在顶层组件落地**：不能"提供数据即视为受控"（kanban）或"内部 state 不驱动渲染"（calendar）；渲染分支必须读"hook 返回值"而非"schema resolved 值"。
