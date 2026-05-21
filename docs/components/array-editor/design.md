# Array Editor 组件设计

## 1. 组件定位

- `array-editor` 是简单数组值编辑字段。
- 它负责一维列表项的新增、删除和重排，不承担复杂对象树编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `itemLabel`，并把自身声明为 `array` 值字段，至少要求一项。
- 多列 item schema、自定义子表单和拖拽排序属于后续能力。

## 3. Flux 中的 renderer/type 定义

- `type: 'array-editor'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'array'`

## 4. schema 设计

- 继承 `InputSchema`，并增加 `itemLabel`。
- 当前值模型是 `Array<{ id: string; value: string }>`。
- 后续如需复杂 item schema，建议单独设计 `itemSchema` / `itemRenderer`，不要直接复用任意 region。

## 5. 字段分类

- `label`: `value-or-region`
- `itemLabel`: `value`

## 6. regions 与 slot 约定

- 首版没有 item-level region。
- 复杂 item 渲染不应在现有数组编辑器里偷偷开放任意 schema。

## 7. 运行期状态归属

- 数组值归 form runtime。
- 行编辑中的草稿值、拖拽态和焦点态属于局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 适合长期暴露 `component:addItem`、`component:removeItem`、`component:moveItem`。
- 当前数组操作已经有 form runtime 一致的 append/insert/remove/move API 可以对接。

## 9. 数据源、表达式、导入能力接入点

- 初始值来自 form data 或表达式。
- 若业务数据不是规范数组项，优先由 loader 做投影。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-array-editor` marker。
- 列表行视觉复用 Button/Input/Field 等现有 UI primitives。

## 11. 实现拆分建议

- 数组操作桥接、项校验和行 UI 组件拆开维护。

## 12. 风险、取舍与后续阶段

- 如果演进为“万能重复子表单”，会和 `form`/`table`/复杂 editor 边界冲突，需要明确分层。
