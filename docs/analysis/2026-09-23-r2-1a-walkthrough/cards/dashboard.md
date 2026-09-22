# [card] page:dashboard

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/dashboard` ｜ **载体**: complex-page（数据可视化域，6 data-source 并行 + 6 KPI 卡 + 3 图 + 2 表）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；A4/A6/A7/A8/A9 n-a——本页无 disabled 控件/拖拽/弹层/写操作；D5/D6 n-a——无表单、分页已关闭；empty 态未捕获——mock 恒有数据，schema 已配置 empty slot）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                               | light                                                                                | dark                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 默认 1280×800                      | `_tmp/visual-inspection-2026-09-23/r2-1a/dashboard/dashboard-default-wide-light.png` | `…/dashboard-default-wide-dark.png`                                                  |
| 默认 800×900                       | `…/dashboard-default-narrow-light.png`                                               | `…/dashboard-default-narrow-dark.png`                                                |
| loading（3 图 Spinner 帧）         | `…/dashboard-loading-frame-wide-light.png`                                           | —（dark 探针同构，未单独截帧）                                                       |
| 加载完成后右侧滚动到底（溢出取证） | `…/dashboard-scrolled-right-wide-light.png`                                          | —                                                                                    |
| hover（表格行）                    | `…/dashboard-row-hover-wide-light.png`                                               | —（同组件族已在 approval-tasks 复验 computed 值）                                    |
| focus-visible                      | —（同族 flux 按钮已程序化复验：border 变 rgb(28,110,242) + ring 3px）                | —                                                                                    |
| dark 图表专拍                      | —                                                                                    | `…/dashboard-charts-dark-wide-dark.png`、`…/dashboard-pills-dark-zoom-wide-dark.png` |
| 弹层打开                           | n/a（本页无弹层）                                                                    | n/a                                                                                  |
| 拖拽进行中                         | n/a（本页无拖拽）                                                                    | n/a                                                                                  |
| loading/empty/error                | Spinner 帧已捕获（见上）；empty/error 未触发（mock 恒成功）                          | 同左                                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（表格行 hover 蓝 tint `color(srgb 0.11 0.43 0.95 / 0.06)`） A2 ✔（同族按钮 border+ring 已程序化复验） A3 warn(R2-1a-A3-01 同族：列宽手柄 4×39.5) A4 n/a A5 ✔（图表区 Spinner 非纯文本，见 loading 帧） A6 n/a A7 n/a A8 n/a A9 n/a（本页无写操作）
- B 颜色：B1 ✔（KPI 数字 rgb(2,8,23)/白卡 ≈17:1；label rgb(72,86,106) ≈7.6:1） B2 ✔ B3 warn（图例双系列蓝/红可区分、饼图蓝/红/绿；唯"月增长率"正增长用 rose 色带+rose 图标，正向语义用红系有歧义，P3 记 watch-only） B4 ✔（KPI 色带 oklch Tailwind 令牌 + schema 显式 icon color；图表色 rgb(60,131,246)=主题蓝） B5 ✔（flux 面：dark 图表色整体提亮 bars rgb(97,166,250)、pie 提亮变体，符合 dark 平价；宿主 pills dark 不可读另立 R2-1a-B5-02） B6 ✔（告警琥珀=待付款、无默认蓝裸奔）
- C 布局：C1 **fail(R2-1a-C1-01)** C2 ✔（宿主悬浮切换器遮压为已知 R2-1a-C2-01，本页分页区不适用） C3 ✔ C4 **fail(R2-1a-C1-01 同根因)** C5 ✔ C6 ✔（svg 427 = 容器 426.7，三图一致；失败在容器锁死非画布失配）
- D 间隔：D1 ✔（KPI 行 gapX 全 12、图标-文字 8、图表行 12，全 4/8 栅格，探针 24 项采样） D2 ✔ D3 ✔（行高 40.1×21 一致，2 行 39.6 为边框取整） D4 ✔ D5 n/a D6 n/a（分页关闭） D7 ✔（无 <4px） D8 ✔（卡片 p-4/p-3 统一）
- E 排布：E1 ✔ E2 ✔（数字 30px/700 vs 标签 12px/500 vs 说明 12px/400，实测） E3 ✔ E4 warn(R2-1a-E4-01：金额列左对齐) E5 ✔ E6 ✔
- F 一致性：F3 ✔（Spinner 空态模式与全站一致） F1/F2/F4/F5 n/a 或本页无对应操作面
- G 设计器：n/a（非画布页）
- H 弹层：n/a（本页无弹层）

## 3. 发现条目

### [R2-1a-C1-01] 图表/表格行 flex min-width 锁死：渠道占比图与待审批任务表在 1280 视口被裁剪且不可滚动可达

- **页面/路由**: `#/complex-pages/dashboard`（图表行+表格行同根因；antdpro-dashboard 等图表页有同构嫌疑，待 R2-3 批核对）
- **主题/视口/状态**: light+dark / 1280×800 与 800×900 / 数据加载完成后（默认态即触发）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/dashboard/dashboard-default-wide-light.png`（右缘"渠"字残条）、`…/dashboard-scrolled-right-wide-light.png`（滚到底后与默认帧完全相同——无可达滚动）、`…/dashboard-loading-frame-wide-light.png`（加载前 3 图 2 表全部排得下）
- **目视描述**: 1280 视口下第三张图"渠道占比"和右表"待审批任务"整块被右缘裁掉，横向滚动条不出现或滚不动；loading 帧里全部内容原本排得下，数据到达后才撑爆。
- **程序化证据**:
  - 探针: 溢出链扫描 + SVG/容器宽采样 + scrollRight 尝试（`_tmp/r2-1a-probes/w4-dashboard-out.json`、`w4-gaps.mjs` 输出 overflowOwners）
  - 输出: `.nop-page sw=1590 cw=960`；两个 `nop-flex flex-row mb-4` 行 `sw=1574/1382 cw=928`；3 个图表卡各锁定 `w=426.7`（svg 427=容器 426.7，ResizeObserver 生效但容器不再收缩）；外层宿主卡 `nop-card … overflow-hidden sw=1606 cw=992 ox=hidden`，对所有滚动容器置 `scrollLeft=scrollWidth` 后仍 `sl=0`（HTML/滚动元素均不滚）——内容被裁剪而非可滚动隐藏。loading 帧（svg 未挂载）时三图各约 300px 全部排下，证明是"SVG 挂载→flex item min-width:auto=SVG 宽"的收缩死锁。
- **对照基准**: 检查提示词 C1（无意外溢出）/C4（1280 必查视口不塌不挤）；WCAG 内容可达性（信息不可达）
- **严重程度**: P0（标准 1280×800 视口下"渠道占比"图与"待审批任务"表整块不可见且无滚动可达路径，视口需 ≥~1650px 才完整；"关键信息不可读/无法完成任务"判据命中）
- **用户影响**: 默认窗口尺寸下用户看不到渠道分布与待审批列表，且没有任何滚动/折叠手段到达，等于功能缺失；窄视口（800px）下 6 张 KPI 卡同时压成 ~57px 宽条、标签竖排一字一行、大数字被 overflow-hidden 裁切（`dashboard-default-narrow-light.png`），同根因加重。
- **修复方向**: ① chart-renderer 内部容器加 `min-w-0`（打破 flex 收缩死锁，SVG 跟随 ResizeObserver 收缩即可）；② dashboard schema 两个图表/表格行补 `wrap: true` 或给表格卡设 `min-w-0 + 内部 overflow-x-auto`；③ 宿主 fixture 卡 `overflow-hidden` 改为 `overflow-x-auto` 兜底，避免任何渲染面溢出直接变成不可达。修 ① 即全站图表页受益。
- **归族**: systemic → R2-3 批（chart-renderer min-width 所有权 + flex 行 schema 模板）
- **复核状态**: 未复核

### [R2-1a-B5-02] dark 模式宿主 complex-page 头部标签 pills 前景/背景对比 1.1:1，文字不可读

- **页面/路由**: 全部 complex-page 宿主头部（dashboard/approval-tasks/dynamic-tabs/crud-views-export 四页均现；rendered 宿主 showcase 层，非 flux 渲染面）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/dashboard/dashboard-pills-dark-zoom-wide-dark.png`（四页 default-wide-dark 同现）
- **目视描述**: dark 下页面标题右侧的特性标签（"stat cards"、"chart（area/pie/bar）"等）变成浅紫底浅蓝字，肉眼几乎读不出文字。
- **程序化证据**:
  - 探针: pills computed color/bg 采样 + WCAG 对比度计算（`w4-dashboard-out.json` → `pills`）
  - 输出: `color: rgb(178,206,251)` on `bg: rgb(203,186,252)`，对比度 **1.1:1**（阈值：正文 4.5:1 / 大字 3:1）；同元素 light 下为深字浅底可读
