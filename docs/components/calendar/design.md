# Calendar 排班日历组件设计

## 1. 组件定位

Calendar 是面向 ERP 排班场景的**调度日历**，而非通用事件日历。聚焦三个核心场景：

- **员工排班矩阵**：行=员工/人员，列=日期，色块=班次类型（早/中/晚/休）
- **团队休假日历**：行=员工，列=日期，色块=休假类型（年假/病假/调休）
- **资源调度日历**：行=设备/工作中心/工位，列=日期，色块=占用/空闲/维护

核心范式是 **N 资源 × M 日期矩阵**，每格为一个离散的"班位"（slot），由事件（event）占据为色块。这与通用日历（事件在时间线上自由排列）有本质区别。

## 2. 与 AMIS 或既有产品的能力对照

| 产品               | 原生排班日历       | 资源×日期矩阵                 | 可参考点                                                             |
| ------------------ | ------------------ | ----------------------------- | -------------------------------------------------------------------- |
| AMIS               | 无                 | 无                            | 无可直接对照的 renderer                                              |
| Schedule-X         | 有（resourceId）   | 非原生（通用月历 + 资源筛选） | 事件定位算法（positionInMonth）、Temporal API 日期计算、插件生命周期 |
| react-big-calendar | 无                 | 无                            | `formats` 日期格式配置、`onNavigate` 导航事件                        |
| FullCalendar       | 有（资源视图付费） | 有（资源时间线视图）          | 许可模型不适合参考                                                   |

Flux Calendar 不复制通用日历的所有视图（如月议程、周议程、列表），而是聚焦排班矩阵的月/周视图。

## 3. Flux 中的 renderer/type 定义

- `type: 'calendar'`
- `category: 'scheduling'`
- `sourcePackage: '@nop-chaos/flux-renderers-scheduling'`

当前尚未在 `examples.manifest.json` 注册，需新增为 `targetContract` 条目。

## 4. schema 设计

```typescript
// 外部事件（用户提供）
interface CalendarEvent {
  id: string | number;
  title: string;
  start: string; // ISO date "2026-07-20" 或 full ISO "2026-07-20T09:00:00"
  end: string; // ISO date
  type?: 'shift' | 'leave' | 'appointment' | 'maintenance' | string;
  resourceId?: string; // 行标识（员工ID/设备ID）
  color?: string; // 色块颜色，覆盖 type 默认映射
  status?: 'scheduled' | 'confirmed' | 'cancelled';
  meta?: Record<string, any>;
}

// 资源定义
interface CalendarResource {
  id: string;
  title: string;
  type?: 'employee' | 'workcenter' | 'equipment' | string;
  parent?: string; // 分组/部门
  color?: string; // 资源色调
  avatar?: string; // 员工头像 URL
  meta?: Record<string, any>;
}

// 视图模式
type CalendarView = 'month' | 'week' | 'day';

// Flux schema（extends BaseSchema）
interface CalendarSchema extends BaseSchema {
  type: 'calendar';
  view?: CalendarView; // 当前视图，默认 month
  date?: string; // 焦点日期，ISO "2026-07-20"
  data: SchemaValue<CalendarEvent[]>; // 事件数组或表达式
  resources?: SchemaValue<CalendarResource[]>; // 资源数组或表达式
  firstDayOfWeek?: 0 | 1; // 0=周日, 1=周一
  showWeekends?: boolean;
  maxConcurrent?: number; // 同资源同日重叠事件最大宽度，默认 4
  eventTemplate?: RegionSchema; // 自定义事件渲染 region
  loading?: RegionSchema; // 加载态内容 region
  empty?: RegionSchema; // 空数据内容 region
  loadAction?: ActionSchema; // schema 层数据加载主入口
  viewOwnership?: 'local' | 'controlled' | 'scope';
  viewStatePath?: string;
  dateOwnership?: 'local' | 'controlled' | 'scope';
  dateStatePath?: string;
  statusPath?: string;
  onEventClick?: ActionSchema;
  onDateChange?: ActionSchema;
  onViewChange?: ActionSchema;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  headerClassName?: string;
  eventClassName?: string;
  emptyClassName?: string;
}
```

## 5. 字段分类

