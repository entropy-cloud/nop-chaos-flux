# Icon 组件设计

## 1. 组件定位

- `icon` 是独立的图标展示 renderer，用来输出语义图标而不是通用图片资源。
- 它服务于按钮、标签、状态展示和标题补充等轻量场景。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现只需要 `icon` 名称。
- 图标尺寸、颜色和可访问性文本应通过通用样式字段与必要的 `aria-label` 扩展补齐，而不是把图标 renderer 做成迷你图片组件。

## 3. Flux 中的 renderer/type 定义

- `type: 'icon'`
- `category: 'content'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`

## 4. schema 设计

- 当前导出字段为 `icon`。
- 建议后续补充 `size`、`title`、`decorative` 等可访问性与视觉字段，但名称应优先对齐 `lucide-react` / UI icon adapter 的通用语言。

## 5. 字段分类

- `icon`: `value`
- `size`、`title`、`decorative`: `value`

## 6. regions 与 slot 约定

- `icon` 不暴露 regions。
- 复杂图标组合应通过容器或按钮等上层组件完成。

## 7. 运行期状态归属

- 无内部状态。

## 8. 事件、动作与组件句柄能力

- 首版不提供事件。
- 如果图标需要交互，应由 `button` 或 `link` 包裹，不建议把 `icon` 直接升级为操作组件。

## 9. 数据源、表达式、导入能力接入点

- `icon` 字段可接表达式结果，但结果必须是稳定图标名。
- 外部图标映射和注册应由 icon adapter 负责。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-icon` marker。
- 视觉尺寸和颜色优先来自样式系统，不由 renderer 内部硬编码。

## 11. 实现拆分建议

- 图标查找、fallback 和错误处理应集中在共享 icon utils。

## 12. 风险、取舍与后续阶段

- 如果未来支持自定义 SVG，需要明确与 `image` 的边界。
- 未注册图标的回退策略需要统一，避免各 renderer 自己兜底。
