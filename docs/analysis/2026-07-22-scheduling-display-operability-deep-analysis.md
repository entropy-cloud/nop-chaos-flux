# Scheduling 组件深度分析报告：显示效果与可操作性

> 日期：2026-07-22
> 范围：`@nop-chaos/flux-renderers-scheduling`（Gantt / Kanban / Calendar / BarcodeInput）
> 视角：显示效果（visual correctness）、可操作性（operability/interaction）、单元测试有效性
> 对照基准：`docs/components/*/design.md`（契约）+ `~/sources/complex-controls/`（开源参考源码：SVAR/DHTMLX Gantt、react-kanban-kit、Schedule-X、react-zxing）
> 方法：设计文档 ↔ 实现 ↔ 开源源码三方核对；所有 P0 结论均经直接读源码二次确认（file:line 附后）
> 关联：补充既有审计 `docs/audits/2026-07-21-1920-multi-audit-scheduling.md`（该审计聚焦 reactive/async/error/a11y，**未覆盖** 显示定位算法与 schema 接线）

## 0. 结论速览

用户反馈"显示效果很差、很多 bug、都操作不了"**完全属实**，且根因可定位。四个组件各存在 1 个以上的 **P0 阻断级缺陷**，使组件在 playground 演示态下基本不可用：

| 组件     | P0 根因（一句话）                                                                                                                  | 直接症状                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Gantt    | `gantt.tsx` 创建 store 时**未透传 `zoomLevels`**；且**展开/收起完全失效**（无组件订阅 `treeRevision`，且 `toggleOpen` 不重算坐标） | 时间刻度/背景网格/缩放全空白；点 chevron 无任何可见反应，子任务永不出现 |
| Kanban   | 传入 `data` 即进入 controlled 模式，`setBoardData` **恒为空操作**                                                                  | 拖拽/增删卡片后状态不更新，卡片弹回原位                                 |
| Calendar | 视图读 schema `view` 值而非内部 state；月视图事件**固定 25% 宽**；月视图渲染 **42 列**而非"资源×当月天数矩阵"                      | 切换月/周/日无反应；单事件只占 1/4；42 列使每格 ~28px 班次标签截断为空  |
| Barcode  | `<video>` 在 `phase==='scanning'` 才挂载，但流在 `loading` 阶段已尝试挂到 null ref                                                 | 摄像头预览**永久黑屏**，解码循环因 videoWidth=0 永不启动                |

**测试有效性的系统性问题**：测试数量可观（scheduling 包 600+ 用例全绿），但**集成层被全面 mock 绕过**，且多处测试**把缺陷值固化成"正确预期"**（asserts the bug），形成"假绿"。详见 §5。

本报告按组件列发现，每条给出 ID、严重度、类别、file:line 证据、参考、影响、修复方向。**仅分析，未做任何修改。**

---

## 1. Gantt

### 1.1 显示（G-DISP）

#### G-DISP-01 [P0] zoomLevels 未透传给 store → 时间刻度/网格/缩放全失效

- 证据：`gantt/gantt.tsx:33-37` `createInitialStore` 只传 `cellWidth/defaultZoom/taskBarHeight`；`GanttStoreConfig` 接受 `zoomLevels`（`gantt-store.ts:11`）但从未转发。结果 `store.zoomLevels` 为空 Map → `gantt-timescale.tsx:16` `store.zoomLevels.get(currentZoom)` 返回 `undefined` → `scales=[]` → 渲染 `[]`；`gantt-cellgrid.tsx:18-24` 同路径 → 无日格、无周末列；`gantt-header.tsx` 缩放按钮 `getAvailableZooms()` 返回 `[]`，`idx=-1`，`-1 < -1` 为 false → 点击无反应。
- 参考：design §5.4/§11.2；demo `gantt-demo.tsx:173-177` 与 `example.json:40-71` 均声明了 `zoomLevels`。
- 影响：**组件渲染出无日期头部、无背景网格、缩放无效的空白时间线**。这是"显示很差"的头号原因。
- 修复：`createInitialStore` 传入 `resolved.zoomLevels`；无值时种子默认 `day/week/month` 三档。

#### G-DISP-02 [P0] 左侧网格行高由内容撑开，时间线条用固定 40px → 两侧纵向错位

- 证据：`gantt-grid.tsx:65-99` 用 HTML `<table>`，`td` 仅 `px-1 py-0.5 text-xs`（高约 20-24px，随内容/换行变化）；而 `utils/layout.ts:65-75` 条 `top = index*40 + 6`（固定 40px）。几行后网格行 N 与时间线条 N 即漂移。
- 参考：design §11.2 明确："每行任务条绝对定位，行高固定为 taskBarHeight + rowPadding（缺省 28+12=40px）。不依赖内容撑高"。SVAR `Bars.jsx` 行高统一取自 store。
- 影响：点击网格行对不上同高度的时间线条；两侧视觉脱节。
- 修复：强制 `<tr>` `style={{height: store.rowHeight}}`，禁止文本换行（截断）。

#### G-DISP-03 [P1] 条宽 off-by-one：end 当 inclusive 处理，同日任务塌成 4px

- 证据：`utils/layout.ts:43-45` `durDays = diffInDays(end, start)`；`start===end` → 0 → `Math.max(0*cellWidth, 4)=4`。demo 中 `07-01→07-10` 算出 9 天 → 条短 1 格。
- 参考：DHTMLX/SVAR 约定 end 为 exclusive（1 天任务 end=start+1），或 inclusive 时 `diff+1`。
- 影响：所有条普遍短约 1 天；同日任务几乎不可见。
- 修复：明确 end 语义（建议 exclusive），用 `Math.max((diff+ (inclusive?1:0))*cellWidth, cellWidth)`。

#### G-DISP-04 [P1] 依赖线折线忽略 `type`：SS/FF/SF 全按 finish_to_start 画

- 证据：`utils/layout.ts:86-97` `linkToPolyline(source,target)` 恒取 `sx=source.$x+source.$w`（右=finish）、`tx=target.$x`（左=start），从不读 `link.type`。
- 参考：SVAR `Bars.jsx:428-431` 按 `e2s/s2s/e2e/s2e` 选锚点；DHTMLX 有 4 套路由。
- 影响：`example.json` 的 `start_to_start`（lag 2）等非 FS 依赖全部画错。
- 修复：按 `link.type` 分支选 source/target 锚点（start=`$x`，end=`$x+$w`），并处理 target 在 source 左侧的绕行。

#### G-DISP-05 [P1] 周/季度刻度标签是乱码：`%V`/`%W`/`%q` 格式 token 未实现

- 证据：`utils/date.ts:60-72` `FORMAT_TOKENS` 仅含 `Y,y,m,n,d,e,H,M,S,b,B`；`utils/scale.ts:107-122` 周/季度 `defaultFormat` 返回 `'W%V'`/`'Q%q'`；`formatDate`（date.ts:78-85）遇未知 token 原样输出字符 → `'W%V'` 渲染为 `WV`，`'第%W周'`→`第W周`。
- 影响：周/季度缩放级别头部显示无意义字符。
- 修复：补 `V`(ISO 周)/`W`/`q`(季度) formatter。

#### G-DISP-06 [P1] 里程碑条不可交互且外层未定位

- 证据：`gantt-bars.tsx:104-123` 里程碑分支 `<svg className="absolute pointer-events-none">`（pointer-events 关闭 → 不可点选/拖拽/连线）；外层 `data-task-id` wrapper 无 `left/top`；且该分支在 link-handle JSX（157-165）之前 `return`，里程碑无连线柄。
- 参考：SVAR `Bars.jsx:664-672` 里程碑用同一 `taskStyle(task)` 定位且可点选。
- 影响：demo 中"Deployment""Review""设计评审"等里程碑无法选中/编辑/连线。
- 修复：里程碑走同一定位 wrapper；菱形 `pointer-events:auto`；`linkable` 时加连线柄。

#### G-DISP-07 [P1] `taskBar` region 声明但从未渲染

- 证据：`example.json:235-240` 声明 `taskBar`；`scheduling-renderer-definitions.ts:38` 注册；但 `gantt.tsx` 从不读 `regions.taskBar`，`gantt-bars.tsx:154-156` 恒渲染硬编码 `<span>{task.text}</span>`。
- 影响：用户自定义任务条模板被静默忽略。
- 修复：将 `regions.taskBar` 透传进 `GanttBars` 替换默认文本。

#### G-DISP-08 [P1] 网格自定义列渲染空；"Predecessor"列实际显示后继

- 证据：`gantt-grid.tsx:50-59` `getCellValue` switch 仅识别 5 个硬编码 key；`case 'predecessor'` 返回 `task.$source`（$source=出向=后继，应为 `$target`）；`default`恒`''`。`example.json`的`assignee`/`progress` 列因此全空。
- 修复：`default` 改读 `(task as any)[col.name]`；`predecessor` 用 `$target`；尊重 `col.cell` region。

#### G-DISP-09 [P2] 时间刻度头部不 sticky，纵向滚动后日期头部消失

- 证据：`gantt.tsx:205-223` 单一 `overflow-auto` 容器同时承载刻度与条，刻度为普通流首子；对比网格 `<th>` 用了 `sticky top-0`（grid.tsx:71）。
- 修复：刻度 wrapper `position:sticky;top:0` 或拆分纵横滚动容器。

#### G-DISP-10 [P2] 刻度范围未按 unit 对齐，首列可能为部分天

- 证据：`gantt-store.ts:137-152` `computeScaleRange` 仅按 10% padding，不 snap 到 unit 边界；`utils/scale.ts` 已有 `computeScaleRange` 但 store 重新实现了一份未用。
- 修复：`scaleRange.start/end` 对齐到刻度 unit 边界。

