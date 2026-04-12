# Input Number 组件设计

## 1. 组件定位

- `input-number` 是标准数字字段 renderer。
- 它承接数值输入、步进、范围约束与精度控制，不把货币、百分比、滑块等专门语义混进一个通用字段。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-number`，并吸收 `native-number` 这类宿主原生变体为同一 canonical family。
- Flux 正式契约应优先对齐当前 field 体系与 UI primitive 命名，不保留历史 `readOnlyMode` 一类兼容噪音作为首版主轴。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-number'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`placeholder`、`min`、`max`、`step`、`precision`、`prefix`、`suffix`、`showStepper`、`required`、`validate`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`min`、`max`、`step`、`precision`、`prefix`、`suffix`、`showStepper`、`required`: `value`
- `validate`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `label` 继续复用统一 field frame 语义。
- `input-number` 不额外开放自由 regions。

## 7. 运行期状态归属

- 值、错误、dirty、touched、validating 继续归最近的 `FormRuntime`。
- 无 form 时退回当前 scope owner。

## 8. 事件、动作与组件句柄能力

- 数值变化继续通过标准字段写回路径完成。
- 后续若需要 `component:focus`、`component:setValue`，应复用统一 field handle 语言。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`min`、`max`、`disabled` 等字段可由表达式求值。
- 绑定入口仍是 `name`，不新增平行 `valueSource` 协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-number` marker。
- 视觉层应复用 `@nop-chaos/ui` Input 或 Number-like primitive 组合。

## 11. 实现拆分建议

- 通用字段值读写与校验继续放在共享 field utils；数值格式化与步进逻辑独立实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把 `input-number` 再次做成“所有数值场景”的大一统字段，导致 slider、currency、rating 等边界再次模糊。
