# 39 Dependency Tracking Root Scope Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-07; audited against codebase on 2026-04-07
> Source: `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`

## Purpose

本计划用于把 `docs/architecture/dependency-tracking.md` 中已经确认的新依赖追踪基线，逐步迁移到核心类型、表达式运行时、scope change 匹配、source/reaction invalidation、以及 table/loop 行作用域实现中。

本计划不重新讨论“是否应继续采用 compile-time static extraction + runtime union”这类已被文档否定的方案，而是把已经确认的目标拆成可执行的代码改造路线。

## 已确认结论

- 依赖跟踪的目标单位应从 deep member path 收敛到 lexical root binding。
- 有显式依赖声明时，以显式声明为准；未声明时，才采用运行时动态跟踪。
- 运行时 fallback 只跟踪 root binding，例如 `user`、`filters`、`row`、`record`，不跟踪 `user.name` 这类深路径。
- 只有 whole-scope enumeration 或 materialization 才退化到 wildcard。
- bound-object enumeration 仍应锚定到其 root binding，而不是扩大成 whole-scope wildcard。
- `ScopeChange` 可以继续保留 raw path 作为诊断信息，但 invalidation match 应基于 normalized roots。
- source 的 self-write guard 需要先过滤掉自身发布 root，再做 dependency hit 判断。
- collection owner 必须把父集合变化翻译成 row-local change，避免 row consumer 因整个 `tableData` 更新而无差别重跑。

## 与现有计划的关系

- `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md` 已经把“依赖追踪与 changed-path invalidation”列为核心 runtime 主线；本计划是该主题在当前新架构文档下的具体落地分案，优先服务于 root-only tracking 和 row-scope invalidation，不再沿用 `Plan 37` 中更早期的 deep-path baseline。
- `docs/plans/38-action-api-source-convergence-migration-plan.md` 已完成 source/reaction authoring contract 的主要收敛；本计划只处理它们在 dependency substrate 上的执行语义，不重开 action/api/source 命名问题。
- `docs/plans/21-node-renderer-selective-subscription-plan.md` 已完成 selector 化；本计划提供它后续真正可用的 dependency hit substrate。
- `docs/plans/35-form-runtime-performance-and-linkage-implementation-plan.md` 若后续需要受限声明式联动，将复用本计划输出的 root-level dependency model，而不是再建设另一套隐式追踪机制。

## Problem

- `packages/flux-formula/src/scope.ts` 当前通过 `wrapTrackedValue()` 记录 deep path，并且对 nested object enumeration 也会直接记成 wildcard，与新的 root-only 设计不一致。
- `packages/flux-runtime/src/scope-change.ts` 当前使用 member-path hierarchical match；它能保 correctness，但比目标模型更重，也不适合后续显式 root declaration。
- `packages/flux-runtime/src/source-registry.ts` 的 self-write guard 仍是“全部 change path 都是 self 才跳过”，混合 change 会误触发 refresh。
- `packages/flux-react/src/render-nodes.tsx` 在 fragment scope 数据变化时直接 `setSnapshot(fragmentData)`，没有携带 `ScopeChange`，当前会退化为 `['*']`；这与未来的 row/fragment 精细 invalidation 不兼容。
- `packages/flux-renderers-data/src/table-renderer.tsx` 虽然已经通过 `helpers.createScope({ record, index }, { scopeKey: ..., source: 'row' })` 建立 row scope，但当前 row-scope update/reconcile 仍依赖通用 fragment scope 更新路径，没有明确的 row-local change translation。
- `packages/flux-core/src/types/schema.ts` 还没有显式 dependency carrier；source/reaction 只能依赖 runtime collector。
- `packages/flux-runtime/src/data-source-runtime.ts`、`packages/flux-runtime/src/reaction-runtime.ts` 还没有“显式 root first，runtime fallback second”的初始化路径。

## Root Cause

- 当前实现的 dependency substrate 是按“读到了哪个 path”设计的，而不是按“当前 lexical scope 中用了哪个 binding”设计的。
- fragment / row scope 的创建已经是稳定主链，但更新时仍没有配套的 changed-root publication 机制，所以 UI 上有 row scope，invalidaton 上却还是广义 path / wildcard。
- source/reaction 的 runtime 已经存在，但 explicit dependency contract 还没有被接入，因此只能全靠 collector 驱动。
- 当前 `ScopeStore.setSnapshot(next, change?)` 的默认行为适合 correctness，但不适合 collection/row incremental reconcile，因为不传 `change` 时只能保守退化。

## Goals

- 让运行时 dependency tracking 收敛到 lexical root binding。
- 让 `ScopeChange` 在 invalidation 层走 normalized roots，同时保留 raw path 诊断面。
- 为 `data-source` / `reaction` 增加显式 root dependency carrier，并在运行时实现“显式优先，动态 fallback”。
- 修正 self-write guard，避免 source 因 mixed change 误刷新。
- 为 table/loop 形成明确的 row-scope reconcile 机制：变化只影响受影响行，不广播给所有 sibling rows。
- 在不破坏现有 compile-first / selector-first 主干的前提下，补齐足够小的测试面，覆盖 correctness 和性能边界。