#### G-DISP-11 [P2] 周末判定对 UTC 构造的日期用 local `getDay()`（时区 bug）

- 证据：`gantt-cellgrid.tsx:31` `cell.start.getDay()`（local）作用于 `Date.UTC` 构造的 cell；负偏移时区下周末高亮错位一天。
- 修复：统一用 `getUTCDay()`。

#### G-DISP-12 [P2] 无 `gantt-empty`/`gantt-loading` 骨架

- 证据：`gantt.tsx:187-235` 无空态/加载态分支；design §6/§10 规定骨架与 `gantt-empty` marker。`example.json:241` 声明 `empty` 但从不读取。
- 修复：任务为空时渲染 `regions.empty`/默认骨架。

### 1.2 可操作性（G-OPS）

#### G-OPS-01 [P0] `scrollToToday`/`scrollToTask` 滚的是左侧网格而非时间线

- 证据：`gantt.tsx:136-160` `const container = gridRef.current`（左表，无有效横滚）→ `container.scrollLeft` 被 clamp 到 ~0 → 再把该值赋给 `timelineRef.scrollLeft`。计算出的 `x` 被丢弃。
- 影响："滚动到今日"和 `scrollToTask` 句柄无效。
- 修复：直接设 `timelineRef.current.scrollLeft`，仅同步 `scrollTop`。

#### G-OPS-02 [P0] store `parse()` 在任何编辑后被 `_dirty` 守卫静默空操作 → 数据重载丢失

- 证据：`gantt-store.ts:72-73` `if (this._dirty) return;`；所有 mutation（updateTask/updateLink/toggleOpen/deleteTask/addLink/removeLink）置 `_dirty=true` 且从不复位。`gantt.tsx:72-78` 数据指纹变化时重调 `store.parse(...)` → 首次拖拽后所有重载被丢弃。
- 影响：移动一个任务后，Gantt 永久冻结在旧数据（直到重挂载）。
- 修复：移除 `_dirty` 守卫（parse 本就全量替换 state），或 parse 成功末尾 `_dirty=false`。

#### G-OPS-03 [P1] 拖拽无 drop indicator、不淡化原条、ghost 可纵向漂移

- 证据：`hooks/use-gantt-drag.ts:28-63` ghost 用 `translate(dx,dy)`，dy 被施加（design 要求仅水平）；原条保持全不透明（design 要求 0.3）；全树无 `gantt-drop-indicator`/`gantt-bar-ghost`-on-original 使用。
- 修复：ghost 仅 `translateX(dx)`；拖拽中原条 opacity 0.3；目标列渲染指示线。

#### G-OPS-04 [P1] `onTaskDragEnd`/`onLinkDragEnd` 事件从不派发

- 证据：`useGanttDrag` 仅收 `containerRef`（gantt.tsx:80），无 events 访问；commit 仅 `store.updateTask`；`use-gantt-link-draw.ts:56-67` 仅 `store.addLink(...,'finish_to_start')`。
- 影响：`example.json:219` 的 `onTaskDragEnd` toast 不触发；后端持久化（`ganttTask__save`）永不调用。
- 修复：向 hook 传 `onCommit(taskId, changes)` 回调以派发对应事件。

#### G-OPS-05 [P1] 缩放句柄在无 zoomLevels 时全失效（叠加 G-DISP-01）

- 证据：`gantt-store.ts:270-272` `if (!state.zoomLevels.has(zoomKey)) return;`。
- 修复：随 G-DISP-01 修复。

#### G-OPS-06 [P1] 键盘 ArrowLeft/ArrowRight 行为完全相同（都 toggleOpen），且与 per-bar 箭头→resize 冲突

- 证据：`hooks/use-gantt-keyboard.ts:38-51` 两个分支都调 `toggleOpen`；`gantt-bars.tsx:54-82` 把 ArrowLeft/Right 映射为 resize。
- 修复：Left=收起、Right=展开（或滚动）；移除 per-bar 箭头→resize 冲突映射。

#### G-OPS-07 [P1] 键盘选中不移动 DOM 焦点；`updateRowAria` 是死代码

- 证据：`use-gantt-keyboard.ts:90-100` 返回 `updateRowAria` 但 `gantt.tsx:129-134` 丢弃；ArrowUp/Down 调 `onSelectTask`（state 更新）但不 `row.focus()` → roving tabindex 失效。
- 修复：按 `selectedTaskId` 在 effect 中 focus 行，或在 handler 内直接 focus。

#### G-OPS-08 [P1] 顶层父任务无展开/收起 chevron

- 证据：`gantt-grid.tsx:106-116` chevron 受 `task.$level > 0` 门控；但顶层有子任务（如 demo "Project Alpha"，`$level===0`）应可折叠。条件应为"有子"，非"嵌套"。
- 修复：`store.getVisibleDescendantCount(task.id) > 0` 时渲染 chevron。

#### G-OPS-09 [P2] 连线绘制恒创 `finish_to_start`；start/end 柄不区分

- 证据：`use-gantt-link-draw.ts:39-42,63` 假定右柄；`addLink(...,'finish_to_start')` 硬编码；两柄 `data-slot` 相同（`gantt-bars.tsx:157-165`）无法区分。
- 修复：向 `onLinkHandlePointerDown` 传柄侧 `'start'|'end'`，据两侧推 link type。

#### G-OPS-10 [P2] 双击编辑器可能重复触发；`onTaskClick`/`onEmptyCellClick`/`onZoomChange`/`onScroll` 事件从不派发

- 证据：`eventsRef.current` 仅用于 onMount/onUnmount（gantt.tsx:64）。
- 修复：在各交互点派发对应事件。

#### G-OPS-11 [P0]（共识新增）展开/收起完全失效——无任何生产组件订阅 `treeRevision`

- 证据：`toggleOpen`/`expandAll`/`collapseAll`（gantt-store.ts:205-224）仅 bump `revision` + `treeRevision`。但 `gantt-context.tsx:24-61` 定义的全部快照 hook 中，订阅这两者的 `useGanttStoreSnapshot`(→revision) 与 `useGanttTreeSnapshot`(→treeRevision) **仅出现在 `gantt-context.test.tsx` 与 barrel 导出**，零生产调用方。生产组件订阅表（独立核实）：`GanttGrid`/`GanttCellGrid`/`GanttTimeScale`/`GanttMarkers` 仅订阅 `layoutRevision`；`GanttBars` 订阅 `taskRevision`+`layoutRevision`；`GanttLinks` 订阅 `linkRevision`+`layoutRevision`；`GanttHeader`/`GanttEditor` 仅 `useGanttStore`。点 chevron（`gantt-grid.tsx:112`→`store.toggleOpen`）更新 `expandedSet` 但触发**任何组件都不重渲染**。
- 影响：层级任务树无法导航；`expandAll`/`collapseAll` 同样全死。与 G-OPS-08（顶层无 chevron）叠加，整个树展开特性在 UI 中不存在。
- 修复：在 `GanttGrid`/`GanttBars` 加 `useGanttTreeSnapshot()`（或让 `toggleOpen` 同时 bump `layoutRevision`），并配合 G-OPS-12 重算坐标。

#### G-OPS-12 [P0]（共识新增）`toggleOpen` 从不重算子任务坐标

- 证据：`gantt-store.ts:205-212` `toggleOpen` 仅 `setState({expandedSet,...})`，**不调用** `computeComputedPropertiesInternal`/`computeCoordinates`/`recalcLayout`（对比 `updateTask`:186 会调）。隐藏子任务在 parse 时初始化为 `$x:0,$y:0,$w:0,$h:0`（gantt-store.ts:76），`computeCoordinates`(154-162) 依赖 `expandedSet` 经 `getVisibleTasks` 但 `toggleOpen` 后从不被调用 → 这些值恒为 0。
- 影响：即使修了 G-OPS-11（组件订阅并重渲染），展开的子任务仍渲染在 (0,0) 零尺寸 → 不可见、网格错位。两 P0 须同修。
- 修复：`toggleOpen`/`expandAll`/`collapseAll` 末尾调 `computeComputedPropertiesInternal()`（至少 `computeCoordinates`），并 bump `layoutRevision`。

#### G-OPS-13 [P1]（共识新增）`updateTask` 不 bump `layoutRevision` → 编辑后背景网格/刻度/今日线/依赖线变陈旧

- 证据：`gantt-store.ts:172-187` `updateTask` bump `taskRevision` 并调 `computeComputedPropertiesInternal`（跑 computeScaleRange+computeCoordinates+computeLinkPolylines），但**不 bump `layoutRevision`**（仅 `recalcLayout`:134 bump）。`GanttCellGrid`/`GanttTimeScale`/`GanttMarkers`/`GanttLinks` 都按 `layoutRevision` 重渲染。
- 影响：拖拽使整体日期跨度变化后，日格背景、刻度头、今日线、依赖线不刷新（条本身经 taskRevision 刷新）→ 视觉脱节。
- 修复：`updateTask` 内 bump `layoutRevision`，或令 `computeComputedPropertiesInternal` bump 它。

#### G-OPS-14 [P1]（共识新增）ArrowUp/ArrowDown 在聚焦条上同时触发"日期移动"与"选择导航"

- 证据：`gantt-bars.tsx:64-71` per-bar handler 把 Up→move-up/Down→move-down（±1 天，gantt.tsx:92-106）并 `preventDefault` 但**不 `stopPropagation`**；容器级 `keydown`（use-gantt-keyboard.ts:81）也处理 Up/Down→`onSelectTask`。两者都执行。
- 修复：bar handler 内 `stopPropagation`，或移除 per-bar 上下箭头→日期移动绑定（仅保留容器级选择导航）。

