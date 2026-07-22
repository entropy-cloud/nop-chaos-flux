# Kanban 组件设计

## 1. 组件定位

- `kanban` 是多列卡片式管理面板 renderer，卡片可通过拖拽在列间和列内重新排序。
- 典型场景：招聘 pipeline、CS 工单跟踪、CRM 销售机会阶段、项目任务看板、采购审批流程可视化。
- 核心交互是**拖拽更新业务状态**：卡片从"待办"列拖到"进行中"列即触发了状态迁移。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无原生看板组件。开源生态参考三个方向（调研报告 `docs/analysis/complex-controls/research-kanban.md`）：
  - **react-kanban-kit** (RKK)：扁平字典 BoardData 模型 + `@atlaskit/pragmatic-drag-and-drop` + 虚拟滚动 — 最推荐参考，数据模型与 Flux store normalize 模式天然对齐。
  - **react-kanban-simple**：嵌套树模型 + `@hello-pangea/dnd` + 纯函数 helpers（`moveCard`/`addCard` 等可直接作 reducer）。
  - **SVAR Kanban**：分离 columns[]/cards[] + action/observer/interceptor 三件套 API 模式；action 系统设计可参考。
- Planka 是全栈应用（Redux ORM + WebSocket），太重，Flux 不复制其服务端，仅参考数据模型（Card-Label M:N、活动日志）。

### Flux 决策表

| 能力                     | 采纳        | 不采纳            | 理由                                                                                                   |
| ------------------------ | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| 卡片跨列拖拽             | **P0 实现** | —                 | 看板核心交互；pragmatic-dnd `attachClosestEdge` 精确定位放置位置                                       |
| 列内卡片排序             | **P0 实现** | —                 | 同跨列拖拽同一机制                                                                                     |
| 卡片自定义渲染模板       | **P0 实现** | —                 | cardTemplate region 和 configMap 双重路径                                                              |
| 列头自定义渲染           | **P0 实现** | —                 | columnHeader region                                                                                    |
| 纯函数状态 helpers       | **P0 实现** | —                 | `moveCard`/`moveColumn`/`addCard`/`removeCard` 直接作为 store reducer                                  |
| 扁平字典 BoardData       | **P0 采用** | 嵌套树 / 分离数组 | 与 Flux store normalize 对齐，Column 和 Card 统一为 BoardItem                                          |
| 列重新排序               | **P1 实现** | —                 | 列 header 拖拽手柄                                                                                     |
| 卡片过滤/搜索            | **P1 实现** | —                 | `filterText` + `filterCard` 表达式                                                                     |
| configMap 卡片类型分发   | **P1 实现** | —                 | 同一看板内渲染不同类型卡片（普通卡片/分隔线/脚注）                                                     |
| 新增列/卡片              | **P2 实现** | —                 | 通过 `addCard`/`addColumn` helper + action 编排                                                        |
| 虚拟滚动                 | **P2 实现** | —                 | `virtua` 库，每列独立虚拟化实例                                                                        |
| 列折叠                   | **P2 实现** | —                 | 列 header 折叠按钮，collapsed state 本地管理                                                           |
| 列宽拖拽调整             | P3 deferred | —                 | 列宽度通过 `columnWidth` 配置，拖拽调整暂不做                                                          |
| Column 渲染走 configMap  | —           | **不采纳**        | Column 是容器（含 header/可滚动卡片列表/footer），不是简单 render 函数；由 `KanbanColumn` 组件独立渲染 |
| 活动日志                 | P3 deferred | —                 | 不内置活动日志实体，通过 `onCardMove` 事件消费方自行记录                                               |
| 实时同步                 | P3 deferred | —                 | 数据源层职责，不内置 WebSocket                                                                         |
| amis 字符串脚本事件      | —           | **不采纳**        | Flux action schema 统一处理                                                                            |
| 组件级 `api`（自带请求） | —           | **不采纳**        | 请求下沉 data-source（X3 原则）                                                                        |

## 3. Flux 中的 renderer/type 定义

- `type: "kanban"`
- `sourcePackage: "@nop-chaos/flux-renderers-scheduling"`
- 继承 `BaseSchema`

## 4. schema 设计

### 4.1 数据模型（运行期）

扁平字典结构（参考 RKK BoardData）：

