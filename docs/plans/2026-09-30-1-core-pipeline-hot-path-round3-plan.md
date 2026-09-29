# 01 核心管线热路径批量优化（round-3）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-perf-ux-round3-deep-optimization-analysis.md`（R3-P1 ~ R3-P10）
> Related: `docs/plans/2026-09-28-1-expression-compile-and-node-meta-hot-path-plan.md`（第一轮）、`docs/plans/2026-09-29-3-form-family-hot-path-plan.md`（第二轮）

## Purpose

把第三轮审计在 flux-runtime / flux-react / flux-compiler / flux-core 发现的 10 条核心管线热路径问题收口：owned form store 快照身份、弹层验证计划重复编译、验证提交期的全量扫描与逐规则克隆、SchemaRenderer 根编译依赖击穿，以及四个低量级分配/死代码热点。全部为纯性能修复，零产品行为变更。

## Current Baseline

- `pnpm typecheck` / `build` / `lint` / `check` 于 2026-09-30 HEAD 160c22133 全部 exit 0；styling-suspects 221 = 基线零漂移。
- 前两轮已收口表达式编译缓存、`use-node-source-props` DFS、date-utils 缓存、`getCompiledValidationField` memo、form-store setValue spine diff（P19）；本 plan 的 10 条均为其未覆盖面。
- `form-store-owned.ts` 的 `getOwnedState()`（:231-247）每次返回新字面量——live 代码经执行者核实。
- `action-adapter.ts` 的 `resolveSurfaceValidationPlan`（:85-118）在 openDialog/openDrawer 每次调用重编译——live 核实。
- `form-runtime-owner.ts:346` 的 `Object.entries(currentFieldStates)` 全量分配、`form-runtime-validation.ts:126-136` 的 per-rule 全记录克隆——live 核实。
- `schema-renderer.tsx:80-87` 编译 memo deps 含 `props.env`——live 核实。
- flux-react / flux-runtime / flux-compiler / flux-core 现有单测全绿（round-2 收口基线）。

## Goals

- owned store 在输入不变时返回稳定 state 引用，字段 selector 快照快路径恢复短路。
- openDialog/openDrawer 的验证计划按 body schema 身份缓存，重复打开不再重编译。
- validateForm 副作用错误捕获与 async-rules 字段验证不再做 per-path/per-rule 全量克隆与 O(N×F) 重扫。
- SchemaRenderer 根编译不再因宿主内联 env 对象而整页重编译。
- 4 条低量级热点（presentation selector 双扫、O(K²) 死代码、hidden 翻转批合并、`hasCompiledValidationNodes`、BFS shift）消除。

## Non-Goals

- 不改任何验证语义、错误显示行为、表单公开 API 签名。
- 不处理表达式 interpreter 闭包提升与 structural wildcard 收窄（维持 profiling-first deferred）。
- 不做 designer/renderer 族优化（各自 owner plan 承接）。

## Scope

### In Scope

- `packages/flux-runtime/src/form-store-owned.ts`、`form-runtime-owner.ts`、`form-runtime-validation.ts`、`form-runtime-field-ops.ts`、`form-runtime-subtree.ts`、`action-adapter.ts`
- `packages/flux-react/src/schema-renderer.tsx`、`form-state.ts`
- `packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts`
- `packages/flux-core/src/validation-model.ts`
- 各改动点的 focused 单测（Vitest，colocated）

### Out Of Scope

- `form-store.ts` 的 setValues/batchUpdate 全量深 diff（文档化取舍，维持）
- 渲染层组件 memo 化（renderer 族 plan 承接）

## Failure Paths

不适用（纯性能重构，无错误处理/API 契约变更；行为等价性由既有测试 + 新增 focused 测试保证）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（表单验证语义等价性属核心回归路径；每个 Phase 的 Proof（等价性 focused 测试）先于或伴随 Fix 落地，缓存正确性必须有 focused 单测证明：owned store 输入不变返回同引用 / 输入变返回新引用且内容正确；弹层计划缓存按 schema 身份命中与失效；async-rules 字段错误仍逐条上报）。

## Execution Plan

### Phase 1 - owned store 快照身份与 selector 分配

