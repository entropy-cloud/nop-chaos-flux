# Playground 大组件/设计器 UI/UX 深度审计报告（2026-10-01）

> Audit Type: visual + interaction audit（浏览器实测）
> Method: 1440×900 视口，Playwright/CUA 驱动真实交互（拖拽、点击、输入、切换标签），逐页截图比对。
> Evidence: 截图存档于 `_tmp/ux-audit-2026-10-01/`（gitignore，不随本报告提交）。
> Coverage: 10 个设计器/编辑器 + 8 个大组件页 + 复合页面抽样，共 19 个路由。

## 1. 总体结论

设计器家族（Page/Flow/TaskFlow/Report/Spreadsheet/Print/Dashboard/SCADA/Word/Code）的**功能骨架普遍已立住**（拖拽、选中、undo、导入导出多数可用），但**演示效果的完成度显著低于其底层技术对标的官方 demo**（AMIS/钉钉宜搭/Univer/Handsontable/X6/Suite level）。差距集中在四类问题：

1. **P0 数据→画布渲染断链**：多处"有数据源但画布空白"的硬缺陷（图表、透视表明细、地图），直接让演示失去说服力。
2. **P1 核心交互语义缺失**：画布上看不见自己刚拖入的东西（Page Designer）、落点与视觉目标不一致、选中无高亮、预览模式形同虚设、公式不计算。
3. **P2 视觉治理欠账**：全局悬浮徽章遮挡标题/返回按钮（每一页）、坏掉的迷你地图、低对比选中态、开发态文案直接暴露为 UI。
4. **P3 演示内容贫瘠**：多个演示页打开即空白或只有占位文本，对比商业组件库 demo 的"开箱即惊艳"差距明显。

## 2. 全局缺陷（跨页面，影响所有设计器）

### G-1 悬浮日志徽章遮挡页面标题与返回按钮 【P2，每页必现】

- 现象：左上角圆形悬浮徽章（console 日志计数器，DOM `region "Notifications alt+T"`）压在每一页的"返回"按钮和页面标题上。Page Designer 压住"返回"、Flow/TaskFlow 压住流程标题（"Customer onboarding"/"Action Flow"/"钉钉审批流"不可读）、Spreadsheet/Report 压住 Home 按钮（只剩"ome"）。
- 证据链：计数随页面切换增长（0→106→136→196→386），说明各演示页存在**大量 console 告警输出**，徽章因此常驻且显眼。
- 双重问题：(a) 徽章定位策略侵入页面标题区；(b) 页面 console 告警泛滥本身是质量债。

### G-2 主题控制机制重复且位置突兀 【P2】

- 右下角恒浮 `classic/light` 两个下拉（主题+模式），部分页面（如 Pivot）右上角另有"暗色"开关——同一能力两套入口、两种交互，且右下角浮层会盖住右侧面板滚动内容的末尾。

### G-3 中英混排贯穿全部设计器 【P2】

- 组件库名称（input-text/FieldSet）、属性描述（"Initial form values at mount time."）、字段名（"Name" vs "名称"同时出现在 TaskFlow inspector）、日历表头（Mon/Tue）、图表数据全中文或全英文随机分布。对一个以中文为主的低代码产品演示面，语言不一致直接拉低专业感。

### G-4 开发态说明文案直接作为页面内容 【P2】

- SCADA Editor 顶部约 300 字的"编辑器完整能力演示：palette 图元库（24 内置图元…commitPolicy 缺省为 manual…"整段内部说明；Dashboard Editor 同样（"WorkbenchShell 三段式外壳…"）+ 一个**通栏巨型蓝色"← Back to Home"按钮**；运营大屏页头挂 `stat-cards / chart (area/pie/bar) / data-source 并行 / table ×2` 实现标签 chip；Code Editor 页整页无卡片裸排表单。这些是开发者备忘，不是产品 UI。

## 3. 分页面发现

### 3.1 Page Designer（页面设计器）— 问题最重的设计器 【P0/P1 集中地】

