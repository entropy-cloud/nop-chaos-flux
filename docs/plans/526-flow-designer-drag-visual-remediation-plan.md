# 526 Flow Designer 拖拽与状态视觉修正计划

> Plan Status: active
> Last Reviewed: 2026-10-05
> Source: docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md（§3.1 业界画布标准 / §4.1 flow-designer 差距矩阵）
> Related: docs/plans/527-page-designer-drag-visual-remediation-plan.md, docs/plans/528-report-designer-shell-remediation-plan.md, docs/plans/529-ai-renderers-chat-ux-remediation-plan.md

## Purpose

把 flow-designer 与业界画布设计器（AutoGPT/Flowise/n8n/Archon，见分析报告 §3.1）之间已确认的 UI/UX 差距收口：节点选中态视觉、连接合法性反馈、palette 检索、方向键微调、多选拖拽吸附、右键菜单。对齐用户可感知的"美观性 + 鼠标/键盘操作便捷性"。

## Current Baseline

- flow-designer 已具备仓库内最佳基础设施：xyflow v12、drop ghost（`designer-xyflow-canvas.tsx` `data-testid="designer-drop-preview"`）、九轴对齐吸附 6px 阈值（`use-alignment-guides.ts` ALIGNMENT_THRESHOLD=6）、minimap+导航、暗色令牌全套（`designer-theme.css` `[data-mode='dark']` 块）、WorkbenchShell 可调宽、undo/redo/copy/paste/duplicate/delete/save 快捷键（`use-designer-shortcuts.ts`）、框选 Partial、hover 浮出 NodeToolbar（180ms）、边 hover 快捷操作浮卡（选中或 `__fdHovered` 时显示 pencil/trash-2，`designer-xyflow-edge.tsx:74,141-185`）+ BaseEdge 默认 interactionWidth 命中层。
- **边 hover 删除裁决（评审核实）**：分析报告 §4.1 "边 hover 删除（命中层/删除钮形态待核对补强）"行经评审核实为 **no-gap**——hover 浮卡删除钮与命中层均已存在（上条），无需修正项。
- **已确认差距（评审修订后）**：
  1. **节点选中态无 box-shadow 视觉**：xyflow 内建 `--xy-node-boxshadow-selected` 仅被内建节点类型选择器（`.react-flow__node-input/-default/-output/-group.selectable.selected`，xyflow dist/style.css:469-481）消费；designer 自定义节点类型为 `designerNode`（`designer-xyflow-canvas.tsx:155-160`，wrapper class `react-flow__node-designerNode`）不匹配任何消费选择器，通用 `.react-flow__node` 规则无 box-shadow。当前选中视觉仅有 `designer-xyflow-node.tsx:157-159` 的 borderColorSelected 内联边框色 + NodeToolbar 浮出，无 ring/shadow 层次（对比业界公式 ring-2+shadow-lg）。
  2. **连接合法性无视觉反馈**：拖线连接期 xyflow v12.10.2 handle 仅有 `connectingfrom`/`connectionindicator` 类（dist/style.css:255-261），无 valid/invalid 区分类；仓库无任何红/绿反馈实现。
  3. palette 无搜索过滤（`designer-palette.tsx` 无 Input import）；分组折叠箭头用文本 ▼/▶（`designer-palette.tsx:112-114`）。
  4. 方向键无 nudge（`use-designer-shortcuts.ts` 无方向键分支）。
  5. 多选拖拽显式禁用对齐吸附（`use-alignment-guides.ts:135-143` 注释"超出本计划面"）。
  6. 全包无节点/画布右键菜单（grep onContextMenu 0 命中）。
  7. 节点卡状态点用文本 "●" 字符（`designer-node-card.tsx:109`；自 plan 527 评审移交本 plan）。
- 命令面已支持：`moveNode {nodeId, position}`、`duplicateNode`、`deleteSelection`、`setSelection`（`designer-command-types.ts:48/34/46/65`）。注意：core 有批量 `moveNodes`（`flow-designer-core/src/core-node-commands.ts:171-184`）但未暴露到 DesignerCommand，多节点操作按节点逐条入栈（与既有逐节点拖拽提交行为一致）。
- `@nop-chaos/ui` 已导出 Input/DropdownMenu/ContextMenu（`packages/ui/src/index.ts:18,23,27`）；lucide chevron-\* 经 `resolveLucideIcon` 可用（palette 已在用 'chevron-left'）。
- e2e 基线：flow-designer-ui/selection/alignment/minimap-pan/dark/edge-creation 等 spec 存在（tests/e2e/ 实测清单）；master 最近一次 full e2e 1671/0（docs/logs/2026/10-05.md:28）。

