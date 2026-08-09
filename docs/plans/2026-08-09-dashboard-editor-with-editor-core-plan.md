# Dashboard Editor 计划（editor-core 公共抽取 + workbench 复用 + hmi-editor 迁移预留）

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/analysis/2026-08-09-bi-control-support-analysis.md`（仪表盘拖拽布局缺口）、`docs/components/industrial-hmi-editor/design-architecture.md`（编辑器架构模式）、`docs/plans/2026-08-09-bi-kpi-filter-chart-enhance-plan.md`（BI 骨架）
> Related: `docs/plans/2026-08-09-pivot-table-vtable-wrapper-plan.md`（面板内容）、`docs/plans/2026-08-09-bi-kpi-filter-chart-enhance-plan.md`

## Purpose

1. 新建 **`@nop-chaos/editor-core`** 公共编辑器内核：编辑会话（working/committed 双态隔离）、undo/redo diff 命令栈、选择状态、提交策略、领域适配器注册表——对任意"编辑态/运行态"设计器（dashboard、SCADA hmi、后续其他）统一。
2. 基于 editor-core 实现 **dashboard editor**（仪表盘面板网格布局：拖拽/缩放/吸附/undo/保存），复用 WorkbenchShell 三段式外壳与 grid 布局。
3. 为 **industrial-hmi-editor 迁移**到 editor-core 完成可行性验证与迁移路径（实施归 successor plan）。

## Current Baseline

已核实（2026-08-09 live repo）：

- **WorkbenchShell 可直接复用**：`packages/flux-react/src/workbench/workbench-shell.tsx`（header + 左面板折叠/调宽 + canvas + 右面板折叠/调宽 + dialogs），**flow-designer 编辑器已在用**（`flow-designer-renderers/src/designer-page-body.tsx:498` `<WorkbenchShell`）。
- `grid` 布局 renderer 存在（`flux-renderers-layout/src/grid-renderer.tsx` + `GridSchema`：items/columns/gap/autoFlow/响应式）——可作 dashboard 运行态布局基础，但**无拖拽/缩放编辑能力**（CSS grid flow 语义，非网格吸附布局）。
- `industrial-hmi-editor`（`flux-renderers-industrial/src/editor/`）：编辑会话模型 `ScadaEditorSession`（workingConfig/committedBaseline/selection/mode + undoStack——单一 `UndoStack` 实例一体持有 undo/redo 双栈，`editor-session.ts`）、`cloneConfigSnapshot`（`editor-working-helpers.ts`）、双态 edit/preview、提交策略 `ScadaCommitPolicy`（manual/auto，manual 经 `component:save()` 触发）——**模式已验证但深绑定 SCADA**（ScadaConfig/ScadaSymbolNode/symbol:\* action/leafer canvas/palette 拖 data 类型）。
- 领域适配器先例：`flow-designer-core/src/tree-domain.ts`（`registerTreeDomainAdapter`/`getTreeDomainAdapter`/`listTreeDomainAdapters`）——注册表机制蓝本。
- core/renderers 拆分惯例：`flow-designer-core` + `flow-designer-renderers`、`report-designer-core` + `report-designer-renderers`。
- 面板内容控件：chart/pivot-table（VTable 封装计划中）/table/stat-tile（BI 骨架计划中）等 renderer 就绪或规划中。

## Goals

- 新建 `@nop-chaos/editor-core`：领域无关的编辑器内核（会话/undo/选择/提交/适配器注册），failing-first 单测锁定契约；API 形状对齐 `ScadaEditorSession` 模式（迁移兼容）。
- 新建 `@nop-chaos/flux-renderers-dashboard`：dashboard 运行态（布局 JSON → 网格渲染）+ dashboard editor（拖拽/缩放/吸附/undo/保存），复用 WorkbenchShell + grid + data-source + 现有 renderer。
- 编辑器三段式外壳统一走 WorkbenchShell（dashboard 新建即复用；hmi 迁移时对齐）。
- 产出 hmi-editor 迁移可行性验证（editor-core API 对 Scada 会话/undo 语义覆盖走查）+ 迁移实施 successor plan 路径记录。
- `docs/components/dashboard-editor/design.md` + example.json + playground 示例 + INV-1~5 审计 + daily log。

## Non-Goals

- **hmi-editor 全量迁移实施**（editor-core 落地且 dashboard 验证后，由 successor plan 执行；本计划只做 API 覆盖验证与迁移路径）。
- 拖拽式"图表/透视配置器"（字段建模 UI）——BI 骨架 Non-Goals 延续。
- 面板内容编辑（chart 配置弹窗等）——编辑面板类型/尺寸/布局，不编辑面板内部字段。
- dashboard 页面管理（列表/分享/权限）——应用层。

## Scope

### In Scope

- `editor-core` 包：`EditorCore`/`EditorSessionModel`/`UndoCommandStack`/`EditorDomainAdapter` 接口 + 注册表 + 单测。
- dashboard 运行态：`dashboard-layout` schema（panels: id/type/x/y/w/h + 布局 JSON）+ 渲染（grid 复用或自研网格定位，按裁定）。
- dashboard editor：编辑态画布（DOM 拖拽 + resize handle + 网格吸附）、palette（面板类型）、inspector（面板属性：位置/尺寸/标题/数据绑定）、undo/redo 集成、保存（布局 JSON 序列化 + 提交语义）。
- WorkbenchShell 复用装配；playground 示例页；design.md + example.json。
- hmi 迁移可行性验证（API 覆盖走查 + 迁移路径文档）。

### Out Of Scope

- hmi-editor 迁移实施（successor plan）。
- 面板内部字段配置器；dashboard 应用层管理。

## Failure Paths

| 场景                       | 触发                                 | 行为                                             | 可重试 | 用户可见表现                 |
| -------------------------- | ------------------------------------ | ------------------------------------------------ | ------ | ---------------------------- |
| editor-core-undo-empty     | 空栈 undo                            | no-op + dev warn                                 | 是     | 无变化                       |
| editor-core-commit-invalid | 提交时序列化失败/文档非法            | commit 拒绝，working 保留，错误透传              | 是     | 保存按钮报错，编辑内容不丢失 |
| dashboard-layout-invalid   | 布局 JSON 缺字段/越界（负坐标/超宽） | 校验降级：非法项忽略 + dev warn；全部非法 → 空态 | 是     | 部分面板缺失，控制台 warn    |
| dashboard-drag-out         | 拖拽面板超出画布边界                 | 网格吸附到边界内（clamp）                        | 是     | 面板停在边界                 |
| dashboard-resize-min       | resize 小于最小尺寸                  | clamp 到最小尺寸                                 | 是     | 面板停在最小尺寸             |
| dashboard-save-fail        | 保存动作失败                         | 提交回滚，编辑会话保持                           | 是     | 报错提示，未保存内容仍在     |
| dashboard-empty-data       | 布局为空                             | empty slot                                       | 是     | 空态提示                     |

## Test Strategy

本档选择：`必须自动化`

editor-core 会话/undo/提交是跨域公共契约（hmi 迁移依赖其稳定性），dashboard 布局计算（吸附/越界 clamp/序列化校验）是核心回归路径——均 failing-first 单测。编辑画布交互（pointer 拖拽）以纯函数（坐标计算）单测 + playground 手测补足；不依赖真实 Canvas 实例。

## Execution Plan

### Phase 1 - `@nop-chaos/editor-core` 公共内核

Status: completed
Targets: `packages/editor-core/`（新）、`vite.workspace-alias.ts`、根 `tsconfig.json`、`docs/architecture/editor-core.md`（新建架构文档）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] (Decision) 裁定内核 API（对齐 `ScadaEditorSession` 模式，hmi 迁移兼容）：
  - `EditorSessionModel<TDocument>`：`working`/`committed`/`selection`/`mode: 'edit' | 'preview'` + `commit()`/`revert()`/`onChange`
  - `UndoCommandStack`：`record(diff, inverse)`/`undo()`/`redo()`/`canUndo`/`canRedo`（diff 命令栈语义，对齐 `editor-session.ts` UndoStack）
  - `EditorDomainAdapter<TDocument>`：`load`/`serialize`/`validate`/`diff`（working→committed diff 生成）/`applyDiff` + 领域命令面声明
  - `createEditorCore(adapter)` 工厂 + 适配器注册表（`registerEditorDomain`/`getEditorDomain`，flow-designer-core `tree-domain.ts` 机制蓝本）
  - 提交策略 `manual | auto`（对齐 `ScadaCommitPolicy`）
- [x] (Proof) 先写 failing 单测（内核契约）：
  - 会话：working 变更不污染 committed；commit 后 baseline 推进；revert 丢弃 working
  - undo/redo：diff 栈记录/撤销/重做/空栈 no-op；commit 后栈行为（裁定：commit 清栈或保留，对齐 hmi 语义）
  - adapter：注册表注册/查询/重复注册覆盖；`applyDiff` 回放契约（forward/inverse 对称）
  - 双态：mode 切换不泄漏会话状态（INV-4：session 不进 flux scope）
- [x] (Fix) 实现 `editor-core` 包（骨架：package.json/tsconfig/build 脚本/graph 包模板），不含任何 DOM/leafer/领域类型。
- [x] (Fix) 注册别名与根 tsconfig references；`docs/architecture/editor-core.md` 描述最终 API（会话/undo/适配器/双态）与拒绝的替代方案（如复用 ScadaEditorSession 原样、meta2d 历史栈直搬）。
- [x] (Follow-up) 对照 `editor-session.ts`/`undo-stack.ts` 逐项核对 API 覆盖（迁移就绪矩阵初版，Phase 5 完善）。

Exit Criteria:

- [x] `editor-core` 单测全绿（会话/undo/适配器/双态契约）。
- [x] `docs/architecture/editor-core.md` 与 live API 一致。

### Phase 2 - dashboard 运行态

Status: completed
Targets: `packages/flux-renderers-dashboard/src/layout-*`、`dashboard-schemas.ts`、`dashboard-renderer.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] (Decision) 裁定运行态布局方案：复用 `grid` renderer（CSS grid flow，语义简单但无绝对坐标）vs 自研绝对定位 + 网格对齐渲染（对齐编辑态坐标模型，编辑/运行同构）——以"编辑态坐标 → 运行态渲染零转换"为判据，倾向自研（DashboardLayout 坐标模型单一来源）。
- [x] (Decision) 裁定 `DashboardLayoutSchema`：`panels: Array<{ id; type; title?; x; y; w; h; props?: SchemaValue; source?: SchemaValue }>` + `cols?`/`rowHeight?`/`gap?` + `empty`/`height`。
- [x] (Proof) failing 单测：布局坐标模型（x/y/w/h 网格换算、越界 clamp、重叠检测）、面板渲染映射（type → renderer、props/source 表达式求值）、空布局 empty slot。
- [x] (Fix) 实现运行态 `dashboard` renderer（type `dashboard`，category `layout`）+ definitions 注册（包级 `registerDashboardRenderers`）。

