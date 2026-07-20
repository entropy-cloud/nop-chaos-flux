# Gantt 组件设计

## 1. 组件定位

- `gantt` 是交互式排程/时间线展示 renderer，用于 APS 排产、项目管理、工单排期等场景。
- 它不是表单字段（不是 `input-gantt`），不承担值绑定 + 校验语义。
- 它是数据展示 + 拖拽交互 renderer，属于 `@nop-chaos/flux-renderers-scheduling` 包。
- 首次实现以**展示 + 时间线浏览 + 基本拖拽编辑**为范围，高级排程算法（自动排产、资源负载计算）归后续阶段。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无原生 Gantt 组件。
- DHTMLX Gantt CE 是社区最完整开源参考（~50000 行，框架无关）。
- SVAR React Gantt 是 MIT React 参考（~6047 行，组件生态型架构）。

### Flux 决策表

| 能力                                     | 采纳         | 不采纳     | 理由                                                                            |
| ---------------------------------------- | ------------ | ---------- | ------------------------------------------------------------------------------- |
| 任务条展示（bar chart 时间线）           | **实现**     | —          | 首版基线                                                                        |
| 左侧网格（grid，文本列+树层级）          | **实现**     | —          | 首版基线                                                                        |
| 时间刻度头部（多行：日/周/月）           | **实现**     | —          | 首版基线；`scales[]` 声明式配置                                                 |
| 依赖线（SVG 箭头连线，4 类型）           | **实现**     | —          | 首版基线；finish_to_start / start_to_start / finish_to_finish / start_to_finish |
| 任务条拖拽移动/调起止/调进度             | **实现**     | —          | 拖拽 P0；命令式 pointer 事件封装为 `useGanttDrag`                               |
| 依赖线拖拽创建                           | **实现**     | —          | 从任务条 link handle 拖到另一任务                                               |
| 缩放切换（日/周/月视图）                 | **实现**     | —          | 预定义缩放级别 + zoom controls                                                  |
| WBS 树形层级（可折叠 parent）            | **实现**     | —          | 复用 `parent` / `open` 树模型，grid 中缩进+chevron                              |
| 左侧网格自定义列                         | **实现**     | —          | `columns[]` 声明，支持 text/checkbox/date 等                                    |
| 工作日历（工时/非工作日）                | **计划实现** | —          | DHTMLX WorkTime 引擎为参考，首版不做、以 ISO 日历为回退                         |
| 任务编辑器（双击任务弹出编辑表单）       | **计划实现** | —          | `editor` region 入口，首版可用 dialog 组合层替代                                |
| 资源分配（resource/assignment 视图）     | **计划实现** | —          | 独立 successor                                                                  |
| 基线对照（actual vs planned bar）        | **计划实现** | —          | 后续 SSR/对比视图                                                               |
| 自动排产引擎                             | —            | **不采纳** | Nop 平台后端职责；Flux 只做可视化+拖拽提交                                      |
| 导出 PDF/PNG/Excel                       | —            | **不采纳** | 后台职责，前端不做（同 table 裁定）                                             |
| amis 组件级 `api`/`initFetch`/`interval` | —            | **不采纳** | 请求下沉 data-source + action（X3 §3）                                          |
| amis `mobileUI` 双实现                   | —            | **不采纳** | 响应式归 `mobile-roadmap.md`                                                    |

## 3. Flux 中的 renderer/type 定义

- `type: 'gantt'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-scheduling'`
- 主要 regions: `taskBar`, `toolbar`, `editor`
- 可选 regions: `empty`, `loading`

> 待实现后注册到 `docs/components/examples.manifest.json` 的 `targetContract` 类别。

## 4. schema 设计

