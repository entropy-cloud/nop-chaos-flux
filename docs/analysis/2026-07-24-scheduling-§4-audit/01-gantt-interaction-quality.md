# Gantt 交互品质审计（§4）

> 日期：2026-07-24
> 审计对象：`packages/flux-renderers-scheduling/src/gantt/`（`gantt.tsx`、`gantt-bars.tsx`、`gantt-store.ts`、`gantt.css`、`hooks/*`、`components/*`、`utils/*`）
> 审计 skill：`docs/skills/complex-component-display-operability-audit-prompt.md` §4.1–4.10
> 方法：纯源码静态核查（file:line 证据），未做运行时帧率测量（见 §4.5 说明）
> 参考实现：SVAR React Gantt v2.7.1、DHTMLX Gantt CE v10.0.0（见 `docs/analysis/complex-controls/research-gantt.md`）

---

## 0. 拖拽机制总览（决定大部分 §4 结论）

Gantt **不使用任何 DnD 库**，拖拽全部由 `useGanttDrag` hook（`hooks/use-gantt-drag.ts`）通过原生 `PointerEvent` 监听 `document` 实现。

- `gantt.tsx:101` 注入 hook：`const { onPointerDown } = useGanttDrag(store, containerRef, draggable ? handleTaskDragCommit : undefined)`
- 任务条 `pointerdown` → 立即克隆 ghost 挂到 `<body>` → `document` 上挂 `pointermove/pointerup/keydown`
- 落位提交在 `pointerup` 时调用 `store.updateTask`（`use-gantt-drag.ts:117,125,134`）

SVAR 与 DHTMLX 也都用命令式 DOM 事件拖拽（research-gantt.md §2.4/§4），所以 Flux 的"不用 DnD 库"选择与参考一致；但参考实现做了 pointer/mouse 统一回退、像素坐标预计算、批量更新等优化，Flux 缺失多项（见下）。

---

## §4.1 拖拽启动与阈值

### [P2] 无激活延迟/距离阈值，pointerdown 立即进入拖拽

- 类别：交互品质(§4.1)
- 位置：`hooks/use-gantt-drag.ts:43-48`
- 证据：
  ```ts
  const onPointerDown = (e, taskId, mode, barElement?) => {
    if (!mode) return;
    e.preventDefault();
    const target = barElement ?? (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const originalBarOpacity = target.style.opacity || '1';
    target.style.opacity = '0.3';
  ```
- 应为之值：行业惯例 100–200ms 延迟或 3–5px 激活距离（skill §4.1）。DHTMLX `dnd.js` 有 `drag_threshold` 配置；Schedule-X 闭源 DnD 插件用 `createDragStartTimeout(callback, 150ms)`（research-calendar.md §2.6）。
- 用户可见症状：单击任务条即触发拖拽态（原条变 0.3 透明），与点击/选中难以区分。
- 修复方向：在 pointerdown 后挂一次性 pointermove（>4px）或 setTimeout（120ms）才真正激活并降低原条透明度。

### [P3] 缺少 cursor:grab / cursor:grabbing 反馈

- 类别：交互品质(§4.1)
- 位置：`gantt-bars.tsx:127,163`（仅 `cursor-pointer`）；`gantt.css:27-29`（仅 hover brightness）
- 证据：grep `grab|grabbing` 在 `src/gantt` 无命中；`document.body.style.cursor` 仅被 splitter 改（`gantt-layout.tsx:63`），拖拽全程不变。
- 应为之值：可拖拽元素 `cursor: grab`，拖拽中 `cursor: grabbing`（macOS/Windows 原生拖拽基线）。
- 修复方向：bar 加 `cursor-grab`，拖拽激活时设 body cursor。

---

## §4.2 拖拽预览（ghost）品质

### [P3] ghost 无 scale 抬升，透明度/阴影偏低端

