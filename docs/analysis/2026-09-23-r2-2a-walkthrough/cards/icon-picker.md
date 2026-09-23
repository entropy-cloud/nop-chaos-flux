# [card] control:icon-picker

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/icon-picker` ｜ **载体**: lab 页（4 场景：基础 / 默认值 settings / disabled / host 选择提交 bug73）
- **矩阵裁剪**: simplified（matrixReason：trigger+popover 双态面，弹层开态/搜索/选择/清除/disabled 已查）。裁掉：键盘 roving tabindex 全链路（G2-R7-视角9 已有单测覆盖，本波仅目检）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                                                       | light                                                                                                                          | dark（真 data-mode，自采）                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 默认 1280×800                                              | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/default-1280-light-viewport.png` / `default-1280-light-fullpage.png`      | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/default-1280-dark-viewport.png` |
| 图标网格弹层开态（201 可交互子节点，320×402）              | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s1-popover-open-light-1280.png`                                           | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s1-popover-open-dark-1280.png`  |
| 搜索 "star" 过滤（18 命中）                                | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s1-popover-search-light-1280.png`                                         | —                                                                                    |
| 选中后 trigger 预览 + 清除钮出现                           | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s1-after-select-light-1280.png`                                           | —                                                                                    |
| 清除后回到占位                                             | —                                                                                                                              | —（DOM 断言 `afterClear:"Select an icon"`）                                          |
| S2 默认值 settings 预览                                    | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s2-default-value-light-1280.png`                                          | —                                                                                    |
| S3 disabled（trigger+清除均 disabled，force 点击不开弹层） | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s3-disabled-light-1280.png`                                               | —                                                                                    |
| S4 选择+提交 echo                                          | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s4-submitted-light-1280.png`                                              | —                                                                                    |
| 800 宽弹层开态（320 宽不出视口，overRight -179）           | `_tmp/visual-inspection-2026-09-23/r2-2a/icon-picker/s1-popover-open-800x900-light.png` / `default-800x900-light-fullpage.png` | —                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（图标格按钮 ≥ 40px 档；trigger 标准 Button）A4 pass（disabled：`triggerDisabled:true, opacity 0.5, clearDisabled:true`，force 点击不开弹层 `disabledOpensPopover:false`）A5 pass（搜索无命中走 ComboboxEmpty 通道）A6/A8 n/a A7 pass（弹层点外/Esc 关，无残留）A9 pass（选择→trigger 预览更新+清除钮出现；清除→回占位；S4 echo `LE-ICON:"a-arrow-down"`）
- B 颜色：B1–B4 pass（light 图标格与描边走令牌）B5 **warn（已知族）**：dark 弹层白底 + 搜索输入占位文字不可见（见 §4）B6 pass（选中态高亮）
- C 布局：C1 pass（三态溢出零命中；弹层内网格滚动为有意滚动）C2–C6 pass/n-a
- D 间隔：D1 pass（网格 6 列间距一致）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass（网格对齐）E5 pass E6 pass（"显示更多 (1513)"分页引导）
- F 一致性：F1 pass（弹层骨架与 combobox/select 同族）F2 n/a F3 pass F4 warn（已知族 F4-11："搜索/显示更多/清除"中文 chrome；触发器占位 "Select an icon" 为 schema 英文，两者混排）
- G 设计器：n/a
- H 弹层：H1 pass（320px 固定档贴合内容，非失控）H2 n/a H3 pass（402 ≤ 视口）H4–H7 n/a/pass H8 pass（网格区内部滚动）H9 pass

## 3. 发现条目

（无新立项发现：选择/清除/搜索/禁用/回写链路全部程序化通过。dark 弹层缺陷归 `--popover` dark 亮底已知族，本次出现"弹层内输入占位不可见"的加重形态，证据升级登记在 §4。）

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底 / dark 令牌组合（宿主已知问题，加重实例）**: dark 下图标网格弹层整面白底，且**弹层内搜索输入框变为灰底灰字、占位文字不可读**（`s1-popover-open-dark-1280.png` 顶部输入框）。与 detail-field 卡登记的"标签不可见"同根因不同表现：dark 前景令牌落在被钉白的弹层表面上。归 R2-4 dark 批修复，验收须覆盖本实例。
- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: 弹层内"搜索"占位、"显示更多 (1513)"、"清除"中文，与 schema 侧英文占位 "Select an icon" 同屏混排（`s1-popover-open-light-1280.png`）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-icon-picker` → carded（卡列填本路径）。
- 交互键上报：`{"lab-icon-picker":[{"action":"waitFor","ms":800},{"action":"click","selector":"[data-slot=icon-picker-trigger]"},{"action":"waitFor","selector":"[data-slot=popover-content]"}]}`
