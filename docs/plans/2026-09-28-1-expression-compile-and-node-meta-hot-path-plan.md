# 2026-09-28-1 表达式求值与节点解析热路径优化

> Plan Status: draft
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（P1、P2、P11）
> Related: `docs/architecture/performance-design-requirements.md`（P1/P2 边界原则）、`docs/architecture/flux-core.md`

## Purpose

消除"同一表达式字符串在渲染热路径上被反复完整编译"与"同一 pass 内 meta 表达式被求值两次"这两类已证实的每渲染 CPU 浪费，使大规模表格（classNameExpr/checkableWhen/expandableWhen）与普通页面（每节点 meta）的每交互成本显著下降，且不改变任何求值语义。

## Current Baseline

- `packages/flux-runtime/src/runtime-eval-helpers.ts:20-25`：`compileValue` 仅对 object 目标走 WeakMap 缓存；字符串目标每次调用完整重编译。
- `packages/flux-formula/src/compile/formula-compiler.ts:21-53,75-95,101-141`：每次 `compileExpression` 重建整张 builtin symbol table（`ensureCompileOptions`）、新建 3 个 Set（`buildBindingContext`）、完整跑 rewrite→parse→bind→diagnostics→static-eval；全文件与 `packages/flux-formula/src` 无任何表达式缓存。
- 热调用点：`flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:192`（classNameExpr 每行每列每渲染）、`table-row-leading-cells.tsx:72-73`（expandableWhen）、`use-table-selection.ts:149-155`（checkableWhen，且每行新建并销毁一次性 row scope store）、`flux-renderers-basic/src/keyboard.tsx:97`。
- `packages/flux-runtime/src/node-runtime.ts:195-290`（`resolveNodeMeta`）与 `:358-397`（`resolveNodeProps`→`projectRendererFacingMeta`）：同一 `getNodeResolution` pass（`flux-react/src/node-renderer-resolved.tsx:97-100`）内 disabled/className/frameClassName/testid 四个 compiled leaf 被求值两次；`evaluate.ts:92-129` 的引用复用检查不省执行。
- 上述均为本仓库门禁脚本（`check:audit-performance-suspects` 已登记 33 hits）未覆盖的新发现；`pnpm check` 2026-09-28 基线 exit 0。

## Goals

- 同一 (source, compile-options) 的表达式编译结果进程内复用：热路径重复编译次数降为 0（首次后全命中缓存）。
- `getNodeResolution` 单 pass 内 meta leaf 只执行一次；独立调用 `resolveNodeProps` 的路径保持正确（回退现算）。
- `checkableWhen` 不再为每行创建/销毁一次性 scope store，改用表格持久 row scope cache。
- 全部既有单测/e2e 语义不变（求值结果、依赖收集、错误诊断行为一致）。

## Non-Goals

- 不改变表达式语言语义、诊断输出格式或公共导出面（各包 `src/index.ts` 不动）。
- 不做表达式引擎 interpreter 的闭包提升/compile-to-JS 类重构（记入 Deferred，profiling-first）。
- 不处理 `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md` P3-P15 中非本结果面的条目。

## Scope

### In Scope

