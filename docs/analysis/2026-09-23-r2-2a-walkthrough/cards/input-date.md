# [card] control:input-date

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-date` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Display format, clearable, and min/max bounds / UTC storage round-trip / Date family composite submit (bug 73 pattern)）
- **矩阵裁剪**: simplified（matrixReason：弹层开态必查已做（When 值态弹层、Birthday bounded 弹层、800 窄视口弹层、Esc/外点关闭、清除、UTC 复合场景存在）；裁掉：glass 皮肤、disabled/readonly（fixture 未提供）、键盘逐日导航（非本波口径））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。弹层截图为 600ms 动画收敛后复拍（首拍透明为渐入中截帧，见误报排除）。

## 1. 截图清单

| 状态                                               | light                                                                                  | dark（真 data-mode）                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 默认 1280×800（值态 09/06/2024 + inline 清除 ×）   | （含于弹层整页截图上半）`input-date-pop-open-light.png`                                | （同左）`input-date-pop-open-dark.png`                                                |
| 弹层开（When，值态，选中 9 高亮 + footer 清除 ×）  | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-pop-open-light.png`     | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-pop-open-dark.png`     |
| 弹层开（Birthday bounded 2000–2010，当前月全禁用） | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-bounded-open-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-bounded-open-dark.png` |
| 800 宽弹层开（When，2026/9月）                     | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-pop-800-light.png`      | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-pop-800-dark.png`      |
| 窄视口 800×900 默认                                | `_tmp/visual-inspection-2026-09-23/r2-2a/input-date/input-date-800-light.png`          | —                                                                                     |

## 2. A–H 维度勾选表

- A 交互：A1 pass（trigger hover）A2 pass（Esc 后焦点回 `[data-testid="date-trigger"]`；`outlineStyle: none` 但 3px 半透明 primary ring box-shadow 存在）A3 pass（清除钮 24×24、日期格 ≥28）A4 **族命中**（bounded 弹层 35/35 日全禁用，禁用态视觉降透明度可辨——归 R2-1d-A7-27 族，见已知族节）A5 n/a A6/A8 n/a A7 pass（弹层有关闭 ×、Esc/外点关闭均生效：`escClosed/outsideClosed: true`）A9 pass（选日提交值、inline 清除后 `display: null` + placeholder 呈现、清除钮随值显隐）
- B 颜色：B1 pass（light 日格文字 7.46:1）B2 pass B3 pass（选中日 primary 实底白字）B4 pass B5 **warn（族实例，见已知族节）**：dark 弹层面 `rgb(251,250,249)` 亮底 + 邻月日 1.83:1 B6 pass
- C 布局：C1 pass（弹层 217 宽在 1280/800 均在视口内，`docOverX: 0`）C2 pass（弹层 overlay 遮后续内容属正常）C3–C5 pass/n-a C6 n/a
- D 间隔：D1 pass（弹层 padding 8px、日格栅格）D2–D8 n/a/pass
- E 排布：E1–E2 pass（caption 年/月下拉 + 前后翻月箭头动线标准）E3–E6 n/a/pass
- F 一致性：F4 **族命中**（日历 zh-CN 集群 + fixture 文案混排，见已知族节）其余 n/a/pass
- G 设计器：n/a
- H 弹层：H1 pass（217×308 单档）H2 n/a H3 pass（bottom 610/633 ≤ 视口−8）H4 pass（关闭 × 右下无重叠）H5 n/a H6 pass H7 pass H8 n/a H9 pass（800 宽不溢出）

## 3. 发现条目

（本卡无新立条目——全部命中落 Known families，编号不占用。）

## 4. 已知族命中（引用，不另立项）

- **bounded 死月族（R2-1d-A7-27）新实例**：Birthday（min/max 2000–2010）弹层不收敛到界限月，直接开在**当前月 2026-09**，35 个日期格 **全部 disabled**（`dayBtns: 35, disabledBtns: 35, totalDisabled: 35`，w3-date-results.json input-date.boundedPop；截图 `input-date-bounded-open-light/dark.png`），用户面对整屏灰色日历必须手动下拉翻 16 年。dark 下白底 + 灰日更不可读（同 `--popover` 族）。引用不立项；修复后需本卡 A4/A7 复检。
- `--popover` dark 亮底（宿主已知问题，R2-4）：dark 弹层 computed bg `rgb(251,250,249)`（w3f input-datetime.darkPop 同族数，date 控件共用同一 ui Popover surface）；邻月置灰日 rgb(175,189,207) 对该底 **1.83:1**，"今天"高亮圈灰化（bounded-open-dark.png）。修复后需 B5 复检。
- i18n zh-CN 回退（R2-2a-F4-11 族）新实例：日历 caption 年份/月份下拉 **"6月/9月"**、星期行 **一~日**；另 fixture 简介文案本身中英混排（`apps/playground/src/component-lab/renderers/input-date-lab-page.tsx` L94 "shared date底层"）。引用不立项。
- 误报排除：`input-date-pop-open-*` 首拍呈半透明（debug JSON 透出）系弹层 opacity 渐入中截帧——600ms 后复拍 opacity 链路全 1（w3h-retake.mjs），非缺陷。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-date` → carded（卡列填本路径）；findings 归族后 → digested。