| 字段                                               | 分类                     | 说明                                    |
| -------------------------------------------------- | ------------------------ | --------------------------------------- |
| `view`                                             | `props`                  | 当前视图模式，支持表达式                |
| `date`                                             | `props`                  | 焦点日期                                |
| `data`                                             | `props (source-enabled)` | 事件源，由外部 data-source 或表达式提供 |
| `resources`                                        | `props (source-enabled)` | 资源源，由外部 data-source 或表达式提供 |
| `firstDayOfWeek`                                   | `props`                  | 周起始日                                |
| `showWeekends`                                     | `props`                  | 是否显示周末列                          |
| `maxConcurrent`                                    | `props`                  | 并发事件宽度上限                        |
| `eventTemplate`                                    | `region`                 | 自定义事件渲染区域                      |
| `viewOwnership`、`viewStatePath`                   | `props`                  | 视图 ownership 路径                     |
| `dateOwnership`、`dateStatePath`                   | `props`                  | 日期 ownership 路径                     |
| `statusPath`                                       | `props`                  | scope path 交互状态持久化               |
| `headerClassName`                                  | `props`                  | 导航头额外 CSS class                    |
| `eventClassName`                                   | `props`                  | 事件色块额外 CSS class                  |
| `emptyClassName`                                   | `props`                  | 空态区域额外 CSS class                  |
| `onMount`、`onUnmount`                             | `meta`                   | 继承 BaseSchema 生命周期动作            |
| `id`、`className`、`disabled`、`visible`、`hidden` | `meta`                   | 继承 BaseSchema 元数据通道              |
| `onEventClick`                                     | `event`                  | 事件点击（ActionSchema）                |
| `onDateChange`                                     | `event`                  | 日期/月导航变化（ActionSchema）         |
| `onViewChange`                                     | `event`                  | 视图切换（ActionSchema）                |

## 6. regions 与 slot 约定

- **`eventTemplate`**：region for custom event rendering。参数：`event`（当前事件对象）、`resource`（所属资源）、`date`（日期字符串 ISO）、`concurrentIndex`（并发序号）、`maxConcurrent`（该槽位并发总数）。缺省 loading 渲染为脉冲骨架矩阵：行高 48px × 7 列脉冲条。缺省 empty 渲染为日历网格骨架（日期列完整）但所有格子中央显示 '暂无排班数据' 浅灰文字。
- **`empty`**：事件数组为空时的占位内容。`$slot` 参数：无。
- **`loading`**：数据加载中的状态内容。

未指定 `eventTemplate` 时，使用默认色块渲染：根据事件 `type` 或 `color` 字段填充背景色，显示 `title` 文本。

## 7. 运行期状态归属

- **当前视图**（`view`）、**焦点日期**（`date`）：归 scope-level state，由 schema 值或 `onDateChange`/`onViewChange` 事件外部维护。Calendar renderer 内部提供临时本地状态用于动画过渡，但不作为持久 owner。
- **事件数据**（`data`）：归外部 data-source 或 scope expression，Calendar 只消费不持有。
- **资源数据**（`resources`）：同事件数据，归外部 data-source。
- **视图计算期状态**：renderer 内部持有当前显示的日期范围（月/周/日的起止日期）、事件定位计算结果，这些不暴露到 schema，纯实现细节。
- **视图 ownership**：`viewOwnership`、`viewStatePath` 控制视图状态的归属和持久化路径。
- **日期 ownership**：`dateOwnership`、`dateStatePath` 控制焦点日期的归属和持久化路径，与视图状态独立。
- **交互状态**：`statusPath` 用于交互状态的 scope-level 持久化。

## 8. 事件、动作与组件句柄能力

| 事件/动作                | 类型   | 参数                                     | 说明                                                                                  |
| ------------------------ | ------ | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `onEventClick`           | event  | `{ event, resource, date, nativeEvent }` | 事件/色块点击                                                                         |
| `onDateChange`           | event  | `{ date, view }`                         | 导航切换（翻月/翻周）                                                                 |
| `onViewChange`           | event  | `{ view, date }`                         | 视图切换                                                                              |
| `onMount`                | event  | —                                        | 组件挂载完成后触发                                                                    |
| `onUnmount`              | event  | —                                        | 组件卸载前触发                                                                        |
| `component:goNext`       | action | 无                                       | 下一个月/周/日（根据当前视图）。失败路径：`not-mounted`、`not-visible`、`at-boundary` |
| `component:goPrev`       | action | 无                                       | 上一个月/周/日。失败路径：`not-mounted`、`not-visible`、`at-boundary`                 |
| `component:goToday`      | action | 无                                       | 回到今天。失败路径：`not-mounted`、`not-visible`                                      |
| `component:setView`      | action | `{ view }`                               | 切换视图。失败路径：`not-mounted`、`not-visible`、`invalid-view`                      |
| `component:scrollToDate` | action | `{ date }`                               | 滚动到指定日期。失败路径：`not-mounted`、`not-visible`、`date-out-of-range`           |

