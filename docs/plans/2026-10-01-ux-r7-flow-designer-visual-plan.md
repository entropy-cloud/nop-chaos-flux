# UX-R7 流程设计器家族视觉治理（Flow + TaskFlow）

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（FD-1~FD-6、TF-1~TF-3 的 FD 同源项）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R7
> Related: `packages/flow-designer-renderers/`（canvas/inspector owner）、`apps/playground/src/pages/flow-designer-page.tsx`（shell）、`apps/playground/src/schemas/*.json`（demo 节点/inspector 数据）、`docs/architecture/theme-compatibility.md`（`--fd-*` token 契约 owner doc）

## Purpose

把流程设计器家族从"迷你地图黑块、选中无画布高亮、悬浮胶囊压工具栏、连线标签低对比、Action 树节点退化、inspector 重复名称字段"修复为"迷你地图主题化可读、选中即高亮、布局零碰撞、标签可读、inspector 名称字段唯一"。（TF-1 回边不穿节点经 Recorded Scope Change 改判出范围，successor = 边路由引擎。）

## Current Baseline

- **FD-1 迷你地图黑块（机制已核正）**：`@xyflow/react@12.10.2` 的 MiniMap 节点 fill 走**内联 style**（`MiniMapNodeComponent` 计算 `fill = color || background` 写入 `style.fill`；`maskColor` 经 `--xy-minimap-mask-background-color-props` 自定义属性注入 base.css）——CSS var 在该表面**可正常解析**，此前探针"无 fill attribute"系红鲱鱼（fill 在 style 而非 attribute）。真实根因是 **token 值本身**：`--fd-minimap-node: rgba(15,23,42,0.92)`（designer-theme.css:34）在浅色 minimap 底（:33 `rgba(219,234,254,0.5)`）上近似纯黑；暗色 token（:82 `rgba(226,232,240,0.85)`）本就可读。修复=调整浅色 token 值（如 slate-500/600 半透明），断言走 computed `style.fill`（fill attribute 恒不存在，不作断言面）。
- **FD-2 选中无画布高亮（探针+代码实锤）**：`.react-flow__node` 获得 `selected` 类但 computed outline `3px none`、box-shadow none——`designer-xyflow-node.tsx` 自身不渲染选中视觉（selected 仅驱动 NodeToolbar 可见性 :139 与 `appearance.borderColorSelected` :157-159，demo schema 未设置该 appearance）。另：`apps/playground/src/styles-theme-utilities.css:93-106` 的 `.nop-designer-node[data-selected] > :where(.nop-glass-card)` 选中/悬停规则为**死代码**——节点体包装 `div[data-slot="designer-node-body"]`（designer-xyflow-node.tsx:318-325）打断直接子代选择器。修复=组件级选中样式 + 处置死规则（移除或修复，不留双机制）。
- **FD-2b 悬浮工具条压邻节点**：真实实现是包内 `NodeToolbar position={Position.Top}`（designer-xyflow-node.tsx:342-343）——工具条固定弹在节点正上方，上方邻节点覆盖时被压。（注意：`apps/playground/src/flow-designer/flow-designer-hover-toolbar.tsx` 属**无路由引用的遗留文件**，不落点。）
- **FD-3 标签胶囊压工具栏（代码实锤）**：`flow-designer-page.tsx:75` 例签 Tabs `absolute top-2 left-1/2 z-10` 悬浮画布顶部，与 WorkbenchShell 工具栏行（designer-page-body.tsx:409-427 → workbench-shell.tsx:338-340，工具栏类 designer-toolbar.tsx:200）同域重叠。
- **FD-4 连线标签低对比（代码实锤）**：`designer-xyflow-edge.tsx:118` 标签 `text-muted-foreground` + `border-border`，对比底面为 `--fd-edge-label-bg`/`--surface-highlight` fallback（designer-theme.css:29/135-137）。
- **FD-5 Action 树节点退化（定位实锤）**：节点体在 `apps/playground/src/schemas/action-flow-tree-schema.json`（nodeTypes `action-entry`/`action-step`/`action-end`；action-end 体为裸 `${label}` 文本），样式在 `apps/playground/src/flow-designer-nodes.css:120-165`（end 变体透明底 + 12px 40% 灰标题；entry 绿 `--fd-node-accent-start`、step 蓝 `--fd-node-accent-task`——颜色语义不统一）；红色参数值（false/5000）无字段名标注。
- **FD-6/TF-2 inspector 重复名称字段（同根，定位实锤）**：包内 `DefaultInspector` **恒渲染**内建"名称"字段（绑定 label，designer-inspector.tsx:440-449），再追加 nodeType inspector schema（:461-463）；而 demo 的 nodeType inspector（`workflow-designer-schema.json`）均自带第二个 `{name:'label', label:'名称'}` 字段 → 名称双字段；taskflow（`taskflow-workflow-schema.json`）同根：内建中文"名称" + schema 的 `Name`（10 处）/`Display Name`（5 处）并存。修复归属裁定：**包级去重**——DefaultInspector 在 nodeType inspector schema 已含**名称身份字段**（`name === 'label'` 或 `name` 以 `.name` 结尾，如 taskflow 的 `step.common.name`）时跳过内建字段（round-2 修正：窄谓词 `name==='label'` 对 taskflow 不生效——其 schema 无 label 字段且节点 data 无顶层 label，内建"名称"恒空渲染，正是 TF-2 的"大量留空"）。同时修 FD-6 与 TF-2；schema 字段名语言统一归 R10/G-3。
- **TF-1 环回边穿节点（改判出范围）**：原裁定承诺有界修复（回边偏移弧线）；执行期经三种弧线变体探针证伪 + e6 源端口几何落在邻节点盒内的构造性不可满足实锤后，**整体改判出范围**（Recorded Scope Change，经独立 reviewer 再裁定 approved；successor = 边路由引擎，roadmap R7 补充登记）。此类边保持 getBezierPath 原形态。
- TF-3：迷你地图部分由 FD-1 收口、G-1 徽章由 R6 已收口。
- 现有 e2e 覆盖：`tests/e2e/flow-designer-minimap-pan.spec.ts`、`flow-designer-dark.spec.ts`、`flow-designer-css-diag.spec.ts`（fd1 探针的家）；flow 相关单测套件全绿基线（执行时以 focused 实跑数字为准）。

