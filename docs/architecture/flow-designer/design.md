# Flow Designer 架构设计

## 1. 目标与边界

### 1.1 核心目标

- 将现有 flow editor 提炼为通用可配置设计器能力
- 外部通过 JSON 配置定义 palette、节点、端口、连线、工具栏、属性编辑方式
- 复用现有 `SchemaRenderer` 体系，而不是平行再造一套页面渲染运行时
- 在运行时保持高性能，避免每次渲染都重新解释整份配置

### 1.2 非目标

- 不生成外部源码
- 不替换现有 `apps/main/src/pages/flow-editor` 示例
- 不把所有 UI 都做成 graph core 的内建逻辑

## 2. 总体架构

Flow Designer 应实现为 `SchemaRenderer` 上的一层领域扩展。

```text
+---------------- SchemaRenderer Host ----------------+
|                                                     |
|  designer-page RendererDefinition                   |
|    |                                                |
|    +- toolbar region -> standard schema render      |
|    +- palette region -> designer palette renderer   |
|    +- canvas region  -> graph canvas renderer       |
|    +- inspector     -> standard schema render       |
|                                                     |
|  formulaCompiler / action dispatch / page runtime   |
|  form runtime / dialog host / plugin pipeline       |
+--------------------------+--------------------------+
                           |
                           v
+---------------- Flow Designer Core -----------------+
| graph document | node types | ports | role matcher  |
| permissions    | history    | selection | layout    |
| serialization  | validation | graph actions         |
+-----------------------------------------------------+
```

### 2.1 当前已落地的 MVP

目前仓库里已经有第一版可运行实现，但仍是刻意收敛后的 MVP：

- `@nop-chaos/flow-designer-core` 已落地纯内存 graph runtime，覆盖节点/边增删改查、单选、undo/redo、dirty tracking、save/restore、导出。
- `@nop-chaos/flow-designer-renderers` 已落地 `designer-page` 宿主与 schema/runtime bridge，并通过本地 `ActionScope` 注册 `designer:*` 动作。
- playground 已有实际示例，证明 schema-driven toolbar、schema-driven inspector、固定 host scope、保存/导出回调可以协同工作。
- `@xyflow/react` 适配边界仍然保留，但当前实现先用卡片式 canvas/list 视图证明整体架构，而不是在第一步就绑定完整画布交互。

## 3. 模块拆分

### 3.1 `@nop-chaos/flow-designer-core`

职责：纯图运行时，不依赖 React，不依赖 `SchemaRenderer`。

建议包含：

- graph document 类型定义
- node type / edge type / port type 配置模型
- role 匹配和连接校验
- 节点/边增删改查
- undo/redo 历史
- 选择态和批量操作模型
- 布局接口
- 权限判断
- 文档序列化、反序列化、迁移
- designer action 的底层执行器

当前 MVP 已实现的重点能力：

- `GraphDocument` / `GraphNode` / `GraphEdge` / `DesignerConfig`
- `createDesignerCore()`
- `addNode` / `updateNode` / `moveNode` / `duplicateNode` / `deleteNode`
- `copySelection` / `pasteClipboard`
- `addEdge` / `updateEdge` / `deleteEdge`
- `selectNode` / `selectEdge` / `clearSelection`
- `undo` / `redo` / `toggleGrid` / `save` / `restore` / `exportDocument()`
- 单一 `start` 节点约束

### 3.2 `@nop-chaos/flow-designer-renderers`

职责：与现有 `SchemaRenderer` 集成。

建议包含：

- `designer-page`、`designer-canvas`、`designer-palette` 等 `RendererDefinition`
- `createFlowDesignerRegistry()` 或 `registerFlowDesignerRenderers()`
- graph runtime 到 schema runtime 的桥接层
- 宿主 scope 注入
- `designer:*` action 注册
- 与 `@xyflow/react` 的适配

当前 MVP 已实现的重点能力：

- `designer-page` renderer
- `designer-field` inspector 控件
- `designer-canvas` / `designer-palette` / `designer-node-card` / `designer-edge-row` 占位 renderer 定义
- `registerFlowDesignerRenderers(registry)` / `createFlowDesignerRegistry()`
- `designer-page` 在自身 action-scope 边界内注册 `designer` namespace provider，并让 toolbar/inspector 片段沿该边界执行
- `designer-page.shortcuts`，用于在宿主层把键盘事件映射到已有 `designer:*` / shared action 链

### 3.3 `@xyflow/react` 适配边界

`@xyflow/react` 只作为 canvas 交互与可视化适配层，不作为 graph 数据的第二 source of truth。

建议约束：