Exit Criteria:

- [x] 布局计算单测全绿；`dashboard` 运行态在 playground 以静态布局 JSON 可渲染。

### Phase 3 - dashboard editor（编辑态）

Status: completed
Targets: `packages/flux-renderers-dashboard/src/editor/`（canvas/palette/inspector/handles）、`docs/components/dashboard-editor/design.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] (Decision) 裁定编辑态模型：`editor-core` 会话（layout JSON 为 document）；面板拖拽/resize 经**纯函数坐标更新**（`dragPanel`/`resizePanel`/`snapToGrid`，可单测）→ 会话 working 变更 → undo 栈记录 diff。
- [x] (Proof) failing 单测：拖拽坐标纯函数（网格吸附/边界 clamp/最小尺寸）、resize 八向句柄计算、undo/redo 经 editor-core 集成（拖拽→undo→坐标复原）。
- [x] (Fix) 编辑态画布：DOM pointer 拖拽 + resize handles + 网格吸附 + 选中高亮 + 删除/复制（键盘+按钮），预览模式切换（双态）。
- [x] (Fix) palette：面板类型列表（chart/pivot-table/table/stat-tile/iframe/html/text 等，拖入画布生成 panel）；inspector：位置/尺寸/标题/type/props 编辑（提交语义 manual）。**跨计划依赖：`pivot-table`（`2026-08-09-pivot-table-vtable-wrapper-plan.md`，review 未过）与 `stat-tile`（`2026-08-09-bi-kpi-filter-chart-enhance-plan.md`，active）——执行时未落地的类型不入 palette，回退到已落地面板类型（table/chart/iframe/html/text），回退结论记入 design.md；palette 类型清单以执行时已注册 renderer 为准。**
- [x] (Fix) **WorkbenchShell 复用装配**：header（保存/撤销/重做/预览切换）+ leftPanel（palette）+ canvas + rightPanel（inspector），对齐 flow-designer `designer-page-body.tsx` 用法。
- [x] (Fix) 保存链路：`component:save()` → 会话 commit → 布局 JSON 序列化 → 下游同步（对齐 hmi 提交语义）。
- [x] (Follow-up) 记录面板内容配置器（编辑面板内部字段）为后续项。

Exit Criteria:

- [x] 编辑态走查通过：拖拽/缩放/吸附/undo/redo/删除/保存/预览切换全链路可用（自动交互测试覆盖 + playground 页装配）。
- [x] 坐标纯函数 + editor-core 集成单测全绿。

### Phase 4 - 集成、示例与文档

Status: completed
Targets: `apps/playground/src/`、`docs/components/dashboard-editor/example.json`、`docs/analysis/2026-08-09-bi-control-support-analysis.md`、`docs/logs/2026/08-09.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] (Fix) playground 示例页：BI 看板（KPI 卡 + chart + pivot-table + table 面板，筛选联动，编辑态↔运行态切换）。示例面板组合随执行时已落地面板类型调整（pivot-table/stat-tile 未落地则替换为 table/chart/iframe/text），至少保留：KPI 卡 + chart + table 三类面板。
- [x] (Proof) 示例走查：编辑布局 → 保存 → 刷新后布局还原；面板数据经 `source` 表达式联动 data-source。
- [x] (Fix) `docs/components/dashboard-editor/design.md`（schema/坐标模型/复用点清单：WorkbenchShell/grid/data-source/editor-core）+ `example.json`。
- [x] (Fix) 更新分析报告（BI 缺口闭环标注）+ daily log。
- [x] (Fix) INV-1~5 审计（无新 IO；内部 state 域内持有；RendererComponentProps 契约）。

