# Detail Field 组件设计

## 1. 组件定位

- `detail-field` 是**表单绑定的详情编辑**复合字段：表单内显示只读摘要（viewer），点击按钮打开 dialog/drawer，在 **draft form** 中编辑，确认后写回父表单字段。
- 与 `detail-view` 的区别：本组件需要 `name` 绑定父表单，验证为 `field` 级别。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 的 `dialog` + 表单字段组合模式（"编辑详情"工作流）。
- Flux 收敛为独立 `detail-field` type：**值 owner = 父表单字段**；编辑态归内部 draft form（确认写回 / 取消丢弃）。

## 3. Flux 中的 renderer/type 定义

- `type: 'detail-field'`
- `category: 'Form Advanced'`，`sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- `scopePolicy: 'form'`，`wrap: true`（frameRootTag `div`）
- 定义位置：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:401-434`

## 4. schema 设计

继承 `BoundFieldSchemaBase`（name 必填）：

```typescript
interface DetailFieldSchema extends BoundFieldSchemaBase {
  type: 'detail-field';
  /** 只读摘要模板（region，可选） */
  viewer?: SchemaInput;
  /** 弹窗内编辑表单字段模板（region，必填） */
  content: SchemaInput;
  /** 弹窗配置：mode dialog|drawer、title、size、placement */
  surface?: DetailSurfaceConfig;
  /** 编辑触发按钮文案 */
  triggerLabel?: string;
  /** 值进入编辑界面时的转换（raw → draft） */
  transformInAction?: ActionSchema | ActionSchema[];
  /** 自定义校验逻辑 */
  validateValueAction?: ActionSchema | ActionSchema[];
  /** 编辑确认时的转换（draft → committed） */
  transformOutAction?: ActionSchema | ActionSchema[];
}
```

`DetailSurfaceConfig`：`{ mode?: 'dialog'|'drawer'; title?: string; size?: string; placement?: 'left'|'right'|'top'|'bottom' }`。

## 5. 字段分类

- `viewer`、`content`: `region`
- `name`、`triggerLabel`、`surface`、`transformInAction`、`transformOutAction`、`validateValueAction`: `value`（adaptation action 经 `compileDetailValueAdaptationAction` 编译）
- `label`/`hint`/`description`: `value-or-region`

## 6. regions 与 slot 约定

- `viewer`：只读摘要（缺省回退 `String(fieldValue)` 或 `—`）。
- `content`：draft form 内的编辑字段模板。

## 7. 运行期状态归属

- 字段值归父表单（`values[name]`）或 scope owner。
- 打开时：`transformIn` → `buildDetailDraftInitialValues` → 创建 `detail-field-draft:*` form runtime。
- 确认：`draftForm.validateAll('submit')` → `validateValueAction`（错误经 `publishValidateResultErrors` / `applyExternalErrors` 发布）→ `transformOut` → `applyParentWriteback`（`parentForm.setValue(name, value)` 或 `parentScope.update(name, value)`）→ `settleParentValidation`（commit/subtree 校验，失败回滚）→ `touchField(name)` → 关闭。
- 打开期间父字段挂 `summary-gate` 子契约（校验汇总门控）。

## 8. 事件、动作与组件句柄能力

- 无自定义事件、无组件句柄能力。
- 交互（open/confirm/cancel）为组件内部编排；`aria-busy` 覆盖打开/提交进行态。

## 9. 数据源、表达式、导入能力接入点

- 初始值经表达式或 form data 注入。
- 适配 action payload：transformIn `{ rawValue, name, readOnly }`；validateValue `{ workingValue, originalValue, name }`；transformOut `{ workingValue, originalValue, name, readOnly }`。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-detail-field` marker（`cn('nop-detail-field', props.meta.className)`）。
- viewer 区 `data-slot="detail-field-viewer"`；触发按钮 `aria-label={triggerLabel}`。
- surface：Dialog（sm/default/lg/xl）或 Drawer（placement 默认 bottom）；`data-slot="detail-field-surface-body"`、`data-slot="detail-field-draft-body"`、`data-slot="detail-field-draft-error"`（`role="status"` + `aria-live="assertive"`）。
- `data-slot="field-control"` 由 FieldFrame 输出（`wrap: true`），根节点不再重复（plan-2026-08-05-1359-1 Phase 3 裁决）。

## 11. 实现拆分建议

- **渲染层**：`DetailFieldRenderer`（viewer + trigger + surface 编排）+ `DetailSurface`（dialog/drawer 壳与 footer 状态机）。
- **值适配**：`value-adaptation-helper.ts`（transformIn/validate/transformOut 执行与错误发布）为公共 helper。
- **写回**：`applyParentWriteback`/`settleParentValidation`/回滚逻辑独立成函数，便于 `detail-view` 复用（对称实现）。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `detail-view` 重复建模——draft form / surface / 值适配机制已共享（`detail-surface.tsx`、`value-adaptation-helper.ts`）。
- draft 编辑期间父表单校验汇总（summary-gate）为防呆设计，需保持契约冻结（detail-field-basic.test.tsx + draft 校验测试）。
- readOnly 模式只读渲染 + close-only footer（无确认按钮）。
