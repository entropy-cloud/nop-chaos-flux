# [card] control:dropdown-button

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/dropdown-button` ｜ **载体**: lab 页（3 场景：basic click-trigger 菜单 / hover-trigger 菜单 / host CRUD 行下拉 + Edit Row 弹层（C5.2 bug 73 pattern））
- **矩阵裁剪**: simplified（matrixReason：本控件核心面即弹层，菜单开态全链路已查（开/关四通道/焦点落点/几何/悬停态/dark/窄视口）；裁掉：disabled trigger 变体（fixture 未布）、菜单长列表滚动（fixture 最多 3 项）、分裂按钮形态（本实现为单 trigger 内嵌 caret，无独立 caret 动作区，见 §4 说明））

## 1. 截图清单

| 状态                    | light                                                                                          | dark（真 data-mode，自采）                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 默认 1280×800           | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/default-1280-light.png`               | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/default-1280-dark.png`            |
| 默认 800×900            | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/default-800-light.png`                | —                                                                                          |
| 菜单开（click trigger） | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/menu-open-1280-light.png`             | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/menu-open-1280-dark.png`          |
| 菜单项 hover            | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/menu-item-hover-1280-light.png`       | —                                                                                          |
| hover trigger 菜单开    | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/hover-menu-open-1280-light.png`       | —                                                                                          |
| Set Flag 派发后（A9）   | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/after-set-flag-1280-light.png`        | —                                                                                          |
| CRUD 行菜单开           | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/crud-row-menu-open-1280-light.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/crud-row-menu-open-1280-dark.png` |
| Edit Row 弹层开         | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/crud-edit-dialog-open-1280-light.png` | —                                                                                          |
| 弹层提交后              | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/crud-after-submit-1280-light.png`     | —                                                                                          |
| 菜单开 800 窄视口       | `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/menu-open-800-light.png`              | —                                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（菜单项 hover `bg-accent`+文字翻转 primary）A2 pass（开菜单后焦点落入菜单 content，`inMenu: true`）A3 pass（菜单项 28px 高；`smallTargetScan` 命中项均为场景 3 CRUD 表格列宽手柄（4×40）与 sr-only 元素，非本控件面，白名单排除）A4 n/a A5 n/a A6 n/a A7 **fail(R2-2b-A7-155)**（hover trigger 菜单指针离开后不关闭，见条目；click trigger 关闭四通道全通过）A8 n/a A9 pass（Set Flag 点击→`dropdown:clicked`、菜单随项点击关闭、Esc 关、外点关）
- B 颜色：B1 pass（Delete destructive light 5.55:1；dark 4.73:1）B2 pass（菜单 ring-1 ring-foreground/10）B3 pass（destructive 语义色正确）B4 pass（bg-popover/text-popover-foreground 令牌）B5 **族命中**（dark 菜单整面亮底 `rgb(251,250,249)`——宿主 `--popover` dark 亮底已知族，见 §4）B6 pass
- C 布局：C1 pass（1280/800 双轮 docOverX=0）C2 pass C3 pass C4 pass（800 菜单 128px 无溢出）C5 n/a C6 n/a
- D 间隔：D1 pass（菜单项间 0 gap + p-1 容器 padding，shadcn 菜单解剖学）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass（菜单项左对齐为菜单惯例，与弹层 footer actions 左对齐族无关）E4 pass（菜单左缘与 trigger 左缘对齐，alignLeftEdge=0）E5–E6 n/a
- F 一致性：F1 pass（与 ui DropdownMenu 同源）F2–F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（菜单宽 128=min-w-32 档；Edit Row 弹层 560=`--overlay-size` base 档，plan490 锚点复检通过）H2 n/a H3 pass（弹层 bottom 317 ≤ 792）H4 pass（关闭钮独立右上，无求交）H5 **族命中**（Edit Row 弹层无 footer 区，OK 按钮左对齐于 body——弹层 actions 左对齐已知族实例，见 §4；wizard-in-dialog 场景则 footer flex-end 正确）H6 pass（label 顶对齐）H7 pass H8 n/a（弹层内容单字段无长内容）H9 pass（800 视口弹层 560 居中不溢出）

## 3. 发现条目

