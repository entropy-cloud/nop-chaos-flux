# 196 Interface Contract Alignment, Action Hardening & API Hygiene

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/analysis/2026-05-04-adversarial-review-6.md` (R6-F1 to F9), `docs/analysis/2026-05-04-adversarial-review-2.md` (R2-F6,F8), `docs/analysis/2026-05-04-adversarial-review-3.md` (R3-F6), `docs/analysis/2026-05-04-adversarial-review-5.md` (R5-F1 to F4, F7,F8), `docs/analysis/2026-05-04-adversarial-review-9.md` (R9-F1,F2), `docs/analysis/2026-05-04-deep-audit-full-6/summary.md` (P2-7)
> Related: plan-192 (partial overlap on action dispatcher and diagnostics)

## Purpose

修复接口签名与实现之间的偏差、action 系统的错误处理缺陷、公开 API 表面过度导出、以及零散的代码质量问题。

## Current Baseline

- `RendererHookApi` 接口缺少实现中存在的 `options` 参数（R6-F2）
- `ValidationScopeRuntime` optional methods 在 `FormRuntime` 中变 required（R6-F6, HIGH）
- `useScopeSelector<S>` 泛型无实际类型约束（R6-F1, R6-F9）
- `ScopeRef.replace` 可选但调用点可能未用 `?.`（R6-F7）
- "No errors" 双重表示：`undefined` vs `[]`（R6-F8）
- `XUI_ACTIONS_NAMESPACE` 常量重复定义（R2-F6）
- `useFormErrorStoreSelector` selector 每次 render 重建（R2-F8）
- `onSettled` 错误吞没导致清理逻辑丢失（R5-F7）
- Schema 编译无 partial-success 降级（R5-F8）
- `continueOnError` 死配置（R5-F2）
- flux-compiler 过度导出内部 API（R5-F1）
- `createModuleCache` 无生产消费者（R5-F3）
- Workbench types 无外部消费者（R5-F4）
- `KeyboardEvent as unknown as MouseEvent` cross-cast（deep-audit P2-7）
- 硬编码英文字符串（R9-F1）
- `buildUrlWithParams` 静默压平数组（R9-F2）
- Magic string `'none'` 无枚举（R6-F4）

## Goals

- 接口签名与实现完全对齐
- 公开 API 表面精简到实际消费者需要的范围
- Action 系统 onSettled 错误可观测
- Schema 编译有 partial-success 降级策略
- 零散代码质量问题修复

## Non-Goals

- 完整的 API surface governance 机制（lint rule 等）
- Decorative generic 的彻底消除（仅补文档说明）
- `computeScopeState` 重命名（R6-F3, LOW, 纯美化）
- `createActionDispatcher` 缓存行为文档化（R6-F5, LOW）

## Scope

### In Scope

- 接口-实现参数同步（R6-F2, R6-F6, R6-F7）
- API surface 精简（R5-F1, F3, F4）
- Action onSettled 错误处理（R5-F7）
- Schema 编译降级（R5-F8, R5-F2）
- 常量去重（R2-F6）
- Selector 性能修复（R2-F8）
- Cross-event cast 修复（P2-7）
- i18n 遗漏修复（R9-F1）
- URL params 数组序列化（R9-F2）
- Magic string 枚举化（R6-F4）
- "No errors" 表示统一（R6-F8）

### Out Of Scope

- Decorative generic 消除（补 JSDoc 说明即可）
- 函数重命名（`computeScopeState`, `createActionDispatcher`）

## Closure Gates

- [ ] 所有 in-scope HIGH/MEDIUM defects 已修复
- [ ] 受影响接口的签名更新有对应 focused test
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/logs/` 已更新

## Deferred But Adjudicated

### Decorative generic `S` 文档化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 不影响运行时正确性，仅需补 JSDoc 标注 `@remarks This generic is advisory only`
- Successor Required: no

### 函数命名改进

- Classification: `optimization candidate`
- Why Not Blocking Closure: 纯美化，不影响行为
- Successor Required: no

## Execution Plan

### Phase 1 - Interface-Implementation Alignment

Status: planned
Targets: `packages/flux-core/src/types/`, `packages/flux-react/src/hooks.ts`

- Item Types: Fix