```ts
interface GanttSchema extends BaseSchema {
  type: 'gantt';

  // === 数据 ===
  tasks: SchemaValue; // GanttTask[] 数据源
  links?: SchemaValue; // GanttLink[] 数据源
  resources?: SchemaValue; // GanttResource[]（首版可选）
  assignments?: SchemaValue; // GanttAssignment[]（首版可选）

  // === 网格列 ===
  columns?: GanttColumn[];

  // === 时间刻度 ===
  scales?: GanttScale[];
  zoomLevels?: GanttZoomLevel[]; // 预定义缩放级别
  defaultZoom?: string; // 默认缩放级别 key
  cellWidth?: number; // 最小单元格像素宽度（按 unit 自动推算）
  startDate?: string; // 时间线起始 ISO 日期（缺省从任务推算）
  endDate?: string; // 时间线结束 ISO 日期（缺省从任务推算）

  // === 树层级 ===
  childrenField?: string; // 子节点字段名，默认 'children'
  initiallyExpanded?: boolean; // 默认展开所有层级

  // === 拖拽 ===
  draggable?: boolean; // 任务条拖拽总开关，默认 true
  editable?: boolean; // 任务条可编辑（调起止/进度），默认 true
  linkable?: boolean; // 可创建依赖线，默认 true

  // === 任务条 ===
  taskBarHeight?: number; // 任务条高度 px，默认 28
  progressBarHeight?: number; // 进度条高度 px，默认 4

  // === 工作日历（首版占位，后续实现） ===
  calendar?: string; // 全局工作日历 ID

  // === 样式 ===
  showWeekends?: boolean; // 高亮周末列，默认 true
  showToday?: boolean; // 标记今日竖线，默认 true

  // === 事件 ===
  onTaskClick?: ActionSchema;
  onTaskDoubleClick?: ActionSchema;
  onTaskDragEnd?: ActionSchema;
  onLinkClick?: ActionSchema;
  onLinkDragEnd?: ActionSchema;
  onEmptyCellClick?: ActionSchema; // 点击时间线空白区域
  onZoomChange?: ActionSchema;
  onScroll?: ActionSchema;

  // === 动作 ===
  zoomIn?: ActionSchema;
  zoomOut?: ActionSchema;
  scrollToToday?: ActionSchema;
  scrollToTask?: ActionSchema; // args: { taskId }

  // === 交互坐标 ownership（未来扩展） ===
  ganttOwnership?: 'local' | 'controlled' | 'scope';
  ganttStatePath?: string; // scope path 状态持久化地址
  statusPath?: string; // scope path 交互状态持久化（未来扩展）

  // === regions ===
  taskBar?: RegionSchema; // taskBar region（自定义条内容）
  toolbar?: RegionSchema; // toolbar region（自定义工具栏）
  editor?: RegionSchema; // editor region（任务编辑浮层）
  toolbarClassName?: string;
  taskBarClassName?: string;
  editorClassName?: string;
  emptyClassName?: string;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  empty?: RegionSchema; // 空态
  loading?: RegionSchema; // 加载态
}

// === 子类型 ===

interface GanttColumn {
  name: string;
  label: string;
  width?: number; // 像素，默认 100
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sortable?: boolean;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  cell?: RegionSchema; // 自定义单元格 region（per-row scope）
}

interface GanttScale {
  unit: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  step?: number; // 默认 1
  format?: string; // strftime 格式，如 '%Y/%m/%d'
}

interface GanttZoomLevel {
  key: string; // 缩放级别 ID
  label: string; // 显示标签
  minCellWidth?: number; // 最小像素宽度
  maxCellWidth?: number; // 最大像素宽度
  scales: GanttScale[]; // 多行刻度配置
}

// === 数据契约（运行时由 GanttStore 消费）===

interface GanttTask {
  id: string | number;
  text: string;
  type?: 'task' | 'project' | 'milestone';
  start: string; // ISO date
  end: string;
  duration?: number; // 工时（工作日历可算）
  progress?: number; // 0–100
  parent?: string | number | null;
  open?: boolean;
  children?: GanttTask[];
  calendar?: string; // 工作日历 ID（后续实现）
  segments?: GanttSegment[];
  // 计算属性（运行时由 store 填充）
  $x: number;
  $y: number;
  $w: number;
  $h: number;
  $level: number;
  $source: Array<string | number>;
  $target: Array<string | number>;
}

interface GanttLink {
  id: string | number;
  source: string | number;
  target: string | number;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag?: number; // 延迟天数
  // 计算属性（运行时由 store 填充）
  $p: string; // SVG polyline points
}

interface GanttSegment {
  start: string;
  end: string;
  progress?: number;
}

interface GanttResource {
  id: string | number;
  text: string;
}

interface GanttAssignment {
  id: string | number;
  taskId: string | number;
  resourceId: string | number;
  units?: number; // 占用百分比
}
```

### 推荐默认值

- `childrenField: 'children'`
- `defaultZoom: 'week'`
- `columns: [{ name: 'text', label: '任务名称', width: 200 }]`
- `scales: [{ unit: 'day', step: 1, format: '%d' }, { unit: 'month', format: '%Y/%m' }]`（默认双行）
- `draggable: true`
- `editable: true`
- `taskBarHeight: 28`

## 5. 字段分类

- `tasks`, `links`, `resources`, `assignments`: `props (source-enabled)`
- `columns`, `scales`, `zoomLevels`, `defaultZoom`, `childrenField`, `initiallyExpanded`, `cellWidth`, `startDate`, `endDate`, `taskBarHeight`, `progressBarHeight`, `showWeekends`, `showToday`, `draggable`, `editable`, `linkable`, `calendar`: `props`
- `ganttOwnership`, `ganttStatePath`, `statusPath`: `props`（交互坐标 ownership 路径）
- `taskBar`, `toolbar`, `editor`: `region`
- `empty`, `loading`: `value-or-region`
- 列级 `cell`: `region`（per-row scope，params `['record', 'index']`）
- `toolbarClassName`, `taskBarClassName`, `editorClassName`, `emptyClassName`: `props`（per-slot 额外 CSS class）
- `onMount`, `onUnmount`: `meta`（继承 BaseSchema 生命周期动作）
- `id`, `className`, `disabled`, `visible`, `hidden`: `meta`（继承 BaseSchema 元数据通道）
- `onTaskClick`, `onTaskDoubleClick`, `onTaskDragEnd`, `onLinkClick`, `onLinkDragEnd`, `onEmptyCellClick`, `onZoomChange`, `onScroll`: `event`（ActionSchema 事件入口）
- `zoomIn`, `zoomOut`, `scrollToToday`, `scrollToTask`: `action`

## 6. regions 与 slot 约定