## 9. 数据源、表达式、导入能力接入点

- **`loadAction?: ActionSchema`** — schema 层数据加载主入口，走 runtime.dispatch() 而非独立 fetch。复杂数据场景通过 data-source 节点声明。
- **`data` 和 `resources`**：接入标准 data-source 管道。`data` 结果为 `CalendarEvent[]`，`resources` 结果为 `CalendarResource[]`。
- **表达式接入**：`view`、`date`、`firstDayOfWeek`、`showWeekends` 可接表达式动态取值。
- **事件筛选**：通过表达式在 data-source 层或 scope 层筛选（如 `${ shiftEvents.where(e => e.resourceId === selectedResource) }`），Calendar 内部不做二次筛选。
- **日期计算**：使用 Flux 已有的原生 Date + Intl 架构（`date-utils.ts` 模式），不引入 Temporal polyfill。日期计算使用 Unix 时间戳毫秒数 + UTC Date 进行跨时区计算，显示时通过 Intl.DateTimeFormat 本地化。对外 schema 只接受 ISO 字符串，不暴露日期库依赖。

## 10. 样式与 DOM marker 约定

根节点 marker：`nop-calendar`。`className`、`classAliases` 继承自 BaseSchema，用于覆写根节点样式。`classAliases` 短名→Tailwind 串映射由宿主应用配置。

```html
<div class="nop-calendar" data-view="month" data-date="2026-07-20">
  <!-- 网格 -->
  <div data-slot="calendar-matrix">
    <!-- 资源行 -->
    <div data-slot="calendar-resource-row" data-resource-id="emp-001">
      <div data-slot="calendar-resource-header">张三</div>
      <div data-slot="calendar-cells">
        <!-- 日格 -->
        <div data-slot="calendar-cell" data-date="2026-07-01" data-resource="emp-001">
          <!-- 事件色块 -->
          <div
            data-slot="calendar-event"
            data-event-id="evt-1"
            data-event-type="shift"
            style="background:#4ade80; left:0%; width:50%;"
          >
            早班
          </div>
          <div
            data-slot="calendar-event"
            data-event-id="evt-2"
            data-event-type="leave"
            style="background:#f87171; left:50%; width:50%;"
          >
            年假
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

标记约定（data-slot + data-\*）：

- `nop-calendar` — 根容器（nop- 前缀保留）
- `data-slot="calendar-header"` — 导航头（前后切换、视图切换、今日按钮）
- `data-slot="calendar-matrix"` — 排班矩阵容器
- `data-slot="calendar-resource-row"` — 单个资源行（含 `data-resource-id`）
- `data-slot="calendar-resource-header"` — 资源行标题
- `data-slot="calendar-cells"` — 日期格容器
- `data-slot="calendar-cell"` — 单个日格（含 `data-date`、`data-resource`）
- `data-slot="calendar-event"` — 事件色块（含 `data-event-id`、`data-event-type`；重叠时追加 `data-overlap="true"`）
- `data-slot="calendar-cell"` + `data-empty="true"` — 非当前月日格

导航切换（翻月/翻周/翻日）使用 CSS transform translateX + opacity 过渡 250ms ease-out。旧视图横向滑出、新视图滑入。视图切换（month↔week↔day）使用 fade 过渡 200ms。

- Test anchor 优先顺序：getByRole > data-slot > .nop-\* > data-testid。

`is-split` 标记。hover 时 `data-slot="calendar-event"` 对应元素增加 2px outline + brightness(1.1)，光标指针。`data-slot="calendar-cell"` hover 浅灰背景 #f8fafc。导航按钮 hover 背景 #f1f5f9。

## 11. 实现拆分建议

```
src/
├── calendar.tsx                    # 主组件：组装 header + matrix，接入 hook
├── calendar.types.ts               # CalendarEvent, CalendarResource, CalendarSchema
├── components/
│   ├── calendar-header.tsx          # 导航头
│   ├── calendar-month-view.tsx      # 月视图排班矩阵
│   ├── calendar-week-view.tsx       # 周视图时间格（含资源行）
│   ├── calendar-day-view.tsx        # 日视图（单日单资源行详细时间线）
│   ├── calendar-event-block.tsx     # 事件色块渲染（读取 eventTemplate region 或默认色块）
│   └── calendar-resource-header.tsx # 资源行标题栏
├── hooks/
│   ├── use-calendar-state.ts        # 视图/日期状态管理（currentDate, activeView, dateRange）
│   ├── use-calendar-navigation.ts   # 日期导航（goNext/goPrev/goToday）
│   └── use-calendar-virtualizer.ts # 行级虚拟滚动（@tanstack/react-virtual）
└── utils/
    ├── calendar-date-utils.ts       # 日期计算：月/周起止、Unix 时间戳 + UTC Date 跨时区计算、firstDayOfWeek
    ├── calendar-layout-utils.ts     # 事件定位算法：并发事件宽度分配
    └── calendar-time-utils.ts       # 时间点百分比计算（周/日视图垂直定位）
