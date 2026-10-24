# Detail Field 组件设计

## 1. 组件定位

- `detail-field` 是**表单绑定的详情编辑**复合字段：表单内显示只读摘要（viewer），点击按钮打开 dialog/drawer，在 **draft form** 中编辑，确认后写回父表单字段。
- 与 `detail-view` 的区别：本组件需要 `name` 绑定父表单，验证为 `field` 级别。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 的 `dialog` + 表单字段组合模式（"编辑详情"工作流）。
- Flux 收敛为独立 `detail-field` type：**值 owner = 父表单字段**；编辑态归内部 draft form（确认写回 / 取消丢弃）。

### Flux 决策表

> 按命名基线 X5 式范本（`docs/references/naming-conventions.md` §与 X5 的关系）新增；主语为 Flux。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                 | 采纳                                                                                                                                                                                                        | 不采纳                                           | 理由                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 编辑形态（arc-component-gap G2）     | **实现**：`editMode?: 'surface' \| 'inline'`——`surface`（默认，现状弹窗）之外新增 `inline` 点即编辑（见 §4/§7/§10）                                                                                         | 独立 type `inline-edit`                          | name 绑定、写回双通道（`applyParentWriteback`）、adaptation 链（transformIn/validate/transformOut）、校验收敛回滚、presentation 门控在两方案中完全相同——独立 type 仅 surface 壳不同，机制复用率 ~80%，属 type 增殖且需 matrix human gate；detail 家族语义内含轻编辑形态 |
| Arc `InlineEdit` 对照（inline 模式） | 采纳：点即编辑、Enter 提交、Escape 回滚、提交失败编辑态保持（Arc 为提交失败**退出**编辑态 + failed 横幅 + 重试，`inline-edit.tsx:258-268`——flux 与 surface confirm 失败语义同构、避免输入丢失，裁定为保持） | `multiline`（多行内容仍走 surface）；motion 动效 | 多行超出字段级轻编辑定位（scalar 单行）；本仓无动效引擎（arc-component-gap §5.4 动效边界）                                                                                                                                                                              |

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
  /** 编辑形态：`surface`（默认，弹窗 draft form）| `inline`（点即编辑，见 §7/§10；arc-component-gap G2 新增） */
  editMode?: 'surface' | 'inline';
}
```

`DetailSurfaceConfig`：`{ mode?: 'dialog'|'drawer'; title?: string; size?: string; placement?: 'left'|'right'|'top'|'bottom' }`。

## 5. 字段分类

- `viewer`、`content`: `region`
- `name`、`triggerLabel`、`surface`、`editMode`、`transformInAction`、`transformOutAction`、`validateValueAction`: `value`（adaptation action 经 `compileDetailValueAdaptationAction` 编译）
- `label`/`hint`/`description`: `value-or-region`

## 6. regions 与 slot 约定

- `viewer`：只读摘要（缺省回退 `String(fieldValue)` 或 `—`）。
- `content`：draft form 内的编辑字段模板。

## 7. 运行期状态归属

- 字段值归父表单（`values[name]`）或 scope owner。
- 打开时：`transformIn` → `buildDetailDraftInitialValues` → 创建 `detail-field-draft:*` form runtime。
- 确认：`draftForm.validateAll('submit')` → `validateValueAction`（错误经 `publishValidateResultErrors` / `applyExternalErrors` 发布）→ `transformOut` → `applyParentWriteback`（`parentForm.setValue(name, value)` 或 `parentScope.update(name, value)`）→ `settleParentValidation`（commit/subtree 校验，失败回滚）→ `touchField(name)` → 关闭。
- 打开期间父字段挂 `summary-gate` 子契约（校验汇总门控）。
- **`editMode: 'inline'`（arc-component-gap G2）**：
  - inline 草稿是**组件 local UI state**（不创建 draft form runtime，不写表单值直到提交成功）。
  - 进入编辑：viewer 触发后按钮 busy（`aria-busy` + Spinner，同 surface `opening` 模式，openSequencer last-wins 防重入）→ `runTransformIn`（raw → 编辑器初值）落地后切入编辑态并自动聚焦；失败保持 viewer + `env.notify` warning（复用 open 失败上报模式）。预填约定：适配值 `String()` 化，`null/undefined` 空串；非标量（对象/数组）同样 `String()` 化（G2I 裁决：inline v1 定位 scalar 编辑，不做结构化预填）。
  - 提交（Enter 或 blur）：`runValidate`（validateValueAction，失败不提交、编辑态保持、焦点留编辑器）→ `transformOut` → `applyParentWriteback` → `settleParentValidation`（失败回滚 + 编辑态保持）→ `touchField` → 回 viewer（焦点还原）。`runValidate` 失败与 `settleParentValidation` 失败时显示内联错误（`data-slot="detail-field-inline-error"`，见 §10）+ `env.notify` warning（复用 confirm 失败上报模式）；编辑态保持期间错误持续可见。
  - 取消（Escape）：丢弃草稿回 viewer（不写回）。
  - 提交 in-flight（validate/transformOut/写回/收敛未落地）：二次 Enter/blur/Escape 一律忽略（confirmSequencer 同构守卫）。
  - 编辑中外部值到达：编辑态不追踪外部更新，提交以提交值为准。
  - 不可进入门控 = `presentation.interactive`（`!disabled && !readOnly`）。**较 surface 的分歧行为**：surface 下 readOnly 仍可打开弹窗（只读预览 + close-only footer），inline 下 readOnly 直接不可进入（无只读编辑形态可展示）。

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
- **inline 模式（`editMode: 'inline'`）**：viewer `data-slot="detail-field-viewer"` 维持并追加 `data-editable="true"`；viewer 以按钮语义渲染（可点击 / Enter / Space，`aria-label` = `triggerLabel`）；编辑器 `data-slot="detail-field-inline-editor"`（单行 Input，自动聚焦）；内联错误 `data-slot="detail-field-inline-error"`（`role="status"` + `aria-live="assertive"`，与 draft-error 家族约定取齐）；根 marker `nop-detail-field` 不变。DOM 属性 `data-editable` 与 schema 字段 `editMode` 分属两层，命名差异系历史裁决（R3 观察项记录）。

## 11. 实现拆分建议

- **渲染层**：`DetailFieldRenderer`（viewer + trigger + surface 编排）+ `DetailSurface`（dialog/drawer 壳与 footer 状态机）。
- **值适配**：`value-adaptation-helper.ts`（transformIn/validate/transformOut 执行与错误发布）为公共 helper。
- **写回**：`applyParentWriteback`/`settleParentValidation`/回滚逻辑独立成函数，便于 `detail-view` 复用（对称实现）。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `detail-view` 重复建模——draft form / surface / 值适配机制已共享（`detail-surface.tsx`、`value-adaptation-helper.ts`）。
- `editMode: 'inline'`（arc-component-gap G2）：落点裁决为能力扩展而非独立 type（§2 决策表，被拒方理由成文）；inline 模式不使用 draft form / surface / summary-gate 机制（单字段就地编辑，父级校验由 `settleParentValidation` 直接收敛），两种编辑形态共享 adaptation 链与写回链。inline 的 readOnly 不可进入是较 surface 的新增分歧（surface 只读可开弹窗预览）——理由：inline 无只读编辑形态可展示。`'surface'` 枚举值与兄弟 schema 字段名 `surface`（弹窗配置对象）同词异义，保留（语义 = "经 surface 编辑"，与 `surface.mode: 'dialog'|'drawer'` 正交）。
- draft 编辑期间父表单校验汇总（summary-gate）为防呆设计，需保持契约冻结（detail-field-basic.test.tsx + draft 校验测试）。
- readOnly 模式只读渲染 + close-only footer（无确认按钮）。