| region    | 必需 | 绑定参数                     | 说明                                                                                                          |
| --------- | ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `taskBar` | 可选 | `{ task, index }`            | 自定义任务条内容。缺省渲染 `task.text` + 进度条。声明时替代缺省条内容，但进度条和拖拽 handle 仍由组件内部渲染 |
| `toolbar` | 可选 | `{ api }`                    | 顶部工具栏。缺省渲染内置缩放+滚动按钮。声明后完全取代内置工具栏                                               |
| `editor`  | 可选 | `{ task, onSave, onCancel }` | 任务编辑浮层入口。缺省无内置编辑；声明后通过双击/按钮打开任务编辑 UI                                          |
| `empty`   | 可选 | —                            | `tasks` 为空或无匹配时的提示内容                                                                              |
| `loading` | 可选 | —                            | 数据加载中的占位内容                                                                                          |

缺省 loading 渲染为 grid + timeline 分割骨架：左侧 3 行 × 200px 灰色脉冲条，右侧时间线区域灰底斑马线。

> 关于 region slot 元数据声明规范（命名、参数类型、ownership 字段），参见 `docs/architecture/field-metadata-slot-modeling.md`。

## 7. 运行期状态归属

Gantt 是 interaction owner，其状态分三层：

| 状态                                  | 归属                   | 说明                                                                                  |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| 展开/收起（`expandedTaskIdSet`）      | `local`                | 树表行展开态。`initiallyExpanded` 仅在首挂载生效；运行中展开操作不写 scope/controlled |
| 当前缩放级别（`currentZoom`）         | `local`                | 缩放切换本地存储，卸载后回默认                                                        |
| 滚动位置（`scrollLeft`, `scrollTop`） | `local`                | 局部滚动同步（grid ↔ timeline 联动），卸载即丢                                        |
| 预览计算坐标（`task.$x/$y/$w/$h`）    | 派发属性               | GanttStore 由 scale + task.start/end 实时计算，不写 scope                             |
| 拖拽中临时偏移                        | `local`（ref）         | 拖拽过程只写像素偏移 ref，不触发 React 渲染；拖拽结束后由 action 提交最终值           |
| 筛选/排序（后续阶段）                 | `scope` / `controlled` | 按 table/CRUD 模式引入 `filterOwnership`/`sortOwnership`                              |

首版所有交互状态均 `local`。scope/controlled 归后续阶段。

> **扩展点识别：** `zoomOwnership`、`expansionOwnership` 等字段已确认为未来可扩展的 ownership 接入点，用于外部控制缩放级别和展开/收起状态。v1 不实现这些字段，但设计上留出扩展空间。`statusPath` 字段用于持久化甘特图交互状态（缩放级别、展开/收起），当 schema 中声明 `statusPath` 时，状态读写委托给 scope-level state 路径，组件卸载后恢复。未声明时状态为 local。

## 8. 事件、动作与组件句柄能力

### 8.1 事件

| 事件                | 触发时机           | 负载示例                                           |
| ------------------- | ------------------ | -------------------------------------------------- |
| `onTaskClick`       | 点击任务条         | `{ taskId, task }`                                 |
| `onTaskDoubleClick` | 双击任务条         | `{ taskId, task }`                                 |
| `onTaskDragEnd`     | 拖拽任务结束       | `{ taskId, changes: { start?, end?, progress? } }` |
| `onLinkClick`       | 点击依赖线         | `{ linkId, link }`                                 |
| `onLinkDragEnd`     | 创建新依赖结束     | `{ sourceTaskId, targetTaskId, type }`             |
| `onEmptyCellClick`  | 点击时间线空白     | `{ date, position: { x, y } }`                     |
| `onZoomChange`      | 缩放级别切换       | `{ zoom: string }`                                 |
| `onScroll`          | grid/timeline 滚动 | `{ scrollLeft, scrollTop }`                        |
| `onMount`           | 组件挂载完成后触发 | —                                                  |
| `onUnmount`         | 组件卸载前触发     | —                                                  |

拖拽结束回弹动画 200ms ease-out，缩放切换过渡 300ms ease。

### 8.2 动作

这些顶层 action 字段（`zoomIn`、`zoomOut`、`scrollToToday`、`scrollToTask`）设计用于工具栏按钮绑定，通过 toolbar region 中的按钮以 `component:zoomIn` 等方式引用。它们不是独立可调用的 action（不注册到 action 调度器），而是通过 `useImperativeHandle` 暴露的组件句柄方法的快捷声明。

| 动作            | 作用               | 参数         |
| --------------- | ------------------ | ------------ |
| `zoomIn`        | 放大一档           | —            |
| `zoomOut`       | 缩小一档           | —            |
| `scrollToToday` | 滚动到今日位置     | —            |
| `scrollToTask`  | 滚动定位到指定任务 | `{ taskId }` |

### 8.3 组件句柄

