# [card] control:gantt

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/gantt` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：C9 host-gantt-dialog——gantt 位于 openDialog surface 内，onTaskClick dispatch probe；3 任务（Design review/Implementation/QA pass）、无 links、无里程碑/汇总条）。注意：gantt demo **页面**已在 R2-1d 走查（`docs/analysis/2026-09-23-r2-1d-walkthrough/cards/gantt.md`，B1-01/A2-01/A3-01/F4-01 已裁定）；本卡为 **lab 载体控件面**首查，独立台账单元
- **矩阵裁剪**: full（任务口径 FULL 项全做：拖拽中 mid/end、选中态、时间线缩放（−/+ 与 适应）、当前态（今日线+今日钮）、编辑弹层（light+dark）、dark 全套（真 data-mode）、~800 窄视口、A6/A8 专项；裁掉并注明：①里程碑/基线/汇总条/连线——fixture 无此类任务形态（R2-1d 已裁定其 A3/B1 面）；②双击单元格行内编辑（gantt-grid dblclick 通道）未单独走查——编辑弹层（同一编辑数据面）已双主题取证；③glass 皮肤（波次统一））
- **探针**: `_tmp/r2-2c-probes/w3-gantt.mjs`、`w3-gantt2.mjs`、`w3-gantt3.mjs` → `out-w3-gantt*.json`；像素采样 `_tmp/r2-2c-probes/w3-pixels.mjs`（gantt 段）→ `out-w3-pixels-gantt.json`

## 1. 截图清单

| 状态                                      | light                                   | dark（真 data-mode）                |
| ----------------------------------------- | --------------------------------------- | ----------------------------------- |
| 默认 1280×800（弹层内）                   | `…/gantt/default-1280-light.png`        | `…/gantt/default-1280-dark.png`     |
| 选中态（点选任务条）                      | `…/gantt/bar-selected-1280-light.png`   | `…/gantt/selected-1280-dark.png`    |
| 拖拽 mid（任务条跟手 + 网格日期实时回显） | `…/gantt/drag-mid-1280-light.png`       | —                                   |
| 拖拽 end（落位后，+1 日持久化）           | `…/gantt/drag-end-clean-1280-light.png` | —                                   |
| 编辑弹层（双击任务条）                    | `…/gantt/editor-open-1280-light.png`    | `…/gantt/editor-open-1280-dark.png` |
| 缩放 −（zoom out）                        | `…/gantt/zoom-out-1280-light.png`       | —                                   |
| 适应（zoom-to-fit）                       | `…/gantt/zoom-fit-1280-light.png`       | —                                   |
| 今日按钮滚动后（今日线入视口）            | `…/gantt/today-scrolled-1280-light.png` | —                                   |
| 默认 ~800 宽                              | `…/gantt/default-800-light.png`         | —                                   |

（`…` = `_tmp/visual-inspection-2026-09-25/r2-2c`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（任务条 hover `brightness(1.1)` + cursor pointer 探针坐实） A2 **warn（家族引用：任务条 tabIndex=0 且有 `focus:ring-2 focus:ring-ring` 类，但载体上点击后 activeElement 落在 dialog-header（见 A8-87），键盘焦点环可达性被宿主吞掉——R2-1d-A2-01 同域，维持原裁定）** A3 **warn（家族引用：网格/时间线分隔拖柄 6×448「调整网格面板」<24——R2-1d-A3-01 族（里程碑 12×12/列宽手柄 4×39.5 先例）新实例，见 §4；工具栏 4 钮均 28–48px 达标）** A4 pass（无 disabled 态入口 n/a；zoom 到底后 − 钮为幂等非禁用——watch 观察） A5 n/a **A6 pass（拖拽链路：条体跟手 + 网格 START 日期实时回显 + 落位持久（`w3-gantt3.mjs` 干净真实拖拽：Design review 2026-09-20→2026-09-21，其余任务不动，弹层保持打开）；载体上未见独立 ghost 元素与吸附参考线（dragMidProbe 0 命中，demo 页有——[needs-confirm] 挂 §4）** A7 pass（编辑弹层 480×416、关闭钮/取消/保存齐全、Esc 可关） **A8 fail(R2-2c-A8-87：弹层宿主内键盘移动任务失效)** A9 pass（拖拽落位后网格日期持久变更、今日钮滚动到位（todayX 819 入视口））
- B 颜色：B1 **warn（家族引用：任务条标签白字于 primary 蓝 light ≈3.3:1（像素）/4.6:1（核心值边缘）、dark 3.26:1（<4.5 小字）——R2-1d-B1-01 族新数值，见 §4）** B2 pass B3 pass（今日线/条色语义稳定） B4 pass B5 **warn（家族引用：dark 下网格行文本 2.62:1、刻度日号 2.89:1、工具栏文字 2.06:1（像素采样，棕 #67574C 系 = `--secondary-foreground` 不翻转）——R2-2a-B5-04 族集中实例，见 §4；弹层壳 dark 亮底 = 宿主 `--popover` 族）** B6 pass
- C 布局：C1 pass（docOverX=0；时间线横向滚动为有意） C2 pass C3 pass **C4 fail(R2-2c-C4-86：网格固定 320px → 弹层内时间线仅剩 154px，初始视口今日线与 2/3 任务条在视口外、网格列头被中截断)** C5 pass（横向滚动在 timeline 容器、无双滚动条） C6 n/a
- D 间隔：D1 pass（行高 40px 全网格一致（rowHs:[40]）） D2–D8 pass/n-a
- E 排布：E1 pass（「3 个任务可见」+ 工具栏可答三问） E2 pass（编辑弹层取消 outline / 保存 primary 主位（截图坐实）） E3 pass E4 pass（网格/时间线左缘对齐） E5 pass E6 n/a
- F 一致性：F4 **warn（家族引用：工具栏「适应/今日/缩小/放大」zh 与网格日期 EN 格式混排——R2-1b-F4-03/R2-1d-F4-01 族）** F1/F3 pass F5 n/a
- G 设计器（画布类）：G1 pass（选中行高亮 + 端点手柄形态维持 demo 卡结论） G2 pass（条 cursor pointer/hover 提亮） G3 pass（拖拽跟手 + 日对齐落位；参考线缺失见 §4 needs-confirm） G4 n/a（fixture 恒非空） G5 pass（zoom −/适应 后条坐标跟随（afterZoomOut/afterFit bar x/w 实测），但缩放已在地板档（~40px/格）无法再收——fixture 18 天跨度在 154px 时间线上物理放不下，归 C4-86） G6 pass（undo/redo 工具栏在位，demo 卡已证） G7 n/a G8 **warn（见 B5 家族引用：dark 网格文字可读性不足）**
- H 弹层：H1 pass（Gantt host 560px = md 档；编辑弹层 480px = sm 档，均在 plan490 阶梯） H2 n/a H3 pass（编辑弹层 416px 高 < 视口） H4 pass（标题/关闭钮无重叠） H5 pass（取消左/保存右、justify-end、保存 primary 主位（editorOpen.footerJustify flex-end + 截图）） H6 pass（label 顶对齐统一、字段垂直间距均一） H7 pass（三段 padding 走 dialog 令牌） H8 n/a（编辑弹层内容不滚动） H9 pass（800 视口弹层不溢出）

## 3. 发现条目

### [R2-2c-C4-86] 网格固定 320px 不随容器收缩：弹层内时间线仅剩 154px，初始视口今日线与 2/3 任务条不可见、网格列头被截断

- **页面/路由**: `#/lab/gantt`（C9 host-gantt-dialog；一切 560–800px 级容器内的 gantt 宿主同险——弹层、分栏、半屏窗口）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 弹层开 · 默认初始视口
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/gantt/default-1280-light.png`、`default-1280-dark.png`、`default-800-light.png`
- **目视描述**: 弹层内 gantt 可用宽 480px，左侧网格仍占固定 320px（「任务/开始/结束/工期/前置」五列，「结束」被右缘截成「结」字），时间线只剩 ~110–154px——仅见 Design review 条的左端一小段，Implementation/QA pass 两整条与今日竖线全部在弹层右缘之外，首屏无法回答「任务都排在哪」。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-gantt.mjs`（default/narrow）、`w3-gantt2.mjs`（afterFit/afterToday）
  - 输出: `gridRect {w:320}`（1280 弹层与 800 窄视口同值——**固定宽**）、`scaleRect {w:154}`；bars `x:806/1006/1286`（弹层右缘 920，两条全离屏）；`todayMarker x:966`（离屏）；`afterFit`：适应后 bars `782/982/1262`、`todayVisible.inViewport:false`——fit 也救不回（18 天任务跨度的物理下限）；`afterToday`：今日钮滚动后 `todayX:819` 入视口（唯一缓解入口）；overflowLight `docOverX=0`（横向滚动存在于 timeline 容器内，为有意滚动白名单，但初始视口分配本身失衡）。
