# [card] page:stripe-payments

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/stripe-payments` ｜ **载体**: complex-page（外部应用复刻 · Stripe Dashboard 支付流水）
- **矩阵裁剪**: full（明细抽屉/导出 modal/添加 widget dialog 均程序化触发；排序 chevron 为已注记静态形态（I13），拖拽无）

## 1. 截图清单

| 状态                     | light                                                                       | dark                                                  |
| ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| 默认 1280×800            | `_tmp/.../r2-1a/stripe-payments/stripe-payments-default-1280x800-light.png` | `.../stripe-payments-default-1280x800-dark.png`       |
| 明细抽屉（客户链接触发） | `.../stripe-payments-detail-drawer-1280x800-light.png`                      | `.../stripe-payments-detail-drawer-1280x800-dark.png` |
| 导出 modal               | `.../stripe-payments-export-modal-1280x800-light.png`                       | `.../stripe-payments-export-modal-1280x800-dark.png`  |
| 添加 widget dialog       | `.../stripe-payments-widget-dialog-1280x800-light.png`                      | `.../stripe-payments-widget-dialog-1280x800-dark.png` |
| 800×900                  | `.../stripe-payments-default-800x900-light.png`                             | `.../stripe-payments-default-800x900-dark.png`        |

探针脚本：内联 REPL 探针（phase1–phase4 记录于 `_tmp/r2-1a-probes/stripe-*.json`）。

## 2. A–H 勾选

- A 交互：A1 ✓ A2 ✓ A3 fail(A3-06) A4 ✓ A5 n/a A6 n/a A7 ✓ A8 n/a A9 ✓（chip 增删/抽屉打开/分页跳页均有状态变化；排序 chevron 为注记静态形态，不判）
- B 颜色：B1 ✓ B2 ✓ B3 ✓（状态 pill 四语义对：已成功 `rgb(14,98,69)` 绿 / 待处理 `rgb(125,92,10)` amber / 已失败 `rgb(158,44,32)` 红 / 已退款 `rgb(82,96,109)` 灰）B4 ✓ B5 ✓（dark 整卡钉白一致可读；抽屉 dark 亮底=已知 `--popover` 覆盖，确认受影响）B6 ✓（blurple 选中态为 Stripe 对标语义，非默认蓝裸奔）
- C 布局：C1 warn(C1-06) C2 ✓（筛选区注记文本与搜索降级形态相邻拥挤，属 schema 静态注记排版，P3 级不计）C3 ✓ C4 fail(C4-04) C5 ✓ C6 n/a
- D 间隔：D1 ✓ D2 ✓ D3 ✓（36 行 mock 均一密度，无离群行）D4 ✓ D5 n/a D6 ✓（分页条 top−表格 bottom = 1455.1−1443.1 = **12px** = `--space-block-gap`，plan 490 锚点复检通过）D7 ✓ D8 ✓
- E 排布：E1 ✓ E2 ✓（KPI 大数强于标签、导航 blurple 选中态层级清晰）E3 warn(E3-02) E4 fail(E4-01) E5 ✓ E6 ✓
- F 一致性：✓（replica 豁免；横切已查）
- G：n/a
- H 弹层：pass（抽屉 480=sm 档、导出 560=base 档、widget 560=base 档全部落阶梯；抽屉 body 滚动 sh1266/ch762 ✓ H8；header/footer padding 一致；H3 无越界——导出 bottom 615、widget bottom 471、抽屉 full-height 贴视口）

## 3. 发现条目

### [R2-1a-E4-01] 金额列左对齐且非等宽字体，违背"等宽右对齐"自述口径

- **页面/路由**: `#/complex-pages/stripe-payments` 交易表格金额列
- **主题/视口/状态**: light、dark / 1280×800 / 默认
- **截图**: `_tmp/.../r2-1a/stripe-payments/stripe-payments-default-1280x800-dark.png`（白底表格上金额左对齐肉眼可辨）
- **目视描述**: 混合币种金额在单元格内齐左排布，右缘参差；扫描列时无法按数位对齐比大小。
- **程序化证据**:
  - 探针: 逐行读 `.st-money` span 与所在 td 的 rect（8 行样本）
  - 输出: span `x` 恒 = 593（左缘对齐），`right` 634.4–651.9（右缘参差）；字体 `Inter, -apple-system`（比例字体，非 mono）——页面 schema 自述"金额等宽右对齐"两项均未落地
- **对照基准**: E4"数字右对齐"；Stripe Dashboard 对标形态（金额列右对齐 + tabular-nums）；本页 description 自述口径
- **严重程度**: P2（金融数据页核心扫读动线）
- **用户影响**: 用户难以快速比较金额大小，易看错行。
- **修复方向**: `st-money` 加 `text-align:right`（或父 cell `justify-items:end`）+ `font-variant-numeric: tabular-nums`（或 mono 档）；对照列宽右缘留 padding。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-A3-06] 筛选 chip 移除按钮仅 14×14