| 句柄                     | 签名                        | 说明                                                                                         |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `component:getTask`      | `(taskId) => GanttTask`     | 读取指定任务完整数据（含计算属性）。失败路径：`not-mounted`、`not-visible`、`task-not-found` |
| `component:getLink`      | `(linkId) => GanttLink`     | 读取指定链接。失败路径：`not-mounted`、`not-visible`、`link-not-found`                       |
| `component:getState`     | `() => GanttStateSnapshot`  | 读取当前甘特图状态快照。失败路径：`not-mounted`、`not-visible`                               |
| `component:scrollTo`     | `(date: string) => void`    | 程序化滚动到指定日期。失败路径：`not-mounted`、`not-visible`、`date-out-of-range`            |
| `component:scrollToTask` | `(taskId) => void`          | 程序化滚动到指定任务。失败路径：`not-mounted`、`not-visible`、`task-not-found`               |
| `component:setZoom`      | `(zoomKey: string) => void` | 程序化设置缩放级别。失败路径：`not-mounted`、`not-visible`、`invalid-zoom-key`               |

## 9. 数据源、表达式、导入能力接入点

### 9.0 loadAction 入口

`loadAction?: ActionSchema` — schema 层数据加载主入口，走 runtime.dispatch() 而非独立 fetch。复杂数据场景通过 data-source 节点声明。

### 9.1 数据源接入

```json
{
  "type": "gantt",
  "data-source": [
    { "name": "tasks", "load": "@action:ganttTaskList" },
    { "name": "links", "load": "@action:ganttLinkList" }
  ],
  "tasks": "${tasks}",
  "links": "${links}"
}
```

- `tasks`、`links` 是 source-enabled field，可直接 `"${expr}"` 绑定或通过 data-source 加载。
- 加载完成后通过 data-source 的 `onDataLoad` / 表达式管道写入 `tasks` / `links` 字段。
- 拖拽结束的持久化通过事件 handler 调用 `@action:ganttTask__save` 完成，不在组件内嵌入请求。
- `resources` / `assignments` 同模式（首版可选）。

### 9.2 表达式绑定

- `columns[].cell` region 中，per-row scope 绑定 `{ record, index }`，通过 `$slot.record.text` 等引用任务字段。
- `taskBar` region 中，绑定 `{ task, index }`，task 含所有数据字段 + 计算属性（`$x`/`$y`/`$w`/`$h` 等）。
- 列级 `filterable` 表达式：`filterOptions` 的 `visibleOn` / `disabledOn` 走列 scope。

### 9.3 导入能力

- 甘特图自身不承担 Excel/CSV 导入导出（后台职责）。
- 外部通过 `component:setZoom` / `component:scrollTo` 句柄进行程序化操作。

## 10. 样式与 DOM marker 约定

根节点使用 `nop-gantt` CSS class。

| marker (`data-slot`)     | 出现条件             | 含义                                                                                                                                                                                             |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------- |
| `gantt-grid`             | 总是                 | 左侧任务网格容器                                                                                                                                                                                 |
| `gantt-grid-header`      | 总是                 | 网格列头行                                                                                                                                                                                       |
| `gantt-grid-row`         | 有任务数据           | 网格单行（含 `data-task-id` / `data-depth`）                                                                                                                                                     |
| `gantt-grid-cell`        | 总是                 | 网格单元格                                                                                                                                                                                       |
| `gantt-timeline`         | 总是                 | 右侧时间线容器                                                                                                                                                                                   |
| `gantt-scale`            | 总是                 | 时间刻度行（多行时 `data-scale-index`）                                                                                                                                                          |
| `gantt-scale-cell`       | 总是                 | 刻度单元格                                                                                                                                                                                       |
| `gantt-bar`              | 任务行               | 任务条（含 `data-task-id` / `data-bar-type="task                                                                                                                                                 | project | milestone"`） |
| `gantt-bar-progress`     | 任务条               | 任务条内进度条                                                                                                                                                                                   |
| `gantt-bar-text`         | 任务条               | 任务条文本                                                                                                                                                                                       |
| `gantt-bar-handle-start` | `editable: true`     | 任务条左侧拖拽柄（调整开始）                                                                                                                                                                     |
| `gantt-bar-handle-end`   | `editable: true`     | 任务条右侧拖拽柄（调整结束）                                                                                                                                                                     |
| `gantt-bar-link-handle`  | `linkable: true`     | 任务条链接拖拽起点                                                                                                                                                                               |
| `gantt-link`             | 有依赖线             | SVG 依赖线                                                                                                                                                                                       |
| `gantt-link-line`        | 有依赖线             | 依赖线路径                                                                                                                                                                                       |
| `gantt-link-hitbox`      | 有依赖线             | 依赖线点击热区                                                                                                                                                                                   |
| `gantt-today`            | `showToday: true`    | 今日竖线                                                                                                                                                                                         |
| `gantt-weekend`          | `showWeekends: true` | 周末列背景                                                                                                                                                                                       |
| `gantt-empty`            | 任务数据为空         | 空态容器                                                                                                                                                                                         |
| `gantt-toolbar`          | toolbar region 声明  | 工具栏容器                                                                                                                                                                                       |
| `gantt-bar-ghost`        | 拖拽中               | 原任务条变为半透明度 0.3，跟随光标位置渲染一个 shadow 副本（ghost），ghost 使用 `gantt-bar-ghost` marker + position: fixed + pointer-events: none。列内精确排序在目标间隙渲染一条 2px 蓝色指示线 |
| `gantt-drop-indicator`   | 拖拽中               | 拖拽放置位置指示线，2px 高，蓝色 #3b82f6，显示在目标任务条间隙之间                                                                                                                               |
| `gantt-bar:hover`        | 悬浮                 | 增加浅色背景高亮 rgba(59,130,246,0.08) + cursor pointer                                                                                                                                          |
| `gantt-link:hover`       | 悬浮                 | 线条加粗 1px，颜色变深                                                                                                                                                                           |

