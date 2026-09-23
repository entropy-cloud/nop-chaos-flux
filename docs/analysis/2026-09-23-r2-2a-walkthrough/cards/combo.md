# [card] control:combo

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/combo` ｜ **载体**: lab 页（3 场景：双字段联系人卡（addable/removable/reorderable）/ min1-max5 行项 / 嵌套多行提交 bug73）
- **矩阵裁剪**: simplified（matrixReason：行内复合卡片编辑，无弹层面；min/max 边界与增删移排序已覆盖）。裁掉：disabled/error（fixture 无对应用例）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                               | light                                                                                                                 | dark（真 data-mode，自采）                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800                      | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/default-1280-light-viewport.png` / `default-1280-light-fullpage.png`   | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/default-1280-dark-viewport.png` |
| 增行并填值（3 卡）                 | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s1-row-added-light-1280.png`                                           | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s1-row-added-dark-1280.png`     |
| 上移换位后（Bob/Alice/Carol）      | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s1-after-move-up-light-1280.png`                                       | —                                                                              |
| S2 min 边界（删除禁用）            | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s2-min-bounds-light-1280.png`                                          | —                                                                              |
| S2 max 边界（添加禁用 + 5/5 提示） | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s2-max-bounds-light-1280.png`                                          | —                                                                              |
| S3 编辑+提交 echo                  | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s3-submitted-light-1280.png`                                           | —                                                                              |
| 800 宽增行                         | `_tmp/visual-inspection-2026-09-23/r2-2a/combo/s1-row-added-800x900-light.png` / `default-800x900-light-fullpage.png` | —                                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（上移/下移/删除 icon-sm 28px 档）A4 pass（**边界禁用可感知**：min 时删除 disabled、max 时添加 disabled + "已达最大条目数（5/5）"提示，`s2AtMin.removeDisabled:true`、`s2AtMax.addDisabled:true`）A5 n/a（combo-empty 槽在 S2 未走到——fixture 起始 1 条；空态文案通道存在未复核）A6/A8 n/a（排序按钮化，无拖拽面）A7 n/a A9 pass（`s1AfterAdd 3`、`s1AfterRemove 2`、moveUp 值序翻转 `["Alice","Bob","Carol"]→["Bob","Alice","Carol"]`、S3 echo `Combo:[{"name":"Alice2",…}]` 行隔离正确）
- B 颜色：B1–B4 pass B5 pass（dark 下卡片/按钮/dashed 上传行正常）B6 pass（错误文本 destructive 红仅出现在真错误，见 input-file 卡同族对照）
- C 布局：C1 pass（**零溢出命中**：structuralLight/Dark/Narrow hits 均 0）C2–C6 pass/n-a
- D 间隔：D1 pass（卡片间距一致、卡内双字段行距成栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass（行操作钮右侧纵排一致）E4 pass E5 pass（卡片分组视觉语言统一）E6 n/a
- F 一致性：F1 pass（增删移图标与 array-editor/array-field 同族同位）F2 n/a F3 pass F4 warn（已知族 F4-11："添加项/上移/下移/删除/已达最大条目数（5/5）"中文 chrome）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新立项发现。本控件为 wave5 内最干净载体：结构探针三态零命中，边界禁用、行隔离、值提交全部程序化通过。）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "添加项 / 上移 / 下移 / 删除 / 已达最大条目数（5/5）"中文 chrome（`s2-max-bounds-light-1280.png`）。
- min/max 边界行为作为 **A4 正面锚点**登记：禁用态 + 计数提示双通道，后续复合控件边界态可对照。
- 窄视口、dark 均无族命中。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-combo` → carded（卡列填本路径）。
- 交互键上报：`{"lab-combo":[{"action":"waitFor","ms":800},{"action":"clickText","text":"添加项"},{"action":"waitFor","ms":300}]}`
