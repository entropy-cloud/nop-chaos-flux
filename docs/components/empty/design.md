# Empty 组件设计

## 1. 组件定位

- `empty` 是通用空态展示 renderer。
- 它负责在没有数据、没有选择或没有配置时输出一致的空态壳层。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但 UI 层已有 `Empty` primitive 可复用。
- 首版应覆盖标题、描述和可选 actions，不引入复杂插画系统协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'empty'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `title`、`description`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`description`、`image`、`actions`。

## 5. 字段分类

- `title`、`description`: `value-or-region`
- `image`: `value`
- `actions`: `region`

## 6. regions 与 slot 约定

- `title` 和 `description` 可为简单文本或受限 schema。
- `actions` 用于空态 CTA。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- 交互主要存在于 `actions` 子区域。

## 9. 数据源、表达式、导入能力接入点

- 所有文案和图片都可来自表达式或 loader 产出。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-empty` marker。
- 视觉层复用 `@nop-chaos/ui` Empty。

## 11. 实现拆分建议

- 文案、插图和 actions 组合逻辑与空态场景判断分离。

## 12. 风险、取舍与后续阶段

- 需要避免每个业务组件重新定义一套空态 DSL；`empty` 应作为统一出口。