# [card] control:input-datetime

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-datetime` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Date + time precision）
- **矩阵裁剪**: simplified（matrixReason：单场景控件，弹层开态（1280/800、双主题）、值态、日选+时分精修链路已覆盖；裁掉：glass 皮肤、disabled/readonly（fixture 未提供）、秒级精度变体（fixture 无））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）；弹层截图 600ms 收敛后拍摄（w3j 复拍覆盖早期渐入中截帧）。

## 1. 截图清单

| 状态                                             | light                                                                                      | dark（真 data-mode）                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 默认 1280×800（值态 2024-06-09 14:30）           | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-default-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-default-dark.png`  |
| 弹层开（日历 + 时/分 number 输入 + footer 清除） | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-pop-open-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-pop-open-dark.png` |
| 800 宽弹层开                                     | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-pop-800-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/input-datetime/input-datetime-pop-800-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（弹层开焦点落弹层容器，Esc 关闭后焦点回 `[data-testid="date-trigger"]`，`focusAfter: BUTTON date-trigger`）A3 pass（时/分 number 输入 61×30 ≥24、footer 清除 24×24）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 pass（弹层有关闭 ×，Esc 关闭 `closed: true`）A9 pass（选日后弹层保持开启——datetime 设计如此，`stillOpen: true`；时分输入可改，display 保持 `YYYY-MM-DD HH:mm` 形态）
- B 颜色：B1 pass（light 日格 7.46:1）B2 pass B3 pass B4 pass B5 **warn（族实例，见已知族节）**：dark 弹层 `rgb(251,250,249)` 亮底；时/分输入在亮底上呈 dark 令牌深色药丸（可读但风格错位）B6 pass
- C 布局：C1 pass（弹层 217×308，1280/800 均在视口内）C2–C5 pass/n-a C6 n/a
- D 间隔：D1 pass（日历与时分行距成栅格）D2–D8 n/a/pass
- E 排布：E1–E2 pass（日历在上、时:分精修行在下、footer 清除独立）E3–E6 n/a/pass
- F 一致性：F4 **族命中**（时/分 aria 中文，见已知族节）其余 n/a/pass
- G 设计器：n/a
- H 弹层：H1 pass（217×308）H2 n/a H3 pass（bottom 610/633 ≤ 视口−8）H4 pass H5 n/a H6 pass（label 与输入对齐统一）H7 pass H8 n/a H9 pass（800 宽重开不溢出）

## 3. 发现条目

（本卡无新立条目——全部命中落 Known families，编号不占用。）

## 4. 已知族命中（引用，不另立项）

- `--popover` dark 亮底（宿主已知问题，R2-4）+ 新实例数字：dark 弹层 computed bg `rgb(251,250,249)` 与 light 完全相同（`w3f-date4-results.json` input-datetime.dark.darkPop.computedBg；亮底像素采样 ~rgb(172,172,172) 为渐入中混合值，以 computed 为准）；邻月日 rgb(175,189,207) 对该底 **1.83:1**（对 white 1.91）；footer 时/分输入为 dark 令牌深色药丸置于亮底上（input-datetime-pop-open-dark.png），风格错位但可读。修复后需 B5 复检。
- i18n zh-CN 回退（R2-2a-F4-11 族）新实例：时/分 number 输入 `aria-label="时"/"分"`（`w3f input-datetime.pop.timeInputs`），英文宿主读屏输出中文。引用不立项。
- 误报排除：①早期弹层截图半透明为渐入中截帧（600ms 复拍 opacity 链全 1，w3j/w3h）；②`pickKeepsOpen.display` 未变为探针点中邻月禁用/外月格所致，不能证伪"选日更新显示"——非缺陷登记。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-datetime` → carded（卡列填本路径）；findings 归族后 → digested。