## Non-Goals

- 不引入 compile-time static dependency extraction。
- 不把 dependency tracking 扩展成完备的静态依赖分析器。
- 不把 validation dependency system 强行并入同一 substrate。
- 不重写整个 table renderer 或把所有复杂 renderer 状态都上升为 runtime 全局状态。
- 不在本计划中处理 action DAG、workflow、或更高层 loader/schema migration 议题。

## Scope

- `docs/architecture/dependency-tracking.md`
- `docs/architecture/api-data-source.md`
- `docs/logs/`
- `packages/flux-core/src/types/scope.ts`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-runtime/src/scope-change.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-react/src/helpers.tsx`
- `packages/flux-renderers-data/src/table-renderer.tsx`
- 相关测试文件

## 不在 Scope 内的事项

- validation model 重构
- expression parser / syntax 替换
- 非 collection renderer 的局部状态 ownership 收敛
- 设计器、报表、word-editor 等复杂宿主协议问题

## Execution Plan

**Phase 0 — 文档冻结、术语锁定与基线测试补齐**

Targets: `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`, `packages/flux-formula/src/scope.ts`, `packages/flux-runtime/src/scope-change.ts`, `packages/flux-renderers-data/src/table-renderer.tsx`, related tests

- 以 `dependency-tracking.md` 中的新 baseline 为唯一术语入口，冻结以下概念：
  - `lexical root binding`
  - `explicit dependency roots`
  - `runtime fallback root tracking`
  - `row-local invalidation`
- 为当前实现补最小基线测试，明确后续改造是否成功：
  - deep path access 当前会记录 deep path
  - nested object enumeration 当前会触发 wildcard
  - mixed self-write change 当前会误触发 source refresh
  - row scope 在 table 中已有 `record` binding，但行更新没有 row-local reconcile contract
- 不在本阶段改代码语义，只建立 regression harness。

Exit criteria: 测试能稳定表达“现状是什么、目标要改掉什么”。

**Phase 1 — Root-Only Collector And Dependency State Semantics**

Targets: `packages/flux-core/src/types/scope.ts`, `packages/flux-formula/src/scope.ts`, `packages/flux-formula/src/evaluate.ts`, related tests

- 将 collector 的语义从 deep path 改为 root binding：
  - `scope.user.name` 只记录 `user`
  - `scope.record.total` 只记录 `record`
- 保留 nested wrapper，但 wrapper 必须锚定到首次命中的 root binding，不再拼 deeper path。
- 区分三类访问：
  - top-level scope property access -> root
  - bound-object property access / enumeration -> same root
  - whole-scope enumeration / materialization -> wildcard
- 审查 `ScopeDependencySet.paths` 的文档语义，保持类型不扩张，但测试和实现要明确这些 paths 已经是 normalized roots。
- 明确 `undefined` 仍表示 unknown / unavailable；如果实现上出现“known empty deps”需求，单独设计表示方式，不在这一阶段偷塞到现有 `undefined` 语义里。

Exit criteria: collector 输出只包含 root bindings 或 wildcard，且 nested object enumeration 不再把整个 lexical scope 误判成 wildcard。

**Phase 2 — ScopeChange Root Normalization And Matching**

Targets: `packages/flux-runtime/src/scope-change.ts`, `packages/flux-runtime/src/scope.ts`, related tests

- 新增 raw path -> normalized root 的辅助逻辑。
- 保持 `ScopeChange.paths` 对外仍可携带 raw path，便于调试与 diagnostics。
- `scopeChangeHitsDependencies()` 改为基于 normalized roots 做 hit 判断：
  - `user.name` 命中 `user`
  - `filters.status` 命中 `filters`
  - `*` 命中全部
- 保持 conservative fallback：未知 change 或未知 deps 仍返回 `true`。
- 审查 `scope.update()` / `merge()` 的变更报告，确保它们至少能稳定推出 impacted root。

Exit criteria: invalidation 语义从 hierarchical deep-path match 切到 root equality match，且原有 correctness 用例无回归。

**Phase 3 — Source/Reaction Explicit Root Support And Self-Write Guard Fix**

Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/index.ts`, related tests

- 在 `DataSourceSchema` / `ReactionSchema` 上增加显式 dependency carrier，例如 `dependsOn?: string[]`。
- 明确 authoring contract：只允许 lexical roots，不允许 deep member paths 作为正式 contract。
- source/reaction 注册时遵循统一规则：
  - 有 `dependsOn` -> 直接采用显式 roots
  - 无 `dependsOn` -> 使用 runtime-collected roots
- 生产语义下不做“显式 roots 与 runtime deps union”。
- 修正 `source-registry.ts` self-write guard：
  - 先过滤掉 source 自身发布 root
  - 再用剩余 roots 做 dependency hit 判断
- 为 API source 增加 request-config root dependency 测试；为 reaction 增加显式 roots 覆盖 runtime fallback 的测试。

