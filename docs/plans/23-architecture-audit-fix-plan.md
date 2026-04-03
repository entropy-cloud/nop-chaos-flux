# Architecture Audit Fix Plan

> Plan Status: completed
> Last Reviewed: 2026-04-03


> **Status: ✅ REVIEWED / COMPLETED AS AN EXECUTION PLAN**
> Source audit conducted 2026-03-31 via automated codebase analysis (7 agents + Oracle verification).
> Covers `flux-core`, `flux-runtime`, `flux-react`, `flux-formula` and 3 renderer packages.
> Most core-package items in this file have since been implemented.
> Remaining domain-package structure follow-up has moved to dedicated plans such as `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md`.

## Overview

This document lists every issue found during the architecture audit, explains the root cause, and proposes a concrete fix plan with scope boundaries. Issues are ordered by priority (P0 → P3).

## 2026-04-03 复审结论

这份文档现在更适合作为“审计结论 + 执行状态台账”，不再是纯待办清单。

| ID | 当前状态 | 是否还在本计划执行 | 复审结论 |
|----|----------|--------------------|----------|
| P0-1 | 已实现 | 否 | `packages/flux-react/src/hooks.ts` 已移除 `require()` |
| P2-7 | 已实现 | 否 | `AGENTS.md` 和 `docs/architecture/flux-core.md` 已修正定位 |
| P1-1 | 已实现 | 否 | `packages/flux-core/src/types/` 已拆分；`types.ts` 保留为兼容 re-export，更合理 |
| P1-2 | 已实现 | 否 | 仅推荐的 Phase B 已落地；Phase A/C 继续不执行 |
| P1-3 | 已实现 | 否 | `validateRegisteredChildren` 已提取 |
| P1-4 | 已部分实现并关闭 | 否 | 核心拆分已完成；剩余 provider 合并方案不推荐继续 |
| P2-1 | 已实现 | 否 | `scheduleDebounce` / `cancelPendingDebounce` 已落地 |
| P2-2 | 已实现 | 否 | `setValidating` 已复用 `setBooleanState` |
| P2-3 | 已实现 | 否 | `executeArrayMutation` 已提取 |
| ~~P2-4~~ | 已废弃 | 否 | 继续保持不推荐 |
| P2-5 | 已实现 | 否 | `schema-compiler/` 子模块已落地；主文件保留 orchestrator |
| P2-6 | 已实现 | 否 | 文档已移除不存在的 `flux-testing` 包 |
| P3-1 | 已实现 | 否 | `flux-formula` 已拆为 5 个模块 |
| P3-2 | 已实现 | 否 | `docs/architecture/flux-core.md` 已补充 `amis-formula` 适配边界说明 |
| P3-3 | 已转移 / 废弃 | 否 | 后续领域包结构工作改由专门计划跟踪 |

**不应继续从本计划推进的项**：`P1-4` 剩余步骤、`P3-3` 领域包专项审计总项、以及所有已完成的 core-package 重构项。

---

## ~~P0-1~~ P2-7: flux-core 定位重新审视（降级为文档修正）

> **2026-04-03 复审状态**: 已实现。`AGENTS.md` 与 `docs/architecture/flux-core.md` 都已经改为 “Foundation contracts and shared utilities” 的定位描述，本项关闭。

> **2026-03-31 修订**: 经重新审视，flux-core 包含运行时工具函数的设计本身是合理的。
> 问题仅在于 AGENTS.md 中的描述不准确。将此问题从 P0 降级为 P2（文档修正）。

### Re-evaluation

flux-core 的实际定位不是"纯类型包"，而是**基础契约与共享工具包**。当前包含的运行时代码：

| File | Functions | 性质 |
|------|-----------|------|
| `utils/array.ts` | 6 | 纯函数，无副作用，等同于语言内置工具 |
| `utils/path.ts` | 3 | 纯函数，嵌套对象访问 |
| `utils/object.ts` | 2 | 纯函数，类型判断和浅比较 |
| `utils/schema.ts` | 4 | 纯函数，Schema 类型守卫 |
| `validation-model.ts` | 12 | 纯函数，验证模型数据变换 |
| `class-aliases.ts` | 2 | 纯函数，别名解析 |

**放在 flux-core 是合理的原因**：

