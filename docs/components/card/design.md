# Card 组件设计

## 1. 组件定位

- `card` 是结构化卡片容器 renderer，用来承接标题、正文、尾部和操作区。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已具备 `@nop-chaos/ui` Card primitive，但通用 renderer 尚未落位。
- 文档首版应优先围绕壳层与 regions 建模，而不是把视觉变体写成大量专属字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'card'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `header`、`body`、`footer`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`header`、`body`、`footer`、`actions`、`image`、`variant`。

## 5. 字段分类

- `title`: `value-or-region`
- `header`、`body`、`footer`、`actions`: `region`
- `image`、`variant`: `value`

## 6. regions 与 slot 约定

- `header` 负责顶部壳。
- `body` 是主内容。
- `actions` 是卡片交互区。

## 7. 运行期状态归属

- 卡片本身无复杂状态。
- 展开、选中等交互如果需要，应作为专门增强字段并明确 ownership。

## 8. 事件、动作与组件句柄能力

- 可支持 `onClick` 作为卡片整体点击事件。

## 9. 数据源、表达式、导入能力接入点

- 标题、图片和子区域都可由表达式或 loader 产出最终值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-card` marker。
- 视觉层复用 `@nop-chaos/ui` Card，不内嵌额外布局协议。

## 11. 实现拆分建议

- shell、header/body/footer composition 与点击能力分离实现。

## 12. 风险、取舍与后续阶段

- 需要防止 `card` 继续吸收 list/table 的集合语义。
