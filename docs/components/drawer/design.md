# Drawer 组件设计

## 1. 组件定位

- `drawer` 是抽屉式弹层 renderer。
- 它与 `dialog` 共享弹层语义，但强调边缘滑入和较强的上下文保留。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库有 `@nop-chaos/ui` Drawer primitive，但尚未落位通用 renderer。
- 首版应优先保留方向、打开态和内容区，不额外复制一整套 dialog 专属字段别名。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'drawer'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `title`、`body`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`body`、`actions`、`open`、`defaultOpen`、`side`、`size`、`showCloseButton`。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `open`、`defaultOpen`、`side`、`size`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- 与 `dialog` 基本一致。

## 7. 运行期状态归属

- 打开态与 `dialog` 一样应明确 ownership。

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`。
- `onOpen`、`onClose` 通过 action schema 触发，示例应覆盖至少一组最小事件用法。

## 9. 数据源、表达式、导入能力接入点

- 与 `dialog` 一致，内容与标题支持表达式和 regions。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-drawer` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Drawer。

## 11. 实现拆分建议

- 抽屉 open-state、方向/尺寸映射和 host integration 分离。

## 12. 风险、取舍与后续阶段

- 需要避免 dialog/drawer 两套契约出现命名漂移；差异应尽量只保留在 `side` 和视觉壳层。