Exit Criteria:

- [x] playground 示例可运行（交互链路经自动测试覆盖：拖拽/resize/undo/save/palette/drop/inspector/mode 切换 + playground 页装配与路由全绿）；design.md + example.json 与 live 行为一致。
- [x] 分析报告与 daily log 同步；INV 审计无遗留。

### Phase 5 - hmi-editor 迁移可行性验证

Status: completed
Targets: `docs/plans/2026-08-09-dashboard-editor-with-editor-core-plan.md`（迁移路径节）、`docs/architecture/editor-core.md`（覆盖矩阵）

- Item Types: `Proof | Decision | Follow-up`

- [x] (Proof) API 覆盖走查：`editor-core` 会话/undo/提交语义逐一对照 `ScadaEditorSession`/`UndoStack`/`cloneConfigSnapshot`/`ScadaCommitPolicy`，产出覆盖矩阵（直接映射/需适配/缺口）。
- [x] (Decision) 裁定迁移路径：a) 全量迁移（editor-core 替代 ScadaEditorSession，SCADA 域实现 `ScadaDomainAdapter`）；b) 双轨（先 adapter 包装，后替换）；给出建议与风险（30+ 测试文件回归面）。
- [x] (Fix) 迁移实施 = successor plan（记录路径、范围、验证策略；本计划不做实施）。
- [x] (Follow-up) 记录 workbench 外壳统一（hmi editor 三段式对齐 WorkbenchShell）为 successor 范围项。

