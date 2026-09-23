# [card] control:drawer

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/drawer` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：右侧表单抽屉 / 左侧导航抽屉）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——drawer 为单弹层 surface，开态必查已全做（点外关/Esc 关/footer 按钮/宽度档/焦点/左右两侧）；裁掉的状态：glass 皮肤、`resizable` 拖宽把手态（fixture 未开启）、top/bottom 侧向（fixture 未覆盖，走 dialog-host direction 映射源码核对）、长内容滚动契约（本 fixture 内容不超高））
- **runner dark 列作废声明**：同前（R2-2a-B5-34），dark 证据以自采 `r2-2a/drawer/` 显式 data-mode 截图为准。

## 1. 截图清单

| 状态             | light                                                                      | dark（真 data-mode，自采）                                                        |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 默认 1280×800    | `_tmp/visual-inspection-2026-09-23/lab-drawer-default-1280x800-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/drawer/right-open-dark-1280.png`（开态） |
| 默认 800×900     | `_tmp/visual-inspection-2026-09-23/lab-drawer-default-800x900-light.png`   | —                                                                                 |
| 右抽屉开（表单） | `_tmp/visual-inspection-2026-09-23/r2-2a/drawer/right-open-light-1280.png` | 同上 dark 列                                                                      |
| 左抽屉开（导航） | `_tmp/visual-inspection-2026-09-23/r2-2a/drawer/left-open-light-1280.png`  | —                                                                                 |
| 右抽屉开 800×900 | `_tmp/visual-inspection-2026-09-23/r2-2a/drawer/right-open-light-800.png`  | —                                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 pass（归 button 卡 A1 族，弹层内按钮同源不重复）A2 pass（焦点落抽屉容器内、Esc/外点关闭通道全通）A3 pass A4 n/a A5 n/a A6/A8 n/a A7 pass（关闭钮、遮罩、焦点落点齐备）A9 pass（关闭即时生效）
- B 颜色：B1–B4 n/a/pass B5 warn（**已知宿主问题引用不另立项**：dark 下抽屉整面 `rgb(251,250,249)` 白底（`rightOpenDark` 探针 + 截图），且标题 "Add Note"、label "Note"、placeholder 亮色文字在亮底上不可见——后果比 dialog 场景更重，仍归 `--popover dark 亮底` 同一宿主问题，修复后必须本卡复检）B6 n/a
- C 布局：C1 pass（右抽屉 479px、800 视口不溢出、无横向滚动）C2 pass（标题/关闭钮无重叠；左抽屉标题被调试 chip 覆盖归 chip 已知问题引用）C3 pass C4 pass（800 宽抽屉仍 479px 合理）C5 n/a C6 n/a
- D 间隔：D1 pass（footer gap 8px）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（Save primary / Cancel outline 主次正确）E3 warn（Save/Cancel 左对齐在 body 内——归 R2-2a-H5-09 已知族，见 dialog 卡；footer 通道本身存在）E4–E6 n/a/pass
- F 一致性：F1 **warn(R2-2a-H5-12)**（抽屉 footer 按钮形态与弹层 footer 不一致）F2–F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（宽 479px ≈ `--overlay-size-sm` 480 档，sm 视口封顶生效；窄视口未回退全宽仍可用）H2 pass（表单抽屉在 479px 内无溢出，宽度够用）H3 pass（高度贴视口 800/800，抽屉类贴边为有意设计）H4 pass H5 **warn(R2-2a-H5-12)**（footer Close 全宽拉伸 vs 弹层 footer 紧凑右对齐）H6 pass（label 顶对齐、字段间距栅格）H7 pass（header/body/footer padding 走令牌）H8 n/a（本 fixture 无长内容）H9 pass（800 视口不溢出、形态合理）

## 3. 发现条目

### [R2-2a-H5-12] 抽屉 footer 按钮全宽拉伸 vs 弹层 footer 紧凑右对齐：跨 surface footer 形态不一致

- **页面/路由**: `#/lab/drawer`（左导航抽屉 footer Close 按钮；对照 `#/lab/dialog` real-schema footer）
- **主题/视口/状态**: light / 1280 / 抽屉开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/drawer/left-open-light-1280.png`（Close 通栏 431px）
- **目视描述**: 左抽屉 footer 的 Close 按钮拉伸到几乎整个抽屉宽（431/479），而 dialog footer 的取消/确定是紧凑按钮右对齐——同是 surface footer，两种形态语言。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-overlays.mjs`
  - 输出: 左抽屉 `footerJustify: 'normal', footerGap: '8px', footerButtons: [{ text: 'Close', x: 24, w: 431 }]`（单钮占满可用宽）；对照 dialog `footerJustify: 'flex-end'` + 按钮 w 72。判据 H5"跨弹层一致/按钮间距走 `--dialog-footer-gap`"——gap 一致但 justify 与按钮宽度形态不一致。
- **对照基准**: 检查提示词 H5（footer 按钮排布跨弹层一致）/ F1（同语义操作同形态）
- **严重程度**: P3（不破坏任务；形态分裂让"取消"在不同弹层位置手感不同）
- **用户影响**: 用户在 dialog 里养成"右下角找取消"的习惯，在抽屉里失效（取消在左下通栏）。
- **修复方向**: 统一形态语言：ui `DrawerFooter` 的按钮条与 DialogFooter 对齐（`justify-end` + 紧凑按钮，或抽屉窄边场景明确 `w-full` 仅限移动端断点）；在 styling-system.md「Overlay Size Ladder And Anatomy」补 footer 形态规约一句。
- **归族**: watch-only → 台账（疑为 ui 层有意差异——shadcn 移动端惯例；桌面 1280 下观感不一致，建议 design.md 裁决后转 systemic 或关闭）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- `--popover dark 亮底`（宿主已知问题）：`right-open-dark-1280.png` 抽屉白底且标题/label/placeholder 不可见——后果加重的实例面，引用宿主问题；修复后需本卡 B5/E3 复检。
- 弹层 actions 左对齐族：右抽屉 Save/Cancel 左对齐于 body（`right-open-light-1280.png`）——同族实例，条目正文见 dialog 卡 R2-2a-H5-09，不重复立项。
- 调试 chip z9998 遮挡：`left-open-light-1280.png` 左抽屉标题 "Navigation" 被 chip 压住——引用 chip 遮挡已知问题（此实例恰好遮住的是弹层标题，修复 chip 后需复检 H4）。

## 5. 计划内锚点复检通过

- plan490 阶梯：抽屉 sm 档 480 封顶生效（实测 479px 含边框）；`data-mobile-side-overridden` 移动端底抽屉映射源码核对一致；遮罩/关闭钮/Esc/点外关全部通过（`outsideClosed: true, escClosed: true`）。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-drawer` → carded（卡列填本路径）；findings 归族后 → digested。
