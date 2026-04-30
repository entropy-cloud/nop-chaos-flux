# Reaction 组件设计

## 1. 组件定位

- `reaction` 是非可视 renderer，用来声明式监听 scope 变化并触发动作。
- 它承担“观察并执行”的逻辑职责，而不是展示 UI。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `watch`、`when`、`immediate`、`debounce`、`once`、`actions`。
- 文档建议保持它的轻量性，不把复杂流程编排、长事务或副作用脚本塞回 `reaction`。

## 3. Flux 中的 renderer/type 定义

- `type: 'reaction'`
- `category: 'logic'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 fields: `watch`、`when`、`immediate`、`debounce`、`once`、`actions`

## 4. schema 设计

- 建议正式字段为 `watch`、`when`、`immediate`、`debounce`、`once`、`actions`。
- `watch` 表达依赖路径或观察表达式，`when` 表达布尔门控，`actions` 承接单个 `ActionSchema`，需要多步行为时通过 `then` 或复合 action 串联。

## 5. 字段分类

- `watch`、`when`、`immediate`、`debounce`、`once`: `value`
- `actions`: `value`，其内部是 `ActionSchema`

## 6. regions 与 slot 约定

- `reaction` 不暴露 regions。

## 7. 运行期状态归属

- 监听订阅和触发去重属于 renderer/runtime 内部局部状态。
- 真正的数据源仍归当前 scope；`reaction` 不应持久化业务数据副本。

## 8. 事件、动作与组件句柄能力

- `reaction` 自身不对外暴露事件；它的输出就是动作执行。
- 如果需要外部手动重跑，建议未来提供 `component:refresh` 或通过依赖值变化触发，而不是公开内部 watcher 对象。

## 9. 数据源、表达式、导入能力接入点

- `watch` 和 `when` 都依赖表达式编译与依赖跟踪。
- 复杂异步链应交给动作系统或 `data-source`，不要在 `reaction` 内部叠加请求状态机。

## 10. 样式与 DOM marker 约定

- 非可视 renderer 可以不输出可见 DOM。
- 如果需要调试锚点，可输出最小 `nop-reaction` 标记节点，但不承担视觉布局。

## 11. 实现拆分建议

- 订阅管理、条件判断、动作触发和防抖控制分模块实现。

## 12. 风险、取舍与后续阶段

- 最主要风险是把它变成隐式副作用入口，导致页面行为不可追踪。
- 文档应继续强调：副作用要声明式、可诊断、可复现。
