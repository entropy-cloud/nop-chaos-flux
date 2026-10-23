# Detail Field 组件设计

## 1. 组件定位

- `detail-field` 是**表单绑定的详情编辑**复合字段：表单内显示只读摘要（viewer），点击按钮打开 dialog/drawer，在 **draft form** 中编辑，确认后写回父表单字段。
- 与 `detail-view` 的区别：本组件需要 `name` 绑定父表单，验证为 `field` 级别。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 的 `dialog` + 表单字段组合模式（"编辑详情"工作流）。
- Flux 收敛为独立 `detail-field` type：**值 owner = 父表单字段**；编辑态归内部 draft form（确认写回 / 取消丢弃）。
- **inline-edit（点即编辑）落点裁决（G2D，2026-10-24，plan `713-arc-g2d-inline-edit-design.md`，出处 `arc-component-gap-roadmap` §5.1 G2）**：

  | 候选                                 | 结论     | 理由                                                                                                                                                                                                                                                                                                                          |
  | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | (a) `detail-field.editable` 能力扩展 | **采纳** | 写回/校验管线（`applyParentWriteback`/`settleParentValidation`/回滚/`compileDetailValueAdaptationAction`）已函数化在 renderer 内，内联路径零耦合复用（无 draft form / summary-gate 依赖，`useDetailChildValidationContract` 以 `active: open` 门控、内联不开 draft 不激活）；type 数不增，符合能力扩展优先口径（G1/G5/G6 同） |
  | (b) 独立 type `inline-edit`          | 拒绝     | 新 retained type 需 matrix 增行（human gate，`amis-baseline-matrix.md`）；且会复制整条写回/校验编排；交互差异（无 surface 的原位编辑）可在既有 viewer 槽内以能力开关表达，不构成独立契约边界                                                                                                                                  |

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
  /** 点即编辑（G2D 协议，实现归 G2I）：true 时 viewer 原位可编辑，不渲染触发按钮与 surface */
  editable?: boolean;
  /** 内联编辑触发方式（仅 editable: true 消费），默认 'click' */
  editTrigger?: 'click' | 'dblclick';
}
```

`DetailSurfaceConfig`：`{ mode?: 'dialog'|'drawer'; title?: string; size?: string; placement?: 'left'|'right'|'top'|'bottom' }`。

### 4a. `editable` 点即编辑协议（G2D 设计，实现归 G2I）

**触发与点击目标**：`editTrigger` 默认 `click`（可 `dblclick`）；命中区为 `detail-field-viewer` 容器；viewer 内可交互子内容（按钮/链接）`stopPropagation` 优先于触发。

**编辑态**：viewer 原位替换为单行 `Input`（首版固定），`aria-label` 沿用字段 label，初始显示值 = viewer 同源（`String(fieldValue)`），聚焦并全选。

**值适配裁决**：内联路径首版仅承诺**标量契约**——提交时 workingValue = 原始字符串。`editable: true` 与 `transformInAction`/`transformOutAction`/`validateValueAction` 任一同时声明时 `editable` 无效、走既有 dialog 路径（首版不支持内联×适配组合）。

**提交**：Enter 或 blur 且值变更 → 校验（互斥裁决下仅 parent 校验链 `settleParentValidation`；`validateValueAction` 分支因 editable×transform\* 互斥在内联路径不可达）→ `applyParentWriteback` → `settleParentValidation`；校验/写回失败保留编辑态并显示错误（复用既有错误发布通道）。值未变 blur 直接回 viewer（不触发管线）。

**取消**：ESC 丢弃修改回 viewer，不触发任何写回。

**降级**：`meta.disabled` / `props.readOnly` 时 viewer 静态展示，触发不生效。

**与 dialog 路径互斥**：`editable: true` 时不渲染 `triggerLabel` 触发按钮与 surface；`triggerLabel` 仅 dialog 路径消费。`editTrigger` 仅 `editable: true` 消费。

**DOM marker / a11y**：编辑态容器 `data-slot="detail-field-inline-editor"`；错误经既有 `aria-describedby` 错误链（FieldFrame）。

## 5. 字段分类

- `viewer`、`content`: `region`
- `editable`: `value`（boolean，肯定式）；`editTrigger`: `value`
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
- `editable` 内联路径（G2D 协议）：不创建 draft form runtime，不激活 summary-gate（`useDetailChildValidationContract` 以 `active: open` 门控）；编辑中值仅存在于编辑态 Input 的 local state，提交才写回父表单。

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
- `editable: true` 编辑态输出 `data-slot="detail-field-inline-editor"`（G2D 协议，见 §4a）。

## 11. 实现拆分建议

- **渲染层**：`DetailFieldRenderer`（viewer + trigger + surface 编排）+ `DetailSurface`（dialog/drawer 壳与 footer 状态机）。
- **值适配**：`value-adaptation-helper.ts`（transformIn/validate/transformOut 执行与错误发布）为公共 helper。
- **写回**：`applyParentWriteback`/`settleParentValidation`/回滚逻辑独立成函数，便于 `detail-view` 复用（对称实现）。
- **内联编辑**（G2I）：`editable` 分支在 `DetailFieldRenderer` 内复用写回管线，不引入新 surface；editable×transform\* 互斥裁决见 §4a。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `detail-view` 重复建模——draft form / surface / 值适配机制已共享（`detail-surface.tsx`、`value-adaptation-helper.ts`）。
- draft 编辑期间父表单校验汇总（summary-gate）为防呆设计，需保持契约冻结（detail-field-basic.test.tsx + draft 校验测试）。
- readOnly 模式只读渲染 + close-only footer（无确认按钮）。
- `editable` 命名 pass（G2D，对照 `docs/references/naming-conventions.md`）：采纳 `editable`（肯定式布尔，`disabled`/`readOnly` 同族）与 `editTrigger`（camelCase，'click'|'dblclick'）；拒绝 `inlineEdit`（把交互范式而非能力写进字段名）、`clickToEdit`（把默认触发方式写死进名）、`editOn`（介词歧义）。风险：`editTrigger` 与 `triggerLabel` 语义邻近（触发方式 vs 触发按钮文案），schema 文档需并列说明；editable×transform\* 互斥是首版契约约束，放开需独立 plan。
