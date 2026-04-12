# Grid 组件设计

## 1. 组件定位

- `grid` 是显式网格布局 renderer，用来按列、行和断点组织子内容。
- 它补充 `flex`，但不替代 `flex`；`flex` 负责一维布局，`grid` 负责二维布局。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `grid`。
- Flux 正式契约应优先表达稳定布局语义，而不是把大量 className slot 或历史 mode 名写进组件字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'grid'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `columns`、`gap`、`items`、`autoFlow`、`alignItems`、`justifyItems`。

## 5. 字段分类

- `columns`、`gap`、`items`、`autoFlow`、`alignItems`、`justifyItems`: `value`

## 6. regions 与 slot 约定

- `items` 表示网格项集合。
- 网格项本身建议是对象值，每项可带 `body`、`colSpan`、`rowSpan`。

## 7. 运行期状态归属

- `grid` 本身无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `columns` 和 `items` 可由表达式值产生，但最终应归一化为明确布局配置。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-grid` marker。
- 视觉布局由 schema 和样式系统决定，不在 renderer 中写死间距类名。

## 11. 实现拆分建议

- 网格项归一化、断点映射、child 渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把 `grid` 做成第二套任意容器，从而和 `container`、`flex` 重新重叠。
