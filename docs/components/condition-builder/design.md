# Condition Builder 组件设计

## 1. 组件定位

- `condition-builder` 是面向规则表达式的复合字段组件。
- 它负责条件组、逻辑关系和字段-运算符-值三元组编辑，不是通用公式编辑器。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地基础 condition group 编辑、字段清单、值输入与 required 校验。
- 更复杂的嵌套逻辑、运算符扩展、异步字段元数据加载属于后续阶段。

## 3. Flux 中的 renderer/type 定义

- `type: 'condition-builder'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'scalar'`

## 4. schema 设计

- 组件正式 schema 以 `ConditionBuilderSchema` 为准。
- 关键输入应包括条件字段定义、默认逻辑运算符、文案配置以及当前 value。

## 5. 字段分类

- `label`: `value-or-region`
- `fields`、`operators`、`value`: `value`
- `addConditionLabel`、`addGroupLabel` 等文案: `value`

## 6. regions 与 slot 约定

- 首版不开放条件项任意 schema slot。
- 值输入类型切换通过内部适配完成，而不是暴露 render prop。

## 7. 运行期状态归属

- 条件值整体归 form runtime。
- 展开态、局部编辑态和下拉打开态属于局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 长期可以提供 `component:addCondition`、`component:addGroup`、`component:normalizeValue`。
- 当前对外主要仍是字段值变化。

## 9. 数据源、表达式、导入能力接入点

- 字段元数据可来自 loader 或表达式求值后的稳定数组。
- 条件 DSL 本身是 value，不应再内嵌第二套动作脚本协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-condition-builder` marker。
- 视觉层遵循 field frame 和 group/card 类 UI primitives，不内嵌专用布局体系。

## 11. 实现拆分建议

- 字段选择、运算符选择、值输入适配和树结构操作拆分为独立模块。

## 12. 风险、取舍与后续阶段

- 最主要风险是把条件构建器演变成通用公式 IDE，导致契约失控。
- 字段类型系统与 value editor 的映射需要持续文档化。