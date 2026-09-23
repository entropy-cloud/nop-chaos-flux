# [card] control:textarea

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/textarea` ｜ **载体**: lab 页（2 场景：basic required / 固定行数 5+3）
- **矩阵裁剪**: simplified（matrixReason：多行文本域无弹层；已查：行数档、超长值滚动（自适应=固定高+内部滚动）、focus/hover、error 态；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、maxLength 计数（fixture 未配置 showCounter）、自动增高变体（renderer 为固定行数模型））

## 1. 截图清单

| 状态                      | light                                                     | dark（真 data-mode）                                    |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 默认 1280×800 s1/s2       | `default-s1-light-1280.png` / `default-s2-light-1280.png` | `default-s1-dark-1280.png` / `default-s2-dark-1280.png` |
| 超长值（30 行，内部滚动） | `longvalue-s1-light-1280.png`                             | —                                                       |
| focus（程序化 focus）     | `kb-focus-s1-light-1280.png`                              | —                                                       |
| error（空 required 提交） | `error-s1-light-1280.png`                                 | —                                                       |
| 默认 800×900              | `default-s1-light-800.png`                                | —                                                       |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/textarea/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover 无 border 变化为 Input 家族一致惯例）A2 pass（focus 后 border 变主色 + box-shadow ring）A3 pass A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（error 态 alert 可见、aria-invalid=true、border 红；超长值内部滚动生效）
- B 颜色：B1 pass（label 12.61:1）B2 pass B3 pass B4 pass B5 pass（dark bg oklab 令牌、文字 `rgb(230,236,243)` 可读）B6 n/a
- C 布局：C1 pass（overflow 扫描 0 hits，1280/800 均 0；超长值 scrollH 616 > clientH 96 时滚动发生在 textarea 自身=有意滚动容器）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D5 pass（label→域 9px）其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 pass（本控件无新增文案暴露；error 文案族引用见下）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新发现。）

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：error 文案"Biography不能为空"中文（探针实测文本，`error-s1-light-1280.png` 红字可见）。
- **弹层 actions 左对齐（R2-3b 已知族）**：Save 左对齐。
- 计划内锚点复检通过：rows 5→h118 / rows 3→h78 行数档生效；`resize: vertical` + `overflow-y: auto`（超长滚动不撑破布局）；placeholder 展示正常；dark 平价通过。

## 交互键登记

- 无注册交互键：本控件无 DOM 弹层/切换态；typing/fill 动作不在 runner action 集，聚焦态已由走查自采截图覆盖（wave4 报告登记补录 2026-09-24，closure audit m-2）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-textarea` → carded（卡列填本路径）；findings 归族后 → digested。
