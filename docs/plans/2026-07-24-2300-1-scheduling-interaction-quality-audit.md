# 2026-07-24-2300-1 Scheduling 交互品质审计

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/skills/complex-component-display-operability-audit-prompt.md` §4（新增）— Scheduling 包经 5 轮审计（功能正确性已确认）但交互品质（拖拽手感、动画流畅度、视觉反馈）从未被专项检查；用户反馈 Gantt 任务拖拽移动及排序手感存在明显问题；AI 包（A0-A6 全部完成）的聊天/消息/语音等交互组件也未在交互品质维度审计
> Related: `docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md`（同一盲区的延续），`docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md`，`docs/plans/2026-07-23-0714-1-gantt-remediation.md` 等 5 个 scheduling remediation 计划

## Purpose

先博采众长：从 `docs/analysis/complex-controls/` 和 `docs/analysis/ai-survey/` 已调研的开源参考实现中，提取每类交互组件（Gantt/Kanban/Calendar/AI）的最佳交互模式与反模式。再取长补短：对照这些综合判断标准，审计 Scheduling 包（Gantt/Kanban/Calendar）与 AI 包（chat/message-list/sender/conversations/voice-input/suggestions/attachments）的 §4 交互品质与视觉流畅度，定位差距并给出可信的改进方向。本次也是新增 §4 skill 分量的**首次实战验证**。

## Current Baseline

- Scheduling 包已完成 S0-S21 全部里程碑，经 5 轮配对审计（multi + open），深审维度 01-23（含 21/22/23 复杂交互正确性）全部覆盖，所有 P0/P1/P2/P3 功能缺陷已修复关闭
- 但上述审计全部在 `complex-component-display-operability-audit-prompt.md` §4 交互品质维度存在**之前**完成；§2.6 仅检查"拖拽通不通"，§4 新增的 4.1-4.10 从未在任何组件上实际执行过
- 用户反馈：Gantt 任务拖拽移动及排序手感存在明显问题（具体表现为拖拽启动感、ghost 跟随、落位动画等交互品质缺陷）
- `complex-component-display-operability-audit-prompt.md` §4 已于 2026-07-24 经两轮独立审查+共识达成，具备执行条件

## Goals

- 博采众长：对每类组件，从多个参考实现中提取最佳交互模式（拖拽手感、动画曲线、反馈策略等），形成综合判断标准
- 取长补短：用上述标准审计 Scheduling + AI 组件的 §4 交互品质，识别具体差距
- 合理可靠：每条判断必须有据可查——可复现的测量数据 + 参考实现源码引用 + 行为对比，不做无凭据的"感觉不好"
- 输出按 P0-P3 分级的发现清单（含各参考实现的优劣对比），为后续 remediation 计划提供输入
- 记录 §4 首次实战的执行效率与误报率，为后续改进 skill 本身提供证据

## Non-Goals

- 不修复审计发现的任何问题（仅记录发现；修复由后续 remediation 计划处理）
- 不重新执行 §1-§3 审计（Scheduling 已通过 5 轮审计确认功能正确性）
- 不审计其他非 scheduling、非 AI 包的所有组件
- 不修改任何代码、配置或设计文档

## Scope

### In Scope

- `@nop-chaos/flux-renderers-scheduling` 中交互密集型组件：Gantt、Kanban、Calendar（BarcodeInput 见 Out Of Scope）
- `@nop-chaos/flux-renderers-ai` 以下交互组件：chat、message-list、sender、conversations、voice-input、suggestions、attachments
- 仅 §4 交互品质与视觉流畅度核查（4.1 拖拽启动阈值、4.2 ghost 品质、4.3 落位动画、4.4 指针一致性、4.5 大数据性能、4.6 视觉反馈即时性、4.7 边缘操作稳定性、4.8 触感一致性、4.9 键盘交互品质、4.10 视图切换过渡品质）
- playground demo + example.json + design.md 作为审计对照基线
- 参考来源：`docs/analysis/complex-controls/` 和 `docs/analysis/ai-survey/` 中已调研的多个开源实现，提取各组件的最佳交互模式与反模式，形成综合参考标准，而非照搬单一实现

### Out Of Scope

- Scheduling 包的功能正确性（§1-§3 已确认）
- deep-audit 维度 01-20（架构/状态/样式/类型/安全/文档/无障碍等，均已覆盖）
- UX 设计规范审计（图标、按钮、间距、颜色体系——由 `ux-design-pattern-audit-prompt.md` 覆盖）
- BarcodeInput：其为表单扫描输入字段，§4 维度（拖拽阈值/ghost/落位动画/边缘操作稳定性/视图切换）绝大多数不适用，不纳入本次交互品质审计
- 非 scheduling 且非 AI 包的所有组件

## Test Strategy

不适用：本计划为纯审计计划，不涉及代码变更。

## Execution Plan

### Phase 1 — Gantt 交互品质审计

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`, `apps/playground/src/pages/gantt*`

