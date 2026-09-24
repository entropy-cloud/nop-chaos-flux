# [card] control:ai-token-usage

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-token-usage` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host token usage render + onClick payload C8.2 — 两个实例：带 usage + contextLimit 1000 + onClick probe 的 ghost 按钮、缺 usage 的 data-empty 占位）
- **矩阵裁剪**: simplified（matrixReason：纯展示微件。裁掉的状态：超限 ratio>1 钳制态与 cost 展示态（fixture usage 42/1000、无 cost 字段；源码 L104 `Math.min(1,…)` 与 L118-122 通道核对）、`usage` 直传 prop 优先级路径（resolveUsage 源码 L28-39 核对）、hideWhenMissing（className 约定，非渲染器状态））

## 1. 截图清单

| 状态                    | light                                                                                 | dark（真 data-mode，自采）                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800（两实例） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-token-usage/default-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-token-usage/default-dark-1280.png`       |
| hover（ghost 全行亮条） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-token-usage/hover-light-1280.png`         | —                                                                                    |
| 默认 ~800 宽            | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-token-usage/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-token-usage/default-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（ghost 按钮 hover 透明→muted `rgba(0,0,0,0)→rgb(241,245,249)`）A2 pass（Tab 落点 oklab 3px ring）A3 pass（按钮 918×32；smallTargets 零命中）A4 n/a A5 pass（empty 态渲染 muted 占位文本非空白，`data-empty` 在位）A6–A8 n/a A9 pass（点击 dispatch `__c82Token="42"`）
- B 颜色：B1 pass（light total 18.26:1、empty 7.46:1；dark PNG 采样 total 15.82:1、sub 6.01:1、empty 8.11:1、ring 4.89:1 — 探针 compositor 对 oklab 底失效的 1.05/1.91 假值已弃用）B2 pass B3 pass B4 pass B5 pass（dark 全指标 PNG 采样过关，`_tmp/r2-2c-probes/w2-png-token.mjs`）B6 pass（ring 4.2% 弧长与 dasharray 3.30/75.24 对应）
- C 布局：C1 pass（`docOverX 0`）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（filled↔empty 两块 24px 落栅格）D2–D8 pass/n/a
- E 排布：E1 pass E2 pass（total 强于 sub 次行 10px）E3 pass E4 **warn**（数字列对齐核对完成：total 左缘 745 vs sub 752，7.4px 箭头前缀错位 — 已知族核对结论见 §4，不升级）E5 n/a E6 n/a
- F 一致性：F1–F3 n/a F4 **warn**（empty 占位"用量未上报"中文 — R2-2a-F4-11 族可视实例，§4 引用）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无本控件新立项发现。两处已知族实例升级证据见 §4。）

## 4. 已知族命中（引用，不另立项）

- **默认栈宽基线族（R2-2a-E2-26 watch）**：onClick 实例渲染为 ghost `<button>`，宽度撑满整行 918px（内容仅 ~120px 居中悬浮于行中部，`default-light-1280.png`）；hover 时整行 918px 亮起灰条（`hover-light-1280.png`，before/after `rgba(0,0,0,0)→rgb(241,245,249)`）——微件级可点区域与可视区域 1:7.6 失配，族新实例（第 4 卡，达系统性门槛的又一票）。aria/role（`aria-label "令牌用量"` role group）在无 onClick 分支（L149-160）有、onClick 分支（Button, L134-147）无——分支间 a11y 不对称随族记录。
- **R2-2a-F4-11（i18n zh-CN 回退）**：data-empty 占位渲染中文"用量未上报"（`t('flux.ai.tokenNoUsage')`）上英文宿主页面——本波最直观的族实例（`default-light-1280.png` 左上部）。
- **R2-1a-E4-01 数值列左对齐族（token-usage 数字核对）**：核对完成——紧凑微件非表格数值列；total "42" 与 sub "↑40 · ↓2" 同列左对齐，7.4px 视觉错位全部来自 ↑/↓ 箭头前缀字形宽度，非对齐规则缺陷，维持族原裁决不升级。
- **计划内锚点复检通过**：usage 三值渲染（42 / 1,000、↑40、↓2）+ toLocaleString 千分位一致；ring 弧长比例 4.2% 与 42/1000 精确对应；onClick dispatch ctx `${usage.total_tokens}`="42" ✓；data-empty ✓。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-token-usage` → carded（卡列填本路径）；findings 归族后 → digested。