```typescript
import type { SchemaObject } from '@nop-chaos/flux-core';

interface BoardData {
  [id: string]: BoardItem;
}

interface BoardItem extends SchemaObject {
  id: string;
  type: 'root' | 'column' | 'card' | 'divider';
  parentId?: string;
  children: string[];
  data: Record<string, any>;
  meta: Record<string, any>;
  title?: string;
  content?: string;
}
```

> **parentId 不变式**：每个非根条目必须将其容器的 ID 作为 parentId；parentId 必须与 children[] 引用一致。

### 4.2 Schema 字段

```typescript
interface KanbanSchema extends BaseSchema {
  type: 'kanban';

  /** BoardData 扁平字典数据，支持表达式绑定 */
  data: SchemaValue;

  /** configMap：卡片类型到渲染配置的映射（仅分发卡片类型，不处理 column） */
  configMap?: Record<string, KanbanCardConfig>;

  /** 列头 region（每个列可重复） */
  columnHeader?: RegionSchema;

  /** 列头工具栏 region（如筛选/排序控件） */
  columnHeaderToolbar?: RegionSchema;

  /** 卡片模板 region（每张卡片可重复） */
  cardTemplate?: RegionSchema;

  /** 列底部 region */
  columnFooter?: RegionSchema;

  /** 看板空态 region（`data` 无列时显示） */
  empty?: RegionSchema;

  /** 列配置（可选覆盖 data 中的列元信息） */
  columnsConfig?: Record<string, KanbanColumnConfig>;

  /** 加载态（数据加载中或表达式尚未 resolve） */
  loading?: RegionSchema;

  /** 搜索/过滤文本 */
  filterText?: string;

  /** 自定义过滤函数表达式（row scope 下求值） */
  filterCard?: string;

  /** 标签筛选 ID 数组 */
  filterTags?: string[];

  /** 列宽度策略 */
  columnWidth?: number | 'auto' | 'equal';

  /** 是否启用列拖拽排序 */
  columnDraggable?: boolean;

  /** 拖拽开关 */
  draggable?: boolean;

  /** 事件 */
  events?: KanbanEvents;

  /** 列排序状态 path（scope-owned） */
  columnsOrderStatePath?: string;

  /** 列排序 ownership */
  columnsOrderOwnership?: 'local' | 'controlled' | 'scope';

  /** 折叠状态 path */
  collapsedStatePath?: string;

  /** 折叠 ownership */
  collapsedOwnership?: 'local' | 'controlled' | 'scope';

  /** 生命周期动作 */
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;

  /** per-slot 额外 CSS class */
  columnHeaderClassName?: string;
  cardClassName?: string;
  columnFooterClassName?: string;

  /** 交互坐标 ownership path */
  kanbanOwnership?: string;
  kanbanStatePath?: string;
  statusPath?: string;
}

interface KanbanCardConfig {
  render: RegionSchema; // 卡片渲染 region
  isDraggable?: boolean; // 该类型卡片是否可拖拽
  className?: string; // 卡片的额外 CSS class
}

interface KanbanColumnConfig {
  title?: string;
  width?: number | string;
  collapsed?: boolean;
  cardLimit?: number;
  color?: string;
}

interface KanbanEvents {
  onCardMove?: ActionSchema;
  onCardClick?: ActionSchema;
  onColumnReorder?: ActionSchema;
  onColumnClick?: ActionSchema;
  onCardAdd?: ActionSchema;
  onCardRemove?: ActionSchema;
}
```

### 4.3 事件 payload 约定

> 注意：所有事件负载中的 fromIndex/toIndex 均指数据索引（在未过滤的 children[] 数组中的位置），而非视觉渲染位置。组件在触发事件前应将视觉索引转换为数据索引。

```typescript
// onCardMove payload
{
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  fromIndex: number;
  toIndex: number;
  card: BoardItem;
}

// onColumnReorder payload
{
  columnId: string;
  fromIndex: number;
  toIndex: number;
}

// onCardClick payload
{
  cardId: string;
  columnId: string;
  index: number;
  card: BoardItem;
}
```

## 5. 字段分类

