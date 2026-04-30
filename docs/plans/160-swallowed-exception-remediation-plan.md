# 160 Swallowed Exception Remediation

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: 异常吞掉审计发现 8 个代码位置存在 Promise 链中异常被静默丢弃的缺陷
> Related: `docs/skills/deep-audit-prompts.md` 维度06（已增强异常吞掉检查）

## Purpose

修复 8 个代码位置的 Promise 链中异常被静默丢弃的缺陷，确保所有异步操作的错误都能被诊断。

## Current Baseline

通过逐文件审查全部 42 个 catch 块和 .catch() 调用，确认以下 8 个代码位置存在异常吞掉：

| # | 位置 | 严重度 | 问题 |
|---|------|--------|------|
| 1 | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:164` | 高 | `void Promise.resolve().then(() => publish())` 无 `.catch()`，`publish()` 失败后数据源永久卡在 `fetching` |
| 2 | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:191` | 高 | `void committedValue.then(...).finally(...)` 无 `.catch()`，transformOut 失败后表单值静默丢失 |
| 3 | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:140` | 中 | `void nextValue.then(...)` 无 `.catch()`，transformIn 失败后字段显示陈旧数据 |
| 4 | `packages/flux-renderers-form/src/field-utils.tsx:245` | 中 | `void result.then(...)` 无 `.catch()`，adapter.in() 失败后字段值不更新 |
| 4b | `packages/flux-renderers-form/src/field-utils.tsx:111,123,134` | 中 | L111/L123: `void (async () => { await setValue(nextValue) })()` 无 `.catch()`；L134: `void setValue(nextValue)` 直接丢弃 promise。adapter.out() 失败后用户输入静默丢失（Bug #4 的写入路径对称缺陷） |
| 5 | `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:76` | 低 | `.then(...).finally(...)` 无 `.catch()`，ELK 布局失败后 spinner 清除但无错误提示 |
| 6a | `packages/word-editor-renderers/src/editor-canvas.tsx:118` | 低 | `wordCountPromise.then(...)` 无 `.catch()`，字数统计获取失败无处理 |
| 6b | `packages/word-editor-renderers/src/preview/doc-preview-page.tsx:47` | 低 | 同上 |

其余 35 个 catch 块和 5 个 .catch() 调用均已正确处理异常（rethrow / 日志 / monitor 上报 / 状态捕获），无需修改。

## Goals

- 8 个代码位置的异常吞掉全部修复，每个异步操作失败时至少有 dev 日志或状态更新
- `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- 独立子 agent 闭包审查通过

## Non-Goals

- 不修改其余 35 个已正确处理的 catch 块
- 不改变任何正常路径的行为
- 不引入新的 monitor/reporting 基础设施（使用现有 console.warn 或已有状态更新机制）

## Risks

- **stale-request guard 兼容性**：Bug #2/3/4/5 的修复中新增的 `.catch()` 必须尊重已有的 AbortController/sequence 守卫，避免对已取消请求的过时错误做日志或状态更新。
- **Bug #1 状态转换精确性**：`.catch()` 必须调用 `updateState()` 设置 `fetchStatus: 'idle'`、`error`、`failureReason`，才能解除 `fetching` 卡死。

## Execution Plan

### Phase 1 - 修复高严重度缺陷

Status: completed
Targets: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`

- [ ] `formula-data-source-controller.ts:164` — 为 `void Promise.resolve().then(() => publish())` 添加 `.catch()`，catch handler 调用 `updateState()` 设置 `fetchStatus: 'idle'`、`error`、`failureReason`
- [ ] `object-field.tsx:191` — 为 `void committedValue.then(...).finally(...)` 在 `.finally()` 前添加 `.catch()`，catch handler 检查 `isTransformOutSequenceCurrent()` 后 dev 模式 console.warn
- [ ] 评估并添加回归测试：Bug #1（数据源卡死）和 Bug #2（表单值丢失）根因非显式，需验证错误状态转换是否正确工作；如现有测试已覆盖则记录结论
- [ ] `pnpm typecheck && pnpm build` 通过

Exit Criteria:

- [ ] `formula-data-source-controller.ts` 中 `publish()` 失败后 `updateState()` 被调用，`fetchStatus` 转为 `'idle'`，`error` 和 `failureReason` 被设置
- [ ] `object-field.tsx` 中 transformOut 失败后 dev 模式有 `[object-field] transformOut failed` console.warn
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - 修复中严重度缺陷

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`

