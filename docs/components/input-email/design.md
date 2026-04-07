# Input Email 组件设计

## 1. 组件定位

- `input-email` 是 `input-text` 的邮箱语义特化版。
- 它的差异主要体现在默认 HTML input type 和 email 校验贡献，而不是独立的布局或状态模型。

## 2. 与 AMIS 或既有产品的能力对照

- 当前能力与 `input-text` 基本一致，但 validation contributor 默认附带 email 规则。
- 文档应明确它不是第二套字段体系，只是字符串输入的语义别名。

## 3. Flux 中的 renderer/type 定义

- `type: 'input-email'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `createFieldValidation(undefined, true)`

## 4. schema 设计

- 沿用 `InputSchema`。
- 推荐只在邮箱语义明确的字段使用该 type，避免再用额外布尔字段标识邮箱模式。

## 5. 字段分类

- 与 `input-text` 相同。
- 附加语义是默认 email validator，而不是新增 schema 字段。

## 6. regions 与 slot 约定

- 与 `input-text` 相同，仅 `label` 支持 `value-or-region`。

## 7. 运行期状态归属

- 与 `input-text` 相同，值与验证状态由 form runtime 托管。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同。

## 9. 数据源、表达式、导入能力接入点

- 与 `input-text` 相同。
- 邮箱可用性校验这类远端异步验证应放在 `validate.api`，而不是加进 renderer 内部。

## 10. 样式与 DOM marker 约定

- 建议输出 `nop-input-email` marker，并复用共享 input field chrome。

## 11. 实现拆分建议

- 保持在 `createInputRenderer('email')` 路径内，避免复制文本输入实现。

## 12. 风险、取舍与后续阶段

- 不要为邮箱输入增加过多专用字段，否则会破坏输入族统一性。