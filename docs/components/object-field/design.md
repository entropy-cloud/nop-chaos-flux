# Object Field 组件设计

## 1. 组件定位

- `object-field` 是**对象子表单**复合字段：把一组子字段组合成一个对象值写回父表单。
- 适用于地址、联系信息等结构化数据；与 `variant-field`、`detail-field`、`detail-view`、`array-field` 共享 **projected scope**（投影作用域）模式（族级基线见 `flux-guide/design-patterns/composite-fields.md` §1）。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 的 `combo` 单行对象模式与自建 `object` 字段习惯。
- Flux 收敛为独立 `object-field` type：值 owner = 父表单字段；子字段在**投影子表单上下文**中编辑，组合后整体写回。

## 3. Flux 中的 renderer/type 定义

- `type: 'object-field'`
- `category: 'Form Advanced'`，`sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 定义位置：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:499-525`

## 4. schema 设计

继承 `BoundFieldSchemaBase`（name 必填；readOnly/required/mode/labelAlign/labelWidth/hint/description/remark/labelRemark + BaseSchema 通用字段）：

```typescript
interface ObjectFieldSchema extends BoundFieldSchemaBase {
  type: 'object-field';
  /** 子字段模板（region） */
  body: SchemaInput;
  /** 值进入编辑界面时的转换（raw → draft） */
  transformInAction?: ActionSchema | ActionSchema[];
  /** 编辑确认时的转换（draft → committed） */
  transformOutAction?: ActionSchema | ActionSchema[];
}
```

## 5. 字段分类

- `body`: `region`（regionKey `body`）
- `name`、`transformInAction`、`transformOutAction`: `value`
- `label`/`hint`/`description`: `value-or-region`（formFieldRules）
- `readOnly`/`required`/`labelAlign`/`labelWidth` 等: `value`

## 6. regions 与 slot 约定

- `body`：唯一内容 region，子字段模板。在投影子表单上下文中渲染（FormContext/ScopeContext/ValidationContext/FormLayoutContext Provider，staticReadOnly 传播 readOnly/disabled）。

## 7. 运行期状态归属

- 字段值归父表单（`parentForm.values[name]`）或 scope owner（无 form 时）。
- 子字段归属投影子表单（`createProjectedInlineForm({ parentForm, ownerRootPath: name, prefixPath: name + '.' })`）；无 form 时投影子 scope（`createProjectedOwnerScope`，路径 `${parentScope.path}.${name}`）。
- `transformIn` 异步转换有 AbortController 防护（实例级 sequence，避免多实例互相干扰）。

## 8. 事件、动作与组件句柄能力

- 无自定义事件、无组件句柄能力。
- 提交/校验路径：`transformOutAction` 存在时经 value adapter 异步 commit（`parentForm.setValue(name, committed)`），并在父表单注册 `recurse-submit` 子契约。

## 9. 数据源、表达式、导入能力接入点

- 初始值经表达式或 form data 注入（`useCurrentFormState` / `useScopeSelector` 读取 `getIn(values|data, name)`）。
- 后端数据形状不一致时用 `transformInAction`/`transformOutAction` 适配。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-object-field` marker（`cn('nop-object-field', props.meta.className)`）。
- 内部 body 区输出 `data-slot="object-field-body"`。
- `data-slot="field-control"` 由 FieldFrame 输出（`wrap: true`），根节点不再重复（plan-2026-08-05-1359-1 Phase 3 裁决）。

## 11. 实现拆分建议

- **渲染层**：`ObjectFieldRenderer` 负责投影上下文组装与写回编排。
- **投影机制**：`projected-owner-scope.ts`（子 scope）与 `createProjectedInlineForm`（子 form）为公共 helper，复合字段族共享，不重复实现。
- **值适配**：transformIn/transformOut 执行与 stale 抑制为独立逻辑（object-field.tsx:32-55, 175-180, 280-321），可抽 pure helper 沉淀。
- 复杂度上升后适合抽取 local controller hook（参考 `docs/references/renderer-implementation-guidelines.md`）。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `array-field`、`detail-field` 的投影模式重复建模——已通过共享 projected-owner-scope / projected inline form 机制收敛。
- `transformOutAction` 异步提交路径存在数据丢失风险（共享 owner sequence 曾被多实例干扰），当前已按 per-instance owner 隔离（P1-1 fixed）。
- 对象级复杂校验（跨字段 allOrNone 等）由父表单 validation contributor 承接，object-field 自身 `collectRules → []`。