```

并发事件宽度分配：每单元格内事件按 `maxConcurrent` 分配宽度，width% = 1/maxConcurrent，left% = index × width%。事件排序规则：先按开始日期，再按持续时间。按资源行独立打包，本行内重叠事件按 `maxConcurrent` 分配宽度，不跨行。每行独立计算，无需跨行分段。

多日事件拆解：多日事件按 (resourceId, date) 拆解为单日块后逐单元格定位。每块共享同一 eventId，css class 携带 `is-split` 标记。v1 仅支持单日块渲染，跨日视觉连接线推迟至 v2。

周/日视图垂直百分比定位（positionInTimeGrid）→ `calendar-time-utils.ts`，top/height 计算。

CalendarState 使用 scope-level state path 存储 `view` 和 `date`，允许外部通过 `onDateChange`/`onViewChange` 同步，也允许 `component:setView` action 直接操作。

## 12. 风险、取舍与后续阶段

| 风险/取舍              | 说明                                                                       | 缓解                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 与 Schedule-X 理念差异 | Schedule-X 是通用日历（事件在时间轴上排列），Flux 是资源×日期排班矩阵      | 保持"行=资源"的布局范式，不硬套 Schedule-X 的周/月视图模板                                                                                                                                                                        |
| 月视图布局独特性       | 通用月历是 4-6 行 × 7 列（按周堆叠），排班矩阵是 N 行 × M 列（按资源堆叠） | positionInMonth 仅参考并发宽度分配思想，不复制周分段算法                                                                                                                                                                          |
| 大规模性能             | 300 员工 × 31 天 ≈ 9300 事件，全量 DOM 渲染开销大                          | 行级虚拟滚动（每资源行为一个虚拟行），按视口只渲染可见行。行级虚拟滚动纳入 v1 实现计划：useCalendarVirtualizer hook + 固定行高模式（资源行高度固定为 48px，减少动态高度测量带来的 layout thrash）。使用 @tanstack/react-virtual。 |
| 事件重叠复杂度         | 同资源同日最多可能 10+ 事件，宽度摊薄后难以辨识                            | 引入 `maxConcurrent` 上限（默认 4），超出部分折叠为 "+N" 标记                                                                                                                                                                     |
| 插件系统简化           | Schedule-X 有 18 个内部包 + 插件生命周期                                   | v1 不走插件架构：header/视图切换/事件点击全部内建，后续按需解耦                                                                                                                                                                   |
| DnD 拖拽交换班次       | 排班场景高频需求（拖拽交换班次占位），但复杂度高                           | v1 只读展示，拖拽排入 v2                                                                                                                                                                                                          |

后续阶段：

- **v1**：只读排班日历，支持月/周/日三视图，事件点击导航，自定义 eventTemplate
- **v2**：拖拽交换班次、班次类型选择弹窗、资源分组展开/折叠
- **v3**：冲突检测（同人同日重复班次）、跨日连续班次视觉连接、批量排班

### §12.1 拖拽交换班次设计要点（v2）

用户通过拖拽将某个事件块从一个单元格移动到另一个单元格，实现快速换班。

**交互流程**：

1. **选中**：pointerdown 事件选中当前事件块（`data-event-id`），事件块增加 2px 蓝色边框 + 轻微 scale(1.02) 高亮
2. **拖拽**：pointermove 跟随鼠标移动，原位置保留半透明 ghost（opacity 0.3），目标单元格 hover 时 show color 变化预览（浅绿表示可放置，浅红表示冲突）
3. **确认**：pointerup 触发 `onEventChange` update（payload: `{ eventId, fromResourceId, fromDate, toResourceId, toDate }`）
4. **取消**：按 Escape 或拖出组件区域外回滚，事件块回到原始位置

**冲突检测**：目标单元格已被其他事件占满（超过 `maxConcurrent`）时，显示禁止标记且无法放置。冲突检测钩子可配置为允许覆盖（替换原有事件，通过二次确认 dialog 确认）或严格阻止。

**实现参考**：参考 Schedule-X 闭源 DnD 接口的事件选取-拖拽-放置生命周期 + Nop SourceRequest 模式用于最终提交。拖拽过程中的坐标转换：鼠标像素坐标 → 日历矩阵行列索引 → 目标 resourceId + date。

> 这些事件/句柄应在实施前补充到 §8 事件表和组件句柄表中。

### §12.2 拖拽创建事件设计要点（v2）

用户通过长按空白单元格进入创建模式，拖拽覆盖多个单元格后选择班次类型。

**交互流程**：

1. **进入创建模式**：pointerdown 在空白单元格（不含任何事件）保持 300ms → 单元格背景变为脉冲蓝色 + 震动反馈（移动端）
2. **拖拽覆盖**：pointermove 沿单元格网格方向拖拽，覆盖的单元格高亮为浅蓝色区域，显示待创建区域的起止提示
3. **选择班次类型**：pointerup 弹窗展示可用班次类型列表（从字典动态加载，如早班/中班/晚班/休息），每类型包含色块预览 + 名称
4. **确认创建**：选择类型后触发 `onEventCreate`（payload: `{ resourceId, startDate, endDate, type }`），新事件块以对应类型色块渲染
5. **取消**：弹窗点击空白区域或按 Escape 关闭，覆盖区域清除

**班次类型加载**：通过 `shiftTypes: SchemaValue` 数据源加载，数据格式 `Array<{ id, label, color, startTime, endTime }>`。类型选择弹窗使用 Flux dialog region 实现。

> 这些事件/句柄应在实施前补充到 §8 事件表和组件句柄表中。

`shiftTypes: SchemaValue` 应在实施前补充到 CalendarSchema §4 中，作为班次类型字典的数据源字段。

### §12.3 资源分组展开/折叠设计要点（v2）

支持资源的层级组织，允许按部门/团队等维度分组展开/折叠显示。

**嵌套资源模型**：

```typescript
interface CalendarResource {
  // ... 既有字段
  parent?: string; // 父资源 ID（扁平 FK 方式）
  resources?: CalendarResource[]; // 子资源数组（可选，仅分组资源使用）
}
```

资源模型采用扁平引用（`parent?: string` FK 方式），嵌套树 `resources[]` 仅用于展开/折叠分组展示，两种模式共存：数据存储用扁平 FK，渲染时通过 `parent` 字段重建树。

**展开/折叠状态**：

- 状态存储在 scope 中（状态 path 如 `calendar.collapsedGroupIds`），格式为 `Set<string>`（折叠的资源 ID 集合）
- 分组行显示父级资源名 + 展开图标（Lucide `chevron-right` / `chevron-down`）
- 折叠时该分组下所有子资源行隐藏，仅显示父级行
- 父级行的时间线区域聚合该分组下所有子资源的事件（以灰色半透明块表示"有排班"）

**渲染结构**（参考 Schedule-X Resource 模型）：

```html
<div data-slot="calendar-resource-row" data-resource-id="dept-001" data-resource-type="group">
  <div data-slot="calendar-resource-header">
    <button data-slot="calendar-expand-toggle" data-expanded="true">▼</button>
    <span>生产部</span>
  </div>
  <div data-slot="calendar-cells">（聚合事件预览）</div>
