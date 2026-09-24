# [card] control:chart

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/chart` ｜ **载体**: lab 页（MultiScenarioLabPage，8 场景：Bar / Line / Area / Stacked bar / Custom colors+grid off / Legend toggle 单系列 / Heatmap 自绘网格 / Host 数据流+空态）
- **矩阵裁剪**: simplified（matrixReason：Recharts SVG 渲染（非 canvas），无输入值态/disabled 态；裁掉的状态：glass 皮肤、pie/scatter 类型（fixture 未含）、brush/referenceLines/band/markers 附加能力（fixture 未触发）、`loading` prop 态（fixture 未演示——首帧空白问题见 A5 注记）；已覆盖 light+dark（真 data-mode）、1280+800 双视口、数据换批（Update data）、空态（Clear data → empty 插槽）、图例开（legend:true））
- **探针**: `_tmp/r2-2b-probes/w3-chart.mjs`（主探针：C6 SVG/容器几何 + 空态 + 换批，`out-w3-chart.json`）、`probe-chart2.mjs`（DOM dump + 溢出甄别）、`probe-chart3.mjs`（dark tick fill + 图例几何，`out-w3-chart3.json`）、`probe-chart4.mjs`（轴标签/图例序/heatmap 结构，`out-w3-chart4.json`）、`probe-chart5.mjs`（bars 出现时序 + settled 复拍）
- **探针方法注记**: ①首帧存在"空绘图"竞态：首跑 light 默认截图捕获到仅有轴/图例无柱的中间帧（gotoLab 固定 500ms 后），复跑探针 bars 于 29ms 出现、2.2s 后稳定 12 柱——走查截图须待稳定帧；②recharts tick/legend 类名为 `recharts-cartesian-axis-tick-value` / 自定义 flex 结构，非 `recharts-legend-item`；③溢出扫描命中均为 `sr-only` a11y 数据等价表（`chart-data-equivalent`，clientW 1px），误报排除

## 1. 截图清单

| 状态                                      | light                                                                  | dark（真 data-mode）                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280（首帧：空绘图中间态，竞态证据） | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/default-1280-light.png` | —                                                                          |
| 稳定帧 1280                               | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/bar-light-settled.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/default-1280-dark.png`      |
| 默认 800×900                              | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/default-800-light.png`  | —（窄视口仅 light 复跑）                                                   |
| dark 图例/轴区特写                        | —                                                                      | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/bar-dark-legend-zone.png`   |
| Host 换批后（Gamma/Delta）                | —                                                                      | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/host-swapped-1280-dark.png` |
| 空态（Clear data → 暂无数据）             | —                                                                      | `_tmp/visual-inspection-2026-09-24/r2-2b/chart/host-empty-1280-dark.png`   |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（图表非交互控件；tooltip 未逐场景触发——recharts 原生 tooltip，heatmap 原生 title）**A5 warn（注记）**：empty=empty 插槽渲染"暂无数据"（hasSvg false，bars 0，非空白壳 ✓）；loading=`loading` prop 存在（L122）但 fixture 未演示，且首帧存在无 loading 指示的空绘图中间态（竞态窗口数百 ms，见 R2-2b-A5-92 watch 注记）A6–A9 n/a/pass（Update data 换批生效：bars 2→2、标签 Alpha/Beta→Gamma/Delta——非静默）
- B 颜色：B1 pass（light tick #666 on 白 5.7:1）B2 n/a B3 pass（系列色蓝/红为图表调色板非状态语义；heatmap 单色 `--chart-1`）B4 pass（系列色走 `--chart-1..5` 令牌；**tick 灰为 recharts 默认字面色 #666，非令牌**——并入 R2-2b-B5-89）**B5 fail(R2-2b-B5-89)**（dark 轴刻度文字仍 #666 ≈3.1:1 <4.5:1；网格线 dark 不可见）B6 n/a
- C 布局：C1 pass（docOverX 0；sr-only 等价表溢出为有意隐藏，误报排除）C2 pass（**图例不遮轴**：legend top 638 > x 轴刻度 bottom 614，gap 24px 实测）C3 pass C4 pass（800 视口 533×300 等比缩放不塌）C5 pass **C6 pass**（SVG `getBoundingClientRect` 711×400 vs 容器 711×400，wDelta −0.1/hDelta 0；800 视口同过——SVG 自适应无拉伸）
- D 间隔：D1 pass（图例项 gap-4/grid gap 令牌）D2–D8 n/a/pass
- E 排布：E1 pass（标题/轴/图例三问可答）E2 pass E3 pass **E4 fail(R2-2b-F1-91)**（图例顺序与系列声明/柱组排列相反，见条目）E5 n/a E6 pass（空态有"暂无数据"提示）
- F 一致性：F1 **fail(R2-2b-F1-91)**（图例序反）F2–F3 pass（8 场景图例/轴模式同构；heatmap 为自绘 div 网格结构另格）F4 **warn**（i18n 族：空态"暂无数据"= `t('flux.common.noData')` zh-CN 回退，R2-2a-F4-11 族实例）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-B5-89] dark 下图表轴刻度文字为 recharts 默认字面 #666（≈3.1:1 <4.5:1）、网格线不可见——dark 平价族图表轴实例

