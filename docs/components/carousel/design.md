# Carousel 组件设计

## 1. 组件定位

- `carousel` 是轮播展示 renderer。
- 它负责按顺序切换一组内容项，不负责通用导航菜单或复杂数据工作流。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `carousel`。
- Flux 正式契约应优先保留 items、自动播放、切换控制等稳定能力。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'carousel'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `items`、`autoPlay`、`interval`、`loop`、`controls`、`indicators`。

## 5. 字段分类

- `items`、`autoPlay`、`interval`、`loop`、`controls`、`indicators`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `items` 建议为轮播项集合，每项可带 `body` 或媒体配置。

## 7. 运行期状态归属

- 当前活动项属于组件自己的交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:next`、`component:prev`、`component:setValue`。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-carousel` marker。

## 11. 实现拆分建议

- items 归一化、当前项状态桥接、visual primitive 适配分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `cards`、`image`、`video` 族重复建模。
