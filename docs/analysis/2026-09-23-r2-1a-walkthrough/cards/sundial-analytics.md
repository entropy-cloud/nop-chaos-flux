# [card] page:sundial-analytics

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/sundial-analytics` ｜ **载体**: complex-page（外部应用复刻 · 分析页）
- **矩阵裁剪**: full（glass 未抽查：replica 自带 sd-\* 配色）

## 1. 截图清单

| 状态             | light                                                           | dark                                       |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800    | `…/r2-1a/sundial-analytics/sundial-analytics-default-light.png` | `…/sundial-analytics-default-dark.png`     |
| 默认 ~800×900    | `…/sundial-analytics-default-800-light.png`                     | `…/sundial-analytics-default-800-dark.png` |
| 卡内滚动至图表区 | —                                                               | `…/sundial-analytics-scrolled-dark.png`    |
| 图表点击钻取后   | `…/sundial-analytics-chart-focus-light.png`                     | —                                          |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 pass（本页未扫出 <24 交互目标） A4 n/a A5 pass A6 n/a A7 n/a A8 n/a A9 pass（点击图表出现「图表钻取」focus 卡，文本随数据更新）
- B：B1 fail(R2-1a-B1-19 本页实例 2.87:1 最差档) B2 pass B3 pass（逾期红/今天橙/未来蓝/无日期灰 图例与柱色一一对应） B4 pass B5 warn(B5-21 同款：dark host 下亮卡+深根缝隙) B6 pass
- C：C1 pass（1280 无溢出；800 宽 HTML clipY=276 为页面级纵向伸展，属文档流正常） C2 pass C3 pass C4 pass C5 fail(R2-1a-C-02 页面实例 diff=258/sbW=0) C6 pass（折线/柱状图 SVG 尺寸与容器一致，无拉伸）
- D：D1 pass（KPI 卡/图卡节距一致） D2 pass D3 pass D4–D8 pass
- E：E1 pass（KPI 头 + 四图卡动线清晰） E2 pass（鼓励语横幅弱于 KPI 主数字，层级正确） E3 pass E4 pass（图例行文字左、数值右对齐） E5 pass E6 pass
- F：F3 pass（图例行模式与 detail 页统计行一致） F1/F4 pass F2/F5 n/a
- G：n/a H：n/a

## 3. 发现条目

### [R2-1a-B1-19 页面实例（最差档）] 橙色 badge「今天」2.87:1@10px

- **页面/路由**: 本页（legend/badge 语义色）
- **主题/视口/状态**: light / 1280×800
- **截图**: `…/sundial-analytics-scrolled-dark.png`
- **程序化证据**:
  - 探针: `.sd-badge` computed color 合成背景 WCAG ratio
  - 输出: rgb(234,122,42) ratio=2.87（10px/400）；灰字 `text-[#636363]` 6.01 pass；主按钮橙底白字推算同档（≈3:1）
- **对照基准**: WCAG 1.4.3
- **严重程度**: P2（10px 正文性文字低于 3:1，属“明显对比缺陷”；本页为系统性最差实例）
- **用户影响**: 图例/状态小字难读；同样橙色用于图表柱体（有图形冗余，影响小）。
- **修复方向**: 同 B1-19 主条目（badge 文字加深/换深底白字 variant）
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C-02 页面实例] 卡内 diff=258px 隐藏滚动

- **程序化证据**: nop-card oy=auto、diff=258、sbW=0
- **严重程度**: P2 ｜ **归族**: systemic → R2-3 批（并入 C-02） ｜ **复核状态**: 未复核

### [R2-1a-A9-22 注] 图表钻取反馈取证（无缺陷）

- **程序化证据**: 点击 `sundial-energy-chart` 中心后 `[data-testid="sundial-chart-focus-card"]` 由 missing→flex（880×86，文本「图表钻取 精力输出（按复杂度）：8/13 输出 12 点」）
- **归族**: watch-only → 台账 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                       | 排除依据                                                                          |
| -------------------------- | --------------------------------------------------------------------------------- |
| 800 宽 HTML 元素 clipY=276 | HTML scrollHeight>clientHeight 为页面自然纵向伸展（该视口存在文档级滚动），非裁切 |
| 折线图曲线平滑疑似失真     | 数据点位置与坐标轴刻度对齐（8/10-今天 7 点位），为平滑插值样式而非数据错误        |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
