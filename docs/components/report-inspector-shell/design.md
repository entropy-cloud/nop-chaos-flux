# Report Inspector Shell 组件设计

## 1. 组件定位

- `report-inspector-shell` 是报表设计器右侧 inspector 的外壳 renderer。
- 它负责标题、空态、未选中态、保存态和错误态的统一承载。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已暴露 `title` 为 `value-or-region`，并有多组标签字段。
- 它不是属性面板内容本身，而是属性面板的状态壳层。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-inspector-shell'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 fields: `title` 为 `value-or-region`，`emptyLabel`、`noSelectionLabel`、`saveLabel`、`errorLabel` 为普通值字段

## 4. schema 设计

- 当前导出字段包括 `emptyLabel`、`noSelectionLabel`、`saveLabel`、`errorLabel`。
- 建议正式契约同时允许 `title`、`body` 或 `panels` 一类内部内容输入，但状态标签仍由 shell 自身持有。

## 5. 字段分类

- `title`: `value-or-region`
- `emptyLabel`、`noSelectionLabel`、`saveLabel`、`errorLabel`: `value`

## 6. regions 与 slot 约定

- `title` 是当前唯一显式 slot。
- 面板内容建议由内层 `report-inspector` 负责，而不是让 shell 同时承担内容列表逻辑。

## 7. 运行期状态归属

- 当前选中目标、保存中状态和错误态来自 report designer host snapshot。

## 8. 事件、动作与组件句柄能力

- shell 自身通常不暴露复杂动作；保存、恢复等交互应由 toolbar 或 inspector action 发起。

## 9. 数据源、表达式、导入能力接入点

- 标题和状态文案可来自表达式或 profile 注入。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-inspector-shell` marker。
- 视觉样式应与 report designer 工作台右侧面板保持统一。

## 11. 实现拆分建议

- 状态壳、标题区和内容容器继续分拆。

## 12. 风险、取舍与后续阶段

- shell 和具体 inspector 面板逻辑需要持续保持分层，避免相互渗透。