- [ ] `object-field.tsx:140` — 为 `void nextValue.then(...)` 添加 `.catch()`，catch handler 检查 `ac.signal.aborted` 后 dev 模式 console.warn，保留 rawValue 作为 fallback
- [ ] `field-utils.tsx:245` — 为 `void result.then(...)` 添加 `.catch()`，catch handler 检查 `ac.signal.aborted` 后 dev 模式 console.warn
- [ ] `field-utils.tsx:111,123` — 为 `void (async () => { ... })()` 的 async IIFE 添加 `.catch()`，dev 模式 console.warn adapter.out() 失败
- [ ] `field-utils.tsx:134` — 为 `void setValue(nextValue)` 改为 `void setValue(nextValue).catch(...)` 或等价方式，dev 模式 console.warn adapter.out() 失败
- [ ] `pnpm typecheck && pnpm build` 通过

Exit Criteria:

- [ ] 三处中严重度缺陷均有 `[object-field]` 或 `[field-utils]` 前缀的 dev console.warn 输出
- [ ] 所有新增 `.catch()` 均检查 abort/stale-request 守卫后才做日志
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - 修复低严重度缺陷

Status: planned
Targets: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`, `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/word-editor-renderers/src/preview/doc-preview-page.tsx`

- [ ] `use-designer-auto-layout.ts:76` — 在 `.finally()` 前添加 `.catch()`，dev 模式 console.warn `[flow-designer] Auto-layout failed`
- [ ] `editor-canvas.tsx:118` — 添加 `.catch(() => {})` 静默忽略（字数统计为非关键装饰性功能）
- [ ] `doc-preview-page.tsx:47` — 同上
- [ ] `pnpm typecheck && pnpm build` 通过

Exit Criteria:

- [ ] 三处低严重度缺陷不再产生 unhandled rejection
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - 闭包审计

Status: planned
Targets: 本计划

- [ ] 独立子 agent 执行闭包审计：重新读取所有修改过的文件，确认 8 个代码位置的缺陷全部修复，无遗漏，grep 验证无新增无 `.catch()` 的 fire-and-forget 模式

Exit Criteria:

- [ ] 独立子 agent 审查确认所有 8 个代码位置的缺陷已修复，无遗漏
- [ ] grep 验证 `void.*\.then\(` 无 `.catch()` 模式结果为零

## Validation Checklist

- [ ] 全部 8 个代码位置的异常吞掉已修复（grep 验证无新增 `void ...then(...)` 无 `.catch()` 模式）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `docs/logs/` 对应日期条目已更新

## Closure

Status Note: All 8 bug locations (10 fix sites) fixed. Independent closure audit (sub agent ses_22190a4dbffe9u4XYr6CQ5Rdj5) confirmed all fixes correct, guards respected, no new swallowed exceptions introduced, broader grep found zero remaining unfixed patterns.

Closure Audit Evidence:

- Reviewer / Agent: independent sub agent (ses_22190a4dbffe9u4XYr6CQ5Rdj5)
- Evidence: Per-bug verification table — all 8 locations confirmed fixed with correct catch handlers; grep for `void.*\.then\(` found zero unfixed production patterns; `pnpm typecheck && pnpm build` passed; lint on modified files passed; `pnpm test` passed.

Follow-up:

- no remaining plan-owned work
