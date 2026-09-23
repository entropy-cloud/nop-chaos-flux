# [card] page:dashboard-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/dashboard-demo` ｜ **载体**: 域页面（Dashboard Editor：palette + canvas + inspector 三段壳层 + editor-core undo/redo/commit + 网格拖拽/缩放/吸附）
- **矩阵裁剪**: simplified（matrixReason：页面无 Dialog/Sheet/Drawer → H 全列 n/a；无异步 loading/empty/error 面（面板数据为同步内联 data）→ A5 仅静态核；编辑器无缩放控件 → G5 n/a；G6 undo/redo 已做"拖放后撤销可用"单向验证，未做完整回退视觉对比；窄视口仅 800px 一档）
- 本页实际裁掉的状态：弹层打开、loading/empty/error、G5 缩放、G6 完整 undo 视觉对比、glass 皮肤

## 1. 截图清单

| 状态                         | light                                                                                                                                               | dark                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 默认 1280×800                | `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-clean-light.png`（净 localStorage 复拍）／首拍 `dashboard-demo-default-light.png` | `dashboard-clean-dark.png` ／ `dashboard-default-dark.png` |
| 默认 ~800 宽                 | `dashboard-clean-narrow-light.png`（`dashboard-narrow-light.png` 为误标 dark 态）                                                                   | `dashboard-narrow-dark.png`                                |
| 选中面板（G1/G7）            | `dashboard-select-light.png`                                                                                                                        | `dashboard-select-dark.png`                                |
| 拖拽进行中（A6）             | `dashboard-dragmid-light.png`（前态 `dashboard-predrag-light.png`）                                                                                 | —（light 已坐实，dark 未重跑）                             |
| 拖放落位后                   | `dashboard-postdrop-light.png`                                                                                                                      | —                                                          |
| Preview 运行态               | `dashboard-preview-light.png`                                                                                                                       | —                                                          |
| hover/focus-visible/disabled | 未单独截图（按钮为 shadcn ui 组件族，静态核 pass；toolbar disabled 三键 opacity .5 + disabled 属性已程序化核过，A4 pass）                           | 同左                                                       |

注意：探针运行期间 drag-save 曾向 `localStorage.flux-dashboard-layout` 写入脏布局，后续复拍用 `localStorage.clear()` 净态（`dashboard-clean-*` 系列）；脏态截图（`dashboard-demo-default-light.png` 等）仅作过程参考。

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（shadcn focus 族）A3 pass（palette/toolbar ≥28px）A4 pass（撤销/重做/删除 disabled+opacity.5 程序化核实）A5 n/a A6 **fail(R2-1c-A6-01)** A7 n/a A8 pass（inspector 表单提供非拖拽替代：X/Y/宽/高可直接输入）A9 pass（拖放后面板数 2→3、撤销钮变可用）
- B 颜色：B1 pass B2 pass B3 **fail(R2-1c-B3-01)** B4 pass（chart 走 `--color-Sales` 令牌；按钮 variant 正常）B5 pass（壳层 dark 平价 OK，`dashboard-select-dark.png` 全 dark 令牌化，无纯白块）B6 pass（delta up=success 绿、删除钮 destructive 红）
- C 布局：C1 **fail(R2-1c-C1-01)** C2 **fail(R2-1c-C2-01)** C3 warn（P3：1280 下 canvas 列仅 ~530px，三段壳层挤压主内容）C4 warn（800px 壳层不折叠 → 并入已知 R2-3c 候选族，不另立）C5 pass C6 **fail(R2-1c-C6-01)**
- D 间隔：D1 pass（壳层 gap-3/12px 栅格）D2–D5 pass D6 n/a（table 面板自带分页条因 C1 裁切不可达，不重复计）D7 pass D8 pass
- E 排布：E1 warn（P3：首屏主视觉是全宽 Back 按钮与空图表，"这页能干什么"要读到编辑器才可答）E2 warn（P3-R2-1c-E2-01）E3 pass E4 pass E5 pass E6 pass（面板拖空后 empty 提示存在）
- F 一致性：F1 pass F2 pass（三段壳层与设计器域惯例一致）F3 pass F4 pass F5 n/a
- G 设计器：G1 pass（选中框+蓝边+删除钮+inspector 双向同步）G2 pass（面板/手柄 cursor 变化）G3 **fail(R2-1c-G3-01)** G4 pass G5 n/a G6 warn（undo 可用已验证、回退视觉未逐帧核）G7 pass（选中→inspector 同步实测）G8 pass（dark 全量复检）
- H 弹层：n/a（全列）