| 字段                                               | 分类                   | 说明                                          |
| -------------------------------------------------- | ---------------------- | --------------------------------------------- |
| `data`                                             | props (source-enabled) | 表达式或 data-source 输出；BoardData 扁平字典 |
| `configMap`                                        | props                  | 静态配置                                      |
| `columnHeader`                                     | region                 | 列头区域模板                                  |
| `columnHeaderToolbar`                              | region                 | 列头工具栏区域模板                            |
| `cardTemplate`                                     | region                 | 卡片区域模板                                  |
| `columnFooter`                                     | region                 | 列底部区域模板                                |
| `empty`                                            | region                 | 空态区域模板                                  |
| `columnsConfig`                                    | props                  | 列元配置（静态/表达式）                       |
| `filterText`                                       | props                  | 搜索关键词（表达式绑定）                      |
| `filterCard`                                       | props                  | 过滤函数表达式                                |
| `filterTags`                                       | props                  | 标签筛选 ID 数组                              |
| `columnWidth`                                      | props                  | 列宽策略                                      |
| `columnDraggable`                                  | props                  | 列拖拽开关                                    |
| `draggable`                                        | props                  | 全局拖拽开关                                  |
| `columnsOrderStatePath`                            | props                  | scope path 字符串                             |
| `collapsedStatePath`                               | props                  | scope path 字符串                             |
| `columnsOrderOwnership`                            | props                  | 列排序 ownership                              |
| `collapsedOwnership`                               | props                  | 列折叠 ownership                              |
| `columnHeaderClassName`                            | props                  | 列头额外 CSS class                            |
| `cardClassName`                                    | props                  | 卡片额外 CSS class                            |
| `columnFooterClassName`                            | props                  | 列底部额外 CSS class                          |
| `onMount`、`onUnmount`                             | meta                   | 继承 BaseSchema 生命周期动作                  |
| `kanbanOwnership`、`kanbanStatePath`、`statusPath` | props                  | 交互坐标 ownership 路径                       |
| `id`、`className`、`disabled`、`visible`、`hidden` | meta                   | 继承 BaseSchema 元数据通道                    |
| `loading`                                          | region                 | 加载态区域模板                                |
| `events.onCardMove`                                | event                  | ActionSchema                                  |
| `events.onCardClick`                               | event                  | ActionSchema                                  |
| `events.onColumnReorder`                           | event                  | ActionSchema                                  |
| `events.onColumnClick`                             | event                  | ActionSchema                                  |
| `events.onCardAdd`                                 | event                  | ActionSchema                                  |
| `events.onCardRemove`                              | event                  | ActionSchema                                  |

## 6. regions 与 slot 约定

- `columnHeader`：受控 region，`params: ['column', 'index']`。每个列头复用同一模板，通过 `$slot.column.id` / `$slot.column.title` / `$slot.index` 引用当前列数据。未声明时默认渲染列标题 + 卡片计数。
- `columnHeaderToolbar`：受控 region，`params: ['column', 'index']`。列头右侧工具栏区域，用于放置筛选/排序/添加按钮等操作。
- `cardTemplate`：受控 region，`params: ['card', 'column', 'index']`。每张卡片复用同一模板，通过 `$slot.card` 访问卡片数据、`$slot.column` 访问所属列。未声明时默认渲染卡片标题 + 元数据。
- `columnFooter`：受控 region，`params: ['column', 'index']`。列底部区域，用于放置"添加卡片"按钮等。
- `empty`：受控 region，`params: []`。看板无列时渲染的空态提示。
- `loading`：受控 region，`params: []`。首次 data resolve 前或 data-source 加载中显示。缺省渲染为脉冲骨架占位（三列缩略卡片）。
- `configMap` 中的 `render`：受控 region，`params: ['card', 'column', 'index']`。当同时指定 configMap 和 cardTemplate 时，configMap 优先于 cardTemplate。卡片渲染优先级：configMap[type].render → cardTemplate → 默认卡片渲染。configMap 不处理 column 容器渲染。
- 空列时，column 容器本身始终是有效的 drop target，确保卡片可拖入无卡片的列。
- 空列时（column.children.length === 0），column-body 渲染为虚线边框占位区域 + '拖拽卡片到此处' 浅灰提示文字（若无拖拽则仅显示最小占位高度 60px）。

## 7. 运行期状态归属

