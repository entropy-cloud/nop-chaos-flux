# Dynamic Renderer 组件设计

## 1. 组件定位

- `dynamic-renderer` 是运行时装配 renderer，用来在已存在的 compile/runtime 模型之上接收一段动态 schema 并渲染。
- 它不是新的通用 DSL，也不是把任意业务逻辑搬回客户端组装的入口。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现已经落位为高级 renderer，并要求 `loadAction` 作为动态 schema 入口，同时支持 `body` region。
- 文档应明确收敛：它只解决“运行时拿到最终 schema 片段再渲染”的场景，不负责宏模板展开或复杂数据投影。

## 3. Flux 中的 renderer/type 定义

- `type: 'dynamic-renderer'`
- `category: 'advanced'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `body`

## 4. schema 设计

- 当前已落地的最小字段是 `loadAction` 和可选 `body`。
- `loadAction` 负责获取最终 schema，`body` 用作宿主级补充内容或静态包裹区。
- `fallback`、`empty`、`errorMode`、`onError` 可以作为后续增强，但不应写成当前正式契约。

## 5. 字段分类

- `loadAction`: `event`
- `body`: `region`
- `fallback`、`empty`: 仅作为潜在后续扩展

## 6. regions 与 slot 约定

- `body` 是主渲染入口。
- 如果后续增加 `fallback`/`empty`，它们应作为补充 UI，而不是和 `body` 形成双主内容区。

## 7. 运行期状态归属

- 编译后的 fragment 归当前 owner node 的 compile context 管理。
- 加载态、错误态和最终 schema 值由 `dynamic-renderer` 自身持有；它们不是通用 render-boundary 的兜底责任。
- `loadAction` 结果必须先通过 action-shape validation；返回值必须是可编译的最终 schema，最小要求是 `{ type: string }` 形状。
- `loadAction` 执行失败或返回非法 schema 时，组件进入 renderer-owned error state，并在 `nop-dynamic-renderer` 壳内发布错误文本；不得伪装成普通 render-boundary 崩溃。
- 当新的 `loadAction` 输入替换旧值时，旧 schema 不再继续显示为当前成功状态；可见状态应与最新 `loadAction` 对齐。
- 当前 live loading baseline 为 renderer-owned visible pending UI：`nop-dynamic-renderer` 壳内会显示 spinner + loading text，并可继续渲染 authored `body` region 作为宿主补充内容。
- 因此 `dynamic-renderer` 当前可见状态收口为三态：loading（renderer-owned spinner + optional body）、schema-ready（动态 schema render result）、error（renderer-owned diagnostic text）。

## 8. 事件、动作与组件句柄能力

- 可以提供 `component:refresh` 之类的重新解析能力，但不应暴露底层 compiler 私有对象。
- 当前稳定基线里，错误处理优先走 renderer-owned diagnostic surface；`onError` / notify 仍可作为后续增强，而不是现有 contract。

## 9. 数据源、表达式、导入能力接入点

- 该组件是动态 schema 的主要接入点之一。
- 输入应尽量是“最终可编译 schema”，而不是原始业务数据加模板协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dynamic-renderer` marker。
- 外层壳样式应最小化，避免覆盖内部动态片段的视觉边界。

## 11. 实现拆分建议

- schema 归一化、编译上下文继承、错误边界和 fallback 呈现应拆成独立模块。

## 12. 风险、取舍与后续阶段

- 这是最容易被滥用的逃逸口，必须在文档中强调“执行最终结构，而不是临时拼装业务 DSL”。
- 编译缓存、错误可观察性和 scope 继承需要持续回归验证。
