# 甘特图（Gantt）开源实现调研报告

> 日期：2026-07-20
> 调研项目：SVAR React Gantt v2.7.1 (MIT), DHTMLX Gantt CE v10.0.0 (MIT)
> 参考仓库：`~/sources/complex-controls/react-gantt-svar/`, `~/sources/complex-controls/dhtmlx-gantt/`

---

## 1. 调研概要

| 项目             | 版本   | 许可 | 框架             | 核心依赖                        | 代码量                    |
| ---------------- | ------ | ---- | ---------------- | ------------------------------- | ------------------------- |
| SVAR React Gantt | 2.7.1  | MIT  | React 18+        | 自研 store + grid + editor 生态 | ~6047 行 (50 文件)        |
| DHTMLX Gantt CE  | 10.0.0 | MIT  | 纯 JS (框架无关) | 零运行时依赖                    | ~50000 行（291 个源文件） |

---

## 2. SVAR React Gantt 详细分析

### 2.1 架构风格

SVAR 是一个**组件生态型**架构。甘特图组件依赖 5 个内部包（store/data-provider/locales/lib-react/lib-dom）和 4 个 UI 组件库（core/grid/editor/toolbar）。甘特图本身是一个 50 文件的 React 组件，每个子组件独立文件。

```
Gantt (forwardRef)
 ├── GanttStore (EventBusRouter + DataStore)
 └── Layout
      ├── Grid (借助 @svar-ui/react-grid)
      ├── Resizer (拖拽分隔条)
      └── Chart
           ├── TimeScale (多行时间轴头)
           ├── CellGrid (背景网格)
           ├── Bars (任务条容器)
           ├── Links (SVG 依赖线)
           └── Markers (竖线标记)
```

### 2.2 可参考的设计

| 设计点                | 具体做法                                                                               | 参考价值                             |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| **事件-动作总线**     | `EventBusRouter` 链式处理器，`exec()` 触发，`intercept()` 可取消                       | ★★★ 适合 Flux action 系统设计        |
| **响应式 store 切片** | `useStore(api, key)` 订阅单一状态切片，避免全 store 重渲染                             | ★★★ 适合 Flux scope 设计             |
| **像素坐标预计算**    | DataStore 计算 `$x, $y, $w, $h`（像素位置/大小），渲染层直接 absolute 定位             | ★★★ 核心性能手段                     |
| **任务数据模型**      | `ITask`: id, text, start, end, duration, progress, type, parent, open, segments        | ★★★ 可作为 Flux Gantt 数据契约的基础 |
| **链接数据模型**      | `ILink`: id, source, target, type ('e2s'\|'s2s'\|'e2e'\|'s2e'), computed `$p` polyline | ★★★ 完整                             |
| **资源/分配模型**     | `IResource` + `IAssignment`（task-resource units%）                                    | ★★☆ ERP 需要资源视图                 |
| **时间刻度配置**      | `scales[]`: `{unit, step, format}` 支持 hour/day/week/month/quarter/year               | ★★★ 直接复用                         |
| **缩放配置**          | `IZoomConfig`: `{level, levels: [{minCellWidth, maxCellWidth, scales}]}`               | ★★☆ APS 需要                         |
| **工作日历**          | `ICalendar`: `{id, weekHours: {monday: 8, ...}}` 控制工作时间                          | ★★★ 直接复用                         |
| **任务模板**          | `taskTemplate: FC` 自定义任务条内容 React 组件                                         | ★★★ Flux region 模式对应             |
| **事件映射**          | action `'update-task'` → auto-camelize `onUpdateTask` prop                             | ★★☆ 命名约定可参考                   |

### 2.3 不应参考的设计

| 设计点                           | 问题                                | 理由                           |
| -------------------------------- | ----------------------------------- | ------------------------------ |
| 纯 JS 源码                       | 类型声明与实现分离                  | Flux 全 TypeScript             |
| 无单元测试                       | 零测试文件                          | Flux 要求测试覆盖              |
| `handlersStateRef`               | mutable ref 存闭包（React 反模式）  | 说明 API 不适合 React 生命周期 |
| 重度耦合内部生态                 | 依赖 18 个 @svar-ui 包              | Flux 需轻量，仅依赖 flux-core  |
| 两个 TimeScale 组件              | 一个在 chart/、一个在顶层，功能重复 | 复制维护问题                   |
| 大量 useMemo 但未使用 React.memo | Bars.jsx 无组件级 memo 防护         | 性能优化缺失                   |
| CSS 随机 hash 前缀               | `wx-jlbQoHOz` 样式难以覆盖          | Flux 用 Tailwind 无此问题      |

### 2.4 拖拽机制（值得重点关注）

SVAR 的拖拽是**命令式 DOM 事件**实现，而非 React DnD 库：