### [R2-2b-A7-155] trigger="hover" 菜单指针离开后不关闭：aria-expanded 恒 true，菜单悬挂至 hover 菜单本体或 Esc/外点

- **页面/路由**: `#/lab/dropdown-button`（场景 2 hover-triggered dropdown menu；一切 `trigger:'hover'` 用法同险）
- **主题/视口/状态**: light / 1280 / 指针自 trigger 阶梯移出（未进入菜单）后 300–1000ms
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/dropdown-button/hover-menu-open-1280-light.png`（开态正常；关闭失败态以探针数值坐实）
- **目视描述**: 悬停 "Hover Menu" 打开菜单后，鼠标直接移向页面其他区域，菜单保持悬挂不收；用户须先把指针移到菜单上再移出、或 Esc、或点击别处才能关掉。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-ddb-hover-diag.mjs`（阶梯指针路径）、`w5-ddb-hover-mech.mjs`（pointer-events/事件机制）、`w5-ddb-hover-state.mjs`（状态判定）
  - 输出: 阶梯移出 trigger 后 +200ms/+800ms 菜单均 `open: true`；`afterLeave: { leaveFired: true, outFired: true, menuStillOpen: true }`（wrapper pointer-events auto、无 overlay，原生 mouseleave 已触发）；`afterLeaveState: { ariaExpanded: "true", menuDataClosed: null, opacity: "1" }`——渲染器 150ms 宽限关闭定时器（`dropdown-button-renderer.tsx` P1-04 `scheduleHoverClose`）在 React 合成 `onMouseLeave` 层未生效。对照：指针进入菜单后再离开（`left-menu-850ms: open false`）正常关闭。
- **对照基准**: 检查提示词 A7（弹层关闭通道完整）/ NN/g 悬停菜单惯例（pointer leaves trigger+menu 组合即收）
- **严重程度**: P2（hover 菜单是文档化公开 prop；悬挂菜单遮挡下方内容、与用户心智明确冲突；恢复路径存在故不升 P1）
- **用户影响**: hover 触发后移开鼠标，菜单长时间滞留屏幕，误触率高；触达菜单外信息的用户被迫先处理悬挂层。
- **修复方向**: `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`：wrapper `onMouseLeave` 的 `scheduleHoverClose` 在菜单打开态被 Base UI 受控 open 链路吞没——改为将 hover-close 逻辑下沉到 Base UI `openOnHover` 原生通道（Menu.Root 支持 `openOnHover`+`delay`），或监听 document 级 pointermove 判定"离开 trigger 且未入菜单"后 `setOpen(false)`。
- **归族**: local → R2-3 批（hover 关闭链路单点修复；与 A1-01 不同根因）
- **复核状态**: 已复核（保留 P2，机制精化，review-b 2026-09-24）：悬挂实测 ≥2000ms；同一关闭定时器 menu 侧生效、wrapper 侧失效差分实证

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底（宿主已知问题，R2-4 引用）**：dark（真 data-mode）下菜单 popup `bg: rgb(251,250,249)` 整面亮底（`menu-open-1280-dark.png`、`crud-row-menu-open-1280-dark.png` 双实例）；同屏呈现混色——高亮项 dark accent 底 `rgb(36,47,66)`+亮字、非高亮项沿用 light 前景 `rgb(103,87,76)`（恰因底也是亮底而可读 6.62:1）。修复后需本卡 B5/H 复检。
- **弹层 actions 左对齐（R2-3b/R2-2a-H5-09 族）**：CRUD Edit Row 弹层 OK 按钮左对齐于 body（`footerFound: false`，`crud-edit-dialog-open-1280-light.png` 实例证据）；注意同 lab 的 wizard-in-dialog 弹层 footer `justify-content: flex-end` 正确——两组弹层同页异态放大不一致感（同 dialog 卡 H5-09 结论）。
- **非分裂按钮说明**：触发器为单 Button 内嵌 ChevronDown caret（`dropdown-button-renderer.tsx` L132-156），无独立 caret 动作区——不构成分裂按钮缺陷，本卡按单体按钮口径走查；split 形态若为需求应另立 schema 契约。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-dropdown-button` → carded（卡列填本路径）；findings 归族后 → digested。
