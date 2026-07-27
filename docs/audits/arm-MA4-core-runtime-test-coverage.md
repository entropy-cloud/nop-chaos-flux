# MA4.1 — Core + Runtime 测试覆盖审计报告

> Plan: `docs/plans/2026-07-27-1200-1-ma41-core-runtime-test-coverage-audit.md`
> Status: completed
> Date: 2026-07-27
> Scope: core-cluster (flux-core, flux-formula, flux-compiler, flux-action-core, 204 files) + runtime-cluster (flux-runtime, flux-react, flux-bundle, 165 files)
> Method: Per `unit-test-logic-and-contract-coverage-audit-prompt.md` — 3 轮子 agent 审计

## 执行摘要

对 89 个稳定契约（C1-C18, F1-F10, P1-P12, A1-A9, R1-R24, X1-X17, B1-B3, L1-L7）逐一映射到现有测试。总体评估：**核心层测试质量高，但跨层断层和部分契约缺口显著**。

## 主要发现

### P1 — 跨层验证管道断层

| ID      | 描述                                                                                                                                               | 位置                                 | 建议                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| MA4-F01 | Validation compile→runtime 测试绕过：`runtime-validation.test.ts` 手动构造 `CompiledFormValidationModel`，不经过编译 lowering 管道                 | flux-runtime test files              | 添加集成测试：compile 含验证规则的 form schema → 创建 form runtime → set bad values → submit → assert errors |
| MA4-F02 | Validation 错误从未通过 React UI 测试：runtime 层测 `form.getError()`，React 层测 `useFieldError` hook，但无测试验证错误通过 FieldFrame 渲染到 DOM | flux-react                           | 添加测试：render form with required field → submit → assert error message in DOM                             |
| MA4-F03 | Derived snapshot identity 无系统测试：只有 spreadsheet bridge 在 bug 32 中修过，其他 `getSnapshot()` 实现无 React 19 stable-identity 验证          | flux-runtime/scope, flux-react/hooks | 添加 contract 测试验证所有 store subscription 的 `getSnapshot` 返回值 identity 稳定性                        |
| MA4-F04 | Data source poll timer dispose-race：`schedulePoll` 的 setTimeout callback 在 stop() 后可能仍会执行，与 bug 28 同类但未修                          | api-data-source-controller.ts:61     | 添加 `if (mutable.stopped) return;` 在 timer callback 入口                                                   |
| MA4-F05 | Action error 通知链静默失败：`hasDiagnosticChannel && caughtFailureResults.has(result)` 在提供 `onActionError` 的主机上跳过 `notify('error')`      | action-execution.ts:211-214          | 移除该 skip，或仅当 `onActionError` 返回 `{ handled: true }` 时跳过                                          |

### P1 — 公开 API 契约缺口

| ID      | 描述                                                                                                                 | 位置                    | 建议                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| MA4-F06 | flux-react hooks 测试不全：9 个 hooks 中 `useRenderScope`/`useCurrentPage`/`useCurrentNodeMeta` 无测试               | hook-contracts.test.tsx | 补充 3 个 hooks 的独立测试                                                           |
| MA4-F07 | 3/4 种 ComponentHandle 工厂无专项测试：仅 `input-component-handle` 有测试                                            | flux-runtime            | 补充 `form`/`surface`/`composite-field` handle 测试                                  |
| MA4-F08 | 编译→runtime→react→renderer 跨层贯通测试全部缺失（L1-L7）                                                            | 全部 7 层               | 每层边界添加 1-2 个贯通测试，优先 L1 (compile→runtime)和 L7 (validation error→UI)    |
| MA4-F09 | Data-source/reaction 声明式 lowering 无贯通测试：所有 runtime 测试手动调 `registerDataSource()`/`registerReaction()` | flux-runtime tests      | 添加通过 `runtime.compile()` → schema auto-lowering → runtime consumption 的贯通测试 |

### P2 — 高价值发现（摘录）

