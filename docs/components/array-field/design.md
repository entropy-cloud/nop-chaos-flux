# Array Field 组件设计

## 1. 组件定位

- `array-field` 是**数组子表单**复合字段：每项由 `item` 定义子字段构成，`itemKind: 'object'` 时每项是对象子表单，`itemKind: 'scalar'` 时是标量数组。
- 与 `array-editor`（仅标量、单输入框）的选型区别见 `flux-guide/design-patterns/composite-fields.md` §5 与 `flux-guide` form-advanced 选型说明。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `combo`（对象数组）与自建数组编辑习惯。
- Flux 收敛为独立 `array-field` type：对象数组也可用 `combo` / `input-table`（表格化编辑），本组件侧重**卡片式 item 子表单**编辑。

## 3. Flux 中的 renderer/type 定义

- `type: 'array-field'`
- `category: 'Form Advanced'`，`sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 定义位置：`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:556-610`

## 4. schema 设计

继承 `BoundFieldSchemaBase`（name 必填）：

```typescript
interface ArrayFieldSchema extends BoundFieldSchemaBase {
  type: 'array-field';
  /** 每项子字段模板（region，params: index/value） */
  item: SchemaInput;
  /** 'object'（对象数组）| 'scalar'（标量数组） */
  itemKind?: 'scalar' | 'object';
  /** 可添加（缺省 true） */
  addable?: boolean;
  /** 可删除（缺省 true） */
  removable?: boolean;
  /** 删除条件表达式（lazy eval，params: record/index/value） */
  removeWhen?: string;
  /** scalar 模式 item 字段校验规则元数据（authoringTransform 提取） */
  scalarItemValidation?: unknown;
}
```

## 5. 字段分类

- `item`: `region`（regionKey `item`，params `['index','value']`）
- `name`、`itemKind`、`itemKey`、`addable`、`removable`、`scalarItemValidation`: `value`
- `removeWhen`: `value`（`lazyEval: true`）
- `label`/`hint`/`description`: `value-or-region`

## 6. regions 与 slot 约定

- `item`：唯一内容 region，每项渲染一次；对象模式 item 内子字段用**相对 name**（运行时组合为 `name[i].field`）。

## 7. 运行期状态归属

- 数组值归父表单（`parentForm.values[name]`）或 scope owner。
- 每项拥有独立投影上下文（`itemForm` 代理 / `itemScope` / `itemValidationOwner`，`staticReadOnly` 传播 readOnly/disabled）。
- scalar 模式在父表单注册合成字段 `name.index` + `recurse-submit` 子契约 + `applyExternalErrors`。

## 8. 事件、动作与组件句柄能力

- 无自定义事件、无组件句柄能力。
- 增删走 form runtime：`appendValue(name, item)` / `removeValue(name, index)`（可选 `validateSubtree(name,'change')`）；无 form 时 `parentScope.update(name, [...])`。
- 删除受 `removeWhen` 门控（lazy-evaluated against per-item scope）。

## 9. 数据源、表达式、导入能力接入点

- 初始值经表达式或 form data 注入（array-equality comparator 的 `useCurrentFormState` / `useScopeSelector`）。
- `removeWhen` 支持按当前 item 数据条件化禁用删除。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-array-field` marker（`cn('nop-array-field', props.meta.className)`）。
- 容器 `data-slot="array-field-body"`；每项 `data-slot="array-field-item"` + `data-slot="array-field-item-body"`；删除按钮 aria-label `t('flux.form.remove')`；添加按钮 label `t('flux.form.addItem')`。
- `data-slot="field-control"` 由 FieldFrame 输出（`wrap: true`，frameRootTag `div`），根节点不再重复（plan-2026-08-05-1359-1 Phase 3 裁决）。

## 11. 实现拆分建议

- **渲染层**：`ArrayFieldRenderer` + `ArrayItemView`（每项上下文组装）。
- **删除门控**：`remove-when-gating.ts` 独立模块。
- **scalar 合成字段**：synthetic field 注册与 external errors 应用为独立逻辑，可沉淀 helper。
- **authoringTransform**：`getScalarItemValidationMetadata` 从首个 item schema 提取标量校验元数据。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `combo`/`input-table` 边界模糊——表格化编辑走 `combo`/`input-table`，卡片式子表单走本组件，见族级选型说明。
- scalar 模式合成字段数量随 item 数线性增长，超大数组性能由虚拟化 successor 承接（当前未虚拟化）。