- **任务条拖拽**：`mousedown` → 判断 `getMoveMode()`（start/end/move）→ `mousemove` 计算像素差 → `drag-task` action 实时更新 → `mouseup` 调用 `update-task` 持久化
- **链接绘制**：点击任务条的 link handle → 创建 `linkFrom` 状态 → 点击另一个任务条 → 调用 `add-link` action
- **行排序**：纯命令式——创建拖拽行 DOM 克隆，绝对值定位，`document.elementFromPoint()` 检测放置目标

**对 Flux 的参考价值**：甘特图拖拽不适合 React DnD 库（性能、精细像素控制需求），应参考 SVAR 的直接 DOM 事件方案。但交互逻辑应封装在 `useGanttDrag` hook 中，不写为 React 组件。

---

## 3. DHTMLX Gantt CE 详细分析

### 3.1 架构风格

DHTMLX 是一个**单体引擎型**架构。整个甘特图是一个 `gantt` 全局对象，通过配置和事件驱动。零运行时依赖，纯 JS + LESS 样式。

```
gantt (单例)
 ├── Config Layer (gantt.config, 150+ 属性)
 ├── Event System (100+ 事件，attachEvent/callEvent)
 ├── Data Stores (tasksStore: TreeDataStore, linksStore: DataStore)
 ├── State Service (getState, registerProvider)
 ├── Layout Tree (Grid + Resizer + Timeline + Scrollbar)
 ├── Render Engine (Layer 系统：task_bar / link / bg 等 ~15 layers)
 └── WorkTime Engine (CalendarManager + TimeCalculator)
```

### 3.2 可参考的设计

| 设计点                     | 具体做法                                                       | 参考价值                               |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| **Store 设计**             | `DataStore`: pull{} 对象池 + visibleOrder + CRUD 事件          | ★★★ DataStore 模式可直接用于 Flux      |
| **TreeDataStore**          | 在 DataStore 上增加 `$branches{}` 管理父子关系                 | ★★★ BOM 树和 WBS 需要                  |
| **事件系统**               | `attachEvent/callEvent` pub-sub，`onBefore*` 返回 false 可取消 | ★★★ 与 Flux action 模式天然匹配        |
| **StateService**           | 多 provider 注册，`getState()` 返回合并快照                    | ★★★ 适合 scope state 管理              |
| **WorkTime 引擎**          | CalendarManager + TimeCalculator，处理工作日/小时计算          | ★★★★ 甘特图核心能力，APS 排产必须      |
| **缩放机制**               | `scales[]` 配置 + `smart_scales` + 智能 scale range 计算       | ★★★★ 直接复用思路                      |
| **100+ 事件**              | 从 onBeforeTaskDrag 到 onGanttRender 全覆盖                    | ★★★ 事件清单可作为 Flux event 设计参考 |
| **模板系统**               | `gantt.templates.*` 纯函数，50+ 模板点                         | ★★★ 与 Flux value template 模式对应    |
| **Layout 树**              | 可嵌套的 cell 布局系统（gantt.config.layout）                  | ★★☆ 甘特图内布局                       |
| **插件系统**               | `gantt.plugins({tooltip:true})` 声明式激活                     | ★★☆ Flux plugin 机制可参考             |
| **批量操作**               | `gantt.batchUpdate()` / `gantt.batchUpdateEnd()`               | ★★★ 原子更新模式                       |
| **pointer/mouse 统一输入** | dnd.js 自动检测 pointer 事件支持并按需回退到 mouse 事件        | ★★☆ 适合 Flux 输入抽象层               |

### 3.3 DHTMLX 特有功能清单（社区版）

| 功能             | 说明                                   |
| ---------------- | -------------------------------------- |
| 四种任务类型     | task/project/milestone + placeholder   |
| 四种依赖类型     | FS(0), SS(1), FF(2), SF(3)             |
| 工作时间和日历   | 工作日历、全局/任务级/资源级           |
| 智能渲染         | 仅渲染可见行/列                        |
| 自适应时间刻度   | 自动计算范围，支持多行刻度             |
| 时区/时间格式    | strftime 格式字符串                    |
| 内联编辑         | 网格单元格直接编辑                     |
| 排序             | 点击列头排序                           |
| 拖拽功能         | 拖动任务、调整长度、修改进度、创建依赖 |
| 可折叠的树形结构 | parent 属性控制层级                    |
| 键盘导航         | 扩展插件                               |
| 无障碍支持       | WAI-ARIA 属性                          |
| RTL 布局         | 从右到左                               |
| 导出 (非自托管)  | PDF/PNG/Excel 通过 DHTMLX 在线服务     |

### 3.4 不应参考的设计

