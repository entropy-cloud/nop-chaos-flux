# 看板（Kanban）开源实现调研报告

> 日期：2026-07-20
> 调研项目：react-kanban-kit (MIT), react-kanban-simple v0.0.12 (MIT), Planka v2.1.1 (Fair-code), SVAR Kanban (MIT)
> 参考仓库：`~/sources/complex-controls/react-kanban-kit/`, `react-kanban-simple/`, `planka-app/`

---

## 1. 调研概要

| 项目                | 许可      | DnD 引擎                | 范围     | 数据模型             | 关注点                             |
| ------------------- | --------- | ----------------------- | -------- | -------------------- | ---------------------------------- |
| react-kanban-kit    | MIT       | @atlaskit/pragmatic-dnd | 纯组件   | 扁平字典 (BoardData) | 现代、虚拟滚动                     |
| react-kanban-simple | MIT       | @hello-pangea/dnd       | 纯组件   | 嵌套树               | 双模式(受控/非受控)                |
| Planka              | Fair-code | @hello-pangea/dnd       | 全栈应用 | 关系型 DB            | 完整数据模型、Redux 实践           |
| SVAR Kanban         | MIT       | 自研                    | 纯组件   | 分离数组             | action/observer/interceptor 三件套 |

---

## 2. 各项目深入分析

### 2.1 react-kanban-kit（RKK）— 最推荐参考

**架构要点**：

- 数据模型为**扁平字典** `Record<string, BoardItem>`，所有实体（column/card）统一为 `BoardItem`，父子关系通过 `children[]` ID 数组表达
- DnD 使用 Atlassian 的 `@atlaskit/pragmatic-drag-and-drop`（现代、非 HOC、对 React 生命周期友好）
- 虚拟滚动通过 `virtua` 库实现（默认开启）
- 注意：多列看板的虚拟滚动比平面列表复杂——每列需要独立的虚拟化实例。
- 使用 React Context（`KanbanContext`）透传 props，避免 prop drilling

**数据模型**：

```typescript
interface BoardData {
  root: BoardItem; // 根节点（代表整个看板）
  [key: string]: BoardItem; // 所有列和卡片平铺
}
interface BoardItem {
  id: string;
  title: string;
  parentId: string | null;
  children: string[]; // 子项 ID 列表
  totalChildrenCount: number; // 真实总数（可用于懒加载场景）
  content?: any; // 用户自定义数据
  type?: string; // 卡片类型，用于 configMap 分发
  isDraggable?: boolean; // 单元素拖拽开关
}
```

**拖拽状态机**：

```
onDragStart → onDrag（monitor polling 检测 location.current.dropTargets）→ onDrop → 清理
```

pragmatic-dnd 不使用状态机，而是事件驱动的 monitor 模式。`handleCardDrop` 集中处理 DnD 事件并派发到 `onCardMove`/`onColumnMove` 回调。

**可参考的设计**：

| 设计点                       | 价值 | 说明                                                     |
| ---------------------------- | ---- | -------------------------------------------------------- |
| 扁平字典数据模型             | ★★★  | 适合 Flux store 范式，天然可 normalized                  |
| `children[]` 引用关系        | ★★★  | Column 和 Card 统一为 BoardItem，类型灵活                |
| 拖拽 hook 分离               | ★★★  | `useCardDnd`/`useColumnDnd` 独立 hook                    |
| configMap 渲染器分发         | ★★★  | `{ card: { render, isDraggable }, divider: { render } }` |
| `attachClosestEdge` 定位     | ★★☆  | 精确判断拖拽放置位置                                     |
| `setCustomNativeDragPreview` | ★★☆  | 自定义拖拽预览                                           |
| Column/Header/Footer 可定制  | ★★☆  | 三种渲染区域插槽                                         |
| 虚拟滚动                     | ★★☆  | 大量卡片时核心性能优化                                   |

### 2.2 react-kanban-simple — 双模式 + 纯函数 helper

**架构要点**：

- **Controlled 和 Uncontrolled 双模式**：用户选择状态管理方式
- **纯函数 helper**：`moveCard(board, source, destination)` 等返回新状态，可直接用作 Redux reducer
- 嵌套数据模型（columns 包含 cards 数组）

```typescript
interface Board<TCard extends Card> {
  columns: Column<TCard>[];
}
interface Column<TCard> {
  id: string | number;
  title: string;
  cards: TCard[];
}
interface Card {
  id: string | number;
  title?: string;
  description?: string;
}
```

**纯函数 helpers**（可直接用作 Flux reducer 工具函数）：

```
moveCard(board, source, destination)
moveColumn(board, source, destination)
addCard(board, column, card, options)
removeCard(board, column, card)
changeCard(board, cardId, newCard)
addColumn(board, column)
removeColumn(board, column)
changeColumn(board, column, newColumn)
```

**可参考的设计**：

| 设计点                 | 价值 | 说明                                 |
| ---------------------- | ---- | ------------------------------------ |
| 受控/非受控双模式      | ★★★  | Flux renderer 也可提供两种使用方式   |
| 纯函数 helpers         | ★★★  | 直接可作为 reducer，测试友好         |
| `<TCard extends Card>` | ★★☆  | TypeScript 泛型扩展                  |
| `@hello-pangea/dnd`    | ★★☆  | react-beautiful-dnd 维护版，生态成熟 |

