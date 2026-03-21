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

### 3.2 `@nop-chaos/flow-designer-renderers`

职责：与现有 `SchemaRenderer` 集成。

建议包含：

- `designer-page`、`designer-canvas`、`designer-palette` 等 `RendererDefinition`
- `createFlowDesignerRegistry()` 或 `registerFlowDesignerRenderers()`
- graph runtime 到 schema runtime 的桥接层
- 宿主 scope 注入
- `designer:*` action 注册
- 与 `@xyflow/react` 的适配

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

好处：

- toolbar 按钮可直接触发
- inspector 表单可直接提交到 designer action
- 快捷键和浮动工具栏可复用同一动作分发链

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

### 12.4 增量更新

- 更新单节点数据只替换该节点引用
- 历史记录按操作快照或 patch 管理
- 避免每次 `JSON.stringify` 全文档比较脏状态

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

## 14. 与旧示例的关系

- 旧示例继续保留，作为单页演示和交互参考
- 新模块不直接侵入旧示例结构
- 后续可以单独增加一个基于 `designer-page` 的新示例页

## 15. 推荐落地顺序

1. 定义 `core` 文档模型与配置模型
2. 实现 role/port matcher 和 graph action 基础能力
3. 实现 `designer-page`、`designer-canvas`、`designer-palette`
4. 接入 fixed scope 和 `designer:*` action
5. 用 schema 片段跑通 inspector / create dialog
6. 最后补齐 preset、layout、导出、验证
