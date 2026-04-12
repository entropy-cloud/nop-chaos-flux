# Editor 组件设计

## 1. 组件定位

- `editor` 是 rich-text editor 字段 renderer。
- 它只承接 WYSIWYG/富文本内容编辑，不承接代码、公式、SQL、JSON 或 schema 文本编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-rich-text`。
- 这里的 retained Flux `editor` 与 audited AMIS top-level `editor` 不是一回事：前者是 rich-text owner，后者的代码编辑语义已经收敛到 `code-editor`。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'editor'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`toolbar`、`placeholder`、`outputFormat`、`readOnly`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`toolbar`、`placeholder`、`outputFormat`、`readOnly`、`required`: `value`
- `onChange`、`onFocus`、`onBlur`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- 富文本工具栏属于组件内部 feature surface，而不是外部自由 region。

## 7. 运行期状态归属

- 富文本值归最近表单或 owner scope。
- 选择范围、格式面板、局部工具栏状态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`、`onFocus`、`onBlur`。
- 如需句柄，优先复用统一字段 `component:focus`、`component:setValue` 语言。

## 9. 数据源、表达式、导入能力接入点

- 配置和只读态可由表达式驱动。
- `editor` 不拥有平台级导入协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-editor` marker。

## 11. 实现拆分建议

- 富文本适配器、toolbar bridge、值归一化、sanitization 边界分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是再次和 `code-editor` 混成一个“所有编辑器”的黑盒 family。
