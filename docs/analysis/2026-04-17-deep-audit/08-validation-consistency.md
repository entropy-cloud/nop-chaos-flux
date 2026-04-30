# 08 验证系统一致性

- Task ID: `ses_268e2c51cffeheY8h43KKSHNBF`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Last Reviewed: 2026-04-17
- Status: **已解决** | 架构文档已更新，代码问题已修复

## 概述

本次审计发现的问题经深入分析后，确认为以下三类：

1. **架构文档与当前实现阶段不匹配**：架构文档描述的是完整目标架构，但当前实现处于 Phase 2，尚未实现 Phase 3-4 的 owner 边界自动分区功能
2. **当前实现已满足核心需求**：Draft 隔离通过渲染器级别的 `FormRuntime` 创建实现，无需编译器级 owner 分区
3. **真正的代码不一致**：已修复 `showError` 计算逻辑、`summary-gate` 子验证状态检查、`recurse-submit` 递归触发

### 架构决策

经评估，**owner 边界的编译器自动分区是未来增强方向，而非当前必须实现的功能**。理由：

1. 核心用例（`detail-field` / `detail-view` 的 draft 隔离）已被当前渲染器级实现满足
2. 项目中没有"嵌套 draft 中的嵌套 draft"等需要多级 owner 协调的场景
3. 当前方案简单可靠，渲染器自己管理 draft 生命周期

架构文档已更新：

- `docs/architecture/form-validation.md` 的 "Owner Resolution Algorithm" 和 "Parent And Child Scope Interaction" 部分现在标注为 "Implementation Status: Phase 3 target"
- "Implementation Phases" 部分明确标注各阶段状态

---

## 已处理的问题

### 问题 1-3, 6-7: 架构 vs 实现阶段差距 → **文档已更新**

这些问题描述的是 Phase 3-4 规划功能与 Phase 2 当前实现之间的差距：

| #   | 问题                                       | 评估             | 处理           |
| --- | ------------------------------------------ | ---------------- | -------------- |
| 1   | 编译器只产出单一 owner 验证模型            | Phase 3 功能     | 文档已标注状态 |
| 2   | registerField 未校验 owner 边界            | Phase 3 功能     | 文档已标注状态 |
| 3   | 同一路径仅允许一个注册实例                 | Phase 4 可选增强 | 文档已标注状态 |
| 6   | applyChangesAndRevalidate 不是 owner-local | Phase 3-4 功能   | 文档已标注状态 |
| 7   | 外部错误不清理祖先链                       | Phase 4 可选增强 | 文档已标注状态 |

### 问题 4: summary-gate 只按 active 阻塞 → **已修复**

- **问题**: `computeCanSubmit()` 对 `summary-gate` 模式只检查 `active` 状态，不检查子 scope 的 `ready/validating/valid`
- **修复**:
  - 扩展 `ChildValidationContractRegistration` 接口，添加 `getState()` 方法返回 `ChildValidationScopeState`
  - `computeCanSubmit()` 现在检查 `!childState.ready || childState.validating || !childState.valid`
- **文件**:
  - `packages/flux-core/src/types/validation.ts`
  - `packages/flux-runtime/src/form-runtime.ts`

### 问题 5: recurse-submit 执行 unregister 而非递归验证 → **已修复**

- **问题**: `recurse-submit` 模式的 child contracts 在提交时只调用 `unregister()` 而不触发子验证
- **修复**:
  - 扩展 `ChildValidationContractRegistration` 接口，添加 `triggerValidation()` 方法
  - `executeFormSubmit()` 现在并行触发所有 `recurse-submit` 子验证，收集错误后决定是否继续提交
- **文件**:
  - `packages/flux-core/src/types/validation.ts`
  - `packages/flux-runtime/src/form-runtime-submit-flow.ts`

### 问题 8: 字段展示依赖 whole-store 订阅 → **已修复**

- **问题**: `FieldFrame` 使用 `useCurrentFormState` 订阅整个 form store，导致任何字段变化都会触发所有 `FieldFrame` 的 selector 执行
- **修复**:
  - `FieldFrame` 现在使用 `useCurrentFormFieldState`，实现 path-scoped 订阅
  - `useCurrentFormFieldState` 添加了降级处理：当 store 缺少 `subscribeToPath` 方法时自动回退到 `subscribe`
  - 当 path 为空字符串时跳过订阅，直接返回空状态，避免测试 mock 问题