缺省 empty 渲染为居中图标 + 文字「暂无排程数据」，浅灰图标 #9ca3af。

> `className`、`classAliases` 继承自 BaseSchema，用于覆写根节点样式。`classAliases` 短名→Tailwind 串映射由宿主应用配置。

- Test anchor 优先顺序：getByRole > data-slot > .nop-\* > data-testid。

## 11. 实现拆分建议

> 关于 renderer 运行时注册、compile region 流程、组件句柄桥接等机制，参见 `docs/architecture/renderer-runtime.md`。

### 11.1 文件结构

```
renderers/gantt/
├── gantt.tsx                       // 主组件 (forwardRef)，orchestration shell
├── gantt-store.ts                  // GanttStore：纯 TS store，管理 tasks/links 数据、坐标计算
├── gantt-context.ts                // React Context（api bridge + store ref）
├── gantt.types.ts                  // 所有类型定义
├── gantt-utils.ts                  // 通用工具函数
├── gantt-renderer-definitions.ts   // renderer-definitions 注册
├── components/
│   ├── layout.tsx                  // 布局容器：grid + resizer + timeline
│   ├── grid.tsx                    // 左侧任务网格
│   ├── grid-columns.tsx            // 网格列渲染 + 自定义 cell
│   ├── grid-tree-row.tsx           // 树层级行（缩进 + chevron + 展开/收起）
│   ├── timeline.tsx                // 右侧时间线（滚动容器）
│   ├── timeline-scale.tsx          // 时间刻度头部（smart_scales 裁剪）
│   ├── timeline-cellgrid.tsx       // 背景网格
│   ├── timeline-bars.tsx           // 任务条渲染
│   ├── timeline-links.tsx          // SVG 依赖线
│   ├── timeline-today.tsx          // 今日竖线
│   ├── toolbar.tsx                 // 内置缩放/滚动工具栏
│   └── editor.tsx                  // 任务编辑浮层外壳
├── hooks/
│   ├── use-gantt-drag.ts           // 命令式 pointer 拖拽 hook
│   ├── use-gantt-scroll.ts         // grid ↔ timeline 滚动同步
│   ├── use-gantt-zoom.ts           // 缩放级别管理
│   ├── use-gantt-handles.ts        // useImperativeHandle 组装
│   └── use-gantt-tasks.ts          // 任务树扁平化 + 坐标计算
└── utils/
    ├── date.ts                     // 日期工具（diff/add/format）
    ├── scale.ts                    // 时间刻度区间计算
    ├── layout.ts                   // 像素坐标计算（task → $x/$y/$w/$h）
    └── worktime.ts                 // 工时计算（首版占位，Phase 2）
```

### 11.2 核心设计决策

| 决策           | 方案                                             | 理由                                                            |
| -------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| Store          | 纯 TS 类（非 React），类似 DHTMLX DataStore      | 拖拽高频坐标更新不触发 React reconciliation                     |
| 拖拽           | 命令式 pointer 事件，封装为 `useGanttDrag` hook  | 甘特图拖拽不适合 React DnD 库（性能、精细像素控制）             |
| 坐标预计算     | DataStore 在 task/scale 变更时计算 `$x/$y/$w/$h` | 渲染层消费预计算值直接 absolute 定位，避免逐任务实时计算        |
| 背景网格       | 纯 CSS 或 SVG（非 Canvas）                       | 首版数据量下 CSS grid 足够；大数据量 follow-up 做 Canvas 虚拟化 |
| 缩放计算       | GanttStore 内计算 scale range + 像素映射         | 独立于 React 渲染周期                                           |
| day/week/month | 预定义缩放级别，切换时 reflow 坐标               | 锚定当前可视窗口中心日期                                        |

### 11.3 GanttStore 核心职责

```
class GanttStore {
  tasks: Map<ID, GanttTask>;    // 扁平 Map（参考 DHTMLX pull{}）
  links: Map<ID, GanttLink>;
  scaleRange: { start, end };   // 推算的时间线范围
  cellWidth: number;            // 当前缩放级别像素系数

  parse(tasks, links): void;    // 解析外部数据 → 填充计算属性
  recalcLayout(): void;         // 重新计算 task 像素坐标 + 连线 polyline
  updateTask(id, partial): void;   // 更新任务数据（拖拽结束时调用）
  updateLink(id, partial): void;
  getVisibleTasks(): GanttTask[];  // 根据展开态 + 筛选返回可见扁平列表
  addLink(source, target, type): void;
  removeLink(id): void;
  // 订阅
  on(event, handler): void;
  off(event, handler): void;
}
```

### 11.4 主组件数据流

```
Schema JSON → compile region → mount
  → GanttStore.parse(tasks, links)
  → useGanttZoom 计算 scale range + cellWidth
  → useGanttTasks 扁平化树 + 坐标计算
  → layout + grid + timeline + bars + links 渲染

拖拽时:
  pointerdown → useGanttDrag 识别模式
    → pointermove: GanttStore.setTempOffset() (ref, 不触发渲染)
    → pointerup: GanttStore.updateTask() + dispatch onTaskDragEnd → React 重渲染
```