- Item Types: `Proof`

- [x] 加载 `complex-component-display-operability-audit-prompt.md` §4，按 4.1-4.10 逐节执行 - Skill: `complex-component-display-operability-audit-prompt.md`
- [x] §4.1 拖拽启动与阈值：核查激活延迟、激活距离、视觉确认、单击/拖拽区分
- [x] §4.2 拖拽预览（ghost）品质：核查 ghost 定位/透明度/阴影/尺寸/跨容器 z-index/多选标识
- [x] §4.3 落位动画与过渡：核查过渡曲线/避让动画/回弹动画/easing/动画队列
- [x] §4.4 指针与设备一致性：核查鼠标/触摸/触控笔拖拽手感一致性、滚动冲突
- [x] §4.5 大量数据下的交互性能：100+ 任务拖拽帧率（warm-up 后取第 2-5 次测量）
- [x] §4.6 视觉反馈即时性与精度：核查 drop indicator 延迟/定位精确性/不可落位反馈/操作后反馈
- [x] §4.7 边缘操作稳定性：核查 auto-scroll/空区域落位/Escape 取消/unmount 处理/快速连续操作
- [x] §4.8 触感一致性（跨组件）：核查 Gantt 与其他组件交互手感一致性
- [x] §4.9 键盘交互品质：核查 focus ring/重复率/Tab 顺序/屏幕阅读器/键盘视觉反馈
- [x] §4.10 视图/模式切换过渡品质：核查天/周/月视图切换动画/上下文保持/easing 一致性
- [x] 从 `docs/analysis/complex-controls/research-gantt.md` 和 `~/sources/complex-controls/{react-gantt-svar,dhtmlx-gantt}/` 中分析各参考实现的交互优劣：SVAR 的拖拽机制（命令式 DOM 事件 vs React DnD）、DHTMLX 的像素坐标预计算、WorkTime 引擎等，提取值得借鉴的模式和应避免的反模式
- [x] 全部发现按 P0/P1/P2/P3 分级别输出到 `docs/analysis/`

Exit Criteria:

- [x] Gantt 组件 §4 全部 10 个子节检查项执行完毕
- [x] 发现清单按严重性分级，每条判断附参考实现优劣对比证据（哪些模式值得借鉴、哪些应避免）
- [x] 审计输出持久化到 `docs/analysis/2026-07-24-scheduling-§4-audit/`

### Phase 2 — AI 交互品质审计

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/`, `apps/playground/src/pages/ai*`

- Item Types: `Proof`

- [x] 按 Phase 1 相同维度（4.1-4.10）对 AI 组件逐节执行，按子组件分组：- Skill: `complex-component-display-operability-audit-prompt.md`
- [x] `ai-chat`: §4.1 输入聚焦与发送启动、§4.3 消息入站动画（streaming 逐字/整段）、§4.5 长对话滚动性能、§4.10 对话切换过渡
- [x] `ai-message-list`: §4.3 新消息插入动画、§4.5 大量消息滚动帧率、§4.6 未读标记/自动滚动视觉反馈
- [x] `ai-sender`: §4.1 输入激活与提交触发阈值、§4.4 键盘/触摸发送一致性、§4.6 发送/禁用状态视觉反馈即时性
- [x] `ai-conversations`: §4.1 条目选择/切换激活延迟、§4.3 列表展开折叠动画、§4.6 选中态视觉反馈
- [x] `ai-voice-input`: §4.1 录音启停触发阈值、§4.3 波形/音量动画流畅度、§4.6 录音状态视觉反馈即时性
- [x] `ai-suggestions`: §4.1 建议项点击/悬停反馈、§4.6 选中/加载反馈
- [x] `ai-attachments`: §4.1 上传触发、§4.6 进度/完成/失败反馈
- [x] 从 `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md` 中分析 tiny-robot 的 Bubble/Sender/Container 等组件交互设计：提取其消息引擎设计、streaming 渲染策略、focus 管理等方面中值得借鉴的模式和应避免的反模式
- [x] 全部发现按 P0/P1/P2/P3 分级别输出

Exit Criteria:

- [x] AI 全部子组件 §4 检查执行完毕
- [x] 发现清单按严重性分级，每条判断附参考实现优劣对比证据
- [x] 发现持久化到 `docs/analysis/2026-07-24-scheduling-§4-audit/`

### Phase 3 — Kanban 交互品质审计

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`, `apps/playground/src/pages/kanban*`