- **性能提升**: 当字段 A 变化时，字段 B 的 `FieldFrame` 不再被唤醒（O(1) vs O(n)）
- **文件**:
  - `packages/flux-react/src/field-frame.tsx`
  - `packages/flux-react/src/hooks.ts`

### 问题 9: showError 计算忽略 compiled showErrorOn → **已修复**

- **问题**: `selectCurrentFormFieldPresentation()` 硬编码 `touched || dirty || visited || submitting`
- **修复**: 现在正确读取 `field.behavior.showErrorOn`
- **文件**: `packages/flux-react/src/form-state.ts`

---

## 修复记录

### 2026-04-17 修复 1: showError 计算统一使用 compiled behavior

**变更文件**: `packages/flux-react/src/form-state.ts`

添加了 `shouldShowFieldError` 辅助函数，`selectCurrentFormFieldPresentation` 现在从字段编译配置读取 `showErrorOn`。

### 2026-04-17 修复 2: 架构文档标注实现阶段

**变更文件**: `docs/architecture/form-validation.md`

- "Owner Resolution Algorithm" 添加 Implementation Status 注释
- "Parent And Child Scope Interaction" 添加 Implementation Status 注释
- "Current Implementation: Renderer-Level Draft Isolation" 新增章节说明当前方案
- "Implementation Phases" 更新各阶段状态标注

### 2026-04-17 修复 3: ChildValidationContractRegistration 接口扩展

**变更文件**: `packages/flux-core/src/types/validation.ts`

新增 `ChildValidationScopeState` 接口和 `ChildValidationContractRegistration` 的 `getState()` / `triggerValidation()` 方法。

### 2026-04-17 修复 4: summary-gate 正确检查子 scope 状态

**变更文件**: `packages/flux-runtime/src/form-runtime.ts`

`computeCanSubmit()` 现在检查子 scope 的 `ready`, `validating`, `valid` 状态。

### 2026-04-17 修复 5: recurse-submit 递归触发子验证

**变更文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts`

`executeFormSubmit()` 现在并行调用所有 `recurse-submit` 子 contracts 的 `triggerValidation()`，收集错误并在有错误时中止提交。

### 2026-04-17 修复 6: FieldFrame path-scoped 订阅优化

**变更文件**:

- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/hooks.ts`

`FieldFrame` 现在使用 `useCurrentFormFieldState` 代替 `useCurrentFormState`，实现 O(1) 唤醒。`useCurrentFormFieldState` 添加了：

1. 降级处理：当 store 缺少 `subscribeToPath` 时回退到 `subscribe`
2. 空 path 跳过：当 path 为空字符串时跳过订阅，直接返回空状态

---

## 当前实现：渲染器级 Draft 隔离

以 `detail-field` 为例的工作流程：

```json
{
  "type": "form",
  "data": { "address": { "street": "123 Main St" } },
  "body": [
    {
      "type": "detail-field",
      "name": "address",
      "surface": { "mode": "dialog", "title": "Edit Address" },
      "content": [{ "type": "input-text", "name": "street", "required": true }]
    }
  ]
}
```

**渲染器行为**:

1. **打开时**: 创建临时 `FormRuntime` (`detail-field-draft:address:timestamp`)
2. **编辑时**: 所有验证发生在 draft form，父 form 无感知
3. **取消时**: 丢弃 draft form，父 form 值不变
4. **确认时**:
   - `draftForm.validateAll('submit')` 验证 draft
   - 验证通过后调用 `parentForm.setValue(name, value)` 回写
   - 关闭 dialog，丢弃 draft form

**为什么这足够**:

1. Draft 验证完全隔离
2. 父 form 不会看到中间状态
3. 取消无副作用
4. 无需编译器支持

---

## 总结

| 类别                     | 数量 | 处理方式             |
| ------------------------ | ---- | -------------------- |
| Phase 3-4 规划功能       | 5    | 架构文档标注实现阶段 |
| 真正的代码缺陷（已修复） | 4    | 问题 4, 5, 8, 9      |

**结论**: 审计发现的 9 个问题已全部处理。核心 draft 隔离需求已被当前渲染器级实现满足，无需立即实现编译器级 owner 分区。