- `packages/flux-formula/src/compile/formula-compiler.ts`（编译缓存 + options/symbol-table 复用）
- `packages/flux-runtime/src/runtime-eval-helpers.ts`（字符串目标缓存）
- `packages/flux-runtime/src/node-runtime.ts`（meta 结果复用）
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`（checkableWhen 复用 row scope）
- 上述各包 colocated 单测

### Out Of Scope

- `packages/flux-core/src/`（protected area，本计划不触碰）
- flux-react 订阅层、scope store 语义（Plan 6 结果面）
- 渲染器结构性改造

## Failure Paths

> 不适用：无错误处理/API 契约/鉴权/外部集成变更。缓存失效错误路径 = 未命中即现算（保守回退），无新失败面。

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：建议有测。核心回归路径由既有 59 包全量单测兜底；新增 focused 单测证明缓存命中/失效/容量上界与 meta 复用的行为等价性（Proof 项先于 Fix 项落地）。

## Execution Plan

### Phase 1 - 表达式编译缓存（flux-formula + runtime-eval-helpers）

Status: planned
Targets: `packages/flux-formula/src/compile/formula-compiler.ts`、`packages/flux-runtime/src/runtime-eval-helpers.ts`

- Item Types: `Proof | Fix`

- [ ] Proof: focused 单测（flux-formula）：同一 source+options 两次 `compileExpression` 返回同一 compiled 实例（缓存命中）；不同 options 产生不同编译结果（指纹失效）；缓存容量达到上界后最旧条目被逐出；registry snapshot 变更后旧缓存不可见
- [ ] Proof: focused 单测（flux-runtime）：`compileValue` 对同一字符串目标第二次调用不再重编译（以 compile 侧 spy 或实例标识断言），求值结果与首次一致
- [ ] Fix: `createFormulaCompiler.compileExpression/compileTemplate` 增加 (normalized source + options 指纹) 键的有界缓存（LRU，容量 ≥ 512）；`ensureCompileOptions` 的 builtin symbol table 按 registry snapshot 标识复用
- [ ] Fix: `runtime-eval-helpers.compileValue` 对字符串目标接入同一有界缓存策略
- [ ] Fix: 热调用点回归核对——`table-body-row-rendering.tsx`/`table-row-leading-cells.tsx`/`keyboard.tsx` 无需改动即受益（compile 次数证据写入 Phase Exit 记录）

Exit Criteria:

- [ ] 新增 focused 单测全绿，且覆盖命中/失效/容量/registry 变更四类路径
- [ ] `pnpm --filter @nop-chaos/flux-formula test` 与 `pnpm --filter @nop-chaos/flux-runtime test` 全绿
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（表格热路径行为不变）

### Phase 2 - 节点 meta 单次求值（node-runtime）

Status: planned
Targets: `packages/flux-runtime/src/node-runtime.ts`

- Item Types: `Proof | Fix`

- [ ] Proof: focused 单测：同一 `getNodeResolution` pass 内，`resolveNodeProps` 投影出的 disabled/className/frameClassName/testid 与 `resolveNodeMeta` 结果一致；meta leaf compiled exec 在该 pass 内只执行一次（以注入计数或 spy 证明）；`resolveNodeProps` 在 `state.resolvedMeta` 缺失的独立调用下回退现算且结果正确
- [ ] Fix: `resolveNodeProps`→`projectRendererFacingMeta` 优先复用同 pass 已写入的 `state.resolvedMeta`；缺失时回退现算
- [ ] Fix: 复用路径不改变 meta 值的引用稳定门（resolvedMeta shallowEqual 语义保持）

Exit Criteria:

- [ ] 新增 focused 单测全绿（一致性、单次执行、回退三路径）
- [ ] `pnpm --filter @nop-chaos/flux-runtime test`、`pnpm --filter @nop-chaos/flux-react test` 全绿

### Phase 3 - checkableWhen 复用持久 row scope

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`

- Item Types: `Fix`

- [ ] Fix: `checkableWhen` 求值改用 `useTableRowScopeCache` 的持久 row scope（按 cacheKey 取用），不再每行 createScope/disposeScope；无缓存行的场景保留一次性 scope 回退
- [ ] focused 单测：勾选行判定（checkableWhen）行为与既有语义一致（含行数据变更后的重判定）

Exit Criteria:

- [ ] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] scope 创建次数证据（测试或日志计数）显示数据变更路径不再逐行创建/销毁

## Draft Review Record

- Reviewer / Agent: <<待独立子 agent 填写>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数>>
- Findings addressed: <<Blocker/Major 处理记录>>

## Closure Gates

- [ ] 所有 in-scope confirmed live defects（P1/P2/P11 三项已证实的每渲染浪费）已修复
- [ ] 行为/契约结果已达成：缓存命中语义 + meta 单次求值 + checkableWhen 复用均有 focused proof
- [ ] 必要 focused verification 已完成（三 Phase 的 Exit Criteria 全勾）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（若表达式缓存引入新语义边界，更新 `docs/architecture/performance-design-requirements.md` Recommended Patterns；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 表达式引擎 interpreter 闭包提升 / compile-to-JS

- Classification: `optimization candidate`
- Why Not Blocking Closure: 属大范围引擎重构，收益需 profiling 确认；Phase 1 缓存落地后同源表达式重编译已消除，剩余每次 exec 的闭包分配影响量级待测。
- Successor Required: `no`
- Successor Path: 后续 profiling 驱动的独立分析/plan

### parsePath 缓存命中拷贝（`flux-core/src/utils/path.ts`）

- Classification: `optimization candidate`
- Why Not Blocking Closure: flux-core 为 protected area（plan-first），且单项收益低；与 flux-core 相关改动应整体评估。
- Successor Required: `no`
- Successor Path: 后续 flux-core 专项 plan

## Non-Blocking Follow-ups

- `keyboard.tsx:97` 等基础渲染器热点的 compile 行为在 Phase 1 后用实测数据（PerformanceObserver 计时）复核一次收益，记录到 daily log。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
