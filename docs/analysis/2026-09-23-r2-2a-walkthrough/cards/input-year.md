# [card] control:input-year

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-year` ｜ **载体**: lab 页（1 场景：single value）
- **矩阵裁剪**: simplified（matrixReason：4 位数字年输入单控件，无弹层；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、min/max 年界（fixture 未配置））

## 1. 截图清单

| 状态                     | light                       | dark（真 data-mode）       |
| ------------------------ | --------------------------- | -------------------------- |
| 默认 1280×800（值 2024） | `default-s1-light-1280.png` | `default-s1-dark-1280.png` |
| 清空后（值态=空）        | `cleared-s1-light-1280.png` | —                          |
| 默认 800×900             | `default-s1-light-800.png`  | —                          |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/input-year/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（输入 96×32、clear 24×24）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（fill 2026 生效；"20ab" 数字过滤后为 "20"；clear 后 hasValue=false 且按钮隐藏）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 截图复核可读）B6 n/a
- C 布局：C1 pass（overflow 0 hits，1280/800 均 0）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D5 pass 其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** clear aria"清除"中文 F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新发现。）

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：clear aria"清除"。
- **弹层 actions 左对齐（R2-3b 已知族）**：Submit 左对齐。
- 计划内锚点复检通过：inputMode=numeric + maxLength=4 + 非数字剥离链路；clear 随值显隐；与 quarter/month 同族 `data-testid=period-input-year` 命名一致（date 族 owner 语言一致）。

## 交互键登记

- 无注册交互键：年份面板为原生浏览器 chrome 且本控件无 DOM 弹层态；typing/fill 动作不在 runner action 集（wave4 报告登记补录 2026-09-24，closure audit m-2）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-year` → carded（卡列填本路径）；findings 归族后 → digested。