| 状态               | Owner                    | 说明                                                                                                                 |
| ------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 卡片/列数据        | **数据源控制**           | `data` 表达式或 `data-source` 输出；内部只读消费，不修改源数据                                                       |
| 拖拽中状态         | **local**                | `useKanbanDnd` hook 内部管理；拖拽结束后触发 `onCardMove`/`onColumnReorder` 事件                                     |
| 状态 path 交互坐标 | **scope-owned 或 local** | `kanbanOwnership`/`kanbanStatePath`/`statusPath` 指定 scope path 时为 scope-owned；否则 local                        |
| 列折叠状态         | **scope-owned 或 local** | `collapsedOwnership` + `collapsedStatePath` 组合控制；`collapsedOwnership` 指定范围时 path 生效，否则 local          |
| 列顺序             | **scope-owned 或 local** | `columnsOrderOwnership` + `columnsOrderStatePath` 组合控制；`columnsOrderOwnership` 指定范围时 path 生效，否则 local |
| 过滤文本           | **local**                | 渲染期派生，不持久                                                                                                   |
| 卡片计数           | **派生**                 | 从 `column.children.length` 实时计算                                                                                 |

> **乐观更新策略**：v1 采用悲观更新模式。拖拽完成后触发 `onCardMove` 事件，等待数据源确认后才真正更新 DOM。中断/失败时回滚到拖拽前位置。

## 8. 事件、动作与组件句柄能力

### 事件

- `onMount`：组件挂载完成后触发。
- `onUnmount`：组件卸载前触发。
- `onCardMove`：卡片跨列或列内移动完成时触发。
- `onCardClick`：点击卡片时触发。
- `onColumnReorder`：列重新排序完成时触发。
- `onColumnClick`：点击列头时触发。
- `onCardAdd`：（P2）新增卡片时触发。
- `onCardRemove`：（P2）删除卡片时触发。

### 组件句柄

- `component:scrollToCard(cardId: string)`：滚动到指定卡片位置。失败路径：`not-mounted`、`not-visible`、`card-not-found`
- `component:scrollToColumn(columnId: string)`：滚动到指定列。失败路径：`not-mounted`、`not-visible`、`column-not-found`
- `component:addCard(columnId: string, card: BoardItem, options?: { index?: number })`：（P2）新增卡片到指定列。失败路径：`not-mounted`、`not-visible`、`column-full`（WIP 限制时）
- `component:removeCard(cardId: string)`：（P2）移除卡片。失败路径：`not-mounted`、`not-visible`、`card-not-found`
- `component:moveCard(cardId: string, toColumnId: string, toIndex: number)`：程序式移动卡片。失败路径：`not-mounted`、`not-visible`、`card-not-found`、`column-not-found`、`column-full`
- `component:collapseColumn(columnId: string, collapsed: boolean)`：切换列折叠。失败路径：`not-mounted`、`not-visible`、`column-not-found`
- `component:getData(): BoardData`：获取当前看板数据快照。失败路径：`not-mounted`、`not-visible`

## 9. 数据源、表达式、导入能力接入点

- `loadAction?: ActionSchema` — schema 层数据加载主入口，走 runtime.dispatch() 而非独立 fetch。复杂数据场景通过 data-source 节点声明。
- `data` 是唯一的 source-enabled 字段，支持：
  - 静态 JSON：`{ "root": { "children": ["col1","col2"] }, "col1": { ... } }`
  - 表达式：`"${kanbanBoardData}"`
  - data-source：经 `source` 路径由上游 `data-source` renderer 提供
- `filterText` 支持表达式绑定（如 `${searchKeyword}`）
- `columnsConfig` 支持表达式绑定
- `filterCard` 为原始表达式（不包裹 `${}`），在行 scope 下延迟求值

## 10. 样式与 DOM marker 约定

| DOM 元素     | marker class                    | data-slot                   |
| ------------ | ------------------------------- | --------------------------- |
| 看板根容器   | `nop-kanban`                    | `kanban`                    |
| 列容器       | `nop-kanban-column`             | `kanban-column`             |
| 列头         | `nop-kanban-column-header`      | `kanban-column-header`      |
| 列折叠内容区 | `nop-kanban-column-body`        | `kanban-column-body`        |
| 列底部       | `nop-kanban-column-footer`      | `kanban-column-footer`      |
| 卡片容器     | `nop-kanban-card`               | `kanban-card`               |
| 卡片内容     | `nop-kanban-card-content`       | `kanban-card-content`       |
| 拖拽中卡片   | `data-dragging="true"`          | —                           |
| 拖拽悬停列   | `data-drop-target="true"`       | —                           |
| 空列占位     | `nop-kanban-column-empty`       | `kanban-column-empty`       |
| 空看板       | `nop-kanban-empty`              | `kanban-empty`              |
| 列拖拽手柄   | `nop-kanban-column-drag-handle` | `kanban-column-drag-handle` |
| 新增列按钮   | `nop-kanban-adder`              | `kanban-adder`              |