- graph runtime 持有：`document`、`viewport`、`selection`、`activeTarget`、history、dirty、clipboard、连接校验相关状态
- `@xyflow/react` 可持有：pointer capture、dragging 中间态、连线预览、节点尺寸测量、框选手势中的纯 UI 临时态
- `onNodesChange`、`onEdgesChange`、`onConnect`、selection change 等回调先归一化为 designer bridge command，再进入 `designer:*` action 或 core action executor
- canvas adapter 不直接写 graph store 的结构化 document 状态，避免双写和回调环
- runtime 快照回推到 canvas 时必须允许 no-op 合并，避免受控更新造成事件回环

## 4. 为什么不做独立引擎

参考 `packages/amis-react/src/index.tsx:479`，当前体系已经具备：

- registry 驱动 renderer 发现
- schema compile 和动态值编译缓存
- page/form runtime
- scope 上下文
- dialog host
- action dispatch
- plugin 生命周期

因此 Flow Designer 不应再重复发明：

- 独立表达式协议
- 独立属性面板表单协议
- 独立弹窗体系
- 独立按钮动作系统
- 独立页面级运行时

## 5. `designer-page` 组织模型

Flow Designer 的宿主 schema 采用一个根节点类型：`designer-page`。

推荐结构：

```ts
interface DesignerPageSchema {
  type: 'designer-page'
  id?: string
  title?: string
  document: GraphDocumentInput
  config: DesignerConfig
  toolbar?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

说明：

- `document` 是当前图文档初始值
- `config` 是 designer 专用配置，定义 nodeTypes、ports、edgeTypes 等领域规则
- `toolbar`、`inspector`、`dialogs` 是普通 schema 片段，由 `SchemaRenderer` 渲染

## 6. 数据模型分层

### 6.1 持久化文档

只保存稳定的 graph 文档：

- 文档元信息
- nodes
- edges
- 节点/边业务数据
- 可选 viewport

不保存：

- hover
- selection drawer open
- 临时校验错误展示状态
- 浮动工具栏显示状态

### 6.2 运行时状态

运行时状态由两层组成：

- graph runtime state：selection、history、clipboard、hover、active target
- schema runtime state：form/page/dialog/action 相关状态

二者必须分层，避免把 form runtime 再复制进 Zustand。

### 6.3 graph runtime 与 schema runtime 的桥接

桥接层负责把 graph runtime 暴露给 `designer-page` 下的 schema 片段，但必须保持单向职责清晰：

- schema 片段通过固定宿主 scope 读取 graph runtime 的只读快照
- schema 片段通过 `designer:*` actions 或 bridge dispatch API 提交写操作
- schema 层不得直接拿到底层 graph store 并原地修改 document
- bridge 对外暴露的是稳定快照与有限命令面，而不是整套 store 私有实现

推荐 bridge 最小能力：

- `getSnapshot()` - 读取当前 `doc`、`selection`、`activeNode`、`activeEdge`、runtime summary
- `dispatch(command)` - 提交归一化后的 designer 命令
- `subscribe(listener)` - 供 renderer shell 做局部订阅
- `emit(event)` - 向宿主和插件发布 designer 事件

## 7. 节点类型模型

节点类型继续采用 designer 专用 config，而不是完全 schema 化。

原因：

- 节点类型属于 graph domain 元数据
- 它要表达 ports、role、约束、连接规则、可移动性等图语义
- 这些不是普通页面 schema 擅长表达的内容

但节点类型内部允许嵌入 schema 片段：

- `inspector.body`
- `createDialog.body`
- `quickActions`
- `emptyState`

## 8. 端口优先的连接模型

只做 node 级 role 不足以支撑复杂设计器，因此一开始就支持 port 级建模。

连接校验顺序：

1. 校验 source port / target port 是否存在
2. 校验端口方向是否正确
3. 校验 port roles 是否匹配
4. 若 port 未定义 role，则回退到 node role
5. 校验 maxConnections、self loop、multi edge、黑名单规则
6. 校验 edgeType 约束

这样可以支持：

- 一节点多入多出
- 条件分支
- 并行节点
- 端口级最大连接数
- 明确的 handle 定义

## 9. 属性编辑与创建流程

### 9.1 属性编辑

属性面板直接使用 schema 片段驱动，而不是单独维护字段引擎。

推荐方式：

- inspector schema 使用固定宿主 scope 读取 `activeNode` / `activeEdge`
- 保存按钮触发 `designer:updateNodeData` / `designer:updateEdgeData`
- 校验复用现有 form runtime

### 9.2 两阶段创建

节点创建支持两种路径：

- 直接拖拽落图，使用默认值创建
- 若节点类型配置了 `createDialog.body`，则在创建前或创建后立即弹出创建表单

这样既保证简单节点的效率，也覆盖复杂节点初始化场景。

## 10. 动作体系

所有外围交互统一接入现有 action schema，并扩展 designer action。

建议的内建 action：

- `designer:addNode`
- `designer:deleteSelection`
- `designer:duplicateSelection`
- `designer:connect`
- `designer:disconnect`
- `designer:openInspector`
- `designer:closeInspector`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:autoLayout`
- `designer:fitView`
- `designer:undo`
- `designer:redo`
- `designer:exportDocument`
- `designer:setSelection`
- `designer:moveNodes`
- `designer:updateMultipleNodes`
- `designer:addEdge`
- `designer:beginTransaction`
- `designer:commitTransaction`
- `designer:rollbackTransaction`

