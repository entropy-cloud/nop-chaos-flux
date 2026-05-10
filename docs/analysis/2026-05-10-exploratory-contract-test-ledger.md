# 2026-05-10 Exploratory Contract Test Ledger

## Purpose

This file tracks issue categories discovered by exploratory contract testing.

- Record by contract violation or root cause, not by raw instance count.
- Merge same-class findings into one row and expand scope in notes.
- Keep status current as tests are added, fixed, deferred, or rejected.

## Status

- `open`: reproduced by test, not fixed
- `fixed`: reproduced and fixed; regression test should stay green
- `deferred`: reproduced, but repair intentionally postponed
- `invalid`: candidate issue rejected after deeper verification

## Case List

| ID      | Title                                              | Test File                                                                   | Contract Source                                                                                             | Symptom                                                                      | Scope                                           | Status  | Fix / Note                                |
| ------- | -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- | ------- | ----------------------------------------- |
| ECT-001 | withRetry failureCount 在 soft-fail 路径少计       | `flux-action-core/src/__tests__/contract-retry-and-classification.test.ts`  | `RetryResult.failureCount` public API                                                                       | throw 路径 failureCount=3, soft-fail 路径同参数 failureCount=2               | `withRetry` 所有 shouldStop 返回 false 的调用者 | `open`  | 需确认 failureCount 语义后修复            |
| ECT-002 | validate() 重复调用 analyzeSchemaInput             | `flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H78, H86) | validate 应每个节点只产生 1 份诊断                                                                          | unknown-renderer-type 重复 2 次; schemaValidator 被调用 2 次                 | 所有使用 validate() 的消费者                    | `open`  | 需重构 validate pipeline                  |
| ECT-003 | compileNode() 对未知 renderer 抛出不可读 TypeError | `flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H83)      | 公共 API 应提供有意义的错误信息                                                                             | TypeError: Cannot read properties of undefined vs "Renderer not found"       | 直接使用 compileNode 的工具                     | `fixed` | 在 compileNode 中添加 registry.get() 检查 |
| ECT-004 | isolated scope get()/has() 仍穿透父链              | `flux-runtime/src/__tests__/scope-ownership-edge-cases.test.ts`             | `docs/architecture/scope-ownership-and-isolation.md`: "isolate: true → 当前 child scope 不再沿父链查找数据" | isolate=true 的 scope 调用 get('key') 仍返回父级数据; readVisible() 正确隔离 | 所有使用 isolate:true 的 scope 消费者           | `open`  | get()/has() 路径缺少 isolate 检查         |
| ECT-005 | generateCacheKey falsy data 碰撞                   | `flux-runtime/src/__tests__/async-data-contracts.test.ts` (C1)              | `generateCacheKey` 公共 API — 不同请求体应产生不同缓存键                                                    | data:0 / data:false / data:"" / data:null 与 data:undefined 产生相同缓存键   | 所有使用缓存且请求体可能为 falsy 值的 API 调用  | `fixed` | 将 truthy 检查改为 undefined 检查         |

## Per-Case Notes

### ECT-001. withRetry failureCount soft-fail undercount

- Test file: `packages/flux-action-core/src/__tests__/contract-retry-and-classification.test.ts`
- Related package: `flux-action-core`
- Stable contract source: `RetryResult<T>.failureCount` — public API field documented as counting failed attempts
- Reproduction summary: With `times=2`, 3 attempts all return `{ ok: false }` and `shouldStop` returns false. `failureCount` is 2 instead of 3. The throw path correctly counts 3.
- Expected behavior: `failureCount` should be consistent between throw and soft-fail paths.
- Actual behavior: throw path: 3; soft-fail path: 2.
- Root-cause hypothesis: `operation-control.ts:221-223` breaks without incrementing `failureCount` when `attempts > retryTimes` and `shouldStop` returns false.
- Duplicate key: `withRetry-failureCount-soft-fail-undercount`
- Status: `open`
- Fix status: Not yet fixed; simple one-line fix but needs product decision on intended semantics.
- Related files: `packages/flux-action-core/src/operation-control.ts`
- Notes: Test documents current behavior (passes). If fix is confirmed, change assertion from `toBe(2)` to `toBe(3)`.

### ECT-002. Compiler validate() double analyzeSchemaInput

