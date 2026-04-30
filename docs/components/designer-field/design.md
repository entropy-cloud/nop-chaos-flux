# Designer Field 组件设计

## 1. 组件定位

- `designer-field` 是 Flow Designer inspector 中的通用属性编辑字段。
- 它承担“把 designer 元数据字段映射到合适输入控件”的职责。

## 2. 与 AMIS 或既有产品的能力对照

- 当前最小 schema 已支持 `fieldType` 和简单 `options`。
- 更复杂的字段分组、表达式编辑器和引用选择器属于后续 inspector 扩展。

## 3. Flux 中的 renderer/type 定义

- `type: 'designer-field'`
- `sourcePackage: '@nop-chaos/flow-designer-renderers'`

## 4. schema 设计

- 当前导出字段为 `fieldType` 和 `options`。
- 建议正式契约长期补齐 `path`、`label`、`description`、`required` 等 inspector 基本信息。

## 5. 字段分类

- `fieldType`、`options`: `value`
- `label`: `value-or-region`

## 6. regions 与 slot 约定

- 首版不开放自由 regions。
- 如果某类属性需要复杂编辑器，应由具体 editor renderer 接管，而不是把 `designer-field` 变成万能容器。

## 7. 运行期状态归属

- 值归 designer host snapshot 对应的 editable state。
- 输入打开态等纯 UI 状态本地管理。

## 8. 事件、动作与组件句柄能力

- 主要通过 designer actions 写回目标节点或边的属性。

## 9. 数据源、表达式、导入能力接入点

- `options` 可由 designer 配置或宿主 loader 注入。
- 表达式编辑等高阶能力应经 adapter 进入，不直接塞在基础字段里。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-designer-field` marker。
- 视觉层应复用统一 inspector field 样式，而不是每类字段单独定义外壳。

## 11. 实现拆分建议

- field type dispatch、值桥接和文案配置分模块。

## 12. 风险、取舍与后续阶段

- 如果不控制边界，`designer-field` 会变成第二套通用表单系统。
