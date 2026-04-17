# 08 验证系统一致性

- Task ID: `ses_268e2c51cffeheY8h43KKSHNBF`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## 编译

### [维度08] 编译器仍然只产出单一 owner 的验证模型
- **文件**: `packages/flux-runtime/src/schema-compiler/validation-collection.ts:73-209`
- **严重程度**: P1
- **验证生命周期阶段**: 编译
- **现状**: 当前编译流程始终构造一个以 `''` 为根的 `CompiledFormValidationModel`，没有实现文档要求的 `create-owner / inherit-owner / no-owner` owner 分区。
- **风险**: dialog 子表单、draft scope、非 form validation scope 无法在编译期获得独立 owner，后续运行时只能靠 React/局部代理兜底，容易出现跨 scope 验证归属错误。
- **建议**: 把 owner boundary 作为编译期一等概念下推到 validation collector，按 owner 分区生成独立 compiled model，并把 owner/rootPath 契约贯通到运行时。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

## 注册

### [维度08] registerField 未校验注册路径是否属于当前 owner
- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:99-147`
- **严重程度**: P1
- **验证生命周期阶段**: 注册
- **现状**: `registerField()` 只检查 `disposed` 和重复 path，没有校验注册 path 是否落在当前 owner 的 `rootPath` 内。
- **风险**: 运行时字段可越过 owner 边界注册到错误的验证 owner，破坏“最近 validation-capable scope runtime 拥有验证”的核心约束。
- **建议**: 在注册入口统一调用 owner/path containment 校验；越界注册应拒绝，而不是静默接收。
- **参考文档**: `docs/architecture/form-validation.md`

### [维度08] 同一路径仅允许一个注册实例，不符合 registrationId 设计
- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:113-120`
- **严重程度**: P2
- **验证生命周期阶段**: 注册
- **现状**: 同一路径已有注册时，第二个实例会被直接拒绝。
- **风险**: 无法正确表达文档中的“多 mounted instance 指向同一逻辑路径”场景，复杂字段/投影视图/重复渲染时会丢失参与信息。
- **建议**: 把注册存储从 `path -> single registration` 改为 `path -> registration set`，以 `registrationId` 做实例级管理。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

## 触发

### [维度08] summary-gate 子 scope 只要激活就永久阻塞 canSubmit
- **文件**: `packages/flux-runtime/src/form-runtime.ts:126-139`
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: `computeCanSubmit()` 对 `summary-gate` 子 contract 的判断是“只要 active 就返回 false”，并未读取子 scope 的 `ready/validating`。
- **风险**: 父表单会被任何活动中的 summary-gate 子 scope 无条件阻塞，和文档定义的“按 child ready/validating 参与 gating”不一致。
- **建议**: child contract 需要携带可读 summary snapshot 或查询接口，父级按 `ready`/`validating` 聚合，而不是按 `active` 布尔值短路。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

### [维度08] recurse-submit 提交路径没有触发子 owner 验证
- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:140-143`
- **严重程度**: P1
- **验证生命周期阶段**: 触发
- **现状**: 父表单提交时遇到 `recurse-submit` 子 contract，当前代码执行的是 `contract.unregister()`，而不是递归触发子 owner 的 submit-time validation。
- **风险**: 嵌套 draft/dialog/form 的提交边界会被绕过，父级可能在子级未完成校验时继续提交。
- **建议**: 为 child contract 增加 submit/summary 读取能力；父 submit 应先快照 active child contracts，再按 `recurse-submit` 逐个等待子级提交验证完成。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

## 执行

### [维度08] applyChangesAndRevalidate 不是 owner-local 执行
- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:194-230`
- **严重程度**: P1
- **验证生命周期阶段**: 执行
- **现状**: 该入口没有校验 `writes/changedPaths` 是否属于当前 owner；且除 `reason === 'change'` 外直接退化为 `validateForm(reason)` 的整 owner 校验。
- **风险**: 一方面可能跨 owner 写值/重验，另一方面会把局部 commit/system 变成全表单重验，违背文档规定的 owner-local、path-aware 执行模型。
- **建议**: 在入口先做 owner containment 校验；再按 `changedPaths` 计算 impacted closure / subtree targets，而不是直接调用 owner-wide `validateForm()`。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

### [维度08] 外部错误不会随本地写入清理祖先链
- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:135-153`
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: `clearExternalErrorsForPath()` 只清理目标 path 和其后代 path，不清理文档要求的“owned ancestor chain up to owner root”。
- **风险**: 服务器返回的 object/array/root 级外部错误在用户修改叶子字段后仍可能残留，造成 stale error。
- **建议**: 清理规则改为“当前叶子 path + 其 owner 内祖先链 + 其后代”，并保持一次性原子发布。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

## 结果展示

### [维度08] 字段错误展示仍大量依赖 whole-store 订阅
- **文件**: `packages/flux-react/src/hooks.ts:154-162`; `packages/flux-renderers-form/src/field-utils.tsx:244-265`; `packages/flux-react/src/field-frame.tsx:61-84`
- **严重程度**: P2
- **验证生命周期阶段**: 结果展示
- **现状**: 虽然 store 已提供 `subscribeToPath()`，但字段展示主路径仍普遍通过 `useCurrentFormState()` 订阅整张 form store。
- **风险**: 单字段错误变更会唤醒大量字段订阅者，和文档要求的 per-path 订阅/O(1) 字段唤醒成本不一致。
- **建议**: 字段展示层优先改用 `useCurrentFormFieldState()` / `useFieldError()` 这类 path-scoped hook，仅在确需跨字段计算时再订阅更大范围。
- **参考文档**: `docs/architecture/form-validation.md`

### [维度08] useFieldPresentation 的 showError 计算忽略 compiled showErrorOn
- **文件**: `packages/flux-react/src/form-state.ts:115-123`; `packages/flux-renderers-form/src/field-utils.tsx:233-300`
- **严重程度**: P2
- **验证生命周期阶段**: 结果展示
- **现状**: `selectCurrentFormFieldPresentation()` 将错误可见性硬编码为 `touched || dirty || visited || submitting`，没有读取字段编译后的 `behavior.showErrorOn`。
- **风险**: 使用 `useFieldPresentation()` 的渲染器会和 schema/编译结果定义的可见性策略脱节，字段提示与验证策略可能不一致。
- **建议**: 让 presentation 层统一基于 compiled `showErrorOn` 计算 `showError`，避免 `FieldFrame` 与 `useFieldPresentation` 两套可见性逻辑并存。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
