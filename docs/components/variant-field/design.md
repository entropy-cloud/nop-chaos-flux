# Variant Field 组件设计

## 1. 组件定位

- `variant-field` 是**多态字段**复合字段：根据值类型切换不同编辑界面（selector tabs/select），适用于支付方式、通知渠道等多态场景。
- 当前 variant 的子字段值直接作为对象值写回父表单；切换 variant 时前一个 variant 的值被保留但不提交。

## 2. 与 AMIS 或既有产品的能力对照

- 无直接 AMIS 对应组件；对应自建"类型切换 + 子表单"组合模式。
- Flux 收敛为独立 `variant-field` type：**值 owner = 父表单字段**（或 scope）。

## 3. Flux 中的 renderer/type 定义

- `type: 'variant-field'`
- `category: 'Form Advanced'`，`sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 无 `wrap` 标志——**自管 FieldFrame**（按 `meta.frameWrap`/schema `frameWrap` 决议，`'none'` 时裸渲染）
- 定义位置：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:98-147`

## 4. schema 设计

继承 `BoundFieldSchemaBase`（name 必填）：

```typescript
interface VariantFieldSchema extends BoundFieldSchemaBase {
  type: 'variant-field';
  /** 变体选项集合（必填） */
  variants: VariantOption[];
  /** 选择器配置 { mode?, label? } */
  selector?: VariantSelectorConfig;
  /** 选择器模式（legacy prop；selector.mode 为准） */
  selectorMode?: string;
  /** 默认激活变体 key */
  defaultVariant?: string;
  /** 值到达时自动匹配变体（event） */
  detectVariantAction?: ActionSchema | ActionSchema[];
}

interface VariantOption {
  key: string;
  label: string;
  /** 只读查看模板（region，可选） */
  viewer?: SchemaInput;
  /** 编辑字段模板（region） */
  content: SchemaInput;
  /** 值匹配规则（expression literal） */
  match?: VariantMatch;
  /** 初始值（切换该 variant 时写入） */
  initialValue?: unknown;
  /** 切换时值迁移（可选） */
  transformInAction?: ActionSchema | ActionSchema[];
}
```

`VariantMatch`：`{ kind: 'equal'|'keys'|'expression'|...; value?; key?; requiredKeys?; when? }`。

## 5. 字段分类

- `variants`: `prop`（`propContracts.variants`：object-array editorType；每项 `content`/`viewer` 为 region，`match.when` 为 literal 保留）
- `name`、`selector`、`selectorMode`、`defaultVariant`: `value`
- `detectVariantAction`: `event`
- `transformInAction`/`transformOutAction`/`validateValueAction`: 声明但 `kind: 'ignored'`（选项级 transformIn 生效）

## 6. regions 与 slot 约定

- 每选项 `content`（编辑模板）与 `viewer`（只读查看模板）为 region；按 active variant 渲染。
- 激活 variant 的内容在 per-variant `variantForm`/`variantScope`/`variantValidationOwner` 上下文中渲染（代理写回 active 分支值）。

## 7. 运行期状态归属

- 字段值归父表单（`values[name]`）或 scope owner。
- `activeKey = matchedKey（确定性 match 优先）> detectedKey（异步 detectVariantAction）> userSelectedKey > initialKey（defaultVariant 或首个）`。
- 切换：`clearErrors(name)` → 新值 = `option.initialValue ?? null`（可经 `option.transformInAction` 迁移）→ `parentForm.setValue(name, next)` + `touchField(name)`（无 form 时 `parentScope.update`）；userSelectedKey 在 matchedKey 重新断言时重置。
- readOnly 模式渲染 active content/viewer 于 `staticReadOnly` 布局（不可交互）。

## 8. 事件、动作与组件句柄能力

- 事件：`detectVariantAction`，payload `{ value: currentValue, variants: keys[] }`，dispatch 时带 `evaluationBindings: payload` + AbortController（重跑/unmount 中止）；结果 `data` → `extractDetectedVariant`；失败 → `reportVariantFieldFailure`（`t('flux.form.variantUpdateFailed')` notify + console.warn）。
- 无组件句柄能力。

## 9. 数据源、表达式、导入能力接入点

- 初始值经表达式或 form data 注入。
- `match` 支持按值内容确定性匹配；`detectVariantAction` 支持宿主/服务端匹配。

## 10. 样式与 DOM marker 约定

- body 根节点输出 `nop-variant-field` marker + `data-slot="variant-field-body"` + `data-active-variant={activeKey}`（frameWrap `'none'` 时另带 data-testid/data-cid）+ `data-frame-wrap`。
- 选择器区 `data-slot="variant-field-selector"`（Tabs 或 Select）。
- 只读回退区 `data-slot="variant-field-readonly-body"`。
- 自管 FieldFrame（label/group 模式）：rootTag `div`，`rootProps` 带 `data-active-variant`/`data-frame-wrap`；`data-slot="field-control"` 由 FieldFrame 输出，body 根不再重复。

## 11. 实现拆分建议

- **渲染层**：`variant-field-view.tsx`（selector/body/只读编排）。
- **逻辑层**：`variant-field-controller.ts`（active key 决议 + 切换写回）与 `variant-field-owner.ts`（per-variant 上下文）为独立模块。
- **匹配**：`variant-field-matching.ts` 纯函数（确定性 match）。
- **失败上报**：`variant-field-helpers.ts`（`reportVariantFieldFailure` 等公共 helper，i18n 键 `flux.form.variantUpdateFailed`）。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `object-field` 子表单机制重复——per-variant 上下文复用投影 owner 模式。
- `selectorMode` 为 legacy prop（`selector.mode` 为准），文档与实现需保持对齐。
- 异步 detectVariantAction 与用户手动选择存在竞态——detectedKey 仅在无 userSelectedKey 时生效，AbortController 中止过期请求。
