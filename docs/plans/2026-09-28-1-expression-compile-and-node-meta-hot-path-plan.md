# 2026-09-28-1 表达式求值与节点解析热路径优化

> Plan Status: completed
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

本档选择：建议有测。核心回归路径由既有 42 包全量单测兜底；新增 focused 单测证明缓存命中/失效/容量上界与 meta 复用的行为等价性（Proof 项先于 Fix 项落地）。

## Execution Plan

### Phase 1 - 表达式编译缓存（flux-formula + runtime-eval-helpers）

Status: completed
Targets: `packages/flux-formula/src/compile/formula-compiler.ts`、`packages/flux-runtime/src/runtime-eval-helpers.ts`

- Item Types: `Proof | Fix`

- [x] Proof: focused 单测（flux-formula）：同一 source+options 两次 `compileExpression` 返回同一 compiled 实例（缓存命中）；不同 options 产生不同编译结果（指纹失效）；缓存容量达到上界后最旧条目被逐出；registry snapshot 变更后旧缓存不可见。实现注记：缓存键采用**原文 source**（非归一化 source），compiled.source 语义天然保持；静态折叠与动态求值跨命中结果一致有断言（`formula-compiler.test.ts` 7/7 绿）
- [x] Proof: focused 单测（flux-runtime）：`compileValue` 对同一字符串目标复用同一 compiled 实例（断言 expression-node 的 compiled 标识），求值结果跨命中一致（`runtime-eval-helpers-cache.test.ts` 2/2 绿）
- [x] Fix: `createFormulaCompiler.compileExpression/compileTemplate` 增加 (原文 source + options 对象标识 + registry epoch) 键的有界缓存（LRU 容量 1024，命中刷新、超限逐出最旧）；`ensureCompileOptions` 的 builtin symbol table 按 registry snapshot 标识经 WeakMap 复用
- [x] Fix: `runtime-eval-helpers.compileValue` 对字符串目标的缓存经 compiler 层缓存落地（helpers 字符串路径直达 `compileExpression`，命中后零编译；定向测试证实）
- [x] Fix: 热调用点回归核对——`table-body-row-rendering.tsx:192`/`table-row-leading-cells.tsx:72-73`/`keyboard.tsx:97` 均经 `helpers.evaluate`→`compileValue`→`compileExpression` 链路，全部命中 compiler 层缓存；flux-renderers-data 168 文件/1175 测试全绿（行为不变）

Exit Criteria:

- [x] 新增 focused 单测全绿，且覆盖命中/失效/容量/registry 变更四类路径
- [x] `pnpm --filter @nop-chaos/flux-formula test`（13 文件/221 用例）与 `pnpm --filter @nop-chaos/flux-runtime test`（134 文件/1454 用例+1 skipped）全绿
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（168 文件/1177 用例）

### Phase 2 - 节点 meta 单次求值（node-runtime）

Status: completed
Targets: `packages/flux-runtime/src/node-runtime.ts`

- Item Types: `Proof | Fix`

- [x] Proof: focused 单测（`node-meta-single-eval.test.ts` 3/3 绿）：className leaf exec 计数在 meta+props 同 pass 中为 1（修复前红：exec 2 次——红绿对照经 stash 修复文件实测）；投影值与 resolvedMeta 一致；独立调用（fresh state 无 resolvedMeta）回退现算正确
- [x] Fix: `resolveNodeProps`→`projectRendererFacingMeta` 优先复用同 pass 已写入的 `state.resolvedMeta`（className/frameClassName/testid 原样、disabled 带既有的 `?? false` 归一）；缺失时回退现算
- [x] Fix: 复用路径不改变 meta 值的引用稳定门（resolvedMeta shallowEqual 早退路径未动）

Exit Criteria:

- [x] 新增 focused 单测全绿（一致性、单次执行、回退三路径）
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 全绿（1451）；`pnpm --filter @nop-chaos/flux-react test` 全绿（全量验证阶段复核）

### Phase 3 - checkableWhen 复用持久 row scope

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`

- Item Types: `Fix`

- [x] Fix: `useTableSelection` 新增 `resolveRowScope` 选项（`UseTableSelectionOptions`），`checkableWhen` 优先对持久 row scope 求值（键 `row.cacheKey ?? row.rowKey` 与 cache 键一致）；未命中行回退既有 create/evaluate/dispose 路径。落地方式：`useRowDragSort`/`displayData`/`useTableRowScopeCache` 三个调用上移至 `useTableSelection` 之前（无 selection 依赖，行为不变），`resolveRowScopeRef` 迟绑定访问器保持 useCallback 稳定标识
- [x] focused 单测（`table-selection-checkable-scope-dispose.test.tsx` 4/4 绿）：resolver 命中时 create/dispose 次数为 0、未覆盖行走回退（create/dispose 配对如旧）、无 checkableWhen 零创建、原一次性配对语义保持

Exit Criteria:

- [x] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（1175）
- [x] scope 创建次数证据：resolver 命中场景 `created.length === 0` 断言（对照回退路径 `created.length === 1`）——持久命中路径零 store 创建/销毁

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；3 Minor 已吸收——测试计数 59→42 包；Phase 3 部分缓存覆盖实现注记已并入 checklist；归一化 source 键控的 compiled.source 语义断言已并入 Proof 项

## Closure Gates

- [x] 所有 in-scope confirmed live defects（P1/P2/P11 三项已证实的每渲染浪费）已修复
- [x] 行为/契约结果已达成：缓存命中语义（formula 7/7）+ meta 单次求值（红绿对照：修复前 exec 2 次红、修复后 1 次绿）+ checkableWhen 复用（4/4）均有 focused proof
- [x] 必要 focused verification 已完成（三 Phase 的 Exit Criteria 全勾；审计方独立复跑 flux-formula 221 / flux-runtime 1454+1 / flux-renderers-data 1177 / flux-react 56 文件 521 全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（interpreter 闭包提升与 parsePath 拷贝为 optimization candidate，显式裁定见 Deferred 节）
- [x] 受影响的 owner docs 已同步——No owner-doc update required：编译缓存为内部实现优化，未引入新的语义边界或对外契约；P1 规范（"Compile once, execute many"）本身即本次实现的依据
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict: approved）
- [x] `pnpm typecheck`（42 包全过，2026-09-28）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（全仓全绿；flux-formula 221、flux-runtime 1454+1 skipped、flux-renderers-data 1177 定向复核（审计方独立复跑确认））

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

Status Note: 三个 Phase 全部落地且经独立审计 approved：表达式编译缓存（LRU 1024、epoch 失效、symbol table 复用）使同源表达式零重编译；resolveNodeProps 复用 resolvedMeta 消除 meta 双重求值（红绿对照 execCount 2→1）；checkableWhen 复用持久 row scope（命中路径零 create/dispose）。42 包 typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28）
- Evidence: verdict approved——三机制 live 核对（缓存键/epoch 失效/回退路径/键位一致性全中）；focused 测试独立复跑全绿；红绿抽查自行复现（stash node-runtime.ts → execCount=2 红 → pop 复原绿）；disabled false-vs-undefined 影响面全仓 grep 无区分性消费者；flux-react 全套件 56 文件/521 用例审计方复跑绿。2 条 non-blocking 观察均已处置（测试计数已更正）。

Follow-up:

- <<见 Non-Blocking Follow-ups>>
