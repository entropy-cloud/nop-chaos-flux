# 19 flux-renderers-scheduling 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-scheduling/src/` 排除 `*.test.*` 与 `__tests__/` 后 84 个实现文件约 11880 行。**精读覆盖率 100%（按实现文件数）**：gantt/ 全部 25 文件、kanban/ 全部 21 文件、calendar/ 全部 22 文件、barcode-input/ 全部 12 文件、shared/hooks 1 文件、根 barrel/definitions 3 文件全文精读；`styles.css` 与测试文件不在范围。除源码外核对了 `docs/references/quick-reference.md`、`docs/architecture/renderer-runtime.md`、`package.json`（optional peer 声明）、`tests/e2e/gantt-demo.spec.ts`（滚动同步用例守卫）、`scripts/check-oversized-code-files.mjs` 实跑输出、`scripts/check-i18n-keys.mjs`（exit 0，key 齐全），以及 `node_modules/.pnpm/@tanstack+virtual-core@3.14.0` 源码（F-01 定级依据：`scrollOffset` 仅经 `observeElementOffset` 的 scroll 监听更新）。
- 结论概览：**P0 x1 / P1 x8 / P2 x9 / P3 x8**。总评：该包的时区纪律（全部 UTC 日算术，无 DST 跨天错位）、监听器/定时器/rAF 清理（均有配对 remove/clear/abort，拖拽会话普遍处理 pointercancel）、i18n（无硬编码中文 UI 串，key 双语齐全）、RendererComponentProps 契约（props/events/regions/helpers + `evaluationBindings` 双参派发族规范执行到位）整体质量较好；undo 命令栈、reaction `ready()` 激活、component handle 注册等家族模式与 gantt/kanban/calendar 三家互相对齐。**核心问题集中在三处**：(1) Gantt 左侧网格把"滚动容器 ref"接到了非滚动包装 div 上，导致网格虚拟化窗口冻结与网格↔时间轴垂直滚动同步双向失效（P0）；(2) 多个"接线了一半"的死代码路径——zoom 锚点、worktime 日历联动、列 region 动态键——表明功能面与实现面存在系统性脱节；(3) Calendar 视图层的几何/事件派发细节错误（多日事件跨日渲染、键盘拖拽双派发、可选 peer 静态导入）。

## P0 缺陷

### F-01 Gantt 网格虚拟化冻结 + 网格↔时间轴垂直滚动同步双向失效：滚动容器 ref 指向非滚动的包装 div

- 位置：
  - `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:199`（`useGanttScroll(gridRef, timelineRef, ...)`）
  - `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:491-493`（`grid={<div ref={gridRef} className="h-full"><GanttGrid ... scrollContainerRef={gridRef} .../>}`）
  - `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:43-48`（virtualizer `getScrollElement`）与 `:96`（真正的滚动容器是 GanttGrid 根节点 `.nop-gantt-grid h-full overflow-auto`）
  - `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-scroll.ts:50-51`（scroll 监听挂在 gridRef 上）
