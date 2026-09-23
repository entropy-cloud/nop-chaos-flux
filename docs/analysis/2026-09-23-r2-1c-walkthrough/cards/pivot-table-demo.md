# [card] page:pivot-table-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/pivot-table-demo` ｜ **载体**: 域页面（VTable PivotTable：Sales Pivot 全量配置卡 + Filtered 过滤/progressbar 卡 + Empty 空态卡）
- **矩阵裁剪**: simplified（matrixReason：页面无弹层 → H n/a；非画布设计器 → G n/a；demo 页为三张静态配置卡，**未暴露行列维度切换/排序/过滤的运行时交互 UI**（均为 schema 配置态），故"维度切换中间态"不可程序化触达 → 裁剪，E2/E4 按"汇总行/列层级可读性"口径执行；分页器无 → D6 n/a）
- 本页实际裁掉的状态：弹层、维度切换中间态、glass 皮肤、hover/focus 抽样（canvas 内部由 VTable 接管指针，DOM 无可强制态）

## 1. 截图清单

| 状态                             | light                                                                                         | dark                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 默认 1280×800                    | `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-table-demo-default-light.png` | `pivot-default-dark.png`                                             |
| 默认 ~800 宽                     | `pivot-narrow-light.png`                                                                      | `pivot-narrow-dark.png`                                              |
| 分卡截图（Sales/Filtered/Empty） | `pivot-card0-light.png` `pivot-card1-light.png` `pivot-card2-light.png`                       | `pivot-card0-dark.png` `pivot-card1-dark.png` `pivot-card2-dark.png` |
| canvas 像素级转储（判据用）      | `pivot-canvas0-light-dump.png`（Sales Pivot）、`pivot-canvas1-light-dump.png`（Filtered）     | —（dark 转储未做，dark 判据用整页截图）                              |
| hover/focus/disabled/loading     | n/a（canvas 渲染 + 无异步态）                                                                 | —                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（canvas 接管指针，无 DOM hover 面）A2 pass（页头按钮 focus 族正常）A3 pass（主题切换钮、返回钮 ≥24px）A4 n/a A5 pass（Empty 卡 "暂无销售数据" 意义明确非空白）A6 n/a（无拖拽）A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass（页头/卡片文本对比度正常）B2 pass B3 n/a（无状态色语义面）B4 pass（progressbar 蓝 = 主题色）B5 **fail(R2-1c-B5-01)** B6 n/a
- C 布局：C1 **fail(R2-1c-C1-01)**（内容正确性级别）C2 pass C3 pass（双列网格 1280 合理）C4 pass（800px 单列折叠正常，见 `pivot-narrow-light.png`）C5 pass C6 pass（canvas.width/height vs clientRect×DPR 精确一致：1168/584=2.0、840/420=2.0）
- D 间隔：D1 pass（卡片间距 gap-4=16px 栅格）D2–D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 **warn(R2-1c-E2-01)** E3 pass E4 **warn(R2-1c-E4-01)** E5 pass E6 pass（空态有引导文案）
- F 一致性：F1 pass F2 pass F3 pass（Empty 卡空态模式与 map/graph 页一致："暂无…"文案居中）F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-C1-01] Sales Pivot 明细单元格全部空白，仅小计行有值

