# Designer Page 组件设计

## 1. 组件定位

- `designer-page` 是 Flow Designer 的宿主级根 renderer。
- 它负责把 graph runtime、designer action namespace 和标准 `SchemaRenderer` regions 组织在同一壳层内。
- 本文档只拥有 `designer-page` 单 renderer 契约；Flow Designer 平台分层、host abstraction 和 family-level collaboration 由 `docs/architecture/flow-designer/` 文档族负责。

## 2. 与 AMIS 或既有产品的能力对照

- 当前仓库已经落地 designer host、palette、canvas、inspector 与导出 JSON 视图。
- 文档基线应以 Flow Designer 分层架构为准，而不是把它视为普通页面组件。
- 如果问题涉及 Flow Designer family 边界、bridge、snapshot、command adapter 或平台抽象，应先回到 `docs/architecture/flow-designer/README.md`。

## 3. Flux 中的 renderer/type 定义

- `type: 'designer-page'`
- `sourcePackage: '@nop-chaos/flow-designer-renderers'`
- 当前 regions: `title`、`toolbar`、`inspector`、`dialogs`
- 当前 action policy: `actionScopePolicy: 'new'`

## 4. schema 设计

- 关键字段是 `title`、`className`、`visible`、`hidden`、`disabled`、`document`、`treeDocument`、`statusPath`、`config`、`toolbar`、`inspector`、`dialogs`。
- `title` 当前是已接线的 `value-or-region` host page title surface，而不是仅文档声明未消费字段。
- `document` / `treeDocument` 与 `config` 是宿主输入；当前 live baseline 不只要求“至少提供一种文档输入”，还要求 graph mode 提供 `document`、tree mode 提供 `treeDocument`，并且 formal schema validation 会对缺失前置条件报错，而不是只在运行时退回 fallback shell。
- `statusPath` 是当前支持的宿主外部摘要发布入口，而不是 future-only 设计草案。
- `designer-page` 当前不再发布额外的 `$designer` Flux-native scope export。designer 只读数据入口统一来自 host projection / host scope，而不是并行的 renderer metadata 别名。
- `config` 仍是宿主输入，但其中 schema-bearing nested leaves（如 `nodeTypes[].body`、`quickActions`、`edgeTypes[].body`、`createDialog.body`、`inspector.body`）现在由 `designer-page` 的 custom field compilation path 预编译为 `TemplateNode` fragments，并作为 atomic compiled values 保留到运行时；Flow consumption paths continue to render them through `RenderNodes` / `helpers.render(...)` without recompiling raw authored schema at render time.

## 5. 字段分类

- `className`、`visible`、`hidden`、`disabled`、`document`、`treeDocument`、`statusPath`、`config`: `value`
- `title`、`toolbar`、`inspector`、`dialogs`: `region`

## 6. regions 与 slot 约定

- `title` 用于 designer workbench 顶部标题区，可用纯值或 schema region。
- `toolbar` 用于 designer 顶部动作区。
- `inspector` 用于右侧 schema 渲染区域。
- `dialogs` 用于 designer 内部补充弹层挂载点。
- palette 和 canvas 当前由内建 renderer 壳层承接，不作为自由 region 暴露。
- 左右工作台显隐和收缩行为遵循 `docs/architecture/designer-workbench-shell.md`：palette/inspector 的 canonical existence 来自 resolved config，`inspector` region 只是 override surface，不意味着右侧必须永远存在。
- 当前 live baseline里，左侧仅在 `config.palette.groups` 解析出 palette 时存在；右侧仅在 node/edge inspector config 解析出 inspector surface 时存在。

## 7. 运行期状态归属

- graph document、selection、history、dirty 等归 `flow-designer-core`。
- schema 片段通过宿主 scope 读取 designer snapshot，通过 `designer:*` actions 提交写操作。
- `designer-page` 属于 `Domain Host Owner`：内部读面是 `Host Projection`，宿主外部若需要观测其状态，应通过窄 `statusPath` 摘要而不是通过 `id` / `name` 或全局 host scope 注入读取。

### Tree Mode Constraint

- 当 `config.documentMode === 'tree'` 时，`designer-page` 承载的是 structured process tree，而不是自由 graph。
- 画布上的 nodes/edges 在 tree mode 下是投影结果和交互桥接面，不是 authoring source of truth。
- tree mode 当前不再维护 renderer-local React tree 副本；host 传入的 `treeDocument` 仍是唯一结构 owner，`DesignerCore` 只持有投影后的 graph/history 视图。
- tree mode 的 saved baseline 也必须和 owner tree 绑定：`save()` 保存的是 projected graph 与 paired `treeDocument`，`restore()` 也必须一起回放两者，避免只恢复 graph 后又被较新的 owner tree 重新投影覆盖。
- tree mode 下的结构编辑应通过结构化命令完成，例如插入链节点、插入 branch group、在 merge continuation 之前插入节点、删除节点、调整 branch 顺序。
- tree mode 不应默认暴露自由连线、自由重连、手工拖拽排版这类 graph-first 操作。

## 8. 事件、动作与组件句柄能力

- 当前通过 `designer` namespace 暴露动作能力。
- 页面级工具栏和快捷键都应复用同一命令适配层，而不是各自直连 core store。

## 9. 数据源、表达式、导入能力接入点

- 设计器 schema 片段通过宿主 scope 读取只读快照。
- 导入能力应通过 action namespace 和 adapter 提供，而不是把 store 实例暴露给通用 renderer。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-designer` marker。
- 视觉壳是设计器工作台，不应和普通页面共享隐式布局假设。
- Flow Designer 主题收敛到 `className` / `classAliases` / node-edge `appearance` / `fd-theme-root` CSS variables；当前 live baseline 不再把 `config.themeStyles` 视为受支持的主路径样式入口。
- 当前 live baseline 下，Flow Designer package CSS 不再在 `.fd-theme-root` / `.nop-designer` 根上重声明默认 `--fd-*` token。包内默认值通过各视觉使用点的 fallback 读取提供，host 仍可在任意祖先作用域覆写 `--fd-*`。
- palette 图标外观当前优先走 `nodeType.appearance.borderColor` / `resolveNodeTypeAccent()` 派生的 `--fd-palette-accent` 路径；内置默认色只作为 fallback，而不是继续依赖 `nodeType.id -> css class -> hex gradient` 的私有映射表。
- 当前 live baseline 下，DingFlow add-node 浮层若声明 `role="menu"`，则必须提供 roving focus 与 `Arrow` / `Home` / `End` 键盘模型；canvas 上可聚焦 node / edge 交互根若声明 `role="button"`，则必须提供稳定 `aria-label`，并通过 `aria-pressed` 暴露 selected state。

## 11. 实现拆分建议

- host shell、action provider、snapshot bridge、toolbar/palette/canvas/inspector 内容组件继续分离维护。

## 12. 风险、取舍与后续阶段

- 最主要风险是 schema runtime 和 graph runtime 职责串层。
- palette/canvas 是否进一步 schema 化，需要在稳定 host bridge 后再决定。

## 13. 相关文档

- `docs/architecture/flow-designer/README.md` - family 入口与 owner boundary
- `docs/architecture/flow-designer/design.md` - 平台扩展架构总览
- `docs/architecture/complex-control-host-protocol.md` - 宿主协议层规则