Exit Criteria:

- [x] 覆盖矩阵完成且无未标注缺口；迁移 successor plan 路径记录在案。
- [x] 本计划内无 hmi 代码变更（实施归 successor）。

## 迁移路径（successor plan 记录，2026-08-09 裁定）

- **裁定：路径 b（双轨）**——先 `ScadaDomainAdapter` 包装（SCADA 域实现 `EditorDomainAdapter`，
  `ScadaConfigDiff` 迁为 adapter diff/applyDiff，会话/undo 语义不变），editor-core 会话逐步替换
  `ScadaEditorSession`；稳定后移除原会话/undo 实现。**理由**：a) 全量迁移在 30+ 测试文件
  （1400+ 测试）回归面上一次性替换风险高；b) adapter 包装可先经 dashboard 同形契约验证
  （`DashboardLayoutDiff` 与 `ScadaConfigDiff` 结构同构）；c) 双轨期间 undo 语义（事务/合并/
  失败回滚）可逐项对齐。**风险**：① `UndoStack.replaceUndoTop`/跨操作合并（coalesceGroup）是
  editor-core 唯一语义缺口（见 `docs/architecture/editor-core.md` §6.1）——迁移前需补
  `UndoCommandStack` 合并 API（向后兼容新增）；② load 语义（resetSession 组合）需按 dashboard
  push-back 重建模式对齐；③ 18 个 component 句柄逐个迁移（`useDashboardEditorHandles` 同形）。
- **范围**：editor-core 栈合并 API 补充 → `ScadaDomainAdapter` 实现 → 会话替换 → 句柄迁移 →
  旧实现删除（`@deprecated` + docs 记录先行）。
- **验证策略**：failing-first 单测逐项替换（复用既有 1400+ 测试断言面）；full-green 后删除旧代码。
- **实施归属**：successor plan（`docs/plans/` 下新计划，执行时创建），本计划不做实施。
- **外壳统一**：hmi editor 三段式（palette/canvas/inspector）对齐 WorkbenchShell —— 归上述
  successor 范围项（hmi 现为自研 panel 布局，迁移时复用 `WorkbenchShell` 装配模式）。

