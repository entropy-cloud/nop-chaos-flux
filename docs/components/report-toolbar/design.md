# Report Toolbar 组件设计

## 1. 组件定位

- `report-toolbar` 是报表设计器顶部工具栏 renderer。
- 它负责渲染稳定的一组 toolbar items，并把点击转换为 designer 或 spreadsheet 命令。

## 2. 与 AMIS 或既有产品的能力对照

- 当前公开 `itemsOverride` 作为覆盖默认项的入口。
- 更复杂的分组、溢出和自定义下拉菜单属于后续增强。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-toolbar'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 fields: `itemsOverride` 为 `prop`

## 4. schema 设计

- 核心字段是 `itemsOverride`，其元素类型为 `ToolbarItem`。
- `ToolbarItem` 当前支持 `button`、`divider`、`spacer`、`text`、`badge`、`switch`、`title`。

## 5. 字段分类

- `itemsOverride`: `value`

## 6. regions 与 slot 约定

- 当前不需要自由 region。
- 单个工具项如需复杂展示，优先扩展 `ToolbarItem` 类型集合，而不是直接开放任意 schema 数组。

## 7. 运行期状态归属

- 激活态、禁用态和可见性通常来自 designer snapshot 或 profile。
- 下拉打开态等局部交互由 UI 组件本地管理。

## 8. 事件、动作与组件句柄能力

- 工具项的 `action` 应映射到命名空间动作。
- 工具栏本体无需专用组件句柄。

## 9. 数据源、表达式、导入能力接入点

- `itemsOverride` 可由宿主按配置注入。
- 各 item 的 `disabled`、`active`、`visible` 可使用表达式。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-toolbar` marker。
- 视觉层应复用 `@nop-chaos/ui` Toolbar/ButtonGroup/Button 等 primitives。

## 11. 实现拆分建议

- 默认 toolbar 生成、item 映射和动作桥接拆开维护。

## 12. 风险、取舍与后续阶段

- 如果 `ToolbarItem` 类型持续膨胀，需要在合适阶段升级为更正式的 toolbar schema 契约。