Status: completed
Targets: `packages/flux-runtime/src/form-store-owned.ts`、`packages/flux-react/src/form-state.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P1)：`getOwnedState()` 按 `(values, baseFieldStates, submitting, submitAttempted)` 输入身份缓存组合结果；输入不变返回同一对象引用
- [x] Fix (R3-P6)：`selectCurrentFormFieldPresentation` 一次取出 errors 数组，两查询共享并短路匹配；`query ?? { path }` 分配消除或 memo 化
- [x] Proof：focused 单测——owned store 输入不变 → `getState()` 引用相等；任一输入变更 → 新引用且 decoded 内容正确；嵌套表单（child ownerId）decode 缓存行为不回退
- [x] Proof：focused 单测——presentation selector 对 error/warning/hidden 组合返回与原实现一致（等价性测试，可先 snapshot 原行为再改）

Exit Criteria:

- [x] `form-store-owned.ts` 存在输入身份缓存且单测证明引用稳定性
- [x] `form-state.ts` presentation selector 单遍扫描落地且等价性测试通过
- [x] flux-runtime + flux-react focused 测试全绿

### Phase 2 - 验证提交期批量收敛

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-owner.ts`、`form-runtime-validation.ts`、`form-runtime-field-ops.ts`、`form-runtime-subtree.ts`、`packages/flux-core/src/validation-model.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P3)：`captureSideEffectErrors` 记录上次扫描 fieldStates 引用，未变跳过；消除全量 `Object.entries` 分配（只迭代 keys + validatedPaths 短路）
- [x] Fix (R3-P4)：含 async 规则字段的 sync 规则循环内只更新 errors 草稿，run 结束一次性 commit（一次克隆、一次 batchUpdate）
- [x] Fix (R3-P8)：同帧多次 hidden 翻转在 owner 层微任务批合并为一次克隆/commit；`clearValueWhenHidden` 级联路径保持语义；unmount cleanup 交错场景（hide 后同帧 unmount 触发 cleanup `notifyFieldHidden(fieldName, false)`，`node-renderer-resolved.tsx:421-423`）语义保持
- [x] Fix (R3-P9)：`collectSubtreeValidationTargets` BFS `queue.shift()` 改头索引出队（返回数组即队列，addTarget 单点入队保证 dependent 恰出现一次）；`collectSubtreePaths` 双全量扫描消除移入 Deferred（见 Deferred But Adjudicated）
- [x] Fix (R3-P10)：`hasCompiledValidationNodes` 改 `for...in` 首键即返回
- [x] Proof：focused 单测——side-effect 错误仍在上报路径准确出现（等价性）；async 规则字段最终错误态与逐规则 commit 语义一致；hidden 批合并后 fieldStates 终态与逐字段翻转一致（含 hide→unmount 同帧交错用例）；子树验证目标集合与原实现一致（closure audit 补：BFS dependent 恰出现一次的去重断言，`form-runtime-subtree.test.ts` returns BFS-discovered dependents exactly once）

Exit Criteria:

- [x] 5 项 Fix 落地，对应 focused 单测全绿
- [x] flux-runtime focused 验证类测试（validation/subtree/field-ops 相关）无回归

### Phase 3 - 编译入口缓存与依赖修正

Status: completed
Targets: `packages/flux-runtime/src/action-adapter.ts`、`packages/flux-react/src/schema-renderer.tsx`、`packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P2)：`resolveSurfaceValidationPlan` 按 body schema 身份 memoize 成功计划（WeakMap；失败结果不缓存、每次重试，避免一次性失败被钉死；schema 身份变化以既有契约测试为准裁定键策略）
- [x] Fix (R3-P5)：`SchemaRenderer` 编译 memo deps 由 `props.env` **收窄为 `props.env?.importLoader` 与 `props.env?.resolveImportUrl` 两个函数身份**（失效策略裁定：env 对象其余字段如 notify 不再参与失效，宿主内联 env 对象但 import 函数稳定引用时不重编译；import 函数身份真实变化——含 undefined→函数的迟到注入——仍触发重算，故"迟到注入后编译结果可用"天然成立；memo 内直接读取 props 上的这两个函数）。`runtime.setEnv` 的运行时 env 同步语义不变。落地注：lint `react-hooks/refs` 禁止渲染期读写 ref，最终实现为 memo 返回 `{template, error}` 结果对象 + 失败上报移入 effect（每次失败编译上报一次，语义与原实现等价且更准），closure audit 批准后仅做了这一处 lint 合规重构，env-deps 两用例复测绿
- [x] Fix (R3-P7)：`compileRuntimeValueTree` 死代码 O(K²) key 检查对齐 Set 版或删除死子句（与 evaluate.ts 先例一致）
- [x] Proof：focused 单测——同一 body schema 两次 openDialog 只编译一次（计数桩）；schema 内容变化后重新编译且新计划生效；env 迟到注入（importLoader undefined→函数）后 deps 收窄键变化、编译结果可用
- [x] Proof：focused 单测——宿主 env 对象引用变化但 importLoader/resolveImportUrl 身份不变时不再触发根编译重跑（compile 调用计数）；import 函数身份变化仍重编译；runtime.setEnv 后 importLoader 变更仍生效