- **页面/路由**: `#/lab/chart`（场景 1 Bar / 全部直角坐标场景同险：line/area/stacked/custom/host）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 稳定帧
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/chart/default-1280-dark.png`（x 轴 Jan–Jun 与 y 轴 0–8000 刻度暗灰发闷）；`bar-dark-legend-zone.png`
- **目视描述**: dark 下轴刻度文字仍是浅灰 #666，在深底上对比度不足；light 下的浅灰网格线（CartesianGrid 默认 #ccc 系）在 dark 下不可见，绘图区失去网格参照。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-chart3.mjs`（SVG text computed fill）
  - 输出: dark tick `fill: "rgb(102, 102, 102)"`（与 light 完全同值）——recharts 未收到主题化 tick prop 时回退内部默认 #666；`packages/flux-renderers-data/src/chart-renderer.tsx` 未传 `tick`/`axisLine` 主题色（grep 无 #666 字面，库默认）。对 dark 页底 rgb(15,20,27) 对比度 ≈3.09:1 < 4.5:1（11–12px 小字）。`gridStroke: "none"`（dark 下网格线无效/不可见）。
- **对照基准**: WCAG 1.4.3；已知族"dark 平价/对比度族（R2-4，chart dark 轴/图例为高危面）"
- **严重程度**: P2（轴刻度是图表主信息；dark 全场景受影响，高频数据面板路径）
- **用户影响**: dark 主题下读图需要费力辨认轴标签；网格缺失使数值估计失去参照。
- **修复方向**: chart-renderer 为 XAxis/YAxis 传主题化 `tick={{ fill: 'hsl(var(--muted-foreground))' }}` 与 `axisLine`/`tickLine` 令牌色；CartesianGrid `stroke` 换 `--border` 令牌（dark 自动可见）。收敛后 B5 复检。
- **归族**: systemic → dark 平价/对比度族（R2-4）图表轴实例
- **复核状态**: 已复核（保留 P2，根因修正，review-b 2026-09-24）：dark tick 3.27:1；根因=ui/chart.tsx 主题化选择器与 recharts 3.8.1 DOM 空匹配；"网格线不可见"证伪（--border/50 有渲染，弱可见）

### [R2-2b-F1-91] 图例顺序与系列声明/柱组排列相反（schema Revenue, Expenses → 图例 Expenses, Revenue）

- **页面/路由**: `#/lab/chart`（场景 1 Bar / 双系列场景 line/area/stacked 同险）
- **主题/视口/状态**: 双主题 / 1280 / 稳定帧
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/chart/bar-light-settled.png`（柱组左蓝(Revenue)右红(Expenses)；图例从左到右 Expenses、Revenue）
- **目视描述**: 柱组内 Revenue 恒在左、Expenses 在右（与 series 声明序一致），但图例条目顺序相反，读图者按图例序对应柱序会错位。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-chart5.mjs`（图例 DOM 序 + 柱 fill 序）
  - 输出: `legendOrder: ["Expenses", "", "Revenue", ""]`；`barFills L→R: rgb(60,131,246)×6（Revenue=palette[0]）→ 红×6（Expenses=palette[1]）`；schema `series: [Revenue, Expenses]`。shadcn ChartLegendContent 的 payload 顺序与 Bars 子序不一致（疑似 config 键序或 payload 反转），根因需组件级复核。
