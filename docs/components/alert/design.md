# Alert 组件设计

## 1. 组件定位

- `alert` 是内联反馈 renderer，用来在当前布局上下文中展示提示、警告、错误或成功信息。
- 它是内容与反馈组件，不是全局 toast、dialog 或页面级错误边界。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `alert`，但 Flux 正式契约应优先使用当前 severity 词汇，如 `level`、`title`、`body`、`actions`。
- 复杂确认、阻塞式交互仍应交给 `dialog` / `drawer`。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'alert'`
- 归属 `@nop-chaos/flux-renderers-content`（roadmap §95 authoritative；package-reorganization-analysis L210 验证）

## 4. schema 设计

- 建议正式字段为 `level`、`title`、`body`、`actions`、`icon`、`closable`。
- 标题和内容都应允许简单值或区域表达。

## 5. 字段分类

- `level`、`icon`、`closable`: `value`
- `title`、`body`: `value-or-region`
- `actions`: `region`
- `onClose`: `event`

## 6. regions 与 slot 约定

- `title` 是反馈头部。
- `body` 是主要反馈内容。
- `actions` 是可选操作区。

## 7. 运行期状态归属

- `alert` 本身没有复杂 owner 状态。
- 可关闭交互如果存在，也只拥有最小的可见性状态，不拥有业务提交流程。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onClose`。
- 若后续支持关闭句柄，可提供 `component:close`。

## 9. 数据源、表达式、导入能力接入点

- 标题、内容和样式级别都可由表达式求值。
- `alert` 不拥有请求协议；它只是消费已有状态并表达反馈。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-alert` marker。
- 视觉层复用 `@nop-chaos/ui` Alert primitive，不在 renderer 中硬编码间距体系。

## 11. 实现拆分建议

- 壳层、可关闭交互桥接、actions 区渲染分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是把 `alert` 与 toast、dialog、field error slot 混成一个通用反馈黑盒。