- 类别：交互品质(§4.2)
- 位置：`hooks/use-gantt-drag.ts:51-67`（克隆+内联样式）、`gantt.css:31-37`（重复定义）
- 证据：ghost `opacity:0.8`、`boxShadow: '0 4px 12px rgba(0,0,0,0.15)'`、`transition:'none'`、无 `transform: scale(...)`。
- 应为之值：行业惯例 opacity 0.8–0.9 + scale 1.02–1.05 + 明显阴影抬升（skill §4.2）。
- 用户可见症状：拖拽物与原条几乎同尺寸、无抬升感，"拖没拖起来"视觉区分弱。
- 修复方向：ghost 加 `transform: scale(1.04)` + 加深阴影。

### [P3] ghost 样式在 hook 内联与 CSS 重复定义

- 类别：交互品质(§4.2)
- 位置：`use-gantt-drag.ts:54-59` 内联 vs `gantt.css:31-37` `.nop-gantt-bar-ghost`
- 证据：两处 opacity/boxShadow/z-index 完全相同，CSS 类实际被内联覆盖。
- 修复方向：删除一处，统一到 CSS 类（便于主题覆盖）。

### [P2] 无多选批量拖拽，无 count badge

- 类别：交互品质(§4.2)
- 位置：`gantt.types.ts:123` `selectedTaskId: GanttId | null`（单选）
- 证据：store 无多选状态；ghost 渲染无选中数量标识。
- 应为之值：多选场景 ghost 带 badge（参考 Trello/Asana 批量拖拽）。
- 修复方向：后续按需引入 selection set。

---

## §4.3 落位动画与过渡

### [P2] ghost 落位无动画（transition:none），仅原条 left/width 有 300ms 过渡

- 类别：交互品质(§4.3)
- 位置：`use-gantt-drag.ts:59`（`g.style.transition = 'none'`）；`gantt.css:48-52`
- 证据：
  ```css
  .nop-gantt [data-slot='gantt-bar'] {
    transition:
      left 300ms ease,
      width 300ms ease;
  }
  ```
- 应为之值：落位后 ghost 应平滑过渡到目标位再消失，或原条过渡时同步淡出 ghost（skill §4.3）。
- 用户可见症状：松手瞬间 ghost 消失，原条靠 CSS transition 滑动——视觉上"东西跳了一下又动了"。
- 修复方向：落位时给 ghost 一个 150ms 淡出 + 原 transition 协同。

### [P2] 无回弹/拒绝动画，Escape 直接移除 ghost

- 类别：交互品质(§4.3)
- 位置：`use-gantt-drag.ts:141-163`（`cleanup` 直接 `ghost.remove()`）
- 证据：`onKeyDown` Escape → `cleanup()`；原条 opacity 直接还原（无 transition）。
- 应为之值：拒绝/取消应有回弹动画（skill §4.3）。
- 修复方向：cancel 时给 ghost 反向 transition + 原条 opacity transition。

### [P3] easing 用 CSS keyword `ease`，无 cubic-bezier 调校

- 类别：交互品质(§4.3)
- 位置：`gantt.css:48-52`
- 修复方向：可选优化，非缺陷。

---

## §4.4 指针与设备一致性

### [P1] 全包无 `touch-action`，触摸拖拽会与横向滚动冲突

- 类别：交互品质(§4.4)
- 位置：grep `touch-action|touchAction|TouchEvent` 在 `src/gantt` **零命中**
- 证据：bars 容器仅 `overflow-auto` + `overscroll-behavior:contain` + `scroll-behavior:smooth`（`gantt.css:54-57`），无 `touch-action: none`/`pan-y`。
- 应为之值：可拖拽元素及 timeline 设 `touch-action: pan-y`（允许纵向滚、锁定横向给拖拽），见 skill §4.4。
- 用户可见症状：触屏上拖任务条时，浏览器手势识别器抢走指针流做横向平移，拖拽失效或抖动。
- 修复方向：bars 与 timeline 容器加 `touch-action: pan-y`。

### [P2] 未使用 setPointerCapture，指针离开窗口可能"卡拖拽"

