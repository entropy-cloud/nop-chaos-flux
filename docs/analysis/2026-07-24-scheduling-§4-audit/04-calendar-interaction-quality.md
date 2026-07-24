# Calendar 交互品质审计（§4）

> 日期：2026-07-24
> 审计对象：`packages/flux-renderers-scheduling/src/calendar/`（`calendar.tsx`、`components/*`、`hooks/*`、`utils/*`、`calendar.css`）
> 审计 skill：`docs/skills/complex-component-display-operability-audit-prompt.md` §4.1–4.10
> 方法：纯源码静态核查（file:line 证据）
> 参考实现：Schedule-X v4.6.1、react-big-calendar（见 `docs/analysis/complex-controls/research-calendar.md`）

---

## 0. 拖拽机制总览

Calendar **完全手写 PointerEvent 拖拽**（无 DnD 库、无 dnd-kit、无 Framer Motion），与 Schedule-X 闭源 DnD 插件的"150ms 延迟 + 克隆幻影 + 提交"思路相近（research-calendar.md §2.6），但实现质量显著低于参考。

- 事件拖拽/交换：`hooks/use-calendar-drag.ts`（pointer + keyboard）
- 拖拽创建：`hooks/use-calendar-drag-create.ts`（500ms 长按）
- ghost：`calendar.tsx:401-413` 固定 120×40 div

---

## §4.1 拖拽启动与阈值

### [P2] move-drag 无激活距离/延迟，任意像素移动即触发