- Test file: `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H78, H86)
- Related package: `flux-compiler`
- Stable contract source: `validate()` public API — should produce one diagnostic per issue; `renderer.schemaValidator` contract
- Reproduction summary: `validate()` calls `compileSchemaToTemplateNodes()` (which internally calls `analyzeSchemaInput` when diagnostics enabled) and then explicitly calls `analyzeSchemaInput()` again, causing:
  1. Each unknown-renderer-type produces 2 diagnostics with different path formats (`$[0]` vs `/0/type`)
  2. `renderer.schemaValidator` callback invoked twice per node
- Expected behavior: One diagnostic per issue; schemaValidator called once per node.
- Actual behavior: 2x duplication for both.
- Root-cause hypothesis: `validation-compiler.ts` validate() function's dual invocation of analyze.
- Duplicate key: `compiler-validate-double-analyze`
- Status: `open`
- Fix status: Not yet fixed; moderate complexity requiring understanding of full validation pipeline.
- Related files: `packages/flux-compiler/src/validation-compiler.ts`, `packages/flux-compiler/src/schema-compiler.ts`
- Notes: H78 and H86 share the same root cause. Fix should either remove redundant analyze call in validate() or make compile skip internal analysis when in validate mode.

### ECT-003. compileNode() opaque crash on unknown renderer

- Test file: `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H83)
- Related package: `flux-compiler`
- Stable contract source: Public API should provide meaningful error messages, consistent with `compile()` behavior.
- Reproduction summary: `compileNode({ type: 'unknown' }, { path: '$' })` crashes with `TypeError: Cannot read properties of undefined (reading 'defaultSchema')` instead of a descriptive error.
- Expected behavior: Throws "Renderer not found for type: unknown" (consistent with `compile()`).
- Actual behavior: Opaque TypeError.
- Root-cause hypothesis: `compileNode` missing `registry.get()` lookup before passing to internal compilation.
- Duplicate key: `compiler-compileNode-opaque-crash-unknown-type`
- Status: `fixed`
- Fix status: Added `registry.get()` check in `compileNode` at `schema-compiler.ts:217`, throwing descriptive error when renderer not found. Also added `applyWrapComponentPlugins` for consistency.
- Related files: `packages/flux-compiler/src/schema-compiler.ts`
- Notes: Simple fix. Test updated from generic `.toThrow()` to `.toThrow('Renderer not found for type: unknown')`.

### ECT-004. isolated scope get()/has() still resolves parent chain

- Test file: `packages/flux-runtime/src/__tests__/scope-ownership-edge-cases.test.ts`
- Related package: `flux-runtime`
- Stable contract source: `docs/architecture/scope-ownership-and-isolation.md` — "isolate: true → 当前 child scope 不再沿父链查找数据"
- Reproduction summary: With `isolate: true`, `readVisible()` correctly returns only own data, but `get('key')` and `has('key')` still resolve keys from parent scope. `resolveScopePath()` and `hasScopePath()` unconditionally traverse parent without checking isolation flag.
- Expected behavior: All scope read paths should respect `isolate` flag.
- Actual behavior: Only `readVisible()`/`materializeVisible()` respect isolation; `get()`/`has()` still see parent.
- Root-cause hypothesis: `scope.ts:290-338` `resolveScopePath`/`hasScopePath` don't check `scope.isolate` flag.
- Duplicate key: `scope-isolate-get-has-parent-leak`
- Status: `open`
- Fix status: Not yet fixed. Needs investigation of whether `get()`/`has()` are used by expression evaluation and whether fixing this would break existing behavior.
- Related files: `packages/flux-runtime/src/scope.ts`
- Notes: Test documents current behavior (passes as characterization). The fix requires understanding the full call graph of `get()`/`has()` to avoid breaking expression evaluation for non-isolated scopes.

### ECT-005. generateCacheKey falsy data collision

- Test file: `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts` (C1)
- Related package: `flux-runtime`
- Stable contract source: `generateCacheKey` public API — different request data should produce different cache keys.
- Reproduction summary: `generateCacheKey` used `api.data ?` (truthy check), causing `data:0`, `data:false`, `data:""`, `data:null` to produce the same cache key as `data:undefined`.
- Expected behavior: Each distinct data value (including falsy) should produce a unique cache key.
- Actual behavior: All falsy data values collide with undefined.
- Root-cause hypothesis: `api-cache.ts:172` used truthy check instead of undefined check.
- Duplicate key: `api-cache-key-falsy-collision`
- Status: `fixed`
- Fix status: Changed `api.data ?` to `api.data !== undefined ?` in `api-cache.ts:172`.
- Related files: `packages/flux-runtime/src/async-data/api-cache.ts`
- Notes: Regression tests updated to assert non-collision.

## Usage Rules

1. One row per issue category, not per test case instance.
2. If multiple tests prove the same root cause, keep one row and widen the scope field.
3. If a simple issue is fixed immediately, update the row to `fixed` and keep the regression test path.
4. If a complex issue is deferred, record why it is deferred and how the reproducer is preserved.
5. If a candidate issue turns out not to be real, keep a short note and mark it `invalid` instead of silently deleting history.