</div>
<div data-slot="calendar-resource-row" data-resource-id="emp-001" data-resource-parent="dept-001">
  ...
</div>
```

### §12.4 跨日事件连接线设计要点（v2）

多日拆分块之间的视觉连接，仅月视图显示。

**连接规则**：

- 同一 `eventId` 在多日被拆分为多个单日块（`is-split`），块之间使用 SVG 弧形连接线
- 连接线：居中浅灰 1px dashed，从上一块的右下角延伸到下一块的左上角
- **hover 高亮**：当鼠标悬浮任一拆分块时，连接线变为 2px solid blue（`#3b82f6`），对应所有拆分块同步高亮

**实现方式**：在月视图矩阵容器之下渲染一层 SVG overlay（`position: absolute; pointer-events: none`），计算每对相邻拆分块的绝对坐标（`getBoundingClientRect`），绘制 `<path>` 弧形路径。hover 时切换 SVG 的 class。

**性能考虑**：跨日事件数量通常不多（排班场景中跨日连续班次占比 < 5%），SVG 元素数量可控。hover 高亮通过 CSS class 切换实现，无需重绘 SVG。

### §12.5 批量排班设计要点（v3）

允许用户一次性为多个资源、多天设置相同的班次。

**交互流程**：

1. **选择范围**：用户拖拽或点击选择日期范围（连续多天），结合按住 Ctrl/Cmd 多选资源行
2. **选择班次**：统一设置弹窗中选择目标班次类型
3. **预览差异**：表格展示所有受影响单元格的新旧对比，分为三类：
   - **新增**（原为空 → 设置为目标班次，绿色标记）
   - **变更**（原有其他班次 → 目标班次，黄色标记）
   - **冲突**（目标时段已有冲突事件，红色标记）