| 编号 | 严重度 | 发现                                                                                                                                                                                                                                                                |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PD-1 | P0     | **画布"真渲染"模式下空容器不可见**：拖入 Form 后画布上只有一条 ~24px 的橙色细框；再拖入 FieldSet 后画布毫无变化（fieldset 渲染 0 高度）。用户看不到自己拖了什么、更无法点选画布中的它（只能靠大纲树）。对比：所有成熟低代码设计器都给空容器画占位框/虚线+提示文案。 |

- 补注（ux-r5 执行，2026-10-01）：已实现设计器侧空容器投影（`empty-container-projection.ts`：编辑态空容器锚点获 `data-pd-empty` + 类型标签 + 44px 最小高度，容器获得子节点即清除）+ overlay 虚线占位框与"空容器"标签（0 尺寸锚点合成最小可视盒）。修复见 plan `2026-10-01-ux-r5-page-designer-canvas-plan.md`。
  | PD-2 | P1 | **落点语义与视觉不符**：向 Form 视觉区域中心拖放 input-text，实际 JSON 显示 fieldset 落在 `page.body[1]`（page 的子节点、Form 的兄弟）。因 Form 本身渲染为细条、画布其余全是 page 空白区，拖放的命中区域几乎必然落错。无 drop 指示器可见。 |
- 补注（ux-r5 执行，2026-10-01）：审计原文"无 drop 指示器"不成立——`data-drop-hint` 指示器管线在案且已有测试（复核改判）。真实缺陷：空容器 0×0 rect 被 drop 目标解析排除 → 视觉区域不可命中 → 静默根回退落 page 层级；根回退指示为整页描边等同无提示。修复：PD-1 投影使空容器获得真实命中区 + 根回退改为"插入页面末尾"底线+标签提示（`viaRootFallback`）。
  | PD-3 | P1 | **大纲树选中态对比度灾难**：选中行是深棕底+深棕字（"FieldSet"几乎不可读）。 |
- 补注（ux-r5 执行，2026-10-01）：选中态改为 accent 14% 混底色 + text-strong 前景 + 3px accent 左边条（非颜色 marker），对比度达 WCAG AA。
  | PD-4 | P1 | **预览模式形同虚设**：进入预览后左侧组件库/大纲树、右侧属性面板（含"复制节点/删除/新增动作"等编辑操作）全部保留，画布唯一变化是边框从橙变灰。用户无法获得"用户会看到什么"的真实预览。 |
- 补注（ux-r5 执行，2026-10-01）：预览态已隐藏左右编辑面板（保留 header 模式开关/返回入口），画布运行态占满；e2e 断言面板隐藏与恢复。
  | PD-5 | P2 | **属性面板以开发者视角组织**：Form 选中后暴露 "Status Path / Values Path" 并附三行英文运行时语义说明（"Dynamic rerouting is supported and recreates the form owner so the old path is cleared during replacement disposal."）；FieldSet 的主编辑面是"原始 JSON" textarea。 |
  | PD-6 | P2 | Label Align 下拉当前值显示"(清空)"，语义不明（应为"未设置"类中性占位）。 |
- 补注（ux-r5 执行，2026-10-01）：`flux.pageDesigner.selectEmptyOption` 文案改为中性「未设置」/ "Not set"（inspector-panel 与 actions-editor 两个消费方同步生效）。
  | PD-7 | P2 | 组件库拖拽把手渲染为橙色实心色块（"容器"徽标文字被截断成色块），可读性为零。 |
- 补注（ux-r5 执行，2026-10-01）：把手徽标改为 shrink-0 圆角描边徽章（accent 10% 混底色 + text-strong 前景），文字不再截断成色块。

### 3.2 Flow Designer（流程设计器）— 骨架最好、细节欠账 【P1/P2】