| ID      | 描述                                                                                                                                   | 位置                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| MA4-F10 | `validateForm()` 缺少并发守卫，与 submit 的 guards 不对称                                                                              | form-runtime.ts                                  |
| MA4-F11 | `setLastChange` 未审计到所有 mutation 路径（`applyExternalErrors`、array ops）                                                         | form-runtime-owner.ts, form-runtime-array-ops.ts |
| MA4-F12 | 编译→runtime dead-field 检测无机制：`structuralWhen` 修后无系统性字段消费审计                                                          | TemplateNode                                     |
| MA4-F13 | 4 个空 catch 块无测试：`container-hooks.ts:87`, `request-runtime.ts:241`, `blob-download.ts:18,87`, `api-data-source-controller.ts:36` | flux-react, flux-runtime                         |
| MA4-F14 | Data source poll timer 在 stop/finally 边界可能重入                                                                                    | api-data-source-controller.ts                    |
| MA4-F15 | Disposal 顺序无专项测试：action dispatcher → forms → import frames                                                                     | runtime-factory.ts                               |
| MA4-F16 | SurfaceRuntime 6 方法仅 2 个可测（open/close），其余无测试                                                                             | flux-runtime                                     |
| MA4-F17 | `shouldFailOnSchemaDiagnostics` 无测试                                                                                                 | flux-core strict-mode.ts                         |
| MA4-F18 | `bindAst` AST 绑定功能无独立测试                                                                                                       | flux-formula bind-ast.ts                         |
| MA4-F19 | `createNormalizedActionEvent` 事件规范化函数无测试                                                                                     | flux-react                                       |
| MA4-F20 | `onMount`/`onUnmount` lifecycle actions 无专项验证                                                                                     | flux-react                                       |
| MA4-F21 | flux-bundle（Host Facade）测试覆盖率仅 ~30%                                                                                            | flux-bundle                                      |
| MA4-F22 | `closeSurface` 默认关闭当前 surface 行为无测试                                                                                         | flux-runtime                                     |
| MA4-F23 | React hooks handle 工厂（useInputComponentHandle 等）无测试                                                                            | flux-react                                       |

## 当前测试 strongest / weakest 面

### 覆盖最强

- flux-formula 表达式编译/执行/注册 — 大量贯通测试 + 边界场景
- flux-runtime form runtime（submit/validation/field ops/array ops）— 20+ 测试文件
- flux-action-core 控制流（retry/timeout/cancel/branches）— 多文件覆盖
- flux-core path/utils/registry/validation-model — 单元测试密度高
- flux-compiler shape-validation — 5 个专用文件

### 覆盖最弱

- **跨层贯通测试**（L1-L7）：全部分段覆盖，无完整 compile→runtime→react→renderer 贯通
- **负面/异常测试**：大多数契约缺少空值、错误类型、竞态、销毁后行为测试
- **flux-react hooks**：9 hooks 中 4 个无直接测试
- **flux-bundle**：~30% 估计覆盖率
- **ComponentHandle 工厂**：4 种中仅 1 种有测试

## test-global-leaks 检查结果

执行 `check:audit-test-global-leaks`（全仓 47 个疑似点）：

- core+runtime 包簇共 **4 个疑似点**，全部审查：
  - `flux-react/event-prevention.test.tsx:11-12` — `capturedNativeEvent`/`parentClickCount` 在 `beforeEach` 中重置，**无泄漏**
  - `flux-react/schema-renderer-runtime-scope.test.tsx:165,203` — `queueMicrotask` 全局 patch 在 `try/finally` 中清理，**无泄漏**

**结论**：core+runtime 包簇无确认的 test-global-leak。

## 去重基线

本报告与以下历史审计不重叠：

- MA1/MA2/MA3 arm-index findings（结构/运行时/代码质量）
- scheduling/AI 包专项审计
- 2026-05/06 deep-audit-full test-coverage 报告（oversized files、E2E name-to-behavior、global-leaks 审查）

## Recommended Next Tests（最高 ROI，按优先级排序）

| 优先级 | 建议                                                                               | 适合层级                 | 关联发现      |
| ------ | ---------------------------------------------------------------------------------- | ------------------------ | ------------- |
| 1      | compile form with validation rules → create form runtime → submit → assert errors  | integration              | MA4-F01, R3-1 |
| 2      | render form with required field → submit → assert error in DOM                     | integration (flux-react) | MA4-F02, R3-2 |
| 3      | verify `getSnapshot` identity stability for all scope store subscriptions          | contract test            | MA4-F03, R2-3 |
| 4      | page→form→fragment scope chain through real schema render → verify values resolve  | integration              | L3, R3-5      |
| 5      | button with schema `onClick: {action: 'setValue'}` → click → verify scope mutation | integration              | L4, R3-4      |
| 6      | compile schema with data-source → verify `compiledSources` on TemplateNode         | integration              | MA4-F09, R3-3 |
| 7      | compile schema with reaction → verify `compiledReactions` + runtime consumption    | integration              | MA4-F09, R3-6 |
| 8      | add facade-level tests for form validation and action dispatch through flux-bundle | integration              | MA4-F21, R3-8 |
