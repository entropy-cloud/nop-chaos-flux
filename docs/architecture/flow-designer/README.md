# Flow Designer

`Flow Designer` 不是一套独立于现有 AMIS/SchemaRenderer 体系之外的新渲染引擎，而是构建在 `SchemaRenderer` 之上的图设计器领域扩展。

## 定位

- 保留现有 `apps/main/src/pages/flow-editor` 示例，不直接改造旧示例
- 在 `packages` 下新增通用模块，目标是把 flow editor 能力抽象成可配置的设计器基础设施
- 设计器外围 UI 尽量复用现有 `SchemaRenderer`、`formulaCompiler`、`action`、`form/page runtime`
- 只有图画布、端口连接、规则匹配、图编辑历史等能力由专用 graph runtime 负责

## 新架构结论

- `Flow Designer` 作为 `SchemaRenderer` 领域扩展层实现
- 包结构采用 `@nop-chaos/flow-designer-core` + `@nop-chaos/flow-designer-renderers`
- 根 schema 采用 `designer-page`
- 节点类型采用 designer 专用 config，不直接退化成普通 renderer schema
- inspector、create dialog、toolbar、floating actions 采用 schema 片段驱动
- 动作统一走 action schema，并扩展 `designer:*` action
- 文档只持久化 graph 数据，不持久化 hover、selection drawer 等 UI 临时状态

## 当前 MVP 状态

- `packages/flow-designer-core/` 已提供最小可运行的 graph runtime：`GraphDocument`、`GraphNode`、`GraphEdge`、`DesignerConfig`、single-selection、undo/redo、dirty tracking、save/restore、导出 JSON。
- `packages/flow-designer-renderers/` 已提供 `designer-page`、`designer-field`、基础占位 renderer 注册，并通过 `designer-page` 自身的 `ActionScope` 边界接入 `designer:*` 动作。
- `apps/playground/src/App.tsx` 已提供一个可运行的 playground 集成入口，当前仓库里保留的直连 React 示例仍在 `apps/playground/src/FlowDesignerExample.tsx`，而 schema/runtime 集成路径以 `designer-page` renderer 为主。
- 当前画布只支持 live `@xyflow/react`（React Flow），并复用同一套 host-owned command bridge，而不是在多种画布实现之间切换。

## 文档

- `docs/architecture/flow-designer/design.md` - 总体架构、运行时边界、性能策略
- `docs/architecture/flow-designer/config-schema.md` - `designer-page`、`nodeTypes`、`ports`、`edgeTypes`、文档模型
- `docs/architecture/flow-designer/api.md` - 包 API、宿主 scope、designer actions、扩展点
- `docs/architecture/flow-designer/runtime-snapshot.md` - 当前 `DesignerSnapshot`、`DesignerContextValue`、host scope 落地现状，以及“已接线字段”与“设计目标字段”的区别
- `docs/architecture/flow-designer/collaboration.md` - `designer-page`、ActionScope、command adapter、canvas host、inspector 之间的协作链路与调用链图
- `docs/architecture/flow-designer/canvas-adapters.md` - 当前唯一的 React Flow 画布边界、失败语义、回调翻译边界
- `docs/analysis/flow-designer-documentation-review.md` - 对早期改进意见的复核结论与已采纳约束

## 设计原则

- 配置尽量简化，但基础模块尽量通用
- 真正需要图编辑特化的能力才进入 `core`
- 能用 schema renderer 复用的，不在 flow designer 里重造
- 面向高性能：编译、缓存、局部订阅、增量更新优先
- 配置和文档结构必须稳定，便于后端存储与版本迁移

## 与现有示例的关系

- 现有 flow editor 示例继续作为独立示例保留
- 新模块目标是沉淀一套可复用的设计器平台能力
- 后续可以用新模块重新实现一个新的 designer 示例，但不替换旧页