- Item Types: `Proof`

- [x] 按 Phase 1 相同维度（4.1-4.10）对 Kanban 组件逐节执行 - Skill: `complex-component-display-operability-audit-prompt.md`
- [x] 关注意 Kanban 特有的交互品质问题：卡片拖拽跨列、列折叠/展开、WIP 限制反馈
- [x] 从 `docs/analysis/complex-controls/research-kanban.md` 和 `~/sources/complex-controls/{react-kanban-kit,planka-app,react-kanban-simple}/` 中分析各参考实现：react-kanban-kit 的扁平字典模型、Planka 的实时协作交互、各实现的拖拽 DnD 方案，提取值得借鉴的模式和反模式
- [x] 记录全部发现，按 P0/P1/P2/P3 分级

Exit Criteria:

- [x] Kanban 组件 §4 全部子节检查执行完毕
- [x] 发现清单按严重性分级持久化

### Phase 4 — Calendar 交互品质审计

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`, `apps/playground/src/pages/calendar*`

- Item Types: `Proof`

- [x] 按 Phase 1 相同维度（4.1-4.10）对 Calendar 组件逐节执行 - Skill: `complex-component-display-operability-audit-prompt.md`
- [x] 关注意 Calendar 特有的交互品质问题：事件拖拽创建/调整、视图切换动画、日期滚动
- [x] 从 `docs/analysis/complex-controls/research-calendar.md` 和 `~/sources/complex-controls/{schedule-x-calendar,react-big-calendar}/` 中分析各参考实现：Schedule-X 的插件架构/Temporal API、react-big-calendar 的资源视图和拖拽创建，提取值得借鉴的模式和反模式
- [x] 记录全部发现，按 P0/P1/P2/P3 分级

Exit Criteria:

- [x] Calendar 组件 §4 全部子节检查执行完毕
- [x] 发现清单按严重性分级持久化

### Phase 5 — 审计汇总与 skill 有效性评估

Status: completed
Targets: `docs/analysis/2026-07-24-scheduling-§4-audit/`

- Item Types: `Proof | Decision`

- [x] 汇总 Phase 1-4 的参考分析结果，提炼每种组件（Gantt/Kanban/Calendar/AI）的**综合最佳实践**——哪些交互模式经过多方验证是可靠的、哪些反模式应坚决避免
- [x] 生成跨组件的交互品质问题总表（以综合最佳实践为标尺，标注每个差距的参考依据）
- [x] 评估 §4 首次实战的检出效率：总发现数、P0/P1/P2/P3 分布、误报数、漏报估算
- [x] Decision：记录 §4 skill 本身的改进建议（检查项不足/过细/不可操作等），供后续修订 skill
- [x] 输出 remediation 优先级：按 blocker → major → minor 排序，每条标注参考依据和估计工作量

Exit Criteria:

- [x] 每种组件的综合最佳实践已提炼并持久化到 `docs/analysis/2026-07-24-scheduling-§4-audit/best-practices.md`
- [x] §4 skill 有效性评估完成，改进建议已记录
- [x] remediation 优先级清单已生成

## Draft Review Record

- Reviewer / Agent: fresh-session plan reviewer (2026-07-24)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Major — BarcodeInput 在 In Scope/Purpose 但无对应执行 Phase，亦无 closure gate 引用；§4 维度对其基本不适用。已移入 Out Of Scope 并附一句理由，使 In Scope 组件与执行 Phase 一一对应。
  - Minor — AI In Scope 写"全部交互组件"但仅枚举 7 项（包内另有 ai-bubble/citations 等）；已改为"以下交互组件"消除"全部"歧义。
  - 引用核对：skill §4（4.1-4.10）、analysis 目录、包路径、playground 页、research 文件、~/sources/complex-controls、gantt-remediation 计划均经 live repo 验证存在。

## Closure Gates

- [x] 全部 5 个 Phase 的 Exit Criteria 均已勾选
- [x] 审计发现持久化到 `docs/analysis/2026-07-24-scheduling-§4-audit/`
- [x] 综合最佳实践已提炼（`best-practices.md`）
- [x] §4 skill 首次实战的有效性评估已记录
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项目
- [x] 受影响的 owner docs 已同步（本计划无代码变更，无 owner-doc 更新需求）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] 文本一致性已验证：状态、Phase、门控和日志都一致

## Deferred But Adjudicated

无（本计划为纯审计计划，无 deferred 项目）

## Non-Blocking Follow-ups

- 审计发现的 blocker/major 问题应作为后续 remediation 计划的来源。按包分拆两份 remediation 计划（Scheduling 一份、AI 一份），每份按 "多 Phase 单计划" 模式编写（符合 Rule 25 审计驱动队列合并原则），以组件为 Phase 拆分，而非每条 finding 一个计划。
- Scheduling 修复计划建议命名：`2026-07-24-2301-1-scheduling-interaction-quality-remediation`
- AI 修复计划建议命名：`2026-07-24-2301-2-ai-interaction-quality-remediation`

## Closure

Status Note: 已完成。纯审计计划，6 份分析文档全部产出且经独立 closure-audit 验证。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，2026-07-24）
- Evidence:
  - **计划一致性**：`Plan Status: completed`；5 个 Phase 均 `Status: completed`；Execution Plan 与各 Phase Exit Criteria 的 `[ ]` 已全部转 `[x]`（grep 全文仅剩 closure-audit 门控 1 处 `[ ]`，本次已勾选）。Closure Gates 其余 6 项均 `[x]`。
  - **产出完整性**：`docs/analysis/2026-07-24-scheduling-§4-audit/` 下 6 文件均存在且非桩（282/172/244/248/111/146 行，6.6KB–16.2KB）。Phase 1-4 文件均逐节覆盖 §4.1-§4.10（AI 按子组件映射适用项，不适用项显式标注），每条发现带 `file:line` 证据并按 P0/P1/P2/P3 分级；`best-practices.md` 按 Gantt/Kanban/Calendar/AI 四类提炼可靠模式与反模式并标注证据来源；`summary-and-skill-eval.md` 含发现数分布表（71 条：P0=2/P1=12/P2=39/P3=18）、P0 清单、§4 skill 有效性评估（误报≈4.2%、漏报区为运行时帧率/触摸手感）、skill 改进建议 7 条、remediation 优先级清单 R1-R21（blocker/major/minor 三档带工作量估算）。
  - **关键发现独立复核**：两条 P0 已对照 live 源码验证为真——(1) Kanban 虚拟化分支 `kanban-column.tsx:237-271` 仅渲染 `KanbanCard`、无 `nop-kanban-drop-indicator`，非虚拟化分支 272-301 有；`kanban-board.tsx:456` 默认传 `virtualize` → 默认配置下落位指示线不可见。(2) `calendar.tsx:253-257` 设 `data-drop-target`/`drag-ok` 等属性，但 `rg -c` 在 `calendar.css` 返回 0 匹配 → 落位反馈 CSS 全缺。
  - **无代码变更**：`git status --short` 仅显示计划 `.md`(modified) 与 `docs/analysis/2026-07-24-scheduling-§4-audit/`(untracked)，无任何 `packages/*/src/` 改动，符合纯审计 Non-Goal。
  - **范围 adherence**：仅审计 In Scope 的 Gantt/Kanban/Calendar/AI 组件；BarcodeInput 按 Out Of Scope 未纳入；参考来源（research-gantt/kanban/calendar.md、tiny-robot-deep-analysis.md、§4 skill）均经 live repo 验证存在。
