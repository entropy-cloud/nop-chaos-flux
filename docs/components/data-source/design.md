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

- 当前已落地的正式字段围绕 `name`、`formula`、`api`、`interval`、`stopWhen`、`silent`。
- 当使用 API 模式时，参数和 scope 注入位于 `api.params`、`api.includeScope` 之下，而不是提升为 renderer 顶层字段。
- 具体契约应以 `docs/architecture/api-data-source.md` 和 `packages/flux-core/src/types/schema.ts` 为当前实现基线。
- `onSuccess`、`onError`、`component:cancel` 等更强运行时控制能力可以作为后续增强，但当前文档不应把它们写成已落地正式字段。

## 5. 字段分类

- `name`、`formula`、`api`、`interval`、`stopWhen`、`silent`: `value`
- 当前实现没有 renderer-level 事件字段；成功和失败处理主要依赖统一 action/API 语义与 scope 发布。

## 6. regions 与 slot 约定

- 当前不建议给 `data-source` 暴露 `body` region 作为默认模式。
- 若需要数据感知的局部 UI，应由消费数据的展示 renderer 负责。

## 7. 运行期状态归属

- 加载、错误和结果状态归 source runtime。
- 写回目标 scope 的结果是外部可见状态；请求中的临时控制状态不应泄漏成通用页面字段。

## 8. 事件、动作与组件句柄能力

- 当前应优先支持 `component:refresh` 这类重新执行能力。
- `component:cancel` 可以作为后续增强，但不应在当前文档中伪装成已落地句柄。
- 事件优先走 action schema，而不是暴露 promise 回调函数。

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