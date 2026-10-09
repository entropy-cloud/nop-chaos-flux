# IS-8c scheduling lab 4 页序列审查证据（plan 554 基线）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4/§6/§9；单审查组独立 fresh session 真实驱动浏览器取证（2026-10-09，~30 序列，读数定罪）。1 处探针伪影撤案（**c9ganttClick vs **c9GanttClick 键名大小写——正确键复验 + 已提交 spec 交叉核对）。

## Findings 摘要（8 台账行 = P1×1 + P2×2 + P3×5；其中 2 项 P3 watch-only）

| ID                       | 页面              | 症状                                                                                                                                                                                          | 类别/级别 | 归属                                                                                       |
| ------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| IS-lab-gantt-001         | lab-gantt         | 对话框场景 gantt 条逃逸 dialog surface 与时间线裁剪视口（条 x 1333–1613 vs dialog 570–1130，裁剪视口仅 ~154px）；条上 pointerdown 静默 dismiss 宿主 dialog 并中断拖拽（零反馈）；两轮独立复现 | B/P1      | renderer（gantt-bars 层未钳入时间线裁剪视口）× demo（560px dialog 容纳 1120px 内容共因子） |
| IS-lab-kanban-001        | lab-kanban        | 空列/列体指针投放不注册（渲染「拖拽卡片到此处」邀请为假供纳）；判别组精确锁定失败面=列体（卡片落点/列头换序/键盘空列目标全成功——锐化 IS-kanban-001）                                          | C/P2      | renderer（kanban 列 drop-zone 注册候选链）                                                 |
| IS-lab-calendar-001      | lab-calendar      | 跨资源拖拽确认框必以静默 no-op 结束（lab schema 未声明 onEventChange；确认后零变化零 toast）                                                                                                  | C/P2      | demo 接线                                                                                  |
| IS-lab-gantt-002         | lab-gantt         | resize 手柄右缘 zone 横跨对话框边界不可用（1127..1133 跨 1130 边界）+ grid scrollLeft 0→54 来源未定位——watch-only（随 gantt-001 修复后复测）                                                  | —/P3      | renderer×demo 几何（watch）                                                                |
| IS-lab-calendar-002      | lab-calendar      | 【watch】calendar 次生表现登记（见审查报告 watch 节）                                                                                                                                         | —/P3      | —                                                                                          |
| IS-lab-barcode-input-001 | lab-barcode-input | 【watch】同 IS-barcode-input-001 族（headless 无摄像头 n-a 先例）                                                                                                                             | —/P3      | renderer                                                                                   |
| IS-lab-barcode-input-002 | lab-barcode-input | 【watch】次生观察（见审查报告）                                                                                                                                                               | —/P3      | —                                                                                          |
| IS-lab-calendar-003      | lab-calendar      | 【watch】次生观察（见审查报告）                                                                                                                                                               | —/P3      | —                                                                                          |

（P3 watch 行的确切症状以 survey-readings.json findings 数组为准——本卡摘要表收录 P1/P2 全文与 P3 计数。）

## n-a 与豁免登记

- lab-barcode-input 扫码本体 headless 不可驱（IS-barcode-input-001 先例）。
- 反模式 (a) `${event.*}` 模板 REFUTED：全部派发载荷模板求值成功（对已提交绿 spec c9-host-surfaces 交叉核对）。

## 处置（plan 554 Phase 2）

IS-lab-gantt-001（唯一 P1）归属 renderer×demo 共因子，根因未证实到行（gantt-bars 层 absolute 定位 + scroll-sync 模式无 overflow clip 的候选链已记录）——**显式 successor-required**（需专案 live bisect：dialog transform 包含块/裁剪链/scroll-sync 三候选），本批不虚假修复。P2 kanban/calendar 与 P3 watch 全部显式登记。零 P0。无已验证修复面 → renderer-lab-c spec 不建（plan Phase 2 零 P0/P1 修复路径注记）。

## plan 556 live bisect 附节（2026-10-09，successor-required 专案）

IS-lab-gantt-001 / IS-lab-gantt-002 经 live bisect 全部改判 withdrawn（探针伪影）。全部读数如下（dev server 127.0.0.1:4175，`#/lab/gantt` → c9-gantt-dialog scenario；交互会话中 IAB pane 多次重排导致布局代更替，几何读数按代标注，证据以 popup rect 对账后的当代读数为准）。

### popup rect 对账（元素同一性定死）

