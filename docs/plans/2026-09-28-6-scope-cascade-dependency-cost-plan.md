# 2026-09-28-6 作用域级联与依赖过滤 JS 成本优化

> Plan Status: completed
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（P12、P13、P14）
> Related: `docs/architecture/performance-design-requirements.md`（P1-P3 边界原则）、`docs/architecture/flux-core.md`

## Purpose

降低作用域链与节点依赖管线在每交互 tick 上的 JS 成本（allocation 与无效唤醒），不改变任何订阅语义与渲染行为：组合 scope store 的变更路径过滤下沉、动态 structural 字段的 wildcard 依赖收窄、以及一批已证实的contained 分配热点（ad-hoc schema 编译缓存、per-subscriber 索引重建、source-props 全树 DFS、loop 一次性 scope、parsePath 拷贝、死代码清理）。

## Current Baseline

- **P12 组合 scope 无条件级联**：`packages/flux-runtime/src/scope.ts:266-299`——子 store 订阅父 store，任何父变更先 `readVisible()`（`:177-199`，`Object.assign(safeCreate(parentVisible), ownSnapshot)` 新原型链视图 + sanitizeSnapshot 键遍历）再做过滤；父可见视图标识必变 → `nextVisible === lastVisibleForParent` 守卫永不命中 → 子监听器每次都触发。依赖过滤只在 React 层（`flux-react/src/hook-subscriptions.ts:214-232`）一层生效，无 `paths` 的订阅者每次祖先变更重跑 selector。表格 row scope（`isolate: true`，`use-table-row-scope-cache.ts:219`）豁免。
- **P13 wildcard 依赖**：`packages/flux-runtime/src/node-runtime.ts:348-353,407-412`——任一 dynamic structural field 使 `propsDependencies` 含 `WILDCARD_DEPENDENCIES` → `node-renderer-resolved.tsx:101-115` 每次变更触发全 props 树重求值。
- **P14 contained 热点（全部已逐文件证实）**：
  - `flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:219` 表格 row scope `isolate: true` 豁免级联（对照面）。
  - `flux-react/src/render-nodes.tsx:283-286` `normalizeNodeInput` 仅按 input 标识 useMemo，运行时构造 schema（表达式产出的新数组）每次全量重编译（编译管线见 `flux-compiler/src/schema-compiler.ts:217-224`）。
  - `flux-runtime/src/scope-change.ts:157,166` 每变更×每订阅者重建 `new Set(changeRoots)` 与 `buildDependencyPathIndex`，而订阅依赖集静态（`hook-subscriptions.ts:222` 已一次构建）。
  - `flux-react/src/use-node-source-props.ts:23-59,69-72` 对 `sourcePropKeys.length === 0` 的节点仍做全 props DFS（编译器默认产出空数组，`node-compiler-helpers.ts:78`）。
  - `flux-renderers-basic/src/loop.tsx:87-97,114-124` 每条目每渲染创建/销毁真实子 scope（2 个 store）仅为求值一个 compiled value。
  - `flux-core/src/utils/path.ts:27-31` `parsePath` 缓存命中仍 `[...cached]` 拷贝；唯一变异消费者 `resolveRelativePath`（`:148-155`，全仓 17 处调用点已逐一核实）。
  - 死代码：`flux-formula/src/scope.ts:131-228` `createFormulaScope`（Proxy 追踪）无生产调用点（模块导出 `:230` + 专属测试 `scope.test.ts` 存在，删除时须一并处理）。

## Goals

- 祖先 scope 变更不再无条件唤醒全部后代 store：父变更路径被子 own keys 完全遮蔽（或不相关）时，跳过 `readVisible()` 重算与监听器扇出；语义上后代可见值不变时 getSnapshot 结果与标识规则不变。
- 携带动态 structural 字段的节点不再无条件持有 wildcard props 依赖（其编译产物真实依赖可收集时）。
- 上列 P14 contained 热点消除或安全门控；死代码删除。
- 全部既有单测/e2e 语义不变（订阅时序、快照标识规则、行为契约逐项有既有测试兜底 + 新增 focused proof）。

## Non-Goals

- 不改表达式引擎 interpreter 结构（闭包提升等，Deferred，profiling-first）。
- 不改 React 订阅层 API 形态（`useScopeSelector` 签名与语义不动）。
- 不触碰 `packages/flux-core/src/` 的编译器语义（parsePath 拷贝优化限定在确认无变异消费者的共享安全形态；若审查发现不安全则该项显式移出 scope 并记录）。
- 不做 store 层结构重构（zustand vanilla 用法保持）。

## Scope

### In Scope