| 编号 | 严重度 | 发现                                                                                                                                                      |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FD-1 | P1     | **迷你地图渲染劣化**：画布右下角 minimap 把节点画成纯黑色块（无圆角/无描边/无视口指示框），视觉上像渲染故障。三个标签页（工作流/钉钉审批/Action）均如此。 |
| FD-2 | P1     | **选中节点无画布高亮**：点击节点只出现悬浮工具条（✎⧉🗑）和右面板联动，节点本体无描边/发光/着色变化；且悬浮工具条会覆盖上方相邻节点。                      |
| FD-3 | P2     | 顶部功能标签条（工作流/钉钉审批/Action 编排/节点边摘要）以悬浮胶囊形式压在工具栏行上，视觉上与撤销/重做/保存行互相碰撞；标题被 G-1 徽章遮挡。             |
| FD-4 | P2     | 连线标签（是/否/拒绝/完成/成功）小号灰字 + 浅灰虚线，对比度不足；缩放后更不可读。                                                                         |
| FD-5 | P2     | Action 编排树："结束"节点退化为裸文字（无卡片）、节点头颜色语义不统一（入口绿色、动作蓝色）、节点下的红色参数（false/5000）无字段名标注。                 |
| FD-6 | P2     | 属性面板出现两个"名称"字段（节点名 + 空的同名字段），重复命名让用户无法区分。                                                                             |

### 3.3 TaskFlow Designer 【P1/P2】

- TF-1 P1：Graph 模式边线路由混乱——error/retry 环回线以点状曲线穿越节点本体，多条边交叉叠压（validateInput 节点上叠着绿色虚线圆环）。
- TF-2 P2：Inspector 同时出现中文字段"名称"与英文字段"Name/Display Name"，且大量留空无占位提示。
- TF-3 P2：同 FD-1 迷你地图黑块、G-1 徽章遮标题。

### 3.4 Report Designer 【P1/P2】

- RD-1 P1：**打开即全空**：Sheet1 空白网格，无示例报表。对比 Univer/Handsontable/Luckysheet demo 均预置完整示例。首屏说服力为零。
- RD-2 P1：**检查器是占位文本**：选中已绑定字段单元格（B2 `${customer}`）后，右面板仍只有 "Inspector cell / Cell selected / Use drop from the field panel to bind a dataset field." 纯英文提示文本——无任何可编辑的单元格属性（字体/格式/绑定详情）。
- RD-3 P2：工具栏纯图标无分组标签/无提示；单元格文本 `${customer}` 9px 灰字难读。

### 3.5 Spreadsheet 【P0】

- SP-1 P0：**公式不求值**：B3 输入 `=SUM(B1:B2)`（双击编辑、回车提交）后单元格**原样显示公式文本**而非 49；顶部"Set Formula on selected cell"宿主按钮写入后同样显示原文。公式引擎→显示管线断链（或 host 未渲染计算值），这对"电子表格"是致命演示缺陷。
  - 补注（ux-r4 执行，2026-10-01）：根因实锤——spreadsheet-core 无任何公式求值引擎（`applySetCellFormula` 仅存原文）。已内建最小公式引擎（`packages/spreadsheet-core/src/formula/`），重算挂 `dispatchSpreadsheetCommand` 统一出口 + 装载求值，`=` 前缀提交升格 formula 权威存储；修复见 plan `2026-10-01-ux-r4-spreadsheet-formula-plan.md`。
- SP-2 P1：单选单元格后直接键入不进入编辑（主流电子表格均支持 type-to-edit），必须双击。
  - 补注（ux-r4 执行，2026-10-01）：审计原观察不成立——type-to-edit 已实现且独立 Playwright 探针复测通过（原观察疑为 IME composition 假象）。执行中发现相邻真实缺陷：editor 挂载 `input.select()` 全选种子字符致多字符键入被截断（R2-2c-A9-156），已修复为光标置尾并组件测试钉住。
- SP-3 P2：演示数据 3 个单元格（Alpha/42/Beta/7/Middle）；底部暴露开发日志条（"Selected B3 / Formula set on B3"）。
  - 补注（ux-r4 执行，2026-10-01）：演示数据已充实为季度销售示例表（SUM 合计行/列 + AVERAGE/ROUND 均值行，打开即见计算值）；开发日志条改为默认折叠的 `<details>`。

### 3.6 Print Designer 【P2】（完成度相对最高）

- PR-1 P2：选中元素后 Y 坐标显示未取整浮点 "22.2979166666…"并溢出输入框；样式区字号/颜色/边框输入全空且无单位/格式占位（px? mm? hex?）。
- PR-2 P2：G-1 徽章在此页变成蓝色胶囊遮住模板切换器（"A4 出库单"入口被盖，仅见"80mm 小票"）。
- 亮点：拖放、选择框、属性面板分区（位置与尺寸/数据绑定/样式）结构清晰，可作为其他设计器的对标内观。

