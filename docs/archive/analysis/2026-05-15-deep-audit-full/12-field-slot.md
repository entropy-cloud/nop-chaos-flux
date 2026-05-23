# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] action-like 字段被建模为 `prop`，提前在渲染作用域求值，破坏执行期 action 语义

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\node-compiler.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\node-runtime.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx`
- **证据片段**:
  ```ts
  // event 字段走 compileActions(...)
  // prop 字段走 expressionCompiler.compileValue(...)
  // propsProgram 在当前 render scope 下解析为 props.props
  ```
- **严重程度**: P1
- **违规类别**: event / field-rule
- **现状**: `detectVariantAction`、`transformInAction`、`transformOutAction`、`validateValueAction` 等 action-intent 字段仍被定义为 `prop`，会在渲染时按普通 value 编译和求值。
- **建议**: 将这些 action-like 字段改为 `event` 或等价 action metadata 通道，保留到执行期再结合正确 action scope 执行。
- **为什么值得现在做**: 当前字段后续都是通过 `helpers.dispatch(...)` 或 `actionAdapter(...)` 当 action 执行；若提前在 render scope 求值，会直接破坏执行期依赖和参数绑定。
- **误报排除**: 这不是风格不统一；是真实字段通道错建模，导致执行语义漂移。
- **历史模式对应**: 对应 action-intent schema field 被误走普通 prop 通道的 live defect。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`、`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度12-02] table quick edit 的保存 action 被建模为 `prop`，行级 action 在错误作用域提前求值

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\data-renderer-definitions.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-definition.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts`
- **证据片段**:
  ```ts
  // table.quickSaveAction / table.quickSaveItemAction 均标成 kind: 'prop'
  // 执行侧最终 helpers.dispatch(saveAction, { scope: rowScope })
  ```
- **严重程度**: P1
- **违规类别**: event / field-rule
- **现状**: `quickSaveAction`、`quickSaveItemAction` 本质是执行期 row action，但定义侧走了 `prop` 通道，甚至 CRUD 定义里未显式声明，落回默认 `prop`。
- **建议**: 把 quick-save 动作字段改为执行期 action 字段，保证 action schema 在 `rowScope` 下进入编译和执行链。
- **为什么值得现在做**: quick-edit 保存主路径依赖行级上下文，当前建模会让 action 内的行绑定失去正确作用域。
- **误报排除**: 这不是抽象一致性建议；会直接影响 `quickSaveAction` / `quickSaveItemAction` 的行上下文语义。
- **历史模式对应**: 对应 table quick-edit action 字段被误建模为普通 prop 的真实 defect。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

## 初审排除项

- `FieldFrame` / `frameWrap`：已读 `docs/architecture/field-frame.md` 且 `pnpm check:audit-fieldframe-bypasses` 无 suspect，本轮不保留缺陷。
- `value-or-region`：`label`、`empty`、`header`、`footer` 等主路径未见 live 违约。
- deep region extraction：`table.columns[].label/buttons/cell/body(quickEditBody)` 与 `expandable.expandedRow` 编译消费链已核对，当前不报。
- `form` renderer 的 `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError` 已正确走 `event`。

## 维度复核结论

- [维度12-01]：保留 (P1)。action-like schema fields 仍被建模为 `prop`，会先经 `propsProgram` 在渲染作用域求值。
- [维度12-02]：保留 (P1)。quick-save 动作字段仍被建模为 `prop`，先在 table 渲染作用域解析、后在 `rowScope` 下执行。

## 子项复核结论

- [维度12-01]：成立。`transformIn/transformOut/validateValueAction` 与 `detectVariantAction` 都还未进入 action metadata 通道。
- [维度12-02]：成立。table 与 CRUD 两个入口都维持同一 quick-save 动作误建模。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                                       |
| ----- | -------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| 12-01 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` | action-like 字段仍被建模为 `prop` 并在渲染期求值 |
| 12-02 | P1       | `packages/flux-renderers-data/src/data-renderer-definitions.ts`             | quick-save 行级 action 仍被建模为 `prop`         |