- `packages/flux-runtime/src/scope.ts`、`node-runtime.ts`、`scope-change.ts`
- `packages/flux-react/src/render-nodes.tsx`、`use-node-source-props.ts`、`hook-subscriptions.ts`
- `packages/flux-renderers-basic/src/loop.tsx`
- `packages/flux-core/src/utils/path.ts`（仅拷贝优化，含变异面审查）
- `packages/flux-formula/src/scope.ts`（死代码删除，含 scope.test.ts 对应用例处置）
- 上述包 colocated 单测

### Out Of Scope

- `packages/flux-core/src/` compiler/scope/expression 语义（protected area，本计划不触碰其语义）
- 表格/选择器渲染器内部（Plan 2 结果面）
- 表达式编译缓存（Plan 1 结果面）
- P15 压测 harness 虚拟化模式补缺（分析报告原文将其列于本 plan 映射，实际归属 Plan 2 Phase 1 的 proof 面——measurement 服务于 P3/P6 表格项；本 plan 不含该交付物，此条为显式归属更正）

## Failure Paths

> 不适用：无错误处理/API 契约/鉴权/外部集成变更。订阅语义回归风险由 Test Strategy 与分阶段落地控制。

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化。本计划触碰订阅/依赖管线这一核心回归路径：每项 Fix 先有行为等价性失败/基线测试（P12 遮蔽语义、P13 依赖收窄后的触发面、各 contained 项的前后行为一致），再落地实现；全量 `pnpm test`（42 包/1 万+ 用例）+ e2e 作为收口门。

## Execution Plan

### Phase 1 - 行为等价性基线测试（Proof 先行）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`、`packages/flux-react/src/__tests__/`

- Item Types: `Proof`

- [x] Proof: 组合 scope 语义基线：composite-scope-cascade-baseline.test.ts 5/5（own 变更/未遮蔽父变更/同 key 遮蔽/多层链/isolate 隔离；遮蔽场景钉住"内容相等但视图标识必变 + 监听器仍触发 1 次"的现状）
- [x] Proof: structural 字段节点基线：structural-wildcard-dependencies-baseline.test.ts 3/3（dynamic structural 字段 ⇒ wildcard 依赖 {paths:['*'],wildcard:true,broadAccess:true}；无 structural/static structural 节点保持收集依赖 {paths:['user']}——P13 收窄后的触发面以本组断言为准）
- [x] Proof: loop/parsePath/source-props 行为基线：loop-itemdata-parent-scope-baseline.test.ts 2/2（itemData 引用外围 scope 键取值 + 父值变更重解析——scratch-scope 修复等价面）；parse-path-baseline.test.ts 4/4（缓存命中拷贝语义 + 防缓存投毒 + resolveRelativePath）；source-props 提取由既有 node-source-prop-controller.test.ts 10 用例覆盖（引用为基线，不重复）

Exit Criteria:

- [x] 基线测试全部就位且绿（固化现状语义）
- [x] `pnpm --filter @nop-chaos/flux-runtime test`（136 文件/1462）、`pnpm --filter @nop-chaos/flux-react test`（56 文件/522）全绿

### Phase 2 - 组合 scope 变更路径过滤（P12）

Status: completed
Targets: `packages/flux-runtime/src/scope.ts`

- Item Types: `Fix`

- [x] Fix: `createCompositeScopeStore.subscribe` 接入父变更 changed-paths 过滤（scope.ts `parentChangeFullyShadowed`）：变更 paths 非空且每条路径的根段均被子 own snapshot 持有时 → 跳过 readVisible 重算与监听器扇出；路径缺失/通配（normalizeScopeChange 将无路径变更归一为 ['\*']）/部分遮蔽一律保守回退现行为。受益面为显式路径的 set/merge 级联（normalizeScopeChange 语义核对记录在案）
- [x] Fix: 变更通知路径在组合链透传核对——父订阅直接转发原 change 对象（paths 不重写），无需代码变更（核对记录）
- [x] Phase 1 基线场景保持绿；新增 focused 单测：遮蔽场景监听器零触发（composite-scope-cascade-baseline 8/8：shadow-skip/通配回退/无路径回退/非遮蔽回退/多层链/isolate）；既有契约测试 scope-ownership "does not dedupe" 按新契约改写并注明 plan 依据（旧断言钉住的即本 plan 移除的浪费行为）

Exit Criteria:

- [x] focused 单测绿（遮蔽零触发 + 非遮蔽一致 + 多层链透传 + 通配/无路径回退）
- [x] `pnpm --filter @nop-chaos/flux-runtime test`（1466 用例）、`pnpm --filter @nop-chaos/flux-react test`（522）全绿
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿（935；form scope 链是级联主消费者）

### Phase 3 - structural 依赖收窄 + contained 热点批量（P13、P14）

Status: completed
Targets: `packages/flux-runtime/src/node-runtime.ts`、`scope-change.ts`、`packages/flux-react/src/render-nodes.tsx`、`use-node-source-props.ts`、`packages/flux-renderers-basic/src/loop.tsx`、`packages/flux-formula/src/scope.ts`、`packages/flux-core/src/utils/path.ts`