### 1.3 契约漂移（G-DRIFT）

- **G-DRIFT-01 [P2]** `category` 定义为 `'scheduling'`（definitions:13），design §3 写 `'data'`。
- **G-DRIFT-02 [P2]** `body` region 已注册（definitions:15,18）但 design 无 `body`；`gantt.tsx` 从不消费 → 误导 schema 作者。
- **G-DRIFT-03 [P2]** demo 用短式 `type:'FS'`（gantt-demo.tsx:156-164），store 从不归一化；`example.json` 用长式 `'finish_to_start'`；两份官方样例不一致。一旦修 G-DISP-04，demo 的 `'FS'` 会错路由。
- **G-DRIFT-04 [P3]** `zoomIn/zoomOut/scrollToToday/scrollToTask`：经 `useImperativeHandle`（gantt.tsx:162-179）**已暴露于 ref**，但因 G-DISP-01（zoomLevels 空）与 G-OPS-01（scroll 滚错元素）而实际不可用；schema 层 `reaction` 字段（definitions:59-62）能否路由到该 ref 取决于 flux-core reaction 基础设施（需运行时确认）。
- **G-DRIFT-05 [P3]** `initiallyExpanded`/`progressBarHeight`/`startDate`/`endDate`/`childrenField`/`calendar` 声明但未用。

---

## 2. Kanban

### 2.1 显示（K-DISP）

#### K-DISP-01 [P1] BoardData 模型漂移：design `title/content` vs 实现 `data`

- 证据：design `KanbanItem`（design.md:58-74）有顶层 `title?`/`content?`/`meta.{color,priority,icon,badge,tags,members}`；实现 `BoardItem`（kanban.types.ts:8-9）改为 `data: Record<string,any>` + `meta`。`kanban-card.tsx:26` 读 `card.data?.title`；`kanban-column.tsx:98` 读 `column.data?.title`。demo 用 `data`（一致，故默认配置可正常渲染），但**按 design 文档提供 `{id,title,meta}` 的 schema 会得到全空白看板**（`card.data` 为 undefined）。
- 注：严重度经共识裁决由 P0 下调为 P1——默认/demo 配置可渲染，属"契约漂移静默破坏按 design 文档编写 schema 的作者"，非"默认配置不可用"。
- 参考：RKK `BoardItem` 顶层即 `title: string`。
- 修复：`BoardItem` 增 `title?`/`content?` 并让渲染器双路径读取；或更新 design 文档对齐 `data` 模型并记录迁移。

#### K-DISP-02 [P1] configMap 渲染路径失效

- 证据：`kanban-card.tsx:47-51` 当 `config?.render` 为真时竟渲染 `cardTemplateRegion?.render(...)`（而非 `config.render`）；且 `config.render` 是 `SchemaInput` 非可调用函数，需运行时编译，代码从不编译/调用。仅给 configMap 不给 cardTemplate 时 → 渲染 `undefined` → 卡片只剩 tags。
- 修复：经运行时把 `config.render` SchemaInput 编译为 render handle 再以 `{card,column,index}` 调用。

#### K-DISP-03 [P1] 拖拽视觉反馈 CSS 永不命中

- 证据：`kanban-board.tsx:447` `data-dragging` 放在**看板根**（同时具 `nop-kanban` 类）；CSS `.nop-kanban [data-dragging='true'] .nop-kanban-card` 用后代选择器，元素非自身后代 → **永不匹配** → 拖拽中无任何卡片获 opacity 0.5/scale 0.95。
- 参考：RKK 按卡设置 `is-dragging` 状态并作用于具体卡片内 ref。
- 修复：`data-dragging` 置于具体被拖卡片（经 `dragState.draggingCardId`）；CSS 改 `.nop-kanban-card[data-dragging='true']`。

#### K-DISP-04 [P1] 卡片间无 drop indicator 指示线

- 证据：`use-kanban-dnd.ts:106-111` drop target `getData` 返回固定 `dropIndex: index`，无 `attachClosestEdge`；全仓无 `attachClosestEdge`/`extractClosestEdge` 导入；`DropState.closestEdge` 恒 null；无指示线 CSS。
- 参考：design §10/§11.1.1；RKK 用 `attachClosestEdge`+`reorderWithEdge`。
- 修复：引入 `attachClosestEdge`，按 edge 算最终插入位，渲染 2px 蓝线。

#### K-DISP-05 [P1] regions 从未从 board 传给 column

- 证据：`kanban-board.tsx:508-529` `<KanbanColumn>` 未传 `columnHeaderRegion`/`cardTemplateRegion`/`columnFooterRegion`/`columnHeaderToolbarRegion`（column 组件已声明这些 prop）。board 仅读 `regions.empty`/`regions.loading`。
- 影响：所有 schema 自定义模板被静默忽略。
- 修复：渲染 `<KanbanColumn>` 时映射对应 region prop。

#### K-DISP-06 [P2] 虚拟器用固定估算高度且无 `measureElement` → 卡片重叠/滚动跳跃

- 证据：`use-kanban-virtualizer.ts:19-24` `estimateSize: ()=>88` 无 `measureElement`；且虚拟化被硬编码恒开（`kanban-board.tsx:522` `virtualize` 固定 true）。高于 88px 的卡片（含描述/tags/members）使 totalSize 与实际位置漂移 → 卡片重叠。
- 参考：design §12.2 "P0/P1 先不做虚拟滚动"。
- 修复：加 `measureElement`，或默认关闭虚拟化。

#### K-DISP-07 [P2] 非法 HTML：`<ul>`→`<div>`→`<li>` 嵌套

- 证据：`kanban-column.tsx:140-167` 虚拟路径用 `<div role="none">` 包裹，而 `KanbanCard` 渲染 `<li>`（kanban-card.tsx:78）。浏览器可能自动修正 DOM 导致布局异常。
- 修复：`KanbanCard` 改 `<div>` 或重构虚拟 wrapper。

#### K-DISP-08 [P3] `KanbanWipBadge` 组件从未被使用（死代码）

- 证据：`components/kanban-wip-badge.tsx` 全文件；`kanban-column-header.tsx:89-94` 改用内联 span。已测 9 个用例的组件在生产中不出现。

### 2.2 可操作性（K-OP）

#### K-OP-01 [P0] controlled 模式使整个看板只读（所有 mutation 空操作）

- 证据：`kanban-board.tsx:68-79` `isControlled = rawData != null`（提供 `data` 即 true）；`setBoardData` 内 `if (!isControlled) setLocalBoardData(updater)` → controlled 下**恒不执行**。demo 传 `data: SAMPLE_KANBAN_DATA`（kanban-demo.tsx:133）→ 所有拖拽/增删/键盘移动 → `setBoardData` → 空操作 → 看板永不更新，卡片弹回。
- 参考：design §7 "悲观更新"指等数据源确认后更新，而非"拒绝更新"；实现把"提供 data"等同于"外部受控"，却无数据源回推机制。
- 影响：**"操作不了"的头号原因**。playground 与任何内联 `data` 的 schema 均如此。
- 修复：默认非受控（挂载/rawData 引用变化时拷入 localBoardData）；仅显式 `controlled` 标志或 `data-source` 绑定时才受控；或始终更新 localBoardData 并经事件外同步。

#### K-OP-02 [P1] DnD 适配器反馈环：每次 render 销毁+重建全部适配器（拖拽中途断裂需运行时确认）

- 证据：`kanban-board.tsx:180-194` `wipOverLimitColumns` 每次 render 新建 Set（IIFE，非 useMemo）；`use-kanban-dnd.ts:120,144` `registerColumn` 依赖它 → 每次 render 重建；`kanban-board.tsx:363-396` 注册 effect 依赖 `registerColumn` → **每次 render（含拖拽中任一 setDropState/setDragState 触发的重渲染）cleanup 销毁全部卡片/列/头 DnD 适配器再重建**。
- 缓解因素（共识裁决由 P0 下调为 P1）：`monitorForElements` 以 `[]` deps 独立注册（use-kanban-dnd.ts:49-89），其 `onDrop` 在 drop 时读 `location.current.dropTargets[0]`，**存活于上述抖动**；源 `getInitialData` 在 drag start 捕获（use-kanban-dnd.ts:95-102）。因此 drop 仍可能 resolve；"拖拽中途硬断裂"取决于 pragmatic-dnd `AdapterManager` 内部对 mid-drag 适配器销毁的容忍度，**需运行时确认**。确认影响：主要交互（拖拽）期间严重性能退化 + 正确性隐患。
- 参考：RKK 按组件 ref 注册 DnD（per-card `draggable`/`dropTargetForElements`），非集中 querySelectorAll。
- 修复：`useMemo(wipOverLimitColumns)`；更好：重构为 per-component ref 注册（RKK 模式）。

#### K-OP-03 [P1] 无 `attachClosestEdge`：无法把卡片插入到目标"之后"

- 证据：见 K-DISP-04；drop 恒插到 target 自身 index（之前），无 before/after 区分；下移一位可能因 index 偏移失效。
- 修复：加 closest-edge 逻辑。

#### K-OP-04 [P1] 标签筛选选中无效（不过滤卡片）

- 证据：`kanban-board.tsx:82,290-294,500-531` `selectedTagIds` 有状态且 `handleToggleTag` 可切，但**从不传给 column 或用于过滤**；`KanbanColumn` 无该 prop。点 pill 仅高亮，不改卡片显示。
- 参考：design §12.9。
- 修复：传 `selectedTagIds` 给 column，按 `meta.tags` 交集过滤。

#### K-OP-05 [P1] 列拖拽重排失效（无 drop zone 注册）