### 3.7 Dashboard Editor（BI 看板编辑器）【P0】

- DB-1 P0：**图表面板渲染空白**：Sales Trend 面板有数据源 `${salesData}`、chartType line，画布只有网格与一条纵轴线，无任何数据线/面积。（根因已定位并修复，见 plan `2026-10-01-ux-r1-dashboard-chart-plan.md`：演示面板 series 声明了无效的 `data: '${salesSeries}'` 而 source 行结构为 `{month, sales}`，chart 渲染器 dataKey 回退 `'Sales'` 全 undefined 且空态判定不覆盖此形态 → 静默空白；渲染器已补该失败路径的空态 + dev 告警。）
- DB-2 P1：**面板内容溢出与重叠**：表格面板列截断（"Sta…/Pai…"），底部 "Orders" 标签压在面板边缘线上；KPI 与图表面板高度参差。（列截断已随 R1 修复：表格面板改整行布局；"Orders" 底部标题为编辑态 chrome 设计使然，非缺陷。）
- DB-3 P1→改判为**工具链误报（非产品缺陷）**：`editor-palette.tsx:59` 支持点击即加面板；拖拽走 HTML5 DnD（draggable + dataTransfer），合成鼠标事件（CUA/Playwright drag）不触发该协议属已知工具链限制。真实浏览器拖拽行为归 R10 人工复核。
- DB-4 P2：页头大段开发说明 + 通栏巨型返回按钮（G-4）；KPI 数值无千分位（1284300）。

### 3.8 SCADA Editor 【P1/P2】

- SC-1 P1：**工具栏双排纯文本按钮**（删除/组合/解组/适配/居中/1:1/±/左对齐…导出/导入/连接/历史/图层/模板/画面）无图标无分组容器，视觉密度极高且层级缺失；与 Save/Load/Preview 等蓝色胶囊按钮（中英混排）三套风格并存。
- SC-2 P2：图元库为纯文字列表，无缩略图/形状预览（对标任何 SCADA 组态软件均有图形库缩略图）。
- SC-3 P2：画布演示内容稀疏（绿矩形+泵+红圆+一个写着 LIVE 的蓝色块，LIVE 块疑似调试残留）；页面顶部 G-4 开发说明巨段。
- SC-4 待复核：从图元库 CUA 拖拽到画布无响应（可能依赖 HTML5 DnD，合成鼠标事件不触发；但 Page Designer 的 CUA 拖拽可用，说明两套 DnD 实现不一致本身值得统一）。

### 3.9 Word Editor 【P2】

- WD-1 P2：文档内容只有 "Hello World"，且文本两侧悬浮两个孤立"└"形角标（疑似空表格边框残留或占位符渲染残缺）。
- WD-2 P2：右侧大纲空态同一句话重复两遍（"未找到标题/添加标题后会在此显示"标题+副标题重复）。

### 3.10 Code Editor 【P2】

- CE-1 P2：整页所有编辑器打开为空（无示例代码）；SQL Editor 初始高度塌陷成单行 + 上方一条灰色横杠；无行号/主题切换等特性展示。作为"CodeMirror 6 特性橱窗"页完全不展示特性。

## 4. 大组件页