1. **依赖方向正确**: flux-formula 依赖 flux-core，需要使用 `getIn`、`isPlainObject`、`shallowEqual`。如果这些函数移到 flux-runtime（依赖链上层），flux-formula 就无法访问。
2. **函数性质**: 都是纯函数、无副作用、无外部依赖。等同于 `Partial<T>`、`Readonly<T>` 这样的语言级工具，而非业务逻辑。
3. **无循环依赖风险**: 这些函数只依赖原生类型，不依赖 flux-core 的类型定义（validation-model.ts 除外，但它也只依赖同包的类型）。
4. **已形成稳定的导入网络**: 86 个导入点分布在 5 个包中，迁移成本高但收益低。

### Fix Plan (文档修正)

**Step 1 — 更新 AGENTS.md**:

将 flux-core 的描述从：
> `@nop-chaos/flux-core` - Pure types/interfaces (no runtime code).

改为：
> `@nop-chaos/flux-core` - Foundation contracts and shared utilities. Contains type definitions, constants, and side-effect-free pure utility functions shared across all packages.

**Step 2 — 更新 `docs/architecture/flux-core.md`**:

在文档中明确 flux-core 的定位：它是最底层的共享包，包含类型契约和跨包使用的纯工具函数。不属于业务逻辑层的代码不应放入，但无副作用的通用工具可以放入。

**Scope**: 仅文档变更，无代码改动。

**Effort**: 30 分钟。

---

## P0-1: ESM 项目中使用 `require()`

> **2026-04-03 复审状态**: 已实现。`packages/flux-react/src/hooks.ts` 已改为静态 `import { createHelpers } from './helpers';`，`require()` 和对应的 `eslint-disable` 已移除，本项关闭。

### Problem

`packages/flux-react/src/hooks.ts` line 142:

```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHelpers } = require('./helpers');
```

This project uses `"type": "module"` in all package.json files. `require()` is a CommonJS API and does not work in native ESM environments. The `eslint-disable` comment suppresses the warning but does not fix the underlying issue.

### Root Cause

`useRenderFragment` hook uses `require()` as an attempt at lazy loading / code splitting — avoiding eager import of helper code. However, `createHelpers` is already imported at the top of the same file (via static import in other files that use it), and the module is small (69 lines), so the lazy-loading rationale is weak.

### Fix Plan

Replace `require()` with the static import that already exists. The file `helpers.tsx` is only 69 lines — no meaningful code-splitting benefit.

**Step 1**: In `hooks.ts`, change `useRenderFragment` to use `createHelpers` from the existing static import path. Check if `./helpers` is already imported elsewhere in the file.

**Step 2**: If `createHelpers` is not already statically imported, add `import { createHelpers } from './helpers';` at the top.

**Step 3**: Remove the `require()` call and the `eslint-disable` comment.

**Scope**: Single file change, `packages/flux-react/src/hooks.ts` only.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 30 minutes.

---

## P1-1: types.ts (904 行) 拆分

> **2026-04-03 复审状态**: 已实现，但实现方式比原计划更合理。`packages/flux-core/src/types/` 已存在，`packages/flux-core/src/types.ts` 现为单行 `export * from './types/index';` 兼容壳。原计划的 Step 3“彻底删除 `types.ts`”已过时，不建议再执行。

### Problem

`packages/flux-core/src/types.ts` is 904 lines — the largest file in the package, containing ALL type definitions: schema types, compilation types, validation types, runtime store types, renderer types, action types, and scope types. This makes it hard to navigate, increases cognitive load, and slows IDE intellisense.

### Root Cause

All types were added incrementally to a single file during active development. No file-splitting discipline was enforced.

### Fix Plan

Split `types.ts` into domain modules under `types/`:

```
flux-core/src/types/
├── index.ts          # barrel re-export (export * from each module)
├── schema.ts         # SchemaValue, BaseSchema, SchemaFieldRule, ApiObject, DataSourceSchema
├── compilation.ts    # CompiledValueNode, StaticValueNode, ExpressionValueNode, etc.
├── validation.ts     # ValidationRule, ValidationError, ValidationResult, CompiledFormValidationModel, etc.
├── runtime.ts        # FormStoreState, PageStoreState, FormRuntime, PageRuntime, RuntimeFieldRegistration
├── renderer.ts       # RendererDefinition, RendererComponentProps, CompiledSchemaNode, RendererPlugin
├── actions.ts        # ActionSchema, ActionContext, ActionResult, ActionScope
└── scope.ts          # ScopeRef, ScopeStore, ScopePolicy, CreateScopeOptions
```

