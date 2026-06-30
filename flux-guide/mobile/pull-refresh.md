# PullRefresh 下拉刷新

> `pull-refresh` 是容器型 renderer，为移动端内容区域提供下拉刷新能力。

---

## Schema

```typescript
interface PullRefreshSchema extends BaseSchema {
  type: 'pull-refresh';
  /** 子内容 region */
  body?: SchemaInput;
  /** 刷新方向，仅 'down' (OA-14) */
  direction?: 'down';
  /** 触发刷新的下拉距离阈值，默认 60px */
  threshold?: number;
  /** 加载中提示文本 */
  loadingText?: string;
  /** 下拉提示文本 */
  pullingText?: string;
  /** 到达释放阈值时提示文本 */
  loosingText?: string;
  /** 成功提示文本，默认 '刷新成功' */
  successText?: string;
  /** 成功提示持续时间 ms，默认 500 */
  successDuration?: number;
  /** 动画持续时间 ms，默认 300 */
  animationDuration?: number;
  /** 禁用下拉刷新 */
  disabled?: boolean;
}
```

### Events

```typescript
interface PullRefreshEvents {
  /** 触发刷新，由 action/data-source 处理 */
  onRefresh?: ActionSchema;
}
```

---

## 状态机

```
normal → pulling → loosing → loading → success → normal
```

| 状态      | 触发                             | 表现                               |
| --------- | -------------------------------- | ---------------------------------- |
| `normal`  | 初始 / 刷新完成                  | 无提示                             |
| `pulling` | touchmove 且 deltaY < threshold  | 提示"下拉刷新"                     |
| `loosing` | touchmove 且 deltaY >= threshold | 提示"释放刷新"                     |
| `loading` | touchend 且 deltaY >= threshold  | 显示加载 spinner，执行 `onRefresh` |
| `success` | onRefresh 完成                   | 短暂提示，自动回到 normal          |

---

## 使用示例

### 基础用法

```json
{
  "type": "pull-refresh",
  "onRefresh": {
    "action": "refreshTable",
    "args": { "target": "list1" }
  },
  "body": [{ "type": "list", "name": "list1", "api": "/api/list" }]
}
```

### 与 Page 集成

```json
{
  "type": "page",
  "pullRefresh": true,
  "body": [
    {
      "type": "infinite-scroll",
      "body": [{ "type": "list", "items": [{ "type": "text", "text": "item" }] }]
    }
  ]
}
```

### 禁用状态

```json
{
  "type": "pull-refresh",
  "disabled": "${isLoading}",
  "onRefresh": { "action": "refreshSource", "args": { "sourceName": "data" } },
  "body": [{ "type": "text", "text": "${data}" }]
}
```

---

## 边界情况

| 场景                   | 行为                                              |
| ---------------------- | ------------------------------------------------- |
| 页面内容不足一屏       | PullRefresh 仍可拖拽                              |
| 与 InfiniteScroll 共存 | 上拉加载用 InfiniteScroll，下拉刷新用 PullRefresh |
| disabled=true          | 完全不响应触摸事件                                |
| loading 状态再次拖拽   | 忽略，不重复触发                                  |
| touchcancel            | 恢复到 normal，不触发 onRefresh                   |
| onRefresh reject       | status 回到 normal，用户可再次下拉重试            |

---

## 包归属

| 文件                | 包                                             |
| ------------------- | ---------------------------------------------- |
| renderer definition | `flux-renderers-mobile`                        |
| 运行时组件          | `flux-renderers-mobile/src/pull-refresh.tsx`   |
| schema              | `flux-renderers-mobile/src/schemas.ts`         |
| useTouch Hook       | `flux-renderers-mobile/src/hooks/use-touch.ts` |