- **对照基准**: WCAG 1.4.3；检查提示词 B5（dark 专有缺陷：不可读字）
- **严重程度**: P2（信息不可读但属宿主装饰性标签，非 flux 渲染面；全 complex 页 dark 一致复现，宿主层系统性）
- **用户影响**: dark 用户无法读取页面特性标签，损失页面能力导览信息；视觉上像渲染残缺。
- **修复方向**: playground complex-pages-showcase 的 pill 样式改用语义令牌（`bg-primary/10 text-primary` 类），dark 由令牌自动适配；禁止固定浅色 literal 类。
- **归族**: local → R2-4 批（宿主 showcase 层）
- **复核状态**: 未复核

### [R2-1a-E4-01] 数值列左对齐，偏离数字右对齐惯例

- **页面/路由**: `#/complex-pages/dashboard`（金额列）；approval-tasks 金额(元) 列、dynamic-tabs 远程表数值列、crud-views-export ID 列同现（跨 4 页同模式）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/dashboard/dashboard-default-wide-light.png`（最近订单-金额列）、`…/approval-tasks/approval-tasks-default-wide-light.png`（金额(元)列）
- **目视描述**: 金额、数值、ID 等纯数字列与文本列一样左对齐，位数不同的数字无法按位比较。
- **程序化证据**:
  - 探针: 单元格 `getComputedStyle(td).textAlign`（`w4-approval-out.json` → amountAlign）
  - 输出: `textAlign: "start"`（=left）×3 行
- **对照基准**: 检查提示词 E4（数字右对齐）；NN/g 表格数值列惯例
- **严重程度**: P3（跨 4 页同根因整体升一级至 P2 归族候选，本卡按基线 P3 登记）
- **用户影响**: 扫读金额列时无法快速比较大小，财务/审批场景降低效率。
- **修复方向**: table 渲染器列定义补 `align: "number"`（或 schema `className: "text-right"` 惯例写入 flux-guide 表格章节），金额/数量/ID 类列右对齐。
- **归族**: local → R2-4 批（跨页模式，schema/渲染器双入口）
- **复核状态**: 未复核

### watch-only（不立项，记录待观察）

- KPI"累计收入"值 `104663.7` 未做千分位/单位格式化（30px 大字下可读性尚可）；如后续接真实数据建议 `formatNumber`。
- "月增长率 +12.5%" 用 rose 色带与图标，正向增长用红系有语义歧义（B3 watch）。
- 窄视口 KPI 卡塌缩并入 R2-1a-C1-01 修复面（同 flex 收缩根因），不单独立项。

## 4. 误报排除记录

| 疑点                                            | 排除理由                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| C1 扫描命中 `sr-only` 图表摘要 span sw=241/cw=1 | 视觉隐藏的无障碍摘要（registered 模式），非可见溢出                              |
| loading 帧后 KPI"今日订单 0" 疑似数据缺失       | mock 数据即 0（schema `${summary?.todayOrders ?? 0}` 正常渲染），非渲染缺陷      |
| dark 图表条形"变红"                             | 系列二本就是红色（销售额），dark 下整体提亮为 rgb(242,100,100)，语义一致，非缺陷 |
| 宿主右下 classic/light 切换器悬浮               | 宿主 shell 元素，已知 R2-1a-C2-01 登记过，本页分页区无重叠面，不重复立项         |
| 截图 pie 图"缺失"                               | 即 C1-01 裁剪问题本体，已立项，非渲染失败（DOM 中 svg 存在 427×240）             |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C1-01 → R2-3 系统性批；B5-02/E4-01 → R2-4 local 批；
- 批内复检通过后 → `verified`。