- 证据：`use-column-dnd.ts:64-77` 返回 `registerBoardDropZone`，但 `kanban-board.tsx:227` 仅解构 `registerColumnHeader`，**从不调用** `registerBoardDropZone`；列仅注册为 drag source，无 drop target → `onDrop` 找不到 `targetData.columnIndex` 提前返回。仅键盘 ArrowLeft/Right 可重排。
- 修复：在 DnD 注册 effect 中对每个列元素调 `registerBoardDropZone`。

#### K-OP-06 [P1] `filterCard` 表达式从不求值

- 证据：`kanban-board.tsx:172-176` 检查 `typeof raw === 'function'`，而 schema 中 `filterCard` 是 `string` 表达式 → 恒不通过；且 `use-kanban-filter.ts:27-28` 的 `matches` 读 `card.title`/`card.description`（实际数据在 `card.data.*`）→ 字段路径也错；column 组件干脆忽略该 hook 自行内联过滤。
- 参考：design §9 "`filterCard` 为原始表达式，行 scope 下延迟求值"。
- 修复：经 formula compiler 在行 scope 求值；修正字段路径。

#### K-OP-07 [P2] "Add Column" 是非交互占位

- 证据：`kanban-board.tsx:532-539` `<div aria-hidden="true">` 无 onClick；`useKanbanAdder.addColumn` 已导出但从不使用。
- 修复：接线为可交互按钮 + 内联标题输入。

#### K-OP-08 [P2] `useKanbanAdder`/`useKanbanCollab` 已导出且各自有测试，但从不被 board 引用（死代码 + 假覆盖）。

#### K-OP-09 [P2]（共识新增）`columnsConfig` prop 是死字段

- 证据：`kanban.types.ts:44` 声明，`scheduling-renderer-definitions.ts:77` 注册并注释 "consumed: used as data-driven columns configuration"，但 `rg columnsConfig` 在 `src/kanban/` 仅命中类型声明——`kanban-board.tsx` 从不读 `resolved.columnsConfig`。误导性注释使问题更隐蔽。

#### K-OP-10 [P2]（共识新增）`_handleCardRemove` 不可达；UI 无任何删卡入口

- 证据：`kanban-board.tsx:281` 定义 `_handleCardRemove`（前缀 `_`=未用）；`onCardRemove` 事件已注册但无渲染元素调用。用户无法删除卡片。

#### K-OP-11 [P2]（共识新增）controlled 模式下 undo/redo 静默失效

- 证据：`handleUndo`/`handleRedo`（kanban-board.tsx:131,146）调 `setBoardData`，而 controlled 模式下 `setBoardData` 是空操作（K-OP-01）。按钮渲染为可用、看似能点，实则无反应。是 K-OP-01 的直接衍生但未单列。

#### K-OP-12 [P3]（共识新增）`columnWidth:'equal'` 并非真等分；无 roving tabindex

- 证据：`kanban-board.tsx:360,520` `'equal'` 落入 default 分支→每列固定 280px，无 flex-1/总宽均分。a11y：每张卡 `tabIndex:0`（kanban-card.tsx:42）、列头及其拖拽柄也 `tabIndex:0`（kanban-column-header.tsx:62,80）→ N 张卡产生 N 个 tab stop。

### 2.3 契约漂移（K-DRIFT）

- **K-DRIFT-01 [P1]** `KanbanItem` 模型偏离 design（见 K-DISP-01）。
- **K-DRIFT-02 [P1]** 事件：design 为嵌套 `events.*`（§4.2），实现为顶层扁平 `onCardMove` 等（types:71-76），且 `KanbanEvents` 接口定义但未用。
- **K-DRIFT-03 [P2]** `body` region 实现有（types:51），design 无。
- **K-DRIFT-04 [P2]** `filterCard` 类型/运行时检查不一致（string vs function）。
- **K-DRIFT-05 [P3]** `moveCardKeyboard` 形参/调用不一致（视觉 index 当数据 index），且未 memo。

---

## 3. Calendar

### 3.1 显示（C-DISP）

#### C-DISP-01 [P0] 月视图事件固定 1/maxConcurrent 宽（单事件=25%，75% 留白）

- 证据：`utils/calendar-layout-utils.ts:91-123` `widthPerEvent = 100/effectiveMax`（effectiveMax 默认 4）→ 每事件恒 25%；`PositionedEvent.maxConcurrent` 字段设为实际数但 `width` 忽略它 → 内部不一致。单事件 `width:25,left:0`。
- 参考：design §10 HTML 示例 2 事件各 50%；Schedule-X `event-concurrency.ts:74-81` 按**实际批并发**算宽，单事件 100%。周视图自己的 `allocateConcurrentWidths`（time-utils）反而是对的。
- 影响：每个单元格只显示左上角小色条，大片留白 → "显示很差"头号症状。
- 修复：每格按实际并发数算宽 `100/Math.min(dayBlocks.length, effectiveMax)`，`effectiveMax` 仅用于折叠 "+N"。

#### C-DISP-02 [P0] 月视图渲染 42 天（6 周）通用日历网格，而非"资源×日期矩阵"

- 证据：`calendar-month-view.tsx:63-66,191` `getMonthDays`（date-utils.ts:103-110）返回 28-42 天含邻月溢出 → 10 资源 × 42 列 = 420 个 <48px 单元格，事件文字截断为空。
- 参考：design §1 "核心范式是 N 资源 × M 日期矩阵"；§12 风险表明确警告"不复制周分段算法"。实现恰恰做了被禁止的事。
- 影响：列窄到不可读；矩阵视觉破碎。
- 修复：月视图 M=当月天数（28-31），弃用 `getMonthDays`，改用 `getDateRange(getMonthStartEnd(...))`。

#### C-DISP-03 [P0] 虚拟器使行距翻倍（transform 但无 position:absolute）

- 证据：`calendar-month-view.tsx:158-182` 行 `<div style={{height:size, transform:translateY(start)}}>` 在**正常流**中（非 absolute），父级 `relative` `height:totalHeight` → 行 N 最终 Y = 流偏移(N*48) + transform(start)；全量渲染时 = N*96 → **间距翻倍、巨大空隙**。虚拟器恒开（`calendar.tsx:311` 无条件调）。
- 参考：`@tanstack/react-virtual` 标准模式要求 `position: 'absolute'` + `top: 0`/`left: 0`，仅靠 `transform: virtualItem.start` 定位，滚动容器为定位上下文。
- 修复：行 div 加 `position:'absolute',left:0,right:0`，仅靠 transform 定位。

#### C-DISP-04 [P1] 邻月溢出天的事件被静默丢弃

- 证据：`positionEventsInMonth` 仅在 `while(current <= dateRange.end)`（当月 1→末）内写 rowMap；而渲染列 `days=getMonthDays` 含最多 ~6 个溢出天 → 查 `positionedMap.get(res).get(溢出日)` 得 undefined → 空格。
- 影响：跨月多日事件在边界处丢块。
- 修复：positionEventsInMonth 遍历与渲染相同的 `days`（或限制网格为当月天，配 C-DISP-02）。

#### C-DISP-05 [P1] 时区日期运算缺陷（local/UTC getter 混用）

- 证据：`calendar-date-utils.ts:89-91` `toISODateString` 用 `getFullYear/getMonth/getDate`（local）作用于 `Date.UTC` 构造的日期；`isToday`（:49-53）/`isSameDay`（:36-42）同理。UTC−8 下 `2026-07-22T00:00:00Z` → `toISODateString` 得 `'2026-07-21'`，"今日"高亮错格。CI（UTC）掩盖此 bug。
- 参考：design §9 "Unix 时间戳 + UTC Date"；Schedule-X 用 Temporal.PlainDate 天然时区安全。
- 修复：`toISODateString`/`isToday`/`isSameDay` 改用 `getUTC*`；补非 UTC 时区测试。

#### C-DISP-06 [P2] 头部星期格误用 `data-slot="calendar-cell"`

- 证据：`calendar-month-view.tsx:140-149` 周几头格带 `data-slot="calendar-cell"`；`getCellFromPoint`（calendar.tsx:88）`closest('[data-slot="calendar-cell"]')` 会命中头部；键盘导航 `querySelectorAll` 也把头计入数据格。
- 修复：头格移除 `calendar-cell`（用 `role="columnheader"` + 非冲突类）。

#### C-DISP-07 [P2] 跨日 SVG 混用百分比/像素坐标 → 连线画错（需运行时复核）

- 证据：`calendar-cross-day-lines.ts:50-56` x 用百分比、y 用像素；SVG 无 `viewBox`。
- 修复：统一单位（getBoundingClientRect 像素）并设 viewBox。

#### C-DISP-08 [P2] 冲突检测错误：同格任意 2+ 事件即标红

- 证据：`calendar-month-view.tsx:73-89` `conflictMap` 仅按 `dayEvents.length>1 && ids.size>1`；非时间重叠的早晚班也被标红。已有正确的 `detectConflicts`（layout-utils.ts:143 区间重叠）但 view 从不调用。
- 修复：调用 `detectConflicts`。

#### C-DISP-09 [P3] 空/加载态骨架不符 design；loading region 仅当 schema 提供时渲染，无内置回退。

### 3.2 可操作性（C-OPS）

#### C-OPS-01 [P0] 视图切换（月/周/日）在 local/非受控模式下完全失效

- 证据：`calendar.tsx:65` `activeView = (resolved.view) ?? 'month'`（读 **schema**）；`:356` header `onViewChange={setActiveView}` 更新内部 state；但 `:360` `{activeView === 'month' && ...}` 用的是 **schema 值** → 内部 setActiveView 被忽略。demo 用静态字面量 `view:'month'`（calendar-demo.tsx:104）→ 切换**完全死**。
- 参考：design §7 "renderer 内部提供临时本地状态"；`viewOwnership:'local'`（默认）即组件自有。
- 修复：从 `useCalendarState` 解构 `activeView` 用于渲染与 header；schema `view` 仅作初值（除非 `viewOwnership:'controlled'`）。

