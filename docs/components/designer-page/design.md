# Designer Page 组件设计

## 1. 组件定位

- `designer-page` 是 Flow Designer 的宿主级根 renderer。
- 它负责把 graph runtime、designer action namespace 和标准 `SchemaRenderer` regions 组织在同一壳层内。

## 2. 与 AMIS 或既有产品的能力对照

- 当前仓库已经落地 designer host、palette、canvas、inspector 与导出 JSON 视图。
- 文档基线应以 Flow Designer 分层架构为准，而不是把它视为普通页面组件。

## 3. Flux 中的 renderer/type 定义

- `type: 'designer-page'`
- `sourcePackage: '@nop-chaos/flow-designer-renderers'`
- 当前 regions: `toolbar`、`inspector`、`dialogs`
- 当前 action policy: `actionScopePolicy: 'new'`

## 4. schema 设计

- 关键字段是 `document`、`config`、`toolbar`、`inspector`、`dialogs`。
- `document` 和 `config` 是必填宿主输入，不应通过隐式全局单例获取。

## 5. 字段分类

- `document`、`config`: `value`
- `toolbar`、`inspector`、`dialogs`: `region`

## 6. regions 与 slot 约定

- `toolbar` 用于 designer 顶部动作区。
- `inspector` 用于右侧 schema 渲染区域。
- `dialogs` 用于 designer 内部补充弹层挂载点。
- palette 和 canvas 当前由内建 renderer 壳层承接，不作为自由 region 暴露。

## 7. 运行期状态归属

- graph document、selection、history、dirty 等归 `flow-designer-core`。
- schema 片段通过宿主 scope 读取 designer snapshot，通过 `designer:*` actions 提交写操作。

## 8. 事件、动作与组件句柄能力

- 当前通过 `designer` namespace 暴露动作能力。
- 页面级工具栏和快捷键都应复用同一命令适配层，而不是各自直连 core store。

## 9. 数据源、表达式、导入能力接入点

- 设计器 schema 片段通过宿主 scope 读取只读快照。
- 导入能力应通过 action namespace 和 adapter 提供，而不是把 store 实例暴露给通用 renderer。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-designer` marker。
- 视觉壳是设计器工作台，不应和普通页面共享隐式布局假设。

## 11. 实现拆分建议

- host shell、action provider、snapshot bridge、toolbar/palette/canvas/inspector 内容组件继续分离维护。

## 12. 风险、取舍与后续阶段

- 最主要风险是 schema runtime 和 graph runtime 职责串层。
- palette/canvas 是否进一步 schema 化，需要在稳定 host bridge 后再决定。