# Service 组件设计

## 1. 组件定位

- `service` 是带可视子树的局部数据装配容器，用来在一个明确边界内准备数据、发布加载状态，并渲染子内容。
- 它不是 `data-source` 的重命名；`data-source` 是非可视 producer owner，`service` 是消费该能力并承载 body 的可视组合壳。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `service`，但 Flux 应优先用统一 `source` / action / statusPath 语言，而不是继续扩散 `api`、`schemaApi`、`silentPolling` 这类历史字段族。
- `service` 的价值在于“局部数据就绪后再渲染 body”，而不是成为新的全局请求协议 owner。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'service'`
- 预期归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`

## 4. schema 设计

- 建议正式字段为 `body`、`data`、`source`、`statusPath`、`interval`、`stopWhen`、`empty`、`error`、`loading`。
- `source` 负责生产局部服务数据，`body` 负责消费最终作用域结果。

## 5. 字段分类

- `data`、`source`、`statusPath`、`interval`、`stopWhen`: `value`
- `body`: `region`
- `empty`、`error`、`loading`: `value-or-region`
- `onReady`、`onError`: `event`

## 6. regions 与 slot 约定

- `body` 是服务数据准备完成后的主内容区。
- `empty`、`error`、`loading` 是可选反馈区域。

## 7. 运行期状态归属

- 请求、轮询、错误和就绪状态归内部 source owner。
- `service` 自己拥有的是“何时渲染 body、何时显示 loading/error/empty”这一层可视协作语义。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onReady`、`onError`。
- 推荐句柄为 `component:refresh`，用于重新触发内部 source。

## 9. 数据源、表达式、导入能力接入点

- `source` 应优先复用 `type: 'source'` 或统一 source-enabled value，而不是单独再发明 `serviceApi`。
- 局部 body 子树默认消费 service own patch 和普通 lexical scope 继承结果。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-service` marker。
- `service` 只表达结构语义，不内置额外布局系统。

## 11. 实现拆分建议

- source bridge、状态摘要发布、body region 渲染与 fallback 渲染分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是让 `service` 与 `data-source` 各自拥有一套请求协议。
- 第二个风险是把 `service` 变成任意逻辑容器，丢失“局部数据装配 + body 渲染”的清晰边界。