- 关键源码摘录（gantt.tsx:491-495 + gantt-grid.tsx:43-48）：
  ```tsx
  grid={
    <div ref={gridRef} className="h-full">
      <GanttGrid store={store} ... scrollContainerRef={gridRef} ... />
    </div>
  }
  ```
  ```ts
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollContainerRef?.current ?? null, // = 外层非滚动 div
    estimateSize: () => rowHeight,
    overscan: 5,
  });
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：任务数超过首屏可见行数（如 `apps/playground/src/pages/gantt-perf-scale-demo.tsx` 的 500 任务 / rowHeight 40 / 视口约 600px）。
  2. 路径 A（虚拟化冻结）：DOM 结构为 `div[h-full,无 overflow]（gridRef） > div.nop-gantt-grid[overflow-auto]（真滚动容器）`。TanStack virtual-core@3.14.0 的 `scrollOffset` **只**经 `observeElementOffset`（即挂在 `getScrollElement()` 返回元素上的 `scroll` 监听）更新；外层 div 永不触发 scroll、`scrollTop` 恒 0 → `virtualItems` 永远是 `[0 .. 视口高/40 + overscan 5]` 的首屏窗口。用户滚动 `.nop-gantt-grid` 时窗口不前移。
  3. 路径 B（同步失效）：`useGanttScroll` 把 `scroll` 监听同样挂在外层 div 上。真实滚动事件发生在内层且 scroll 事件不冒泡 → `onGridScroll` 永不触发；timeline 滚动方向的 `gridEl.scrollTop = timelineEl.scrollTop` 写在 overflow:visible 的外层 div 上是无操作。两个方向都死。
  4. 错误结果：滚动左侧任务网格后，首屏以下的行**完全不渲染**（`renderTasks = virtualItems.map(...)`，行区域只剩 `paddingBottom` 占位 `<tr>`）——用户看到大片空白行；同时网格与时间轴的行垂直对齐在任一侧滚动后即被打破（条形图与左侧表格错行）。
- 为什么现有测试没有抓到：包内 3 个 gantt 集成测试全部 `vi.mock('./hooks/use-gantt-scroll.js')`（gantt.test.tsx:30、gantt.integration.test.tsx:13、gantt-interactions.integration.test.tsx:13），真实同步逻辑零覆盖；e2e `tests/e2e/gantt-demo.spec.ts:340-371` 的 "scroll sync scrolls timeline when grid scrolls" 用例用 `gs.scrollHeight > gs.clientHeight`（包装 div）做 `canScroll` 守卫——包装 div 高度等于内容且通常不溢出，守卫为 false 时整个断言体被跳过（空转），且其手动 `dispatchEvent(new Event('scroll', { bubbles: true }))` 模拟的是真实浏览器不会发生的冒泡 scroll。
- 修复方向：让 `GanttGrid` 用自身根节点作为滚动元素（forwardRef 暴露根 div，或 `scrollContainerRef` 改传 `.nop-gantt-grid` 实际 DOM），`useGanttScroll` 的 grid 侧监听同一元素；为 e2e 补一条"滚动网格第 N 行可见 + timeline scrollTop 同步"的非空转断言，单元测试去掉对 use-gantt-scroll 的 mock。

## P1 隐患

### F-02 Calendar 静态导入可选 peer `html2canvas`，optional peer 契约被打穿

- 位置：`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:1`；对照 `package.json`（`html2canvas` 在 peerDependencies 且 peerDependenciesMeta 标记 optional）与同包正确范式 `kanban/utils/kanban-export.ts:61-70`（`await import('html2canvas')` + try/catch 降级）。
- 摘录：
  ```ts
  import html2canvas from 'html2canvas'; // use-calendar-export.ts:1
  ```
- 问题：`src/index.ts → scheduling-renderer-definitions.ts → calendar/calendar.tsx → use-calendar-export.ts` 静态可达。宿主按 optional 语义**不安装** html2canvas 时，打包器解析 `'html2canvas'` 直接失败（或运行时整 chunk 崩溃）——引入调度包任何一个渲染器都会被 calendar 拖垮。包自身 devDependencies 也未装 html2canvas，测试全靠 `vi.mock('html2canvas', ...)` 工厂拦截（calendar.export-handle.test.tsx:14、use-calendar-export.test.ts:6）才通过，恰好掩盖了这一点。另外 `const canvas: any`（:38）也在该文件。
- 影响：宿主集成阻断级（构建/加载失败），且 optional 声明形同虚设。
- 修复方向：改为 kanban-export 同款动态 import + 不可用时 `exportError` 明确提示；删除 `as any`。

### F-03 Gantt `updateTask` 的 duration↔end 联动缺失：拖拽/键盘改 end 后 `duration` 永不回算，日历分支一旦接线还会用旧 duration 反向覆盖用户输入

- 位置：`packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:187-203`；提交侧 `hooks/use-gantt-drag.ts:122-131`（resize-end 只提交 `{end}`）、`gantt.tsx:246-266`（键盘 resize 同样只提交 `{end}`）。
- 摘录（gantt-store.ts:193-197）：
  ```ts
  const calendar = calendarManager.resolveCalendar(updated.calendar);
  if (
    calendar &&
    (partial.start || partial.end || partial.duration !== undefined) &&
    updated.duration !== undefined &&
    updated.start
  ) {
    const from = new Date(updated.start);
    updated = {
      ...updated,
      end: calendar.addWorkDays(from, updated.duration).toISOString().slice(0, 10),
    };
  }
  ```
- 问题与影响（两条同根）：
  1. **当前生效面**：用户拖右边缘改 end（或键盘 resize-right）→ `updateTask(id, { end })` 只改 end，`duration` 字段保持旧值。`onTaskDragEnd` 事件 payload 里的 `changes` 也只有 `{end}`。宿主若按任务对象（含 duration）持久化，得到 start/end/duration 三者互相矛盾的脏数据；再次编辑 duration 或 start 时任何依赖 duration 的消费方读到陈旧值。且 UI 上 `GanttGrid` duration 列显示旧值，与条形长度不一致。
  2. **潜伏面**：日历分支条件包含 `partial.end`——一旦宿主注册了 worktime 日历（`parse(..., calendars)` 通道存在，`CalendarManager` 已实现），拖 end 提交会被 `addWorkDays(start, 旧duration)` **覆盖回去**，拖拽视觉上"弹回"。当前渲染器接线（gantt.tsx:49、:129）从不传 `calendars` 且 `globalCalendarId` 未配置，所以该分支今天是死代码——但这正说明联动逻辑从未被端到端验证。另外 `addWorkDays` 返回排他 end（start+duration），而 `taskToPixels` 按 `diffInDays+1` 包含式计宽（layout.ts:44-45），日历分支激活时条宽会多一天。
- 修复方向：`updateTask` 内做双向同步——`partial.end`/`partial.start` 到达且二者齐全时回算 `duration`；日历分支仅在 `partial.start || partial.duration !== undefined` 时前算 end，明确排除纯 end 编辑；为"改 end→duration 回算"补回归测试。

### F-04 Kanban WIP 限制可经"卡片放置目标"绕过：`registerCard` 的 dropTarget `canDrop` 不检查 wipOverLimitColumns

- 位置：`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts:122-133`（卡片目标 canDrop）对照 `:164-168`（列目标 canDrop 有 wip 拦截）；`kanban-board.tsx:262-267`（`wipOverLimitColumns` 以 `count >= cardLimit` 判定"满员即禁入"）。
- 摘录（use-kanban-dnd.ts:130-133）：
  ```ts
  canDrop({ source }) {
    if (source.data.type !== 'kanban-card') return false;
    return true; // ← 无 wip 检查
  },
  ```
- 问题：pragmatic-drag-and-drop 的 `location.current.dropTargets[0]` 是**最内层**目标。鼠标悬停在满员列的任意卡片上时 `[0]` 是 `kanban-card-target` 而非列目标 → `onDrop` 走卡片目标分支，`moveCard` 照常执行，WIP 上限被完全绕过；只有悬停在列空白处才会被列目标拦截。同列重排在满员列也一并被列目标误拦（canDrop 不区分来源列），进一步把用户推向卡片目标路径。
- 影响：`wipStrict` 契约（design 的 WIP 语义）在最常见的拖放路径上不生效；`onCardMove.overLimit` 标记也只在列目标写入侧计算，语义混乱。
- 修复方向：卡片目标 `canDrop` 增加 `if (wipSet?.has(columnId) && fromColumnId !== columnId) return false`（同列重排放行）；wip 集合从 `stateRef` 实时读取。

### F-05 Kanban 全局拖拽 monitor 无板归属过滤：同页多板时他板拖拽在本板产生空变更、污染 undo 栈并派发虚假 onCardMove

- 位置：`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts:51-58`（`canMonitor` 只看 `source.data.type === 'kanban-card'`）与 `:93-104`（onDrop 无条件 `changeBoard` + `moveEvent`）；同样模式 `use-column-dnd.ts:20-51`（列头拖拽）。
- 摘录（use-kanban-dnd.ts:93-99）：
  ```ts
  const { boardData: currentBoard, onBoardChange: changeBoard, ... } = stateRef.current;
  const newBoard = moveCard(currentBoard, cardId, toColumnId, toIndex);
  ...
  changeBoard(newBoard, cardId, fromColumnId, toColumnId, fromIndex, toIndex);
  ```
- 问题：`monitorForElements` 是页面级全局注册。页面放两个 kanban（A、B）时，在 A 拖任意卡片，A、B 两板的 monitor 都会 onDrop：B 执行 `moveCard(B.board, A 的 cardId, ...)`——`moveCard` 对不存在的 card 返回**原板的完整 clone**（kanban-helpers.ts:9-10），但 `changeBoard` 仍被调用 → B 板 `setBoardData(等值新对象)`（整板重渲染）+ `pushUndoCommand` 记录一条"无操作 moveCard"（undo 栈污染，用户在 B 按 undo 会"撤销"一条假命令并再次触发等值 clone）+ `onCardMove` 以 A 的 cardId 派发事件（宿主误收）。B 板列头拖拽同理（use-column-dnd `canMonitor` 只看 type）。
- 影响：多板同页（dashboard 常见布局）下事件语义与 undo 栈均不可靠。
- 修复方向：draggable source data 增加 `boardId`（或利用现有 `columnId` 归属校验 `currentBoard[fromColumnId]` 存在才处理），monitor `canMonitor` / onDrop 先验归属。

### F-06 Calendar 多日事件在周/日视图的后续日期上渲染几何错误：`eventToVerticalRange` 的 `referenceDay` 形参没有任何调用方传入

- 位置：`packages/flux-renderers-scheduling/src/calendar/utils/calendar-time-utils.ts:41-73`（referenceDay 仅用于构造窗口，默认取**事件自己的 start 日**）；调用方 `calendar-week-view.tsx:64`、`calendar-day-view.tsx:95` 均只传 `(dayEvents, dayStartHour, dayEndHour, maxConcurrent)`；渲染侧 `calendar-event-block.tsx:113-117` 直接用返回的 `top/height` 百分比。
- 摘录（calendar-time-utils.ts:50-55）：
  ```ts
  const dayStart = referenceDay
    ? new Date(Date.UTC(referenceDay.getUTCFullYear(), ..., dayStartHour))
    : new Date(Date.UTC(eventStart.getUTCFullYear(), eventStart.getUTCMonth(), eventStart.getUTCDate(), dayStartHour));
  ```
- 问题：多日跨天事件（`start=2026-01-01T22:00`、`end=2026-01-03T02:00`）在 day2 列上：窗口仍按 01-01 的 08:00–20:00 构造 → `effectiveStart`(01-02T22:00) 的绝对时间已越过 dayEnd → `startMinutes=22:00`、`endMinutes=20:00` → `top = 840/720 = 116.7%`、`height = max(0, 负数) = 0`——色块渲染在列容器**下方 116% 处、高度 0**（不可见/溢出）。而 `start=09:00` 的跨天事件在后续日会渲染成 9:00 起高 11 小时的"伪全天块"。周视图的日期过滤（week-view.tsx:59-63 按日期字符串命中每一天）保证后续列**会**渲染该事件，因此错误必然可见。
- 影响：跨天排班（该包的核心场景"班次/请假跨天"）在周/日视图展示错乱。
- 修复方向：`allocateConcurrentWidths` 接受当前列的 `referenceDay`（即 `dateStr`）并透传给 `eventToVerticalRange`，使窗口按列日期夹取事件起止；补跨天事件周视图渲染回归测试。

### F-07 Calendar 键盘拖拽事件语义错乱：每个方向键立即派发一次 `onEventChange`，Enter"确认"再补发一次以起始位置为 target 的陈旧 `onEventChange`

- 位置：`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts:192-210`（键盘拖拽的 `pendingTargetRef` 初始化后从不更新）与 `:86-103`（confirmDrop 用它派发）；`calendar.tsx:305-331`（`handleKeyboardMoveEvent` 每次方向键直接 `moveCalendarEvent` → `onEventChange`）。
- 摘录（use-calendar-drag.ts:195-198 + calendar.tsx:312-318）：
  ```ts
  pendingTargetRef.current = {
    date: event.start.split('T')[0] ?? event.start,
    resourceId: event.resourceId ?? '',
  };
  ```
  ```ts
  if (direction === 'left' || direction === 'right') {
    ...
    moveCalendarEvent(event.id, ..., oldStartStr, newStart.toISOString().slice(0, 10));
  ```
- 问题：键盘流程中每按一次方向键就真实派发 `onEventChange`（宿主若直接持久化，"预览"语义变成了 N 次真移动）；随后按 Enter 触发 `confirmDrop`，用**从未随方向键更新**的 `pendingTargetRef`（= 事件初始位置）再派发一次 `onEventChange { toDate: 起始日, toResource: 起始资源 }`——即一串真实移动之后追加一条"移回原位"的假移动。拖拽高亮 effect（calendar.tsx:362-386）也一直高亮初始格。
- 影响：宿主按 payload 做持久化/审计时事件流不可解释（移动 N 次后又回到起点）； Escape 取消也无法撤回已派发的事件。
- 修复方向：二选一并保持一致——(a) 方向键仅更新 `pendingTargetRef`/dragState（视觉预览），Enter 才派发一次；(b) 保留逐步派发则 `confirmDrop`/`cancelKeyboardDrop` 对键盘会话应 no-op。同时让 drop 高亮跟随键盘 target。

### F-08 BarcodeInput：配置 `validate.message` 时所有扫描结果本地校验必败，`onScan` 永不触发

- 位置：`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:133-158`（`validateScanResult`），消费点 `:173-187`（`handleScanResult` 出错即 return，不写表单不派发）。
- 摘录（barcode-input.tsx:155-157）：
  ```ts
  if (resolved.validate?.message) {
    return resolved.validate.message;
  }
  return null;
  ```
- 问题：`validate` 是合法 schema 面（`barcode-input.types.ts:22`，`validate.message` 是异步校验规则的失败文案，表单模型侧由 `createBarcodeInputFieldValidation` 正确接入 `kind:'async'`）。但本地 `validateScanResult` 把"配置了 message"当作"校验失败"无条件返回错误——只要宿主写了 `validate: { action, message: '...' }`，**每一次相机扫码**都在本地被拦截：不 `form.setValue`、不派发 `onScan`，UI 显示该 message。异步 action 校验反而永远收不到值。
- 影响：合法配置直接废掉扫描主流程；错误信息（message）还会误导用户以为是值不合法。
- 修复方向：删除该本地分支（异步校验交给表单模型的 async 规则），或仅在 `!resolved.validate?.action && resolved.validate?.message` 时作为静态失败条件；补一条"配置 validate 后扫码仍写入并派发 onScan"的回归测试。

### F-09 Calendar 月视图每次渲染全量重算布局 + O(资源数×31天×事件数) 冲突扫描，全部无 memo：拖拽/滚动期间逐帧触发

- 位置：`packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:62-80`（`positionEventsInMonth` 与 `conflictMap` IIFE 直接在渲染体执行）、`:286`（`splitMultiDayEvents` 再算一遍）；`calendar-layout-utils.ts:170-217`（`detectConflicts` 每次调用全量 filter + 重解析所有事件日期）；周视图 `calendar-week-view.tsx:53-69` 同模式。
- 摘录（calendar-month-view.tsx:67-78）：
  ```ts
  const conflictMap = (() => {
    const map = new Map<string, Set<string>>();
    for (const resource of resources) {
      for (const day of days) {
        const conflict = detectConflicts({ events, resourceId: resource.id, date: dateStr });
  ```
- 问题：`detectConflicts` 内部 `events.filter(...)` + 逐事件 `parseISODateTime`，复杂度 O(R×31×E)。50 资源 × 500 事件 = 约 78 万次过滤迭代/渲染。拖拽会话中 `useCalendarDrag` 每次 `pointermove` `setDragState` → Calendar 重渲染 → MonthView 全部重算（无任何 `useMemo`），周视图 `allocateConcurrentWidths` 同样每渲染按 R×7×E 重算。这是与已知"watch-only gantt-perf/kanban-perf 60Hz 阈值失败"同量级但独立于它们的 calendar 性能面（未在已知背景清单内）。
- 影响：中大数据量下月视图拖拽/切换掉帧明显，交互态每帧全量重算。
- 修复方向：`positionEventsInMonth`/`conflictMap`/`splitMultiDayEvents` 按 `[events, resources, dateRange, maxConcurrent]` memo；`detectConflicts` 先按 `resourceId+日期` 建一次倒排索引再逐格查询；拖拽期间仅 dragState 局部化（把高亮 effect 下沉）避免整树重渲染。

## P2 风险

### F-10 Gantt `setZoom` 缩放锚点是死代码：`_scrollLeft` 从未从 DOM 同步、算出的新 scrollLeft 从未写回 DOM、`containerWidth` 恒为默认 800

- 位置：`packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:48`（`_scrollLeft` 仅 setZoom 内部赋值）、`:326-341`（锚点计算）、`:57`（containerWidth 默认 800，全包无任何 setter 调用——grep 证实仅 GanttLayout 自用局部 state）。`useGanttScroll` 的 onScroll 回调只派发 schema 事件，从不写 `store.scrollLeft`；`scrollToToday/scrollToTask` 直接操作 DOM 不经 store。
- 问题：`if (sl > 0 && cw > 0)` 中 `sl` 初值恒 0 且只在分支内部被赋值 → 锚点分支**从未执行过**；即便执行，`_scrollLeft = ...` 也没有任何消费者把它应用到 `timelineRef.scrollLeft`。结果：缩放时 cellWidth 变化导致内容总宽变化，浏览器保留原始 scrollLeft 像素值，视口中心日期漂移（放大后看到的日期段跳变）。
- 修复方向：`useGanttScroll` 的回调里同步 `store.scrollLeft = container.scrollLeft`；GanttLayout 的 ResizeObserver 或挂载 effect 把真实容器宽写入 `store.containerWidth`；`setZoom` 计算后在 gantt.tsx 侧（effect 或回调）把 `_scrollLeft` 应用到 DOM，并用 rAF 等新布局生效后写入。

### F-11 Gantt `computeScaleRow` 对 `step <= 0` 无限循环（schema 可控输入冻结 UI）

- 位置：`packages/flux-renderers-scheduling/src/gantt/utils/scale.ts:85-102`（`while (cursor < end) { const cellEnd = addUnit(cursor, unit, step); ... cursor = cellEnd; }`）+ `utils/date.ts:148-171`（`addUnit` 对 step=0 原样返回）。
- 问题：宿主在 `zoomLevels[].scales[].step` 写 0（或负数）时 `cursor` 永不推进 → 渲染 `GanttTimeScale` 时主线程死循环，整页冻结。`step` 是纯 schema 数据，无任何校验（definitions 未声明 propContracts 数值约束）。
- 修复方向：`computeScaleRow` 入口 `step = Math.max(1, Math.floor(step))` 或对非正 step 抛出可诊断错误；definitions 侧为 zoomLevels 提供 shape 校验。

### F-12 Kanban 默认 `virtualize=true` 路径下拖放指示器永不渲染；列 dropIndex 用"过滤后卡数"导致过滤态落点偏移

- 位置：`packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:620`（写死 `virtualize`）；`kanban-column.tsx:242-277`（虚拟化分支无任何 `nop-kanban-drop-indicator`）对照 `:279-308`（指示器只存在于非虚拟化分支，即仅空列时）；`use-kanban-dnd.ts:157-163` + `kanban-column.tsx:122`（`registerColumn(el, colId, filteredCards.length)` → `dropIndex: cardCount`）。
- 问题：(1) 有卡列永远走虚拟化分支，`dropTargetCardIndex/dropClosestEdge` 两个 prop 被传入却无人消费——用户拖卡得不到插入位置反馈（只有列高亮 `data-drop-target`）。(2) 过滤激活时 `filteredCards.length` ≠ 列真实 children 长度，列空白处放置的 `toIndex` 被钳到过滤后数量，卡片落在未过滤尾部之前的位置（与视觉不符）。
- 修复方向：虚拟化分支内按 `dropTargetCardIndex/closestEdge` 在对应 virtualItem 前后渲染指示器；`registerColumn` 的 dropIndex 改用原始 `column.children.length`。

### F-13 Kanban undo 的列级命令不保存列内卡片；removeCard 恢复丢失 BoardItem 顶层 title/content

- 位置：`packages/flux-renderers-scheduling/src/kanban/utils/kanban-undo-stack.ts:80-84`（undo addColumn → `removeColumn` 连子卡一起删）、`:127-129`（redo addColumn → `addColumn(columnData)` 恢复**空列**）；`kanban-helpers.ts:154-173`（removeColumn 删子卡）、`:48-77`（addCard 重建卡片只从 `cardData.title` 取 title）；`kanban-board.tsx:366-374`（removeCard 捕获 `data`+`meta` 但不含 BoardItem 顶层 `title/content`）。
- 问题：序列"加列 → 往列里加卡 → undo"会把卡片一起删掉；redo 只恢复空列，卡片永久丢失（连 redoStack 里 addCard 命令的 columnId 也已失效）。removeCard 的 undo 恢复依赖 `card.title || card.data?.title` 回退链，顶层 `BoardItem.title/content` 字段（与 data.title 独立）在恢复件上丢失。
- 修复方向：addColumn 命令在 execute 时快照列+子卡（复用 gantt `DeleteTaskCommand.captureSubtree` 模式）；removeCard 捕获完整 BoardItem（含 title/content）并原样还原。

### F-14 Calendar scope ownership 的点路径写读不对称：读按 `split('.')` 深取，写用 `merge` 字面量键

- 位置：写 `calendar.tsx:110-111`（`scope.merge({ [dateStatePath]: date.toISOString().split('T')[0] })`）与 `:117-118`（viewStatePath 同）；读 `use-calendar-ownership.ts:21-49`（按 `viewStatePath.split('.')` 逐层取）。对照 kanban 侧写读都走 path 语义（`rootScope.update(kanbanStatePath, ...)`）。
- 问题：`dateStatePath`/`viewStatePath` 含点（如 `"ui.cal.date"`）时，写入在 scope 顶层产生字面量键 `"ui.cal.date"`，而读取永远找 `s.ui.cal.date` → 写入永不可见，scope ownership 双向同步静默失效，且 scope 数据被污染一个怪键。仅顶层路径可用。
- 修复方向：写侧改为与读侧对称的 path 写入（`scope.update(dateStatePath, v)` 若支持点路径），或文档明确"仅顶层路径"并在编译期校验。

### F-15 Calendar 日视图网格单元缺少放置目标属性：日视图内事件拖拽（换资源/换日）完全不可用

- 位置：`packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:64-75`（表头格有 `data-slot="calendar-cell"`+`data-date` 但**无** `data-resource`）、`:107-115`（小时格 role=gridcell，无 calendar-cell 标记）；入口 `calendar.tsx:263-272`（`getCellFromPoint` 要求 `date` 与 `resourceId` **同时**存在）。
- 问题：日视图中 `elementFromPoint` 命中的唯一 `calendar-cell`（表头）缺 `data-resource` → 返回 null；小时格根本不带 cell 标记。拖拽会话 `pendingTargetRef` 恒 null → `pointerup` 不派发任何 `onEventChange`。周视图单元格两属性齐全可拖，行为不一致。
- 修复方向：日视图小时格（或每资源行容器）补 `data-slot="calendar-cell"` + `data-date` + `data-resource`；表头格移除误导性的 cell 标记。

### F-16 Kanban 键盘移动卡片的 keydown 监听在 loading 首渲染后永不挂载

- 位置：`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-board-effects.ts:74-129`（effect 顶部 `const el = boardRef.current; if (!el || !draggable) return;` 且 deps `[draggable, keyboardMoveCard, boardRef, boardDataRef, setKeyboardMoveCard, setDndAnnouncement]` 全为稳定值）。
- 问题：`resolved.loading=true` 首渲染走 skeleton 早退分支（kanban-board.tsx:527-539，无 `ref={boardRef}` 元素）→ effect 首跑时 `boardRef.current === null` 直接 return。数据到达后 loading 变 false、board div 挂载，但 deps 无一变化（boardDataRef 是 ref、keyboardMoveCard 仍 null）→ effect 不重跑 → 空格拾起卡片（`setKeyboardMoveCard`）的监听器从未存在，键盘拖卡在异步加载场景整体失效。同文件 window 级 undo/redo handler（:47-67）用惰性 `boardRef.current` 读取所以不受影响——差异恰好证明这是捕获时机问题。gantt 侧同类监听有显式 `active`（就绪信号）重挂机制（1-7 修复），kanban 未对齐。
- 修复方向：仿 gantt 1-7 模式给该 effect 增加 `active = !loading && columns.length > 0` 依赖，或监听器内惰性读取 `boardRef.current`。

### F-17 BarcodeInput 相机可用性模块级缓存永不失效：Safari/未授权环境下扫描按钮永久隐藏

- 位置：`packages/flux-renderers-scheduling/src/barcode-input/utils/camera-utils.ts:6-32`（`cachedAvailability` 一旦写入进程内永不重查）。
- 问题：Safari 在未授权时 `enumerateDevices()` 返回空列表（Chrome 返回空 label 但含 kind）→ 首次探测即缓存 `{isAvailable:false}`；用户随后授权或接入相机也不会重试。`barcode-input.tsx:61`（`showScanButton = scanButton && cameraAvailable !== false`）——`false` 时按钮隐藏，用户从此无法打开扫描。另外 `use-barcode-camera.ts:109-111` 挂载时 `checkCameraAvailability()` 结果被丢弃（空调用）。
- 修复方向：缓存加 TTL 或仅缓存"确定可用/上下文不安全"两类终态；授权状态变化（permission query）时失效；`handleScanClick` 路径已支持 `cameraAvailable === null` 才探测——可让失败态在下次点击时重试一次。

### F-18 (suspect) Gantt 自定义列单元格 region 动态键从未注册 fields 规则，`regions[name]` 恒为 undefined

- 位置：`packages/flux-renderers-scheduling/src/gantt/gantt.tsx:472-475`（`columnRegions = Object.fromEntries(columnNames.map(name => [name, regions[name]]))`，columnNames 来自 `columns[].name`，默认含 `text/start/end/duration/predecessor`）；`scheduling-renderer-definitions.ts:17-56` 的 gantt `fields` 只注册了 taskBar/toolbar/editor/empty/loading 五个 region。
- 问题：按 field-binding 契约（quick-reference.md「Layer 2」），未在 `fields` 声明 region 的键不会编译为 region handle → `regions.text` 等恒 undefined，`GanttGrid` 的 `columnRegions?.[col.name]` 分支（gantt-grid.tsx:170）为死接线，`GanttSchema` 也未声明这些键。宿主按"columns + 同名 schema 键自定义单元格"的直觉写 schema 会静默不生效。标记 suspect：未逐行验证编译器对未声明对象键的兜底行为，但契约文档明确不支持。
- 修复方向：要么在 definitions 中补 `{ key: 'text', kind: 'region' }` 等规则并在 schema 类型声明；要么删除 columnRegions 死代码并在文档写明列模板仅经 columns 配置。

## P3 提示

### F-19 Gantt 交互边界杂项

- `use-gantt-drag.ts:126`（resize-end `newEnd > new Date(task.start)`）与 `gantt.tsx:249`（键盘同判）：end==start 的 1 天任务无法通过拖拽/键盘从 2 天缩回 1 天（ inclusivene 语义不一致——初始数据允许 1 天条，交互不允许）。
- `gantt-markers.tsx:21-26` + `utils/layout.ts:23`（`dateToPixel` 结果 `Math.max(...,0)`）：today 早于 scaleRange.start 时 todayX=0 而非 -1，`todayX >= 0` 恒真 → today 红线钉在最左缘，误导。
- `use-gantt-link-draw.ts:58/138`：临时连线起点恒取 `task.$x + task.$w`（右端），从 start 手柄起连时预览线锚错端（提交的 linkType 推断仍正确，纯视觉）。
- `gantt-links.tsx:51`：`<marker id="arrowhead">` 静态 id，同页多 gantt 实例 DOM id 重复。
- `use-kanban-dnd.ts:80` / gantt 拖拽类似路径：同位置 no-op 放置（`resolveDropIndex` 归算后等于原位）仍记录 undo 命令并派发事件（kanban-board 每次变更 `structuredClone` 全板 → 等值重渲染）。
- `addLink`（gantt-store.ts:290-300）无重复边检查，同一 source/target 可反复画线叠加。

### F-20 Gantt 性能杂项（D6）

- `undo-stack` 每次 undo/redo 及所有 `updateTask` 都走 `computeComputedPropertiesInternal`（gantt-store.ts:71-85）：连续 4 次 `store.setState`（levels→branchInfo→sourceTarget→layout），每次重建全 Map + 全树克隆，O(n)×4；500 任务下每次键盘微移都是全量重算。建议合并为单次 setState 并对纯日期微移走增量路径。
- `GanttTimeScale`（gantt-timescale.tsx:14-37）全量渲染 scaleRange 内所有单元格（day 缩放多年即数千 div×行），`smartScaling`（scale.ts:130）已实现却全包零调用。
- `gantt.tsx:418-421` 与 `gantt-store.getVisibleTaskWindow`/`GanttLinks:20-22`/`GanttMarkers:17-19` 各自 reduce 同一 visibleTasks 求总高——同值四算。
- `useGanttScroll` 每个 scroll 事件无节流派发 `onScroll` schema action（gantt.types.ts:192 有文档说明由宿主防抖，但包内默认路径仍高频 dispatch）。

### F-21 Gantt 数据刷新语义与注释相悖

- `gantt.tsx:70-72` 注释称 "Local edits are preserved"，但 `store.parse()`（gantt-store.ts:165-179）整体替换 tasks/links 并重置 `expandedSet: new Set()`——data prop 引用一变（data-source refresh），本地拖拽编辑与用户展开/折叠状态全部丢弃，仅重播种 `task.open` 默认态。kanban 同场景注释（kanban-board.tsx:105-109）明确承认"新数据胜出"，gantt 注释误导。另外 StrictMode 下 mount effect（gantt.tsx:164-171）会按 mount→unmount→mount 派发两次 `onMount`/`onUnmount`（dev-only）。

### F-22 Kanban 杂项

- `kanban-helpers.ts:3-5`：每次变更 `structuredClone` 全板 O(n)（500 卡板拖一次全深拷贝）；与 undo 注释宣称的"避免全量快照"精神相悖（快照只是不进 undo 栈，变更路径仍在做）。
- `kanban-card.tsx:54-57`：卡片上 Delete/Backspace **无确认直接删卡**（有 undo 但无二次确认，与表单类组件防误删惯例不符）。
- `kanban-activity-log.tsx:84-88`：`columnNames` 映射恒 id→id，活动日志永不显示列标题；且 `onCardAdd`/`onCardRemove` 路径不调用 `recordAction`，日志只覆盖 cardMove（类型系统里的 cardCreate/cardDelete 从未产生）。
- `kanban-board.tsx:613+632`：文本过滤双重执行（列内 filterText 分支 + `filter.matchesCard` 再滤一次，两处 title 取值优先级还不同）。
- `use-kanban-column-resize.ts:46-74` 与 `gantt-layout.tsx:30-66`：列宽/面板拖拽的 document 监听只挂 pointermove/pointerup，**无 pointercancel**（OS 手势中断泄漏监听至下次 pointerup）——与包内 2-14 系列修复（gantt-drag/link-draw/calendar-drag 均已处理 pointercancel）不一致。

### F-23 Calendar 杂项

- `calendar.tsx:75-77`：deprecated `data` 警告**每次渲染**打印（无 once 语义），控制台刷屏。
- `calendar-month-view.tsx:113-124`：单元格 Enter/Space 用合成 PointerEvent 启动长按创建，但真实 `pointerup` 永不到来——500ms 后会话激活，随后的**任意一次全局点击**都会弹出类型选择器，键盘创建流程断裂。
- `calendar-month-view.tsx:291-296`：跨日连线 SVG 尺寸仅按 `[totalSize, resources, days]` 测量，无 ResizeObserver，容器 resize 后连线错位。
- `calendar.tsx`：`useCalendarExport` 的 `exportError` 全 UI 无渲染点（仅 handle invoke 抛错），注释（:229-231）声称"errors are also presented in-UI via exportError"与事实不符。
- `calendar-time-utils.ts:87-105`：排序/列分配用 `new Date(isoStr)`（无时区后缀按**本地**解析），定位用 `parseUTCDate`（按 UTC）——纯 naive 字符串场景各自内部一致尚可，但 Z 后缀与 naive 混用时排序与重叠判定错乱；建议统一入口。
- `calendar-day-view.tsx:103`：`t('scheduling.calendar.scheduleFor', { date: \`${resource.title} ${dateStr}\` })` 把资源名塞进 date 参数，i18n 模板语义错位。

### F-24 BarcodeInput 杂项

- 硬件扫描枪（keyboard-wedge）输入无缓冲组包：`handleChange` 每个字符直接 `form.setValue`，无 burst 终止符（Enter）或防抖窗口聚合，`onScan` 事件也仅相机路径触发——扫描枪场景每个字符一次表单写 + schema 无对应事件；schema 的 `scanInterval`（300ms）仅作用于相机轮询。
- `use-barcode-detect.ts:61-77`：`enabled=false`（overlay 关闭）时轮询链仍每 300ms 空转自调度（effect deps `[]`，永不清理直到字段卸载）——常驻定时器噪声。
- `use-barcode-detect.ts:45-47`：detector 以挂载时的 `formats` 固化创建，formats prop 后续变化不生效。
- `barcode-scanner-overlay.tsx:16-19`：`statusMessages` 在**模块顶层**调用 `t()`，locale 异步初始化/切换后文案陈旧。
- `barcode-input.tsx:247-257`：handle 路径 `scanNow` 的 `checkCameraAvailability().then` 缺 `mountedRef` 守卫（同文件 :84-95 的 focus 路径有），卸载后 setState。
- `barcode-input.tsx:22-28/161-171`：无 `name` 或不在 form 内时 `inputValue` 恒 `''` 且 handleChange 不落值——受控输入冻结，无非受控回退（suspect：可能约定必须挂 form）。

### F-25 Calendar `splitMultiDayEvents` 静默丢弃缺 end 事件

- `calendar-layout-utils.ts:26-28`：`if (!startDate || !endDate) continue;`——`CalendarEvent.end` 类型必填但 JSON 运行时可缺；缺 end 的事件在月视图**整条消失**（连 start 日都不渲染），无任何诊断。周/日视图（split-end 字符串比较）行为不同。建议缺 end 时按 end=start 渲染单日。

### F-26 D8 结构项

- 500 行档（`scripts/check-oversized-code-files.mjs` 实跑确认，WARN 带 500-700，非 700 错误档、不在豁免红名单）：`kanban/kanban-board.tsx` 662、`gantt/gantt.tsx` 564、`calendar/calendar.tsx` 538——按 AGENTS「超 500 行应评估拆分」应登记或拆分（kanban-board 可把 handle surface/ownership 分离；gantt.tsx 可把 re-seed/keyboard action 分离）。
- `as any` 21 处（多为 resolved 边界窄化，可改为 `as X | undefined` 收紧）；其中 `kanban-board.tsx:627-630` 的 4 处 region cast 可通过让 KanbanColumn 接受 `RenderRegionHandle` 结构类型消除。
- `gantt-grid.tsx:113/177`：虚拟化占位 `<tr style={{ height, display: 'block' }}>`——块级 tr 破坏 table-fixed 行语义，不同浏览器渲染不定；建议改用 `<tr><td colSpan={n} style={{height, padding:0}}/></tr>`。
- `components/baseline-bars.tsx:29`：基线条宽 `diffInDays(end,start)*cellWidth` 不 +1，与任务条（+1，layout.ts:44-45）同日期下窄一天。

## 检查过程记录

1. 顺序与依据：先读 `docs/references/quick-reference.md`（scheduling 包章节）与 `docs/architecture/renderer-runtime.md`（契约/事件/effect 纪律），再读 `package.json`（依赖面：pragmatic-drag-and-drop、tanstack-virtual、zustand vanilla、@zxing/library、optional peers html2canvas/ical.js/jspdf/xlsx）与 `src/` 全量文件清单（wc 统计）。
2. 精读路径：Gantt（gantt.tsx → store → date/scale/layout/worktime utils → drag/link-draw/scroll/keyboard hooks → bars/grid/links/markers/timescale/cellgrid/editor/header/layout/baseline → tree-utils/undo-stack/utils/index）→ Kanban（board → helpers → dnd/column-dnd/board-effects/filter/virtualizer/column-resize → column/column-header/card → undo-stack/export/handle → 其余组件/types）→ Calendar（calendar.tsx → state/navigation/ownership/virtualizer → date/time/layout/cross-day utils → month/week/day/event-block → drag/drag-create/export/confirm → 其余组件/types）→ BarcodeInput（barcode-input → overlay → camera/detect/torch → detector/queue/wasm/camera utils → schemas/types）→ shared/use-focus-trap → 根 definitions/index/schemas。实现文件 84/84 全覆盖。
3. 定点验证：为 F-01 读了 `tests/e2e/gantt-demo.spec.ts:300-395`（确认 scroll-sync 用例 `canScroll` 守卫空转 + 合成冒泡 scroll）与 `node_modules/.pnpm/@tanstack+virtual-core@3.14.0/dist/esm/index.js:340-360`（确认 scrollOffset 仅经 scroll 监听更新）；grep 确认 `store.scrollLeft/containerWidth` 无外部接线、`smartScaling` 零调用、单元测试 mock 掉 `use-gantt-scroll`。
4. 全包扫描：空 catch（5 处，均有理由：torch 能力探测、zxing 解码失败归 []、正则非法转 message）；`@ts-ignore` 0 处；`as any` 21 处；非空断言少量（`.get()!`/`!` 后缀，集中在 store/undo 内部不变式处）；硬编码中文仅存在于注释（UI 串全走 `t()`），`check-i18n-keys` 实跑 exit 0；addEventListener 23 处全部有配对清理（唯二例外：kanban 列宽 resize 与 gantt 面板 resize 缺 pointercancel，见 F-22）；rAF 仅 use-gantt-scroll 且正确 cancel；无 setInterval；`new Date(string)` 扫描确认日期算术全 UTC（除 F-23 所列 time-utils 混用点）；oversized 检查实跑确认本包 3 文件处 WARN 档、无未注册 ERROR 档。
5. 已知背景（3 个 watch-only e2e 终态失败：gantt-perf ×2 + kanban-perf ×1，60Hz rAF 阈值）未重复上报；F-09 的 calendar 性能面独立于该清单。
