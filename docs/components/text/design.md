# Text 组件设计

## 1. 组件定位

- `text` 是最轻量的文本展示 renderer，用来承接纯文本、简单表达式结果和少量语义标签切换。
- 它是 `tpl` 收敛后的正式替代，不负责富文本或原始 HTML。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `text`、`body` 和 `tag`。
- 文档建议坚持“一类内容一个 renderer”：纯文本用 `text`，Markdown 用 `markdown`，原始 HTML 用 `html`，不要再恢复通用 `tpl` escape hatch。

### Flux 决策表（X5 扩展，E3）

| 能力                            | 首版决定                                   | 理由                                                                                                                                                          |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `copyable: boolean`（一键复制） | **实现**                                   | 列表/详情页常见 P2 场景；通过 `navigator.clipboard.writeText` + `toast` 反馈；不可用时降级到 `execCommand` + 失败 toast（Failure Path `clipboard-unavail`）。 |
| `maxLine: number`（行数截断）   | **实现**（纯 line-clamp，首版不带 toggle） | 截断是 P2 高频需求；首版用 Tailwind `line-clamp-{N}` 即可观测且无局部 state；展开/收起 toggle 增加 a11y 语义与 state，作为 follow-up（见 §12）。              |
| 富文本 / Markdown               | 不采纳（归 `markdown` 组件）               | 一类内容一个 renderer；让 `text` 承担富文本会破坏边界，丢失纯文本渲染的简单性。                                                                               |
| amis `tpl` 模板语法             | 不采纳                                     | Flux 用表达式 + region 替代；`text` 字段已 source-enabled，可直接接表达式结果，无需 escape hatch。                                                            |
| click/hover 等交互事件          | 不采纳（专用字段）                         | 通用 `props.events`（renderer-runtime 事件装配）已覆盖 `onClick` 等；不在 `text` 单开事件字段，避免与 X2 通用可阻止事件系统重复。                             |

**Decision（maxLine 展开/收起 toggle）**：首版纯 `line-clamp-{N}` 截断，**不带** toggle。理由：简单可观测；toggle 涉及局部 state 与 `aria-expanded` 语义，属增值交互，作为 follow-up（已记入 `docs/plans/2026-06-22-0149-3-...` 的 Deferred）。

## 3. Flux 中的 renderer/type 定义

- `type: 'text'`
- `category: 'content'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 fields: `text` 为 `prop` 且 `allowSource: true`，`body` 为 `prop`

## 4. schema 设计

- 当前导出字段为 `text`、`body`、`tag`、`copyable?`、`maxLine?`。
- 推荐外部正式字段以 `text` 为主，`body` 作为兼容别名或过渡字段，避免两个同义文本入口长期并存。
- `copyable?: boolean` — 渲染复制按钮，点击调 `navigator.clipboard.writeText` + `toast.success`；不可用降级到 `execCommand` + `toast.error`。
- `maxLine?: number` — 正整数；映射到 Tailwind `line-clamp-{N}` class（`>100` 截断为 `line-clamp-100`）；非正/非有限值 → 无截断。

## 5. 字段分类

- `text`: `value`，允许 source-enabled value
- `body`: `value`
- `tag`: `value`
- `copyable`: `value`（boolean）
- `maxLine`: `value`（number）

## 6. regions 与 slot 约定

- `text` 不暴露子 regions。
- 如果需要在文本内部嵌入 schema 片段，应升级为 `markdown`、`html` 或显式容器组合，而不是让 `text` 支持任意 region。

## 7. 运行期状态归属

- 无内部状态。
- 渲染值完全由 resolved props 决定。

## 8. 事件、动作与组件句柄能力

- 首版不需要专用事件和组件句柄。

## 9. 数据源、表达式、导入能力接入点

- `text` 字段已经是 source-enabled value，可直接接收表达式结果或 `type: 'source'`。
- 文本国际化和格式化应优先在 loader 或表达式层完成，不应把业务格式化规则硬编码进 renderer。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-text` marker。
- `tag` 只负责语义标签切换，不应顺带决定视觉级别；视觉由 `className` 和设计 token 控制。
- `maxLine` 追加 `line-clamp-{N}` class 到根节点。
- `copyable` 渲染 `@nop-chaos/ui` `Button`（`variant="ghost" size="icon-xs"`），DOM marker 为 `data-slot="text-copy-button"`。

## 11. 实现拆分建议

- 文本归一化和安全转义逻辑独立于 renderer 本体。
- 如果未来支持格式化器，可放入共享 content utils。

## 12. 风险、取舍与后续阶段

- `text` 与 `body` 双入口需要后续收敛。
- 一旦开始支持富文本，必须升级为独立 renderer，避免 `text` 失去边界。
