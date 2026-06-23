# Image 组件设计

## 1. 组件定位

- `image` 是静态或动态图片展示 renderer。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但已列入高优先级通用 renderer。
- 首版应聚焦 `src`、`alt`、尺寸和预览开关，不混入媒体库管理能力。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'image'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `src`、`alt`、`title`、`preview`、`fit`、`width`、`height`、`lazy`。

## 5. 字段分类

- `src`、`alt`、`title`、`preview`、`fit`、`width`、`height`、`lazy`: `value`

## 6. regions 与 slot 约定

- 首版不需要 regions。

## 7. 运行期状态归属

- 图片加载错误和放大预览打开态可为局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 可提供 `onClick` 和 `onLoadError`。
- `example.json` 至少应展示一个事件入口，避免契约与示例脱节。

## 9. 数据源、表达式、导入能力接入点

- `src` 可来自表达式或 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-image` marker。

## 11. 实现拆分建议

- 图片显示、预览层和错误回退逻辑分模块。
- **懒加载**：`lazy: true` 时使用原生 `loading="lazy"` 属性（现代浏览器支持），无需独立组件。旧浏览器 fallback 使用 IntersectionObserver 监测图片进入视口后再设置 `src`。这是移动端商城首页/商品列表大量图片场景的关键性能优化。

## 12. 风险、取舍与后续阶段

- 需要和 `icon`、`avatar` 边界区分清楚：`image` 表达资源图片，不是语义图标。
- 懒加载 `lazy` 字段对齐移动商城场景（van-lazyload 等价物），是 image renderer 的内建行为，不需要独立 LazyLoad 容器组件。
