# 维度 08：验证系统一致性

## 第 1 轮（初审）

## 零发现结论

本轮按维度 08 的编译 -> 注册 -> 触发 -> 执行 -> 结果展示生命周期，对 validation owner、时机、状态结构、异步 stale suppression、submit/commit debounce bypass、跨 scope 协调与代表性 advanced controls 做了 very thorough 初审，未发现新的高价值问题。

主 agent 已提供基线：`pnpm check:schema-prop-coverage` 100% 通过；上一轮 deep audit 08 零发现。维度 06 已发现的 `detail-view` confirm 异步失败反馈丢失，本轮仅核对是否构成 validation owner/时机契约违约；结论是不重复报告，它属于异步错误反馈路径而非验证系统 owner/时机本身的新违约。

## 检查范围与排除理由

### 编译阶段

检查范围：

- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- `packages/flux-compiler/src/schema-compiler/validation-collection.ts`
- 代表性 renderer validation contributors：`detail-field.tsx`、`detail-view.tsx`、`object-field.tsx`、`array-field.tsx`、`variant-field.tsx`、`condition-builder.tsx`

核对结论：

- `node-compiler.ts` 通过 `renderer.validation.ownerResolution` 与 `scopePolicy === 'form'` 生成 `validationOwnerPlan`，并为 form / descendant collection owner 生成 `validationPlan`。
- `validation-collection.ts` 遇到 `validationOwnerPlan.boundary === 'create-owner'` 会停止向父 owner 递归收集，符合 owner-boundary partitioning。
- `showErrorOn`、`validateOn`、`hiddenFieldPolicy` 均在编译阶段 normalized 到 compiled model。
- `dependsOn` 被并入规则依赖编译链，符合 schema-level dependency 参与 owner-local graph 的要求。

排除理由：未发现运行时重新解析 schema 来替代 compiled validation graph 的主路径；未发现 child owner 的字段被父 owner 编译吸收的证据。

### 注册阶段

检查范围：

- `packages/flux-runtime/src/form-runtime-field-ops.ts`
- `packages/flux-runtime/src/form-runtime-registration.ts`
- `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`
- runtime registration users：`key-value.tsx`、`array-editor.tsx`、`array-field.tsx`、`condition-builder.tsx`、`tag-list.tsx`、projected form / validation proxies

核对结论：

- `registerField()` 在 `disposed` 状态拒绝注册，且先执行 owner root/path containment 检查，再写入 participation maps。
- `childPaths` containment 在注册和 `updateFieldRegistration()` 中均被检查。
- registration 绑定 `modelGeneration`，旧 generation 的 unregister/update 不会污染新 generation。
- unregister 会清理注册 subtree 的 `errors` / `validating` 状态。
- `refreshCompiledModelState()` 清空 runtime registrations、hidden participation、validation runs、abort controllers、debounces，并推进 model generation。
- projected form / projected validation runtime 将 `registerField()`、`childPaths`、`applyExternalErrors()`、`notifyFieldHidden()` 经 prefix remap 后转发，符合 projected owner subtree 规则。

排除理由：未发现 out-of-owner path 先污染 participation map 再返回 rejected 的路径；未发现 runtime-only registration 创建新 validation owner 的路径。

### 触发阶段

检查范围：

- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- `packages/flux-renderers-form/src/field-utils/field-validation.ts`
- `packages/flux-react/src/node-renderer-resolved.tsx`
- advanced controls 的 change/blur/commit/submit 触发点：`array-editor.tsx`、`key-value.tsx`、`tag-list.tsx`、`array-field.tsx`、`object-field.tsx`、`detail-field.tsx`、`detail-view.tsx`、`variant-field-owner.ts`

核对结论：

- 普通字段通过 `shouldValidateOn()` / `shouldValidateOnOwner()` 尊重 compiled behavior triggers。
- `blur` 路径 touch 字段后触发 `validateField/validateAt(..., 'blur')`。
- `change` 路径先写 owner value，再按 trigger 调用 owner API。
- `NodeRendererResolved` 根据 resolved visibility 调用最近 owner 的 `notifyFieldHidden()`，hidden participation 不由 React UI 本地状态自造。
- composite controls 的 commit/submit 路径使用 owner API（`validateField` / `validateSubtree` / `validateAll`），没有发现绕过 FormRuntime / ValidationScopeRuntime 的自建验证主路径。
- `detail-field/detail-view` 的 draft confirm 会先验证 child draft owner，再执行 validateValueAction / transformOut / parent commit revalidation；维度 06 的 confirm catch 吞反馈问题不改变此处 owner/时机链路。

排除理由：部分 renderer 直接调用 owner validation API 属于“组件触发 owner API”，不是 React 组件自建 validation owner 或本地执行规则。

### 执行阶段

检查范围：

- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/form-runtime-submit.ts`
- `packages/flux-runtime/src/form-runtime-array-ops.ts`
- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-runtime/src/validation/*`

