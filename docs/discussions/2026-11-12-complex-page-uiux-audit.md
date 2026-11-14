# 复杂页面 UI/UX 审计报告与改进 Roadmap

> **2026-11-12 更新**：P0/P1 修复已执行两轮并通过截图复审，见文末「五、修复执行结果」。以下原始审计结论保留作基线。

- 日期：2026-11-12
- 方法：Playwright 批量截图（1440×900 @1.5x，46 页，本目录 `*.png`）→ 三组独立视觉审计（统一评分卡：美观 / UI 一致性 / UX，各 1-5 分）→ 跨页共性归因。
- 结论速览：**46 页中 0 页达到"业内最高水准"；约 10 页"接近"（sundial-workbench 最佳 4.5）；其余存在可归类的系统性差距。** 差距大多不是"风格不美"，而是完成度问题：截断、占位残件、调试文案外露、默认图表样式、跨页组件漂移。

## 一、逐页评分总表

### A 层：产品级复刻（17 页）

| 页面                                  | 美观 | UI  | UX  | 结论                                                     |
| ------------------------------------- | ---- | --- | --- | -------------------------------------------------------- |
| sundial-workbench                     | 4.5  | 4.5 | 4.5 | 接近（全场最佳）                                         |
| sundial-analytics / detail / settings | 4    | 4   | 4   | 接近                                                     |
| stripe-payments                       | 4    | 4   | 3.5 | 否（搜索区文字重叠 bug、图表空块、千分位不一致）         |
| cal-booking                           | 4    | 4   | 4   | 接近（槽位三态好；日历选中态缺失、格子过松）             |
| linear-detail                         | 3.5  | 3.5 | 4   | 接近（顶部悬浮残影、属性栏"应用"按钮非原生交互模型）     |
| notion-database                       | 3.5  | 4   | 3.5 | 接近（右缘截断、分页器裁切、分组着色噪音）               |
| airtable-grid                         | 3.5  | 4   | 4   | 接近（summary bar/空行区缺失、右下控件粗糙）             |
| linear-issues                         | 3.5  | 3.5 | 3.5 | 否（表头竖直白缝、缺单元格、行密度松）                   |
| linear-board                          | 3    | 3   | 3.5 | 否（34 个重复标签 chip 失控、列被裁切、调试文案外露）    |
| antdpro-form-step                     | 3.5  | 4   | 3.5 | 接近（原生 number spinner 泄漏、第一步"上一步"未禁用）   |
| pih-workspace                         | 3.5  | 3.5 | 3.5 | 接近（消息流顶部裁切、空 thinking 残块、composer 拥挤）  |
| bisheng-build                         | 3.5  | 3.5 | 3.5 | 否（画布节点不可读、参数面板空数据、emoji 与 icon 混用） |
| antdpro-list                          | 3.5  | 4   | 3   | 否（双份搜索/重置按钮硬伤）                              |
| antdpro-detail-advanced               | 3    | 3.5 | 2.5 | 否（内容空洞，"高级"名不副实）                           |
| antdpro-dashboard                     | 2.5  | 3   | 2.5 | 否（ECharts 原色饼图+渲染残缺、红横线 bug、栅格错位）    |

### B 层：业务域复刻（21 页）