## 3. 发现条目

### [R2-1c-C6-01] 图表面板零图形内容且 SVG 溢出容器 2.2 倍

- **页面/路由**: `#/dashboard-demo`（默认布局 chart-sales 面板；编辑态与 Preview 态一致）
- **主题/视口/状态**: light+dark / 1280×800 / 默认进入即可复现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-clean-light.png`（chart 面板仅见孤立的轴线片段与虚线网格）
- **目视描述**: Sales Trend 面板内看不到任何折线/数据点/图例色块，只有一段竖直轴线被面板边缘裁断。
- **程序化证据**:
  - 探针: `document.querySelector('.nop-chart svg')` 属性与子元素扫描 + recharts 结构探测
  - 输出: `svg width="533" viewBox="0 0 533 300"`，而面板 body 仅 242px 宽（面板 rect 260px）→ 溢出 291px 被 overflow-hidden 裁切；`svgChildren` 有 12 层 recharts zIndex 层、`innerHTML.length=6093`，但 `.recharts-line/.recharts-bar/.recharts-pie` 均不存在（series 几何为 0），仅 legend 文本 "Sales" 渲染。Preview 态复测相同（0 series paths）。
- **对照基准**: 检查提示词 C6（canvas/SVG 尺寸与容器一致，非写死宽高导致拉伸/裁切）；styling-system.md 渲染契约（组件应实测容器宽）。
- **严重程度**: P1（核心演示内容不可见，高频首屏路径）
- **用户影响**: BI 看板唯一图表在任何状态都不可读，用户会认为功能损坏；溢出未被裁掉的部分还会与相邻面板视觉打架。
- **修复方向**: `packages/flux-renderers-data/src/chart-renderer.tsx` 的 ResizeObserver 观测节点（`chartNode`）与 ResponsiveContainer 实际宽度不一致——应观测真实面板容器并让 svg width 跟随（533 是外层画布宽而非面板宽）；同时校验 `series[].data` 绑定（`'${salesSeries}'` 求值后形状 vs recharts 期望），series 缺失时应渲染空态而非空白 svg。
- **归族**: systemic → R2-3 批（chart-renderer 为跨域共享组件，C6 尺寸测量缺陷可复用到所有内嵌 chart 场景）
- **复核状态**: 未复核

### [R2-1c-A6-01] palette 拖拽进行中无 ghost、无 drop-target 反馈

- **页面/路由**: `#/dashboard-demo`（编辑态，palette → canvas 拖拽）
- **主题/视口/状态**: light / 1280×800 / mouse 拖拽进行中（palette "统计卡" → canvas 70%,70%）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-dragmid-light.png`
- **目视描述**: 拖拽中只有源 palette 项文字变灰，画布上没有任何跟随指针的 ghost、没有目标高亮/插入指示/吸附预览，画布与拖拽前截图肉眼无差别。
- **程序化证据**:
  - 探针: 拖拽中截帧 + `[class*="ghost"],[class*="dragging"],[class*="drop"],[data-drop],[data-dragging]` DOM 扫描
  - 输出: 扫描仅命中 debugger 浮层（`fixed right-3 bottom-3`），无任何 ghost/drop-indicator 元素；拖拽中帧与拖拽前帧画布区域无新增元素。
- **对照基准**: NN/g 拖放 UX（落位必须有清晰 drop-target 反馈、ghost 跟手）；检查提示词 A6/G3。
- **严重程度**: P2（缺失的视觉反馈；拖放功能本身可用，落位见 R2-1c-G3-01）
- **用户影响**: 用户拖拽时无法判断"会不会放、放到哪"，松手前零确认感；对初次使用者拖拽像失效。
- **修复方向**: dashboard-editor 拖拽链路补 ghost（跟随指针的面板类型预览）与网格落点高亮（hover 格子描边），可复用 editor 现有 grid 数学（`layout-math.ts`）计算预览落点。
- **归族**: systemic → R2-3 批（与设计器域拖拽反馈族同模式）
- **复核状态**: 未复核

### [R2-1c-G3-01] palette 落位吸附到网格原点并与既有面板重叠

- **页面/路由**: `#/dashboard-demo`（编辑态拖放释放后）
- **主题/视口/状态**: light / 1280×800 / 释放于画布 70%,70% 位置
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-postdrop-light.png`
- **目视描述**: 松手后画布上看不到新增面板（被压在 Revenue 卡下方），inspector 显示新面板 panel-5 落在 X:0 Y:0。
- **程序化证据**:
  - 探针: 释放后 DOM 计数 + inspector 字段读取
  - 输出: `.nop-stat-tile` 数量 2→3（落位成功、撤销钮转可用），但新面板 X=0 Y=0 宽3 高2 —— 与 kpi-revenue（x:0 y:0 w:3 h:2）完全同格重叠；指针实际落点约为画布 70%,70%（应为第 8-9 列、第 3-4 行区域）。既无指针位置吸附，也无碰撞下推/寻位。
- **对照基准**: NN/g 直接操作（落位应可预期）；网格编辑器惯例（Grafana/墨刀等落点=指针附近空位或碰撞规避）。
- **严重程度**: P2
- **用户影响**: 用户新增面板后"面板消失了"，实际叠在既有面板下；需要再拖一次才能用，编辑可信度受损。
- **修复方向**: `packages/flux-renderers-dashboard/src/editor/` 落位算法：按指针网格坐标定位；目标格被占时顺序寻位（先右后下）而非默认原点；与 R2-1c-A6-01 的落点预览一并修。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-B3-01] stat-tile delta 对象形式不渲染，负增长信号丢失

- **页面/路由**: `#/dashboard-demo`（默认布局 kpi-orders 面板；净 localStorage 复验）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-clean-light.png`（Orders 卡只有数值无 delta 徽标，对照 Revenue 卡 ↑+12.5% 绿徽标）
- **目视描述**: Revenue 卡显示绿色上升 delta，Orders 卡（schema 声明 `delta:{value:-3.2,direction:'down'}`）没有任何 delta 徽标——下降信号完全不可见。
- **程序化证据**:
  - 探针: `[...document.querySelectorAll('.nop-stat-tile')].map(e=>e.textContent)`
  - 输出: `["1284300+12.5%", "8642"]` —— delta 为纯数字的渲染 "+12.5%"，对象形式整块缺失；`localStorage.clear()` 后复载仍复现，排除脏布局。