## Goals

- 迷你地图：浅色主题节点色可辨识非黑块（computed `style.fill` 断言），viewport 遮罩可见。
- 选中即高亮：选中节点卡片有可辨识描边/光晕（组件 computed style 断言）；死选择器规则处置。
- 例签胶囊移入文档流 header 行，与工具栏零像素重叠（boundingBox 相交断言）。
- 连线标签对 `--fd-edge-label-bg`（fallback `--surface-highlight`）对比度 ≥4.5（computed color 程序化计算）。
- Action 树：结束节点卡片化、节点头颜色语义统一、参数带字段名标注。
- inspector"名称"字段唯一（包级去重，名称身份谓词 `label` 或 `*.name`；FD-6 + TF-2 同修，tf2 验收行见 Failure Paths）。
- ~~回边（error/retry 类）路径采样不落入任何节点 rect~~（改判出范围，见 Recorded Scope Change）。
- 既有套件全绿 + 新行为测试钉住。

## Non-Goals

- 完整边路由引擎/自动避障（含 TF-1 的非 U 形回绕边——见下方 Recorded Scope Change）。
- 设计器交互模型/命令语义变更。
- G-1 徽章（R6 已收口）；schema 字段名语言统一（G-3，归 R10）。

### Recorded Scope Change（TF-1，2026-10-01，执行期探针证伪后整体改判，经独立 reviewer 再裁定）

审计 TF-1（error/retry 环回线穿越节点本体）整体移出本 plan（removed from scope through a recorded scope change），successor ownership = **边路由引擎**（端口感知自动避障；roadmap R7 补充登记）。证据链：