## Goals

- graph 模式节点选中态获得业界公式视觉（2px ring + shadow），亮暗双模式一致，e2e 以 computed box-shadow 从 none→ring 断言。
- 拖线连接时目标 handle 呈现合法（绿）/非法（红+not-allowed 光标）即时反馈（自维护状态类，不依赖 xyflow 无效的 valid/invalid 类名）。
- palette 支持按 label/description 子串过滤（含空结果态），分组箭头 lucide 化。
- 方向键 nudge：选中节点按 1px（Shift=gridSize 步长）移动，走既有 `moveNode` 命令；单节点 nudge 一步 undo 可回退。
- 多选拖拽启用对齐吸附（以活动节点为参考系）。
- 节点右键菜单（选择/复制副本/删除）与画布空白右键菜单（全选/粘贴/适应画布），viewport 防溢出钳制。
- 节点卡状态点 lucide 化（去 "●" 文本）。

## Non-Goals

- 防重叠自动推挤（R-tree collision resolution）——见 Deferred。
- 双击空白 QuickAdd、边上执行态流光（执行语义未接入画布）。
- 树模式（dingflow/tree-mode）交互改造。
- palette 模糊评分算法（先落子串过滤）。
- 节点 resize handle。
- 键盘 a11y 连接流（pendingConnectionSourceId）的红绿反馈（仅覆盖鼠标拖线路径）。
- 批量 moveNodes 命令暴露（多选 nudge 逐步回退与既有逐节点拖拽一致，见 Deferred）。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-theme.css`（选中态显式规则与连接反馈样式，light+dark）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`（连接反馈状态类、右键菜单挂载）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-alignment-guides.ts`（多选吸附）
- `packages/flow-designer-renderers/src/designer-palette.tsx`（搜索、lucide 箭头）
- `packages/flow-designer-renderers/src/use-designer-shortcuts.ts`（方向键 nudge）
- `packages/flow-designer-renderers/src/designer-node-card.tsx`（状态点图标化）
- 新增节点/画布右键菜单组件（`@nop-chaos/ui` DropdownMenu/ContextMenu 既有形态）
- i18n 键（`flux.flowDesigner.*` 前缀）
- 对应单元测试 + e2e（tests/e2e/ 下 flow-designer-\* spec 扩展）

### Out Of Scope

- `flow-designer-core` 状态机/命令面变更（仅消费既有命令；批量命令暴露见 Deferred）
- dingflow 树模式视觉
- `docs/architecture/flow-designer/design.md` 交互章节外的文档重构（仅同步交互新增节）

## Failure Paths

| 编号                 | 触发                                                   | 行为                                    | 可重试 | 用户可见表现           |
| -------------------- | ------------------------------------------------------ | --------------------------------------- | ------ | ---------------------- |
| cmd-unavailable      | 右键菜单命令在当前模式不可用（如 tree 模式 duplicate） | 走既有 dispatch 失败 toast 通道         | 是     | toast 提示，无 UI 破坏 |
| nudge-no-active      | 方向键按下但无选中节点                                 | 忽略（不 preventDefault，保留画布滚动） | 是     | 无                     |
| palette-filter-empty | palette 搜索无匹配                                     | 显示"无匹配节点"空态 + 清除按钮         | 是     | 空态文案               |

## Test Strategy

档位选择：`建议有测`（UI/UX 增强，非核心回归路径）。
nudge/多选吸附/palette 过滤有纯逻辑单元测试；选中态视觉与连接反馈用 e2e 程序化断言（getComputedStyle/data-testid/data-\* 状态类），不落截图断言。

## Execution Plan

### Phase 1 - 选中态与连接反馈视觉

Status: planned
Targets: `designer-theme.css`, `designer-xyflow-canvas/designer-xyflow-node.tsx`, `designer-xyflow-canvas/designer-xyflow-canvas.tsx`, `designer-node-card.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix: 选中态显式规则（评审 B1 修订）：xyflow 变量 `--xy-node-boxshadow-selected` 仅内建节点类型消费，故在 `designer-theme.css` 新增 `.nop-designer .react-flow__node-designerNode.selected { box-shadow: 0 0 0 2px <ring>, <shadow>; }` 显式规则（ring/shadow 走 `--fd-node-selected-*` 令牌，light+dark 双块），并加 `transition: box-shadow 120ms ease`；hover 态 border/阴影轻微提亮；`--xy-node-boxshadow-selected` 变量覆盖保留为兜底不做依赖
- [ ] Fix: 连接合法性反馈（评审 m1 修订，确定实现路径）：xyflow v12 连接期无 valid/invalid 类，故在 canvas 以 `onConnectStart/onConnectEnd` + `isValidConnection` 维护连接会话状态，目标 handle 渲染 `data-connection-valid="true|false"` 状态类——合法 `cursor: crosshair` + 绿色描边/填充，非法 `cursor: not-allowed` + 红色（Flowise 模式）；连接结束清理状态
- [ ] Fix: `designer-node-card.tsx:109` 状态点 "●" 文本替换为带样式圆点元素（span + 令牌底色）或 lucide Circle 图标
- [ ] Proof: e2e 断言——选中节点 computed `box-shadow` 由 none 变为含 2px ring（评审 B1：当前实况为 none，非 0.5px）；拖线时合法/非法目标 handle 的 `data-connection-valid` 与 cursor 可观测