- 类别：交互品质(§4.4)
- 位置：`use-gantt-drag.ts:167-169`（document 监听，无 capture）
- 证据：grep `setPointerCapture` 在 `src/gantt` 零命中；无 `pointerleave`/`pointerout`/`blur` 处理。
- 应为之值：pointerdown 时对 bar `setPointerCapture(pointerId)`，确保 pointerup 必送达。
- 修复方向：bar 元素 setPointerCapture。

### [P3] 右键未显式阻止（仅靠 mode 判断）

- 类别：交互品质(§4.4)
- 位置：`gantt-bars.tsx:63-70`（mode 检测未检查 `e.button`）
- 修复方向：pointerdown 内 `if (e.button !== 0) return;`。

---

## §4.5 大量数据下的交互性能

> 说明：本节要求 production build + Chrome DevTools Performance 录制 + 热身后取第 2–5 次测量。本次为纯源码审计，未做运行时测量，仅评估"是否存在会导致掉帧的代码结构"。

### [P2] 拖拽 move 无 RAF 节流，每次 pointermove 同步写样式 + 重算 indicator

- 类别：交互品质(§4.5)
- 位置：`hooks/use-gantt-drag.ts:81-95`
- 证据：`onPointerMove` 每次直接 `ghost.style.transform = ...` + 重算 `dayDelta` + 写 indicator DOM，无 `requestAnimationFrame` 合并。
- 应为之值：pointermove 用 RAF coalesce（skill §4.5）。注意 `use-gantt-scroll.ts:21-30` 的 scroll-sync 已用 RAF，证明模式已知，只是未应用到 drag。
- 用户可见症状：高频率指针设备下主线程压力增大，100+ 任务时可能掉帧。
- 修复方向：move 回调内只更新 ref，RAF 回调里统一 flush DOM。

### [P3] 落位提交触发全量 O(N) 重算（一次性，非拖拽中）

- 类别：交互品质(§4.5)
- 位置：`gantt-store.ts:71-85`（`computeComputedPropertiesInternal`）、调用链 `updateTask`(:180-196)
- 证据：每次 drop 提交会跑 `buildParentIndex` → `computeLevels` → `computeBranchInfo` → `computeSourceTarget` → `recomputeVisualLayout`（含 scaleRange + 坐标 + 依赖线 polyline），全部同步主线程。
- 应为之值：拖拽中不重算（已做到），落位后可 `requestIdleCallback` 或 worker 化依赖链重算。
- 修复方向：100+ 任务 + 多依赖时考虑增量更新或 worker。

### 虚拟化：已具备（双系统）

- Grid 用 `@tanstack/react-virtual`（`gantt-grid.tsx:38-44`，overscan 5）；Bars 用自研 windowing（`gantt-bars.tsx:41` → `store.getVisibleTaskWindow`，`gantt-store.ts:215-228`，overscan 5）。结构上支持 100+ 任务。

---

## §4.6 视觉反馈的即时性与精度

### [P3] drop indicator 用内联 cssText 样式，`.gantt-drop-indicator` 类无任何 CSS 规则（孤立）

- 类别：交互品质(§4.6)
- 位置：`use-gantt-drag.ts:31-41`（创建+内联）、`use-gantt-drag.ts:35`（`el.className = 'gantt-drop-indicator'`）
- 证据：grep `.gantt-drop-indicator` 在 `gantt.css` 无命中；样式全靠 `el.style.cssText`。
- 用户可见症状：无（功能正常），但无法通过 CSS 主题覆盖 indicator 颜色。
- 修复方向：把样式移到 CSS 类。

### [P2] 无"不可落位"实时反馈，仅在 pointerup 静默 no-op

- 类别：交互品质(§4.6)
- 位置：`use-gantt-drag.ts:122,131`（`if (newEnd > new Date(task.start))` 等校验只在 up 时跑）
- 证据：拖拽全程无 `cursor: not-allowed`、无 ghost 变红、无目标区变灰。
- 应为之值：拖拽中实时预测合法性并给视觉反馈（skill §4.6）。
- 修复方向：move 时算出 newStart/newEnd，非法时设 ghost/inicator 标记。