- [ ] [Fix] `renderer-hooks.ts` — `useScopeSelector` 签名添加 `options?: { enabled?: boolean; fallback?: T }`，与 `hooks.ts` 实现对齐（R6-F2）
- [ ] [Fix] `renderer-hooks.ts` — `useCurrentFormError` 签名添加 `options` 参数
- [ ] [Fix] `runtime.ts:313-314` — `touchField`/`visitField` 在 `ValidationScopeRuntime` 上标注清晰的可选语义文档；或者 `FormRuntime` 显式 override 为 required 并在 JSDoc 说明差异（R6-F6）
- [ ] [Fix] `scope.ts:46` — 审查所有 `ScopeRef.replace` 调用点确保使用 `?.`（R6-F7）
- [ ] [Fix] `runtime.ts:334` + `form-runtime.ts:252` — 统一 "no errors" 表示为 `[]`，`getError` 返回 `ValidationError[]`（空数组代替 undefined）（R6-F8）
- [ ] [Fix] `hooks.ts:96` — 为 `useScopeSelector<S>` 的泛型添加 `@remarks` JSDoc 说明这是 advisory cast（R6-F1, R6-F9）
- [ ] [Proof] 测试：RendererHookApi 编译时接受 options 参数

Exit Criteria:

- [ ] 所有公开接口签名与实现一致
- [ ] `docs/references/renderer-interfaces.md` 已同步（如适用）
- [ ] `docs/logs/` 已更新

### Phase 2 - Action System & Schema Compiler Hardening

Status: planned
Targets: `packages/flux-action-core/src/`, `packages/flux-compiler/src/`

- Item Types: Fix, Decision

- [ ] [Fix] `action-execution.ts` onSettled catch — 除了 `notify('error')` 外，将错误记录到 `actionResult.settledError` 字段并传递给调用者（R5-F7）
- [ ] [Decision] Schema 编译 partial-success 策略：失败节点替换为 error placeholder `TemplateNode`，其他节点继续编译（R5-F8）
- [ ] [Fix] `diagnostics.ts:17` — 移除 `continueOnError` 死配置字段，或实现 continueOnError 逻辑使其生效（R5-F2）
- [ ] [Proof] 测试：onSettled throw 后 action result 包含 settledError 信息
- [ ] [Proof] 测试：schema 中一个 node expression 有语法错误时，其他 node 仍正常编译（如选择 partial-success）

Exit Criteria:

- [ ] onSettled 错误可观测
- [ ] Schema 编译降级策略已 landed 或 decision 记录
- [ ] No owner-doc update required（或更新 schema compiler 文档）
- [ ] `docs/logs/` 已更新

### Phase 3 - API Surface & Code Quality

Status: planned
Targets: 多个包

- Item Types: Fix

- [ ] [Fix] `flux-compiler/src/index.ts` — 将无外部消费者的导出标记为 `@internal` 或移到内部 module（R5-F1）：`createBaseCompileSymbolTable`, `schemaPathToJsonPointer`, `appendJsonPointer`, `validateSchema`, `isDataSourceFullyStatic`, `isReactionFullyStatic`, `mergeValidationRules`, `normalizeValidationTriggers`, `normalizeValidationVisibilityTriggers`
- [ ] [Fix] `flux-runtime/src/index.ts` — 移除 `createModuleCache` 公开导出（R5-F3）
- [ ] [Fix] `flux-core/src/workbench/types.ts` — 未使用 types 添加 `@internal` 标注（R5-F4）
- [ ] [Fix] `action-runners.ts:18` — 删除本地 `XUI_ACTIONS_NAMESPACE`，改为从 `@nop-chaos/flux-core` 导入（R2-F6）
- [ ] [Fix] `hooks.ts:236-238` — 修复 `useFormErrorStoreSelector` 的 `useCallback` deps：解构 `args` 获取稳定引用或使用 `useRef` 缓存（R2-F8）
- [ ] [Fix] `wrapped-field-action.tsx:87` — 消除 `KeyboardEvent as unknown as MouseEvent` cross-cast（P2-7）
- [ ] [Fix] `dynamic-renderer.tsx:55`, `scope-debug.tsx:53` — 硬编码英文字符串替换为 `t()` 调用（R9-F1）
- [ ] [Fix] `request-runtime.ts:119` — `buildUrlWithParams` 对数组参数使用 repeated key 序列化（`ids=1&ids=2&ids=3`）；对对象参数 `JSON.stringify`（R9-F2）
- [ ] [Fix] `form-runtime.ts:132` — 将 `'none'` 提取为 `flux-core/constants.ts` 中的常量 `SCOPE_BINDING_NONE`（R6-F4）

Exit Criteria:

- [ ] 无未使用的公开导出
- [ ] 常量无跨包重复
- [ ] Selector 性能修复
- [ ] i18n 遗漏修复
- [ ] URL 参数数组正确序列化
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

## Validation Checklist

- [ ] 接口签名与实现完全对齐
- [ ] 公开 API 表面无无用导出
- [ ] onSettled 错误可观测
- [ ] 不存在被降级的 in-scope live defect
- [ ] 独立子 agent closure-audit 已完成并记录
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者>>
- Evidence: <<task id / findings>>

Follow-up:

- <<完成时填写>>