Exit Criteria:

- [ ] `designer-theme.css` 中 `.react-flow__node-designerNode.selected` 显式 box-shadow 规则落地且 light/dark 两块齐备
- [ ] e2e 新增断言通过：选中节点 box-shadow none→2px ring；连接反馈状态类在拖线时可观测（合法绿/非法红）
- [ ] 既有 flow-designer-dark/ui spec 不回归；节点卡无 "●" 文本残留（grep）

### Phase 2 - palette 搜索与图标

Status: planned
Targets: `designer-palette.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix: palette 头部下方新增搜索 Input（`@nop-chaos/ui` Input），按 label/description 子串过滤（大小写不敏感）；过滤时自动展开命中分组；无匹配显示空态文案 + 一键清除
- [ ] Fix: 分组折叠箭头由文本 ▼/▶ 替换为 lucide ChevronDown/ChevronRight（DesignerIcon 已支持 chevron-\*，无需改 designer-icon.tsx）
- [ ] Proof: 纯函数过滤逻辑单元测试（命中/不命中/空查询/仅 description 命中）；e2e 断言搜索后可见条目数与空态

Exit Criteria:

- [ ] palette 搜索过滤 + 空态 + lucide 箭头落地，`designer-palette.tsx` 无文本箭头残留
- [ ] 过滤纯函数有 focused 单测且通过
- [ ] 既有 flow e2e 中 palette 相关断言不回归（含 dingtalk palette 断言）

### Phase 3 - 键盘 nudge 与多选吸附

Status: planned
Targets: `use-designer-shortcuts.ts`, `designer-xyflow-canvas/use-alignment-guides.ts`

- Item Types: `Fix | Proof`

- [ ] Fix: `use-designer-shortcuts.ts` 增加方向键处理——对 active 节点及 selectedNodeIds 逐个 dispatch `moveNode`（1px；Shift 按 gridSize）；无选中时不拦截；输入态豁免沿用 isEditableTarget；tree 模式跳过。单节点 nudge 一步 undo 可回退；多选 nudge 按节点逐步回退（与既有逐节点拖拽提交行为一致，见 Deferred 批量命令裁决）
- [ ] Fix: 移除多选拖拽禁用吸附的限制，以 activeNode（无则第一个选中）为参考轴计算吸附，多选整体平移保持相对位移
- [ ] Proof: nudge 位移计算与多选吸附参考轴选择的单元测试；e2e 断言方向键移动节点位置变化与多选拖拽出现对齐线

Exit Criteria:

- [ ] 方向键 nudge 落地，单节点 undo 一步回退（moveNode 命令入栈）
- [ ] 多选拖拽吸附 e2e 断言通过对齐线渲染（`fd-alignment-guide`）
- [ ] use-alignment-guides 既有单测不回归

### Phase 4 - 右键上下文菜单

Status: planned
Targets: `designer-xyflow-canvas/designer-xyflow-canvas.tsx`（新增 `designer-context-menu.tsx`）

- Item Types: `Fix | Proof`

- [ ] Fix: 节点右键菜单（selectNode → duplicate → delete；readOnly/tree 模式隐藏不可用项）；画布空白右键菜单（selectAll → pasteClipboard → fitView）；viewport 边界钳制（`Math.min(clientX, innerWidth-宽)`）+ Escape/外部点击关闭
- [ ] Proof: e2e 断言右键菜单出现、菜单项触发对应命令（节点删除后画布节点数变化、粘贴产生新节点）、Escape 关闭

Exit Criteria:

- [ ] 右键菜单组件落地并接入 graph 模式画布，readOnly 下不出现破坏性项
- [ ] e2e 断言菜单交互通过；既有 edge-creation/undo-clipboard spec 不回归
- [ ] i18n 新键全部走 `flux.flowDesigner.*` 前缀并通过 i18n 检查（`pnpm check` i18n 键项）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（round 1，task agent_53c5d502 verdict fail；task agent_01d24955 round 2: pass（零残留））
- Verdict: pass-with-minors（round 2 复核通过，零 Blocker/Major）
- Rounds: 2
- Findings addressed: B1 选中态机制不可行+基线不实 → 改为 `.react-flow__node-designerNode.selected` 显式规则、基线改"无 box-shadow"、e2e 断言 none→ring；M1 多选 undo 一步不可达 → Exit 收窄为单节点一步回退+多选逐步（批量命令入 Deferred 裁决）；M2 §4.1 边 hover 行漏对账 → 基线新增 no-gap 裁决（浮卡+命中层已存在）；m1 连接反馈类名 → 自维护状态类升为确定实现；m2 → Targets 移除 designer-icon.tsx；527 移交的 "●" 项纳入 Phase 1

## Closure Gates

- [ ] 所有 in-scope confirmed live UX gaps 已修复（分析报告 §4.1 P0/P1 表逐条对账：选中态/连接反馈/palette 搜索/nudge/多选吸附/右键菜单；"边 hover 删除"行按 no-gap 裁决见基线）
- [ ] 行为结果已达成（Goals 逐条可观测）
- [ ] 必要 focused verification 已完成（单测 + e2e）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响 owner docs 已同步（`docs/architecture/flow-designer/design.md` 交互节；`docs/references/quick-reference.md` 如涉及）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 边 hover 删除（分析报告 §4.1 第 96 行）

- Classification: `watch-only residual`（评审核实为 no-gap）
- Why Not Blocking Closure: hover 浮卡删除钮（`designer-xyflow-edge.tsx:141-185`）与 BaseEdge interactionWidth 命中层均已存在，业界标准 S4 已满足；分析报告"待核对补强"表述就地裁决为已达标
- Successor Required: `no`

### 批量 moveNodes 命令暴露

- Classification: `optimization candidate`
- Why Not Blocking Closure: 多选 nudge 逐步 undo 与既有逐节点拖拽提交行为一致，无新增缺陷；暴露批量命令属 DesignerCommand 契约面扩展需 owner doc 同步，独立成项
- Successor Required: `no`（需要时新开 plan 引用 `core-node-commands.ts:171-184`）

### 防重叠自动推挤（collision resolution）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 现有对齐吸附 + 手动布局已可用；R-tree 依赖引入与性能验证属独立优化面
- Successor Required: `no`（若后续需要，新开 plan 引用本报告 §3.3-13）

### 双击空白 QuickAdd

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: palette 搜索 + 点击添加 + 拖拽 + 连线中点 + 菜单已覆盖建模入口；QuickAdd 为增量入口而非缺口修复
- Successor Required: `no`

## Non-Blocking Follow-ups

- palette 模糊评分（Flowise fuzzyScore）升级
- 边执行态流光（依赖执行语义接入 designer 画布）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<daily log / 命令输出>>

Follow-up:

- <<见 Non-Blocking Follow-ups>>