| 页面                               | 美观 | UI  | UX  | 结论                                                                    |
| ---------------------------------- | ---- | --- | --- | ----------------------------------------------------------------------- |
| itam-asset-inventory               | 3    | 4   | 3   | 接近（本批最佳表格页；工具栏/筛选布局粗糙）                             |
| mes-shopfloor-board                | 3    | 3   | 3   | 接近（KPI+sparkline 全场最佳 KPI 组；深色画布对比度不足、大屏竟需滚动） |
| mes-work-reporting                 | 3    | 4   | 3   | 接近（按钮墙无主次、合计行被裁）                                        |
| doc-hitl-inbox / ai-approval-trail | 3    | 4   | 3   | 接近（状态徽章跨页不一致、紫色滥用）                                    |
| doc-ocr-workbench                  | 3    | 3   | 3   | 接近（bbox 对照领域感强；右栏 400px 空白、把手可发现性差）              |
| crm-opportunity-kanban             | 3    | 3   | 3   | 接近（徽章三色语义、卡片字段密度低于 Salesforce/HubSpot）               |
| wms-wave-picking                   | 3    | 3   | 3   | 否（优先级圆点无图例、密度低、列裁切）                                  |
| crm-sales-dashboard                | 3    | 3   | 3   | 否（ECharts 默认样式、柱状图近似漏斗、实现术语入 UI）                   |
| mes-andon-material                 | 3    | 3   | 3   | 否（调试文案直出、红字面积过大）                                        |
| mall-sku-picker                    | 3    | 3   | 3   | 否（图文不一致暴露假数据、SKU 核心交互不可见）                          |
| mall-distribution                  | 3    | 3   | 3   | 否（首屏信息密度不足、KPI 色彩语义不明）                                |
| ai-ticket-console                  | 3    | 3   | 3   | 否（列头"工单： 6 6"重复渲染 bug、SLA 无颜色分级）                      |
| ai-knowledge-chat                  | 3    | 3   | 3   | 否（空态下出现"重试/复制"状态逻辑错误、发送键对比度 2.5:1）             |
| iot-telemetry-device               | 3    | 3   | 3   | 否（ECharts 原色三线、空值无"-"、筛选全宽失衡）                         |
| iot-ota-rollout                    | 3    | 3   | 3   | 否（选设备无元信息支持决策、fixture 过小）                              |
| wms-pda-receiving                  | 2    | 3   | 3   | 否（移动画布孤悬、数量输入无 placeholder/单位）                         |
| wms-stock-ledger                   | 2    | 2   | 2   | 否（透视表维度名大量截断——数据产品致命伤）                              |
| crm-customer-360                   | 2    | 3   | 2   | 否（头部信息流水文本粘连、50% 空白、内部术语外露）                      |
| itam-depreciation-dashboard        | 2    | 2   | 2   | 否（双 y 轴失衡图表无信息量、数字截断）                                 |
| iot-geofence-videowall             | 2    | 2   | 2   | 否（ffmpeg 彩条测试图当产品内容、地图零地理上下文）                     |

### C 层：设计器/重型应用（8 页）

| 页面              | 美观 | UI  | UX  | 结论                                                               |
| ----------------- | ---- | --- | --- | ------------------------------------------------------------------ |
| taskflow-designer | 4.5  | 4.5 | 4   | 接近（边语义胶囊最佳；锚点噪音、中英混排）                         |
| flow-designer     | 4    | 4   | 3.5 | 接近（连线标签对比度低、画布利用率低）                             |
| word-editor       | 4    | 4   | 3.5 | 接近（工具栏最佳；段落间距过大、二级条信息过载）                   |
| page-designer     | 3.5  | 3.5 | 3   | 否（"选 210"角标遮挡列表末项、属性面板空态未设计、组件名是技术名） |
| print-designer    | 3.5  | 3   | 3.5 | 否（插入元素无图标、输入框无可编辑感）                             |
| spreadsheet       | 3.5  | 3.5 | 3.5 | 否（公式栏/名称框缺失、Sheet tab 橙色与蓝色系冲突）                |
| report-designer   | 3    | 2.5 | 2.5 | 否（检查器中英混排占位文案、工具栏图标语义不明）                   |
| scada-editor-demo | 2.5  | 2   | 2.5 | 否（20+ 纯文本按钮堆、7 个同权重蓝胶囊、调试 JSON 区外露）         |

## 二、跨页系统性问题（按修复价值排序）