### 2.3 Planka — 完整数据模型参考

**架构要点**：

- 全栈 Trello 替代品，React + Redux + Redux ORM + Redux Saga
- 服务端 Sails.js（Node.js MVC）+ PostgreSQL
- WebSocket 实时同步

**数据模型**（30+ 实体，看板核心）：

```
Project (1) → Board (N)
Board (1) → List (N)  [排序]
Board (1) → Label (N) [多种颜色]
List (1) → Card (N)   [排序，分页]
Card (1) → TaskList (N), Comment (N), Attachment (N), Action (N, 活动日志)
Card ←→ User (M:N, 成员)
Card ←→ Label (M:N, 标签)
```

**可参考的设计**：

| 设计点                                  | 价值 | 说明                                                   |
| --------------------------------------- | ---- | ------------------------------------------------------ |
| Redux ORM 标准化                        | ★★★  | 多实体关系型数据的 Flux 最佳实践                       |
| ActionTypes 模式                        | ★★★  | `CARD_MOVE/CARD_MOVE_SUCCESS/CARD_MOVE_FAILURE` 三件套 |
| 活动日志 (Action 实体)                  | ★★★  | 记录所有看板操作（谁、何时、做了什么）                 |
| Label 颜色系统                          | ★★☆  | 多种颜色的选择和分配                                   |
| Card 多态（project/story）              | ★★☆  | 不同 card 类型不同 UI                                  |
| 列表状态（active/closed/archive/trash） | ★★★  | 软删除流程设计                                         |
| 实时同步                                | ★★☆  | WebSocket + Redux Saga                                 |
| `listChangedAt` 时间戳                  | ★★★  | 优化排序性能的关键字段                                 |

### 2.4 SVAR Kanban — API 三件套

**架构要点**：

- 分离的数据模型：`columns[]` + `cards[]`（cards 通过 `column` 字段关联列）
- action/observer/interceptor 三件套：`api.exec(action)` / `api.on(event)` / `api.intercept(event, fn)`
- 内置 Editor 组件、Toolbar 组件

```typescript
interface ColumnConfig {
  id: string | number;
  label: string;
  cardLimit?: number;
  collapsed?: boolean;
}
interface CardData {
  id: string | number;
  column?: string | number;
  label?: string;
  priority?: number;
  tags?: string[];
  users?: { id: string; name: string }[];
}
```

**API 三件套模式**（这是可参考的核心）：

```
api.exec('move-card', { cardId, toColumn, index })  // 派发动作
api.on('move-card', (ev) => updateUI())             // 观察事件
api.intercept('move-card', (ev) => false)           // 拦截/取消事件
```

**可参考的设计**：

| 设计点                      | 价值 | 说明                                   |
| --------------------------- | ---- | -------------------------------------- |
| action/observer/interceptor | ★★★  | 非常适合 Flux action middleware 模式   |
| 分离数据模型                | ★★☆  | columns + cards 分离，map 到 REST 友好 |
| 独立 Editor 组件            | ★★☆  | 与看板分离的编辑弹窗组件               |

---

## 3. 数据模型对比与选择

| 模型     | 代表项目            | 优点                       | 缺点               | 适合场景        |
| -------- | ------------------- | -------------------------- | ------------------ | --------------- |
| 扁平字典 | RKK                 | 归一化、地址化、支持懒加载 | 读取需遍历         | Flux store 模式 |
| 嵌套树   | react-kanban-simple | 直观、容易理解             | 层次增加后深度嵌套 | 简单场景        |
| 分离数组 | SVAR                | REST 友好、CRUD 简单       | 关联数据需 join    | API 驱动场景    |
| 关系型   | Planka              | 最完整、支持 M:N           | 重                 | 完整企业应用    |

**推荐**：Flux Kanban 采用**扁平字典模型**（RKK 方式），因为：

- 与 Flux store 的 normalize 模式天然对齐
- Column 和 Card 统一为 `BoardItem`，schema 定义简洁
- `children[]` 引用支持任意嵌套层次（列→卡片，或卡片→子卡片）
- 通过 `type` 字段区分不同实体类型

---

## 4. 对 Flux Kanban 的设计建议

### 4.1 数据层

```typescript
// 扁平字典模型（参考 RKK）
interface KanbanData {
  root: KanbanItem; // 看板根节点
  [id: string]: KanbanItem; // 所有列和卡片
}

interface KanbanItem {
  id: string;
  type: 'column' | 'card' | 'divider';
  title: string;
  parentId: string | null;
  children: string[];
  content?: Record<string, any>; // 用户自定义数据
  isDraggable?: boolean;
  meta?: {
    // 渲染元数据
    color?: string;
    priority?: number;
    icon?: string;
    badge?: string | number;
  };
}

// Flux schema
interface KanbanSchema extends BaseSchema {
  type: 'kanban';
  data: SchemaValue; // KanbanData 表达式绑定
  columns?: SchemaValue; // 列配置（可选覆盖 data 中的列）
  cardRenderer?: RegionSchema; // 卡片渲染模板
  columnHeader?: RegionSchema; // 列头渲染模板
  events?: {
    onCardMove?: ActionSchema;
    onCardClick?: ActionSchema;
    onColumnReorder?: ActionSchema;
  };
}
```