Exit criteria: source/reaction 具备稳定的 explicit-first runtime，mixed self-write change 不再误刷新 source。

**Phase 4 — Fragment Scope Change Payload And Generic Child-Scope Reconcile**

Targets: `packages/flux-react/src/render-nodes.tsx`, `packages/flux-runtime/src/scope.ts`, `packages/flux-core/src/types/scope.ts`, related tests

- 解决当前 `fragmentScope.store.setSnapshot(fragmentData)` 不带 `ScopeChange` 导致的 wildcard fallback。
- 为 child scope snapshot 更新提供最小可复用 reconcile 能力：
  - 比较旧 own snapshot 与新 patch
  - 生成受影响 roots
  - `setSnapshot(next, { paths: affectedRoots, kind: 'replace' | 'merge' })`
- 这层能力不要直接做成通用深 diff 引擎；第一版只需要服务 fragment/row scope 更新场景。
- 确保无变化 patch 不发布 change。
- 测试覆盖：
  - fragment scope 更新单个 root 只发布该 root
  - unchanged patch 不产生新 change
  - fallback wildcard 只留给 truly unknown replace 场景

Exit criteria: child/fragment scope 更新不再默认广播 wildcard，而是发布最小必要 roots。

**Phase 5 — Table / Loop Row-Scope Reconciliation**

Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-react/src/helpers.tsx`, `packages/flux-react/src/render-nodes.tsx`, related tests

- 基于现有 `record` row scope 约定，补齐 row-local invalidation contract。
- 设计 row-scope reconcile 规则：
  - 行对象未变时，row scope 不发布 change
  - 行对象变了但 sibling rows 未变时，只更新受影响 row scope
  - 集合结构变化时，允许重建受影响 row scopes，但不无差别刷新全部 row scopes
- 优先复用现有 `scopeKey: row:${record.id ?? index}` 约定；若需要更稳定的 identity，补一层 row identity 规则，但不要把 table renderer 改造成新的 runtime registry。
- 若 table renderer 现有 render path 无法承载 row-scope cache，则增加局部 cache / ref，而不是把逻辑推回全局 runtime。
- 测试覆盖：
  - 修改单行字段，只影响对应 row scope
  - 替换整表数组但保留未变 row identity，未变行不应重新发布 row-local change
  - 排序/分页/过滤等结构操作不会把所有 cell consumer 都退化成 wildcard invalidation

Exit criteria: table/loop consumer 可以真正依赖 `record`/`row`，而不是被整个 `tableData` 变化拖着重跑。

**Phase 6 — Verification, Diagnostics, And Cleanup**

Targets: affected packages and tests, docs/logs

- 跑完整验证：`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`。
- 审查 debugger / debug snapshot 中暴露的 dependency paths，确保文案和实际语义已改成 roots，而不是继续把它们解释成 deep paths。
- 回头对齐文档中的“current status”表述，避免文档还在引用旧的 deep-path model。
- 如实现过程中发现 `Plan 37` 的旧表述与本计划冲突，更新其状态说明或补交叉引用，不让两个计划长期并存为不同 baseline。

Exit criteria: 文档、类型、运行时和测试都指向同一套 root-level dependency model。

## Validation Checklist

- [ ] `scope.user.name` 只收集 `user`
- [ ] `Object.keys(user)` 收集 `user`，不升级成 whole-scope wildcard
- [ ] `Object.keys(scope)` 与 whole-scope `materialize()` 仍会退化到 wildcard
- [ ] `scopeChangeHitsDependencies()` 基于 normalized roots 工作
- [ ] `DataSourceSchema` / `ReactionSchema` 可以声明显式 root dependencies
- [ ] 显式 dependency roots 在 source/reaction 中优先于 runtime fallback
- [ ] source self-write guard 会先过滤自身 root，再做 hit 判断
- [ ] fragment scope 更新不会默认发布 wildcard
- [ ] table row 更新只影响对应 `record` / `row` scope
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Suggested Execution Order

1. 先补 Phase 0 测试基线。
2. 再完成 collector 与 matching 的底座改造。
3. 然后接入 source/reaction explicit roots 与 self-write guard 修复。
4. 再补 fragment/row scope reconcile。
5. 最后做 table/loop 的 row-local invalidation 与全量验证。

## Risks

- 如果把 nested object enumeration 也错误地收窄成 unrelated root，可能漏刷新；第一版必须用测试锁住 `Object.keys(user)` 只命中 `user`，而不是更窄。
- 如果 `dependsOn` 允许 deep member paths，authoring contract 会重新滑回旧模型，导致 explicit 和 runtime fallback 不同构。
- 如果 fragment/row scope reconcile 直接做重型 deep diff，性能收益可能被 reconcile 成本抵消；第一版应优先做 top-level root diff。
- 如果 table renderer 的 row identity 只依赖 index，排序/分页时可能错误复用 row scope；必要时需要补稳定 identity 规则。
- 如果 debug 面继续把 dependency `paths` 当 deep paths 展示，会让排查信息和实际运行语义不一致。
