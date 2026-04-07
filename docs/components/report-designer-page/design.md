# Report Designer Page 组件设计

## 1. 组件定位

- `report-designer-page` 是报表设计器宿主根 renderer。
- 它把 spreadsheet runtime、report designer runtime、字段面板、toolbar、inspector 和 dialogs 组织为同一工作台。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地 `document`、`designer`、`profile`、`adapters`、`toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`。
- 这是领域宿主，不应退化为普通页面组合模板。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-designer-page'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 regions: `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`
- 当前 fields: `title` 为 `value-or-region`

## 4. schema 设计

- `document` 和 `designer` 是核心必填输入。
- `profile` 和 `adapters` 是可选宿主扩展入口。
- `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body` 是主要 regions。

## 5. 字段分类

- `title`: `value-or-region`
- `document`、`designer`、`profile`、`adapters`: `value`
- `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`: `region`

## 6. regions 与 slot 约定

- `toolbar` 承接顶部设计器动作区。
- `fieldPanel` 承接左侧字段源。
- `inspector` 承接右侧属性面板。
- `body` 承接中央 spreadsheet 或其他主工作区扩展。

## 7. 运行期状态归属

- 表格编辑状态归 spreadsheet runtime。
- 报表语义层状态归 report designer runtime/adapters。
- schema 片段通过宿主 scope 读取快照，并通过命名空间动作写操作。

## 8. 事件、动作与组件句柄能力

- 顶层动作优先走 `report-designer:*` 与 `spreadsheet:*` 命名空间。
- 页面自身不应暴露大而全的 imperative ref。

## 9. 数据源、表达式、导入能力接入点

- `profile` 和 `adapters` 是外部领域能力的主扩展点。
- schema 片段应通过宿主提供的数据快照读取字段源和当前选中对象。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-designer-page` marker。
- 工作台布局遵循 report designer 架构，而不是普通页面默认间距。

## 11. 实现拆分建议

- host shell、桥接层、toolbar/fieldPanel/inspector adapters 和 spreadsheet body 分层维护。

## 12. 风险、取舍与后续阶段

- 最主要风险是 spreadsheet 与 report designer 两层职责混杂。
- profile 适配边界必须保持稳定，避免对单一后端模型形成耦合。