- 列默认宽度 280px，可通过 `columnWidth` 覆盖。

  > `className`、`classAliases` 继承自 BaseSchema，用于覆写根节点样式。`classAliases` 短名→Tailwind 串映射由宿主应用配置。

- 列间距 12px，背景色通过 CSS 变量 `--kanban-column-bg` 控制。
- 拖拽时卡片从原位置以 0.5 透明度 + scale(0.95) 缩小，跟随光标渲染带 shadow（box-shadow: 0 4px 12px rgba(0,0,0,0.15)）的 ghost 副本。放置目标列边框高亮 2px #3b82f6，目标卡片间隙显示 2px 蓝色指示线。
- Test anchor 优先顺序：getByRole > data-slot > .nop-\* > data-testid。

## 11. 实现拆分建议

```
src/kanban/
├── index.ts                       # 导出 KanbanRenderer
├── kanban.tsx                     # 主渲染器：装配 KanbanContext + 区域编排
├── kanban.types.ts                # BoardData/BoardItem/KanbanSchema 类型
├── schemas.ts                     # schema 定义 + 注册
├── components/
│   ├── kanban-board.tsx           # 看板容器：水平滚动、列集合
│   ├── kanban-column.tsx          # 单列：drop target + header + body + footer
│   ├── kanban-card.tsx            # 单卡片：drag source + 模板渲染
│   └── kanban-adder.tsx           # 新增列/卡片按钮（P2）
├── hooks/
│   ├── use-kanban-dnd.ts          # 拖拽 hook：注册 drag/drop target、monitor
│   └── use-kanban-store.ts        # 状态 hook：data 归一化、列顺序、折叠
└── utils/
    ├── kanban-reorder.ts          # 纯函数：moveCard/moveColumn/addCard/removeCard
    ├── kanban-filter.ts           # 纯函数：filterCards 按 filterText/filterCard 过滤
    └── kanban-data.ts             # 纯函数：normalizeKanbanData、flatten/denormalize
```

### 11.1 组件职责

- **kanban.tsx （主渲染器）**：接收 schema，构建 `KanbanContext`，编排各 region 的渲染。不直接处理拖拽逻辑。
- **kanban-board.tsx**：水平滚动容器，维护列顺序（scope-owned 或 local），遍历列调用 `KanbanColumn`。
- **kanban-column.tsx**：单个列的容器。注册为 `dropTargetForElements`，处理列内卡片放置。包含 header region、body（卡片列表）、footer region。body 区域检测空列态。
- **kanban-card.tsx**：注册为 `draggable` + `dropTargetForElements`（用于列内精确排序）。拖拽时通过 `useKanbanDnd` hook 发布拖拽状态。
- **kanban-adder.tsx**：新增列/卡片的 inline 输入按钮（P2）。

### 11.1.1 DnD 放置目标解析

列容器注册 dropTargetForElements（后备目标），列内的每张卡片也注册 dropTargetForElements（精确目标）。pragmatic-dnd 的命中测试优先级：卡片目标优先于列容器目标。attachClosestEdge 处理卡片间间隙定位。空列时，列容器自身作为唯一后备目标。

### 11.2 Hook 职责

- **useKanbanDnd**：封装 `@atlaskit/pragmatic-drag-and-drop` 的 `draggable`/`dropTargetForElements`/`attachClosestEdge` 注册。暴露 `isDragging`、`isDraggingOver`、`closestEdge` 等响应式状态。管理拖拽开始→拖拽结束的完整生命周期。KanbanCard 组件使用 React.memo（比较 card.content + column.id + index），拖拽过程中通过 CSS pointer-events: none 减少非活跃卡片的渲染触发。KanbanColumn 使用 React.memo 按 column.id + children.length + 折叠状态 决定是否重渲染。
- **useKanbanStore**：接收 `data` prop → 归一化为 `BoardData`。管理列顺序（`columnsOrderStatePath`）和折叠状态（`collapsedStatePath`）。提供列和卡片的只读访问方法。

