# 排班日历（Calendar）开源实现调研报告

> 日期：2026-07-20
> 调研项目：Schedule-X v4.6.1 (MIT), react-big-calendar v1.20.0 (MIT)
> 参考仓库：`~/sources/complex-controls/schedule-x-calendar/`, `~/sources/complex-controls/react-big-calendar/`

---

## 1. 调研概要

| 项目               | 版本   | 许可 | 框架              | 核心依赖                           | 包数量    |
| ------------------ | ------ | ---- | ----------------- | ---------------------------------- | --------- |
| Schedule-X         | 4.6.1  | MIT  | Preact (框架无关) | temporal-polyfill, @preact/signals | 18 内部包 |
| react-big-calendar | 1.20.0 | MIT  | React             | date-fns, moment-timezone 等       | 单包      |

---

## 2. Schedule-X 详细分析

### 2.1 为什么选择 Schedule-X 作为主要参考

Schedule-X 是目前**最全面的开源日历库**（FullCalendar 的现代替代品），有以下关键优势：

- 完整的月/周/日/列表四视图，含小屏兼容（month-agenda, week-agenda）
- 插件架构（18 个内部包，插件可组合）
- TypeScript 全程类型安全
- 使用 TC39 Temporal API（未来标准）而非 moment/dayjs
- 内置资源排班（`resourceId`）——这对 ERP 的排班日历至关重要

### 2.2 架构风格

Schedule-X 是**插件式内核架构**：

```
createCalendar(config, plugins) → CalendarApp
  ├── CalendarAppSingleton ($app)       ← 全局状态单例
  │   ├── calendarState                ← 视图/范围/主题状态
  │   ├── calendarEvents               ← 事件信号
  │   ├── config                       ← 配置（不可变）
  │   ├── datePickerState              ← 日期选择器状态
  │   └── plugins                      ← 插件注册表
  │
  ├── CalendarWrapper (Preact 根组件)
  │   ├── Header (导航头 + 视图切换器)
  │   └── View (活动视图)
  │       ├── day / week / month-grid / month-agenda / week-agenda / list
  │
  └── Plugins (生命周期钩子)
      ├── beforeRender($app)     ← 渲染前注入
      ├── onRender($app)         ← 渲染后
      ├── onRangeUpdate(range)   ← 日期范围变化
      └── destroy()              ← 清理
```

### 2.3 数据模型

**外部事件**（用户提供）：

```typescript
interface CalendarEventExternal {
  id: string | number;
  start: Temporal.ZonedDateTime | Temporal.PlainDate; // 支持时区和全天
  end: Temporal.ZonedDateTime | Temporal.PlainDate;
  title?: string;
  people?: string[];
  location?: string;
  description?: string;
  calendarId?: string; // 映射到颜色主题
  resourceId?: string; // 资源排班 key
  _customContent?: {
    // 按视图的自定义 HTML 内容
    timeGrid?: string; // 周/日视图时间格
    dateGrid?: string; // 日期格
    monthGrid?: string; // 月视图
  };
  _options?: {
    // 行为选项
    disableDND?: boolean;
    disableResize?: boolean;
    additionalClasses?: string[];
  };
}
```

**内部事件**（计算后）：
添加了以下计算属性：\_isSingleDayTimed, \_isMultiDayTimed, \_isSingleDayFullDay, \_isMultiDayFullDay, \_previousConcurrentEvents, \_totalConcurrentEvents, \_eventFragments（月视图分段）, \_color（colorId 解析后颜色）

**资源模型**：

```typescript
interface Resource {
  id: string;
  label?: string;
  labelHTML?: string;
  colorName?: string;
  resources?: Resource[]; // 嵌套层级
  isOpen?: Signal<boolean>; // 展开状态
}
```

### 2.4 视图系统

| 视图   | 视图名         | 设备 | 渲染机制                |
| ------ | -------------- | ---- | ----------------------- |
| 日视图 | `day`          | 通用 | 单列时间格（24h）       |
| 周视图 | `week`         | 宽屏 | 7 列时间格 + 顶部日期格 |
| 月网格 | `month-grid`   | 宽屏 | 4-6 行 x 7 列网格       |
| 月议程 | `month-agenda` | 小屏 | 月视图列表模式          |
| 周议程 | `week-agenda`  | 小屏 | 周视图列表模式          |
| 列表   | `list`         | 通用 | 平铺事件列表            |

视图切换通过 `calendarState.setView(viewName, date)` 触发，内部使用 `batch()` 原子更新：同时设置 `_view` 信号和调用 `setRange(selectedDate)`。

### 2.5 事件定位算法

**周视图时间格**（最关键）：

- 事件按开始时间排序
- `positionInTimeGrid()` 分配 `_previousConcurrentEvents`（前方并发数）、`_maxConcurrentEvents`（最大并发数）
- 渲染时：`top% = timeToPercentage(start)`，`height% = durationToPercentage(end-start)`，并发事件分配宽度时，每个事件宽度 = 1/maxConcurrent，偏移量 = previousConcurrent × 单位宽度

