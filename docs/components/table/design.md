# Table 组件设计

## 1. 组件定位

- `table` 是结构化数据展示 renderer，用来渲染列定义、分页、选择和部分表格交互。
- 它是当前 runtime 中第一个明确采用 ownership 模型管理复杂交互状态的 data renderer。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现列定义、分页、选择、expandable、empty 区域和多类事件。
- 排序、筛选和行内编辑仍处于收敛阶段，文档需要优先强调现有 ownership 与 handle 基线，而不是过早承诺 AMIS 全量能力。

## 3. Flux 中的 renderer/type 定义

- `type: 'table'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 当前 fields: `empty` 为 `value-or-region`；`onRowClick`、`onSortChange`、`onFilterChange`、`onPageChange`、`onSelectionChange`、`onRefresh` 为 `event`

## 4. schema 设计

- 关键字段包括 `columns`、`pagination`、`rowSelection`、`expandable`、`empty`、`loading`。
- 当前已落地 `paginationOwnership`、`selectionOwnership`、`paginationStatePath`、`selectionStatePath`。

## 5. 字段分类

- `columns`、`pagination`、`rowSelection`、`expandable`: `value`
- `empty`: `value-or-region`
- 各类 `onXxx`: `event`

## 6. regions 与 slot 约定

- `empty` 是当前正式的 value-or-region slot。
- 列头、自定义单元格和扩展行内容通过 `labelRegionKey`、`cellRegionKey`、`expandedRowRegionKey` 走受控 region key 方案，而不是任意函数型 render prop。

## 7. 运行期状态归属

- 当前明确支持 `paginationOwnership` 和 `selectionOwnership`，可取 `local`、`controlled`、`scope`。
- 排序、筛选和展开尚未完整进入同一 ownership 体系，需要在后续阶段继续统一。

## 8. 事件、动作与组件句柄能力

- 当前事件已覆盖行点击、排序、过滤、分页、选择和刷新。
- 当前组件句柄基线是 `component:refresh`、`component:getSelection`、`component:setSelection`。

## 9. 数据源、表达式、导入能力接入点

- 表格数据应由上游 scope、loader 或 `data-source` 注入为最终 rows。
- 表格不负责请求协议本身，但可通过 `onRefresh` 与 source runtime 协作。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-table` marker。
- 表格视觉壳应复用 `@nop-chaos/ui` Table 体系；排序、选择和空态等状态通过稳定 marker 与 `data-*` 表达。

## 11. 实现拆分建议

- 列归一化、ownership 状态桥接、selection 句柄和分页 UI 拆分为独立模块。

## 12. 风险、取舍与后续阶段

- 表格是复杂状态最容易失控的组件，需要持续坚持 ownership 模型。
- 列级渲染定制必须控制边界，避免引回任意 React 函数 slot。