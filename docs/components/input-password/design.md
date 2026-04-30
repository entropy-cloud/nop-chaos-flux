# Input Password 组件设计

## 1. 组件定位

- `input-password` 是 `input-text` 的密码语义特化版。
- 它主要区别在输入类型、安全显示策略和后续可能的 reveal/strength 能力。

## 2. 与 AMIS 或既有产品的能力对照

- 当前最小能力与 `input-text` 一致。
- 显示切换、强度提示和自动生成密码属于后续增强，不应在首版文档里直接固化成复杂协议。

## 3. Flux 中的 renderer/type 定义

- `type: 'input-password'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 沿用 `InputSchema`。
- 后续如果增加 reveal/strength，优先使用 `showRevealToggle`、`showStrength` 这类直接语义字段。

## 5. 字段分类

- 与 `input-text` 相同。

## 6. regions 与 slot 约定

- 与 `input-text` 相同。

## 7. 运行期状态归属

- 字段值归 form runtime。
- 若未来增加“显示明文”状态，应明确为 `local` UI state，不写入表单值。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 等可接表达式。
- 密码强度规则优先通过验证或辅助渲染层接入。

## 10. 样式与 DOM marker 约定

- 建议输出 `nop-input-password` marker，并复用共享 field frame。

## 11. 实现拆分建议

- 保持在通用 input renderer 体系中，通过 type 参数驱动差异。

## 12. 风险、取舍与后续阶段

- reveal、strength、password manager 集成等增强功能需要谨慎引入，避免把密码输入演变为复杂 widget。
