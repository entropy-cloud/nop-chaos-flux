# Card 组件设计

## 1. 组件定位

- `card` 是结构化卡片容器 renderer，用来承接标题、正文、尾部和操作区。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），复用 `@nop-chaos/ui` Card primitive 作为视觉壳层。
- 建模围绕壳层与 regions，视觉变体通过 `variant` 等少量字段表达，而非大量专属字段。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'card'`
- 实际归属 `@nop-chaos/flux-renderers-content`
- 实际 regions: `header`、`body`、`footer`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`header`、`body`、`footer`、`actions`、`image`、`imageClassName`、`variant`。

## 5. 字段分类

- `title`: `value-or-region`
- `header`、`body`、`footer`、`actions`: `region`
- `image`、`imageClassName`、`variant`: `value`

## 6. regions 与 slot 约定

- `header` 负责顶部壳。
- `body` 是主内容。
- `actions` 是卡片交互区。

### Media className 契约（L14）

顶部图片媒体经 `imageClassName?: string` 暴露作者 className 通道：renderer 用 `cn('aspect-video w-full object-cover', imageClassName)` 合并。默认 base（`aspect-video w-full object-cover`）保留合理视觉基线，作者 className 追加其后可扩展或覆盖（Tailwind 后置类覆盖前置）。renderer **不再用硬编码几何覆盖作者意图**——这与 styling-system 契约一致（widget renderer 自带视觉默认，但作者可控制）。回归锚见 `card.test.tsx` 的 L14 anchor。

## 7. 运行期状态归属

- 卡片本身无复杂状态。
- 展开、选中等交互如果需要，应作为专门增强字段并明确 ownership。

## 8. 事件、动作与组件句柄能力

- 可支持 `onClick` 作为卡片整体点击事件。
- 行级 itemScope（per-row `item`/`index` 求值上下文）是**集合** `cards` 的能力（见 `docs/components/cards/design.md` §6/§8），不属于独立的 `card`。独立 `card` 无 per-row itemScope，其 `onClick` 在自身节点 scope 求值。

## 9. 数据源、表达式、导入能力接入点

- 标题、图片和子区域都可由表达式或 loader 产出最终值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-card` marker。
- 视觉层复用 `@nop-chaos/ui` Card，不内嵌额外布局协议。

## 11. 实现拆分建议

- shell、header/body/footer composition 与点击能力分离实现。

## 12. 风险、取舍与后续阶段

- 需要防止 `card` 继续吸收 list/table 的集合语义。