**月视图**：

- `positionInMonth()` 实现**打包算法**：按周遍历事件，为每个事件分配空闲的"层级"（行），通过 `_eventFragments` 记录跨天片段
- 剩余格子填充 `DATE_GRID_BLOCKER` 标记（防止重复放置）

**日期格（周视图顶部）**：

- 全天事件按 `_nDaysInGrid`（持续天数）排列在网格行中

### 2.6 插件架构

```typescript
interface PluginBase<Name extends string> {
  name: Name;
  beforeRender?($app): void; // Preact 渲染前
  onRender?($app): void; // Preact mount 后
  onRangeUpdate?(range: DateRange): void;
  onTimezoneChange?(timezone): void;
  destroy?(): void;
}
```

**现有开源插件**：

- `events-service`：CRUD facade（add/update/remove/get/set）
- `event-modal`：事件点击弹窗
- `calendar-controls`：编程式导航（next/prev/today/setView）
- `current-time`：当前时间红线
- `scroll-controller`：初始滚动到当前时间
- `event-recurrence`：RFC 5545 RRULE 循环事件
- `timezone-select`：时区选择器

**DnD 插件（闭源 `@sx-premium`）**：
拖拽和缩放的接口在开源代码中有定义，但实现是闭源的。核心 hook `useEventInteractions`：

- `createDragStartTimeout(callback, uiEvent)`：150ms 延迟后开始拖拽
- `setClickedEventIfNotDragging`：区分点击和拖拽
- `deepCloneEvent()` + `updateCopy()`：克隆事件生成"幻影"，拖拽完后提交

### 2.7 日期计算（Temporal API）

使用 `temporal-polyfill`（TC39 提案）进行所有日期计算：

- `addDays(date, n)`、`addMonths(date, n)` 封装 Temporal API
- **时间点系统**：通过 timePointsFromString("09:00") 将 HH:MM 转为整数（如 09:00 → 540，即分钟数），便于百分比计算。timePointToPercentage(point, dayBoundaries, totalPoints) 垂直位置映射。
- `timePointToPercentage(point, dayBoundaries, totalPoints)`：时间点转垂直位置百分比
- `timeUnitsImpl`：周/月的起始/结束计算，可配置 `firstDayOfWeek`

---

## 3. react-big-calendar 分析

### 3.1 架构

react-big-calendar 是经典 React 日历库，架构相对简单：

- 单包，核心是 `Calendar` 组件
- 通过 `views` 属性配置视图集合
- 事件通过 `events` 属性传入
- 使用 `moment`（或 `date-fns`/`luxon` 作为本地化适配器）

### 3.2 可参考的设计

| 设计点                 | 价值 | 说明                       |
| ---------------------- | ---- | -------------------------- |
| `formats` 日期格式配置 | ★★☆  | 视图级日期格式控制         |
| `views` 视图注册       | ★★☆  | 选择启用的视图             |
| `components` 组件覆盖  | ★★☆  | 覆盖事件/头部/工具栏子组件 |
| `onNavigate` 导航事件  | ★☆☆  | 月份/周切换回调            |

### 3.3 不应参考的设计

- 依赖 `moment.js`（已维护模式，Schedule-X 用 Temporal 更好）
- 缺少插件系统
- 不支持资源排班
- 拖拽需额外插件

---

## 3. react-big-calendar 与 FullCalendar 的补充说明

FullCalendar 是功能最全的开源日历库（资源排班、拖拽、RRULE），但因许可模型（MIT + 付费插件）和重量级依赖（moment.js）未做为主要参考。其 API 设计偏传统（全局配置 + moment 对象），不如 Schedule-X 的插件架构和 Temporal API 现代化。

---

## 4. 对 Flux Calendar 的设计建议

### 4.1 核心定位

Flux Calendar 不是通用日历（如 Schedule-X 覆盖全部场景），而是聚焦**排班日历**场景：

- 员工排班矩阵（行=员工，列=日期，色块=班次类型）
- 团队休假日历（同左，关联休假申请）
- 资源调度日历（行=设备/工作中心）
- 会计期间日历（月份→开/关/锁定状态）

### 4.2 数据层

```typescript
// 排班日历的核心是"行×日期的矩阵"（区别于通用日历的"事件时间线"）
interface CalendarEvent {
  id: string | number;
  title: string;
  start: string; // ISO date
  end: string; // ISO date
  type: 'shift' | 'leave' | 'appointment' | 'maintenance';
  resourceId?: string; // 行标识（员工ID/设备ID）
  color?: string; // 色块颜色
  status?: string; // 状态（Scheduled/Confirmed/Cancelled）
  meta?: Record<string, any>;
}

interface CalendarResource {
  id: string;
  title: string;
  type: 'employee' | 'workcenter' | 'equipment';
  parent?: string; // 分组
  color?: string;
}

// Flux schema
interface CalendarSchema extends BaseSchema {
  type: 'calendar';
  view?: 'month' | 'week' | 'day';
  data: SchemaValue; // CalendarEvent[]
  resources?: SchemaValue; // CalendarResource[]
  date?: string; // 当前焦点日期
  onEventClick?: ActionSchema;
  onDateChange?: ActionSchema;
}
```

