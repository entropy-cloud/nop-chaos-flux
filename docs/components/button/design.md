# Button 组件设计

## 1. 组件定位

- `button` 是标准动作触发 renderer，用来承接点击、提交、打开弹层和命名空间动作调用。
- 它是 `action`、`submit`、`reset` 等历史 AMIS type 的统一收敛点。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `label`、`variant`、`size`、`disabled` 和 `onClick`。
- 链接按钮、加载态、图标前后缀和确认语义应作为后续增强，但仍保持单一 `button` type。

## 3. Flux 中的 renderer/type 定义

- `type: 'button'`
- `category: 'actions'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 fields: `onClick` 为 `event`

## 4. schema 设计

- 当前导出字段为 `label`、`variant`、`size`、`disabled`。
- 建议正式契约补齐 `icon`、`loading`、`href`、`target` 等高频按钮能力，但这些字段都应对齐 `@nop-chaos/ui` Button 或外围 Link 适配的已有命名。

## 5. 字段分类

- `label`: `value`
- `variant`、`size`: `value`
- `onClick`: `event`
- `disabled`: 由 meta 和显式 prop 共同决定

## 6. regions 与 slot 约定

- 首版不需要 region。
- 如果未来需要复杂按钮内容，优先考虑 `label` 的 `value-or-region` 升级，而不是新增 `body` 与 `label` 双轨。

## 7. 运行期状态归属

- `button` 不维护业务状态。
- `loading` 若引入，建议遵循 `local`/`controlled` 明确归属，而不是在按钮内静默持有。

## 8. 事件、动作与组件句柄能力

- 当前唯一正式事件入口是 `onClick`。
- 点击后的业务执行走 `ActionSchema`，不应把字符串脚本重新引回 schema。
- `example.json` 应至少展示一个最小 `onClick` 用法，避免文档声明与示例脱节。

## 9. 数据源、表达式、导入能力接入点

- `label`、`disabled` 等值字段可来自表达式。
- 更复杂的异步动作由 action runtime 负责，不由按钮自己发请求。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-button` marker，同时复用 `@nop-chaos/ui` Button 的 `variant` 和 `size`。
- 不要在 DSL 里再发明 `btnLevel`、`buttonMode` 这类平行命名。

## 11. 实现拆分建议

- renderer 负责 schema 到 `@nop-chaos/ui` Button props 的映射。
- action 适配和确认提示逻辑应放到共享 action 层。

## 12. 风险、取舍与后续阶段

- `button` 很容易吸收过多行为型能力，需要持续拒绝把所有动作类型拆成新 renderer。
- 若引入链接模式，需要清晰区分导航动作和普通 click action 的优先级。
