# Data Source 组件设计

## 1. 组件定位

- `data-source` 是非可视的数据装配 renderer，用来声明请求、轮询、作用域注入与数据写回。
- 它不是普通展示组件，而是统一 API/DataSource 语义在 renderer 层的入口。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地为独立 logic renderer。
- `data-source` 应优先吸收“请求与数据进入 scope”的职责，避免每个展示组件各自重新发明 `api` 协议。

## 3. Flux 中的 renderer/type 定义

- `type: 'data-source'`
- `category: 'logic'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`

## 4. schema 设计

- 基础字段：`name`、`formula`、`api`、`interval`、`stopWhen`、`silent`、`statusPath`、`dependsOn`、`initialData`、`mergeStrategy`、`mergeKey`。
- 请求编排字段（X4）：`sendOn`、`initFetch`、`onSuccess`、`onError`。
- 当使用 API 模式时，HTTP 请求配置（`url`、`method`、`data`、`params`、`headers`）位于 `args` 内的 `ApiSchema` 中，不提升为 renderer 顶层字段。
- 具体契约以 `packages/flux-core/src/types/schema.ts` 为实现基线。

### 层级职责划分（X4 与 ApiSchema 的关系）

data-source 的属性分布在三个层级，职责正交：

| 层级            | 属性                                                      | 职责                             | 消费方                   |
| --------------- | --------------------------------------------------------- | -------------------------------- | ------------------------ |
| **请求编排层**  | `sendOn`, `initFetch`, `onSuccess`, `onError`             | 控制"何时发请求"和"请求后做什么" | DataSourceController     |
| **操作控制层**  | `control: { dedup, retry, throttle, cacheTTL, cacheKey }` | 控制"失败怎么办"和"重复请求策略" | DataSourceController     |
| **HTTP 配置层** | `args: ApiSchema { url, method, data, params, headers }`  | 控制"怎么发请求"（HTTP 细节）    | action runtime → fetcher |

```json
{
  "type": "data-source",
  "name": "userData",
  "action": "ajax",
  "sendOn": "featureFlag === true",
  "initFetch": false,
  "onSuccess": { "action": "setValue", "args": { "path": "lastFetchTime", "value": "${now}" } },
  "onError": { "action": "toast", "args": { "msg": "Fetch failed", "level": "error" } },
  "args": {
    "url": "/api/users",
    "method": "GET",
    "params": { "page": "${page}" }
  },
  "control": { "retry": { "times": 3 }, "dedup": "cancel-previous" }
}
```

**关键设计决策**：

- `sendOn` 是 universal gate：任何请求（初始 fetch、手动 refresh、interval poll）发出前都必须通过 sendOn 检查。`initFetch` 只控制"是否自动触发首次 fetch"，不绕过 sendOn。
- `onSuccess`/`onError` 是 fire-and-forget dispatch：与 Flux action system 一致，不 await 结果。
- `ApiSchema` 不增加 `sendOn`/`initFetch` 等字段：这些是请求编排属性，不属于 HTTP 配置范畴。

## 5. 字段分类

**value 字段**：`name`、`formula`、`api`、`interval`、`stopWhen`、`silent`、`sendOn`（raw expression）、`initFetch`（boolean）

**event 字段**：`onSuccess`、`onError`（action schema）

**component capability**：`refresh`（触发手动刷新，返回 `{ skipped: boolean }`）、`cancel`（取消进行中的请求）

## 6. regions 与 slot 约定

- 当前不建议给 `data-source` 暴露 `body` region 作为默认模式。
- 若需要数据感知的局部 UI，应由消费数据的展示 renderer 负责。

## 7. 运行期状态归属

- 加载、错误和结果状态归 source runtime，通过 `statusPath` 发布。
- 写回目标 scope 的结果是外部可见状态；请求中的临时控制状态不应泄漏成通用页面字段。
- **sendOn gate 对状态的影响**：sendOn falsy 时 refresh 被 skip，`statusPath` 保持上一次成功/错误状态，不更新为 loading/error。scope 中 `targetPath` 保留旧值。
- **initFetch gate 对状态的影响**：`initFetch: false` 时 mount 后 `statusPath` 发布 `idle` 态，不进入 `pending`/`fetching`。后续手动 refresh 正常走状态流转。

## 8. 事件、动作与组件句柄能力

### 刷新机制（两种并存）

| 机制                           | 寻址方式                     | 语义                          | 适用场景                     |
| ------------------------------ | ---------------------------- | ----------------------------- | ---------------------------- |
| `refreshSource` action         | 按 `targetId`（source name） | runtime-owned action API      | action flow 中跨 source 刷新 |
| `component:refresh` capability | 按 ComponentHandle id        | component capability contract | button onClick 等交互触发    |

二者并存，不互相替代。`component:refresh` 返回 `{ skipped: boolean }`，反映 sendOn gate 是否生效。

### 组件句柄

| handle    | 方法                | 说明                                                      |
| --------- | ------------------- | --------------------------------------------------------- |
| `refresh` | `invoke('refresh')` | 触发手动刷新，走 sendOn gate，返回 `{ skipped: boolean }` |
| `cancel`  | `invoke('cancel')`  | 取消进行中的请求，`statusPath` 置为 idle                  |

### 生命周期事件

| 事件        | 触发时机                      | payload                   |
| ----------- | ----------------------------- | ------------------------- |
| `onSuccess` | 请求成功完成后（含缓存命中）  | `{ data, dataUpdatedAt }` |
| `onError`   | 请求失败后（含 abort/cancel） | `{ error, failureCount }` |

事件是 fire-and-forget dispatch，与 Flux action system 一致。

## 9. 数据源、表达式、导入能力接入点

- 这是数据源能力本身的接入点，应支持表达式参数、scope 注入和 source registry 协作。
- 导入的命名空间能力应通过 `xui:imports` 或 action namespace，而不是塞在 renderer 私有字段里。

## 10. 样式与 DOM marker 约定

- 非可视 renderer 可不输出可见 DOM。
- 如需调试或测试锚点，可保留最小 `nop-data-source` 标记节点。

## 11. 实现拆分建议

- 请求执行、缓存、轮询、scope 写回和错误通知必须独立模块化。

## 12. 风险、取舍与后续阶段

- 最大风险是让 `data-source` 和各展示组件的 source-enabled field 重复负责请求逻辑，需要通过文档明确主从关系。
- **WebSocket source（ws）**：roadmap 明确 `ws 低优先`，当前不实现。ws 是连接生命周期（open/message/close/reconnect），与 HTTP 请求生命周期（请求→成功/失败）语义不同，混入会污染 sendOn/initFetch 契约。归后续独立 plan。
- **refreshSource 与 component:refresh 并存**：两者语义不同（action API vs component capability），归后续 naming audit（X1）评估是否需要统一。
- **onSuccess/onError fire-and-forget**：异步 dispatch 不 await，如果用户在事件 handler 中做重要状态更新（如跳转登录页），可能有时序问题。这是 Flux action system 的固有语义，非 X4 引入。