- Item Types: `Proof | Fix | Follow-up`

- [x] Proof + Fix → **尝试后回退（记录在案）**：编译器审查属实（`node-compiler.ts:348-358` sourcePropKeys 仅对 allowSource 字段产出）；快速路径实现后既有契约测试红——use-node-source-props.test.ts 的循环图用例钉住"source schema 可经未声明渠道（运行时/表达式构造值）进入 props"，DFS 必须保留为安全网。快速路径已回退并在代码处留注（use-node-source-props.ts），**该项显式裁定保留 DFS 现状**（安全网语义优先于分配优化）
- [x] P13 → **改判 Deferred But Adjudicated（见下方条目）**：执行期核实 compiled value 节点不携带静态依赖（依赖收集纯运行时、经 evaluate.ts collector 写入 RuntimeValueState），而 structural(lazyEval) 字段由渲染器在自定义循环作用域求值、运行时无从读取其收集结果；落地需 flux-formula 编译期静态依赖收集新能力（引擎相邻、触本 plan Non-Goal），且未发布变量/computed member 场景的回退面直接决定全部 structural 节点的重渲染触发面（42 包回归风险）。基线测试（structural-wildcard-dependencies-baseline 3/3）保留为后继 plan 的触发面契约
- [x] Fix: `normalizeNodeInput` 增加 `normalizedInputCompileCache`（WeakMap<input, {key: strictMode+compileOptions 指纹, result}>），schema/schemaArray 两分支命中复用编译产物；表达式产出的新数组按身份 miss（不劣于前）——flux-react 343 单测绿
- [x] Fix: `scope-change.ts` 预构建依赖匹配工件——`dependencyArtifactsCache`（WeakMap 按依赖集身份缓存 roots + path index，依赖集静态）+ `changeArtifactsCache`（WeakMap 按 change 对象缓存 roots/rootSet，change 扇出至 N 订阅者共享）；通知路径零重建
- [x] Fix: `loop.tsx` scratch 子 scope 落地——每 LoopRenderer 实例 `useRef` 持有一个空 patch 子 scope，逐 item 以 `scope.merge` 发布 loop bindings 后求值，卸载时 dispose（helpersRef 规避 helpers 身份抖动；merge 具同值跳过 + 显式路径通知）。两处（renderStructuralLoop + LoopProvider）统一走 `evaluateItemDataViaScratch`。dispose-pairing 契约测试按新契约改写（rerender 零新建 bindings scope + unmount 释放）；父链解析基线 2/2 绿
- [x] Fix: `parsePath` 读路径共享缓存数组——变异面审查证实唯一变异消费者 `resolveRelativePath` 已改为 end-index 不变异形式（miss 路径同样共享存储数组）；既有 path.test 三处防御性拷贝契约测试按新契约改写并注明 plan 依据；flux-core 517/517 绿
- [x] Follow-up: 死代码 `createFormulaScope` 已删除（flux-formula/src/scope.ts；包导出面核实未暴露——仅模块级导出且唯一消费者为专属测试）；`scope.test.ts` 重写为仅覆盖存活 API（createScopeDependencyCollector + toEvalContext）；flux-formula 212/212 绿
- [x] Phase 1 全部基线测试保持绿；focused 单测覆盖（normalize 缓存经 flux-react 套件、loop 上下文取值经基线 2/2、structural 触发面经基线 3/3 为后继契约）

Exit Criteria:

- [x] focused 单测绿；`pnpm --filter @nop-chaos/flux-runtime test`、`@nop-chaos/flux-react`、`@nop-chaos/flux-renderers-basic`、`@nop-chaos/flux-formula`、`@nop-chaos/flux-core` 全绿（1466/522/625/212/517）
- [x] source-props 快速路径审查+回退记录在案（编译器前提属实，但运行时渠道使前提不构成安全条件；契约测试优先）
- [x] 死代码删除记录在案（导出面未暴露，测试重写为存活 API 覆盖）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass（r1 fail→按 2 Major 修订，r2 targeted 确认 pass）
- Rounds: 2
- r2 附注：reviewer 确认 loop scratch-scope 机制优于原方案（setSnapshot API 支撑），残留行为面（scratch scope id 稳定性）由 Phase 1 基线 + focused 测试覆盖
- Findings addressed: r1 Major-1——Source 行去除不存在的 F 编号引用、P15 归属更正写入 Out Of Scope（显式标注原文映射偏差、交付物归 Plan 2）；r1 Major-2——loop itemData 机制改写为"实例级复用 scratch 子 scope"（createObjectEvalContext 私有且无父链不可用，已写明等价性依据与弃用理由）；3 Minor 全部吸收（createFormulaScope 删除须处置 scope.test.ts、包计数 59→42、use-table-row-scope-cache 引用补包路径并标注为对照面）。