### [P3] 操作完成后无 toast/闪烁等成功反馈

- 类别：交互品质(§4.6)
- 位置：grep `toast|Toaster|notification` 在 `src/gantt` 零命中
- 证据：仅 `onTaskDragEnd` 事件供宿主反应（`gantt.tsx:89-91`），组件内无成功提示。
- 修复方向：可选，依赖宿主 toast 即可。

### indicator 即时性：良好

- `use-gantt-drag.ts:87-95` 在每次 pointermove 同步更新 indicator 位置，按 `dayDelta * cellWidth` 吸附日格，肉眼不可察延迟。

---

## §4.7 边缘操作稳定性

### [P2] 拖拽到边界无 auto-scroll

- 类别：交互品质(§4.7)
- 位置：grep `auto-scroll|autoScroll|scrollIntoView` 在 `src/gantt` 仅命中 `edgeThreshold`（resize 模式检测，无关）
- 证据：无近边缘自动滚动逻辑。
- 应为之值：拖近 viewport 边缘时按距离比例加速滚动（skill §4.7）。DHTMLX 有内置 auto-scroll。
- 用户可见症状：把任务条拖出可视区时容器不跟随，ghost 消失在视口外。
- 修复方向：move 时检测距边缘距离，RAF 内 `scrollContainer.scrollLeft += speed`。

### Escape 取消：已实现

- `use-gantt-drag.ts:141-145,169`，Escape → cleanup。

### unmount 中途：已处理

- `use-gantt-drag.ts:172-181` effect cleanup 移除 document 监听 + 移除 ghost/indicator。

### [P3] 快速连续操作未做队列稳定性保障

