# Calendar 冲突检测设计

## 1. 概述

Calendar 冲突检测用于识别同一资源（员工/设备）在同一日期内事件时间重叠的情况，提供视觉警告和事件机制。

- 属于 `@nop-chaos/flux-renderers-scheduling` 包
- 核心逻辑：`src/calendar/utils/calendar-layout-utils.ts` — `detectConflicts()`
- 视觉渲染：`src/calendar/components/calendar-month-view.tsx` + `calendar-event-block.tsx`
- 对应 S4.8 work item

## 2. 冲突检测算法

### 2.1 检测函数

```ts
function detectConflicts(input: ConflictInput): ConflictInfo | undefined;
```

**输入**：

- `events`: 当前视图的所有事件列表
- `resourceId`: 目标资源 ID
- `date`: 目标日期字符串 (YYYY-MM-DD)

**输出**：

- `ConflictInfo`（含 `resourceId`, `date`, `overlappingEvents: CalendarEvent[]`）
- 无冲突返回 `undefined`

### 2.2 算法流程

1. **过滤**：从全事件列表中筛选 `resourceId` 匹配、日期与目标日期重叠的事件
2. **阈值检查**：若该资源日期的事件数 < 2，直接返回 `undefined`（无冲突可能）
3. **排序**：按事件 `start` 时间升序排序
4. **扫描**：遍历排序后的事件，维护活跃事件列表 `active[]`
   - 移除 `end <= current.start` 的已结束事件
   - 若 `active[]` 非空，则当前事件与活跃列表中的事件存在时间重叠
   - 将重叠事件加入 `overlapping[]`
5. **返回值**：若 `overlapping[]` 非空，返回 `ConflictInfo`；否则返回 `undefined`

### 2.3 日期重叠判定

```ts
function dateOverlapsOnDay(event: CalendarEvent, dateStr: string): boolean;
```

比较事件的 `start`/`end` 日期与目标日期，只要事件覆盖目标日期的任意部分即为重叠（`eventStart <= dateStr && eventEnd >= dateStr`）。

## 3. 视觉指示

### 3.1 月视图

Calendar 月视图在渲染时遍历每个资源的每天，调用 `detectConflicts()` 构建 `conflictMap`：

```ts
const conflictMap = new Map<string, Set<string>>();
conflictMap.set(`${resource.id}:${dateStr}`, conflictedEventIds);
```

`CalendarEventBlock` 检查 `overlap` 标志：

| 视觉元素            | 条件               | 实现                             |
| ------------------- | ------------------ | -------------------------------- |
| 红色警告边框        | `overlap === true` | `ring-2 ring-red-500` CSS class  |
| 红色圆点指示器      | `overlap === true` | 绝对定位 `bg-red-500` 2x2px 圆点 |
| Tooltip 冲突提示    | `overlap === true` | `title={t('timeConflict')}`      |
| `data-overlap` 属性 | `overlap === true` | `data-overlap="true"`            |

### 3.2 拖拽冲突预览

拖拽事件到目标格子时，通过 CSS class 提供实时视觉反馈：

| class           | 含义     | 触发条件                           |
| --------------- | -------- | ---------------------------------- |
| `drag-ok`       | 可放置   | 目标格无冲突                       |
| `drag-conflict` | 冲突预警 | 目标格存在重叠事件或与现有排班冲突 |

## 4. 事件机制

### 4.1 onConflictDetect

渲染器每资源每天检测到冲突时，可通过 `onConflictDetect` 事件向 schema 层派发：

```ts
interface ConflictInfo {
  resourceId: string;
  date: string;
  overlappingEvents: CalendarEvent[];
}
```

schema 用法：

```json
{
  "type": "calendar",
  "onConflictDetect": {
    "actionType": "toast",
    "args": { "msg": "资源 ${resourceId} 在 ${date} 存在排班冲突" }
  }
}
```

### 4.2 冲突信息在 calendar-cell 中的暴露

冲突检测结果已暴露在 `CalendarCellData` 类型中：

```ts
interface CalendarCellData {
  date: string;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  events: PositionedEvent[];
  conflict?: ConflictInfo;
}
```

## 5. 性能考虑

冲突检测在月视图渲染时触发：复杂度为 `O(resources × days × eventsPerResource × log(eventsPerResource))`（排序步骤）。对于 300 资源 × 31 天 × 每资源 5 事件的典型场景，检测可在数毫秒内完成，不需要额外缓存或虚拟化。

## 6. 配置选项

| 选项               | 类型    | 默认值 | 说明                                                  |
| ------------------ | ------- | ------ | ----------------------------------------------------- |
| `detectConflicts`  | boolean | true   | 是否启用冲突检测。设为 false 可关闭视觉指示和事件触发 |
| `onConflictDetect` | event   | —      | 冲突检测事件 action                                   |

## 7. 测试覆盖

冲突检测逻辑有单元测试覆盖：`src/calendar/utils/calendar-layout-utils.test.ts`：

- 重叠事件检测（同资源同日两个事件重叠）
- 非重叠事件不触发（事件已错开时间）
- 不同资源不触发（交叉资源事件不计入冲突）
- 单事件不触发（单事件不可能自冲突）
