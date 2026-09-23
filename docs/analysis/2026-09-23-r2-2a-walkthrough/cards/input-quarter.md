# [card] control:input-quarter

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-quarter` ｜ **载体**: lab 页（2 场景：single value / range selectionMode=range）
- **矩阵裁剪**: simplified（matrixReason：quarter 族为"年输入 + 原生 Q select"复合控件，无自定义弹层；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、shortcuts 按钮（fixture 未配置）。弹层开态说明：Q1–Q4 下拉为 NativeSelect 原生弹层，属浏览器 chrome，Playwright 无法程序化截图取证，已在卡内注明（无法程序化清单））

## 1. 截图清单

| 状态                          | light                              | dark（真 data-mode）       |
| ----------------------------- | ---------------------------------- | -------------------------- |
| 默认 1280×800 s1              | `default-s1-light-1280.png`        | `default-s1-dark-1280.png` |
| 默认 1280×800 s2 range        | `default-s2-range-light-1280.png`  | —                          |
| 清空后（clear 按钮，值态=空） | `cleared-s1-light-1280.png`        | —                          |
| range 逆序交换后              | `range-reversed-s2-light-1280.png` | —                          |
| 默认 800×900                  | `default-s2-range-light-800.png`   | —                          |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/input-quarter/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（NativeSelect hover 有 hover:bg 反馈，ui 组件惯例）A2 pass（年输入 focus ring 完整）A3 pass（clear 按钮 24×24 恰达标；年输入 96×32、Q select 63×32）A4 n/a A5 n/a A6/A8 n/a A7 n/a（原生弹层非 DOM）A9 pass（Q3→Q1 selectOption 后值变为 2024-Q1；clear 后 hasValue=false 且 clear 按钮自动隐藏）
- B 颜色：B1 pass（label 20.01:1）B2 pass B3 pass B4 pass B5 pass（dark select bg/color/border 走令牌，截图复核可读）B6 n/a
- C 布局：C1 pass（overflow 扫描 0 hits，1280 与 800 均 0）C2 pass C3 pass C4 pass（800 宽 range 两排出不换行错位）C5 pass C6 n/a
- D 间隔：D1 pass（年输入与 Q select gap 6px 成组、组间 8px）D5 pass 其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** clear 按钮 aria"清除"、start/end aria"开始/结束 季度年份"为中文 F5 n/a
- G 设计器：n/a
- H 弹层：n/a（原生 select 弹层无法 DOM 取证，见矩阵裁剪说明）

## 3. 发现条目

（无新发现。）

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：clear aria"清除"、range 两端 aria"Quarter range 开始/结束 季度年份"中文。
- **弹层 actions 左对齐（R2-3b 已知族）**：Submit 左对齐。
- 计划内锚点复检通过：**range 逆序自动交换**（start 填 2025 后渲染序变为 [2024-Q4, 2025-Q1]，start ≤ end 契约保持，`range-reversed-s2-light-1280.png`）；clear 按钮随 hasValue 显隐；清空写 undefined（data-has-value 移除）。

## 交互键登记

- 无注册交互键：季度下拉为 NativeSelect 原生浏览器 chrome（非 DOM 元素），弹层开态无法经 runner action 驱动/截帧（wave4 报告登记补录 2026-09-24，closure audit m-2）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-quarter` → carded（卡列填本路径）；findings 归族后 → digested。