核对结论：

- `validatePath()` 对 `disposed` 返回 lifecycle-blocked result，对 `bootstrapping/refreshing` 等待 active，不把 null compiled model 当 ordinary clean success。
- `validateCompiledField()` 捕获 `modelGeneration` 与 per-path `runId`，异步完成前后均检查 stale，旧 run 不发布。
- async rule 使用 per-path `AbortController`，新 run 会 abort 旧 controller。
- `waitForValidationDebounce()` 对 `submit` / `commit` bypass debounce。
- `validateForm()` / `validateSubtree()` 在 `submit` / `commit` 前调用 `supersedeLowerPriorityWork()`，取消 pending debounce 并推进 run id。
- `applyChangesAndRevalidate()` 拒绝 out-of-owner writes/changedPaths；`reason: 'change'` 会先验证 changed path，再 revalidate dependents。
- hidden subtree 会清理 errors/validating、取消 debounces、abort in-flight async，并按 `clearValueWhenHidden` 收集 descendant paths。
- `computeScopeState()` 将 pending debounce count 纳入 validating/ready，符合 debounced work counts as pending 的要求。
- child contracts 在 submit flow 中按 active snapshot 处理，`summary-gate` 检查 `ready/validating/valid`，`recurse-submit` 触发 child validation。

排除理由：未发现 submit/commit 等待 change debounce 的路径；未发现 stale async completion 可覆盖新 generation 或 hidden subtree state 的路径；未发现 validateAll 隐式递归进入 child owners。

### 结果展示阶段

检查范围：

- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-react/src/hooks/use-form-hooks.ts`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/field-error-visibility.ts`
- `packages/flux-renderers-form/src/field-utils/field-presentation.tsx`
- `packages/flux-renderers-form/src/field-utils/field-reading.tsx`

核对结论：

- `form-store.ts` 使用单一 flat `fieldStates` map，并通过 `true | undefined`/空 entry cleanup 表达 boolean flags。
- `subscribeToPath` / `subscribeToPaths` / `getPathState` 提供 per-path subscription，field UI 不需要全局订阅 errors。
- `useCurrentFormFieldState()` / `useFieldError()` / `useAggregateError()` 基于 path subscription 与 selector。
- `FieldFrame` 从 owner store 读取 field state，并使用 `shouldShowFieldError()` 按 `touched/dirty/visited/submitAttempted` 过滤 UI 可见性。
- `system` 验证产生的 owner truth 不会自动绕过 field display policy。
- composite child errors（如 `array-editor` / `key-value`）通过 owner fieldStates 与 shared UI helper 展示，不是本地 error state 作为验证事实源。

排除理由：`detail-*` 的 `draftError` 是 confirm/draft surface 级交互反馈，不是字段验证事实源；未发现单字段错误展示需要全 form re-render 的路径。

## 按验证生命周期分类的检查摘要

- 编译：已核对 compile-time graph first、owner boundary partitioning、`showErrorOn`/`validateOn`/`hiddenFieldPolicy` normalization、schema `dependsOn` 编译接入。
- 注册：已核对 owner path containment、generation-aware registration、unregister cleanup、projected runtime path rebasing。
- 触发：已核对 field change/blur、hidden publish、composite add/remove/commit、detail draft confirm、variant hidden child path publish。
- 执行：已核对 lifecycle blocking/waiting、async run id/modelGeneration stale suppression、AbortController、debounce bypass、submit/commit supersession、dependency closure、external error overlay、hidden subtree cleanup。
- 结果展示：已核对 flat `fieldStates` map、per-path subscription、FieldFrame/error visibility、composite child error display。

## 总结评估

维度 08 当前实现与 `docs/architecture/form-validation.md` / `docs/references/form-validation-execution-details.md` 的核心契约保持一致：验证 owner 由最近 validation-capable runtime 拥有，编译图优先，runtime registration 只补充参与状态，fieldStates 为扁平 map，异步验证有 generation/run stale suppression，submit/commit bypass debounce 并 supersede lower-priority work，错误展示遵循 owner field state 与 display policy。

本轮未发现新的高价值问题。

## 建议第 2 轮深挖方向

未发现新的高价值问题。若主 agent 仍要做第 2 轮，可优先抽样验证以下低风险盲区：

- surface/dialog declarative 与 action-opened surface 的 validation owner 生命周期差异。
- large table / aggregate-heavy owner 的 `change` 触发成本与是否存在意外 `validateAll('change')`。
- projected validation runtime 在多层 array/object/variant 嵌套下的 path rebasing 与 external errors remap 组合路径。

## 维度复核结论

- 零发现复核：已重新核对 live code 的编译收集、注册 containment、触发路径、执行/stale suppression、submit/commit debounce bypass、hidden cleanup、结果展示与 owner docs，未发现需要新增或保留的维度 08 条目。

## 子项复核建议

无。

## 最终保留项

无最终保留项。
