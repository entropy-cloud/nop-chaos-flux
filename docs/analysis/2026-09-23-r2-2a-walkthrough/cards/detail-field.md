# [card] control:detail-field

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/detail-field` ｜ **载体**: lab 页（3 场景：用户资料 viewer+dialog / 收货地址 viewer+dialog / 投影 dialog 提交 bug73，triggerLabel="Edit Shipping"）
- **矩阵裁剪**: simplified（matrixReason：viewer 展示 + 编辑 dialog 双态，dialog 全链路已查：开/关/校验/回写/提交）。裁掉：disabled/readOnly（fixture 无对应用例）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                                  | light                                                                                                                          | dark（真 data-mode，自采）                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 默认 1280×800                         | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/default-1280-light-viewport.png` / `default-1280-light-fullpage.png`     | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/default-1280-dark-viewport.png` |
| S1 编辑 dialog 开态                   | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s1-dialog-open-light-1280.png`                                           | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s1-dialog-open-dark-1280.png`   |
| S1 必填错误态（清空 First Name 确认） | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s1-dialog-required-error-light-1280.png`                                 | —                                                                                     |
| S1 确认后 viewer 回写                 | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s1-after-confirm-light-1280.png`                                         | —                                                                                     |
| S3 自定义触发词 dialog                | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s3-dialog-open-light-1280.png`                                           | —                                                                                     |
| S3 提交 echo                          | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s3-submitted-light-1280.png`                                             | —                                                                                     |
| 800 宽 dialog 开态                    | `_tmp/visual-inspection-2026-09-23/r2-2a/detail-field/s1-dialog-open-800x900-light.png` / `default-800x900-light-fullpage.png` | —                                                                                     |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（焦点落进 dialog：`focusInDialog:true`）A3 pass A4 n/a A5 pass（必填错误态正常：`invalidCount 2`、"First Name不能为空"）A6/A8 n/a A7 pass（dialog 有关闭钮 X、Esc/取消可关、焦点困在弹层）A9 pass（确认后 viewer 即时回写 "Ada→Grace Lovelace"；S3 echo `Detail:{street…}` 草稿未泄露）
- B 颜色：B1 pass（light）B2 pass B3 pass（错误红语义）B4 pass（light chrome 走令牌）B5 **warn（已知族，加重实例）**：dark 下 dialog 白底 + **字段标签文字不可见**（见 §4）B6 pass（required 星号红、错误文本红）
- C 布局：C1 pass（三态溢出零命中）C2 pass C3 pass C4 pass（800 宽 dialog 560px 居中，`overRight -120`）C5 pass C6 n/a
- D 间隔：D1 pass（dialog 内字段垂直间距成栅格）D2–D8 n/a/pass（body padding 走 `--dialog-body-padding-*`，无双层 padding）
- E 排布：E1 pass E2 pass（确认 primary 蓝、取消 ghost）E3 pass（确认右主位：footer justify flex-end，取消 x751 < 确认 x847）E4 pass E5 n/a E6 n/a
- F 一致性：F1 pass（dialog 结构与 lab-dialog 卡 H 锚点一致：560px = `--overlay-size-md` 档）F2 n/a F3 pass F4 warn（已知族 F4-11：触发钮 "编辑User Profile"、错误文案 "First Name不能为空"、取消/确认 全中文）
- G 设计器：n/a
- H 弹层：H1 pass（560px 落 plan490 阶梯 md 档）H2 n/a H3 pass（h353 bottom 576 ≤ 792）H4 pass（关闭钮不与内容重叠；**注**：dialog 无标题文本，fixture 未配 title，不计缺陷）H5 pass（footer flex-end 右对齐、确认主位）H6 pass（label 顶对齐统一、间距成栅格）H7 pass（三段 padding 走令牌）H8 pass（内容短无滚动）H9 pass

## 3. 发现条目

（无新立项发现：viewer/dialog/校验/回写/提交链路全部程序化通过。dark 弹层缺陷归 `--popover` dark 亮底已知族且本次实例加重——标签不可见——证据升级登记在 §4，供 R2-4 修复批验证。）

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底 / dark 令牌组合（宿主已知问题，加重实例，两卡共用）**: dark（真 data-mode）下编辑 dialog 表面白底的同时，**字段标签文字以 light-token 前景色渲染在白底上，肉眼不可见**——仅剩 required 红星号（`detail-field/s1-dialog-open-dark-1280.png`、`detail-view/s1-dialog-open-dark-1280.png` 两卡同象；input 值文本仍深色可读）。dialog 卡登记该族时仅为"弹层整面白底"（文字可读）；本实例证明该族在 label/输入组合下会升级为**关键信息不可读**（按严重度表已达 P1 量级），归族修复（R2-4 dark 批）须以本实例为验收用例。
- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "编辑User Profile / 取消 / 确认 / First Name不能为空" 中文 chrome 与错误文案（`s1-dialog-open-light-1280.png`、`s1-dialog-required-error-light-1280.png`）。
- 计划内锚点复检通过：H1 尺寸阶梯 md560；H5 footer 右对齐（plan490）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-detail-field` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键上报：`{"lab-detail-field":[{"action":"waitFor","ms":800},{"action":"clickText","text":"编辑User Profile"},{"action":"waitFor","selector":"[data-slot=dialog-content]"}]}`