#### C-OPS-02 [P1] 拖拽创建忽略拖过范围，恒创单日事件

- 证据：`use-calendar-drag-create.ts:96-99,183-209` pointermove 跟踪 `currentDate/currentResource`，但 `confirmCreate` 忽略之，`end: start.date`（恒等于 start）。
- 参考：design §12.2 步骤 2/4 含 `startDate,endDate` 范围与多格高亮。
- 修复：pointerup 取 `currentDate` 为 end，取 min/max。

#### C-OPS-03 [P2] 拖拽移动 ghost 为固定 120×40 + 魔法偏移；无 drop 目标反馈

- 证据：`calendar.tsx:415-426`/`use-calendar-drag.ts:99-156` `left:currentX-60,top:currentY-20`；全树无 `data-drop-target` 写入 → design §12.1 的绿/红预览缺失。
- 修复：hover 格加 `data-drop-target`+ok/conflict 类；ghost 按内容尺寸 + `translate(-50%,-50%)` 居中。

#### C-OPS-04 [P1] 导出 PNG 无取消/并发守卫；且 `exportToPNG` 根本未接入 imperative handle

- 证据：`use-calendar-export.ts:20-53` 无 AbortSignal/exporting ref；`calendar.tsx:292-305` `useImperativeHandle` 从不设 `CalendarHandle.exportToPNG`（:37 声明）→ 注册的 `component:exportPNG` reaction（definitions:158）是**死的**。
- 修复：加 signal+守卫（仿 Gantt `export-handles.tsx`）；把 export 接入 handle。

#### C-OPS-05 [P2] 键盘 Enter/Space 把 `KeyboardEvent` 强转 `PointerEvent` 触发 `onCellDragStart`

- 证据：`calendar-month-view.tsx:122-126` `onCellDragStart?.(dateStr, resourceId, e as unknown as React.PointerEvent)` → startCellDrag 读 `clientX/clientY` 得 undefined。
- 修复：以格中心合成坐标。

#### C-OPS-06 [P3] `onDateChange` payload 发完整 ISO 时间戳而非 date-only（design §4/§8 约定 date-only）。

#### C-OPS-07 [P1]（共识新增）无 `resources` 时所有事件被丢弃

- 证据：`calendar.tsx:307-309` 无 resources 时合成 `displayResources=[{id:'_default'}]`。月视图 `positionEventsInMonth` 按 `event.resourceId ?? ''` 分组（layout-utils:31,56），再查 `groups.get('_default')`→undefined→`continue`（:99-100）→**全部丢弃**；日视图 `(evt.resourceId ?? '') === '_default'`（day-view:55）→恒 false→全部丢弃；周视图 `(evt.resourceId ?? '_default') === '_default'`（week-view:69）→**仅匹配无 resourceId 的事件**，有 resourceId 的事件被丢。各 view 的"无数据"回退检查 `resources.length===0`，但 `resources` 是 `displayResources`（长度 1）→回退也不显示。
- 影响：最简配置 `{type:'calendar',events:[...]}`（无 resources）在三视图中均坏——月/日全空，周只显示无 resourceId 的事件。用户看到空网格无任何提示。
- 修复：合成默认资源时把事件 `resourceId` 归一为 `'_default'`（或各 view 过滤逻辑把 `undefined`/`'_default'` 视为匹配）。

#### C-OPS-08 [P1]（共识新增）`viewOwnership`/`dateOwnership`/`statusPath`/`viewStatePath`/`dateStatePath` 声明但从不消费

- 证据：`schemas.ts:126-130`、`definitions.ts:149-153` 声明，但 `calendar.tsx` 从不读取。design §7（:124-132）明确定义 local/controlled/scope 三层 ownership 模型支撑 view 与 date。
- 影响：这是 C-OPS-01（视图切换失效）的**架构根因**——即使把 `activeView` 改为读 `useCalendarState`，该 state 也只是纯 local React state，无 `component:setView` 持久化路径、无 scope 接线。集成契约缺失，非单变量问题。
- 修复：实现 ownership 三层模型；至少让 `viewStatePath`/`dateStatePath` 接 scope state。

### 3.3 契约漂移（C-DRIFT）

- **C-DRIFT-01 [P1]** 事件源字段：design §4 `data`，实现/definitions/demo 全用 `events` → 按 design 写 `data:[...]` 得空白日历。审计计划 `2026-07-22-2` 称已解决但 design.md 从未更新。
- **C-DRIFT-02 [P2]** `CalendarResource.text` 代码新增且必填，design 仅有 `title`；demo 两者都设。
- **C-DRIFT-03 [P2]** `onEventCreate/onBatchSchedule/onImport/onImportError/onTimezoneChange/onGroupToggle` 及 `component:print/exportPNG/importICal/exportToICal` 已注册但 design §8 事件表无（design 各 §12 末注"应补充到 §8"从未执行）；其中 `exportPNG`/`importICal` 声明但未接线（C-OPS-04）。
- **C-DRIFT-04 [P2]** `CalendarResourceGroup`/`CalendarResourceHeader` 是死组件（各有测试但 `calendar.tsx`/month-view 从不导入）；month-view 内联了一个无头像/无类型/无展开的简易头 → design §12.3 资源分组能力缺失。
- **C-DRIFT-05 [P3]** `firstDayOfWeek` 默认 0（周日），zh-CN ERP 场景通常应为 1（周一）；`showCrossDayLines` 已消费但 design §4 无此字段。
- **C-DRIFT-06 [P3]** 多日 end 语义为 inclusive（未文档化）；demo 生成器显式减 1 补偿（calendar-demo.tsx:78-80）佐证其为 load-bearing 但无文档。

---

## 4. BarcodeInput

### 4.1 显示（B-DISP）

#### B-DISP-02 [P0] 摄像头预览永久黑屏（流从未挂到 `<video>`）

- 因果链（全部已读源码确认）：
  1. `barcode-scanner-overlay.tsx:47` 初始 `phase='loading'`；`:244` `<video>` 仅在 `phase==='scanning'` 渲染。
  2. init effect（`:88-97`）`setPhase('loading')` → `await start()` → `setPhase('scanning')`。
  3. `start()` 内 `use-barcode-camera.ts:75-78` `if (videoRef.current) { videoRef.current.srcObject = stream; ... }` —— 此刻 `phase` 仍为 `loading`，video 未挂载 → `videoRef.current === null` → srcObject 未设。
  4. `setPhase('scanning')` 后 video 挂载，但**无 effect 重新挂接** streamRef 中的流；effect deps `[open,wasmUrl,onScanError,stop,start]`（:113）均未变。
- 参考：react-zxing `useZxing.ts:94,189` **无条件**渲染 `<video ref={ref}>`，`startDecoding` 假定元素已存在（:171）。Flux 用 phase 门控 video 破坏了该不变式。
- 影响：摄像头画面永不显示；`videoWidth=0` → `use-barcode-detect.ts:60` 每次轮询短路 → **扫码器无法显示也无法解码**。
- 修复：始终渲染 `<video>`（用 CSS 切换可见性而非挂载），或在 `camera.isActive`/`videoRef.current` 上加响应式 effect 挂接 `stream→srcObject`。

#### B-DISP-01 [P1] 覆盖层未 portal 到 body

- 证据：`barcode-scanner-overlay.tsx:213-225` 普通 `<div className="fixed inset-0 ...">` 内联渲染；barcode-input 目录全仓 grep `createPortal` 零命中。
- 参考：design §6/§10 "通过 portal 渲染到 body"。
- 影响：`position:fixed` 被任何 `transform/filter/perspective/will-change` 祖先击穿 → 覆盖层被裁剪/错位/压在兄弟下。
- 修复：`createPortal(<div/>, document.body)`。

#### B-DISP-06 [P1] 优雅降级实为"静默永久失败"（无 zxing ponyfill）

- 证据：`utils/barcode-detector-utils.ts:38-41` 无原生 `BarcodeDetector` 时返回 `{detect: async()=>[], supportsSkewRetry:true}`；加载的 WASM（`prepare-wasm.ts:30` `await response.arrayBuffer()`）被丢弃；全仓无 `@zxing/library`/`barcode-detector/ponyfill` 导入。
- 参考：design §11 "降级时通过 @zxing/library ponyfill 提供"；react-zxing 用 `barcode-detector/ponyfill`+`prepareZXingModule`。
- 影响：Firefox/Safari（无原生 API）下扫码器能开（修 B-DISP-02 后）但**永不解码**，无错误无反馈；PDA/移动端目标用户受影响最大。
- 修复：实现真实 zxing ponyfill 检测器，或显式报"浏览器不支持"。

#### B-DISP-03 [P2] 缺失 CSS：design 的 hover/active/过渡 marker 缺失

- 证据：`barcode-input.css:1-14` 仅定义 `.nop-barcode-input/.nop-input-text/.nop-input-group`；无扫码按钮 hover(`#f1f5f9`)/active(scale 0.95)、无关闭钮 hover、无 backdrop fade-in(200ms)/video scale 过渡。审计 F-55 称"6 缺失 CSS 已修"对 barcode 的 hover/active/过渡契约不准确。

#### B-DISP-04 [P2] 状态机文案与 design 不符

- 证据：`overlay.tsx:233,240,284` 用 `t('flux.openingCamera')`/`t('flux.alignBarcode')`/`errorMessage ?? cameraUnavailable`；design §10 的"识别中""识别失败，请重试"在 i18n 中不存在。

