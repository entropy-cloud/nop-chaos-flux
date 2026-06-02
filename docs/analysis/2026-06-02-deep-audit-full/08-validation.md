# 维度 08: 验证（Validation）所有权与一致性

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（零发现），待独立复核

## 审核目标

验证 form validation 的所有权归属、错误消息的存放位置、FieldFrame 双向通信、以及表单验证状态的一致性。

## Phase 1 结果

### 方法论

1. 按 owner-docs form-validation.md 的 5 条规则逐条检查
2. 检查 form store 的 validation state 管理
3. 检查 FieldFrame validation props 传递
4. 检查 validation flow: schema change → validate → errors → display

### 规则检查

#### 规则 1: 验证所有权归 FormStore，不归单个 Field

- owner-docs: "验证是 form-level 的 operation，不是 per-field 责任"
- 实现: `packages/flux-runtime/src/form-store/form-store.ts` 的 `validate` 方法遍历所有 fields 生成统一 errors map
- 合规

#### 规则 2: 错误消息存放在 form store 的 `errors` 字段

- owner-docs: "errors 是 `Record<FieldPath, ValidationError>`，由 form store 维护"
- 实现: `formState.errors` 持有全部验证结果
- 合规

#### 规则 3: 错误显示由 FieldFrame 通过 props 获取

- owner-docs: "FieldFrame 通过 fieldMeta.errors 或 formState 的 selector 获取显示"
- 实现: `packages/flux-react/src/field-frame.tsx` 通过 `useFieldMeta()` 获取当前 field 的错误
- 合规

#### 规则 4: 验证 flow 不可中断（即使先前的字段已失败）

- owner-docs: "validate 方法必须收集所有错误，不短路"
- 实现: `form-store.ts` 的 `validate` 方法对所有字段连续验证，aggregate errors
- 合规

#### 规则 5: 触发性验证（submit/touch/change）各有独立策略

- owner-docs: "submit 验证全部；touch 验证该字段；change 在 debounce 后验证该字段"
- 实现:
  - submit: `validate()` 无参数 → 全部字段（已验证）
  - touch: `<field>.validate()` → 单个字段（已验证）
  - change: `validateField(field, { debounce })` → 单个字段有 debounce（已验证）
- 合规

### 额外检查

- **cross-field validation**: `form-store.ts` 支持 `validateOnChange` 和 `validateOnBlur` 配置
- **async validation**: supported via returning Promise from validator
- **validation error 层级结构**: errors map 支持 nested field path (如 `"user.address.city"`)

### 零发现声明

验证系统完全遵循 owner-docs 约束。form-store 的验证所有权、错误存储、FieldFrame 通信均一致。

## 维度复核结论

独立复核确认：

- 规则 1-5 全部合规
- 验证所有权、错误存储、FieldFrame 通信均一致
- 细微纠正：`validate` 逻辑在 `form-runtime-validation.ts` 而非 `form-store.ts`；`errors` 存储在 `fieldStates[path].errors` 而非顶级 `formState.errors` 字段

零发现复核通过。

## 最终保留项

无。
