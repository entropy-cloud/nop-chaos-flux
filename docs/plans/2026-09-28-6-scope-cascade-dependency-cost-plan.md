# 2026-09-28-6 作用域级联与依赖过滤 JS 成本优化

> Plan Status: active
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

Status: planned
Targets: `packages/flux-runtime/src/__tests__/`、`packages/flux-react/src/__tests__/`

- Item Types: `Proof`

- [ ] Proof: 组合 scope 语义基线：own key 变更、父 key 变更（子未遮蔽）、父 key 变更（子同 key 遮蔽）、嵌套多层链四类场景下，getSnapshot 可见值与订阅通知次数的当前行为快照测试（P12 修复前先固化现状语义）
- [ ] Proof: structural 字段节点基线：携带 dynamic items/columns 的节点在无关 scope 路径变更时不重渲染、在真实依赖路径变更时重渲染的当前行为测试（P13 收窄后须保持同一触发面）
- [ ] Proof: loop/parsePath/source-props 行为基线：既有语义快照（loop item 上下文取值、relative path 解析、source props 提取）

Exit Criteria:

- [ ] 基线测试全部就位且绿（固化现状语义）
- [ ] `pnpm --filter @nop-chaos/flux-runtime test`、`pnpm --filter @nop-chaos/flux-react test` 全绿

### Phase 2 - 组合 scope 变更路径过滤（P12）

Status: planned
Targets: `packages/flux-runtime/src/scope.ts`

- Item Types: `Fix`

- [ ] Fix: `createCompositeScopeStore.subscribe` 接入父变更的 changed-roots/paths：父变更路径全部被子 own keys 遮蔽或与子可见键无关时，跳过 `readVisible()` 重算与监听器扇出；不满足遮蔽判定时保持现行为（保守回退）
- [ ] Fix: 变更通知携带的路径信息在组合链上透传（避免逐层丢失导致过滤失效）
- [ ] Phase 1 四类基线场景全部保持绿；新增 focused 单测：遮蔽场景监听器零触发、非遮蔽场景行为与基线一致（通知计数断言）

Exit Criteria:

- [ ] focused 单测绿（遮蔽零触发 + 非遮蔽一致 + 多层链透传）
- [ ] `pnpm --filter @nop-chaos/flux-runtime test`、`pnpm --filter @nop-chaos/flux-react test` 全绿
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿（form scope 链是级联主消费者）

### Phase 3 - structural 依赖收窄 + contained 热点批量（P13、P14）

Status: planned
Targets: `packages/flux-runtime/src/node-runtime.ts`、`scope-change.ts`、`packages/flux-react/src/render-nodes.tsx`、`use-node-source-props.ts`、`packages/flux-renderers-basic/src/loop.tsx`、`packages/flux-formula/src/scope.ts`、`packages/flux-core/src/utils/path.ts`

- Item Types: `Proof | Fix | Follow-up`

- [ ] Proof: 先核实编译器只在声明 source keys 下产出 sources（`node-compiler-helpers.ts` 审查记录），随后为 source-props 快速路径补失败面测试（声明键存在时行为不变）
- [ ] Fix: P13——dynamic structural field 记录其编译产物真实收集依赖，替代 blanket wildcard；依赖不可收集（un-published-variable tolerance）时保留 wildcard 回退
- [ ] Fix: `normalizeNodeInput` 增加 `WeakMap<input, compiled>`（键含 compileOptions 指纹），运行时构造 schema 复用编译产物
- [ ] Fix: `scope-change.ts` 订阅侧预构建 dependency path index（随订阅一次构建），通知路径不再每订阅者重建
- [ ] Fix: `loop.tsx` itemData 求值消除一次性子 scope 创建/销毁——机制：每个 LoopRenderer 实例经 `useRef` 持有一个复用的 scratch 子 scope（创建一次、逐 item 以 `setData`/等价发布接口更新数据、卸载时 dispose），代替逐 item createScope/disposeScope。语义等价依据：现实现中 scope 为求值即弃（同步 evaluate 后 dispose），无合法持有者；替换后求值结果与父链解析行为不变（scratch scope 仍挂在同一父 scope 下）。不采用 `createObjectEvalContext` 方案：该 API 为 flux-formula 私有（未从包导出），且裸对象 EvalContext 无父作用域链，`itemData` 引用外围 scope 键时会静默 undefined（review Major-2）
- [ ] Fix: `parsePath` 读路径共享缓存数组（仅在证实全部消费者无变异后落地；`resolveRelativePath` 的 `segments.pop()` 改为不变异形式或保持拷贝）
- [ ] Follow-up: 删除死代码 `createFormulaScope`（`flux-formula/src/scope.ts:131-228`）：确认包导出面未暴露后移除函数与模块导出，并同步删除/改写 `scope.test.ts` 中该函数的专属用例；若导出面实际暴露则改列为 Decision 并记录保留理由
- [ ] Phase 1 全部基线测试保持绿；新增 focused 单测逐项覆盖（structural 收窄触发面、normalize 缓存命中、loop 上下文取值）

Exit Criteria:

- [ ] focused 单测绿；`pnpm --filter @nop-chaos/flux-runtime test`、`@nop-chaos/flux-react`、`@nop-chaos/flux-renderers-basic`、`@nop-chaos/flux-formula`、`@nop-chaos/flux-core` 全绿
- [ ] source-props 快速路径安全前提的审查记录在案
- [ ] 死代码删除或保留决定记录在案

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass（r1 fail→按 2 Major 修订，r2 targeted 确认 pass）
- Rounds: 2
- r2 附注：reviewer 确认 loop scratch-scope 机制优于原方案（setSnapshot API 支撑），残留行为面（scratch scope id 稳定性）由 Phase 1 基线 + focused 测试覆盖
- Findings addressed: r1 Major-1——Source 行去除不存在的 F 编号引用、P15 归属更正写入 Out Of Scope（显式标注原文映射偏差、交付物归 Plan 2）；r1 Major-2——loop itemData 机制改写为"实例级复用 scratch 子 scope"（createObjectEvalContext 私有且无父链不可用，已写明等价性依据与弃用理由）；3 Minor 全部吸收（createFormulaScope 删除须处置 scope.test.ts、包计数 59→42、use-table-row-scope-cache 引用补包路径并标注为对照面）。

## Closure Gates

- [ ] 所有 in-scope 已证实的每交互成本项（P12、P13、P14 列举条目）已修复或有记录的显式裁定
- [ ] 行为/契约结果已达成：订阅语义与渲染行为逐项有基线测试兜底且修复后保持绿
- [ ] 必要 focused verification 已完成（Phase 1-3 Exit Criteria 全勾）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（interpreter 闭包提升已显式裁定 Deferred）
- [ ] 受影响的 owner docs 已同步（P12/P13 若确立新的订阅过滤/依赖收窄契约，更新 `docs/architecture/performance-design-requirements.md` 或 flux-core 相关文档；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 表达式引擎 interpreter 闭包提升（evaluator 六闭包每 exec 分配）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 引擎级重构，需 profiling 证明收益超过重构风险；既有调用面（nodes × leaves × changes）的实测基数在 P1/P12/P13 落地后需重测。
- Successor Required: `no`
- Successor Path: profiling 驱动的后续 plan

## Non-Blocking Follow-ups

- `renderStructuralLoop` 每父渲染重建 `instancePath` 数组/LoopProvider context value（可接受量级，记录在案）。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