- 真正 popup = `[data-slot="dialog-surface"]` = `[role="dialog"]`（同一元素，兼有 `nop-dialog` 类）：当代实测 x 360..920（560px），另一代 640..1200——两代均为 viewport 居中 popup，内部自洽。
- `.nop-dialog` 类**被两个元素共用**：popup 本体（`dialog-host.tsx` DialogContent className）与全屏 backdrop（`ui/dialog.tsx` DialogOverlay，`fixed inset-0`，类含 `isolate bg-surface-overlay duration-100`）。早期"命中 1210..1250 返回 nop-dialog"的读数命中的是 **backdrop**，与 popup 640..1200 无矛盾——同一性歧义由此解开。
- is8c 原定罪读数"条 x 1333–1613 vs dialog 570–1130"中的条 rect 为 scroll-content 布局坐标（timeline scrollWidth 1120 vs clientWidth 154），非绘制逃逸。

### 裁剪链判定（候选 2 排除）

- timeline 视口 = `h-full overflow-auto`（当代 x 726..880，154px 宽，scrollWidth 1120）；bars 层 `[data-slot="gantt-bars"]`（absolute left-0 top-0 width:100%）位于视口内 `relative` 容器。
- 截图证明条可见部分止于视口右缘、dialog 右缘外无条像素；`elementFromPoint` 在视口右缘外 (timeline.right+20, barCenterY) 不命中任何 `[data-task-id]`（守护 spec 断言①钉住）。

### dialog transform 判定（候选 1 排除）

- popup `position:fixed` + `transform: matrix(1,0,0,1,0,0)`（identity，Base UI 动画残留）在场，但条为 absolute 非 fixed、identity transform 不改变裁剪/命中——与本案无因果。

### scroll-sync 判定（候选 3 排除）

- `useGanttScroll` 仅垂直同步（grid↔timeline scrollTop 互写；plan 545 设计：grid 水平滚动不写 store.scrollLeft，避免污染 zoom anchor）。

### dismiss 半案分解（受控实验）

- 条与视口真实交集区 pointerdown+小幅 drag（cua 与合成 PointerEvent 双路径）：ghost 创建 ✓、bar opacity 0.3 ✓、drop indicator 显示 ✓——**dialog 全程保持打开**（守护 spec 断言②钉住）。
- backdrop（popup 之外）pointerdown → Base UI outside-press → dialog 关闭（`dialog-host.tsx` shouldSuppressClose/onOpenChange reason='outside-press' 通道）——守护 spec 断言③钉住防过度抑制回归。
- 原记载"条上 pointerdown 静默 dismiss"= rect 推导瞄准落点在裁剪区外 → 实际按在 backdrop 上的正确语义被误归因。早期一次 dismiss 复现发生于未同帧测量的陈旧布局代，读数不可靠，以受控实验为准。

### 满格拖拽判定（原 finding 第二半在真实拖拽条件下的直接检验）

- `draggable` 默认开启（`gantt.tsx` `resolved.draggable !== false`；lab schema 未显式关闭）。
- 满格拖拽提交链路走通：pointerdown→ghost→move→pointerup→`store.tasks.get(taskId)` 命中→`store.updateTask` 提交——**网格行日期持久化位移**（一次 +90px 合成拖拽在 cellWidth=20 代产生 dayDelta=+4，行日期 -4d/+2d → 0d/+6d 会话内持久），**dialog 不 dismiss**（守护 spec 断言④钉住：拖 ≥0.6 day cell 后行日期增大且 dialog 在）。
- cellWidth 随 zoom/fit 变化（会话中实测 20/40/100 三代），日期断言不依赖 cellWidth 数值。

### gantt-002 复测

- resize 手柄 rect 区跨 dialog 边界：手柄位于条 rect 边缘（bar rect left-6px/right-6px），与条本体同属裁剪内 scroll-content 坐标——gantt-001 同类 rect 伪读数，撤案。
- grid scrollLeft 0→54 来源定位：`use-gantt-initial-center.ts`（plan 545 seed-6/V1）设计的 ganttReady 后一次性 scroll-to-today（`didInitialCenterRef` 单次守卫）；当代 live 实测 fresh open 后 timeline scrollLeft=163（cellWidth=100 代对中今天），同一机制。**设计内行为，非缺陷**。

### 守护 spec

`tests/e2e/renderer-lab-c-interaction-state.spec.ts`（plan 554 留空位，本批落位）：3 用例 = ①裁剪不变式（elementFromPoint 视口外不命中条）②可见条区按压+drag 不 dismiss ③backdrop 点击 dismiss（防过度抑制）+满格拖拽提交断言（行日期增大且 dialog 在）。3/3 绿。
