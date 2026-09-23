# [card] control:input-email

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-email` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Standard email field / Pre-populated with invalid value — submit to see error）
- **矩阵裁剪**: simplified（matrixReason：单行文本类控件；错误态/预填错误态/合法值态/空态（默认即空）已覆盖；裁掉：glass 皮肤、disabled/readonly（fixture 未提供）、失焦即时校验时序（提交路径已覆盖错误呈现））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）；`input-email-error-*` 为本波重拍（正确点击 Submit 按钮后拍摄，内容与命名相符）。

## 1. 截图清单

| 状态                                           | light                                                                                   | dark（真 data-mode）                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 合法值态（user@example.com，无错误）           | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-valid-light.png`       | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-valid-dark.png`       |
| 手填非法值提交（not-an-email，红边+文案）      | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-invalidfill-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-invalidfill-dark.png` |
| 预填错误值提交（not-a-valid-email，红边+文案） | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-error-light.png`       | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-error-dark.png`       |
| 窄视口 800×900 默认                            | `_tmp/visual-inspection-2026-09-23/r2-2a/input-email/input-email-800-light.png`         | —                                                                                      |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（input focus `:focus-visible` 蓝环；探针首轮落点为调试按钮系 Tab 序问题，直接 focus input 后环正常——见误报排除）A3 pass（input h 32）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a A9 pass（非法值提交后 `aria-invalid: "true"`、错误文案 `[role=alert]` 呈现、红边红环；合法值无残留错误）
- B 颜色：B1 pass（错误文案 light **5.35:1**（rgb(181,59,44) 对像素采样底 rgb(252,244,236)）、dark **7.04:1**（rgb(239,138,124) 对 rgb(20,28,36)））B2 pass（错误边框 `rgb(239,67,67)` light；dark 50% 透明红可辨）B3 pass B4 pass B5 pass（dark 全态平价）B6 pass
- C 布局：C1 pass（1280/800 `docOverX: 0`）C2–C6 pass/n-a
- D 间隔：D1/D5 pass（label 8px→input→错误文案紧随，与 form 卡同节奏）其余 n/a/pass
- E 排布：E1–E2 pass，E3–E6 n/a/pass
- F 一致性：F4 **族命中**（校验消息 zh-CN，见已知族节）其余 n/a/pass
- G/H：n/a

## 3. 发现条目

（本卡无新立条目——错误态呈现全链路程序化达标；zh-CN 消息落已知族。）

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）新实例：校验消息 `Email Address必须是有效的邮箱地址` / `Work Email必须是有效的邮箱地址`（英文 label + 中文消息，`w3d recheck.inputEmailError.text`；截图 invalidfill/error 双主题）。引用不立项；修复后需 F4 复检。
- 表单 AMIS 契约缺口（R2-3 候选，关联观察）：原生 `input type=email` 存在且 `checkValidity()` 为 false（`validityMessage: "Please include an '@'..."`），但呈现完全依赖 flux 校验通道（错误文案来自 flux 规则）——两通道并存但原生消息不外显，行为一致无用户矛盾；登记备查不立项。
- 误报排除：①w3c-main focus 探针 Tab 落点为 scope-debug 折叠按钮（42×24），非控件缺陷；②dark 错误文案 2.44:1 为 DOM 背景合成走查不含渐变画布的假阳性（form 卡方法级误报排除同源），像素采样 7.04:1 为准。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-email` → carded（卡列填本路径）；findings 归族后 → digested。