**Step 1**: Create `types/` directory and split types by domain. The `import type { ComponentType, ReactElement, ReactNode } from 'react'` stays in `renderer.ts` only.

**Step 2**: Create `types/index.ts` with `export * from './schema'; export * from './compilation'; ...` so all consumers still `import { ... } from '@nop-chaos/flux-core'`.

**Step 3**: Delete the original `types.ts`.

**Step 4**: Update `flux-core/src/index.ts` — change `export * from './types'` to `export * from './types/index'` (or just `export * from './types'` which resolves to the directory).

**Scope**: Only file restructuring within flux-core. No API changes.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`. All downstream packages should compile without changes.

**Effort**: 1-2 days.

---

## P1-2: `Record<string, any>` 类型安全改善

> **2026-04-03 复审状态**: 已实现（仅 Phase B）。`useScopeSelector` 现在是 `useScopeSelector<T, S = Record<string, unknown>>`。Phase A / Phase C 继续维持不推荐结论。

> **2026-03-31 审计修订**: 经代码验证，原审计计数偏低（43 → 47，仅源码非测试文件）。
> Phase A 和 Phase C 经评估 ROI 不高，标记为不推荐。仅保留 Phase B。

### Problem

47 instances of `Record<string, any>` across source files (flux-core: 17, flux-runtime: ~22, flux-formula: 3, flux-react: 1, plus test files). Key hotspots:

- `RendererComponentProps<any>` in `RendererDefinition` (`types.ts:560`) — all renderer components lose type inference
- `useScopeSelector<T>(selector: (scopeData: any) => T)` (`hooks.ts:48`) — scope data untyped
- `FormStoreState.values: Record<string, any>` (`types.ts:666`)
- `ScopeStore<T = Record<string, any>>` (`types.ts:142`)

### Root Cause

Low-code renderers deal with dynamic, user-defined schemas where field types are unknown at compile time. `Record<string, any>` is a pragmatic choice for the outer API boundary, but it has leaked into interfaces where more specific types are possible.

### Fix Plan

Incremental improvement — only target the highest-value, lowest-risk sites.

**Phase A — `RendererDefinition.component` ⛔ 不推荐:**
```typescript
// Proposed: use S instead of any
interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  component: ComponentType<RendererComponentProps<S>>;
}
```
**不推荐原因**: 在低代码渲染器中，`S` 在编译时永远是 `BaseSchema`——schema 来自 JSON 运行时解析，不存在静态子类型信息。此改动对绝大多数 renderer 无实际类型收窄效果，ROI 极低。

**Phase B — `useScopeSelector` ✅ 推荐 (0.5 day):**
```typescript
// Before
useScopeSelector<T>(selector: (scopeData: any) => T, ...): T

// After — add a generic for the scope shape
useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, ...): T
```
这个改动向后兼容、低风险、为调用方提供了类型安全的入口点。

**Phase C — `FormStoreState.values` and `ScopeStore` ⛔ 不推荐:**
将 `any` 改为 `unknown` 会导致大量下游代码需要类型断言，实际是把显式的 `any` 藏到 `as` 断言后面，不增加类型安全性。form values 本质上是动态的，`Record<string, any>` 在这里是最诚实的类型表达。

**Scope**: Only Phase B. No breaking changes. Backward-compatible through generic defaults.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 0.5 day (Phase B only).

---

## P1-3: validateForm() 子验证逻辑重复

> **2026-04-03 复审状态**: 已实现。`packages/flux-runtime/src/form-runtime.ts` 已提取 `validateRegisteredChildren()` 并替换 3 处重复逻辑，本项关闭。

### Problem

`packages/flux-runtime/src/form-runtime.ts` lines 125-224: `validateForm()` is ~100 lines with child validation logic appearing in three separate conditional branches (Oracle-verified at lines 151-160, 166-175, 187-196):

```typescript
// This block appears 3 times with minor variation:
if (registration.validateChild && registration.childPaths?.length) {
  for (const childPath of registration.childPaths) {
    const result = await thisForm.validateField(childPath);
    if (!result.ok) {
      fieldErrors[childPath] = result.errors;
      errors.push(...result.errors);
    }
  }
}
```

### Root Cause

The three branches handle different combinations of compiled validation presence and registration type. The developer copy-pasted the child validation block rather than extracting it, likely because each branch has slightly different surrounding logic.

### Fix Plan

Extract a `validateRegisteredChildren` helper function:

```typescript
// In form-runtime.ts or form-runtime-validation.ts
async function validateRegisteredChildren(
  registration: RuntimeFieldRegistration,
  validateField: (path: string) => Promise<ValidationResult>,
  fieldErrors: Record<string, ValidationError[]>,
  errors: ValidationError[]
): Promise<void> {
  if (!registration.validateChild || !registration.childPaths?.length) return;
  for (const childPath of registration.childPaths) {
    const result = await validateField(childPath);
    if (!result.ok) {
      fieldErrors[childPath] = result.errors;
      errors.push(...result.errors);
    }
  }
}
```

Then replace the 3 duplicated blocks with calls to this function. The `validateForm()` method should read as:

```
for each registration:
  validate compiled field (if exists)
  validate registration field (if exists)
  validateRegisteredChildren(registration, ...)
