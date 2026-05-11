# Page 组件设计

## 1. 组件定位

- `page` 是页面级根 renderer，用来承接 page runtime、页面标题和页面级 regions。
- 它是 `SchemaRenderer` 在业务页面场景下的首选根节点，而不是普通布局容器的放大版。
- 它不是 `container` 的语义增强写法，也不应被 `container` 替代。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地的最小能力是 `title` 和 `body`，并已经在 renderer 定义中预留 `header`、`footer` regions。
- 面包屑、页面级 toolbar、生命周期事件和路由协作仍应作为后续阶段补齐，而不是在首版文档里发散出私有协议。

## 3. Flux 中的 renderer/type 定义

- `type: 'page'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 field metadata: `title` 为 `value-or-region`，regions 为 `body`、`header`、`footer`
- `type: 'page'` 是 schema-visible page shell renderer；根级 `PageRuntime` 由 host / `SchemaRenderer` 创建，不是由 `page` renderer 自己创建第二份 runtime

## 4. schema 设计

- 建议正式字段为 `title`、`header`、`body`、`footer`、`data`。
- 当前 `packages/flux-renderers-basic/src/schemas.ts` 只显式导出 `title`、`body`；文档基线应以 renderer definition 已公开的 region 契约为准，并推动类型补齐。
- 如果后续 page lifecycle 进入 schema-visible 契约，目标上应优先增加 `statusPath` 一类只读状态摘要发布字段，而不是把 child owner 状态都上卷到 page。

## 5. 字段分类

- `title`: `value-or-region`
- `data`: `value`
- `header`、`body`、`footer`: `region`
- `className`、`classAliases`、`visible`、`disabled`: 继承 `BaseSchema` 元字段

## 6. regions 与 slot 约定

- `body` 是页面主内容区。
- `header` 和 `footer` 是页面壳层级区域，不应与业务内容中的普通 panel header 混用。
- `title` 若使用 schema 片段，应由编译器转换为匿名 title region，而不是在 renderer 内重新递归解析原始 schema。

## 7. 运行期状态归属

- `page` 自身不维护复杂交互状态。
- 页面级数据归属 `PageRuntime` 和当前根 scope，不应在 renderer 内再创建第二份本地状态树。
- `page.data` 的目标语义是 page root scope 的初始化 patch，而不是第二套局部 props 系统。
- 目标设计中，`page` 只拥有 page shell 自己的状态，例如 initializing / refreshing / route readiness。
- `page` 不应成为 dialog、drawer、form、table、source 这些更具体 owner 的统一状态桶。
- 如果未来需要 schema-visible page shell 状态，外部读取仍应优先通过 `statusPath`；是否增加局部 `$page` 绑定，应等 page lifecycle 语义真正稳定后再决定。

## 8. 事件、动作与组件句柄能力

- 当前没有专用 page 句柄。
- 后续如果需要页面刷新、导航或标题同步，优先走 page runtime 或宿主 action，不建议给 `page` 增加过宽的 imperative API。
- page 若未来提供状态读面，也应保持 data-only summary，不暴露底层 runtime/store。

## 9. 数据源、表达式、导入能力接入点

- `title` 支持表达式和值片段。
- `data` 初始化 page root scope，page subtree 默认继承该 root scope。
- 页面级异步装配应落在 loader、page runtime 或 `data-source`，不应把 `page` 本身设计成请求型组件。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-page` 语义 marker。
- 页面布局、间距和背景来自 schema 样式字段，不应在 renderer 内硬编码页面专属 spacing 规则。

## 11. 与其他容器的边界

- `page` 是 shell owner；`container` 只是普通内容壳层。
- 页面内的普通 section、卡片包裹、说明区块应使用 `container` 或更专门的内容 renderer，而不是继续嵌套多个 `page`。
- `page` 不负责替代 `form`、`tabs`、`dialog`、`drawer` 这些更窄 owner 语义。

## 12. 实现拆分建议

- `schemas.ts` 维护 `PageSchema`。
- `index.tsx` 维护 renderer definition。
- `page.tsx` 只消费 `props`、`regions` 和 page runtime hook。

## 13. 风险、取舍与后续阶段

- 当前 TS schema 与 renderer regions 有轻微不一致，需要后续收敛。
- 页面级导航、面包屑和 toolbar DSL 建议在有真实宿主需求后再补充，避免首版契约过重。