- **对照基准**: 检查提示词 C3（主轴分区占比合理）/C4（视口弹性不塌不挤）；R2-1d-C3-01 watch 条（初始视口在时间轴范围外——本条机制不同：非 fixture 数据问题，是网格/时间线宽度分配契约）
- **严重程度**: P2（任务数据不丢、可横滚+「今日」钮缓解，但默认首屏大面积空时间线 + 关键列头截断，高频入口的可用性/观感受损；不判 P1 因有可用缓解路径且非数据不可读）
- **用户影响**: 用户打开弹层先看到近乎空白的时间线和残缺列头，需要额外操作（横滚/点今日）才能看到任务全貌。
- **修复方向**: `gantt-layout.tsx` 网格宽度改为 `min(320px, 容器 40%)` 之类的比例上限（或提供 `gridWidth: 'auto'` 契约），容器 <640px 时网格列自动合并（隐藏 开始/结束 仅留 任务/工期）；初始视口默认对齐今日（`scrollToDate(today)` 挂载默认），保留「今日」钮为手动回中。
- **归族**: systemic → R2-3 批（gantt 网格/时间线宽度分配契约，与「窄视口 flex/固定壳层族」同域收口；R2-1d-C3-01 watch 条合并重审）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-25）

### [R2-2c-A8-87] 弹层宿主内键盘移动任务失效：点击任务条后焦点落在 dialog-header，方向键被宿主拖框语义占用

