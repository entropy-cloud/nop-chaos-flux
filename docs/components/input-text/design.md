# Input Text 组件设计

## 1. 组件定位

- `input-text` 是标准单行文本字段 renderer。
- 它是表单字段体系的基线实现，其他字符串类输入控件应优先复用它的校验和 field chrome 规则。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern` 和 label field rule。
- 清空按钮、前后缀、输入掩码等增强能力可以后续补齐，但不应破坏 `input-text` 的基础字段地位。

## 3. Flux 中的 renderer/type 定义

- `type: 'input-text'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field，`wrap: true`

## 4. schema 设计

- 继承 `InputSchema`：`name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`validate`。
- 建议正式契约同时允许 `label`、`hint`、`description` 这类 field frame 字段。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`: `value`
- `validate`: `value`，内部承接 async rule 描述

## 6. regions 与 slot 约定

- `label` 可被编译为 region。
- 其他 field chrome 内容应复用统一 field frame，而不是为单个 input 定义新 slot。

## 7. 运行期状态归属

- 字段值默认归 `FormRuntime`；没有 form 时退回当前 scope。
- 焦点、touched、visited、dirty 和 validating 都由表单状态机统一维护。

## 8. 事件、动作与组件句柄能力

- 当前交互通过标准输入行为和表单 runtime 完成。
- 后续如需 `component:focus`、`component:setValue`，应遵循统一 field handle 语言。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 和 label 可接表达式。
- 值写入通过 `name` 绑定，不建议额外引入 `valueSource` 之类平行字段。

## 10. 样式与 DOM marker 约定

- 根节点延续 field frame 语义，并输出 `nop-input-text` marker。
- 视觉交互尽量复用 `@nop-chaos/ui` Input。

## 11. 实现拆分建议

- 通用值读写、校验触发和错误展示逻辑放在 `field-utils`。
- `createInputRenderer('text')` 继续作为实现入口。

## 12. 风险、取舍与后续阶段

- 需要防止 `input-text` 再次吸收过多专有能力，导致其他输入类型无法共享基线。