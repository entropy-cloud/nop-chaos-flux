# Container 组件设计

## 1. 组件定位

- `container` 是最通用的结构化容器 renderer，用来承接简单布局和内容包装。
- 它不承担 page、form 或 data-source 的领域语义，只负责壳层组织。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现已经支持方向、换行、对齐、间距和 `header`/`body`/`footer` 三段式区域。
- 复杂分栏、响应式断点和装饰性壳层能力应优先通过样式系统完成，而不是继续膨胀 `container` 私有字段。

## 3. Flux 中的 renderer/type 定义

- `type: 'container'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `body`、`header`、`footer`

## 4. schema 设计

- 当前导出字段包括 `direction`、`wrap`、`align`、`gap`、`body`。
- 文档建议继续保留 `header`、`footer` 为显式 regions，并将更复杂的视觉布局交给 `className`/`classAliases`。

## 5. 字段分类

- `direction`、`wrap`、`align`、`gap`: `value`
- `header`、`body`、`footer`: `region`
- `visible`、`hidden`、`className`: `meta` 或基础样式字段

## 6. regions 与 slot 约定

- `body` 是默认主内容区。
- `header`、`footer` 是可选结构化 slots，适合 panel/card shell 之外的通用容器。

## 7. 运行期状态归属

- `container` 不应维护独立状态。
- 可见性、禁用态和样式都由 resolved meta 或 resolved props 决定。

## 8. 事件、动作与组件句柄能力

- 首版不需要专用句柄。
- 如果未来出现折叠、展开、聚焦等交互，应考虑升级为专门 renderer，而不是把 `container` 演变成万能组件。

## 9. 数据源、表达式、导入能力接入点

- `direction`、`align`、`gap` 可按普通值通道支持表达式。
- 子内容的动态装配通过 `body` region 和外部 loader 解决。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-container` marker。
- renderer 只负责输出最小语义类；布局方向和间距应优先映射为 schema 驱动的样式，而不是 renderer 内硬编码大量 Tailwind 工具类。

## 11. 实现拆分建议

- 布局值解析逻辑放在独立工具文件。
- renderer 本体只负责组装 `header`/`body`/`footer` 和根容器属性。

## 12. 风险、取舍与后续阶段

- `container` 容易被滥用为视觉组件全集，需要在文档中持续强调它的“通用壳层”定位。
- 响应式专属 DSL 应在有跨组件统一方案后再引入。
