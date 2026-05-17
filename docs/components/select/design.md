# Select 组件设计

## 1. 组件定位

- `select` 是离散单选或多选字段的基础下拉控件。
- 它负责 option 选择与值绑定，不负责数据查询和分页式远程列表浏览。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `options`，并且 `options` 已通过 field metadata 声明为 `allowSource`。
- 搜索、多选、分组和复杂 option 渲染属于后续能力，但仍应围绕单一 `select` type 演进。

## 3. Flux 中的 renderer/type 定义

- `type: 'select'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `prop + allowSource`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- 建议后续补齐 `multiple`、`searchable`、`clearable`、`placeholder` 等常用字段，但命名应尽量对齐 `@nop-chaos/ui` 的选择器接口。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value
- `placeholder`、`multiple`、`searchable`: `value`

## 6. regions 与 slot 约定

- 首版不开放 option-level region。
- 如果未来需要自定义 option/trigger 渲染，应在 renderer adapter 层转换，而不是把 schema 直接暴露为函数型 slot。

## 7. 运行期状态归属

- 当前选中值归 form runtime 或 scope。
- 打开态、搜索关键字等纯 UI 状态归本地组件状态，不应默认写入表单。

## 8. 事件、动作与组件句柄能力

- 标准 `onChange` 由 field 交互自然触发。
- 后续可考虑 `component:focus`、`component:open`，但不应暴露底层第三方组件 ref。

## 9. 数据源、表达式、导入能力接入点

- `options` 已是 source-enabled field，是当前表单族里最明确的数据源入口之一。
- 真正的远程请求、依赖注入和缓存仍应遵循统一 `data-source`/API 语义。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-select-wrapper` marker and `data-slot="select-wrapper"` marker.
- 当前表单 `type: 'select'` 单选 renderer uses `@nop-chaos/ui` `NativeSelect` as the stable browser-interaction baseline; popup/headless select remains a UI primitive for richer future modes.
- 视觉层复用 `@nop-chaos/ui` Select 或 NativeSelect，不再引入第二套 mode 命名。

### `NativeSelect` public contract baseline

- `NativeSelect` 属于 `@nop-chaos/ui` 的公开 UI primitive，不应只通过内部文件路径或 synthetic DOM 事件来定义契约。
- `disabled` 的支持语义以真实原生 `<select disabled>` 交互为准；不要把测试里手工触发 `change` 后 handler 仍被调用视为 supported contract。
- `value` / `defaultValue` / `onChange` 语义应保持与原生 `<select>` 一致，由上层 renderer 负责把 schema/runtime 值绑定到该公开接口。
- renderer 或测试如果要证明 disabled 行为，应优先断言真实禁用状态与公开入口行为，而不是把事件系统的可人工触发性写成长期基线。

## 11. 实现拆分建议

- option 归一化、source state 展示和 field chrome 应分离。

## 12. 风险、取舍与后续阶段

- 多选、搜索和远程源一旦混在一起，很容易使契约过宽；文档需要持续强调“单一 value 字段 + 明确 option 输入”原则。
