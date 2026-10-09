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