onScroll: 使用 requestAnimationFrame 节流（非 setTimeout），确保 60fps 滚动时 grid ↔ timeline 同步不起额外 reflow。onZoomChange: 缩放切换 200ms debounce，防止快速点击多次重算坐标。

每行任务条绝对定位，行高固定为 taskBarHeight + rowPadding（缺省 28+12=40px）。不依赖内容撑高，避免 resize/重排时逐行 reflow。固定行高对后续虚拟滚动也必要。

## 12. 风险、取舍与后续阶段

### 12.1 性能风险

| 风险                      | 等级   | 缓解                                                                                    |
| ------------------------- | ------ | --------------------------------------------------------------------------------------- |
| 千级任务条全量 DOM 渲染   | **高** | 首版基于可见行范围裁剪（类似 table 虚拟滚动）；坐标预计算在 store 层，不触发 React 渲染 |
| 拖拽过程中高频 reflow     | **中** | 拖拽期间只操作像素偏移 ref，不触发 React 状态更新；结束才 commit                        |
| 多行时间刻度大量 DOM 节点 | **中** | smart_scales：仅渲染可视窗口内的刻度单元格；参考 DHTMLX 的 `smart_scales`               |
| SVG 依赖线重绘            | **低** | 依赖线数量通常远少于任务；SVG `<path>` 更新 cost 可接受                                 |

### 12.2 已知缺口

| 缺口                | 影响                                   | 后续阶段                                                       |
| ------------------- | -------------------------------------- | -------------------------------------------------------------- |
| 工作日历/工时引擎   | 任务开始结束不对齐工作时间，无自动排程 | Phase 2——port DHTMLX WorkTime 算法                             |
| 资源分配 + 负载视图 | 无法显示谁在做什么、超负荷可视化       | Phase 2——独立 resource Gantt 视图                              |
| 基线/对比视图       | 计划 vs 实际无法可视化对比             | Phase 2                                                        |
| task editor region  | 首版无内置双击编辑浮层                 | Phase 1.5——通过 `editor` region 声明 + dialog 组合             |
| 筛选/排序 ownership | 无 scope 持久化入口                    | Phase 2——按 table 模式 add `filterOwnership` / `sortOwnership` |
| RTL 布局            | 从右到左调度场景                       | future                                                         |
| 键盘导航/WAI-ARIA   | 无键盘焦点模型                         | future——Phase 1 不阻塞，Phase 2 补充                           |

### 12.3 取舍

1. **Store 外置与 React 解耦**：拖拽性能优先，代价是 store 变更不会自动触发 React 渲染，需显式 `onChange` bridge。对于非拖拽场景（数据重加载）可使用 `useSyncExternalStore` 桥接。
2. **坐标预计算 vs 实时计算**：预计算增加初始解析复杂度，但渲染层保持无状态，对虚拟滚动友好。
3. **树模型扁平化**：tasks 存为扁平 Map，`children` 字段仅在 `parse` 时用于构建层级索引（`$level` / `$branches`），渲染时通过 `open` 状态 + `$level` 缩进。不维护嵌套树结构。取舍：添加/删除任务需重建层级索引。
4. **CSS grid + absolute 定位 vs Canvas**：首版选 DOM 方案以利用 region 模板（`taskBar` 自定义内容为任意 schema）。Canvas 方案会失去 region 表达能力，归后续大规模数据虚拟化阶段。
5. **首版不引入 `worktime.ts`**：任务 start/end 按 ISO 日期直接映射像素，不做工作日对齐。取舍：首版排产误差容忍；APS 场景需在 Phase 2 补入。

### 12.4 WorkTime 日历引擎设计要点（Phase 2）

工作日历引擎负责计算考虑非工作日、节假日和周工作时长后的实际排程日期，是 APS 排产和自动排程的基础设施。

**三级日历模型**：

| 层级       | 作用域     | 说明                                                                |
| ---------- | ---------- | ------------------------------------------------------------------- |
| 全局日历   | 整个甘特图 | `GanttSchema.calendar` 引用，作为所有任务的默认日历                 |
| 任务级日历 | 单个任务   | `GanttTask.calendar` 覆盖全局设置，适用于特定任务使用不同工作日历   |
| 资源级日历 | 单个资源   | `GanttResource.calendar` 覆盖任务级设置，适用于特定资源的工作日异常 |

日历优先级：资源级 > 任务级 > 全局级。

**核心接口**：

```typescript
interface WorkCalendar {
  /** 是否为工作日 */
  isWorkingDay(date: Date): boolean;
  /** 计算某日期之后 N 个工作日的日期 */
  addWorkDays(from: Date, days: number): Date;
  /** 计算某日期之前 N 个工作日的日期 */
  subtractWorkDays(from: Date, days: number): Date;
  /** 计算两个日期之间的工作天数 */
  countWorkDays(from: Date, to: Date): number;
  /** 获取某日的可工作时间（分钟） */
  getWorkMinutes(date: Date): number;
}
```

**策略模式**：