- **页面/路由**: `#/lab/gantt`（C9 host-gantt-dialog；一切「dialog 宿主 + gantt」组合）
- **主题/视口/状态**: light / 1280 / 弹层开 · 点选任务条后按 ArrowRight
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/gantt/bar-selected-1280-light.png`（点击后现场；键盘路径为探针数值证据）
- **目视描述**: 无视觉异常——但键盘用户点击任务条后再按方向键，任务不动（弹层宿主的「方向键移动对话框」接管按键）；页尾 a11y 提示「使用方向键移动对话框」与 gantt 自身键盘移动语义正面冲突。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-gantt2.mjs`（kbMove）
  - 输出: 真实点击任务条后 `focusAfterClick: "dialog-header"`（任务条 tabIndex=0 却未持有焦点）；ArrowRight 前后网格文本完全一致（`before === after`，Implementation 2026-09-25→2026-10-03 未动）；demo 页（无弹层宿主）同路径 A8 pass（`use-gantt-keyboard` 单测覆盖）——宿主 dialog-host 的方向键拖框监听抢占了按键且点击后焦点被挪到 header。
- **对照基准**: WCAG 2.5.7（拖拽功能必须有单指针替代——键盘移动即 gantt 拖拽的无鼠标替代途径，失效即替代缺失）；检查提示词 A8；NN/g 键盘可达性
- **严重程度**: P2（弹层宿主为 C9 集成测试的标准宿主形态，键盘用户在此形态下无法移动任务，仅剩纯鼠标拖拽一条路）
- **用户影响**: 不能用鼠标的用户（运动障碍/读屏）在弹层内丧失任务排程能力；无任何提示告知键盘路径不可用。
- **修复方向**: `dialog-host.tsx` 方向键拖框仅应在焦点位于 header 拖柄时接管（现疑似全局捕获），gantt 条点击后不劫持焦点（`preventDefault` 移除）；或 gantt 键盘移动改用带修饰键路径（Alt+方向键）与宿主语义区隔。回归用例：弹层内点条 → ArrowRight 任务 +1 日。
- **归族**: systemic → R2-3 批（dialog-host 与画布类控件键盘语义冲突单点根因，calendar/kanban 弹层宿主同险面一并排查）
- **复核状态**: 已复核（驳回，review-a 2026-09-25）：三项承重前提全部证伪——①点击条后焦点落 grid-row TR 而非 dialog-header（双宿主实测）；②弹层方向键移动是 header-scoped（dialog.tsx L248-298 绑 header 元素），聚焦 grid 行按方向键弹层不动；③Enter 在弹层内打开"编辑任务"表单，键盘非拖拽替代完整存在（WCAG 2.5.7 满足）；demo 页 ArrowRight 同样不动日期，"宿主冲突"差异因子不存在