| 设计点                      | 问题                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| 全局单例 `gantt`            | 支持多实例（GanttFactory + getGanttInstance() 模式，各实例独立状态），此工厂模式值得 Flux 参考 |
| `mixin()` 混合 API          | 公共方法通过 mixin 混入，TypeScript 不友好                                                     |
| ~100 个 sample 无自动化测试 | 仅有 Puppeteer 冒烟测试，无单元测试                                                            |
| 字符串型事件名              | 无 TypeScript 枚举，IDE 支持弱                                                                 |
| 无模块化                    | 所有功能挂在一个 `gantt` 对象上                                                                |

### 3.5 完整数据流

```
Server JSON → gantt.parse({data, links})
  → tasksStore.parse()  (发送 onParse, 计算 $index/$level/$source/$target)
  → linksStore.parse()  (发送 onParse, 填充 task.$source/$target)
  → gantt.render()
  → calculateScaleRange() (计算时间刻度范围)
  → layout.resize()  (布局计算)
  → stores.refresh() → filter → render → layers.draw (渲染)
```

---

## 4. 两个项目的对比

| 维度 | SVAR                             | DHTMLX                      | Flux 建议                          |
| ---- | -------------------------------- | --------------------------- | ---------------------------------- |
| 框架 | React 组件                       | 纯 JS (框架无关)            | 遵循 flux-renderers 模式           |
| 状态 | EventBusRouter + writable stores | DataStore + eventable mixin | 参考 DataStore 的 store 设计       |
| 缩放 | zoom config 级别                 | smart_scales + scale_range  | 参考 DHTMLX 的自动范围计算         |
| 拖拽 | 命令式 DOM 事件                  | 命令式 DOM 事件             | 均用命令式 DOM（不适合 React DnD） |
| 日历 | 工作日历 (weekHours)             | 完整 WorkTime 引擎          | 优先参考 DHTMLX 的 WorkTime 设计   |
| CSS  | 随机 hash 前缀                   | LESS + 全局 class           | Flux 用 Tailwind                   |
| 测试 | 无                               | Puppeteer 冒烟              | 需完整测试                         |

---

## 5. 对 Flux Gantt 的设计建议

### 5.1 数据层（参考 DHTMLX DataStore + SVAR ITask）

```
GanttStore (单独文件，非 React 依赖)
  ├── tasks: 扁平 Map<id, GanttTask>   (参考 DHTMLX pull{})
  ├── links: 扁平 Map<id, GanttLink>
  ├── calendars: GanttCalendar[]
  ├── resources: GanttResource[]
  ├── assignments: GanttAssignment[]
  └── computed: task.$x/$y/$w/$h (像素坐标，由 scale+start+end 推算)
```

**GanttTask**（合并 SVAR + DHTMLX 最佳字段）：

```typescript
interface GanttTask {
  id: string | number;
  text: string;
  type: 'task' | 'project' | 'milestone';
  start: string; // ISO date
  end: string;
  duration: number;
  progress: number; // 0-100
  parent: string | number | null;
  open: boolean;
  calendar?: string; // 工作日历 ID
  segments?: GanttSegment[];
  // 计算属性
  $x: number;
  $y: number;
  $w: number;
  $h: number;
  $level: number;
  $source: LinkID[];
  $target: LinkID[];
}
```

**GanttLink**（直接使用 DHTMLX 的 4 类型模型）：

```typescript
interface GanttLink {
  id: string | number;
  source: string | number;
  target: string | number;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag: number; // 延迟天数
  // 计算属性
  $p: string; // SVG polyline points
}
```

### 5.2 渲染层（参考 SVAR 的组件结构）

```
├── gantt.tsx               // 主组件 (forwardRef)
├── gantt-store.ts          // 数据 store（非 React，纯逻辑）
├── gantt-context.ts        // React Context
├── gantt.types.ts          // 所有类型
├── gantt-utils.ts          // 工具函数（日期、像素计算）
├── gantt-renderer-definitions.ts  // 渲染器注册
├── components/
│   ├── layout.tsx           // 布局容器
│   ├── grid.tsx             // 左侧任务网格
│   ├── grid-columns.tsx     // 列配置
│   ├── timeline.tsx         // 右侧时间线
│   ├── timeline-scale.tsx   // 时间刻度头部
│   ├── timeline-bars.tsx    // 任务条渲染
│   ├── timeline-links.tsx   // 依赖线（SVG）
│   ├── timeline-cellgrid.tsx // 背景网格
│   └── editor.tsx           // 任务编辑表单
├── hooks/
│   ├── use-gantt-drag.ts    // 拖拽 hook（命令式 DOM）
│   ├── use-gantt-scroll.ts  // 滚动同步
│   ├── use-gantt-zoom.ts    // 缩放控制
│   └── use-gantt-tasks.ts   // 任务数据订阅
└── utils/
    ├── date.ts              // 日期计算
    ├── scale.ts             // 时间刻度计算
    ├── layout.ts            // 布局算法
    └── worktime.ts          // 工时计算（参考 DHTMLX）
```