- 类别：交互品质(§4.1）
- 位置：`hooks/use-calendar-drag.ts:165-180`（`startDrag` 立即 `setDragState({active:true})`）
- 证据：pointerdown 即激活，无阈值。对比：drag-create 用了 500ms 长按（`use-calendar-drag-create.ts:148-163`），但 move-drag 没有。
- 应为之值：参考 Schedule-X `createDragStartTimeout(150ms)`（research-calendar.md §2.6）。
- 修复方向：move-drag 加 slop 距离或短延迟。

### [P2] week/day 视图无右键防护（仅 month 检查 button）

- 类别：交互品质(§4.1/§4.4）
- 位置：`calendar-month-view.tsx:159-163`（`if (pe.button !== 0) return;`）vs `calendar-week-view.tsx:153`、`calendar-day-view.tsx:124`（无 button 检查直接 `onDragStart`）
- 修复方向：三视图统一 button guard。

### [P3] 仅 hover 亮度反馈，无 grab/grabbing cursor

- 类别：交互品质(§4.1）
- 位置：`calendar.css:24-29`（`cursor: pointer`）
- 修复方向：事件加 `cursor-grab`。

---

## §4.2 拖拽预览（ghost）品质

### [P2] ghost 是静态 120×40 矩形，无事件颜色/时间/资源信息，无入场动画

- 类别：交互品质(§4.2）
- 位置：`calendar.tsx:401-413`、`calendar.css:56-68`
- 证据：ghost 固定 `width:120px;height:40px;background:var(--color-primary)`，只显示 title 文本。
- 应为之值：ghost 应反映被拖事件外观（颜色/类型/时间范围）。
- 用户可见症状：拖彩色班次块时 ghost 是统一的蓝色小方块，看不出拖的是哪个班次。
- 修复方向：ghost 复用事件块样式。

### [P2] 源事件拖拽中无 `data-dragging`，不降低透明度

- 类别：交互品质(§4.2）
- 位置：`components/calendar-event-block.tsx` 无拖拽态样式
- 证据：grep `data-dragging` 在 `src/calendar` 零命中（对比 Kanban `kanban.css:139` 有）。
- 用户可见症状：源事件保持完全不透明，与 ghost 视觉混淆。
- 修复方向：拖拽中给源块加 `data-dragging` + 降透明度。

---

## §4.3 落位动画与过渡

### [P2] 落位/取消无动画，瞬间重置

- 类别：交互品质(§4.3）
- 位置：`hooks/use-calendar-drag.ts:69-84`（`cancelDrag` 瞬间清 state）
- 证据：ghost 直接卸载；`calendar.css:70-74` 的 matrix `transition: opacity/transform 250ms` 在拖拽中从未被触发（无代码改 matrix opacity/transform）→ 对拖拽是死代码。
- 修复方向：落位给 ghost 淡出；matrix transition 接入或移除。

### [P3] 全 calendar 无 `@keyframes`

- 类别：交互品质(§4.3）
- 修复方向：可选。

---

## §4.4 指针与设备一致性

### [P1] 全 calendar 无 `touch-action`，触摸拖拽与浏览器平移/缩放冲突

- 类别：交互品质(§4.4）
- 位置：grep `touch-action|setPointerCapture|onPointerCancel` 在 `src/calendar` 零命中
- 证据：事件 `onPointerDown`（`calendar-event-block.tsx:122-125`）无 touch-action，window 监听（`use-calendar-drag.ts:155-163`）。
- 应为之值：事件/单元格 `touch-action: none`（skill §4.4）。
- 用户可见症状：触屏拖事件时浏览器手势抢指针，拖拽失效。
- 修复方向：事件 + 单元格加 touch-action。

### [P2] 无 setPointerCapture、无 onPointerCancel

- 类别：交互品质(§4.4/§4.7）
- 修复方向：pointer capture + pointercancel 处理。

---

## §4.5 大量数据下的交互性能

### [P2] 虚拟化仅 month 视图，week/day 全量渲染

- 类别：交互品质(§4.5）
- 位置：`hooks/use-calendar-virtualizer.ts`（48px 行，overscan 3）仅接 `calendar.tsx:304-306,369,374`（month）；`calendar.tsx:382-399`（week/day）无 virtualItems
- 用户可见症状：week/day 大资源量时无虚拟化。
- 修复方向：week/day 也接虚拟化。

### [P2] pointermove 每次 2 次 setState + 2 次 DOM 查询，无 RAF 合并

- 类别：交互品质(§4.5）
- 位置：`hooks/use-calendar-drag.ts:106-133`（`setDragState` 两次）+ `calendar.tsx:146-155`（`document.elementFromPoint` + `closest`）+ `:235-259`（effect 内 querySelector）
- 证据：grep `requestAnimationFrame|debounce|throttle` 零命中。
- 用户可见症状：大网格/慢设备拖拽掉帧。
- 修复方向：move 用 RAF coalesce + 缓存 elementFromPoint。

---

## §4.6 视觉反馈的即时性与精度

### [P0] drop indicator 属性已设但 CSS 完全无对应规则——落位反馈不可见

- 类别：交互品质(§4.6）
- 位置：`calendar.tsx:251-258`（设 `data-drop-target`/`data-drop-valid`/`drag-ok`/`drag-conflict`）vs grep 这些选择器在 `calendar/calendar.css` **零命中**
- 证据：
  ```ts
  el.setAttribute('data-drop-target', 'true');
  el.setAttribute('data-drop-valid', String(isValid));
  el.classList.add(isValid ? 'drag-ok' : 'drag-conflict');
  ```
  这些选择器仅在 `kanban/kanban.css:139,144` 有规则。Calendar CSS 对它们**完全无样式**。
- 应为之值：JS 设的拖拽 affordance 必须有对应 CSS（skill §1.6/§4.6）。
- 用户可见症状：**拖事件时目标单元格无任何高亮/指示，合法与非法落点视觉完全相同**。核心拖拽反馈不可见。
- 修复方向：calendar.css 补 `[data-drop-target]`/`[data-drop-valid]`/`.drag-ok`/`.drag-conflict` 规则（可参照 kanban.css）。

### [P1] 拖拽创建无实时预览矩形

- 类别：交互品质(§4.6）
- 位置：`hooks/use-calendar-drag-create.ts`（state 有 currentX/Y/date，`:11-19,89-105`）但 `calendar.tsx` 无渲染预览
- 证据：拖拽创建期间只显示光标，松手后才弹 type-selector（`calendar.tsx:415-421`）。
- 应为之值：拖拽中实时显示扫过的日期范围高亮（参考 Google Calendar 拖拽创建）。
- 用户可见症状：长按拖创建时看不到将创建多大范围，盲操作。
- 修复方向：渲染扫过单元格的高亮预览。

### [P2] 合法/非法落点无视觉区分

- 类别：交互品质(§4.6）
- 位置：`calendar.tsx:254`（`data-drop-valid` 设了但无 CSS）
- 修复方向：见 P0。

### 后操作反馈：仅有 confirm dialog

- `calendar.tsx:423-429`，无 toast/inline 闪烁。

---

## §4.7 边缘操作稳定性

### [P2] 无 auto-scroll

- 类别：交互品质(§4.7）
- 位置：grep `autoScroll|scrollIntoView` 零命中
- 修复方向：近边缘 auto-scroll。

### [P2] 指针拖拽无 Escape 取消（仅键盘拖拽有）

- 类别：交互品质(§4.7）
- 位置：`calendar.tsx:214-231`（Escape 仅在 keyboardDrag 分支）；window keydown 未在指针拖拽时注册
- 修复方向：指针拖拽也接 Escape。

### [P1] 长按创建定时器在提前松手时不清除

- 类别：交互品质(§4.7）
- 位置：`hooks/use-calendar-drag-create.ts:148-164`
- 证据：`startCellDrag` 设 500ms timer，仅靠 (a) active 后 pointerup (b) cancelCreate (c) unmount 清除；**单元格 DOM 无 onPointerUp/onPointerLeave** 提前清 timer。
- 用户可见症状：快速点击单元格（<500ms）后，timer 仍可能在松手后触发，进入拖拽创建态。
- 修复方向：单元格加 onPointerUp/onPointerLeave 清 timer。

### unmount 中途：部分处理

- effect cleanup 移除 window 监听（`:158-161`）；`getCellFromPoint` null 守卫（`calendar.tsx:148`）；但 ref 无显式 reset。

---

## §4.8 触感一致性（跨组件）

### [P2] 与 Kanban 不一致——借用了属性命名但无对应样式

- Calendar 设 `data-drop-target`/`data-drop-valid` 但无 CSS；Kanban 有。Calendar 无 `data-dragging`；Kanban 有。ghost 风格也不同。
- 修复方向：统一拖拽 affordance 原语（共享 CSS 类 + hook）。

---

## §4.9 键盘交互品质

### 键盘移动：已实现（Space 拾起、方向键、Enter 确认、Escape 取消）

- `calendar.tsx:214-231`、`use-calendar-drag.ts:202-206`。

### [P1] 方向键每次即时提交 + Enter 再提交一次（双重提交）

- 类别：交互品质(§4.9/数据完整性）
- 位置：`use-calendar-drag.ts:86-103`（`confirmKeyboardDrop`→`confirmDrop` 再 fire onEventChange）vs `:202-206`（`moveKeyboardDrag` 每次箭头已 fire）
- 证据：每次方向键经 `onKeyboardMoveEvent`→`moveCalendarEvent`→`onEventChange` 已提交；Enter 又 `confirmDrop` 再发一次同 payload。
- 用户可见症状：键盘移动后按 Enter，宿主收到重复 onEventChange，可能产生重复写操作/审计日志。
- 修复方向：方向键改为暂存（不即提交），Enter 统一提交；或 Enter 不再提交。

### [P2] 无键盘 resize（resize 功能整体未实现）

- 类别：交互品质(§4.9）
- 位置：grep `resize` 在 calendar 无 resize-handle 实现
- 修复方向：后续按需实现。

### [P2] week/day 视图无 roving tabindex，单元格全 tabIndex=0

- 类别：交互品质(§4.9）
- 位置：`calendar-week-view.tsx:129`、`calendar-day-view.tsx:110`（硬编码 `tabIndex={0}`）；仅 month 有 roving（`calendar-month-view.tsx:219-221`）
- 修复方向：week/day 改 roving。

### [P2] 拖拽无 ARIA live 播报

- 类别：交互品质(§4.9）
- 位置：`calendar.tsx:356-358`（仅静态 view/count 播报，不随拖拽更新）
- 修复方向：参照 Kanban dndAnnouncement。

### [P3] 事件无 `:focus-visible` 样式

- 类别：交互品质(§4.9）
- 位置：`calendar.css` 无 event focus 规则
- 修复方向：加 `:focus-visible` ring。

---

## §4.10 视图/模式切换过渡品质

### [P2] 视图切换硬 mount/unmount，无过渡、无状态保持

- 类别：交互品质(§4.10）
- 位置：`calendar.tsx:368-399`（`activeView === 'month' && <MonthView/>` 等条件挂载）
- 证据：matrix transition（`calendar.css:70-74`）因元素被卸载而非渐变，从不触发；各视图 mount 后从初始状态开始（无滚动位置/焦点保持）。
- 应为之值：视图切换有过渡 + 保持滚动/选中（skill §4.10）。Schedule-X 用 `batch()` 原子切换 + 信号保持状态（research-calendar.md §2.4）。
- 用户可见症状：月↔周切换瞬间跳变，滚动位置丢失。
- 修复方向：用 CSS display 切换而非卸载，或加 fade + 状态桥接。

---

## §4 拖拽创建专项

### [P2] 拖拽创建仅 month 视图接入，week/day 未接

- 类别：交互品质
- 位置：`calendar.tsx:375`（month 传 `onCellDragStart`）vs `:382-399`（week/day 未传）
- 修复方向：三视图统一接入（如需）。

### [P2] 拖拽创建仅日期粒度，无时间粒度

- 类别：交互品质
- 位置：`use-calendar-drag-create.ts:187-217`（start/end 均为 YYYY-MM-DD）
- 修复方向：timed grid 需时间粒度（参考 Schedule-X timeGrid）。

---

## 反模式命中统计

| 反模式          | 命中数 | 说明                                                             |
| --------------- | ------ | ---------------------------------------------------------------- |
| F1 固化缺陷断言 | 0      | 未核查测试                                                       |
| F2 边界 mock    | 0      | 同上                                                             |
| F3 接线漏接     | 2      | drop indicator CSS 全缺(§4.6 P0)；长按 timer 无提前清除(§4.7 P1) |

## 四项总评

| 维度         | 评         | 说明                                                                                                                                                |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 交互品质(§4) | **不通过** | 1 个 P0：drop indicator 属性设了但 CSS 全无规则，落位反馈不可见。另有 touch-action(P1)、拖拽创建无预览(P1)、长按 timer 泄漏(P1)、键盘双重提交(P1)。 |

**标注：Calendar 在默认配置下，事件拖拽时落位指示完全不可见（P0）。** JS 代码正确设置了 `data-drop-target`/`data-drop-valid` 等属性，但 `calendar.css` 对这些选择器零规则——典型的"接线接了一半"（F3），与 Kanban 形成鲜明对比（Kanban 有对应 CSS）。