### 11.3 纯函数 utils

- **kanban-reorder.ts**：
  - `moveCard(data: BoardData, cardId, toColumnId, toIndex): BoardData` — 返回新 BoardData
  - `moveColumn(data: BoardData, fromIndex, toIndex): BoardData`
  - `addCard(data: BoardData, columnId, card): BoardData`
  - `removeCard(data: BoardData, cardId): BoardData`
  - `changeCard(data: BoardData, cardId, changes): BoardData`
  - `addColumn(data: BoardData, column, afterIndex?): BoardData`
  - `removeColumn(data: BoardData, columnId): BoardData`
- **kanban-filter.ts**：
  - `filterCards(data: BoardData, filterText: string, filterCard?: string): BoardData` — 过滤卡片但保留列结构。filterText 变更时 300ms debounce 触发 filterCards 重计算，避免每次按键重排列内卡片。
- **kanban-data.ts**：
  - `normalizeKanbanData(rawData): BoardData` — 输入归一化
  - `getColumnCards(data: BoardData, columnId): BoardItem[]` — 获取列内卡片列表
  - `getColumns(data: BoardData): BoardItem[]` — 获取所有列

### 11.4 实现顺序

| 阶段        | 内容                                                                                    | 依赖    |
| ----------- | --------------------------------------------------------------------------------------- | ------- |
| P0 核心     | kanban-data.ts + kanban-reorder.ts 纯函数 + kanban.types.ts                             | 无      |
| P0 渲染     | kanban.tsx + kanban-board.tsx + kanban-column.tsx + kanban-card.tsx（基础渲染，无拖拽） | P0 核心 |
| P0 拖拽     | useKanbanDnd hook + pragmatic-dnd 集成                                                  | P0 渲染 |
| P1 增强     | columnHeader/cardTemplate/columnFooter region + configMap                               | P0 拖拽 |
| P1 过滤     | kanban-filter.ts + filterText/filterCard                                                | P0 渲染 |
| P1 列重排   | column drag + onColumnReorder                                                           | P0 拖拽 |
| P2 增删     | kanban-adder.tsx + addCard/removeCard/addColumn                                         | P0 核心 |
| P2 列折叠   | collapsed state + scope path                                                            | P0 渲染 |
| P2 虚拟滚动 | virtua 库集成                                                                           | P0 渲染 |

## 12. 风险、取舍与后续阶段

### 12.1 DnD 库选择

选择 `@atlaskit/pragmatic-drag-and-drop` 而非 `@dnd-kit`：

- RKK 已验证于 Kanban 场景，对 React 生命周期友好（非 HOC、ref 注册方式）。
- `attachClosestEdge` 精确定位卡片间/列间放置位置。
- **风险**：API 仍在演进（目前 v2 阶段），需锁定版本并在 `useKanbanDnd` 中封装抽象层隔离升级风险。
- **备选**：`@dnd-kit` 已在 form-advanced 中使用（array-editor），可复用 SKU；但无 `attachClosestEdge` 等价 API，列内精确排序需要手写放置检测。若 pragmatic-dnd 后续版本不兼容，切换成本为 `useKanbanDnd` 内部实现替换（纯函数 helpers 不受影响）。

### 12.2 虚拟滚动复杂度

多列看板的虚拟滚动比平面列表复杂——每列需要独立的 `virtua` 虚拟化实例，且列宽、内容高度各异。P2 实现时需关注：

- 每列 `VirtualList` 的 scroll container 高度计算。
- 卡片拖拽到虚拟列表中的插入位置检测——虚拟列表只渲染可见项，不可见区域插入需要 scroll-to-position。
- P0/P1 先不做虚拟滚动，仅渲染全部卡片（适用于 < 200 卡片的业务场景）。

### 12.3 空列 drop target

参见 §6。空列时 column 容器本身始终是有效的 drop target（已在核心 regions 规范中定义）。

### 12.4 数据模型取舍

- 扁平字典 BoardData 是 Flux store normalize 模式的自然延伸，但 schema authoring 时编写完整字典较繁琐。建议提供 `normalizeKanbanData` 接受简化格式（如 `{ columns: [{ id, title, cards: [...] }] }` 的嵌套数组）自动转为扁平字典。
- `children[]` 引用关系支持任意嵌套（列→卡片→子卡片），但 P0 仅支持列→卡片两层；子卡片渲染 deferred。