### 5.3 拖拽机制

不引入 React DnD 库。采用 SVAR 的命令式 DOM 方案，但封装为 `useGanttDrag` hook：

- `useGanttDrag(barRef, ganttApi)` → `{ isDragging, dragMode }`
- 内部使用 `pointerdown/pointermove/pointerup` 事件
- 区分三种模式：`'move'`（移动）、`'resize-start'`（调整开始）、`'resize-end'`（调整结束）
- 拖拽过程中实时更新 store 中的像素坐标（不触发 React 渲染）
- 拖拽结束后提交最终修改

**Store 更新机制**：GanttStore 是外部非 React store（类似 DHTMLX DataStore），拖拽过程中通过 ref bridge 进行命令式更新，不触发 React reconciliation。React 只在拖拽结束后重新渲染。

### 5.4 缩放机制（参考 DHTMLX）

- 预定义缩放级别：`day`（日视图）、`week`（周视图）、`month`（月视图）
- 级别切换时自动重新计算 `scales[]` 和 `cellWidth`
- timeScale 仅渲染可视区域（DHTMLX 的 `smart_scales`）
- cellWidth 由 scale unit × step × 像素系数决定。切换缩放级别时需重新计算 scales[] 和 cellWidth，并使用滚动锚定（保持当前聚焦日期位置不变）。仅渲染可视窗口内的时间刻度单元格（smart_scales）。

### 5.5 工作日历（参考 DHTMLX WorkTime）

- 支持全局工作日、任务级日历、资源级日历
- 任务开始/结束时间需对齐到工作时间
- 工时计算驱动自动排程
- DHTMLX 的 WorkTime 引擎采用策略模式（8 文件，744 行）：CalendarManager 管理日历注册和优先级合并，TimeCalculator 处理工时加减（addWorkDays/subtractWorkDays），策略目录（strategy/）封装不同日历类型的合并逻辑。

---

## 6. 可复用开源参考代码

| 参考来源                   | 文件名/模式                           | 直接复用程度                    |
| -------------------------- | ------------------------------------- | ------------------------------- |
| DHTMLX `config.ts`         | `IGanttConfig` 150+ 属性接口          | ★★★ 作为 Flux Gantt schema 基础 |
| DHTMLX `gantt_types.ts`    | Task/Link/Scale 类型定义              | ★★★ 核心类型直接参考            |
| DHTMLX `work_time.js`      | CalendarManager + TimeCalculator 算法 | ★★★ 工时计算逻辑可移植          |
| DHTMLX `datastore.js`      | DataStore pull{}/visibleOrder 设计    | ★★☆ 数据管理模式                |
| SVAR `ITask` / `ILink`     | 任务/链接接口定义                     | ★★★ JSON schema 基础            |
| SVAR `prepareConfig.js`    | scale/column/zoom 默认值规范化        | ★★☆ 配置处理                    |
| SVAR `chart/TimeScale.jsx` | 多行时间刻度渲染                      | ★★★ 渲染逻辑参考                |
| SVAR `chart/Links.jsx`     | SVG 依赖线 + hitbox                   | ★★★ 直接参考                    |
| SVAR `chart/CellGrid.jsx`  | 背景网格渲染                          | ★★☆                             |

---

## 7. 与 Nop 平台的数据契约

### 7.1 数据来源

GanttStore 的数据通过 GraphQL @BizQuery 获取：

- **任务列表**：`GanttTask__findList` 或自定义 `ganttTaskList` query
- **依赖列表**：`GanttLink__findList` 或自定义 `ganttLinkList` query
- **资源列表**：`GanttResource__findList` 或自定义 `ganttResourceList` query
- **日历配置**：`GanttCalendar__findList`

### 7.2 修改提交

所有甘特图修改通过 @BizMutation 提交：

- 创建/更新/删除任务 → `GanttTask__save` / `GanttTask__batchModify`
- 创建/更新/删除依赖 → `GanttLink__save`
- 资源分配 → `GanttAssignment__save`

### 7.3 权限控制

通过 `xui:roles` 和 `xui:permissions` 控制访问：

```xml
<action name="gantt-update-task" xui:roles="erp-admin,erp-planner"
        xui:permissions="gantt:task:update"/>
```

### 7.4 数据加载

采用 `data-source` 节点声明式配置：

```xml
<data-source name="tasks" load="@action:ganttTaskList" />
<data-source name="links" load="@action:ganttLinkList" />
<data-source name="resources" load="@action:ganttResourceList" />
```