Exit Criteria:

- [x] 3 项 Fix 落地，对应 focused 单测全绿
- [x] flux-runtime action/弹层契约测试与 flux-react 渲染测试无回归

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_e8867d4e r1 / agent_d2650012 r2）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: r1 Major——R3-P5 env 失效策略未定（Fix 与 Proof 矛盾）→ 已写死 deps 收窄为 importLoader/resolveImportUrl 函数身份策略；r2 Minor——catch 路径 props.env 的 exhaustive-deps 处置说明已补入 Fix 条目。

## Closure Gates

- [x] 所有 in-scope confirmed live 性能缺陷已修复（R3-P1 ~ P10 逐条核对）
- [x] 不适用 contract drift（本 plan 无公开契约变更；如执行中发现契约测试需更新，须逐条列出并裁定）
- [x] 行为等价性已达成（全部等价性 focused 测试通过）
- [x] 必要 focused verification 已完成（3 个 Phase 的 Proof 项全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] owner docs 已同步：`docs/architecture/form-validation.md` 的 `notifyFieldHidden(path, hidden)` 发布时序描述已按微任务批合并后的提交语义更新（live :177 现记载逐字段发布语义，本 plan 改变该文档化行为）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### collectSubtreePaths 双全量扫描消除（R3-P9 前半）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 该扫描是"找出子树成员"语义的固有双源遍历（validation traversal order + runtime registrations 两独立来源）；消除它需按 (validation 引用 + registrations 代次) 组合键缓存前缀索引，缓存失效面跨越两个独立可变源，正确性风险与收益不成比例（LOW 量级、仅 submit/hidden 级触发非每键入）。closure audit 裁定此半条由"整条勾选"修正为显式 deferred，BFS 头索引半条已落地。
- Successor Required: `no`
- Successor Path: 后续轮次如有 profiling 证据可再开优化项

## Non-Blocking Follow-ups

- flux-formula 表达式 interpreter 闭包提升——维持 profiling-first（无 profile 证据），见分析报告第四节
- structural wildcard 收窄——需编译期静态依赖收集新能力，见分析报告第四节

## Closure

Status Note: 10 条 in-scope 性能修复全部落地（9 条完整 + R3-P9 的 BFS 半条，前半条经 closure audit 裁定显式 deferred）；行为等价性由 15 个新 focused 用例 + 全部既有测试证明；全仓 typecheck/build/lint/test 于收口树实测绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_5fbcfe6c，两轮）
- Evidence: 首轮 verdict `issues`（Major×2：BFS 重复返回真实回归 + R3-P9 勾选不实；Minor×3）；修复后复核 verdict `approved`——10 条 Fix 逐条 live 核对（file:line 在案）、focused 测试 59/59 实跑绿、flux-runtime 全套 1485 passed 实测、owner-doc 与 live 行为一致、Deferred 分类诚实。详见 `docs/logs/2026/09-30.md` Plan 1 段。

Follow-up:

- collectSubtreePaths 双全量扫描消除（Deferred，optimization candidate，见 Deferred But Adjudicated 节）
- flux-formula 表达式 interpreter 闭包提升（profiling-first，继承自 round-2 deferred）
