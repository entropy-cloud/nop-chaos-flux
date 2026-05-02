# Spreadsheet Page 组件设计

## 1. 组件定位

- `spreadsheet-page` 是可独立复用的工作表编辑宿主 renderer。
- 它负责创建 spreadsheet runtime、注册 `spreadsheet:*` 命名空间动作，并组织 toolbar、body 和 dialogs。
- 本文档只拥有 `spreadsheet-page` 单 renderer 契约；Spreadsheet/Report workbench 的 family-level 架构与 host abstraction 由 `docs/architecture/report-designer/` 文档族负责。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地 `document`、`config`、`readOnly`、`toolbar`、`body`、`dialogs`。
- `statusbar` 等工作台补充区域仍可后续加入，但不影响当前根壳层契约。
- 如果问题涉及 spreadsheet canvas 在整个 report/spreadsheet family 中的边界、契约或平台扩展定位，应先回到 `docs/architecture/report-designer/README.md`。

## 3. Flux 中的 renderer/type 定义

- `type: 'spreadsheet-page'`
- `sourcePackage: '@nop-chaos/spreadsheet-renderers'`
- 当前 regions: `toolbar`、`body`、`dialogs`
- 当前 fields: `title` 为 `value-or-region`

## 4. schema 设计

- `document` 是核心必填输入。
- `config`、`readOnly` 为宿主配置。
- `toolbar`、`body`、`dialogs` 为主要 regions。
- 目标设计中，如需让宿主外部读取 spreadsheet host 摘要，应使用 `statusPath`，而不是把完整 host snapshot 暴露到 page 全局 scope。

## 5. 字段分类

- `title`: `value-or-region`
- `document`、`config`、`readOnly`: `value`
- `toolbar`、`body`、`dialogs`: `region`

## 6. regions 与 slot 约定

- `toolbar` 用于顶部命令区。
- `body` 用于 spreadsheet canvas 或其他主工作区扩展。
- `dialogs` 用于附加弹层挂载点。

## 7. 运行期状态归属

- worksheet document、selection、editing、history 和 viewport 归 spreadsheet core。
- schema 片段通过宿主数据快照读取运行时摘要，不直接操作内部 store。
- `spreadsheet-page` 属于 `Domain Host Owner`：内部读面是 host snapshot projection，宿主外部若需要只读观察，应通过窄 `statusPath` 摘要发布。

## 8. 事件、动作与组件句柄能力

- 顶层交互通过 `spreadsheet:*` 命名空间动作进行。
- 页面本体可以长期保持无专用 imperative ref，统一走动作通道。

## 9. 数据源、表达式、导入能力接入点

- `document` 和 `config` 可由 loader 或宿主适配层提供。
- 导入导出等能力应由 namespace actions 或外部 toolbar 组合提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-spreadsheet-page` marker。
- Canvas 内部样式遵循 `ss-* + inline style + data-*` 的性能优先策略，外壳仍遵循普通 styling system。

## 11. 实现拆分建议

- runtime bridge、host snapshot、toolbar/body shell 和 spreadsheet namespace provider 分层实现。
- `spreadsheet-toolbar.tsx` 当前只保留顶层 composition shell；toolbar action groups、button primitives、find/replace panel、cell/comment editor panel 已拆到 `packages/spreadsheet-renderers/src/spreadsheet-toolbar/` 下的独立子模块。
- `SpreadsheetToolbarProps` 继续作为稳定顶层契约，由 shell 统一编排这些子模块；拆分只收敛实现职责，不改变对外 prop surface。

## 12. 风险、取舍与后续阶段

- 最大风险是把 canvas 内部性能敏感实现和外壳层普通 Tailwind 风格混在一起。
- 工作台扩展区域需要在不破坏核心壳层的前提下分阶段增加。

## 13. 相关文档

- `docs/architecture/report-designer/README.md` - family 入口与 owner boundary
- `docs/architecture/report-designer/design.md` - 平台扩展架构总览
- `docs/architecture/report-designer/spreadsheet-canvas-css.md` - canvas 样式性能边界