```typescript
interface CalendarManager {
  getCalendar(calendarId?: string): WorkCalendar;
  registerCalendar(id: string, calendar: WorkCalendar): void;
}

interface TimeCalculator {
  calculateStartEnd(task: GanttTask, calendar: WorkCalendar): { start: Date; end: Date };
  calculateDuration(start: Date, end: Date, calendar: WorkCalendar): number;
}
```

`WorkCalendar` 具体实现包含：

- 周工作模板：`workWeekDays`（0-6 布尔数组）+ `workDayStart/End`（时:分）
- 节假日列表：`holidays: Set<string>`（ISO 日期字符串）
- 特殊工作日：`extraWorkDays: Set<string>`（法定调休上班日）

参考 DHTMLX `work_time.ts` 的策略模式实现，将日历计算与甘特图渲染解耦。

日历数据通过 data-source 节点加载（calendarList），GanttStore.parse() 接受 calendars 参数。工作日历数据契约：`{ id, weekHours: { monday: 8, ... }, holidays: [...] }`。

### 12.5 资源负载直方图设计要点（Phase 2）

资源负载视图以双栏布局展示每个资源的时间线占用率，帮助计划员识别超负荷和空闲资源。

**布局结构**：

- 左栏：资源列表（名称、角色、总负载百分比）
- 右栏：时间线负载条（每个资源一行，按日期/周聚合）

**核心计算**：

```typescript
interface ResourceLoad {
  resourceId: string;
  totalLoad: number; // 总负载百分比 0–100
  timelineLoad: DayLoad[]; // 每日负载详情
}

interface DayLoad {
  date: string; // ISO date
  unitLoad: number; // 当日负载百分比（分配数量 × 工时 / 总工时）
  tasks: TaskAssignment[]; // 当日分配的任务列表
}
```

`unitLoad` 计算公式：`unitLoad = sum(assignment.units × task.durationMinutes) / (resource.availableMinutes) × 100`

**超负荷色阶**：绿 (< 70%) → 黄 (70–90%) → 红 (> 90%)，每个区间内线性插值。

**日历对齐**：负载时间线使用与甘特图主视图相同的 WorkCalendar，非工作日标记为灰色禁用区域，不计入可用工时分母。

**渲染方式**：每资源行由多个时间格组成，每格填充颜色根据 `unitLoad` 计算。hover 显示当日详情 tooltip。

资源数据通过 data-source 节点加载（resourceList + assignmentList）。负载计算在 GanttStore 内完成：遍历 assignments → 按 resourceId 汇总 → 按日期切片。数据契约：`{ resources: [...], assignments: [{ task, resource, units }] }`。参考 DHTMLX resource_histogram + SVAR ResourceLoad 源码。

### 12.6 基线/对比视图设计要点（Phase 2）

基线对比用于计划（基线）与实际执行的可视化差异分析。

**数据模型**：

```typescript
interface GanttBaseline {
  id: string;
  taskId: string;
  baseStart: string; // ISO date
  baseEnd: string;
  baseDuration: number; // 基线工时
  baseProgress?: number; // 基线进度
}
```

baselines 存储为 task 级字段（`task.baselines: GanttBaseline[]`），或独立的数据源。

**渲染规则**：

- 基线任务条渲染为灰色浅条（opacity 0.4），vertical offset 低于主任务条 4px
- 主任务条（实际）保持全彩色渲染，与基线条重叠区域形成对比
- 当实际开始日期的 `$x` 与基线 `baseStart` 坐标不同时，用连接线（浅灰 dashed）标注偏差
- 滞后标注：实际落后于基线时，在两条之间显示红色箭头 + 滞后天数文字

**关键路径高亮**：

```typescript
function calculateCriticalPath(tasks: GanttTask[], links: GanttLink[]): string[] {
  // DFS 遍历依赖树，计算每条路径的 total float
  // 返回 total float = 0 的任务 ID 集合
}
```

关键路径计算步骤：拓扑排序依赖图 → 正向计算最早时间 → 反向计算最晚时间 → 浮动时间为 0 即为关键路径。

关键路径任务条渲染为红色边框或红色顶部标记（2px 红条），底部图例说明。

基线数据通过 data-source 加载，字段 `baseStart/baseEnd/baseDuration`。关键路径算法 DFS 遍历依赖树，`getCriticalPath()` 返回 critical task id 数组。参考 DHTMLX baselines + critical_path 源码。

### 12.7 自动排程设计要点（Phase 3，Flux 侧仅展示）

自动排程算法由后端实现，Flux 侧负责排程约束的视觉配置和排程结果的渲染。

**排程方向**：

- **正向排程（Forward Scheduling）**：从项目开始日期沿依赖链推算，`task.start = predecessor.end + lag`
- **反向排程（Backward Scheduling）**：从项目结束日期反向推算，`task.end = successor.start - lag`

**约束类型**：

| 约束                           | 含义           | 传播规则                                               |
| ------------------------------ | -------------- | ------------------------------------------------------ |
| SNET（Start No Earlier Than）  | 不早于某日开始 | `task.start = max(constraint.date, earliestPossible)`  |
| SNLT（Start No Later Than）    | 不晚于某日开始 | `task.start = min(constraint.date, latestPossible)`    |
| FNET（Finish No Earlier Than） | 不早于某日结束 | `task.end = max(constraint.date, earliestPossibleEnd)` |
| FNLT（Finish No Later Than）   | 不晚于某日结束 | `task.end = min(constraint.date, latestPossibleEnd)`   |

