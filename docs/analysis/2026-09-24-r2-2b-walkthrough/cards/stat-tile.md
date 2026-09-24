# [card] control:stat-tile

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/stat-tile` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：营收 KPI（涨跌色 + sparkline）/ 下行指标（负值涨跌色，中文标题 slug 空串）/ null 占位）
- **矩阵裁剪**: simplified（matrixReason：纯展示 KPI 卡——无交互态、无弹层、无异步。已查：light/dark、1280/800、值三态（满格式化值/负值指标/null `--` 占位）、delta 双方向语义色、sparkline 有/无。裁掉：glass 皮肤；hover/focus/disabled（无可交互元素））
- **runner dark 列作废声明**：同前——dark 全部真 data-mode 自采 + 像素采样。

## 1. 截图清单

| 状态                              | light                                                                             | dark（真 data-mode，自采）                                                       |
| --------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 默认 1280（整页）                 | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/default-1280-light-full.png`   | —                                                                                |
| 场景 1 营收 KPI（up + sparkline） | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/basic-light-1280.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/basic-dark-1280.png`          |
| 场景 2 下行指标（down）           | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/down-light-1280.png`           | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/down-dark-1280.png`           |
| 场景 3 null 占位（`--`）          | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/null-light-1280.png`           | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/null-dark-1280.png`           |
| 内置 sparkline 特写               | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/sparkline-part-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/sparkline-part-dark-1280.png` |
| 默认 800                          | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/default-800-light.png`         | `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/default-800-dark.png`         |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（纯展示件，无可交互元素、无拖拽、无弹层）
- B 颜色：B1 **fail(R2-2b-B1-125)**（delta 12px 语义色文本双主题对比度不达，见发现）B2 n/a B3 pass（up 绿/down 红语义映射正确，双主题一致）B4 pass（颜色走语义令牌；sparkline 走 `--chart-1` 契约）B5 pass（核对点：value/label dark 像素对比 14.46:1，delta up dark 10.03:1——down 3.76 计入 B1 条目）B6 pass（delta 未用默认蓝，走 success/destructive）
- C 布局：C1 pass（1280/800 overflow 零命中）C2 pass C3 pass C4 pass（800 下卡片纵向堆叠不破版）C5/C6 n/a
- D 间隔：D1 pass（value/label/delta/sparkline 垂直节奏一致）D2–D8 n/a
- E 排布：E1 pass（KPI 主数字 30px/600 tabular-nums 为页面最强层级，E2 同时 pass）E3–E6 n/a/pass
- F 一致性：F1–F5 n/a（up/down 语义色与 sparkline standalone、badge 语义一致）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-B1-125] delta 涨跌标注 12px 语义色文本对比度不达 WCAG 1.4.3：light up 2.51 / light down 3.67 / dark down 3.76

- **页面/路由**: `#/lab/stat-tile`（场景 1 `delta.direction: 'up'`；场景 2 `delta.direction: 'down'`；任何启用 delta 的 stat-tile 同险）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/stat-tile/basic-light-1280.png`（“同比 +12.5%” 浅绿小字）、`down-light-1280.png`（“同比 -3.2%” 浅红小字）、`down-dark-1280.png`
- **目视描述**: 涨跌标注字号 12px、字重 500，绿/红语义色直接作文本色叠在浅色 stage 上；light 下绿字明显偏浅，红字次之；dark 下红字仍不足。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-sv2.mjs`（scrollIntoView 后 clip PNG 解码取 painted 背景 + computed color 求 WCAG 比值；delta 元素 computed `fontSize: 12px, fontWeight: 500`）
  - 输出: light up `rgb(16,183,127)` on `rgb(252,252,244)` = **2.51**；light down `rgb(239,67,67)` = **3.67**；dark up `rgb(38,217,157)` = **10.03（过）**；dark down `rgb(217,38,38)` on `rgb(12,20,28)` = **3.76**。12px ≠ 大字档，按 ≥4.5 判。
- **对照基准**: WCAG 2.2 1.4.3（正文 ≥4.5:1）；检查提示词 B1/B5；R2-2a badge B1-02（四语义档 light 全败）同根因方向——语义状态令牌被直接用作小字号文本色，未配深浅变体
- **严重程度**: P2（KPI 卡 delta 是 BI 面高频元素；12px 小字对比不足对弱视用户构成实际阅读障碍；双主题 3/4 组合失败）
- **用户影响**: 强光环境/低端屏上 up 绿字接近不可读；down 红字双主题均低于标准。
- **修复方向**: theme-tokens 为 delta 类 12px 文本引入深浅变体（如 light 用 `--success-foreground` 档 ≈ `142 71% 30%`、dark 用提亮档 ≈ `142 70% 60%`），`stat-tile-renderer.tsx` delta 节点按 data-mode 取变体；或最小改动：delta 文本色改用 `text-success`/`text-destructive` 的深档 + 箭头图标保留原语义色。
- **归族**: systemic → R2-4（dark 平价/对比度族 + 语义色文本对比子族；badge B1-02、button B1-05 后第 3 例，跨组件同修复面=语义令牌文本档）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）：四象限复现；根因行 stat-tile-renderer.tsx L149–150 语义色直作 12px 文本色

## 4. 已知族命中（引用，不另立项）

- **dark 平价/对比度族（R2-4，本控件为任务书点名核对点）**：主数字/label/sparkline dark 核对**通过**（value 14.46:1、up delta 10.03:1、sparkline `--chart-1` 蓝在 dark 底清晰）；唯一不达项已立 B1-125。
- **语义色 sparkline 契约（误报排除）**：stat-tile 内置 sparkline 恒 `--chart-1` 蓝不随涨跌变色——`stat-tile-renderer.tsx` L18-26 与 docs/components/sparkline/design.md §11 明文契约（组合位不复制语义取色），不判不一致。
- **i18n zh-CN 回退（外围观察）**：本卡场景 label“本月营收/订单数/未发布指标/同比 +12.5%”均为 fixture 数据自带中文，非渲染器 chrome，不计入 i18n 族。

## 交互键登记

- 无注册交互键：纯展示 KPI 卡无交互态（closure audit F2 补录 2026-09-24）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-stat-tile` → carded（卡列填本路径）；findings 归族后 → digested。