merge all errors
```

**Scope**: Only `form-runtime.ts`, no API changes.

**Verification**: Existing tests for form validation must pass unchanged.

**Effort**: 1 day.

---

## P1-4: node-renderer.tsx 关注点分离

> **2026-04-03 复审状态**: 已部分实现并建议关闭。`useNodeForm.ts`、`useNodeScopes.ts` 已提取，监控代码已受 `runtime.env.monitor` 守卫，`node-renderer.tsx` 已降到 286 行。剩余的 provider 合并方案继续不推荐，额外拆分也暂时没有足够 ROI。

### Problem

`packages/flux-react/src/node-renderer.tsx` (356 lines) combines:
- Form runtime creation and lifecycle management (lines 100-136)
- Action scope and component registry creation (lines 138-156)
- xui:imports lifecycle (lines 182-197)
- Monitoring with `Date.now()` on every render (line 73) — performance impact
- 7 nested Context.Provider wrappers (lines 340-346)
- Rendering logic

### Root Cause

`NodeRenderer` is the central rendering orchestrator. During development, all per-node logic was added inline because it was the natural place for it. No subsequent extraction was done.

### Fix Plan

**Step 1 — Extract custom hooks (2 files):**

`useNodeForm.ts`:
```typescript
export function useNodeForm(node, scope, page, resolvedProps, runtime): FormRuntime | undefined {
  // Move form creation logic (lines 100-136)
  // Use useRef for stable identity
}
```

`useNodeScopes.ts`:
```typescript
export function useNodeScopes(node, runtime, actionScope, componentRegistry) {
  // Move action scope + component registry creation (lines 138-156)
  // Return { activeActionScope, activeComponentRegistry }
}
```

**Step 2 — Fix monitoring performance (0.5 day):**

Replace per-render `Date.now()` with conditional monitoring:
```typescript
// Before (line 70)
renderStartedAtRef.current = Date.now();

// After
if (runtime.env.monitor) {
  renderStartedAtRef.current = Date.now();
}
```

**Step 3 — Consider flattening Context tree (optional, P2) ⚠️ 需谨慎:**

Combine the 7 Context.Providers into a single `NodeContext` object:
```typescript
interface NodeContextValue {
  scope: ScopeRef;
  form?: FormRuntime;
  page?: PageRuntime;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  classAliases: Record<string, string>;
  nodeMeta: RenderNodeMeta;
}
```

> **⚠️ 性能警告**: React 的 Context 机制决定了单一 context 意味着任一值变化都会触发所有消费者重新渲染。7 个独立 provider 反而提供了更细粒度的更新控制。**仅在性能分析确认 context 传播成本显著时才考虑合并**，否则维持现状更优。
This reduces provider nesting but requires updating all consumers. Mark as optional scope — only do if performance profiling shows context propagation cost.

**Scope**: `packages/flux-react/src/` only. No API changes to public hooks.

**Verification**: `pnpm typecheck && pnpm build && pnpm test` (including the 1901-line test file for flux-react).

**Effort**: 2 days.

---

## P2-1: 防抖辅助函数提取

> **2026-04-03 复审状态**: 已实现。`packages/flux-runtime/src/utils/debounce.ts` 已存在 `scheduleDebounce()`，并额外演进出 `cancelPendingDebounce()` 供调用点复用，本项关闭。

### Problem

Two conceptually similar debounce implementations:

1. `packages/flux-runtime/src/action-runtime.ts:423-451` — action debounce with monitoring, cancellation results, action key logic
2. `packages/flux-runtime/src/form-runtime-validation.ts:42-61` — validation debounce with path-based tracking, validation run ID

Both follow: check existing → clearTimeout → create new Promise → setTimeout → resolve.

### Root Cause

Two developers (or the same developer at different times) independently implemented debounce for different use cases without checking for shared patterns.

### Fix Plan

> **审计修订**: 原方案 `createDebouncedMap<K, T>` 过于通用，核心逻辑都在 factory 回调中，通用包装器只提供 setTimeout + Map 管理，价值有限。改为更轻量的方案。

Extract a minimal `scheduleDebounce` utility — not a generic container, just the shared scheduling pattern:

```typescript
// packages/flux-runtime/src/utils/debounce.ts