**工作日历对齐**：排程结果需通过 WorkCalendar.addWorkDays/subtractWorkDays 对齐非工作日。Flux 侧仅接收后端已对齐的排程结果（start/end 已跳过非工作日），不做实时重排。

**UI 交互**：排程配置面板允许用户选择排程方向、设置约束日期、触发"重新排程"动作（调用后端 action）。排程进度通过 onScheduleProgress 事件反馈。`constraintType`/`constraintDate` 通过 onScheduleProgress 事件向后端传递。

### 12.8 撤销/重做设计要点（Phase 3）

**命令模式**：

```typescript
interface Command {
  type: string;
  execute(): void;
  undo(): void;
  redo(): void;
  mergeable?(other: Command): boolean; // 是否可合并
  merge(other: Command): Command; // 合并后的命令
}
```

**UndoStack**：

```typescript
class UndoStack {
  private commands: Command[] = [];
  private pointer = -1;
  private limit = 50;

  push(cmd: Command): void {
    // 清空 pointer 之后的命令
    this.commands.length = this.pointer + 1;
    // 与上一个命令尝试合并
    if (this.pointer >= 0) {
      const last = this.commands[this.pointer];
      if (last.mergeable?.(cmd)) {
        this.commands[this.pointer] = last.merge(cmd);
        return;
      }
    }
    this.commands.push(cmd);
    if (this.commands.length > this.limit) this.commands.shift();
    this.pointer = this.commands.length - 1;
  }

  undo(): void {
    if (this.pointer < 0) return;
    this.commands[this.pointer].undo();
    this.pointer--;
  }

  redo(): void {
    if (this.pointer >= this.commands.length - 1) return;
    this.pointer++;
    this.commands[this.pointer].redo();
  }
}
```

**操作合并策略**：连续相同类型的拖拽操作（position/start/end 调整）合并为一次。连续拖动以最终位置为准，不保留中间过程。拖动操作设置 `mergeable` 返回 true，触发 `merge`。

**存储限制**：默认 50 步，可通过 `GanttSchema.undoLimit` 配置。超出时删除最早命令。

**UI 表示**：撤销/重做按钮（Ctrl+Z / Ctrl+Shift+Z），按钮 disabled 状态反映 UndoStack.canUndo/canRedo。

**Flux action 集成**：撤销/重做通过 component:undo / component:redo 句柄暴露。UndoStack 使用命令模式记录 GanttStore 的每次变更（updateTask/addLink 等），操作合并策略：连续拖拽合并为一次。

### 12.9 键盘导航 + WAI-ARIA 设计要点（Phase 2）

**焦点行模型**：甘特图维护一个单一焦点（focus），通过方向键在任务行间移动。焦点独立于选中状态：焦点行通过 `data-focused="true"` 标记，选中行通过 `aria-selected="true"` 标记。

**快捷键表**：

| 按键             | 作用                                         |
| ---------------- | -------------------------------------------- |
| 方向键 ↑↓        | 焦点上移/下移一行（树层级：跳过折叠子节点）  |
| 方向键 ←→        | 时间线水平滚动 1 列                          |
| Alt+←→           | 水平滚动到上一个/下一个非整列位置            |
| Enter            | 展开/收起当前焦点行的子任务                  |
| Shift+Enter      | 选中/取消选中当前行                          |
| Space            | 触发行默认动作（如打开任务编辑器）           |
| Delete/Backspace | 删除任务（如有权限）                         |
| Ctrl+Z           | 撤销                                         |
| Ctrl+Shift+Z     | 重做                                         |
| Ctrl+C           | 复制选中任务                                 |
| Ctrl+V           | 粘贴任务                                     |
| Tab              | 移到下一个交互元素（工具栏按钮/列头/任务条） |
| Ctrl+F           | 聚焦搜索框                                   |

**WAI-ARIA 属性**：

| 元素       | role                   | 关键 aria-\*                                                                 |
| ---------- | ---------------------- | ---------------------------------------------------------------------------- |
| 甘特图容器 | `role="treegrid"`      | `aria-label`，`aria-readonly`                                                |
| 任务行     | `role="row"`           | `aria-expanded`（有子任务时），`aria-level`，`aria-setsize`，`aria-posinset` |
| 列头单元格 | `role="columnheader"`  | `aria-sort`（可排序列）                                                      |
| 任务条     | `role="gridcell"`      | `aria-label="{task.text} 开始于 {start}"`                                    |
| 依赖线     | `role="img"`（装饰性） | `aria-label="{source} → {target}"`                                           |
| 工具栏按钮 | 标准 button role       | `aria-label="放大"` 等                                                       |
| 拖拽手柄   | `role="slider"`        | `aria-valuemin`/`aria-valuemax`/`aria-valuenow`                              |

**Roving tabindex**：甘特图内所有可交互元素实施 roving tabindex 模式，Tab 键一次进入组件后，内部通过方向键导航而非 Tab，避免多次 Tab 操作。
