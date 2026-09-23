# [card] page:w3c-value-mapping

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w3c-value-mapping` ｜ **载体**: 域页面（值映射 demo：mapping×6（命中/未命中 defaultLabel/placeholder/空值/item region/表达式）+ status×6（success/warning/error/icon/miss/表达式）经 SchemaRenderer 挂载，scope data 提供 taskStatus/deployState）
- **矩阵裁剪**: simplified（理由：纯展示 demo，无交互控件（无按钮/输入/弹层）。裁掉：A1–A4/A6–A9、H、G 全 n/a；波指定 B3/B6 Badge 语义专项为全文重点：双主题全矩阵 + 逐 badge computed 对比度。glass（波内统一裁剪））

## 1. 截图清单（状态矩阵）

| 状态                           | light                                                                                                | dark                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800                  | `_tmp/visual-inspection-2026-09-23/r2-1d/w3c-value-mapping/w3c-value-mapping-default-wide-light.png` | `…/w3c-value-mapping-default-wide-dark.png`   |
| 默认 800×900                   | `…/w3c-value-mapping-default-narrow-light.png`                                                       | `…/w3c-value-mapping-default-narrow-dark.png` |
| Badge 双主题放大               | `…/w3c-badges-light-zoom.png`                                                                        | `…/w3c-badges-dark-zoom.png`                  |
| hover/focus/disabled/弹层/拖拽 | n/a（无交互元素；status badge 为纯展示非可点，A3 不适用）                                            | —                                             |

## 2. A–H 维度勾选表

- A 交互：全 n/a（纯展示页；表达式绑定 `mapping-expr`→"In Progress"、`status-expr`→"Running" 渲染正确即数据通路证明）
- B 颜色：B1 **fail(R2-1d-B1-31)**（status Badge 前景/软底对比全档不足，见发现） B2 n/a（无边框焦点面） B3 ✔（**B3 专项**：success=绿/警告=琥珀/失败=红，双主题语义一致，无跨档串色） B4 ✔（色值溯源 ui Badge 变体令牌：`--success`/`--warning`/`--destructive` 系，无字面色） B5 ✔（dark 全页随暗、badge 亮色前景换挡为 300–400 档——唯 error 档对比随 B1 项） B6 ✔（**B6 专项**：状态色走软底+语义前景的 badge 变体，非默认蓝一键切；levelMap→变体映射清晰）
- C 布局：C1 ✔（溢出扫描 wide/narrow 全空） C2 ✔ C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（**gapScan 修正后**：11 个渲染块间距全 16px 序列，落 4/8 栅格） D2 n/a（单列无分组语义） D3 n/a D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（mapping 组→status 组自上而下、3 秒可答） E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔ F3 ✔ F4 ✔（全英文） F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B1-31] status Badge 软变体文字对比全档不足（light warning 1.9:1 最重；dark error 3.17:1）

- **页面/路由**: `#/w3c-value-mapping`（status-success/warning/error/icon/expr 全部 badge；ui Badge 软变体的所有消费面同构）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `…/w3c-badges-light-zoom.png`、`…/w3c-badges-dark-zoom.png`
- **目视描述**: light 下 "Pending"（琥珀字/淡琥珀底）几乎糊进底色，"Completed"（绿）也偏浅；dark 下 "Failed" 红字对暗红底临界。
- **程序化证据**:
  - 探针: 逐 badge computed color + 软底 alpha 合成后 WCAG 对比度（badge bg 为 `oklab(.../0.15|0.2)` 半透明，按卡片底合成；`_tmp/r2-1d-probes/w3c-badges.mjs` + 合成计算）
  - 输出（12px/500 非大字，阈值 4.5:1）:
    - light: success `rgb(16,183,127)`@15% 白底合成(219,244,236) = **2.25:1**；warning `rgb(245,159,10)`@15% = **1.90:1**；error `rgb(239,67,67)`@10% = **3.32:1**
    - dark: success `rgb(38,217,157)`@20% = **6.43:1** ✔；warning `rgb(237,175,69)`@20% = **6.20:1** ✔；error `rgb(217,38,38)`@20% = **3.17:1** ✘
- **对照基准**: WCAG 1.4.3；检查提示词 B1；族关联：R2-1c summary 已把 performance-table badge 1.4:1 判入 `--secondary` 令牌 dark 破损族（R2-4 core）——本发现是**另一组令牌（success/warning/destructive 软变体配对）在 light+dark 的同型问题**，非 `--secondary` 族命中（本页 levelMap 变体不消费 --secondary）。
- **严重程度**: P2（状态语义是业务关键信息；warning 1.9:1 接近不可辨）
- **用户影响**: 状态徽章是表格/详情页最高频语义元素，弱光/低分屏下 warning 档基本不可读，误读状态即误判业务。
- **修复方向**: theme-tokens 或 ui Badge 变体层修配对——light：warning 前景加深至 amber-700 档（≥4.5）、success 用 green-700 档、error 底 alpha 提到 0.15 或前景用 red-700；dark：error 前景提亮至 red-400 档。修一处令牌配对全站 badge 受益；建议与 R2-4 `--secondary` 族并案做「软变体前景/底配对」专项。
- **归族**: systemic → R2-3 批（候选：ui Badge 软变体令牌配对，≥3 消费面同根因；与 R2-4 已裁 `--secondary` 族在 R2-3 汇总时并轨核对）
- **复核状态**: 未复核

## 4. 既有族确认（不另立）

- **R2-1d-C2-01（ndbg 悬浮球）**: 本页同构复现。
- **`--secondary` dark 破损（R2-1c 裁定 R2-4 core）**: 简报提示核对项——本页 status 变体映射到 success/warning/error/info，**未命中** --secondary；mapping 文本走 foreground。不扩面，仅记录核对结论。

## 5. watch-only（不立项）

- mapping 未命中三态（defaultLabel "Unknown state" / placeholder "Placeholder fallback" / 空值 "No value"）渲染为同款裸文本，视觉上无任何档位区分；语义设计如此（强业务层让位），产品面若需区分再议。
- status-miss（"Unknown status"）无 badge 壳、退化为裸文本——与命中态视觉差异明显（有壳/无壳），符合「未命中降级」语义。

## 6. 误报排除记录

| 疑点                           | 排除理由                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| badge 高度 20px 疑似 A3 小目标 | badge 为纯展示非交互元素，WCAG 2.5.8 不适用                                                                                                                 |
| dark 合成对比度计算误差疑虑    | 软底为 alpha 0.2 半透明，探针按实际卡片底合成后计算；dark success/warning 6.2–6.4 与目视「清晰可读」一致，证明合成口径可信；error 3.17 为真实不足非口径伪影 |
