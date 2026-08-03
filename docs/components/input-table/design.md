# Input Table 组件设计

## 1. 组件定位

- `input-table` 是表格式对象数组字段 renderer。
- 它把表格展示和字段编辑结合在一起，但值 owner 仍然是表单字段体系。
- **边界裁定（W4c 收敛）**：`input-table` 是**字段编辑器**（值 owner = 表单字段体系，行列内为可编辑 field，复用 array-field staged owner + canonical composite handle）；通用 `table` 是**数据展示** renderer（数据来自 scope/data-source，非字段 owner）。input-table 复用 array-field staged owner 内核 + 列定义模型，不复制通用 table 的展示协议；与 `array-editor`（标量项编辑器）边界清晰。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-table`。
- Flux 应优先复用 `table` 的列/行语义和 composite-field 的值/验证语义，而不是重新做一套混合大组件协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-table'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威；本节早期写作 `flux-renderers-form` 为 drift，W4c 收敛）。随 `registerFormAdvancedRenderers` 注册。

## 4. schema 设计

- 正式字段为 `name`、`label`、`columns`、`rowKey`、`addable`、`removable`、`reorderable`、`minItems`、`maxItems`、`removeWhen`、`required`。
- `removeWhen`（可选）：相对当前行求值的布尔表达式字符串（`${...}` 形式）。声明后，某行仅在表达式对该行求值为真时允许删除；求值为假的行删除按钮禁用。未声明时所有行在 `minItems` 地板之上均可删除。求值出错 fail-open。与 combo/array-field 的 per-row 删除门控语义一致（`docs/architecture/array-field.md` _Per-Row Delete Gating_）。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`columns`、`rowKey`、`addable`、`removable`、`reorderable`、`minItems`、`maxItems`、`removeWhen`、`required`: `value`
- `item`: `region`（regionKey `item`，参数 `index`/`value`）
- `onAdd`、`onRemove`、`onReorder`: `event`

## 6. regions 与 slot 约定

- 列内容应优先走标准列定义与受控 region key，而不是任意函数型 cell renderer。

## 7. 运行期状态归属

- 字段值与验证归 composite-field owner。
- 表格选择、展开等交互如果需要，应明确是否属于 `input-table` 自己的局部交互态。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:addItem`、`component:removeItem`、`component:moveItem`（canonical composite handle，method-locked）。design 早期写作 `addRow`/`removeRow`/`moveRow` 为**概念别名**，映射到 canonical `addItem`/`removeItem`/`moveItem` 方法名；不扩展/泛化句柄工厂。
- `removeItem` 受 `minItems` field-global 地板与 per-row `removeWhen` 门控叠加约束（取并集禁用）；详见 §4 与 `docs/architecture/array-field.md` 的 _Per-Row Delete Gating_。

## 9. 数据源、表达式、导入能力接入点

- 行数据来自字段值本身，不由组件再引入第二条请求协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-table` marker；每行输出 `data-slot="input-table-row"` + `data-row-index`（早期 BEM `nop-input-table__row` 已于 C-06 移除，稳定契约为 data-slot 标记）。

## 11. 实现拆分建议

- field owner bridge、table projection、row editing bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和通用 `table` 及 `array-editor` 两边都重复建模——已通过复用 array-field staged owner 内核 + 通用 `table` 视觉（ui Table 组件族）+ canonical composite handle 收敛，边界见 §1。列拖拽/列宽自定义/合并单元格为首版 Non-Goal。
