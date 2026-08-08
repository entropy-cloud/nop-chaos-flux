# 74 Icon Picker required Validation Silent No-Op — Missing Validation Contributor

## Problem

`icon-picker` schema 声明 `required?: boolean | string`（`icon-picker.tsx:33`），注册定义 fields 含 `required`（formFieldRules）→ FieldFrame 正确渲染 `aria-required` + 必填星号；但 `required: true` 的表单提交空值时**零校验错误**——声明与 UI 主张存在，enforcement 静默缺失（C3.4 审计 probe 实证：submit 后 `PROBE-ICON-ERRORS: []`）。

## Root Cause

表单校验模型只对**定义了 `validation: { kind: 'field' }` contributor 的 renderer** 建编译校验字段（`flux-compiler/src/schema-compiler/validation-collection.ts:111-113`：`if (contributor?.kind === 'field')`）。`icon-picker` 定义（`icon-picker.tsx:278-296`）**没有 validation contributor**，且组件内也没有 `registerField({ validate() })` 运行时注册（对比 tag-list 有 registerField validate、key-value/array-editor 有 contributor）——双路径皆缺，`schema.required` 经 `validation-lowering.ts` 的自动下降（`collectSchemaValidationRules`）永远不会执行。`required` 的 UI 渲染（FieldFrame aria-required）走 fields 注册，与校验模型是两条独立链路，因此缺陷单测绿（无人断言错误出现）、真机静默（用户提交空值无任何提示）。

## Diagnostic Method

1. 审计读码：icon-picker 定义无 `validation` 键、组件无 registerField → 命中疑点
2. jsdom probe（先红）：form + `required: true` icon-picker 空值 submit → 查询错误消息零命中
3. 读 `validation-collection.ts` 确认 contributor 门控是根因

## Fix

`icon-picker.tsx` 定义补 validation contributor：

```ts
validation: {
  kind: 'field',
  valueKind: 'scalar',
  getFieldPath(schema: BaseSchema) {
    return typeof schema.name === 'string' ? schema.name : undefined;
  },
},
```

`schema.required` 经编译自动下降为 `{ kind: 'required' }`，错误消息由 `buildValidationMessage` 的 `validation.required` i18n 回退本地化（en/zh 双键已存在）。

## Tests

- `packages/flux-renderers-form-advanced/src/__tests__/icon-picker-validation.test.tsx` — 2 用例（test-first 先红后绿：空值 submit 报错 / 有值 submit 无错）
- `packages/flux-renderers-form-advanced/src/__tests__/c3-4-schema-contract-honesty.test.ts` — 断言 icon-picker 声明 field contributor（防回归：未来删 contributor 立即红）

## Affected Files

- `packages/flux-renderers-form-advanced/src/icon-picker.tsx`（validation contributor）
- `packages/flux-renderers-form-advanced/src/__tests__/icon-picker-validation.test.tsx`（新增）
- `packages/flux-renderers-form-advanced/src/__tests__/c3-4-schema-contract-honesty.test.ts`（新增）
- `docs/audits/per-component/icon-picker.md`（P1-1）
