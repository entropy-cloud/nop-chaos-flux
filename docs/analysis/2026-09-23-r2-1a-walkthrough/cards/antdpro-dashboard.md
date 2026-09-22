# [card] page:antdpro-dashboard

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-dashboard` ｜ **载体**: complex-page（antdpro 复刻域；KPI×4 + 折线/饼图 + Top10 排行）
- **矩阵裁剪**: full（无弹层/拖拽；mock 同步返回无 loading 帧——A5 n/a；glass 未抽查）

## 1. 截图清单

| 状态              | light                                                                                           | dark                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800     | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-dashboard/antdpro-dashboard-default-light.png` | `…/antdpro-dashboard-default-dark.png`        |
| 默认 800×900      | `…/antdpro-dashboard-default-light-narrow.png`                                                  | `…/antdpro-dashboard-default-dark-narrow.png` |
| hover/focus       | 页面无可交互面（KPI 卡/图表均非交互），n/a                                                      | —                                             |
| 弹层/拖拽/loading | n/a                                                                                             | n/a                                           |

## 2. A–H 维度勾选表

- A 交互：A1–A9 全 n/a（纯展示页，无交互面/无异步可见态）
- B 颜色：B1 ✔（KPI 值 30px/600 黑 on 白 21:1；轴标签灰可辨） B2 n/a B3 ✔（折线蓝=主指标、KPI 图标四色 tint 仅装饰不承载语义；饼图四色为分类色非语义色） B4 ✔（折线 stroke `hsl(var(--chart-1))/--chart-2` 走图表令牌） B5 **fail(R2-1a-B5-02 域内实例)**（dark 内容面整体保持亮底；图表坐标/图例仍黑字白底可读，无不可读级损坏） B6 ✔
- C 布局：C1 ✔（800px 窄视口横向裁切与 list 页同族但本页以滚动消化，无塌缩） C2 ✔ C3 ✔（KPI 行 4 等分、趋势 2/3 + 占比 1/3 主次合理——dashboard 卡用 `flex-1/flex-[2]/flex-[3]` 正确铺满，反证 C3-02 根因） C4 ✔（1280 与 800 双视口无塌） C5 ✔ C6 **✔**（两块 recharts SVG 498×280，viewBox `0 0 498 280` 与 rect 1:1，无拉伸/空转；chart 109 节点非空）
- D 间隔：D1 ✔（块间 24px、组内 28px，栅格值） D2 ✔ D3 ✔（Top10 行高 43px ×10 一致，密度档均匀） D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔（卡 p-5）
- E 排布：E1 ✔（KPI 一眼可答"今天卖多少/单多少"） E2 ✔（关键数字 30px/600 强于标签 14px） E3 n/a E4 ✔（四 KPI 卡等宽等高 210×124；图例与轴对齐） E5 ✔（卡片分组） E6 n/a
- F 一致性：F1 n/a F3 ✔（卡片语言与全域一致） F4 ✔（"今日销售额/本月销售额"口径文案清晰）
- G 设计器：n/a（recharts 图表非画布编辑器；C6 已覆盖尺寸判定）
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-B5-02]（域内实例）dark 下整版仪表盘保持亮底

- **页面/路由**: `#/complex-pages/antdpro-dashboard`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-dashboard/antdpro-dashboard-default-dark.png`（深色宿主 + 深色侧栏中浮一块完整亮白仪表盘）
- **程序化证据**: dark 下 `.adp-card` bg `rgb(255,255,255)`、文字 `rgba(0,0,0,0.88)`（adp 字面令牌不翻转，`antdpro-dashboard-probe.mjs` → `darkChart`）；图表令牌 `--chart-*` 会翻转但图表底面被 adp 白卡垫住，实际不产生对比损坏
- **对照基准**: B5 dark 平价；主发现 R2-1a-B5-02（antdpro-list 卡）
- **严重程度**: P1（域级统一判级；本页单独看为观感级——无不可读，但 dark 用户看到的是"没做 dark"的整块亮面）
- **用户影响**: dark 模式下仪表盘刺眼、与宿主割裂。
- **修复方向**: 同 R2-1a-B5-02 主修复（adp css 补 dark 块；图表区需同步核对 `--chart-*` 翻转后的曲线/饼图与暗底对比度）
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                | 排除理由                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 饼图红/绿/蓝/紫高饱和疑"语义色裸奔" | 分类色（渠道维度无好坏语义），非状态色；B6 口径不适用                                                          |
| dark 下图表令牌翻转疑"线色错配"     | 图表绘制在 adp 白卡之上，卡片不翻转则线色实际未产生错配；若修复 B5-02 时启用暗底，需按卡内修复方向复核图色对比 |
| 800px 窄视口 HTML clipX 93px        | 横向滚动由内层容器消化，与 list 页窄视口塌缩（查询表单挤压）不同族，本页无表单可塌；不重复立项                 |
| Top10 表 43px 行高"偏大"            | 全表一致的舒适密度档（误报表既定豁免）                                                                         |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：B5-02 → R2-3 系统性批；批内复检通过后 → `verified`。