| 页面         | 编号 | 严重度 | 发现                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gantt        | GT-1 | P1     | 初始视口停在 2026-06/07（今天 2026-10-01），Project Beta 组条在视口右缘被切掉大半；"今日/适应"存在但未默认执行。                                                                                                                                                                                                                                           |
| Gantt        | GT-2 | P1     | Project Beta 汇总条渲染成**一条贴着 Research 条顶缘的红色细线**（关键路径线叠加在收缩的组条上，视觉等同 bug）。对照 Project Alpha 汇总条正常。                                                                                                                                                                                                             |
| Gantt        | GT-3 | P2     | 左网格与时间线各自的横向滚动条悬空错位；无悬停 tooltip。                                                                                                                                                                                                                                                                                                   |
| Kanban       | KB-1 | P2     | 卡片信息单薄（仅色点+标题+描述，无标签/成员/日期）；看板高度不填视口；列宽固定导致右侧大片空白；横向滚动条贴窗口底与看板脱节；已完成列首卡悬浮"×"与其它卡不一致。                                                                                                                                                                                          |
| Calendar     | CA-1 | P1     | **打开在 2026-07 而非当前月**（今天 10-01），演示首屏与"今天"无关。                                                                                                                                                                                                                                                                                        |
| Calendar     | CA-2 | P2     | 窄格事件 chip 文字截断到 1-2 字符（"面…"/"调…"），图标配字挤压重叠；资源名列桃色底突兀；周表头英文（Mon/Tue）混中文内容；月网格只占视口上半，下半大片空灰。                                                                                                                                                                                                |
| Pivot Table  | PV-1 | P0     | **主透视表明细单元格全空**：North/South 各季度 Q1–Q3 的 sales/profit 单元格全部空白，只有"小计/合计"行有数。（根因已定位并修复，见 plan `2026-10-01-ux-r2-pivot-detail-cells-plan.md`：`totals.row.subTotalsDimensions` 含 leaf 行维度 quarter 时 VTable 渲染全空明细；渲染器已加 leaf 防御 + warnOnce，demo 收敛为 `['region']`，e2e 增加明细取值探针。） |
| Pivot Table  | PV-2 | P2     | 表右缘出现被截断的幽灵列；Filtered 表 corner 头截断（"cate…"）、progressbar 值 168.4 截断；页内"暗色"开关与全局主题下拉重复（G-2）；说明文字为配置项语言。                                                                                                                                                                                                 |
| Graph Viewer | GR-1 | P1     | Trace Hierarchy 布局未 fitView——图缩在卡片左上角（节点 ~60px 宽不可读），画布 80% 空白。                                                                                                                                                                                                                                                                   |
| Graph Viewer | GR-2 | P2     | Flow 布局相邻节点边渲染成贴身小环，走线不可读；dev 说明文字挂卡片头。                                                                                                                                                                                                                                                                                      |
| Map          | MP-1 | P0     | **区域着色地图全空白**：china-provinces geojson + visualMap 渲染为白板（中央一个小灰点）；自定义边界卡同样空白。（根因已定位并修复，见 plan `2026-10-01-ux-r3-map-render-plan.md`：`readFeatures` 缺投影选项，4326 坐标进 3857 视图塌缩到原点；补投影后中国版图色阶着色正常。）                                                                            |
| Map          | MP-2 | P0     | **Pin 聚合渲染为 3 个纯黑圆点**：无底图/无聚合样式/无标注。整页地图无可辨识地理信息。（黑点根因已修复：`resolveThemeColor` 裸 `var(--token)` 探针对裸 HSL 三元组 token 恒退化黑色，改为读 token 原始值包装 `hsl()`，cluster 气泡恢复主题 accent 蓝并带计数；底图空白为离线瓦片不可达，矢量层离线可见属可接受降级。）                                       |
| Diff View    | DF-1 | P2     | 相对完善（split/inline/行号/折叠/统计齐全）。小问题：新增/删除行行号列空白、demo 内容平淡。                                                                                                                                                                                                                                                                |
| 运营大屏     | OP-1 | P2     | 图表最终能渲染（复核 6s 后面积图/柱状图正常，SVG path 有几何与描边），但首屏 3.5s+ 内只有坐标轴无数据且无 loading 占位；渠道占比卡溢出容器右缘被切。                                                                                                                                                                                                       |
| 运营大屏     | OP-2 | P2     | KPI "104663.7" 无千分位；"今日订单 0" 削弱演示感；页头实现标签 chip（G-4）。                                                                                                                                                                                                                                                                               |

## 5. 根因假设（供修复排期取证）