### 4.3 渲染层

```
├── calendar.tsx              // 主组件
├── calendar.types.ts         // 类型定义
├── components/
│   ├── calendar-header.tsx    // 导航头（前后切换、视图切换、今日按钮）
│   ├── calendar-month.tsx     // 月视图（行×列网格）
│   ├── calendar-week.tsx      // 周视图（按日的详细时间线）
│   ├── calendar-event.tsx     // 单个事件/色块渲染
│   ├── calendar-resource.tsx  // 资源行标题
│   └── calendar-matrix.tsx    // 排班矩阵（行=资源，列=日期）
├── hooks/
│   ├── use-calendar-date.ts   // 日期导航
│   └── use-calendar-layout.ts // 事件定位算法
└── utils/
    ├── calendar-date.ts       // 日期计算
    ├── calendar-layout.ts     // 事件打包算法（参考 Schedule-X positionInMonth）
    └── calendar-time.ts       // 时间点计算
```

### 4.4 事件定位算法

注意：Flux 排班矩阵月视图（N 资源 × 31 天）与 Schedule-X 的月网格（4-6 行 × 7 列）布局不同。Schedule-X 的 positionInMonth() 解决的是"事件跨周分段"问题，而 Flux 排班矩阵需要的是"按资源行独立定位"算法——每个资源行内的事件可重叠（maxConcurrent 分配宽度），但事件不跨资源行。因此仅参考 positionInMonth() 的并发事件宽度分配思想，不直接使用其周分段算法。

**月视图（排班矩阵）**——参考 Schedule-X 的 `positionInMonth()` 打包算法：

- 每行代表一个资源（员工/设备）
- 每列代表一天
- 事件在行内定位，不跨行
- 同一行同一天的重叠事件使用 `maxConcurrent` 计算宽度分配

**周视图**——参考 Schedule-X 的 `positionInTimeGrid()`：

- 行=资源，列=星期几
- 时间格细分到小时
- 事件按开始结束时间垂直定位

### 4.5 Flux 排班日历与通用日历的侧重差异

| 需求     | 通用日历      | Flux 排班日历                                      |
| -------- | ------------- | -------------------------------------------------- |
| 行意义   | 可选资源      | **必须**（员工/设备=行）                           |
| 视图     | 日/周/月/列表 | 排班矩阵（月/周）                                  |
| 色块     | 可选          | **必须**（按班次类型颜色编码）                     |
| 拖拽     | 移动/调整事件 | 拖拽占位交换班次                                   |
| 冲突检测 | 无            | **必须**（同人同天多笔，参见 HR shift-scheduling） |

注：Schedule-X 的 resourceId 和资源视图已覆盖排班场景，Flux 在其架构基础上进一步聚焦在排班矩阵和色块编码等垂直需求。

---

## 6. 性能考虑

大规模数据场景（数百员工 × 31 天 = 数千事件）：事件定位算法 O(n log n)（按时间排序），DOM 渲染通过虚拟滚动优化。每列（每个资源）可独立虚拟化。Schedule-X 使用 Preact 信号驱动增量更新，无需全量 diff。

### 6.1 时区策略

员工排班以本地时间存储。跨时区场景下，Temporal API 的 ZonedDateTime 处理时区转换。CalendarSchema 可接受 string（ISO 8601）、Date、Temporal 三种输入类型，内部统一转换为 Temporal 计算。

---

## 5. 可复用开源参考代码

| 参考来源                            | 模块/模式                        | 直接复用程度             |
| ----------------------------------- | -------------------------------- | ------------------------ |
| Schedule-X `positionInMonth.ts`     | 月视图事件打包算法               | ★★★★ 核心算法            |
| Schedule-X `event-styles.ts`        | top/height/width/left 百分比计算 | ★★★★ 事件定位计算        |
| Schedule-X `timeUnits.impl.ts`      | 周/月起止计算                    | ★★★ 日期范围计算         |
| Schedule-X `day-boundaries.ts`      | 日边界和混合日（跨午夜）         | ★★☆                      |
| Schedule-X `set-range.ts`           | 视图范围设置（week/month/day）   | ★★★ 视图切换逻辑         |
| Schedule-X `plugin.interface.ts`    | 插件生命周期                     | ★★★ Flux plugin 系统参考 |
| Schedule-X `calendar-state.impl.ts` | 视图切换状态管理                 | ★★★ 视图状态设计         |
| react-big-calendar `formats`        | 日期格式配置                     | ★☆☆ 简化可参考           |