#### B-DISP-05 [P3] 重复 `data-slot="barcode-scanner-status"`（:238 与 :278）破坏选择器/测试锚点。

### 4.2 可操作性（B-OP）

#### B-OP-01 = B-DISP-02（P0，见上）

#### B-OP-02 [P1] WASM promise 缓存被 abort 毒化；重开失败（再确认审计 06-002，仍存在）

- 证据：`utils/prepare-wasm.ts:7-36` `fetchWithRetry` 对**所有**抛错（含 AbortError）重试（:14-19），延时为不可中止 setTimeout；缓存按 URL 单键（:27），signal 属首次打开。关闭覆盖层（overlay.tsx:109-112 `controller.abort()`）→ fetch 抛 → fetchWithRetry 烧 ~3s 重试 → 期间 `prepareWasm(url, signal2)` 返回 `wasmPromises.get(url)!`（:36，即已 doomed 的 promise）→ 重开进 catch → `setPhase('error')`。
- 参考：react-zxing `prepareWasm.ts` **不接 AbortSignal**，且 `promise.catch(()=>{ wasmReady=undefined })` 自愈（:45-47），从不重试。
- 影响：首次开→关后重开显示"摄像头错误"长达 ~3s（缓存在 fetchWithRetry 重试耗尽后由 `.catch` 自愈删除，故 ~3s 后重开即可恢复；并非永久毒化）。"操作不了"主因之一。
- 修复：WASM 是全局单例，不应注入覆盖层 AbortSignal；遇 AbortError 立即中断重试；仿 react-zxing 无 signal 单例。

#### B-OP-03 [P2] `checkCameraAvailability` 每次探测都真调 `getUserMedia`（首次扫描多一次相机抢占）

- 证据：`utils/camera-utils.ts:27-31` 实际 `getUserMedia({video:true})` 取流后立即 stop；`cameraAvailable` 初值 null（barcode-input.tsx:27）→ 首次扫码点击先探测（getUserMedia #1，LED 亮→释放）→ `setCameraAvailable(true)`（**之后缓存**）→ `setOverlayOpen(true)` → overlay `start()` 又 `getUserMedia`（#2）。后续扫码因已缓存跳过探测。
- 参考：design §7 "挂载时探测一次（navigator.mediaDevices + HTTPS/localhost 检查），结果缓存"——是能力/安全上下文检查，非取流。
- 注：严重度经共识裁决由 P1 下调为 P2——浏览器按 origin 授权不会二次弹窗，影响仅限首次扫描多一次 LED 闪+轻微延迟，之后缓存；无功能损坏。
- 修复：改为轻量能力检查（`mediaDevices?.getUserMedia`+`isSecureContext`+可选 `enumerateDevices`），挂载 effect 探测一次并缓存。

#### B-OP-04 [P1] Torch 关闭无效（闪光灯关不掉）

- 证据：`use-barcode-torch.ts:41-57` `toggle` 对开/关都 `applyConstraints({advanced:[{torch:newState}]})`。
- 参考：react-zxing `useTorch.ts:40-49` 明确说明 `applyConstraints({torch:false})` 不能关灯，需 stop+restart 流；Flux 完全未实现。
- 影响：支持的移动设备上开灯后"关"不掉，`isOn` 状态撒谎。
- 修复：实现 react-zxing 的重启流模式。

#### B-OP-05 [P2] 倾斜重试每帧跑全部 8 角度（CPU）且裁切旋转帧

- 证据：`barcode-detector-utils.ts:44-77` 每失败帧 `detect` 一次再循环全部 `SKEW_ANGLES`（最多 9 次/300ms）；旋转用原尺寸 canvas `drawImage(video,-w/2,-h/2)` 裁切四角。
- 参考：react-zxing 每帧**单角**轮询（`skewIndexRef++ % len`，useZxing.ts:139），并按旋转后宽高适配 canvas。
- 修复：单角轮询 + 适配旋转 canvas。

#### B-OP-06 [P2] `onMount`/`onUnmount` 随 render 重复触发

- 证据：`barcode-input.tsx:29-34` effect deps `[events]`，events 身份跨渲染变化即重跑 cleanup+setup。
- 修复：deps `[]` + events 经 ref 读取。

#### B-OP-07 [P3] 单次模式扫码结果跨会话不清；continuous 模式同码持续触发 onScan（重复写表单）。

#### B-OP-08 [P1]（共识新增）`start()` 吞掉相机错误 → 错误 UI 永不显示、`onScanError` 永不触发

- 证据：`use-barcode-camera.ts:87-96` `start()` catch 块捕获 getUserMedia 错误、设 `state.error`，但**不 re-throw**，函数正常 resolve。`barcode-scanner-overlay.tsx:88-104` init effect `await start()`（:95）后**无条件** `setPhase('scanning')`（:97）；catch 块（:98-104，设 `phase='error'` 并调 `onScanError`）**对相机错误不可达**。`camera.error` 无任何组件读取。
- 影响：权限拒绝/无摄像头（条码扫描器最常见的真实场景）时，扫码器显示**永久黑屏 `<video>` 无错误提示**，`onScanError`（消费方用于遥测/降级）被静默绕过。与 B-DISP-02 独立——即使修了流挂接，相机失败仍黑屏无反馈。
- 修复：`start()` catch 内 re-throw，或 overlay 用 effect 读 `camera.error` 转 `phase='error'` 并调 `onScanError`。

#### B-OP-09 [P1]（共识新增）`handleChange` 用 minLength/pattern 在 setValue 前拦截 → 设了校验就无法逐字键入

- 证据：`barcode-input.tsx:89-105` `handleChange` 在 `form.setValue`（:103）**之前**做 `if (minLength != null && val.length < minLength) return;`（:95）与 `if (!regex.test(val)) return;`（:100）。输入是受控的（`value={inputValue}` 取自 form state，:179），setValue 被跳过时 React 把 DOM 值回退 → **每个低于 minLength 的按键被吞**。对比 base `input-text`（input.tsx:286-296,380）用原生 HTML 属性 + 无条件 `handlers.onChange`，**无此问题——是 barcode 特有**。
- 影响：手动录入是扫码失败时（相机不可用/条码损坏）的首要降级路径。设了 minLength（条码的自然校验）后用户**根本无法逐字输入**，只能粘贴/扫描完整合法值。字段看似冻结。
- 修复：始终调 `form.setValue`，minLength/pattern 走表单校验层（form validation 已支持）；或像 input-text 那样用原生 HTML 属性。

### 4.3 契约漂移（B-CD）

- **B-CD-01 [P3]** `sourcePackage` 实现为 `scheduling`，design §3 写 `form-advanced`。
- **B-CD-02 [P2]** `events.onScan/onScanError`：design/example 为嵌套（§4、example.json:26-60），实现为顶层扁平 event 字段；按 design/example 写 `events.onScan` 可能不解析 → demo 的 onScan 可能从不触发（需运行时复核）。
- **B-CD-03 [P3]** `BarcodeFormat` 仅 W3C 名；无 zxing 名映射（因无 ponyfill）。
- **B-CD-04 [P3]** `scanNow/stopScan` 恒返 `{ok:true}`，design §8 要求失败码（`not-available` 等）。
- **B-CD-05 [P3]** `batchMode`/`torchButton`/`onBatchScan` 实现有、design §4/§8 无（design §12.1 自注"应补充"未执行）。

---

## 5. 单元测试有效性评估

### 5.1 系统性问题：集成层被全面绕过 + 缺陷值被固化成"正确预期"

测试**数量**可观（scheduling 包 600+ 用例全绿），但有效性在"显示/可操作"维度**系统性不足**，表现为三类模式：

1. **集成层全 mock**：顶层组件测试 mock 掉所有子组件与 hook，仅断言"壳渲染"。例：`gantt.test.tsx:42-77` mock 全部子组件与 4 个 hook；`calendar.test.tsx:15-92` mock `useCalendarState` 恒返 `activeView:'month'`（**使 C-OPS-01 P0 不可能被发现**）；`barcode-scanner-overlay.test.tsx:11-31` 全 mock 两个核心 hook（**使 B-DISP-02 P0 不可测**）。
2. **绕过接线边界**：store/纯函数测试用 `new GanttStore({zoomLevels})` 直接构造，**从不渲染真实 `<Gantt schema>`** → G-DISP-01（zoomLevels 未透传）完全不可见；kanban DnD 测试 mock `@atlaskit/pragmatic-dnd` 仅验回调被调，**从不验卡片落位** → K-OP-01/02 不可见。
3. **把缺陷断言为正确**（最危险）：
   - `utils/layout.test.ts:55-64` 断言同日任务 `$w===4`（**固化 G-DISP-03**）。
   - `calendar-layout-utils.test.ts:74-107` 标题写"full width"却 `expect(width).toBe(25)`（**固化 C-DISP-01**）。
   - `use-calendar-drag-create.test.ts:87-93` 断言 `start===end`（**固化 C-OPS-02**）。
   - `barcode-input.test.tsx:142,154,209,216` 同义反复 `expect(true).toBe(true)`（仅验"不崩"）；另 :281 为 `expect(() => ...resetWasmPromise()).not.toThrow()`（仅验不抛，非字面 tautology，但同样不验行为）。

### 5.2 覆盖率矩阵（按功能点 × 是否有效覆盖）

图例：Y=有效；Partial=有测试但断言弱/路径不全；N=无测试或测了死代码。

#### Gantt