- **页面/路由**: `#/complex-pages/stripe-payments` 筛选 chip 条
- **主题/视口/状态**: light / 1280×800 / 默认（chip「支付状态：已成功 ×」「金额：≥ CN¥100.00 ×」）
- **截图**: `.../stripe-payments-default-1280x800-light.png`
- **目视描述**: chip 尾部的 × 移除钮极小。
- **程序化证据**:
  - 探针: A3 短边遍历
  - 输出: `st-chip-remove 14×14`（另：金额排序钮 `35.6×20.5`、列宽手柄 `4×35.5` 一并记录）
- **对照基准**: WCAG 2.5.8 ≥24×24
- **严重程度**: P2（移除筛选为高频操作，14px 目标显著低于阈值）
- **用户影响**: 误触/点不中，筛选难以撤除。
- **修复方向**: `st-chip-remove` 保持 14px 视觉 ×，外套 ≥24×24 热区（padding 或 `::before` 扩展命中区）；排序钮 h 提到 24。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-C4-04] 800px 下导航壳 + 内容整体超宽

- **页面/路由**: `#/complex-pages/stripe-payments`
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `.../stripe-payments-default-800x900-light.png`
- **目视描述**: 左侧分组导航与右侧内容在 800px 下不收缩，内容右缘被裁。
- **程序化证据**:
  - 探针: 800px 读 `.st-root` 与子孙越界元素
  - 输出: `st-root sw733/cw480`（越界 253px，本波五页中最宽）；越界元素 19 个（`min-h-screen` 行容器 717/448 等）；`scrollWidth=800` 无横滚逃生
- **对照基准**: C4 视口弹性
- **严重程度**: P2
- **用户影响**: 窄窗口下表格右侧列（状态/客户）被裁，无法查看。
- **修复方向**: `<1024px` 导航壳收纳为图标栏/抽屉；内容区 `min-width` 解除并允许表格横滚。
- **归族**: systemic → R2-3 批（复刻页窄视口同根因族，五页中最重）
- **复核状态**: 未复核

### [R2-1a-C1-06 / E3-02] KPI 数值溢出容器 16px；导出/Apply 主按钮左置

- **页面/路由**: `#/complex-pages/stripe-payments`
- **主题/视口/状态**: light / 1280×800
- **截图**: `.../stripe-payments-default-1280x800-light.png`、`.../stripe-payments-export-modal-1280x800-light.png`
- **目视描述**: 「净额（本月）」大数贴满卡片右缘；导出 modal「导出」、widget dialog「Apply」（均 `rgb(99,91,255)` blurple 主钮）位于弹层左下 x=384（弹层左界 371）。
- **程序化证据**:
  - 探针: KPI `st-kpi-value sw182/cw166`（16px 溢出，overflow visible 未裁切）；导出 modal `{w:560, 导出 x:384}`；widget dialog `{w:560, Apply x:384 y:414}`
- **对照基准**: C1（数值溢出容器 padding）；E3/styling-system「确认在主位（右）」——与 cal-confirm/notion 同模式
- **严重程度**: P3（KPI 未裁切仅贴边）/ E3 部分并入系统性 E3 族（见 cal-confirm E3-01，汇总按 P1 报）
- **用户影响**: 观感紧绷；主按钮位置与惯例不符易误触关闭。
- **修复方向**: KPI 数值 `tabular-nums` + 容器 `pr` 加档或字号降档；导出/Apply 与关闭钮对调主次位。
- **归族**: watch-only → 台账（E3 部分归族 systemic → R2-3）
- **复核状态**: 未复核

## 4. 误报排除记录

- 排序 chevron 无点击反馈：schema 注记"部分列排序 chevron 形态"（I13 静态形态），按设计豁免。
- 抽屉 dark 亮底 `rgb(251,250,249)`：已知宿主 `--popover` 覆盖（简报已知事实），确认受影响不重复立项。
- C1 `sr-only` 图表数据（"8/01: 本期: 9800…"）与 KPI sr 文本命中：读屏元素，误报。
- 交易明细抽屉"操作按钮形态零生效"：schema 自述（I9 形态），抽屉内仅关闭钮为程序化确认的实际状态，不算 A9 缺陷。
- 搜索框降级形态（零生效、与注记文本相邻）：schema 自述"关键词搜索降级形态（零生效）"，静态注记排版归 P3 观感不计缺陷。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；C4-04/E3（系统族部分）归族 R2-3、E4-01/A3-06 归族 R2-4 后 `digested`。

## 6. 弹层注册表扩面素材

- 交易明细抽屉：480px（sm 档）、客户链接触发、摘要/时间线/元数据分区、body 滚动 1266/764。
- 导出 modal：560×555（base 档）、「导出」触发、空列勾选拦截提示（I9 P7b 语义模拟）。
- 添加 widget dialog：560×411（base 档）、`stripe-widget-trigger` 触发、12 checkbox + Apply。