1. **完成度残件直接上线**：stripe 搜索区文字重叠、图表空块；linear 表头缝隙/缺单元格；ai-ticket-console "工单： 6 6" 双计数；sundial-analytics 卡角空心圆；bisheng 画布灰块。→ 属于 bug 而非设计，P0。
2. **文本/区域截断无兜底**：约 20 页底部或右缘被裁切（透视表维度名、y 轴标签、合计行、分页器）。→ 缺滚动收尾设计 + 截图基线视口约定，P0。
3. **调试/内部文案泄漏产品层**：linear-board"拖拽已接线"、stripe"chip 增删已接线 (I1 P7b)"、mes-andon"当前锚点： 0"、crm"party-search 范式"、scada"导出 JSON (component:exportConfig)"、B 层页面顶部 roadmap 说明段、"非法格式演练"按钮。→ 需要一套 demo 元信息展示策略（独立 devtools 折叠区），P0。
4. **图表系统未产品化**：ECharts 默认原色（antdpro-dashboard、itam-depreciation、iot-telemetry）、双 y 轴失衡、y 轴小数刻度、marker 噪音、无 hover 提示；sundial 单色系证明项目有能力但未沉淀为图表主题 token。P1。
5. **跨页组件漂移**：状态徽章（ITAM 彩色 vs ai-approval 纯文本 vs doc-hitl 常规=紫色）、KPI tile（有/无 sparkline、千分位）、看板卡片密度/列宽、筛选区布局各页不同。→ 缺"业务组件样例规范"，P1。
6. **色彩语义纪律缺失**：紫色滥用（常规态、已退役、已废弃）、原始色未进 token、发送键 2.5:1 低对比。P1。
7. **空态/占位未设计**：page-designer 属性面板、report-designer 检查器、scada 属性面板、"连接信息"空区块、CRM-360 半页空白。P1。
8. **原生控件泄漏**：antdpro-form-step number spinner、Checkbox 原生灰、地图缩放文字按钮。P2（audit-ui-consistency 门禁未覆盖 input[type=number] 等形态）。
9. **demo 外壳与产品内容混杂**：playground 侧栏、主题切换器、"览 0"角标、渐变光晕背景叠加在业务页上，B 层整层"产品感"被稀释。P2（部分属 playground 定位，但至少应可一键隐藏 chrome）。
10. **中英文混排**：C 层普遍（report-designer 检查器、taskflow 分组标题、scada 按钮）。P2。
11. **fixture 真实感不足**：彩条测试视频、耳机插画配"智能手机"、变更摘要 8 行同文、告警表空值无"-"。P2。

## 三、回答核心问题：达到业内最高水准了吗？

**没有。** 按层评价：

- **A 层**：Sundial 系列证明团队具备逼近 best-in-class 的能力（4.5 分，结构、密度、状态语义都对）；但 Linear/Notion/Stripe/Airtable 复刻普遍停在"形似"（3-4 分），败在细节完成度与数据呈现严谨性。
- **B 层**：整层未达标。最大问题是"测试工作台感"——demo 元信息、演练按钮、假数据直接暴露，加上图表未主题化与透视表截断。
- **C 层**：taskflow/flow 已具备一流图编辑器的视觉语义；scada-editor 与 report-designer 仍处"功能罗列"阶段。

## 四、改进 Roadmap

### Phase 0 — 卫生与硬伤（1 个迭代，P0）

- [ ] 修复 P0 bug 清单：stripe 搜索区重叠与图表空块、ai-ticket-console 双计数、antdpro-list 双按钮组、linear 表头缝隙/缺单元格、antdpro-dashboard 红横线与饼图渲染。
- [ ] 全局截断兜底：表格/透视表最小列宽 + 省略号 + tooltip；页面滚动收尾（粘性表头/合计行）；截图基线视口约定写入 e2e 规范。
- [ ] 调试文案出清：建立 `<DemoDevtools>` 折叠容器收纳"已接线/演练/锚点/范式/JSON 导出"类内容；grep 清理产品层实现术语。
- [ ] 数字格式化统一：千分位/单位/小数位工具函数 + y 轴整数刻度。