4. **确认提交**：点击确认后触发 `onBatchSchedule` 事件（payload: `{ resourceIds, dateRange: { from, to }, shiftTypeId, changes: CellChange[] }`）

> 这些事件/句柄应在实施前补充到 §8 事件表和组件句柄表中。

**冲突单元格标记**：在预览阶段，冲突单元格以红色底 + 白色"冲突"文字标记，hover 显示冲突详情（原事件类型、时间段）。用户可选择跳过冲突单元格或覆盖。

**撤销入口**：批量排班操作通过命令模式注册到 undo stack，可在操作日志中撤销整批操作。

### §12.6 日历导入/导出设计要点（v3）

支持与外部日历系统进行数据交换。

**导入（iCal 格式）**：

- 接受 `.ics` 文件拖入或文件选择器上传
- 使用 `ical.js` 解析库解析 iCal 格式
- 解析结果映射：`VEVENT` → `CalendarEvent`，`VALARM` 忽略
- 解析后的冲突检测（同人同天已有排班）→ 显示冲突报告，用户选择跳过/覆盖
- 导入动作：`component:importFromIcal`，参数 `{ file: File }`

> 这些事件/句柄应在实施前补充到 §8 事件表和组件句柄表中。

**导出**：

| 格式 | 触发动作                 | 内容                                           |
| ---- | ------------------------ | ---------------------------------------------- |
| iCal | `component:exportAsIcal` | 标准 `.ics` 文件下载，包含 VEVENT + 资源标识   |
| JSON | `component:exportAsJson` | `CalendarEvent[]` JSON 文件，含完整 meta       |
| CSV  | `component:exportAsCsv`  | 行列结构：资源,日期,班次类型,开始时间,结束时间 |

参考 Schedule-X ical plugin 的设计思路，将导入/导出逻辑封装为独立模块，不与主渲染逻辑耦合。

### §12.7 时区处理设计要点（v3）

员工排班涉及跨时区协调或国际化部署时的时区处理。

**存储规范**：

- 所有排班事件以 UTC 日期时间存储（`start` / `end` 为 ISO 格式，含 `Z` 后缀或偏移量）
- 每条事件记录附带 `timezoneId`（IANA 时区 ID，如 `Asia/Shanghai`），标明该排班的意图时区

**显示转换**：

- 渲染时通过 `Intl.DateTimeFormat` + `timeZone` 选项将 UTC 时间转换为当前用户时区或资源所在时区
- 日期格标签使用 `Intl.DateTimeFormat` 的 `weekday` / `day` 本地化显示
- 同一日历视图可配置为显示指定时区（通过 `displayTimezone` schema 字段）

`displayTimezone?: string` 字段应在实施前补充到 CalendarSchema §4 中。

**时区选择器**：在日历 header 区域提供时区切换下拉框，内容为 `Intl.supportedValuesOf('timeZone')` 列表，按地区分组。选择变更时页面重新渲染而不刷新数据。

**注意事项**：

- 排班场景中"天"的边界以资源时区为准（而非 UTC 天）
- 跨时区排班时系统需明确标注资源所在时区，避免误解
- 夏令时切换日需特殊处理：`Intl.DateTimeFormat` 自动处理，但需确保 UI 显示日期与实际排班日期一致
