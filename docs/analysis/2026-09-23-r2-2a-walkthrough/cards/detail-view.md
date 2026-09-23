# [card] control:detail-view

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/detail-view` ｜ **载体**: lab 页（2 场景：报告摘要文本 viewer+dialog / 用户账户富 viewer（icon+badge）+dialog）
- **矩阵裁剪**: simplified（matrixReason：只读展示 + 展开 dialog，与 detail-field 同 surface；开/编辑/回写/Esc 关已查）。裁掉：disabled/error（fixture 无必填负路径——S1 content 字段无 required）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                                  | light                                                                                                                     | dark（真 data-mode，自采）                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800                         | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/default-1280-light-viewport.png` / `default-1280-light-fullpage.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/default-1280-dark-viewport.png` |
| S1 展开 dialog                        | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/s1-dialog-open-light-1280.png`                                       | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/s1-dialog-open-dark-1280.png`   |
| S1 改 Pages 52 确认后 viewer 回写     | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/s1-after-confirm-light-1280.png`                                     | —                                                                                    |
| S2 富 viewer（icon+badge）            | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/s2-rich-viewer-light-1280.png`                                       | —                                                                                    |
| S2 dialog 开态                        | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/s2-dialog-open-light-1280.png`                                       | —                                                                                    |
| Esc 关闭后（DOM 断言 escClosed:true） | —                                                                                                                         | —                                                                                    |
| 默认 800×900 窄视口                   | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-view/default-800x900-light-fullpage.png`                                  | —                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（焦点落 dialog：`focusIn:true`）A3 pass A4 n/a A5 n/a（无校验负路径 fixture，裁剪已注明）A6/A8 n/a A7 pass（关闭钮存在、Esc 关闭 `escClosed:true`）A9 pass（确认后 viewer `Pages: 48→52` 即时回写）
- B 颜色：B1–B4 pass（light viewer 文本、badge info 蓝语义正常）B5 **warn（已知族）**：dark 下 dialog 白底 + 字段标签不可见（同 detail-field 卡 §4 加重实例，`s1-dialog-open-dark-1280.png`）B6 pass
- C 布局：C1 pass（三态溢出零命中）C2–C6 pass/n-a
- D 间隔：D1 pass（viewer 三行文本行距一致；dialog 字段栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass（确认右主位）E4 pass E5 pass（viewer 与触发钮分组清晰）E6 pass（viewer 本身即任务引导态）
- F 一致性：F1 pass（展开钮与 detail-field 同形态）F2 n/a F3 pass F4 warn（已知族 F4-11："编辑Report Summary / 取消 / 确认"中文 chrome）
- G 设计器：n/a
- H 弹层：H1 pass（560px md 档）H2 n/a H3 pass（h287 bottom 543 ≤ 792）H4 pass H5 pass H6 pass H7 pass H8 pass H9 pass（800 宽正常）

## 3. 发现条目

（无新立项发现。富 viewer（icon 16px + badge + 三行文本）在双主题下渲染正确；展开→编辑→回写链路程序化通过；dark 弹层缺陷归 `--popover` dark 亮底已知族，加重实例证据登记于 detail-field 卡 §4（两卡同 surface 同象）。）

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底 / dark 令牌组合（宿主已知问题，加重实例）**: dark 下 dialog 白底 + 字段标签不可见（`s1-dialog-open-dark-1280.png`），与 detail-field 卡同 surface 同根因，合并引用该卡 §4 登记，不重复立项。
- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "编辑Report Summary / 编辑User Account / 取消 / 确认"中文 chrome（`default-1280-light-fullpage.png`）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-detail-view` → carded（卡列填本路径）。
- 交互键上报：`{"lab-detail-view":[{"action":"waitFor","ms":800},{"action":"clickText","text":"编辑Report Summary"},{"action":"waitFor","selector":"[data-slot=dialog-content]"}]}`