- **页面/路由**: `#/pivot-table-demo`（Sales Pivot 卡：region×quarter 行 / category 列 / sales+profit 指标）
- **主题/视口/状态**: light / 1280×800 / 默认进入即可复现（dark 同样空白）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-canvas0-light-dump.png`（canvas 像素级转储）、整页 `pivot-table-demo-default-light.png`
- **目视描述**: North/South 各 Q1/Q2/Q3 明细行的销售额/利润单元格全部为空，只有"小计"行显示 4050/810/2800/515 等聚合值。
- **程序化证据**:
  - 探针: canvas `toDataURL` 全量转储 + 页面 DOM（`.nop-pivot` 无滚动裁切，scrollW=clientW=584）
  - 输出: 转储 PNG 逐格目检确认明细格 0 字形；数据源 `SALES_RECORDS` 24 条记录 sales 均 >500（过滤规则 sales>500 不应吞掉任何明细）；控制台无 error/warn（`r2-1c-map-probe` 同款监听未见 pivot 相关告警）。小计/总计走 `aggregationRules` 正常，明细体格走 VTable body 渲染为空。
- **对照基准**: 检查提示词 C1/内容正确性；P0 定义"关键信息不可读"的邻域——透视表核心产出（明细×指标交叉值）缺失。
- **严重程度**: P1
- **用户影响**: 透视表只能看汇总不能看明细，分析任务（定位哪个季度/品类贡献了小计）无法完成；默认配置下功能不可用。
- **修复方向**: `packages/flux-renderers-pivot/src/pivot-option.ts` 构建 VTable options 处：核查 `records` + `aggregationRules` 传入 VTable PivotTable 时明细体格的取数路径（怀疑 indicators `field` 与 body cell 取值键不匹配或 `dataConfig.sortRules/filterRules` 归一化后吞掉 records 映射）；补"明细非空"回归测试（现有 `pivot-renderer.test.tsx` 未覆盖明细格数值）。
- **归族**: local → R2-4 批（单组件根因；若 R2-1a/b 域表格页有同症状可升 systemic）
- **复核状态**: 未复核

### [R2-1c-B5-01] dark 模式下透视表画布恒白，与宿主主题断裂

- **页面/路由**: `#/pivot-table-demo`（Sales Pivot / Filtered 两张数据卡）
- **主题/视口/状态**: dark（`data-mode=dark`） / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-default-dark.png`
- **目视描述**: 切 dark 后页头/卡片壳层变暗，但两张 pivot 画布仍是整块白底黑字，卡片内形成刺眼白块；Filtered 卡白块中表格只占左侧 40%，右侧全白空洞。
- **程序化证据**:
  - 探针: `data-mode=dark` 切换后整页截图 + 壳层 computed style（卡片壳已 dark，画布白底未变）
  - 输出: VTable canvas 背景保持白色；`pivot-option.ts` 存在 schema `theme` 合并通道（`defaultStyle/headerStyle/bodyStyle`）但未随 `data-mode` 注入 dark 主题。
- **对照基准**: 检查提示词 B5 dark 平价（dark 专有缺陷：纯白底块）；注意误报红线"纸面恒白"仅适用打印/报表/文档类并有 design.md 明文——BI 数据网格不属纸面语义，不豁免。
- **严重程度**: P2
- **用户影响**: dark 用户看到高亮白块、视觉断裂刺眼；与同页壳层的暗色令牌冲突。
- **修复方向**: `pivot-option.ts` / `pivot-renderer.tsx` 读取宿主 `data-mode`（或 CSS 变量采样）注入 VTable dark 主题预设（VTable 内置 dark theme），并允许 schema `theme` 覆盖合并（通道已在）。若 R2-4 dark 平价族已有同根因项（canvas 型组件主题不随 data-mode），并入该族统一修。
- **归族**: systemic → R2-4/R2-3 dark 平价族（canvas 型组件主题不随宿主 data-mode，graph/map 页 canvas 同为候选）
- **复核状态**: 未复核

### [R2-1c-E2-01] 角头区存在无标题空列，行/列维度层级阅读被截断

- **页面/路由**: `#/pivot-table-demo`（Sales Pivot 卡，`cornerTitleOnDimension: 'all'`）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-canvas0-light-dump.png`（季度列与 Electronics 列之间 ~160px 全空白带格线的列）
- **目视描述**: 表头第二行"地区 | 季度 | (空白) | 销售额 | 利润 | …"——维度列与指标列之间有一条无任何标题的空列贯穿全部行；且角头只标了"品类"，指标轴（销售额/利润的父级）无轴标题。
- **程序化证据**:
  - 探针: canvas 转储逐区目检（header 行 2 的第三格为空白带边框格，数据行同位置为无边框空带）
  - 输出: 空列约占画布宽 13%（160/1168 背板像素），导致首屏 Electronics 组被推出可视区。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致）、E4（同列元素对齐/分组可辨识）；VTable corner 配置惯例（indicator 轴应可标注）。
- **严重程度**: P3
- **用户影响**: 首次阅读会困惑空列用途；宽度浪费使列合计需要横向滚动才能看到。
- **修复方向**: `pivot-option.ts` corner/indicators 轴配置：为指标维度列补标题（如"指标"）或压缩该轴列宽；`cornerTitleOnDimension` 语义核对。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-E4-01] 数值单元格左对齐、小计行无视觉强化

- **页面/路由**: `#/pivot-table-demo`（Sales Pivot / Filtered 卡）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-canvas0-light-dump.png`、`pivot-card1-light.png`
- **目视描述**: "4050/810/2800" 等数值全部左对齐贴格左 padding；"小计"行与明细行字重、底色完全一致，扫读时无法快速跳到汇总。
- **程序化证据**:
  - 探针: canvas 转储目检（数值字形起点 = 格左 padding 位；小计行与明细行字形粗细一致）
  - 输出: 无右对齐迹象；无粗体/底色差异。
- **对照基准**: 检查提示词 E4（数字右对齐惯例）、E2（关键数字强于标签）；数据表格行业惯例（Excel/BI 均数值右对齐 + 汇总行加粗）。
- **严重程度**: P3
- **用户影响**: 多位数字对比读数慢；汇总定位靠逐行扫读。
- **修复方向**: `pivot-option.ts` bodyStyle/indicator 列配置：指标列 `textAlign: right`；totals 行 `fontWeight: 600` + 底色 `--muted`。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-C1-02] Filtered 卡 AVG progressbar 列宽不足，指标值截断且进度条不可比

- **页面/路由**: `#/pivot-table-demo`（Filtered 卡：AVG profit + cellType progressbar）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/pivot-table-demo/pivot-card1-light.png`、`pivot-canvas1-light-dump.png`
- **目视描述**: 利润列 South 行显示 "168.…."（168.75 被省略号截断）；progressbar 仅渲染为单元格底边一条蓝色细线，四行条长几乎无差别，无法横向比较。
- **程序化证据**:
  - 探针: canvas 转储 + `pivot-canvas1` 尺寸（1168×520 vs 容器 584×260，DPR 精确）
  - 输出: 利润列宽 ~90px 容不下 "168.75"+进度条；条高 ~3px 且长度与值（270/168.75/320/202.5，min~max 跨度大）不成比例。
- **对照基准**: 检查提示词 C1（文本溢出）、D3（数据密集面可读性）；progressbar 组件惯例（进度条应占格高的主要视觉）。
- **严重程度**: P3
- **用户影响**: AVG 值读不全、进度比较失效；progressbar 形同虚设。
- **修复方向**: progressbar cellType 渲染参数（bar 高度、值区宽度）在 `pivot-option.ts` 指标列配置中放开并给默认合理值（bar 高 ≥6px、值区右移或上下排布）。
- **归族**: watch-only → watch-pool.md（与 summary/watch-pool 终裁对齐）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本卡路径）；
  findings 归族：B5-01 → systemic（dark 平价族，与 R2-4 台账对齐）；C1-01/E2-01/E4-01 → local（R2-4）；C1-02 → watch-only（watch-pool）；
  批内复检通过后 → `verified`。
