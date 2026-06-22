# Service 组件设计

## 1. 组件定位

- `service` 是带可视子树的局部数据装配容器，用来在一个明确边界内准备数据、发布加载状态，并渲染子内容。
- 它不是 `data-source` 的重命名；`data-source` 是非可视 producer owner，`service` 是消费该能力并承载 body 的可视组合壳。
- **请求下沉约束**：`service` 自身**不声明挂载时自动加载数据的 schema 字段**（`api`/`initFetch`/`interval`/`sendOn` 等均不采纳）。数据请求由外部或内部组合的 `<data-source>` 组件承担，`service` 通过表达式从 scope 读取已加载数据。详见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `service`，但 Flux 应优先用统一 `source` / action / statusPath 语言，而不是继续扩散 `api`、`schemaApi`、`silentPolling` 这类历史字段族。
- `service` 的价值在于"局部数据就绪后再渲染 body"，而不是成为新的全局请求协议 owner。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                       | 采纳     | 不采纳     | 理由                                                                                               |
| ---------------------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `body` region + 局部数据就绪后渲染                         | **实现** | —          | service 核心价值                                                                                   |
| `data` 初始值注入（表达式，编译期求值）                    | **实现** | —          | 与 form.data 同语义                                                                                |
| `empty`/`error`/`loading` 反馈区域                         | **实现** | —          | 可视组合壳职责                                                                                     |
| `statusPath` 只读状态发布                                  | **实现** | —          | 发布 service 的 ready/error/idle 状态摘要                                                          |
| 数据读取经表达式值绑定 `items?: SchemaValue`               | **实现** | —          | 从 scope 读已加载数据（由外部或内部 `<data-source>` 加载），与 table/chart `source` 同模式         |
| amis `api`/`initApi`/`schemaApi` 组件级请求                | —        | **不采纳** | 请求下沉 data-source + action（X3 §1/§3，analysis §5）。service 是可视壳，不是请求层               |
| amis `initFetch`/`initFetchOn` 挂载自动拉取                | —        | **不采纳** | 等价于组件级 initFetch，违反「请求必须下沉」。用 `<data-source initFetch={true}>` 组合             |
| amis `interval`/`silentPolling`/`stopAutoRefreshWhen` 轮询 | —        | **不采纳** | 轮询归 data-source（`interval`/`stopWhen` 在 `data-source` 上，X4 已落地）；service 不重造请求协议 |
| amis `sendOn` 请求门控                                     | —        | **不采纳** | 归 data-source（X4）                                                                               |

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'service'`
- 预期归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`

## 4. schema 设计

```ts
interface ServiceSchema extends BaseSchema {
  type: 'service';
  body?: SchemaInput;
  data?: SchemaValue;
  items?: SchemaValue; // 表达式值绑定，从 scope 读已加载数据
  statusPath?: string;
  empty?: BaseSchema | BaseSchema[] | string;
  error?: BaseSchema | BaseSchema[] | string;
  loading?: BaseSchema | BaseSchema[] | string;
}
```

- 正式字段为 `body`、`data`、`items`、`statusPath`、`empty`、`error`、`loading`。
- `items` 是表达式值绑定（`SchemaValue`），从 scope 读已解析的数据数组/对象（由外部或内部组合的 `<data-source>` 加载）。与 `table.source`/`chart.source` 同模式——只读 scope，不触发 HTTP。
- **不声明** `source`（组件级请求入口）、`interval`（轮询）、`stopWhen`（轮询停止条件）、`onReady`/`onError`（请求生命周期事件）——这些都是请求层语义，归 `<data-source>` 组件。
- 需要轮询或请求生命周期事件时，组合 `<data-source interval={5000} stopWhen="..." onSuccess={...} />` + `<service items="${dsName}">`。

## 5. 字段分类

- `data`、`items`、`statusPath`: `value`
- `body`: `region`
- `empty`、`error`、`loading`: `value-or-region`

## 6. regions 与 slot 约定

- `body` 是服务数据准备完成后的主内容区。
- `empty`、`error`、`loading` 是可选反馈区域。

## 7. 运行期状态归属

- 请求、轮询、错误和就绪状态归 `<data-source>` owner，不在 service 自身。
- `service` 自己拥有的是"何时渲染 body、何时显示 loading/error/empty"这一层可视协作语义。
- `statusPath` 发布的是 service 可视层的状态摘要（`idle`/`ready`/`error`），基于 `items` 表达式解析结果派生，不是请求状态镜像。

## 8. 事件、动作与组件句柄能力

- `service` 不拥有请求生命周期事件（`onReady`/`onError` 归 `<data-source>` 的 `onSuccess`/`onError`）。
- 如需重新触发数据加载，对上游 `<data-source>` 调用 `component:refresh`（按 `componentId`/`componentName` 寻址），service 自身不代理此句柄。

## 9. 数据源、表达式、导入能力接入点

- 数据组合的标准模式：`<data-source name="ds" .../>` + `<service items="${ds}">` —— data-source 加载数据到 scope，service 通过表达式读取。
- `items` 支持标准 Flux 表达式解析（如 `"${myData}"`）。
- 局部 body 子树默认消费 service own patch 和普通 lexical scope 继承结果。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-service` marker。
- `service` 只表达结构语义，不内置额外布局系统。

## 11. 实现拆分建议

- 状态摘要发布、body region 渲染与 fallback 渲染分开实现。
- 不需要 source bridge（service 不拥有请求层）。

## 12. 风险、取舍与后续阶段

- 最大风险是让 `service` 与 `data-source` 各自拥有一套请求协议。**本设计已消除该风险**——service 不声明任何请求层字段（`source`/`interval`/`stopWhen`/`onReady`/`onError` 全部归 data-source）。
- 第二个风险是把 `service` 变成任意逻辑容器，丢失"局部数据装配 + body 渲染"的清晰边界。