- **对照基准**: 检查提示词 B3/B6（状态语义完整：红=负、绿=正）；`stat-tile-renderer.tsx` 的 `resolveDelta` 本身支持对象形式（75-100 行），断点在面板 fragment props 深层对象传递（`buildPanelFragment` props 经表达式求值后嵌套对象疑似被丢弃）。
- **严重程度**: P2（关键业务信号——负增长——静默丢失）
- **用户影响**: 看板用户看不到 Orders 下降 3.2%，可能完全错过负向趋势；属数据正确性级别的展示缺陷。
- **修复方向**: `flux-renderers-dashboard/src/dashboard-renderer.tsx` `buildPanelFragment`：props 深层对象应在求值时保留结构（仅对字符串叶子做表达式求值），或 demo schema 改用 label 平铺形式规避；修复后补对象 delta 回归测试。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-C1-01] table 面板内容 382px 塞 242px 容器，Status 列裁切不可达

- **页面/路由**: `#/dashboard-demo`（默认布局 table-orders 面板）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-clean-light.png`（Status 列被面板右缘裁成 "Pa i"/"Per"）
- **目视描述**: 表格第四列 Status 从"Paid/Pending"裁到只剩 1-2 个字母，且无横向滚动条。
- **程序化证据**:
  - 探针: `.nop-table` scrollWidth/clientWidth + 内层 table 宽度
  - 输出: `scrollW:382, clientW:242, inner table w:285.5, clipped:true`；列头宽 73/72/70/70px。面板 `overflow-hidden` 且内层未启用横向滚动 → 被裁数据无程序化可达路径。
- **对照基准**: 检查提示词 C1（画布被裁/文本溢出容器）；数据密集面板最小可读性。
- **严重程度**: P2
- **用户影响**: 订单状态列在本页完全不可读；演示用户会直接质疑表格组件质量。
- **修复方向**: 面板 body 内层开 `overflow-x:auto`（面板级滚动），或 table 列宽自适应压缩 + 溢出省略号；demo schema 可将 table 面板 w 提到 8。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-C2-01] 选中面板后删除钮与数值文本重叠

- **页面/路由**: `#/dashboard-demo`（编辑态，点击选中 kpi-revenue）
- **主题/视口/状态**: light+dark / 1280×800 / 选中态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-select-light.png`（⊗ 压住 "1284300" 末位数字）
- **目视描述**: 126px 宽的 KPI 卡内，`text-3xl` 数值顶到卡片右缘，浮动删除按钮 ⊗ 直接盖在最后一个数字上。
- **程序化证据**:
  - 探针: [visual-only]（tile 126×88、value `text-3xl` 与 absolute 右上 ⊗ 的 rect 求交目视可判，未留探针脚本——复核时用 `getBoundingClientRect` 求交即可复验）
  - 输出: 截图可见末位 "0" 被半透明 ⊗ 覆盖。
- **对照基准**: 检查提示词 C2（浮层压内容/标签压控件）。
- **严重程度**: P3（编辑态瞬时重叠，数值仍大体可读）
- **用户影响**: 选中编辑时数值读数受干扰；不阻断任务。
- **修复方向**: 选中态为 value 行预留右上角 padding-right（如 `pr-6`），或 ⊗ 移出内容流（面板边框外角）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-E2-01] 全宽 primary "Back to Home" 压过编辑器主操作层级

- **页面/路由**: `#/dashboard-demo`（页面顶部）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/dashboard-demo/dashboard-clean-light.png`
- **目视描述**: 返回导航按钮以 1102×32px 全宽 primary 蓝条横贯页面，视觉强度超过编辑器工具栏的 保存/预览。
- **程序化证据**:
  - 探针: back 按钮 rect 测量
  - 输出: `backBtn: {w:1102, h:32}`（variant=default/primary）。
- **对照基准**: 检查提示词 E2（主操作 variant 强于次操作）；styling-system.md Dialog/Form Action 惯例（导航≠主操作）。
- **严重程度**: P3
- **用户影响**: 首屏视觉动线被导航条截胡，主任务（编辑看板）层级后移；不阻断。
- **修复方向**: demo schema 该按钮改 `variant="outline"` + `w-fit`（或移入工具栏左侧）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本卡路径）；
  findings 归族：C6-01/A6-01 → systemic（R2-3）；G3-01/B3-01/C1-01/C2-01/E2-01 → local（R2-4）；C4 窄视口 → 已知 R2-3c 候选族并入；
  批内复检通过后 → `verified`。