### 4.2 渲染层

```
├── kanban.tsx               // 主组件
├── kanban.types.ts          // 类型定义
├── components/
│   ├── kanban-board.tsx      // 看板容器
│   ├── kanban-column.tsx     // 列（含 DnD drop target）
│   ├── kanban-card.tsx       // 卡片（含 DnD drag source）
│   └── kanban-adder.tsx      // 新增列/卡片按钮
├── hooks/
│   ├── use-kanban-dnd.ts     // 拖拽 hook
│   └── use-kanban-store.ts   // 状态管理 hook
└── utils/
    ├── kanban-reorder.ts     // 纯函数：moveCard/moveColumn 等
    └── kanban-filter.ts      // 卡片过滤
```

### 4.3 拖拽机制

使用 `@atlaskit/pragmatic-drag-and-drop`（RKK 已验证，对 React 生命周期最友好）：

- Card 既是 `draggable` 也是 `dropTargetForElements`
- Column 的 header 是拖拽手柄
- 使用 `attachClosestEdge` 检测放置位置（top/bottom/left/right）
- 拖拽元素注册使用 ref（setElementRef），拖拽状态（isDraggingOver 等）通过 monitor callback 驱动 React state 更新，两者分工不同

多层嵌套 drop target 解析：当卡片在列内拖拽时，drop target 可能是目标列也可能是目标卡片。需使用 attachClosestEdge 精确检测放置位置（top/bottom），同时处理"卡片上方间隙"vs"卡片内部"的层级歧义。空列时，column 容器本身必须是 drop target。

注意：@atlaskit/pragmatic-drag-and-drop 的 API 仍在演进中，建议锁定版本并在 Flux 中封装抽象层以隔离升级风险。

### 4.4 卡片类型分发（configMap 模式）

参考 RKK 的 `configMap`：看板支持在同一组件内渲染不同类型的卡片（普通任务卡片、分隔线、脚注等）。每个 type 关联独立的 `render` 函数和 `isDraggable` 配置。

```
configMap: {
  card: { render: (item) => <DefaultCard />, isDraggable: true },
  divider: { render: (item) => <Divider />, isDraggable: false },
  footer: { render: (item) => <Footer />, isDraggable: false },
}

注意：Column 和 Card 虽同为 BoardItem，但 Column 是容器（包含头部、可滚动卡片列表、底部），不是通过简单 render 函数可以表达的。Column 的渲染需要独立处理：Column 不在 configMap 中派发，而是由 KanbanColumn 组件直接渲染。configMap 仅用于 Column 内部的卡片类型分发。
```

### 4.5 看板的 Flux schema 优先级别

| 功能               | 优先级 | 参考自                    |
| ------------------ | ------ | ------------------------- |
| 卡片跨列拖拽       | P0     | RKK + react-kanban-simple |
| 列内卡片排序       | P0     | RKK                       |
| 卡片自定义渲染模板 | P0     | RKK configMap             |
| 列重新排序         | P1     | react-kanban-simple       |
| 卡片过滤/搜索      | P1     | 自研                      |
| 新增列/卡片        | P2     | react-kanban-simple       |
| 虚拟滚动           | P2     | RKK (virtua)              |
| 列折叠             | P2     | SVAR Kanban               |
| 活动日志           | P3     | Planka Action             |
| 实时同步           | P3     | Planka WebSocket          |
| 撤销/重做          | P3     | SVAR Kanban               |

### 4.6 列宽策略

支持固定宽度（column.width）和自动适应两种模式，参考 DHTMLX 的 autofit + grid_resize 组合。默认等比分配剩余宽度，允许用户拖拽调整列宽。

---

## 5. 可复用开源参考代码

| 参考来源                                     | 模块/模式                                | 直接复用程度                |
| -------------------------------------------- | ---------------------------------------- | --------------------------- |
| RKK `dropManager.ts` + hooks                 | 集中式 drop 处理 + Card/Column 拖拽 hook | ★★★ 核心 DnD 逻辑与参考实现 |
| RKK `types.ts`                               | BoardData/BoardItem 类型                 | ★★★ 可直接采用的数据模型    |
| react-kanban-simple `helpers.ts`             | moveCard/addCard 等纯函数                | ★★★ 直接作为 reducer        |
| react-kanban-simple `Uncontrolled.tsx`       | 非受控模式模式                           | ★★☆ 组件设计参考            |
| Planka `server/api/models/Card.js`           | 卡片完整字段定义                         | ★★★ 数据模型参考            |
| Planka `client/src/constants/ActionTypes.js` | Flux action 类型模式                     | ★★☆ 模式参考                |
| SVAR `api.exec/on/intercept`                 | API 三件套模式                           | ★★★ action 系统设计参考     |