## Closure Gates

- [x] 所有 in-scope 已证实的每交互成本项（P12、P13、P14 列举条目）已修复或有记录的显式裁定（P12 过滤 + P14 五项落地；P13 显式改判 Deferred，Successor Required: yes）
- [x] 行为/契约结果已达成：订阅语义（遮蔽跳过/回退面/多层链）与渲染行为（loop 上下文、parsePath、source-props）逐项有基线/契约测试兜底且修复后保持绿
- [x] 必要 focused verification 已完成（Phase 1-3 Exit Criteria 全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（interpreter 闭包提升与 P13 均为显式裁定 Deferred 的 optimization candidate，非 live defect；P13 带 Successor Required: yes 与触发面契约测试）
- [x] 受影响的 owner docs 已同步——`docs/architecture/performance-design-requirements.md` 增补组合 scope 级联过滤契约条目（P12；P13 收窄未落地无契约变化）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### P13 structural 字段 wildcard 依赖收窄

- Classification: `optimization candidate`
- Why Not Blocking Closure: 执行期核实依赖收集为纯运行时机制（evaluate.ts collector 写入 RuntimeValueState.dependencies），compiled value 节点不携带静态依赖；structural(lazyEval) 字段由渲染器在自定义循环作用域求值，运行时无法读取其收集结果。落地需要 flux-formula 编译期静态依赖收集能力——引擎相邻改动，越出本 plan Non-Goals（不改表达式引擎结构/不触碰编译器语义）；且 un-published 变量与 computed member 访问的回退面直接决定所有 structural-loop 节点的重渲染触发面，42 包回归风险与收益不成比例于本 plan 内仓促落地。
- Successor Required: `yes`
- Successor Path: 后继 plan 先落地 flux-formula 编译期静态依赖收集（compileValue 输出 ScopeDependencySet，含 un-published tolerance → wildcard），再按 structural-wildcard-dependencies-baseline.test.ts（3/3，触发面契约）收窄 node-runtime 的 WILDCARD 合并。

### 表达式引擎 interpreter 闭包提升（evaluator 六闭包每 exec 分配）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 引擎级重构，需 profiling 证明收益超过重构风险；既有调用面（nodes × leaves × changes）的实测基数在 P1/P12/P13 落地后需重测。
- Successor Required: `no`
- Successor Path: profiling 驱动的后续 plan

## Non-Blocking Follow-ups

- `renderStructuralLoop` 每父渲染重建 `instancePath` 数组/LoopProvider context value（可接受量级，记录在案）。
- `normalizedInputCompileCache`（render-nodes.tsx）键含 strictMode + JSON.stringify(compileOptions)，未含 runtime 身份且 JSON.stringify 丢弃非可序列化 CompileSchemaOptions 字段（signal/resolveImportUrl/importLoader/cidState/symbolTable）——现生产唯一调用点仅传 {basePath, parentPath} 单 runtime 树，属 watch-only 加固项（键加入 runtime 身份或结构化指纹），交后继 perf plan。

## Closure

Status Note: P12 级联过滤 + P14 五项 contained 热点 + 死代码删除落地；P13 显式改判 Deferred（Successor Required: yes，触发面契约测试保留）；source-props 快速路径尝试后回退（循环图契约测试优先）。audit r1（即首轮）**approved-with-minors**（0 Blocker/0 Major；5 Minor 均已处置：本 Evidence 回填、e2e 基线继承声明、loop 卸载断言强化、normalize 缓存键 watch-only follow-up 登记、分 plan 提交归属）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28；自行复跑 runtime 1466/react 522/basic 625/formula 212/core 517/form 935 + typecheck/build/lint/check exit 0 + 全仓 pnpm test 78/78 turbo tasks 绿；parsePath 变异面独立复审 13 消费文件零变异者、resolveRelativePath 17 调用点核实）
- Evidence: P12 过滤器语义安全（sanitizeSnapshot 两分支遮蔽不变量 + 三类保守回退 + 多层链组合）；P13 改判理由经 repo 实况核实（compiled node 无静态依赖、收集纯运行时、structural 字段渲染器求值）；source-props 回退注释在位且循环图契约测试完好；parsePath 共享身份 + 非变异重写；loop scratch create-once/merge-per-item/unmount-dispose。
- e2e 基线继承声明：本 plan 未新增 e2e 用例（改动为运行时内部成本项，行为面由基线/契约单测兜底）；继承当日 e2e 基线——含已裁定的 pre-existing master e2e failures（见 daily log），本 plan 改动未触及其中任何失败 spec 的领域。

Follow-up:

- 见 Non-Blocking Follow-ups（renderStructuralLoop instancePath 重建 + normalizeInputCompileCache 键加固 watch-only）
