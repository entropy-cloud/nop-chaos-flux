# InfiniteScroll 组件设计

## 1. 组件定位

`infinite-scroll` 是一个**容器型** renderer，为移动端列表提供滚动触底自动加载更多数据的能力。它不是数据源，加载行为由 `onLoadMore` 事件配合 action/data-source 驱动。

- **不是**独立页面组件——通常包裹 `list`、`cards`、`table` 等集合内容。
- **不是**数据源——数据请求下沉到 action/data-source 层。
- 与 `pull-refresh` 互补：下拉刷新 + 上滑加载更多。

## 2. 参考实现

| 来源          | 组件                                   | 特点                            |
| ------------- | -------------------------------------- | ------------------------------- |
| Vant van-list | Vant 4                                 | IntersectionObserver + 触底加载 |
| AMIS CRUD2    | `CRUD2.tsx:1680-1801`                  | 内部集成 load-more              |
| 移动商城项目  | newbee-mall ProductList.vue, Order.vue | 10+ 页面使用 `van-list`         |

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                             | 采纳     | 不采纳     | 理由                                                         |
| ------------------------------------------------ | -------- | ---------- | ------------------------------------------------------------ |
| `body` region + 触底加载容器                     | **实现** | —          | 核心能力：容器型 renderer 包裹列表内容                       |
| `onLoadMore` 事件驱动加载                        | **实现** | —          | 加载行为由事件驱动，分页请求下沉 action/data-source          |
| `distance`/`disabled`/`immediateCheck` 配置      | **实现** | —          | 标准交互配置                                                 |
| `loadingText`/`finishedText`/`errorText` 文案    | **实现** | —          | i18n 友好的可配置文案                                        |
| `hasMore`/`loading` 运行时 props（由数据层驱动） | **实现** | —          | infinite-scroll **不持有分页状态**，由 crud/data-source 驱动 |
| amis 组件级 `api`/`initFetch`                    | —        | **不采纳** | 请求下沉 data-source + action（X3 §1/§3）                    |
| 内部分页状态管理                                 | —        | **不采纳** | 分页状态（pageNo/pageSize/total/hasMore）归 crud/data-source |

## 3. Schema 设计

```typescript
interface InfiniteScrollSchema extends BaseSchema {
  type: 'infinite-scroll';
  /** 加载更多触发距离（px），默认 200px */
  distance?: number;
  /** 是否禁用滚动加载 */
  disabled?: boolean;
  /** 加载中提示文本 */
  loadingText?: string;
  /** 加载完成文本（所有数据已加载） */
  finishedText?: string;
  /** 加载出错文本 */
  errorText?: string;
  /** 是否立即检查加载，默认 true（内容不足一屏时自动加载） */
  immediateCheck?: boolean;
}
```

- `body` 是 region（renderer definition 中声明 `{ key: 'body', kind: 'region' }`），不是 schema 内联字段。

### Events

```typescript
interface InfiniteScrollEvents {
  /** 触底时触发，由 action/data-source 处理分页加载 */
  onLoadMore?: ActionSchema;
}
```

### 与数据层协作

`infinite-scroll` **不持有分页状态**。分页状态（pageNo、pageSize、total、hasMore）由 `crud` 或 data-source 持有。

- 每次 `onLoadMore` 触发时，数据层自增 pageNo 并发起请求
- `infinite-scroll` 通过 `hasMore` prop（来自数据层）判断是否禁用加载
- 数据层通过 `loading` prop 控制加载指示器显隐

```typescript
interface InfiniteScrollRuntimeProps {
  /** 是否还有更多数据（由数据层驱动） */
  hasMore?: boolean;
  /** 是否正在加载（由数据层驱动） */
  loading?: boolean;
}
```

## 4. 实现方式

### 检测机制

- 使用 `IntersectionObserver`（优先）监测底部 sentinel 元素进入视口
- fallback：滚动容器 `scrollHeight - scrollTop - clientHeight < distance` 判断

### 状态

| 状态       | 触发                         | 表现                                       |
| ---------- | ---------------------------- | ------------------------------------------ |
| `normal`   | 初始 / 有更多数据            | 不显示                                     |
| `loading`  | sentinel 进入视口 && hasMore | 显示加载 spinner                           |
| `finished` | !hasMore                     | 显示"没有更多了"（由 `finishedText` 控制） |
| `error`    | onLoadMore 失败              | 显示"加载失败，点击重试"                   |

## 5. 边界情况

| 场景                     | 行为                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 内容不足一屏             | `immediateCheck=true` 时自动触发首次加载                                                                    |
| 快速滚动到底部           | 只触发一次 `onLoadMore`，避免重复调用                                                                       |
| 组件卸载                 | IntersectionObserver 断开连接                                                                               |
| 与 PullRefresh 共存      | PullRefresh 在外层包裹，InfiniteScroll 在内层包裹列表                                                       |
| 容器滚动 vs 视口滚动     | 自动检测最近的可滚动父容器                                                                                  |
| data-source 正在 loading | 不重复触发 onLoadMore                                                                                       |
| **触摸目标**             | 底部加载指示器需满足 M0 基线规范（`docs/architecture/mobile-responsive-baseline.md` §3）的 44×44px 最小尺寸 |

## 6. 包归属

```typescript
// infinite-scroll 同时作为独立 renderer 和 CRUD/List 等集合组件的内建行为
// 归属 flux-renderers-mobile 包，可独立使用也可被其他 renderer 组合
```

| 文件     | 包                                            |
| -------- | --------------------------------------------- |
| 组件实现 | `flux-renderers-mobile`                       |
| 导出     | 独立 renderer + 内部组件供 CRUD/List 按需组合 |
