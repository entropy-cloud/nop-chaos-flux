# Report Field Panel 组件设计

## 1. 组件定位

- `report-field-panel` 是报表设计器左侧字段源面板 renderer。
- 它负责展示可拖入工作表的字段、分组和空态提示。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已公开 `emptyLabel`、`showFieldSourceHeader`、`dragEnabled`。
- 搜索、分组折叠和多数据源切换可后续补充。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-field-panel'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 fields: `title` 为 `value-or-region`

## 4. schema 设计

- 当前核心字段是 `emptyLabel`、`showFieldSourceHeader`、`dragEnabled`。
- 建议长期增加字段源摘要或过滤策略字段，但具体字段数据仍由 designer profile/adapters 提供。

## 5. 字段分类

- `title`: `value-or-region`
- `emptyLabel`、`showFieldSourceHeader`、`dragEnabled`: `value`

## 6. regions 与 slot 约定

- `title` 为当前显式 slot。
- 字段项本身不建议开放任意 region，而应由 profile 产生规范字段视图模型。

## 7. 运行期状态归属

- 字段源数据归 report designer runtime/adapters。
- 拖拽中的 hover/preview 属于局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 主要交互是拖拽到 spreadsheet canvas 或触发字段插入动作。

## 9. 数据源、表达式、导入能力接入点

- 字段源来自 profile 或 adapter 注册结果，不由 renderer 直接请求。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-field-panel` marker。
- 需要与工作台左侧面板壳层共享稳定视觉语言。

## 11. 实现拆分建议

- 字段源投影、列表渲染和拖拽 bridge 分离。

## 12. 风险、取舍与后续阶段

- 如果把 adapter 协议混入 renderer 私有 props，会削弱报表设计器的通用性。