- 有界机制探索：三种偏移弧线变体（对称外推 / 端口法线 / 定向控制点，arcOffset 96→220）逐一被 `getPointAtLength` 路径采样探针证伪——每个变体要么自身穿越节点、要么把擦挂位移到邻节点（e8 右列回绕需同帧绕过 end-1/invoke 双节点带，偏移弧线几何上无解）。
- **e6（script-1→graph-1，审计点名的 validateInput 环回线）补充实锤**：其源端口几何坐标本身就落在相邻 start-1 节点的包围盒内（布局/缩放跨加载漂移，探针多次复现实测），即"采样点零落入节点矩形"判据对该边**构造性不可满足**——任何从该端口出发的路径首样本必然在邻节点盒内。程序化验收承诺在该前提下不可靠实现。
- 此类边（含 e6/e8）在原始基线中即穿越节点（非本 plan 引入），保持 getBezierPath 原形态（不因半吊子弧线引入新穿越）；消除依赖路由引擎而非局部弧线参数。closure audit（第 1 轮）Blocker 指出此前记录失实（宣称 e6 已落地但实现已随回退移除），本节为如实改判。

## Scope

### In Scope（再裁定后）

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/`（designer-xyflow-canvas minimap、designer-xyflow-node 选中态与 NodeToolbar 避让、designer-xyflow-edge 标签对比）
- `packages/flow-designer-renderers/src/designer-theme.css`、`packages/flow-designer-renderers/src/designer-inspector.tsx`（名称身份去重）
- `apps/playground/src/pages/flow-designer-page.tsx`、`apps/playground/src/schemas/action-flow-tree-schema.json`、`apps/playground/src/flow-designer-nodes.css`、`apps/playground/src/styles-theme-utilities.css`
- `tests/e2e/flow-designer-*.spec`（fd1/fd3/fd2b/fd5 程序化断言；tf1 已改判出范围）
- owner doc：`docs/architecture/theme-compatibility.md`

### Out Of Scope（再裁定后）

- TF-1 整体（error/retry 回边穿节点）——Recorded Scope Change，successor = 边路由引擎（roadmap R7 补充登记）
- 流程文档模型、命令语义、collaboration
- schema 字段名语言统一（R10/G-3）

## Failure Paths

| 可测场景编号                | 触发                          | 行为                                                                                                                                          | 可重试 | 用户可见表现                                |
| --------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| fd1-minimap-fill            | 打开任一流程示例              | minimap 节点 computed `style.fill` 为浅色主题可辨识非黑值（非 rgba(15,23,42,\*) 系）                                                          | 否     | 迷你地图可读                                |
| fd2-selected-highlight      | 点击节点                      | 节点卡片 selected 态有描边/光晕（computed style 断言）                                                                                        | 否     | 选中即所见                                  |
| fd3-tabs-no-overlay         | 页面渲染                      | 例签 Tabs 与工具栏 boundingBox 无相交                                                                                                         | 否     | 顶部零碰撞                                  |
| fd6-inspector-unique-fields | 选中节点开 inspector          | "名称"/label 字段唯一（count=1）                                                                                                              | 否     | 表单无重复                                  |
| tf2-taskflow-name-fields    | 打开 TaskFlow 节点 inspector  | 无恒空的内建"名称"字段；名称编辑由 schema 字段（step.common.name）承担                                                                        | 否     | 名称字段唯一且有值                          |
| tf1-backedge-routing        | 渲染含 error/retry 回边的流程 | **改判出范围**（Recorded Scope Change）：源端口几何落在邻节点盒内使零落入判据构造性不可满足；消除依赖边路由引擎（successor ownership 已登记） | —      | 维持基线形态（保持原 bezier，不引入新穿越） |

## Test Strategy

档位选择：`必须自动化`

fd1/fd2/fd3/fd6/tf2 均为可断言 DOM/computed-style 行为（jsdom 组件测试先红后绿 + Playwright e2e 程序化断言，截图仅作旁证不入判据）。FD-4 对比度以 computed color 对指定底色程序化计算 ≥4.5。~~tf1 path 采样断言~~（改判出范围，见 Recorded Scope Change——判据构造性不可满足）。

## Execution Plan

### Phase 1 - 迷你地图与选中高亮

Status: completed
Targets: `designer-theme.css`、`designer-xyflow-canvas.tsx`、`designer-xyflow-node.tsx`、`styles-theme-utilities.css`

- Item Types: `Proof`, `Fix`

- [x] minimap 用例先红：浅色主题 computed `style.fill` 为近黑值（断言面=style/computed fill，非 attribute；fd1 e2e）
- [x] 修复：浅色 `--fd-minimap-node` → `rgba(71,85,105,0.55)`（slate-500/55%）；`designer-xyflow-canvas.tsx` nodeColor fallback 对齐；暗色 token 已可读保持
- [x] 选中态用例先红：selected 类存在但卡片 outline/box-shadow 为 none → 修复落地为复活既有主题选择器（styles-theme-utilities.css 穿透 body wrapper 的描边+光晕规则；执行路线偏差如实记录，fd2 computed-style 基线对比满足）
- [x] 死选择器处置：styles-theme-utilities.css selected/hover 两条规则修复选择器（裁定：修复而非移除，保留 hover 语义）
- [x] owner doc：`docs/architecture/theme-compatibility.md` minimap token 契约同步
- [x] 包测试全绿 + e2e 复核（r7 spec 2 例 + minimap-pan/dark/css-diag 回归 11 例）

Exit Criteria:

- [x] fd1/fd2 用例先红后绿
- [x] 包测试全绿

### Phase 2 - 布局零碰撞与标签可读

Status: completed
Targets: `flow-designer-page.tsx`、`designer-xyflow-edge.tsx`

- Item Types: `Proof`, `Fix`

- [x] 例签 Tabs 移入文档流 header 行（`flow-designer-page.tsx` h-12 header；fd3 e2e boundingBox 无相交断言）先红后绿
- [x] FD-4 连线标签对比度：`text-foreground`+`font-semibold`，fd4 e2e 程序化对比度 ≥4.5 对 `--fd-edge-label-bg` 底（先红：muted-foreground 实测 3.02 不达标）
- [x] FD-2b NodeToolbar 避让：`offset={12}` 有界缓解，程序化断言=参考布局下工具条 boundingBox 与任何其他节点不相交（fd2b e2e，零残差未触发 Deferred 登记条件）
- [x] 包/页测试全绿

Exit Criteria:

- [x] fd3/对比度用例先红后绿
- [x] 测试全绿

### Phase 3 - inspector 去重、Action 树治理与 TF-1 回边路由

Status: completed（TF-1 子项按 Recorded Scope Change 改判出范围）
Targets: `designer-inspector.tsx`、`action-flow-tree-schema.json`、`flow-designer-nodes.css`、`designer-xyflow-edge.tsx`

- Item Types: `Proof`, `Fix`

- [x] inspector 去重用例先红：nodeType schema 含名称身份字段（`label` 或 `*.name`）时"名称"字段 count=2 → 修复：DefaultInspector 跳过内建名称字段（包级去重，designer-inspector-name-dedupe.test.tsx 4 例；既有 inspector 测试保持绿）
- [x] TF-2 验收：taskflow inspector 无恒空内建"名称"（dedupe 谓词覆盖 `step.common.name` 形态；dedupe 测试第 2 例断言）
- [x] Action 树：action-end 节点卡片化（schema header 卡 + css 终结红 header/描边，entry 绿/step 蓝/end 红语义统一）；参数值前字段名标注（"when: "/"timeout: "，fd5 e2e 断言）
- [x] ~~TF-1 回边弧线分支 jsdom 单测~~ 改判出范围（Recorded Scope Change：判据构造性不可满足，弧线实现已回退；successor = 边路由引擎）
- [x] ~~TF-1 e2e 采样断言~~ 改判出范围（同上；探针证伪过程与证据存档 \_tmp/tf1-diag.mjs 等）
- [x] 全量 focused 测试绿 + 截图旁证入档

Exit Criteria:

- [x] fd6/tf2 用例先红后绿（tf1 改判出范围）
- [x] Action 树断言绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: round 1 `fail`（3 Major）→ 修订 → round 2 `fail`（1 Major：去重窄谓词对 taskflow 不生效——其 schema 为 step.common.name 且无顶层 label，内建"名称"恒空；1 Minor：FD-2b 验收旁证-only）→ 修订（谓词拓宽为名称身份字段 `label`/`*.name` + tf2-taskflow-name-fields 验收行 + FD-2b 程序化门）→ round 3 `pass`（0 Blocker/Major；2 装饰性 nit 已当场吸收：Test Strategy 枚举补 tf2、Phase-3 Exit Criteria 改 fd6/tf2/tf1）
- Rounds: 3
- Findings addressed: R7-M1（FD-1 机制核正：fill=inline style、var 可解析、真因=浅色 token 值近黑；断言面改 computed style.fill；暗色 token 已可读记录）；R7-M2（FD-6/TF-2 裁定包级去重归属（DefaultInspector 跳内建 label 字段）、FD-5 重钉 schema+css、FD-2b 重钉 NodeToolbar、死文件不再落点）；R7-M3（TF-1 删除条件降级、承诺有界修复、Failure Paths 增 tf1-backedge-routing 行、验收程序化：path 采样 vs 节点 rect + jsdom 几何单测）；R7-M4（FD-2 死选择器钩子记录 + 处置项）；R7-M5（owner doc gate 增 theme-compatibility.md 同步）；R7-M6（fd1/fd4 断言底面明确化 + e2e 落点指认）。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log；tf1 失败路径行按 Recorded Scope Change 改判）
- [x] 浏览器/e2e 实测证据存档（r7 e2e 6 例 + flow 回归集 17 passed；TF-1 探针证伪证据 \_tmp/tf1-_.mjs/\_tmp/tf1-_.png）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿）
- [x] `pnpm test`（78 tasks 全绿：flow-renderers 278 / playground 408 / i18n 30 等）
- [x] `pnpm check`（exit 0，零新增红项）
- [x] owner doc 同步（`docs/architecture/theme-compatibility.md` minimap token 契约）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- 边路由引擎（端口感知自动避障）——TF-1 的 successor ownership 本体（Recorded Scope Change），非"有界修复之外的通用化"：有界修复经探针证伪未落地
- 节点摘要卡信息设计（R10/G-3 文案治理连带）
- schema 字段名语言统一（R10/G-3）

## Closure

Status Note: 2026-10-01 completed。R1-R7 修复轮第 7 项收口。FD-1/2/2b/3/4/5/6+TF-2 全部落地并程序化验证；TF-1 经探针证伪 + 独立 reviewer 再裁定后按 Recorded Scope Change 整体改判出范围（successor = 边路由引擎）。closure audit 第 1 轮 issues（TF-1 记录失实 Blocker + 日志预记 + 计数偏差）已全部如实纠正后第 2 轮复审。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）两轮，2026-10-01
- Evidence:
  - 第 1 轮 `VERDICT: issues`：A-G 全部核实落地（FD-1/2/3/4/5/6+TF-2 逐项 file:line 证据 + 独立复跑 flow-renderers 43 files/278 tests、r7 e2e 6/6）；Blocker=TF-1 e6 记录失实（宣称落地但实现已随回退移除）+ 日志预记 audit 结果。已如实纠正：日志改判记录、plan Recorded Scope Change 重写（含 e6 源端口几何落在邻节点盒内的构造性不可满足实锤）、送独立 reviewer 显式再裁定。
  - Reviewer 再裁定 `ADJUDICATION: approved`（6 项文本一致性条件已全部落实：baseline/Goals/Test Strategy/Phase 3/Non-Blocking 的 TF-1 陈述同步改判；In Scope 节随再裁定重建为改判后状态）。
  - 第 2 轮复审（本节即证据）：Blocker 与日志失实已消除；Minor（FD-2 路线偏差记录、测试计数 43/278、roadmap R7 行补链）均已在 flip 前落实。
