# Carousel 组件设计

## 1. 组件定位

- `carousel` 是轮播展示 renderer。
- 它负责按顺序切换一组内容项，不负责通用导航菜单或复杂数据工作流。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `carousel`。
- Flux 正式契约应优先保留 items、自动播放、切换控制等稳定能力。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'carousel'`
- 归属 `@nop-chaos/flux-renderers-content`（roadmap 权威包分配；组件重组后从 basic 拆出）

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
- `onChange` payload 采用单一规范键 `activeIndex`（对齐 schema/state 字段名），不再冗余重复 `index`（Decision A，见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-C）。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-carousel` marker。

## 11. 实现拆分建议

- items 归一化、当前项状态桥接、visual primitive 适配分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `cards`、`image`、`video` 族重复建模。

## 13. 自动轮播可访问性契约（WCAG 2.2.2）

`autoPlay` 开启时，轮播必须满足 WCAG 2.2.2「Pause, Stop, Hide」。实现约定（`packages/flux-renderers-content/src/carousel.tsx`，audit F1/F2 修复后落地）：

- **分层暂停源**：hover、focus、offscreen 三个来源各自独立跟踪（`hovered` / `focused` / `visible`），interval tick 内派生 `paused = hovered || focused || !visible`。任一来源的 resume 不得 clobber 其他来源（修复 F1：避免「hover → 滚出视口 → mouseleave 后在 offscreen 仍自动推进」的交错缺陷）。offscreen 检测用 `IntersectionObserver`。
- **响应式 reduced-motion**：订阅 `matchMedia('(prefers-reduced-motion: reduce)')` 的 `change` 事件，运行中开启 reduced-motion 立即 `clearInterval`（零 tick 延迟），关闭且仍 `autoPlay` 时重起 interval（修复 F2：不再「mount 时读一次 early-return 永久生效」）。

回归测试见 `packages/flux-renderers-content/src/carousel-autoplay.test.tsx`（pause-source 交错 + reduced-motion 双向切换）。