- **对照基准**: 检查提示词 E4/F1（图例序与数据序一致）；Recharts 惯例（legend 序 = children 序）
- **严重程度**: P3（错位对照会造成读图误判，但双系列样本下颜色仍可区分）
- **用户影响**: 系列多、颜色接近时按图例序读柱会拿反结论；stacked 图中影响叠加层判读。
- **修复方向**: `chart-renderer.tsx` 给 `ChartLegend` 显式 `payload`（按 seriesList 序构造）或核对 ChartLegendContent 的 payload 映射序；stacked 场景同步验证 stackId 叠放序与图例序一致。
- **归族**: local → R2-4 批（chart 图例序单点）
- **复核状态**: 未复核

### [R2-2b-F4-90] xAxis.label / yAxis.label 声明后从未渲染：轴标题 prop 静默丢弃——schema 契约缺口族实例

- **页面/路由**: `#/lab/chart`（场景 1 Bar，schema `xAxis: { dataKey: 'month', label: 'Month' }, yAxis: { label: 'Amount ($)' }`）
- **主题/视口/状态**: 双主题 / 1280 / 稳定帧
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/chart/bar-light-settled.png`（图上无 "Month"/"Amount ($)" 轴标题）
- **目视描述**: lab 场景描述强调 "configured axes"，但图表只有刻度值，无任何轴标题文字；y 轴单位 ($) 信息完全丢失。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-chart4.mjs`
  - 输出: SVG 全部 text = `[Jan..Jun, 0..8000]`，无轴标题；`hasAmount: false`（全场景 DOM 无 "Amount"）。源码 `chart-renderer.tsx` L111 `xAxis` 仅取 `dataKey`（`const xKey = xAxis?.dataKey`），`label` 无消费点；`chart-y-axis.ts` 解析出 `label` 后渲染层未接。
- **对照基准**: 已知族"schema 契约缺口（R2-3 候选）"；Recharts XAxis/YAxis label 能力
- **严重程度**: P3（信息缺失但读图可用；y 轴单位丢失会造成数值口径歧义）
- **用户影响**: schema 作者写了轴标签不出，读者不知道 y 轴是金额还是数量。
- **修复方向**: chart-renderer 渲染 XAxis `label={{ value: xAxis.label, position: 'insideBottom' }}`、YAxis 同理（或自绘轴标题以控制 dark 配色——与 R2-2b-B5-89 一并处理）。
- **归族**: systemic → schema 契约缺口族（R2-3 候选）
- **复核状态**: 已复核（保留 P3，根因精化，review-b 2026-09-24）：label 绑 recharts name= prop（tooltip/aria 用），非无消费点

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退族**（R2-2a-F4-11）：空态文案"暂无数据"（`t('flux.common.noData')`）中文实例。
- **lab 载体与环境基建族**：scope-debug 面板随载体出现；runner dark 声明适用（本卡 dark 全部自采真 data-mode）。
- **计划内锚点复检通过**：C6 SVG/容器尺寸零偏差（1280 与 800 双视口）；图例不遮轴（gap 24px）；custom colors（#6366f1/#ec4899）+ grid:false 生效；legend:true 单系列强制图例生效；host 换批（Update data）与空态（Clear data）链路成立；heatmap 自绘网格含单元格文本+原生 tooltip+主题色变量注入。
- **watch 注记（R2-2b-A5-92，未立案）**：首帧空绘图中间态（ResponsiveContainer 测量竞态窗口，首跑 500ms 处仍无柱）无 loading 指示遮盖——建议走查与 e2e 断言一律等待 `.recharts-bar-rectangle` 出现；渲染器 `loading` prop 可为此提供 Spinner，fixture 未演示，列入 R2-2 后续波次复检候选。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-chart` → carded（卡列填本路径）；findings 归族后 → digested。