## Draft Review Record

> 独立子 agent（fresh session）review 通过，2026-08-09。

- Reviewer / Agent: mission-driver 2026-08-09-182611（fresh session review）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: ① Major——Phase 3 palette / Phase 4 示例对 `pivot-table`（draft plan）与 `stat-tile` 的跨计划依赖未显式声明，已补充依赖说明 + 未落地回退策略（回退结论记 design.md）；② Minor——Current Baseline 中 `ScadaEditorSession` 字段描述（undoStack/redoStack → 单一 `UndoStack` 一体持有双栈）已修正。

## Closure Gates

- [x] `editor-core` 单测全绿（会话/undo/适配器/双态）；dashboard 布局与编辑交互 focused 单测全绿。
- [x] playground BI 看板示例（编辑↔运行、保存还原、数据联动）手测通过。
- [x] hmi 迁移覆盖矩阵完成；迁移路径 successor plan 已记录。
- [x] `docs/architecture/editor-core.md` + `docs/components/dashboard-editor/design.md` + example.json 与 live baseline 一致。
- [x] INV-1~5 审计通过。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 行为缺口。
- [x] 受影响的 owner docs 已同步（分析报告、daily log）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### hmi-editor 迁移实施

- Classification: `out-of-scope improvement`（本计划仅验证与路径记录）
- Why Not Blocking Closure: hmi-editor 已稳定落地（30+ 测试文件），迁移是增量治理而非缺陷修复；editor-core 需先经 dashboard 域生产验证，迁移才安全。路径已记录为 successor。
- Successor Required: `yes`
- Successor Path: `docs/plans/`（Phase 5 记录的具体 successor plan，执行时创建）

### 面板内容配置器（拖拽式图表/透视字段建模）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑器首版只编辑面板布局（类型/位置/尺寸/数据绑定表达式），内部字段建模依赖 pivot-table/chart 各自配置器，后续独立评估。
- Successor Required: `no`

## Non-Blocking Follow-ups

- hmi editor 外壳对齐 WorkbenchShell（归迁移 successor 范围）。
- `grid` renderer 与 dashboard 坐标模型的对照（若运行态复用 grid 的裁定被否决，记录理由于 design.md）。
- dashboard 布局 JSON 与后端（nop-app）持久化协议对齐（应用层接入时）。

## Closure

Status Note: 5 Phase 全 completed（2026-08-09 执行轮）。`@nop-chaos/editor-core`（19 单测）+
`@nop-chaos/flux-renderers-dashboard`（53 单测：布局坐标/域 adapter diff 对称/编辑交互/save 事件 dispatch-spy）

- playground `#/dashboard-demo` 示例页 + design.md/example.json + hmi 迁移覆盖矩阵与双轨路径裁定全部落地；
  workspace 全量验证 35/35 typecheck·build·lint、63/63 test tasks（--force 全绿）、`pnpm check` 零新增未登记 red
  （audit-event-dispatch-ctx 6 hits 为已登记 industrial 预存面）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session（`ses_017b26b0dffeZzqjMsed6ZG9Sk`，fresh context，非执行 session）
- Evidence: verdict=`approved`（0 Blocker / 0 Major-in-scope）。逐 Phase live 复核：P1 editor-core 19/19（导出符号与 arch doc §2 逐字一致）；P2 layout-math 24/24 + renderer/definitions/registerDashboardRenderers 就位；P3 editor 7 模块齐 + save 事件 dispatch-spy 断言 `{ serialized }` payload；P4 playground 路由/示例页/design.md/analysis 标注/daily log 齐；P5 覆盖矩阵含 coalesce 缺口（arch doc §6.1）+ 双轨路径裁定（plan 迁移路径节）。`pnpm check` 仅已登记预存 red（industrial 6 hits + 2 exempt locale + ai-engine-invariants 注册 4 命中），零新增。plan 文本一致性：仅 closure-audit 项保持未勾选（执行 session 不得自审，符合规则）。deferred 分类诚实（hmi 迁移 = out-of-scope improvement + successor 记录；面板配置器 = out-of-scope）。

Follow-up:

- hmi-editor 迁移实施（双轨路径，范围/验证策略见「迁移路径（successor plan 记录）」节）
- 面板内容配置器（编辑面板内部字段建模）——out-of-scope，后续独立评估
- dashboard 布局 JSON 与 nop-app 后端持久化协议对齐——应用层接入时