## 4. 已知族命中（引用，不另立项）

- **R2-2a-B5-04（`--secondary-foreground` 不随 dark 翻转，P1 族，R2-4 首批）— 本卡集中数值证据**：dark 下网格行文本 2.62:1、刻度日号 2.89:1、工具栏「适应/今日」2.06:1（像素采样 `w3-pixels.mjs`；fg 核心即棕 `rgb(103,87,76)` ≈ playground `:root --secondary-foreground: 25 20% 35%` 的 hsl 解析值，`[data-mode='dark'] .nop-theme-root` 块未翻转——`apps/playground/src/styles.css` L80/L190+）。同 token 实例遍及 kanban 列头/calendar 头（各卡 §4）。
- **宿主 `--popover` dark 亮底族（R2-1a/R2-2a 已裁定）**：Gantt host 与编辑弹层壳 dark 下保持亮底（`default-1280-dark.png`/`editor-open-1280-dark.png`），gantt 内容面板自身已翻暗 → 白壳+暗面板对比刺眼；根因同上（`:root --popover: 30 20% 98%` 不翻转）。
- **R2-1d-B1-01（gantt 条标签对比度，P1 族）— 新数值**：任务条白字于 primary 蓝：light 像素 3.31:1（核心值 ≈4.6:1 边缘达标）、dark 3.26:1（<4.5，12px 小字）——dark 平价族实例。
- **R2-1d-A3-01（gantt 小目标族，watch）— 新实例**：网格/时间线分隔拖柄「调整网格面板」**6×448px**（`w3-gantt2.mjs splitter`；demo 页先例为列宽手柄 4×39.5）。
- **A6 ghost/参考线缺失 [needs-confirm]**：拖拽 mid 帧未检出独立 ghost 元素与吸附参考线（`dragMidProbe` 0 命中），条体本身跟手 + 网格日期实时回显构成反馈链；demo 页（R2-1d-G3 pass）有虚线 ghost + 参考线——差异可能为探测选择器未覆盖，挂独立复核重放。
- 误报排除：①合成 `pointerup`（无 clientX）导致任务条跳到 0 时刻、拖拽中 mouse.up 落在遮罩上关闭弹层——均为**探针人造事件伪影**，已用干净真实拖拽复测证伪（`w3-gantt3.mjs`：+45px → +1 日精确落位、弹层保持打开、其余任务不动）；②「zoom 无效」——zoom − 后刻度已在地板块（~40px/格），fixture 18 天跨度在 154px 时间线放不下属 C4-86 的容器分配问题，非缩放控件失效；③编辑弹层「保存 outline variant」为探测正则误匹配（`outline-none` 工具类），截图坐实保存为 primary 主位。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `gantt`（control/R2-2c）→ carded（card 列填本路径）；C4-86/A8-87 归族 R2-3 后 → digested。