/**
 * Schedules a debounced operation, cancelling any previous pending operation for the same key.
 * Returns a promise that resolves with the factory result after the timeout.
 */
export function scheduleDebounce<K>(
  pendingMap: Map<K, { timer: ReturnType<typeof setTimeout>; resolve: (result: unknown) => void }>,
  key: K,
  timeoutMs: number,
  factory: () => Promise<unknown>
): Promise<unknown> {
  const previous = pendingMap.get(key);
  if (previous) {
    clearTimeout(previous.timer);
    previous.resolve(undefined);
    pendingMap.delete(key);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pendingMap.delete(key);
      resolve(await factory());
    }, timeoutMs);
    pendingMap.set(key, { timer, resolve });
  });
}
```

Each call site keeps its own `pendingMap` and domain-specific logic (monitoring, run-ID tracking, etc.), but delegates the shared `clearTimeout → new Promise → setTimeout → resolve` pattern to this utility.

**Scope**: Only `flux-runtime/src/`. No cross-package changes.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 0.5 day.

---

## P2-2: setValidating 未复用已有辅助函数

> **2026-04-03 复审状态**: 已实现。`setValidating()` 已改为调用 `setBooleanState('validating', ...)`，本项关闭。

> **2026-03-31 审计修订**: 原描述"4 个近乎相同的方法需提取辅助函数"与实际不符。
> 经代码验证，`form-store.ts` 已有 `setBooleanState` 辅助函数，`setTouched`、`setDirty`、`setVisited` 三个方法已在使用它。
> **仅 `setValidating` 未使用此辅助函数**而内联重复了相同逻辑。

### Problem

`packages/flux-runtime/src/form-store.ts` 中 `setValidating` 方法（lines 79-94）内联实现了与 `setBooleanState` 辅助函数（lines 16-35）完全相同的逻辑，但未调用该辅助函数：

```typescript
// setValidating — 内联重复，未使用已有辅助函数
setValidating(path, validating) {
  const current = store.getState().validating;
  if (validating) {
    store.setState({ validating: { ...current, [path]: true } });
    return;
  }
  if (!current[path]) {
    return;
  }
  const next = { ...current };
  delete next[path];
  store.setState({ validating: next });
},

// setTouched/setDirty/setVisited — 已正确使用辅助函数
setTouched(path, touched) { setBooleanState('touched', path, touched); },
setDirty(path, dirty) { setBooleanState('dirty', path, dirty); },
setVisited(path, visited) { setBooleanState('visited', path, visited); },
```

### Root Cause

`setBooleanState` 辅助函数是在前 3 个方法之后提取的，但 `setValidating` 添加时没有同步改用辅助函数。

### Fix Plan

将 `setValidating` 改为使用已有的 `setBooleanState` 辅助函数：

```typescript
// Before (10 lines)
setValidating(path, validating) {
  const current = store.getState().validating;
  if (validating) {
    store.setState({ validating: { ...current, [path]: true } });
    return;
  }
  if (!current[path]) { return; }
  const next = { ...current };
  delete next[path];
  store.setState({ validating: next });
},

// After (1 line)
setValidating(path, validating) { setBooleanState('validating', path, validating); },
```

需要扩展 `setBooleanState` 的类型参数以包含 `'validating'`：

```typescript
// Before
function setBooleanState<K extends 'touched' | 'dirty' | 'visited'>(key: K, ...)

