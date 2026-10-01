# Playground 大组件/设计器 UX 修复 Roadmap（2026-10-01）

> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`
> Rule: 依据 plan guide Rule 22/24/25，按结果面（result surface）合并 findings 为 owner plan，不按 finding 拆分。
> Execution: 每个 work item 一份 owner plan（draft → 独立 review → active → 执行 → 全量验证 → 独立 closure audit → completed），每份 plan 落地后独立提交一次。
> Priority: 先 P0 功能硬伤，再 P1 交互语义，再 P2 视觉治理，最后 P3 内容充实。

## R1 Dashboard Editor 图表渲染断链 【P0】

- Findings: DB-1（Sales Trend 面板 6s 后仍空白，与 flux chart renderer 无关，断点在 editor-core 图表面板）；DB-2（表格列截断、"Orders" 标签压边、面板高度不齐）。
- Owner: `packages/dashboard-editor*`（以 live repo 包名为准）+ dashboard-demo 演示页。
- Proof: 演示页 Sales Trend 面板出现数据序列（程序化断言 SVG series 节点存在且非空）；表格面板无截断/无重叠；focused 单测覆盖面板数据传递。

## R2 透视表明细单元格空白 【P0】

- Findings: PV-1（Q1–Q3 明细值全空、每季度出现两行明细行、仅小计/合计有值）；PV-2（幽灵列、corner 头截断、progressbar 截断、页内重复主题开关）。
- Owner: pivot table 渲染包（VTable wrapper）+ pivot-table-demo 页。
- Proof: 主透视表明细单元格渲染出数值（e2e/组件测试断言单元格文本）；明细行数与数据一致；截断项修复。

## R3 地图渲染（区域空白 + Pin 黑点）【P0】

- Findings: MP-1（china-provinces 着色全白板、自定义边界卡空白）；MP-2（Pin 无底图无样式纯黑圆点、cluster 无聚合观感）。
- Owner: map 渲染包（OpenLayers wrapper）+ map-demo 页。
- Proof: 区域图层可见着色（程序化断言 layer/canvas 像素或 feature 样式）；pin 有形状/描边/聚合样式；组件测试覆盖样式注入路径。

## R4 电子表格公式求值与编辑交互 【P0】

- Findings: SP-1（公式原文显示不求值，双击输入与宿主 Set Formula 两条通路皆然）；SP-2（选中后直接键入不进编辑）；SP-3（演示数据贫瘠、底部开发日志条外露）。
- Owner: `spreadsheet-*` 包 + spreadsheet 演示页。
- Proof: B3 `=SUM(B1:B2)` 显示 49（组件/e2e 断言单元格显示值）；type-to-edit 生效；演示数据充实。

## R5 Page Designer 画布可视化与拖放语义 【P0/P1】

- Findings: PD-1（空容器 0 高度不可见）；PD-2（落点命中区域与视觉不符、无 drop 指示器）；PD-3（大纲树选中态对比度）；PD-4（预览模式不隐藏编辑面板）；PD-6（"(清空)"占位）；PD-7（组件库把手色块）。
- Owner: page-designer 包 + 演示页。
- Proof: 拖入 Form 后画布出现可辨识容器（占位框/标签）；drop 落点与视觉目标一致；预览模式隐藏左右编辑面板；对比度可达 WCAG AA；组件测试覆盖空容器占位渲染与 drop 命中。

## R6 全局外壳治理（徽章遮挡 + 主题开关 + console 噪音）【P1/P2，全页面受益】

- Findings: G-1（日志徽章压标题/返回按钮，计数随 console 告警膨胀至 386）；G-2（右下角主题浮层 + 页内暗色开关重复，浮层盖内容）。
- Owner: playground shell（App.tsx / theme-switcher）+ 各演示页 console 告警清理。
- Proof: 徽章不再与任何页面标题/工具栏元素重叠（缩放/窄视口抽查）；console 告警计数回落至个位数基线；主题控制单一路径。

## R7 流程设计器家族视觉治理（Flow + TaskFlow）【P1/P2】

- Findings: FD-1（迷你地图黑块）；FD-2（选中节点无画布高亮、悬浮工具条压邻节点）；FD-3（顶部标签胶囊与工具栏碰撞）；FD-4（连线标签低对比）；FD-5（Action 树结束节点退化/颜色不统一/参数无标注）；FD-6 + TF-2（inspector 中英重复字段）；TF-1（边线路由穿节点）。
- Owner: flow-designer / taskflow 设计器包。
- Proof: minimap 节点有主题化样式与视口框；选中节点画布高亮；标签条布局不碰撞；focused 快照测试。

## R8 排程组件视口与视觉（Gantt / Calendar / Kanban）【P1/P2】

- Findings: GT-1（初始视口不含今日）；GT-2（Project Beta 汇总条塌缩为红线）；GT-3（滚动条错位）；CA-1（打开非当前月）；CA-2（chip 截断、网格不填视口、表头英文）；KB-1（卡片信息密度、看板不填视口、滚动条贴窗底）。
- Owner: flux-renderers-scheduling 包 + 各演示页。
- Proof: 打开即见今日（程序化断言视口范围/当前月）；汇总条正常渲染；月网格填满可用高度；focused 单测。

## R9 Report Designer 检查器与首屏内容 【P1/P2】

- Findings: RD-1（打开全空无示例）；RD-2（检查器为占位文本，无单元格属性编辑）；RD-3（工具栏无提示、绑定文本过小）。
- Owner: report-designer 包 + 演示页。
- Proof: 打开预置示例报表；选中绑定单元格后检查器展示可编辑属性表单；e2e 抽查。

## R10 编辑器演示页治理（Word / Code / SCADA / Dashboard 杂项）【P2/P3】

- Findings: WD-1（角标残缺、内容空）；WD-2（空态文案重复）；CE-1（编辑器全空、SQL 高度塌陷）；SC-1/2/3/4（工具栏纯文本双排、图元库无缩略图、LIVE 调试块、DnD 复核）；DB-3（拖拽加面板无反馈）、DB-4（千分位）；PD-5（Page Designer inspector 开发者向文案/原始 JSON 编辑面治理——R5 Non-Goal 排除后归属此行，防孤儿）；G-3 中英混排与 G-4 开发文案下墙的各页落地。
- Owner: 各演示页 + 对应包的演示数据。
- Proof: 每页打开即有代表性内容；无调试残留；中英文案统一策略落地。

## R7 补充登记（执行期，2026-10-01）

- TF-1 整体（error/retry 环回线穿越节点本体）：偏移弧线机制经三种变体探针证伪不足；e6 源端口几何落在邻节点包围盒内使"采样零落入"判据构造性不可满足（布局/缩放跨加载漂移）。归**边路由引擎**（自动避障/端口感知路由）follow-up，见 plan `2026-10-01-ux-r7-flow-designer-visual-plan.md` Recorded Scope Change（经独立 reviewer 再裁定）。

## 执行顺序与状态

| #   | Work item                 | 优先级 | Plan                                                       | 状态                                                                                                                    |
| --- | ------------------------- | ------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| R1  | Dashboard Editor 图表断链 | P0     | `docs/plans/2026-10-01-ux-r1-dashboard-chart-plan.md`      | **completed**（4cabab47c）                                                                                              |
| R2  | 透视表明细空白            | P0     | `docs/plans/2026-10-01-ux-r2-pivot-detail-cells-plan.md`   | **completed**（5e8143ae4）                                                                                              |
| R3  | 地图渲染                  | P0     | `docs/plans/2026-10-01-ux-r3-map-render-plan.md`           | **completed**（d59f38f5e；诊断反转：实锤投影缺失 + 主题探针缺陷）                                                       |
| R4  | 电子表格公式求值          | P0     | `docs/plans/2026-10-01-ux-r4-spreadsheet-formula-plan.md`  | **completed**（独立 closure audit approved；执行期补修 type-to-edit 多字符截断 + 行/列 shift 扩选非连续区间）           |
| R5  | Page Designer 画布        | P0/P1  | `docs/plans/2026-10-01-ux-r5-page-designer-canvas-plan.md` | **completed**（review 2 轮 pass + 独立 closure audit approved；空容器投影/根回退提示/预览面板隐藏/对比度治理）          |
| R6  | 全局外壳治理              | P1/P2  | `docs/plans/2026-10-01-ux-r6-shell-chrome-plan.md`         | **completed**（closure audit approved；G-1 计数改判为误读，launcher 底部停靠 + 主题单一路径）                           |
| R7  | 流程设计器家族视觉        | P1/P2  | `docs/plans/2026-10-01-ux-r7-flow-designer-visual-plan.md` | **completed**（closure audit 2 轮 + TF-1 reviewer 再裁定 approved；FD-1/2/2b/3/4/5/6+TF-2 落地，TF-1 改判归边路由引擎） |
| R8  | 排程组件视口与视觉        | P1/P2  | —                                                          | pending                                                                                                                 |
| R9  | Report Designer 检查器    | P1/P2  | —                                                          | pending                                                                                                                 |
| R10 | 编辑器演示页治理          | P2/P3  | —                                                          | pending                                                                                                                 |

完成 R1–R10 后进行一轮复审计（fresh eyes 重走截图对比），无新 finding 才判收敛。