| 功能                                      | 有效?   | 说明                                    |
| ----------------------------------------- | ------- | --------------------------------------- |
| store CRUD/树扁平/展开可见                | Y       | gantt-store.test/proof 断言确切 id 列表 |
| `$x/$y/$w/$h` 值                          | Partial | 同日宽 bug 被固化（G-TEST-01）          |
| 依赖线 4 类型路由                         | N       | 仅 FS 硬编码点                          |
| 格式 token `%V/%W/%q`                     | N       | 未实现未测                              |
| 缩放（store 级）                          | Y       | 但绕过 gantt.tsx → 掩盖 G-DISP-01       |
| 缩放（schema 集成）                       | N       | 无 `<Gantt zoomLevels>` 渲染测试        |
| `_dirty` 编辑后 parse                     | N       | 零测试（G-OPS-02）                      |
| 拖拽 commit + 日期往返 + onTaskDragEnd    | Partial | 仅监听清理；commit/事件未测             |
| 连线绘制（指针）                          | Partial | 仅清理；类型/柄侧/onLinkDragEnd 未测    |
| 键盘（Left/Right 语义、焦点移动）         | Partial | Left==Right bug 与 focus 未测           |
| 滚动同步/头 sticky                        | Partial | 仅 scrollTop                            |
| scrollToToday/scrollToTask 目标元素       | N       | G-OPS-01                                |
| 网格行↔条纵向对齐                         | N       | G-DISP-02                               |
| 里程碑定位/可交互                         | N       | 仅计数                                  |
| 自定义列/cell region                      | N       | G-DISP-08                               |
| taskBar/empty/loading region              | N       | gantt.test mock 全子组件                |
| 事件派发（onTaskClick/onTaskDragEnd/...） | N       |                                         |
| 周末/今日 marker                          | Partial | 仅存在性；时区未测                      |
| 关键路径                                  | Y       | critical-path.test                      |
| 资源负载 view/grid/timeline               | N       | 运行覆盖率 0%                           |

#### Kanban

| 功能                                      | 有效?   | 说明                                              |
| ----------------------------------------- | ------- | ------------------------------------------------- |
| moveCard/moveColumn/addCard/remove 纯函数 | Y       | kanban-helpers.test 强                            |
| board 渲染列/空/加载/折叠/卡片点击        | Y       | kanban-renderer.test                              |
| **DnD 后卡片实际落位**                    | N       | 仅验 onBoardChange 被调，不验重渲染（K-TEST-01）  |
| **controlled 模式可变性**                 | N       | 所有测试传 `data:` 却不验变更（K-TEST-02）        |
| attachClosestEdge/before-after            | N       |                                                   |
| 列拖拽重排（鼠标）                        | N       | registerBoardDropZone 从不调用未测                |
| 列键盘重排/卡片键盘 DnD                   | N       |                                                   |
| 文本过滤                                  | Partial | hook 隔离测且字段路径错；无端到端                 |
| 标签过滤                                  | N       | 从不用于过滤                                      |
| filterCard 表达式                         | N       | 从不求值                                          |
| 增卡（按钮点击）                          | N       | 仅验按钮渲染不点击                                |
| 增列                                      | N       | 按钮非功能                                        |
| WIP 限制执行                              | N       | KanbanWipBadge 测了但生产不用                     |
| 列宽 resize                               | Partial | getWidth 测；handleResizeStart **零断言**         |
| undo/redo 纯函数                          | Y       | 但无 DnD 后视觉回退集成测                         |
| 导出 JSON/PNG                             | Y       |                                                   |
| collab hook                               | Partial | 测了但生产不用（死代码假覆盖）                    |
| 标签筛选 UI/活动日志                      | Y       | 渲染/回调；但筛选 UI 不真正过滤                   |
| 虚拟器                                    | Partial | 仅 totalSize；无真实滚动/动态高 → 重叠 bug 不可见 |
| configMap 卡片渲染                        | N       | K-DISP-02                                         |
| region 渲染（columnHeader/cardTemplate）  | N       | K-DISP-05                                         |

#### Calendar

| 功能                        | 有效?       | 说明                                       |
| --------------------------- | ----------- | ------------------------------------------ |
| 矩阵布局（行=资源/列=日期） | N           | view 测 mock EventBlock；无列/行计数断言   |
| 事件宽分配（月）            | N(固化 bug) | 断言单事件 width=25                        |
| 事件宽分配（周/日）         | Y           | time-utils.test 正确（100/实际）           |
| 日期范围运算                | Partial     | 仅 UTC；漏时区 bug                         |
| 多日拆分                    | Y           | layout-utils.test 充分                     |
| 多日溢出天事件              | N           | C-DISP-04                                  |
| 跨日 SVG                    | Partial     | 纯函数测，未测渲染单位                     |
| 导航 goNext/Prev/Today      | Y           | navigation.test                            |
| 视图切换                    | N           | calendar.test mock state → C-OPS-01 不可见 |
| 拖拽创建                    | Partial     | 测生命周期但断言单日 end（固化 C-OPS-02）  |
| 拖拽移动                    | Partial     | 验 onEventChange 触发；无 DOM drop 反馈    |
| 键盘格导航                  | N           |                                            |
| 资源分组展开/折叠           | N           | 组件是死的（C-DRIFT-04），测了死组件       |
| 虚拟化布局正确性            | N           | 仅 hook 管道；无行 Y 断言（C-DISP-03）     |
| 导出 PNG                    | N           | 仅验 null-ref 早退；无取消/卸载            |
| iCal 导入/导出              | Partial     | hook 测了但未接入 Calendar                 |
| 冲突检测                    | Y           | layout-utils.test；但 view 用错朴素检查    |
| ownership/scope state       | N           | 字段声明但 calendar.tsx 不消费             |

#### Barcode

| 功能                                            | 有效?   | 说明                                     |
| ----------------------------------------------- | ------- | ---------------------------------------- |
| 字段 chrome（label/input/clearable/扫码钮显隐） | Y       | barcode-input.test                       |
| 覆盖层开关/加载态                               | Y       | overlay.test                             |
| **video 流挂接**                                | N       | 全 mock → P0 不可测（B-TG-01）           |
| **解码循环检测+写值**                           | N       | detect hook 全 mock；无 result→form 测试 |
| 倾斜重试返回码                                  | N       | 仅测 abort 短路                          |
| **开→关→重开（WASM 毒化）**                     | N       | 仅测自愈后（B-TG-02）                    |
| Torch 开/关                                     | N       | toggle 从不调用                          |
| autoSubmit（非批量）                            | Y       |                                          |
| autoSubmit（批量）                              | Partial | 验 onScan 调用，不验逐项语义             |
| continuousScan                                  | N       |                                          |
| scanOnFocus                                     | Partial | focus 开覆盖层测了                       |
| 句柄注册（scanNow/stopScan/resetWasmPromise）   | Y       | 但多为幂等/同义反复                      |
| 句柄返回正确失败码                              | N       | 恒 ok:true                               |
| 优雅降级（无相机/非安全上下文）                 | N       | 环境未 mock                              |
| 队列入队/去重/flush/clear                       | Y       | barcode-queue.test                       |
| prepareWasm 缓存/按 URL                         | Y       |                                          |
| BarcodeDetector 格式映射                        | N       | 无 ponyfill 可映射                       |

### 5.3 测试改进原则

1. **每个 P0/P1 修复伴随一个集成测试**：渲染真实组件（非 mock 子组件/hook），用 sample 数据，断言**具体 DOM 输出**（事件 `style.width`、列计数、视图切换后子组件出现、卡片落位、`video.srcObject` 被设）。
2. **删除/改写"固化缺陷"的断言**（layout.test 同日宽、layout-utils.test 月宽、drag-create.test 单日 end、barcode tautology）。
3. **时区敏感的日期测试强制非 UTC 时区**（`vi.stubEnv('TZ',...)`）。
4. **死代码（useKanbanAdder/useKanbanCollab/KanbanWipBadge/CalendarResourceGroup/CalendarResourceHeader/GanttCompact/ResourceLoadView/ResourceLoadGrid/ResourceLoadTimeline）要么接线要么删除**，避免"测了死代码"的假覆盖。注：`ResourceLoadView` 被 `resource-load.test.ts` 覆盖（纯函数 computeResourceLoads 等有效测），但 view/grid/timeline 组件无任何生产导入——同 kanban hooks 一样是"死代码带测试的假覆盖"。

---

## 6. 跨组件共性模式

1. **集成接线边界（gantt.tsx / kanban-board.tsx / calendar.tsx / barcode-overlay）是缺陷集中地**：store/纯函数质量尚可且单测充分，但顶层组件"漏接电线"（zoomLevels 不透传、regions 不下传、events 不派发、controlled 误判、activeView 读错源、video 挂载时序）。几乎所有 P0 都在此边界，而测试恰好全面 mock 绕过它。
2. **"提供数据即受控"的 ownership 误用**（kanban controlled no-op）与"内部 state 不驱动渲染"（calendar activeView）——都是 state ownership 模型未按 design §7 落地。
3. **响应式订阅模型失效**（gantt 展开/收起 G-OPS-11）：store 分了 5 套 revision，但生产组件只订阅其中 3 套，另 2 套（含树展开）零订阅 → 状态变更不触发重渲染。这是与"接线边界"并列的整类根因。
4. **DnD 集中 querySelectorAll + useEffect 注册**（kanban）偏离 RKK per-component ref 模式，导致适配器生命周期不稳定 + 每次 render 全量销毁重建。
5. **时区/日期边界**（calendar toISODateString、gantt 周末 getDay）local/UTC getter 混用，CI(UTC) 掩盖。
6. **契约漂移系统性**：design.md 与实现/definitions/example 多处不一致（calendar `data` vs `events`、kanban `title/content` vs `data`、gantt `category`、barcode `sourcePackage`、事件嵌套 vs 扁平、`body` region 凭空出现）。design 各 §12 末"应补充到 §X"的 TODO 大量未执行。
7. **"假绿"测试**：把缺陷值断言为正确，是比"没测试"更危险的模式——它主动阻碍修复。