### Phase 1 — 设计系统沉淀（1-2 迭代，P1）

- [ ] 图表主题 token 化：单色系（以 sundial 为基准）+ 语义色板 + 统一 legend/marker/tooltip 样式，封装默认 option 工厂。
- [ ] 业务组件规范：状态徽章语义色表（常规=中性灰、退役/废弃=灰、高危=红）、KPI tile（统一 sparkline+delta+千分位）、看板卡片与筛选区标准密度。
- [ ] 空态组件库：Empty 已有，补"面板空态（引导动作）"与"区块未配置态"两种模式，替换所有裸文案空态。
- [ ] 色彩对比度门禁：扩展现有 visual-contrast 检查，覆盖 icon 按钮/发送键等小目标（≥3:1）。

### Phase 2 — 产品感提升（2-3 迭代，P2）

- [ ] playground chrome 一键隐藏模式（截图/演示模式），B 层页面以纯产品形态审计。
- [ ] fixture 真实感升级：真实感假数据生成器（图文匹配、时序连续、空值"-"）、测试视频替换彩条。
- [ ] 设计器工具栏信息架构重构：分组分隔、图标+tooltip、主次按钮层级（优先 scada-editor、report-designer）。
- [ ] 原生控件收口：number spinner、地图缩放控件迁入 ui 包；扩展 audit-ui-consistency 规则。
- [ ] 密度体系：表格行高三档（紧凑/标准/宽松）落地到 antdpro-list、wms 看板、mes 报工。

### 复审机制

- 每阶段完成后用本报告截图脚本重拍 `golden set`（10 页：sundial-workbench、linear-issues、stripe-payments、notion-database、antdpro-dashboard、wms-stock-ledger、crm-customer-360、iot-geofence-videowall、scada-editor-demo、report-designer），目标：Phase 0 后 P0 硬伤清零；Phase 1 后 golden set 平均分 ≥4.0；Phase 2 后至少 3 页达到 4.5+。

## 五、修复执行结果（2026-11-12 两轮，已验证）

### 第一轮（P0 硬伤）：18/18 复审项全部 PASS

- stripe-payments：搜索区调试文案移除（信息保留为代码注释）、净额走势空块 → 「+ 添加」按钮、交易笔数 1,286。
- linear-issues/board：表头连续暗带、优先级条根因修复（bare-flex 容器被强制 column 方向）、底部渐隐 mask、34 重复标签 → 6 唯一 chip、「拖拽已接线」出清、看板横向滚动、chip/头像对比度提升。
- ai-ticket-console：看板列头双计数根因修复（kanban-column-header 对 count 型 aggregate 抑制重复徽标，含渲染器测试锁定）、SLA 徽章 红(<30)/黄(<90)/绿(≥90) 三级、KPI 4 sparkline 齐全。
- antdpro-list：双份搜索/重置根因修复（crud-renderer 检测 queryForm region 自带 actions 时抑制合成按钮，回退路径保 itam e2e 兼容，含测试更新）、副标题调试文案移除。
- antdpro-dashboard：红横线根因修复（订单数系列与销售额共享量纲 → 双轴）、饼图现代调色板 + 切片 name/value 图例、KPI 千分位（新增 `FORMATNUMBER` builtin）、渠道 fixture 加权（9/9/9/9 → 非均匀真实分布）。
- sundial-analytics：y 轴整数刻度（渲染器新增 `yAxis.integerTicks`，recharts 3 需显式 domain/ticks，含回归测试）、卡角空 Circle → 「···」more 图标、输出结构行对齐修复。

### 第二轮（最低分 5 页）：15/17 PASS → 收尾