当前 MVP 实际已接线的动作子集是：

- `designer:addNode`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:copySelection`
- `designer:pasteClipboard`
- `designer:duplicateSelection`
- `designer:deleteSelection`
- `designer:undo`
- `designer:redo`
- `designer:toggleGrid`
- `designer:save`
- `designer:restore`
- `designer:export`

好处：

- toolbar 按钮可直接触发
- inspector 表单可直接提交到 designer action
- 快捷键和浮动工具栏可复用同一动作分发链

当前 playground 里的删除确认已经用共享 `dialog` / `closeDialog` action 和 schema 组合实现，说明 destructive UX 不需要额外硬编码进 core 或 renderer runtime。

当前 playground 里的键盘快捷键也保持在宿主 schema 层定义，通过 `designer-page.shortcuts` 把 `Ctrl/Cmd+Z`、`Ctrl/Cmd+Y`、`Ctrl/Cmd+C`、`Ctrl/Cmd+V` 和 `Delete` 映射到现有 action；renderer 只负责监听并分发，core 不直接感知具体按键策略。

当前卡片式 canvas 还额外实现了 hover-driven quick-action shell：节点和边的 Edit / Duplicate / Delete 只是在 renderer 层按 hover 或 active 状态显隐，真正的删除、复制、选中仍然走既有 command/action 边界。

当前 `designer-page` 还内建了窄屏 inspector fallback：当视口收窄到移动布局时，右侧 inspector 不再强依赖三栏布局，而是折叠为位于 canvas 下方的可展开面板；选择节点或边时会自动展开，但 inspector schema、nodeTypes/edgeTypes 的 `inspector.body` 契约保持不变。

当前 playground 还补上了轻量 viewport controls parity：renderer shell 暴露 Zoom in / Zoom out / Fit view 控件与快捷键，底层仍然通过 core command 修改 `GraphDocument.viewport`，用来证明缩放和视口摘要也可以沿用同一条 command/history/action 边界，而不是做成独立页面局部状态。

当前 card/list canvas 也加入了 minimap-style overview shell：它仍然不是最终 `@xyflow/react` minimap 适配器，而是 renderer 层基于节点坐标生成的轻量概览图，用于验证 overview UI、节点空间分布摘要以及“从概览选择节点”这类交互同样可以复用既有 selection/inspector 边界。

当前 edge list 与 export shell 也开始更接近 legacy parity：edge row 不再只显示 label 和 source/target，而是额外暴露 condition 摘要与 line-style badge；playground 的 latest export 面板则会从导出的 JSON 中解析节点数、边数、line styles 和 viewport zoom，帮助验证 inspector 改动是否如预期反映到导出结构。

当前 card/list canvas 还补上了一个轻量 connection mode shell：用户可以先从节点 quick action 或 footer 进入“Start connection”，再点击第二个节点完成 `addEdge`，从而在真正接入 `@xyflow/react` handles 前，先验证“连接 affordance 只是 renderer 事件桥接，真正的连线 mutation 仍走 core command/history 边界”。

当前 playground toolbar 也继续朝 document-level flow actions 补齐：像 `Clear Selection` 这类动作仍然保持 schema-driven，由 host toolbar 直接 dispatch `designer:*` action，而不是把这类页面命令硬编码进共享 runtime UI。

当前 card/list canvas 也开始显式模拟 pane-click 语义：点击空白 canvas surface 会退出 connection mode 并清空 selection，用来先验证未来 `@xyflow/react` pane click 到 `clearSelection` 的桥接契约。

当前 renderer 内部也开始把 card/list MVP 视图提炼成单独 canvas adapter 组件，先把现有 shell 交互从 page shell 中拆出去，为后续替换成真正的 `@xyflow/react` adapter 做边界收敛。

当前 `designer-page` 也开始显式接受 `canvasAdapter` 选择，renderer 内部已经可以在同一套 host scope / core command 契约上切换 card adapter 与 xyflow-preview adapter，用来先固定 callback/selection/connect 语义，再落真正的 `@xyflow/react` 依赖。

### 10.1 事务与历史边界

Flow Designer 需要统一的事务边界，即使历史底层实现最终同时支持 patch 和 snapshot 两种存储方式。

必须满足：

- 拖拽一个或多个节点只产生一条逻辑历史记录
- 自动布局、批量删除、批量更新等复合操作可包裹在同一 transaction 中
- action handler 不得各自写出独立历史格式；必须进入统一 operation/history pipeline
- patch 与 snapshot 的取舍可以按 operation 类别决定，但 undo/redo 语义必须稳定

## 11. 固定宿主 Scope

为了让 schema 片段稳定工作，`designer-page` 必须注入固定宿主 scope。

推荐暴露：

- `doc`：当前 graph 文档
- `selection`：当前选中摘要
- `activeNode`：当前激活节点
- `activeEdge`：当前激活边
- `runtime`：只读运行时能力摘要
- `actions`：供 schema 层引用的辅助能力

这样 inspector 和 toolbar schema 可以稳定写成：

```json
{
  "type": "tpl",
  "tpl": "当前节点：${activeNode.data.label}"
}
```

## 12. 性能策略

### 12.1 编译优先

- designer 配置初始化时解析为 normalized config
- nodeTypes、ports、edgeTypes 预编译为索引结构
- schema 片段交由现有 schema compiler 编译
- graph action handler 预注册

### 12.2 局部订阅

- canvas 只订阅图状态
- inspector 主要订阅 `activeNode` / `activeEdge`
- palette 主要订阅 nodeTypes 和可创建性摘要
- 不让整个 designer 因单节点属性变动全局重渲染

### 12.3 缓存策略

- node type lookup 使用 Map
- port matcher 预编译为快速判定结构
- action handler 注册表常驻缓存
- schema fragment 使用编译结果复用
- edges 建议维护按 `source` / `target` / `port` 的邻接索引，避免高频连接校验退化为全表扫描

### 12.4 增量更新

- 更新单节点数据只替换该节点引用
- 历史记录按操作快照或 patch 管理
- 避免每次 `JSON.stringify` 全文档比较脏状态
- store selector 应优先依赖结构共享和浅比较，避免 inspector、palette、canvas 互相放大重渲染

### 12.5 大图场景

需要把 1000+ 节点和复杂连线视为明确压力场景，而不是实现后的补充优化。

建议约束：

- inspector 只订阅 active target，不订阅整份 document
- palette、minimap、selection overlay 各自使用独立 selector
- 自动布局、批量校验、导出可采用分批或延迟执行
- 对大图不默认承诺所有 UI 面板都随每次节点移动实时全量更新

## 13. 扩展机制

扩展优先级：

1. designer config
2. schema fragments
3. renderer registry
4. plugins

支持的扩展点：

- 自定义 node renderer
- 自定义 edge renderer
- 自定义 designer action
- 自定义 layout engine
- 自定义 document validator
- 自定义预设

### 13.1 事件与生命周期

除命令式 action 之外，还需要明确的事件与生命周期扩展点。

建议至少覆盖：

- `selectionChanged`
- `nodeAdded`
- `nodeMoved`
- `edgeConnected`
- `documentChanged`
- `validationFailed`
- `historyCommitted`

生命周期 hook 推荐区分两类：

- before hooks：允许拒绝或改写 create/connect/delete 等输入
- after hooks：只做观察、审计、同步、副作用派发

不要把这两类能力混在普通 store subscribe 里。

## 14. 错误处理与测试分层

需要把错误与测试边界写成实现约束，而不只是实现细节。

错误至少分为：

- config normalize / validate 错误
- migration 错误
- permission / rule expression 错误
- graph action 执行错误
- canvas adapter / renderer 集成错误

测试建议分层：

- `core`：纯文档变换、连接校验、history、migration、permission evaluation、transaction 合并
- `renderers`：宿主 scope 注入、`designer:*` action 接线、schema inspector/createDialog 集成、canvas adapter 互操作

## 15. 与旧示例的关系

- 旧示例继续保留，作为单页演示和交互参考
- 新模块不直接侵入旧示例结构
- 现在已经有一个基于 `designer-page` 的 playground parity example，但它仍然是第一阶段 MVP，不代表已经完成全部 legacy parity

## 16. 推荐落地顺序

1. 定义 `core` 文档模型与配置模型
2. 实现 role/port matcher 和 graph action 基础能力
3. 实现 `designer-page`、`designer-canvas`、`designer-palette`
4. 接入 fixed scope 和 `designer:*` action
5. 用 schema 片段跑通 inspector / create dialog
6. 最后补齐 preset、layout、导出、验证