### 12.5 region 性能

`cardTemplate` 和 `columnHeader` 是 per-item region 渲染，滚动/拖拽时频繁触发。需注意：

- Region 编译结果缓存（region 不变时跳过重编译）。
- 拖拽期间使用 `React.memo` 或 CSS `pointer-events: none` 减少非必要渲染。

### 12.6 后续阶段

| 版本 | 内容                                                         |
| ---- | ------------------------------------------------------------ |
| P0   | 核心渲染 + 拖拽排序（moveCard/moveColumn）+ 基础 region 模板 |
| P1   | configMap 卡片分发 + 过滤/搜索 + 列重排 + 列折叠             |
| P2   | 增删列/卡片 + 虚拟滚动 + 列宽调整 + 程序式句柄               |
| P3   | 活动日志集成 + undo/redo + 看板导出/快照                     |

### 12.7 列宽调整设计要点（P3）

列头边缘提供拖拽调整手柄，用户通过拖拽改变列宽。

**交互机制**：

- 每个列头的右边缘渲染一个 4px 宽的不可见手柄（`data-slot="kanban-column-resize-handle"`）
- hover 时显示为 2px 蓝色竖线（`#3b82f6`），光标变为 `col-resize`
- 拖拽过程中列宽实时跟随鼠标移动，其他列自动补偿总宽度

**约束**：

```typescript
interface KanbanColumnResizeConfig {
  minWidth?: number; // 最小列宽，默认 200px
  maxWidth?: number; // 最大列宽，默认 600px
  defaultWidth?: number; // 默认列宽，默认 280px
}
```

**持久化**：列宽通过 `columnWidthsStatePath` 保存到 scope，结构为 `Record<columnId, number>`（像素值）。看板卸载后持久化读取，跨会话保持用户自定义列宽。

**autofit 自适应模式**：声明 `columnWidth: 'auto'` 时，列宽根据列内最长卡片内容自动计算（`min-content` + padding 缓冲），忽略用户拖拽设置；切换回 `'equal'` 时恢复等宽分割。两种模式下 col-resize 手柄依然可拖拽临时覆盖。

### 12.8 WIP 限制设计要点（P3）

WIP（Work In Progress）限制用于约束每列最大卡片数量，防止在制品积压。

**配置**：

```typescript
interface KanbanColumnConfig {
  cardLimit?: number; // 列最大卡片数，未设置或不限制
  wipStrict?: boolean; // 严格模式：阻止拖入超限列，默认 false
}
```

**超限警告**：

- `cardLimit` 被突破时，列头卡片计数显示为红色 `"${current}/${limit} +N"`（N = 超出数量）
- 列边框变为红色（`#ef4444`），持续闪烁 2s 后稳定为浅红边框
- 列头显示警告图标（Lucide `alert-triangle`）
- 超出卡片使用操作菜单："移至其他列"快速入口

**wipStrict 严格模式**：

- `wipStrict: true` 时，放置目标检测自动排除已达上限的列（`dropTargetForElements` 的 `canDrop` 回调返回 false）
- 拖拽经过超限列时视觉反馈：列背景变为禁止红色，且 ghost 无法落入该列
- `wipStrict: false`（默认）仅警告不阻止：卡片可拖入超限列，但触发 `onCardMove` 事件携带 `overLimit: true`

**软限制 vs 硬限制**：`cardLimit` 作为软限制（超出可继续）；若需硬限制需在后端校验拒绝。`wipStrict` 仅前端阻止 UI 操作，不替代后端校验。

### 12.9 标签/颜色/成员设计要点（P3）

卡片支持标签（tag）、颜色标记（color）和成员头像（member avatar）等元信息展示，参考 Planka Label 系统。

**数据模型扩展**：

```typescript
interface BoardItem {
  // ... 既有字段
  meta?: {
    color?: string; // 卡片标题左侧颜色圆点
    tags?: KanbanTag[]; // 标签数组
    members?: KanbanMember[]; // 成员列表
    // ... 既有字段
  };
}

interface KanbanTag {
  id: string;
  text: string;
  color: string; // 标签背景色
}

interface KanbanMember {
  id: string;
  name: string;
  avatar?: string; // 头像 URL
}
```