---

## 7. 修复优先级（跨组件 Top 18，含共识新增）

| #   | ID          | 组件     | 严重度 | 一句话                                                                                 |
| --- | ----------- | -------- | ------ | -------------------------------------------------------------------------------------- |
| 1   | B-DISP-02   | Barcode  | P0     | 修复 video 流挂接（始终渲染 video 或响应式 srcObject effect）——否则扫码器完全不可用    |
| 2   | G-DISP-01   | Gantt    | P0     | 透传 zoomLevels 给 store——否则时间线/网格/缩放全空                                     |
| 3   | K-OP-01     | Kanban   | P0     | 默认非受控——否则传 data 的看板所有操作失效                                             |
| 4   | C-OPS-01    | Calendar | P0     | 视图用内部 activeView 驱动渲染——否则切换无效                                           |
| 5   | C-DISP-01   | Calendar | P0     | 月视图事件按实际并发算宽——否则单事件只占 25%                                           |
| 6   | C-DISP-03   | Calendar | P0     | 虚拟器行 position:absolute——否则行距翻倍                                               |
| 7   | C-DISP-02   | Calendar | P0     | 月视图改为资源×当月天数矩阵——否则 42 列每格 ~28px 不可读                               |
| 8   | G-OPS-02    | Gantt    | P0     | 移除 `_dirty` parse 守卫——否则编辑后数据重载丢失                                       |
| 9   | G-OPS-01    | Gantt    | P0     | scrollTo\* 滚时间线而非网格                                                            |
| 10  | G-DISP-02   | Gantt    | P0     | 网格行高固定 40px 对齐时间线                                                           |
| 11  | G-OPS-11+12 | Gantt    | P0     | 展开/收起接线订阅 + toggleOpen 重算坐标——否则树展开全死（共识新增，两 P0 须同修）      |
| 12  | B-DISP-06   | Barcode  | P1     | 实现真实 zxing ponyfill——否则 FF/Safari 永不解码                                       |
| 13  | B-OP-08     | Barcode  | P1     | start() 不再吞相机错误——否则权限拒绝黑屏无反馈（共识新增）                             |
| 14  | B-OP-02     | Barcode  | P1     | WASM 缓存不注入覆盖层 AbortSignal——否则重开失败（~3s 自愈窗口）                        |
| 15  | B-OP-09     | Barcode  | P1     | handleChange 不在 setValue 前拦截——否则设 minLength/pattern 后无法逐字输入（共识新增） |
| 16  | C-OPS-07    | Calendar | P1     | 无 resources 时事件归一化到默认资源——否则最简配置全空（共识新增）                      |
| 17  | G-OPS-04    | Gantt    | P1     | 派发 onTaskDragEnd/onLinkDragEnd——否则拖拽无法持久化                                   |
| 18  | G-OPS-13    | Gantt    | P1     | updateTask bump layoutRevision——否则编辑后背景/刻度/依赖线变陈旧（共识新增）           |

> 原列 K-OP-02 与 K-DISP-01 经共识裁决由 P0 下调为 P1（见 §9）：K-OP-02 结构缺陷确认但 monitor 存活、硬断裂需运行时确认；K-DISP-01 默认配置可渲染、属契约漂移。B-OP-03 由 P1 下调为 P2（首次扫描多一次相机抢占、之后缓存）。
> 其余 P1/P2/P3 见各组件章节。建议按"先修集成接线边界与订阅模型（使组件可见可操作）→ 再修定位算法 → 再补集成测试"的顺序推进，且**修复与改写"固化缺陷"的测试必须同 PR**，否则回归不可见。

## 8. 验证基线

- 本次为纯分析，未改代码。
- 所有 P0 结论均经直接读源码二次确认（file:line 见各条），并经多轮独立 agent 复核（见 §9）。
- 开源对照源码位于 `~/sources/complex-controls/`（SVAR/DHTMLX Gantt、react-kanban-kit、react-kanban-simple、planka、schedule-x-calendar、react-big-calendar、react-zxing-barcode）。

---

## 9. 共识审查记录（多轮独立 agent 复核）

本报告经 3 轮、共 8 个独立子 agent（全新上下文，仅输入"报告 + 源码"，不输入编写者推理）反复审查补充，达成共识。过程遵循"Fresh Context"原则：审查 agent 独立读源码核实每条论断，不信任报告引用。

### Round 1 — 5 个独立验证 agent（按组件 + 跨组件）

- **Gantt**：27/28 论断 CONFIRMED；发现关键漏报 G-MISS-01/02（展开/收起完全失效）；G-DRIFT-04 措辞部分失准。
- **Kanban**：16/21 完全 CONFIRMED；提出 K-DISP-01（P0→P1）、K-OP-02（P0→P1+needs-runtime）、K-DRIFT-05 子论断 refuted（data-card-index 实为数据 index，真缺陷是键盘移动硬编 toIndex:0）。
- **Calendar**：20/21 CONFIRMED；指出 C-DISP-03 的"gantt-bars 即正确"对比是杜撰（gantt 不用 tanstack virtual）；C-DISP-02 建议 P1；发现 C-MISSED-01（无 resources 丢事件）、C-MISSED-02（ownership 不消费）。
- **Barcode**：17/18 CONFIRMED，0 refuted；B-OP-03 建议 P2；B-OP-02"永久"措辞不准（~3s 自愈）；发现 B-MISSED-01（start 吞相机错误）、B-MISSED-02（minLength 阻断输入）。
- **跨组件**：~17/20；确认全部 4 处"固化缺陷"测试（verbatim）、全部 mock 绕过集成、全部 7 条契约漂移；发现 §7 漏列 K-DISP-01（内部不一致）、ResourceLoadView 死代码未列入清理。

### Round 2 — 裁决 + 漏报独立复核（2 个 agent）

**严重度裁决（独立裁决 agent，逐条读源码后终裁）：**
| 分歧 | 终裁 | 置信 | 依据要点 |
| --- | --- | --- | --- |
| K-DISP-01 P0/P1 | **P1** | 高 | demo 用 `data` 可渲染；属"契约漂移破坏 design-followers"，非"默认配置不可用" |
| K-OP-02 P0/P1 | **P1** | 中 | 每次 render 销毁+重建全部适配器确认；但 monitor(`[]`deps)+源数据 drag-start 捕获存活，"硬断裂"需运行时确认，保守 P1 |
| C-DISP-02 P0/P1 | **P0** | 高 | 42 列 × 10 资源 ≈ 28px/格标签截断为空；design §12 明确禁止周分段；"标准日历42格"类比不成立（标准=7列） |
| B-OP-03 P1/P2 | **P2** | 高 | 仅首次扫描多一次 getUserMedia（LED 闪），之后缓存；浏览器按 origin 授权不二次弹窗 |

**漏报独立复核（全新 agent，5 条全部 CONFIRMED 于声称严重度）：**

- SCHED-NEW-1 [P0]：绘制完整订阅表，确认 7 个生产组件无一订阅 `treeRevision`/`revision` → 展开收起全死。
- SCHED-NEW-2 [P0]：`toggleOpen` 不调任何坐标重算（对比 updateTask 调 computeComputedPropertiesInternal）。
- SCHED-NEW-3 [P1]：start() catch 不 re-throw，overlay `setPhase('scanning')` 无条件执行，`onScanError` 对相机错误不可达。
- SCHED-NEW-4 [P1]：handleChange 在 setValue 前拦截；对比 input-text 用原生属性无条件 onChange → barcode 特有。
- SCHED-NEW-5 [P1]：无 resources 时月/日视图全丢事件、周视图只显示无 resourceId 的事件，逐 view 验证。

### Round 3 — 共识并入（本次更新）

将 Round 1/2 共识结论并入报告：严重度调整（K-DISP-01→P1、K-OP-02→P1、B-OP-03→P2）、新增 11 条发现（G-OPS-11/12/13/14、K-OP-09/10/11/12、C-OPS-07/08、B-OP-08/09）、引用修正（barcode test:281、C-DISP-03 gantt 对比、G-DRIFT-04 措辞、B-OP-02"永久"、K-DISP-01 行号）、§7 优先表重建（Top 18）、死代码清单补 ResourceLoadView、§6 新增"订阅模型失效"共性模式。

### 共识结论

- **全员一致**：四个组件在 playground 基本不可用、测试"假绿"、契约漂移系统性——核心结论成立。
- **全部 P0 经独立复核确认**：B-DISP-02、G-DISP-01、G-OPS-01/02、G-OPS-11+12（新）、K-OP-01、C-OPS-01、C-DISP-01/02/03。
- **分歧已全部裁决**，无遗留对立。
- **准确率**：Round 1 各组件 80-96% 论断完全确认，其余为引用微偏/严重度判断差异，无核心论断被推翻。两处不实对比已修正（C-DISP-03 gantt 杜撰、barcode test:281 误引）。

### 已识别的运行时未决项（needs-runtime，修复时优先验证）

1. K-OP-02：pragmatic-dnd 在 mid-drag 销毁源/目标适配器时是否硬断裂（monitor 存活已确认）。
2. G-OPS-11/12 修复后：toggleOpen 改 bump layoutRevision + 重算坐标，是否引入与 updateTask 的 revision 竞态。
3. B-CD-02：schema 编译器是否自动把嵌套 `events.onScan` 展平为顶层 event 字段（决定 example.json 的 onScan 是否触发）。
4. C-DISP-07：跨日 SVG 百分比/像素混用的实际渲染位置。