1. **图表数据断链（DB-1）**：根因已定位——演示面板 series 配置（`data: '${salesSeries}'`）与 source 行结构 `{month, sales}` 不匹配，chart 渲染器 dataKey 回退 `'Sales'` 全 undefined；渲染器 `isEmpty` 判定只覆盖"source 空且 series.data 空"，此形态静默空白。修复见 plan `2026-10-01-ux-r1-dashboard-chart-plan.md`（演示配置纠正 + 渲染器失败路径空态/dev 告警）。
2. **透视表明细为空（PV-1）**：根因已定位——`subTotalsDimensions` 含 leaf 行维度（quarter）触发 VTable 明细全空缺陷（非明细管线问题）；修复见 plan `2026-10-01-ux-r2-pivot-detail-cells-plan.md`。
3. **地图无底图无着色（MP-1/2）**：根因已定位——MP-1 为 readFeatures 缺投影转换（RC-A），MP-2 黑点为 resolveThemeColor 裸 var 探针缺陷（RC-3）；底图空白为离线环境瓦片不可达（环境事实）。修复见 plan `2026-10-01-ux-r3-map-render-plan.md`。
4. **公式不求值（SP-1）**：根因已定位——spreadsheet-core 完全没有公式求值引擎（formula 仅作字符串存储，渲染读 raw value）；修复见 plan `2026-10-01-ux-r4-spreadsheet-formula-plan.md`（最小引擎 + 统一出口重算 + 装载求值 + 提交路由升格）。
5. **Page Designer 空容器不可见（PD-1/2）**：根因已定位——空容器 0×0 rect 同时被 drop 目标解析（`resolveRect` 丢弃）与 overlay 读取跳过，视觉与命中区双双消失；drop 指示器管线本身在案（审计原观察改判）。修复见 plan `2026-10-01-ux-r5-page-designer-canvas-plan.md`（设计器侧空容器投影补最小视觉/命中区 + 根回退提示可辨识化）。
6. **徽章遮挡（G-1）**：徽章 fixed 定位与页面标题区重叠，且无避让/折叠机制；日志计数随 console 噪音膨胀。
7. **迷你地图黑块（FD-1）**：minimap 节点绘制用了无样式的默认 fill（黑）且无视口矩形层。
8. **Gantt 初始视口（GT-1/CA-1）**：数据时间范围与"今天"未纳入默认视口计算；Gantt 汇总条收缩为红线可能是关键路径高亮绘制在高度塌陷的组条上。

## 6. 对标差距摘要（为什么"不如底层技术官网 demo"）

| 维度        | 商业/官方 demo 的默认水准            | 本项目 playground 现状                        |
| ----------- | ------------------------------------ | --------------------------------------------- |
| 首屏内容    | 预置完整示例数据/模板，开箱即见效果  | Report/Word/Code 全空；Spreadsheet 3 个单元格 |
| 数据→渲染   | 图表/透视/地图必然有数据             | 图表空轴、透视明细空、地图白板（3 类 P0）     |
| 拖放反馈    | 拖起有影子、落点有指示、失败有 toast | 多处无指示、失败无反馈、落点错位              |
| 选中反馈    | 画布节点高亮 + inspector 联动        | Flow/TaskFlow 节点无高亮；Page 画布元素不可见 |
| chrome/装饰 | 无调试残留                           | 日志徽章压标题、LIVE 调试块、开发说明大段上墙 |
| 语言        | 单一语言或受控混排                   | 中英混排贯穿字段名/描述/表头                  |

## 7. 修复优先级建议（输入 roadmap）

- **P0（功能硬伤，先行）**：Dashboard Editor 图表渲染断链（DB-1）→ 透视明细（PV-1）→ 地图（MP-1/2）→ 公式求值（SP-1）→ Page Designer 画布可视化（PD-1/2）。
- **P1（交互语义）**：预览模式（PD-4）、选中高亮（FD-2）、Gantt/Calendar 初始视口（GT-1/CA-1）、Gantt 汇总条红线（GT-2）、Dashboard 拖拽反馈（DB-3）、Graph fitView（GR-1）、type-to-edit（SP-2）、SCADA DnD 复核（SC-4）。
- **P2（视觉治理）**：全局徽章/主题开关（G-1/2）、中英混排（G-3）、开发文案下墙（G-4）、迷你地图（FD-1）、大纲树对比度（PD-3）、各页 polish。
- **P3（内容充实）**：各演示页预置示例数据/模板、KPI 千分位、卡片信息密度。