**标签渲染**：卡片底部（或自定义 cardTemplate 区域内）展示标签行，每标签为圆角矩形色块 + 文字。标签数量超限时折叠为 "+N" 标记。标签支持 `.nop-kanban-card-tag` marker。

**颜色圆点**：卡片标题左侧 8px 圆形色块，通过 `meta.color` 指定。无颜色时不渲染。支持 `.nop-kanban-card-color-dot` marker。

**成员头像**：卡片右下角展示成员头像层叠（类似 GitHub 评论头像栈）。最多显示 3 个头像，超出显示 "+N" 计数。头像使用 `img` 标签，fallback 为姓名首字母圆形。支持 `.nop-kanban-card-member` marker。

**按标签筛选**：`filterTags: string[]` 字段声明激活标签筛选模式。看板顶部显示所有标签作为可点击的筛选 pill。选中标签时仅显示包含该标签的卡片（多选或关系）。

### 12.10 活动日志设计要点（P3）

活动日志记录看板内所有卡片操作，参考 Planka Action 模型。

**数据模型**：

```typescript
interface KanbanAction {
  id: string;
  type: 'cardMove' | 'cardCreate' | 'cardDelete' | 'cardUpdate' | 'columnCreate' | 'columnDelete';
  actor: { id: string; name: string };
  timestamp: string; // ISO datetime
  detail: {
    cardId?: string;
    fromColumnId?: string;
    toColumnId?: string;
    fromIndex?: number;
    toIndex?: number;
    changes?: Record<string, { from: unknown; to: unknown }>;
  };
}
```

**渲染规则**：

- 日志面板可通过看板右上角"活动日志"按钮打开（浮层或侧边栏）
- 日志按时间倒序排列，每条显示：头像 + 用户名 + 操作描述 + 相对时间
- 操作描述使用模板："张三 将「需求评审」从「待办」移至「进行中」"
- 操作描述中的列名和卡片名可点击，点击后导航到对应列/卡片

**筛选**：按列筛选（`filterColumnId`）、按卡片筛选（`filterCardId`）、按操作者筛选（`filterActorId`）。

**存储**：操作日志由看板外部持久化（通过 `onCardMove` 等事件写入后端），看板组件仅消费 `actions` 数据源。格式与上表对齐。

### 12.11 实时协作设计要点（P3）

多用户同时操作同一看板时的实时同步方案，参考 Planka Socket.IO 实现思路。

**通信机制**：WebSocket（通过 Flux WebSocket 连接层），每条操作作为一条消息广播。消息格式：

```typescript
interface CollabMessage {
  type: 'cardMoved' | 'cardUpdated' | 'cardCreated' | 'cardDeleted' | 'columnReordered';
  actorId: string;
  timestamp: number;
  payload: Record<string, unknown>;
  version: number; // 乐观锁版本号
}
```

**冲突策略**：Last-Write-Wins（LWW），以服务端最终收到的时间戳为准。两个用户同时拖拽同一卡片到不同列时，后到达的操作生效。先到达的操作被覆盖时，触发 `onConflictResolved` 事件通知用户。

**操作合并队列**：本地操作不立即广播，而是进入 100ms 合并队列。同一类型、同一卡片的连续操作合并。例如连续拖拽调整位置，以最后一次位置为准。

**连接状态指示器**：

| 状态         | 显示                       | 行为                                            |
| ------------ | -------------------------- | ----------------------------------------------- |
| connected    | 绿色圆点 "已连接"          | 正常操作                                        |
| reconnecting | 黄色圆点 "重连中…"         | 操作本地已应用，等待同步                        |
| disconnected | 红色圆点 "断线" + 重连按钮 | 操作本地暂存，断线超时 30s 后显示"离线模式"提示 |

**协作边界**：

- 看板内所有变更均产生操作消息（card move/create/delete/update）
- 仅已连接的客户端收到其他客户端的操作并应用
- 新客户端加入时通过 state sync 初始化全量看板状态（通过专用 sync 消息，非逐一重放操作日志）
- 参考 Planka 的 Socket.IO 模型：`boards/${boardId}/cards` 命名空间订阅

> 注意：§2 决策表将实时协作列为"数据源层职责，不内置 WebSocket"。此处为 Flux 层操作广播的技术方案，但实际 WebSocket 连接应在数据源层实现。§12.11 的操作消息格式和冲突策略供数据源层实现参考。