- wms-stock-ledger：pivot 维度固定宽（新 schema 能力 dimension `width`）+ 横向滚动、KPI 卡片化、演练按钮降级为灰字。
- crm-customer-360：头部结构化（名称主行 + 编码/级别/负责人 meta + 行业/地址 chip）、时间线 4→8 条多样化标题、选择器标签术语出清（e2e 断言同步）。页面级 jargon 已清；顶部 playground 元信息描述（64 页共用 chrome）不属产品表面，维持现状。
- itam-depreciation-dashboard：饼图调色板、双轴各归位、图例高度修复（260→340，探针确认 legend bottom 360 vs pivot top 719）、pivot 数字完整。
- iot-geofence-videowall：视频墙 fixture 重生成（SVG 监控画面 + 噪点，替代彩条）、地图缩放按钮 30×30 命中区、标题「电子围栏」、围栏 fillOpacity 0.15（map schema 新增可选能力）。
- scada-editor-demo：28 文字按钮 → 图标工具栏（组间 Separator）、保存唯一主按钮、调试区收进「开发者」开关、inspector 空态 Empty 组件化（3 个 e2e spec 同步）。

### 门禁与验证

- `check:oversized-code-files` 新红清零：chart-renderer 750→641（拆出 `chart-pie.tsx`，integerTicks 并入 `chart-y-axis.ts`）、crud-renderer 705→662（拆出 `crud-query-card.tsx`）。
- typecheck / build / lint / `pnpm check` 全绿；playground 569、flux-renderers-data 1181、industrial 1725、pivot 68、map 67 等单测绿；受影响 e2e（stripe/antdpro/scada/crm 等 spec）同步更新并跑通。
- 剩余差距（后续迭代，见上文 Phase 1/2 Roadmap）：图表主题 token 化全量覆盖、跨页状态徽章语义统一、playground chrome 演示模式、密度体系、剩余 30+ 页的同类细节（本轮覆盖 golden set + 最差 5 页）。

### 追加轮次（2026-11-13）

- **第三波（B 层系统性，复审 19/19 PASS）**：crm-sales-dashboard / iot-telemetry-device / mall-distribution 图表统一 curated 调色板 + 去 marker、实现术语出清、演练按钮降级、筛选行内化、KPI 色彩统一、趋势 3→10 点、告警表空值 "-" + 升级层级 0/1/2；状态徽章语义全库核查（紫色仅保留特殊/信息语义，常规/退役/废弃=中性灰；ai-approval-trail 状态列补徽章、itam 已退役/库存中区分）；mes/wms/mall/ai-knowledge/ai-ticket 调试文案与状态逻辑出清、mall-sku 图文一致、ai-feedback 空态隐藏。
- **第四波（C 层设计器 + A 层剩余，全部落地）**：report-designer 检查器中文 + Empty 引导、工具栏分组 Separator、插入按钮实体化；page-designer 属性面板空态 Empty 化（i18n 双语键）、组件面板遮挡与人性化命名；spreadsheet 未选中态/Sheet tab 主题色；print-designer 插入元素图标化、缩放控件宽度；flow minimap 面板化 + 边标签对比度；bisheng 参数面板字段完整可见；notion/airtable/linear-detail/antdpro-detail-advanced（2 栏 10 字段 desc + 审批时间线）/sundial-settings/detail（布局平衡、对话框内部滚动 + 底部动作固定）。
- **门禁**：typecheck/build/lint/check 全绿；playground 569、flow-designer-renderers 319、flux-print-renderers 86 等全绿；antdpro/linear visual e2e 16/16（2 处断言同步至千分位与调试文案移除后的产品面，标题等待 15s→30s 抗冷编译竞态）。
- **残余（判定为不适用或后续迭代）**：playground 元信息 chrome（64 页共用，演示模式属 Roadmap Phase 2）；antdpro funnel 首载偶现 0 柱（renderer 层问题，需独立调查）；airtable 末列右缘为横向滚动设计非缺陷（DOM 验证）。