// After
function setBooleanState<K extends 'touched' | 'dirty' | 'visited' | 'validating'>(key: K, ...)
```

**Scope**: Only `form-store.ts`.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 5 分钟。

---

## P2-3: 数组操作通用模板

> **2026-04-03 复审状态**: 已实现。`packages/flux-runtime/src/form-runtime-array.ts` 已新增 `executeArrayMutation()`，`form-runtime.ts` 中 7 个数组方法都已收口到该模板。

### Problem

`packages/flux-runtime/src/form-runtime.ts` lines 387-563 has 7 array mutation methods (appendValue, prependValue, insertValue, removeValue, moveValue, swapValue, replaceValue). Each follows the same template:

1. Get current value from scope
2. Apply array operation
3. Call `remapArrayFieldState(sharedState, path, indexTransform, cancelCallback)`
4. Call `replaceManagedArrayValue({ sharedState, arrayPath, nextValue, ... })`

The only per-method differences are: the array operation and the index transform function. `replaceManagedArrayValue` has already been extracted to `form-runtime-array.ts`, but the calling template is still repeated ~30-40 lines across the 7 methods.

### Root Cause

Initial implementation was method-by-method. The shared `replaceManagedArrayValue` helper was extracted later (Plan 05), but the calling-side template was not unified.

### Fix Plan

Extract a `executeArrayMutation` orchestrator:

```typescript
// In form-runtime-array.ts
function executeArrayMutation(ctx: {
  sharedState: FormRuntimeSharedState;
  scope: ScopeRef;
  arrayPath: string;
  arrayOperation: (current: unknown[]) => unknown[];
  indexTransform: (candidateIndex: number) => number | undefined;
  onCancelValidation: (path: string) => void;
  onClearErrors: (path: string) => void;
  onRevalidateDependents: (path: string) => void;
}): void {
  const current = ctx.scope.get(ctx.arrayPath);
  const safeArray = Array.isArray(current) ? current : [];
  const nextValue = ctx.arrayOperation(safeArray);
  remapArrayFieldState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform, ctx.onCancelValidation);
  replaceManagedArrayValue({
    sharedState: ctx.sharedState,
    arrayPath: ctx.arrayPath,
    nextValue,
    cancelValidationDebounce: ctx.onCancelValidation,
    clearErrors: ctx.onClearErrors,
    revalidateDependents: ctx.onRevalidateDependents,
  });
}
```

Then simplify each method in `form-runtime.ts`:

```typescript
appendValue(path, value) {
  executeArrayMutation({
    ...ctx,
    arrayOperation: (arr) => insertArrayValue(arr, Number.MAX_SAFE_INTEGER, value),
    indexTransform: (i) => i,
  });
}
```

**Scope**: `form-runtime.ts` and `form-runtime-array.ts` only.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 0.5 day.

---

## ~~P2-4~~: 添加 Branded Types — ⛔ 不推荐实施

> **2026-04-03 复审状态**: 已废弃。维持“不推荐实施”的结论，不再作为执行项追踪。

> **2026-03-31 审计修订**: 经评估 ROI 极低，标记为不推荐实施。保留原分析供参考。

### Problem

Critical identifiers are all typed as plain `string`:

```typescript
export type SchemaPath = string;        // types.ts:11
// ComponentId, ActionName, etc. — not even aliases, just inline string
```

This means any string can be passed where a path is expected, and the compiler cannot catch mismatches (e.g., passing an action name where a schema path is needed).

### 不推荐理由

1. **低代码渲染器的本质矛盾**: 所有 path/id 都来自用户定义的 JSON schema，在运行时是动态字符串。branded types 需要在每个入口点用工厂函数包装，但这些入口点正是 schema 解析器——它接收的输入就是 `string`。实际效果是每处解析逻辑都需要 `as SchemaPath` 强转，等于把 `as any` 换成了 `as SchemaPath`，安全收益为零。

2. **已有 type alias 提供语义区分**: 当前 `export type SchemaPath = string;` 已提供了语义上的区分和 IDE 可搜索性。branded types 的增量价值很小。

3. **成本高收益低**: 需要修改大量调用点（1-2 天工作量），但带来的类型安全改善仅在编译时有效，而低代码场景中 schema 类型在编译时不可知。

### Recommendation

如果未来有静态 schema 分析需求（如 VS Code 插件、schema linting），可重新评估。当前阶段不建议投入。

**Status**: ⛔ NOT RECOMMENDED.

---

## P2-5: schema-compiler.ts 拆分

> **2026-04-03 复审状态**: 已实现，但实现方式比原计划更合理。`packages/flux-runtime/src/schema-compiler/` 子模块已经落地，`schema-compiler.ts` 已缩减为编排层。原计划的 Step 4 仅在 barrel 需要调整时才有意义，不再单独执行。

### Problem

`packages/flux-runtime/src/schema-compiler.ts` is 635 lines — the largest file in flux-runtime. It mixes:

- Schema compilation orchestration
- Validation rule compilation
- Region extraction
- Table column normalization
- Field normalization

### Root Cause

All compilation logic was built incrementally in a single file. The schema compiler is the heart of the system and was heavily iterated on.

### Fix Plan

Split into submodules under `schema-compiler/`:

```
packages/flux-runtime/src/
├── schema-compiler.ts              # Main orchestrator (compile, compileNode) — reduced to ~200 lines
└── schema-compiler/
    ├── index.ts
    ├── regions.ts                  # Region extraction logic
    ├── tables.ts                   # Table column normalization
    ├── fields.ts                   # Field normalization and SchemaFieldRule processing
    └── validation-collection.ts    # Validation rule collection from schema
