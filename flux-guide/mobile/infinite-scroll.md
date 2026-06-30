# InfiniteScroll 触底加载

> `infinite-scroll` 是容器型 renderer，为移动端列表提供滚动触底自动加载更多数据的能力。

---

## Schema

```typescript
interface InfiniteScrollSchema extends BaseSchema {
  type: 'infinite-scroll';
  /** 列表内容 region */
  body?: SchemaInput;
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
  /** 是否立即检查加载，默认 true */
  immediateCheck?: boolean;
}
```

### Events

```typescript
interface InfiniteScrollEvents {
  /** 触底时触发，由 action/data-source 处理分页加载 */
  onLoadMore?: ActionSchema;
}
```

### 运行时 Props (由数据层驱动)

```typescript
interface InfiniteScrollRuntimeProps {
  /** 是否还有更多数据 */
  hasMore?: boolean;
  /** 是否正在加载 */
  loading?: boolean;
}
```

---

## 状态

```
normal → loading → finished / error
```

| 状态       | 触发                         | 表现                     |
| ---------- | ---------------------------- | ------------------------ |
| `normal`   | 初始 / 有更多数据            | 不显示                   |
| `loading`  | sentinel 进入视口 && hasMore | 显示加载 spinner         |
| `finished` | !hasMore                     | 显示"没有更多了"         |
| `error`    | onLoadMore 失败              | 显示"加载失败，点击重试" |

---

## 使用示例

### 基础用法

```json
{
  "type": "infinite-scroll",
  "onLoadMore": {
    "action": "ajax",
    "args": { "url": "/api/list?page=${page}" },
    "then": {
      "action": "setValues",
      "args": { "path": "list", "value": "${list.concat(result.items)}" }
    }
  },
  "body": [{ "type": "list", "items": "${list}" }]
}
```

### 与 CRUD 集成

```json
{
  "type": "page",
  "body": [
    {
      "type": "infinite-scroll",
      "hasMore": "${crud.hasMore}",
      "loading": "${crud.loading}",
      "onLoadMore": {
        "action": "component:loadMore",
        "args": { "_target": "crud1" }
      },
      "body": [{ "type": "crud", "name": "crud1", "api": "/api/users" }]
    }
  ]
}
```

### 错误重试

```json
{
  "type": "infinite-scroll",
  "errorText": "加载失败，点击重试",
  "onLoadMore": {
    "action": "ajax",
    "args": { "url": "/api/more" },
    "onError": {
      "action": "showToast",
      "args": { "level": "error", "message": "${error.message}" }
    }
  },
  "body": [{ "type": "list", "items": "${items}" }]
}
```

---

## 与 PullRefresh 的关系

```
pull-refresh (外层容器)
  └── infinite-scroll (内层容器)
      └── list / table / cards (内容)
```

| 组件              | 手势 | 方向     | 触发         |
| ----------------- | ---- | -------- | ------------ |
| `pull-refresh`    | 下拉 | 垂直向下 | 刷新当前数据 |
| `infinite-scroll` | 上滑 | 垂直向上 | 加载更多数据 |

两者互补，不互斥。

---

## 边界情况

| 场景                         | 行为                                     |
| ---------------------------- | ---------------------------------------- |
| 内容不足一屏                 | `immediateCheck=true` 时自动触发首次加载 |
| 快速滚动到底部               | 只触发一次 onLoadMore，避免重复调用      |
| 组件卸载                     | IntersectionObserver 断开连接            |
| data-source 正在 loading     | 不重复触发 onLoadMore                    |
| host 清 error 但不动 loading | 释放 in-flight guard，后续重试可触发     |
| onLoadMore reject            | 渲染器不崩，DEV 构建打印诊断日志         |

---

## 包归属

| 文件     | 包                                            |
| -------- | --------------------------------------------- |
| 组件实现 | `flux-renderers-mobile`                       |
| 导出     | 独立 renderer + 内部组件供 CRUD/List 按需组合 |