- 类别：交互品质(§4.7）
- 修复方向：可选，当前无显式锁，但 pointerup 同步提交基本不会重叠。

---

## §4.8 触感一致性（跨组件）

### [P2] Gantt 与 Kanban 拖拽手感不一致

- Gantt ghost opacity 0.8 无 scale；Kanban 源条 opacity 0.5 scale 0.95（`kanban.css:139-142`）。
- Gantt 无 `data-dragging`/`aria-grabbed` 标记；Kanban 有（`use-kanban-board-effects.ts:142-144`）。
- Gantt 无 ARIA live 拖拽播报；Kanban 有 `dndAnnouncement`（`kanban-board.tsx:401-403`）。
- 应为之值：同类拖拽的阈值/透明度/动画应跨组件一致（skill §4.8）。
- 修复方向：抽取共享 `useDragGhost` + 共享 CSS 类 + 共享 ARIA 播报。

---

## §4.9 键盘交互品质

### [P1] 键盘调整任务日期功能为死代码（move/resize case 从未被调用）

- 类别：交互品质(§4.9)
- 位置：`gantt.tsx:111-168`（`handleBarKeyAction` 定义了 `'move-up'|'move-down'|'resize-left'|'resize-right'`）vs `gantt-bars.tsx:77-93`（`handleBarKeyDownEvent` 只调用 `'select'`）
- 证据：
  ```ts
  // gantt-bars.tsx:77-93
  switch (e.key) {
    case ' ':
    case 'Space':
      e.preventDefault();
      onBarKeyAction?.(taskId, 'select');
      break;
    case 'Enter':
      e.preventDefault();
      onBarDoubleClick?.(taskId);
      break;
  }
  ```
  `move-up/move-down/resize-left/resize-right` 分支无任何 key 事件触发 → 死代码。
- 应为之值：键盘用户能用方向键微调任务开始/结束日期（skill §4.9）。DHTMLX 有键盘导航插件。
- 用户可见症状：键盘用户无法用方向键改任务日期，只能鼠标拖。
- 修复方向：在 `handleBarKeyDownEvent` 增加 ArrowLeft/Right → resize、Ctrl+Arrow → move 的分支，调用已存在的 `handleBarKeyAction`。

### [P2] 拖拽状态无 ARIA live 播报

- 类别：交互品质(§4.9)
- 位置：`gantt.tsx:291-293`（仅静态 "N tasks visible"）
- 证据：grep `aria-live` 在 `src/gantt` 仅此一处，且不随拖拽更新。
- 应为之值：拖拽中 aria-live="assertive" 播报"拖拽中/可落位/已落位"（skill §4.9）。
- 修复方向：参照 Kanban `dndAnnouncement` 模式。

### [P3] 焦点环存在但 bars tabindex 非真正 roving

- 类别：交互品质(§4.9)
- 位置：`gantt-bars.tsx:124,158`（每个 bar `tabIndex={0}`）；`gantt-grid.tsx:118`（grid 行是 roving）
- 修复方向：bars 改为 roving tabindex（仅选中 bar 为 0）。

---

## §4.10 视图/模式切换过渡品质

### [P1] 缩放切换后滚动位置丢失（中心锚定逻辑在 UI 调用路径下走死分支）

- 类别：交互品质(§4.10)
- 位置：`gantt-store.ts:303-318`（`setZoom` 支持 `anchorScrollLeft`）vs `gantt-header.tsx:16-43`（`handleZoomIn` 只传 `store.setZoom(next.key)`）
- 证据：`setZoom` 内 `const sl = anchorScrollLeft ?? _scrollLeft;`，而 `use-gantt-scroll.ts` 从不写 `store.scrollLeft`（只直接赋 DOM `scrollTop`），故 `_scrollLeft` 恒为初值 0 → `sl === 0` → 走 `else { api.recalcLayout(); }`，不保中心。
- 应为之值：视图切换后保持聚焦日期位置（skill §4.10）。DHTMLX/SVAR 均有滚动锚定。
- 用户可见症状：点 Day→Week 后时间线跳回首部，丢失正在看的日期。
- 修复方向：header 调 setZoom 前读取并传入当前 scrollLeft + containerWidth，或让 use-gantt-scroll 同步写 store.scrollLeft。

### [P2] 缩放时 header 与 bars 过渡不同步

- 类别：交互品质(§4.10)
- 位置：`gantt.css:48-52`（bars 有 `transition: left/width 300ms`）；`gantt-timescale.tsx`/`gantt-cellgrid.tsx` 无 transition
- 证据：cellWidth 变后 bars 滑动伸缩，但时间刻度头/背景网格瞬间跳变 → 视觉错位。
- 应为之值：同步过渡或都不过渡（skill §4.10）。
- 修复方向：刻度/网格也加等同时长 transition，或切换瞬间禁用 bars transition。

### 选中态保持：良好

- `selectedTaskId` 在 store（`gantt.types.ts:123`），setZoom 不触碰，切换后保持选中。

---

## 反模式命中统计

| 反模式          | 命中数 | 说明                                                        |
| --------------- | ------ | ----------------------------------------------------------- |
| F1 固化缺陷断言 | 0      | 未在本次核查测试断言（属 §3 范围）                          |
| F2 边界 mock    | 0      | 同上                                                        |
| F3 接线漏接     | 1      | `handleBarKeyAction` 的 move/resize 分支为死接线（§4.9 P1） |

## 四项总评

| 维度           | 评         | 说明                                                                                                                  |
| -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 显示正确性(§1) | 通过       | 不在本审计范围（已由前 5 轮审计确认）                                                                                 |
| 可操作性(§2)   | 通过       | 同上                                                                                                                  |
| 测试有效性(§3) | 通过       | 同上                                                                                                                  |
| 交互品质(§4)   | **有风险** | 触摸拖拽因缺 touch-action 实际不可用(P1)；键盘改日期死代码(P1)；缩放丢滚动位置(P1)。鼠标+桌面环境下基本可用但偏粗糙。 |

无 P0（鼠标桌面环境下核心拖拽功能成立且有反馈）。3 个 P1 需优先修复。