```

**Step 1**: Identify clear function boundaries in the existing file.

**Step 2**: Extract each group into its own module.

**Step 3**: Update imports in `schema-compiler.ts` to use the submodules.

**Step 4**: Update `index.ts` barrel if needed.

**Scope**: Only `flux-runtime/src/schema-compiler*`. No public API changes.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 2 days.

---

## P2-6: 缺失的 flux-testing 包

> **2026-04-03 复审状态**: 已实现（Option B）。`AGENTS.md` 已不再声明 `@nop-chaos/flux-testing`，仓库中也不存在该包；当前只需维持现状，不要再从本计划创建此包。

### Problem

`AGENTS.md` documents `@nop-chaos/flux-testing` as a workspace package providing "Shared test utilities". But `packages/flux-testing/` does not exist in the filesystem.

### Root Cause

The package was planned but never created. Tests currently use local helpers or inline setup code.

### Fix Plan

Two options:

**Option A — Create the package:**
1. Create `packages/flux-testing/` with standard package structure
2. Extract common test utilities from existing test files:
   - Mock scope/store factories used in multiple test files
   - Test schema fixtures (commonly used JSON schemas)
   - Custom Vitest matchers for validation results
3. Add workspace dependency in test files

**Option B — Remove from documentation:**
1. Remove `flux-testing` from AGENTS.md package list
2. Keep test utilities colocated as they are today

Recommend **Option B** unless 3+ packages share significant test boilerplate.

**Scope**: Documentation or new package creation.

**Effort**: Option A: 1-2 days. Option B: 30 minutes.

---

## P3-1: flux-formula 拆分

> **2026-04-03 复审状态**: 已实现。`packages/flux-formula/src/` 已拆为 `index.ts`、`compile.ts`、`evaluate.ts`、`template.ts`、`scope.ts`，共享的 `countBraceDepth()` 也已落地，本项关闭。

### Problem

`packages/flux-formula/src/index.ts` is a 585-line single file containing the entire compilation pipeline: template parsing, expression compilation, value tree compilation, scope proxy creation, and evaluation.

Two similar brace-counting parsers exist:
- `parseTemplateSegments()` (lines 187-239, 53 lines) — full template segment extraction
- `isPureExpression()` (lines 155-185, 31 lines) — checks if template is a single expression

### Root Cause

The package was small enough at creation that a single file felt appropriate. It grew organically.

### Fix Plan

Split into:

```
packages/flux-formula/src/
├── index.ts              # Public API + ExpressionCompiler factory
├── template.ts           # parseTemplateSegments, isPureExpression (share a common brace-counter)
├── compile.ts            # compileNode, compileValue
├── evaluate.ts           # evaluateNode, evaluateValue, createEvalContext
└── scope.ts              # createFormulaScope, toEvalContext, ScopeRef helpers
```

Additionally, extract a shared `countBraceDepth(str, start)` helper used by both template parsers.

**Scope**: Only `flux-formula/src/`. No public API changes.

**Verification**: `pnpm typecheck && pnpm build && pnpm test`.

**Effort**: 1 day.

---

## P3-2: 审视 amis-formula 依赖

> **2026-04-03 完成状态**: 已实现。`docs/architecture/flux-core.md` 已补充当前为何继续通过 `flux-formula` 适配 `amis-formula`、以及该依赖必须被限制在 `@nop-chaos/flux-formula` 包内的说明。当前代码中 `amis-formula` 只在 `packages/flux-formula/src/compile.ts` 被直接导入，边界保持干净，本项关闭。

### Problem

`flux-formula` imports `parse` and `evaluate` from `amis-formula` (an npm package). The project is positioned as a "modern rewrite of AMIS", yet depends on AMIS's expression engine at runtime.

### Root Cause

Pragmatic choice — `amis-formula` provides a working expression parser/evaluator. Building a custom one would be significant effort. This is a valid tradeoff but should be acknowledged and possibly revisited.

### Fix Plan

No immediate code change. Document the decision:

1. Add a note in `docs/architecture/flux-core.md` explaining why `amis-formula` is used
2. Track as a future consideration: if `amis-formula` becomes a maintenance burden or if expression syntax needs to diverge from AMIS, plan a custom expression engine
3. Ensure `amis-formula` is only imported in `flux-formula` (not leaked to other packages) — verify via import audit

**Scope**: Documentation only.

**Effort**: 1 hour.

---

## P3-3: 领域包专项审计

> **2026-04-03 复审状态**: 作为本计划的后续项已废弃/转移。领域包的结构性后续工作已经转入专门计划，例如 `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md`；不要再把这一条作为 #23 的活跃待办。

### Problem

`flow-designer-core` (656 lines), `spreadsheet-core` (1698 lines), `report-designer-core` (791 lines), and their respective renderer packages were not deeply audited. These represent a significant portion of the codebase.

### Root Cause

Scope limitation — the initial audit focused on the core flux pipeline.

### Fix Plan

Schedule separate audits for each domain package, following the same methodology:
- Explore agent for structure/patterns
- Check for internal duplication, oversized files, abstraction quality
- Verify `*-core` / `*-renderers` boundary is clean

Priority: `spreadsheet-core` first (largest at 1698 lines), then `flow-designer-core`, then `report-designer-core`.

**Scope**: 3 separate audit sessions.

**Effort**: 3-5 days total.

---

## Summary

> **2026-04-03 复审总结**: 这份计划中的核心 `flux-*` 项目现已全部落地；剩余范围外的领域包结构工作已经转移到其他专项计划。

| ID | 当前状态 | 方案复核 | 当前处理建议 |
|----|----------|----------|--------------|
| P0-1 | 已实现 | 原方案合理 | 关闭 |
| P2-7 | 已实现 | 原方案合理 | 关闭 |
| P2-6 | 已实现 | 原方案合理，Option B 正确 | 关闭 |
| P2-2 | 已实现 | 原方案合理 | 关闭 |
| P1-3 | 已实现 | 原方案合理 | 关闭 |
| P2-3 | 已实现 | 原方案合理 | 关闭 |
| P1-2 | 已实现 | 仅 Phase B 合理 | 关闭 |
| P2-1 | 已实现 | 原方案合理，最终实现略强于计划 | 关闭 |
| P2-5 | 已实现 | 原方向合理；保留 orchestrator 比“彻底拆空主文件”更合理 | 关闭 |
| P1-1 | 已实现 | 原方向合理；保留兼容 `types.ts` 比彻底删除更合理 | 关闭 |
| P3-1 | 已实现 | 原方案合理 | 关闭 |
| P1-4 | 已部分实现 | Step 1/2 合理；Step 3 不合理 | 不再作为独立任务继续 |
| ~~P2-4~~ | 已废弃 | 继续不推荐 | 保持废弃 |
| P3-2 | 已实现 | 原方案在收窄为 docs-only 后合理 | 关闭 |
| P3-3 | 已转移 / 废弃 | 不应继续挂在本计划下 | 改看 `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md` 等专项计划 |

**当前处理建议**:

1. 本计划可以视为已完成，不再作为活跃执行清单使用。
2. 不要再从这份计划继续推进 `P1-4` 的 provider 合并或额外抽象。
3. 领域包的大文件/结构债务后续直接看 `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md`，不要回到 #23 聚合处理。


